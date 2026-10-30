import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPromptAddendum, withAdminPrompt } from "../_shared/promptTemplates.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const AGRO_SYSTEM_PROMPT = `# 🌾 Sorix Agro - AI কৃষি বিশেষজ্ঞ (AI Agricultural Expert)

You are **Sorix Agro**, an advanced AI agricultural assistant specialized for **Bangladeshi farmers**. You provide professional, practical, and affordable crop disease diagnosis, pest management, and treatment recommendations.

## 🎯 Core Capabilities:
- **Crop Disease Identification**: Blast, blight, leaf spot, wilt, rust, smut, rot, mosaic virus
- **Pest Identification**: Stem borer, BPH (Brown Plant Hopper), leaf folder, aphids, thrips, mites
- **Soil Issues**: Nutrient deficiency, pH problems, waterlogging, salinity
- **Treatment Recommendations**: Both chemical and organic/biological solutions

## 🇧🇩 Bangladesh-Specific Knowledge:
- **Local Pesticide Brands**: ACI Crop Care, Syngenta BD, BRAC Agro, Auto Crop Care, McDonald Bangladesh, Haychem BD
- **Common Products**: Amistar Top, Tilt 250 EC, Ripcord, Furadan 5G, Bavistin, Nativo, Score 250 EC, Virtako
- **Pricing in BDT**: All costs must be in Bangladeshi Taka (৳)
- **Crops**: Rice (Aman, Aus, Boro), Wheat, Jute, Vegetables, Fruits, Spices
- **Seasons**: Kharif-1 (Pre-Kharif, Mar-Jun), Kharif-2 (Jul-Oct), Rabi (Nov-Feb)
- **Divisions**: Dhaka, Chittagong, Rajshahi, Khulna, Barishal, Sylhet, Rangpur, Mymensingh

## 🌟 Communication Style:
- Mix of Bangla and English for accessibility
- Simple, farmer-friendly language
- Practical, actionable advice
- Include both chemical and organic alternatives
- Always mention safety precautions`;

const STRUCTURED_ANALYSIS_PROMPT = `You are Sorix Agro AI. Given crop information, problem description, and optionally photos, respond with ONLY a valid JSON object (no markdown, no code fences).

Your response must follow this exact schema:
{
  "diagnosis": "What the problem is (2-3 sentences in Bangla+English mix)",
  "severity": "low|medium|high|critical",
  "severityScore": 0-100,
  "causes": ["cause1", "cause2"],
  "medicines": [
    {
      "name": "Medicine/Pesticide name",
      "type": "Fungicide|Insecticide|Herbicide|Fertilizer|Bio-agent",
      "dosage": "2ml per liter water",
      "applicationMethod": "Spray|Soil drench|Seed treatment|Granular",
      "frequency": "Every 7 days, 2-3 times",
      "cost": 350,
      "isBiological": false
    }
  ],
  "preventionTips": ["tip1", "tip2"],
  "alternativeTreatments": ["organic alternative 1", "organic alternative 2"],
  "timeline": {
    "treatmentDuration": "7-14 days",
    "expectedRecovery": "2-3 weeks after treatment"
  },
  "detailedAnalysis": "Detailed analysis with recommendations in Bangla+English..."
}

