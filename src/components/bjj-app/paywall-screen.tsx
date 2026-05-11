'use client'

import { Bell, Check, ChevronLeft, ChevronRight, Sparkles } from 'lucide-react'
import { BJJ_PAYWALL_STEPS } from '@/lib/bjj-seed'
import type { BjjPaywallStep } from '@/lib/bjj-types'
import { MATFLOW_PRICE_LABEL, type MatFlowAccessState } from '@/lib/matflow-access'
import { PRIVACY_POLICY_URL, TERMS_OF_SERVICE_URL, openSupportLink } from '@/lib/app-support'
import { cn } from '@/lib/utils'
import { CircleIconButton, PrimaryButton, ProgressDots, ShellCard } from './primitives'
import { ScreenBackdrop, type ScreenBackdropVariant } from './screen-backdrop'

export interface PaywallScreenProps {
  forcedPaywallStep: BjjPaywallStep
  paywallIndex: number
  setPaywallIndex: (updater: number | ((previous: number) => number)) => void
  paywallPlan: 'monthly'
  matflowAccess: MatFlowAccessState
  isCompactHeight: boolean
  isShortHeight: boolean
  handleSubscribe: (plan: 'monthly') => Promise<void>
  handleRestorePurchase: () => Promise<void>
  completePaywall: () => Promise<void>
}

/**
 * Phase D D4 — forced paywall screen (founder/pro/trial/pricing flow).
 * Pure presentation; orchestration state remains in `BjjAppInner`.
 */
