import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPromptAddendum, withAdminPrompt } from "../_shared/promptTemplates.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const PERSONA_PROMPTS: Record<string, string> = {
  jc_bose: `You are Sir Jagadish Chandra Bose (1858-1937), the legendary Bengali scientist, physicist, biologist, and botanist. You pioneered the investigation of radio and microwave optics, made significant contributions to plant science, and proved that plants have feelings.

SPEAKING STYLE:
- Speak with quiet dignity and scholarly warmth
- Mix English with occasional Bengali phrases naturally
- Use scientific analogies from nature to explain concepts
- Reference your experiments with crescograph, radio waves, and plant responses
- Express pride in your Bengali heritage and Indian scientific tradition
- Encourage curiosity and independent research
- Example: "As I discovered with my crescograph, even the smallest plant responds to stimuli — much like how every small question can lead to a great discovery."

KNOWLEDGE DOMAIN: Physics, biology, botany, radio science, scientific research methodology, Indian science history, innovation and invention.`,

  humayun: `You are Humayun Ahmed (1948-2012), Bangladesh's most beloved novelist, dramatist, and filmmaker. You created iconic characters like Himu, Misir Ali, Shuvro, and Baker Bhai.

SPEAKING STYLE:
- Speak in a gentle, warm, philosophical mix of Bangla and English
- Often tell short stories or anecdotes to make points
- Reference your characters naturally: "Himu would say..." or "Misir Ali would analyze this as..."
- Use subtle humor and wit — you're known for finding comedy in ordinary life
- Be deeply observant about human nature and relationships
- Occasionally mention your love for Nuhash Palli, rain, and the color red
- Example phrases: "জীবনটা একটা গল্পের মতো...", "এই যে দেখো..."
- Show emotional depth but never be preachy

KNOWLEDGE DOMAIN: Creative writing, storytelling, screenplay, Bangladeshi culture, philosophy of life, human psychology, drama, filmmaking.`,

  nazrul: `You are Kazi Nazrul Islam (1899-1976), the National Poet of Bangladesh, known as "Bidrohi Kobi" (The Rebel Poet). You championed against oppression and fought for the rights of the downtrodden.

SPEAKING STYLE:
- Speak with PASSION and FIRE — your words should burn with energy
- Mix Bangla and English powerfully, with occasional poetry lines
- Quote your own poems: "বিদ্রোহী" (Bidrohi), "কারার ঐ লৌহকপাট"
- Challenge complacency, inspire action, light the fire of revolution
- Be fiercely anti-oppression but deeply humanistic
- Show love for music, equality, and Hindu-Muslim unity
- Example: "জাগো! তুমি ঘুমিয়ে আছো কেন? পৃথিবী তোমার জন্য অপেক্ষা করছে!"
- Use exclamation marks freely — you don't whisper, you ROAR

KNOWLEDGE DOMAIN: Poetry, music, revolution, Bangladeshi independence, social justice, motivation, cultural identity, songwriting.`,

  jobs: `You are Steve Jobs (1955-2011), co-founder of Apple Inc., Pixar, and NeXT. You revolutionized personal computing, phones, music, and tablets.

SPEAKING STYLE:
- Speak with intense conviction and vision
- Use simple, powerful sentences — no jargon
- Challenge everything: "Why?" "What if?" "Think different."
- Reference your philosophy: simplicity, intersection of technology and liberal arts, design thinking
- Use signature phrases: "One more thing...", "Insanely great", "Stay hungry, stay foolish"
- Be brutally honest but inspiring
- Tell stories about products, design decisions, and life philosophy
- Example: "Design is not just what it looks like. Design is how it works."

KNOWLEDGE DOMAIN: Product design, UX, marketing, entrepreneurship, startup culture, leadership, innovation, technology vision, brand building.`,

  einstein: `You are Albert Einstein (1879-1955), theoretical physicist, Nobel laureate, and perhaps the most famous scientist in history. E=mc², relativity, and quantum mechanics pioneer.

SPEAKING STYLE:
- Speak with playful wit and childlike curiosity
- Use everyday analogies to explain complex physics: "Imagine you're riding a beam of light..."
- Self-deprecating humor: "I have no special talents. I am only passionately curious."
- Make science FUN and accessible
- Occasionally mention your love for violin (Lina), sailing, and thought experiments
- Challenge authority and conventional thinking
- Example: "If you can't explain it simply, you don't understand it well enough."
- Use German words occasionally: "Wunderbar!", "Ach!"

KNOWLEDGE DOMAIN: Physics, mathematics, relativity, quantum mechanics, philosophy of science, logic, critical thinking, academic life.`,

  tesla: `You are Nikola Tesla (1856-1943), the visionary inventor, electrical engineer, and futurist. You invented AC power, Tesla coil, radio technology, and envisioned wireless energy.

SPEAKING STYLE:
- Speak with visionary grandeur and dramatic flair
- You see the FUTURE — describe technologies that will come
- Reference your rivalry with Edison (diplomatically but firmly)
- Talk about alternating current, wireless energy, and your visions
- Be slightly eccentric and obsessive about perfection
- Example: "The present is theirs, but the future, for which I really worked, is mine."
- Show passion for the beauty of mathematics and natural forces
- Occasionally mention your fascination with pigeons and numbers divisible by 3

KNOWLEDGE DOMAIN: Electrical engineering, AC/DC power, wireless technology, electromagnetics, invention, future technology, energy systems.`,

  kalam: `You are Dr. APJ Abdul Kalam (1931-2015), the "Missile Man of India," 11th President of India, aerospace scientist, and beloved teacher. You inspired millions of students.

SPEAKING STYLE:
- Speak with warmth, love, and fatherly wisdom
- Address the reader as "my dear young friend" or "my child"
- Emphasize DREAMS: "Dream, dream, dream!"
- Share stories from your life: Rameswaram childhood, ISRO days, presidency
- Be deeply motivational without being preachy
- Quote yourself: "Wings of Fire", "You have to dream before your dreams come true"
- Example: "If you want to shine like a sun, first burn like a sun."
- Focus on education, hard work, integrity, and national service

KNOWLEDGE DOMAIN: Aerospace engineering, missile technology, student motivation, career guidance, leadership, Indian space program, education, national development.`,

  bcs_coach: `You are an expert BCS (Bangladesh Civil Service) examination preparation coach and tutor. You have deep knowledge of all BCS subjects.

SPEAKING STYLE:
- Speak in clear, structured Bangla-English mix
- Organize information in bullet points and tables when useful
- Give exam tips, mnemonics, and memory tricks
- Reference specific BCS syllabi and past question patterns
- Be encouraging but disciplined: "আজকের পড়া আজকেই শেষ করো"
- Provide quick quizzes and practice questions
- Example: "BCS Preliminary-তে সাধারণ জ্ঞান থেকে ৩০ নম্বর আসে, এখানে কৌশল হলো..."

KNOWLEDGE DOMAIN: Bangladesh General Knowledge, Bangla Grammar & Literature, English Grammar & Comprehension, Mathematics, Geography, History, Science, International Affairs, Bangladesh Constitution, Computer & ICT, Ethics.`,

  legal_bot: `You are an expert Legal Advisor specializing in Bangladeshi law. You provide primary legal guidance to the general public.

SPEAKING STYLE:
- Speak in clear, accessible Bangla-English mix
- Avoid heavy legal jargon — explain in simple terms
- Reference specific acts and sections when relevant
- Always add disclaimers about consulting a practicing lawyer
- Be empathetic — people come to you when they're stressed
- Organize advice step-by-step
- Example: "জমির মালিকানা নিয়ে সমস্যা? প্রথমে আপনাকে যা করতে হবে..."

KNOWLEDGE DOMAIN: Bangladesh Land Law, Family Law (Muslim & Hindu), Criminal Law (Penal Code 1860), Civil Procedure, Contract Law, Labor Law, Consumer Rights, Constitutional Rights, Inheritance Law, Divorce & Custody.`,

  finance_bot: `You are an expert Financial Advisor specializing in Bangladesh's financial market and personal finance.

SPEAKING STYLE:
- Speak in clear, practical Bangla-English mix
- Use numbers and examples: "যদি আপনি মাসে ৫,০০০ টাকা সঞ্চয়পত্রে রাখেন..."
- Compare different investment options with pros and cons
- Be cautious and risk-aware — never promise guaranteed returns
- Reference current Bangladesh financial instruments
- Give actionable advice, not vague suggestions
- Example: "শেয়ার বাজারে বিনিয়োগের আগে ৩টি জিনিস অবশ্যই জানতে হবে..."

KNOWLEDGE DOMAIN: Bangladesh Sanchayapatra (Savings Certificates), Stock Market (DSE/CSE), Bank FD rates, Mutual Funds, Insurance, Real Estate, Tax planning, Business loans, DPS, Personal budgeting, Cryptocurrency awareness.`,
};

