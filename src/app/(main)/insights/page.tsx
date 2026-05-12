'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Loader2,
  BarChart3,
  TrendingUp,
  Activity,
  Download,
  Eye,
  Heart,
  DollarSign,
  Package,
  Flame,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth-store'
import {
  getAveragePriceByCategory,
  getListingVolumeTrends,
  getDemandHeatmap,
  getPriceComparison,
  getSellerPerformance,
  exportAnalyticsCSV,
} from '@/app/actions/insights'

type Tab = 'market' | 'performance' | 'compare'

export default function InsightsPage() {
  const { user, profile } = useAuthStore()
  const [tab, setTab] = useState<Tab>('market')
  const [loading, setLoading] = useState(true)

  // Market data
  const [priceData, setPriceData] = useState<{ category: string; avgPriceCents: number; count: number }[]>([])
  const [volumeData, setVolumeData] = useState<{ months: string[]; categories: string[]; trends: Record<string, unknown>[] }>({ months: [], categories: [], trends: [] })
  const [heatmapData, setHeatmapData] = useState<{ category: string; demand: number; supply: number }[]>([])

  // Performance data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [performance, setPerformance] = useState<any>(null)

  // Price comparison
  const [compareListingId, setCompareListingId] = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [compareData, setCompareData] = useState<any>(null)
  const [comparing, setComparing] = useState(false)

  const tier = profile?.subscription_tier || 'free'
  const hasAccess = tier === 'premium' || tier === 'boost'

  useEffect(() => {
    if (!user) return
    if (!hasAccess) {
      setLoading(false)
      return
    }
    loadData()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, hasAccess])

  async function loadData() {
    setLoading(true)
    const [priceRes, volumeRes, heatmapRes, perfRes] = await Promise.all([
      getAveragePriceByCategory(),
      getListingVolumeTrends(),
      getDemandHeatmap(),
      getSellerPerformance(),
    ])

    setPriceData(priceRes.categories || [])
    setVolumeData(volumeRes as typeof volumeData)
    setHeatmapData(heatmapRes.heatmap || [])
    if (perfRes.performance) setPerformance(perfRes.performance)
    setLoading(false)
  }

  async function handleCompare() {
    if (!compareListingId.trim()) return
    setComparing(true)
    const result = await getPriceComparison(compareListingId.trim())
    if (result.error) {
      toast.error(result.error)
    } else {
      setCompareData(result.comparison)
    }
    setComparing(false)
  }

  async function handleExport() {
    const result = await exportAnalyticsCSV()
    if (result.error) {
      toast.error(result.error)
      return
    }
    // Download CSV
    const blob = new Blob([result.csv || ''], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `metal-gear-analytics-${new Date().toISOString().split('T')[0]}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success('Analytics exported')
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!hasAccess) {
    return (
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-6 px-4 py-16 text-center">
        <BarChart3 className="size-16 text-muted-foreground" />
        <h1 className="font-display text-3xl font-bold text-foreground">
          Market Insights
        </h1>
        <p className="font-body text-muted-foreground">
          Advanced analytics and market insights are available on Premium and Boost plans.
        </p>
        <Button asChild>
          <Link href="/pricing">Upgrade Your Plan</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Market Insights
          </h1>
          <p className="mt-1 font-body text-muted-foreground">
            Analytics, trends, and performance data
          </p>
        </div>
        <Button variant="outline" className="font-body" onClick={handleExport}>
          <Download className="mr-2 size-4" />
          Export CSV
        </Button>
      </div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: 'market' as Tab, label: 'Market Overview', icon: BarChart3 },
          { key: 'performance' as Tab, label: 'My Performance', icon: TrendingUp },
          { key: 'compare' as Tab, label: 'Price Compare', icon: Activity },
        ].map(({ key, label, icon: Icon }) => (
          <Button
            key={key}
            variant={tab === key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setTab(key)}
            className="font-body"
          >
            <Icon className="mr-1.5 size-4" />
            {label}
          </Button>
        ))}
      </div>

      {tab === 'market' && (
        <div className="space-y-6">
          {/* Average Price by Category */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <DollarSign className="size-5 text-primary" />
                Average Price by Category
              </CardTitle>
            </CardHeader>
            <CardContent>
              {priceData.length === 0 ? (
                <p className="font-body text-sm text-muted-foreground">No pricing data available yet.</p>
              ) : (
                <BarChartSVG
                  data={priceData.slice(0, 10).map((d) => ({
                    label: d.category,
                    value: d.avgPriceCents / 100,
                    count: d.count,
                  }))}
                  formatValue={(v) => `$${v.toLocaleString()}`}
                />
              )}
            </CardContent>
          </Card>

          {/* Listing Volume Trends */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <TrendingUp className="size-5 text-primary" />
                Listing Volume (Last 6 Months)
              </CardTitle>
            </CardHeader>
            <CardContent>
              {volumeData.months.length === 0 ? (
                <p className="font-body text-sm text-muted-foreground">No volume data yet.</p>
              ) : (
                <LineChartSVG data={volumeData} />
              )}
            </CardContent>
          </Card>

          {/* Demand Heatmap */}
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Flame className="size-5 text-primary" />
                Demand vs Supply
              </CardTitle>
            </CardHeader>
            <CardContent>
              {heatmapData.length === 0 ? (
                <p className="font-body text-sm text-muted-foreground">No demand data yet.</p>
              ) : (
                <HeatmapGrid data={heatmapData} />
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === 'performance' && (
        <div className="space-y-6">
          {performance ? (
            <>
              {/* KPI Cards */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <KPICard icon={Eye} label="Total Views" value={performance.totalViews.toLocaleString()} />
                <KPICard icon={Heart} label="Total Favorites" value={performance.totalFavorites.toLocaleString()} />
                <KPICard icon={Package} label="Listings Sold" value={performance.soldListings.toString()} />
                <KPICard icon={DollarSign} label="Total Revenue" value={`$${(performance.totalRevenue / 100).toLocaleString()}`} />
              </div>

              {/* Conversion Funnel */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display text-lg">
                    <Activity className="size-5 text-primary" />
                    Conversion Funnel
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <FunnelChart funnel={performance.funnel} />
                </CardContent>
              </Card>

              {/* Revenue by Month */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 font-display text-lg">
                    <DollarSign className="size-5 text-primary" />
                    Monthly Revenue
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <BarChartSVG
                    data={performance.revenueByMonth.map((d: { month: string; revenue: number }) => ({
                      label: d.month,
                      value: d.revenue / 100,
                    }))}
                    formatValue={(v) => `$${v.toLocaleString()}`}
                  />
                </CardContent>
              </Card>
            </>
          ) : (
            <Card className="bg-card">
              <CardContent className="flex flex-col items-center gap-4 py-12">
                <TrendingUp className="size-12 text-muted-foreground" />
                <p className="font-body text-sm text-muted-foreground">
                  Create listings to see your performance data.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {tab === 'compare' && (
        <div className="space-y-6">
          <Card className="bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <Activity className="size-5 text-primary" />
                Price Comparison Tool
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="font-body text-sm text-muted-foreground">
                Enter a listing ID to see how its price compares to other listings in the same category.
              </p>
              <div className="flex gap-2">
                <div className="flex-1">
                  <Label htmlFor="listingId" className="font-body text-xs">
                    Listing ID
                  </Label>
                  <Input
                    id="listingId"
                    value={compareListingId}
                    onChange={(e) => setCompareListingId(e.target.value)}
                    placeholder="Paste listing ID here"
                    className="font-body"
                  />
                </div>
                <Button
                  onClick={handleCompare}
                  disabled={comparing || !compareListingId.trim()}
                  className="mt-5 font-body"
                >
                  {comparing ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  Compare
                </Button>
              </div>

              {compareData && (
                <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-body text-sm font-medium text-foreground">
                      {compareData.category}
                    </p>
                    <Badge variant="outline" className="font-body">
                      {compareData.totalListings} listings
                    </Badge>
                  </div>

                  {/* Price position bar */}
                  <div className="space-y-2">
                    <div className="relative h-8 overflow-hidden rounded-full bg-card">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-green-500 via-yellow-500 to-red-500"
                        style={{ width: '100%' }}
                      />
                      <div
                        className="absolute top-0 flex h-full items-center"
                        style={{ left: `${compareData.percentile}%`, transform: 'translateX(-50%)' }}
                      >
                        <div className="flex size-8 items-center justify-center rounded-full border-2 border-white bg-primary shadow-lg">
                          <DollarSign className="size-4 text-white" />
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between font-body text-[10px] text-muted-foreground">
                      <span>${(compareData.min / 100).toLocaleString()}</span>
                      <span>Median: ${(compareData.median / 100).toLocaleString()}</span>
                      <span>${(compareData.max / 100).toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="font-display text-lg font-bold text-primary">
                        ${(compareData.listingPrice / 100).toLocaleString()}
                      </p>
                      <p className="font-body text-[10px] text-muted-foreground">Your Price</p>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-foreground">
                        ${(compareData.avg / 100).toLocaleString()}
                      </p>
                      <p className="font-body text-[10px] text-muted-foreground">Category Avg</p>
                    </div>
                    <div>
                      <p className="font-display text-lg font-bold text-foreground">
                        {compareData.percentile}th
                      </p>
                      <p className="font-body text-[10px] text-muted-foreground">Percentile</p>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}

// ── Pure SVG/CSS Chart Components ──

function BarChartSVG({
  data,
  formatValue,
}: {
  data: { label: string; value: number; count?: number }[]
  formatValue: (v: number) => string
}) {
  if (data.length === 0) return null
  const maxVal = Math.max(...data.map((d) => d.value), 1)
  const barHeight = 28
  const gap = 6
  const svgHeight = data.length * (barHeight + gap) + 10
  const labelWidth = 140
  const chartWidth = 500

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${labelWidth + chartWidth + 100} ${svgHeight}`}
        className="w-full min-w-[500px]"
        style={{ height: svgHeight }}
      >
        {data.map((d, i) => {
          const y = i * (barHeight + gap) + 5
          const barW = (d.value / maxVal) * chartWidth
          return (
            <g key={d.label}>
              <text
                x={labelWidth - 8}
                y={y + barHeight / 2 + 4}
                textAnchor="end"
                className="fill-muted-foreground font-body text-[11px]"
              >
                {d.label.length > 18 ? d.label.slice(0, 18) + '...' : d.label}
              </text>
              <rect
                x={labelWidth}
                y={y}
                width={barW}
                height={barHeight}
                rx={4}
                className="fill-primary/80"
              />
              <text
                x={labelWidth + barW + 6}
                y={y + barHeight / 2 + 4}
                className="fill-foreground font-body text-[11px]"
              >
                {formatValue(d.value)}
                {d.count !== undefined ? ` (${d.count})` : ''}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}

function LineChartSVG({
  data,
}: {
  data: { months: string[]; categories: string[]; trends: Record<string, unknown>[] }
}) {
  const { months, categories, trends } = data
  if (months.length === 0) return null

  // Compute totals per month (across all categories)
  const totals = trends.map((t) => {
    let sum = 0
    for (const cat of categories) {
      sum += (t[cat] as number) || 0
    }
    return sum
  })

  const maxVal = Math.max(...totals, 1)
  const width = 600
  const height = 200
  const padding = { top: 20, right: 20, bottom: 30, left: 50 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom

  const points = totals.map((v, i) => ({
    x: padding.left + (i / Math.max(months.length - 1, 1)) * chartW,
    y: padding.top + chartH - (v / maxVal) * chartH,
    value: v,
    month: months[i],
  }))

  const pathD = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    .join(' ')

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full min-w-[400px]">
        {/* Grid lines */}
        {[0, 0.25, 0.5, 0.75, 1].map((frac) => {
          const y = padding.top + chartH - frac * chartH
          return (
            <g key={frac}>
              <line
                x1={padding.left}
                y1={y}
                x2={width - padding.right}
                y2={y}
                stroke="currentColor"
                className="text-border"
                strokeWidth={0.5}
              />
              <text
                x={padding.left - 8}
                y={y + 4}
                textAnchor="end"
                className="fill-muted-foreground font-body text-[10px]"
              >
                {Math.round(maxVal * frac)}
              </text>
            </g>
          )
        })}

        {/* Line */}
        <path d={pathD} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />

        {/* Dots */}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={p.x} cy={p.y} r={4} fill="var(--primary)" />
            <text
              x={p.x}
              y={height - 8}
              textAnchor="middle"
              className="fill-muted-foreground font-body text-[10px]"
            >
              {p.month.slice(5)}
            </text>
          </g>
        ))}
      </svg>
    </div>
  )
}

function HeatmapGrid({
  data,
}: {
  data: { category: string; demand: number; supply: number }[]
}) {
  const maxDemand = Math.max(...data.map((d) => d.demand), 1)
  const maxSupply = Math.max(...data.map((d) => d.supply), 1)

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[1fr_80px_80px_100px] gap-2 font-body text-[10px] font-medium uppercase text-muted-foreground">
        <span>Category</span>
        <span className="text-center">Demand</span>
        <span className="text-center">Supply</span>
        <span className="text-center">Gap</span>
      </div>
      {data.slice(0, 12).map((d) => {
        const demandPct = (d.demand / maxDemand) * 100
        const supplyPct = (d.supply / maxSupply) * 100
        const gap = d.demand - d.supply
        const gapLabel = gap > 0 ? 'High Demand' : gap < 0 ? 'Oversupplied' : 'Balanced'
        const gapColor = gap > 0 ? 'text-green-400' : gap < 0 ? 'text-red-400' : 'text-yellow-400'

        return (
          <div
            key={d.category}
            className="grid grid-cols-[1fr_80px_80px_100px] items-center gap-2 rounded-md border border-border bg-surface px-3 py-2"
          >
            <span className="truncate font-body text-xs text-foreground">{d.category}</span>
            <div className="flex items-center gap-1">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-card">
                <div
                  className="h-full rounded-full bg-primary/70"
                  style={{ width: `${demandPct}%` }}
                />
              </div>
              <span className="font-body text-[10px] text-muted-foreground">{d.demand}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="h-3 flex-1 overflow-hidden rounded-full bg-card">
                <div
                  className="h-full rounded-full bg-blue-500/70"
                  style={{ width: `${supplyPct}%` }}
                />
              </div>
              <span className="font-body text-[10px] text-muted-foreground">{d.supply}</span>
            </div>
            <span className={`text-center font-body text-[10px] font-medium ${gapColor}`}>
              {gapLabel}
            </span>
          </div>
        )
      })}
      <div className="flex items-center gap-4 pt-2 font-body text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-primary/70" /> Demand (searches)
        </span>
        <span className="flex items-center gap-1">
          <span className="size-2 rounded-full bg-blue-500/70" /> Supply (listings)
        </span>
      </div>
    </div>
  )
}

function FunnelChart({
  funnel,
}: {
  funnel: { views: number; inquiries: number; offers: number; sales: number }
}) {
  const steps = [
    { label: 'Views', value: funnel.views, color: 'bg-blue-500' },
    { label: 'Inquiries', value: funnel.inquiries, color: 'bg-primary' },
    { label: 'Offers', value: funnel.offers, color: 'bg-yellow-500' },
    { label: 'Sales', value: funnel.sales, color: 'bg-green-500' },
  ]

  const maxVal = Math.max(funnel.views, 1)

  return (
    <div className="space-y-3">
      {steps.map((step, i) => {
        const pct = (step.value / maxVal) * 100
        const convRate = i > 0 && steps[i - 1].value > 0
          ? ((step.value / steps[i - 1].value) * 100).toFixed(1)
          : null

        return (
          <div key={step.label} className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="font-body text-xs text-foreground">{step.label}</span>
              <div className="flex items-center gap-2">
                {convRate && (
                  <span className="font-body text-[10px] text-muted-foreground">
                    {convRate}% conversion
                  </span>
                )}
                <span className="font-display text-sm font-bold text-foreground">
                  {step.value.toLocaleString()}
                </span>
              </div>
            </div>
            <div className="h-6 overflow-hidden rounded-full bg-surface">
              <div
                className={`h-full rounded-full ${step.color} transition-all`}
                style={{ width: `${Math.max(pct, 2)}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}

function KPICard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <Card className="bg-card">
      <CardContent className="flex items-center gap-3 p-4">
        <div className="flex size-10 items-center justify-center rounded-lg bg-primary/20">
          <Icon className="size-5 text-primary" />
        </div>
        <div>
          <p className="font-display text-xl font-bold text-foreground">{value}</p>
          <p className="font-body text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
