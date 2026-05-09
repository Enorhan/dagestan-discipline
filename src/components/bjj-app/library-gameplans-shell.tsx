'use client'

import { type Dispatch, type RefObject, type SetStateAction } from 'react'
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Compass,
  Copy,
  Globe,
  Lock,
  MoreHorizontal,
  Pencil,
  Pin,
  Plus,
  Star,
  Trash2,
  X,
} from 'lucide-react'
import {
  BranchSelect,
  CircleIconButton,
  EmptyState,
  ProgressDots,
  SearchField,
  ShellCard,
} from '@/components/bjj-app/primitives'
import { PullToRefresh } from '@/components/ui/pull-to-refresh'
import { BJJ_CATEGORY_META } from '@/lib/bjj-seed'
import { formatPrettyDate } from '@/components/bjj-app/date-utils'
import { toTechniqueColor } from '@/components/bjj-app/format-utils'
import { SystemPreviewGraph } from '@/components/bjj-app/system-preview-graph'
import { SystemGraphCanvas } from '@/components/system-graph-canvas'
import { computeGraphLayout } from '@/lib/system-graph-layout'
import { haptics } from '@/lib/haptics'
import { cn } from '@/lib/utils'
import { getMartialArtsBranchLabel, type MartialArtsBranchId } from '@/lib/martial-arts-branches'
import type {
  BjjPersistedState,
  BjjSurface,
  BjjSystem,
  BjjTechnique,
  BjjTechniqueCategory,
  BjjTechniquesTab,
} from '@/lib/bjj-types'
import type { UserProfile } from '@/lib/user-profile-types'

export interface JustForkedMarker {
  kind: 'system' | 'technique'
  id: string
  forkedAt: number
}

export interface LibraryGameplansShellProps {
  appState: BjjPersistedState
  user: UserProfile | null
  selectedBottomTab: 'today' | 'library' | 'gameplans' | 'community' | 'you'
  // Library state
  libraryTechniques: BjjTechnique[]
  filteredLibraryTechniques: BjjTechnique[]
  librarySearchInput: string
  setLibrarySearchInput: (value: string) => void
  librarySearchInputRef: RefObject<HTMLInputElement | null>
  libraryView: 'list' | 'graph'
  setLibraryView: Dispatch<SetStateAction<'list' | 'graph'>>
  selectedTechniqueBranch: MartialArtsBranchId
  selectedTechniquesTab: BjjTechniquesTab
  // Discover state
  discoverByCategory: Record<BjjTechniqueCategory, BjjTechnique[]>
  discoverTechniques: BjjTechnique[]
  expandedDiscoverCategory: BjjTechniqueCategory | null
  setExpandedDiscoverCategory: Dispatch<SetStateAction<BjjTechniqueCategory | null>>
  // Systems / gameplans state
  systemsState: BjjSystem[]
  systemsFilteredSorted: BjjSystem[]
  systemDraftsForBranch: BjjSystem[]
  systemsHubSearchInputRef: RefObject<HTMLInputElement | null>
  selectedSystemBranch: MartialArtsBranchId
  systemActionsOpenId: string | null
  setSystemActionsOpenId: Dispatch<SetStateAction<string | null>>
  togglePinSystem: (systemId: string) => void
  // Fork-flash UX
  justForkedId: JustForkedMarker | null
  handleJustForkedRef: (el: HTMLDivElement | null) => void
  // Coach marks
  coachStep: number | null
  setCoachStep: Dispatch<SetStateAction<number | null>>
  hasSeenCoachMarks: boolean
  completeCoachMarksTour: () => void
  debugTourLog: (message: string, data: Record<string, unknown>) => void
  // Cold-start gates
  shellHydratedOnce: boolean
  shellSyncing: boolean
  // Surface routing
  activeSurface: BjjSurface | null
  setActiveSurface: (s: BjjSurface | null) => void
  // App-level mutators
  updateAppState: (updater: (previous: BjjPersistedState) => BjjPersistedState) => void
  // Layout tokens
  isCompactHeight: boolean
  shellSubsectionSpacingClass: string
  shellCompactCardPaddingClass: string
  shellTopTabButtonClass: string
  shellTopTabsClass: string
  categoryRowTitleClass: string
  techniqueRowTitleClass: string
  // Surface lifecycle hooks (only clear is invoked from this shell)
  clearSystemEditorSession: () => void
  clearSystemReaderSession: () => void
  // Reader/editor handlers
  openSystemReader: (system: BjjSystem) => void
  openTechniqueDetail: (techniqueId: string, surface: TechniqueDetailSurface) => void
  openUserSystemDuplicate: (system: BjjSystem) => void
  openUserSystemEditorCreate: () => void
  openUserSystemEditorEdit: (system: BjjSystem) => void
  handleDeleteUserSystem: (systemId: string) => void | Promise<void>
  onPullToRefresh?: () => Promise<void> | void
}

