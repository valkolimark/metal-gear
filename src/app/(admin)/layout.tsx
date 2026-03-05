import { requireAdmin, hasPermission, type AdminRole } from '@/lib/admin/permissions'
import AdminShell from './admin-shell'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { profile } = await requireAdmin()

  const role = profile.admin_role as AdminRole
  const navItems = [
    { href: '/admin', label: 'Control Tower', icon: 'home', permission: null },
    { href: '/admin/users', label: 'Users', icon: 'users', permission: null },
    { href: '/admin/listings', label: 'Listings', icon: 'package', permission: null },
    { href: '/admin/sos', label: 'SOS Monitor', icon: 'alert', permission: null },
    { href: '/admin/priority', label: 'Priority Engine', icon: 'star', permission: 'set_priority' as const },
    { href: '/admin/moderation', label: 'Moderation Queue', icon: 'shield', permission: 'moderate' as const },
    { href: '/admin/financials', label: 'Financials', icon: 'dollar', permission: 'view_financials' as const },
    { href: '/admin/analytics', label: 'Analytics', icon: 'chart', permission: null },
    { href: '/admin/settings', label: 'System Settings', icon: 'settings', permission: 'grant_roles' as const },
  ].filter((item) => !item.permission || hasPermission(role, item.permission))

  return (
    <AdminShell
      navItems={navItems}
      adminName={profile.full_name || 'Admin'}
      adminRole={role}
      avatarUrl={profile.avatar_url}
    >
      {children}
    </AdminShell>
  )
}
