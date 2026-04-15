'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import {
  AlertTriangle, Clock, MapPin, Filter, Siren, Bell, Plus,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  getSosRequests,
  getMySosRequests,
  type SosFilters,
} from '@/app/actions/sos'
import { EQUIPMENT_TAXONOMY, getTier2Label } from '@/lib/constants/equipment-taxonomy'
import {
  NotificationEducationModal,
  useNotificationEducation,
} from '@/components/notification-education-modal'

type SortKey = 'response_recency' | 'posted' | 'urgency'

const SORT_LABELS: Record<SortKey, string> = {
  response_recency: 'Most recent response',
  posted: 'Most recently posted',
  urgency: 'Urgency (critical first)',
}

const NOTIF_HINT_KEY = 'mg-sos-notif-hint-shown'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

type SosRow = Record<string, unknown>

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

export default function SosDashboard() {
  const [myRequests, setMyRequests] = useState<SosRow[]>([])
  const [broadcastRequests, setBroadcastRequests] = useState<SosRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<SosFilters>({})
  const [showFilters, setShowFilters] = useState(false)
  const [sortKey, setSortKey] = useState<SortKey>('response_recency')
  const [showNotifHint, setShowNotifHint] = useState(false)

  const {
    showModal: showEduModal,
    setShowModal: setShowEduModal,
    notificationPermission,
  } = useNotificationEducation()

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      const [mine, broadcast] = await Promise.all([
        getMySosRequests(),
        getSosRequests(filters),
      ])
      if (cancelled) return
      const mineRows: SosRow[] =
        'requests' in mine && mine.requests ? (mine.requests as SosRow[]) : []
      setMyRequests(mineRows)

      if ('requests' in broadcast && broadcast.requests) {
        // Exclude any SOSs the viewer already owns — they appear in My Requests.
        const mineIds = new Set(mineRows.map((r) => r.id as string))
        const filtered = (broadcast.requests as SosRow[]).filter(
          (r) => !mineIds.has(r.id as string)
        )
        setBroadcastRequests(filtered)
      } else {
        setBroadcastRequests([])
      }
      setLoading(false)
    }
    load()
    return () => {
      cancelled = true
    }
  }, [filters])

  // Notification permission hint: show once per session if any of the user's
  // own SOSs has no responses and was posted more than 30 minutes ago.
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
    // eslint-disable-next-line react-hooks/set-state-in-effect -- one-shot hint based on fetched data
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

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            <Siren className="size-6 text-[#FF6B2B]" />
            SOS Dashboard
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            Your active requests and matching broadcasts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            asChild
            size="sm"
            className="gap-1 bg-[#FF6B2B] text-white hover:bg-[#FF6B2B]/90"
          >
            <Link href="/sos/create">
              <Plus className="size-4" />
              Send SOS
            </Link>
          </Button>
        </div>
      </div>

      {/* Notification permission hint */}
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

      {/* SECTION 1: My SOS Requests */}
      <section className="mb-8">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold text-foreground">
            My SOS Requests
          </h2>
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
              // Heuristic: a SOS with responses is "unread" if the user has
              // never opened its detail page since it was created.
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

                  {/* Response chip: large, tappable, SOS orange when > 0 */}
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
      </section>

      {/* SECTION 2: Active in Your Categories */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="font-display text-lg font-semibold text-foreground">
              Active SOS in Your Categories
            </h2>
            <p className="font-body text-xs text-muted-foreground">
              Broadcasts from other users you can respond to
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-1 size-4" />
            Filter
          </Button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mb-4 flex flex-wrap gap-3 rounded-lg border border-border bg-surface p-4">
            <div className="space-y-1">
              <label className="font-body text-xs text-muted-foreground">Category</label>
              <select
                value={filters.category || ''}
                onChange={(e) =>
                  setFilters((p) => ({ ...p, category: e.target.value || undefined }))
                }
                className="rounded-md border border-border bg-background px-2 py-1 font-body text-xs text-foreground"
              >
                <option value="">All categories</option>
                {EQUIPMENT_TAXONOMY.map((tier1) => (
                  <optgroup key={tier1.id} label={tier1.label}>
                    {tier1.groups.map((group) => (
                      <option key={group.id} value={group.id}>
                        {group.label}
                      </option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="font-body text-xs text-muted-foreground">Urgency</label>
              <select
                value={filters.urgency || ''}
                onChange={(e) =>
                  setFilters((p) => ({
                    ...p,
                    urgency: (e.target.value || undefined) as SosFilters['urgency'],
                  }))
                }
                className="rounded-md border border-border bg-background px-2 py-1 font-body text-xs text-foreground"
              >
                <option value="">All</option>
                <option value="critical">Critical only</option>
                <option value="normal">Normal only</option>
              </select>
            </div>
          </div>
        )}

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
      </section>

      {/* Education modal */}
      <NotificationEducationModal open={showEduModal} onOpenChange={setShowEduModal} />
    </div>
  )
}
