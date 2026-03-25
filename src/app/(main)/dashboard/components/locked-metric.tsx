'use client'

import Link from 'next/link'
import { Lock } from 'lucide-react'

interface LockedMetricProps {
  label: string
  upgradeReason: string
  className?: string
}

export function LockedMetric({ label, upgradeReason, className = '' }: LockedMetricProps) {
  return (
    <div className={`bg-card border border-border rounded-xl p-4 relative overflow-hidden ${className}`}>
      {/* Blurred placeholder values */}
      <div className="opacity-20 pointer-events-none select-none" aria-hidden="true">
        <div className="flex items-center gap-1.5 mb-2">
          <div className="w-4 h-4 rounded bg-muted-foreground/40" />
          <span className="text-xs text-muted-foreground font-medium">{label}</span>
        </div>
        <div className="text-3xl font-bold font-display blur-sm">&mdash;</div>
        <div className="mt-1 h-1.5 w-24 bg-muted rounded-full" />
      </div>

      {/* Lock overlay */}
      <div
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center"
        role="group"
        aria-label={`${label} — locked`}
      >
        <Lock className="w-4 h-4 text-muted-foreground" />
        <p className="text-xs text-muted-foreground leading-snug">{upgradeReason}</p>
        <Link
          href="/pricing"
          className="text-xs font-semibold text-[#1877F2] hover:underline"
        >
          Upgrade to Pro →
        </Link>
      </div>
    </div>
  )
}
