'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { UserPlus, UserCheck } from 'lucide-react'
import { toggleFollow } from '@/app/actions/follow-seller'

interface FollowButtonProps {
  sellerProfileId?: string | null
  sellerCompanyId?: string | null
  initialFollowing: boolean
}

export function FollowButton({
  sellerProfileId,
  sellerCompanyId,
  initialFollowing,
}: FollowButtonProps) {
  const [following, setFollowing] = useState(initialFollowing)
  const [isPending, startTransition] = useTransition()

  const handleClick = () => {
    // Optimistic flip; rollback on error.
    const next = !following
    setFollowing(next)
    startTransition(async () => {
      const res = await toggleFollow({
        sellerProfileId: sellerProfileId ?? null,
        sellerCompanyId: sellerCompanyId ?? null,
      })
      if (!res.ok) {
        setFollowing(!next)
        toast.error(res.error)
      } else if (res.isFollowing !== next) {
        setFollowing(res.isFollowing)
      }
    })
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={following}
      className={`inline-flex h-10 items-center gap-1.5 rounded-full px-4 text-[13px] font-bold transition-colors ${
        following
          ? 'border border-border bg-background text-foreground hover:bg-muted'
          : 'bg-[#0B2545] text-white hover:bg-[#0A1628]'
      } ${isPending ? 'opacity-70' : ''}`}
    >
      {following ? (
        <>
          <UserCheck className="size-4" />
          Following
        </>
      ) : (
        <>
          <UserPlus className="size-4" />
          Follow
        </>
      )}
    </button>
  )
}
