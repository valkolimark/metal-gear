'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { acceptInvite } from '@/app/actions/invites'
import { Button } from '@/components/ui/button'
import Image from 'next/image'

interface Props {
  token: string
  userId: string
  companyName: string
  companyLogo?: string
  role: string
  email: string
}

export function InviteAcceptClient({ token, userId, companyName, companyLogo, role, email }: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  async function handleAccept() {
    setLoading(true)
    setError(null)
    const result = await acceptInvite(token, userId)
    if (result.success) {
      router.push('/dashboard?joined=true')
    } else {
      setError(result.error ?? 'Something went wrong.')
      setLoading(false)
    }
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center px-4">
      <div className="max-w-md w-full bg-card border border-border rounded-2xl p-8 text-center">
        {companyLogo && (
          <div className="w-20 h-20 mx-auto mb-4 rounded-xl overflow-hidden border border-border">
            <Image src={companyLogo} alt={companyName} width={80} height={80} className="object-contain" unoptimized />
          </div>
        )}
        <h1 className="text-2xl font-bold font-display mb-2">Join {companyName}</h1>
        <p className="text-muted-foreground mb-1 text-sm">
          You&apos;ve been invited as a <strong className="text-foreground">{role}</strong>
        </p>
        <p className="text-muted-foreground text-sm mb-8">Invite sent to {email}</p>

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 text-destructive rounded-lg p-3 text-sm mb-4">
            {error}
          </div>
        )}

        <Button
          className="w-full h-12 text-base font-semibold bg-[#1877F2] hover:bg-[#1565d8]"
          onClick={handleAccept}
          disabled={loading}
        >
          {loading ? 'Joining...' : `Accept & Join ${companyName}`}
        </Button>
        <p className="text-xs text-muted-foreground mt-4">
          By accepting, you&apos;ll switch your active company to {companyName}.
        </p>
      </div>
    </div>
  )
}
