import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface EmptyStateProps {
  icon?: string
  title: string
  message: string
  action?: {
    label: string
    href: string
  }
  secondaryAction?: {
    label: string
    href: string
  }
}

export function EmptyState({ icon, title, message, action, secondaryAction }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-20 px-4 max-w-md mx-auto">
      {icon && <div className="text-5xl mb-4">{icon}</div>}
      <h2 className="text-xl font-semibold font-display mb-2 text-foreground">{title}</h2>
      <p className="text-muted-foreground text-sm mb-6 leading-relaxed font-body">{message}</p>
      <div className="flex flex-col sm:flex-row gap-3">
        {action && (
          <Button asChild className="bg-[#1877F2] hover:bg-[#1565d8]">
            <Link href={action.href}>{action.label}</Link>
          </Button>
        )}
        {secondaryAction && (
          <Button variant="outline" asChild>
            <Link href={secondaryAction.href}>{secondaryAction.label}</Link>
          </Button>
        )}
      </div>
    </div>
  )
}
