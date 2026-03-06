'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  getUserGrowthData,
  getListingHealth,
  getSOSPerformance,
  getSearchAnalytics,
  getGeographicData,
  getAIAssistMetrics,
} from '@/app/actions/analytics'

// ─── Types ───────────────────────────────────────────────────────────

type UserGrowthPoint = { date: string; signups: number; dau: number; cumulative: number }
type ListingHealthData = {
  listingSeries: Array<{ date: string; count: number }>
  categoryDistribution: Array<{ name: string; value: number }>
}
type SOSData = {
  sosSeries: Array<{ date: string; count: number }>
  topRequested: Array<{ name: string; count: number }>
  fulfillmentRate: number
  noMatchRate: number
  totalSOS: number
}
type SearchData = { topSearchTerms: Array<{ term: string; count: number }> }
type GeoData = {
  topCities: Array<{ city: string; count: number; lat: number; lng: number }>
  mapPoints: Array<{ lat: number; lng: number }>
}
type AIData = {
  totalListings: number
  aiAssisted: number
  aiAssistRate: number
  fraudFlagged: number
  fraudCleared: number
}

// ─── Chart Colors ────────────────────────────────────────────────────

const PRIMARY = '#FF6B2B'
const SECONDARY = '#3A8FD4'
const TERTIARY = '#10b981'
const PIE_COLORS = [PRIMARY, SECONDARY, TERTIARY, '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

// ─── Helpers ─────────────────────────────────────────────────────────

function formatDate(dateStr: string) {
  const [, m, d] = dateStr.split('-')
  return `${m}/${d}`
}

function KPICard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card className="border-white/5 bg-[#0D0D14]">
      <CardContent className="p-4">
        <p className="font-body text-xs text-muted-foreground">{label}</p>
        <p className="font-display text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="font-body text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  )
}

function SectionSkeleton() {
  return (
    <Card className="border-white/5 bg-[#0D0D14]">
      <CardHeader>
        <Skeleton className="h-5 w-40" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-[250px] w-full" />
      </CardContent>
    </Card>
  )
}

// ─── Custom Tooltip ──────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-white/10 bg-[#0D0D14] px-3 py-2 shadow-lg">
      <p className="font-body text-xs text-muted-foreground">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="font-body text-sm" style={{ color: entry.color }}>
          {entry.name}: {entry.value.toLocaleString()}
        </p>
      ))}
    </div>
  )
}

