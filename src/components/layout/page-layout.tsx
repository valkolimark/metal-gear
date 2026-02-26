'use client'

import { cn } from '@/lib/utils'

interface PageLayoutProps {
  children: React.ReactNode
  /** Sidebar element — rendered to the left of content on desktop, overlay on mobile */
  sidebar?: React.ReactNode
  /** Whether the sidebar is currently open (affects desktop grid) */
  sidebarOpen?: boolean
  className?: string
}

/**
 * Responsive page layout with optional sidebar.
 *
 * Breakpoints:
 * - Desktop (lg, 1024px+): sidebar + content side-by-side
 * - Tablet (md, 768px-1023px): full-width content, sidebar is overlay
 * - Mobile (<768px): full-width content, sidebar is full-screen drawer
 *
 * Wrap page content with this component when the page needs a sidebar
 * (search filters, settings nav, etc).
 */
export function PageLayout({
  children,
  sidebar,
  sidebarOpen = false,
  className,
}: PageLayoutProps) {
  return (
    <div
      className={cn(
        'flex min-h-0 flex-1',
        className
      )}
    >
      {/* Sidebar — rendered by the page, positioned here in flow */}
      {sidebar}

      {/* Main content */}
      <div
        className={cn(
          'mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 lg:px-8',
          // When sidebar is open on desktop, reduce max-width so content
          // doesn't get too wide
          sidebarOpen && 'lg:max-w-5xl'
        )}
      >
        {children}
      </div>
    </div>
  )
}
