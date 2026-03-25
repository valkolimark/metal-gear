import { createClient } from '@/lib/supabase/server'
import { getActiveCompanyId } from '@/app/actions/company-context'
import { getCompanyWithMembers } from '@/app/actions/company'
import { redirect } from 'next/navigation'
import {
  getCompanyMemberCount,
  getCompanySeatLimit,
  getPendingInvites,
} from '@/app/actions/invites'
import { MembersList } from './MembersList'
import { InviteForm } from './invite-form'
import { PendingInvites } from './pending-invites'

export default async function CompanyMembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const companyId = await getActiveCompanyId(user.id)
  if (!companyId) redirect('/companies/new')

  const company = await getCompanyWithMembers(companyId)
  if (!company) redirect('/companies/new')

  const [memberCount, seatLimit, pendingInvites] = await Promise.all([
    getCompanyMemberCount(company.id),
    getCompanySeatLimit(company.id),
    getPendingInvites(company.id),
  ])

  const currentMember = company.members.find(m => m.user_id === user.id)
  const canManage = currentMember && ['owner', 'admin'].includes(currentMember.role)

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground font-['Chakra_Petch']">
          Team Members
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {company.name} &middot; {company.members.length} member{company.members.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Seat Usage */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium">Team seats</span>
          <span className="text-sm text-muted-foreground">
            {memberCount} of {seatLimit === Infinity ? 'Unlimited' : seatLimit} used
          </span>
        </div>
        {seatLimit !== Infinity && (
          <div className="w-full bg-muted rounded-full h-2">
            <div
              className="bg-[#1877F2] h-2 rounded-full transition-all"
              style={{ width: `${Math.min((memberCount / seatLimit) * 100, 100)}%` }}
            />
          </div>
        )}
      </div>

      <MembersList company={company} currentUserId={user.id} />

      {/* Invite Form (owner/admin only) */}
      {canManage && (
        <div className="space-y-4">
          <h2 className="text-base font-semibold text-foreground">Invite Team Members</h2>
          <InviteForm
            companyId={company.id}
            userId={user.id}
            atSeatLimit={memberCount >= seatLimit}
            seatLimit={seatLimit}
            memberCount={memberCount}
          />
        </div>
      )}

      {/* Pending Invites */}
      {canManage && pendingInvites.length > 0 && (
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-foreground">Pending Invites</h2>
          <PendingInvites invites={pendingInvites} />
        </div>
      )}
    </div>
  )
}
