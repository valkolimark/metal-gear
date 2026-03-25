'use client'

import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  Package,
  Eye,
  MessageSquare,
  Heart,
  Plus,
  ArrowRight,
  Loader2,
  TrendingUp,
  TrendingDown,
  Crown,
  BarChart3,
  Bell,
  Star,
  Tag,
  DollarSign,
  Check,
  X as XIcon,
  ChevronDown,
  ChevronUp,
  Truck,
  Clock,
  AlertTriangle,
  CalendarDays,
  ShoppingCart,
  Sparkles,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/auth-store'
import { getDashboardData } from '@/app/actions/dashboard'
import { getSellerAnalytics } from '@/app/actions/analytics'
import { getRecommendedListings } from '@/app/actions/activity'
import { TIER_LABELS, TIER_LIMITS } from '@/lib/constants'
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh'
import { PullToRefreshIndicator } from '@/components/ui/pull-to-refresh'
import { OnboardingChecklist } from '@/components/onboarding/onboarding-checklist'
import { ProblemDiagnoser } from '@/components/search/ProblemDiagnoser'
import { DemandForecast } from '@/components/dashboard/DemandForecast'
import { CompanyAvatar } from '@/components/company/CompanyAvatar'
import { updateLastLogin } from '@/app/actions/onboarding'
import type { Tables } from '@/types/database'

type Listing = Tables<'listings'>

interface RecommendedListing extends Listing {
  listing_images?: { url: string; position: number }[]
}

const WIDGET_STATE_KEY = 'mg-dashboard-widgets'

function getWidgetState(): Record<string, boolean> {
  if (typeof window === 'undefined') return {}
  try {
    return JSON.parse(localStorage.getItem(WIDGET_STATE_KEY) || '{}')
  } catch {
    return {}
  }
}

function setWidgetExpanded(key: string, expanded: boolean) {
  const state = getWidgetState()
  state[key] = expanded
  localStorage.setItem(WIDGET_STATE_KEY, JSON.stringify(state))
}

interface DashData {
  isSeller: boolean
  isBuyer: boolean
  unreadMessages: number
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  recentActivity: any[]
  sellerData: {
    activeListingsCount: number
    totalViews: number
    totalFavorites: number
    thisMonthRevenue: number
    lastMonthRevenue: number
    revenueChange: number
    pendingShipments: number
    expiringListings: { id: string; title: string; expiresAt: string }[]
    recentOffers: { id: string; amountCents: number; status: string; createdAt: string; listingTitle: string }[]
    weeklyViews: number
    weeklyInquiries: number
    listingCategories: string[]
  } | null
  buyerData: {
    activeTransactions: { id: string; status: string; amountCents: number; listingTitle: string }[]
    priceWatches: { listingId: string; title: string; originalPrice: number; currentPrice: number; targetPrice: number | null; dropped: boolean }[]
    priceDropCount: number
    upcomingViewings: { id: string; datetime: string; status: string; listingTitle: string }[]
  } | null
}

interface AnalyticsData {
  totalViews: number
  totalFavorites: number
  totalInquiries: number
  viewsByDay: { date: string; views: number }[]
  topListings: {
    id: string
    title: string
    views: number
    recentViews: number
    favorites: number
    inquiries: number
    conversionRate: number
  }[]
}

