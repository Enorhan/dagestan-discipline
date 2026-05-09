import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, RefObject } from 'react'
import { ChevronDown, Search } from 'lucide-react'
import { MARTIAL_ARTS_BRANCHES, type MartialArtsBranchId } from '@/lib/martial-arts-branches'
import type { BjjPersistedState } from '@/lib/bjj-types'
import { haptics } from '@/lib/haptics'
import { cn } from '@/lib/utils'

export function PrimaryButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={props.type ?? 'button'}
      className={cn(
        'inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[18px] border border-[#4d7cff]/55',
        'bg-[linear-gradient(135deg,#4c6fff,#2c52ff)] px-5 text-[16px] font-semibold text-white',
        'shadow-[0_18px_40px_rgba(37,99,235,0.35)] transition hover:brightness-110 disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function SecondaryButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={props.type ?? 'button'}
      className={cn(
        'inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[18px] border border-white/12 bg-white/6 px-5',
        'text-[16px] font-semibold text-white transition hover:bg-white/10 disabled:pointer-events-none disabled:opacity-50',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function CircleIconButton({
  className,
  children,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type={props.type ?? 'button'}
      className={cn(
        'inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/6 text-white transition hover:bg-white/10',
        className,
      )}
      {...props}
    >
      {children}
    </button>
  )
}

export function SearchField({
  value,
  onChange,
  placeholder,
  className,
  inputRef,
}: {
  value: string
  onChange: InputHTMLAttributes<HTMLInputElement>['onChange']
  placeholder: string
  className?: string
  inputRef?: RefObject<HTMLInputElement | null>
}) {
  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
      <input
        ref={inputRef as any}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="h-10 w-full rounded-[18px] border border-white/10 bg-white/7 pl-11 pr-4 text-sm font-medium text-white placeholder:text-white/35 outline-none transition focus:border-[#4d7cff]/55"
      />
    </div>
  )
}

export function BranchSelect({
  label,
  value,
  onChange,
}: {
  label: string
  value: MartialArtsBranchId
  onChange: (branch: MartialArtsBranchId) => void
}) {
  return (
    <label className="mb-2 block">
      <span className="sr-only">{label}</span>
      <div className="relative">
        <select
          value={value}
          onChange={(event) => {
            const next = event.target.value as MartialArtsBranchId
            if (next !== value) void haptics.light()
            onChange(next)
          }}
          className="h-10 w-full appearance-none rounded-[18px] border border-white/10 bg-white/7 px-4 pr-10 text-sm font-black text-white outline-none transition focus:border-[#4d7cff]/55"
        >
          {MARTIAL_ARTS_BRANCHES.map((branch) => (
            <option key={branch.id} value={branch.id} className="bg-[#10131c] text-white">
              {branch.label}
            </option>
          ))}
        </select>
        <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
      </div>
    </label>
  )
}

export function ShellCard({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        'rounded-[22px] border border-white/8 bg-[linear-gradient(180deg,rgba(28,30,36,0.94),rgba(14,15,20,0.92))] shadow-[0_18px_38px_rgba(0,0,0,0.28)]',
        className,
      )}
      {...props}
    />
  )
}

export function ProgressDots({ count, active }: { count: number; active: number }) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: count }, (_, index) => (
        <span
          key={index}
          className={cn(
            'h-2 w-2 rounded-full bg-white/20 transition',
            index === active && 'w-5 bg-[#4d7cff]',
          )}
        />
      ))}
    </div>
  )
}

export function BeltBar({ belt }: { belt: BjjPersistedState['profile']['belt'] }) {
  const colors: Record<BjjPersistedState['profile']['belt'], string> = {
    white: '#f6f6f6',
    blue: '#2747ff',
    purple: '#5b21b6',
    brown: '#7c2d12',
    black: '#090909',
  }

  return (
    <div className="h-12 rounded-[14px] border border-white/10 bg-black/80 p-1">
      <div className="flex h-full items-center overflow-hidden rounded-[11px]">
        <div className="flex h-full flex-1 items-center bg-white px-4 text-[12px] font-black uppercase tracking-[0.22em] text-black">
          {belt} belt
        </div>
        <div className="h-full w-14 border-l border-black/30" style={{ backgroundColor: colors[belt] }} />
        <div className="h-full w-3 rounded-r-[11px] bg-white" />
      </div>
    </div>
  )
}

export function EmptyState({
  title,
  body,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondaryAction,
}: {
  title: string
  body: string
  actionLabel?: string
  onAction?: () => void
  secondaryLabel?: string
  onSecondaryAction?: () => void
}) {
  return (
    <div className="flex min-h-[36vh] flex-col items-center justify-center px-8 text-center">
      <h3 className="text-[28px] font-bold leading-[1.05] text-white">{title}</h3>
      <p className="mt-3 max-w-[280px] text-[17px] leading-7 text-white/58">{body}</p>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={() => { void haptics.light(); onAction() }}
          className="mt-6 rounded-full border border-[#4d7cff]/45 bg-[linear-gradient(135deg,#4c6fff,#2c52ff)] px-6 py-3 text-sm font-bold text-white shadow-[0_10px_28px_rgba(47,88,255,0.35)]"
        >
          {actionLabel}
        </button>
      ) : null}
      {secondaryLabel && onSecondaryAction ? (
        <button
          type="button"
          onClick={() => { void haptics.light(); onSecondaryAction() }}
          className="mt-3 text-sm font-semibold text-white/60 underline-offset-4 hover:text-white hover:underline"
        >
          {secondaryLabel}
        </button>
      ) : null}
    </div>
  )
}

