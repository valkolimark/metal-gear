import { createClient } from '@/lib/supabase/server'
import { getActiveCompanyId } from '@/app/actions/company-context'
import { getCompanyWithMembers } from '@/app/actions/company'
import { redirect } from 'next/navigation'
import { MembersList } from './MembersList'

export default async function CompanyMembersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const companyId = await getActiveCompanyId(user.id)
  if (!companyId) redirect('/companies/new')

  const company = await getCompanyWithMembers(companyId)
  if (!company) redirect('/companies/new')

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
      <MembersList company={company} currentUserId={user.id} />
    </div>
  )
}
