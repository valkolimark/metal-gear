'use client'

import { CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface SOSSentStepProps {
  vendorsNotified: number
  onReset: () => void
}

export function SOSSentStep({ vendorsNotified, onReset }: SOSSentStepProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle className="size-10 text-green-500" />
      </div>

      <h2 className="font-display text-2xl font-bold text-foreground">
        SOS Broadcast Sent
      </h2>

      <p className="mt-2 max-w-sm font-body text-sm text-muted-foreground">
        {vendorsNotified > 0
          ? `Your urgent request has been sent to ${vendorsNotified} vendor${vendorsNotified === 1 ? '' : 's'} matching your equipment type.`
          : 'Your SOS is live and visible to all users. Vendors will be notified as they come online.'}
      </p>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button asChild className="gap-2 bg-[#FF6B2B] text-white hover:bg-[#FF6B2B]/90">
          <Link href="/sos">View SOS Dashboard</Link>
        </Button>
        <Button variant="outline" onClick={onReset}>
          Send Another SOS
        </Button>
      </div>
    </div>
  )
}
