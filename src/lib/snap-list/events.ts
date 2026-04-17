/**
 * Fire-and-forget event logger for Snap & List pilot instrumentation.
 *
 * Writes to `snap_list_events` via service-role client. MUST NEVER throw —
 * instrumentation failures cannot break the user flow. This is enforced by
 * `src/test/snap-list-events.test.ts`.
 */

import { createAdminClient } from "@/lib/supabase/admin"
import type { Json } from "@/types/database"

export type SnapListEventType =
  | "draft_created"
  | "analysis_started"
  | "analysis_stage_completed"
  | "analysis_completed"
  | "analysis_failed"
  | "field_viewed"
  | "field_edited"
  | "clarifying_question_answered"
  | "photo_coach_suggestion_acted"
  | "photos_added_post_analysis"
  | "draft_abandoned"
  | "draft_discarded"
  | "draft_published"
  | "listing_edited_post_publish"

export interface LogSnapListEventArgs {
  type: SnapListEventType
  draftId: string | null
  ownerId: string
  payload?: Record<string, unknown>
}

/**
 * Log a Snap & List event. Fire-and-forget — callers do not need to await.
 * Wraps every DB call in try/catch and never throws.
 */
export async function logSnapListEvent(args: LogSnapListEventArgs): Promise<void> {
  try {
    const admin = createAdminClient()
    const { error } = await admin.from("snap_list_events").insert({
      draft_id: args.draftId,
      owner_id: args.ownerId,
      event_type: args.type,
      payload: (args.payload ?? {}) as unknown as Json,
    })
    if (error) {
      console.error("[snap-list-events] insert failed:", error.message)
    }
  } catch (err) {
    console.error("[snap-list-events] logger exception:", err)
  }
}

/**
 * Convenience wrapper for timing-bearing stage events.
 */
export function logStageCompleted(
  draftId: string,
  ownerId: string,
  stage: string,
  durationMs: number,
): Promise<void> {
  return logSnapListEvent({
    type: "analysis_stage_completed",
    draftId,
    ownerId,
    payload: { stage, duration_ms: durationMs },
  })
}
