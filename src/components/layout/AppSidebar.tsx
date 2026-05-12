import Link from 'next/link'
import { Home, Package, MessageSquare, LayoutList, Bookmark, Coins, Settings } from 'lucide-react'
import { SirenIcon } from '@/components/landing/icons'
import { AppSidebarItem } from './AppSidebarItem'
import { AppSidebarCompanyList } from './AppSidebarCompanyList'
import { AppSidebarToggle } from './AppSidebarToggle'
import type { NavContext } from '@/lib/layout/nav-data'

interface AppSidebarProps {
  ctx: NavContext
}

export function AppSidebar({ ctx }: AppSidebarProps) {
  return (
    <aside
      aria-label="Primary navigation"
      data-sidebar
      data-nav-state="expanded"
      className="app-sidebar relative hidden shrink-0 border-r border-border/50 bg-background md:flex md:flex-col"
    >
      <div className="sticky top-14 flex h-[calc(100vh-3.5rem)] flex-col">
        <nav aria-label="Primary" className="flex-1 overflow-y-auto py-3">
          <AppSidebarItem
            href="/feed"
            label="Feed"
            icon={<Home className="size-[18px]" />}
            navEvent="primary:feed"
          />
          <AppSidebarItem
            href="/listings"
            label="Browse Equipment"
            icon={<Package className="size-[18px]" />}
            navEvent="primary:browse"
          />
          <AppSidebarItem
            href="/sos"
            label="SOS"
            icon={<SirenIcon size={18} />}
            badge={ctx.badges.activeSosInCategories}
            navEvent="primary:sos"
          />
          <AppSidebarItem
            href="/messages"
            label="Messages"
            icon={<MessageSquare className="size-[18px]" />}
            badge={ctx.badges.unreadMessages}
            navEvent="primary:messages"
          />
          <AppSidebarItem
            href="/listings?tab=mine"
            label="My Listings"
            icon={<LayoutList className="size-[18px]" />}
            navEvent="primary:my-listings"
          />
          <AppSidebarItem
            href="/radar"
            label="Saved"
            icon={<Bookmark className="size-[18px]" />}
            navEvent="primary:saved"
          />
          <AppSidebarItem
            href="/credits"
            label="Credits"
            icon={<Coins className="size-[18px]" />}
            navEvent="primary:credits"
          />

          <div className="mx-3 my-3 border-t border-border/50" />

          <AppSidebarCompanyList
            companies={ctx.companies}
            activeCompanyId={ctx.activeCompanyId}
          />
        </nav>

        <div className="shrink-0 space-y-2 border-t border-border/50 p-3">
          <Link
            href="/sos/create"
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-[#FF6B2B] text-sm font-semibold text-white hover:bg-[#FF6B2B]/90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#FF6B2B] focus-visible:ring-offset-2"
            data-nav-event="footer:sos-send"
          >
            <SirenIcon size={16} />
            <span data-sidebar-label>Send SOS</span>
          </Link>
          <AppSidebarItem
            href="/settings/company"
            label="Settings"
            icon={<Settings className="size-[18px]" />}
            navEvent="primary:settings"
            muted
          />
        </div>

        <AppSidebarToggle />
      </div>
    </aside>
  )
}
