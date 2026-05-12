import Link from 'next/link'
import { Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { TeamMemberData } from '@/lib/profile/team'

interface TeamModuleProps {
  members: TeamMemberData[]
  totalPublicCount: number
  /** Internal total — used only to render an optional "(others private)" hint. */
  totalAllCount: number
  /**
   * When true, render "{N} of {M} (others private)" rather than "{N} members".
   * Off by default to avoid leaking team-size signal. Companies that want
   * the aggregate can opt in.
   */
  showPrivateCountHint?: boolean
}

/**
 * Public Team grid for /companies/[slug]. Renders opted-in members only;
 * private members are never exposed in the markup.
 *
 * If `members.length === 0` the module renders nothing (the parent decides
 * whether to invoke this at all).
 */
export function TeamModule({
  members,
  totalPublicCount,
  totalAllCount,
  showPrivateCountHint,
}: TeamModuleProps) {
  if (members.length === 0) return null

  const subtitle = (() => {
    const base = `${totalPublicCount} member${totalPublicCount === 1 ? '' : 's'}`
    if (
      showPrivateCountHint &&
      totalAllCount > totalPublicCount
    ) {
      return `${base} · of ${totalAllCount} (others private)`
    }
    return base
  })()

  return (
    <section className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(11,37,69,0.04),0_4px_12px_rgba(11,37,69,0.05)]">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div className="min-w-0">
          <h3 className="font-display text-[15px] font-bold tracking-tight text-foreground">
            Team
          </h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">{subtitle}</p>
        </div>
        <div className="inline-flex size-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Users className="size-4" aria-hidden />
        </div>
      </header>

      <div className="p-4">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          {members.map((member) => (
            <TeamMemberCard key={member.profileId} member={member} />
          ))}
        </div>
      </div>
    </section>
  )
}

function TeamMemberCard({ member }: { member: TeamMemberData }) {
  const initials = computeInitials(member.name)
  return (
    <Link
      href={member.profileHref}
      className="flex flex-col items-center text-center"
      data-testid="team-member-card"
    >
      <Avatar className="size-20 shadow-[0_1px_2px_rgba(11,37,69,0.04),0_4px_12px_rgba(11,37,69,0.05)] sm:size-24">
        <AvatarImage
          src={member.avatarUrl ?? undefined}
          alt={`${member.name} avatar`}
          crossOrigin="anonymous"
        />
        <AvatarFallback className="bg-primary/15 font-display text-base text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="mt-2 w-full">
        <div className="truncate font-display text-[13.5px] font-bold tracking-tight text-foreground">
          {member.name}
        </div>
        <div className="mt-0.5 truncate text-[11.5px] text-muted-foreground">
          {member.role}
        </div>
      </div>
    </Link>
  )
}

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 0) return 'MG'
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}
