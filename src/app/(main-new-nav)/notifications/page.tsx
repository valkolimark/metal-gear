'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import {
  Bell,
  MessageSquare,
  Star,
  Tag,
  TrendingDown,
  DollarSign,
  Check,
  CheckCheck,
  X,
  Loader2,
  Filter,
  AlertTriangle,
  Truck,
  CalendarDays,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/auth-store'
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/app/actions/notifications'
import type { Tables } from '@/types/database'
import { PushNotificationToggle } from '@/components/notifications/push-toggle'

type Notification = Tables<'notifications'>

type FilterType = 'all' | 'unread' | 'messages' | 'offers' | 'transactions'

const NOTIFICATION_ICONS: Record<string, React.ElementType> = {
  new_message: MessageSquare,
  listing_inquiry: MessageSquare,
  review_received: Star,
  listing_sold: Tag,
  price_drop_alert: TrendingDown,
  offer_received: DollarSign,
  offer_accepted: Check,
  offer_rejected: X,
  offer_countered: DollarSign,
  transaction_initiated: Truck,
  transaction_update: Truck,
  dispute_opened: AlertTriangle,
  dispute_response: AlertTriangle,
  dispute_resolved: Check,
  viewing_response: CalendarDays,
}

const NOTIFICATION_COLORS: Record<string, string> = {
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
  dispute_opened: 'text-red-400',
  dispute_response: 'text-yellow-400',
  dispute_resolved: 'text-green-400',
  viewing_response: 'text-secondary',
}

const FILTER_OPTIONS: { key: FilterType; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
  { key: 'messages', label: 'Messages' },
  { key: 'offers', label: 'Offers' },
  { key: 'transactions', label: 'Transactions' },
]

function getNotificationHref(notification: Notification): string | null {
  const data = notification.data as Record<string, string> | null
  if (!data) return null

  switch (notification.type) {
    case 'new_message':
    case 'listing_inquiry':
      return '/messages'
    case 'review_received':
      return data.seller_id ? `/profile/${data.seller_id}` : null
    case 'listing_sold':
    case 'price_drop_alert':
      return data.listing_id ? `/listings/${data.listing_id}` : null
    case 'offer_received':
    case 'offer_accepted':
    case 'offer_rejected':
    case 'offer_countered':
      return data.listing_id ? `/listings/${data.listing_id}` : null
    case 'transaction_initiated':
    case 'transaction_update':
    case 'dispute_opened':
    case 'dispute_response':
    case 'dispute_resolved':
      return data.transaction_id ? `/transactions/${data.transaction_id}` : '/transactions'
    case 'viewing_response':
      return '/schedule'
    default:
      return null
  }
}

function matchesFilter(notification: Notification, filter: FilterType): boolean {
  if (filter === 'all') return true
  if (filter === 'unread') return !notification.read_at
  if (filter === 'messages') return ['new_message', 'listing_inquiry'].includes(notification.type)
  if (filter === 'offers') return notification.type.startsWith('offer_')
  if (filter === 'transactions') return ['transaction_initiated', 'transaction_update', 'dispute_opened', 'dispute_response', 'dispute_resolved'].includes(notification.type)
  return true
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function NotificationsPage() {
  const { user } = useAuthStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<FilterType>('all')
  const [hasMore, setHasMore] = useState(true)

  const loadNotifications = useCallback(async () => {
    const result = await getNotifications(100)
    if ('notifications' in result && result.notifications) {
      setNotifications(result.notifications)
      setHasMore(result.notifications.length >= 100)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    if (!user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    loadNotifications()
  }, [user, loadNotifications])

  const handleMarkRead = async (id: string) => {
    await markNotificationRead(id)
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
    )
  }

  const handleMarkAllRead = async () => {
    await markAllNotificationsRead()
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    )
  }

  const loadMore = async () => {
    const result = await getNotifications(100, notifications.length)
    if ('notifications' in result && result.notifications) {
      setNotifications((prev) => [...prev, ...result.notifications])
      setHasMore(result.notifications.length >= 100)
    }
  }

  const filtered = notifications.filter((n) => matchesFilter(n, filter))
  const unreadCount = notifications.filter((n) => !n.read_at).length

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Notifications
          </h1>
          <p className="mt-1 font-body text-muted-foreground">
            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up'}
          </p>
        </div>
        {unreadCount > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleMarkAllRead}
            className="font-body"
          >
            <CheckCheck className="mr-1.5 size-4" />
            Mark all read
          </Button>
        )}
      </div>

      {/* Push Notification Toggle */}
      <PushNotificationToggle />

      {/* Filters */}
      <div className="flex items-center gap-2">
        <Filter className="size-4 text-muted-foreground" />
        {FILTER_OPTIONS.map((opt) => (
          <button
            key={opt.key}
            onClick={() => setFilter(opt.key)}
            className={`rounded-full px-3 py-1 font-body text-xs transition-colors ${
              filter === opt.key
                ? 'bg-primary text-white'
                : 'bg-surface text-muted-foreground hover:bg-surface/80 hover:text-foreground'
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      {/* Notification List */}
      {filtered.length === 0 ? (
        <Card className="bg-card">
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <Bell className="size-12 text-muted-foreground/30" />
            <p className="font-display text-lg font-semibold text-foreground">
              {filter === 'all'
                ? 'No notifications yet'
                : `No ${filter} notifications`}
            </p>
            <p className="font-body text-sm text-muted-foreground max-w-sm">
              You&rsquo;ll be notified about new messages, SOS matches, price drops, and offer updates.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="bg-card">
          <CardContent className="divide-y divide-border p-0">
            {filtered.map((notification) => {
              const Icon = NOTIFICATION_ICONS[notification.type] || Bell
              const color = NOTIFICATION_COLORS[notification.type] || 'text-muted-foreground'
              const href = getNotificationHref(notification)
              const isUnread = !notification.read_at

              const content = (
                <div
                  className={`flex gap-3 px-4 py-3 transition-colors hover:bg-surface ${
                    isUnread ? 'bg-primary/5' : ''
                  }`}
                  onClick={() => {
                    if (isUnread) handleMarkRead(notification.id)
                  }}
                >
                  <div
                    className={`mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-surface ${color}`}
                  >
                    <Icon className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p
                      className={`font-body text-sm ${
                        isUnread ? 'font-medium text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {notification.title}
                    </p>
                    <p className="mt-0.5 line-clamp-2 font-body text-xs text-muted-foreground">
                      {notification.body}
                    </p>
                    <div className="mt-1.5 flex items-center gap-2">
                      <span className="font-body text-[10px] text-muted-foreground/70">
                        {timeAgo(notification.created_at)}
                      </span>
                      <Badge
                        variant="outline"
                        className="font-body text-[9px] capitalize"
                      >
                        {notification.type.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                  </div>
                  {isUnread && (
                    <div className="mt-2 size-2.5 shrink-0 rounded-full bg-primary" />
                  )}
                </div>
              )

              return href ? (
                <Link key={notification.id} href={href}>
                  {content}
                </Link>
              ) : (
                <div key={notification.id}>{content}</div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* Load More */}
      {hasMore && filtered.length >= 20 && (
        <div className="flex justify-center">
          <Button variant="outline" onClick={loadMore} className="font-body">
            Load more
          </Button>
        </div>
      )}
    </div>
  )
}
