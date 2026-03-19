'use client'

import { useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from '@/app/actions/notifications'
import { useNotificationSound } from '@/hooks/use-notification-sound'
import type { Tables } from '@/types/database'

type Notification = Tables<'notifications'>

// Notification types that trigger high-priority sound
const HIGH_PRIORITY_TYPES = new Set([
  'sos_request_match',
])

function isHighPriority(notification: Notification): boolean {
  if (HIGH_PRIORITY_TYPES.has(notification.type)) return true

  const data = notification.data as Record<string, unknown> | null
  if (!data) return false

  // Critical urgency SOS
  if (notification.type.startsWith('sos_') && data.urgency === 'critical') return true

  // High-value offer (> $10,000)
  if (notification.type === 'offer_received') {
    const amount = Number(data.offer_amount || data.amount || 0)
    if (amount > 10000) return true
  }

  return false
}

export function useNotifications() {
  const { user } = useAuthStore()
  const { setUnreadNotifications, incrementUnreadNotifications } = useUIStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const { playStandard, playHighPriority, acknowledgeAlert, acknowledgeAllAlerts } =
    useNotificationSound()

  const loadNotifications = useCallback(async () => {
    const result = await getNotifications(20)
    if ('notifications' in result && result.notifications) {
      setNotifications(result.notifications)
    }
    const countResult = await getUnreadNotificationCount()
    setUnreadNotifications(countResult.count)
    setLoading(false)
  }, [setUnreadNotifications])

  // Initial load
  useEffect(() => {
    if (!user) return
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    loadNotifications()
  }, [user, loadNotifications])

  // Realtime subscription
  useEffect(() => {
    if (!user) return

    const supabase = createClient()
    const channel = supabase
      .channel('notifications-realtime')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification
          setNotifications((prev) => [newNotification, ...prev])
          incrementUnreadNotifications()

          // Play appropriate sound
          if (isHighPriority(newNotification)) {
            playHighPriority(newNotification.id)
          } else {
            playStandard()
          }
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, setUnreadNotifications, incrementUnreadNotifications, playStandard, playHighPriority])

  const markRead = useCallback(async (id: string) => {
    await markNotificationRead(id)
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      )
    )
    acknowledgeAlert(id)
    const countResult = await getUnreadNotificationCount()
    setUnreadNotifications(countResult.count)
  }, [setUnreadNotifications, acknowledgeAlert])

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead()
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    )
    acknowledgeAllAlerts()
    setUnreadNotifications(0)
  }, [setUnreadNotifications, acknowledgeAllAlerts])

  return {
    notifications,
    loading,
    markRead,
    markAllRead,
    refresh: loadNotifications,
  }
}
