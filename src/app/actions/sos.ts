'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/app/actions/notifications'
import { sendEmail } from '@/lib/email'
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
  const t0 = Date.now()
  console.log('[createSosRequest] start', {
    title: data.title?.slice(0, 50),
    category: data.equipment_category,
    urgency: data.urgency,
  })

  let supabase
  try {
    supabase = await createClient()
  } catch (err) {
    console.error('[createSosRequest] createClient failed', err)
    return { error: 'Server error: auth client init failed' }
  }

  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError) {
    console.error('[createSosRequest] auth.getUser error', authError)
    return { error: `Auth error: ${authError.message}` }
  }
  if (!user) {
    console.warn('[createSosRequest] no user in session')
    return { error: 'Not authenticated' }
  }

  console.log('[createSosRequest] user', { id: user.id, elapsed: Date.now() - t0 })

  const admin = createAdminClient()

  // Check tier limits
  const { data: profile, error: profileError } = await admin
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  if (profileError) {
    console.error('[createSosRequest] profile fetch failed', profileError)
    // Don't fail — fall through with default tier
  }

  const tier = (profile?.subscription_tier || 'free') as keyof typeof SOS_TIER_LIMITS
  // Fall back to free limits if the tier name is unrecognized — prevents
  // server-action crash on unknown tier strings
  const limits = SOS_TIER_LIMITS[tier] ?? SOS_TIER_LIMITS.free

  console.log('[createSosRequest] tier check', { tier, activeSosLimit: limits.activeSos })

  // Check active SOS count
  const { data: countResult, error: countError } = await (admin as unknown as { rpc: (fn: string, params: Record<string, string>) => Promise<{ data: number | null; error: { message: string } | null }> })
    .rpc('get_user_active_sos_count', { p_user_id: user.id })

  if (countError) {
    console.error('[createSosRequest] active count RPC failed', countError)
    // Don't fail — assume 0
  }

  const activeCount = (countResult as number) || 0
  console.log('[createSosRequest] active count', { activeCount, limit: limits.activeSos })

  if (activeCount >= limits.activeSos) {
    console.warn('[createSosRequest] tier limit hit', { tier, activeCount, limit: limits.activeSos })
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

  console.log('[createSosRequest] inserting row', { elapsed: Date.now() - t0 })

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

  if (error) {
    console.error('[createSosRequest] insert failed', { code: error.code, message: error.message, details: error.details })
    return { error: error.message }
  }
  if (!sos) {
    console.error('[createSosRequest] insert returned no row')
    return { error: 'Failed to create SOS request' }
  }

  console.log('[createSosRequest] insert success', { sosId: sos.id, totalElapsed: Date.now() - t0 })

  // Fire-and-forget broadcast. Any failure in responder lookup, notification
  // insertion, or email send must never block the user from seeing their
  // confirmation — the SOS row is already committed at this point.
  void broadcastSOSNotifications({
    sosId: sos.id,
    requesterUserId: user.id,
    title: data.title,
    description: data.description,
    urgency: data.urgency,
    equipmentCategory: data.equipment_category,
    equipmentSubcategory: data.equipment_subcategory,
    transportNeeded: data.transport_needed ?? false,
    responderCap: limits.maxResponders,
  }).catch((err) => {
    console.error('[SOS broadcast error]', err)
  })

  return { data: { id: sos.id } }
}

interface BroadcastParams {
  sosId: string
  requesterUserId: string
  title: string
  description?: string
  urgency: 'critical' | 'normal'
  equipmentCategory: string
  equipmentSubcategory?: string
  transportNeeded: boolean
  responderCap: number
}

