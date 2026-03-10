'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import {
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  X,
  Radio,
  Clock,
  CheckCircle2,
  AlertTriangle,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  getAdminSOS,
  getSOSStats,
  getAdminSOSDetail,
  adminUpdateSOS,
  getSOSDemandGap,
} from '../actions'

// ─── Types ──────────────────────────────────────────────────────────

type SOSRow = {
  id: string
  title: string
  equipment_category: string
  equipment_subcategory: string | null
  brand: string | null
  model: string | null
  urgency: string
  status: string
  created_at: string
  expires_at: string
  requester_id: string
  requester_name: string
  response_count: number
}

type SOSStats = {
  openCount: number
  fulfilledCount: number
  noMatchWeek: number
}

type SOSDetail = {
  sos: {
    id: string
    title: string
    description: string | null
    equipment_category: string
    equipment_subcategory: string | null
    brand: string | null
    model: string | null
    urgency: string
    status: string
    location_city: string | null
    location_state: string | null
    expires_at: string
    created_at: string
    max_distance_miles: number
    notes: string | null
  }
  requester: {
    id: string
    full_name: string | null
    avatar_url: string | null
    subscription_tier: string | null
    location_city: string | null
    location_state: string | null
  } | null
  responses: Array<{
    id: string
    message: string
    price_estimate: string | null
    lead_time: string | null
    condition: string | null
    created_at: string
    responder: {
      id: string
      full_name: string | null
      avatar_url: string | null
    } | null
  }>
}

// ─── Status / Urgency Badges ────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'open':
      return (
        <Badge className="animate-pulse border-0 bg-[#FF6B2B]/20 text-[#FF6B2B] font-body text-[10px] uppercase">
          Open
        </Badge>
      )
    case 'fulfilled':
      return (
        <Badge className="border-0 bg-green-500/20 text-green-400 font-body text-[10px] uppercase">
          Fulfilled
        </Badge>
      )
    case 'expired':
      return (
        <Badge className="border-0 bg-zinc-500/20 text-zinc-400 font-body text-[10px] uppercase">
          Expired
        </Badge>
      )
    case 'cancelled':
      return (
        <Badge className="border-0 bg-zinc-500/20 text-zinc-400 font-body text-[10px] uppercase">
          Cancelled
        </Badge>
      )
    default:
      return (
        <Badge className="border-0 bg-zinc-500/20 text-zinc-400 font-body text-[10px] uppercase">
          {status}
        </Badge>
      )
  }
}

