import { createClient } from '@/lib/supabase/server'
import { getActiveCompanyId } from '@/app/actions/company-context'
import { getCompanyWithMembers } from '@/app/actions/company'
import { CompanySettingsForm } from './CompanySettingsForm'
import { redirect } from 'next/navigation'

export default async function CompanySettingsPage() {
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
          Company Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your company profile — visible to all buyers on Metal Gear.
        </p>
      </div>
      <CompanySettingsForm company={company} userId={user.id} />
    </div>
  )
}
