'use server'

/**
 * Suggestion-feedback server actions (Cycle 63).
 *
 * Two callers:
 * 1. SuggestionFeedbackChip → recordSuggestionFeedback (non-registry fields).
 * 2. SuggestionFeedbackChip (manufacturer/model fields) → recordRegistryFeedbackFromChip,
 *    a thin wrapper around Cycle 61's recordRegistryFeedback so the same chip
 *    component can drive both tables.
 *
 * Fail-soft: errors return { ok: false, error } — never throw. The chip shows
 * a toast on error and the parent flow keeps moving.
 */

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { recordRegistryFeedback } from '@/app/actions/registry'

type RegistrySourceTable = 'listings' | 'sos_requests' | 'snap_list_drafts'

const UuidSchema = z.string().uuid()

const SOURCE_TABLES = ['listing_drafts', 'sos_requests', 'listings'] as const
const USER_ACTIONS = ['accepted', 'rejected', 'overridden', 'unsure'] as const
const SURFACES = [
  'photo_to_listing',
  'sos_analysis',
  'listing_analyzer_helper',
] as const

const RecordSuggestionFeedbackSchema = z.object({
  sourceTable: z.enum(SOURCE_TABLES),
  sourceRowId: UuidSchema,
  fieldName: z.string().trim().min(1).max(100),
  suggestedValue: z.string().max(2000).nullable().optional(),
  userAction: z.enum(USER_ACTIONS),
  userValue: z.string().max(2000).nullable().optional(),
  surface: z.enum(SURFACES),
})

export type RecordSuggestionFeedbackInput = z.infer<
  typeof RecordSuggestionFeedbackSchema
>

export interface SuggestionFeedbackResult {
  ok: boolean
  error?: string
}

async function getUserId(): Promise<string | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  return user?.id ?? null
}

async function checkOwnership(
  sourceTable: (typeof SOURCE_TABLES)[number],
  sourceRowId: string,
  userId: string,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient()

  if (sourceTable === 'listing_drafts') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row } = await (admin as any)
      .from('listing_drafts')
      .select('owner_id')
      .eq('id', sourceRowId)
      .maybeSingle()
    if (!row || row.owner_id !== userId) {
      return { ok: false, error: 'Not your draft' }
    }
    return { ok: true }
  }

  if (sourceTable === 'sos_requests') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row } = await (admin as any)
      .from('sos_requests')
      .select('requester_id')
      .eq('id', sourceRowId)
      .maybeSingle()
    if (!row || row.requester_id !== userId) {
      return { ok: false, error: 'Not your SOS request' }
    }
    return { ok: true }
  }

  if (sourceTable === 'listings') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: row } = await (admin as any)
      .from('listings')
      .select('seller_id')
      .eq('id', sourceRowId)
      .maybeSingle()
    if (!row || row.seller_id !== userId) {
      return { ok: false, error: 'Not your listing' }
    }
    return { ok: true }
  }

  return { ok: false, error: 'Unknown source table' }
}

export async function recordSuggestionFeedback(
  input: RecordSuggestionFeedbackInput,
): Promise<SuggestionFeedbackResult> {
  const userId = await getUserId()
  if (!userId) return { ok: false, error: 'Not signed in' }

  const parsed = RecordSuggestionFeedbackSchema.safeParse(input)
  if (!parsed.success) {
    return { ok: false, error: 'Invalid feedback input' }
  }
  const data = parsed.data

  const ownership = await checkOwnership(
    data.sourceTable,
    data.sourceRowId,
    userId,
  )
  if (!ownership.ok) return { ok: false, error: ownership.error }

  const admin = createAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (admin as any).from('ai_suggestion_feedback').insert({
    user_id: userId,
    source_table: data.sourceTable,
    source_row_id: data.sourceRowId,
    field_name: data.fieldName,
    suggested_value: data.suggestedValue ?? null,
    user_action: data.userAction,
    user_value: data.userValue ?? null,
    surface: data.surface,
  })

  if (error) return { ok: false, error: 'Could not save your feedback' }
  return { ok: true }
}

// Map this cycle's chip-side terminology to Cycle 61's registry table enum.
const REGISTRY_USER_ACTION_MAP: Record<
  (typeof USER_ACTIONS)[number],
  'accepted' | 'rejected' | 'overridden_with_text' | 'ignored'
> = {
  accepted: 'accepted',
  rejected: 'rejected',
  overridden: 'overridden_with_text',
  unsure: 'ignored',
}

const RECORD_SOURCE_TO_REGISTRY_SOURCE: Record<
  (typeof SOURCE_TABLES)[number],
  RegistrySourceTable
> = {
  listing_drafts: 'snap_list_drafts',
  sos_requests: 'sos_requests',
  listings: 'listings',
}

const RecordRegistryFromChipSchema = z.object({
  sourceTable: z.enum(SOURCE_TABLES),
  sourceRowId: UuidSchema,
  suggestedManufacturerId: UuidSchema.nullable().optional(),
  suggestedModelId: UuidSchema.nullable().optional(),
  userAction: z.enum(USER_ACTIONS),
  userValue: z.string().max(200).nullable().optional(),
})

export type RecordRegistryFromChipInput = z.infer<
  typeof RecordRegistryFromChipSchema
>

export async function recordRegistryFeedbackFromChip(
  input: RecordRegistryFromChipInput,
): Promise<SuggestionFeedbackResult> {
  const parsed = RecordRegistryFromChipSchema.safeParse(input)
  if (!parsed.success) return { ok: false, error: 'Invalid feedback input' }
  const data = parsed.data

  const result = await recordRegistryFeedback({
    sourceTable: RECORD_SOURCE_TO_REGISTRY_SOURCE[data.sourceTable],
    sourceRowId: data.sourceRowId,
    suggestedManufacturerId: data.suggestedManufacturerId ?? null,
    suggestedModelId: data.suggestedModelId ?? null,
    userAction: REGISTRY_USER_ACTION_MAP[data.userAction],
    userTextValue: data.userValue ?? null,
  })

  if (!result.success) {
    return { ok: false, error: result.error ?? 'Could not save your feedback' }
  }
  return { ok: true }
}
