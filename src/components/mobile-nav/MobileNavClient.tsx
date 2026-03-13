'use client'

import { useState } from 'react'
import { MobileHeader } from './MobileHeader'
import { MobileBottomNav } from './MobileBottomNav'
import { MobileMenuDrawer } from './MobileMenuDrawer'
import type { CompanyWithRole } from '@/types/company'

interface MobileNavClientProps {
  user: { name: string; avatarUrl: string | null; id: string }
  subscriptionTier: 'free' | 'pro' | 'business' | 'enterprise'
  unreadMessages: number
  unreadNotifications: number
  hasStorefront: boolean
  isAdmin?: boolean
  activeCompany: CompanyWithRole | null
  userCompanies: CompanyWithRole[]
}

export function MobileNavClient(props: MobileNavClientProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  return (
    <>
      <MobileHeader
        unreadNotifications={props.unreadNotifications}
        onMenuOpen={() => setDrawerOpen(true)}
      />
      <MobileBottomNav unreadMessages={props.unreadMessages} />
      <MobileMenuDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        {...props}
      />
    </>
  )
}
