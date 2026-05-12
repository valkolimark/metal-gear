'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { isItemActive } from './active-path'

interface AppSidebarItemProps {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
  navEvent: string
  muted?: boolean
}

export function AppSidebarItem({
  href,
  label,
  icon,
  badge,
  navEvent,
  muted,
}: AppSidebarItemProps) {
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const active = isItemActive(href, pathname, searchParams ?? new URLSearchParams())

  return (
    <Link
      href={href}
      data-nav-event={navEvent}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'mx-2 flex h-10 items-center gap-3 rounded-lg px-3 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        active
          ? 'bg-muted font-medium text-foreground'
          : 'text-foreground/80 hover:bg-muted/50',
        muted && !active && 'text-xs text-muted-foreground',
      )}
    >
      <span aria-hidden="true" className="flex size-5 shrink-0 items-center justify-center">
        {icon}
      </span>
      <span className="flex-1 truncate" data-sidebar-label>
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span
          className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-foreground px-1.5 text-[11px] font-semibold text-background"
          aria-label={`${badge} unread`}
          data-sidebar-label
        >
          {badge > 99 ? '99+' : badge}
        </span>
      )}
    </Link>
  )
}
