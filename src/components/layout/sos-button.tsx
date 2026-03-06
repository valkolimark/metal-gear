'use client'

import { useRouter } from 'next/navigation'
import { Siren } from 'lucide-react'

export function SosButton() {
  const router = useRouter()

  return (
    <button
      onClick={() => router.push('/sos/create')}
      className="group fixed bottom-20 left-4 z-40 flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-orange-500 shadow-lg shadow-red-500/25 transition-all hover:scale-110 hover:shadow-xl hover:shadow-red-500/30 active:scale-95 lg:bottom-6 lg:left-6 lg:size-16"
      aria-label="Send SOS"
    >
      {/* Pulsing ring */}
      <span className="absolute inset-0 animate-ping rounded-full bg-red-500/30" />
      <span className="absolute inset-1 animate-pulse rounded-full bg-red-500/20" />
      <Siren className="relative size-6 text-white lg:size-7" />
    </button>
  )
}
