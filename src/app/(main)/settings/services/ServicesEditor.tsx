'use client'

import { useEffect, useState, useTransition } from 'react'
import { toast } from 'sonner'
import { Plus, Lock, Trash2, ArrowUp, ArrowDown, Pencil } from 'lucide-react'
import {
  createService,
  deleteService,
  reorderServices,
  updateService,
} from '@/app/actions/services'
import { searchTaxonomyAction } from './typeahead-action'
import type { SubscriptionTier } from '@/lib/constants'

const CARD_SHADOW = '0 1px 2px rgba(11,37,69,0.04), 0 4px 12px rgba(11,37,69,0.05)'

export type EditorTarget =
  | { kind: 'profile'; profileId: string }
  | { kind: 'company'; companyId: string }

export interface EditableService {
  id: string
  label: string
  category: string | null
  description: string | null
  slaMinDays: number | null
  slaMaxDays: number | null
  priceFromUsd: number | null
  sortOrder: number
  isActive: boolean
  taxonomyId: string | null
  customLabel: string | null
  customCategory: string | null
}

interface TaxonomyOption {
  id: string
  label: string
  category: string
  typicalSlaMinDays: number | null
  typicalSlaMaxDays: number | null
  typicalPriceFromUsd: number | null
}

interface ServicesEditorProps {
  target: EditorTarget
  initialServices: EditableService[]
  isPricingGated: boolean
  tier: SubscriptionTier
}

interface DraftService {
  taxonomyId: string | null
  customLabel: string
  customCategory: string
  description: string
  slaMinDays: number | null
  slaMaxDays: number | null
  priceFromUsd: number | null
}

const EMPTY_DRAFT: DraftService = {
  taxonomyId: null,
  customLabel: '',
  customCategory: '',
  description: '',
  slaMinDays: null,
  slaMaxDays: null,
  priceFromUsd: null,
}

export function ServicesEditor({
  target,
  initialServices,
  isPricingGated,
}: ServicesEditorProps) {
  const [services, setServices] = useState(initialServices)
  const [isPending, startTransition] = useTransition()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<EditableService | null>(null)

  return (
    <div className="space-y-6">
      {isPricingGated && <FreeBanner />}

      <section className="rounded-2xl bg-card" style={{ boxShadow: CARD_SHADOW }}>
        <header className="flex items-center justify-between border-b border-border px-5 py-4">
          <div className="min-w-0">
            <div className="font-display text-[14.5px] font-bold tracking-tight text-foreground">
              Configured services
            </div>
            <div className="mt-0.5 text-[11.5px] text-muted-foreground">
              {services.length === 0
                ? 'No services yet — add one below.'
                : `${services.length} configured`}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-[#FF6B2B] px-4 text-[12.5px] font-bold text-white hover:bg-[#E6541F]"
            disabled={isPending}
          >
            <Plus className="size-4" />
            Add service
          </button>
        </header>

        <div className="divide-y divide-border">
          {services.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-muted-foreground">
              Click <span className="font-bold">Add service</span> to get started.
            </div>
          ) : (
            services.map((service, idx) => (
              <ServiceRow
                key={service.id}
                service={service}
                isPricingGated={isPricingGated}
                onMoveUp={idx === 0 ? undefined : () => moveService(idx, idx - 1)}
                onMoveDown={
                  idx === services.length - 1
                    ? undefined
                    : () => moveService(idx, idx + 1)
                }
                onEdit={() => setEditing(service)}
                onDelete={() => handleDelete(service.id)}
                disabled={isPending}
              />
            ))
          )}
        </div>
      </section>

      {(adding || editing) && (
        <ServiceDialog
          mode={adding ? 'add' : 'edit'}
          target={target}
          existing={editing}
          onClose={() => {
            setAdding(false)
            setEditing(null)
          }}
          onSaved={(updated, isNew) => {
            setAdding(false)
            setEditing(null)
            if (isNew) {
              setServices([...services, updated])
            } else {
              setServices(services.map((s) => (s.id === updated.id ? updated : s)))
            }
          }}
        />
      )}
    </div>
  )

  function moveService(from: number, to: number) {
    const next = [...services]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    setServices(next)
    const orderedIds = next.map((s) => s.id)
    startTransition(async () => {
      try {
        await reorderServices({ target, orderedIds })
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to reorder')
        setServices(services) // rollback
      }
    })
  }

  function handleDelete(id: string) {
    if (!window.confirm('Remove this service from your storefront?')) return
    const prev = services
    setServices(services.filter((s) => s.id !== id))
    startTransition(async () => {
      try {
        await deleteService(id)
        toast.success('Service removed')
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to remove')
        setServices(prev)
      }
    })
  }
}

