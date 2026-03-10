'use client'

import Image from 'next/image'

interface CompanyAvatarProps {
  name: string
  logoUrl: string | null
  size?: number
  className?: string
}

export function CompanyAvatar({ name, logoUrl, size = 32, className = '' }: CompanyAvatarProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  if (logoUrl) {
    return (
      <div
        className={`relative rounded-md overflow-hidden flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <Image src={logoUrl} alt={name} fill className="object-contain" sizes={`${size}px`} />
      </div>
    )
  }

  return (
    <div
      className={`rounded-md flex items-center justify-center flex-shrink-0
        bg-primary/15 text-primary font-bold font-['Chakra_Petch'] ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  )
}
