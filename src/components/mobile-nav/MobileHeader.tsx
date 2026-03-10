'use client'

import Link from 'next/link'
import { Search, Bell, Menu } from 'lucide-react'

interface MobileHeaderProps {
  unreadNotifications: number
  onMenuOpen: () => void
}

export function MobileHeader({ unreadNotifications, onMenuOpen }: MobileHeaderProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 md:hidden">
      <div
        className="flex h-[52px] items-center justify-between border-b border-border/50 bg-background/90 px-3 backdrop-blur-sm"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        {/* Wordmark */}
        <Link href="/dashboard" className="flex-shrink-0">
          <span className="font-display text-lg font-bold text-primary">
            METAL GEAR
          </span>
        </Link>

        {/* Right icons */}
        <div className="flex items-center gap-1">
          <Link
            href="/search"
            className="flex size-10 items-center justify-center rounded-full text-foreground/70 active:bg-accent"
          >
            <Search className="size-5" />
          </Link>

          <Link
            href="/dashboard"
            className="relative flex size-10 items-center justify-center rounded-full text-foreground/70 active:bg-accent"
          >
            <Bell className="size-5" />
            {unreadNotifications > 0 && (
              <span className="absolute right-1 top-1 size-2 rounded-full bg-destructive" />
            )}
          </Link>

          <button
            onClick={onMenuOpen}
            className="flex size-10 items-center justify-center rounded-full text-foreground/70 active:bg-accent"
            aria-label="Open menu"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>
    </header>
  )
}
