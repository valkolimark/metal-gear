'use client'

import { CheckCircle, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface SOSSentStepProps {
  vendorsNotified: number
  sosTitle?: string
  transportIncluded?: boolean
  onReset: () => void
}

export function SOSSentStep({
  vendorsNotified,
  sosTitle,
  transportIncluded = false,
  onReset,
}: SOSSentStepProps) {
  const haveCount = vendorsNotified > 0

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle className="size-10 text-green-500" />
      </div>

      <h2 className="font-display text-2xl font-bold text-foreground">
        SOS Broadcast Sent
      </h2>

      <p className="mt-2 max-w-sm font-body text-sm text-muted-foreground">
        Your SOS is live and being matched to vendors now.
      </p>

      {sosTitle && (
        <p className="mt-3 font-display text-base font-semibold text-foreground">
          &ldquo;{sosTitle}&rdquo;
        </p>
      )}

      {haveCount ? (
        <p className="mt-2 font-body text-xs text-muted-foreground">
          Delivered to {vendorsNotified} matching vendor
          {vendorsNotified === 1 ? '' : 's'}.
        </p>
      ) : (
        <p className="mt-2 font-body text-xs text-muted-foreground">
          Vendors will be notified as they come online.
        </p>
      )}

      {transportIncluded && (
        <div className="mt-6 flex max-w-md items-start gap-3 rounded-lg border-l-4 border-[#FF6B2B] bg-orange-50 px-4 py-3 text-left dark:bg-orange-950/20">
          <Radio className="mt-0.5 size-4 shrink-0 text-[#FF6B2B]" />
          <p className="font-body text-xs text-foreground">
            Nice work — you just sent one SOS that covers equipment, repair, AND logistics. Vendors will reach out directly by phone, text, or email.
          </p>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          asChild
          className="gap-2 bg-[#FF6B2B] text-white hover:bg-[#FF6B2B]/90"
        >
          <Link href="/sos">View My SOS</Link>
        </Button>
        <Button variant="outline" onClick={onReset}>
          Send Another
        </Button>
      </div>
    </div>
  )
}
