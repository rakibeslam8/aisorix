// AI Chat hook for the main chat interface
// Handles message sending, streaming, smart routing, and state management

import { useCallback, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { chatApi } from '@/services/api';
import { healthApi } from '@/services/healthApi';
import { toast } from 'sonner';
import { formatFileForPrompt } from '@/lib/fileParser';
import { shouldApplySmartRouting, getWorkerModelForPlan, resolveSmartAutoModel } from '@/lib/smartRouting';
import { generateCacheKey, getCachedResponse, setCachedResponse, simulateCachedStreaming } from '@/lib/responseCache';
import { addGuestTokensRaw } from '@/hooks/useGuestSession';
import { supabase } from '@/integrations/supabase/client';

// Estimate tokens: ~4 characters per token (rough approximation)
const estimateTokens = (text: string): number => {
  if (typeof text === 'string') {
    return Math.ceil(text.length / 4);
  }
  return 100;
};

export const useAIChat = () => {
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasShownMultiplierWarningRef = useRef<string | null>(null);
  
  const {
    activeChatId,
    chats,
    isStreaming,
    isLoading,
    error,
    pendingAttachments,
    selectedModel,
    models,
    user,
    isHealthMode,
    healthAnalysisType,
    addMessage,
    updateLastMessage,
    setLastMessageCitations,
    setMessages,
    setStreaming,
    setLoading,
    setError,
    clearAttachments,
    createNewChat,
    setUser,
    getModelMultiplier,
    getDailyUsageRemaining,
    incrementDailyUsage,
  } = useChatStore();
  
  const messages = chats.find(c => c.id === activeChatId)?.messages || [];

  const getBackendModelId = useCallback(() => {
    const model = models.find(m => m.id === selectedModel);
    return model?.backendId || 'openai/gpt-4o-mini';
  }, [models, selectedModel]);

  // Multiplier warning removed - silent backend tracking only

  const updateTokenUsage = useCallback((inputTokens: number, outputTokens: number, multiplier: number = 1) => {
    const baseTokens = inputTokens + outputTokens;
    const totalTokens = Math.ceil(baseTokens * multiplier);
    const newUsage = Math.min(user.tokensUsed + totalTokens, user.tokensLimit);
    const prevPercent = user.tokensLimit > 0 ? (user.tokensUsed / user.tokensLimit) * 100 : 0;
    const newPercent = user.tokensLimit > 0 ? (newUsage / user.tokensLimit) * 100 : 0;

    if (prevPercent < 80 && newPercent >= 80 && newPercent < 100) {
      toast.warning("⚠️ Token Usage Warning", {
        description: "You've used 80% of your monthly tokens. Consider upgrading your plan.",
      });
    }

    if (prevPercent < 100 && newPercent >= 100) {
      toast.error("🚫 Token Limit Reached", {
        description: "You've used all your monthly tokens. Upgrade to continue chatting.",
      });
    }

    setUser({ ...user, tokensUsed: newUsage });

    // Persist usage for guest visitors so the limit survives reloads
    supabase.auth.getSession().then(({ data }) => {
      if (!data.session) addGuestTokensRaw(totalTokens);
    });

    console.log(`Token usage: +${totalTokens} (base: ${baseTokens}, multiplier: ${multiplier}x), total: ${newUsage}/${user.tokensLimit} (${newPercent.toFixed(1)}%)`);
  }, [user, setUser]);

  const buildMultimodalContent = useCallback((text: string, imageAttachments: any[]) => {
    const content: any[] = [];
    if (text.trim()) {
      content.push({ type: 'text', text: text });
    }
    imageAttachments.forEach(att => {
      if (att.url && att.url.startsWith('data:image')) {
        content.push({
          type: 'image_url',
          image_url: { url: att.url, detail: 'high' }
        });
      }
    });
    return content;
  }, []);
  
  const sendMessage = useCallback(async (content: string, useStreaming = true) => {
    if (!content.trim() && pendingAttachments.length === 0) return;

    if (user.tokensUsed >= user.tokensLimit && user.tokensLimit > 0) {
      setError('You have reached your token limit. Please upgrade your plan.');
      return;
    }

    let chatId = activeChatId;
    if (!chatId) {
      const newChat = createNewChat();
      chatId = newChat.id;
    }
    
    // Resolve model: handle Smart Auto
    const isSmartAuto = selectedModel === 'smart-auto';
    let currentModel = models.find(m => m.id === selectedModel);
    let modelName = currentModel?.name || 'Sorix AI';
    let activeMultiplier = currentModel?.multiplier || 1;
    let activeBackendId = currentModel?.backendId || 'openai/gpt-4o-mini';
    let wasSmartRouted = false;
    let resolvedModelId = selectedModel;

    // Build conversation history for routing
    const currentMessages = useChatStore.getState().chats.find(c => c.id === chatId)?.messages || [];
    const conversationHistory = currentMessages.slice(-10).map(m => ({ role: m.role, content: m.content }));

    if (isSmartAuto) {
      // Smart Auto: resolve based on query complexity using user's available models
      const availableModels = models.filter(m => m.plans.includes(user.plan));
      const resolved = resolveSmartAutoModel(user.plan, content, availableModels, conversationHistory);
      activeBackendId = resolved.backendId;
      activeMultiplier = resolved.multiplier;
      resolvedModelId = resolved.modelId;
      modelName = 'Smart Auto';
      wasSmartRouted = true;
      console.log(`🧠 Smart Auto: Resolved to ${resolved.backendId} (${resolved.multiplier}x) for query`);
    } else {
      // Never override perplexity/sonar models - they need real web search
      const isPerplexityModel = activeBackendId.includes('perplexity') || activeBackendId.includes('sonar');
      
      // Apply smart routing for simple queries on premium models (skip perplexity)
      if (!isPerplexityModel && activeMultiplier >= 3 && shouldApplySmartRouting(activeMultiplier, content, conversationHistory)) {
        console.log(`🧠 Smart Routing: Downgrading ${modelName} to Worker Model for simple query`);
        activeBackendId = getWorkerModelForPlan(user.plan);
        activeMultiplier = 1;
        wasSmartRouted = true;
      }
    }

    // Check daily limit for the resolved model (silently block)
    if (!isSmartAuto) {
      const remaining = getDailyUsageRemaining(selectedModel);
      if (remaining !== null && remaining <= 0) {
        return;
      }
    }
    
    const userMessage = {
      id: Date.now().toString(),
      role: 'user' as const,
      content: content.trim(),
      attachments: pendingAttachments.length > 0 ? pendingAttachments : undefined,
      createdAt: new Date().toISOString()
    };
    
    addMessage(userMessage);
    clearAttachments();
    
    const assistantMessage = {
      id: (Date.now() + 1).toString(),
      role: 'assistant' as const,
      content: '',
      modelId: resolvedModelId,
      modelName: modelName,
      createdAt: new Date().toISOString()
    };
    
    addMessage(assistantMessage);
    setStreaming(true);
    setError(null);

    const contextMessages = currentMessages
      .slice(-20)
      .filter(m => m.role === 'user' || m.role === 'assistant')
      .map(m => ({ role: m.role, content: m.content }));

    const imageAttachments = pendingAttachments.filter(att => att.type === 'image');
    const documentAttachments = pendingAttachments.filter(att => att.type === 'file' && att.parsedContent);

    let userText = content.trim();
    
    if (documentAttachments.length > 0) {
      const totalDocs = documentAttachments.length;
      userText += `\n\n📁 ATTACHED FILES (${totalDocs} ${totalDocs === 1 ? 'file' : 'files'}):\n`;
      documentAttachments.forEach((att, index) => {
        userText += formatFileForPrompt({
          name: att.name, type: att.fileType || 'unknown', mimeType: '',
          size: att.size || 0, content: att.parsedContent || '', isImage: false
        }, index + 1, totalDocs);
      });
      userText += `\n📁 END OF ATTACHED FILES\n`;
    }

    if (imageAttachments.length > 0) {
      const imageNames = imageAttachments.map(att => att.name).join(', ');
      if (!userText.trim()) {
        userText = `Please analyze ${imageAttachments.length === 1 ? 'this image' : 'these images'}: ${imageNames}`;
      } else {
        userText += `\n\n[Attached ${imageAttachments.length === 1 ? 'image' : 'images'}: ${imageNames}]`;
      }
    }

    let apiMessages: any[];
    
    if (imageAttachments.length > 0) {
      const multimodalContent = buildMultimodalContent(userText, imageAttachments);
      apiMessages = [
        ...contextMessages,
        { role: 'user' as const, content: multimodalContent }
      ];
    } else {
      apiMessages = [
        ...contextMessages,
        { role: 'user' as const, content: userText }
      ];
    }

    const inputTokens = apiMessages.reduce((acc, msg) => {
      if (typeof msg.content === 'string') {
        return acc + estimateTokens(msg.content);
      } else if (Array.isArray(msg.content)) {
        return acc + msg.content.reduce((sum: number, item: any) => {
          if (item.type === 'text') return sum + estimateTokens(item.text);
          if (item.type === 'image_url') return sum + 1000;
          return sum;
        }, 0);
      }
      return acc;
    }, 0);

    // Server-side two-stage pipeline: when attachments are present and the user's model
    // isn't already strong enough, the chat edge function runs gpt-5-mini to analyze them
    // and forwards the analysis to the user's selected responder model.
    const hasAttachments = imageAttachments.length > 0 || documentAttachments.length > 0;
    const backendModel = activeBackendId;
    const baseMultiplier = activeMultiplier;
    // Attachments may trigger a gpt-5-mini analysis pass; charge 1x base (no extra surcharge).
    const ATTACHMENT_ANALYSIS_MULTIPLIER = 1;
    const finalMultiplier = hasAttachments ? baseMultiplier * ATTACHMENT_ANALYSIS_MULTIPLIER : baseMultiplier;

    console.log(`Sending message with model: ${backendModel}${hasAttachments ? ' (2-stage: gpt-5-mini analyzer → responder when needed, 1x cost)' : wasSmartRouted ? ' (smart routed)' : ''}, multiplier: ${finalMultiplier}x`);

    abortControllerRef.current = new AbortController();

    // --- Cache check for premium models (multiplier > 1) ---
    const shouldCache = finalMultiplier > 1 && !hasAttachments && !isHealthMode;
    const contextForCache = currentMessages.slice(-3).map(m => ({ role: m.role, content: m.content }));
    const cacheKey = shouldCache ? generateCacheKey(userText, backendModel, contextForCache) : '';

    if (shouldCache) {
      const cached = getCachedResponse(cacheKey);
      if (cached) {
        console.log(`⚡ Cache HIT for ${backendModel} — serving cached response`);
        simulateCachedStreaming(
          cached.response,
          (chunk) => updateLastMessage(chunk),
          () => {
            setStreaming(false);
            if (cached.citations && cached.citations.length > 0) {
              setLastMessageCitations(cached.citations);
            }
            updateTokenUsage(cached.inputTokens, cached.outputTokens, finalMultiplier);
            if (!isSmartAuto && !hasAttachments) incrementDailyUsage(selectedModel);
          }
        );
        return;
      }
    }
    
    try {
      if (useStreaming) {
        let fullResponse = '';
        
        if (isHealthMode) {
          console.log(`🏥 Health Mode: Sending to health-analysis with type: ${healthAnalysisType}`);
          await healthApi.sendMessageStream(
            apiMessages, healthAnalysisType,
            (chunk) => { fullResponse += chunk; updateLastMessage(chunk); },
            () => {
              setStreaming(false);
              const outputTokens = estimateTokens(fullResponse);
              updateTokenUsage(inputTokens, outputTokens, finalMultiplier);
              if (!isSmartAuto && !hasAttachments) incrementDailyUsage(selectedModel);
            },
            (err) => {
              console.error('Health analysis error:', err);
              setError(err.message || 'An error occurred');
              setStreaming(false);
            },
            abortControllerRef.current.signal
          );
        } else {
          await chatApi.sendMessageStream(
            apiMessages, backendModel, user.plan,
            (chunk) => { fullResponse += chunk; updateLastMessage(chunk); },
            (citations) => {
              setStreaming(false);
              if (citations && citations.length > 0) {
                setLastMessageCitations(citations);
              }
              const outputTokens = estimateTokens(fullResponse);
              updateTokenUsage(inputTokens, outputTokens, finalMultiplier);
              if (!isSmartAuto && !hasAttachments) incrementDailyUsage(selectedModel);
              // Store in cache for premium models
              if (shouldCache && fullResponse) {
                setCachedResponse(cacheKey, { response: fullResponse, citations: citations || undefined, inputTokens, outputTokens });
                console.log(`💾 Cached response for ${backendModel}`);
              }
            },
            (err) => {
              console.error('Streaming error:', err);
              const errorMessage = err.message || 'An error occurred';
              setError(errorMessage);
              setStreaming(false);
              
              if (errorMessage.includes('TOKEN_LIMIT_REACHED')) {
                toast.error("🪙 Token limit reached", { description: "You've used all your tokens for this period. Upgrade your plan to keep chatting." });
              } else if (errorMessage.includes('MODEL_NOT_ALLOWED')) {
                toast.error("🔒 Model not on your plan", { description: "Choose another model or upgrade your plan." });
              } else if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
                toast.error("⏳ Rate Limited", { description: "Too many requests. Please wait a moment." });
              } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
                toast.error("🔒 Authentication Error", { description: "API authentication failed." });
              } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
                toast.error("🌐 Network Error", { description: "Unable to connect." });
              } else if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
                toast.error("🔧 Server Error", { description: "Server issues. Please try again later." });
              } else {
                toast.error("❌ Error", { description: errorMessage });
              }
            },
            abortControllerRef.current.signal,
            modelName
          );
        }
      } else {
        const response = await chatApi.sendMessage(apiMessages, backendModel, user.plan, modelName);
        updateLastMessage(response.content);
        if (response.citations && response.citations.length > 0) {
          setLastMessageCitations(response.citations);
        }
        setStreaming(false);
        const outputTokens = estimateTokens(response.content);
        updateTokenUsage(inputTokens, outputTokens, finalMultiplier);
        if (!isSmartAuto && !hasAttachments) incrementDailyUsage(selectedModel);
      }
    } catch (err: any) {
      console.error('Send message error:', err);
      const errorMessage = err.message || 'Failed to send message';
      setError(errorMessage);
      setStreaming(false);
      
      if (err.name !== 'AbortError') {
        if (errorMessage.includes('TOKEN_LIMIT_REACHED')) {
          toast.error("🪙 Token limit reached", { description: "You've used all your tokens for this period. Upgrade your plan to keep chatting." });
        } else if (errorMessage.includes('MODEL_NOT_ALLOWED')) {
          toast.error("🔒 Model not on your plan", { description: "Choose another model or upgrade your plan." });
        } else if (errorMessage.includes('429') || errorMessage.toLowerCase().includes('rate limit')) {
          toast.error("⏳ Rate Limited", { description: "Too many requests." });
        } else if (errorMessage.includes('network') || errorMessage.includes('fetch') || errorMessage.includes('Failed to fetch')) {
          toast.error("🌐 Network Error", { description: "Unable to connect." });
        } else {
          toast.error("❌ Failed to Send Message", { description: errorMessage });
        }
      }
    }
  }, [activeChatId, pendingAttachments, selectedModel, models, user, addMessage, updateLastMessage, setLastMessageCitations, setStreaming, setError, clearAttachments, createNewChat, updateTokenUsage, buildMultimodalContent, isHealthMode, healthAnalysisType, getModelMultiplier, getDailyUsageRemaining, incrementDailyUsage]);
  
  const stopStreaming = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setStreaming(false);
    // Remove the last incomplete assistant message and its user message
    const currentChat = useChatStore.getState().chats.find(c => c.id === activeChatId);
    if (currentChat) {
      const msgs = currentChat.messages;
      if (msgs.length >= 2 && msgs[msgs.length - 1].role === 'assistant' && !msgs[msgs.length - 1].content) {
        // Empty assistant + user message: remove both
        setMessages(msgs.slice(0, -2));
      } else if (msgs.length >= 1 && msgs[msgs.length - 1].role === 'assistant') {
        // Incomplete assistant message: remove it and user message
        setMessages(msgs.slice(0, -2));
      }
    }
  }, [setStreaming, activeChatId, setMessages]);
  
  const regenerateLastMessage = useCallback(async () => {
    if (messages.length < 2) return;
    
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (!lastUserMsg) return;

    const newMessages = messages.slice(0, messages.lastIndexOf(lastUserMsg));
    setMessages(newMessages);
    
    await sendMessage(lastUserMsg.content);
  }, [messages, setMessages, sendMessage]);

  return {
    messages,
    isStreaming,
    isLoading,
    error,
    sendMessage,
    stopStreaming,
    regenerateLastMessage,
  };
};
