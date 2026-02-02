'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { haptics } from '@/lib/haptics'
import { Button } from './button'

interface ErrorBoundaryProps {
  children: ReactNode
  fallback?: ReactNode
}

interface ErrorBoundaryState {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo)
    // Trigger error haptic
    haptics.error()
  }

  handleRetry = () => {
    haptics.medium()
    this.setState({ hasError: false, error: null })
  }

  handleReload = () => {
    haptics.medium()
    window.location.reload()
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      return (
        <div className="min-h-screen bg-background flex items-center justify-center px-6">
          <div className="w-full max-w-sm text-center">
            {/* Error Icon */}
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-destructive/20 flex items-center justify-center">
              <svg
                className="w-8 h-8 text-destructive"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>

            {/* Title */}
            <h1 className="text-2xl font-black text-foreground mb-2">
              Something went wrong
            </h1>

            {/* Message */}
            <p className="text-sm text-muted-foreground mb-8">
              The app encountered an unexpected error. Your progress is saved.
            </p>

            {/* Actions */}
            <div className="flex flex-col gap-3">
              <Button
                onClick={this.handleRetry}
                variant="primary"
                size="lg"
                fullWidth
                withHaptic={false}
                className="bg-foreground text-background"
              >
                Try Again
              </Button>
              <Button
                onClick={this.handleReload}
                variant="ghost"
                size="md"
                fullWidth
                withHaptic={false}
                className="text-muted-foreground font-medium text-sm tracking-wide hover:text-foreground"
              >
                Reload App
              </Button>
            </div>

            {/* Error details (development only) */}
            {process.env.NODE_ENV === 'development' && this.state.error && (
              <div className="mt-8 p-4 bg-card rounded-lg text-left">
                <p className="text-xs font-mono text-destructive break-all">
                  {this.state.error.message}
                </p>
              </div>
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default ErrorBoundary
