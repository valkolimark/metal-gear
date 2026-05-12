import { redirect } from 'next/navigation'
import { AppHeader } from './AppHeader'
import { AppMobileBottomNav } from './AppMobileBottomNav'
import { getNavContext } from '@/lib/layout/nav-data'
import './app-shell.css'

interface AppShellFullBleedProps {
  children: React.ReactNode
}

/**
 * Top bar only — no sidebar. Reserved for storefront / profile / settings /
 * admin surfaces where the page wants full viewport width.
 *
 * Cycle 71: built but NOT YET mounted on any page. Cycle 73 wires it up.
 */
export async function AppShellFullBleed({ children }: AppShellFullBleedProps) {
  const ctx = await getNavContext()
  if (!ctx) redirect('/login')

  return (
    <div className="app-shell-fullbleed flex min-h-screen w-full flex-col bg-background">
      <AppHeader variant="full-bleed" ctx={ctx} />
      <main
        id="main-content"
        className="min-w-0 flex-1 pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-0"
      >
        {children}
      </main>
      <AppMobileBottomNav badges={ctx.badges} />
    </div>
  )
}
