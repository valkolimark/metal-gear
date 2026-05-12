'use server'

import { z } from 'zod'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sanitizeText } from '@/lib/security/sanitize'

// ─── Target ─────────────────────────────────────────────────────────────────
const TargetSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('profile'), profileId: z.string().uuid() }),
  z.object({ kind: z.literal('company'), companyId: z.string().uuid() }),
])
export type ServiceTarget = z.infer<typeof TargetSchema>

// ─── Input ──────────────────────────────────────────────────────────────────
const ServiceInputSchema = z
  .discriminatedUnion('source', [
    z.object({
      source: z.literal('taxonomy'),
      taxonomyId: z.string().uuid(),
      description: z.string().max(500).nullish(),
      slaMinDays: z.number().int().min(0).max(365).nullish(),
      slaMaxDays: z.number().int().min(0).max(365).nullish(),
      priceFromUsd: z.number().int().min(0).max(10_000_000).nullish(),
      sortOrder: z.number().int().min(0).max(10_000).optional().default(100),
    }),
    z.object({
      source: z.literal('custom'),
      customLabel: z.string().min(2).max(100),
      customCategory: z.string().max(60).nullish(),
      description: z.string().max(500).nullish(),
      slaMinDays: z.number().int().min(0).max(365).nullish(),
      slaMaxDays: z.number().int().min(0).max(365).nullish(),
      priceFromUsd: z.number().int().min(0).max(10_000_000).nullish(),
      sortOrder: z.number().int().min(0).max(10_000).optional().default(100),
    }),
  ])
  .refine(
    (s) =>
      s.slaMinDays == null ||
      s.slaMaxDays == null ||
      (s.slaMinDays as number) <= (s.slaMaxDays as number),
    { message: 'SLA min must be <= SLA max' }
  )
export type ServiceInput = z.infer<typeof ServiceInputSchema>

// Partial patch for updateService — every key is optional, source can change.
const ServicePatchSchema = z.object({
  taxonomyId: z.string().uuid().nullish(),
  customLabel: z.string().min(2).max(100).nullish(),
  customCategory: z.string().max(60).nullish(),
  description: z.string().max(500).nullish(),
  slaMinDays: z.number().int().min(0).max(365).nullish(),
  slaMaxDays: z.number().int().min(0).max(365).nullish(),
  priceFromUsd: z.number().int().min(0).max(10_000_000).nullish(),
  sortOrder: z.number().int().min(0).max(10_000).nullish(),
  isActive: z.boolean().nullish(),
})
export type ServicePatch = z.infer<typeof ServicePatchSchema>

// ─── Helpers ────────────────────────────────────────────────────────────────
async function getSessionUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

