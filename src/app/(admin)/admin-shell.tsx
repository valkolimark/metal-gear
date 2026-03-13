'use client'

import { useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  Home,
  Users,
  Package,
  AlertTriangle,
  Star,
  Shield,
  DollarSign,
  BarChart3,
  Settings,
  Menu,
  X,
  LogOut,
} from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import type { AdminRole } from '@/lib/admin/permissions'

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  home: Home,
  users: Users,
  package: Package,
  alert: AlertTriangle,
  star: Star,
  shield: Shield,
  dollar: DollarSign,
  chart: BarChart3,
  settings: Settings,
}

const ROLE_COLORS: Record<AdminRole, string> = {
  superadmin: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  moderator: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  analyst: 'bg-green-500/20 text-green-400 border-green-500/30',
}

interface AdminShellProps {
  navItems: Array<{ href: string; label: string; icon: string }>
  adminName: string
  adminRole: AdminRole
  avatarUrl?: string | null
  children: React.ReactNode
}

export default function AdminShell({
  navItems,
  adminName,
  adminRole,
  avatarUrl,
  children,
}: AdminShellProps) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Build breadcrumbs from pathname
  const segments = pathname.split('/').filter(Boolean)
  const breadcrumbs = segments.map((seg, i) => ({
    label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
    href: '/' + segments.slice(0, i + 1).join('/'),
    active: i === segments.length - 1,
  }))

  return (
    <div data-section="admin" className="flex min-h-screen bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`admin-sidebar fixed inset-y-0 left-0 z-50 flex w-64 flex-col transition-transform duration-200 lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo banner — Facebook blue */}
        <div className="admin-sidebar-logo flex h-16 items-center justify-between px-5">
          <Link href="/admin" className="flex items-center gap-2.5">
            <Settings className="size-5" />
            <span className="font-display text-sm font-bold tracking-wide">
              METAL GEAR ADMIN
            </span>
          </Link>
          <button
            onClick={() => setSidebarOpen(false)}
            className="text-white/70 hover:text-white lg:hidden"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="admin-sidebar-nav flex-1 overflow-y-auto px-3 py-4">
          <ul className="space-y-0.5">
            {navItems.map((item) => {
              const Icon = ICON_MAP[item.icon] || Home
              const isActive =
                item.href === '/admin'
                  ? pathname === '/admin'
                  : pathname.startsWith(item.href)

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className={`flex items-center gap-3 rounded-lg px-3 py-2.5 font-body text-sm ${isActive ? 'active' : ''}`}
                  >
                    <Icon className="size-4 shrink-0" />
                    {item.label}
                  </Link>
                </li>
              )
            })}
          </ul>
        </nav>

        {/* Admin profile */}
        <div className="admin-sidebar-footer p-4">
          <div className="flex items-center gap-3">
            <div className="flex size-9 items-center justify-center overflow-hidden rounded-full bg-white/10">
              {avatarUrl ? (
                <Image src={avatarUrl} alt="" width={36} height={36} unoptimized className="size-full object-cover" />
              ) : (
                <Users className="size-4 opacity-60" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-body text-sm font-medium">
                {adminName}
              </p>
              <Badge
                className={`mt-0.5 border px-1.5 py-0 font-body text-[10px] uppercase ${ROLE_COLORS[adminRole]}`}
              >
                {adminRole}
              </Badge>
            </div>
          </div>
          <Link
            href="/dashboard"
            className="mt-3 flex items-center gap-2 font-body text-xs opacity-50 hover:opacity-100"
          >
            <LogOut className="size-3" />
            Exit admin
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex flex-1 flex-col">
        {/* Top bar */}
        <header className="flex h-14 items-center gap-4 border-b border-border/30 bg-card/80 px-4 backdrop-blur lg:px-6">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="size-5" />
          </Button>

          {/* Breadcrumbs */}
          <nav className="flex flex-1 items-center gap-1.5 font-body text-sm">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.href} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-muted-foreground">/</span>}
                {crumb.active ? (
                  <span className="text-foreground">{crumb.label}</span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-muted-foreground hover:text-foreground"
                  >
                    {crumb.label}
                  </Link>
                )}
              </span>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
