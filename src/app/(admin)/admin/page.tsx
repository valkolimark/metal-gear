'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users,
  Package,
  AlertTriangle,
  DollarSign,
  Bell,
  Clock,
  UserPlus,
  Megaphone,
  Shield,
  TrendingUp,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  getControlTowerStats,
  getAlertQueue,
  getActivityFeed,
  getChartData,
} from './actions'

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string | number
  color: string
}) {
  return (
    <Card className="border-white/5 bg-[#0D0D14]">
      <CardContent className="flex items-center gap-3 p-4">
        <div className={`flex size-10 items-center justify-center rounded-lg ${color}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <p className="font-display text-2xl font-bold text-foreground">{value}</p>
          <p className="font-body text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Simple SVG line chart
function MiniChart({
  data,
  color,
}: {
  data: Record<string, number>
  color: string
}) {
  const entries = Object.entries(data).sort(([a], [b]) => a.localeCompare(b))
  if (entries.length === 0) {
    return <p className="font-body text-xs text-muted-foreground">No data</p>
  }

  const values = entries.map(([, v]) => v)
  const max = Math.max(...values, 1)
  const w = 300
  const h = 80
  const step = w / Math.max(entries.length - 1, 1)

  const points = values
    .map((v, i) => `${i * step},${h - (v / max) * h}`)
    .join(' ')

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" preserveAspectRatio="none">
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

export default function ControlTowerPage() {
  const [stats, setStats] = useState<Awaited<ReturnType<typeof getControlTowerStats>> | null>(null)
  const [alerts, setAlerts] = useState<Awaited<ReturnType<typeof getAlertQueue>> | null>(null)
  const [feed, setFeed] = useState<Awaited<ReturnType<typeof getActivityFeed>> | null>(null)
  const [charts, setCharts] = useState<Awaited<ReturnType<typeof getChartData>> | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      const [s, a, f, c] = await Promise.all([
        getControlTowerStats(),
        getAlertQueue(),
        getActivityFeed(),
        getChartData(),
      ])
      if (!cancelled) {
        setStats(s)
        setAlerts(a)
        setFeed(f)
        setCharts(c)
      }
    }
    fetchData()
    const interval = setInterval(fetchData, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const totalAlerts =
    (alerts?.fraudListings.length ?? 0) +
    (alerts?.pendingReports.length ?? 0) +
    (alerts?.staleSos.length ?? 0)

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">
        Control Tower
      </h1>

      {/* Live counters */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard
          icon={Users}
          label="Total users"
          value={stats?.totalUsers ?? '—'}
          color="bg-blue-500/20 text-blue-400"
        />
        <StatCard
          icon={Package}
          label="Active listings"
          value={stats?.activeListings ?? '—'}
          color="bg-green-500/20 text-green-400"
        />
        <StatCard
          icon={Megaphone}
          label="Active SOSs"
          value={stats?.activeSos ?? '—'}
          color="bg-orange-500/20 text-orange-400"
        />
        <StatCard
          icon={DollarSign}
          label="MRR"
          value={stats ? `$${(stats.mrrCents / 100).toLocaleString()}` : '—'}
          color="bg-emerald-500/20 text-emerald-400"
        />
        <StatCard
          icon={Bell}
          label="Alerts"
          value={totalAlerts}
          color="bg-red-500/20 text-red-400"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Alert Queue */}
        <Card className="border-white/5 bg-[#0D0D14]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <AlertTriangle className="size-4 text-red-400" />
              Alert Queue ({totalAlerts})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {totalAlerts === 0 && (
              <p className="font-body text-sm text-muted-foreground">
                No pending alerts
              </p>
            )}
            {alerts?.fraudListings.map((item) => (
              <Link
                key={item.id}
                href={`/admin/listings/${item.id}`}
                className="flex items-center justify-between rounded-lg bg-red-500/5 px-3 py-2 hover:bg-red-500/10"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body text-sm text-foreground">
                    {item.title}
                  </p>
                  <p className="font-body text-xs text-red-400">
                    AI Fraud: {item.ai_fraud_reason || 'Flagged'}
                  </p>
                </div>
                <Badge className="shrink-0 border-red-500/30 bg-red-500/20 text-red-400">
                  Review
                </Badge>
              </Link>
            ))}
            {alerts?.pendingReports.map((item) => (
              <Link
                key={item.id}
                href="/admin/moderation"
                className="flex items-center justify-between rounded-lg bg-amber-500/5 px-3 py-2 hover:bg-amber-500/10"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body text-sm text-foreground">
                    Report: {item.target_type} — {item.reason}
                  </p>
                </div>
                <Badge className="shrink-0 border-amber-500/30 bg-amber-500/20 text-amber-400">
                  Report
                </Badge>
              </Link>
            ))}
            {alerts?.staleSos.map((item) => (
              <Link
                key={item.id}
                href="/admin/sos"
                className="flex items-center justify-between rounded-lg bg-orange-500/5 px-3 py-2 hover:bg-orange-500/10"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-body text-sm text-foreground">
                    Stale SOS: {item.equipment_subcategory?.replace(/_/g, ' ')}
                  </p>
                  <p className="font-body text-xs text-muted-foreground">
                    {item.urgency} — no response 48h+
                  </p>
                </div>
                <Badge className="shrink-0 border-orange-500/30 bg-orange-500/20 text-orange-400">
                  Stale
                </Badge>
              </Link>
            ))}
          </CardContent>
        </Card>

        {/* Activity Feed */}
        <Card className="border-white/5 bg-[#0D0D14]">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <Clock className="size-4 text-blue-400" />
              Activity Feed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {(feed ?? []).map((item) => (
                <div
                  key={item.id}
                  className="flex items-start gap-2 rounded px-2 py-1.5"
                >
                  <div className="mt-0.5">
                    {item.type === 'user' && (
                      <UserPlus className="size-3.5 text-blue-400" />
                    )}
                    {item.type === 'listing' && (
                      <Package className="size-3.5 text-green-400" />
                    )}
                    {item.type === 'sos' && (
                      <Megaphone className="size-3.5 text-orange-400" />
                    )}
                    {item.type === 'admin' && (
                      <Shield className="size-3.5 text-purple-400" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-body text-sm text-foreground">
                      {item.text}
                    </p>
                    <p className="font-body text-[10px] text-muted-foreground">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-white/5 bg-[#0D0D14]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <TrendingUp className="size-4 text-blue-400" />
              Signups (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {charts ? (
              <MiniChart data={charts.signupsByDate} color="#3A8FD4" />
            ) : (
              <div className="h-20 animate-pulse rounded bg-surface" />
            )}
          </CardContent>
        </Card>
        <Card className="border-white/5 bg-[#0D0D14]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <TrendingUp className="size-4 text-green-400" />
              Listings Posted (30 days)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {charts ? (
              <MiniChart data={charts.listingsByDate} color="#22c55e" />
            ) : (
              <div className="h-20 animate-pulse rounded bg-surface" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Today's Snapshot */}
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">
            Today&apos;s Snapshot
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <div>
              <p className="font-display text-xl font-bold text-foreground">
                {stats?.todaySignups ?? 0}
              </p>
              <p className="font-body text-xs text-muted-foreground">
                Signups today
              </p>
            </div>
            <div>
              <p className="font-display text-xl font-bold text-foreground">
                {stats?.weekSignups ?? 0}
              </p>
              <p className="font-body text-xs text-muted-foreground">
                Signups this week
              </p>
            </div>
            <div>
              <p className="font-display text-xl font-bold text-foreground">
                {stats?.todayListings ?? 0}
              </p>
              <p className="font-body text-xs text-muted-foreground">
                Listings today
              </p>
            </div>
            <div>
              <p className="font-display text-xl font-bold text-foreground">
                {stats?.todaySos ?? 0}
              </p>
              <p className="font-body text-xs text-muted-foreground">
                SOS broadcasts today
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
