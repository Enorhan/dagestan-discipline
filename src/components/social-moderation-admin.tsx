'use client'

import Image from 'next/image'
import { useEffect, useState } from 'react'
import { useAuth } from '@/contexts/auth-context'
import { useRuntimeFlags } from '@/contexts/runtime-flags-context'
import { socialFeedService } from '@/lib/social-feed-service'
import type { SocialModerationQueueItem } from '@/lib/social-models'
import { cn } from '@/lib/utils'

const STATUSES: Array<'open' | 'reviewing' | 'actioned' | 'dismissed'> = ['open', 'reviewing', 'actioned', 'dismissed']

export function SocialModerationAdmin() {
  const { user, isInitializing } = useAuth()
  const { flags } = useRuntimeFlags()
  const [status, setStatus] = useState<(typeof STATUSES)[number]>('open')
  const [items, setItems] = useState<SocialModerationQueueItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [notesByItem, setNotesByItem] = useState<Record<string, string>>({})
  const [lastLoadedAt, setLastLoadedAt] = useState<string | null>(null)

  useEffect(() => {
    if (!user) {
      setLoading(false)
      return
    }

    let active = true

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const queue = await socialFeedService.listModerationQueue(status)
        if (active) {
          setItems(queue)
          setLastLoadedAt(new Date().toISOString())
        }
      } catch (nextError) {
        if (active) {
          setItems([])
          setError(nextError instanceof Error ? nextError.message : 'Unable to load moderation queue')
        }
      } finally {
        if (active) {
          setLoading(false)
        }
      }
    }

    void load()
    const interval = window.setInterval(() => {
      void load()
    }, 30_000)

    return () => {
      active = false
      window.clearInterval(interval)
    }
  }, [status, user])

  const resolveItem = async (
    item: SocialModerationQueueItem,
    nextStatus: 'reviewing' | 'actioned' | 'dismissed',
    action: 'none' | 'archive_post' | 'block_user',
  ) => {
    try {
      await socialFeedService.resolveModerationItem(item.id, nextStatus, action, notesByItem[item.id])
      setItems((previous) => previous.filter((entry) => entry.id !== item.id))
    } catch (nextError) {
      setError(nextError instanceof Error ? nextError.message : 'Unable to update moderation item')
    }
  }

  if (!flags.socialModerationEnabled) {
    return <p className="text-sm text-white/58">Moderation is disabled by runtime flag.</p>
  }

  if (isInitializing) {
    return <p className="text-sm text-white/58">Loading moderation access…</p>
  }

  if (!user) {
    return <p className="text-sm text-white/58">Sign in with a moderator account to open this queue.</p>
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-black text-white">Social Moderation</h1>
        <p className="text-sm text-white/60">Reviewer-only queue for reports, block actions, and post takedowns.</p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/52">
          {flags.socialTrustSafetyStrictModeEnabled && (
            <span className="rounded-full border border-[#ffb88d]/45 bg-[#5c2d10]/40 px-2 py-0.5 font-bold text-[#ffd9bf]">
              Strict mode active
            </span>
          )}
          <span>Auto-refresh: 30s</span>
          {lastLoadedAt && <span>Last sync: {new Date(lastLoadedAt).toLocaleTimeString()}</span>}
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {STATUSES.map((entry) => (
          <button
            key={entry}
            type="button"
            onClick={() => setStatus(entry)}
            className={cn(
              'rounded-full border px-3 py-1.5 text-xs font-bold uppercase tracking-[0.12em]',
              status === entry ? 'border-white/20 bg-white text-black' : 'border-white/12 bg-white/6 text-white/68',
            )}
          >
            {entry}
          </button>
        ))}
      </div>

      {error && (
        <div className="rounded-2xl border border-[#ff8d8d]/30 bg-[#4b1414]/30 px-4 py-3 text-sm text-[#ffd8d8]">
          {error}
        </div>
      )}

      {loading ? (
        <div className="rounded-3xl border border-white/10 bg-white/6 px-4 py-6 text-sm text-white/60">
          Loading queue…
        </div>
      ) : items.length === 0 ? (
        <div className="rounded-3xl border border-white/10 bg-white/6 px-4 py-6 text-sm text-white/60">
          No queue items in this state.
        </div>
      ) : (
        <div className="space-y-4">
          {items.map((item) => (
            <section key={item.id} className="rounded-3xl border border-white/10 bg-white/6 p-4 text-white">
              {(() => {
                const isVideoPreview = Boolean(item.postMediaUrl && /\.(mp4|mov|webm|m3u8)$/i.test(item.postMediaUrl))

                return (
                  <>
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-white/48">{item.reason}</p>
                        <h2 className="mt-1 text-lg font-bold text-white">
                          {item.targetAuthorName ?? 'Unknown author'} {item.targetAuthorHandle ? <span className="text-white/46">{item.targetAuthorHandle}</span> : null}
                        </h2>
                        <p className="mt-2 text-sm leading-6 text-white/72">{item.details || item.postCaption || 'No details supplied.'}</p>
                      </div>
                      <div className="rounded-full border border-white/12 bg-black/25 px-3 py-1 text-xs font-bold text-white/72">
                        Priority {item.priority}
                      </div>
                    </div>

                    {item.postMediaUrl && (
                      <div className="relative mt-4 h-56 overflow-hidden rounded-[18px] border border-white/10 bg-black">
                        {isVideoPreview ? (
                          <video src={item.postMediaUrl} className="h-full w-full object-cover" controls playsInline />
                        ) : (
                          <Image src={item.postMediaUrl} alt={item.postCaption || 'Reported media'} fill className="object-cover" />
                        )}
                      </div>
                    )}

                    <textarea
                      value={notesByItem[item.id] ?? ''}
                      onChange={(event) => setNotesByItem((previous) => ({ ...previous, [item.id]: event.target.value }))}
                      rows={3}
                      className="mt-4 w-full rounded-2xl border border-white/10 bg-black/30 px-3 py-2 text-sm text-white outline-none focus:border-[#7ea4ff]"
                      placeholder="Reviewer notes"
                    />

                    <div className="mt-4 flex flex-wrap gap-2">
                      {item.status === 'open' && (
                        <button
                          type="button"
                          onClick={() => { void resolveItem(item, 'reviewing', 'none') }}
                          className="rounded-full bg-white px-4 py-2 text-sm font-bold text-black"
                        >
                          Start review
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => { void resolveItem(item, 'actioned', 'archive_post') }}
                        className="rounded-full bg-[#2f58ff] px-4 py-2 text-sm font-bold text-white"
                      >
                        Remove post
                      </button>
                      <button
                        type="button"
                        onClick={() => { void resolveItem(item, 'actioned', 'block_user') }}
                        className="rounded-full border border-white/16 bg-white/6 px-4 py-2 text-sm font-bold text-white/82"
                      >
                        Block user
                      </button>
                      <button
                        type="button"
                        onClick={() => { void resolveItem(item, 'dismissed', 'none') }}
                        className="rounded-full border border-white/16 bg-white/6 px-4 py-2 text-sm font-bold text-white/82"
                      >
                        Dismiss
                      </button>
                    </div>
                  </>
                )
              })()}
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
