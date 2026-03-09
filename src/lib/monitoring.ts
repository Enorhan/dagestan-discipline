import { track as trackVercelEvent } from '@vercel/analytics'

type MonitoringMetadataValue = string | number | boolean | null | undefined

export interface MonitoringMetadata {
  [key: string]: MonitoringMetadataValue
}

export interface BufferedErrorReport {
  source: string
  severity: 'warning' | 'error'
  name: string
  message: string
  metadata: Record<string, string | number | boolean | null>
  release: string | null
  ts: string
}

const STORAGE_KEY = 'dagestaniDiscipline.errorReports'
const MAX_BUFFERED_ERROR_REPORTS = 50

function trimEnv(value: string | undefined): string | null {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function sanitizeMetadata(metadata: MonitoringMetadata): Record<string, string | number | boolean | null> {
  return Object.fromEntries(
    Object.entries(metadata)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => [key, typeof value === 'string' ? value.slice(0, 200) : value ?? null])
  ) as Record<string, string | number | boolean | null>
}

function normalizeError(error: unknown): { name: string; message: string } {
  if (error instanceof Error) {
    return {
      name: error.name || 'Error',
      message: error.message || 'Unknown error',
    }
  }

  return {
    name: 'UnknownError',
    message: typeof error === 'string' ? error : 'Unknown error',
  }
}

function readBufferedErrorReports(): BufferedErrorReport[] {
  if (typeof window === 'undefined') {
    return []
  }

  try {
    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    return Array.isArray(stored) ? stored as BufferedErrorReport[] : []
  } catch {
    return []
  }
}

function bufferErrorReport(entry: BufferedErrorReport) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    const existing = readBufferedErrorReports()
    existing.push(entry)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.slice(-MAX_BUFFERED_ERROR_REPORTS)))
  } catch {
    // Ignore storage failures. Monitoring should never break the app.
  }
}

async function sendWebhookReport(entry: BufferedErrorReport) {
  const webhookUrl = trimEnv(process.env.NEXT_PUBLIC_MONITORING_WEBHOOK_URL)
  if (!webhookUrl || typeof window === 'undefined') {
    return
  }

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(entry),
      keepalive: true,
    })
  } catch {
    // Ignore webhook transport failures. Buffering + analytics still preserve signal.
  }
}

function buildErrorReport(
  source: string,
  severity: 'warning' | 'error',
  error: unknown,
  metadata: MonitoringMetadata
): BufferedErrorReport {
  const normalized = normalizeError(error)

  return {
    source,
    severity,
    name: normalized.name,
    message: normalized.message.slice(0, 400),
    metadata: sanitizeMetadata(metadata),
    release: trimEnv(process.env.NEXT_PUBLIC_RELEASE_VERSION),
    ts: new Date().toISOString(),
  }
}

export function getBufferedErrorReports(): BufferedErrorReport[] {
  return readBufferedErrorReports()
}

export function captureException(
  source: string,
  error: unknown,
  metadata: MonitoringMetadata = {},
  severity: 'warning' | 'error' = 'error'
) {
  const entry = buildErrorReport(source, severity, error, metadata)

  bufferErrorReport(entry)

  if (typeof window !== 'undefined') {
    trackVercelEvent('app_error_captured', {
      source,
      severity,
      errorName: entry.name,
      release: entry.release ?? 'unknown',
    })
  }

  void sendWebhookReport(entry)

  if (process.env.NODE_ENV !== 'production') {
    console.error(`[monitoring] ${source}`, error, metadata)
  }
}