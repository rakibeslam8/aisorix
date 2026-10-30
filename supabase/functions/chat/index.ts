import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPromptAddendum, withAdminPrompt } from "../_shared/promptTemplates.ts";
import { getPlanLimits } from "../_shared/planLimits.ts";
import { modelPolicy } from "../_shared/models.ts";
import {
  GUEST_WINDOW_DAYS, IP_LIMIT_MULTIPLIER, IP_WINDOW_DAYS, USER_WINDOW_DAYS,
  addUsage, estimateTokens, getEffectivePlan, getUsage, ipUsageKey, messagesTokens, meterSse, remainingCharge,
  type StreamSummary,
} from "../_shared/usage.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

// Two-stage attachment pipeline:
//   Stage 1 — OpenAI GPT-5 mini analyzes uploaded images/files/audio/PDFs (fast multimodal)
//   Stage 2 — User's selected model writes the final response using the analysis as context
// Stronger user-selected models skip Stage 1 and handle attachments themselves.
const ANALYZER_MODEL = 'openai/gpt-5-mini';
const DEFAULT_MODEL = 'openai/gpt-4o-mini'; // Fallback when no model is provided (a free-tier model)

// Models capable enough to handle attachments directly without a Stage 1 analyzer pass.
const STRONG_MODELS = new Set<string>([
  'openai/gpt-5',
  'openai/gpt-5-mini',
  'openai/gpt-5-nano',
  'openai/gpt-5.1',
  'openai/gpt-5.2',
  'google/gemini-2.5-flash',
  'google/gemini-2.5-pro',
  'google/gemini-3-flash-preview',
  'google/gemini-3.1-pro-preview',
  'anthropic/claude-sonnet-4.5',
  'anthropic/claude-opus-4.5',
  'qwen/qwen3-vl-235b-a22b-instruct',
  'qwen/qwen3-235b-a22b-2507',
  'x-ai/grok-4-fast',
  'x-ai/grok-4.1-fast',
  'deepseek/deepseek-v3.2',
  'meta-llama/llama-4-maverick',
  'meta-llama/llama-4-scout',
  'mistralai/mistral-large-2512',
  'moonshotai/kimi-k2.5',
]);

const ANALYZER_SYSTEM_PROMPT = `You are a multimodal analysis engine. Your sole job is to extract every relevant detail from the attached images and/or files so that another AI model can answer the user's question without seeing the originals.

Produce a structured technical brief in clean markdown. Cover (where applicable):
- 📄 For each file/image: filename, type, and a 1-line summary
- 🔤 Full OCR / extracted text (verbatim where useful, summarized where long)
- 🧱 Document structure: headings, sections, tables, lists
- 📊 Key data points, numbers, dates, names, entities
- 💻 Code: language, purpose, notable functions, potential issues
- 🖼️ Images: detailed visual description, objects, people, UI elements, charts, diagrams
- 🔗 Cross-file relationships, comparisons, anomalies
- ⚠️ Anything unclear, low-quality, or unreadable

CRITICAL RULES:
- Do NOT answer the user's question. Only analyze.
- Do NOT add opinions or recommendations.
- Be exhaustive but well-organized — the responder model will rely entirely on your output.
- If a file is empty, corrupted, or unreadable, say so explicitly.`;

