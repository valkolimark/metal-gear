import Link from 'next/link'
import { BrandMark } from './BrandMark'
import { AppHeaderSearch } from './AppHeaderSearch'
import { AppHeaderNotificationsBell } from './AppHeaderNotificationsBell'
import { AppHeaderAvatarMenu } from './AppHeaderAvatarMenu'
import { AppMobileTopBar } from './AppMobileTopBar'
import type { NavContext } from '@/lib/layout/nav-data'

interface AppHeaderProps {
  variant: 'dashboard' | 'full-bleed'
  ctx: NavContext
}

export function AppHeader({ variant, ctx }: AppHeaderProps) {
  return (
    <header
      role="banner"
      className="sticky top-0 z-50 w-full border-b border-border/50 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      data-nav-shell={variant}
    >
      {/* Desktop layout */}
      <div className="hidden h-14 items-center gap-3 px-4 md:flex">
        <BrandMark href="/feed" variant="wordmark" />
        <AppHeaderSearch />
        <div className="flex flex-1 justify-end" />
        <Link
          href="/credits"
          data-nav-event="primary:credits"
          className="hidden items-center gap-1 rounded-full border border-border bg-muted/40 px-3 py-1 font-mono text-[11px] text-foreground/80 hover:bg-muted lg:inline-flex"
          aria-label={`${ctx.badges.creditsBalance} credits`}
          title={`${ctx.badges.creditsBalance} contact credits`}
        >
          <span className="tabular-nums">{ctx.badges.creditsBalance}</span>
          <span className="text-muted-foreground">credits</span>
        </Link>
        <AppHeaderNotificationsBell type="sos" count={ctx.badges.activeSosInCategories} />
        <AppHeaderNotificationsBell type="messages" count={ctx.badges.unreadMessages} />
        <AppHeaderAvatarMenu user={ctx.user} />
      </div>

      {/* Mobile layout */}
      <AppMobileTopBar ctx={ctx} />
    </header>
  )
}
