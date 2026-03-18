'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname, useRouter } from 'next/navigation'
import {
  Package,
  Heart,
  Receipt,
  Bell,
  Search,
  Plus,
  AlertTriangle,
  TrendingUp,
  LayoutDashboard,
  MessageSquare,
  User,
  Store,
  Building2,
  HelpCircle,
  CreditCard,
  Coins,
  ChevronRight,
  LogOut,
  X,
  MessageCircle,
  Shield,
} from 'lucide-react'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { CompanySwitcher } from '@/components/company/CompanySwitcher'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import type { CompanyWithRole } from '@/types/company'

interface MobileMenuDrawerProps {
  open: boolean
  onClose: () => void
  user: { name: string; avatarUrl: string | null; id: string }
  subscriptionTier: 'free' | 'pro' | 'business' | 'enterprise'
  unreadMessages: number
  unreadNotifications: number
  hasStorefront: boolean
  isAdmin?: boolean
  activeCompany?: CompanyWithRole | null
  userCompanies?: CompanyWithRole[]
}

const TIER_LABELS: Record<string, string> = {
  free: 'Free',
  pro: 'Pro',
  business: 'Business',
  enterprise: 'Enterprise',
}

const TIER_COLORS: Record<string, string> = {
  free: 'bg-muted text-muted-foreground',
  pro: 'bg-primary/15 text-primary',
  business: 'bg-secondary/15 text-secondary',
  enterprise: 'bg-amber-500/15 text-amber-400',
}

