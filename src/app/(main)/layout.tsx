import { Header } from '@/components/layout/header'
import { DesktopNav } from '@/components/layout/desktop-nav'
import { MobileNav } from '@/components/layout/mobile-nav'
import { MobileDrawer } from '@/components/layout/mobile-drawer'
import { HelpButton } from '@/components/layout/help-button'
import { SosButton } from '@/components/layout/sos-button'

export default function MainLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />
      <DesktopNav />
      <MobileDrawer />

      {/*
        Main content area. Pages that use <PageLayout sidebar={...}>
        will render their own sidebar + content grid inside here.
        Pages without a sidebar get the default padded container.
      */}
      <main id="main-content" className="flex flex-1 flex-col pb-16 lg:pb-0">
        {children}
      </main>

      <MobileNav />
      <HelpButton />
      <SosButton />
    </div>
  )
}
