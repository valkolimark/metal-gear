'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, X } from 'lucide-react'

const STORAGE_KEY = 'mg-sos-banner-dismissed'

export function FeedSOSBanner() {
  const [dismissed, setDismissed] = useState(true) // default true to avoid flash

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- loading local storage data on mount
    setDismissed(localStorage.getItem(STORAGE_KEY) === 'true')
  }, [])

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, 'true')
    setDismissed(true)
  }

  if (dismissed) return null

  return (
    <div className="md:hidden mx-0 mb-4 rounded-xl border border-orange-500/30 bg-orange-500/[0.08] p-3 flex items-center gap-3">
      <div className="w-9 h-9 rounded-full bg-orange-500/15 flex items-center justify-center shrink-0">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-orange-500">Need equipment urgently?</p>
        <p className="text-xs text-muted-foreground">Broadcast to sellers in your area instantly</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Link
          href="/sos/create"
          className="text-xs font-bold text-orange-500 bg-orange-500/15 rounded-lg px-3 py-1.5 hover:bg-orange-500/25"
        >
          Send SOS
        </Link>
        <button onClick={dismiss} className="text-muted-foreground hover:text-foreground">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  )
}
