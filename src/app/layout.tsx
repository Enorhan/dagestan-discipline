import React from "react"
import type { Metadata, Viewport } from 'next'
import Script from 'next/script'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'
import { SentryBootstrap } from '@/components/system/sentry-bootstrap'
import { StatusBarBootstrap } from '@/components/system/status-bar-bootstrap'
import { ErrorBoundary } from '@/components/ui/error-boundary'
import { OfflineBanner } from '@/components/ui/offline-banner'
import { AuthProvider } from '@/contexts/auth-context'
import { RuntimeFlagsProvider } from '@/contexts/runtime-flags-context'
import { ToastProvider } from '@/contexts/toast-context'
import { themeBootstrapScript } from '@/lib/theme'

export const metadata: Metadata = {
  title: 'MatFlow',
  description: 'Combat-sports Training OS for gameplans, technique libraries, fast logging, and review.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'MatFlow',
  },
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

export const viewport: Viewport = {
  themeColor: '#050914',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" data-theme="dark">
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootstrapScript }} />
      </head>
      <body className="antialiased bg-background text-foreground">
        <SentryBootstrap />
        <StatusBarBootstrap />
        <OfflineBanner />
        <ErrorBoundary>
          <RuntimeFlagsProvider>
            <AuthProvider>
              <ToastProvider>
                {children}
              </ToastProvider>
            </AuthProvider>
          </RuntimeFlagsProvider>
        </ErrorBoundary>
        <Analytics />
        {process.env.NEXT_PUBLIC_FIGMA_CAPTURE === '1' ? (
          <Script src="https://mcp.figma.com/mcp/html-to-design/capture.js" strategy="lazyOnload" />
        ) : null}
      </body>
    </html>
  )
}
