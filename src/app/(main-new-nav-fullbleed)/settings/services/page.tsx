import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getActiveCompanyId } from '@/app/actions/company-context'
import { getActiveTier } from '@/app/actions/tier'
import { ServicesEditor, type EditableService, type EditorTarget } from './ServicesEditor'

const PAID_TIERS = new Set(['pro', 'business', 'enterprise', 'premium', 'boost'])

export const metadata = {
  title: 'Services — Settings | Metal Gear',
  robots: { index: false, follow: false },
}

export default async function ServicesSettingsPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: 'profile' | 'company' }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { scope: scopeParam } = await searchParams
  const requestedScope = scopeParam === 'company' || scopeParam === 'profile' ? scopeParam : null

  const companyId = await getActiveCompanyId(user.id)
  // Default: edit company services when the user has an active company,
  // otherwise fall back to their individual seller services.
  const scope: 'profile' | 'company' =
    requestedScope ?? (companyId ? 'company' : 'profile')

  // If they explicitly chose company scope but have no active company,
  // bounce them to /companies/new.
  if (scope === 'company' && !companyId) {
    redirect('/companies/new')
  }

  // Authorize: if scope is company, caller must be owner|admin.
  if (scope === 'company' && companyId) {
    const admin = createAdminClient()
    const { data: membership } = await admin
      .from('company_memberships')
      .select('role')
      .eq('company_id', companyId)
      .eq('user_id', user.id)
      .eq('is_active', true)
      .in('role', ['owner', 'admin'])
      .maybeSingle()
    if (!membership) {
      redirect('/dashboard')
    }
  }

  // Resolve tier for the pricing-gate banner.
  const tier = await getActiveTier(user.id, scope === 'company' ? companyId : null)
  const isPricingGated = !PAID_TIERS.has(tier)

  // Resolve company display info (for the scope chip).
  const admin = createAdminClient()
  let companyName: string | null = null
  if (scope === 'company' && companyId) {
    const { data: company } = await admin
      .from('company_profiles')
      .select('name')
      .eq('id', companyId)
      .maybeSingle()
    companyName = company?.name ?? null
  }

  // Load existing services for this target — include inactive (owner POV).
  const targetColumn = scope === 'profile' ? 'seller_profile_id' : 'seller_company_id'
  const targetValue = scope === 'profile' ? user.id : (companyId as string)

  const { data: rows } = await admin
    .from('seller_services')
    .select(
      `
      id,
      taxonomy_id,
      custom_label,
      custom_category,
      description,
      sla_min_days,
      sla_max_days,
      price_from_usd,
      sort_order,
      is_active,
      seller_services_taxonomy ( label, category )
      `
    )
    .eq(targetColumn, targetValue)
    .order('sort_order', { ascending: true })

  type TaxonomyJoin = { label: string | null; category: string | null }
  interface ServiceRow {
    id: string
    taxonomy_id: string | null
    custom_label: string | null
    custom_category: string | null
    description: string | null
    sla_min_days: number | null
    sla_max_days: number | null
    price_from_usd: number | null
    sort_order: number
    is_active: boolean
    seller_services_taxonomy: TaxonomyJoin | TaxonomyJoin[] | null
  }

  const services: EditableService[] = (rows ?? []).map((raw) => {
    const row = raw as ServiceRow
    const taxonomy = Array.isArray(row.seller_services_taxonomy)
      ? row.seller_services_taxonomy[0] ?? null
      : row.seller_services_taxonomy
    return {
      id: row.id,
      label: row.taxonomy_id
        ? taxonomy?.label ?? row.custom_label ?? 'Service'
        : row.custom_label ?? 'Service',
      category:
        (row.taxonomy_id ? taxonomy?.category : null) ?? row.custom_category ?? null,
      description: row.description,
      slaMinDays: row.sla_min_days,
      slaMaxDays: row.sla_max_days,
      priceFromUsd: row.price_from_usd,
      sortOrder: row.sort_order,
      isActive: row.is_active,
      taxonomyId: row.taxonomy_id,
      customLabel: row.custom_label,
      customCategory: row.custom_category,
    }
  })

  const target: EditorTarget =
    scope === 'profile'
      ? { kind: 'profile', profileId: user.id }
      : { kind: 'company', companyId: companyId as string }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8">
      <header>
        <div className="flex items-center gap-1.5 text-[11.5px] text-muted-foreground">
          <span>Settings</span>
          <span>/</span>
          <span className="font-bold text-foreground">Services</span>
        </div>
        <h1 className="mt-1 font-display text-[22px] font-bold leading-tight tracking-tight text-foreground">
          Services
        </h1>
        <p className="mt-1 text-[12.5px] text-muted-foreground">
          {scope === 'profile' ? (
            <>Configure services for your individual seller profile.</>
          ) : (
            <>
              Configure services for{' '}
              <span className="font-bold text-foreground">{companyName ?? 'your company'}</span>
              . Visible publicly on your company storefront.
            </>
          )}
        </p>
      </header>

      <ServicesEditor
        target={target}
        initialServices={services}
        isPricingGated={isPricingGated}
        tier={tier}
      />
    </div>
  )
}
