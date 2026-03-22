'use client'

import Link from 'next/link'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Search,
  MessageSquare,
  Plus,
  Menu,
  X,
  LogOut,
  User,
  Settings,
  Building2,
  Shield,
  LayoutDashboard,
  Coins,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NotificationDropdown } from '@/components/layout/notification-dropdown'
import { LanguageSwitcher } from '@/components/layout/language-switcher'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { CompanySwitcher } from '@/components/company/CompanySwitcher'
import { useAuthStore } from '@/stores/auth-store'
import { useUIStore } from '@/stores/ui-store'
import { useTranslations } from 'next-intl'

export function Header() {
  const router = useRouter()
  const t = useTranslations()
  const { profile, signOut } = useAuthStore()
  const {
    toggleSidebar,
    mobileSearchOpen,
    toggleMobileSearch,
    unreadMessages,
  } = useUIStore()
  const [searchQuery, setSearchQuery] = useState('')

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`)
      toggleMobileSearch()
    }
  }

  async function handleSignOut() {
    await signOut()
    router.push('/login')
    router.refresh()
  }

  const initials =
    profile?.full_name
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'MG'

  return (
    <header className="hidden md:block sticky top-0 z-50 border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6 lg:px-8">
        {/* Mobile menu toggle */}
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={toggleSidebar}
        >
          <Menu className="size-5" />
          <span className="sr-only">Toggle menu</span>
        </Button>

        {/* Logo */}
        <Link
          href="/search"
          className="shrink-0 font-display text-xl font-bold text-foreground"
        >
          Metal <span className="text-primary">Gear</span>
        </Link>

        {/* Search bar — desktop */}
        <form
          onSubmit={handleSearch}
          className="hidden flex-1 md:flex md:max-w-lg"
        >
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder={t('header.searchPlaceholder')}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 font-body"
              aria-label={t('header.searchPlaceholder')}
            />
          </div>
        </form>

        {/* Company Switcher — desktop only */}
        <div className="hidden md:block">
          <CompanySwitcher variant="header" />
        </div>

        {/* Right side actions */}
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          {/* Mobile search toggle */}
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={toggleMobileSearch}
          >
            {mobileSearchOpen ? (
              <X className="size-5" />
            ) : (
              <Search className="size-5" />
            )}
            <span className="sr-only">Search</span>
          </Button>

          {/* Create Listing CTA */}
          <Button asChild size="sm" className="hidden font-body sm:flex">
            <Link href="/listings/new">
              <Plus className="size-4" />
              {t('header.createListing')}
            </Link>
          </Button>
          <Button asChild size="icon" className="sm:hidden">
            <Link href="/listings/new">
              <Plus className="size-5" />
              <span className="sr-only">{t('header.createListing')}</span>
            </Link>
          </Button>

          {/* Messages */}
          <Button variant="ghost" size="icon" asChild>
            <Link href="/messages" className="relative">
              <MessageSquare className="size-5" />
              {unreadMessages > 0 && (
                <Badge className="absolute -right-1 -top-1 flex size-4 items-center justify-center rounded-full p-0 text-[10px]">
                  {unreadMessages > 9 ? '9+' : unreadMessages}
                </Badge>
              )}
              <span className="sr-only">Messages</span>
            </Link>
          </Button>

          {/* Notifications */}
          <NotificationDropdown />

          {/* Theme Toggle */}
          <ThemeToggle />

          {/* Language Switcher */}
          <LanguageSwitcher />

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="rounded-full">
                <Avatar className="size-8">
                  <AvatarImage src={profile?.avatar_url || undefined} crossOrigin="anonymous" />
                  <AvatarFallback className="bg-primary/20 font-body text-xs text-primary">
                    {initials}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              {profile?.full_name && (
                <>
                  <div className="px-2 py-1.5">
                    <p className="font-body text-sm font-medium">
                      {profile.full_name}
                    </p>
                    <p className="font-body text-xs text-muted-foreground">
                      {profile.subscription_tier === 'free'
                        ? t('header.freePlan')
                        : profile.subscription_tier === 'premium'
                          ? t('header.premium')
                          : t('header.boost')}
                    </p>
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem asChild>
                <Link href="/dashboard" className="font-body">
                  <LayoutDashboard className="mr-2 size-4" />
                  Dashboard
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile" className="font-body">
                  <User className="mr-2 size-4" />
                  {t('nav.profile')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/profile" className="font-body">
                  <Settings className="mr-2 size-4" />
                  {t('header.settings')}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/credits" className="font-body">
                  <Coins className="mr-2 size-4" />
                  My Credits
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link href="/settings/company" className="font-body">
                  <Building2 className="mr-2 size-4" />
                  Company Settings
                </Link>
              </DropdownMenuItem>
              {profile?.is_admin && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/admin" className="font-body">
                      <Shield className="mr-2 size-4" />
                      Admin Panel
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
                {t('header.signOut')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Mobile search bar — expandable */}
      {mobileSearchOpen && (
        <div className="border-t border-border px-4 py-3 md:hidden">
          <form onSubmit={handleSearch}>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="search"
                placeholder={t('header.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 font-body"
                autoFocus
                aria-label={t('header.searchPlaceholder')}
              />
            </div>
          </form>
        </div>
      )}
    </header>
  )
}
