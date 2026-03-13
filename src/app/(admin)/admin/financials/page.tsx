'use client'

import { useState, useEffect } from 'react'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Users,
  Zap,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Download,
} from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {
  getFinancialKPIs,
  getRevenueByMonth,
  getSubscriptionsTable,
  getBoostRevenueTable,
  getFailedPayments,
  exportSubscriptionsCSV,
  exportBoostsCSV,
} from '@/app/actions/financials'

// ─── Types ──────────────────────────────────────────────────────────

type KPIData = Awaited<ReturnType<typeof getFinancialKPIs>>
type RevenueMonth = Awaited<ReturnType<typeof getRevenueByMonth>>[number]
type SubRow = Awaited<ReturnType<typeof getSubscriptionsTable>>['subscriptions'][number]
type BoostRow = Awaited<ReturnType<typeof getBoostRevenueTable>>['boosts'][number]
type FailedPayment = Awaited<ReturnType<typeof getFailedPayments>>[number]

// ─── Helpers ────────────────────────────────────────────────────────

function formatCents(cents: number): string {
  return `$${(cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDollars(amount: number): string {
  return `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function downloadCSV(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  canceled: 'bg-red-500/20 text-red-400',
  past_due: 'bg-amber-500/20 text-amber-400',
  trialing: 'bg-blue-500/20 text-blue-400',
  incomplete: 'bg-zinc-500/20 text-zinc-400',
}

const TIER_COLORS: Record<string, string> = {
  premium: 'bg-blue-500/20 text-blue-400',
  boost: 'bg-primary/20 text-primary',
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function AdminFinancialsPage() {
  const [kpis, setKpis] = useState<KPIData | null>(null)
  const [revenueData, setRevenueData] = useState<RevenueMonth[]>([])
  const [subs, setSubs] = useState<SubRow[]>([])
  const [subsTotal, setSubsTotal] = useState(0)
  const [subsPage, setSubsPage] = useState(1)
  const [subsTotalPages, setSubsTotalPages] = useState(1)
  const [subsPlan, setSubsPlan] = useState('all')
  const [subsStatus, setSubsStatus] = useState('all')
  const [boosts, setBoosts] = useState<BoostRow[]>([])
  const [boostsTotal, setBoostsTotal] = useState(0)
  const [boostsTotalRevenue, setBoostsTotalRevenue] = useState(0)
  const [boostsPage, setBoostsPage] = useState(1)
  const [boostsTotalPages, setBoostsTotalPages] = useState(1)
  const [failedPayments, setFailedPayments] = useState<FailedPayment[]>([])
  const [loading, setLoading] = useState(true)
  const [subsLoading, setSubsLoading] = useState(true)
  const [boostsLoading, setBoostsLoading] = useState(true)

  // Load KPIs, revenue chart, and failed payments on mount
  useEffect(() => {
    let cancelled = false
    async function fetchInitial() {
      setLoading(true)
      try {
        const [kpiResult, revenueResult, failedResult] = await Promise.all([
          getFinancialKPIs(),
          getRevenueByMonth(),
          getFailedPayments(),
        ])
        if (!cancelled) {
          setKpis(kpiResult)
          setRevenueData(revenueResult)
          setFailedPayments(failedResult)
        }
      } catch (err) {
        if (!cancelled) {
          toast.error(err instanceof Error ? err.message : 'Failed to load financial data')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchInitial()
    return () => { cancelled = true }
  }, [])

  // Load subscriptions table
  useEffect(() => {
    let cancelled = false
    async function fetchSubs() {
      setSubsLoading(true)
      try {
        const result = await getSubscriptionsTable({ page: subsPage, plan: subsPlan, status: subsStatus })
        if (!cancelled) {
          setSubs(result.subscriptions as SubRow[])
          setSubsTotal(result.total)
          setSubsTotalPages(result.totalPages)
        }
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load subscriptions')
      } finally {
        if (!cancelled) setSubsLoading(false)
      }
    }
    fetchSubs()
    return () => { cancelled = true }
  }, [subsPage, subsPlan, subsStatus])

  // Load boosts table
  useEffect(() => {
    let cancelled = false
    async function fetchBoosts() {
      setBoostsLoading(true)
      try {
        const result = await getBoostRevenueTable({ page: boostsPage })
        if (!cancelled) {
          setBoosts(result.boosts as BoostRow[])
          setBoostsTotal(result.total)
          setBoostsTotalRevenue(result.totalRevenueCents)
          setBoostsTotalPages(result.totalPages)
        }
      } catch (err) {
        if (!cancelled) toast.error(err instanceof Error ? err.message : 'Failed to load boosts')
      } finally {
        if (!cancelled) setBoostsLoading(false)
      }
    }
    fetchBoosts()
    return () => { cancelled = true }
  }, [boostsPage])

  // CSV exports
  async function handleExportSubs() {
    try {
      const csv = await exportSubscriptionsCSV()
      downloadCSV(csv, 'subscriptions.csv')
      toast.success('Subscriptions CSV downloaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    }
  }

  async function handleExportBoosts() {
    try {
      const csv = await exportBoostsCSV()
      downloadCSV(csv, 'boosts.csv')
      toast.success('Boosts CSV downloaded')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Export failed')
    }
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Financials</h1>

      {/* ─── KPI Strip ─────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        <KPICard
          label="MRR (est.)"
          value={kpis ? formatCents(kpis.mrrCents) : null}
          icon={<DollarSign className="size-4" />}
          accent="text-green-400"
        />
        <KPICard
          label="ARR (est.)"
          value={kpis ? formatCents(kpis.arrCents) : null}
          icon={<TrendingUp className="size-4" />}
          accent="text-green-400"
        />
        <KPICard
          label="Boost Rev (Mo)"
          value={kpis ? formatCents(kpis.boostRevenueCents) : null}
          icon={<Zap className="size-4" />}
          accent="text-primary"
        />
        <KPICard
          label="Retention"
          value={kpis ? `${kpis.retentionRate}%` : null}
          icon={<Users className="size-4" />}
          accent={kpis && kpis.retentionRate >= 90 ? 'text-green-400' : 'text-amber-400'}
        />
        <KPICard
          label="ARPU"
          value={kpis ? formatCents(kpis.arpuCents) : null}
          icon={<DollarSign className="size-4" />}
          accent="text-primary"
        />
        <KPICard
          label="Churn Rate"
          value={kpis ? `${kpis.churnRate}%` : null}
          icon={<TrendingDown className="size-4" />}
          accent={kpis && kpis.churnRate <= 5 ? 'text-green-400' : 'text-red-400'}
        />
      </div>

      {/* ─── Revenue Chart + Distribution ──────────────────────── */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Revenue Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="font-display text-base text-foreground">
              Revenue (Last 12 Months)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex h-[300px] items-center justify-center">
                <p className="font-body text-sm text-muted-foreground">Loading chart...</p>
              </div>
            ) : revenueData.length === 0 ? (
              <div className="flex h-[300px] items-center justify-center">
                <p className="font-body text-sm text-muted-foreground">No revenue data yet</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={revenueData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#1a1a2e" />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 11, fill: '#71717a' }}
                    tickFormatter={(v: string) => {
                      const [y, m] = v.split('-')
                      return `${m}/${y.slice(2)}`
                    }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: '#71717a' }}
                    tickFormatter={(v: number) => `$${v}`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--card)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '8px',
                      fontFamily: 'Manrope, sans-serif',
                      fontSize: '12px',
                    }}
                    formatter={((value: number) => [formatDollars(value)]) as never}
                    labelFormatter={((label: string) => {
                      const [y, m] = label.split('-')
                      const date = new Date(Number(y), Number(m) - 1)
                      return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
                    }) as never}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', fontFamily: 'Manrope, sans-serif' }} />
                  <Bar dataKey="subscriptions" stackId="a" fill="#1877F2" name="Subscriptions" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="boosts" stackId="a" fill="#1877F2" name="Boosts" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Subscription Distribution + Forecast */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base text-foreground">
                Subscription Distribution
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {loading || !kpis ? (
                <p className="font-body text-sm text-muted-foreground">Loading...</p>
              ) : (
                <>
                  <DistributionBar
                    label="Free"
                    count={kpis.freeCount}
                    total={kpis.totalUsers}
                    color="bg-zinc-500"
                  />
                  <DistributionBar
                    label="Premium"
                    count={kpis.premiumCount}
                    total={kpis.totalUsers}
                    color="bg-primary"
                  />
                  <DistributionBar
                    label="Boost"
                    count={kpis.boostCount}
                    total={kpis.totalUsers}
                    color="bg-primary"
                  />
                  <Separator className="border-border" />
                  <div className="flex justify-between font-body text-xs text-muted-foreground">
                    <span>Total Users</span>
                    <span className="text-foreground">{kpis.totalUsers}</span>
                  </div>
                  <div className="flex justify-between font-body text-xs text-muted-foreground">
                    <span>Paid Subscribers</span>
                    <span className="text-foreground">{kpis.totalPaidSubs}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Revenue Forecast */}
          <Card>
            <CardHeader>
              <CardTitle className="font-display text-base text-foreground">
                Revenue Forecast
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {loading || !kpis ? (
                <p className="font-body text-sm text-muted-foreground">Loading...</p>
              ) : (
                <>
                  <div className="flex justify-between font-body text-sm">
                    <span className="text-muted-foreground">Current MRR</span>
                    <span className="text-foreground">{formatCents(kpis.mrrCents)}</span>
                  </div>
                  <div className="flex justify-between font-body text-sm">
                    <span className="text-muted-foreground">Projected ARR</span>
                    <span className="text-green-400">{formatCents(kpis.mrrCents * 12)}</span>
                  </div>
                  <Separator className="border-border" />
                  <div className="flex justify-between font-body text-sm">
                    <span className="text-muted-foreground">90-Day MRR</span>
                    <span className="text-foreground">
                      {formatCents(Math.round(kpis.mrrCents * (1 - kpis.churnRate / 100 * 3)))}
                    </span>
                  </div>
                  <p className="font-body text-[10px] text-muted-foreground">
                    Based on current MRR and {kpis.churnRate}% monthly churn
                  </p>
                  <Separator className="border-border" />
                  <div className="flex justify-between font-body text-sm">
                    <span className="text-muted-foreground">Boost Rev (All-Time)</span>
                    <span className="text-primary">{formatCents(kpis.boostRevenueTotalCents)}</span>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ─── Subscriptions Table ───────────────────────────────── */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="font-display text-base text-foreground">
            Subscriptions
            <Badge variant="outline" className="ml-2 font-body text-[10px]">
              {subsTotal}
            </Badge>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportSubs}>
            <Download className="mr-1 size-3" />
            <span className="font-body text-xs">CSV</span>
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-3">
            <Select value={subsPlan} onValueChange={(v) => { setSubsPlan(v); setSubsPage(1) }}>
              <SelectTrigger className="w-[140px] font-body">
                <SelectValue placeholder="Plan" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All plans</SelectItem>
                <SelectItem value="premium">Premium</SelectItem>
                <SelectItem value="boost">Boost</SelectItem>
              </SelectContent>
            </Select>
            <Select value={subsStatus} onValueChange={(v) => { setSubsStatus(v); setSubsPage(1) }}>
              <SelectTrigger className="w-[140px] font-body">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="canceled">Canceled</SelectItem>
                <SelectItem value="past_due">Past Due</SelectItem>
                <SelectItem value="trialing">Trialing</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Plan</th>
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Period</th>
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Created</th>
                </tr>
              </thead>
              <tbody>
                {subsLoading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <p className="font-body text-sm text-muted-foreground">Loading...</p>
                    </td>
                  </tr>
                ) : subs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center">
                      <p className="font-body text-sm text-muted-foreground">No subscriptions found</p>
                    </td>
                  </tr>
                ) : (
                  subs.map((sub) => (
                    <tr key={sub.stripe_subscription_id || sub.user_id} className="border-b border-border hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-body text-sm text-foreground">
                        {sub.user_name}
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`border-0 font-body text-[10px] uppercase ${TIER_COLORS[sub.tier] || 'bg-zinc-500/20 text-zinc-400'}`}>
                          {sub.tier}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`border-0 font-body text-[10px] uppercase ${STATUS_COLORS[sub.status] || 'bg-zinc-500/20 text-zinc-400'}`}>
                          {sub.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-body text-xs text-muted-foreground">
                        {sub.current_period_start
                          ? `${new Date(sub.current_period_start).toLocaleDateString()} - ${new Date(sub.current_period_end ?? sub.current_period_start).toLocaleDateString()}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 font-body text-xs text-muted-foreground">
                        {new Date(sub.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {subsTotalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-3">
              <p className="font-body text-xs text-muted-foreground">
                Page {subsPage} of {subsTotalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={subsPage <= 1} onClick={() => setSubsPage((p) => p - 1)}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={subsPage >= subsTotalPages} onClick={() => setSubsPage((p) => p + 1)}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Boost Revenue Table ───────────────────────────────── */}
      <Card>
        <CardHeader className="flex-row items-center justify-between space-y-0">
          <CardTitle className="font-display text-base text-foreground">
            Boost Revenue
            <Badge variant="outline" className="ml-2 font-body text-[10px]">
              {boostsTotal} purchases
            </Badge>
            <span className="ml-3 font-body text-sm font-normal text-primary">
              {formatCents(boostsTotalRevenue)} total
            </span>
          </CardTitle>
          <Button variant="outline" size="sm" onClick={handleExportBoosts}>
            <Download className="mr-1 size-3" />
            <span className="font-body text-xs">CSV</span>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">User</th>
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Type</th>
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Listing</th>
                  <th className="px-4 py-3 text-right font-body text-xs font-medium text-muted-foreground">Amount</th>
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Duration</th>
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Status</th>
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Expires</th>
                </tr>
              </thead>
              <tbody>
                {boostsLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center">
                      <p className="font-body text-sm text-muted-foreground">Loading...</p>
                    </td>
                  </tr>
                ) : boosts.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center">
                      <p className="font-body text-sm text-muted-foreground">No boost purchases found</p>
                    </td>
                  </tr>
                ) : (
                  boosts.map((b, i) => (
                    <tr key={`${b.user_id}-${b.starts_at}-${i}`} className="border-b border-border hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-body text-sm text-foreground">{b.user_name}</td>
                      <td className="px-4 py-3">
                        <Badge className="border-0 bg-primary/20 font-body text-[10px] uppercase text-primary">
                          {b.boost_type}
                        </Badge>
                      </td>
                      <td className="max-w-[200px] truncate px-4 py-3 font-body text-xs text-muted-foreground">
                        {b.listing_title || '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-body text-sm text-foreground">
                        {formatCents(b.amount_cents)}
                      </td>
                      <td className="px-4 py-3 font-body text-xs text-muted-foreground">
                        {b.duration_days}d
                      </td>
                      <td className="px-4 py-3">
                        <Badge className={`border-0 font-body text-[10px] uppercase ${b.status === 'active' ? 'bg-green-500/20 text-green-400' : b.status === 'refunded' ? 'bg-red-500/20 text-red-400' : 'bg-zinc-500/20 text-zinc-400'}`}>
                          {b.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-body text-xs text-muted-foreground">
                        {b.expires_at ? new Date(b.expires_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {boostsTotalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-3 mt-4">
              <p className="font-body text-xs text-muted-foreground">
                Page {boostsPage} of {boostsTotalPages}
              </p>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" disabled={boostsPage <= 1} onClick={() => setBoostsPage((p) => p - 1)}>
                  <ChevronLeft className="size-4" />
                </Button>
                <Button variant="outline" size="sm" disabled={boostsPage >= boostsTotalPages} onClick={() => setBoostsPage((p) => p + 1)}>
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Failed Payments ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <CardTitle className="font-display text-base text-foreground flex items-center gap-2">
            <AlertTriangle className="size-4 text-red-400" />
            Failed Payments
            {!loading && (
              <Badge variant="outline" className="ml-1 font-body text-[10px]">
                {failedPayments.length}
              </Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="font-body text-sm text-muted-foreground">Loading...</p>
          ) : failedPayments.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground">No failed payments</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">User</th>
                    <th className="px-4 py-3 text-right font-body text-xs font-medium text-muted-foreground">Amount</th>
                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Description</th>
                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {failedPayments.map((p) => (
                    <tr key={p.id} className="border-b border-border hover:bg-white/[0.02]">
                      <td className="px-4 py-3 font-body text-sm text-foreground">{p.user_name}</td>
                      <td className="px-4 py-3 text-right font-body text-sm text-red-400">
                        {formatCents(p.amount_cents)}
                      </td>
                      <td className="max-w-[300px] truncate px-4 py-3 font-body text-xs text-muted-foreground">
                        {p.description || '—'}
                      </td>
                      <td className="px-4 py-3 font-body text-xs text-muted-foreground">
                        {new Date(p.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────

function KPICard({
  label,
  value,
  icon,
  accent,
}: {
  label: string
  value: string | null
  icon: React.ReactNode
  accent: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <span className="font-body text-[11px] text-muted-foreground">{label}</span>
          <span className={accent}>{icon}</span>
        </div>
        <p className={`mt-2 font-display text-xl font-bold ${accent}`}>
          {value ?? <span className="text-muted-foreground">--</span>}
        </p>
      </CardContent>
    </Card>
  )
}

function DistributionBar({
  label,
  count,
  total,
  color,
}: {
  label: string
  count: number
  total: number
  color: string
}) {
  const pct = total > 0 ? (count / total) * 100 : 0

  return (
    <div className="space-y-1">
      <div className="flex justify-between font-body text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground">
          {count} ({pct.toFixed(1)}%)
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-border">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${Math.max(pct, 0.5)}%` }}
        />
      </div>
    </div>
  )
}
