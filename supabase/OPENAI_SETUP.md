# OpenAI Integration Setup for Dagestan Discipline

This document explains how to set up and use the OpenAI integration in the Dagestan Discipline app.

## Overview

The OpenAI integration provides two main features:
1. **Speech-to-Text (Whisper)**: Convert audio recordings to text
2. **Text Enhancement**: Improve workout notes, reflections, and goals with AI

## Architecture

The integration uses Supabase Edge Functions to securely call the OpenAI API:
- **Client-side**: `src/lib/openai-service.ts` - TypeScript service for calling Edge Functions
- **Server-side**: 
  - `supabase/functions/whisper-transcribe/` - Audio transcription
  - `supabase/functions/enhance-text/` - Text analysis and enhancement

## Setup Instructions

### 1. Set OpenAI API Key in Supabase

You need to add your OpenAI API key as a secret in Supabase:

```bash
# Login to Supabase CLI
supabase login

# Link to your project
supabase link --project-ref ftwtxslonvjgvbaexkwn

# Set the OpenAI API key
supabase secrets set OPENAI_API_KEY=your-openai-api-key-here
```

### 2. Deploy Edge Functions

Deploy the Edge Functions to Supabase:

```bash
# Deploy whisper-transcribe function
supabase functions deploy whisper-transcribe

# Deploy enhance-text function
supabase functions deploy enhance-text
```

### 3. Initialize the Service in Your App

In your app initialization code (e.g., `src/app/layout.tsx` or a context provider):

```typescript
import { openAIService } from '@/lib/openai-service'

// Initialize the service when the app starts
useEffect(() => {
  openAIService.initialize()
}, [])
```

## Usage Examples

### Speech-to-Text (Whisper)

```typescript
import { openAIService } from '@/lib/openai-service'

// Convert audio to text
async function transcribeAudio(audioBase64: string) {
  try {
    const text = await openAIService.transcribeAudio(
      audioBase64,
      'en', // language code
      'm4a' // audio format
    )
    console.log('Transcribed text:', text)
    return text
  } catch (error) {
    console.error('Transcription failed:', error)
  }
}
```

### Text Enhancement

```typescript
import { openAIService } from '@/lib/openai-service'

// Analyze text to see if clarification is needed
async function analyzeWorkoutNote(text: string) {
  try {
    const result = await openAIService.analyzeText(text, 'workout_note')
    
    if (result.needsClarification) {
      console.log('Questions:', result.questions)
      // Show questions to user and get answers
    } else {
      // Proceed to enhance
      const enhanced = await openAIService.enhanceText(text, 'workout_note')
      console.log('Enhanced text:', enhanced)
    }
  } catch (error) {
    console.error('Analysis failed:', error)
  }
}

// Enhance text with optional clarifying answers
async function enhanceText(text: string, answers?: string) {
  try {
    const enhanced = await openAIService.enhanceText(
      text,
      'workout_note', // or 'reflection', 'goal', 'general'
      answers
    )
    return enhanced
  } catch (error) {
    console.error('Enhancement failed:', error)
  }
}

// Refine already enhanced text
async function refineText(enhancedText: string, instructions: string) {
  try {
    const refined = await openAIService.refineText(enhancedText, instructions)
    return refined
  } catch (error) {
    console.error('Refinement failed:', error)
  }
}
```

## Context Types

The text enhancement supports different contexts:
- `'workout_note'`: For workout session notes
- `'reflection'`: For post-workout reflections
- `'goal'`: For fitness goals
- `'general'`: For general text

## Features

### Whisper Transcription
- Supports multiple audio formats (m4a, mp3, wav, etc.)
- Supports multiple languages (default: English)
- Automatic audio format detection

### Text Enhancement
- **Analyze**: Checks if text needs more details and asks clarifying questions
- **Enhance**: Improves grammar, clarity, and structure while preserving facts
- **Refine**: Makes specific changes based on user instructions

## Security

- All API calls are authenticated using Supabase Auth
- OpenAI API key is stored securely in Supabase secrets
- Edge Functions verify user authentication before processing

## Cost Considerations

- **Whisper API**: ~$0.006 per minute of audio
- **GPT-4o-mini**: ~$0.15 per 1M input tokens, ~$0.60 per 1M output tokens

Monitor your usage in the OpenAI dashboard.

## Troubleshooting

### "OpenAI service not initialized"
- Make sure you call `openAIService.initialize()` when the app starts
- Check that the user is authenticated

### "OpenAI API key not configured"
- Verify the secret is set: `supabase secrets list`
- Redeploy the functions after setting the secret

### "Unauthorized"
- Check that the user is logged in
- Verify the Supabase session is valid

## Example Component

Here's a complete example of a component using the OpenAI service:

```typescript
'use client'

import { useState } from 'react'
import { openAIService } from '@/lib/openai-service'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'

export function WorkoutNoteEnhancer() {
  const [text, setText] = useState('')
  const [enhanced, setEnhanced] = useState('')
  const [loading, setLoading] = useState(false)

  const handleEnhance = async () => {
    setLoading(true)
    try {
      // First analyze
      const analysis = await openAIService.analyzeText(text, 'workout_note')
      
      if (analysis.needsClarification) {
        // Show questions to user (implement your own UI)
        console.log('Questions:', analysis.questions)
      }
      
      // Enhance the text
      const result = await openAIService.enhanceText(text, 'workout_note')
      setEnhanced(result)
    } catch (error) {
      console.error('Enhancement failed:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Enter your workout notes..."
      />
      <Button onClick={handleEnhance} disabled={loading || !text}>
        {loading ? 'Enhancing...' : 'Enhance with AI'}
      </Button>
      {enhanced && (
        <div className="p-4 bg-muted rounded-lg">
          <p className="font-semibold">Enhanced:</p>
          <p>{enhanced}</p>
        </div>
      )}
    </div>
  )
}
```

