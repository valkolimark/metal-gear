'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/app/actions/notifications'
import { SOS_TIER_LIMITS, getAllGroupsForSubcategory } from '@/lib/constants/equipment-taxonomy'

export interface SosRequestData {
  title: string
  description?: string
  equipment_category: string
  equipment_subcategory?: string
  brand?: string
  model?: string
  urgency: 'critical' | 'normal'
  photos?: string[]
  videos?: string[]
  notes?: string
  location_city?: string
  location_state?: string
  location_lat?: number
  location_lng?: number
  max_distance_miles: number
  expires_at?: string // ISO string
  transport_needed?: boolean
}

export interface SosResponseData {
  message: string
  price_estimate?: string
  lead_time?: string
  condition?: string
  photos?: string[]
}

export interface SosFilters {
  category?: string
  urgency?: 'critical' | 'normal'
  status?: string
}

export async function createSosRequest(data: SosRequestData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Check tier limits
  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  const tier = (profile?.subscription_tier || 'free') as keyof typeof SOS_TIER_LIMITS
  const limits = SOS_TIER_LIMITS[tier]

  // Check active SOS count
  const { data: countResult } = await (admin as unknown as { rpc: (fn: string, params: Record<string, string>) => Promise<{ data: number | null }> })
    .rpc('get_user_active_sos_count', { p_user_id: user.id })

  const activeCount = (countResult as number) || 0
  if (activeCount >= limits.activeSos) {
    return { error: `You can have ${limits.activeSos} active SOS request${limits.activeSos === 1 ? '' : 's'} on your ${tier} plan. Upgrade for more.` }
  }

  // Enforce reach limits
  const maxDistance = Math.min(data.max_distance_miles, limits.maxReachMiles === Infinity ? 99999 : limits.maxReachMiles)

  // Calculate expiration
  const expiresAt = data.expires_at || new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()

  // Get user location from profile if not provided
  let city = data.location_city
  let state = data.location_state
  let lat = data.location_lat
  let lng = data.location_lng
  if (!city || !state) {
    const { data: userProfile } = await admin
      .from('profiles')
      .select('location_city, location_state, location_lat, location_lng')
      .eq('id', user.id)
      .single()
    city = city || userProfile?.location_city || 'Houston'
    state = state || userProfile?.location_state || 'TX'
    lat = lat || userProfile?.location_lat || undefined
    lng = lng || userProfile?.location_lng || undefined
  }

  const { data: sos, error } = await admin
    .from('sos_requests')
    .insert({
      requester_id: user.id,
      title: data.title,
      description: data.description || null,
      equipment_category: data.equipment_category,
      equipment_subcategory: data.equipment_subcategory || null,
      brand: data.brand || null,
      model: data.model || null,
      urgency: data.urgency,
      photos: data.photos || [],
      videos: data.videos || [],
      notes: data.notes || null,
      location_city: city,
      location_state: state,
      location_lat: lat,
      location_lng: lng,
      max_distance_miles: maxDistance,
      expires_at: expiresAt,
      transport_needed: data.transport_needed ?? false,
    })
    .select('id')
    .single()

  if (error) return { error: error.message }

  // Route SOS to matching responders — primary tier2 group
  const { data: responders } = await (admin as unknown as { rpc: (fn: string, params: Record<string, string | null>) => Promise<{ data: { user_id: string; notify_methods: string[] }[] | null }> })
    .rpc('find_sos_responders', {
      p_tier2: data.equipment_category,
      p_subcategory: data.equipment_subcategory || null,
    })

  // Cross-list expansion: find additional tier2 groups that share this subcategory
  const allResponders = new Map<string, { user_id: string; notify_methods: string[] }>()
  if (responders && Array.isArray(responders)) {
    for (const r of responders) {
      allResponders.set((r as { user_id: string }).user_id, r as { user_id: string; notify_methods: string[] })
    }
  }

  if (data.equipment_subcategory) {
    const crossGroups = getAllGroupsForSubcategory(data.equipment_subcategory)
      .filter(g => g !== data.equipment_category)
    for (const groupId of crossGroups) {
      const { data: crossResponders } = await (admin as unknown as { rpc: (fn: string, params: Record<string, string | null>) => Promise<{ data: { user_id: string; notify_methods: string[] }[] | null }> })
        .rpc('find_sos_responders', {
          p_tier2: groupId,
          p_subcategory: data.equipment_subcategory,
        })
      if (crossResponders && Array.isArray(crossResponders)) {
        for (const r of crossResponders) {
          const cr = r as { user_id: string; notify_methods: string[] }
          if (!allResponders.has(cr.user_id)) {
            allResponders.set(cr.user_id, cr)
          }
        }
      }
    }
  }

  const mergedResponders = Array.from(allResponders.values())

  if (mergedResponders.length > 0) {
    // Get requester's company name
    const { data: bizProfile } = await admin
      .from('user_business_profiles')
      .select('company_name')
      .eq('user_id', user.id)
      .maybeSingle()

    const companyName = bizProfile?.company_name || 'Someone'
    const responderLimit = limits.maxResponders === Infinity ? mergedResponders.length : Math.min(mergedResponders.length, limits.maxResponders)

    for (let i = 0; i < responderLimit; i++) {
      const r = mergedResponders[i] as { user_id: string; notify_methods: string[] }
      if (r.user_id === user.id) continue // Don't notify yourself

      // Log notification delivery
      for (const method of r.notify_methods || ['in_app']) {
        await admin
          .from('sos_notifications')
          .upsert({
            sos_request_id: sos.id,
            notified_user_id: r.user_id,
            notify_method: method,
          }, { onConflict: 'sos_request_id,notified_user_id,notify_method' })
      }

      // Send in-app notification via existing system
      createNotification(
        r.user_id,
        'sos_request_match' as never,
        `SOS: ${companyName} needs a ${data.title}`,
        `${data.urgency === 'critical' ? 'CRITICAL: ' : ''}${data.description || data.title} — Can you help?`,
        { sos_id: sos.id, category: data.equipment_category }
      ).catch(console.error)
    }
  }

  return { data: { id: sos.id } }
}