function FreeBanner() {
  return (
    <div
      className="flex items-start gap-3 rounded-2xl border border-amber-200/60 bg-amber-50/80 px-4 py-3 dark:border-amber-500/30 dark:bg-amber-500/10"
      role="note"
    >
      <Lock className="mt-0.5 size-4 shrink-0 text-amber-700 dark:text-amber-300" />
      <div className="text-[12.5px] leading-relaxed text-amber-900 dark:text-amber-100">
        <span className="font-bold">Upgrade to Pro to show pricing on your storefront.</span>{' '}
        You can configure services and SLA right now — buyers will see them. The{' '}
        <span className="font-bold">From $</span> you set is hidden from the public until you upgrade.
      </div>
    </div>
  )
}

function ServiceRow({
  service,
  isPricingGated,
  onMoveUp,
  onMoveDown,
  onEdit,
  onDelete,
  disabled,
}: {
  service: EditableService
  isPricingGated: boolean
  onMoveUp?: () => void
  onMoveDown?: () => void
  onEdit: () => void
  onDelete: () => void
  disabled?: boolean
}) {
  return (
    <div className="flex items-start gap-3 px-5 py-4">
      <div className="flex shrink-0 flex-col gap-0.5">
        <button
          type="button"
          onClick={onMoveUp}
          disabled={!onMoveUp || disabled}
          className="inline-flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
          aria-label="Move up"
        >
          <ArrowUp className="size-3" />
        </button>
        <button
          type="button"
          onClick={onMoveDown}
          disabled={!onMoveDown || disabled}
          className="inline-flex size-6 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
          aria-label="Move down"
        >
          <ArrowDown className="size-3" />
        </button>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-display text-[14px] font-bold text-foreground line-clamp-1">
            {service.label}
          </span>
          {!service.isActive && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-[10.5px] font-bold uppercase text-muted-foreground">
              Inactive
            </span>
          )}
        </div>
        {service.category && (
          <div className="mt-0.5 text-[11px] text-muted-foreground">
            {humanizeCategory(service.category)}
          </div>
        )}
        {service.description && (
          <p className="mt-1 text-[12.5px] text-muted-foreground line-clamp-2">
            {service.description}
          </p>
        )}
        <div className="mt-1.5 flex flex-wrap items-center gap-3 text-[12px] text-muted-foreground">
          {(service.slaMinDays != null || service.slaMaxDays != null) && (
            <span>
              SLA:{' '}
              {service.slaMinDays != null && service.slaMaxDays != null
                ? service.slaMinDays === service.slaMaxDays
                  ? `${service.slaMinDays}d`
                  : `${service.slaMinDays}–${service.slaMaxDays}d`
                : `~${service.slaMinDays ?? service.slaMaxDays}d`}
            </span>
          )}
          {service.priceFromUsd != null && (
            <span className="flex items-center gap-1">
              From ${service.priceFromUsd.toLocaleString('en-US')}
              {isPricingGated && (
                <span title="Hidden publicly until you upgrade to Pro">
                  <Lock className="size-3 text-amber-500" />
                </span>
              )}
            </span>
          )}
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onEdit}
          disabled={disabled}
          className="inline-flex size-8 items-center justify-center rounded text-muted-foreground hover:bg-muted disabled:opacity-30"
          aria-label="Edit"
        >
          <Pencil className="size-4" />
        </button>
        <button
          type="button"
          onClick={onDelete}
          disabled={disabled}
          className="inline-flex size-8 items-center justify-center rounded text-destructive hover:bg-destructive/10 disabled:opacity-30"
          aria-label="Delete"
        >
          <Trash2 className="size-4" />
        </button>
      </div>
    </div>
  )
}

