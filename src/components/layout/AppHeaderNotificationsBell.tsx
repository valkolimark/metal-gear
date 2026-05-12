'use client'

import Link from 'next/link'
import { Bell, MessageSquare } from 'lucide-react'
import { SirenIcon } from '@/components/landing/icons'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { cn } from '@/lib/utils'

type BellType = 'sos' | 'messages' | 'combined'

interface AppHeaderNotificationsBellProps {
  type: BellType
  count: number
}

const TYPE_META: Record<BellType, { label: (n: number) => string; href: string; badgeClass: string }> = {
  sos: {
    label: (n) => `${n} active SOS in your categories`,
    href: '/sos',
    badgeClass: 'bg-[#FF6B2B] text-white',
  },
  messages: {
    label: (n) => `${n} unread messages`,
    href: '/messages',
    badgeClass: 'bg-foreground text-background',
  },
  combined: {
    label: (n) => `${n} notifications`,
    href: '/feed',
    badgeClass: 'bg-[#FF6B2B] text-white',
  },
}

export function AppHeaderNotificationsBell({ type, count }: AppHeaderNotificationsBellProps) {
  const meta = TYPE_META[type]
  const icon =
    type === 'sos' ? (
      <SirenIcon size={18} />
    ) : type === 'messages' ? (
      <MessageSquare className="size-[18px]" />
    ) : (
      <Bell className="size-[18px]" />
    )

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="relative flex size-9 items-center justify-center rounded-md text-foreground/80 hover:bg-muted/50 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-label={meta.label(count)}
          data-nav-event={`bell:${type}`}
        >
          {icon}
          {count > 0 && (
            <span
              className={cn(
                'absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full px-1 text-[10px] font-semibold',
                meta.badgeClass,
              )}
              aria-hidden="true"
            >
              {count > 99 ? '99+' : count}
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="border-b border-border/50 px-3 py-2">
          <p className="font-body text-sm font-semibold">
            {type === 'sos' && 'Active SOS in your categories'}
            {type === 'messages' && 'Unread messages'}
            {type === 'combined' && 'Notifications'}
          </p>
        </div>
        <div className="px-3 py-4 text-sm text-muted-foreground">
          {count === 0
            ? type === 'sos'
              ? 'No active SOS in your tier-2 categories right now.'
              : type === 'messages'
                ? 'No unread messages.'
                : 'You’re all caught up.'
            : `${count} ${count === 1 ? 'item' : 'items'} waiting.`}
        </div>
        <div className="border-t border-border/50 px-3 py-2 text-right">
          <Link
            href={meta.href}
            className="font-body text-xs font-medium text-primary hover:underline"
          >
            View all →
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
