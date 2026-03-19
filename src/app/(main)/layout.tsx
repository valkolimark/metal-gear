import { Header } from '@/components/layout/header'
import { DesktopNav } from '@/components/layout/desktop-nav'
import { MobileDrawer } from '@/components/layout/mobile-drawer'
import { HelpButton } from '@/components/layout/help-button'
import { NotificationEducationTrigger } from '@/components/notification-education-trigger'
import { MobileNavClient } from '@/components/mobile-nav/MobileNavClient'
import { CompanyContextProvider } from '@/components/company/CompanyContextProvider'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveCompanyId } from '@/app/actions/company-context'
import { getUserCompanies } from '@/app/actions/company'
import type { CompanyWithRole } from '@/types/company'

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

      {/* Mobile navigation — hidden on md+ */}
      {mobileNavProps && <MobileNavClient {...mobileNavProps} />}

      <main
        id="main-content"
        className="flex flex-1 flex-col pt-[52px] pb-[72px] md:pt-0 md:pb-0 lg:pb-0"
      >
        {children}
      </main>

      <HelpButton />
      <NotificationEducationTrigger />
    </div>
  )
}
