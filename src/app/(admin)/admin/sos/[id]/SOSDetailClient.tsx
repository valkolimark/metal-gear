'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  Bell,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  MapPin,
  MessageCircle,
  RefreshCw,
  Sparkles,
  Truck,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  adminEscalateSOSUrgency,
  adminRebroadcastSOS,
  getSOSNotificationLog,
  getSOSResponseTimeline,
  type SOSDetailData,
  type SOSNotificationEntry,
  type SOSResponseEntry,
} from '@/app/actions/admin-sos'

interface Props {
  sos: SOSDetailData
  sosId: string
}

// ─── Formatting helpers ───────────────────────────────────────────

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  } catch {
    return '—'
  }
}

// ─── Badges ───────────────────────────────────────────────────────

function UrgencyBadge({ urgency }: { urgency: string }) {
  if (urgency === 'critical') {
    return (
      <Badge className="border-0 bg-red-600 font-body text-[10px] uppercase text-white">
        Critical
      </Badge>
    )
  }
  if (urgency === 'high') {
    return (
      <Badge
        className="border-0 font-body text-[10px] uppercase text-white"
        style={{ backgroundColor: '#FF6B2B' }}
      >
        High
      </Badge>
    )
  }
  if (urgency === 'normal') {
    return (
      <Badge className="border-0 bg-green-500/20 font-body text-[10px] uppercase text-green-400">
        Normal
      </Badge>
    )
  }
  return (
    <Badge className="border-0 bg-zinc-500/20 font-body text-[10px] uppercase text-zinc-400">
      {urgency}
    </Badge>
  )
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'active' || status === 'open') {
    return (
      <Badge className="border-0 bg-green-500/20 font-body text-[10px] uppercase text-green-400">
        Active
      </Badge>
    )
  }
  if (status === 'fulfilled') {
    return (
      <Badge className="border-0 bg-blue-500/20 font-body text-[10px] uppercase text-blue-400">
        Fulfilled
      </Badge>
    )
  }
  if (status === 'expired') {
    return (
      <Badge className="border-0 bg-amber-500/20 font-body text-[10px] uppercase text-amber-400">
        Expired
      </Badge>
    )
  }
  if (status === 'cancelled' || status === 'closed') {
    return (
      <Badge className="border-0 bg-zinc-500/20 font-body text-[10px] uppercase text-zinc-400">
        {status === 'cancelled' ? 'Cancelled' : 'Closed'}
      </Badge>
    )
  }
  return (
    <Badge className="border-0 bg-zinc-500/20 font-body text-[10px] uppercase text-zinc-400">
      {status}
    </Badge>
  )
}

function NotifStatusBadge({ readAt }: { readAt: string | null }) {
  if (readAt) {
    return (
      <Badge className="border-0 bg-blue-500/20 font-body text-[10px] uppercase text-blue-400">
        Read
      </Badge>
    )
  }
  return (
    <Badge className="border-0 bg-zinc-500/20 font-body text-[10px] uppercase text-zinc-400">
      Sent
    </Badge>
  )
}

// ─── Avatar helper ────────────────────────────────────────────────

function Avatar({
  url,
  name,
  size = 32,
}: {
  url: string | null
  name: string
  size?: number
}) {
  const initial = (name || '?')[0].toUpperCase()
  return (
    <div
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted"
      style={{ width: size, height: size }}
    >
      {url ? (
        <Image src={url} alt={name} width={size} height={size} className="size-full object-cover" unoptimized />
      ) : (
        <span className="font-body text-xs text-muted-foreground">{initial}</span>
      )}
    </div>
  )
}

// ─── Main Component ───────────────────────────────────────────────

