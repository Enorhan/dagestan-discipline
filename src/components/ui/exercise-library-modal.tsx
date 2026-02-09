'use client'

import { useEffect, useMemo, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { SportType } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

type LibraryExercise = {
  id: string
  name: string
  videoUrl?: string | null
  sport?: string | null
  category?: string | null
}

interface ExerciseLibraryModalProps {
  sport?: SportType | null
  title?: string
  onPick: (exercise: LibraryExercise) => void
  onClose: () => void
  allowGeneral?: boolean
  onCustom?: () => void
  customLabel?: string
}

export function ExerciseLibraryModal({
  sport,
  title = 'Add From Library',
  onPick,
  onClose,
  allowGeneral = true,
  onCustom,
  customLabel = 'Custom',
}: ExerciseLibraryModalProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<LibraryExercise[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const normalizedQuery = useMemo(() => query.trim(), [query])

  useEffect(() => {
    let cancelled = false

    const run = async () => {
      setError(null)

      const q = normalizedQuery
      if (q.length < 2) {
        setResults([])
        return
      }

      setIsLoading(true)
      try {
        // Best-effort search. We include sport-specific and optionally general exercises.
        let builder = supabase
          .from('exercises')
          .select('id, name, sport, category, video_url')
          .ilike('name', `%${q}%`)
          .order('name')
          .limit(30)

        if (sport) {
          builder = allowGeneral
            ? builder.or(`sport.eq.${sport},sport.is.null`)
            : builder.eq('sport', sport)
        }

        const { data, error: dbError } = await builder

        if (dbError) throw new Error(dbError.message)
        const rows = (data as any[] | null) ?? []

        if (cancelled) return
        setResults(rows.map((r) => ({
          id: r.id,
          name: r.name,
          sport: r.sport,
          category: r.category,
          videoUrl: r.video_url,
        })))
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to search exercises')
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    const timeout = setTimeout(run, 250)
    return () => {
      cancelled = true
      clearTimeout(timeout)
    }
  }, [normalizedQuery, sport, allowGeneral])

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm safe-area-inset">
      <div className="flex flex-col h-full">
        <div className="px-6 pt-4 pb-4 flex items-center justify-between">
          <Button
            onClick={onClose}
            variant="ghost"
            size="sm"
            className="text-muted-foreground normal-case tracking-normal"
          >
            Cancel
          </Button>
          <h2 className="text-lg font-bold text-foreground">{title}</h2>
          {onCustom ? (
            <Button
              onClick={onCustom}
              variant="ghost"
              size="sm"
              withHaptic={false}
              className="text-primary font-semibold normal-case tracking-normal"
            >
              {customLabel}
            </Button>
          ) : (
            <div className="w-[72px]" />
          )}
        </div>

        <div className="px-6 pb-4">
          <Input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search exercises (min 2 chars)"
            className="h-14"
          />
          {error && (
            <p className="text-xs text-red-400 mt-2">{error}</p>
          )}
          {!error && isLoading && (
            <p className="text-xs text-muted-foreground mt-2">Searching…</p>
          )}
          {!error && !isLoading && normalizedQuery.length >= 2 && results.length === 0 && (
            <p className="text-xs text-muted-foreground mt-2">No matches.</p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-6 pb-8">
          <div className="flex flex-col gap-2">
            {results.map((r) => (
              <Button
                key={r.id}
                variant="ghost"
                size="sm"
                stacked
                onClick={() => onPick(r)}
                className="w-full p-4 text-left rounded-lg bg-card/50 border border-border/60 hover:bg-card transition-all duration-150 normal-case tracking-normal h-auto items-start justify-start"
              >
                <span className="text-base font-semibold text-foreground">
                  {r.name}
                </span>
                <span className="block text-xs text-muted-foreground mt-1">
                  {r.category ? r.category : 'Uncategorized'}
                </span>
              </Button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