function ServiceDialog({
  mode,
  target,
  existing,
  onClose,
  onSaved,
}: {
  mode: 'add' | 'edit'
  target: EditorTarget
  existing: EditableService | null
  onClose: () => void
  onSaved: (s: EditableService, isNew: boolean) => void
}) {
  const [draft, setDraft] = useState<DraftService>(() => {
    if (existing) {
      return {
        taxonomyId: existing.taxonomyId,
        customLabel: existing.customLabel ?? '',
        customCategory: existing.customCategory ?? '',
        description: existing.description ?? '',
        slaMinDays: existing.slaMinDays,
        slaMaxDays: existing.slaMaxDays,
        priceFromUsd: existing.priceFromUsd,
      }
    }
    return EMPTY_DRAFT
  })
  const [query, setQuery] = useState(existing?.label ?? '')
  const [taxonomyOpts, setTaxonomyOpts] = useState<TaxonomyOption[]>([])
  const [showOpts, setShowOpts] = useState(false)
  const [isPending, startTransition] = useTransition()

  // Debounced taxonomy search. `query` is the deps key so each keystroke
  // resets the 200ms timer; the closure captures the current value, so the
  // late-arriving response is dropped by the cleanup if a fresh search has
  // already started.
  useEffect(() => {
    let cancelled = false
    const timer = setTimeout(() => {
      searchTaxonomyAction(query).then((opts) => {
        if (!cancelled) setTaxonomyOpts(opts)
      })
    }, 200)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [query])

  function pickTaxonomy(opt: TaxonomyOption) {
    setDraft({
      taxonomyId: opt.id,
      customLabel: '',
      customCategory: '',
      description: draft.description,
      slaMinDays: draft.slaMinDays ?? opt.typicalSlaMinDays,
      slaMaxDays: draft.slaMaxDays ?? opt.typicalSlaMaxDays,
      priceFromUsd: draft.priceFromUsd ?? opt.typicalPriceFromUsd,
    })
    setQuery(opt.label)
    setShowOpts(false)
  }

  function pickCustom() {
    setDraft({
      ...draft,
      taxonomyId: null,
      customLabel: query.trim(),
    })
    setShowOpts(false)
  }

  function handleSave() {
    const useCustom = !draft.taxonomyId
    if (useCustom && draft.customLabel.trim().length < 2) {
      toast.error('Service name must be at least 2 characters.')
      return
    }
    if (
      draft.slaMinDays != null &&
      draft.slaMaxDays != null &&
      draft.slaMinDays > draft.slaMaxDays
    ) {
      toast.error('SLA min must be less than or equal to SLA max.')
      return
    }
    startTransition(async () => {
      try {
        if (mode === 'add') {
          const result = await createService(
            target,
            useCustom
              ? {
                  source: 'custom',
                  customLabel: draft.customLabel,
                  customCategory: draft.customCategory || null,
                  description: draft.description || null,
                  slaMinDays: draft.slaMinDays,
                  slaMaxDays: draft.slaMaxDays,
                  priceFromUsd: draft.priceFromUsd,
                  sortOrder: 9999,
                }
              : {
                  source: 'taxonomy',
                  taxonomyId: draft.taxonomyId!,
                  description: draft.description || null,
                  slaMinDays: draft.slaMinDays,
                  slaMaxDays: draft.slaMaxDays,
                  priceFromUsd: draft.priceFromUsd,
                  sortOrder: 9999,
                }
          )
          toast.success('Service added')
          const picked = taxonomyOpts.find((o) => o.id === draft.taxonomyId)
          onSaved(
            {
              id: result.id,
              label: useCustom ? draft.customLabel : picked?.label ?? query,
              category: useCustom
                ? draft.customCategory || null
                : picked?.category ?? null,
              description: draft.description || null,
              slaMinDays: draft.slaMinDays,
              slaMaxDays: draft.slaMaxDays,
              priceFromUsd: draft.priceFromUsd,
              sortOrder: 9999,
              isActive: true,
              taxonomyId: draft.taxonomyId,
              customLabel: useCustom ? draft.customLabel : null,
              customCategory: useCustom ? draft.customCategory || null : null,
            },
            true
          )
        } else if (existing) {
          await updateService(existing.id, {
            taxonomyId: useCustom ? null : draft.taxonomyId,
            customLabel: useCustom ? draft.customLabel : null,
            customCategory: useCustom ? draft.customCategory || null : null,
            description: draft.description || null,
            slaMinDays: draft.slaMinDays,
            slaMaxDays: draft.slaMaxDays,
            priceFromUsd: draft.priceFromUsd,
          })
          toast.success('Service updated')
          onSaved(
            {
              ...existing,
              label: useCustom
                ? draft.customLabel
                : taxonomyOpts.find((o) => o.id === draft.taxonomyId)?.label ??
                  existing.label,
              category: useCustom
                ? draft.customCategory || null
                : taxonomyOpts.find((o) => o.id === draft.taxonomyId)?.category ??
                  existing.category,
              description: draft.description || null,
              slaMinDays: draft.slaMinDays,
              slaMaxDays: draft.slaMaxDays,
              priceFromUsd: draft.priceFromUsd,
              taxonomyId: useCustom ? null : draft.taxonomyId,
              customLabel: useCustom ? draft.customLabel : null,
              customCategory: useCustom ? draft.customCategory || null : null,
            },
            false
          )
        }
      } catch (err) {
        toast.error(err instanceof Error ? err.message : 'Failed to save')
      }
    })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-2 sm:items-center sm:p-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-card shadow-2xl">
        <header className="border-b border-border px-5 py-4">
          <h2 className="font-display text-[15px] font-bold text-foreground">
            {mode === 'add' ? 'Add service' : 'Edit service'}
          </h2>
        </header>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto px-5 py-4">
          {/* Service-name typeahead */}
          <div>
            <Label>Service</Label>
            <div className="relative">
              <input
                type="text"
                className={inputClass}
                placeholder="Start typing — e.g. Decanter rebuild"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setShowOpts(true)
                  // any keystroke after picking taxonomy clears the pin
                  if (draft.taxonomyId) setDraft({ ...draft, taxonomyId: null })
                }}
                onFocus={() => setShowOpts(true)}
              />
              {showOpts && (taxonomyOpts.length > 0 || query.trim().length >= 2) && (
                <div className="absolute z-10 mt-1 max-h-60 w-full overflow-y-auto rounded-lg border border-border bg-popover shadow-lg">
                  {taxonomyOpts.map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => pickTaxonomy(opt)}
                      className="block w-full px-3 py-2 text-left text-[13px] hover:bg-muted"
                    >
                      <div className="font-bold text-foreground">{opt.label}</div>
                      <div className="text-[11.5px] text-muted-foreground">
                        {humanizeCategory(opt.category)}
                      </div>
                    </button>
                  ))}
                  {query.trim().length >= 2 && (
                    <button
                      type="button"
                      onClick={pickCustom}
                      className="block w-full border-t border-border px-3 py-2 text-left text-[13px] hover:bg-muted"
                    >
                      Use &ldquo;
                      <span className="font-bold">{query.trim()}</span>&rdquo; as-is
                    </button>
                  )}
                </div>
              )}
            </div>
            {draft.taxonomyId == null && draft.customLabel && (
              <div className="mt-1 text-[11px] text-muted-foreground">
                Custom service · stored as free-text
              </div>
            )}
          </div>

          {/* Optional category for free-text */}
          {draft.taxonomyId == null && draft.customLabel && (
            <div>
              <Label>Category (optional)</Label>
              <input
                type="text"
                className={inputClass}
                placeholder="e.g. centrifuge-services"
                value={draft.customCategory}
                onChange={(e) =>
                  setDraft({ ...draft, customCategory: e.target.value })
                }
              />
            </div>
          )}

          {/* SLA */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>SLA min (days)</Label>
              <input
                type="number"
                min={0}
                max={365}
                className={inputClass}
                value={draft.slaMinDays ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    slaMinDays: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
            </div>
            <div>
              <Label>SLA max (days)</Label>
              <input
                type="number"
                min={0}
                max={365}
                className={inputClass}
                value={draft.slaMaxDays ?? ''}
                onChange={(e) =>
                  setDraft({
                    ...draft,
                    slaMaxDays: e.target.value === '' ? null : Number(e.target.value),
                  })
                }
              />
            </div>
          </div>

          {/* Price */}
          <div>
            <Label>From $ (USD)</Label>
            <input
              type="number"
              min={0}
              className={inputClass}
              placeholder="Leave blank for &quot;Quote on request&quot;"
              value={draft.priceFromUsd ?? ''}
              onChange={(e) =>
                setDraft({
                  ...draft,
                  priceFromUsd: e.target.value === '' ? null : Number(e.target.value),
                })
              }
            />
          </div>

          {/* Description */}
          <div>
            <Label>Description (optional)</Label>
            <textarea
              className={`${inputClass} h-24 resize-none py-2`}
              placeholder="What's included, turnaround notes, certifications…"
              maxLength={500}
              value={draft.description}
              onChange={(e) => setDraft({ ...draft, description: e.target.value })}
            />
            <div className="mt-1 text-right text-[10.5px] text-muted-foreground">
              {draft.description.length}/500
            </div>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-border bg-[#0A1628] px-5 py-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isPending}
            className="inline-flex h-9 items-center rounded-full bg-transparent px-4 text-[12.5px] font-bold text-white/80 hover:text-white disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isPending}
            className="inline-flex h-9 items-center rounded-full bg-[#FF6B2B] px-5 text-[12.5px] font-bold text-white hover:bg-[#E6541F] disabled:opacity-50"
          >
            {isPending ? 'Saving…' : mode === 'add' ? 'Add service' : 'Save changes'}
          </button>
        </footer>
      </div>
    </div>
  )
}

const inputClass =
  'w-full h-10 px-3 rounded-lg border border-input bg-background text-foreground text-[13.5px] focus:outline-none focus:ring-2 focus:ring-ring'

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="mb-1 block text-[11.5px] font-bold text-foreground">
      {children}
    </label>
  )
}

const _categoryCache = new Map<string, string>()
function humanizeCategory(slug: string): string {
  if (!slug) return ''
  const cached = _categoryCache.get(slug)
  if (cached) return cached
  const out = slug
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ')
  _categoryCache.set(slug, out)
  return out
}
