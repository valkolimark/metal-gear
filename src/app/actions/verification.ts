'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createHash } from 'crypto'

export async function submitVerificationRequest(
  businessName: string,
  taxId: string,
  documentFormData?: FormData
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Check for existing pending request
  const { data: existing } = await admin
    .from('seller_verifications')
    .select('id, status')
    .eq('user_id', user.id)
    .in('status', ['pending', 'approved'])
    .limit(1)

  if (existing && existing.length > 0) {
    if (existing[0].status === 'approved') return { error: 'Already verified' }
    return { error: 'You already have a pending verification request' }
  }

  // Hash tax ID before storage
  const taxIdHash = createHash('sha256').update(taxId.trim()).digest('hex')

  // Upload document if provided
  let documentUrl: string | null = null
  if (documentFormData) {
    const file = documentFormData.get('file') as File
    if (file && file.size > 0) {
      if (file.size > 10 * 1024 * 1024) return { error: 'Document must be under 10MB' }

      const { uploadVerificationDocument } = await import('@/lib/media')
      const buffer = Buffer.from(await file.arrayBuffer())

      try {
        documentUrl = await uploadVerificationDocument(buffer, user.id, file.type)
      } catch (err) {
        return { error: `Upload failed: ${err instanceof Error ? err.message : 'R2 error'}` }
      }
    }
  }

  // Strip EIN formatting for plain storage
  const einDigits = taxId.replace(/\D/g, '')
  const einFormatted = einDigits.length > 2
    ? `${einDigits.slice(0, 2)}-${einDigits.slice(2)}`
    : einDigits

  const { error } = await admin.from('seller_verifications').upsert({
    user_id: user.id,
    business_name: businessName,
    tax_id_hash: taxIdHash,
    document_url: documentUrl,
    ein: einFormatted || null,
    ein_submitted_at: new Date().toISOString(),
    status: 'pending',
    // Reset any prior rejection
    reviewed_at: null,
    reviewed_by: null,
    rejection_reason: null,
    admin_notes: null,
  }, { onConflict: 'user_id' })

  if (error) return { error: error.message }
  return { success: true }
}

export async function getVerificationStatus() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { status: null }

  const admin = createAdminClient()
  const { data } = await admin
    .from('seller_verifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)

  return { verification: data?.[0] || null }
}

export async function getPendingVerifications() {
  const admin = createAdminClient()
  const { data } = await admin
    .from('seller_verifications')
    .select('*, profiles!seller_verifications_user_id_fkey(full_name, display_name, company_name, avatar_url, email_notifications)')
    .eq('status', 'pending')
    .order('created_at', { ascending: true })

  return { verifications: data || [] }
}

export async function reviewVerification(
  verificationId: string,
  action: 'approved' | 'rejected',
  notes?: string
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Check admin
  const { data: profile } = await admin
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single()

  if (!profile?.is_admin) return { error: 'Admin access required' }

  // Get verification
  const { data: verification } = await admin
    .from('seller_verifications')
    .select('user_id')
    .eq('id', verificationId)
    .single()

  if (!verification) return { error: 'Verification not found' }

  // Update verification
  const { error } = await admin
    .from('seller_verifications')
    .update({
      status: action,
      admin_notes: notes || null,
      rejection_reason: action === 'rejected' ? (notes || null) : null,
      reviewed_by: user.id,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', verificationId)

  if (error) return { error: error.message }

  // If approved, update profile
  if (action === 'approved') {
    await admin
      .from('profiles')
      .update({ is_verified_dealer: true })
      .eq('id', verification.user_id)

    // Recalculate trust score
    await calculateTrustScore(verification.user_id)
  }

  // Audit log
  await admin.from('admin_audit_log').insert({
    admin_id: user.id,
    action: `verification_${action}`,
    target_type: 'seller_verification',
    target_id: verificationId,
    details: { notes },
  })

  return { success: true }
}

export async function calculateTrustScore(userId: string) {
  const admin = createAdminClient()

  const [profileRes, reviewsRes, verificationRes] = await Promise.all([
    admin.from('profiles').select('created_at, is_verified_dealer').eq('id', userId).single(),
    admin.from('reviews').select('rating').eq('seller_id', userId),
    admin.from('seller_verifications').select('status').eq('user_id', userId).eq('status', 'approved').limit(1),
  ])

  let score = 0

  // Verified status (0-30 points)
  if (verificationRes.data && verificationRes.data.length > 0) score += 30

  // Review rating (0-30 points)
  const reviews = reviewsRes.data || []
  if (reviews.length > 0) {
    const avgRating = reviews.reduce((s, r) => s + r.rating, 0) / reviews.length
    score += Math.round((avgRating / 5) * 30)
  }

  // Account age (0-20 points)
  if (profileRes.data) {
    const daysOld = Math.floor(
      (Date.now() - new Date(profileRes.data.created_at).getTime()) / 86400000
    )
    score += Math.min(Math.floor(daysOld / 15), 20)
  }

  // Response time (0-20 points) — give default points if no conversations yet
  const { data: convs } = await admin
    .from('conversations')
    .select('id, messages(created_at, sender_id)')
    .eq('seller_id', userId)
    .limit(20)

  let responseCount = 0
  let totalMinutes = 0
  for (const conv of convs || []) {
    const msgs = (conv.messages as { created_at: string; sender_id: string }[]) || []
    if (msgs.length < 2) continue
    const sorted = [...msgs].sort(
      (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
    )
    if (sorted[0].sender_id === userId) continue
    const reply = sorted.find((m) => m.sender_id === userId)
    if (!reply) continue
    const diff = (new Date(reply.created_at).getTime() - new Date(sorted[0].created_at).getTime()) / 60000
    if (diff > 0 && diff < 10080) {
      totalMinutes += diff
      responseCount++
    }
  }

  if (responseCount > 0) {
    const avgMinutes = totalMinutes / responseCount
    if (avgMinutes < 60) score += 20
    else if (avgMinutes < 240) score += 15
    else if (avgMinutes < 1440) score += 10
    else score += 5
  }

  score = Math.min(score, 100)

  await admin
    .from('profiles')
    .update({ trust_score: score })
    .eq('id', userId)

  return score
}

export async function getTrustLevel(score: number): Promise<string> {
  if (score >= 80) return 'Top Seller'
  if (score >= 60) return 'Verified'
  if (score >= 30) return 'Trusted'
  return 'New'
}