// ─── Page ────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const [userGrowth, setUserGrowth] = useState<UserGrowthPoint[] | null>(null)
  const [listingHealth, setListingHealth] = useState<ListingHealthData | null>(null)
  const [sosData, setSOSData] = useState<SOSData | null>(null)
  const [searchData, setSearchData] = useState<SearchData | null>(null)
  const [geoData, setGeoData] = useState<GeoData | null>(null)
  const [aiData, setAIData] = useState<AIData | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchData() {
      const [ug, lh, sos, search, geo, ai] = await Promise.all([
        getUserGrowthData(),
        getListingHealth(),
        getSOSPerformance(),
        getSearchAnalytics(),
        getGeographicData(),
        getAIAssistMetrics(),
      ])
      if (!cancelled) {
        setUserGrowth(ug)
        setListingHealth(lh)
        setSOSData(sos)
        setSearchData(search)
        setGeoData(geo)
        setAIData(ai)
      }
    }
    fetchData()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="space-y-8">
      <h1 className="font-display text-2xl font-bold text-foreground">Platform Analytics</h1>

      {/* ── Section 1: User Growth ──────────────────────────────────── */}
      {!userGrowth ? (
        <SectionSkeleton />
      ) : (
        <Card className="border-white/5 bg-[#0D0D14]">
          <CardHeader>
            <CardTitle className="font-display text-base text-foreground">User Growth (90 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={userGrowth}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={formatDate}
                  stroke="rgba(255,255,255,0.3)"
                  fontSize={11}
                  interval={13}
                />
                <YAxis yAxisId="left" stroke="rgba(255,255,255,0.3)" fontSize={11} />
                <YAxis yAxisId="right" orientation="right" stroke="rgba(255,255,255,0.3)" fontSize={11} />
                <Tooltip content={<ChartTooltip />} />
                <Legend />
                <Line yAxisId="left" type="monotone" dataKey="signups" stroke={PRIMARY} name="Signups" dot={false} strokeWidth={2} />
                <Line yAxisId="left" type="monotone" dataKey="dau" stroke={SECONDARY} name="DAU" dot={false} strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="cumulative" stroke={TERTIARY} name="Total Users" dot={false} strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* ── Section 2: Listing Health ──────────────────────────────── */}
      {!listingHealth ? (
        <SectionSkeleton />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-white/5 bg-[#0D0D14]">
            <CardHeader>
              <CardTitle className="font-display text-base text-foreground">Listings per Day (90 days)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={listingHealth.listingSeries}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="date" tickFormatter={formatDate} stroke="rgba(255,255,255,0.3)" fontSize={11} interval={13} />
                  <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} />
                  <Tooltip content={<ChartTooltip />} />
                  <Line type="monotone" dataKey="count" stroke={PRIMARY} name="Listings" dot={false} strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card className="border-white/5 bg-[#0D0D14]">
            <CardHeader>
              <CardTitle className="font-display text-base text-foreground">Category Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {listingHealth.categoryDistribution.length === 0 ? (
                <p className="font-body text-sm text-muted-foreground">No active listings yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={280}>
                  <PieChart>
                    <Pie
                      data={listingHealth.categoryDistribution}
                      cx="50%"
                      cy="50%"
                      outerRadius={100}
                      dataKey="value"
                      nameKey="name"
                      label={((props: { name?: string; percent?: number }) => `${props.name ?? ''} ${((props.percent ?? 0) * 100).toFixed(0)}%`) as never}
                      labelLine={false}
                      fontSize={11}
                    >
                      {listingHealth.categoryDistribution.map((_, i) => (
                        <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend
                      formatter={(value: string) => <span className="font-body text-xs text-muted-foreground">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ── Section 3: SOS Performance ─────────────────────────────── */}
      {!sosData ? (
        <SectionSkeleton />
      ) : (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <KPICard label="Total SOS Requests" value={sosData.totalSOS.toLocaleString()} sub="Last 90 days" />
            <KPICard label="Fulfillment Rate" value={`${sosData.fulfillmentRate}%`} sub="Requests fulfilled" />
            <KPICard label="No Match Rate" value={`${sosData.noMatchRate}%`} sub="No seller responded" />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-white/5 bg-[#0D0D14]">
              <CardHeader>
                <CardTitle className="font-display text-base text-foreground">SOS Requests per Day</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <LineChart data={sosData.sosSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis dataKey="date" tickFormatter={formatDate} stroke="rgba(255,255,255,0.3)" fontSize={11} interval={13} />
                    <YAxis stroke="rgba(255,255,255,0.3)" fontSize={11} />
                    <Tooltip content={<ChartTooltip />} />
                    <Line type="monotone" dataKey="count" stroke={SECONDARY} name="SOS Requests" dot={false} strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-white/5 bg-[#0D0D14]">
              <CardHeader>
                <CardTitle className="font-display text-base text-foreground">Top 10 Requested Equipment</CardTitle>
              </CardHeader>
              <CardContent>
                {sosData.topRequested.length === 0 ? (
                  <p className="font-body text-sm text-muted-foreground">No SOS requests yet.</p>
                ) : (
                  <div className="space-y-2">
                    {sosData.topRequested.map((item, i) => (
                      <div key={item.name} className="flex items-center justify-between rounded-md px-3 py-2 odd:bg-white/[0.02]">
                        <div className="flex items-center gap-2">
                          <span className="font-display text-xs text-muted-foreground">{i + 1}.</span>
                          <span className="font-body text-sm capitalize text-foreground">{item.name}</span>
                        </div>
                        <Badge variant="secondary" className="font-body text-xs">
                          {item.count}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ── Section 4: Search Analytics ────────────────────────────── */}
      {!searchData ? (
        <SectionSkeleton />
      ) : (
        <Card className="border-white/5 bg-[#0D0D14]">
          <CardHeader>
            <CardTitle className="font-display text-base text-foreground">Top Search Terms</CardTitle>
          </CardHeader>
          <CardContent>
            {searchData.topSearchTerms.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">No search data yet.</p>
            ) : (
              <div className="grid gap-x-8 gap-y-1 sm:grid-cols-2">
                {searchData.topSearchTerms.map((item, i) => (
                  <div key={item.term} className="flex items-center justify-between rounded-md px-3 py-2 odd:bg-white/[0.02]">
                    <div className="flex items-center gap-2">
                      <span className="font-display text-xs text-muted-foreground">{i + 1}.</span>
                      <span className="font-body text-sm text-foreground">{item.term}</span>
                    </div>
                    <Badge variant="secondary" className="font-body text-xs">
                      {item.count}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Section 5: AI Assist Usage ─────────────────────────────── */}
      {!aiData ? (
        <SectionSkeleton />
      ) : (
        <div>
          <h2 className="font-display mb-4 text-lg font-semibold text-foreground">AI Assist Usage</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <KPICard label="Total Listings" value={aiData.totalListings.toLocaleString()} />
            <KPICard label="AI Assisted" value={aiData.aiAssisted.toLocaleString()} sub="Listings analyzed by AI" />
            <KPICard label="AI Assist Rate" value={`${aiData.aiAssistRate}%`} sub="Of all listings" />
            <KPICard label="Fraud Flagged" value={aiData.fraudFlagged.toLocaleString()} sub="By AI analysis" />
            <KPICard label="Fraud Cleared" value={aiData.fraudCleared.toLocaleString()} sub="After admin review" />
          </div>
        </div>
      )}

      {/* ── Section 6: Geographic ──────────────────────────────────── */}
      {!geoData ? (
        <SectionSkeleton />
      ) : (
        <Card className="border-white/5 bg-[#0D0D14]">
          <CardHeader>
            <CardTitle className="font-display text-base text-foreground">Top 10 Cities by Users</CardTitle>
          </CardHeader>
          <CardContent>
            {geoData.topCities.length === 0 ? (
              <p className="font-body text-sm text-muted-foreground">No geographic data yet.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full font-body text-sm">
                  <thead>
                    <tr className="border-b border-white/5 text-left">
                      <th className="px-3 py-2 text-xs font-medium text-muted-foreground">#</th>
                      <th className="px-3 py-2 text-xs font-medium text-muted-foreground">City</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Users</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Lat</th>
                      <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Lng</th>
                    </tr>
                  </thead>
                  <tbody>
                    {geoData.topCities.map((city, i) => (
                      <tr key={city.city} className="border-b border-white/[0.03] hover:bg-white/[0.02]">
                        <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                        <td className="px-3 py-2 text-foreground">{city.city}</td>
                        <td className="px-3 py-2 text-right text-foreground">{city.count.toLocaleString()}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{city.lat.toFixed(2)}</td>
                        <td className="px-3 py-2 text-right text-muted-foreground">{city.lng.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
