'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Building2 } from 'lucide-react'
import { Switch } from '@/components/ui/switch'
import { toggleMembershipPublicVisibility } from '@/app/actions/team-visibility'
import type { UserMembershipForVisibility } from '@/lib/profile/team'

const CARD_SHADOW = '0 1px 2px rgba(11,37,69,0.04), 0 4px 12px rgba(11,37,69,0.05)'

export function TeamVisibilityList({
  initial,
}: {
  initial: UserMembershipForVisibility[]
}) {
  const [items, setItems] = useState(initial)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [, startTransition] = useTransition()

  if (items.length === 0) {
    return (
      <section
        className="rounded-2xl bg-card p-8 text-center"
        style={{ boxShadow: CARD_SHADOW }}
      >
        <p className="text-sm text-muted-foreground">
          You&apos;re not a member of any company yet.
        </p>
      </section>
    )
  }

  function handleToggle(membershipId: string, next: boolean) {
    setPendingId(membershipId)
    setItems((prev) =>
      prev.map((m) =>
        m.membershipId === membershipId ? { ...m, isPublic: next } : m
      )
    )
    startTransition(async () => {
      const result = await toggleMembershipPublicVisibility({
        membershipId,
        isPublic: next,
      })
      if (!result.ok) {
        toast.error(result.error)
        // rollback
        setItems((prev) =>
          prev.map((m) =>
            m.membershipId === membershipId ? { ...m, isPublic: !next } : m
          )
        )
      } else {
        toast.success(next ? 'Now public on this team' : 'Now private')
      }
      setPendingId(null)
    })
  }

  return (
    <section className="rounded-2xl bg-card" style={{ boxShadow: CARD_SHADOW }}>
      <ul className="divide-y divide-border">
        {items.map((m) => (
          <li
            key={m.membershipId}
            className="flex items-center gap-3 px-5 py-4"
          >
            <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted">
              {m.companyLogoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.companyLogoUrl}
                  alt={`${m.companyName} logo`}
                  className="size-10 rounded-lg object-cover"
                  crossOrigin="anonymous"
                />
              ) : (
                <Building2 className="size-5 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="font-display text-[14px] font-bold text-foreground line-clamp-1">
                {m.companyName}
              </div>
              <div className="mt-0.5 text-[11.5px] text-muted-foreground">
                {m.role} ·{' '}
                {m.isPublic ? (
                  <span className="text-emerald-600 dark:text-emerald-400">
                    Showing on team page
                  </span>
                ) : (
                  <span>Private</span>
                )}
              </div>
            </div>
            <Switch
              checked={m.isPublic}
              onCheckedChange={(v) => handleToggle(m.membershipId, Boolean(v))}
              disabled={pendingId === m.membershipId}
              aria-label={`Toggle public visibility for ${m.companyName}`}
            />
          </li>
        ))}
      </ul>
      <footer className="border-t border-border px-5 py-3 text-[11.5px] text-muted-foreground">
        When on, you appear in the company&apos;s public team grid on Metal
        Gear. When off, you stay private — even from buyers who view the
        company storefront.
      </footer>
    </section>
  )
}
