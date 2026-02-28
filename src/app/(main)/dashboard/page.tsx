'use client'

import { useEffect, useState } from 'react'
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
  Crown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { TIER_LABELS, TIER_LIMITS } from '@/lib/constants'
import type { Tables } from '@/types/database'

type Listing = Tables<'listings'>

interface DashboardStats {
  activeListings: number
  totalViews: number
  unreadMessages: number
  favoritesReceived: number
}

export default function DashboardPage() {
  const { user, profile } = useAuthStore()
  const tier = profile?.subscription_tier ?? 'free'
  const limits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS]

  const [stats, setStats] = useState<DashboardStats>({
    activeListings: 0,
    totalViews: 0,
    unreadMessages: 0,
    favoritesReceived: 0,
  })
  const [recentListings, setRecentListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const supabase = createClient()

    async function loadDashboard() {
      const [listingsRes, unreadRes, allListingsRes] = await Promise.all([
        // Active listings with aggregate stats
        supabase
          .from('listings')
          .select('*')
          .eq('seller_id', user!.id)
          .eq('status', 'active'),
        // Unread messages
        supabase
          .from('messages')
          .select('id, conversation_id', { count: 'exact' })
          .neq('sender_id', user!.id)
          .is('read_at', null),
        // All user listings for recent activity
        supabase
          .from('listings')
          .select('*')
          .eq('seller_id', user!.id)
          .order('updated_at', { ascending: false })
          .limit(5),
      ])

      const activeListings = (listingsRes.data ?? []) as Listing[]
      const totalViews = activeListings.reduce(
        (sum, l) => sum + (l.views_count || 0),
        0
      )
      const favoritesReceived = activeListings.reduce(
        (sum, l) => sum + (l.favorites_count || 0),
        0
      )

      // Filter unread to only messages in user's conversations
      let unreadCount = 0
      if (unreadRes.data && unreadRes.data.length > 0) {
        const convIds = [...new Set(unreadRes.data.map((m) => m.conversation_id))]
        const { count } = await supabase
          .from('conversations')
          .select('id', { count: 'exact' })
          .in('id', convIds)
          .or(`buyer_id.eq.${user!.id},seller_id.eq.${user!.id}`)
        unreadCount = count ?? 0
      }

      setStats({
        activeListings: activeListings.length,
        totalViews,
        unreadMessages: unreadRes.count ?? 0,
        favoritesReceived,
      })

      setRecentListings((allListingsRes.data ?? []) as Listing[])
      setLoading(false)
    }

    loadDashboard()
  }, [user])

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  const greeting = getGreeting()

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Welcome */}
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          {greeting},{' '}
          {profile?.display_name || profile?.full_name?.split(' ')[0] || 'there'}
        </h1>
        <p className="mt-1 font-body text-muted-foreground">
          Here&rsquo;s what&rsquo;s happening with your listings
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Package}
          label="Active Listings"
          value={stats.activeListings}
          href="/listings"
        />
        <StatCard
          icon={Eye}
          label="Total Views"
          value={stats.totalViews}
        />
        <StatCard
          icon={MessageSquare}
          label="Unread Messages"
          value={stats.unreadMessages}
          href="/messages"
          highlight={stats.unreadMessages > 0}
        />
        <StatCard
          icon={Heart}
          label="Favorites Received"
          value={stats.favoritesReceived}
        />
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Link href="/listings/new">
          <Card className="border-border bg-card transition-colors hover:border-primary/50">
            <CardContent className="flex items-center gap-4 p-5">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary/20">
                <Plus className="size-5 text-primary" />
              </div>
              <div>
                <p className="font-body font-medium text-foreground">
                  Create Listing
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  {stats.activeListings}/{limits.listings} listings used
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
                <p className="font-body font-medium text-foreground">
                  Browse Equipment
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  Find deals near you
                </p>
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
                <p className="font-body font-medium text-foreground">
                  View Messages
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  {stats.unreadMessages > 0
                    ? `${stats.unreadMessages} unread`
                    : 'All caught up'}
                </p>
              </div>
              <ArrowRight className="ml-auto size-4 text-muted-foreground" />
            </CardContent>
          </Card>
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Recent Listings */}
        <div className="lg:col-span-2">
          <Card className="border-border bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="font-display text-lg">
                Recent Listings
              </CardTitle>
              <Button variant="ghost" size="sm" asChild className="font-body">
                <Link href="/listings">
                  View all
                  <ArrowRight className="ml-1 size-3" />
                </Link>
              </Button>
            </CardHeader>
            <CardContent>
              {recentListings.length === 0 ? (
                <p className="py-8 text-center font-body text-sm text-muted-foreground">
                  No listings yet. Create your first one!
                </p>
              ) : (
                <div className="space-y-3">
                  {recentListings.map((listing) => (
                    <Link
                      key={listing.id}
                      href={`/listings/${listing.id}`}
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-surface"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-body text-sm font-medium text-foreground">
                          {listing.title}
                        </p>
                        <p className="font-body text-xs text-muted-foreground">
                          {listing.category} &middot;{' '}
                          {listing.views_count} views &middot;{' '}
                          {listing.favorites_count} favs
                        </p>
                      </div>
                      <Badge
                        variant="outline"
                        className={`shrink-0 font-body text-[10px] ${
                          listing.status === 'active'
                            ? 'border-green-500/50 text-green-400'
                            : listing.status === 'draft'
                              ? 'border-yellow-500/50 text-yellow-400'
                              : ''
                        }`}
                      >
                        {listing.status}
                      </Badge>
                    </Link>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Subscription Card */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Crown className="size-5 text-primary" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="font-body font-medium text-foreground">
                {TIER_LABELS[tier as keyof typeof TIER_LABELS]} Plan
              </p>
              <p className="mt-1 font-body text-xs text-muted-foreground">
                {tier === 'free'
                  ? 'Upgrade to unlock more features'
                  : 'You have premium access'}
              </p>
            </div>

            <Separator />

            <div className="space-y-2 font-body text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Listings</span>
                <span className="text-foreground">
                  {stats.activeListings}/{limits.listings === Infinity ? '∞' : limits.listings}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Photos per listing</span>
                <span className="text-foreground">{limits.photos}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Search radius</span>
                <span className="text-foreground">
                  {limits.searchRadius === Infinity
                    ? 'Unlimited'
                    : `${limits.searchRadius} mi`}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Conversations</span>
                <span className="text-foreground">
                  {limits.conversations === Infinity
                    ? 'Unlimited'
                    : limits.conversations}
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
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

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
    <Card
      className={`border-border bg-card transition-colors ${
        href ? 'hover:border-primary/50' : ''
      }`}
    >
      <CardContent className="flex items-center gap-4 p-5">
        <div
          className={`flex size-10 items-center justify-center rounded-lg ${
            highlight ? 'bg-primary/20' : 'bg-surface'
          }`}
        >
          <Icon
            className={`size-5 ${
              highlight ? 'text-primary' : 'text-muted-foreground'
            }`}
          />
        </div>
        <div>
          <p className="font-display text-2xl font-bold text-foreground">
            {value.toLocaleString()}
          </p>
          <p className="font-body text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )

  return href ? <Link href={href}>{content}</Link> : content
}

function getGreeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 17) return 'Good afternoon'
  return 'Good evening'
}
