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
import type { Tables } from '@/types/database'

type Notification = Tables<'notifications'>

export function useNotifications() {
  const { user } = useAuthStore()
  const { setUnreadNotifications, incrementUnreadNotifications } = useUIStore()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)

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
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [user, setUnreadNotifications, incrementUnreadNotifications])

  const markRead = useCallback(async (id: string) => {
    await markNotificationRead(id)
    setNotifications((prev) =>
      prev.map((n) =>
        n.id === id ? { ...n, read_at: new Date().toISOString() } : n
      )
    )
    const countResult = await getUnreadNotificationCount()
    setUnreadNotifications(countResult.count)
  }, [setUnreadNotifications])

  const markAllRead = useCallback(async () => {
    await markAllNotificationsRead()
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    )
    setUnreadNotifications(0)
  }, [setUnreadNotifications])

  return {
    notifications,
    loading,
    markRead,
    markAllRead,
    refresh: loadNotifications,
  }
}