export type TechniqueDetailSurface = Extract<BjjSurface, 'technique-detail' | 'discover-detail'>

/**
 * P1-01 Phase D — Library / Gameplans route shell.
 * Largest of the route shells. State and effects remain in `BjjAppInner`;
 * this component renders the My Library / Discover / Systems hub surfaces.
 */
export function LibraryGameplansShell(props: LibraryGameplansShellProps) {
  const {
    appState,
    user,
    selectedBottomTab,
    libraryTechniques,
    filteredLibraryTechniques,
    librarySearchInput,
    setLibrarySearchInput,
    librarySearchInputRef,
    libraryView,
    setLibraryView,
    selectedTechniqueBranch,
    selectedTechniquesTab,
    discoverByCategory,
    discoverTechniques,
    expandedDiscoverCategory,
    setExpandedDiscoverCategory,
    systemsState,
    systemsFilteredSorted,
    systemDraftsForBranch,
    systemsHubSearchInputRef,
    selectedSystemBranch,
    systemActionsOpenId,
    setSystemActionsOpenId,
    togglePinSystem,
    justForkedId,
    handleJustForkedRef,
    coachStep,
    setCoachStep,
    hasSeenCoachMarks,
    completeCoachMarksTour,
    debugTourLog,
    shellHydratedOnce,
    shellSyncing,
    activeSurface,
    setActiveSurface,
    updateAppState,
    isCompactHeight,
    shellSubsectionSpacingClass,
    shellCompactCardPaddingClass,
    shellTopTabButtonClass,
    shellTopTabsClass,
    categoryRowTitleClass,
    techniqueRowTitleClass,
    openSystemReader,
    openTechniqueDetail,
    openUserSystemDuplicate,
    openUserSystemEditorCreate,
    openUserSystemEditorEdit,
    handleDeleteUserSystem,
    clearSystemEditorSession,
    clearSystemReaderSession,
    onPullToRefresh,
  } = props

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            {selectedBottomTab === 'library' && (
            <div role="tablist" aria-label="Techniques view" className={cn('flex items-center gap-1.5 overflow-x-auto px-1', shellTopTabsClass)}>
              {([
                { value: 'my-library' as const, label: 'My Library', Icon: BookOpen, count: libraryTechniques.length },
                { value: 'discover' as const, label: 'Discover', Icon: Compass, count: null as number | null },
              ]).map(({ value, label, Icon, count }) => (
                <button
                  key={value}
                  type="button"
                  role="tab"
                  aria-selected={selectedTechniquesTab === value}
                  onClick={() => {
                    // #region agent log (dd-techniques-tour)
                    debugTourLog('techniques top tab pressed', {
                      to: value,
                      selectedTechniquesTab: appState.selectedTechniquesTab,
                      selectedBottomTab: appState.selectedBottomTab,
                      coachMarksSeen: hasSeenCoachMarks,
                      shellHydratedOnce,
                      shellSyncing,
                    })
                    // #endregion agent log (dd-techniques-tour)
                    if (selectedTechniquesTab !== value) void haptics.light()
                    if (value === 'my-library' && shellHydratedOnce && !shellSyncing && !hasSeenCoachMarks) {
                      setCoachStep((previous) => previous ?? 0)
                    }
                    if (activeSurface === 'system-editor' || activeSurface === 'system-reader') {
                      clearSystemEditorSession()
                      clearSystemReaderSession()
                      setActiveSurface(null)
                    }
                    updateAppState((previous) => ({
                      ...previous,
                      selectedTechniquesTab: value,
                      selectedBottomTab: 'library',
                    }))
                  }}
                  className={cn(
                    'inline-flex items-center gap-1.5 whitespace-nowrap rounded-full font-bold transition active:scale-[0.97]',
                    shellTopTabButtonClass,
                    selectedTechniquesTab === value ? 'bg-white/10 text-white' : 'text-white/45',
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" />
                  <span>{label}</span>
                  {count != null && count > 0 ? (
                    <span
                      className={cn(
                        'inline-flex min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none',
                        selectedTechniquesTab === value ? 'bg-[#4d7cff]/25 text-[#a9c0ff]' : 'bg-white/10 text-white/60',
                      )}
                    >
                      {count > 99 ? '99+' : count}
                    </span>
                  ) : null}
                </button>
              ))}
            </div>
            )}

            {selectedTechniquesTab === 'my-library' && (
              <PullToRefresh onRefresh={onPullToRefresh} className="pb-6">
                <BranchSelect
                  label="Technique branch"
                  value={selectedTechniqueBranch}
                  onChange={(branch) => updateAppState((previous) => ({
                    ...previous,
                    selectedTechniqueBranch: branch,
                  }))}
                />
                <SearchField inputRef={librarySearchInputRef} value={librarySearchInput} onChange={(event) => setLibrarySearchInput(event.target.value)} placeholder="Search techniques" />
                <div className="mt-2.5 flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      void haptics.light()
                      setLibraryView((previous) => (previous === 'list' ? 'graph' : 'list'))
                    }}
                    aria-pressed={libraryView === 'graph'}
                    aria-label={libraryView === 'graph' ? 'Switch to list view' : 'Switch to graph view'}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.97]"
                  >
                    <Globe className="h-4 w-4" />
                    {libraryView === 'graph' ? 'List' : 'Graph'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void haptics.light()
                      setActiveSurface('techniques-filter-category')
                    }}
                    aria-haspopup="dialog"
                    aria-label={appState.activeCategoryFilter === 'all' ? 'Filter by category' : `Category filter: ${BJJ_CATEGORY_META[appState.activeCategoryFilter].label}`}
                    className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.97]"
                  >
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: appState.activeCategoryFilter === 'all' ? 'rgba(255,255,255,0.28)' : toTechniqueColor(appState.activeCategoryFilter) }} />
                    <span>
                      {appState.activeCategoryFilter === 'all' ? 'Filter' : BJJ_CATEGORY_META[appState.activeCategoryFilter].label}
                    </span>
                    <ChevronDown className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      void haptics.light()
                      updateAppState((previous) => ({
                        ...previous,
                        librarySort: previous.librarySort === 'new' ? 'a-z' : 'new',
                      }))
                    }}
                    aria-label={`Sort: ${appState.librarySort === 'new' ? 'Newest first' : 'A to Z'}`}
                    className="inline-flex items-center gap-1 rounded-full border border-white/10 bg-white/6 px-4 py-2 text-sm font-semibold text-white transition active:scale-[0.97]"
                  >
                    {appState.librarySort === 'new' ? 'Newest' : 'A-Z'}
                    <ChevronDown className="h-4 w-4" />
                  </button>
                </div>
                <div className="mt-2.5 flex items-center justify-between px-1 text-sm font-semibold text-white/68">
                  <span>{filteredLibraryTechniques.length} technique{filteredLibraryTechniques.length === 1 ? '' : 's'} found</span>
                </div>

                {filteredLibraryTechniques.length === 0 ? (
                  <EmptyState
                    title="No techniques yet"
                    body="Browse Discover to fork curated techniques, or see what teammates are publishing in Community."
                    actionLabel="Browse Discover"
                    onAction={() => updateAppState((previous) => ({
                      ...previous,
                      selectedTechniquesTab: 'discover',
                      selectedBottomTab: 'library',
                    }))}
                    secondaryLabel="Find teammates"
                    onSecondaryAction={() => updateAppState((previous) => ({
                      ...previous,
                      selectedBottomTab: 'community',
                    }))}
                  />
                ) : libraryView === 'graph' ? (
                  <div className={cn(shellSubsectionSpacingClass, 'rounded-[24px] border border-white/10 bg-black/35 p-4')}>
                    {(() => {
                      const nodes = filteredLibraryTechniques.slice(0, 40)
                      const radius = 140
                      const center = 180
                      const toPos = (index: number) => {
                        const angle = (index / Math.max(1, nodes.length)) * Math.PI * 2
                        return {
                          x: center + Math.cos(angle) * radius,
                          y: center + Math.sin(angle) * radius,
                        }
                      }
                      const positions = new Map<string, { x: number; y: number }>()
                      nodes.forEach((technique, index) => {
                        positions.set(technique.id, toPos(index))
                      })

                      const edges: Array<{ from: string; to: string }> = []
                      for (const technique of nodes) {
                        for (const linkedId of technique.linkedTechniqueIds) {
                          if (positions.has(linkedId)) {
                            edges.push({ from: technique.id, to: linkedId })
                          }
                        }
                      }

                      return (
                        <div className="relative mx-auto h-[360px] w-[360px]">
                          <svg className="absolute inset-0 h-full w-full">
                            {edges.map((edge) => {
                              const from = positions.get(edge.from)
                              const to = positions.get(edge.to)
                              if (!from || !to) return null
                              return (
                                <line
                                  key={`${edge.from}-${edge.to}`}
                                  x1={from.x}
                                  y1={from.y}
                                  x2={to.x}
                                  y2={to.y}
                                  stroke="rgba(126,164,255,0.24)"
                                  strokeWidth="1.25"
                                  strokeLinecap="round"
                                />
                              )
                            })}
                          </svg>
                          {nodes.map((technique) => {
                            const pos = positions.get(technique.id)
                            if (!pos) return null
                            return (
                              <button
                                key={technique.id}
                                type="button"
                                onClick={() => {
                                  void haptics.light()
                                  openTechniqueDetail(technique.id, 'technique-detail')
                                }}
                                className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/10 bg-white/6 px-3 py-2 text-xs font-bold text-white/85 shadow-[0_10px_30px_rgba(0,0,0,0.35)] transition active:scale-95"
                                style={{ left: pos.x, top: pos.y }}
                              >
                                {technique.title.length > 18 ? `${technique.title.slice(0, 16)}…` : technique.title}
                              </button>
                            )
                          })}
                        </div>
                      )
                    })()}
                  <p className="mt-4 text-xs font-semibold text-white/45">
                      Map shows up to 40 {getMartialArtsBranchLabel(selectedTechniqueBranch)} techniques and their linked connections.
                    </p>
                  </div>
                ) : (
                  <div className={cn(shellSubsectionSpacingClass, 'space-y-3')}>
                    {filteredLibraryTechniques.map((technique) => {
                      const isJustForked = justForkedId?.kind === 'technique' && justForkedId.id === technique.id
                      return (
                      <div
                        key={technique.id}
                        ref={isJustForked ? handleJustForkedRef : undefined}
                        className={cn('rounded-[22px] transition-shadow', isJustForked && 'ring-2 ring-[#4d7cff]/60 shadow-[0_0_24px_rgba(77,124,255,0.35)]')}
                      >
                      <button
                        type="button"
                        onClick={() => {
                          void haptics.light()
                          openTechniqueDetail(technique.id, 'technique-detail')
                        }}
                        className="block w-full text-left"
                      >
                        <ShellCard className={cn('relative overflow-hidden', shellCompactCardPaddingClass)}>
                          <div className="absolute inset-0 bg-[radial-gradient(circle_at_right,rgba(255,255,255,0.03),transparent_45%)]" />
                          <div className="relative flex items-start gap-3">
                            <div className="mt-1 h-14 w-1 rounded-full" style={{ backgroundColor: toTechniqueColor(technique.category) }} />
                            <div className="flex-1">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className={cn(techniqueRowTitleClass, 'font-bold leading-none')}>{technique.title}</p>
                                {isJustForked ? (
                                  <span className="rounded-full border border-[#4d7cff]/45 bg-[#4d7cff]/15 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.16em] text-[#a9c0ff]">
                                    New
                                  </span>
                                ) : null}
                              </div>
                              <p className="mt-2 text-sm text-white/35">{formatPrettyDate(technique.updatedAt)}</p>
                              <div className="mt-4 flex flex-wrap gap-2">
                                {technique.tags.slice(0, 3).map((tag) => (
                                  <span key={tag} className="rounded-full border border-white/8 bg-white/7 px-3 py-1 text-xs font-semibold text-white/58">
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                            <CircleIconButton className="h-8 w-8 self-center">
                              <ChevronDown className="h-4 w-4" />
                            </CircleIconButton>
                          </div>
                        </ShellCard>
                      </button>
                      </div>
                      )
                    })}
                  </div>
                )}

                {coachStep !== null && (
                  <div className="fixed inset-0 z-40 bg-black/55 px-6">
                    <div className="mx-auto flex h-full w-full max-w-[430px] items-center justify-center">
                      <ShellCard className="w-full max-w-[340px] p-6">
                        <div className="flex items-start justify-between">
                          <div>
                            <p className="text-sm font-semibold text-white/45">Step {coachStep + 1} of 5</p>
                            <h3 className="mt-2 text-[32px] font-black leading-none">
                              {[
                                'Add Techniques',
                                'Search Your Techniques',
                                'Filter by Category',
                                'Tag Filtering',
                                'Interact with Techniques',
                              ][coachStep]}
                            </h3>
                          </div>
                          <button type="button" onClick={() => void completeCoachMarksTour()} className="text-white/55" aria-label="Close tutorial">
                            <X className="h-5 w-5" />
                          </button>
                        </div>
                        <p className="mt-4 text-[18px] leading-7 text-white/62">
                          {[
                            'Tap the + button to add a new technique to your collection.',
                            'Use the search bar to quickly find techniques by name or tag.',
                            'Filter techniques by category like submission, sweep, or escape.',
                            'Tags help you find techniques by position or custom context.',
                            'Tap a technique to view details and keep your notes current from the add/edit flows.',
                          ][coachStep]}
                        </p>
                        <div className="mt-6 flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() => setCoachStep((previous) => previous !== null ? Math.max(0, previous - 1) : previous)}
                            className={cn('text-sm font-semibold text-white/55', coachStep === 0 && 'invisible')}
                          >
                            Back
                          </button>
                          <ProgressDots count={5} active={coachStep} />
                          <button
                            type="button"
                            onClick={() => {
                              if (coachStep === 4) {
                                void completeCoachMarksTour()
                                return
                              }
                              setCoachStep((previous) => (previous ?? 0) + 1)
                            }}
                            className="rounded-full bg-[#2f58ff] px-4 py-2 text-sm font-bold"
                          >
                            {coachStep === 4 ? 'Got it' : 'Next'}
                          </button>
                        </div>
                      </ShellCard>
                    </div>
                  </div>
                )}
              </PullToRefresh>
            )}

            {selectedTechniquesTab === 'systems' && (
              <div className="flex min-h-0 flex-1 flex-col">
                <div className="sticky top-0 z-20 shrink-0 px-1 pb-3 pt-1">
                  <div className="rounded-[26px] border border-white/10 bg-[#050914]/94 p-3 shadow-[0_18px_44px_rgba(0,0,0,0.36)] backdrop-blur-xl">
                    {(() => {
                      const activeSystems = systemsState.filter((s) => s.status !== 'draft')
                      const branchScoped = activeSystems.filter((s) => s.branch === selectedSystemBranch)
                      const mineCount = user?.id ? activeSystems.filter((s) => s.userId === user.id).length : 0
                      const publicCount = branchScoped.filter((s) => s.visibility === 'public' || !s.userId).length
                      return (
                        <>
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8cabff]">Training OS</p>
                              <h2 className="mt-1 truncate text-[26px] font-black leading-none text-white">Gameplans</h2>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                void haptics.light()
                                openUserSystemEditorCreate()
                              }}
                              aria-label="New gameplan"
                              className="inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-[16px] border border-[#4d7cff]/50 bg-[linear-gradient(135deg,#4c6fff,#2c52ff)] px-4 text-sm font-black text-white shadow-[0_14px_32px_rgba(47,88,255,0.35)] transition active:scale-[0.97]"
                            >
                              <Plus className="h-4 w-4" />
                              New
                            </button>
                          </div>
                          <div className="mt-3 grid grid-cols-3 gap-2">
                            {[
                              ['Maps', branchScoped.length],
                              ['Mine', mineCount],
                              ['Drafts', systemDraftsForBranch.length],
                            ].map(([label, value]) => (
                              <div key={label} className="rounded-[16px] border border-white/8 bg-white/[0.045] px-3 py-2">
                                <p className="text-[18px] font-black leading-none text-white">{value}</p>
                                <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/38">{label}</p>
                              </div>
                            ))}
                          </div>
                          <div className="mt-3 grid grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] gap-2">
                            <BranchSelect
                              label="Gameplan branch"
                              value={selectedSystemBranch}
                              onChange={(branch) => updateAppState((previous) => ({
                                ...previous,
                                selectedSystemBranch: branch,
                              }))}
                            />
                            <SearchField
                              inputRef={systemsHubSearchInputRef}
                              value={appState?.systemsHubSearch ?? ''}
                              onChange={(event) =>
                                updateAppState((previous) => ({ ...previous, systemsHubSearch: event.target.value }))
                              }
                              placeholder="Search"
                            />
                          </div>
                          <div className="mt-1.5 flex gap-1.5 overflow-x-auto pb-0.5">
                            {(() => {
                              const counts: Record<'all' | 'mine' | 'curated' | 'community', number> = {
                                all: branchScoped.length,
                                mine: mineCount,
                                curated: branchScoped.filter((s) => !s.userId).length,
                                community: user?.id ? branchScoped.filter((s) => Boolean(s.userId && s.userId !== user.id)).length : 0,
                              }
                              return ([
                                ['all', 'All'],
                                ['mine', 'Yours'],
                                ['curated', 'Curated'],
                                ['community', 'Community'],
                              ] as const).map(([value, label]) => {
                                const selected = (appState?.systemsHubFilter ?? 'all') === value
                                const count = counts[value]
                                return (
                                  <button
                                    key={value}
                                    type="button"
                                    onClick={() => {
                                      if (!selected) void haptics.light()
                                      setSystemActionsOpenId(null)
                                      updateAppState((previous) => ({
                                        ...previous,
                                        systemsHubFilter: value,
                                      }))
                                    }}
                                    className={cn(
                                      'inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold transition active:scale-[0.97]',
                                      selected ? 'bg-white/12 text-white' : 'text-white/45',
                                    )}
                                    aria-pressed={selected}
                                  >
                                    <span>{label}</span>
                                    {count > 0 ? (
                                      <span className={cn(
                                        'inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold leading-none',
                                        selected ? 'bg-[#4d7cff]/25 text-[#a9c0ff]' : 'bg-white/10 text-white/60',
                                      )}>
                                        {count > 99 ? '99+' : count}
                                      </span>
                                    ) : null}
                                  </button>
                                )
                              })
                            })()}
                            {publicCount > 0 ? (
                              <span className="inline-flex shrink-0 items-center rounded-full px-3 py-1.5 text-xs font-bold text-white/30">
                                {publicCount} visible
                              </span>
                            ) : null}
                          </div>
                        </>
                      )
                    })()}
                  </div>
                </div>
                <PullToRefresh onRefresh={onPullToRefresh} className="pb-6">
                {systemDraftsForBranch.length > 0 ? (
                  <div className="mb-4 px-1">
                    <div className="rounded-[22px] border border-[#4d7cff]/18 bg-[#07101f]/72 p-4 shadow-[0_18px_46px_rgba(0,0,0,0.32)]">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#8cabff]">Drafts</p>
                          <p className="mt-1 text-sm font-semibold text-white/58">Resume unfinished training maps.</p>
                        </div>
                        <span className="rounded-full border border-white/10 bg-black/25 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/42">
                          {systemDraftsForBranch.length}
                        </span>
                      </div>
                      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                        {systemDraftsForBranch.map((draft) => (
                          <div key={draft.id} className="w-[245px] shrink-0 rounded-[18px] border border-white/10 bg-black/24 p-3">
                            <div className="h-24 overflow-hidden rounded-[14px] border border-white/8 bg-[#050914]">
                              <SystemGraphCanvas
                                variant="preview"
                                nodes={draft.nodes}
                                edges={draft.edges}
                                positions={computeGraphLayout(draft.nodes, draft.edges)}
                                density="compact"
                                showGrid
                                showControls={false}
                                showMiniMap={false}
                                className="h-full w-full"
                              />
                            </div>
                            <p className="mt-3 truncate text-sm font-black text-white">{draft.title || 'Untitled gameplan'}</p>
                            <p className="mt-1 text-xs font-semibold text-white/42">{draft.nodes.length} steps · {draft.edges.length} outcomes</p>
                            <div className="mt-3 grid grid-cols-[1fr_auto] gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  void haptics.light()
                                  openUserSystemEditorEdit(draft)
                                }}
                                className="min-h-[42px] rounded-[14px] border border-[#4d7cff]/35 bg-[#4d7cff]/16 px-3 text-xs font-black text-[#d9e4ff] transition active:scale-[0.97]"
                              >
                                Resume
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  void haptics.warning()
                                  if (!window.confirm(`Delete draft “${draft.title}”?`)) return
                                  void handleDeleteUserSystem(draft.id)
                                }}
                                className="inline-flex h-[42px] w-[42px] items-center justify-center rounded-[14px] border border-white/10 bg-white/[0.04] text-white/45 transition active:scale-95"
                                aria-label={`Delete draft ${draft.title}`}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : null}
                {systemsState.filter((system) => system.status !== 'draft').length === 0 && systemDraftsForBranch.length === 0 ? (
                  <div className="flex flex-col items-center px-2 pt-2">
                    <EmptyState
                      title="No gameplans yet"
                      body="Build step-by-step training paths. Add one step, branch into outcomes, and MatFlow draws the map."
                      actionLabel="Create gameplan"
                      onAction={openUserSystemEditorCreate}
                      secondaryLabel="Discover public gameplans"
                      onSecondaryAction={() => updateAppState((previous) => ({
                        ...previous,
                        selectedBottomTab: 'community',
                      }))}
                    />
                  </div>
                ) : systemsFilteredSorted.length === 0 ? (
                  <div className="flex flex-col items-center px-2 pt-2">
                    <EmptyState
                      title={systemDraftsForBranch.length > 0 ? 'No finished gameplans yet' : 'No matches'}
                      body={systemDraftsForBranch.length > 0 ? 'Resume a draft above or finish a new gameplan when it is ready.' : 'Try another search term or filter. Your gameplans are still saved.'}
                      actionLabel="Clear filters"
                      onAction={() => updateAppState((previous) => ({
                        ...previous,
                        systemsHubFilter: 'all',
                        systemsHubSearch: '',
                      }))}
                    />
                  </div>
                ) : (
                  <div className="space-y-4 px-1">
                    {systemsFilteredSorted.map((system) => {
                      const isMine = Boolean(user && system.userId && system.userId === user.id)
                      const isCatalog = !system.userId
                      const isCommunity = Boolean(system.userId && !isMine)
                      const pinned = (appState?.pinnedSystemIds ?? []).includes(system.id)
                      const canOpenReader = !system.locked || appState.profile.proUnlocked
                      const isJustForked = justForkedId?.kind === 'system' && justForkedId.id === system.id
                      const linkedTechniqueCount = new Set(system.nodes.flatMap((node) => node.linkedTechniqueIds ?? node.linkedTechniqueTitles ?? [])).size
                      return (
                        <div
                          key={system.id}
                          ref={isJustForked ? handleJustForkedRef : undefined}
                          className={cn('rounded-[22px] transition-shadow', isJustForked && 'ring-2 ring-[#4d7cff]/60 shadow-[0_0_24px_rgba(77,124,255,0.35)]')}
                        >
                        <ShellCard className="overflow-visible p-0">
                          <div className="relative">
                            <SystemPreviewGraph system={system} />
                            <div className="pointer-events-none absolute left-3 top-3 flex flex-wrap gap-1.5">
                              {isJustForked ? (
                                <span className="rounded-full border border-[#4d7cff]/45 bg-[#4d7cff]/18 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#c8d6ff] backdrop-blur-md">
                                  New
                                </span>
                              ) : null}
                              {isMine ? (
                                <span className="rounded-full border border-emerald-500/35 bg-emerald-500/14 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-emerald-100 backdrop-blur-md">
                                  Yours
                                </span>
                              ) : isCatalog ? (
                                <span className="rounded-full border border-white/10 bg-black/45 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-white/62 backdrop-blur-md">
                                  Curated
                                </span>
                              ) : isCommunity ? (
                                <span className="rounded-full border border-[#4d7cff]/35 bg-[#4d7cff]/14 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#b8c9ff] backdrop-blur-md">
                                  Community
                                </span>
                              ) : null}
                              {system.locked && !appState.profile.proUnlocked ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-[#4d7cff]/35 bg-[#4d7cff]/14 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-[#b8c9ff] backdrop-blur-md">
                                  <Lock className="h-3.5 w-3.5" />
                                  Pro
                                </span>
                              ) : null}
                            </div>
                            {pinned ? (
                              <div className="absolute right-3 top-3 inline-flex h-9 w-9 items-center justify-center rounded-full border border-amber-300/30 bg-amber-300/14 text-amber-100 backdrop-blur-md">
                                <Star className="h-4 w-4 fill-amber-200" />
                              </div>
                            ) : null}
                          </div>
                          <div className={cn(isCompactHeight ? 'p-4' : 'p-5')}>
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <h3 className={cn(categoryRowTitleClass, 'truncate font-black leading-none')}>{system.title}</h3>
                                <p className="mt-2 line-clamp-2 text-[15px] leading-6 text-white/60">{system.summary}</p>
                              </div>
                              <div className="relative shrink-0">
                                <button
                                  type="button"
                                  onClick={() => {
                                    void haptics.light()
                                    setSystemActionsOpenId((current) => (current === system.id ? null : system.id))
                                  }}
                                  className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.06] text-white/70 transition active:scale-95"
                                  aria-label={`${system.title} actions`}
                                  aria-expanded={systemActionsOpenId === system.id}
                                  aria-haspopup="menu"
                                >
                                  <MoreHorizontal className="h-5 w-5" />
                                </button>
                                {systemActionsOpenId === system.id ? (
                                  <div role="menu" className="absolute right-0 top-12 z-30 w-44 overflow-hidden rounded-[16px] border border-white/12 bg-[#080d18] p-1.5 shadow-[0_20px_60px_rgba(0,0,0,0.55)]">
                                    <button
                                      type="button"
                                      role="menuitem"
                                      onClick={() => {
                                        void haptics.success()
                                        togglePinSystem(system.id)
                                        setSystemActionsOpenId(null)
                                      }}
                                      className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2.5 text-left text-sm font-bold text-white/78 hover:bg-white/[0.06]"
                                    >
                                      <Star className={cn('h-4 w-4', pinned ? 'fill-amber-300 text-amber-200' : 'text-white/50')} />
                                      {pinned ? 'Unpin' : 'Pin'}
                                    </button>
                                    {isMine ? (
                                      <>
                                        <button
                                          type="button"
                                          role="menuitem"
                                          onClick={() => {
                                            void haptics.light()
                                            setSystemActionsOpenId(null)
                                            openUserSystemEditorEdit(system)
                                          }}
                                          className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2.5 text-left text-sm font-bold text-white/78 hover:bg-white/[0.06]"
                                        >
                                          <Pencil className="h-4 w-4 text-white/50" />
                                          Edit
                                        </button>
                                        <button
                                          type="button"
                                          role="menuitem"
                                          onClick={() => {
                                            void haptics.light()
                                            setSystemActionsOpenId(null)
                                            openUserSystemDuplicate(system)
                                          }}
                                          className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2.5 text-left text-sm font-bold text-white/78 hover:bg-white/[0.06]"
                                        >
                                          <Copy className="h-4 w-4 text-white/50" />
                                          Duplicate
                                        </button>
                                        <button
                                          type="button"
                                          role="menuitem"
                                          onClick={() => {
                                            void haptics.warning()
                                            setSystemActionsOpenId(null)
                                            if (!window.confirm(`Delete “${system.title}”?`)) return
                                            void handleDeleteUserSystem(system.id)
                                          }}
                                          className="flex w-full items-center gap-2 rounded-[12px] px-3 py-2.5 text-left text-sm font-bold text-red-200 hover:bg-red-500/10"
                                        >
                                          <Trash2 className="h-4 w-4" />
                                          Delete
                                        </button>
                                      </>
                                    ) : null}
                                  </div>
                                ) : null}
                              </div>
                            </div>
                            <div className="mt-4 grid grid-cols-3 gap-2">
                              {[
                                ['Steps', system.nodes.length],
                                ['Links', system.edges.length],
                                ['Refs', linkedTechniqueCount],
                              ].map(([label, value]) => (
                                <div key={label} className="rounded-[14px] border border-white/8 bg-black/25 px-3 py-2">
                                  <p className="text-base font-black leading-none text-white">{value}</p>
                                  <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">{label}</p>
                                </div>
                              ))}
                            </div>
                            <div className="mt-4 flex items-center gap-2">
                              {canOpenReader ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSystemActionsOpenId(null)
                                    openSystemReader(system)
                                  }}
                                  className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-[16px] border border-[#4d7cff]/45 bg-[#4d7cff]/18 px-4 text-sm font-black text-[#d9e4ff] shadow-[0_10px_28px_rgba(77,124,255,0.18)]"
                                >
                                  <BookOpen className="h-4 w-4" />
                                  Open
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => setActiveSurface('paywall')}
                                  className="inline-flex min-h-[48px] flex-1 items-center justify-center gap-2 rounded-[16px] border border-[#4d7cff]/45 bg-[#4d7cff]/18 px-4 text-sm font-black text-[#d9e4ff]"
                                >
                                  <Lock className="h-4 w-4" />
                                  Unlock Pro
                                </button>
                              )}
                              {isMine ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSystemActionsOpenId(null)
                                    openUserSystemEditorEdit(system)
                                  }}
                                  className="inline-flex min-h-[48px] items-center justify-center rounded-[16px] border border-white/10 bg-white/[0.06] px-4 text-sm font-black text-white/75"
                                  aria-label="Edit gameplan"
                                >
                                  <Pencil className="h-4 w-4" />
                                </button>
                              ) : null}
                            </div>
                            {isMine ? (
                              <p className="mt-3 text-xs font-semibold text-white/36">
                                {system.visibility === 'public' ? 'Public' : 'Private'}
                              </p>
                            ) : null}
                          </div>
                        </ShellCard>
                        </div>
                      )
                    })}
                  </div>
                )}
                </PullToRefresh>
              </div>
            )}

            {selectedTechniquesTab === 'discover' && (
              <PullToRefresh onRefresh={onPullToRefresh} className="pb-6">
                <BranchSelect
                  label="Discover branch"
                  value={selectedTechniqueBranch}
                  onChange={(branch) => updateAppState((previous) => ({
                    ...previous,
                    selectedTechniqueBranch: branch,
                  }))}
                />
                <SearchField inputRef={librarySearchInputRef} value={librarySearchInput} onChange={(event) => setLibrarySearchInput(event.target.value)} placeholder="Search techniques" />
                {discoverTechniques.length === 0 ? (
                  <EmptyState title="Discover is empty" body="Technique categories will appear here once the catalog is available." />
                ) : (
                  <div className={cn(shellSubsectionSpacingClass, 'space-y-3')}>
                    {(Object.keys(BJJ_CATEGORY_META) as BjjTechniqueCategory[]).map((category) => {
                      const expanded = expandedDiscoverCategory === category
                      const items = discoverByCategory[category]
                      return (
                        <div key={category}>
                          <button
                            type="button"
                            onClick={() => {
                              void haptics.light()
                              setExpandedDiscoverCategory((previous) => previous === category ? null : category)
                            }}
                            aria-expanded={expanded}
                            aria-label={`${BJJ_CATEGORY_META[category].label}, ${items.length} techniques${expanded ? ', expanded' : ', collapsed'}`}
                            className="block w-full text-left"
                          >
                            <ShellCard className="px-4 py-3.5">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-3">
                                  <span className="h-6 w-1 rounded-full" style={{ backgroundColor: BJJ_CATEGORY_META[category].color }} />
                                  <div>
                                    <p className={cn(categoryRowTitleClass, 'font-black leading-none')}>{BJJ_CATEGORY_META[category].label}</p>
                                    <p className="mt-1 text-sm text-white/40">{items.length} techniques</p>
                                  </div>
                                </div>
                                <ChevronDown className={cn('h-5 w-5 text-white/45 transition', expanded && 'rotate-180')} />
                              </div>
                            </ShellCard>
                          </button>
                          {expanded && (
                            <div className="mt-3 space-y-2">
                              {items.map((technique) => {
                                const added = appState.discoverAddedTechniqueIds.includes(technique.id)
                                return (
                                  <button
                                    key={technique.id}
                                    type="button"
                                    onClick={() => {
                                      void haptics.light()
                                      openTechniqueDetail(technique.id, 'discover-detail')
                                    }}
                                    className="flex w-full items-center justify-between rounded-[20px] border border-white/8 bg-white/5 px-4 py-3.5 text-left transition hover:bg-white/7 active:scale-[0.99]"
                                  >
                                    <div>
                                      <p className={cn(techniqueRowTitleClass, 'font-bold leading-none')}>{technique.title}</p>
                                    </div>
                                    <div className="flex items-center gap-3">
                                      {added && (
                                        <span className="rounded-full border border-[#4d7cff]/35 bg-[#4d7cff]/18 px-3 py-1 text-xs font-bold text-[#8cabff]">
                                          Added
                                        </span>
                                      )}
                                      <ChevronRight className="h-5 w-5 text-white/38" />
                                    </div>
                                  </button>
                                )
                              })}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </PullToRefresh>
            )}
    </div>
  )
}