export default function DashboardPage() {
  const { user, profile, activeCompany } = useAuthStore()
  const tier = profile?.subscription_tier ?? 'free'
  const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS]

  const searchParams = useSearchParams()
  const justJoined = searchParams.get('joined') === 'true'
  const [showJoinBanner, setShowJoinBanner] = useState(false)

  const [data, setData] = useState<DashData | null>(null)
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null)
  const [recommended, setRecommended] = useState<RecommendedListing[]>([])
  const [loading, setLoading] = useState(true)
  const [now] = useState(() => Date.now())

  const loadDashboard = useCallback(async () => {
    if (!user) return

    const result = await getDashboardData()
    if ('error' in result) return
    setData(result as DashData)
    setLoading(false)

    updateLastLogin().catch(console.error)

    getSellerAnalytics().then((r) => {
      if (!('error' in r)) setAnalytics(r)
    })

    getRecommendedListings().then((r) => {
      if ('listings' in r) setRecommended(r.listings as RecommendedListing[])
    })
  }, [user])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    loadDashboard()
  }, [loadDashboard])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- show banner based on URL param
    if (justJoined) setShowJoinBanner(true)
  }, [justJoined])

  const { pulling, refreshing, pullDistance, threshold } = usePullToRefresh(loadDashboard)

  if (loading || !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  const greeting = getGreeting()
  const seller = data.sellerData
  const buyer = data.buyerData

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <PullToRefreshIndicator
        pulling={pulling}
        refreshing={refreshing}
        pullDistance={pullDistance}
        threshold={threshold}
      />

      {/* Team join welcome banner */}
      {showJoinBanner && (
        <div className="bg-[#1877F2]/10 border border-[#1877F2]/20 rounded-xl p-4 flex items-center justify-between">
          <p className="text-sm font-medium text-[#1877F2]">
            You&apos;ve joined the team! You&apos;re now acting as the company on Metal Gear.
          </p>
          <button
            onClick={() => setShowJoinBanner(false)}
            className="text-muted-foreground hover:text-foreground ml-4 shrink-0"
          >
            <XIcon size={16} />
          </button>
        </div>
      )}

      {/* Company context banner */}
      {activeCompany && (
        <div className="flex items-center justify-between px-4 py-3 rounded-xl
          bg-primary/5 border border-primary/15">
          <div className="flex items-center gap-3">
            <CompanyAvatar name={activeCompany.name} logoUrl={activeCompany.logo_url} size={36} />
            <div>
              <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
                Acting as
              </div>
              <div className="font-semibold text-foreground">{activeCompany.name}</div>
            </div>
          </div>
          <Link href="/settings/company"
            className="text-xs text-muted-foreground hover:text-foreground transition-colors">
            Settings &rarr;
          </Link>
        </div>
      )}

      {/* Welcome */}
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          {greeting},{' '}
          {profile?.display_name || profile?.full_name?.split(' ')[0] || 'there'}
        </h1>
        <p className="mt-1 font-body text-muted-foreground">
          {data.isSeller && data.isBuyer
            ? 'Your marketplace overview'
            : data.isSeller
              ? "Here's how your listings are performing"
              : "Here's what's happening in your marketplace"}
        </p>
      </div>

      {/* Quick Stats Bar */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {seller && (
          <>
            <StatCard icon={Package} label="Active Listings" value={seller.activeListingsCount} href="/listings" />
            <StatCard icon={Eye} label="Views This Week" value={seller.weeklyViews} />
          </>
        )}
        <StatCard
          icon={MessageSquare}
          label="Unread Messages"
          value={data.unreadMessages}
          href="/messages"
          highlight={data.unreadMessages > 0}
        />
        {seller ? (
          <StatCard icon={Heart} label="Total Favorites" value={seller.totalFavorites} />
        ) : (
          <StatCard icon={ShoppingCart} label="Active Transactions" value={buyer?.activeTransactions.length ?? 0} href="/transactions" />
        )}
      </div>

      {/* Onboarding Checklist for new users */}
      <OnboardingChecklist />

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/listings/new">
          <Card className="border-border bg-card transition-colors hover:border-primary/50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/20">
                <Plus className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-body font-medium text-foreground">Create Listing</p>
                <p className="font-body text-xs text-muted-foreground">
                  {seller ? `${seller.activeListingsCount}/${limits.listings === Infinity ? '∞' : limits.listings} used` : 'Start selling'}
                </p>
              </div>
              <ArrowRight className="ml-auto size-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/search">
          <Card className="border-border bg-card transition-colors hover:border-primary/50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-10 items-center justify-center rounded-lg bg-secondary/20">
                <TrendingUp className="size-5 text-secondary" />
              </div>
              <div>
                <p className="font-body font-medium text-foreground">Browse Equipment</p>
                <p className="font-body text-xs text-muted-foreground">Find deals near you</p>
              </div>
              <ArrowRight className="ml-auto size-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/messages">
          <Card className="border-border bg-card transition-colors hover:border-primary/50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/20">
                <MessageSquare className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-body font-medium text-foreground">View Messages</p>
                <p className="font-body text-xs text-muted-foreground">
                  {data.unreadMessages > 0 ? `${data.unreadMessages} unread` : 'All caught up'}
                </p>
              </div>
              <ArrowRight className="ml-auto size-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Describe Your Problem — AI Diagnostic */}
      <ProblemDiagnoser />

      {/* === SELLER WIDGETS === */}
      {seller && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Revenue Summary */}
          <CollapsibleWidget widgetKey="seller-revenue" title="Revenue" icon={DollarSign}>
            <div className="space-y-4">
              <div className="flex items-baseline gap-3">
                <p className="font-display text-3xl font-bold text-foreground">
                  ${(seller.thisMonthRevenue / 100).toLocaleString()}
                </p>
                {seller.revenueChange !== 0 && (
                  <Badge
                    variant="outline"
                    className={`font-body text-xs ${
                      seller.revenueChange > 0 ? 'border-green-500/50 text-green-400' : 'border-red-500/50 text-red-400'
                    }`}
                  >
                    {seller.revenueChange > 0 ? (
                      <TrendingUp className="mr-1 size-3" />
                    ) : (
                      <TrendingDown className="mr-1 size-3" />
                    )}
                    {Math.abs(seller.revenueChange)}%
                  </Badge>
                )}
              </div>
              <p className="font-body text-xs text-muted-foreground">
                This month vs last month (${(seller.lastMonthRevenue / 100).toLocaleString()})
              </p>
              <Separator />
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                <div>
                  <p className="font-display text-lg font-bold text-foreground">{seller.weeklyViews}</p>
                  <p className="font-body text-[10px] text-muted-foreground">Views/week</p>
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-foreground">{seller.weeklyInquiries}</p>
                  <p className="font-body text-[10px] text-muted-foreground">Inquiries/week</p>
                </div>
                <div>
                  <p className="font-display text-lg font-bold text-foreground">
                    {seller.weeklyViews > 0 ? `${((seller.weeklyInquiries / seller.weeklyViews) * 100).toFixed(1)}%` : '0%'}
                  </p>
                  <p className="font-body text-[10px] text-muted-foreground">Conversion</p>
                </div>
              </div>
            </div>
          </CollapsibleWidget>

          {/* Pending Shipments & Expiring */}
          <CollapsibleWidget widgetKey="seller-alerts" title="Alerts" icon={AlertTriangle}>
            <div className="space-y-4">
              {seller.pendingShipments > 0 && (
                <Link href="/transactions" className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface">
                  <div className="flex size-8 items-center justify-center rounded-full bg-yellow-500/20">
                    <Truck className="size-4 text-yellow-400" />
                  </div>
                  <div className="flex-1">
                    <p className="font-body text-sm font-medium text-foreground">
                      {seller.pendingShipments} pending shipment{seller.pendingShipments !== 1 ? 's' : ''}
                    </p>
                    <p className="font-body text-xs text-muted-foreground">Paid orders awaiting shipment</p>
                  </div>
                  <ArrowRight className="size-4 text-muted-foreground" />
                </Link>
              )}

              {seller.expiringListings.length > 0 && (
                <div>
                  <p className="mb-2 font-body text-xs font-semibold uppercase tracking-wider text-yellow-400">
                    Expiring Within 7 Days
                  </p>
                  {seller.expiringListings.map((l) => {
                    const daysLeft = Math.ceil((new Date(l.expiresAt).getTime() - now) / (1000 * 60 * 60 * 24))
                    return (
                      <Link
                        key={l.id}
                        href={`/listings/${l.id}`}
                        className="flex items-center gap-2 rounded p-1.5 transition-colors hover:bg-surface"
                      >
                        <Clock className="size-3 text-yellow-400" />
                        <span className="flex-1 truncate font-body text-sm text-foreground">{l.title}</span>
                        <Badge variant="outline" className="font-body text-[10px] text-yellow-400">
                          {daysLeft}d left
                        </Badge>
                      </Link>
                    )
                  })}
                </div>
              )}

              {seller.pendingShipments === 0 && seller.expiringListings.length === 0 && (
                <p className="py-4 text-center font-body text-sm text-muted-foreground">
                  No alerts — everything looks good!
                </p>
              )}
            </div>
          </CollapsibleWidget>

          {/* Recent Offers Received */}
          <CollapsibleWidget widgetKey="seller-offers" title="Recent Offers" icon={DollarSign}>
            {seller.recentOffers.length === 0 ? (
              <p className="py-4 text-center font-body text-sm text-muted-foreground">No recent offers</p>
            ) : (
              <div className="space-y-2">
                {seller.recentOffers.map((o) => (
                  <div key={o.id} className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface">
                    <div className={`flex size-7 items-center justify-center rounded-full ${
                      o.status === 'pending' ? 'bg-yellow-500/20' : o.status === 'accepted' ? 'bg-green-500/20' : 'bg-surface'
                    }`}>
                      <DollarSign className={`size-3.5 ${
                        o.status === 'pending' ? 'text-yellow-400' : o.status === 'accepted' ? 'text-green-400' : 'text-muted-foreground'
                      }`} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-sm text-foreground">{o.listingTitle}</p>
                      <p className="font-body text-xs text-muted-foreground">
                        ${(o.amountCents / 100).toLocaleString()} &middot; {formatActivityTime(o.createdAt)}
                      </p>
                    </div>
                    <Badge variant="outline" className={`font-body text-[10px] capitalize ${
                      o.status === 'pending' ? 'text-yellow-400' : o.status === 'accepted' ? 'text-green-400' : ''
                    }`}>
                      {o.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CollapsibleWidget>

          {/* Subscription Card */}
          <CollapsibleWidget widgetKey="subscription" title="Subscription" icon={Crown}>
            <div className="space-y-4">
              <div>
                <p className="font-body font-medium text-foreground">
                  {TIER_LABELS[tier as keyof typeof TIER_LABELS]} Plan
                </p>
                <p className="mt-1 font-body text-xs text-muted-foreground">
                  {tier === 'free' ? 'Upgrade to unlock more features' : 'You have premium access'}
                </p>
              </div>
              <Separator />
              <div className="space-y-2 font-body text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Listings</span>
                  <span className="text-foreground">
                    {seller?.activeListingsCount ?? 0}/{limits.listings === Infinity ? '∞' : limits.listings}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Photos/listing</span>
                  <span className="text-foreground">{limits.photos}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Search radius</span>
                  <span className="text-foreground">
                    {limits.searchRadius === Infinity ? 'Unlimited' : `${limits.searchRadius} mi`}
                  </span>
                </div>
              </div>
              {tier === 'free' && (
                <>
                  <Separator />
                  <Button asChild className="w-full font-body">
                    <Link href="/pricing">Upgrade Plan</Link>
                  </Button>
                </>
              )}
            </div>
          </CollapsibleWidget>
        </div>
      )}

      {/* === DEMAND FORECAST (Seller AI) === */}
      {seller && seller.listingCategories.length > 0 && (
        <DemandForecast userCategories={seller.listingCategories} />
      )}

      {/* === BUYER WIDGETS === */}
      {buyer && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Active Transactions */}
          {buyer.activeTransactions.length > 0 && (
            <CollapsibleWidget widgetKey="buyer-transactions" title="Active Transactions" icon={ShoppingCart}>
              <div className="space-y-2">
                {buyer.activeTransactions.map((t) => (
                  <Link
                    key={t.id}
                    href={`/transactions/${t.id}`}
                    className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-sm font-medium text-foreground">{t.listingTitle}</p>
                      <p className="font-body text-xs text-muted-foreground">
                        ${(t.amountCents / 100).toLocaleString()}
                      </p>
                    </div>
                    <Badge variant="outline" className="font-body text-[10px] capitalize">
                      {t.status.replace('_', ' ')}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CollapsibleWidget>
          )}

          {/* Price Watches */}
          {buyer.priceWatches.length > 0 && (
            <CollapsibleWidget
              widgetKey="buyer-watchlist"
              title={`Watchlist ${buyer.priceDropCount > 0 ? `(${buyer.priceDropCount} drop${buyer.priceDropCount !== 1 ? 's' : ''})` : ''}`}
              icon={TrendingDown}
            >
              <div className="space-y-2">
                {buyer.priceWatches.map((w) => (
                  <Link
                    key={w.listingId}
                    href={`/listings/${w.listingId}`}
                    className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-sm text-foreground">{w.title}</p>
                      <div className="flex items-center gap-2 font-body text-xs">
                        {w.dropped ? (
                          <>
                            <span className="text-muted-foreground line-through">${(w.originalPrice / 100).toLocaleString()}</span>
                            <span className="text-green-400">${(w.currentPrice / 100).toLocaleString()}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">${(w.currentPrice / 100).toLocaleString()}</span>
                        )}
                        {w.targetPrice && (
                          <span className="text-secondary">Target: ${(w.targetPrice / 100).toLocaleString()}</span>
                        )}
                      </div>
                    </div>
                    {w.dropped && (
                      <Badge className="bg-green-500/20 font-body text-[10px] text-green-400">
                        <TrendingDown className="mr-1 size-3" />
                        Drop
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            </CollapsibleWidget>
          )}

          {/* Upcoming Viewings */}
          {buyer.upcomingViewings.length > 0 && (
            <CollapsibleWidget widgetKey="buyer-viewings" title="Upcoming Viewings" icon={CalendarDays}>
              <div className="space-y-2">
                {buyer.upcomingViewings.map((v) => (
                  <div key={v.id} className="flex items-center gap-3 rounded-lg p-2">
                    <CalendarDays className="size-4 shrink-0 text-secondary" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-sm text-foreground">{v.listingTitle}</p>
                      <p className="font-body text-xs text-muted-foreground">
                        {new Date(v.datetime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
                        {' '}at{' '}
                        {new Date(v.datetime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                      </p>
                    </div>
                    <Badge variant="outline" className={`font-body text-[10px] capitalize ${
                      v.status === 'accepted' ? 'text-green-400' : 'text-yellow-400'
                    }`}>
                      {v.status}
                    </Badge>
                  </div>
                ))}
              </div>
            </CollapsibleWidget>
          )}
        </div>
      )}

      {/* Performance Chart (Sellers) */}
      {analytics && (analytics.topListings.length > 0 || analytics.viewsByDay.some(d => d.views > 0)) && (
        <CollapsibleWidget widgetKey="performance" title="Listing Performance" icon={BarChart3}>
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
              <div>
                <p className="font-display text-2xl font-bold text-foreground">{analytics.totalViews.toLocaleString()}</p>
                <p className="font-body text-xs text-muted-foreground">Total Views</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-foreground">{analytics.totalFavorites.toLocaleString()}</p>
                <p className="font-body text-xs text-muted-foreground">Favorites</p>
              </div>
              <div>
                <p className="font-display text-2xl font-bold text-foreground">{analytics.totalInquiries.toLocaleString()}</p>
                <p className="font-body text-xs text-muted-foreground">Inquiries</p>
              </div>
            </div>

            <div>
              <p className="mb-3 font-body text-sm font-medium text-foreground">Views — Last 30 Days</p>
              <ViewsChart data={analytics.viewsByDay} />
            </div>

            {analytics.topListings.length > 0 && (
              <div>
                <p className="mb-3 font-body text-sm font-medium text-foreground">Top Performing</p>
                <div className="space-y-2">
                  {analytics.topListings.map((listing, i) => (
                    <Link
                      key={listing.id}
                      href={`/listings/${listing.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface"
                    >
                      <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20 font-body text-xs font-bold text-primary">
                        {i + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-body text-sm font-medium text-foreground">{listing.title}</p>
                        <div className="flex gap-3 font-body text-xs text-muted-foreground">
                          <span>{listing.views} views</span>
                          <span>{listing.favorites} favs</span>
                          <span className="text-primary">{listing.conversionRate.toFixed(1)}%</span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CollapsibleWidget>
      )}

      {/* Recommended for You */}
      {recommended.length > 0 && (
        <CollapsibleWidget widgetKey="recommended" title="Recommended for You" icon={Sparkles}>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {recommended.map((listing) => {
              const image = listing.listing_images?.sort((a, b) => a.position - b.position)[0]?.url
              return (
                <Link
                  key={listing.id}
                  href={`/listings/${listing.id}`}
                  className="group overflow-hidden rounded-lg border border-border bg-surface transition-colors hover:border-primary/50"
                >
                  <div className="aspect-[16/10] w-full overflow-hidden bg-card">
                    {image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={image} alt={listing.title} className="h-full w-full object-cover transition-transform group-hover:scale-105" />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <Package className="size-8 text-muted-foreground/40" />
                      </div>
                    )}
                  </div>
                  <div className="p-3">
                    <p className="truncate font-body text-sm font-medium text-foreground">{listing.title}</p>
                    <div className="mt-1 flex items-center justify-between">
                      <span className="font-display text-sm font-bold text-primary">
                        {listing.contact_for_price ? 'Contact' : listing.price_cents ? `$${(listing.price_cents / 100).toLocaleString()}` : 'N/A'}
                      </span>
                      <span className="font-body text-[10px] text-muted-foreground">{listing.category}</span>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </CollapsibleWidget>
      )}

      {/* Activity Feed */}
      {data.recentActivity.length > 0 && (
        <CollapsibleWidget widgetKey="activity-feed" title="Recent Activity" icon={Bell}>
          <div className="space-y-1">
            {data.recentActivity.map((activity: Tables<'notifications'>) => {
              const Icon = ACTIVITY_ICONS[activity.type] || Bell
              const color = ACTIVITY_COLORS[activity.type] || 'text-muted-foreground'
              return (
                <div key={activity.id} className="flex items-start gap-3 rounded-lg p-2 transition-colors hover:bg-surface">
                  <div className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-surface ${color}`}>
                    <Icon className="size-3.5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-sm text-foreground">{activity.title}</p>
                    <p className="line-clamp-1 font-body text-xs text-muted-foreground">{activity.body}</p>
                  </div>
                  <span className="shrink-0 font-body text-[10px] text-muted-foreground/70">
                    {formatActivityTime(activity.created_at)}
                  </span>
                </div>
              )
            })}
            <div className="pt-2 text-center">
              <Link href="/notifications" className="font-body text-xs text-primary hover:underline">
                View all notifications →
              </Link>
            </div>
          </div>
        </CollapsibleWidget>
      )}
    </div>
  )
}

// === Collapsible Widget Component ===
function CollapsibleWidget({
  widgetKey,
  title,
  icon: Icon,
  children,
}: {
  widgetKey: string
  title: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  const [expanded, setExpanded] = useState(() => {
    const state = getWidgetState()
    return state[widgetKey] !== false // default expanded
  })

  function toggle() {
    const next = !expanded
    setExpanded(next)
    setWidgetExpanded(widgetKey, next)
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader
        className="flex cursor-pointer flex-row items-center gap-2"
        onClick={toggle}
      >
        <Icon className="size-5 text-primary" />
        <CardTitle className="flex-1 font-display text-lg">{title}</CardTitle>
        <button className="rounded p-1 text-muted-foreground hover:text-foreground" aria-label={expanded ? 'Collapse' : 'Expand'}>
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </CardHeader>
      {expanded && <CardContent>{children}</CardContent>}
    </Card>
  )
}

// === Helper Components ===
function StatCard({
  icon: Icon,
  label,
  value,
  href,
  highlight,
}: {
  icon: React.ElementType
  label: string
  value: number
  href?: string
  highlight?: boolean
}) {
  const content = (
    <Card className={`border-border bg-card transition-colors ${href ? 'hover:border-primary/50' : ''}`}>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={`flex size-10 items-center justify-center rounded-lg ${highlight ? 'bg-primary/20' : 'bg-surface'}`}>
          <Icon className={`size-5 ${highlight ? 'text-primary' : 'text-muted-foreground'}`} />
        </div>
        <div>
          <p className="font-display text-2xl font-bold text-foreground">{value.toLocaleString()}</p>
          <p className="font-body text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
  return href ? <Link href={href}>{content}</Link> : content
}

function ViewsChart({ data }: { data: { date: string; views: number }[] }) {
  const maxViews = Math.max(...data.map((d) => d.views), 1)
  return (
    <div className="flex h-32 items-end gap-[2px] overflow-x-auto min-w-0">
      {data.map((day) => {
        const height = (day.views / maxViews) * 100
        const date = new Date(day.date + 'T12:00:00')
        const label = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        return (
          <div key={day.date} className="group relative flex-1" title={`${label}: ${day.views} views`}>
            <div
              className="w-full rounded-t bg-primary/60 transition-colors group-hover:bg-primary"
              style={{ height: `${Math.max(height, 2)}%` }}
            />
            <div className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded bg-card px-2 py-1 text-center shadow-lg group-hover:block">
              <p className="whitespace-nowrap font-body text-[10px] text-foreground">{day.views}</p>
            </div>
          </div>
        )
      })}
    </div>
  )
}

const ACTIVITY_ICONS: Record<string, React.ElementType> = {
  new_message: MessageSquare,
  listing_inquiry: MessageSquare,
  review_received: Star,
  listing_sold: Tag,
  price_drop_alert: TrendingDown,
  offer_received: DollarSign,
  offer_accepted: Check,
  offer_rejected: XIcon,
  offer_countered: DollarSign,
  transaction_initiated: ShoppingCart,
  transaction_update: Truck,
}

const ACTIVITY_COLORS: Record<string, string> = {
  new_message: 'text-blue-400',
  listing_inquiry: 'text-blue-400',
  review_received: 'text-yellow-400',
  listing_sold: 'text-green-400',
  price_drop_alert: 'text-primary',
  offer_received: 'text-green-400',
  offer_accepted: 'text-green-400',
  offer_rejected: 'text-red-400',
  offer_countered: 'text-yellow-400',
  transaction_initiated: 'text-secondary',
  transaction_update: 'text-secondary',
}

function formatActivityTime(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h`
  const days = Math.floor(hours / 24)
  return `${days}d`
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
