'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useRef } from 'react'
import type { ProfileTabSpec } from './types'

interface ProfileTabsNavProps {
  tabs: ProfileTabSpec[]
  defaultTab: string
  paramName?: string
}

export function ProfileTabsNav({
  tabs,
  defaultTab,
  paramName = 'tab',
}: ProfileTabsNavProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const rawTab = searchParams.get(paramName)
  const known = tabs.find((t) => t.id === rawTab && !t.disabled)
  const active = known ? known.id : defaultTab

  const containerRef = useRef<HTMLDivElement | null>(null)
  const buttonRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  const setTab = useCallback(
    (id: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (id === defaultTab) params.delete(paramName)
      else params.set(paramName, id)
      const query = params.toString()
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false })
    },
    [searchParams, router, pathname, paramName, defaultTab],
  )

  // Arrow-key keyboard navigation between enabled tabs.
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) return
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return
      const enabled = tabs.filter((t) => !t.disabled)
      const idx = enabled.findIndex((t) => t.id === active)
      if (idx < 0) return
      const nextIdx =
        e.key === 'ArrowRight'
          ? (idx + 1) % enabled.length
          : (idx - 1 + enabled.length) % enabled.length
      const next = enabled[nextIdx]
      setTab(next.id)
      buttonRefs.current[next.id]?.focus()
      e.preventDefault()
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [tabs, active, setTab])

  return (
    <div
      ref={containerRef}
      role="tablist"
      aria-label="Profile tabs"
      className="sticky top-0 z-10 -mx-4 flex items-center gap-1 overflow-x-auto rounded-none border-b border-border bg-card px-4 md:mx-0 md:rounded-2xl md:px-2 md:shadow-[0_1px_2px_rgba(11,37,69,0.04),0_4px_12px_rgba(11,37,69,0.05)]"
    >
      {tabs.map((t) => {
        const isActive = t.id === active
        const isDisabled = !!t.disabled
        return (
          <button
            key={t.id}
            ref={(el) => {
              buttonRefs.current[t.id] = el
            }}
            type="button"
            role="tab"
            aria-selected={isActive}
            aria-controls={`tabpanel-${t.id}`}
            disabled={isDisabled}
            tabIndex={isActive ? 0 : -1}
            onClick={() => !isDisabled && setTab(t.id)}
            className={`relative inline-flex h-12 shrink-0 items-center gap-1.5 px-3.5 text-[13px] font-bold transition-colors ${
              isDisabled
                ? 'cursor-not-allowed text-muted-foreground/50'
                : isActive
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {t.label}
            {t.count !== undefined && t.count !== null && (
              <span
                className={`inline-flex h-[18px] items-center rounded-full px-1.5 text-[10.5px] font-bold ${
                  isActive
                    ? 'bg-foreground/10 text-foreground'
                    : 'bg-muted text-muted-foreground'
                }`}
                style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
              >
                {t.count}
              </span>
            )}
            {isActive && (
              <span
                aria-hidden
                className="absolute right-2 bottom-0 left-2 rounded-t-[3px]"
                style={{ height: 3, background: '#FF6B2B' }}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
