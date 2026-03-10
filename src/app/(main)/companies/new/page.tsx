import { createClient } from '@/lib/supabase/server'
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

        <CreateCompanyForm userId={user.id} isFirstCompany={isFirstCompany} />

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
