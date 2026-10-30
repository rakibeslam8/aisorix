import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPlanLimits, normalizePlan } from "../_shared/planLimits.ts";
import { USER_WINDOW_DAYS, addUsage, getUsage } from "../_shared/usage.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

const ALLOWED_MODELS = ['deepseek/deepseek-v3.2', 'anthropic/claude-sonnet-4.5'];
const MODEL_MULTIPLIERS: Record<string, number> = {
  'deepseek/deepseek-v3.2': 1,
  'anthropic/claude-sonnet-4.5': 6,
};

const estimateTokens = (text: string): number => Math.ceil(text.length / 4);

const PROJECT_SYSTEM_PROMPT = `You are Sorix Project Assistant, an expert AI developer and project manager. You help users create, develop, and manage their projects professionally.

## Your Capabilities:
- **Project Planning**: Break down projects into actionable tasks and milestones
- **Code Generation**: Write clean, professional code in any language
- **Architecture Design**: Design scalable, maintainable system architectures
- **Problem Solving**: Debug issues and optimize solutions
- **Documentation**: Create clear technical documentation

## Response Guidelines:
1. Be Proactive: Anticipate user needs and suggest improvements
2. Be Thorough: Provide complete, production-ready solutions
3. Be Clear: Use proper formatting, code blocks, and structure
4. Be Practical: Focus on actionable, implementable solutions

For Code: Use proper syntax highlighting, include comments, follow conventions, handle edge cases.
For Planning: Break work into phases, estimate complexity, identify dependencies.

Always maintain a professional, expert tone while being helpful and encouraging.`;

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    const authClient = createClient(SUPABASE_URL, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } }
    });
    const { data: { user: authUser }, error: authError } = await authClient.auth.getUser();
    if (authError || !authUser) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { projectId, message, conversationHistory, userId, model, files } = await req.json();

    // The caller may only act as themselves (this function uses the service-role key below).
    if (userId && userId !== authUser.id) {
      return new Response(
        JSON.stringify({ error: 'User ID mismatch' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!OPENROUTER_API_KEY) {
      console.error("OPENROUTER_API_KEY is not configured");
      return new Response(
        JSON.stringify({ error: "AI service is not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!projectId || !message || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate model
    const selectedModel = model && ALLOWED_MODELS.includes(model) ? model : 'deepseek/deepseek-v3.2';
    const multiplier = MODEL_MULTIPLIERS[selectedModel];

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get project details
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .eq('user_id', userId)
      .maybeSingle();

    if (projectError || !project) {
      return new Response(
        JSON.stringify({ error: "Project not found or access denied" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check user's subscription and token limits
    const { data: subscription } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const planId = normalizePlan(subscription?.plan_id);
    const limits = await getPlanLimits(supabase);
    const tokensLimit = limits.plans[planId];
    const tokensUsed = (await getUsage(supabase, `u:${userId}`, USER_WINDOW_DAYS)) ?? 0;

    if (tokensUsed >= tokensLimit) {
      return new Response(
        JSON.stringify({ error: "TOKEN_LIMIT_REACHED", message: "You've reached your token limit. Please upgrade your plan." }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build file context string
    let fileContextStr = '';
    if (files && Array.isArray(files) && files.length > 0) {
      fileContextStr = '\n\n## Project Files:\nThe user has the following files in their project. You can reference and suggest edits to these files:\n\n';
      for (const f of files) {
        fileContextStr += `### ${f.path}\n\`\`\`${f.language}\n${f.content}\n\`\`\`\n\n`;
      }
    }

    // Build messages
    const contextPrompt = `${PROJECT_SYSTEM_PROMPT}

## Current Project Context:
- **Project Name**: ${project.name}
- **Description**: ${project.description || 'No description provided'}
- **Status**: ${project.status}
- **Created**: ${new Date(project.created_at).toLocaleDateString()}
${fileContextStr}
Focus your responses on helping with this specific project. When the user has project files, reference them directly and suggest code changes inline.`;

    const messages = [
      { role: 'system', content: contextPrompt },
      ...(conversationHistory || []).map((msg: any) => ({
        role: msg.role,
        content: msg.content
      })),
      { role: 'user', content: message }
    ];

    const inputTokens = messages.reduce((acc: number, msg: any) => acc + estimateTokens(msg.content), 0);

    // Save user message to DB
    await supabase.from('project_messages').insert({
      project_id: projectId,
      user_id: userId,
      role: 'user',
      content: message,
      tokens_used: Math.round(inputTokens * multiplier),
    });

    console.log(`Project AI: project=${project.name}, model=${selectedModel}, multiplier=${multiplier}x, input_tokens=${inputTokens}`);

    // Call OpenRouter API
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://sorixai.lovable.app",
        "X-Title": "Sorix AI Projects",
      },
      body: JSON.stringify({
        model: selectedModel,
        messages,
        stream: true,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`OpenRouter error: ${response.status} - ${errorText}`);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: `AI service error: ${response.status}` }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Stream response and collect full content for DB save
    const reader = response.body!.getReader();
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let fullContent = '';

    const stream = new ReadableStream({
      async start(controller) {
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            controller.enqueue(encoder.encode(chunk));

            // Extract content from SSE
            const lines = chunk.split('\n');
            for (const line of lines) {
              if (line.startsWith('data: ') && line !== 'data: [DONE]') {
                try {
                  const data = JSON.parse(line.slice(6));
                  const content = data.choices?.[0]?.delta?.content;
                  if (content) fullContent += content;
                } catch { /* ignore parse errors in stream */ }
              }
            }
          }

          // After stream completes, save assistant message and deduct tokens
          const outputTokens = estimateTokens(fullContent);
          const totalTokens = Math.round((inputTokens + outputTokens) * multiplier);

          await supabase.from('project_messages').insert({
            project_id: projectId,
            user_id: userId,
            role: 'assistant',
            content: fullContent,
            tokens_used: totalTokens,
          });

          // Update project stats
          await supabase.from('projects')
            .update({
              tokens_used: (project.tokens_used || 0) + totalTokens,
              updated_at: new Date().toISOString(),
            })
            .eq('id', projectId);

          // Deduct from the user's token ledger (atomic; also mirrored to subscriptions.tokens_used)
          await addUsage(supabase, `u:${userId}`, totalTokens, USER_WINDOW_DAYS);

          console.log(`Project AI complete: output_tokens=${outputTokens}, total_deducted=${totalTokens}`);
          controller.close();
        } catch (err) {
          console.error('Stream error:', err);
          controller.error(err);
        }
      }
    });

    return new Response(stream, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Input-Tokens': inputTokens.toString(),
        'X-Model': selectedModel,
        'X-Multiplier': multiplier.toString(),
      },
    });

  } catch (error) {
    console.error("Project AI error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
