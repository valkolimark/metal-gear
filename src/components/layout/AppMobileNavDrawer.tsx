'use client'

import Link from 'next/link'
import { useEffect, useRef } from 'react'
import { Home, Package, MessageSquare, LayoutList, Bookmark, Coins, Settings, X } from 'lucide-react'
import { SirenIcon } from '@/components/landing/icons'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { cn } from '@/lib/utils'
import type { NavCompanyMembership } from '@/lib/layout/nav-data'

interface AppMobileNavDrawerProps {
  open: boolean
  onClose: () => void
  badges: { unreadMessages: number; activeSosInCategories: number }
  companies: NavCompanyMembership[]
}

const PRIMARY = [
  { href: '/feed', label: 'Feed', icon: Home, navEvent: 'primary:feed' as const },
  { href: '/listings', label: 'Browse Equipment', icon: Package, navEvent: 'primary:browse' as const },
  { href: '/sos', label: 'SOS', icon: SirenIcon, navEvent: 'primary:sos' as const, badgeKey: 'activeSosInCategories' as const },
  { href: '/messages', label: 'Messages', icon: MessageSquare, navEvent: 'primary:messages' as const, badgeKey: 'unreadMessages' as const },
  { href: '/listings?tab=mine', label: 'My Listings', icon: LayoutList, navEvent: 'primary:my-listings' as const },
  { href: '/radar', label: 'Saved', icon: Bookmark, navEvent: 'primary:saved' as const },
  { href: '/credits', label: 'Credits', icon: Coins, navEvent: 'primary:credits' as const },
]

export function AppMobileNavDrawer({ open, onClose, badges, companies }: AppMobileNavDrawerProps) {
  const closeBtnRef = useRef<HTMLButtonElement>(null)
  const triggerRef = useRef<HTMLElement | null>(null)

  // Body-scroll lock + focus management + Esc handler
  useEffect(() => {
    if (!open) return
    triggerRef.current = (document.activeElement as HTMLElement) ?? null

    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    // Focus the close button shortly after mount
    const focusTimer = window.setTimeout(() => closeBtnRef.current?.focus(), 30)

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)

    return () => {
      document.body.style.overflow = prev
      document.removeEventListener('keydown', onKey)
      window.clearTimeout(focusTimer)
      triggerRef.current?.focus?.()
    }
  }, [open, onClose])

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm transition-opacity md:hidden motion-reduce:transition-none',
          open ? 'opacity-100' : 'pointer-events-none opacity-0',
        )}
        aria-hidden="true"
        onClick={onClose}
        data-nav-event="drawer:closed"
      />
      {/* Drawer */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-label="Primary navigation"
        className={cn(
          'fixed inset-y-0 left-0 z-[61] flex h-full w-[84%] max-w-[320px] flex-col bg-background shadow-2xl transition-transform md:hidden motion-reduce:transition-none',
          open ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-border/50 px-3">
          <span className="font-display text-base font-bold text-foreground">
            Metal <span className="text-primary">Gear</span>
          </span>
          <button
            ref={closeBtnRef}
            type="button"
            onClick={onClose}
            className="flex size-9 items-center justify-center rounded-md text-foreground/80 hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav aria-label="Primary" className="flex-1 overflow-y-auto py-3">
          {PRIMARY.map((item) => {
            const Icon = item.icon
            const badge =
              'badgeKey' in item && item.badgeKey
                ? item.badgeKey === 'unreadMessages'
                  ? badges.unreadMessages
                  : badges.activeSosInCategories
                : 0
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className="mx-2 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-nav-event={item.navEvent}
              >
                <span aria-hidden="true" className="flex size-5 items-center justify-center">
                  {/* Icon may be a Lucide component or the hand-rolled SirenIcon */}
                  {typeof Icon === 'function' && Icon === SirenIcon ? (
                    <SirenIcon size={18} />
                  ) : (
                    <Icon className="size-[18px]" />
                  )}
                </span>
                <span className="flex-1 truncate">{item.label}</span>
                {badge > 0 && (
                  <span
                    className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-foreground px-1.5 text-[11px] font-semibold text-background"
                    aria-label={`${badge} unread`}
                  >
                    {badge > 99 ? '99+' : badge}
                  </span>
                )}
              </Link>
            )
          })}

          {companies.length > 0 && (
            <div className="mt-4 border-t border-border/50 pt-3">
              <p className="px-5 pb-2 font-body text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                Your companies
              </p>
              {companies.slice(0, 8).map((c) => (
                <Link
                  key={c.companyId}
                  href={`/companies/${c.companySlug}`}
                  onClick={onClose}
                  className="mx-2 flex items-center gap-3 rounded-lg px-3 py-2 text-sm hover:bg-muted/50"
                  data-nav-event="primary:company"
                >
                  <span className="flex size-6 items-center justify-center rounded bg-primary/10 text-[10px] font-semibold text-primary">
                    {c.initials}
                  </span>
                  <span className="flex-1 truncate">{c.companyName}</span>
                  <span className="font-body text-[10px] uppercase tracking-wide text-muted-foreground">
                    {c.role}
                  </span>
                </Link>
              ))}
            </div>
          )}
        </nav>

        <div className="shrink-0 space-y-2 border-t border-border/50 p-3">
          <div className="flex items-center justify-between rounded-lg px-2 py-1.5">
            <span className="font-body text-[11px] uppercase tracking-wide text-muted-foreground">
              Appearance
            </span>
            <ThemeToggle />
          </div>
          <Link
            href="/sos/create"
            onClick={onClose}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#FF6B2B] text-sm font-semibold text-white hover:bg-[#FF6B2B]/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B2B] focus-visible:ring-offset-2"
            data-nav-event="footer:sos-send"
          >
            <SirenIcon size={16} />
            Send SOS
          </Link>
          <Link
            href="/settings/company"
            onClick={onClose}
            className="mx-1 flex items-center gap-2 rounded-lg px-2 py-2 text-xs text-muted-foreground hover:bg-muted/50"
            data-nav-event="primary:settings"
          >
            <Settings className="size-4" />
            Settings
          </Link>
        </div>
      </aside>
    </>
  )
}
