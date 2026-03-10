'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { requireAdmin, type AdminRole } from '@/lib/admin/permissions'
import { logAdminAction } from '@/app/(admin)/admin/actions'
import type { Json } from '@/types/database'

// ─── System Config CRUD ─────────────────────────────────────────────

export async function getSystemConfig() {
  await requireAdmin('grant_roles')
  const admin = createAdminClient()

  const { data } = await admin
    .from('system_config')
    .select('*')
    .order('key', { ascending: true })

  return { config: data ?? [] }
}

export async function updateSystemConfig(key: string, value: Json) {
  const { profile } = await requireAdmin('grant_roles')
  const admin = createAdminClient()

  const { error } = await admin
    .from('system_config')
    .upsert({
      key,
      value,
      updated_by: profile.id,
      updated_at: new Date().toISOString(),
    })

  if (error) throw new Error(error.message)

  await logAdminAction(profile.id, 'update_system_config', 'system_config', key, { value })
  return { success: true }
}

// ─── Admin User Management ──────────────────────────────────────────

export async function getAdminUsers() {
  await requireAdmin('grant_roles')
  const admin = createAdminClient()

  const { data } = await admin
    .from('profiles')
    .select('id, full_name, avatar_url, admin_role, is_admin, created_at')
    .eq('is_admin', true)
    .order('admin_role', { ascending: true })

  // Get last admin action for each
  const adminIds = (data ?? []).map((u) => u.id)
  const lastActionMap: Record<string, string> = {}

  if (adminIds.length > 0) {
    for (const id of adminIds) {
      const { data: actions } = await admin
        .from('admin_audit_log')
        .select('created_at')
        .eq('admin_id', id)
        .order('created_at', { ascending: false })
        .limit(1)
      if (actions && actions.length > 0) {
        lastActionMap[id] = actions[0].created_at || ''
      }
    }
  }

  // Get who granted each admin
  const grantedByMap: Record<string, string> = {}
  if (adminIds.length > 0) {
    const { data: grants } = await admin
      .from('admin_audit_log')
      .select('target_id, admin_id, created_at')
      .in('target_id', adminIds)
      .in('action', ['grant_admin', 'update_role'])
      .order('created_at', { ascending: false })

    const seen = new Set<string>()
    for (const g of grants ?? []) {
      if (!seen.has(g.target_id)) {
        seen.add(g.target_id)
        const { data: granter } = await admin
          .from('profiles')
          .select('full_name')
          .eq('id', g.admin_id)
          .single()
        grantedByMap[g.target_id] = granter?.full_name ?? 'Unknown'
      }
    }
  }

  return {
    admins: (data ?? []).map((u) => ({
      ...u,
      last_action: lastActionMap[u.id] || null,
      granted_by: grantedByMap[u.id] || 'System',
    })),
  }
}

export async function grantAdminRole(userId: string, role: AdminRole) {
  const { profile } = await requireAdmin('grant_roles')
  const admin = createAdminClient()

  const { error } = await admin
    .from('profiles')
    .update({ is_admin: true, admin_role: role })
    .eq('id', userId)

  if (error) throw new Error(error.message)

  await logAdminAction(profile.id, 'grant_admin', 'user', userId, { role })
  return { success: true }
}

export async function revokeAdminRole(userId: string) {
  const { profile } = await requireAdmin('grant_roles')
  const admin = createAdminClient()

  if (userId === profile.id) throw new Error('Cannot revoke your own admin access')

  const { error } = await admin
    .from('profiles')
    .update({ is_admin: false, admin_role: null })
    .eq('id', userId)

  if (error) throw new Error(error.message)

  await logAdminAction(profile.id, 'revoke_admin', 'user', userId, {})
  return { success: true }
}

export async function searchUsersForAdmin(query: string) {
  await requireAdmin('grant_roles')
  const admin = createAdminClient()

  const { data } = await admin
    .from('profiles')
    .select('id, full_name, avatar_url, is_admin, admin_role')
    .ilike('full_name', `%${query}%`)
    .limit(10)

  return { users: data ?? [] }
}

// ─── Integration Health Checks ──────────────────────────────────────

