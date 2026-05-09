import { Info, X } from 'lucide-react'
import { PrimaryButton, ShellCard } from './primitives'

export type TipModalContent = {
  title: string
  body: string
  bullets?: string[]
}

export function TipModal({
  content,
  onClose,
}: {
  content: TipModalContent
  onClose: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black/60 px-6">
      <div className="mx-auto flex h-full w-full max-w-[430px] items-center justify-center">
        <ShellCard className="relative w-full max-w-[360px] overflow-hidden p-6">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(77,124,255,0.12),transparent_55%)]" />
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white/70 transition hover:bg-white/10"
            aria-label="Close tip"
          >
            <X className="h-4 w-4" />
          </button>
          <div className="relative">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/45">Tip</p>
            <h3 className="mt-2 text-[28px] font-black leading-[1.02] text-white">{content.title}</h3>
            <p className="mt-3 text-[16px] leading-7 text-white/65">{content.body}</p>
            {content.bullets && content.bullets.length > 0 && (
              <div className="mt-4 space-y-2">
                {content.bullets.map((item) => (
                  <div key={item} className="flex items-start gap-3 rounded-[18px] border border-white/10 bg-white/6 px-4 py-3">
                    <span className="mt-1 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#4d7cff]/18 text-[#8cabff]">
                      <Info className="h-4 w-4" />
                    </span>
                    <p className="text-sm leading-6 text-white/70">{item}</p>
                  </div>
                ))}
              </div>
            )}
            <div className="mt-6">
              <PrimaryButton onClick={onClose}>Got it</PrimaryButton>
            </div>
          </div>
        </ShellCard>
      </div>
    </div>
  )
}

