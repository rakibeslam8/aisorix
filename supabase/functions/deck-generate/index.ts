import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPromptAddendum, withAdminPrompt } from "../_shared/promptTemplates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const TOKENS_PER_SLIDE = 2000;
const TOKENS_PER_IMAGE = 12000;

const planLimits: Record<string, number> = {
  free: 15000,
  basic: 800000,
  pro: 1500000,
  premium: 3000000,
  premium_plus: 7000000,
  max: 17000000,
  enterprise: 50000000,
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = user.id;

    const {
      prompt, slideCount = 5, theme = "dark", generateImages = true,
      textContent = "concise", artStyle = "illustration", language = "auto",
      format = "presentation", cardSize = "traditional", scenario = "general",
      audience = "auto", tone = "neutral", aspectRatio = "16:9",
      additionalInstructions = "",
      imageModel = "black-forest-labs/flux.2-klein-4b",
      mode = "deck",
      layout: singleLayout = "split",
      slideNumber: singleSlideNumber = 1,
    } = await req.json();


    const LANGUAGE_LABELS: Record<string, string> = {
      english: "English", bangla: "Bangla (Bengali)", hindi: "Hindi", urdu: "Urdu",
      arabic: "Arabic", spanish: "Spanish", french: "French", chinese: "Chinese (Simplified)", japanese: "Japanese",
    };
    const languageLabel = LANGUAGE_LABELS[String(language).toLowerCase()];
    const languageInstruction = languageLabel
      ? `\nIMPORTANT: Write every slide heading and bullet point in ${languageLabel}. image_prompt MUST stay in English so the image model understands it.`
      : "";

    const SCENARIO_LABELS: Record<string, string> = {
      "teaching": "Teaching Courseware", "work-summary": "Work Summary", "work-plan": "Work Plan",
      "project-report": "Project Report", "solution": "Solution", "research-report": "Research Report",
      "general": "General",
    };
    const AUDIENCE_LABELS: Record<string, string> = {
      students: "Students", educator: "Educators", manager: "Managers",
      "direct-report": "Direct Reports", colleague: "Colleagues",
    };
    const extraGuidance: string[] = [];
    if (scenario && scenario !== "auto" && SCENARIO_LABELS[scenario]) extraGuidance.push(`Scenario: ${SCENARIO_LABELS[scenario]}`);
    if (audience && audience !== "auto" && AUDIENCE_LABELS[audience]) extraGuidance.push(`Target audience: ${AUDIENCE_LABELS[audience]}`);
    if (tone && tone !== "neutral") extraGuidance.push(`Tone: ${tone}`);
    if (format && format !== "presentation") extraGuidance.push(`Output format style: ${format}`);
    if (aspectRatio) extraGuidance.push(`Intended aspect ratio: ${aspectRatio}`);
    if (additionalInstructions && typeof additionalInstructions === "string" && additionalInstructions.trim()) {
      extraGuidance.push(`Additional instructions from user: ${additionalInstructions.trim()}`);
    }
    const extraInstruction = extraGuidance.length ? `\n${extraGuidance.map((g) => `- ${g}`).join("\n")}` : "";

    if (!prompt || typeof prompt !== "string") {
      return new Response(JSON.stringify({ error: "Prompt is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isSingle = mode === "single";
    const effectiveSlideCount = isSingle ? 1 : slideCount;

    // Check token balance
    const { data: sub } = await supabase
      .from("subscriptions")
      .select("tokens_used, plan_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const currentUsed = sub?.tokens_used ?? 0;
    const planId = sub?.plan_id ?? "free";
    const limit = planLimits[planId] ?? 15000;

    const estimatedTextTokens = slideCount * TOKENS_PER_SLIDE;
    const estimatedImageTokens = generateImages ? slideCount * TOKENS_PER_IMAGE : 0;
    const estimatedTotal = estimatedTextTokens + estimatedImageTokens;

    // Free plan: allow 20 slides free, no token deduction
    let isFreeSlides = false;
    if (planId === "free") {
      const { data: presentations } = await supabase
        .from("presentations")
        .select("slide_count")
        .eq("user_id", userId);
      const totalSlidesUsed = (presentations || []).reduce((sum: number, p: any) => sum + (p.slide_count || 0), 0);
      const slidesRemaining = 20 - totalSlidesUsed;

      if (slidesRemaining <= 0) {
        return new Response(
          JSON.stringify({ error: "insufficient_tokens", tokensUsed: currentUsed, tokensLimit: limit, freeSlidesUsed: totalSlidesUsed, freeSlidesLimit: 20 }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      // Free user still has slides left — allow without token check
      isFreeSlides = true;
    } else {
      // Paid users: normal token check
      if (currentUsed + estimatedTotal > limit) {
        return new Response(
          JSON.stringify({ error: "insufficient_tokens", tokensUsed: currentUsed, tokensLimit: limit }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Call LLM for slide structure
    const openrouterKey = Deno.env.get("OPENROUTER_API_KEY");
    if (!openrouterKey) {
      return new Response(JSON.stringify({ error: "AI not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build text density instruction
    let textInstruction = "3-5 bullet points per slide";
    if (textContent === "minimal") textInstruction = "2-3 very short bullet points per slide";
    else if (textContent === "concise") textInstruction = "3-4 concise bullet points per slide";
    else if (textContent === "detailed") textInstruction = "4-6 longer, more detailed bullet points per slide";
    else if (textContent === "extensive") textInstruction = "5-8 detailed bullet points with thorough descriptions per slide";

    // Build art style instruction — always enforce style
    const artStyleMap: Record<string, string> = {
      "illustration": "digital illustration, hand-drawn artistic style",
      "photo": "photorealistic high-resolution photograph",
      "abstract": "abstract art, geometric shapes, vibrant non-representational",
      "3d": "3D rendered CGI, three-dimensional modeling, studio lighting, Blender quality",
      "line-art": "minimalist line art, clean ink outlines, black and white sketch",
    };
    const artDescription = artStyleMap[artStyle] || artStyle;
    const artInstruction = `\nCRITICAL: Every image_prompt MUST start with "${artDescription}, " — this is mandatory for all slides.`;

    const singleRules = `
- Generate exactly 1 slide
- Use layout "${singleLayout}"
- slide_number must be ${singleSlideNumber}`;
    const deckRules = `
- Generate exactly ${slideCount} slides
- First slide should be a title slide with layout "full-image"
- Last slide should be a summary/conclusion with layout "text-only"
- Most middle slides should use "split" layout`;

    const systemPrompt = `You are an expert presentation designer. Output a strict JSON array where each object represents a slide. Each slide must contain:
- slide_number (integer starting from 1)
- heading (string, concise title)
- bullet_points (array of ${textInstruction})
- image_prompt (a highly detailed prompt optimized for FLUX.2 image generation, describing a professional visual for the slide)
- layout (one of: "split", "text-only", "full-image")

Rules:${isSingle ? singleRules : deckRules}
- Make image_prompts vivid, specific, and professional${artInstruction}${languageInstruction}${extraInstruction}
- Output ONLY the JSON array, no markdown, no explanation`;

    const llmResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openrouterKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://sorixai.lovable.app",
        "X-Title": "Sorix Deck",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          { role: "system", content: withAdminPrompt(systemPrompt, await getPromptAddendum(createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!), 'deck')) },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
    });

    if (!llmResponse.ok) {
      const errBody = await llmResponse.text();
      console.error("LLM error:", llmResponse.status, errBody);
      return new Response(
        JSON.stringify({ error: "Slide generation failed", details: errBody }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const llmData = await llmResponse.json();
    let content = llmData.choices?.[0]?.message?.content || "";

    // Extract JSON from potential markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (jsonMatch) content = jsonMatch[1].trim();

    let slides: any[];
    try {
      slides = JSON.parse(content);
    } catch {
      console.error("Failed to parse LLM JSON:", content.substring(0, 500));
      return new Response(
        JSON.stringify({ error: "Failed to parse slide structure" }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Prepend art style to each slide's image_prompt for guaranteed style enforcement
    for (const slide of slides) {
      if (slide.image_prompt && !slide.image_prompt.startsWith(artDescription)) {
        slide.image_prompt = `${artDescription}, ${slide.image_prompt}`;
      }
    }

    // Generate images in parallel
    let imageCount = 0;
    if (generateImages) {
      const imagePromises = slides.map(async (slide: any, idx: number) => {
        if (!slide.image_prompt || slide.layout === "text-only") return;
        try {
          const imgResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${openrouterKey}`,
              "Content-Type": "application/json",
              "HTTP-Referer": "https://sorixai.lovable.app",
              "X-Title": "Sorix Deck",
            },
            body: JSON.stringify({
              model: imageModel || "black-forest-labs/flux.2-klein-4b",
              messages: [{ role: "user", content: slide.image_prompt }],
              modalities: ["image"],
            }),
          });

          if (!imgResponse.ok) {
            console.error(`Image gen failed for slide ${idx + 1}:`, await imgResponse.text());
            return;
          }

          const imgData = await imgResponse.json();
          const message = imgData.choices?.[0]?.message;
          let imageUrl = "";
          if (message?.images?.length > 0) {
            imageUrl = message.images[0]?.image_url?.url || "";
          }
          if (!imageUrl && Array.isArray(message?.content)) {
            const imgPart = message.content.find((c: any) => c.type === "image_url");
            imageUrl = imgPart?.image_url?.url || "";
          }
          if (!imageUrl && typeof message?.content === "string" && message.content.startsWith("data:image")) {
            imageUrl = message.content;
          }

          if (imageUrl) {
            slide.image_url = imageUrl;
            imageCount++;
          }
        } catch (err) {
          console.error(`Image gen error slide ${idx + 1}:`, err);
        }
      });

      await Promise.allSettled(imagePromises);
    }

    // Calculate actual token cost
    const actualTextTokens = slides.length * TOKENS_PER_SLIDE;
    const actualImageTokens = imageCount * TOKENS_PER_IMAGE;
    const totalTokens = actualTextTokens + actualImageTokens;

    const title = slides[0]?.heading || "Untitled Presentation";

    if (!isSingle) {
      // Save to presentations table
      await supabase.from("presentations").insert({
        user_id: userId,
        title,
        prompt,
        slide_count: slides.length,
        slides_data: slides,
        theme,
        tokens_used: totalTokens,
      });

      // Save to analysis_history
      await supabase.from("analysis_history").insert({
        user_id: userId,
        tool: "deck",
        title,
        input_data: { prompt, slideCount, theme, generateImages },
        result_data: { slides, tokens_used: totalTokens },
      });
    }

    // Deduct tokens only for paid users
    if (sub && !isFreeSlides) {
      await supabase
        .from("subscriptions")
        .update({ tokens_used: currentUsed + totalTokens })
        .eq("user_id", userId)
        .eq("status", "active");
    }

    if (isSingle) {
      return new Response(
        JSON.stringify({
          slide: slides[0],
          tokensUsed: totalTokens,
          totalTokensUsed: currentUsed + totalTokens,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        slides,
        title,
        tokensUsed: totalTokens,
        totalTokensUsed: currentUsed + totalTokens,
        imageCount,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Deck generate error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
