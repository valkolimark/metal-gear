'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function saveConditionReport(
  listingId: string,
  data: {
    overall_grade: string
    mechanical_score: number
    cosmetic_score: number
    electrical_score: number
    hours_of_use?: number | null
    last_service_date?: string | null
    notes?: string | null
    photo_urls?: string[]
  }
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Verify user owns the listing
  const { data: listing } = await admin
    .from('listings')
    .select('seller_id')
    .eq('id', listingId)
    .single()

  if (!listing || listing.seller_id !== user.id) {
    return { error: 'You can only create condition reports for your own listings' }
  }

  // Upsert condition report (one per listing)
  const { data: report, error } = await admin
    .from('condition_reports')
    .upsert(
      {
        listing_id: listingId,
        created_by: user.id,
        overall_grade: data.overall_grade,
        mechanical_score: data.mechanical_score,
        cosmetic_score: data.cosmetic_score,
        electrical_score: data.electrical_score,
        hours_of_use: data.hours_of_use ?? null,
        last_service_date: data.last_service_date ?? null,
        notes: data.notes ?? null,
        photo_urls: data.photo_urls ?? [],
      },
      { onConflict: 'listing_id' }
    )
    .select()
    .single()

  if (error) return { error: error.message }
  return { report }
}

export async function getConditionReport(listingId: string) {
  const admin = createAdminClient()

  const { data: report } = await admin
    .from('condition_reports')
    .select('*, creator:profiles!condition_reports_created_by_fkey(full_name, display_name, is_verified)')
    .eq('listing_id', listingId)
    .maybeSingle()

  return { report }
}

export async function getConditionReportsForListings(listingIds: string[]) {
  if (listingIds.length === 0) return { reports: [] }

  const admin = createAdminClient()

  const { data: reports } = await admin
    .from('condition_reports')
    .select('listing_id, overall_grade')
    .in('listing_id', listingIds)

  return { reports: reports || [] }
}

export async function uploadConditionPhoto(formData: FormData) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const file = formData.get('file') as File
  if (!file) return { error: 'No file provided' }

  const { uploadConditionReport } = await import('@/lib/media')
  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const url = await uploadConditionReport(buffer, user.id, file.type)
    return { url }
  } catch (err) {
    return { error: `Upload failed: ${err instanceof Error ? err.message : 'R2 error'}` }
  }
}

export async function deleteConditionReport(listingId: string) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: listing } = await admin
    .from('listings')
    .select('seller_id')
    .eq('id', listingId)
    .single()

  if (!listing || listing.seller_id !== user.id) {
    return { error: 'Not authorized' }
  }

  const { error } = await admin
    .from('condition_reports')
    .delete()
    .eq('listing_id', listingId)

  if (error) return { error: error.message }
  return { success: true }
}