function UrgencyBadge({ urgency }: { urgency: string }) {
  switch (urgency) {
    case 'critical':
      return (
        <Badge className="border-0 bg-red-500/20 text-red-400 font-body text-[10px] uppercase">
          Critical
        </Badge>
      )
    case 'urgent':
      return (
        <Badge className="border-0 bg-amber-500/20 text-amber-400 font-body text-[10px] uppercase">
          Urgent
        </Badge>
      )
    case 'normal':
      return (
        <Badge className="border-0 bg-green-500/20 text-green-400 font-body text-[10px] uppercase">
          Normal
        </Badge>
      )
    default:
      return (
        <Badge className="border-0 bg-zinc-500/20 text-zinc-400 font-body text-[10px] uppercase">
          {urgency}
        </Badge>
      )
  }
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function AdminSOSPage() {
  const [sosList, setSosList] = useState<SOSRow[]>([])
  const [stats, setStats] = useState<SOSStats>({ openCount: 0, fulfilledCount: 0, noMatchWeek: 0 })
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [statusFilter, setStatusFilter] = useState('all')
  const [urgencyFilter, setUrgencyFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)

  // Tab state
  const [activeTab, setActiveTab] = useState<'list' | 'demand_gap'>('list')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [demandGap, setDemandGap] = useState<any>(null)

  // Drawer state
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedSOS, setSelectedSOS] = useState<SOSDetail | null>(null)
  const [drawerLoading, setDrawerLoading] = useState(false)

  // Fetch SOS list
  useEffect(() => {
    let cancelled = false
    async function fetchSOS() {
      setLoading(true)
      const result = await getAdminSOS({ page, status: statusFilter, urgency: urgencyFilter })
      if (!cancelled) {
        setSosList(result.requests as SOSRow[])
        setTotal(result.total)
        setTotalPages(result.totalPages)
        setLoading(false)
      }
    }
    fetchSOS()
    return () => { cancelled = true }
  }, [page, statusFilter, urgencyFilter, refreshKey])

  // Fetch stats
  useEffect(() => {
    let cancelled = false
    async function fetchStats() {
      const result = await getSOSStats()
      if (!cancelled) {
        setStats(result)
      }
    }
    fetchStats()
    return () => { cancelled = true }
  }, [refreshKey])

  // Fetch demand gap data
  useEffect(() => {
    if (activeTab === 'demand_gap' && !demandGap) {
      getSOSDemandGap().then(setDemandGap)
    }
  }, [activeTab, demandGap])

  function refresh() {
    setRefreshKey((k) => k + 1)
    setDemandGap(null)
  }

  // ─── Drawer Actions ───────────────────────────────────────────────

  async function openDetail(sosId: string) {
    setDrawerOpen(true)
    setDrawerLoading(true)
    try {
      const detail = await getAdminSOSDetail(sosId)
      setSelectedSOS(detail as SOSDetail)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load SOS detail')
      setDrawerOpen(false)
    } finally {
      setDrawerLoading(false)
    }
  }

  function closeDrawer() {
    setDrawerOpen(false)
    setSelectedSOS(null)
  }

  // ─── Admin Actions ────────────────────────────────────────────────

  async function handleExtend(sosId: string) {
    try {
      const newExpiry = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      await adminUpdateSOS(sosId, { expires_at: newExpiry })
      toast.success('Expiration extended by 7 days')
      refresh()
      if (selectedSOS?.sos.id === sosId) {
        setSelectedSOS((prev) =>
          prev ? { ...prev, sos: { ...prev.sos, expires_at: newExpiry } } : null
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to extend')
    }
  }

  async function handleFulfill(sosId: string) {
    try {
      await adminUpdateSOS(sosId, { status: 'fulfilled' })
      toast.success('SOS marked as fulfilled')
      refresh()
      if (selectedSOS?.sos.id === sosId) {
        setSelectedSOS((prev) =>
          prev ? { ...prev, sos: { ...prev.sos, status: 'fulfilled' } } : null
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update')
    }
  }

  async function handleCancel(sosId: string) {
    try {
      await adminUpdateSOS(sosId, { status: 'cancelled' })
      toast.success('SOS cancelled')
      refresh()
      if (selectedSOS?.sos.id === sosId) {
        setSelectedSOS((prev) =>
          prev ? { ...prev, sos: { ...prev.sos, status: 'cancelled' } } : null
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to cancel')
    }
  }

  async function handleFlag(sosId: string) {
    try {
      await adminUpdateSOS(sosId, { status: 'cancelled' })
      toast.success('SOS flagged as abuse and cancelled')
      refresh()
      if (selectedSOS?.sos.id === sosId) {
        setSelectedSOS((prev) =>
          prev ? { ...prev, sos: { ...prev.sos, status: 'cancelled' } } : null
        )
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to flag')
    }
  }

  // ─── Render ───────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">SOS Monitor</h1>
        <Badge variant="outline" className="font-body">
          {total} total
        </Badge>
      </div>

      {/* Stats Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="border-white/5 bg-[#0D0D14]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-[#FF6B2B]/10">
              <Radio className="size-5 text-[#FF6B2B]" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">{stats.openCount}</p>
              <p className="font-body text-xs text-muted-foreground">Open SOSs</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-[#0D0D14]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-green-500/10">
              <CheckCircle2 className="size-5 text-green-400" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">{stats.fulfilledCount}</p>
              <p className="font-body text-xs text-muted-foreground">Fulfilled (all time)</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-[#0D0D14]">
          <CardContent className="flex items-center gap-4 p-4">
            <div className="flex size-10 items-center justify-center rounded-lg bg-amber-500/10">
              <AlertTriangle className="size-5 text-amber-400" />
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-foreground">{stats.noMatchWeek}</p>
              <p className="font-body text-xs text-muted-foreground">No Match (this week)</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-white/5 pb-2">
        <button
          onClick={() => setActiveTab('list')}
          className={`rounded-t px-4 py-2 font-body text-sm transition-colors ${
            activeTab === 'list'
              ? 'bg-white/5 text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          SOS List
        </button>
        <button
          onClick={() => setActiveTab('demand_gap')}
          className={`rounded-t px-4 py-2 font-body text-sm transition-colors ${
            activeTab === 'demand_gap'
              ? 'bg-white/5 text-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Demand Gap
        </button>
      </div>

      {/* Demand Gap Tab */}
      {activeTab === 'demand_gap' && (
        <Card className="border-white/5 bg-[#0D0D14]">
          <CardHeader>
            <CardTitle className="font-display text-base text-foreground">
              Demand Gap Analysis (90 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!demandGap ? (
              <p className="font-body text-sm text-muted-foreground">Loading...</p>
            ) : (
              <div className="space-y-4">
                {/* AI Stats */}
                <div className="flex gap-4">
                  <div className="rounded border border-white/5 px-3 py-2">
                    <p className="font-body text-xs text-muted-foreground">Total SOSs</p>
                    <p className="font-display text-lg font-bold text-foreground">{demandGap.aiStats.totalSos}</p>
                  </div>
                  <div className="rounded border border-white/5 px-3 py-2">
                    <p className="font-body text-xs text-muted-foreground">AI Categorized</p>
                    <p className="font-display text-lg font-bold text-foreground">
                      {demandGap.aiStats.aiCategorized}
                      <span className="ml-1 font-body text-xs text-muted-foreground">
                        ({demandGap.aiStats.totalSos > 0 ? Math.round((demandGap.aiStats.aiCategorized / demandGap.aiStats.totalSos) * 100) : 0}%)
                      </span>
                    </p>
                  </div>
                </div>

                {/* Demand gaps table */}
                {demandGap.demandGaps.length === 0 ? (
                  <p className="font-body text-sm text-muted-foreground">No demand gap data yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-white/5">
                          <th className="px-4 py-2 text-left font-body text-xs font-medium text-muted-foreground">Category</th>
                          <th className="px-4 py-2 text-right font-body text-xs font-medium text-muted-foreground">SOSs</th>
                          <th className="px-4 py-2 text-right font-body text-xs font-medium text-muted-foreground">Response Rate</th>
                          <th className="px-4 py-2 text-right font-body text-xs font-medium text-muted-foreground">Gap</th>
                        </tr>
                      </thead>
                      <tbody>
                        {demandGap.demandGaps.map((gap: { category: string; totalSos: number; responseRate: number }) => (
                          <tr key={gap.category} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                            <td className="px-4 py-2 font-body text-sm capitalize text-foreground">
                              {gap.category.replace(/_/g, ' ')}
                            </td>
                            <td className="px-4 py-2 text-right font-body text-sm text-foreground">
                              {gap.totalSos}
                            </td>
                            <td className="px-4 py-2 text-right">
                              <Badge className={`${
                                gap.responseRate < 30
                                  ? 'bg-red-500/20 text-red-400'
                                  : gap.responseRate < 60
                                    ? 'bg-amber-500/20 text-amber-400'
                                    : 'bg-green-500/20 text-green-400'
                              } font-body text-[10px]`}>
                                {gap.responseRate}%
                              </Badge>
                            </td>
                            <td className="px-4 py-2 text-right">
                              {gap.responseRate < 30 && (
                                <Badge className="bg-red-500/20 text-red-400 font-body text-[10px]">
                                  High Gap
                                </Badge>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Filters — only show on list tab */}
      {activeTab === 'list' && (
      <>
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[160px] font-body">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="fulfilled">Fulfilled</SelectItem>
              <SelectItem value="expired">Expired</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <Select value={urgencyFilter} onValueChange={(v) => { setUrgencyFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[160px] font-body">
              <SelectValue placeholder="Urgency" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All urgency</SelectItem>
              <SelectItem value="critical">Critical</SelectItem>
              <SelectItem value="urgent">Urgent</SelectItem>
              <SelectItem value="normal">Normal</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* SOS Table */}
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>

                <tr className="border-b border-white/5">
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                    Equipment
                  </th>
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                    Brand/Model
                  </th>
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                    Urgency
                  </th>
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                    Requester
                  </th>
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                    Responses
                  </th>
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                    Created
                  </th>
                  <th className="px-4 py-3 text-right font-body text-xs font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center">
                      <p className="font-body text-sm text-muted-foreground">Loading...</p>
                    </td>
                  </tr>
                ) : sosList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center">
                      <p className="font-body text-sm text-muted-foreground">No SOS requests found</p>
                    </td>
                  </tr>
                ) : (
                  sosList.map((sos) => (
                    <tr
                      key={sos.id}
                      className="border-b border-white/5 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <span className="font-body text-sm text-foreground">
                          {sos.title || sos.equipment_subcategory?.replace(/_/g, ' ') || sos.equipment_category?.replace(/_/g, ' ') || 'Unknown'}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-muted-foreground">
                        {sos.brand || sos.model
                          ? `${sos.brand || ''}${sos.brand && sos.model ? ' ' : ''}${sos.model || ''}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3">
                        <UrgencyBadge urgency={sos.urgency} />
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-muted-foreground">
                        {sos.requester_name}
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-muted-foreground">
                        {sos.response_count}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={sos.status} />
                      </td>
                      <td className="px-4 py-3 font-body text-xs text-muted-foreground">
                        {new Date(sos.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openDetail(sos.id)}>
                              <Radio className="mr-2 size-4" />
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleExtend(sos.id)}>
                              <Clock className="mr-2 size-4" />
                              Extend expiration (+7 days)
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleFulfill(sos.id)}>
                              <CheckCircle2 className="mr-2 size-4" />
                              Mark as fulfilled
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleCancel(sos.id)}>
                              <XCircle className="mr-2 size-4" />
                              Cancel SOS
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleFlag(sos.id)}
                              className="text-red-400"
                            >
                              <AlertTriangle className="mr-2 size-4" />
                              Flag as abuse
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
              <p className="font-body text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
      </>
      )}

      {/* Detail Drawer (slide-in from right) */}
      {drawerOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
            onClick={closeDrawer}
          />

          {/* Panel */}
          <div className="fixed inset-y-0 right-0 z-50 w-full max-w-lg overflow-y-auto border-l border-white/5 bg-[#0A0A0F] shadow-2xl">
            {/* Header */}
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-white/5 bg-[#0A0A0F] px-6 py-4">
              <h2 className="font-display text-lg font-bold text-foreground">SOS Detail</h2>
              <Button variant="ghost" size="sm" onClick={closeDrawer}>
                <X className="size-5" />
              </Button>
            </div>

            {drawerLoading ? (
              <div className="flex items-center justify-center py-20">
                <p className="font-body text-sm text-muted-foreground">Loading...</p>
              </div>
            ) : selectedSOS ? (
              <div className="space-y-6 p-6">
                {/* Title & Equipment */}
                <div>
                  <h3 className="font-display text-xl font-bold text-foreground">
                    {selectedSOS.sos.title}
                  </h3>
                  <p className="mt-1 font-body text-sm text-muted-foreground">
                    {selectedSOS.sos.equipment_subcategory?.replace(/_/g, ' ') || selectedSOS.sos.equipment_category?.replace(/_/g, ' ')}
                    {selectedSOS.sos.brand && ` — ${selectedSOS.sos.brand}`}
                    {selectedSOS.sos.model && ` ${selectedSOS.sos.model}`}
                  </p>
                </div>

                {/* Description */}
                {selectedSOS.sos.description && (
                  <div>
                    <p className="font-body text-xs font-medium uppercase text-muted-foreground">Description</p>
                    <p className="mt-1 font-body text-sm text-foreground/80">
                      {selectedSOS.sos.description}
                    </p>
                  </div>
                )}

                {/* Location */}
                {(selectedSOS.sos.location_city || selectedSOS.sos.location_state) && (
                  <div>
                    <p className="font-body text-xs font-medium uppercase text-muted-foreground">Location</p>
                    <p className="mt-1 font-body text-sm text-foreground/80">
                      {[selectedSOS.sos.location_city, selectedSOS.sos.location_state].filter(Boolean).join(', ')}
                    </p>
                  </div>
                )}

                {/* Status & Urgency row */}
                <div className="flex flex-wrap gap-3">
                  <div>
                    <p className="font-body text-xs font-medium uppercase text-muted-foreground">Status</p>
                    <div className="mt-1">
                      <StatusBadge status={selectedSOS.sos.status} />
                    </div>
                  </div>
                  <div>
                    <p className="font-body text-xs font-medium uppercase text-muted-foreground">Urgency</p>
                    <div className="mt-1">
                      <UrgencyBadge urgency={selectedSOS.sos.urgency} />
                    </div>
                  </div>
                  <div>
                    <p className="font-body text-xs font-medium uppercase text-muted-foreground">Expires</p>
                    <p className="mt-1 font-body text-sm text-foreground/80">
                      {new Date(selectedSOS.sos.expires_at).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                </div>

                {/* Requester Info Card */}
                {selectedSOS.requester && (
                  <Card className="border-white/5 bg-[#0D0D14]">
                    <CardHeader className="pb-2">
                      <CardTitle className="font-body text-xs font-medium uppercase text-muted-foreground">
                        Requester
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="flex items-center gap-3">
                      <div className="flex size-10 items-center justify-center overflow-hidden rounded-full bg-surface">
                        {selectedSOS.requester.avatar_url ? (
                          <Image
                            src={selectedSOS.requester.avatar_url}
                            alt=""
                            width={40}
                            height={40}
                            className="size-full object-cover"
                          />
                        ) : (
                          <span className="font-body text-sm text-muted-foreground">
                            {(selectedSOS.requester.full_name || '?')[0]}
                          </span>
                        )}
                      </div>
                      <div>
                        <Link
                          href={`/admin/users/${selectedSOS.requester.id}`}
                          className="font-body text-sm font-medium text-foreground hover:text-primary"
                        >
                          {selectedSOS.requester.full_name || 'Unknown'}
                        </Link>
                        <p className="font-body text-xs text-muted-foreground">
                          {selectedSOS.requester.subscription_tier || 'free'} tier
                          {selectedSOS.requester.location_city && ` — ${selectedSOS.requester.location_city}, ${selectedSOS.requester.location_state}`}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Responses List */}
                <div>
                  <p className="font-body text-xs font-medium uppercase text-muted-foreground">
                    Responses ({selectedSOS.responses.length})
                  </p>
                  {selectedSOS.responses.length === 0 ? (
                    <p className="mt-2 font-body text-sm text-muted-foreground">
                      No responses yet.
                    </p>
                  ) : (
                    <div className="mt-2 space-y-3">
                      {selectedSOS.responses.map((resp) => (
                        <Card key={resp.id} className="border-white/5 bg-[#0D0D14]">
                          <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                              <div className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-surface">
                                {resp.responder?.avatar_url ? (
                                  <Image
                                    src={resp.responder.avatar_url}
                                    alt=""
                                    width={32}
                                    height={32}
                                    className="size-full object-cover"
                                  />
                                ) : (
                                  <span className="font-body text-xs text-muted-foreground">
                                    {(resp.responder?.full_name || '?')[0]}
                                  </span>
                                )}
                              </div>
                              <div className="flex-1">
                                <p className="font-body text-sm font-medium text-foreground">
                                  {resp.responder?.full_name || 'Unknown'}
                                </p>
                                <p className="font-body text-xs text-muted-foreground">
                                  {new Date(resp.created_at).toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            <p className="mt-2 font-body text-sm text-foreground/80">
                              {resp.message}
                            </p>
                            {(resp.price_estimate || resp.lead_time || resp.condition) && (
                              <div className="mt-2 flex flex-wrap gap-2">
                                {resp.price_estimate && (
                                  <Badge className="border-0 bg-primary/20 text-primary font-body text-[10px]">
                                    Est. {resp.price_estimate}
                                  </Badge>
                                )}
                                {resp.lead_time && (
                                  <Badge className="border-0 bg-amber-500/20 text-amber-400 font-body text-[10px]">
                                    Lead: {resp.lead_time}
                                  </Badge>
                                )}
                                {resp.condition && (
                                  <Badge className="border-0 bg-zinc-500/20 text-zinc-400 font-body text-[10px]">
                                    {resp.condition}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>

                {/* Admin Action Buttons */}
                <div className="flex flex-wrap gap-2 border-t border-white/5 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleExtend(selectedSOS.sos.id)}
                    className="font-body"
                  >
                    <Clock className="mr-1 size-4" />
                    Extend +7d
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFulfill(selectedSOS.sos.id)}
                    className="border-green-500/30 font-body text-green-400 hover:bg-green-500/10"
                  >
                    <CheckCircle2 className="mr-1 size-4" />
                    Fulfill
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleCancel(selectedSOS.sos.id)}
                    className="font-body"
                  >
                    <XCircle className="mr-1 size-4" />
                    Cancel
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleFlag(selectedSOS.sos.id)}
                    className="border-red-500/30 font-body text-red-400 hover:bg-red-500/10"
                  >
                    <AlertTriangle className="mr-1 size-4" />
                    Flag Abuse
                  </Button>
                </div>
              </div>
            ) : null}
          </div>
        </>
      )}
    </div>
  )
}
