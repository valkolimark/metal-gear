'use client'

import { useRef, useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { AlertTriangle, LayoutDashboard, ChevronDown, Siren } from 'lucide-react'

export function SosNavPopover() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const router = useRouter()

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [open])

  // Close on escape
  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open])

  function navigate(path: string) {
    setOpen(false)
    router.push(path)
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="true"
        aria-expanded={open}
        className="flex items-center gap-1.5 border-b-2 border-transparent px-4 py-3 font-body text-sm text-[#FF6B2B] transition-colors hover:border-[#FF6B2B]/50 hover:text-[#e55e22]"
      >
        <Siren className="size-4" aria-hidden="true" />
        SOS
        <ChevronDown
          className={`size-3 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <div
          role="menu"
          className="absolute left-0 top-full mt-1 w-64 overflow-hidden rounded-xl border border-border bg-card shadow-lg shadow-black/20 z-50 animate-in fade-in-0 zoom-in-95 duration-100"
        >
          <button
            role="menuitem"
            onClick={() => navigate('/sos/create')}
            className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/60"
          >
            <AlertTriangle className="mt-0.5 size-4 flex-shrink-0 text-[#FF6B2B]" />
            <div>
              <p className="mb-1 text-sm font-semibold leading-none text-foreground">
                Send SOS
              </p>
              <p className="text-xs leading-snug text-muted-foreground">
                Broadcast an urgent equipment need
              </p>
            </div>
          </button>

          <div className="border-t border-border" />

          <button
            role="menuitem"
            onClick={() => navigate('/sos')}
            className="flex w-full items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/60"
          >
            <LayoutDashboard className="mt-0.5 size-4 flex-shrink-0 text-muted-foreground" />
            <div>
              <p className="mb-1 text-sm font-semibold leading-none text-foreground">
                SOS Dashboard
              </p>
              <p className="text-xs leading-snug text-muted-foreground">
                View and respond to active alerts
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  )
}
