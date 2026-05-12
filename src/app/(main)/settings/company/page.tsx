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
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-6">
      <div>
        <div className="flex items-center gap-1.5 text-[11.5px] mb-1 text-muted-foreground">
          <span>Settings</span>
          <span>/</span>
          <span className="font-bold text-foreground">Company</span>
        </div>
        <h1 className="font-display text-[22px] font-bold leading-tight tracking-tight text-foreground">
          Company profile
        </h1>
        <p className="text-[12.5px] mt-0.5 text-muted-foreground">
          How <span className="font-bold text-foreground">{company.name}</span> appears
          across Metal Gear · public to all buyers
        </p>
      </div>
      <CompanySettingsForm company={company} userId={user.id} />
    </div>
  )
}