Rules:
- Costs in BDT (৳)
- Use Bangladesh-available pesticide brands (ACI, Syngenta BD, BRAC Agro, etc.)
- Include at least one biological/organic option in medicines
- severityScore: 0-100
- severity: "low" (0-25), "medium" (26-50), "high" (51-75), "critical" (76-100)
- Respond ONLY with the JSON object`;

const MODELS = [
  'deepseek/deepseek-r1-0528',
  'google/gemini-3-pro-preview',
  'google/gemma-3n-e4b-it',
];

async function callModel(apiKey: string, model: string, messages: any[], stream: boolean) {
  return await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://sorix.agro',
      'X-Title': 'Sorix Agro',
    },
    body: JSON.stringify({
      model,
      messages,
      stream,
      max_tokens: 8192,
      temperature: 0.7,
    }),
  });
}

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

    const body = await req.json();
    const { mode, messages, stream = true, cropData, files } = body;

    // === INPUT VALIDATION ===
    if (messages && messages.length > 100) {
      return new Response(JSON.stringify({ error: 'Too many messages (max 100)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (messages && messages.some((m: any) => m.content && m.content.length > 100_000)) {
      return new Response(JSON.stringify({ error: 'Message content too large (max 100KB)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (files && files.length > 10) {
      return new Response(JSON.stringify({ error: 'Too many files (max 10)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (files && files.some((f: any) => f.base64 && f.base64.length > 5 * 1024 * 1024)) {
      return new Response(JSON.stringify({ error: 'File too large (max 5MB)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (cropData && JSON.stringify(cropData).length > 50_000) {
      return new Response(JSON.stringify({ error: 'Crop data too large (max 50KB)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
    if (!OPENROUTER_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === STRUCTURED ANALYSIS MODE ===
    if (mode === 'structured_analysis') {
      let userContent = '';

      if (cropData) {
        userContent += `Crop Information:\n`;
        if (cropData.cropType) userContent += `- Crop Type: ${cropData.cropType}\n`;
        if (cropData.region) userContent += `- Region: ${cropData.region}\n`;
        if (cropData.season) userContent += `- Season: ${cropData.season}\n`;
        if (cropData.landArea) userContent += `- Land Area: ${cropData.landArea}\n`;
        if (cropData.cropAge) userContent += `- Crop Age: ${cropData.cropAge}\n`;
        if (cropData.previousTreatments) userContent += `- Previous Treatments: ${cropData.previousTreatments}\n`;
        userContent += `\nProblem Description:\n${cropData.problemDescription}\n`;
      }

      const apiMessages: any[] = [
        { role: 'system', content: STRUCTURED_ANALYSIS_PROMPT },
      ];

      if (files && files.length > 0) {
        const contentParts: any[] = [{ type: 'text', text: userContent || 'Please analyze these crop images.' }];
        for (const file of files) {
          if (file.base64 && file.type?.startsWith('image/')) {
            contentParts.push({
              type: 'image_url',
              image_url: { url: file.base64 },
            });
          }
        }
        apiMessages.push({ role: 'user', content: contentParts });
      } else {
        apiMessages.push({ role: 'user', content: userContent });
      }

      let lastError = '';
      for (const model of MODELS) {
        try {
          console.log(`Trying model: ${model}`);
          const response = await callModel(OPENROUTER_API_KEY, model, apiMessages, false);

          if (!response.ok) {
            const errText = await response.text();
            console.error(`Model ${model} failed: ${response.status} ${errText}`);
            lastError = errText;
            continue;
          }

          const data = await response.json();
          let content = data.choices?.[0]?.message?.content || '';

          content = content.replace(/```json\s*/g, '').replace(/```\s*/g, '');
          content = content.replace(/<think>[\s\S]*?<\/think>/g, '');
          content = content.trim();

          const jsonMatch = content.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return new Response(JSON.stringify(parsed), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
          }

          return new Response(JSON.stringify({
            diagnosis: content,
            severity: 'medium',
            severityScore: 50,
            causes: [],
            medicines: [],
            preventionTips: [],
            alternativeTreatments: [],
            timeline: { treatmentDuration: 'N/A', expectedRecovery: 'N/A' },
            detailedAnalysis: content,
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        } catch (err) {
          console.error(`Model ${model} error:`, err);
          lastError = String(err);
          continue;
        }
      }

      return new Response(
        JSON.stringify({ error: `All models failed. Last error: ${lastError}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // === STREAMING CHAT MODE ===
    const model = 'google/gemma-3n-e4b-it';

    const processedMessages = [
      { role: 'system', content: withAdminPrompt(AGRO_SYSTEM_PROMPT, await getPromptAddendum(createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!), 'agro')) },
      ...(messages || []).filter((m: { role: string }) => m.role !== 'system'),
    ];

    const response = await callModel(OPENROUTER_API_KEY, model, processedMessages, stream);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter error:', response.status, errorText);
      return new Response(
        JSON.stringify({ error: 'Agro analysis service temporarily unavailable' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (stream) {
      return new Response(response.body, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' },
      });
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Agro analysis error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