async function broadcastSOSNotifications(params: BroadcastParams): Promise<void> {
  const {
    sosId,
    requesterUserId,
    title,
    description,
    urgency,
    equipmentCategory,
    equipmentSubcategory,
    transportNeeded,
    responderCap,
  } = params

  const admin = createAdminClient()

  // 1. Get matched responders via find_sos_responders RPC. Swallow errors —
  // RPC may not exist in some environments; we still want SOS created.
  const allResponders = new Map<string, { user_id: string; notify_methods: string[] }>()

  try {
    const { data: responders } = await (admin as unknown as { rpc: (fn: string, params: Record<string, string | null>) => Promise<{ data: { user_id: string; notify_methods: string[] }[] | null }> })
      .rpc('find_sos_responders', {
        p_tier2: equipmentCategory,
        p_subcategory: equipmentSubcategory || null,
      })

    if (responders && Array.isArray(responders)) {
      for (const r of responders) {
        allResponders.set(r.user_id, r)
      }
    }

    // Cross-list expansion: subcategories that appear in multiple tier2 groups
    if (equipmentSubcategory) {
      const crossGroups = getAllGroupsForSubcategory(equipmentSubcategory)
        .filter((g) => g !== equipmentCategory)
      for (const groupId of crossGroups) {
        const { data: crossResponders } = await (admin as unknown as { rpc: (fn: string, params: Record<string, string | null>) => Promise<{ data: { user_id: string; notify_methods: string[] }[] | null }> })
          .rpc('find_sos_responders', {
            p_tier2: groupId,
            p_subcategory: equipmentSubcategory,
          })
        if (crossResponders && Array.isArray(crossResponders)) {
          for (const r of crossResponders) {
            if (!allResponders.has(r.user_id)) {
              allResponders.set(r.user_id, r)
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('[broadcastSOSNotifications] responder lookup failed', err)
  }

  let recipientIds = Array.from(allResponders.keys()).filter((id) => id !== requesterUserId)

  // 1b. Defense-in-depth: pull users with sos_receive_all = true and merge.
  // The RPC already includes them, but doing a parallel app-level fetch
  // ensures admins/monitors get notified even if the RPC version drifts.
  try {
    const { data: receiveAllUsers } = await admin
      .from('user_business_profiles')
      .select('user_id')
      .eq('sos_receive_all', true)
      .eq('onboarding_completed', true)
      .limit(500)
    if (receiveAllUsers) {
      for (const row of receiveAllUsers) {
        if (row.user_id && row.user_id !== requesterUserId && !recipientIds.includes(row.user_id)) {
          recipientIds.push(row.user_id)
        }
      }
    }
  } catch (err) {
    console.error('[broadcastSOSNotifications] sos_receive_all lookup failed', err)
  }

  // 2. Transport routing: if transport needed, also notify logistics users
  if (transportNeeded) {
    try {
      const { data: logisticsUsers } = await admin
        .from('user_business_profiles')
        .select('user_id')
        .eq('archetype', 'logistics')
        .limit(500)

      if (logisticsUsers) {
        for (const row of logisticsUsers) {
          if (row.user_id && row.user_id !== requesterUserId && !recipientIds.includes(row.user_id)) {
            recipientIds.push(row.user_id)
          }
        }
      }
    } catch (err) {
      console.error('[broadcastSOSNotifications] logistics lookup failed', err)
    }
  }

  if (recipientIds.length === 0) return

  // 3. Filter by sos_opted_in preference — respect user opt-out
  try {
    const { data: optedInProfiles } = await admin
      .from('user_business_profiles')
      .select('user_id, sos_opted_in')
      .in('user_id', recipientIds)

    if (optedInProfiles) {
      const optedInIds = new Set(
        optedInProfiles
          .filter((p) => p.sos_opted_in !== false) // default-true if null
          .map((p) => p.user_id)
      )
      recipientIds = recipientIds.filter((id) => optedInIds.has(id))
    }
  } catch (err) {
    console.error('[broadcastSOSNotifications] sos_opted_in filter failed', err)
  }

  if (recipientIds.length === 0) return

  // 4. Apply tier-based responder cap
  if (responderCap !== Infinity && recipientIds.length > responderCap) {
    recipientIds = recipientIds.slice(0, responderCap)
  }

  // 5. Get requester's company name for personalized notification copy
  let companyName = 'Someone'
  try {
    const { data: bizProfile } = await admin
      .from('user_business_profiles')
      .select('company_name')
      .eq('user_id', requesterUserId)
      .maybeSingle()
    if (bizProfile?.company_name) companyName = bizProfile.company_name
  } catch {
    // ignore — fall back to 'Someone'
  }

  const notifTitle = urgency === 'critical'
    ? `🚨 CRITICAL SOS: ${companyName} needs a ${title}`
    : `SOS: ${companyName} needs a ${title}`

  const notifBody = `${urgency === 'critical' ? 'CRITICAL: ' : ''}${description || title} — Can you help?`

  // 6. Fan-out in-app + push notifications via existing createNotification
  // helper (handles push subscriptions). Fire each as a settled promise.
  await Promise.allSettled(
    recipientIds.map((userId) =>
      createNotification(
        userId,
        'sos_request_match',
        notifTitle,
        notifBody,
        { sos_id: sosId, category: equipmentCategory, urgency }
      )
    )
  )

  // 7. Log delivery in sos_notifications (best-effort — table may not be present)
  try {
    const nowIso = new Date().toISOString()
    const rows = recipientIds.map((userId) => ({
      sos_request_id: sosId,
      notified_user_id: userId,
      notify_method: 'in_app',
      sent_at: nowIso,
    }))
    if (rows.length > 0) {
      await admin
        .from('sos_notifications')
        .upsert(rows, { onConflict: 'sos_request_id,notified_user_id,notify_method' })
    }
  } catch (err) {
    console.error('[broadcastSOSNotifications] sos_notifications upsert failed', err)
  }

  // 8. Critical urgency → Resend email to recipients (capped at 500)
  if (urgency === 'critical') {
    try {
      const emailIds = recipientIds.slice(0, 500)
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, display_name, full_name, contact_email')
        .in('id', emailIds)

      if (profiles && profiles.length > 0) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://metal-gear-five.vercel.app'
        const emailJobs = profiles
          .map((p) => {
            const contactEmail = (p as { contact_email: string | null }).contact_email
            if (!contactEmail || contactEmail.length === 0) return null
            return {
              email: contactEmail,
              name: (p as { display_name: string | null }).display_name || (p as { full_name: string | null }).full_name || 'there',
            }
          })
          .filter((job): job is { email: string; name: string } => job !== null)

        await Promise.allSettled(
          emailJobs.map((job) =>
            sendEmail({
              to: job.email,
              subject: `🚨 Critical SOS on Metal Gear: ${title}`,
              html: buildCriticalSOSEmailHtml({
                recipientName: job.name,
                sosTitle: title,
                sosId,
                platformUrl: appUrl,
              }),
            })
          )
        )
      }
    } catch (err) {
      console.error('[broadcastSOSNotifications] critical email send failed', err)
    }
  }
}

function buildCriticalSOSEmailHtml(params: {
  recipientName: string
  sosTitle: string
  sosId: string
  platformUrl: string
}): string {
  const { recipientName, sosTitle, sosId, platformUrl } = params
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="background:#18191A;color:#E4E6EB;font-family:'Manrope',Arial,sans-serif;margin:0;padding:32px 16px;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="background:#FF6B2B;padding:4px 12px;border-radius:4px;display:inline-block;margin-bottom:16px;">
      <span style="color:#fff;font-weight:700;font-size:12px;letter-spacing:0.08em;">🚨 CRITICAL SOS</span>
    </div>
    <h1 style="font-size:22px;margin:0 0 8px;color:#fff;">${sosTitle}</h1>
    <p style="color:#B0B3B8;margin:0 0 24px;">Hi ${recipientName}, a critical equipment need matching your interests was just posted on Metal Gear.</p>
    <a href="${platformUrl}/sos/${sosId}" style="background:#FF6B2B;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;display:inline-block;">
      View SOS &amp; Respond
    </a>
    <p style="color:#B0B3B8;font-size:12px;margin-top:32px;">
      You're receiving this because you opted into SOS alerts.
      <a href="${platformUrl}/profile" style="color:#1877F2;">Manage notification preferences</a>
    </p>
  </div>
</body>
</html>`
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

  // Get user's equipment interests + receive-all flag to determine which SOSs they should see
  const [{ data: interests }, { data: bizProfile }] = await Promise.all([
    admin
      .from('user_equipment_interests')
      .select('tier2')
      .eq('user_id', user.id),
    admin
      .from('user_business_profiles')
      // sos_receive_all column added 2026-04-10; not yet in generated types
      .select('sos_receive_all' as 'industries')
      .eq('user_id', user.id)
      .maybeSingle(),
  ])

  const userCategories = (interests || []).map((i: { tier2: string }) => i.tier2)
  const receiveAll =
    (bizProfile as { sos_receive_all?: boolean | null } | null)?.sos_receive_all === true

  // NOTE: We deliberately do NOT use PostgREST embedded joins for `requester`
  // here. sos_requests.requester_id is FK'd to auth.users(id), not profiles(id),
  // so PostgREST can't traverse it and the embed throws PGRST200 server-side.
  // We fetch profiles separately and merge.
  let query = admin
    .from('sos_requests')
    .select(`*, response_count:sos_responses(count)`)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (filters?.category) {
    query = query.eq('equipment_category', filters.category)
  } else if (!receiveAll && userCategories.length > 0) {
    // Only filter by interests if the user did NOT opt into receive-all
    query = query.in('equipment_category', userCategories)
  }
  // If receiveAll is true OR the user has zero interests configured, return
  // every active SOS — admins/monitors with no interests should see the full
  // firehose rather than an empty dashboard.

  if (filters?.urgency) {
    query = query.eq('urgency', filters.urgency)
  }

  const { data, error } = await query.limit(50)

  if (error) return { error: error.message }

  const rows = data || []
  if (rows.length === 0) return { requests: [] }

  // Fetch requester profiles separately
  const requesterIds = Array.from(new Set(rows.map((r) => r.requester_id).filter(Boolean)))
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, display_name, company_name, avatar_url')
    .in('id', requesterIds)

  const profileMap = new Map<string, { full_name: string | null; company_name: string | null; avatar_url: string | null }>()
  for (const p of profiles || []) {
    profileMap.set(p.id, {
      full_name: p.display_name || p.full_name,
      company_name: p.company_name,
      avatar_url: p.avatar_url,
    })
  }

  return {
    requests: rows.map((r) => ({
      ...r,
      requester: profileMap.get(r.requester_id) ?? null,
    })),
  }
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

  // sos_requests.requester_id and sos_responses.responder_id are FK'd to
  // auth.users(id), not profiles(id), so PostgREST cannot embed-join through
  // them. We fetch profiles separately and merge.
  const { data: sos, error } = await admin
    .from('sos_requests')
    .select('*')
    .eq('id', sosId)
    .single()

  if (error || !sos) return { error: 'SOS request not found' }

  // Requester profile
  const { data: requesterProfile } = await admin
    .from('profiles')
    .select('id, full_name, display_name, company_name, avatar_url')
    .eq('id', sos.requester_id)
    .maybeSingle()

  // Responses
  const { data: responsesRaw } = await admin
    .from('sos_responses')
    .select('*')
    .eq('sos_request_id', sosId)
    .order('created_at', { ascending: true })

  const responses = responsesRaw || []
  const responder_profiles_by_id = new Map<string, { id: string; full_name: string | null; company_name: string | null; avatar_url: string | null }>()
  if (responses.length > 0) {
    const responderIds = Array.from(new Set(responses.map((r) => r.responder_id).filter(Boolean)))
    if (responderIds.length > 0) {
      const { data: respProfiles } = await admin
        .from('profiles')
        .select('id, full_name, display_name, company_name, avatar_url')
        .in('id', responderIds)
      for (const p of respProfiles || []) {
        responder_profiles_by_id.set(p.id, {
          id: p.id,
          full_name: p.display_name || p.full_name,
          company_name: p.company_name,
          avatar_url: p.avatar_url,
        })
      }
    }
  }

  // Get requester's business profile
  const { data: requesterBiz } = await admin
    .from('user_business_profiles')
    .select('company_name, primary_role')
    .eq('user_id', sos.requester_id)
    .maybeSingle()

  const isRequester = sos.requester_id === user.id

  return {
    sos: {
      ...sos,
      requester: requesterProfile
        ? {
            id: requesterProfile.id,
            full_name: requesterProfile.display_name || requesterProfile.full_name,
            company_name: requesterProfile.company_name,
            avatar_url: requesterProfile.avatar_url,
          }
        : null,
      requester_business: requesterBiz,
    },
    responses: responses.map((r) => ({
      ...r,
      responder: responder_profiles_by_id.get(r.responder_id) ?? null,
    })),
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
