'use client'

import { useState, useEffect } from 'react'
import { Bell, BellOff, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { toast } from 'sonner'
import { subscribeToPush, unsubscribeFromPush, getPushSubscriptionStatus } from '@/app/actions/push'

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = window.atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray.buffer as ArrayBuffer
}

export function PushNotificationToggle() {
  const [supported, setSupported] = useState(false)
  const [subscribed, setSubscribed] = useState(false)
  const [loading, setLoading] = useState(true)
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    const checkSupport = async () => {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        setLoading(false)
        return
      }
      setSupported(true)

      // Check if already subscribed
      const status = await getPushSubscriptionStatus()
      setSubscribed(status.subscribed)
      setLoading(false)
    }

    checkSupport()
  }, [])

  const handleToggle = async () => {
    setToggling(true)
    try {
      if (subscribed) {
        // Unsubscribe
        const registration = await navigator.serviceWorker.ready
        const subscription = await registration.pushManager.getSubscription()
        if (subscription) {
          await unsubscribeFromPush(subscription.endpoint)
          await subscription.unsubscribe()
        }
        setSubscribed(false)
        toast.success('Push notifications disabled')
      } else {
        // Subscribe
        const permission = await Notification.requestPermission()
        if (permission !== 'granted') {
          toast.error('Notification permission denied')
          setToggling(false)
          return
        }

        const registration = await navigator.serviceWorker.register('/sw.js')
        await navigator.serviceWorker.ready

        const vapidKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
        if (!vapidKey) {
          toast.error('Push notifications not configured')
          setToggling(false)
          return
        }

        const subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidKey),
        })

        const json = subscription.toJSON()
        await subscribeToPush({
          endpoint: json.endpoint!,
          keys: {
            p256dh: json.keys!.p256dh!,
            auth: json.keys!.auth!,
          },
        })

        setSubscribed(true)
        toast.success('Push notifications enabled')
      }
    } catch (err) {
      console.error('Push toggle error:', err)
      toast.error('Failed to update push notifications')
    } finally {
      setToggling(false)
    }
  }

  if (loading) return null
  if (!supported) return null

  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center justify-between p-4">
        <div className="flex items-center gap-3">
          {subscribed ? (
            <div className="flex size-9 items-center justify-center rounded-full bg-green-500/20">
              <Bell className="size-4 text-green-400" />
            </div>
          ) : (
            <div className="flex size-9 items-center justify-center rounded-full bg-surface">
              <BellOff className="size-4 text-muted-foreground" />
            </div>
          )}
          <div>
            <p className="font-body text-sm font-medium text-foreground">
              Push Notifications
            </p>
            <p className="font-body text-xs text-muted-foreground">
              {subscribed
                ? 'You\'ll receive instant notifications in your browser'
                : 'Get notified about messages, offers, and updates'}
            </p>
          </div>
        </div>
        <Button
          variant={subscribed ? 'outline' : 'default'}
          size="sm"
          onClick={handleToggle}
          disabled={toggling}
          className="font-body"
        >
          {toggling ? (
            <Loader2 className="size-4 animate-spin" />
          ) : subscribed ? (
            'Disable'
          ) : (
            'Enable'
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
