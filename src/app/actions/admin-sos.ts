'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { createNotification } from '@/app/actions/notifications'
import { getAllGroupsForSubcategory } from '@/lib/constants/equipment-taxonomy'
import { sendEmail } from '@/lib/email'
import { requireAdmin } from '@/lib/admin/permissions'
import { logAdminAction } from '@/app/(admin)/admin/actions'

// ─── Types ──────────────────────────────────────────────────────────

export type SOSDetailData = {
  id: string
  title: string
  description: string | null
  notes: string | null
  equipment_category: string
  equipment_subcategory: string | null
  brand: string | null
  model: string | null
  urgency: string
  status: string
  location_city: string | null
  location_state: string | null
  transport_needed: boolean
  ai_categorized: boolean
  created_at: string | null
  updated_at: string | null
  expires_at: string | null
  max_distance_miles: number | null
  requester_id: string
  requester_name: string
  requester_avatar: string | null
  requester_archetype: string | null
  company_id: string | null
  company_name: string | null
  notification_count: number
  response_count: number
}

export type SOSNotificationEntry = {
  notification_id: string
  user_id: string
  display_name: string
  avatar_url: string | null
  archetype: string | null
  notify_method: string
  sent_at: string | null
  read_at: string | null
  responded: boolean
  response_preview: string | null
}

export type SOSResponseEntry = {
  response_id: string
  responder_id: string
  display_name: string
  avatar_url: string | null
  company_name: string | null
  archetype: string | null
  message: string
  price_estimate: string | null
  lead_time: string | null
  condition: string | null
  created_at: string | null
}

// ─── getSOSDetail ───────────────────────────────────────────────────

export async function getSOSDetail(id: string): Promise<SOSDetailData | null> {
  const admin = createAdminClient()

  const { data: sos, error } = await admin
    .from('sos_requests')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error || !sos) return null

  // Requester profile
  const { data: requesterProfile } = await admin
    .from('profiles')
    .select('id, display_name, full_name, avatar_url')
    .eq('id', sos.requester_id)
    .maybeSingle()

  // Requester archetype lives on user_business_profiles
  const { data: requesterBiz } = await admin
    .from('user_business_profiles')
    .select('archetype, company_name')
    .eq('user_id', sos.requester_id)
    .maybeSingle()

  // Company name from company_profiles when company_id present
  let companyName: string | null = requesterBiz?.company_name ?? null
  if (sos.company_id) {
    const { data: company } = await admin
      .from('company_profiles')
      .select('name')
      .eq('id', sos.company_id)
      .maybeSingle()
    if (company?.name) companyName = company.name
  }

  // Counts
  const { count: notifCount } = await admin
    .from('sos_notifications')
    .select('id', { count: 'exact', head: true })
    .eq('sos_request_id', id)

  const { count: respCount } = await admin
    .from('sos_responses')
    .select('id', { count: 'exact', head: true })
    .eq('sos_request_id', id)

  return {
    id: sos.id,
    title: sos.title,
    description: sos.description,
    notes: sos.notes,
    equipment_category: sos.equipment_category,
    equipment_subcategory: sos.equipment_subcategory,
    brand: sos.brand,
    model: sos.model,
    urgency: sos.urgency ?? 'normal',
    status: sos.status ?? 'active',
    location_city: sos.location_city,
    location_state: sos.location_state,
    transport_needed: sos.transport_needed,
    ai_categorized: sos.ai_categorized ?? false,
    created_at: sos.created_at,
    updated_at: sos.updated_at,
    expires_at: sos.expires_at,
    max_distance_miles: sos.max_distance_miles,
    requester_id: sos.requester_id,
    requester_name: requesterProfile?.display_name || requesterProfile?.full_name || 'Unknown',
    requester_avatar: requesterProfile?.avatar_url ?? null,
    requester_archetype: requesterBiz?.archetype ?? null,
    company_id: sos.company_id,
    company_name: companyName,
    notification_count: notifCount ?? 0,
    response_count: respCount ?? 0,
  }
}

// ─── getSOSNotificationLog ─────────────────────────────────────────

