'use client'

import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'
import { isItemActive } from './active-path'

interface AppMobileBottomNavItemProps {
  href: string
  label: string
  icon: React.ReactNode
  badge?: number
  variant?: 'standard' | 'prominent'
  navEvent: string
  /**
   * Override the path used for active detection. The SOS item links to
   * `/sos/create` but should highlight on any `/sos*` route.
   */
  activeMatchPath?: string
}

export function AppMobileBottomNavItem({
  href,
  label,
  icon,
  badge,
  variant = 'standard',
  navEvent,
  activeMatchPath,
}: AppMobileBottomNavItemProps) {
  const pathname = usePathname() ?? ''
  const searchParams = useSearchParams()
  const matchPath = activeMatchPath ?? href
  const active = isItemActive(matchPath, pathname, searchParams ?? new URLSearchParams())

  if (variant === 'prominent') {
    return (
      <Link
        href={href}
        data-nav-event={navEvent}
        aria-current={active ? 'page' : undefined}
        aria-label={label}
        className="flex h-full flex-col items-center justify-center"
      >
        <span
          className="flex size-12 items-center justify-center rounded-full bg-[#FF6B2B] text-white shadow-md"
          aria-hidden="true"
        >
          {icon}
        </span>
        <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#FF6B2B]">
          {label}
        </span>
      </Link>
    )
  }

  return (
    <Link
      href={href}
      data-nav-event={navEvent}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'relative flex h-full flex-col items-center justify-center gap-0.5 text-[10px] font-medium',
        active ? 'text-[#0A1628] dark:text-white' : 'text-muted-foreground',
      )}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute inset-x-3 top-0 h-[2px] rounded-b bg-[#0A1628] dark:bg-white"
        />
      )}
      <span aria-hidden="true" className="relative flex size-6 items-center justify-center">
        {icon}
        {badge !== undefined && badge > 0 && (
          <span
            className="absolute -right-2 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[#FF6B2B] px-1 text-[9px] font-bold text-white"
            aria-label={`${badge} unread`}
          >
            {badge > 9 ? '9+' : badge}
          </span>
        )}
      </span>
      <span>{label}</span>
    </Link>
  )
}