export function MobileMenuDrawer({
  open,
  onClose,
  user,
  subscriptionTier,
  unreadMessages,
  unreadNotifications,
  hasStorefront,
  isAdmin,
}: MobileMenuDrawerProps) {
  const [mounted, setMounted] = useState(false)
  const [closing, setClosing] = useState(false)
  const pathname = usePathname()
  const router = useRouter()
  const drawerRef = useRef<HTMLDivElement>(null)
  const touchStartX = useRef(0)
  const { signOut } = useAuthStore()
  const { setHelpChatOpen } = useUIStore()

  useEffect(() => setMounted(true), [])

  // Close on pathname change
  useEffect(() => {
    if (open) onClose()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname])

  // Body scroll lock
  useEffect(() => {
    if (open) {
      document.body.classList.add('drawer-open')
    } else {
      document.body.classList.remove('drawer-open')
    }
    return () => document.body.classList.remove('drawer-open')
  }, [open])

  // Escape key
  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // Focus trap
  useEffect(() => {
    if (!open || !drawerRef.current) return
    const firstFocusable = drawerRef.current.querySelector<HTMLElement>(
      'button, a, [tabindex]:not([tabindex="-1"])'
    )
    firstFocusable?.focus()
  }, [open])

  const handleClose = useCallback(() => {
    setClosing(true)
    setTimeout(() => {
      setClosing(false)
      onClose()
    }, 220)
  }, [onClose])

  // Swipe-to-close
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
  }
  const onTouchEnd = (e: React.TouchEvent) => {
    const deltaX = e.changedTouches[0].clientX - touchStartX.current
    if (deltaX < -50) handleClose()
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/login')
  }

  if (!mounted || (!open && !closing)) return null

  const drawerContent = (
    <div className="fixed inset-0 z-[60]" aria-modal="true" role="dialog">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        style={{
          animation: closing ? 'none' : 'mobile-backdrop-in 200ms ease-out',
          opacity: closing ? 0 : 1,
          transition: closing ? 'opacity 220ms ease-in' : undefined,
        }}
        onClick={handleClose}
      />

      {/* Drawer panel */}
      <div
        ref={drawerRef}
        className="absolute right-0 top-0 bottom-0 flex flex-col bg-background border-l border-border/50 overflow-y-auto"
        style={{
          width: 'min(320px, 85vw)',
          animation: closing
            ? 'drawer-slide-out 220ms ease-in forwards'
            : 'drawer-slide-in 260ms ease-out',
        }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* Close button */}
        <button
          onClick={handleClose}
          className="absolute right-3 top-3 flex size-8 items-center justify-center rounded-full text-muted-foreground hover:text-foreground z-10"
          aria-label="Close menu"
        >
          <X className="size-5" />
        </button>

        {/* A. Profile Card + Company Switcher */}
        <div className="bg-gradient-to-b from-primary/15 to-transparent px-5 pb-5 pt-6">
          <Link href="/profile" className="flex items-center gap-3 mb-3">
            <div className="flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
              {user.avatarUrl ? (
                <Image
                  src={user.avatarUrl}
                  alt=""
                  width={48}
                  height={48}
                  className="size-full object-cover"
                />
              ) : (
                <User className="size-6 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-sm font-bold text-foreground">
                {user.name || 'User'}
              </p>
              <span className="text-xs text-muted-foreground">View personal profile &rarr;</span>
            </div>
            <ChevronRight className="size-4 text-muted-foreground" />
          </Link>
          <CompanySwitcher variant="drawer" />
        </div>

        {/* B. Quick Action Tiles */}
        <div className="grid grid-cols-2 gap-2 px-4 py-3">
          {[
            { href: '/listings', label: 'My Listings', icon: Package },
            { href: '/favorites', label: 'Saved', icon: Heart },
            { href: '/dashboard', label: 'Transactions', icon: Receipt },
            { href: '/dashboard', label: 'Notifications', icon: Bell, badge: unreadNotifications },
          ].map((tile) => (
            <Link
              key={tile.label}
              href={tile.href}
              className="relative flex flex-col items-center gap-1.5 rounded-xl bg-card p-3 text-center active:bg-accent"
            >
              <tile.icon className="size-5 text-muted-foreground" />
              <span className="text-[11px] font-medium text-foreground">{tile.label}</span>
              {tile.badge && tile.badge > 0 ? (
                <span className="absolute right-2 top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[9px] font-bold text-white">
                  {tile.badge > 99 ? '99+' : tile.badge}
                </span>
              ) : null}
            </Link>
          ))}
        </div>

        {/* C. Nav Groups */}
        <div className="flex-1 px-1 pb-4">
          {/* Marketplace */}
          <NavGroupHeader>Marketplace</NavGroupHeader>
          <NavRow href="/search" icon={Search} label="Browse Equipment" />
          <NavRow href="/listings/new" icon={Plus} label="Post a Listing" />
          <NavRow href="/sos" icon={AlertTriangle} label="SOS Broadcast" />
          <NavRow
            href="/insights"
            icon={TrendingUp}
            label="Market Insights"
            badge={subscriptionTier === 'free' ? 'Pro+' : undefined}
          />

          {/* Account */}
          <NavGroupHeader>Account</NavGroupHeader>
          <NavRow href="/dashboard" icon={LayoutDashboard} label="Dashboard" />
          <NavRow
            href="/messages"
            icon={MessageSquare}
            label="Messages"
            badge={unreadMessages > 0 ? String(unreadMessages) : undefined}
          />
          <NavRow href="/profile" icon={User} label="Profile & Settings" />
          <NavRow href="/credits" icon={Coins} label="My Credits" />
          <NavRow href="/settings/company" icon={Building2} label="Company Settings" />
          {hasStorefront && (
            <NavRow href={`/sellers/${user.id}`} icon={Store} label="Seller Storefront" />
          )}
          {isAdmin && (
            <NavRow href="/admin" icon={Shield} label="Admin Panel" />
          )}

          {/* Support */}
          <NavGroupHeader>Support</NavGroupHeader>
          <button
            onClick={() => {
              setHelpChatOpen(true)
              handleClose()
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 active:bg-accent"
          >
            <MessageCircle className="size-4 text-primary" />
            <span className="flex-1 text-left text-sm text-foreground">AI Help Assistant</span>
            <ChevronRight className="size-3.5 text-muted-foreground/50" />
          </button>
          <NavRow href="/help" icon={HelpCircle} label="Help Center" />
          <NavRow href="/pricing" icon={CreditCard} label="Pricing" />
        </div>

        {/* D. Subscription Upsell (free tier only) */}
        {subscriptionTier === 'free' && (
          <div className="mx-4 mb-4 rounded-xl border border-primary/30 bg-primary/10 p-4">
            <p className="text-sm font-semibold text-foreground">
              ⚡ Upgrade to Pro
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Unlock AI tools, pricing intelligence, demand forecasts & more.
            </p>
            <Link
              href="/pricing"
              className="mt-3 flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              Upgrade — $179/mo
            </Link>
          </div>
        )}

        {/* E. Drawer Footer */}
        <div className="flex items-center justify-between border-t border-border/50 px-4 py-3">
          <ThemeToggle />
          <button
            onClick={handleSignOut}
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-muted-foreground hover:text-foreground active:bg-accent"
          >
            <LogOut className="size-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )

  return createPortal(drawerContent, document.body)
}

function NavGroupHeader({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-3 pb-1 pt-4 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
      {children}
    </p>
  )
}

function NavRow({
  href,
  icon: Icon,
  label,
  badge,
}: {
  href: string
  icon: React.ComponentType<{ className?: string }>
  label: string
  badge?: string
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-lg px-3 py-2.5 active:bg-accent"
    >
      <Icon className="size-4 text-muted-foreground" />
      <span className="flex-1 text-sm text-foreground">{label}</span>
      {badge && (
        <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {badge}
        </span>
      )}
      <ChevronRight className="size-3.5 text-muted-foreground/50" />
    </Link>
  )
}
