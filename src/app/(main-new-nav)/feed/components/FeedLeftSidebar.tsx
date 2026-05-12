'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home,
  Search,
  MessageSquare,
  Siren,
  Bookmark,
  CreditCard,
  BarChart2,
} from 'lucide-react'
import { CompanyAvatar } from '@/components/company/CompanyAvatar'
import { switchActiveCompany } from '@/app/actions/company-context'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
  orangeAccent?: boolean
  badge?: number
}

interface CompanyData {
  id: string
  name: string
  slug: string
  logo_url: string | null
  role?: string
}

interface FeedLeftSidebarProps {
  profile: { display_name: string | null; avatar_url: string | null } | null
  activeCompany: CompanyData | null
  userCompanies: CompanyData[]
  unreadCount: number
  userId: string
  className?: string
}

export function FeedLeftSidebar({
  profile,
  activeCompany,
  userCompanies,
  unreadCount,
  userId,
  className = '',
}: FeedLeftSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const navItems: NavItem[] = [
    { label: 'Feed', href: '/feed', icon: Home },
    { label: 'Browse Equipment', href: '/search', icon: Search },
    { label: 'Dashboard', href: '/dashboard', icon: BarChart2 },
    { label: 'Messages', href: '/messages', icon: MessageSquare, badge: unreadCount },
    { label: 'SOS Dashboard', href: '/sos', icon: Siren, orangeAccent: true },
    { label: 'My Radar', href: '/collections', icon: Bookmark },
    { label: 'My Credits', href: '/credits', icon: CreditCard },
  ]

  const isActive = (href: string) => {
    if (href === '/feed') return pathname === '/feed'
    return pathname.startsWith(href)
  }

  const handleCompanySwitch = async (companyId: string) => {
    await switchActiveCompany(userId, companyId)
    router.refresh()
  }

  return (
    <aside
      className={`w-[280px] shrink-0 sticky top-0 h-screen overflow-y-auto flex flex-col py-4 px-2 gap-1 border-r border-border bg-background scrollbar-thin scrollbar-thumb-border ${className}`}
    >
      {/* Profile card */}
      {activeCompany && (
        <Link
          href="/profile"
          className="flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted transition-colors mb-2"
        >
          <CompanyAvatar
            name={activeCompany.name}
            logoUrl={activeCompany.logo_url}
            size={40}
          />
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold text-foreground truncate">
              {activeCompany.name}
            </p>
            <p className="font-body text-xs text-muted-foreground truncate">
              {profile?.display_name || 'User'}
            </p>
          </div>
        </Link>
      )}

      {/* Primary nav */}
      <nav className="flex flex-col gap-0.5">
        {navItems.map((item) => {
          const active = isActive(item.href)
          const Icon = item.icon
          return (
            <Link
              key={item.href + item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-body transition-colors ${
                active
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-foreground hover:bg-muted'
              }`}
            >
              <Icon
                className={`size-5 shrink-0 ${
                  item.orangeAccent ? 'text-[#FF6B2B]' : active ? 'text-primary' : ''
                }`}
              />
              <span className="truncate">{item.label}</span>
              {item.badge && item.badge > 0 ? (
                <span className="ml-auto flex size-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white">
                  {item.badge > 99 ? '99+' : item.badge}
                </span>
              ) : null}
            </Link>
          )
        })}
      </nav>

      {/* Company switcher */}
      {userCompanies.length > 1 && (
        <>
          <div className="mt-4 mb-1 px-3">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Your Companies
            </p>
          </div>
          <div className="flex flex-col gap-0.5">
            {userCompanies.map((company) => (
              <button
                key={company.id}
                onClick={() => handleCompanySwitch(company.id)}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-body text-foreground hover:bg-muted transition-colors w-full text-left"
              >
                <CompanyAvatar
                  name={company.name}
                  logoUrl={company.logo_url}
                  size={32}
                />
                <span className="truncate flex-1">{company.name}</span>
                {company.id === activeCompany?.id && (
                  <span className="size-2 rounded-full bg-primary shrink-0" />
                )}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="mt-auto pt-4 px-3 flex items-center gap-2 text-xs text-muted-foreground">
        <Link href="/settings" className="hover:text-foreground transition-colors">
          Settings
        </Link>
        <span>·</span>
        <Link href="/about" className="hover:text-foreground transition-colors">
          Help
        </Link>
        <span>·</span>
        <Link href="/privacy" className="hover:text-foreground transition-colors">
          Privacy
        </Link>
      </div>
    </aside>
  )
}
