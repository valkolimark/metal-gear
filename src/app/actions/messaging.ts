'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

const ALLOWED_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
]

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

// ── Attachments ──

export async function uploadMessageAttachment(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const file = formData.get('file') as File | null
  const messageId = formData.get('messageId') as string | null

  if (!file || !messageId) return { error: 'Missing file or messageId' }

  if (!ALLOWED_TYPES.includes(file.type)) {
    return { error: 'File type not allowed. Supported: images, PDFs, Word, Excel, CSV, text' }
  }

  if (file.size > MAX_FILE_SIZE) {
    return { error: 'File too large. Maximum size is 10MB' }
  }

  const admin = createAdminClient()

  // Verify user is part of the conversation that owns this message
  const { data: message } = await admin
    .from('messages')
    .select('conversation_id')
    .eq('id', messageId)
    .single()

  if (!message) return { error: 'Message not found' }

  const { data: conv } = await admin
    .from('conversations')
    .select('id')
    .eq('id', message.conversation_id)
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
    .single()

  if (!conv) return { error: 'Not authorized' }

  // Upload to R2
  const { uploadMessageAttachmentFile } = await import('@/lib/media')
  const buffer = Buffer.from(await file.arrayBuffer())

  let fileUrl: string
  try {
    fileUrl = await uploadMessageAttachmentFile(buffer, user.id, messageId, file.type)
  } catch {
    return { error: 'Failed to upload file' }
  }

  // Insert attachment record
  const { data: attachment, error: insertError } = await admin
    .from('message_attachments')
    .insert({
      message_id: messageId,
      file_url: fileUrl,
      file_name: file.name,
      file_type: file.type,
      file_size_bytes: file.size,
    })
    .select()
    .single()

  if (insertError) return { error: 'Failed to save attachment record' }

  return { attachment }
}

export async function getMessageAttachments(messageIds: string[]) {
  if (messageIds.length === 0) return { attachments: [] }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('message_attachments')
    .select('*')
    .in('message_id', messageIds)

  if (error) return { error: error.message }
  return { attachments: data || [] }
}

// ── Reply Templates ──

export async function getReplyTemplates() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('reply_templates')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { templates: data || [] }
}

export async function createReplyTemplate(name: string, body: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!name.trim() || !body.trim()) return { error: 'Name and body are required' }
  if (name.length > 100) return { error: 'Name must be under 100 characters' }
  if (body.length > 2000) return { error: 'Body must be under 2000 characters' }

  const admin = createAdminClient()

  // Limit to 20 templates
  const { count } = await admin
    .from('reply_templates')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)

  if ((count ?? 0) >= 20) return { error: 'Maximum 20 templates allowed' }

  const { data, error } = await admin
    .from('reply_templates')
    .insert({ user_id: user.id, name: name.trim(), body: body.trim() })
    .select()
    .single()

  if (error) return { error: error.message }
  return { template: data }
}

export async function updateReplyTemplate(templateId: string, name: string, body: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!name.trim() || !body.trim()) return { error: 'Name and body are required' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('reply_templates')
    .update({ name: name.trim(), body: body.trim() })
    .eq('id', templateId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function deleteReplyTemplate(templateId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()
  const { error } = await admin
    .from('reply_templates')
    .delete()
    .eq('id', templateId)
    .eq('user_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

// ── Message Search ──

export async function searchMessages(query: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  if (!query.trim() || query.length < 2) return { error: 'Search query must be at least 2 characters' }

  const admin = createAdminClient()

  // Get user's conversation IDs
  const { data: convs } = await admin
    .from('conversations')
    .select('id')
    .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)

  if (!convs || convs.length === 0) return { results: [] }

  const convIds = convs.map((c) => c.id)

  // Search messages in those conversations
  const { data: messages, error } = await admin
    .from('messages')
    .select('*, conversations!messages_conversation_id_fkey(listing_id, buyer_id, seller_id)')
    .in('conversation_id', convIds)
    .ilike('content', `%${query.trim()}%`)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return { error: error.message }
  return { results: messages || [] }
}

// ── Send message with attachment ──

export async function sendMessageWithAttachment(conversationId: string, content: string, formData?: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  // Import sendMessage dynamically to avoid circular deps
  const { sendMessage } = await import('@/app/(main-new-nav)/messages/actions')

  // Send the text message first
  const messageContent = content.trim() || '📎 Attachment'
  const result = await sendMessage(conversationId, messageContent)
  if (result.error || !result.message) return { error: result.error || 'Failed to send message' }

  // If there's a file, upload it
  if (formData?.get('file')) {
    formData.set('messageId', result.message.id)
    const attachResult = await uploadMessageAttachment(formData)
    if (attachResult.error) {
      return { message: result.message, attachmentError: attachResult.error }
    }
    return { message: result.message, attachment: attachResult.attachment }
  }

  return { message: result.message }
}
