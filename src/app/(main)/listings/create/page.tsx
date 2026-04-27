import { redirect } from 'next/navigation'
import Link from 'next/link'
import { FileText, Layers } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { getActiveTier } from '@/app/actions/tier'

export const metadata = {
  title: 'Create Listing — Metal Gear',
  robots: { index: false },
}

export default async function ListingCreatePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect('/login?redirect=/listings/create')

  const tier = await getActiveTier(user.id)
  const isPro = ['pro', 'business', 'enterprise', 'premium', 'boost'].includes(tier)

  // Free users skip the choice — send them straight to the wizard
  if (!isPro) redirect('/listings/new')

  // Pro+ users see the choice
  return (
    <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-2xl">
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold font-display tracking-tight mb-2">
            Add Equipment
          </h1>
          <p className="text-muted-foreground text-base font-body">
            List a single item or import multiple listings at once.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/listings/new"
            className="group relative flex flex-col gap-4 rounded-xl border border-border bg-card p-6 hover:border-primary hover:shadow-md transition-all duration-150"
          >
            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-150">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold font-display mb-1">Single Listing</h2>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">
                List one piece of equipment with photos, specs, pricing
                intelligence, and quality scoring.
              </p>
            </div>
            <span className="mt-auto text-sm font-medium text-primary font-body flex items-center gap-1 group-hover:gap-2 transition-all">
              Get started
              <span aria-hidden>→</span>
            </span>
          </Link>

          <Link
            href="/listings/import"
            className="group relative flex flex-col gap-4 rounded-xl border border-border bg-card p-6 hover:border-primary hover:shadow-md transition-all duration-150"
          >
            <span className="absolute top-4 right-4 text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-body">
              Pro
            </span>

            <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-150">
              <Layers className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold font-display mb-1">Bulk Import</h2>
              <p className="text-sm text-muted-foreground font-body leading-relaxed">
                Import multiple listings from a CSV, Excel spreadsheet, or
                Google Sheets URL — with automatic image fetching.
              </p>
            </div>
            <span className="mt-auto text-sm font-medium text-primary font-body flex items-center gap-1 group-hover:gap-2 transition-all">
              Import inventory
              <span aria-hidden>→</span>
            </span>
          </Link>
        </div>

        <p className="text-center text-sm text-muted-foreground font-body mt-8">
          <Link
            href="/listings"
            className="hover:text-foreground transition-colors"
          >
            ← Back to My Listings
          </Link>
        </p>
      </div>
    </div>
  )
}
