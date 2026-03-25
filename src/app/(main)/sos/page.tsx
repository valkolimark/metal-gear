'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, Clock, MapPin, MessageSquare, Filter, Siren } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { getSosRequests, type SosFilters } from '@/app/actions/sos'
import { EQUIPMENT_TAXONOMY, getTier2Label } from '@/lib/constants/equipment-taxonomy'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function SosDashboard() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<SosFilters>({})
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const result = await getSosRequests(filters)
      if (!('error' in result)) {
        setRequests(result.requests || [])
      }
      setLoading(false)
    }
    load()
  }, [filters])

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
            <Siren className="size-6 text-red-500" />
            SOS Dashboard
          </h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            Active requests matching your equipment interests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/sos/my-requests">
            <Button variant="outline" size="sm">My Requests</Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-1 size-4" />
            Filter
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="mb-6 flex flex-wrap gap-3 rounded-lg border border-border bg-surface p-4">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Category</label>
            <select
              value={filters.category || ''}
              onChange={(e) => setFilters((p) => ({ ...p, category: e.target.value || undefined }))}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
            >
              <option value="">All categories</option>
              {EQUIPMENT_TAXONOMY.map((tier1) => (
                <optgroup key={tier1.id} label={tier1.label}>
                  {tier1.groups.map((group) => (
                    <option key={group.id} value={group.id}>{group.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Urgency</label>
            <select
              value={filters.urgency || ''}
              onChange={(e) => setFilters((p) => ({ ...p, urgency: (e.target.value || undefined) as SosFilters['urgency'] }))}
              className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
            >
              <option value="">All</option>
              <option value="critical">Critical only</option>
              <option value="normal">Normal only</option>
            </select>
          </div>
        </div>
      )}

      {/* Request List */}
      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full rounded-lg" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="flex flex-col items-center rounded-lg border border-dashed border-border py-16 text-center">
          <div className="text-5xl mb-4">📡</div>
          <p className="font-display text-xl font-semibold text-foreground">No active SOS alerts</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">
            When buyers broadcast urgent equipment needs in your categories, they&apos;ll appear here.
          </p>
          <Link href="/profile" className="mt-4">
            <Button variant="outline" size="sm" className="font-body">
              Update Your Categories
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req: Record<string, unknown>) => {
            const r = req
            const requester = r.requester as Record<string, string> | null
            const catLabel = getTier2Label(r.equipment_category as string)
            const responseCount = Array.isArray(r.response_count) && r.response_count.length > 0
              ? (r.response_count[0] as { count: number }).count
              : 0
            return (
              <Link
                key={r.id as string}
                href={`/sos/${r.id}`}
                className="block rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/30 hover:bg-surface/80"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={r.urgency === 'critical' ? 'destructive' : 'secondary'}
                        className="text-[10px]"
                      >
                        {r.urgency === 'critical' ? (
                          <><AlertTriangle className="mr-0.5 size-3" /> CRITICAL</>
                        ) : (
                          'Normal'
                        )}
                      </Badge>
                      <span className="font-display text-sm font-semibold text-foreground">
                        {r.title as string}
                      </span>
                    </div>
                    {r.description ? (
                      <p className="line-clamp-1 text-xs text-muted-foreground">{r.description as string}</p>
                    ) : null}
                    <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground/80">
                        {requester?.company_name || requester?.full_name || 'Anonymous'}
                      </span>
                      {catLabel && <Badge variant="outline" className="text-[10px]">{catLabel}</Badge>}
                      <span className="flex items-center gap-0.5">
                        <MapPin className="size-3" />
                        {r.location_city as string || 'Houston'}, {r.location_state as string || 'TX'}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Clock className="size-3" />
                        {timeAgo(r.created_at as string)}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MessageSquare className="size-3" />
                        {responseCount} response{responseCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
