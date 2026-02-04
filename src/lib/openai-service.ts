// ============================================
// OPENAI SERVICE - CLIENT-SIDE INTEGRATION
// ============================================

import { supabase } from './supabase'

export type TextContext = 'workout_note' | 'reflection' | 'goal' | 'general'
export type ActionType = 'analyze' | 'enhance' | 'refine'

interface TranscribeRequest {
  audioBase64: string
  language?: string
  format?: string
}

interface TranscribeResponse {
  success: boolean
  text?: string
  error?: string
}

interface EnhanceTextRequest {
  action: ActionType
  text: string
  context?: TextContext
  clarifyingAnswers?: string
  enhancedText?: string
  refinementInstructions?: string
}

interface EnhanceTextResponse {
  success: boolean
  action: ActionType
  needsClarification?: boolean
  clarifyingQuestions?: string[]
  enhancedText?: string
  error?: string
}

/**
 * OpenAI Service for Dagestan Discipline
 * Provides AI-powered features like speech-to-text and text enhancement
 */
export class OpenAIService {
  private static instance: OpenAIService
  private isInitialized = false

  private constructor() {}

  static getInstance(): OpenAIService {
    if (!OpenAIService.instance) {
      OpenAIService.instance = new OpenAIService()
    }
    return OpenAIService.instance
  }

  /**
   * Initialize the service
   */
  async initialize(): Promise<void> {
    try {
      // Check if user is authenticated
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        console.warn('OpenAI service: User not authenticated')
        this.isInitialized = false
        return
      }

      this.isInitialized = true
      console.log('OpenAI service initialized')
    } catch (error) {
      console.error('Failed to initialize OpenAI service:', error)
      this.isInitialized = false
    }
  }

  /**
   * Transcribe audio to text using OpenAI Whisper
   */
  async transcribeAudio(
    audioBase64: string,
    language: string = 'en',
    format: string = 'm4a'
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('OpenAI service not initialized')
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('User not authenticated')
      }

      const response = await supabase.functions.invoke<TranscribeResponse>('whisper-transcribe', {
        body: {
          audioBase64,
          language,
          format,
        } as TranscribeRequest,
      })

      if (response.error) {
        throw new Error(response.error.message || 'Transcription failed')
      }

      if (!response.data?.success || !response.data.text) {
        throw new Error(response.data?.error || 'Transcription failed')
      }

      return response.data.text
    } catch (error) {
      console.error('Transcription error:', error)
      throw error
    }
  }

  /**
   * Analyze text to check if clarification is needed
   */
  async analyzeText(text: string, context: TextContext = 'general'): Promise<{
    needsClarification: boolean
    questions: string[]
  }> {
    if (!this.isInitialized) {
      throw new Error('OpenAI service not initialized')
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('User not authenticated')
      }

      const response = await supabase.functions.invoke<EnhanceTextResponse>('enhance-text', {
        body: {
          action: 'analyze',
          text,
          context,
        } as EnhanceTextRequest,
      })

      if (response.error) {
        throw new Error(response.error.message || 'Analysis failed')
      }

      if (!response.data?.success) {
        throw new Error(response.data?.error || 'Analysis failed')
      }

      return {
        needsClarification: response.data.needsClarification || false,
        questions: response.data.clarifyingQuestions || [],
      }
    } catch (error) {
      console.error('Analysis error:', error)
      throw error
    }
  }

  /**
   * Enhance text with AI
   */
  async enhanceText(
    text: string,
    context: TextContext = 'general',
    clarifyingAnswers?: string
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('OpenAI service not initialized')
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('User not authenticated')
      }

      const response = await supabase.functions.invoke<EnhanceTextResponse>('enhance-text', {
        body: {
          action: 'enhance',
          text,
          context,
          clarifyingAnswers,
        } as EnhanceTextRequest,
      })

      if (response.error) {
        throw new Error(response.error.message || 'Enhancement failed')
      }

      if (!response.data?.success || !response.data.enhancedText) {
        throw new Error(response.data?.error || 'Enhancement failed')
      }

      return response.data.enhancedText
    } catch (error) {
      console.error('Enhancement error:', error)
      throw error
    }
  }

  /**
   * Refine already enhanced text based on user instructions
   */
  async refineText(
    enhancedText: string,
    refinementInstructions: string
  ): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('OpenAI service not initialized')
    }

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        throw new Error('User not authenticated')
      }

      const response = await supabase.functions.invoke<EnhanceTextResponse>('enhance-text', {
        body: {
          action: 'refine',
          text: '', // Not used in refine action
          enhancedText,
          refinementInstructions,
        } as EnhanceTextRequest,
      })

      if (response.error) {
        throw new Error(response.error.message || 'Refinement failed')
      }

      if (!response.data?.success || !response.data.enhancedText) {
        throw new Error(response.data?.error || 'Refinement failed')
      }

      return response.data.enhancedText
    } catch (error) {
      console.error('Refinement error:', error)
      throw error
    }
  }

  /**
   * Check if the service is available
   */
  get isAvailable(): boolean {
    return this.isInitialized
  }
}

// Export singleton instance
export const openAIService = OpenAIService.getInstance()