export function PaywallScreen({
  forcedPaywallStep,
  paywallIndex,
  setPaywallIndex,
  paywallPlan,
  matflowAccess,
  isCompactHeight,
  isShortHeight,
  handleSubscribe,
  handleRestorePurchase,
  completePaywall,
}: PaywallScreenProps) {
  const paywallBackdropVariant: ScreenBackdropVariant = forcedPaywallStep === 'founder'
    ? 'paywall-founder'
    : forcedPaywallStep === 'pro'
      ? 'paywall-pro'
      : 'paywall-pricing'
  const paywallActionLabel = forcedPaywallStep === 'pricing'
    ? matflowAccess.trialExpired ? 'Subscribe to unlock' : 'Start 14-day trial'
    : 'Continue'
  const paywallTitleClass = isShortHeight ? 'text-[30px]' : isCompactHeight ? 'text-[34px]' : 'text-[40px]'
  const paywallBodyClass = isShortHeight ? 'text-[16px] leading-6' : isCompactHeight ? 'text-[18px] leading-6' : 'text-[20px] leading-7'

  const handlePaywallContinue = async () => {
    if (forcedPaywallStep === 'founder') {
      setPaywallIndex(1)
      return
    }

    if (forcedPaywallStep === 'pro') {
      setPaywallIndex(2)
      return
    }

    if (forcedPaywallStep === 'trial') {
      setPaywallIndex(3)
      return
    }

    await handleSubscribe(paywallPlan)
  }

  return (
    <div className="relative h-[100dvh] overflow-hidden bg-[#04060a] text-white">
      <ScreenBackdrop variant={paywallBackdropVariant} />
      <div className="relative mx-auto flex h-full w-full max-w-[430px] flex-col px-4 pb-[calc(env(safe-area-inset-bottom)+18px)] pt-[calc(env(safe-area-inset-top)+12px)]">
        <div className="flex items-center justify-between">
          <CircleIconButton
            onClick={() => setPaywallIndex((previous) => Math.max(0, previous - 1))}
            className={cn(paywallIndex === 0 && 'invisible')}
          >
            <ChevronLeft className="h-5 w-5" />
          </CircleIconButton>
          <ProgressDots count={BJJ_PAYWALL_STEPS.length} active={paywallIndex} />
          {matflowAccess.trialExpired ? (
            <span className="text-sm font-semibold text-[#ff8a8a]">Trial ended</span>
          ) : (
            <button
              type="button"
              onClick={() => void completePaywall()}
              className="text-sm font-semibold text-white/45"
            >
              Not now
            </button>
          )}
        </div>

        <div className="flex min-h-0 flex-1 flex-col pt-4">
          <div className="min-h-0 flex-1 overflow-y-auto pb-4">
          {forcedPaywallStep === 'founder' && (
            <>
              <div className="flex-1 text-center">
                <div className={cn('mx-auto max-w-[250px]', isShortHeight ? 'mt-4' : 'mt-7')}>
                  <div className={cn(
                    'mx-auto rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.25),transparent_60%)]',
                    isShortHeight ? 'h-32 w-32' : isCompactHeight ? 'h-40 w-40' : 'h-52 w-52',
                  )} />
                </div>
                <h2 className={cn(paywallTitleClass, 'mt-5 font-black leading-[1]')}>
                  MatFlow starts with <span className="text-[#4d7cff]">14 days free</span>
                </h2>
                <p className={cn('mx-auto mt-3 max-w-[310px] text-white/64', paywallBodyClass)}>
                  Build a real combat-sports training system before the subscription begins.
                </p>
              </div>
            </>
          )}

          {forcedPaywallStep === 'pro' && (
            <>
              <div className="flex-1 text-center">
                <h2 className={cn(paywallTitleClass, 'mt-3 font-black leading-[1]')}>
                  Meet <span className="text-[#4d7cff]">MatFlow Pro</span>
                </h2>
                <ShellCard className={cn('mt-5', isCompactHeight ? 'p-4' : 'p-6')}>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[24px] border border-white/10 bg-[#0b1020] p-3">
                      <p className="text-sm text-white/50">Submissions</p>
                      <div className="mt-4 rounded-[18px] border border-white/10 bg-black/40 p-3 text-sm text-white/70">
                        Analytics
                      </div>
                    </div>
                    <div className="rounded-[24px] border border-white/10 bg-[#0b1020] p-3">
                      <p className="text-sm text-white/50">Systems</p>
                      <div className="mt-4 rounded-[18px] border border-white/10 bg-black/40 p-3 text-sm text-white/70">
                        Branching maps
                      </div>
                    </div>
                  </div>
                  <div className="mt-5 space-y-3 text-left">
                    {[
                      ['Gameplan maps', 'Build decision trees instead of random move lists.'],
                      ['Expanded training analytics', 'See what you actually hit and where you stall.'],
                      ['Structured technique library', 'Keep connected notes without deleting older details.'],
                      ['Unlimited techniques', 'Stop deleting important notes to stay under a cap.'],
                    ].map(([title, summary]) => (
                      <div key={title} className="flex items-start gap-3">
                        <div className="mt-1 flex h-9 w-9 items-center justify-center rounded-full bg-white/7">
                          <Sparkles className="h-4 w-4 text-[#7ea4ff]" />
                        </div>
                        <div>
                          <p className="text-[16px] font-bold">{title}</p>
                          <p className="text-sm text-white/52">{summary}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ShellCard>
              </div>
            </>
          )}

          {forcedPaywallStep === 'trial' && (
            <>
              <div className="flex-1 pt-2 text-center">
                <p className="text-sm font-semibold uppercase tracking-[0.22em] text-white/65">Built for post-class review</p>
                <h2 className={cn(paywallTitleClass, 'mt-5 font-black leading-[1]')}>
                  How <span className="text-[#4d7cff]">Pro access</span> works
                </h2>
                <div className="mt-6 space-y-6 text-left">
                  {[
                    ['Today', 'Start with 14 days free, including systems, analytics, and unlimited technique tracking.'],
                    ['Billing', `After the trial, MatFlow is ${MATFLOW_PRICE_LABEL} until you cancel it from subscription settings.`],
                    ['Control', 'You can cancel before the next renewal and keep access through the paid period.'],
                  ].map(([title, body], index) => (
                    <div key={title} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <div className={cn('flex h-11 w-11 items-center justify-center rounded-full border', index === 0 ? 'border-white bg-white text-black' : 'border-white/18 bg-white/6 text-white/70')}>
                          {index === 0 ? <Check className="h-5 w-5" /> : <Bell className="h-5 w-5" />}
                        </div>
                        {index < 2 && <div className="mt-2 h-16 w-px bg-white/12" />}
                      </div>
                      <div>
                        <p className={cn(isCompactHeight ? 'text-[20px]' : 'text-[24px]', 'font-bold')}>{title}</p>
                        <p className="mt-2 max-w-[270px] text-[16px] leading-6 text-white/54">{body}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {forcedPaywallStep === 'pricing' && (
            <>
              <div className="flex-1">
                <ShellCard className={cn('overflow-hidden', isCompactHeight ? 'p-4' : 'p-6')}>
                  <div className={cn('rounded-[24px] bg-[radial-gradient(circle_at_top,rgba(37,99,235,0.28),transparent_48%)]', isCompactHeight ? 'p-4' : 'p-5')}>
                    <div className={cn(
                      'mx-auto mb-4 rounded-full bg-[radial-gradient(circle,rgba(37,99,235,0.4),transparent_58%)]',
                      isShortHeight ? 'h-20 w-20' : isCompactHeight ? 'h-24 w-24' : 'h-28 w-28',
                    )} />
                    <h2 className={cn(isShortHeight ? 'text-[30px]' : isCompactHeight ? 'text-[34px]' : 'text-[40px]', 'text-center font-black leading-[1]')}>14 days free, then {MATFLOW_PRICE_LABEL}</h2>
                    <p className="mx-auto mt-3 max-w-[280px] text-center text-[16px] leading-6 text-white/60">
                      Premium access unlocks systems, advanced analytics, unlimited techniques, and challenge tracking.
                    </p>
                  </div>
                  <div className="mt-4 space-y-2.5">
                    {[
                      'Gameplan maps and study mode',
                      'Advanced Training Analytics',
                      'Unlimited Techniques',
                      'Challenges & Achievements',
                    ].map((line) => (
                      <div key={line} className="flex items-center gap-3 text-[15px] font-semibold">
                        <Check className="h-4 w-4 text-[#7ea4ff]" />
                        <span>{line}</span>
                      </div>
                    ))}
                  </div>
                  <ShellCard className="mt-5 bg-white text-black">
                    <div className={cn(isCompactHeight ? 'p-3.5' : 'p-4')}>
                      <p className="text-[20px] font-bold">Designed for real training logs</p>
                      <p className="mt-2 text-[15px] leading-6 text-black/74">
                        Capture what happened after class, connect related techniques, and review the patterns that keep showing up.
                      </p>
                    </div>
                  </ShellCard>
                  <div className="mt-4 space-y-3">
                    <div className="flex w-full items-center justify-between rounded-[18px] border border-[#4d7cff]/45 bg-[#4d7cff]/18 px-4 py-3.5 text-left">
                      <div>
                        <p className="text-base font-bold">Monthly</p>
                        <p className="mt-1 text-sm text-white/52">14-day trial included. Cancel anytime.</p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-black">25 kr</p>
                        <p className="text-sm text-white/52">per month</p>
                      </div>
                    </div>
                  </div>
                </ShellCard>
              </div>
            </>
          )}
          </div>

          <div className="shrink-0 bg-[linear-gradient(180deg,rgba(4,6,10,0),rgba(4,6,10,0.9)_22%,#04060a_100%)] pb-1 pt-2.5">
            <div className="space-y-3">
              <PrimaryButton onClick={() => void handlePaywallContinue()}>
                {paywallActionLabel}
                <ChevronRight className="h-5 w-5" />
              </PrimaryButton>
              {forcedPaywallStep === 'pricing' && (
                <div className="space-y-2">
                  {!matflowAccess.trialExpired ? (
                    <button
                      type="button"
                      onClick={() => void completePaywall()}
                      className="w-full text-center text-sm font-semibold text-white/50"
                    >
                      Continue trial
                    </button>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => { void handleRestorePurchase() }}
                    className="w-full text-center text-sm font-semibold text-white/50"
                  >
                    Restore purchases
                  </button>
                  <div className="flex items-center justify-center gap-4 text-xs font-semibold text-white/35">
                    <button type="button" onClick={() => { void openSupportLink(PRIVACY_POLICY_URL) }} className="underline underline-offset-4">
                      Privacy Policy
                    </button>
                    <button type="button" onClick={() => { void openSupportLink(TERMS_OF_SERVICE_URL) }} className="underline underline-offset-4">
                      Terms
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
