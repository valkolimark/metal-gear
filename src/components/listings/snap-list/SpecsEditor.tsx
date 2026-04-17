"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Check, X, Plus, Trash2, Pencil } from "lucide-react"
import { updateDraftField } from "@/app/actions/snap-list-draft"

interface Props {
  draftId: string
  specs: Record<string, string | number>
}

export function SpecsEditor({ draftId, specs }: Props) {
  const router = useRouter()
  const [local, setLocal] = useState<Record<string, string | number>>(specs)
  const [editingKey, setEditingKey] = useState<string | null>(null)
  const [draftValue, setDraftValue] = useState("")
  const [addingNew, setAddingNew] = useState(false)
  const [newKey, setNewKey] = useState("")
  const [newVal, setNewVal] = useState("")
  const [pending, startTransition] = useTransition()

  const save = (newSpecs: Record<string, string | number>) => {
    const prev = local
    setLocal(newSpecs)
    startTransition(async () => {
      const res = await updateDraftField(draftId, "specs", newSpecs)
      if ("error" in res) {
        toast.error(res.error)
        setLocal(prev)
        return
      }
      router.refresh()
    })
  }

  const startEdit = (key: string) => {
    setEditingKey(key)
    setDraftValue(String(local[key] ?? ""))
  }

  const commitEdit = () => {
    if (!editingKey) return
    const newSpecs = { ...local, [editingKey]: draftValue }
    setEditingKey(null)
    save(newSpecs)
  }

  const removeSpec = (key: string) => {
    const next = { ...local }
    delete next[key]
    save(next)
  }

  const addSpec = () => {
    const cleanKey = newKey.trim().replace(/\s+/g, "_").toLowerCase()
    if (!/^[a-z][a-z0-9_]{0,50}$/.test(cleanKey)) {
      toast.error("Use lowercase letters, numbers, and underscores")
      return
    }
    if (cleanKey in local) {
      toast.error("That spec already exists")
      return
    }
    const newSpecs = { ...local, [cleanKey]: newVal }
    setAddingNew(false)
    setNewKey("")
    setNewVal("")
    save(newSpecs)
  }

  const entries = Object.entries(local)

  return (
    <div className="overflow-hidden rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Specs
        </div>
        {!addingNew && (
          <button
            type="button"
            onClick={() => setAddingNew(true)}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-primary hover:bg-primary/10"
          >
            <Plus className="h-3.5 w-3.5" /> Add spec
          </button>
        )}
      </div>

      <ul className="mt-2 space-y-1 text-sm">
        {entries.map(([k, v]) => (
          <li key={k} className="border-b py-1.5 last:border-b-0">
            {editingKey === k ? (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground">{k}</div>
                <input
                  autoFocus
                  value={draftValue}
                  onChange={(e) => setDraftValue(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Escape") setEditingKey(null)
                    if (e.key === "Enter") commitEdit()
                  }}
                  className="w-full rounded-md border bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={commitEdit}
                    disabled={pending}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
                  >
                    <Check className="h-4 w-4" /> Save
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditingKey(null)}
                    className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md border bg-background px-4 text-sm font-medium text-muted-foreground hover:bg-muted"
                  >
                    <X className="h-4 w-4" /> Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-0.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                <span className="min-w-0 break-words text-muted-foreground">{k}</span>
                <div className="flex min-w-0 items-start gap-2 sm:justify-end">
                  <button
                    type="button"
                    onClick={() => startEdit(k)}
                    className="inline-flex min-w-0 items-center gap-1.5 break-words text-left font-medium hover:text-primary sm:text-right"
                  >
                    <span className="min-w-0 break-words">
                      {String(v) || (
                        <em className="italic text-muted-foreground">Tap to add</em>
                      )}
                    </span>
                    <Pencil className="h-3 w-3 shrink-0 text-muted-foreground/60" aria-hidden />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeSpec(k)}
                    className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted"
                    aria-label={`Remove ${k}`}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {addingNew && (
        <div className="mt-3 space-y-2 rounded-md border bg-muted/30 p-3">
          <input
            autoFocus
            placeholder="Spec name (e.g. bowl_rpm)"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <input
            placeholder="Value"
            value={newVal}
            onChange={(e) => setNewVal(e.target.value)}
            className="w-full rounded-md border bg-background px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={addSpec}
              disabled={pending}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground disabled:opacity-60"
            >
              <Check className="h-4 w-4" /> Add
            </button>
            <button
              type="button"
              onClick={() => {
                setAddingNew(false)
                setNewKey("")
                setNewVal("")
              }}
              className="inline-flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md border bg-background px-4 text-sm font-medium text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" /> Cancel
            </button>
          </div>
        </div>
      )}

      {entries.length === 0 && !addingNew && (
        <div className="mt-2 text-sm italic text-muted-foreground">
          No specs yet. Tap &quot;Add spec&quot; to include model-specific details.
        </div>
      )}
    </div>
  )
}
