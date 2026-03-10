'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { removeMember } from '@/app/actions/company'
import { toast } from 'sonner'
import { User, UserPlus } from 'lucide-react'
import type { CompanyWithMembers, CompanyRole } from '@/types/company'

const ROLE_STYLES: Record<CompanyRole, string> = {
  owner: 'bg-amber-500/15 text-amber-500',
  admin: 'bg-blue-500/15 text-blue-400',
  member: 'bg-muted text-muted-foreground',
}

export function MembersList({
  company,
  currentUserId,
}: {
  company: CompanyWithMembers
  currentUserId: string
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [removingId, setRemovingId] = useState<string | null>(null)

  const currentMember = company.members.find(m => m.user_id === currentUserId)
  const canManage = currentMember && ['owner', 'admin'].includes(currentMember.role)

  const handleRemove = (targetUserId: string, targetName: string) => {
    if (!confirm(`Remove ${targetName} from ${company.name}?`)) return
    setRemovingId(targetUserId)
    startTransition(async () => {
      const result = await removeMember(company.id, targetUserId, currentUserId)
      if (result.success) {
        toast.success(`${targetName} removed`)
        router.refresh()
      } else {
        toast.error(result.error ?? 'Failed to remove member')
      }
      setRemovingId(null)
    })
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
        {company.members.map(member => (
          <div key={member.membership_id} className="flex items-center gap-3 px-5 py-4">
            <div className="flex size-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted">
              {member.avatar_url ? (
                <Image
                  src={member.avatar_url}
                  alt=""
                  width={40}
                  height={40}
                  className="size-full object-cover"
                />
              ) : (
                <User className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {member.full_name || 'Unknown User'}
              </p>
              <p className="text-xs text-muted-foreground truncate">
                {member.email}
              </p>
            </div>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide
                ${ROLE_STYLES[member.role]}`}
            >
              {member.role}
            </span>
            {canManage && member.role !== 'owner' && member.user_id !== currentUserId && (
              <button
                onClick={() => handleRemove(member.user_id, member.full_name ?? 'this member')}
                disabled={isPending && removingId === member.user_id}
                className="text-xs text-destructive hover:underline disabled:opacity-50"
              >
                {isPending && removingId === member.user_id ? 'Removing...' : 'Remove'}
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between px-1">
        <button
          disabled
          className="flex items-center gap-2 text-sm text-muted-foreground cursor-not-allowed opacity-50"
          title="Coming soon"
        >
          <UserPlus size={14} />
          Invite team members
          <span className="text-[10px] bg-muted px-1.5 py-0.5 rounded-full">Coming soon</span>
        </button>
      </div>
    </div>
  )
}