export async function respondToSos(sosId: string, response: SosResponseData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Verify SOS exists and is active
  const { data: sos } = await admin
    .from('sos_requests')
    .select('id, requester_id, title, status')
    .eq('id', sosId)
    .single()

  if (!sos) return { error: 'SOS request not found' }
  if (sos.status !== 'active') return { error: 'This SOS request is no longer active' }
  if (sos.requester_id === user.id) return { error: 'Cannot respond to your own SOS' }

  const { data: sosResponse, error } = await admin
    .from('sos_responses')
    .insert({
      sos_request_id: sosId,
      responder_id: user.id,
      message: response.message,
      price_estimate: response.price_estimate || null,
      lead_time: response.lead_time || null,
      condition: response.condition || null,
      photos: response.photos || [],
    })
    .select('id')
    .single()

  if (error) {
    if (error.code === '23505') return { error: 'You have already responded to this SOS' }
    return { error: error.message }
  }

  // Notify the requester
  const { data: responderProfile } = await admin
    .from('user_business_profiles')
    .select('company_name')
    .eq('user_id', user.id)
    .maybeSingle()

  createNotification(
    sos.requester_id,
    'sos_response_received' as never,
    `Response to your SOS: ${sos.title}`,
    `${responderProfile?.company_name || 'Someone'} can help with your ${sos.title}${response.price_estimate ? ` — Est. ${response.price_estimate}` : ''}`,
    { sos_id: sosId, response_id: sosResponse.id }
  ).catch(console.error)

  return { data: { id: sosResponse.id } }
}

