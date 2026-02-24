'use client'

import React, { useState } from 'react'
import { Mail, RefreshCw, ArrowLeft, CheckCircle } from 'lucide-react'
import { supabaseService } from '@/lib/supabase-service'

interface EmailVerificationPendingProps {
  email: string
  onVerified: () => void
  onBack: () => void
}

export function EmailVerificationPending({
  email,
  onVerified,
  onBack,
}: EmailVerificationPendingProps) {
  const [isChecking, setIsChecking] = useState(false)
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleCheckVerification = async () => {
    setIsChecking(true)
    setError(null)
    try {
      const authState = await supabaseService.getAuthState()
      if (authState.emailVerified && authState.isAuthenticated) {
        onVerified()
      } else {
        setError('Email not yet verified. Please check your inbox.')
      }
    } catch (err) {
      setError('Failed to check verification status. Please try again.')
    } finally {
      setIsChecking(false)
    }
  }

  const handleResendEmail = async () => {
    setIsResending(true)
    setResendSuccess(false)
    setError(null)
    try {
      await supabaseService.resendVerificationEmail(email)
      setResendSuccess(true)
    } catch (err) {
      setError('Failed to resend verification email. Please try again.')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 safe-area-top">
        <button
          onClick={onBack}
          className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-full bg-white/10 active:bg-white/20 transition-colors"
          aria-label="Go back"
        >
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <h1 className="text-lg font-semibold text-white">Verify Your Email</h1>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 -mt-16">
        {/* Icon */}
        <div className="w-20 h-20 rounded-full bg-amber-500/20 flex items-center justify-center mb-6">
          <Mail className="w-10 h-10 text-amber-400" />
        </div>

        <h2 className="text-2xl font-bold text-white text-center mb-3">
          Check Your Inbox
        </h2>
        
        <p className="text-white/70 text-center text-sm max-w-xs mb-2">
          We&apos;ve sent a verification link to:
        </p>
        
        <p className="text-amber-400 font-medium text-center mb-6">
          {email}
        </p>
        
        <p className="text-white/50 text-center text-xs max-w-xs mb-8">
          Click the link in the email to verify your account. Check your spam folder if you don&apos;t see it.
        </p>

        {/* Success message */}
        {resendSuccess && (
          <div className="flex items-center gap-2 text-green-400 text-sm mb-4">
            <CheckCircle className="w-4 h-4" />
            <span>Verification email sent!</span>
          </div>
        )}

        {/* Error message */}
        {error && (
          <p className="text-red-400 text-sm text-center mb-4">{error}</p>
        )}

        {/* Actions */}
        <div className="w-full max-w-xs space-y-3">
          <button
            onClick={handleCheckVerification}
            disabled={isChecking}
            className="w-full py-3.5 px-4 bg-white text-black font-semibold rounded-xl flex items-center justify-center gap-2 active:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isChecking ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Checking...</span>
              </>
            ) : (
              <span>I&apos;ve Verified My Email</span>
            )}
          </button>

          <button
            onClick={handleResendEmail}
            disabled={isResending || resendSuccess}
            className="w-full py-3.5 px-4 bg-white/10 text-white font-medium rounded-xl flex items-center justify-center gap-2 active:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isResending ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <span>Resend Verification Email</span>
            )}
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="px-6 pb-8 safe-area-bottom">
        <p className="text-white/40 text-xs text-center">
          Having trouble? Contact support@dagestanidisciple.com
        </p>
      </div>
    </div>
  )
}

