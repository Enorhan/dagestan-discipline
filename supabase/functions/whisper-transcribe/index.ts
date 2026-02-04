// ============================================================================
// DAGESTAN DISCIPLINE - OPENAI WHISPER TRANSCRIPTION EDGE FUNCTION
// Transcribes audio to text using OpenAI Whisper API
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TranscribeRequest {
  audioBase64: string
  language?: string  // Default: 'en' for English
  format?: string    // Audio format: 'm4a', 'mp3', 'wav', etc.
}

interface TranscribeResponse {
  success: boolean
  text?: string
  error?: string
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error('Missing authorization header')
    }

    // Create Supabase client to verify user
    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Verify the user
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token)

    if (authError || !user) {
      throw new Error('Unauthorized')
    }

    // Parse request body
    const requestData: TranscribeRequest = await req.json()

    if (!requestData.audioBase64 || requestData.audioBase64.trim().length === 0) {
      throw new Error('Audio data is required')
    }

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Decode base64 audio to binary
    const audioBytes = Uint8Array.from(atob(requestData.audioBase64), c => c.charCodeAt(0))
    
    // Determine file extension
    const format = requestData.format || 'm4a'
    const language = requestData.language || 'en'

    // Create form data for OpenAI Whisper API
    const formData = new FormData()
    const audioBlob = new Blob([audioBytes], { type: `audio/${format}` })
    formData.append('file', audioBlob, `audio.${format}`)
    formData.append('model', 'whisper-1')
    formData.append('language', language)
    formData.append('response_format', 'text')

    console.log(`🎤 Transcribing audio (${audioBytes.length} bytes, format: ${format}, language: ${language})`)

    // Call OpenAI Whisper API
    const openaiResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
      },
      body: formData,
    })

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text()
      console.error('OpenAI Whisper API error:', errorText)
      throw new Error(`Whisper API error: ${openaiResponse.status}`)
    }

    // Get transcribed text
    const transcribedText = await openaiResponse.text()
    console.log(`✅ Transcription successful: "${transcribedText.substring(0, 50)}..."`)

    const response: TranscribeResponse = {
      success: true,
      text: transcribedText.trim(),
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error processing transcription request:', error)
    const response: TranscribeResponse = {
      success: false,
      error: error.message || 'An unexpected error occurred',
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