export async function getSosRequests(filters?: SosFilters) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Get user's equipment interests to filter relevant SOS
  const { data: interests } = await admin
    .from('user_equipment_interests')
    .select('tier2')
    .eq('user_id', user.id)

  const userCategories = (interests || []).map((i: { tier2: string }) => i.tier2)

  let query = admin
    .from('sos_requests')
    .select(`
      *,
      requester:profiles!sos_requests_requester_id_fkey(full_name, company_name, avatar_url),
      response_count:sos_responses(count)
    `)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (filters?.category) {
    query = query.eq('equipment_category', filters.category)
  } else if (userCategories.length > 0) {
    query = query.in('equipment_category', userCategories)
  }

  if (filters?.urgency) {
    query = query.eq('urgency', filters.urgency)
  }

  const { data, error } = await query.limit(50)

  if (error) return { error: error.message }
  return { requests: data || [] }
}

export async function getMySosRequests() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data, error } = await admin
    .from('sos_requests')
    .select(`
      *,
      response_count:sos_responses(count)
    `)
    .eq('requester_id', user.id)
    .order('created_at', { ascending: false })

  if (error) return { error: error.message }
  return { requests: data || [] }
}

export async function getSosDetail(sosId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { data: sos, error } = await admin
    .from('sos_requests')
    .select(`
      *,
      requester:profiles!sos_requests_requester_id_fkey(id, full_name, company_name, avatar_url)
    `)
    .eq('id', sosId)
    .single()

  if (error || !sos) return { error: 'SOS request not found' }

  // Get responses with responder info
  const { data: responses } = await admin
    .from('sos_responses')
    .select(`
      *,
      responder:profiles!sos_responses_responder_id_fkey(id, full_name, company_name, avatar_url)
    `)
    .eq('sos_request_id', sosId)
    .order('created_at', { ascending: true })

  // Get requester's business profile
  const { data: requesterBiz } = await admin
    .from('user_business_profiles')
    .select('company_name, primary_role')
    .eq('user_id', sos.requester_id)
    .maybeSingle()

  const isRequester = sos.requester_id === user.id

  return {
    sos: { ...sos, requester_business: requesterBiz },
    responses: responses || [],
    isRequester,
  }
}

export async function updateSosStatus(sosId: string, status: 'fulfilled' | 'cancelled') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const updateData: Record<string, unknown> = {
    status,
    updated_at: new Date().toISOString(),
  }

  if (status === 'fulfilled') {
    updateData.fulfilled_at = new Date().toISOString()
  }

  const { error } = await admin
    .from('sos_requests')
    .update(updateData)
    .eq('id', sosId)
    .eq('requester_id', user.id)

  if (error) return { error: error.message }
  return { success: true }
}

export async function markSosFulfilled(sosId: string, fulfilledBy: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  const { error } = await admin
    .from('sos_requests')
    .update({
      status: 'fulfilled',
      fulfilled_at: new Date().toISOString(),
      fulfilled_by: fulfilledBy,
      updated_at: new Date().toISOString(),
    })
    .eq('id', sosId)
    .eq('requester_id', user.id)

  if (error) return { error: error.message }

  // Notify the fulfiller
  const { data: sos } = await admin
    .from('sos_requests')
    .select('title')
    .eq('id', sosId)
    .single()

  if (sos) {
    createNotification(
      fulfilledBy,
      'sos_response_accepted' as never,
      `Your SOS response was accepted!`,
      `Your response to "${sos.title}" was accepted. Connect to finalize the deal.`,
      { sos_id: sosId }
    ).catch(console.error)
  }

  return { success: true }
}

export async function uploadSosMedia(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Not authenticated' }

  const file = formData.get('file') as File
  if (!file) return { error: 'No file provided' }

  const { uploadSOSMedia } = await import('@/lib/media')
  const buffer = Buffer.from(await file.arrayBuffer())

  try {
    const url = await uploadSOSMedia(buffer, user.id, file.type)
    return { path: url, url }
  } catch (err) {
    return { error: `Upload failed: ${err instanceof Error ? err.message : 'R2 error'}` }
  }
}
