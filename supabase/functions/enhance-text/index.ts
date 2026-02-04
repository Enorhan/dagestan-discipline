// ============================================================================
// DAGESTAN DISCIPLINE - AI TEXT ENHANCEMENT EDGE FUNCTION
// Intelligent workout notes and reflection enhancement
// ============================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Action types for the conversational flow
type ActionType = 'analyze' | 'enhance' | 'refine'

interface EnhanceTextRequest {
  action: ActionType
  text: string
  context?: 'workout_note' | 'reflection' | 'goal' | 'general'
  // For 'enhance' action - answers to clarifying questions
  clarifyingAnswers?: string
  // For 'refine' action - the current enhanced text and refinement instructions
  enhancedText?: string
  refinementInstructions?: string
}

interface EnhanceTextResponse {
  success: boolean
  action: ActionType
  // For 'analyze' action
  needsClarification?: boolean
  clarifyingQuestions?: string[]
  // For 'enhance' and 'refine' actions
  enhancedText?: string
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
    const requestData: EnhanceTextRequest = await req.json()
    const action = requestData.action || 'analyze'

    if (!requestData.text || requestData.text.trim().length === 0) {
      throw new Error('Text is required')
    }

    // Get OpenAI API key from environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    let response: EnhanceTextResponse

    switch (action) {
      case 'analyze':
        response = await analyzeText(requestData, openaiApiKey)
        break
      case 'enhance':
        response = await enhanceText(requestData, openaiApiKey)
        break
      case 'refine':
        response = await refineText(requestData, openaiApiKey)
        break
      default:
        throw new Error('Invalid action')
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Error processing request:', error)
    const response: EnhanceTextResponse = {
      success: false,
      action: 'analyze',
      error: error.message || 'An unexpected error occurred',
    }

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})

// Step 1: Analyze the text and check if vital information is missing
async function analyzeText(request: EnhanceTextRequest, apiKey: string): Promise<EnhanceTextResponse> {
  const context = request.context || 'general'
  
  let contextPrompt = ''
  if (context === 'workout_note') {
    contextPrompt = `Focus on questions that help describe the workout better:
- How did you feel during the workout? (energy level, motivation)
- What exercises did you perform? (if not mentioned)
- How many sets/reps? (if relevant)
- Any challenges or achievements?
- How was your form/technique?`
  } else if (context === 'reflection') {
    contextPrompt = `Focus on questions that deepen the reflection:
- What did you learn from this session?
- How does this compare to previous sessions?
- What will you do differently next time?
- How did you feel mentally and physically?`
  } else if (context === 'goal') {
    contextPrompt = `Focus on questions that clarify the goal:
- What is the specific target? (measurable)
- By when do you want to achieve this?
- Why is this goal important to you?
- What obstacles might you face?`
  }

  const systemPrompt = `You are a fitness coach helping athletes write better workout notes and reflections.
${contextPrompt}

Analyze the text and respond in exactly this JSON format:
{
  "needsClarification": true/false,
  "questions": ["question 1", "question 2"] or []
}

Rules:
- Ask MAX 2-3 questions that are DIRECTLY relevant
- Ask ONLY if the text lacks important details
- Formulate questions in a friendly and helpful way in English
- If the text is sufficiently detailed, set needsClarification to false and questions to empty array`

  const userPrompt = `Analyze this ${context} text and identify if important information is missing:

"${request.text}"`

  const openaiResponse = await callOpenAI(systemPrompt, userPrompt, apiKey)

  try {
    // Parse the JSON response
    const jsonMatch = openaiResponse.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        success: true,
        action: 'analyze',
        needsClarification: parsed.needsClarification === true,
        clarifyingQuestions: parsed.questions || [],
      }
    }
  } catch (e) {
    console.error('Failed to parse analysis response:', e)
  }

  // Default: no clarification needed
  return {
    success: true,
    action: 'analyze',
    needsClarification: false,
    clarifyingQuestions: [],
  }
}

// Step 2: Enhance the text (with optional clarifying answers)
async function enhanceText(request: EnhanceTextRequest, apiKey: string): Promise<EnhanceTextResponse> {
  const context = request.context || 'general'

  let contextInstructions = ''
  if (context === 'workout_note') {
    contextInstructions = 'This is a workout note. Make it clear, concise, and informative for tracking progress.'
  } else if (context === 'reflection') {
    contextInstructions = 'This is a post-workout reflection. Make it thoughtful and insightful.'
  } else if (context === 'goal') {
    contextInstructions = 'This is a fitness goal. Make it specific, measurable, and motivating.'
  }

  const systemPrompt = `You are a professional fitness writer helping athletes document their training.

Your tasks:
1. Improve text readability and clarity
2. Correct grammar and spelling errors
3. Keep ALL factual information - do NOT change facts, numbers, or events
4. Use professional but easy-to-understand language
5. Structure the text logically
6. Respond ONLY with the improved text, no explanations or comments

${contextInstructions}`

  let userPrompt: string

  if (request.clarifyingAnswers && request.clarifyingAnswers.trim().length > 0) {
    userPrompt = `Improve the following text. The user has also provided additional information that should be naturally incorporated.

ORIGINAL TEXT:
"${request.text}"

ADDITIONAL INFORMATION FROM USER:
"${request.clarifyingAnswers}"

Write an improved version that includes all information professionally.`
  } else {
    userPrompt = `Improve the following text:

"${request.text}"`
  }

  const enhancedText = await callOpenAI(systemPrompt, userPrompt, apiKey)

  return {
    success: true,
    action: 'enhance',
    enhancedText: enhancedText,
  }
}

// Step 3: Refine an already enhanced text based on user instructions
async function refineText(request: EnhanceTextRequest, apiKey: string): Promise<EnhanceTextResponse> {
  if (!request.enhancedText) {
    throw new Error('Enhanced text is required for refinement')
  }
  if (!request.refinementInstructions) {
    throw new Error('Refinement instructions are required')
  }

  const systemPrompt = `You are a professional fitness writer helping athletes refine their training documentation.

The user has already AI-enhanced text but wants to make additional changes. Your task is to:
1. Understand exactly what the user wants to change
2. Make ONLY the changes the user requests
3. Keep the rest of the text intact
4. Respond ONLY with the updated text, no explanations`

  const userPrompt = `Here is the current text:
"${request.enhancedText}"

The user wants to make the following change:
"${request.refinementInstructions}"

Update the text according to the user's request.`

  const refinedText = await callOpenAI(systemPrompt, userPrompt, apiKey)

  return {
    success: true,
    action: 'refine',
    enhancedText: refinedText,
  }
}

// Helper function to call OpenAI API
async function callOpenAI(systemPrompt: string, userPrompt: string, apiKey: string): Promise<string> {
  const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 1500,
      temperature: 0.3,
    }),
  })

  if (!openaiResponse.ok) {
    const errorData = await openaiResponse.text()
    console.error('OpenAI API error:', errorData)
    throw new Error('Failed to process text with AI')
  }

  const openaiData = await openaiResponse.json()
  const content = openaiData.choices?.[0]?.message?.content?.trim()

  if (!content) {
    throw new Error('No response received from AI')
  }

  return content
}

