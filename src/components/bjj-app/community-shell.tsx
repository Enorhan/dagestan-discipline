'use client'

import { type ComponentProps } from 'react'
import { CommunitySurface } from '@/components/community-surface'

export type CommunityShellProps = ComponentProps<typeof CommunitySurface>

/**
 * P1-01 Phase D — Community route shell.
 *
 * Thin typed adapter around `<CommunitySurface>` so the route surface
 * mounts via the same `*-shell` convention as the other tabs. All
 * orchestration (forks, previews, navigation) is supplied by the
 * parent shell via the prop bag.
 */
export function CommunityShell(props: CommunityShellProps) {
  return <CommunitySurface {...props} />
}

