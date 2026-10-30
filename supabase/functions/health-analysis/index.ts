import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { getPromptAddendum, withAdminPrompt } from "../_shared/promptTemplates.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const HEALTH_SYSTEM_PROMPT = `# 🏥 Sorix Health - AI Medical Assistant for Bangladesh

You are **Sorix Health**, an advanced AI medical assistant specialized in health analysis for Bangladeshi people. You provide professional, empathetic, and detailed health guidance in both Bangla and English.

## Core Focus:
- Diagnose health problems based on symptoms
- Suggest medicines available in Bangladesh with BDT pricing
- Recommend tests ONLY when medically necessary (serious conditions)
- Provide prevention tips and lifestyle advice
- Guide when to see a doctor

## Important:
- Always clarify you're an AI, not a replacement for professional medical care
- For emergencies, direct to nearest hospital
- Use Bangladesh-available medicine brand names (Square, Beximco, Incepta, etc.)
- Prices in BDT (Bangladeshi Taka)
- Be empathetic and clear`;

const STRUCTURED_ANALYSIS_PROMPT = `You are Sorix Health AI, a medical assistant for Bangladeshi people. Given patient information and symptoms, provide a comprehensive health analysis.

You must respond with ONLY a valid JSON object (no markdown, no code fences).

Your response must follow this exact schema:
{
  "diagnosis": "Clear diagnosis of the health problem in both Bangla and English",
  "severity": "low|medium|high|critical",
  "severityScore": 0-100,
  "causes": ["Possible cause 1", "Possible cause 2"],
  "medicines": [
    {
      "name": "Medicine name (Bangladesh brand name)",
      "type": "Antibiotic|Painkiller|Antacid|Antihistamine|etc.",
      "dosage": "e.g., 500mg",
      "frequency": "e.g., দিনে ৩ বার (3 times daily)",
      "duration": "e.g., ৫-৭ দিন (5-7 days)",
      "cost": 50,
      "warning": "Important warnings or side effects"
    }
  ],
  "recommendedTests": [
    {
      "name": "Test name",
      "reason": "Why this test is needed",
      "urgency": "routine|soon|urgent",
      "estimatedCost": 500
    }
  ],
  "preventionTips": ["Prevention tip 1", "Prevention tip 2"],
  "lifestyle": ["Lifestyle suggestion 1", "Lifestyle suggestion 2"],
  "timeline": {
    "treatmentDuration": "e.g., ৫-৭ দিন (5-7 days)",
    "expectedRecovery": "e.g., ১-২ সপ্তাহ (1-2 weeks)"
  },
  "detailedAnalysis": "Detailed medical analysis with explanation",
  "whenToSeeDoctor": "When the patient should visit a doctor urgently"
}

Rules:
- All costs in BDT (Bangladeshi Taka)
- Use Bangladesh-available medicine brand names (Square, Beximco, Incepta, Renata, ACI, etc.)
- Only recommend tests if the condition is serious or diagnosis is unclear
- For mild conditions, focus on medicines and home remedies
- Include Bangla text where helpful
- severity must be exactly "low", "medium", "high", or "critical"
- recommendedTests can be empty array [] for non-serious conditions
- Respond ONLY with the JSON object, nothing else`;

const STRUCTURED_MODELS = [
  'google/gemma-3-27b-it',
  'deepseek/deepseek-r1-0528',
  'anthropic/claude-sonnet-4.5',
];

async function callModel(apiKey: string, model: string, messages: any[], stream: boolean, opts?: { max_tokens?: number; temperature?: number }) {
  return await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://sorix.health',
      'X-Title': 'Sorix Health',
    },
    body: JSON.stringify({
      model,
      messages,
      stream,
      max_tokens: opts?.max_tokens ?? 8192,
      temperature: opts?.temperature ?? 0.7,
    }),
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
    const { mode, messages, stream = true, analysisType = 'general', patientData, files } = body;

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
    if (patientData && JSON.stringify(patientData).length > 50_000) {
      return new Response(JSON.stringify({ error: 'Patient data too large (max 50KB)' }),
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

      if (patientData) {
        userContent += `Patient Information:\n- Gender: ${patientData.gender}\n- Age: ${patientData.age}\n- Category: ${patientData.patientCategory}\n- Weight: ${patientData.weight} ${patientData.weightUnit}\n- Height: ${patientData.height} ${patientData.heightUnit}\n`;
        if (patientData.existingMedications) userContent += `- Current Medications: ${patientData.existingMedications}\n`;
        if (patientData.medicalHistory) userContent += `- Medical History: ${patientData.medicalHistory}\n`;
        if (patientData.allergies) userContent += `- Allergies: ${patientData.allergies}\n`;
        userContent += `\nSymptoms/Concerns:\n${patientData.symptoms}\n\n`;
        userContent += 'Please analyze these symptoms, diagnose the problem, suggest medicines available in Bangladesh with BDT pricing, and recommend tests only if the condition is serious.\n';
      }

      const apiMessages: any[] = [
        { role: 'system', content: STRUCTURED_ANALYSIS_PROMPT },
      ];

      if (files && files.length > 0) {
        const contentParts: any[] = [{ type: 'text', text: userContent || 'Please analyze these medical documents.' }];
        for (const file of files) {
          if (file.base64 && (file.type?.startsWith('image/') || file.type === 'application/pdf')) {
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
      for (const model of STRUCTURED_MODELS) {
        try {
          console.log(`Trying model: ${model}`);
          const response = await callModel(OPENROUTER_API_KEY, model, apiMessages, false, { max_tokens: 4096, temperature: 0.3 });

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

          // Fallback
          return new Response(JSON.stringify({
            diagnosis: content,
            severity: 'medium',
            severityScore: 50,
            causes: [],
            medicines: [],
            recommendedTests: [],
            preventionTips: [],
            lifestyle: [],
            timeline: { treatmentDuration: 'N/A', expectedRecovery: 'N/A' },
            detailedAnalysis: content,
            whenToSeeDoctor: 'If symptoms persist or worsen, consult a doctor.',
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

    // === STREAMING CHAT MODE (default) ===
    const model = 'google/gemma-3-27b-it';

    const processedMessages = [
      { role: 'system', content: withAdminPrompt(HEALTH_SYSTEM_PROMPT, await getPromptAddendum(createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!), 'health')) },
      ...(messages || []).filter((m: { role: string }) => m.role !== 'system'),
    ];

    const response = await callModel(OPENROUTER_API_KEY, model, processedMessages, stream);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter error:', response.status, errorText);

      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: 'Rate limit exceeded. Please try again in a moment.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ error: 'Health analysis service temporarily unavailable' }),
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
    console.error('Health analysis error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
