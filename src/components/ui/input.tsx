'use client'

import { type InputHTMLAttributes, type TextareaHTMLAttributes, forwardRef, type ReactNode, useId } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: ReactNode
}

const baseStyles = 'min-h-[56px] w-full rounded-2xl border border-white/[0.08] bg-card/85 px-4 text-lg font-semibold text-foreground placeholder:text-muted-foreground/60 shadow-[inset_0_1px_0_rgba(255,255,255,0.02)] transition-[border-color,box-shadow,background-color] focus:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/60 disabled:cursor-not-allowed disabled:opacity-50'

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, className = '', id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-') || `input-${generatedId}`
    const errorId = error ? `${inputId}-error` : undefined
    const describedBy = [props['aria-describedby'], errorId].filter(Boolean).join(' ') || undefined

    return (
      <div className="w-full">
        {label && <label htmlFor={inputId} className="mb-2 block text-base font-bold text-foreground">{label}</label>}
        <div className="relative">
          {leftIcon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{leftIcon}</span>}
          <input
            ref={ref}
            id={inputId}
            aria-invalid={error ? true : props['aria-invalid']}
            aria-describedby={describedBy}
            className={`${baseStyles} ${leftIcon ? 'pl-11' : ''} ${error ? 'border-destructive focus:ring-destructive/35 focus:border-destructive' : ''} ${className}`}
            {...props}
          />
        </div>
        {error && <p id={errorId} role="alert" className="mt-2 text-sm font-medium text-destructive">{error}</p>}
      </div>
    )
  }
)
Input.displayName = 'Input'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  showCount?: boolean
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ label, error, showCount, maxLength, value, className = '', id, ...props }, ref) => {
    const generatedId = useId()
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-') || `textarea-${generatedId}`
    const charCount = typeof value === 'string' ? value.length : 0
    const errorId = error ? `${inputId}-error` : undefined
    const countId = showCount && maxLength ? `${inputId}-count` : undefined
    const describedBy = [props['aria-describedby'], errorId, countId].filter(Boolean).join(' ') || undefined

    return (
      <div className="w-full">
        {label && <label htmlFor={inputId} className="mb-2 block text-base font-bold text-foreground">{label}</label>}
        <textarea
          ref={ref}
          id={inputId}
          value={value}
          maxLength={maxLength}
          aria-invalid={error ? true : props['aria-invalid']}
          aria-describedby={describedBy}
          className={`${baseStyles} min-h-[132px] resize-none py-4 ${error ? 'border-destructive focus:border-destructive focus:ring-destructive/35' : ''} ${className}`}
          {...props}
        />
        <div className="mt-2 flex justify-between">
          {error ? <p id={errorId} role="alert" className="text-sm text-destructive">{error}</p> : <span />}
          {showCount && maxLength && <span id={countId} aria-live="polite" className={`text-xs ${charCount >= maxLength ? 'text-destructive' : 'text-muted-foreground'}`}>{charCount}/{maxLength}</span>}
        </div>
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'
