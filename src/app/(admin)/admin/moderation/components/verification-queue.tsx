'use client'

import { useState } from 'react'
import { CheckCircle2, XCircle, ExternalLink, Shield } from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { reviewVerification } from '@/app/actions/verification'

interface VerificationItem {
  id: string
  user_id: string
  ein: string | null
  business_name: string
  document_url: string | null
  ein_submitted_at: string | null
  created_at: string
  profiles: {
    full_name: string | null
    display_name: string | null
    company_name: string | null
    avatar_url: string | null
    email_notifications: boolean | null
  } | null
}

interface VerificationQueueProps {
  verifications: VerificationItem[]
  onRefresh: () => void
}

export function VerificationQueue({
  verifications,
  onRefresh,
}: VerificationQueueProps) {
  const [rejectId, setRejectId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState('')
  const [processing, setProcessing] = useState<string | null>(null)

  async function handleApprove(id: string) {
    setProcessing(id)
    try {
      const result = await reviewVerification(id, 'approved')
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Verification approved')
        onRefresh()
      }
    } catch {
      toast.error('Failed to approve')
    } finally {
      setProcessing(null)
    }
  }

  async function handleReject() {
    if (!rejectId || rejectReason.trim().length < 10) return
    setProcessing(rejectId)
    try {
      const result = await reviewVerification(
        rejectId,
        'rejected',
        rejectReason.trim()
      )
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Verification rejected')
        setRejectId(null)
        setRejectReason('')
        onRefresh()
      }
    } catch {
      toast.error('Failed to reject')
    } finally {
      setProcessing(null)
    }
  }

  if (verifications.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-12 text-center">
        <Shield className="size-10 text-muted-foreground/50" />
        <p className="font-body text-sm text-muted-foreground">
          No pending verifications.
        </p>
      </div>
    )
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                Seller
              </th>
              <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                EIN
              </th>
              <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                Document
              </th>
              <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                Submitted
              </th>
              <th className="px-4 py-3 text-right font-body text-xs font-medium text-muted-foreground">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {verifications.map((v) => {
              const name =
                v.profiles?.display_name ??
                v.profiles?.full_name ??
                'Unknown'
              const submitted = v.ein_submitted_at ?? v.created_at
              const timeAgo = getRelativeTime(submitted)

              return (
                <tr
                  key={v.id}
                  className="border-b border-border hover:bg-white/[0.02]"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Avatar className="size-7">
                        {v.profiles?.avatar_url && (
                          <AvatarImage
                            src={v.profiles.avatar_url}
                            alt={name}
                          />
                        )}
                        <AvatarFallback className="font-display text-[10px]">
                          {name[0]?.toUpperCase() ?? '?'}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-body text-sm text-foreground">
                          {name}
                        </p>
                        <p className="font-body text-[10px] text-muted-foreground">
                          {v.business_name}
                        </p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 font-mono text-sm text-foreground">
                    {v.ein ?? '—'}
                  </td>
                  <td className="px-4 py-3">
                    {v.document_url ? (
                      <a
                        href={v.document_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 font-body text-xs text-primary hover:underline"
                      >
                        View <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="font-body text-xs text-muted-foreground">
                        None
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-body text-xs text-muted-foreground">
                    {timeAgo}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 border-green-500/30 font-body text-xs text-green-500 hover:bg-green-500/10"
                        disabled={processing === v.id}
                        onClick={() => handleApprove(v.id)}
                      >
                        <CheckCircle2 className="size-3.5" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="gap-1 border-red-500/30 font-body text-xs text-red-500 hover:bg-red-500/10"
                        disabled={processing === v.id}
                        onClick={() => {
                          setRejectId(v.id)
                          setRejectReason('')
                        }}
                      >
                        <XCircle className="size-3.5" />
                        Reject
                      </Button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Reject dialog */}
      <Dialog
        open={!!rejectId}
        onOpenChange={(open) => !open && setRejectId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">
              Reject Verification
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <p className="font-body text-sm text-muted-foreground">
              Provide a reason for rejection. This will be shown to the seller.
            </p>
            <Textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Reason for rejection (min 10 characters)..."
              rows={3}
              className="font-body"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setRejectId(null)}
              className="font-body"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                rejectReason.trim().length < 10 || processing === rejectId
              }
              onClick={handleReject}
              className="font-body"
            >
              Reject Verification
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function getRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}
