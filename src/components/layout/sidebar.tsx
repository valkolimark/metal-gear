'use client'

import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface SidebarProps {
  open: boolean
  onClose: () => void
  children: React.ReactNode
  className?: string
  title?: string
  /** Side the sidebar appears on. Default: left */
  side?: 'left' | 'right'
}

/**
 * Responsive sidebar component.
 *
 * - Desktop (lg+): persistent sidebar alongside content
 * - Tablet/mobile (<lg): slide-over drawer with backdrop
 *
 * Usage: pair with <PageLayout sidebar={...}> for the grid,
 * or use standalone for overlay-only sidebars.
 */
export function Sidebar({
  open,
  onClose,
  children,
  className,
  title,
  side = 'left',
}: SidebarProps) {
  return (
    <>
      {/* Sidebar panel — desktop only, hidden on mobile (use MobileFilterSheet instead) */}
      <aside
        className={cn(
          // Base styles
          'z-40 hidden w-72 shrink-0 flex-col border-border bg-surface lg:flex',
          // Desktop: relative positioning
          'lg:relative',
          // Position
          side === 'left'
            ? 'left-0 border-r'
            : 'right-0 border-l',
          // Desktop: only show when open
          !open && 'lg:hidden',
          className
        )}
      >

        {/* Desktop header with collapse */}
        {title && (
          <div className="hidden h-14 items-center justify-between border-b border-border px-4 lg:flex">
            <span className="font-display text-sm font-semibold text-foreground">
              {title}
            </span>
            <Button variant="ghost" size="icon-sm" onClick={onClose}>
              <X className="size-4" />
            </Button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">{children}</div>
      </aside>
    </>
  )
}
