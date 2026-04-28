'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  AlertTriangle,
  Bell,
  Clock,
  Filter,
  MapPin,
  Plus,
  Siren,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { getTier2Label } from '@/lib/constants/equipment-taxonomy'
import {
  NotificationEducationModal,
  useNotificationEducation,
} from '@/components/notification-education-modal'

type SosRow = Record<string, unknown>

type SortKey = 'response_recency' | 'posted' | 'urgency'

const SORT_LABELS: Record<SortKey, string> = {
  response_recency: 'Most recent response',
  posted: 'Most recently posted',
  urgency: 'Urgency (critical first)',
}

const NOTIF_HINT_KEY = 'mg-sos-notif-hint-shown'
type TabValue = 'mine' | 'feed'
const VALID_HASH = new Set<TabValue>(['mine', 'feed'])

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function extractResponseCount(row: SosRow): number {
  const rc = row.response_count
  if (Array.isArray(rc) && rc.length > 0) {
    const first = rc[0] as { count?: number }
    return first?.count ?? 0
  }
  return 0
}

function lastViewedAt(sosId: string): number {
  if (typeof window === 'undefined') return 0
  const raw = localStorage.getItem(`mg-sos-last-viewed-${sosId}`)
  return raw ? Number(raw) : 0
}

function readHashTab(): TabValue | null {
  if (typeof window === 'undefined') return null
  const raw = window.location.hash.replace(/^#/, '')
  return VALID_HASH.has(raw as TabValue) ? (raw as TabValue) : null
}

interface Props {
  myRequests: SosRow[]
  broadcastRequests: SosRow[]
  loading?: boolean
  filtersBar?: React.ReactNode
}

export function SosDashboardTabs({
  myRequests,
  broadcastRequests,
  loading = false,
  filtersBar,
}: Props) {
  // Conditional default: if user has zero owned SOS, land on the feed so they
  // don't hit a dead-end empty state.
  const initialTab: TabValue = useMemo(() => {
    const fromHash = readHashTab()
    if (fromHash) return fromHash
    return myRequests.length === 0 ? 'feed' : 'mine'
  }, [myRequests.length])

  const [tab, setTab] = useState<TabValue>(initialTab)
  const [sortKey, setSortKey] = useState<SortKey>('response_recency')
  const [showNotifHint, setShowNotifHint] = useState(false)

  const {
    showModal: showEduModal,
    setShowModal: setShowEduModal,
    notificationPermission,
  } = useNotificationEducation()

  // Sync hash → tab on initial mount + when user pastes a deep link.
  useEffect(() => {
    function onHashChange() {
      const next = readHashTab()
      if (next) setTab(next)
    }
    window.addEventListener('hashchange', onHashChange)
    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  // Sync tab → hash without triggering router push (preserves scroll).
  // Using replaceState avoids polluting browser history; the direct
  // assignment as a fallback ensures jsdom updates `window.location.hash`
  // when the harness lacks a backing document URL.
  function handleTabChange(v: string) {
    if (!VALID_HASH.has(v as TabValue)) return
    setTab(v as TabValue)
    if (typeof window === 'undefined') return
    try {
      window.history.replaceState(null, '', `#${v}`)
    } catch {
      // Fall through to direct assignment below.
    }
    if (window.location.hash !== `#${v}`) {
      window.location.hash = v
    }
  }

  // One-shot notification permission hint (Cycle 55 logic preserved).
  useEffect(() => {
    if (loading) return
    if (notificationPermission !== 'default') return
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem(NOTIF_HINT_KEY)) return

    const now = Date.now()
    const needsHint = myRequests.some((r) => {
      const count = extractResponseCount(r)
      if (count > 0) return false
      const posted = new Date(r.created_at as string).getTime()
      return now - posted > 30 * 60 * 1000
    })
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hint computed from fetched data; mirrors the Cycle 55 pattern in /sos/page.tsx
    if (needsHint) setShowNotifHint(true)
  }, [loading, myRequests, notificationPermission])

  function dismissNotifHint() {
    setShowNotifHint(false)
    if (typeof window !== 'undefined') sessionStorage.setItem(NOTIF_HINT_KEY, '1')
  }

  const sortedMyRequests = useMemo(() => {
    const copy = [...myRequests]
    if (sortKey === 'urgency') {
      copy.sort((a, b) => {
        const au = a.urgency === 'critical' ? 0 : 1
        const bu = b.urgency === 'critical' ? 0 : 1
        if (au !== bu) return au - bu
        return (
          new Date(b.created_at as string).getTime() -
          new Date(a.created_at as string).getTime()
        )
      })
    } else if (sortKey === 'response_recency') {
      copy.sort((a, b) => {
        const ca = extractResponseCount(a)
        const cb = extractResponseCount(b)
        if (cb !== ca) return cb - ca
        return (
          new Date(b.created_at as string).getTime() -
          new Date(a.created_at as string).getTime()
        )
      })
    } else {
      copy.sort(
        (a, b) =>
          new Date(b.created_at as string).getTime() -
          new Date(a.created_at as string).getTime()
      )
    }
    return copy
  }, [myRequests, sortKey])

  const hasMyRequests = myRequests.length > 0

  // Pulse-dot decoration on the My tab label: any owned SOS has new responses
  // since the user last viewed it.
  const hasUnreadOwn = useMemo(() => {
    if (typeof window === 'undefined') return false
    return myRequests.some((r) => {
      const id = r.id as string
      const responseCount = extractResponseCount(r)
      if (responseCount === 0) return false
      const lastView = lastViewedAt(id)
      return lastView < new Date(r.created_at as string).getTime()
    })
  }, [myRequests])

  return (
    <>
      {showNotifHint && (
        <div className="mb-4 flex items-start gap-3 rounded-lg border border-[#FF6B2B]/30 bg-[#FF6B2B]/5 px-4 py-3">
          <Bell className="mt-0.5 size-4 shrink-0 text-[#FF6B2B]" />
          <div className="flex-1">
            <p className="font-body text-sm text-foreground">
              Enable notifications to get alerted the moment a vendor responds.
            </p>
            <div className="mt-2 flex items-center gap-2">
              <Button
                size="sm"
                className="h-7 bg-[#FF6B2B] text-white hover:bg-[#FF6B2B]/90"
                onClick={() => {
                  setShowEduModal(true)
                  dismissNotifHint()
                }}
              >
                Turn on notifications
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="h-7"
                onClick={dismissNotifHint}
              >
                Not now
              </Button>
            </div>
          </div>
        </div>
      )}

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger
            value="mine"
            className="min-h-[44px] gap-1.5 font-display text-sm"
            data-testid="tab-mine"
          >
            My SOS Requests ({myRequests.length})
            {hasUnreadOwn ? (
              <span
                aria-label="New responses"
                data-testid="mine-pulse"
                className="ml-1 inline-flex size-2 items-center justify-center"
              >
                <span className="absolute inline-flex size-2 animate-ping rounded-full bg-[#FF6B2B] opacity-75" />
                <span className="relative inline-flex size-2 rounded-full bg-[#FF6B2B]" />
              </span>
            ) : null}
          </TabsTrigger>
          <TabsTrigger
            value="feed"
            className="min-h-[44px] font-display text-sm"
            data-testid="tab-feed"
          >
            Active in Your Categories ({broadcastRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="mine" className="mt-4">
          <div className="mb-3 flex items-center justify-end">
            {hasMyRequests && (
              <select
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="rounded-md border border-border bg-background px-2 py-1 font-body text-xs text-foreground"
                aria-label="Sort my requests"
              >
                {Object.entries(SORT_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            )}
          </div>

          {loading ? (
            <div className="space-y-3">
              {[1, 2].map((i) => (
                <Skeleton key={i} className="h-36 w-full rounded-lg" />
              ))}
            </div>
          ) : !hasMyRequests ? (
            <div className="flex flex-col items-center rounded-lg border border-dashed border-border bg-surface/50 py-10 text-center">
              <Siren className="mb-3 size-8 text-[#FF6B2B]" />
              <p className="font-display text-base font-semibold text-foreground">
                No SOS requests yet
              </p>
              <p className="mt-1 max-w-xs px-4 font-body text-sm text-muted-foreground">
                When you have urgent equipment needs, send an SOS to reach matching vendors instantly.
              </p>
              <Button
                asChild
                size="sm"
                className="mt-4 gap-1 bg-[#FF6B2B] text-white hover:bg-[#FF6B2B]/90"
              >
                <Link href="/sos/create">
                  <Plus className="size-4" />
                  Send your first SOS
                </Link>
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {sortedMyRequests.map((r) => {
                const id = r.id as string
                const responseCount = extractResponseCount(r)
                const catLabel = getTier2Label(r.equipment_category as string)
                const lastView = lastViewedAt(id)
                const hasUnread =
                  responseCount > 0 &&
                  lastView < new Date(r.created_at as string).getTime()
                const isActive = r.status === 'active'
                return (
                  <div
                    key={id}
                    className="rounded-lg border border-border bg-surface p-4"
                  >
                    <Link href={`/sos/${id}`} className="block">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={r.urgency === 'critical' ? 'destructive' : 'secondary'}
                          className="text-[10px]"
                        >
                          {r.urgency === 'critical' ? (
                            <>
                              <AlertTriangle className="mr-0.5 size-3" /> CRITICAL
                            </>
                          ) : (
                            'Normal'
                          )}
                        </Badge>
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {(r.status as string) || 'active'}
                        </Badge>
                        <span className="ml-auto font-body text-[11px] text-muted-foreground">
                          Posted {timeAgo(r.created_at as string)}
                        </span>
                      </div>
                      <h3 className="mt-1.5 font-display text-base font-semibold text-foreground">
                        {r.title as string}
                      </h3>
                      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 font-body text-xs text-muted-foreground">
                        {catLabel && (
                          <span className="font-medium text-foreground/80">
                            {catLabel}
                          </span>
                        )}
                        <span className="flex items-center gap-0.5">
                          <MapPin className="size-3" />
                          {(r.location_city as string) || 'Houston'},{' '}
                          {(r.location_state as string) || 'TX'}
                        </span>
                      </div>
                    </Link>

                    <Link
                      href={`/sos/${id}?tab=responses`}
                      className={`mt-3 flex min-h-[44px] items-center justify-center gap-2 rounded-md px-4 py-2 font-display text-sm font-semibold transition-colors ${
                        responseCount > 0
                          ? 'bg-[#FF6B2B] text-white hover:bg-[#FF6B2B]/90'
                          : 'bg-muted text-muted-foreground hover:bg-muted/80'
                      }`}
                      aria-label={
                        responseCount > 0
                          ? `${responseCount} response${responseCount === 1 ? '' : 's'} — view`
                          : 'No responses yet'
                      }
                    >
                      <Bell className="size-4" />
                      {responseCount > 0
                        ? `${responseCount} Response${responseCount === 1 ? '' : 's'}`
                        : 'No responses yet'}
                      {hasUnread && (
                        <span className="relative flex size-2">
                          <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-75" />
                          <span className="relative inline-flex size-2 rounded-full bg-white" />
                        </span>
                      )}
                    </Link>

                    {!isActive && (
                      <p className="mt-2 font-body text-[11px] text-muted-foreground">
                        This SOS is no longer active.
                      </p>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="feed" className="mt-4">
          {filtersBar ? <div className="mb-3">{filtersBar}</div> : null}

          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full rounded-lg" />
              ))}
            </div>
          ) : broadcastRequests.length === 0 ? (
            <div className="flex flex-col items-center rounded-lg border border-dashed border-border py-10 text-center">
              <div className="mb-3 text-3xl">📡</div>
              <p className="font-display text-base font-semibold text-foreground">
                No active SOS in your categories
              </p>
              <p className="mt-1 max-w-sm px-4 font-body text-sm text-muted-foreground">
                When vendors broadcast urgent needs that match your interests, they&apos;ll appear here.
              </p>
              <Link href="/profile" className="mt-3">
                <Button variant="outline" size="sm" className="font-body">
                  Update Your Categories
                </Button>
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {broadcastRequests.map((r) => {
                const requester = r.requester as Record<string, string> | null
                const catLabel = getTier2Label(r.equipment_category as string)
                return (
                  <Link
                    key={r.id as string}
                    href={`/sos/${r.id}`}
                    className="block rounded-lg border border-border bg-card p-4 transition-all hover:border-primary/30 hover:bg-surface/80"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={r.urgency === 'critical' ? 'destructive' : 'secondary'}
                            className="text-[10px]"
                          >
                            {r.urgency === 'critical' ? (
                              <>
                                <AlertTriangle className="mr-0.5 size-3" /> CRITICAL
                              </>
                            ) : (
                              'Normal'
                            )}
                          </Badge>
                          <span className="font-display text-sm font-semibold text-foreground">
                            {r.title as string}
                          </span>
                        </div>
                        {r.description ? (
                          <p className="line-clamp-1 font-body text-xs text-muted-foreground">
                            {r.description as string}
                          </p>
                        ) : null}
                        <div className="flex flex-wrap items-center gap-3 font-body text-xs text-muted-foreground">
                          <span className="font-medium text-foreground/80">
                            {requester?.company_name || requester?.full_name || 'Anonymous'}
                          </span>
                          {catLabel && (
                            <Badge variant="outline" className="text-[10px]">
                              {catLabel}
                            </Badge>
                          )}
                          <span className="flex items-center gap-0.5">
                            <MapPin className="size-3" />
                            {(r.location_city as string) || 'Houston'},{' '}
                            {(r.location_state as string) || 'TX'}
                          </span>
                          <span className="flex items-center gap-0.5">
                            <Clock className="size-3" />
                            {timeAgo(r.created_at as string)}
                          </span>
                        </div>
                      </div>
                      <span className="shrink-0 rounded-md border border-[#FF6B2B] px-3 py-1 font-display text-xs font-semibold text-[#FF6B2B]">
                        Respond
                      </span>
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <NotificationEducationModal open={showEduModal} onOpenChange={setShowEduModal} />

      {/* Tiny header decoration so the filter button still has a home on the
          feed tab. Rendered as a floating control above the tabs from
          /sos/page.tsx — kept here for the older one-page consumers if any. */}
      <FilterPlaceholder visible={false} />
    </>
  )
}

/**
 * Reserved for future inline SOS feed filter pill — Cycle 55's "Filter" button
 * lives in /sos/page.tsx and passes its UI through `filtersBar`. This stub
 * exists so the import surface doesn't change between cycles.
 */
function FilterPlaceholder({ visible }: { visible: boolean }) {
  if (!visible) return null
  return <Filter className="size-4" aria-hidden />
}
