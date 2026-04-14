'use client'

import { useState } from 'react'
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
  Siren,
  MessageCircle,
  AtSign,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useUIStore } from '@/stores/ui-store'
import { useNotifications } from '@/hooks/use-notifications'
import {
  NotificationEducationModal,
  useNotificationEducation,
} from '@/components/notification-education-modal'
import type { Tables } from '@/types/database'

type Notification = Tables<'notifications'>

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
  sos_request_match: Siren,
  sos_response_received: Siren,
  sos_response_accepted: Siren,
  sos_expired: Siren,
  sos_fulfilled: Siren,
  post_comment: MessageCircle,
  post_mention: AtSign,
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
  sos_request_match: 'text-red-500',
  sos_response_received: 'text-[#FF6B2B]',
  sos_response_accepted: 'text-green-400',
  sos_expired: 'text-muted-foreground',
  sos_fulfilled: 'text-green-400',
  post_comment: 'text-blue-400',
  post_mention: 'text-primary',
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor(
    (Date.now() - new Date(dateStr).getTime()) / 1000
  )
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

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
    case 'sos_response_received':
      return data.sos_id ? `/sos/${data.sos_id}?tab=responses` : '/sos'
    case 'sos_request_match':
    case 'sos_response_accepted':
    case 'sos_expired':
    case 'sos_fulfilled':
      return data.sos_id ? `/sos/${data.sos_id}` : '/sos'
    default:
      return null
  }
}

export function NotificationDropdown() {
  const [open, setOpen] = useState(false)
  const { unreadNotifications } = useUIStore()
  const { notifications, loading, markRead, markAllRead } = useNotifications()
  const {
    showModal,
    setShowModal,
    triggerIfNeeded,
    notificationPermission,
  } = useNotificationEducation()

  const handleBellClick = () => {
    if (!open) {
      // On first open, trigger education modal if needed
      triggerIfNeeded()
    }
    setOpen(!open)
  }

  return (
    <div className="relative">
      <Button
        variant="ghost"
        size="icon"
        className="relative"
        onClick={handleBellClick}
      >
        <Bell className="size-5" />
        {unreadNotifications > 0 && (
          <Badge className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full p-0 text-[10px]">
            {unreadNotifications > 9 ? '9+' : unreadNotifications}
          </Badge>
        )}
        <span className="sr-only">Notifications</span>
      </Button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />

          {/* Dropdown */}
          <div className="absolute right-0 top-full z-50 mt-2 w-80 overflow-hidden rounded-lg border border-border bg-card shadow-xl sm:w-96">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <h3 className="font-display text-sm font-semibold text-foreground">
                Notifications
              </h3>
              {unreadNotifications > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-auto px-2 py-1 font-body text-xs text-primary hover:text-primary"
                  onClick={() => markAllRead()}
                >
                  <CheckCheck className="mr-1 size-3" />
                  Mark all read
                </Button>
              )}
            </div>

            <Separator />

            {/* Notification opt-in nudge */}
            {notificationPermission === 'default' && (
              <button
                onClick={() => {
                  setShowModal(true)
                  setOpen(false)
                }}
                className="flex w-full items-center gap-2 border-b border-border bg-primary/5 px-4 py-2.5 text-left transition-colors hover:bg-primary/10"
              >
                <Bell className="size-4 shrink-0 text-primary" />
                <span className="flex-1 font-body text-xs text-foreground">
                  Enable notifications to get real-time SOS alerts
                </span>
                <span className="shrink-0 rounded-md bg-primary px-2 py-0.5 font-body text-[10px] font-medium text-primary-foreground">
                  Enable
                </span>
              </button>
            )}

            {/* View All link */}
            <div className="px-4 pb-2">
              <Link
                href="/notifications"
                onClick={() => setOpen(false)}
                className="font-body text-xs text-primary hover:underline"
              >
                View all notifications →
              </Link>
            </div>

            {/* Notification list */}
            <div className="max-h-[400px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="size-5 animate-spin text-muted-foreground" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-8 text-center">
                  <Bell className="mx-auto mb-2 size-8 text-muted-foreground/40" />
                  <p className="font-body text-sm text-muted-foreground">
                    No notifications yet
                  </p>
                </div>
              ) : (
                notifications.map((notification) => {
                  const Icon =
                    NOTIFICATION_ICONS[notification.type] || Bell
                  const color =
                    NOTIFICATION_COLORS[notification.type] ||
                    'text-muted-foreground'
                  const href = getNotificationHref(notification)
                  const isUnread = !notification.read_at

                  const isSos = notification.type.startsWith('sos_')
                  const isSosResponse = notification.type === 'sos_response_received'

                  const content = (
                    <div
                      className={`flex gap-3 px-4 py-3 transition-colors hover:bg-surface ${
                        isUnread
                          ? isSosResponse
                            ? 'border-l-2 border-[#FF6B2B] bg-[#FF6B2B]/5'
                            : isSos
                              ? 'border-l-2 border-red-500 bg-red-500/5'
                              : 'bg-primary/5'
                          : ''
                      }`}
                      onClick={() => {
                        if (isUnread) markRead(notification.id)
                        if (href) setOpen(false)
                      }}
                    >
                      <div
                        className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full bg-surface ${color}`}
                      >
                        <Icon className="size-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p
                          className={`font-body text-sm ${
                            isUnread
                              ? 'font-medium text-foreground'
                              : 'text-muted-foreground'
                          }`}
                        >
                          {notification.title}
                        </p>
                        <p className="line-clamp-2 font-body text-xs text-muted-foreground">
                          {notification.body}
                        </p>
                        <p className="mt-1 font-body text-[10px] text-muted-foreground/70">
                          {timeAgo(notification.created_at)}
                        </p>
                      </div>
                      {isUnread && (
                        <div className="mt-2 size-2 shrink-0 rounded-full bg-primary" />
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
                })
              )}
            </div>
          </div>
        </>
      )}

      {/* Education modal */}
      <NotificationEducationModal
        open={showModal}
        onOpenChange={setShowModal}
      />
    </div>
  )
}
