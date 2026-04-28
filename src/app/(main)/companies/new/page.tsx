import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getUserCompanies } from '@/app/actions/company'
import { CreateCompanyForm } from './CreateCompanyForm'
import { Building2 } from 'lucide-react'
import Link from 'next/link'
import { redirect } from 'next/navigation'

export default async function CreateCompanyPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const existingCompanies = await getUserCompanies(user.id)
  const isFirstCompany = existingCompanies.length === 0

  // Pre-fill from onboarding data for first-time company creation
  let prefill: { name: string; industries: string[]; city: string; state: string; phone: string } | undefined
  if (isFirstCompany) {
    const admin = createAdminClient()
    const [{ data: profile }, { data: bizProfile }] = await Promise.all([
      admin.from('profiles').select('company_name, location_city, location_state, phone').eq('id', user.id).maybeSingle(),
      admin.from('user_business_profiles').select('industries').eq('user_id', user.id).maybeSingle(),
    ])
    prefill = {
      name: profile?.company_name || '',
      industries: bizProfile?.industries ?? [],
      city: profile?.location_city || '',
      state: profile?.location_state || '',
      phone: profile?.phone || '',
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20
            flex items-center justify-center mx-auto mb-4">
            <Building2 size={26} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-['Chakra_Petch']">
            {isFirstCompany ? 'Create Your Company' : 'Add a Company'}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {isFirstCompany
              ? 'Metal Gear is a B2B platform. All activity is scoped to your company profile.'
              : 'Add another company to switch between them from the header.'
            }
          </p>
        </div>

        <CreateCompanyForm userId={user.id} isFirstCompany={isFirstCompany} prefill={prefill} />

        {!isFirstCompany && (
          <div className="text-center mt-6">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              &larr; Back to dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
