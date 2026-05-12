'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { revokeInvite } from '@/app/actions/invites'
import { toast } from 'sonner'
import { Clock, X } from 'lucide-react'

interface Invite {
  id: string
  email: string
  role: string
  status: string
  created_at: string
  expires_at: string
  invited_by: string
}

function timeUntilExpiry(expiresAt: string): string {
  const diff = new Date(expiresAt).getTime() - Date.now()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))
  if (days > 0) return `${days}d left`
  if (hours > 0) return `${hours}h left`
  return 'Expiring soon'
}

export function PendingInvites({ invites }: { invites: Invite[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [revokingId, setRevokingId] = useState<string | null>(null)

  function handleRevoke(inviteId: string, email: string) {
    setRevokingId(inviteId)
    startTransition(async () => {
      const result = await revokeInvite(inviteId)
      if (result.success) {
        toast.success(`Invite to ${email} revoked`)
        router.refresh()
      } else {
        toast.error('Failed to revoke invite')
      }
      setRevokingId(null)
    })
  }

  return (
    <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
      {invites.map(invite => (
        <div key={invite.id} className="flex items-center gap-3 px-5 py-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-foreground truncate">
              {invite.email}
            </p>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="capitalize">{invite.role}</span>
              <span>&middot;</span>
              <Clock size={10} />
              <span>{timeUntilExpiry(invite.expires_at)}</span>
            </div>
          </div>
          <button
            onClick={() => handleRevoke(invite.id, invite.email)}
            disabled={isPending && revokingId === invite.id}
            className="text-xs text-destructive hover:underline disabled:opacity-50 flex items-center gap-1"
          >
            <X size={12} />
            {isPending && revokingId === invite.id ? 'Revoking...' : 'Revoke'}
          </button>
        </div>
      ))}
    </div>
  )
}