async function assertCanEditServicesFor(target: ServiceTarget): Promise<string> {
  const userId = await getSessionUserId()
  if (!userId) throw new Error('Unauthorized')

  if (target.kind === 'profile') {
    if (target.profileId !== userId) {
      throw new Error('You can only edit your own services.')
    }
    return userId
  }

  // company target — caller must be owner|admin and active
  const admin = createAdminClient()
  const { data: membership } = await admin
    .from('company_memberships')
    .select('role')
    .eq('company_id', target.companyId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .in('role', ['owner', 'admin'])
    .maybeSingle()

  if (!membership) {
    throw new Error('You must be a company owner or admin to edit services.')
  }
  return userId
}

function revalidateTargetRoutes(target: ServiceTarget) {
  if (target.kind === 'profile') {
    revalidatePath(`/sellers/${target.profileId}`)
    revalidatePath(`/profile`)
  } else {
    // Companies are routed by slug — we don't have the slug here.
    // Revalidating the route group blanket-clears Next's cache for any
    // /companies/[slug] page that may be cached.
    revalidatePath('/companies/[slug]', 'page')
  }
}

async function loadServiceTarget(serviceId: string): Promise<ServiceTarget | null> {
  const admin = createAdminClient()
  const { data } = await admin
    .from('seller_services')
    .select('seller_profile_id, seller_company_id')
    .eq('id', serviceId)
    .maybeSingle()
  if (!data) return null
  if (data.seller_profile_id) {
    return { kind: 'profile', profileId: data.seller_profile_id }
  }
  if (data.seller_company_id) {
    return { kind: 'company', companyId: data.seller_company_id }
  }
  return null
}

// ─── Mutations ──────────────────────────────────────────────────────────────

export async function createService(
  target: ServiceTarget,
  input: ServiceInput
) {
  const parsedTarget = TargetSchema.parse(target)
  const parsedInput = ServiceInputSchema.parse(input)
  await assertCanEditServicesFor(parsedTarget)

  const admin = createAdminClient()

  const row: Record<string, unknown> = {
    is_active: true,
    sort_order: parsedInput.sortOrder ?? 100,
    description: parsedInput.description
      ? sanitizeText(parsedInput.description)
      : null,
    sla_min_days: parsedInput.slaMinDays ?? null,
    sla_max_days: parsedInput.slaMaxDays ?? null,
    price_from_usd: parsedInput.priceFromUsd ?? null,
  }
  if (parsedTarget.kind === 'profile') {
    row.seller_profile_id = parsedTarget.profileId
    row.seller_company_id = null
  } else {
    row.seller_profile_id = null
    row.seller_company_id = parsedTarget.companyId
  }
  if (parsedInput.source === 'taxonomy') {
    row.taxonomy_id = parsedInput.taxonomyId
    row.custom_label = null
    row.custom_category = null
  } else {
    row.taxonomy_id = null
    row.custom_label = sanitizeText(parsedInput.customLabel)
    row.custom_category = parsedInput.customCategory
      ? sanitizeText(parsedInput.customCategory)
      : null
  }

  const { data, error } = await admin
    .from('seller_services')
    .insert(row)
    .select('id')
    .single()

  if (error) {
    throw new Error(`Failed to create service: ${error.message}`)
  }

  revalidateTargetRoutes(parsedTarget)
  return { id: data.id as string }
}

export async function updateService(serviceId: string, patch: ServicePatch) {
  z.string().uuid().parse(serviceId)
  const parsed = ServicePatchSchema.parse(patch)

  const target = await loadServiceTarget(serviceId)
  if (!target) throw new Error('Service not found')
  await assertCanEditServicesFor(target)

  // SLA range cross-check needs current row values when only one side is
  // patched. Cheap to fetch.
  const admin = createAdminClient()
  const { data: current } = await admin
    .from('seller_services')
    .select('sla_min_days, sla_max_days')
    .eq('id', serviceId)
    .maybeSingle()
  if (!current) throw new Error('Service not found')

  const newMin =
    parsed.slaMinDays === undefined
      ? current.sla_min_days
      : (parsed.slaMinDays as number | null)
  const newMax =
    parsed.slaMaxDays === undefined
      ? current.sla_max_days
      : (parsed.slaMaxDays as number | null)
  if (newMin != null && newMax != null && newMin > newMax) {
    throw new Error('SLA min must be <= SLA max')
  }

  // taxonomy/custom XOR validation when both keys are touched.
  if (parsed.taxonomyId && parsed.customLabel) {
    throw new Error('Choose either a taxonomy service or a custom label, not both.')
  }

  const updates: Record<string, unknown> = {}
  if (parsed.taxonomyId !== undefined) {
    updates.taxonomy_id = parsed.taxonomyId ?? null
    if (parsed.taxonomyId) {
      updates.custom_label = null
      updates.custom_category = null
    }
  }
  if (parsed.customLabel !== undefined) {
    updates.custom_label = parsed.customLabel
      ? sanitizeText(parsed.customLabel)
      : null
    if (parsed.customLabel) {
      updates.taxonomy_id = null
    }
  }
  if (parsed.customCategory !== undefined) {
    updates.custom_category = parsed.customCategory
      ? sanitizeText(parsed.customCategory)
      : null
  }
  if (parsed.description !== undefined) {
    updates.description = parsed.description
      ? sanitizeText(parsed.description)
      : null
  }
  if (parsed.slaMinDays !== undefined) updates.sla_min_days = parsed.slaMinDays ?? null
  if (parsed.slaMaxDays !== undefined) updates.sla_max_days = parsed.slaMaxDays ?? null
  if (parsed.priceFromUsd !== undefined)
    updates.price_from_usd = parsed.priceFromUsd ?? null
  if (parsed.sortOrder !== undefined)
    updates.sort_order = parsed.sortOrder ?? 100
  if (parsed.isActive !== undefined)
    updates.is_active = Boolean(parsed.isActive)

  if (Object.keys(updates).length === 0) return { ok: true as const }

  const { error } = await admin
    .from('seller_services')
    .update(updates)
    .eq('id', serviceId)

  if (error) throw new Error(`Failed to update service: ${error.message}`)

  revalidateTargetRoutes(target)
  return { ok: true as const }
}

export async function deleteService(serviceId: string) {
  z.string().uuid().parse(serviceId)
  const target = await loadServiceTarget(serviceId)
  if (!target) throw new Error('Service not found')
  await assertCanEditServicesFor(target)

  // Soft delete — set is_active = false. Hard delete reserved for admins.
  const admin = createAdminClient()
  const { error } = await admin
    .from('seller_services')
    .update({ is_active: false })
    .eq('id', serviceId)

  if (error) throw new Error(`Failed to delete service: ${error.message}`)

  revalidateTargetRoutes(target)
  return { ok: true as const }
}

const ReorderInputSchema = z.object({
  target: TargetSchema,
  orderedIds: z.array(z.string().uuid()).min(1).max(100),
})

export async function reorderServices(
  input: z.infer<typeof ReorderInputSchema>
) {
  const parsed = ReorderInputSchema.parse(input)
  await assertCanEditServicesFor(parsed.target)

  const admin = createAdminClient()

  // Validate every id belongs to this target before writing.
  const targetColumn =
    parsed.target.kind === 'profile' ? 'seller_profile_id' : 'seller_company_id'
  const targetValue =
    parsed.target.kind === 'profile'
      ? parsed.target.profileId
      : parsed.target.companyId

  const { data: existing } = await admin
    .from('seller_services')
    .select('id')
    .eq(targetColumn, targetValue)
    .in('id', parsed.orderedIds)

  const validIds = new Set((existing ?? []).map((r) => r.id as string))
  for (const id of parsed.orderedIds) {
    if (!validIds.has(id)) {
      throw new Error(`Service ${id} does not belong to this seller.`)
    }
  }

  // Batched update — one row at a time but inside Promise.all for parallelism.
  // Skip the bulk-update RPC route; 100 rows max is cheap.
  await Promise.all(
    parsed.orderedIds.map((id, idx) =>
      admin
        .from('seller_services')
        .update({ sort_order: (idx + 1) * 10 })
        .eq('id', id)
    )
  )

  revalidateTargetRoutes(parsed.target)
  return { ok: true as const }
}
