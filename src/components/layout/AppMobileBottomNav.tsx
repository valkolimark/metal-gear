import { Home, Package, MessageSquare, User } from 'lucide-react'
import { SirenIcon } from '@/components/landing/icons'
import { AppMobileBottomNavItem } from './AppMobileBottomNavItem'

interface AppMobileBottomNavProps {
  badges: { unreadMessages: number; activeSosInCategories: number }
}

export function AppMobileBottomNav({ badges }: AppMobileBottomNavProps) {
  return (
    <nav
      aria-label="Primary navigation"
      className="fixed inset-x-0 bottom-0 z-[45] border-t border-border/50 bg-background md:hidden"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="grid h-[60px] grid-cols-5">
        <AppMobileBottomNavItem
          href="/feed"
          label="Feed"
          icon={<Home className="size-[22px]" />}
          navEvent="mobile-bottom:feed"
        />
        <AppMobileBottomNavItem
          href="/listings"
          label="Browse"
          icon={<Package className="size-[22px]" />}
          navEvent="mobile-bottom:browse"
        />
        <AppMobileBottomNavItem
          href="/sos/create"
          activeMatchPath="/sos"
          label="SOS"
          icon={<SirenIcon size={22} />}
          variant="prominent"
          navEvent="mobile-bottom:sos"
        />
        <AppMobileBottomNavItem
          href="/messages"
          label="Messages"
          icon={<MessageSquare className="size-[22px]" />}
          badge={badges.unreadMessages}
          navEvent="mobile-bottom:messages"
        />
        <AppMobileBottomNavItem
          href="/profile"
          label="Profile"
          icon={<User className="size-[22px]" />}
          navEvent="mobile-bottom:profile"
        />
      </div>
    </nav>
  )
}
