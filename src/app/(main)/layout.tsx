import { cookies } from 'next/headers'
import { Header } from '@/components/layout/header'
import { DesktopNav } from '@/components/layout/desktop-nav'
import { MobileDrawer } from '@/components/layout/mobile-drawer'
import { HelpButton } from '@/components/layout/help-button'
import { NotificationEducationTrigger } from '@/components/notification-education-trigger'
import { ImportProgressBannerClient } from '@/components/import-progress-banner-client'
import { MobileNavClient } from '@/components/mobile-nav/MobileNavClient'
import { CompanyContextProvider } from '@/components/company/CompanyContextProvider'
import { ArchetypeMigrationBanner } from '@/components/archetype-migration-banner'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveCompanyId } from '@/app/actions/company-context'
import { getUserCompanies } from '@/app/actions/company'
import type { CompanyWithRole } from '@/types/company'
import type { Archetype } from '@/app/actions/archetype'

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Fetch user data server-side for mobile nav
  let mobileNavProps: {
    user: { name: string; avatarUrl: string | null; id: string }
    subscriptionTier: 'free' | 'pro' | 'business' | 'enterprise'
    unreadMessages: number
    unreadNotifications: number
    hasStorefront: boolean
    isAdmin?: boolean
    activeCompany: CompanyWithRole | null
    userCompanies: CompanyWithRole[]
  } | null = null

  let activeCompany: CompanyWithRole | null = null
  let userCompanies: CompanyWithRole[] = []
  let needsMigration = false
  let currentArchetype: Archetype | null = null
  let userId: string | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (user) {
      const admin = createAdminClient()

      // First get the user's conversation IDs for accurate unread count
      const { data: userConvs } = await admin
        .from('conversations')
        .select('id')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)

      const convIds = (userConvs ?? []).map((c) => c.id)

      const [profileRes, messagesRes, notificationsRes, storefrontRes, companies] = await Promise.all([
        admin
          .from('profiles')
          .select('full_name, avatar_url, subscription_tier, is_admin')
          .eq('id', user.id)
          .single(),
        convIds.length > 0
          ? admin
              .from('messages')
              .select('id', { count: 'exact', head: true })
              .in('conversation_id', convIds)
              .neq('sender_id', user.id)
              .is('read_at', null)
          : Promise.resolve({ count: 0 }),
        admin
          .from('notifications')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .eq('is_read', false),
        admin
          .from('seller_storefronts')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', user.id),
        getUserCompanies(user.id),
      ])

      const profile = profileRes.data
      const tier = (profile?.subscription_tier || 'free') as 'free' | 'pro' | 'business' | 'enterprise'

      userCompanies = companies
      const activeCompanyId = await getActiveCompanyId(user.id)
      activeCompany = userCompanies.find(c => c.id === activeCompanyId) ?? userCompanies[0] ?? null

      mobileNavProps = {
        user: {
          name: profile?.full_name || '',
          avatarUrl: profile?.avatar_url || null,
          id: user.id,
        },
        subscriptionTier: tier,
        unreadMessages: messagesRes.count ?? 0,
        unreadNotifications: notificationsRes.count ?? 0,
        hasStorefront: (storefrontRes.count ?? 0) > 0,
        isAdmin: profile?.is_admin === true,
        activeCompany,
        userCompanies,
      }

      userId = user.id

      // Fetch archetype status for migration banner + cookie sync
      const { data: archetypeData } = await admin
        .from('user_business_profiles')
        .select('archetype, archetype_locked')
        .eq('user_id', user.id)
        .maybeSingle()

      if (archetypeData) {
        currentArchetype = (archetypeData.archetype as Archetype) ?? null
        needsMigration = !archetypeData.archetype_locked

        // Sync mg_archetype cookie if it doesn't match DB (handles admin overrides)
        const cookieStore = await cookies()
        const currentCookie = cookieStore.get('mg_archetype')?.value
        if (archetypeData.archetype && currentCookie !== archetypeData.archetype) {
          cookieStore.set('mg_archetype', archetypeData.archetype, {
            httpOnly: false,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 365,
            path: '/',
          })
        }
      }
    }
  } catch {
    // Auth may not be available for public routes — continue without mobile nav data
  }

  return (
    <div className="flex min-h-screen flex-col overflow-x-hidden bg-background">
      <CompanyContextProvider activeCompany={activeCompany} userCompanies={userCompanies} />
      <Header />
      <DesktopNav />
      <MobileDrawer />

      {/* Archetype migration banner — shown until user confirms */}
      {needsMigration && userId && (
        <ArchetypeMigrationBanner userId={userId} currentArchetype={currentArchetype} />
      )}

      {/* Mobile navigation — hidden on md+ */}
      {mobileNavProps && <MobileNavClient {...mobileNavProps} />}

      <main
        id="main-content"
        className="flex min-w-0 flex-1 flex-col pt-[52px] pb-[72px] md:pt-0 md:pb-0 lg:pb-0"
      >
        {children}
      </main>

      <HelpButton />
      <NotificationEducationTrigger />
      <ImportProgressBannerClient />
    </div>
  )
}