export async function getSOSNotificationLog(sosId: string): Promise<SOSNotificationEntry[]> {
  const admin = createAdminClient()

  const { data: notifications, error } = await admin
    .from('sos_notifications')
    .select('id, notified_user_id, notify_method, sent_at, read_at')
    .eq('sos_request_id', sosId)
    .order('sent_at', { ascending: true, nullsFirst: false })

  if (error || !notifications || notifications.length === 0) return []

  const userIds = Array.from(new Set(notifications.map((n) => n.notified_user_id)))

  // Profiles for these users
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name, full_name, avatar_url')
    .in('id', userIds)

  const profileMap = new Map<string, { display_name: string; avatar_url: string | null }>()
  for (const p of profiles || []) {
    profileMap.set(p.id, {
      display_name: p.display_name || p.full_name || 'Unknown',
      avatar_url: p.avatar_url,
    })
  }

  // Archetypes via user_business_profiles
  const { data: bizRows } = await admin
    .from('user_business_profiles')
    .select('user_id, archetype')
    .in('user_id', userIds)

  const archetypeMap = new Map<string, string | null>()
  for (const row of bizRows || []) {
    archetypeMap.set(row.user_id, row.archetype ?? null)
  }

  // Responses for this SOS — keyed by responder_id
  const { data: responses } = await admin
    .from('sos_responses')
    .select('responder_id, message')
    .eq('sos_request_id', sosId)

  const responseMap = new Map<string, string>()
  for (const r of responses || []) {
    if (!responseMap.has(r.responder_id)) {
      responseMap.set(r.responder_id, r.message)
    }
  }

  return notifications.map((n) => {
    const profile = profileMap.get(n.notified_user_id)
    const responseMsg = responseMap.get(n.notified_user_id)
    return {
      notification_id: n.id,
      user_id: n.notified_user_id,
      display_name: profile?.display_name || 'Unknown',
      avatar_url: profile?.avatar_url ?? null,
      archetype: archetypeMap.get(n.notified_user_id) ?? null,
      notify_method: n.notify_method,
      sent_at: n.sent_at,
      read_at: n.read_at,
      responded: responseMsg !== undefined,
      response_preview: responseMsg ? responseMsg.slice(0, 120) : null,
    }
  })
}

// ─── getSOSResponseTimeline ────────────────────────────────────────

export async function getSOSResponseTimeline(sosId: string): Promise<SOSResponseEntry[]> {
  const admin = createAdminClient()

  const { data: responses, error } = await admin
    .from('sos_responses')
    .select('id, responder_id, message, price_estimate, lead_time, condition, created_at')
    .eq('sos_request_id', sosId)
    .order('created_at', { ascending: true })

  if (error || !responses || responses.length === 0) return []

  const responderIds = Array.from(new Set(responses.map((r) => r.responder_id)))

  const { data: profiles } = await admin
    .from('profiles')
    .select('id, display_name, full_name, avatar_url')
    .in('id', responderIds)

  const profileMap = new Map<string, { display_name: string; avatar_url: string | null }>()
  for (const p of profiles || []) {
    profileMap.set(p.id, {
      display_name: p.display_name || p.full_name || 'Unknown',
      avatar_url: p.avatar_url,
    })
  }

  const { data: bizRows } = await admin
    .from('user_business_profiles')
    .select('user_id, archetype, company_name')
    .in('user_id', responderIds)

  const bizMap = new Map<string, { archetype: string | null; company_name: string | null }>()
  for (const row of bizRows || []) {
    bizMap.set(row.user_id, {
      archetype: row.archetype ?? null,
      company_name: row.company_name ?? null,
    })
  }

  // Active company memberships → company_profiles for richer company name
  const { data: memberships } = await admin
    .from('company_memberships')
    .select('user_id, company_id')
    .in('user_id', responderIds)
    .eq('is_active', true)

  const companyIdByUser = new Map<string, string>()
  for (const m of memberships || []) {
    if (!companyIdByUser.has(m.user_id)) {
      companyIdByUser.set(m.user_id, m.company_id)
    }
  }

  const uniqueCompanyIds = Array.from(new Set(Array.from(companyIdByUser.values())))
  const companyNameMap = new Map<string, string>()
  if (uniqueCompanyIds.length > 0) {
    const { data: companies } = await admin
      .from('company_profiles')
      .select('id, name')
      .in('id', uniqueCompanyIds)
    for (const c of companies || []) {
      companyNameMap.set(c.id, c.name)
    }
  }

  return responses.map((r) => {
    const profile = profileMap.get(r.responder_id)
    const biz = bizMap.get(r.responder_id)
    const companyId = companyIdByUser.get(r.responder_id)
    const company_name = (companyId && companyNameMap.get(companyId)) || biz?.company_name || null
    return {
      response_id: r.id,
      responder_id: r.responder_id,
      display_name: profile?.display_name || 'Unknown',
      avatar_url: profile?.avatar_url ?? null,
      company_name,
      archetype: biz?.archetype ?? null,
      message: r.message,
      price_estimate: r.price_estimate,
      lead_time: r.lead_time,
      condition: r.condition,
      created_at: r.created_at,
    }
  })
}