export function SOSDetailClient({ sos, sosId }: Props) {
  const [notifLog, setNotifLog] = useState<SOSNotificationEntry[]>([])
  const [timeline, setTimeline] = useState<SOSResponseEntry[]>([])
  const [loadingTimeline, setLoadingTimeline] = useState(true)
  const [loadingNotif, setLoadingNotif] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [timelineOpen, setTimelineOpen] = useState(true)
  const [rebroadcasting, setRebroadcasting] = useState(false)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [currentUrgency, setCurrentUrgency] = useState<string>(sos.urgency)
  const [escalating, setEscalating] = useState(false)
  const [escalateConfirmOpen, setEscalateConfirmOpen] = useState(false)
  const [pendingUrgency, setPendingUrgency] = useState<'critical' | 'normal' | null>(null)
  const hasFetchedNotif = useRef(false)

  // Fetch response timeline on mount
  useEffect(() => {
    let cancelled = false
    setLoadingTimeline(true)
    getSOSResponseTimeline(sosId)
      .then((rows) => {
        if (!cancelled) setTimeline(rows)
      })
      .catch((err) => {
        console.error('[SOSDetailClient] timeline fetch failed', err)
        if (!cancelled) toast.error('Failed to load response timeline')
      })
      .finally(() => {
        if (!cancelled) setLoadingTimeline(false)
      })
    return () => {
      cancelled = true
    }
  }, [sosId])

  // Lazy fetch notification log when panel opens (once)
  function handleToggleNotif() {
    const next = !notifOpen
    setNotifOpen(next)
    if (next && !hasFetchedNotif.current) {
      hasFetchedNotif.current = true
      setLoadingNotif(true)
      getSOSNotificationLog(sosId)
        .then((rows) => setNotifLog(rows))
        .catch((err) => {
          console.error('[SOSDetailClient] notif log fetch failed', err)
          toast.error('Failed to load notification log')
        })
        .finally(() => setLoadingNotif(false))
    }
  }

  function handleUrgencyChange(value: string) {
    if (value !== 'critical' && value !== 'normal') return
    if (value === currentUrgency) return
    setPendingUrgency(value)
    setEscalateConfirmOpen(true)
  }

  async function handleConfirmEscalate() {
    if (!pendingUrgency) return
    setEscalating(true)
    try {
      const result = await adminEscalateSOSUrgency(sosId, pendingUrgency)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      setCurrentUrgency(result.newUrgency)
      if (result.newUrgency === 'critical' && result.emailsSent > 0) {
        toast.success(
          `Escalated to CRITICAL — sent escalation email to ${result.emailsSent} previously notified user${result.emailsSent === 1 ? '' : 's'}.`
        )
      } else if (result.newUrgency === 'critical') {
        toast.success('Escalated to CRITICAL.')
      } else {
        toast.success('Urgency set to Normal.')
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update urgency')
    } finally {
      setEscalating(false)
      setEscalateConfirmOpen(false)
      setPendingUrgency(null)
    }
  }

  async function handleRebroadcast() {
    setRebroadcasting(true)
    try {
      const result = await adminRebroadcastSOS(sosId)
      if (result.error) {
        toast.error(result.error)
      } else if (result.sent === 0) {
        toast.success(`All ${result.skipped} matched users were already notified.`)
      } else {
        toast.success(`Sent to ${result.sent} new recipients. ${result.skipped} already notified.`)
        // Refresh notification log if it was loaded
        if (hasFetchedNotif.current) {
          setLoadingNotif(true)
          try {
            const rows = await getSOSNotificationLog(sosId)
            setNotifLog(rows)
          } catch (err) {
            console.error(err)
          } finally {
            setLoadingNotif(false)
          }
        }
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Re-broadcast failed')
    } finally {
      setRebroadcasting(false)
      setConfirmOpen(false)
    }
  }

  // Notification summary counts
  const respondedCount = notifLog.filter((n) => n.responded).length
  const readCount = notifLog.filter((n) => n.read_at !== null).length
  const unreadCount = notifLog.filter((n) => n.read_at === null).length

  const isActive = sos.status === 'active' || sos.status === 'open'
  const equipmentLabel = [
    sos.equipment_subcategory?.replace(/_/g, ' '),
    sos.equipment_category?.replace(/_/g, ' '),
  ]
    .filter(Boolean)[0] || '—'
  const brandModel = [sos.brand, sos.model].filter(Boolean).join(' ') || '—'
  const location = [sos.location_city, sos.location_state].filter(Boolean).join(', ') || '—'

  return (
    <TooltipProvider>
      {/* Header Card */}
      <Card>
        <CardContent className="space-y-3 p-6">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="font-display text-2xl font-bold text-foreground">{sos.title}</h1>
              <div className="mt-2 flex items-center gap-2 font-body text-sm text-muted-foreground">
                <Avatar url={sos.requester_avatar} name={sos.requester_name} size={24} />
                <Link
                  href={`/admin/users/${sos.requester_id}`}
                  className="hover:text-foreground hover:underline"
                >
                  {sos.requester_name}
                </Link>
                {sos.company_name && (
                  <>
                    <span>·</span>
                    <span>{sos.company_name}</span>
                  </>
                )}
                <span>·</span>
                <time title={sos.created_at ?? ''}>{formatDateTime(sos.created_at)}</time>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <UrgencyBadge urgency={currentUrgency} />
                <Select
                  value={currentUrgency === 'critical' ? 'critical' : 'normal'}
                  onValueChange={handleUrgencyChange}
                  disabled={escalating || !isActive}
                >
                  <SelectTrigger className="h-7 w-[130px] font-body text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="critical">🚨 Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <StatusBadge status={sos.status} />
              {sos.transport_needed && (
                <Badge className="flex items-center gap-1 border-0 bg-[#FF6B2B]/15 font-body text-[10px] uppercase text-[#FF6B2B]">
                  <Truck className="size-3" />
                  Transport Needed
                </Badge>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Two-column details / description */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="font-display text-base">Details</CardTitle>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 font-body text-sm">
              <dt className="text-muted-foreground">Equipment Type</dt>
              <dd className="text-foreground">{equipmentLabel}</dd>

              <dt className="text-muted-foreground">Brand / Model</dt>
              <dd className="text-foreground">{brandModel}</dd>

              <dt className="flex items-center gap-1 text-muted-foreground">
                <MapPin className="size-3" />
                Location
              </dt>
              <dd className="text-foreground">{location}</dd>

              <dt className="text-muted-foreground">Max Distance</dt>
              <dd className="text-foreground">
                {sos.max_distance_miles ? `${sos.max_distance_miles} mi` : '—'}
              </dd>

              <dt className="text-muted-foreground">Transport Needed</dt>
              <dd>
                {sos.transport_needed ? (
                  <Badge className="border-0 bg-green-500/20 font-body text-[10px] uppercase text-green-400">
                    Yes
                  </Badge>
                ) : (
                  <Badge className="border-0 bg-zinc-500/20 font-body text-[10px] uppercase text-zinc-400">
                    No
                  </Badge>
                )}
              </dd>

              <dt className="text-muted-foreground">AI Categorized</dt>
              <dd>
                {sos.ai_categorized ? (
                  <Badge className="border-0 bg-green-500/20 font-body text-[10px] uppercase text-green-400">
                    Yes
                  </Badge>
                ) : (
                  <Badge className="border-0 bg-zinc-500/20 font-body text-[10px] uppercase text-zinc-400">
                    No
                  </Badge>
                )}
              </dd>

              <dt className="flex items-center gap-1 text-muted-foreground">
                <Bell className="size-3" />
                Notifications Sent
              </dt>
              <dd className="text-foreground">{sos.notification_count}</dd>

              <dt className="flex items-center gap-1 text-muted-foreground">
                <MessageCircle className="size-3" />
                Responses Received
              </dt>
              <dd className="text-foreground">{sos.response_count}</dd>

              <dt className="text-muted-foreground">Expires</dt>
              <dd className="text-foreground">{formatDateTime(sos.expires_at)}</dd>
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-base">Description</CardTitle>
            {sos.ai_categorized && (
              <Badge className="flex items-center gap-1 border-0 bg-purple-500/20 font-body text-[10px] uppercase text-purple-400">
                <Sparkles className="size-3" />
                AI Categorized
              </Badge>
            )}
          </CardHeader>
          <CardContent>
            {sos.description ? (
              <p className="whitespace-pre-wrap font-body text-sm text-foreground/90">
                {sos.description}
              </p>
            ) : (
              <p className="font-body text-sm italic text-muted-foreground">
                No description provided
              </p>
            )}
            {sos.notes && (
              <>
                <p className="mt-4 font-body text-xs font-medium uppercase text-muted-foreground">
                  Notes
                </p>
                <p className="mt-1 whitespace-pre-wrap font-body text-sm text-foreground/80">
                  {sos.notes}
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Response Timeline */}
      <Card>
        <CardHeader>
          <button
            type="button"
            onClick={() => setTimelineOpen((v) => !v)}
            className="flex w-full items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <MessageCircle className="size-4 text-muted-foreground" />
              <CardTitle className="font-display text-base">Response Timeline</CardTitle>
              <Badge variant="outline" className="font-body text-[10px]">
                {timeline.length}
              </Badge>
            </div>
            {timelineOpen ? (
              <ChevronUp className="size-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="size-4 text-muted-foreground" />
            )}
          </button>
        </CardHeader>
        {timelineOpen && (
          <CardContent>
            {loadingTimeline ? (
              <div className="space-y-3">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-20 w-full" />
                ))}
              </div>
            ) : timeline.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">No responses yet.</p>
            ) : (
              <div className="space-y-4">
                {timeline.map((resp) => (
                  <div
                    key={resp.response_id}
                    className="border-l-2 border-primary/60 py-3 pl-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <Avatar url={resp.avatar_url} name={resp.display_name} size={32} />
                        <div>
                          <Link
                            href={`/admin/users/${resp.responder_id}`}
                            className="font-body text-sm font-medium text-foreground hover:underline"
                          >
                            {resp.display_name}
                          </Link>
                          {resp.company_name && (
                            <p className="font-body text-xs text-muted-foreground">
                              {resp.company_name}
                            </p>
                          )}
                        </div>
                        {resp.archetype && (
                          <Badge variant="outline" className="font-body text-[10px] capitalize">
                            {resp.archetype}
                          </Badge>
                        )}
                      </div>
                      <time
                        title={resp.created_at ?? ''}
                        className="font-body text-xs text-muted-foreground"
                      >
                        {formatDateTime(resp.created_at)}
                      </time>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap font-body text-sm text-foreground/90">
                      {resp.message}
                    </p>
                    {(resp.price_estimate || resp.lead_time || resp.condition) && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {resp.price_estimate && (
                          <Badge className="border-0 bg-primary/20 font-body text-[10px] text-primary">
                            Est. {resp.price_estimate}
                          </Badge>
                        )}
                        {resp.lead_time && (
                          <Badge className="border-0 bg-amber-500/20 font-body text-[10px] text-amber-400">
                            Lead: {resp.lead_time}
                          </Badge>
                        )}
                        {resp.condition && (
                          <Badge className="border-0 bg-zinc-500/20 font-body text-[10px] text-zinc-400">
                            {resp.condition}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Notification Delivery */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={handleToggleNotif}
              className="flex flex-1 items-center gap-2"
            >
              <Bell className="size-4 text-muted-foreground" />
              <CardTitle className="font-display text-base">Notification Delivery</CardTitle>
              <Badge variant="outline" className="font-body text-[10px]">
                {sos.notification_count}
              </Badge>
              {notifOpen ? (
                <ChevronUp className="ml-auto size-4 text-muted-foreground" />
              ) : (
                <ChevronDown className="ml-auto size-4 text-muted-foreground" />
              )}
            </button>
            <Tooltip>
              <TooltipTrigger asChild>
                <span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={!isActive || rebroadcasting}
                    onClick={(e) => {
                      e.stopPropagation()
                      setConfirmOpen(true)
                    }}
                    className="font-body"
                  >
                    <RefreshCw
                      className={`mr-1 size-4 ${rebroadcasting ? 'animate-spin' : ''}`}
                    />
                    Re-broadcast
                  </Button>
                </span>
              </TooltipTrigger>
              {!isActive && (
                <TooltipContent>
                  <p className="font-body text-xs">SOS must be active to re-broadcast</p>
                </TooltipContent>
              )}
            </Tooltip>
          </div>
        </CardHeader>
        {notifOpen && (
          <CardContent>
            {loadingNotif ? (
              <div className="space-y-2">
                {[0, 1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : notifLog.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">
                No notifications were recorded for this SOS.
              </p>
            ) : (
              <div className="space-y-3">
                <p className="font-body text-xs text-muted-foreground">
                  <span className="font-medium text-foreground">{respondedCount}</span> responded ·{' '}
                  <span className="font-medium text-foreground">{readCount}</span> read ·{' '}
                  <span className="font-medium text-foreground">{unreadCount}</span> unread ·{' '}
                  <span className="font-medium text-foreground">{notifLog.length}</span> total
                  notified
                </p>
                <div className="max-h-96 overflow-y-auto">
                  <table className="w-full">
                    <thead className="sticky top-0 bg-card">
                      <tr className="border-b border-border">
                        <th className="px-2 py-2 text-left font-body text-[10px] font-medium uppercase text-muted-foreground">
                          User
                        </th>
                        <th className="hidden px-2 py-2 text-left font-body text-[10px] font-medium uppercase text-muted-foreground md:table-cell">
                          Archetype
                        </th>
                        <th className="px-2 py-2 text-left font-body text-[10px] font-medium uppercase text-muted-foreground">
                          Status
                        </th>
                        <th className="hidden px-2 py-2 text-left font-body text-[10px] font-medium uppercase text-muted-foreground md:table-cell">
                          Sent
                        </th>
                        <th className="hidden px-2 py-2 text-left font-body text-[10px] font-medium uppercase text-muted-foreground md:table-cell">
                          Read
                        </th>
                        <th className="px-2 py-2 text-left font-body text-[10px] font-medium uppercase text-muted-foreground">
                          Responded
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {notifLog.map((entry) => (
                        <tr
                          key={entry.notification_id}
                          className="border-b border-border/50 hover:bg-muted/30"
                        >
                          <td className="px-2 py-2">
                            <Link
                              href={`/admin/users/${entry.user_id}`}
                              className="flex items-center gap-2 hover:underline"
                            >
                              <Avatar
                                url={entry.avatar_url}
                                name={entry.display_name}
                                size={24}
                              />
                              <span className="font-body text-sm text-foreground">
                                {entry.display_name}
                              </span>
                            </Link>
                          </td>
                          <td className="hidden px-2 py-2 md:table-cell">
                            {entry.archetype ? (
                              <Badge
                                variant="outline"
                                className="font-body text-[10px] capitalize"
                              >
                                {entry.archetype}
                              </Badge>
                            ) : (
                              <span className="font-body text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                          <td className="px-2 py-2">
                            <NotifStatusBadge readAt={entry.read_at} />
                          </td>
                          <td className="hidden px-2 py-2 font-body text-xs text-muted-foreground md:table-cell">
                            {formatDateTime(entry.sent_at)}
                          </td>
                          <td className="hidden px-2 py-2 font-body text-xs text-muted-foreground md:table-cell">
                            {entry.read_at ? formatDateTime(entry.read_at) : '—'}
                          </td>
                          <td className="px-2 py-2">
                            {entry.responded ? (
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <span className="inline-flex items-center gap-1 text-green-400">
                                    <CheckCircle2 className="size-4" />
                                    <span className="font-body text-xs">Yes</span>
                                  </span>
                                </TooltipTrigger>
                                {entry.response_preview && (
                                  <TooltipContent className="max-w-xs">
                                    <p className="font-body text-xs">
                                      {entry.response_preview}
                                      {entry.response_preview.length >= 120 ? '…' : ''}
                                    </p>
                                  </TooltipContent>
                                )}
                              </Tooltip>
                            ) : (
                              <span className="font-body text-xs text-muted-foreground">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Urgency Escalation Confirmation Dialog */}
      <Dialog
        open={escalateConfirmOpen}
        onOpenChange={(open) => {
          if (!open) {
            setEscalateConfirmOpen(false)
            setPendingUrgency(null)
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              {pendingUrgency === 'critical' ? 'Escalate to Critical?' : 'Downgrade to Normal?'}
            </DialogTitle>
            <DialogDescription className="font-body">
              {pendingUrgency === 'critical' ? (
                <>
                  Changing urgency from <strong>{currentUrgency}</strong> to{' '}
                  <strong className="text-[#FF6B2B]">CRITICAL</strong> will fire a critical-urgency
                  email blast to every user already in the notification log for this SOS. In-app
                  bell notifications will not be re-fired (use Re-broadcast for that).
                </>
              ) : (
                <>
                  Downgrade urgency from <strong>{currentUrgency}</strong> to{' '}
                  <strong>Normal</strong>. No notifications will be sent.
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setEscalateConfirmOpen(false)
                setPendingUrgency(null)
              }}
              disabled={escalating}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleConfirmEscalate}
              disabled={escalating}
              className={
                pendingUrgency === 'critical'
                  ? 'bg-red-600 text-white hover:bg-red-700'
                  : ''
              }
            >
              {escalating ? (
                <>
                  <RefreshCw className="mr-1 size-4 animate-spin" />
                  Updating...
                </>
              ) : pendingUrgency === 'critical' ? (
                'Escalate to Critical'
              ) : (
                'Confirm'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Re-broadcast Confirmation Dialog */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Re-broadcast SOS?</DialogTitle>
            <DialogDescription className="font-body">
              Notifications will be sent to any newly matched users who haven&apos;t been
              notified yet. Already-notified users will not receive duplicates.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setConfirmOpen(false)}
              disabled={rebroadcasting}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleRebroadcast}
              disabled={rebroadcasting}
              className="bg-[#FF6B2B] text-white hover:bg-[#FF6B2B]/90"
            >
              {rebroadcasting ? (
                <>
                  <RefreshCw className="mr-1 size-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Notifications'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  )
}
