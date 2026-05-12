import { redirect } from 'next/navigation'
import { AppHeader } from './AppHeader'
import { AppSidebar } from './AppSidebar'
import { AppMobileBottomNav } from './AppMobileBottomNav'
import { SidebarStatePreloader } from './SidebarStatePreloader'
import { getNavContext } from '@/lib/layout/nav-data'
import './app-shell.css'

interface AppShellDashboardProps {
  children: React.ReactNode
}

export async function AppShellDashboard({ children }: AppShellDashboardProps) {
  const ctx = await getNavContext()
  if (!ctx) redirect('/login')

  return (
    <div className="app-shell-dashboard flex min-h-screen w-full flex-col bg-background">
      <SidebarStatePreloader />
      <AppHeader variant="dashboard" ctx={ctx} />
      <div className="flex min-h-0 flex-1">
        <AppSidebar ctx={ctx} />
        <main
          id="main-content"
          className="min-w-0 flex-1 pb-[calc(60px+env(safe-area-inset-bottom,0px))] md:pb-0"
        >
          {children}
        </main>
      </div>
      <AppMobileBottomNav badges={ctx.badges} />
    </div>
  )
}
