'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'
import { escapePostgrestValue } from '@/lib/security/sanitize'

const CATEGORIES = [
  { key: 'getting_started', label: 'Getting Started' },
  { key: 'buying', label: 'Buying' },
  { key: 'selling', label: 'Selling' },
  { key: 'payments', label: 'Payments' },
  { key: 'shipping', label: 'Shipping' },
  { key: 'account', label: 'Account' },
  { key: 'safety', label: 'Safety' },
]

export async function getHelpArticles() {
  const admin = createAdminClient()

  const { data: articles } = await admin
    .from('help_articles')
    .select('id, slug, title, category, sort_order')
    .eq('published', true)
    .order('sort_order')

  return { articles: articles || [], categories: CATEGORIES }
}

export async function getHelpArticle(slug: string) {
  const admin = createAdminClient()

  const { data: article } = await admin
    .from('help_articles')
    .select('*')
    .eq('slug', slug)
    .eq('published', true)
    .single()

  if (!article) return { error: 'Article not found' }
  return { article }
}

export async function searchHelpArticles(query: string) {
  const admin = createAdminClient()

  const { data: articles } = await admin
    .from('help_articles')
    .select('id, slug, title, category')
    .eq('published', true)
    .or(`title.ilike.%${escapePostgrestValue(query)}%,body_markdown.ilike.%${escapePostgrestValue(query)}%`)
    .order('sort_order')

  return { articles: articles || [] }
}

export async function submitSupportRequest(data: {
  name: string
  email: string
  subject: string
  category: string
  message: string
}) {
  await sendEmail({
    to: process.env.ADMIN_EMAIL || 'support@metalgear.com',
    subject: `[Support] ${data.category}: ${data.subject}`,
    html: `
      <h2>Support Request</h2>
      <p><strong>From:</strong> ${data.name} (${data.email})</p>
      <p><strong>Category:</strong> ${data.category}</p>
      <p><strong>Subject:</strong> ${data.subject}</p>
      <hr>
      <p>${data.message.replace(/\n/g, '<br>')}</p>
    `,
  }).catch(console.error)

  return { success: true }
}

export { CATEGORIES }
