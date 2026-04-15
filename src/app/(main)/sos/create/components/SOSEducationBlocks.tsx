'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, Info, Radio } from 'lucide-react'

/**
 * Collapsible "How SOS broadcasts work" hint. Default collapsed so it
 * doesn't push the form around. Used at the top of both the text and
 * camera-first SOS forms.
 */
export function HowSosWorksHint() {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-lg border border-border bg-surface/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 px-4 py-2.5 text-left"
        aria-expanded={open}
      >
        <Info className="size-4 text-muted-foreground" />
        <span className="flex-1 font-body text-sm text-foreground">
          How SOS broadcasts work
        </span>
        {open ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>
      {open && (
        <div className="border-t border-border px-4 py-3">
          <p className="mb-2 font-body text-xs text-muted-foreground">
            Your SOS reaches three types of vendors simultaneously:
          </p>
          <ul className="space-y-1 font-body text-xs text-foreground">
            <li>
              <span className="font-semibold">•</span> Equipment dealers who can sell or source replacement units
            </li>
            <li>
              <span className="font-semibold">•</span> Rebuilders who can repair your existing equipment
            </li>
            <li>
              <span className="font-semibold">•</span> Logistics providers for transport &amp; rigging (if selected)
            </li>
          </ul>
        </div>
      )}
    </div>
  )
}

/**
 * Animated callout shown directly below the "I also need transport / rigging"
 * toggle when the user flips it on. Fades in/out via Tailwind opacity+height
 * transitions. Rendered conditionally on `visible`.
 */
export function MultiSegmentCallout({ visible }: { visible: boolean }) {
  if (!visible) return null
  return (
    <div
      className="mt-2 flex items-start gap-3 rounded-lg border-l-4 border-[#FF6B2B] bg-orange-50 px-4 py-3 transition-opacity duration-200 dark:bg-orange-950/20"
      role="status"
      aria-live="polite"
    >
      <Radio className="mt-0.5 size-4 shrink-0 text-[#FF6B2B]" />
      <div className="font-body text-xs text-foreground">
        <p className="font-semibold">
          You just expanded your SOS to logistics vendors
        </p>
        <p className="mt-1 text-muted-foreground">
          Your request will now reach equipment suppliers, rebuilders, AND rigging &amp; transport providers. One broadcast. Three audiences.
        </p>
      </div>
    </div>
  )
}
