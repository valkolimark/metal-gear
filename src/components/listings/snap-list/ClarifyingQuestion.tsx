"use client"

import { useState, useTransition } from "react"
import { HelpCircle } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { updateDraftField } from "@/app/actions/snap-list-draft"
import { logSnapListEvent } from "@/lib/snap-list/events"

interface Props {
  draftId: string
  ownerId: string
  field: string
  question: string
  options: Array<{ value: string; label: string }>
}

export function ClarifyingQuestion({
  draftId,
  ownerId,
  field,
  question,
  options,
}: Props) {
  const [selected, setSelected] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [done, setDone] = useState(false)

  const choose = (value: string) => {
    setSelected(value)
    startTransition(async () => {
      const res = await updateDraftField(draftId, field, value)
      if ("error" in res) {
        toast.error(res.error)
        setSelected(null)
        return
      }
      setDone(true)
      void logSnapListEvent({
        type: "clarifying_question_answered",
        draftId,
        ownerId,
        payload: { field_name: field, answer: value },
      })
    })
  }

  if (done) return null

  return (
    <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-3">
      <div className="flex items-start gap-2">
        <HelpCircle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
        <div className="flex-1">
          <div className="text-sm font-medium">{question}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            {options.map((o) => (
              <button
                type="button"
                key={o.value}
                disabled={pending}
                onClick={() => choose(o.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition",
                  selected === o.value
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border hover:bg-muted",
                )}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
