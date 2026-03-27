'use client'

import Link from 'next/link'
import { Users, UserPlus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import type { TeamMemberActivity } from '@/app/actions/team-activity'

function getActivityStatus(lastActiveAt: string | null): {
  label: string
  color: 'green' | 'yellow' | 'gray'
} {
  if (!lastActiveAt) return { label: 'Never active', color: 'gray' }
  const diff = Date.now() - new Date(lastActiveAt).getTime()
  const minutes = diff / 60000
  if (minutes < 15) return { label: 'Active now', color: 'green' }
  if (minutes < 60) return { label: `${Math.floor(minutes)}m ago`, color: 'yellow' }
  if (minutes < 1440) return { label: `${Math.floor(minutes / 60)}h ago`, color: 'yellow' }
  return { label: `${Math.floor(minutes / 1440)}d ago`, color: 'gray' }
}

const DOT_COLORS = {
  green: 'bg-green-500',
  yellow: 'bg-yellow-500',
  gray: 'bg-gray-400',
} as const

const ROLE_LABELS: Record<string, string> = {
  owner: 'Owner',
  admin: 'Admin',
  member: 'Member',
}

export function TeamActivityWidget({
  members,
}: {
  members: TeamMemberActivity[]
}) {
  if (members.length === 0) return null

  return (
    <Card className="border-border bg-card">
      <CardHeader className="flex flex-row items-center gap-2">
        <Users className="size-5 text-primary" />
        <CardTitle className="flex-1 font-display text-lg">Your Team</CardTitle>
        <Badge variant="outline" className="font-body text-xs">
          {members.length}
        </Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        {members.length === 1 && (
          <div className="rounded-lg border border-dashed border-border p-4 text-center">
            <UserPlus className="mx-auto mb-2 size-6 text-muted-foreground" />
            <p className="font-body text-sm text-muted-foreground">
              Invite team members to see their activity
            </p>
            <Link
              href="/settings/company/members"
              className="mt-2 inline-block font-body text-sm text-primary hover:underline"
            >
              Invite Team Members &rarr;
            </Link>
          </div>
        )}

        {members.map((member) => {
          const status = getActivityStatus(member.lastActiveAt)
          return (
            <div key={member.userId} className="space-y-2">
              <div className="flex items-center gap-3">
                {/* Avatar */}
                <div className="relative shrink-0">
                  {member.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={member.avatarUrl}
                      alt={member.displayName}
                      className="size-9 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex size-9 items-center justify-center rounded-full bg-primary/20 font-body text-sm font-bold text-primary">
                      {member.displayName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span
                    className={`absolute -bottom-0.5 -right-0.5 size-3 rounded-full border-2 border-card ${DOT_COLORS[status.color]}`}
                  />
                </div>

                {/* Name + role + status */}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate font-body text-sm font-medium text-foreground">
                      {member.displayName}
                    </span>
                    <Badge variant="outline" className="shrink-0 font-body text-[10px]">
                      {ROLE_LABELS[member.role] ?? member.role}
                    </Badge>
                  </div>
                  <p className="font-body text-xs text-muted-foreground">
                    {status.label}
                  </p>
                </div>
              </div>

              {/* Recently viewed thumbnails */}
              {member.recentlyViewed.length > 0 ? (
                <div className="ml-12 flex gap-2">
                  {member.recentlyViewed.map((view) => (
                    <Link
                      key={`${view.listingId}-${view.viewedAt}`}
                      href={`/listings/${view.listingId}`}
                      title={view.listingTitle}
                      className="group shrink-0"
                    >
                      {view.listingImageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={view.listingImageUrl}
                          alt={view.listingTitle}
                          className="size-10 rounded object-cover ring-1 ring-border transition-all group-hover:ring-primary"
                        />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded bg-surface text-[10px] text-muted-foreground ring-1 ring-border">
                          N/A
                        </div>
                      )}
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="ml-12 font-body text-xs text-muted-foreground/60">
                  No activity yet
                </p>
              )}
            </div>
          )
        })}

        {/* Footer */}
        <div className="pt-2 text-center">
          <Link
            href="/settings/company/members"
            className="font-body text-xs text-primary hover:underline"
          >
            Manage Team &rarr;
          </Link>
        </div>
      </CardContent>
    </Card>
  )
}
