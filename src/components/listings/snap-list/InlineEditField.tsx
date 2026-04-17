"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, X, Pencil } from "lucide-react"
import { cn } from "@/lib/utils"
import { ConfirmFlag } from "./ConfirmFlag"
import { updateDraftField } from "@/app/actions/snap-list-draft"

type Variant = "text" | "textarea" | "number" | "select"

interface Props {
  draftId: string
  field: string
  label: string
  value: string | number | null
  confidence: number
  variant?: Variant
  options?: Array<{ value: string; label: string }>
  placeholder?: string
  /** Subtle hint shown as small text next to the label (e.g. "Tap to edit title"). */
  hint?: string
  className?: string
  /** Prefix for display (e.g. "$"). Only affects read-only rendering. */
  displayPrefix?: string
}

const LOW_CONFIDENCE_THRESHOLD = 0.75

export function InlineEditField({
  draftId,
  field,
  label,
  value,
  confidence,
  variant = "text",
  options,
  placeholder,
  hint,
  displayPrefix,
  className,
}: Props) {
  const router = useRouter()
  const [localValue, setLocalValue] = useState<string | number>(value ?? "")
  // Optimistic value: after a successful commit we hold the user's choice
  // here and render it until the parent prop catches up via router.refresh().
  // This is what makes saves feel instant on mobile.
  const [optimisticValue, setOptimisticValue] = useState<string | number | null | undefined>(undefined)
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()
  const [flagCleared, setFlagCleared] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null)

  // Optimistic wins over prop until the user next enters edit mode (which
  // re-seeds from the current displayValue). Intentionally no effect to
  // "clear" optimistic when prop catches up — after router.refresh() they'll
  // be equal so the UI is stable regardless.
  const displayValue = optimisticValue !== undefined ? optimisticValue : value

  const enterEdit = () => {
    setLocalValue((displayValue ?? "") as string | number)
    setEditing(true)
  }

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus()
      if ("select" in inputRef.current) {
        try {
          (inputRef.current as HTMLInputElement).select()
        } catch {
          // ignore
        }
      }
    }
  }, [editing])

  const commit = () => {
    if (!editing) return
    const next =
      variant === "number"
        ? localValue === "" ? null : Number(localValue)
        : localValue
    setEditing(false)
    if ((next ?? "") === (displayValue ?? "")) return
    // Optimistically show the user's value immediately.
    setOptimisticValue(next ?? null)
    setFlagCleared(true)
    startTransition(async () => {
      const res = await updateDraftField(draftId, field, next)
      if ("error" in res) {
        toast.error(res.error)
        setOptimisticValue(undefined) // revert
        setFlagCleared(false)
        return
      }
      // Refresh the server component so parent prop matches our optimistic value.
      router.refresh()
    })
  }

  const cancel = () => {
    setEditing(false)
  }

  const lowConfidence = confidence < LOW_CONFIDENCE_THRESHOLD && !flagCleared
  const isEmpty =
    displayValue === null || displayValue === "" || displayValue === undefined

  if (editing) {
    return (
      <div className={cn("group relative w-full min-w-0 space-y-2", className)}>
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        {variant === "textarea" ? (
          <textarea
            ref={(el) => { inputRef.current = el }}
            value={String(localValue)}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel()
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit()
            }}
            placeholder={placeholder}
            rows={5}
            className="w-full rounded-md border bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        ) : variant === "select" ? (
          <select
            ref={(el) => { inputRef.current = el }}
            value={String(localValue)}
            onChange={(e) => setLocalValue(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          >
            <option value="">Select…</option>
            {options?.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            ref={(el) => { inputRef.current = el }}
            type={variant === "number" ? "number" : "text"}
            inputMode={variant === "number" ? "decimal" : undefined}
            value={String(localValue)}
            onChange={(e) => setLocalValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel()
              if (e.key === "Enter") commit()
            }}
            placeholder={placeholder}
            className="w-full rounded-md border bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        )}
        <div className="flex w-full min-w-0 gap-2">
          <button
            type="button"
            onClick={commit}
            disabled={pending}
            className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            <Check className="h-4 w-4 shrink-0" /> Save
          </button>
          <button
            type="button"
            onClick={cancel}
            className="inline-flex min-h-11 min-w-0 flex-1 items-center justify-center gap-1.5 rounded-md border bg-background px-2 text-sm font-medium text-muted-foreground hover:bg-muted"
          >
            <X className="h-4 w-4 shrink-0" /> Cancel
          </button>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={enterEdit}
      className={cn(
        "group relative block w-full rounded-md border border-transparent px-2 py-1.5 text-left transition-colors hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        lowConfidence && "border-amber-500/30 bg-amber-500/5",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2 text-xs font-medium text-muted-foreground">
        <span className="flex items-center gap-1.5">
          {label}
          <ConfirmFlag show={lowConfidence} />
        </span>
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground/70">
          {hint && !isEmpty ? <span className="hidden sm:inline">{hint}</span> : null}
          <Pencil className="h-3 w-3" aria-hidden />
        </span>
      </div>
      <div
        className={cn(
          "mt-1 break-words text-sm",
          isEmpty && "italic text-muted-foreground",
          variant === "textarea" && "whitespace-pre-wrap",
        )}
      >
        {isEmpty
          ? placeholder ?? hint ?? "Tap to add"
          : variant === "select"
            ? (options?.find((o) => o.value === String(displayValue))?.label ?? String(displayValue))
            : `${displayPrefix ?? ""}${String(displayValue)}`}
      </div>
    </button>
  )
}
