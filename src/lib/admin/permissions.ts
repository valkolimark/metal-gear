import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export type AdminRole = 'superadmin' | 'moderator' | 'analyst'

export type AdminPermission =
  | 'moderate'
  | 'set_priority'
  | 'manage_subscriptions'
  | 'grant_roles'
  | 'view_financials'
  | 'export_data'
  | 'impersonate'

const ROLE_PERMISSIONS: Record<AdminRole, AdminPermission[]> = {
  superadmin: [
    'moderate',
    'set_priority',
    'manage_subscriptions',
    'grant_roles',
    'view_financials',
    'export_data',
    'impersonate',
  ],
  moderator: ['moderate', 'export_data'],
  analyst: ['view_financials', 'export_data'],
}

export function hasPermission(
  role: AdminRole,
  permission: AdminPermission
): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function getPermissions(role: AdminRole): AdminPermission[] {
  return ROLE_PERMISSIONS[role] ?? []
}

/**
 * Gate a server action to superadmin + analyst only (no redirect — returns
 * throws so callers can surface a clean error to non-admin callers).
 * Used by Snap & List pilot metrics endpoints.
 */
export async function requireSuperadminOrAnalyst(): Promise<{
  userId: string
  role: AdminRole
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error("unauthorized")

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_admin, admin_role')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin || !profile.admin_role) {
    throw new Error("forbidden")
  }

  const role = profile.admin_role as AdminRole
  if (role !== 'superadmin' && role !== 'analyst') {
    throw new Error("forbidden")
  }

  return { userId: user.id, role }
}

export async function requireAdmin(permission?: AdminPermission) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, is_admin, admin_role, subscription_tier')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin || !profile.admin_role) {
    redirect('/dashboard')
  }

  const role = profile.admin_role as AdminRole

  if (permission && !hasPermission(role, permission)) {
    redirect('/admin')
  }

  return {
    user,
    profile: { ...profile, admin_role: role },
  }
}
