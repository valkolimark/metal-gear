'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function WelcomeBackStrip({ firstName }: { firstName: string }) {
  const [dismissed, setDismissed] = useState(false)

  if (dismissed) return null

  return (
    <div className="w-full bg-primary/10 border-b border-primary/20">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-2.5 sm:flex-row">
        <Link
          href="/dashboard"
          className="font-body text-sm font-medium text-foreground hover:text-primary transition-colors"
        >
          Welcome back, {firstName}
          <ArrowRight className="ml-1 inline size-3.5" />
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild size="sm" className="font-body text-xs h-7">
            <Link href="/dashboard">Go to Dashboard</Link>
          </Button>
          <button
            onClick={() => setDismissed(true)}
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
            aria-label="Dismiss"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
