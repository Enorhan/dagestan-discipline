import { NextRequest, NextResponse } from 'next/server'

function getSupabaseFunctionBaseUrl(): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL')
  }
  return `${supabaseUrl}/functions/v1`
}

function getFallbackAnonKey(): string | null {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? null
}

export async function POST(request: NextRequest) {
  try {
    const baseUrl = getSupabaseFunctionBaseUrl()
    const fallbackAnonKey = getFallbackAnonKey()
    const body = await request.text()

    const upstreamResponse = await fetch(`${baseUrl}/stripe-checkout`, {
      method: 'POST',
      headers: {
        'Content-Type': request.headers.get('content-type') ?? 'application/json',
        'Authorization': request.headers.get('authorization') ?? '',
        'apikey': request.headers.get('apikey') ?? fallbackAnonKey ?? '',
      },
      body,
    })

    const responseBody = await upstreamResponse.text()

    return new NextResponse(responseBody, {
      status: upstreamResponse.status,
      headers: {
        'Content-Type': upstreamResponse.headers.get('content-type') ?? 'application/json',
      },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
