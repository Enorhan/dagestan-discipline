'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { SocialModerationAdmin } from '@/components/social-moderation-admin'
import { useAuth } from '@/contexts/auth-context'
import { supabase } from '@/lib/supabase'

type GateStatus = 'checking' | 'authorized' | 'denied'

export default function SocialModerationPage() {
  const router = useRouter()
  const { user, isInitializing } = useAuth()
  const [status, setStatus] = useState<GateStatus>('checking')

  useEffect(() => {
    if (isInitializing) return
    if (!user) {
      router.replace('/')
      return
    }

    let cancelled = false
    const verify = async () => {
      try {
        const { data, error } = await supabase.rpc('is_social_moderator', { viewer_id: user.id })
        if (cancelled) return
        if (error || data !== true) {
          setStatus('denied')
          router.replace('/')
          return
        }
        setStatus('authorized')
      } catch {
        if (cancelled) return
        setStatus('denied')
        router.replace('/')
      }
    }

    void verify()
    return () => {
      cancelled = true
    }
  }, [isInitializing, user, router])

  if (status !== 'authorized') {
    return (
      <main className="min-h-screen bg-[#050811] px-4 py-10 text-white">
        <div className="mx-auto max-w-4xl text-sm text-white/60">
          Verifying access…
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#050811] px-4 py-10 text-white">
      <div className="mx-auto max-w-4xl">
        <SocialModerationAdmin />
      </div>
    </main>
  )
}
