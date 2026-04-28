'use client'

import { useEffect, useRef, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Target, ThumbsUp, Pencil, HelpCircle, Check } from 'lucide-react'
import {
  recordSuggestionFeedback,
  recordRegistryFeedbackFromChip,
} from '@/app/actions/ai-feedback'

type Surface = 'photo_to_listing' | 'sos_analysis' | 'listing_analyzer_helper'
type SourceTable = 'listing_drafts' | 'sos_requests' | 'listings'
type UserAction = 'accepted' | 'rejected' | 'overridden' | 'unsure'

interface BaseProps {
  /** The value the system suggested. If null/empty, the chip renders nothing. */
  suggestedValue: string | null | undefined
  /** The current value of the field (used to detect post-action overrides). */
  currentValue: string | null | undefined
  /** Canonical field name — must match the names used in confidence_scores / fields. */
  fieldName: string
  surface: Surface
  sourceTable: SourceTable
  sourceRowId: string
  /** Optional callback fired after a successful action insert. */
  onActionRecorded?: (action: UserAction) => void
  className?: string
}

interface RegularFieldProps extends BaseProps {
  /** Default — non-registry field, writes to ai_suggestion_feedback. */
  kind?: 'field'
}

interface RegistryFieldProps extends BaseProps {
  /** Manufacturer/model field — writes to registry_match_feedback via wrapper. */
  kind: 'registry'
  suggestedManufacturerId?: string | null
  suggestedModelId?: string | null
}

export type SuggestionFeedbackChipProps = RegularFieldProps | RegistryFieldProps

type ChipState = 'idle' | 'expanded' | 'recorded'

export function SuggestionFeedbackChip(props: SuggestionFeedbackChipProps) {
  const {
    suggestedValue,
    currentValue,
    fieldName,
    surface,
    sourceTable,
    sourceRowId,
    onActionRecorded,
    className,
  } = props

  const [state, setState] = useState<ChipState>('idle')
  const [lastAction, setLastAction] = useState<UserAction | null>(null)
  const [pending, startTransition] = useTransition()
  const lastRecordedValueRef = useRef<string | null | undefined>(undefined)

  // Append-only override detection: if the current value diverges from what
  // we last recorded, fire an `'overridden'` row. Skip when no action recorded
  // yet (we don't track edits for users who never engaged).
  useEffect(() => {
    if (lastRecordedValueRef.current === undefined) return
    if (lastAction === null) return
    if (currentValue === lastRecordedValueRef.current) return
    // Diverged — log override (background, no UI change).
    void submit('overridden', currentValue ?? null, /* silent */ true)
    lastRecordedValueRef.current = currentValue ?? null
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentValue])

  if (!suggestedValue || suggestedValue.trim() === '') return null

  async function submit(action: UserAction, userValue: string | null, silent = false) {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        let result: { ok: boolean; error?: string }
        if (props.kind === 'registry') {
          result = await recordRegistryFeedbackFromChip({
            sourceTable,
            sourceRowId,
            suggestedManufacturerId: props.suggestedManufacturerId ?? null,
            suggestedModelId: props.suggestedModelId ?? null,
            userAction: action,
            userValue,
          })
        } else {
          result = await recordSuggestionFeedback({
            sourceTable,
            sourceRowId,
            fieldName,
            suggestedValue: suggestedValue ?? null,
            userAction: action,
            userValue,
            surface,
          })
        }

        if (!result.ok) {
          if (!silent) {
            toast.error(result.error ?? "Couldn't save your feedback — try again.")
            setState('expanded')
          }
          resolve()
          return
        }

        lastRecordedValueRef.current = userValue
        setLastAction(action)
        if (!silent) {
          setState('recorded')
          onActionRecorded?.(action)
          // Collapse the "Thanks ✓" chip after 1.5s.
          setTimeout(() => setState('idle'), 1500)
        }
        resolve()
      })
    })
  }

  const baseClass = `inline-flex items-center gap-1.5 font-body text-xs ${className ?? ''}`

  if (state === 'recorded') {
    return (
      <span className={`${baseClass} text-emerald-600 dark:text-emerald-400`}>
        <Check className="size-3" /> Thanks
      </span>
    )
  }

  if (lastAction && state === 'idle') {
    // Subtle confirmed state — show the recorded action without re-prompting.
    return (
      <button
        type="button"
        onClick={() => setState('expanded')}
        className={`${baseClass} text-muted-foreground hover:text-foreground`}
      >
        <Check className="size-3" /> Feedback recorded · change
      </button>
    )
  }

  if (state === 'idle') {
    return (
      <button
        type="button"
        onClick={() => setState('expanded')}
        className={`${baseClass} text-muted-foreground hover:text-foreground`}
        aria-label={`Was the suggested ${fieldName} right?`}
      >
        <Target className="size-3" /> Was this right?
      </button>
    )
  }

  // Expanded — three pills.
  return (
    <span className={baseClass}>
      <button
        type="button"
        disabled={pending}
        onClick={() => submit('accepted', currentValue ?? null)}
        className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 hover:bg-emerald-500/10 hover:border-emerald-500/40 hover:text-emerald-700 dark:hover:text-emerald-300"
      >
        <ThumbsUp className="size-3" /> Looks good
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => submit('rejected', currentValue ?? null)}
        className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 hover:bg-amber-500/10 hover:border-amber-500/40 hover:text-amber-700 dark:hover:text-amber-300"
      >
        <Pencil className="size-3" /> Not quite
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => submit('unsure', currentValue ?? null)}
        className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 hover:bg-muted hover:text-foreground"
      >
        <HelpCircle className="size-3" /> Not sure
      </button>
    </span>
  )
}
