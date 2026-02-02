'use client'

import { InputHTMLAttributes, TextareaHTMLAttributes, forwardRef, ReactNode } from 'react'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  leftIcon?: ReactNode
}

const baseStyles = 'min-h-[48px] w-full px-4 text-base text-foreground placeholder:text-muted-foreground/60 bg-card border border-border rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all disabled:opacity-50'

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, leftIcon, className = '', id, ...props }, ref) => {
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    return (
      <div className="w-full">
        {label && <label htmlFor={inputId} className="block text-sm font-medium text-foreground mb-2">{label}</label>}
        <div className="relative">
          {leftIcon && <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">{leftIcon}</span>}
          <input ref={ref} id={inputId} className={`${baseStyles} ${leftIcon ? 'pl-11' : ''} ${error ? 'border-destructive' : ''} ${className}`} {...props} />
        </div>
        {error && <p className="mt-1.5 text-sm text-destructive">{error}</p>}
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
    const inputId = id || label?.toLowerCase().replace(/\s+/g, '-')
    const charCount = typeof value === 'string' ? value.length : 0
    return (
      <div className="w-full">
        {label && <label htmlFor={inputId} className="block text-sm font-medium text-foreground mb-2">{label}</label>}
        <textarea ref={ref} id={inputId} value={value} maxLength={maxLength} className={`${baseStyles} min-h-[100px] py-3 resize-none ${error ? 'border-destructive' : ''} ${className}`} {...props} />
        <div className="flex justify-between mt-1.5">
          {error ? <p className="text-sm text-destructive">{error}</p> : <span />}
          {showCount && maxLength && <span className={`text-xs ${charCount >= maxLength ? 'text-destructive' : 'text-muted-foreground'}`}>{charCount}/{maxLength}</span>}
        </div>
      </div>
    )
  }
)
Textarea.displayName = 'Textarea'

