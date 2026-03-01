'use client'

import Link from 'next/link'
import { HelpCircle } from 'lucide-react'
import { usePathname } from 'next/navigation'

export function HelpButton() {
  const pathname = usePathname()

  // Don't show on the help page itself
  if (pathname.startsWith('/help')) return null

  return (
    <Link
      href="/help"
      className="fixed bottom-20 right-4 z-40 flex items-center gap-1.5 rounded-full bg-primary px-3 py-2 font-body text-xs font-medium text-white shadow-lg transition-colors hover:bg-primary/90 lg:bottom-6"
    >
      <HelpCircle className="size-4" />
      Help
    </Link>
  )
}
