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
import { EQUIPMENT_CATEGORIES } from '@/lib/constants/equipment-categories'

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

  const [form, setForm] = useState({
    equipment_category: '',
    equipment_sub_type: '',
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

  const selectedCategory = EQUIPMENT_CATEGORIES.find((c) => c.id === form.equipment_category)

  const updateForm = (key: string, value: string | number) => {
    setForm((prev) => {
      const next = { ...prev, [key]: value }
      // Auto-generate title
      if (['brand', 'model', 'equipment_sub_type', 'equipment_category'].includes(key)) {
        const cat = EQUIPMENT_CATEGORIES.find((c) => c.id === (key === 'equipment_category' ? value : next.equipment_category))
        const parts = [next.brand, next.equipment_sub_type || cat?.label, next.model].filter(Boolean)
        next.title = parts.join(' ') || cat?.label || ''
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
        equipment_sub_type: form.equipment_sub_type || undefined,
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
            <select
              value={form.equipment_category}
              onChange={(e) => updateForm('equipment_category', e.target.value)}
              className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
            >
              <option value="">Select category...</option>
              {EQUIPMENT_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>{cat.label}</option>
              ))}
            </select>
          </div>

          {selectedCategory && selectedCategory.subTypes.length > 0 && (
            <div className="space-y-2">
              <Label>Sub-type</Label>
              <div className="flex flex-wrap gap-1.5">
                {selectedCategory.subTypes.map((sub) => (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => updateForm('equipment_sub_type', form.equipment_sub_type === sub ? '' : sub)}
                    className={`rounded-full border px-3 py-1 text-xs transition-all ${
                      form.equipment_sub_type === sub
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-primary/50'
                    }`}
                  >
                    {sub}
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
                placeholder={selectedCategory?.commonBrands[0] || 'e.g., Fisher'}
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
                {selectedCategory && <span>{selectedCategory.label}</span>}
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
