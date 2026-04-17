"use client"

import { useEffect, useRef, useState, useTransition } from "react"
import { toast } from "sonner"
import { Check, X } from "lucide-react"
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
  className?: string
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
  className,
}: Props) {
  // When editing, localValue is the source of truth. When not editing,
  // display the parent's `value` prop directly so external updates reflect
  // without an effect-sync (avoids react-hooks/set-state-in-effect).
  const [localValue, setLocalValue] = useState<string | number>(value ?? "")
  const [editing, setEditing] = useState(false)
  const [pending, startTransition] = useTransition()
  const [flagCleared, setFlagCleared] = useState(false)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | null>(null)

  const enterEdit = () => {
    setLocalValue(value ?? "")
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
    if ((next ?? "") === (value ?? "")) return
    startTransition(async () => {
      const res = await updateDraftField(draftId, field, next)
      if ("error" in res) {
        toast.error(res.error)
      } else {
        setFlagCleared(true)
      }
    })
  }

  const cancel = () => {
    setEditing(false)
  }

  const lowConfidence = confidence < LOW_CONFIDENCE_THRESHOLD && !flagCleared
  const isEmpty = value === null || value === "" || value === undefined

  if (editing) {
    return (
      <div className={cn("group relative space-y-1", className)}>
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
        {variant === "textarea" ? (
          <textarea
            ref={(el) => { inputRef.current = el }}
            value={String(localValue)}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel()
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) commit()
            }}
            placeholder={placeholder}
            rows={4}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        ) : variant === "select" ? (
          <select
            ref={(el) => { inputRef.current = el }}
            value={String(localValue)}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={commit}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
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
            value={String(localValue)}
            onChange={(e) => setLocalValue(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Escape") cancel()
              if (e.key === "Enter") commit()
            }}
            placeholder={placeholder}
            className="w-full rounded-md border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
        )}
        <div className="flex gap-1">
          <button
            type="button"
            onClick={commit}
            disabled={pending}
            className="inline-flex items-center gap-1 rounded bg-primary px-2 py-0.5 text-[11px] text-primary-foreground"
          >
            <Check className="h-3 w-3" /> Save
          </button>
          <button
            type="button"
            onClick={cancel}
            className="inline-flex items-center gap-1 rounded bg-muted px-2 py-0.5 text-[11px] text-muted-foreground"
          >
            <X className="h-3 w-3" /> Cancel
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
        "group relative block w-full rounded-md border border-transparent px-2 py-1 text-left transition-colors hover:border-border hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        lowConfidence && "border-amber-500/30 bg-amber-500/5",
        className,
      )}
    >
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {label}
        <ConfirmFlag show={lowConfidence} />
      </div>
      <div
        className={cn(
          "mt-0.5 text-sm",
          isEmpty && "italic text-muted-foreground",
          variant === "textarea" && "whitespace-pre-wrap",
        )}
      >
        {isEmpty
          ? placeholder ?? "Tap to add"
          : variant === "select"
            ? (options?.find((o) => o.value === String(value))?.label ?? String(value))
            : String(value)}
      </div>
    </button>
  )
}
