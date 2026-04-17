'use client'

import { useRouter, usePathname } from 'next/navigation'
import { FileText, Package, AlertTriangle } from 'lucide-react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { cn } from '@/lib/utils'

interface MobileComposeSheetProps {
  open: boolean
  onClose: () => void
}

export function MobileComposeSheet({ open, onClose }: MobileComposeSheetProps) {
  const router = useRouter()
  const pathname = usePathname()

  const actions = [
    {
      icon: FileText,
      label: 'New Post',
      description: 'Share an update, photo, or video',
      color: 'text-primary',
      bg: 'bg-primary/10',
      onClick: () => {
        onClose()
        if (pathname === '/feed') {
          // Scroll to composer and focus
          const composer = document.querySelector<HTMLTextAreaElement>('[data-feed-composer]')
          if (composer) {
            composer.scrollIntoView({ behavior: 'smooth', block: 'center' })
            setTimeout(() => composer.focus(), 300)
          }
        } else {
          router.push('/feed?compose=true')
        }
      },
    },
    {
      icon: Package,
      label: 'List Equipment',
      description: 'Post equipment for sale or lease',
      color: 'text-blue-500',
      bg: 'bg-blue-500/10',
      onClick: () => {
        onClose()
        router.push('/listings/snap')
      },
    },
    {
      icon: AlertTriangle,
      label: 'Send SOS',
      description: 'Urgent equipment need — broadcast now',
      color: 'text-orange-500',
      bg: 'bg-orange-500/10',
      onClick: () => {
        onClose()
        router.push('/sos/create')
      },
      urgent: true,
    },
  ]

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="rounded-t-2xl" style={{ paddingBottom: 'max(1rem, env(safe-area-inset-bottom))' }}>
        <SheetHeader className="text-left mb-4">
          <SheetTitle className="font-display">Create</SheetTitle>
        </SheetHeader>
        <div className="flex flex-col gap-3 pb-4">
          {actions.map((action) => (
            <button
              key={action.label}
              onClick={action.onClick}
              className={cn(
                'flex items-center gap-4 w-full rounded-xl p-4 text-left transition-colors',
                'hover:bg-muted active:scale-[0.98]',
                action.urgent && 'border border-orange-500/30 bg-orange-500/5'
              )}
            >
              <div
                className={cn(
                  'w-12 h-12 rounded-full flex items-center justify-center shrink-0',
                  action.bg
                )}
              >
                <action.icon className={cn('w-6 h-6', action.color)} />
              </div>
              <div className="flex-1 min-w-0">
                <p className={cn('font-semibold', action.urgent && 'text-orange-500')}>
                  {action.label}
                </p>
                <p className="text-sm text-muted-foreground">{action.description}</p>
              </div>
              {action.urgent && (
                <div className="shrink-0">
                  <span className="text-xs font-bold text-orange-500 bg-orange-500/10 rounded-full px-2 py-0.5">
                    URGENT
                  </span>
                </div>
              )}
            </button>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
