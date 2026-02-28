'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendEmail,
  newMessageEmail,
  listingInquiryEmail,
  getEmailPrefs,
} from '@/lib/email'
import { checkConversationLimit } from '@/app/actions/tier'

export async function sendMessage(conversationId: string, content: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  if (!content.trim() || content.length > 2000) {
    return { error: 'Message must be between 1 and 2000 characters' }
  }

  const admin = createAdminClient()

  // Verify user is part of this conversation
  const { data: conv } = await admin
    .from('conversations')
    .select('*, listing:listings(title)')
    .eq('id', conversationId)
    .single()

  if (!conv || (conv.buyer_id !== user.id && conv.seller_id !== user.id)) {
    return { error: 'Conversation not found' }
  }

  // Insert message
  const { data: message, error } = await admin
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: user.id,
      content: content.trim(),
    })
    .select()
    .single()

  if (error) {
    return { error: 'Failed to send message' }
  }

  // Send email notification to recipient (fire and forget)
  const recipientId =
    conv.buyer_id === user.id ? conv.seller_id : conv.buyer_id
  sendMessageNotificationEmail(
    admin,
    recipientId,
    user.id,
    (conv.listing as { title: string } | null)?.title || 'a listing',
    content.trim()
  ).catch(console.error)

  return { message }
}

async function sendMessageNotificationEmail(
  admin: ReturnType<typeof createAdminClient>,
  recipientId: string,
  senderId: string,
  listingTitle: string,
  messageContent: string
) {
  // Get recipient profile and check notification preferences
  const { data: recipient } = await admin
    .from('profiles')
    .select('full_name, email_notifications')
    .eq('id', recipientId)
    .single()

  if (!recipient) return

  const prefs = getEmailPrefs(recipient.email_notifications)
  if (!prefs.messages) return

  // Get recipient email from auth
  const { data: authData } = await admin.auth.admin.getUserById(recipientId)
  if (!authData?.user?.email) return

  // Get sender name
  const { data: sender } = await admin
    .from('profiles')
    .select('full_name, display_name')
    .eq('id', senderId)
    .single()

  const senderName =
    sender?.display_name || sender?.full_name || 'Someone'
  const recipientName = recipient.full_name || 'there'
  const preview =
    messageContent.length > 150
      ? messageContent.slice(0, 150) + '...'
      : messageContent

  const email = newMessageEmail(
    recipientName,
    senderName,
    listingTitle,
    preview,
    recipientId
  )
  await sendEmail({ to: authData.user.email, ...email })
}

export async function startConversation(listingId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { error: 'Not authenticated' }
  }

  const admin = createAdminClient()

  // Check for existing conversation
  const { data: existing } = await admin
    .from('conversations')
    .select('id')
    .eq('listing_id', listingId)
    .eq('buyer_id', user.id)
    .maybeSingle()

  if (existing) {
    return { conversationId: existing.id, isNew: false }
  }

  // Check conversation limit
  const limit = await checkConversationLimit()
  if (!limit.allowed) {
    return { error: limit.error || 'Conversation limit reached. Upgrade your plan.' }
  }

  // Get listing details
  const { data: listing } = await admin
    .from('listings')
    .select('seller_id, title')
    .eq('id', listingId)
    .single()

  if (!listing) {
    return { error: 'Listing not found' }
  }

  if (listing.seller_id === user.id) {
    return { error: 'Cannot message yourself' }
  }

  // Create new conversation
  const { data: conv, error } = await admin
    .from('conversations')
    .insert({
      listing_id: listingId,
      buyer_id: user.id,
      seller_id: listing.seller_id,
    })
    .select()
    .single()

  if (error) {
    return { error: 'Failed to start conversation' }
  }

  // Send inquiry email to seller (fire and forget)
  sendInquiryNotificationEmail(
    admin,
    listing.seller_id,
    user.id,
    listing.title
  ).catch(console.error)

  return { conversationId: conv.id, isNew: true }
}

async function sendInquiryNotificationEmail(
  admin: ReturnType<typeof createAdminClient>,
  sellerId: string,
  buyerId: string,
  listingTitle: string
) {
  // Get seller profile and check notification preferences
  const { data: seller } = await admin
    .from('profiles')
    .select('full_name, email_notifications')
    .eq('id', sellerId)
    .single()

  if (!seller) return

  const prefs = getEmailPrefs(seller.email_notifications)
  if (!prefs.inquiries) return

  // Get seller email from auth
  const { data: authData } = await admin.auth.admin.getUserById(sellerId)
  if (!authData?.user?.email) return

  // Get buyer name
  const { data: buyer } = await admin
    .from('profiles')
    .select('full_name, display_name')
    .eq('id', buyerId)
    .single()

  const buyerName = buyer?.display_name || buyer?.full_name || 'Someone'
  const sellerName = seller.full_name || 'there'

  const email = listingInquiryEmail(sellerName, buyerName, listingTitle, sellerId)
  await sendEmail({ to: authData.user.email, ...email })
}