// ─── adminRebroadcastSOS ───────────────────────────────────────────

type RebroadcastResult = { sent: number; skipped: number; error?: string }

export async function adminRebroadcastSOS(sosId: string): Promise<RebroadcastResult> {
  const admin = createAdminClient()

  // 1. Fetch SOS row
  const { data: sos, error: fetchErr } = await admin
    .from('sos_requests')
    .select('*')
    .eq('id', sosId)
    .maybeSingle()

  if (fetchErr || !sos) return { sent: 0, skipped: 0, error: 'SOS not found' }
  if (sos.status !== 'active') {
    return { sent: 0, skipped: 0, error: 'SOS is not active' }
  }

  // 2. Re-run recipient matching — mirrors broadcastSOSNotifications in actions/sos.ts
  // TODO: consolidate with broadcastSOSNotifications
  const allResponders = new Map<string, true>()

  try {
    const { data: responders } = await (admin as unknown as {
      rpc: (fn: string, params: Record<string, string | null>) => Promise<{ data: { user_id: string }[] | null }>
    }).rpc('find_sos_responders', {
      p_tier2: sos.equipment_category,
      p_subcategory: sos.equipment_subcategory || null,
    })
    if (responders && Array.isArray(responders)) {
      for (const r of responders) allResponders.set(r.user_id, true)
    }

    if (sos.equipment_subcategory) {
      const crossGroups = getAllGroupsForSubcategory(sos.equipment_subcategory)
        .filter((g) => g !== sos.equipment_category)
      for (const groupId of crossGroups) {
        const { data: crossResponders } = await (admin as unknown as {
          rpc: (fn: string, params: Record<string, string | null>) => Promise<{ data: { user_id: string }[] | null }>
        }).rpc('find_sos_responders', {
          p_tier2: groupId,
          p_subcategory: sos.equipment_subcategory,
        })
        if (crossResponders && Array.isArray(crossResponders)) {
          for (const r of crossResponders) allResponders.set(r.user_id, true)
        }
      }
    }
  } catch (err) {
    console.error('[adminRebroadcastSOS] responder lookup failed', err)
  }

  let candidateIds = Array.from(allResponders.keys()).filter((id) => id !== sos.requester_id)

  // Defense-in-depth: explicit sos_receive_all subscribers
  try {
    const { data: receiveAllUsers } = await admin
      .from('user_business_profiles')
      .select('user_id')
      .eq('sos_receive_all', true)
      .eq('onboarding_completed', true)
      .limit(500)
    for (const row of receiveAllUsers || []) {
      if (row.user_id && row.user_id !== sos.requester_id && !candidateIds.includes(row.user_id)) {
        candidateIds.push(row.user_id)
      }
    }
  } catch (err) {
    console.error('[adminRebroadcastSOS] sos_receive_all lookup failed', err)
  }

  // Transport routing
  if (sos.transport_needed) {
    try {
      const { data: logisticsUsers } = await admin
        .from('user_business_profiles')
        .select('user_id')
        .eq('archetype', 'logistics')
        .limit(500)
      for (const row of logisticsUsers || []) {
        if (row.user_id && row.user_id !== sos.requester_id && !candidateIds.includes(row.user_id)) {
          candidateIds.push(row.user_id)
        }
      }
    } catch (err) {
      console.error('[adminRebroadcastSOS] logistics lookup failed', err)
    }
  }

  // Filter by sos_opted_in
  if (candidateIds.length > 0) {
    try {
      const { data: optedInProfiles } = await admin
        .from('user_business_profiles')
        .select('user_id, sos_opted_in')
        .in('user_id', candidateIds)
      if (optedInProfiles) {
        const optedInIds = new Set(
          optedInProfiles
            .filter((p) => p.sos_opted_in !== false)
            .map((p) => p.user_id)
        )
        candidateIds = candidateIds.filter((id) => optedInIds.has(id))
      }
    } catch (err) {
      console.error('[adminRebroadcastSOS] sos_opted_in filter failed', err)
    }
  }

  // 3. Diff against already-notified users
  const { data: existingNotifs } = await admin
    .from('sos_notifications')
    .select('notified_user_id')
    .eq('sos_request_id', sosId)

  const alreadyNotified = new Set((existingNotifs || []).map((n) => n.notified_user_id))
  const newRecipientIds = candidateIds.filter((id) => !alreadyNotified.has(id))

  if (newRecipientIds.length === 0) {
    return { sent: 0, skipped: alreadyNotified.size }
  }

  // 4. Get requester company name for notification copy
  let companyName = 'Someone'
  try {
    const { data: bizProfile } = await admin
      .from('user_business_profiles')
      .select('company_name')
      .eq('user_id', sos.requester_id)
      .maybeSingle()
    if (bizProfile?.company_name) companyName = bizProfile.company_name
  } catch {
    // ignore
  }

  const urgency = sos.urgency ?? 'normal'
  const notifTitle = urgency === 'critical'
    ? `🚨 CRITICAL SOS: ${companyName} needs a ${sos.title}`
    : `SOS: ${companyName} needs a ${sos.title}`
  const notifBody = `${urgency === 'critical' ? 'CRITICAL: ' : ''}${sos.description || sos.title} — Can you help?`

  // 5. Fan-out via createNotification (handles in-app + push)
  await Promise.allSettled(
    newRecipientIds.map((userId) =>
      createNotification(
        userId,
        'sos_request_match',
        notifTitle,
        notifBody,
        { sos_id: sosId, category: sos.equipment_category, urgency, rebroadcast: true }
      )
    )
  )

  // 6. Log delivery rows in sos_notifications
  try {
    const nowIso = new Date().toISOString()
    const rows = newRecipientIds.map((userId) => ({
      sos_request_id: sosId,
      notified_user_id: userId,
      notify_method: 'in_app',
      sent_at: nowIso,
    }))
    await admin
      .from('sos_notifications')
      .upsert(rows, { onConflict: 'sos_request_id,notified_user_id,notify_method' })
  } catch (err) {
    console.error('[adminRebroadcastSOS] sos_notifications upsert failed', err)
  }

  // 7. Critical urgency → email new recipients only
  if (urgency === 'critical') {
    try {
      const { data: profiles } = await admin
        .from('profiles')
        .select('id, display_name, full_name, contact_email')
        .in('id', newRecipientIds.slice(0, 500))

      if (profiles && profiles.length > 0) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://metal-gear-five.vercel.app'
        const emailJobs = profiles
          .map((p) => {
            const contactEmail = (p as { contact_email: string | null }).contact_email
            if (!contactEmail || contactEmail.length === 0) return null
            const display = (p as { display_name: string | null }).display_name
            const full = (p as { full_name: string | null }).full_name
            return { email: contactEmail, name: display || full || 'there' }
          })
          .filter((job): job is { email: string; name: string } => job !== null)

        await Promise.allSettled(
          emailJobs.map((job) =>
            sendEmail({
              to: job.email,
              subject: `🚨 Critical SOS on Metal Gear: ${sos.title}`,
              html: `<!DOCTYPE html>
<html>
<body style="background:#18191A;color:#E4E6EB;font-family:Manrope,Arial,sans-serif;margin:0;padding:32px 16px;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="background:#FF6B2B;padding:4px 12px;border-radius:4px;display:inline-block;margin-bottom:16px;">
      <span style="color:#fff;font-weight:700;font-size:12px;letter-spacing:0.08em;">🚨 CRITICAL SOS (RE-BROADCAST)</span>
    </div>
    <h1 style="font-size:22px;margin:0 0 8px;color:#fff;">${sos.title}</h1>
    <p style="color:#B0B3B8;margin:0 0 24px;">Hi ${job.name}, a critical equipment need matching your interests is still active on Metal Gear.</p>
    <a href="${appUrl}/sos/${sosId}" style="background:#FF6B2B;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;display:inline-block;">View SOS &amp; Respond</a>
  </div>
</body>
</html>`,
            })
          )
        )
      }
    } catch (err) {
      console.error('[adminRebroadcastSOS] critical email send failed', err)
    }
  }

  return { sent: newRecipientIds.length, skipped: alreadyNotified.size }
}

