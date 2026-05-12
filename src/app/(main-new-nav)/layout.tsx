import { cookies } from 'next/headers'
import { AppShellDashboard } from '@/components/layout/AppShellDashboard'
import { CompanyContextProvider } from '@/components/company/CompanyContextProvider'
import { ArchetypeMigrationBanner } from '@/components/archetype-migration-banner'
import { HelpButton } from '@/components/layout/help-button'
import { NotificationEducationTrigger } from '@/components/notification-education-trigger'
import { ImportProgressBannerClient } from '@/components/import-progress-banner-client'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveCompanyId } from '@/app/actions/company-context'
import { getUserCompanies } from '@/app/actions/company'
import type { CompanyWithRole } from '@/types/company'
import type { Archetype } from '@/app/actions/archetype'

/**
 * Cycle 71 — route group hosting routes migrated to the new navigation
 * system. `AppShellDashboard` wraps every child in the canonical top bar +
 * sidebar + mobile bottom nav (see `docs/navigation-system.md`).
 *
 * Currently the only route in this group is `/feed`. Subsequent cycles
 * (72–75) migrate additional routes one cluster at a time.
 */
export default async function MainNewNavLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Mirror (main)/layout.tsx's side context: active company + archetype-banner
  // status. The shell's getNavContext() handles user/badges/companies on its
  // own. These two pieces remain layout responsibilities.
  let activeCompany: CompanyWithRole | null = null
  let userCompanies: CompanyWithRole[] = []
  let needsMigration = false
  let currentArchetype: Archetype | null = null
  let userId: string | null = null

  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      userId = user.id
      const admin = createAdminClient()
      userCompanies = await getUserCompanies(user.id)
      const activeCompanyId = await getActiveCompanyId(user.id)
      activeCompany = userCompanies.find((c) => c.id === activeCompanyId) ?? userCompanies[0] ?? null

      const { data: archetypeData } = await admin
        .from('user_business_profiles')
        .select('archetype, archetype_locked')
        .eq('user_id', user.id)
        .maybeSingle()

      if (archetypeData) {
        currentArchetype = (archetypeData.archetype as Archetype) ?? null
        needsMigration = !archetypeData.archetype_locked

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
    // Public route or auth failure — continue without context.
  }

  return (
    <>
      <CompanyContextProvider activeCompany={activeCompany} userCompanies={userCompanies} />
      {needsMigration && userId && (
        <ArchetypeMigrationBanner userId={userId} currentArchetype={currentArchetype} />
      )}
      <AppShellDashboard>{children}</AppShellDashboard>
      <HelpButton />
      <NotificationEducationTrigger />
      <ImportProgressBannerClient />
    </>
  )
}
