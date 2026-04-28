'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Filter, Plus, Siren } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  getMySosRequests,
  getSosRequests,
  type SosFilters,
} from '@/app/actions/sos'
import { EQUIPMENT_TAXONOMY } from '@/lib/constants/equipment-taxonomy'
import { SosDashboardTabs } from './components/SosDashboardTabs'

type SosRow = Record<string, unknown>

export default function SosDashboard() {
  const [myRequests, setMyRequests] = useState<SosRow[]>([])
  const [broadcastRequests, setBroadcastRequests] = useState<SosRow[]>([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState<SosFilters>({})
  const [showFilters, setShowFilters] = useState(false)

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

  const filtersBar = (
    <div className="flex items-center justify-between">
      <p className="font-body text-xs text-muted-foreground">
        Broadcasts from other users you can respond to
      </p>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setShowFilters((s) => !s)}
      >
        <Filter className="mr-1 size-4" />
        Filter
      </Button>
      {showFilters && (
        <div className="absolute z-10 mt-2 flex flex-wrap gap-3 rounded-lg border border-border bg-surface p-4 shadow-md">
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
    </div>
  )

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

      <SosDashboardTabs
        myRequests={myRequests}
        broadcastRequests={broadcastRequests}
        loading={loading}
        filtersBar={filtersBar}
      />
    </div>
  )
}
