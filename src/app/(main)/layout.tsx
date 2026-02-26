import { Header } from '@/components/layout/header'
import { DesktopNav } from '@/components/layout/desktop-nav'
import { MobileNav } from '@/components/layout/mobile-nav'
import { MobileDrawer } from '@/components/layout/mobile-drawer'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <DesktopNav />
      <MobileDrawer />
      <main className="mx-auto max-w-7xl px-4 py-6 pb-20 sm:px-6 lg:px-8 lg:pb-6">
        {children}
      </main>
      <MobileNav />
    </div>
  )
}
