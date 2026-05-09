'use client'

import { SocialInsightsSheet } from '@/components/social-insights-sheet'
import { SocialYouProfile, type YouProfileTab } from '@/components/social-you-profile'
import type {
  BjjAchievement,
  BjjChallenge,
  BjjChecklistItem,
  BjjSurface,
  BjjSystem,
  BjjTechnique,
} from '@/lib/bjj-types'
import type { SocialProfileOverview } from '@/lib/social-models'

export interface YouSocialShellProps {
  socialInsightsOpen: boolean
  achievements: BjjAchievement[]
  analyticsLabel: string
  challenges: BjjChallenge[]
  checklistItems: BjjChecklistItem[]
  favoriteSubmissions: Array<[string, number]>
  totalSessions: number
  totalSubmissions: number
  totalTaps: number
  analyticsTechniqueCount: number
  youProfileTab: YouProfileTab
  socialProfileLoading: boolean
  socialProfileOverview: SocialProfileOverview
  ownedSystems: BjjSystem[]
  libraryTechniques: BjjTechnique[]
  setActiveSurface: (surface: BjjSurface | null) => void
  showInfo: (message: string) => void
  beginEditProfile: () => void
  openSocialConnectionsSheet: (kind: 'followers' | 'following') => Promise<void>
  closeSocialChromeForInsights: () => void
  openSystemReader: (system: BjjSystem) => void
  openTechniqueDetail: (techniqueId: string, surface: Extract<BjjSurface, 'technique-detail' | 'discover-detail'>) => void
  handleShareProfile: () => Promise<void>
  setYouProfileTab: (tab: YouProfileTab) => void
  onBrowseDiscoverTechniques?: () => void
  onCreateGameplan?: () => void
}

/**
 * P1-01 Phase D — `You` (social profile mode) route shell.
 * Pure presentation; all state, refs, and effects remain in `BjjAppInner`.
 */
export function YouSocialShell({
  socialInsightsOpen,
  achievements,
  analyticsLabel,
  challenges,
  checklistItems,
  favoriteSubmissions,
  totalSessions,
  totalSubmissions,
  totalTaps,
  analyticsTechniqueCount,
  youProfileTab,
  socialProfileLoading,
  socialProfileOverview,
  ownedSystems,
  libraryTechniques,
  setActiveSurface,
  showInfo,
  beginEditProfile,
  openSocialConnectionsSheet,
  closeSocialChromeForInsights,
  openSystemReader,
  openTechniqueDetail,
  handleShareProfile,
  setYouProfileTab,
  onBrowseDiscoverTechniques,
  onCreateGameplan,
}: YouSocialShellProps) {
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      {socialInsightsOpen ? (
        <SocialInsightsSheet
          achievements={achievements}
          analyticsLabel={analyticsLabel}
          challenges={challenges}
          checklistItems={checklistItems}
          onClose={() => setActiveSurface(null)}
          onOpenChecklist={() => showInfo('Checklist progress updates as you log sessions and techniques.')}
          topSubmissions={favoriteSubmissions}
          totalSessions={totalSessions}
          totalSubmissions={totalSubmissions}
          totalTaps={totalTaps}
          totalTechniques={analyticsTechniqueCount}
        />
      ) : (
        <SocialYouProfile
          activeTab={youProfileTab}
          loading={socialProfileLoading}
          overview={socialProfileOverview}
          systems={ownedSystems}
          techniques={libraryTechniques}
          onEditProfile={beginEditProfile}
          onOpenFollowers={() => { void openSocialConnectionsSheet('followers') }}
          onOpenFollowing={() => { void openSocialConnectionsSheet('following') }}
          onOpenInsights={() => {
            closeSocialChromeForInsights()
            setActiveSurface('social-insights')
          }}
          onOpenSystem={(system) => openSystemReader(system)}
          onOpenTechnique={(techniqueId) => openTechniqueDetail(techniqueId, 'technique-detail')}
          onShareProfile={() => { void handleShareProfile() }}
          onTabChange={setYouProfileTab}
          onBrowseDiscoverTechniques={onBrowseDiscoverTechniques}
          onCreateGameplan={onCreateGameplan}
        />
      )}
    </div>
  )
}

