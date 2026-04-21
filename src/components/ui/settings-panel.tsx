import { type ReactNode } from 'react'

interface SettingsPanelProps {
  kicker: string
  title: string
  description?: string
  children: ReactNode
  className?: string
}

export function SettingsPanel({ kicker, title, description, children, className = '' }: SettingsPanelProps) {
  return (
    <section className={`panel-surface rounded-[28px] p-5 ${className}`.trim()}>
      <div className="mb-5">
        <p className="section-kicker">{kicker}</p>
        <h2 className="mt-2 text-xl font-black tracking-tight text-foreground">{title}</h2>
        {description && (
          <p className="mt-2 text-sm leading-relaxed text-white/58">{description}</p>
        )}
      </div>
      {children}
    </section>
  )
}

interface SettingsSubsectionProps {
  label: string
  description?: string
  children: ReactNode
}

export function SettingsSubsection({ label, description, children }: SettingsSubsectionProps) {
  return (
    <div>
      <div className="mb-3">
        <p className="section-kicker">{label}</p>
        {description && <p className="mt-1 text-xs leading-relaxed text-white/50">{description}</p>}
      </div>
      {children}
    </div>
  )
}