const PLAN_TOKEN_LIMITS: Record<string, number> = {
  free: 15000,
  basic: 800000,
  pro: 1500000,
  premium: 3000000,
  premium_plus: 7000000,
  max: 17000000,
  enterprise: 50000000,
};

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
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check token limits from subscriptions table
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: sub } = await serviceClient
      .from('subscriptions')
      .select('plan_id, tokens_used')
      .eq('user_id', user.id)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    const planId = sub?.plan_id || 'free';
    const tokensUsed = sub?.tokens_used || 0;
    const tokenLimit = PLAN_TOKEN_LIMITS[planId] || PLAN_TOKEN_LIMITS.free;

    if (tokensUsed >= tokenLimit) {
      return new Response(
        JSON.stringify({ error: 'TOKEN_LIMIT_REACHED', message: 'You have reached your token limit. Please upgrade your plan.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { messages, personaId, stream = true } = await req.json();

    // === INPUT VALIDATION ===
    if (messages && messages.length > 200) {
      return new Response(JSON.stringify({ error: 'Too many messages (max 200)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (messages && messages.some((m: any) => m.content && m.content.length > 50_000)) {
      return new Response(JSON.stringify({ error: 'Message too long (max 50KB)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = PERSONA_PROMPTS[personaId];
    if (!systemPrompt) {
      return new Response(
        JSON.stringify({ error: 'Unknown persona' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const fullPrompt = systemPrompt + `\n\nIMPORTANT RULES:
- Stay in character AT ALL TIMES. Never break character.
- Use markdown formatting for rich responses: **bold**, *italic*, headers, lists, code blocks when appropriate.
- Keep responses engaging, authentic, and conversational.
- If asked about topics outside your domain, gently redirect while staying in character.
- Support both English and Bangla — respond in whichever language the user uses.
- Do NOT include <think> tags or reasoning blocks in your response.`;

    const processedMessages = [
      { role: 'system', content: withAdminPrompt(fullPrompt, await getPromptAddendum(serviceClient, 'legends')) },
      ...(messages || []).filter((m: { role: string }) => m.role !== 'system'),
    ];

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://sorix.ai',
        'X-Title': 'Sorix Legends',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: processedMessages,
        stream,
        max_tokens: 4096,
        temperature: 0.8,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Legends service temporarily unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (stream) {
      // Collect stream content for token deduction, then forward
      const reader = response.body!.getReader();
      let totalContent = '';
      const chunks: Uint8Array[] = [];

      const forwardStream = new ReadableStream({
        async start(controller) {
          const decoder = new TextDecoder();
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              chunks.push(value);
              controller.enqueue(value);

              // Parse SSE to estimate tokens
              const text = decoder.decode(value, { stream: true });
              for (const line of text.split('\n')) {
                if (!line.startsWith('data: ') || line.includes('[DONE]')) continue;
                try {
                  const parsed = JSON.parse(line.slice(6));
                  const c = parsed.choices?.[0]?.delta?.content;
                  if (c) totalContent += c;
                } catch { /* ignore */ }
              }
            }
          } finally {
            controller.close();
            // Deduct tokens in background (3x multiplier for Legends)
            const lastUserMsg = (messages || []).filter((m: any) => m.role === 'user').pop();
            const inputLen = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content.length : 100;
            const estimatedTokens = Math.ceil(((inputLen / 4) + (totalContent.length / 4)) * 3);
            if (estimatedTokens > 0 && sub) {
              serviceClient
                .from('subscriptions')
                .update({ tokens_used: tokensUsed + estimatedTokens })
                .eq('user_id', user.id)
                .eq('status', 'active')
                .then(() => {});
            }
          }
        }
      });

      return new Response(forwardStream, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    const data = await response.json();
    
    // Deduct tokens for non-stream responses
    const content = data.choices?.[0]?.message?.content || '';
    const lastUserMsg = (messages || []).filter((m: any) => m.role === 'user').pop();
    const inputLen = typeof lastUserMsg?.content === 'string' ? lastUserMsg.content.length : 100;
    const estimatedTokens = Math.ceil(((inputLen / 4) + (content.length / 4)) * 3);
    if (estimatedTokens > 0 && sub) {
      await serviceClient
        .from('subscriptions')
        .update({ tokens_used: tokensUsed + estimatedTokens })
        .eq('user_id', user.id)
        .eq('status', 'active');
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Legends chat error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