export async function checkIntegrationStatus() {
  await requireAdmin('grant_roles')

  const results: { name: string; status: 'ok' | 'error' | 'not_configured'; latency?: number; detail?: string }[] = []

  // Supabase
  try {
    const start = Date.now()
    const admin = createAdminClient()
    await admin.from('profiles').select('id').limit(1)
    results.push({ name: 'Supabase', status: 'ok', latency: Date.now() - start })
  } catch {
    results.push({ name: 'Supabase', status: 'error', detail: 'Connection failed' })
  }

  // Stripe
  try {
    const stripeKey = process.env.STRIPE_SECRET_KEY
    if (!stripeKey) {
      results.push({ name: 'Stripe', status: 'not_configured' })
    } else {
      results.push({ name: 'Stripe', status: 'ok' })
    }
  } catch {
    results.push({ name: 'Stripe', status: 'error' })
  }

  // Anthropic API
  try {
    const key = process.env.ANTHROPIC_API_KEY
    if (!key) {
      results.push({ name: 'Anthropic API', status: 'not_configured' })
    } else {
      results.push({ name: 'Anthropic API', status: 'ok' })
    }
  } catch {
    results.push({ name: 'Anthropic API', status: 'error' })
  }

  // Resend
  try {
    const key = process.env.RESEND_API_KEY
    if (!key) {
      results.push({ name: 'Resend (email)', status: 'not_configured' })
    } else {
      results.push({ name: 'Resend (email)', status: 'ok' })
    }
  } catch {
    results.push({ name: 'Resend (email)', status: 'error' })
  }

  // Sentry
  try {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN || process.env.SENTRY_DSN
    if (!dsn) {
      results.push({ name: 'Sentry', status: 'not_configured' })
    } else {
      results.push({ name: 'Sentry', status: 'ok' })
    }
  } catch {
    results.push({ name: 'Sentry', status: 'error' })
  }

  // Sightengine
  try {
    const key = process.env.SIGHTENGINE_API_USER
    if (!key) {
      results.push({ name: 'Sightengine', status: 'not_configured' })
    } else {
      results.push({ name: 'Sightengine', status: 'ok' })
    }
  } catch {
    results.push({ name: 'Sightengine', status: 'error' })
  }

  return {
    integrations: results,
    appleJwtExpiry: '2026-08-25',
  }
}

// ─── Database Stats ─────────────────────────────────────────────────

export async function getDatabaseStats() {
  await requireAdmin('grant_roles')
  const admin = createAdminClient()

  const tables = ['profiles', 'listings', 'conversations', 'messages', 'sos_requests', 'sos_responses', 'reviews', 'reports', 'listing_views', 'saved_searches', 'boost_purchases', 'admin_audit_log'] as const

  const counts: { table: string; count: number }[] = []

  for (const table of tables) {
    const { count } = await admin.from(table).select('*', { count: 'exact', head: true })
    counts.push({ table, count: count ?? 0 })
  }

  return { tableCounts: counts }
}

// ─── Audit Log ──────────────────────────────────────────────────────

export async function getAuditLog(params: {
  page?: number
  adminFilter?: string
  actionFilter?: string
  targetTypeFilter?: string
}) {
  await requireAdmin('grant_roles')
  const admin = createAdminClient()
  const page = params.page ?? 1
  const perPage = 100
  const offset = (page - 1) * perPage

  let query = admin
    .from('admin_audit_log')
    .select('*', { count: 'exact' })

  if (params.adminFilter) {
    query = query.eq('admin_id', params.adminFilter)
  }
  if (params.actionFilter) {
    query = query.eq('action', params.actionFilter)
  }
  if (params.targetTypeFilter) {
    query = query.eq('target_type', params.targetTypeFilter)
  }

  const { data, count } = await query
    .order('created_at', { ascending: false })
    .range(offset, offset + perPage - 1)

  // Get admin names
  const adminIds = [...new Set((data ?? []).map((l) => l.admin_id))]
  const nameMap: Record<string, string> = {}
  if (adminIds.length > 0) {
    const { data: admins } = await admin.from('profiles').select('id, full_name').in('id', adminIds)
    for (const a of admins ?? []) nameMap[a.id] = a.full_name ?? 'Unknown'
  }

  return {
    logs: (data ?? []).map((l) => ({
      ...l,
      admin_name: nameMap[l.admin_id] || 'Unknown',
    })),
    total: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / perPage),
  }
}

export async function exportAuditLogCSV() {
  await requireAdmin('export_data')
  const admin = createAdminClient()

  const { data } = await admin
    .from('admin_audit_log')
    .select('admin_id, action, target_type, target_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(5000)

  const adminIds = [...new Set((data ?? []).map((l) => l.admin_id))]
  const nameMap: Record<string, string> = {}
  if (adminIds.length > 0) {
    const { data: admins } = await admin.from('profiles').select('id, full_name').in('id', adminIds)
    for (const a of admins ?? []) nameMap[a.id] = a.full_name ?? 'Unknown'
  }

  const header = 'Admin,Action,Target Type,Target ID,Metadata,Date'
  const rows = (data ?? []).map((l) =>
    [nameMap[l.admin_id] || 'Unknown', l.action, l.target_type, l.target_id, JSON.stringify(l.metadata), l.created_at].join(',')
  )

  return header + '\n' + rows.join('\n')
}
