'use client'

import { useState, useSyncExternalStore } from 'react'
import { Camera, Tag, Gauge, Wrench, ChevronRight, ChevronDown } from 'lucide-react'
import { Button } from '@/components/ui/button'

const STORAGE_KEY = 'mg-photo-tips-dismissed'

interface PhotoTipsBannerProps {
  className?: string
}

const tips = [
  {
    icon: Camera,
    title: 'Wide shot',
    description: 'The whole machine, clean background, natural light if possible.',
  },
  {
    icon: Tag,
    title: 'Nameplate / data tag',
    description: 'Close up, fully legible. Buyers verify model + serial here.',
  },
  {
    icon: Gauge,
    title: 'Wear points',
    description: 'Hour meters, bearings, couplings, anywhere condition shows.',
  },
  {
    icon: Wrench,
    title: 'Parts & teardown',
    description: 'If the unit is disassembled, show each major piece. Good teardown listings have 20\u201340 photos.',
  },
]

// Detect narrow viewport + dismissed state without useEffect + setState
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function subscribeToNothing(_callback: () => void) {
  return () => {}
}
function getClientSnapshot() {
  if (!window.matchMedia('(min-width: 360px)').matches) return 'hidden'
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true' ? 'dismissed' : 'fresh'
  } catch {
    return 'fresh'
  }
}
function getServerSnapshot() {
  return 'ssr' as const
}

export function PhotoTipsBanner({ className = '' }: PhotoTipsBannerProps) {
  const clientState = useSyncExternalStore(subscribeToNothing, getClientSnapshot, getServerSnapshot)
  const [isExpanded, setIsExpanded] = useState(clientState === 'fresh')

  // SSR: render nothing (avoids hydration mismatch since client may differ)
  if (clientState === 'ssr') return null
  // Narrow viewport: don't render
  if (clientState === 'hidden') return null

  const ChevronIcon = isExpanded ? ChevronDown : ChevronRight

  return (
    <div
      className={`overflow-hidden rounded-lg border border-border border-l-4 border-l-[#FF6B2B] bg-card ${className}`}
    >
      {/* Header — always visible */}
      <button
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center gap-2 px-4 py-3 text-left"
        aria-expanded={isExpanded}
        aria-controls="photo-tips-content"
      >
        <span aria-hidden="true" className="text-base leading-none">
          &#x1F4F8;
        </span>
        <span className="flex-1 font-body text-sm font-medium text-foreground">
          Photos that sell industrial equipment
        </span>
        <ChevronIcon className="size-4 shrink-0 text-muted-foreground" />
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div id="photo-tips-content" className="space-y-3 px-4 pb-4">
          <div className="space-y-2.5">
            {tips.map((tip) => (
              <div key={tip.title} className="flex gap-2.5">
                <tip.icon
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="font-body text-sm text-foreground">
                  <span className="font-medium">{tip.title}</span>
                  {' \u2014 '}
                  <span className="text-muted-foreground">{tip.description}</span>
                </p>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between">
            <p className="font-body text-xs text-muted-foreground">
              Quality photos typically get 3&ndash;4&times; more buyer inquiries.
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 font-body text-xs"
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(false)
                try {
                  localStorage.setItem(STORAGE_KEY, 'true')
                } catch {
                  // localStorage unavailable — no-op
                }
              }}
            >
              Got it
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
