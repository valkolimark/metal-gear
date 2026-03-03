'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Send, AlertTriangle, Clock, MapPin, Camera } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { createSosRequest, uploadSosMedia } from '@/app/actions/sos'
import {
  EQUIPMENT_TAXONOMY,
  searchTaxonomy,
  getTier2Label,
  getSubcategoryLabel,
} from '@/lib/constants/equipment-taxonomy'
import type { Tier2Group } from '@/lib/constants/equipment-taxonomy'

const EXPIRY_OPTIONS = [
  { value: '24', label: '24 hours' },
  { value: '48', label: '48 hours' },
  { value: '72', label: '72 hours (default)' },
  { value: '168', label: '1 week' },
]

const DISTANCE_OPTIONS = [
  { value: 100, label: '100 miles' },
  { value: 250, label: '250 miles' },
  { value: 500, label: '500 miles' },
  { value: 99999, label: 'Nationwide' },
]

export default function CreateSosPage() {
  const router = useRouter()
  const [sending, setSending] = useState(false)
  const [photos, setPhotos] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)

  const [equipSearch, setEquipSearch] = useState('')
  const [form, setForm] = useState({
    equipment_category: '',
    equipment_subcategory: '',
    brand: '',
    model: '',
    title: '',
    description: '',
    urgency: 'critical' as 'critical' | 'normal',
    notes: '',
    location_city: '',
    location_state: '',
    max_distance_miles: 500,
    expiry_hours: '72',
  })

  // Find the selected tier2 group for subcategory display
  const selectedGroup: Tier2Group | undefined = (() => {
    for (const tier1 of EQUIPMENT_TAXONOMY) {
      for (const group of tier1.groups) {
        if (group.id === form.equipment_category) return group
      }
    }
    return undefined
  })()

  const updateForm = (key: string, value: string | number) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      // Auto-generate title
      if (['brand', 'model', 'equipment_subcategory', 'equipment_category'].includes(key)) {
        const catLabel = getTier2Label(key === 'equipment_category' ? (value as string) : next.equipment_category)
        const subLabel = next.equipment_subcategory ? getSubcategoryLabel(next.equipment_subcategory) : ''
        const parts = [next.brand, subLabel || catLabel, next.model].filter(Boolean)
        next.title = parts.join(' ') || catLabel || ''
      }
      // Reset subcategory when category changes
      if (key === 'equipment_category') {
        next.equipment_subcategory = ''
      }
      return next
    })
  }

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (!files) return
    if (photos.length + files.length > 5) {
      toast.error('Maximum 5 photos allowed')
      return
    }

    setUploading(true)
    for (const file of Array.from(files)) {
      const fd = new FormData()
      fd.append('file', file)
      const result = await uploadSosMedia(fd)
      if (result.error) {
        toast.error(result.error)
      } else if (result.path) {
        setPhotos((prev) => [...prev, result.path!])
      }
    }
    setUploading(false)
  }

  const handleSubmit = async () => {
    if (!form.equipment_category) {
      toast.error('Select an equipment category')
      return
    }
    if (!form.title.trim()) {
      toast.error('Title is required')
      return
    }

    setSending(true)
    try {
      const expiresAt = new Date(
        Date.now() + parseInt(form.expiry_hours) * 60 * 60 * 1000
      ).toISOString()

      const result = await createSosRequest({
        title: form.title,
        description: form.description || undefined,
        equipment_category: form.equipment_category,
        equipment_subcategory: form.equipment_subcategory || undefined,
        brand: form.brand || undefined,
        model: form.model || undefined,
        urgency: form.urgency,
        photos,
        notes: form.notes || undefined,
        location_city: form.location_city || undefined,
        location_state: form.location_state || undefined,
        max_distance_miles: form.max_distance_miles,
        expires_at: expiresAt,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('SOS sent! Responders are being notified.')
      router.push(`/sos/${result.data?.id}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/sos" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Send SOS</h1>
          <p className="font-body text-sm text-muted-foreground">
            Broadcast your urgent need to qualified suppliers
          </p>
        </div>
      </div>

      <div className="space-y-8">
        {/* Section 1: What do you need? */}
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              1
            </span>
            What do you need?
          </h2>

          <div className="space-y-2">
            <Label>Equipment Category <span className="text-primary">*</span></Label>
            <Input
              placeholder="Search equipment (e.g., centrifuge, valve, pump)..."
              value={equipSearch}
              onChange={(e) => setEquipSearch(e.target.value)}
            />
            {/* Search results */}
            {equipSearch && (() => {
              const results = searchTaxonomy(equipSearch)
              if (results.length === 0) return <p className="text-xs text-muted-foreground">No results</p>
              return (
                <div className="max-h-48 space-y-1 overflow-y-auto rounded-lg border border-border bg-surface p-2">
                  {results.slice(0, 15).map((r) => (
                    <button
                      key={`${r.tier2}-${r.subcategory.id}`}
                      type="button"
                      onClick={() => {
                        updateForm('equipment_category', r.tier2)
                        updateForm('equipment_subcategory', r.subcategory.id)
                        setEquipSearch('')
                      }}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 text-left text-sm hover:bg-primary/10"
                    >
                      <span className="font-medium text-foreground">{r.subcategory.label}</span>
                      <span className="text-xs text-muted-foreground">{getTier2Label(r.tier2)}</span>
                    </button>
                  ))}
                </div>
              )
            })()}
            {/* Selected category display or dropdown fallback */}
            {!equipSearch && (
              <select
                value={form.equipment_category}
                onChange={(e) => updateForm('equipment_category', e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
              >
                <option value="">Select category...</option>
                {EQUIPMENT_TAXONOMY.map((tier1) => (
                  <optgroup key={tier1.id} label={tier1.label}>
                    {tier1.groups.map((group) => (
                      <option key={group.id} value={group.id}>{group.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            )}
          </div>

          {selectedGroup && selectedGroup.subcategories.length > 0 && (
            <div className="space-y-2">
              <Label>Subcategory</Label>
              <div className="flex flex-wrap gap-1.5">
                {selectedGroup.subcategories.map((sub) => (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => updateForm('equipment_subcategory', form.equipment_subcategory === sub.id ? '' : sub.id)}
                    className={`rounded-full border px-3 py-1 text-xs transition-all ${
                      form.equipment_subcategory === sub.id
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {sub.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input
                value={form.brand}
                onChange={(e) => updateForm('brand', e.target.value)}
                placeholder="e.g., Fisher"
              />
            </div>
            <div className="space-y-2">
              <Label>Model</Label>
              <Input
                value={form.model}
                onChange={(e) => updateForm('model', e.target.value)}
                placeholder="e.g., DVC6200"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Title <span className="text-primary">*</span></Label>
            <Input
              value={form.title}
              onChange={(e) => updateForm('title', e.target.value)}
              placeholder="Short description of what you need"
            />
            <p className="text-xs text-muted-foreground">Auto-generated from your selections, edit if needed</p>
          </div>

          <div className="space-y-2">
            <Label>Description</Label>
            <textarea
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="Detailed description of your need — specs, quantity, condition requirements..."
              rows={3}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </section>

        {/* Section 2: How urgent? */}
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              2
            </span>
            How urgent?
          </h2>

          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => updateForm('urgency', 'critical')}
              className={`rounded-lg border p-4 text-left transition-all ${
                form.urgency === 'critical'
                  ? 'border-red-500 bg-red-500/10 ring-1 ring-red-500'
                  : 'border-border bg-surface hover:border-red-500/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="size-5 text-red-500" />
                <span className="font-display text-sm font-semibold text-foreground">Critical / Emergency</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Plant is down, I need this NOW</p>
            </button>

            <button
              type="button"
              onClick={() => updateForm('urgency', 'normal')}
              className={`rounded-lg border p-4 text-left transition-all ${
                form.urgency === 'normal'
                  ? 'border-steel bg-steel/10 ring-1 ring-steel'
                  : 'border-border bg-surface hover:border-steel/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-steel" />
                <span className="font-display text-sm font-semibold text-foreground">Normal</span>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Urgent but not a shutdown</p>
            </button>
          </div>
        </section>

        {/* Section 3: Attachments */}
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              3
            </span>
            Attachments
            <span className="text-xs font-normal text-muted-foreground">(optional)</span>
          </h2>

          <div className="flex items-center gap-3">
            <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-border bg-surface px-4 py-3 text-sm text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground">
              <Camera className="size-4" />
              {uploading ? 'Uploading...' : `Add Photos (${photos.length}/5)`}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                onChange={handlePhotoUpload}
                className="hidden"
                disabled={uploading || photos.length >= 5}
              />
            </label>
          </div>

          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {photos.map((p, i) => (
                <Badge key={i} variant="secondary" className="gap-1">
                  Photo {i + 1}
                  <button type="button" onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}>
                    &times;
                  </button>
                </Badge>
              ))}
            </div>
          )}

          <div className="space-y-2">
            <Label>Notes</Label>
            <Input
              value={form.notes}
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="Any additional context..."
            />
          </div>
        </section>

        {/* Section 4: Location & Reach */}
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              4
            </span>
            Location & Reach
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>City</Label>
              <Input
                value={form.location_city}
                onChange={(e) => setForm((p) => ({ ...p, location_city: e.target.value }))}
                placeholder="Houston"
              />
            </div>
            <div className="space-y-2">
              <Label>State</Label>
              <Input
                value={form.location_state}
                onChange={(e) => setForm((p) => ({ ...p, location_state: e.target.value }))}
                placeholder="TX"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Maximum distance</Label>
            <div className="flex flex-wrap gap-2">
              {DISTANCE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => updateForm('max_distance_miles', opt.value)}
                  className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                    form.max_distance_miles === opt.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  <MapPin className="mr-1 inline size-3" />
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Section 5: Expiration & Submit */}
        <section className="space-y-4">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              5
            </span>
            Expiration
          </h2>

          <div className="flex flex-wrap gap-2">
            {EXPIRY_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setForm((p) => ({ ...p, expiry_hours: opt.value }))}
                className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                  form.expiry_hours === opt.value
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-muted-foreground hover:border-primary/50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Preview */}
          <div className="rounded-lg border border-border bg-surface p-4">
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Preview
            </h3>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Badge variant={form.urgency === 'critical' ? 'destructive' : 'secondary'}>
                  {form.urgency === 'critical' ? 'CRITICAL' : 'Normal'}
                </Badge>
                <span className="font-display text-sm font-semibold text-foreground">
                  {form.title || 'Your SOS title'}
                </span>
              </div>
              {form.description && (
                <p className="text-xs text-muted-foreground">{form.description}</p>
              )}
              <div className="flex gap-3 text-xs text-muted-foreground">
                {form.equipment_category && <span>{getTier2Label(form.equipment_category)}</span>}
                <span>{form.location_city || 'Houston'}, {form.location_state || 'TX'}</span>
                <span>{DISTANCE_OPTIONS.find((d) => d.value === form.max_distance_miles)?.label}</span>
              </div>
            </div>
          </div>
        </section>

        {/* Submit */}
        <Button
          onClick={handleSubmit}
          disabled={sending || !form.equipment_category || !form.title.trim()}
          className="w-full gap-2 bg-red-600 text-white hover:bg-red-700"
          size="lg"
        >
          {sending ? (
            <>Sending SOS...</>
          ) : (
            <>
              <Send className="size-4" />
              Send SOS
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
