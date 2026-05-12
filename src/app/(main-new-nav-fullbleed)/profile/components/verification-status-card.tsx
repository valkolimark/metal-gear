'use client'

import { useState } from 'react'
import { BadgeCheck, Clock, XCircle } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { VerificationForm } from './verification-form'

interface VerificationStatusCardProps {
  verification: {
    status: string
    ein: string | null
    ein_submitted_at: string | null
    reviewed_at: string | null
    rejection_reason: string | null
  }
  userId: string
  onResubmitted?: () => void
}

function maskEin(ein: string | null): string {
  if (!ein) return 'XX-XXXXXXX'
  const digits = ein.replace(/\D/g, '')
  if (digits.length < 4) return ein
  return `XX-XXXXX${digits.slice(-2)}`
}

export function VerificationStatusCard({
  verification,
  userId,
  onResubmitted,
}: VerificationStatusCardProps) {
  const [showResubmit, setShowResubmit] = useState(false)

  if (verification.status === 'approved') {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-green-500/10 p-4">
        <BadgeCheck className="size-6 text-green-500" />
        <div>
          <p className="font-body text-sm font-medium text-green-500">
            Your account is verified
          </p>
          {verification.reviewed_at && (
            <p className="font-body text-xs text-muted-foreground">
              Approved on{' '}
              {new Date(verification.reviewed_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (verification.status === 'pending') {
    return (
      <div className="space-y-2 rounded-lg bg-yellow-500/10 p-4">
        <div className="flex items-center gap-3">
          <Clock className="size-6 text-yellow-500" />
          <div>
            <Badge className="border-0 bg-yellow-500/20 font-body text-xs text-yellow-500">
              Pending Review
            </Badge>
            <p className="mt-1 font-body text-sm text-muted-foreground">
              Your verification is under review. We&apos;ll notify you when
              it&apos;s approved.
            </p>
          </div>
        </div>
        <div className="ml-9 space-y-1">
          <p className="font-body text-xs text-muted-foreground">
            EIN: {maskEin(verification.ein)}
          </p>
          {verification.ein_submitted_at && (
            <p className="font-body text-xs text-muted-foreground">
              Submitted:{' '}
              {new Date(verification.ein_submitted_at).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (verification.status === 'rejected') {
    return (
      <div className="space-y-3">
        <div className="rounded-lg bg-red-500/10 p-4">
          <div className="flex items-center gap-3">
            <XCircle className="size-6 text-red-500" />
            <div>
              <Badge className="border-0 bg-red-500/20 font-body text-xs text-red-500">
                Not Approved
              </Badge>
              <p className="mt-1 font-body text-sm text-muted-foreground">
                Your verification was not approved.
              </p>
            </div>
          </div>
          {verification.rejection_reason && (
            <p className="ml-9 mt-2 font-body text-xs text-red-400">
              Reason: {verification.rejection_reason}
            </p>
          )}
        </div>
        {showResubmit ? (
          <VerificationForm
            userId={userId}
            onSubmitted={() => {
              setShowResubmit(false)
              onResubmitted?.()
            }}
          />
        ) : (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowResubmit(true)}
            className="font-body"
          >
            Resubmit Verification
          </Button>
        )}
      </div>
    )
  }

  return null
}
