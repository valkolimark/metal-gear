'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { LogOut, Settings, User, HelpCircle, Shield } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { useAuthStore } from '@/stores/auth-store'

interface AppHeaderAvatarMenuProps {
  user: {
    displayName: string
    avatarUrl: string | null
    initials: string
    isAdmin: boolean
  }
  size?: 'sm' | 'md'
}

export function AppHeaderAvatarMenu({ user, size = 'md' }: AppHeaderAvatarMenuProps) {
  const router = useRouter()
  const signOut = useAuthStore((s) => s.signOut)
  const dim = size === 'sm' ? 'size-8' : 'size-9'

  async function handleSignOut() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex shrink-0 items-center justify-center rounded-full ring-2 ring-white/10 hover:ring-white/30 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3D9BD6]/70"
          aria-label="Open account menu"
          data-nav-event="avatar:opened"
        >
          <Avatar className={dim}>
            <AvatarImage src={user.avatarUrl ?? undefined} crossOrigin="anonymous" alt="" />
            <AvatarFallback className="bg-[#3D9BD6] font-body text-xs font-semibold text-white">
              {user.initials}
            </AvatarFallback>
          </Avatar>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <div className="px-2 py-1.5">
          <p className="truncate font-body text-sm font-medium">{user.displayName}</p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuLabel className="px-2 py-1 text-[11px] font-normal uppercase tracking-wide text-muted-foreground">
          Appearance
        </DropdownMenuLabel>
        <div
          className="flex items-center justify-between gap-2 px-2 pb-2"
          data-nav-event="theme-toggle-container"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="font-body text-xs text-muted-foreground">Theme</span>
          <ThemeToggle />
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/profile" className="font-body">
            <User className="mr-2 size-4" />
            Profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/company" className="font-body">
            <Settings className="mr-2 size-4" />
            Settings
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/help" className="font-body">
            <HelpCircle className="mr-2 size-4" />
            Help
          </Link>
        </DropdownMenuItem>
        {user.isAdmin && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin" className="font-body">
                <Shield className="mr-2 size-4" />
                Admin
              </Link>
            </DropdownMenuItem>
          </>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="font-body text-destructive focus:text-destructive"
        >
          <LogOut className="mr-2 size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