// ─── adminEscalateSOSUrgency ───────────────────────────────────────

export type EscalateUrgencyResult =
  | { success: true; newUrgency: 'critical' | 'normal'; emailsSent: number }
  | { success: false; error: string }

/**
 * Change a SOS request's urgency. When escalating from non-critical to
 * `critical`, this also fires a critical-urgency email blast to every user
 * already in `sos_notifications` for this SOS (so people who were notified
 * under "normal" urgency get told it's now critical). In-app + push
 * notifications are NOT re-fired (we don't want duplicate bell pings); use
 * the Re-broadcast button for that.
 */
export async function adminEscalateSOSUrgency(
  sosId: string,
  newUrgency: 'critical' | 'normal'
): Promise<EscalateUrgencyResult> {
  const { profile } = await requireAdmin('moderate')
  const admin = createAdminClient()

  const { data: sos, error: fetchErr } = await admin
    .from('sos_requests')
    .select('id, title, description, urgency, status, requester_id')
    .eq('id', sosId)
    .maybeSingle()

  if (fetchErr || !sos) return { success: false, error: 'SOS not found' }

  const oldUrgency = sos.urgency ?? 'normal'
  if (oldUrgency === newUrgency) {
    return { success: true, newUrgency, emailsSent: 0 }
  }

  const { error: updateErr } = await admin
    .from('sos_requests')
    .update({ urgency: newUrgency, updated_at: new Date().toISOString() })
    .eq('id', sosId)

  if (updateErr) return { success: false, error: updateErr.message }

  await logAdminAction(profile.id, 'update_sos_urgency', 'sos', sosId, {
    from: oldUrgency,
    to: newUrgency,
  })

  // If escalating to critical, fire email blast to already-notified users
  let emailsSent = 0
  const escalatingToCritical = newUrgency === 'critical' && oldUrgency !== 'critical'
  if (escalatingToCritical && sos.status === 'active') {
    try {
      // Get already-notified user IDs
      const { data: existingNotifs } = await admin
        .from('sos_notifications')
        .select('notified_user_id')
        .eq('sos_request_id', sosId)

      const recipientIds = Array.from(
        new Set((existingNotifs || []).map((n) => n.notified_user_id))
      )

      if (recipientIds.length > 0) {
        // Fetch contact emails
        const { data: profiles } = await admin
          .from('profiles')
          .select('id, display_name, full_name, contact_email')
          .in('id', recipientIds.slice(0, 500))

        if (profiles && profiles.length > 0) {
          const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ?? 'https://metal-gear-five.vercel.app'

          const emailJobs = profiles
            .map((p) => {
              const contactEmail = (p as { contact_email: string | null }).contact_email
              if (!contactEmail || contactEmail.length === 0) return null
              const display = (p as { display_name: string | null }).display_name
              const full = (p as { full_name: string | null }).full_name
              return { email: contactEmail, name: display || full || 'there' }
            })
            .filter((job): job is { email: string; name: string } => job !== null)

          await Promise.allSettled(
            emailJobs.map((job) =>
              sendEmail({
                to: job.email,
                subject: `🚨 ESCALATED to CRITICAL — ${sos.title}`,
                html: `<!DOCTYPE html>
<html>
<body style="background:#18191A;color:#E4E6EB;font-family:Manrope,Arial,sans-serif;margin:0;padding:32px 16px;">
  <div style="max-width:560px;margin:0 auto;">
    <div style="background:#FF6B2B;padding:4px 12px;border-radius:4px;display:inline-block;margin-bottom:16px;">
      <span style="color:#fff;font-weight:700;font-size:12px;letter-spacing:0.08em;">🚨 ESCALATED TO CRITICAL</span>
    </div>
    <h1 style="font-size:22px;margin:0 0 8px;color:#fff;">${sos.title}</h1>
    <p style="color:#B0B3B8;margin:0 0 24px;">Hi ${job.name}, an SOS request you were previously notified about has been escalated to <strong style="color:#fff;">CRITICAL urgency</strong>. The requester needs help immediately.</p>
    <a href="${appUrl}/sos/${sosId}" style="background:#FF6B2B;color:#fff;padding:14px 28px;border-radius:6px;text-decoration:none;font-weight:700;display:inline-block;">View SOS &amp; Respond</a>
  </div>
</body>
</html>`,
              })
            )
          )
          emailsSent = emailJobs.length
        }
      }
    } catch (err) {
      console.error('[adminEscalateSOSUrgency] critical email blast failed', err)
    }
  }

  return { success: true, newUrgency, emailsSent }
}
