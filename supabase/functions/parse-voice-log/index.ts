import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'
import OpenAI from 'npm:openai'
import Anthropic from 'npm:@anthropic-ai/sdk'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SYSTEM_PROMPT = `You are a parser for a baby care tracking app. Extract structured log data from a parent's voice note transcript.

Return ONLY valid JSON with no markdown or commentary. Match this schema exactly:
{
  "logType": "feeding" | "sleep" | "diaper" | "growth" | "unknown",
  "confidence": <number 0–1>,
  "fields": {
    "feedingType"?: "breast_left" | "breast_right" | "bottle" | "solid",
    "amount_ml"?: <number>,
    "duration_min"?: <number>,
    "sleepType"?: "nap" | "night",
    "diaperType"?: "wet" | "dirty" | "both",
    "weight_g"?: <number>,
    "length_cm"?: <number>
  }
}

Rules:
- "left breast" / "left side" → feedingType: "breast_left"
- "right breast" / "right side" → feedingType: "breast_right"
- "bottle" / "formula" / "expressed" → feedingType: "bottle"
- "solids" / "puree" / "food" → feedingType: "solid"
- "nap" / "sleeping now" / "fell asleep" → sleepType: "nap"
- "night sleep" / "bedtime" / "went to bed" → sleepType: "night"
- "wet" / "pee" → diaperType: "wet"
- "poo" / "dirty" / "soiled" → diaperType: "dirty"
- "both" / "pee and poo" → diaperType: "both"
- Convert weight mentions to grams: "4.2 kg" → 4200, "7 lbs 3 oz" → 3260
- Convert length to cm: "52 cm" → 52, "20 inches" → 50.8
- confidence > 0.85 = clearly understood, 0.6–0.85 = some ambiguity, < 0.6 = unclear
- If the note does not match any log type, return logType: "unknown" with confidence < 0.4`

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { audioUrl, babyId, babyName, babyAgeWeeks, feedingPreference } = await req.json()
    if (!audioUrl) {
      return new Response(JSON.stringify({ error: 'audioUrl is required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1 — Transcribe with Whisper
    const openai = new OpenAI({ apiKey: Deno.env.get('OPENAI_API_KEY')! })
    const audioResponse = await fetch(audioUrl)
    if (!audioResponse.ok) throw new Error(`Failed to fetch audio: ${audioResponse.status}`)
    const audioBlob = await audioResponse.blob()
    const audioFile = new File([audioBlob], 'audio.m4a', { type: audioBlob.type || 'audio/mp4' })

    const transcription = await openai.audio.transcriptions.create({
      file: audioFile,
      model: 'whisper-1',
    })
    const transcript = transcription.text?.trim() ?? ''

    if (!transcript) {
      return new Response(
        JSON.stringify({ transcript: '', logType: 'unknown', confidence: 0, fields: {} }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // 2 — Parse with Claude Haiku
    const anthropic = new Anthropic({ apiKey: Deno.env.get('ANTHROPIC_API_KEY')! })

    const userPrompt = `Baby context: ${babyName ?? 'unknown'}, ${babyAgeWeeks ?? '?'} weeks old, feeding preference: ${feedingPreference ?? 'unknown'}.

Voice note transcript: "${transcript}"

Extract the log entry as JSON.`

    const message = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const rawText = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}'

    let parsed: { logType: string; confidence: number; fields: Record<string, unknown> }
    try {
      const jsonMatch = rawText.match(/\{[\s\S]*\}/)
      parsed = jsonMatch ? JSON.parse(jsonMatch[0]) : { logType: 'unknown', confidence: 0, fields: {} }
    } catch {
      parsed = { logType: 'unknown', confidence: 0, fields: {} }
    }

    return new Response(
      JSON.stringify({
        transcript,
        logType: parsed.logType ?? 'unknown',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0,
        fields: parsed.fields ?? {},
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal error'
    return new Response(JSON.stringify({ error: message }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