// Professional system prompt factory - uses actual model name
const getSystemPrompt = (modelName: string = 'AI Assistant') => `You are ${modelName}, a world-class AI assistant with advanced capabilities in analyzing any type of file or content.

## 🎯 Response Style Guidelines (CRITICAL):
You MUST use emojis strategically throughout your responses for better user experience, like a professional AI assistant:

### Emoji Usage Rules:
1. **Start responses with relevant emoji** - Match the topic (💡 for ideas, 🚀 for launches, 📊 for data, etc.)
2. **Use emojis for section headers** - Make content scannable and engaging
3. **Highlight key points with emojis** - ✅ for success, ⚠️ for warnings, 💡 for tips
4. **Keep it professional** - Don't overuse, 2-4 emojis per paragraph max
5. **Match the context** - Serious topics get fewer emojis, creative topics get more

### Common Emoji Patterns:
- 🎯 Goals/Objectives | 📋 Lists/Tasks | 💡 Ideas/Tips
- ✅ Success/Done | ❌ Errors/Issues | ⚠️ Warnings
- 🚀 Launch/Deploy | 🔧 Fix/Configure | 📦 Install/Package
- 📊 Data/Stats | 📈 Growth | 📉 Decline
- 🔐 Security | 🔑 Authentication | 👤 Users
- 💻 Code/Tech | 🌐 Web | 📱 Mobile
- ⏰ Time/Schedule | 📅 Dates | 🎉 Celebrations
- 🇧🇩 Bangladesh | ✨ Special/Magic | 🔥 Hot/Trending

## Your Expertise Areas:
- **📄 Document Analysis**: PDFs, Word documents, text files - extract key insights, summarize, analyze structure
- **🖼️ Image Analysis**: Photos, screenshots, diagrams, charts, infographics - describe content, extract text (OCR), analyze visual elements
- **💻 Code Analysis**: All programming languages - review, explain, debug, suggest improvements, identify patterns
- **📊 Data Analysis**: JSON, CSV, spreadsheets - identify patterns, statistics, anomalies, provide insights
- **🔧 Technical Documents**: Architecture diagrams, flowcharts, technical specs - interpret and explain

## CRITICAL: Multi-File Analysis Rules
When the user uploads MULTIPLE files:
1. **📁 Acknowledge ALL files**: Start by listing all attached files you received
2. **🔍 Analyze EACH file**: Provide analysis for every file, not just the first one
3. **📌 Reference by name**: Always cite the specific filename when discussing content (e.g., "In report.pdf...")
4. **🔗 Compare when relevant**: If files are related, compare and cross-reference them
5. **📋 Structured response**: Use clear headings for each file's analysis:
   
   ### 📄 [filename1.ext]
   [Analysis of first file]
   
   ### 📄 [filename2.ext]
   [Analysis of second file]
   
   ### 🔗 Cross-File Insights (if applicable)
   [Connections, comparisons, or combined insights]

## Response Guidelines:
1. **🎯 Be Precise**: Provide accurate, detailed analysis based on the actual content
2. **📋 Be Structured**: Use clear headings, bullet points, and organized formatting
3. **📌 Cite Sources**: Reference specific parts of files, line numbers for code, sections of documents
4. **✅ Be Actionable**: Provide concrete recommendations when applicable
5. **✨ Use Markdown**: Format responses with proper syntax highlighting, tables, and formatting

## 🖼️ For Images:
- Describe what you see in detail
- Extract any visible text
- Identify objects, people, text, UI elements, diagrams
- Analyze composition, layout, or design if relevant

## 💻 For Code:
- Use proper syntax highlighting with language identifiers
- Explain the logic and purpose
- Identify potential issues or improvements
- Reference specific line numbers when discussing code

## 📄 For Documents:
- Summarize key points first
- Provide detailed analysis as needed
- Quote relevant passages when citing
- Identify main themes, arguments, or data points

IMPORTANT: When the user sends a simple acknowledgment like "thanks", "thank you", "ok", "bye", "got it", "nice", "great", "cool", "awesome", "perfect", "alright", etc., respond briefly and naturally (1-2 sentences max). Do NOT repeat, re-explain, or re-generate your previous answer. Just acknowledge their message concisely and ask if they need anything else.

Always maintain a professional, expert tone while being helpful, thorough, and engaging with appropriate emoji usage! 🚀`;

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user OR allow guest with x-guest-id header
    const authHeader = req.headers.get('Authorization');
    const guestId = req.headers.get('x-guest-id');
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      authHeader ? { global: { headers: { Authorization: authHeader } } } : undefined
    );

    let user: { id: string; email?: string } | null = null;
    let isGuest = false;

    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: claimsData, error: authError } = await supabaseClient.auth.getClaims(token);
      if (!authError && claimsData?.claims?.sub) {
        user = { id: claimsData.claims.sub, email: claimsData.claims.email };
      }
    }

    if (!user) {
      if (!guestId || guestId.length < 8 || guestId.length > 64) {
        return new Response(
          JSON.stringify({ error: 'Unauthorized' }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      isGuest = true;
      user = { id: `guest:${guestId}` };
    }

    const { messages, model, stream = true, userPlan, modelName } = await req.json();
    
    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "OpenRouter API key is not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'messages array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ===== Server-side limits =====
    // The plan comes from the database, never from the request body (`userPlan` is ignored).
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const limits = await getPlanLimits(admin);
    const plan = isGuest ? 'free' : await getEffectivePlan(admin, user.id);
    const usageKey = isGuest ? `g:${guestId}` : `u:${user.id}`;
    const windowDays = isGuest ? GUEST_WINDOW_DAYS : USER_WINDOW_DAYS;
    const tokenLimit = isGuest ? limits.guest : limits.plans[plan];

    const limitReached = (message: string) => new Response(
      JSON.stringify({ error: 'TOKEN_LIMIT_REACHED', message, plan, limit: tokenLimit }),
      { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

    // A null result means the ledger could not be read: fail open (logged) rather than take chat down.
    const usedBefore = await getUsage(admin, usageKey, windowDays);
    if (usedBefore !== null && usedBefore >= tokenLimit) {
      return limitReached(isGuest
        ? 'Free trial limit reached. Please sign up to continue.'
        : "You've reached your token limit for this period. Please upgrade your plan.");
    }

    // Guests also share a per-IP daily budget so changing x-guest-id does not reset the limit.
    let ipKey: string | null = null;
    if (isGuest) {
      ipKey = await ipUsageKey(req.headers);
      if (ipKey) {
        const ipUsed = await getUsage(admin, ipKey, IP_WINDOW_DAYS);
        if (ipUsed !== null && ipUsed >= limits.guest * IP_LIMIT_MULTIPLIER) {
          return limitReached('Too much guest usage from this network today. Please sign up to continue.');
        }
      }
    }

    const requestedModel = typeof model === 'string' && model ? model : DEFAULT_MODEL;
    const policy = modelPolicy(requestedModel, plan);
    if (!policy.allowed) {
      return new Response(
        JSON.stringify({ error: 'MODEL_NOT_ALLOWED', message: 'This model is not available on your plan.', plan }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    if (!policy.known) console.warn(`Unknown model "${requestedModel}" charged at ${policy.multiplier}x`);

    const charge = async (tokens: number) => {
      await addUsage(admin, usageKey, tokens, windowDays);
      if (ipKey) await addUsage(admin, ipKey, tokens, IP_WINDOW_DAYS);
    };

    // Generate system prompt with actual model name
    const systemPrompt = withAdminPrompt(
      getSystemPrompt(modelName || 'AI Assistant'),
      await getPromptAddendum(admin, 'chat'),
    );

    // Prepare messages with system prompt
    let processedMessages = [
      { role: 'system', content: systemPrompt },
      ...messages.filter((m: any) => m.role !== 'system')
    ];

    // Detect attachments in the LAST user message (current turn only — not history)
    const lastUserIdx = (() => {
      for (let i = processedMessages.length - 1; i >= 0; i--) {
        if (processedMessages[i].role === 'user') return i;
      }
      return -1;
    })();

    const lastUserMsg = lastUserIdx >= 0 ? processedMessages[lastUserIdx] : null;

    const hasImages = !!lastUserMsg && Array.isArray(lastUserMsg.content)
      && lastUserMsg.content.some((c: any) => c.type === 'image_url');

    const hasFiles = !!lastUserMsg && typeof lastUserMsg.content === 'string'
      && (lastUserMsg.content.includes('📄 FILE:')
          || lastUserMsg.content.includes('--- FILE CONTENT ---')
          || lastUserMsg.content.includes('📁 ATTACHED FILES'));

    let selectedModel = requestedModel;
    const responderName = modelName || 'AI Assistant';

    // ===== STAGE 1: GPT-5 mini analyzer =====
    // Skip when the user already picked a strong multimodal model (handles attachments itself).
    const skipAnalyzer = STRONG_MODELS.has(selectedModel);

    if ((hasImages || hasFiles) && !skipAnalyzer && lastUserMsg) {
      console.log(`🔬 Stage 1: Running ${ANALYZER_MODEL} analyzer (images: ${hasImages}, files: ${hasFiles})`);
      const analyzerStart = Date.now();

      let analysisText = '';
      try {
        const analyzerResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
            "Content-Type": "application/json",
            "HTTP-Referer": "https://aisorix.com",
            "X-Title": "AI Sorix - Attachment Analyzer"
          },
          body: JSON.stringify({
            model: ANALYZER_MODEL,
            messages: [
              { role: 'system', content: ANALYZER_SYSTEM_PROMPT },
              { role: 'user', content: lastUserMsg.content }
            ],
            stream: false,
            max_tokens: 2048,
          }),
        });

        if (analyzerResponse.ok) {
          const analyzerData = await analyzerResponse.json();
          analysisText = analyzerData?.choices?.[0]?.message?.content || '';
          await charge(analyzerData?.usage?.total_tokens ?? estimateTokens(analysisText));
          console.log(`✅ Stage 1 complete in ${Date.now() - analyzerStart}ms — analysis length: ${analysisText.length} chars`);
        } else {
          const errBody = await analyzerResponse.text();
          console.error(`⚠️ Stage 1 analyzer failed (${analyzerResponse.status}): ${errBody.slice(0, 300)}`);
        }
      } catch (analyzerErr) {
        console.error(`⚠️ Stage 1 analyzer threw:`, analyzerErr);
      }

      // Build the responder's user message: original text prompt + analysis (text-only)
      // This lets ANY responder model (including text-only Sonar/nano) answer about attachments.
      let originalText = '';
      if (typeof lastUserMsg.content === 'string') {
        originalText = lastUserMsg.content;
      } else if (Array.isArray(lastUserMsg.content)) {
        const textPart = lastUserMsg.content.find((c: any) => c.type === 'text');
        originalText = textPart?.text || '';
        const imageCount = lastUserMsg.content.filter((c: any) => c.type === 'image_url').length;
        if (imageCount > 0 && !originalText.trim()) {
          originalText = `Please analyze ${imageCount === 1 ? 'this image' : `these ${imageCount} images`}.`;
        }
      }

      const analysisBlock = analysisText
        ? `\n\n---\n## 📎 Attachment Analysis (from GPT-5 mini)\n\n${analysisText}\n---\n\nUsing the analysis above, please respond to the user's original request in your own voice and style.`
        : `\n\n[⚠️ Attachment analysis was unavailable — please respond based on the user's text and any filenames mentioned.]`;

      processedMessages = [
        ...processedMessages.slice(0, lastUserIdx),
        { role: 'user', content: originalText + analysisBlock }
      ];

      console.log(`🎤 Stage 2: Responder model = ${selectedModel} (${responderName})`);
    } else if ((hasImages || hasFiles) && skipAnalyzer) {
      console.log(`🎯 Single-stage: ${selectedModel} is strong enough — skipping separate analyzer`);
    }

    console.log(`Calling OpenRouter with model: ${selectedModel}, messages count: ${processedMessages.length}, stream: ${stream}`);

    // Check if this is a Perplexity/search model that returns citations
    const isSearchModel = selectedModel.includes('perplexity') || selectedModel.includes('sonar');

    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://aisorix.com",
        "X-Title": "AI Sorix - Universal Document Analyst"
      },
      body: JSON.stringify({
        model: selectedModel,
        messages: processedMessages,
        stream: stream,
        max_tokens: 8192,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter API error: ${response.status} - ${errorText}`);
      
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Insufficient credits. Please add funds to your OpenRouter account." }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (response.status === 401) {
        return new Response(
          JSON.stringify({ error: "Authentication failed. Please check your API key." }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: `API error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Upstream accepted the request: charge the input now, the rest when the response completes.
    const inputEstimate = messagesTokens(processedMessages);
    const preCharged = Math.round(inputEstimate * policy.multiplier);
    await charge(preCharged);
    const finish = (summary: StreamSummary) =>
      charge(remainingCharge(inputEstimate, summary, policy.multiplier, preCharged));

    if (stream) {
      // For search models, we need to buffer and extract citations at the end
      if (isSearchModel && response.body) {
        // Create a transform stream to capture citations
        const encoder = new TextEncoder();
        const decoder = new TextDecoder();
        let citations: string[] = [];

        const transformStream = new TransformStream({
          transform(chunk, controller) {
            const text = decoder.decode(chunk, { stream: true });
            const lines = text.split('\n');
            
            for (const line of lines) {
              if (line.startsWith('data: ') && line.length > 6) {
                const jsonStr = line.slice(6).trim();
                if (jsonStr === '[DONE]') {
                  // Append citations event before [DONE]
                  if (citations.length > 0) {
                    const citationsEvent = `data: ${JSON.stringify({ citations })}\n\n`;
                    controller.enqueue(encoder.encode(citationsEvent));
                  }
                  controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                  continue;
                }
                
                try {
                  const parsed = JSON.parse(jsonStr);
                  
                  // Extract citations from the response
                  if (parsed.citations && Array.isArray(parsed.citations)) {
                    citations = parsed.citations;
                    console.log(`📚 Found ${citations.length} citations`);
                  }
                } catch {
                  // Ignore parse errors
                }
              }
              
              // Forward the original line
              controller.enqueue(encoder.encode(line + '\n'));
            }
          }
        });

        const transformedStream = response.body.pipeThrough(meterSse(finish)).pipeThrough(transformStream);
        
        return new Response(transformedStream, {
          headers: { 
            ...corsHeaders, 
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
          },
        });
      }

      // Return streaming response for non-search models
      console.log("Returning streaming response");
      return new Response(response.body ? response.body.pipeThrough(meterSse(finish)) : response.body, {
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        },
      });
    } else {
      // Return non-streaming response with citations included
      const data = await response.json();
      await finish({ text: String(data?.choices?.[0]?.message?.content ?? ''), usage: data?.usage });
      console.log("Returning non-streaming response");
      
      // Include citations in the response if available
      if (data.citations) {
        console.log(`📚 Found ${data.citations.length} citations in response`);
      }
      
      return new Response(JSON.stringify(data), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    console.error("Chat function error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error occurred" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
