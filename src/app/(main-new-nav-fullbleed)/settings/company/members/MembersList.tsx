'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { removeMember } from '@/app/actions/company'
import { requestMembershipPublicVisibility } from '@/app/actions/team-visibility'
import { toast } from 'sonner'
import { User, Eye, EyeOff } from 'lucide-react'
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
  const [nudgedIds, setNudgedIds] = useState<Set<string>>(new Set())

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

  const handleRequestVisibility = (membershipId: string, name: string) => {
    setNudgedIds((prev) => new Set(prev).add(membershipId))
    startTransition(async () => {
      const result = await requestMembershipPublicVisibility({ membershipId })
      if (result.ok) {
        toast.success(`Asked ${name} to make their profile public.`)
      } else {
        toast.error(result.error)
        setNudgedIds((prev) => {
          const next = new Set(prev)
          next.delete(membershipId)
          return next
        })
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
        {company.members.map(member => {
          const isSelf = member.user_id === currentUserId
          const isPublic = member.is_public_on_profile
          const wasNudged = nudgedIds.has(member.membership_id)
          return (
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
                <p className="text-xs text-muted-foreground truncate flex items-center gap-1.5">
                  {isPublic ? (
                    <>
                      <Eye className="size-3 text-emerald-500 shrink-0" />
                      <span className="text-emerald-600 dark:text-emerald-400">
                        Public on team page
                      </span>
                    </>
                  ) : (
                    <>
                      <EyeOff className="size-3 shrink-0" />
                      <span>Private</span>
                    </>
                  )}
                  <span aria-hidden>·</span>
                  <span className="truncate">{member.email}</span>
                </p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide
                  ${ROLE_STYLES[member.role]}`}
              >
                {member.role}
              </span>
              {canManage && !isSelf && !isPublic && (
                <button
                  onClick={() =>
                    handleRequestVisibility(
                      member.membership_id,
                      member.full_name ?? 'this member'
                    )
                  }
                  disabled={isPending || wasNudged}
                  className="text-xs text-[#FF6B2B] hover:underline disabled:opacity-50"
                  title="Send a notification asking the member to opt into the public team page"
                >
                  {wasNudged ? 'Requested ✓' : 'Request public visibility'}
                </button>
              )}
              {isSelf && (
                <a
                  href="/settings/team-visibility"
                  className="text-xs text-muted-foreground hover:text-foreground hover:underline"
                  title="Change your own visibility"
                >
                  {isPublic ? 'Make private' : 'Make public'}
                </a>
              )}
              {canManage && member.role !== 'owner' && !isSelf && (
                <button
                  onClick={() => handleRemove(member.user_id, member.full_name ?? 'this member')}
                  disabled={isPending && removingId === member.user_id}
                  className="text-xs text-destructive hover:underline disabled:opacity-50"
                >
                  {isPending && removingId === member.user_id ? 'Removing...' : 'Remove'}
                </button>
              )}
            </div>
          )
        })}
      </div>

    </div>
  )
}
