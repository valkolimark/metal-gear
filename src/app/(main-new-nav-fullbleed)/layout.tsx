import { cookies } from 'next/headers'
import { AppShellFullBleed } from '@/components/layout/AppShellFullBleed'
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
 * Cycle 73 — sibling route group for routes that want the top bar + mobile
 * bottom nav but NO sidebar. Reserved for storefront / profile surfaces with
 * Cycle 68 cover-grid heroes that need full-viewport visual real estate.
 *
 * Currently hosts:
 *   - /sellers/[id]
 *   - /companies/[slug]
 *   - /profile
 *   - /profile/[id]
 *
 * Shape mirrors (main-new-nav)/layout.tsx exactly except for the shell —
 * AppShellFullBleed instead of AppShellDashboard. SidebarStatePreloader is
 * intentionally omitted: there is no sidebar to apply state to here, and
 * localStorage persists the collapsed state across navigation regardless
 * (the dashboard shell re-stamps it on the next dashboard route).
 */
export default async function MainNewNavFullBleedLayout({
  children,
}: {
  children: React.ReactNode
}) {
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
      <AppShellFullBleed>{children}</AppShellFullBleed>
      <HelpButton />
      <NotificationEducationTrigger />
      <ImportProgressBannerClient />
    </>
  )
}
