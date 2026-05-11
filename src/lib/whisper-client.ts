import { supabase } from '@/lib/supabase'

export class WhisperQuotaExceededError extends Error {
  constructor(message = 'Daily transcription limit reached. Try again tomorrow.') {
    super(message)
    this.name = 'WhisperQuotaExceededError'
  }
}

export class WhisperPayloadTooLargeError extends Error {
  constructor(message = 'Recording is too long. Try a shorter clip.') {
    super(message)
    this.name = 'WhisperPayloadTooLargeError'
  }
}

async function readStatus(error: unknown): Promise<number | null> {
  const ctx = (error as { context?: { status?: number } } | null | undefined)?.context
  if (ctx && typeof ctx.status === 'number') return ctx.status
  return null
}

export async function transcribeAudioBase64(params: {
  audioBase64: string
  format?: string
  language?: string
  promptHint?: string
}): Promise<string> {
  const { audioBase64, format, language, promptHint } = params
  if (!audioBase64 || audioBase64.length < 16) return ''

  const { data, error } = await supabase.functions.invoke<{ ok: boolean; text?: string; error?: string }>(
    'whisper-transcribe',
    {
      body: {
        audioBase64,
        format: format ?? 'm4a',
        language: language ?? 'en',
        prompt: promptHint ?? '',
      },
    },
  )

  if (error) {
    const status = await readStatus(error)
    if (status === 429) throw new WhisperQuotaExceededError()
    if (status === 413) throw new WhisperPayloadTooLargeError()
    throw new Error('Transcription failed')
  }
  if (!data || data.ok !== true) throw new Error(data?.error || 'Transcription failed')
  return (data.text ?? '').trim()
}

