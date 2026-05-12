'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Search } from 'lucide-react'
import { BrandMark } from './BrandMark'
import { AppHeaderNotificationsBell } from './AppHeaderNotificationsBell'
import { AppHeaderAvatarMenu } from './AppHeaderAvatarMenu'
import { AppMobileNavDrawer } from './AppMobileNavDrawer'
import type { NavContext } from '@/lib/layout/nav-data'

interface AppMobileTopBarProps {
  ctx: NavContext
}

export function AppMobileTopBar({ ctx }: AppMobileTopBarProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)

  return (
    <>
      <div
        className="flex h-[52px] w-full items-center gap-2 px-3 md:hidden"
        style={{ paddingTop: 'env(safe-area-inset-top, 0px)' }}
      >
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Open menu"
          data-nav-event="drawer:opened"
          className="-ml-1 flex items-center rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3D9BD6]/60"
        >
          <BrandMark href="/feed" size="sm" variant="mark" />
        </button>
        <span className="ml-1 font-display text-sm font-bold text-white">
          Metal <span className="text-[#3D9BD6]">Gear</span>
        </span>
        <div className="flex-1" />
        <Link
          href="/search"
          aria-label="Search"
          data-nav-event="search:opened"
          className="flex size-9 items-center justify-center rounded-full bg-white/[0.08] text-white/85 hover:bg-white/[0.16] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3D9BD6]/60"
        >
          <Search className="size-5" />
        </Link>
        <AppHeaderNotificationsBell
          type="combined"
          count={ctx.badges.unreadMessages + ctx.badges.activeSosInCategories}
        />
        <AppHeaderAvatarMenu user={ctx.user} size="sm" />
      </div>

      <AppMobileNavDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        badges={ctx.badges}
        companies={ctx.companies}
      />
    </>
  )
}
