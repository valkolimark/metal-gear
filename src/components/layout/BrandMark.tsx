import Link from 'next/link'
import { cn } from '@/lib/utils'

interface BrandMarkProps {
  href?: string
  size?: 'sm' | 'md'
  variant?: 'mark' | 'wordmark'
  className?: string
  navEvent?: string
}

export function BrandMark({
  href = '/feed',
  size = 'md',
  variant = 'wordmark',
  className,
  navEvent = 'brand:click',
}: BrandMarkProps) {
  const dim = size === 'sm' ? 28 : 32
  return (
    <Link
      href={href}
      className={cn(
        'flex shrink-0 items-center gap-2 rounded-md focus:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        className,
      )}
      data-nav-event={navEvent}
      aria-label="Metal Gear home"
    >
      <span
        className="flex items-center justify-center rounded-md bg-[#1877F2] font-display text-[13px] font-bold tracking-[0.08em] text-white"
        style={{ width: dim, height: dim }}
        aria-hidden="true"
      >
        MG
      </span>
      {variant === 'wordmark' && (
        <span className="hidden font-display text-lg font-bold leading-none text-white sm:inline">
          Metal <span className="text-[#3D9BD6]">Gear</span>
        </span>
      )}
    </Link>
  )
}
