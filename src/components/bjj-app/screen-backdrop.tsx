import Image from 'next/image'
import { cn } from '@/lib/utils'

export type ScreenBackdropVariant =
  | 'auth'
  | 'onboarding-welcome'
  | 'onboarding-mission'
  | 'onboarding-name'
  | 'onboarding-discipline'
  | 'onboarding-experience'
  | 'onboarding-content'
  | 'onboarding-challenges'
  | 'onboarding-attribution'
  | 'onboarding-setup'
  | 'onboarding-proof'
  | 'onboarding-analytics'
  | 'onboarding-ready'
  | 'paywall-founder'
  | 'paywall-pro'
  | 'paywall-pricing'
  | 'sessions'
  | 'social'
  | 'techniques'
  | 'profile'
  | 'modal'

export const SCREEN_BACKDROP_ASSETS: Record<ScreenBackdropVariant, { src: string; imageClassName?: string; overlayClassName?: string }> = {
  auth: {
    src: '/backgrounds/onboarding-proof.svg',
    imageClassName: 'scale-105 opacity-70',
    overlayClassName: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.18),rgba(0,0,0,0.72))]',
  },
  'onboarding-welcome': {
    src: '/backgrounds/onboarding-welcome.svg',
    imageClassName: 'scale-[1.08] opacity-78',
    overlayClassName: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.14),rgba(0,0,0,0.78))]',
  },
  'onboarding-mission': {
    src: '/backgrounds/onboarding-mission.svg',
    imageClassName: 'scale-[1.06] opacity-78',
    overlayClassName: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.8))]',
  },
  'onboarding-name': {
    src: '/backgrounds/onboarding-name.svg',
    imageClassName: 'scale-[1.05] opacity-78',
    overlayClassName: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.8))]',
  },
  'onboarding-discipline': {
    src: '/backgrounds/onboarding-discipline.svg',
    imageClassName: 'scale-[1.05] opacity-78',
    overlayClassName: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.82))]',
  },
  'onboarding-experience': {
    src: '/backgrounds/onboarding-experience.svg',
    imageClassName: 'scale-[1.05] opacity-78',
    overlayClassName: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.82))]',
  },
  'onboarding-content': {
    src: '/backgrounds/onboarding-content.svg',
    imageClassName: 'scale-[1.05] opacity-78',
    overlayClassName: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.84))]',
  },
  'onboarding-challenges': {
    src: '/backgrounds/onboarding-challenges.svg',
    imageClassName: 'scale-[1.05] opacity-78',
    overlayClassName: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.84))]',
  },
  'onboarding-attribution': {
    src: '/backgrounds/onboarding-attribution.svg',
    imageClassName: 'scale-[1.05] opacity-78',
    overlayClassName: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.84))]',
  },
  'onboarding-setup': {
    src: '/backgrounds/onboarding-setup.svg',
    imageClassName: 'scale-[1.05] opacity-78',
    overlayClassName: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.84))]',
  },
  'onboarding-proof': {
    src: '/backgrounds/onboarding-proof.svg',
    imageClassName: 'scale-[1.06] opacity-76',
    overlayClassName: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.8))]',
  },
  'onboarding-analytics': {
    src: '/backgrounds/onboarding-analytics.svg',
    imageClassName: 'scale-[1.05] opacity-78',
    overlayClassName: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.82))]',
  },
  'onboarding-ready': {
    src: '/backgrounds/onboarding-ready.svg',
    imageClassName: 'scale-[1.04] opacity-78',
    overlayClassName: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.76))]',
  },
  'paywall-founder': {
    src: '/backgrounds/paywall-founder.svg',
    imageClassName: 'scale-[1.04] opacity-76',
    overlayClassName: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.14),rgba(0,0,0,0.82))]',
  },
  'paywall-pro': {
    src: '/backgrounds/paywall-pro.svg',
    imageClassName: 'scale-[1.04] opacity-76',
    overlayClassName: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.82))]',
  },
  'paywall-pricing': {
    src: '/backgrounds/paywall-pricing.svg',
    imageClassName: 'scale-[1.03] opacity-78',
    overlayClassName: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.1),rgba(0,0,0,0.84))]',
  },
  sessions: {
    src: '/backgrounds/sessions-shell.svg',
    imageClassName: 'scale-[1.03] opacity-72',
    overlayClassName: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.14),rgba(0,0,0,0.8))]',
  },
  social: {
    src: '/backgrounds/profile-shell.svg',
    imageClassName: 'scale-[1.01] opacity-[0.12]',
    overlayClassName: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.04),rgba(0,0,0,0.38))]',
  },
  techniques: {
    src: '/backgrounds/techniques-shell.svg',
    imageClassName: 'scale-[1.03] opacity-72',
    overlayClassName: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.12),rgba(0,0,0,0.82))]',
  },
  profile: {
    src: '/backgrounds/profile-shell.svg',
    imageClassName: 'scale-[1.03] opacity-74',
    overlayClassName: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.08),rgba(0,0,0,0.8))]',
  },
  modal: {
    src: '/backgrounds/techniques-shell.svg',
    imageClassName: 'scale-[1.04] opacity-68',
    overlayClassName: 'bg-[linear-gradient(180deg,rgba(0,0,0,0.16),rgba(0,0,0,0.86))]',
  },
}

export function ScreenBackdrop({
  className,
  variant = 'auth',
}: {
  className?: string
  variant?: ScreenBackdropVariant
}) {
  const asset = SCREEN_BACKDROP_ASSETS[variant]

  return (
    <>
      <div className={cn('pointer-events-none absolute inset-0 bg-[#04060a]', className)} />
      <div className={cn(
        'pointer-events-none absolute inset-0',
        variant === 'social'
          ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.01),transparent_28%,rgba(0,0,0,0.18))]'
          : 'bg-[radial-gradient(circle_at_top,_rgba(37,99,235,0.18),_transparent_32%),radial-gradient(circle_at_bottom,_rgba(59,130,246,0.12),_transparent_34%)]',
      )} />
      <div className="pointer-events-none absolute inset-0">
        <Image
          src={asset.src}
          alt=""
          fill
          unoptimized
          sizes="100vw"
          className={cn('h-full w-full object-cover', asset.imageClassName)}
        />
      </div>
      <div className={cn('pointer-events-none absolute inset-0', asset.overlayClassName)} />
      <div className={cn(
        'pointer-events-none absolute inset-0',
        variant === 'social'
          ? 'bg-[linear-gradient(180deg,rgba(0,0,0,0.26)_0%,rgba(0,0,0,0.44)_18%,rgba(0,0,0,0.74)_100%)]'
          : 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.05),transparent_24%),linear-gradient(180deg,rgba(0,0,0,0.42)_0%,rgba(0,0,0,0.62)_14%,rgba(0,0,0,0.84)_100%)]',
      )} />
    </>
  )
}

