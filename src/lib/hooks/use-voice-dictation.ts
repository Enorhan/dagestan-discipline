'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { VoiceRecorder } from '@independo/capacitor-voice-recorder'
import { transcribeAudioBase64, WhisperPayloadTooLargeError, WhisperQuotaExceededError } from '@/lib/whisper-client'

export type VoiceDictationState = 'idle' | 'recording' | 'transcribing' | 'denied'
export type VoiceDictationErrorCode = 'unsupported' | 'permission' | 'quota' | 'payload-too-large' | 'transcription' | 'recording'

interface UseVoiceDictationOptions {
  onTranscript: (text: string) => void
  promptHint?: string
  language?: string
}

interface UseVoiceDictationResult {
  state: VoiceDictationState
  supported: boolean
  errorCode: VoiceDictationErrorCode | null
  toggle: () => Promise<void>
}

export function useVoiceDictation({ onTranscript, promptHint, language }: UseVoiceDictationOptions): UseVoiceDictationResult {
  const [state, setState] = useState<VoiceDictationState>('idle')
  const [supported, setSupported] = useState(false)
  const [errorCode, setErrorCode] = useState<VoiceDictationErrorCode | null>(null)
  const recordingRef = useRef(false)
  const onTranscriptRef = useRef(onTranscript)
  const promptHintRef = useRef(promptHint)
  const languageRef = useRef(language)

  useEffect(() => { onTranscriptRef.current = onTranscript }, [onTranscript])
  useEffect(() => { promptHintRef.current = promptHint }, [promptHint])
  useEffect(() => { languageRef.current = language }, [language])

  useEffect(() => {
    let cancelled = false
    VoiceRecorder.canDeviceVoiceRecord()
      .then(({ value }) => { if (!cancelled) setSupported(Boolean(value)) })
      .catch(() => { if (!cancelled) setSupported(false) })
    return () => { cancelled = true }
  }, [])

  const start = useCallback(async (): Promise<boolean> => {
    setErrorCode(null)
    try {
      const permission = await VoiceRecorder.hasAudioRecordingPermission().catch(() => ({ value: false }))
      let granted = Boolean(permission.value)
      if (!granted) {
        const requested = await VoiceRecorder.requestAudioRecordingPermission().catch(() => ({ value: false }))
        granted = Boolean(requested.value)
      }
      if (!granted) {
        setState('denied')
        setErrorCode('permission')
        return false
      }
      await VoiceRecorder.startRecording()
      recordingRef.current = true
      setState('recording')
      return true
    } catch {
      setState('idle')
      setErrorCode('recording')
      return false
    }
  }, [])

  const stop = useCallback(async () => {
    if (!recordingRef.current) return
    recordingRef.current = false
    setState('transcribing')
    try {
      const result = await VoiceRecorder.stopRecording()
      const recording = result?.value
      if (!recording?.recordDataBase64) {
        setState('idle')
        return
      }
      const transcript = await transcribeAudioBase64({
        audioBase64: recording.recordDataBase64,
        format: recording.fileExtension || 'm4a',
        language: languageRef.current,
        promptHint: promptHintRef.current,
      })
      if (transcript) onTranscriptRef.current(transcript)
      setState('idle')
    } catch (err) {
      setState('idle')
      if (err instanceof WhisperQuotaExceededError) setErrorCode('quota')
      else if (err instanceof WhisperPayloadTooLargeError) setErrorCode('payload-too-large')
      else setErrorCode('transcription')
    }
  }, [])

  const toggle = useCallback(async () => {
    if (state === 'transcribing') return
    if (recordingRef.current) {
      await stop()
      return
    }
    await start()
  }, [start, stop, state])

  useEffect(() => {
    return () => {
      if (recordingRef.current) {
        recordingRef.current = false
        VoiceRecorder.stopRecording().catch(() => undefined)
      }
    }
  }, [])

  return { state, supported, errorCode, toggle }
}

