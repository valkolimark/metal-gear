import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { BulkEditGrid } from './components/bulk-edit-grid'

export default async function BulkEditPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const admin = createAdminClient()

  const { data: listings } = await admin
    .from('listings')
    .select(
      'id, title, price_cents, status, condition, category, location_city, location_state, quantity, sku, description, listing_images(url, position)'
    )
    .eq('seller_id', user.id)
    .neq('status', 'removed')
    .order('created_at', { ascending: false })
    .limit(200)

  const total = listings?.length ?? 0

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = (listings ?? []).map((l: any) => {
    const images = (l.listing_images ?? []).sort(
      (a: { position: number }, b: { position: number }) => a.position - b.position
    )
    return {
      id: l.id as string,
      title: l.title as string,
      price_cents: l.price_cents as number | null,
      status: l.status as string,
      condition: l.condition as string,
      category: l.category as string,
      location_city: l.location_city as string,
      location_state: l.location_state as string,
      quantity: l.quantity as number | null,
      sku: l.sku as string | null,
      description: l.description as string,
      thumbnail: images[0]?.url ?? null,
    }
  })

  return (
    <div className="flex min-h-[calc(100vh-64px)] flex-col">
      <div className="border-b border-border px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex w-full max-w-[1600px] items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/listings"
              className="flex items-center gap-1.5 font-body text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              My Listings
            </Link>
            <span className="text-muted-foreground">/</span>
            <h1 className="font-display text-xl font-bold text-foreground">
              Bulk Edit
            </h1>
          </div>
          <p className="font-body text-sm text-muted-foreground">
            {total} listing{total !== 1 ? 's' : ''}
          </p>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <BulkEditGrid initialRows={rows} totalCount={total} />
      </div>
    </div>
  )
}
