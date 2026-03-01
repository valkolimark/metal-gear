'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import webpush from 'web-push'

// Configure web-push with VAPID keys
const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || ''
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || ''

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(
    'mailto:support@metal-gear-five.vercel.app',
    VAPID_PUBLIC_KEY,
    VAPID_PRIVATE_KEY
  )
}

export async function subscribeToPush(subscription: {
  endpoint: string
  keys: { p256dh: string; auth: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('push_subscriptions')
    .upsert({
      user_id: user.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    }, { onConflict: 'user_id,endpoint' })

  if (error) return { error: error.message }
  return { success: true }
}

export async function unsubscribeFromPush(endpoint: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('push_subscriptions')
    .delete()
    .eq('user_id', user.id)
    .eq('endpoint', endpoint)

  if (error) return { error: error.message }
  return { success: true }
}

export async function getPushSubscriptionStatus() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { subscribed: false }

  const admin = createAdminClient()
  const { count } = await admin
    .from('push_subscriptions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  return { subscribed: (count ?? 0) > 0 }
}

/**
 * Send a push notification to a user (called from other server actions)
 */
export async function sendPushNotification(
  userId: string,
  payload: {
    title: string
    body: string
    tag?: string
    data?: Record<string, string>
  }
) {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return

  const admin = createAdminClient()

  // Check user notification preferences
  const { data: profile } = await admin
    .from('profiles')
    .select('notification_preferences')
    .eq('id', userId)
    .single()

  const prefs = profile?.notification_preferences as Record<string, string> | null
  const notifType = payload.data?.type || ''

  // Check if push is disabled for this notification category
  if (prefs) {
    const category = getCategoryFromType(notifType)
    const pref = prefs[category]
    if (pref === 'email' || pref === 'none') return
  }

  const { data: subscriptions } = await admin
    .from('push_subscriptions')
    .select('endpoint, p256dh, auth')
    .eq('user_id', userId)

  if (!subscriptions || subscriptions.length === 0) return

  const message = JSON.stringify(payload)

  for (const sub of subscriptions) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        message
      )
    } catch (err: unknown) {
      // If subscription is expired/invalid, remove it
      const statusCode = (err as { statusCode?: number })?.statusCode
      if (statusCode === 404 || statusCode === 410) {
        await admin
          .from('push_subscriptions')
          .delete()
          .eq('endpoint', sub.endpoint)
          .eq('user_id', userId)
      }
    }
  }
}

function getCategoryFromType(type: string): string {
  if (type.startsWith('new_message') || type === 'listing_inquiry') return 'messages'
  if (type.startsWith('offer_')) return 'offers'
  if (type.startsWith('transaction_') || type.startsWith('dispute_')) return 'transactions'
  if (type.startsWith('review_') || type === 'listing_sold') return 'activity'
  if (type === 'viewing_response') return 'viewings'
  return 'general'
}

export async function getNotificationPreferences() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data } = await admin
    .from('profiles')
    .select('notification_preferences, email_notifications')
    .eq('id', user.id)
    .single()

  return {
    preferences: (data?.notification_preferences || {}) as Record<string, string>,
    emailPrefs: (data?.email_notifications || {}) as Record<string, boolean>,
  }
}

export async function updateNotificationPreferencesV2(
  preferences: Record<string, string>
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('profiles')
    .update({ notification_preferences: preferences })
    .eq('id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}
