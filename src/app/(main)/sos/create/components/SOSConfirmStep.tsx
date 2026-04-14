'use client'

import { useState, useRef } from 'react'
import { ArrowLeft, Camera, ChevronDown, ChevronUp, X, AlertTriangle, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import Image from 'next/image'
import { createSosRequest } from '@/app/actions/sos'
import { uploadSosPhotoWithRetry } from '../upload-helper'
import {
  EQUIPMENT_TAXONOMY,
  getTier2Label,
  getSubcategoryLabel,
} from '@/lib/constants/equipment-taxonomy'
import type { Tier2Group } from '@/lib/constants/equipment-taxonomy'

const MAX_PHOTOS = 10
const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_DESCRIPTION = 500

interface SOSConfirmStepProps {
  uploadedMediaUrls: string[]
  description: string
  urgency: 'normal' | 'critical'
  brandPreference: string
  quantity: number | null
  budget: string
  transportNeeded: boolean
  aiTaxonomyTier1: string
  aiTaxonomyTier2: string
  aiSubcategory: string
  aiManufacturer: string
  aiModel: string
  aiEquipmentType: string
  aiConfidence: number
  onChange: (partial: Record<string, unknown>) => void
  onBack: () => void
  onSubmit: (sosId: string, vendorCount: number) => void
}

export function SOSConfirmStep({
  uploadedMediaUrls,
  description,
  urgency,
  brandPreference,
  quantity,
  budget,
  transportNeeded,
  aiTaxonomyTier1,
  aiTaxonomyTier2,
  aiSubcategory,
  aiManufacturer,
  aiModel,
  aiEquipmentType,
  aiConfidence,
  onChange,
  onBack,
  onSubmit,
}: SOSConfirmStepProps) {
  const [sending, setSending] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadRetrying, setUploadRetrying] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [descriptionTouched, setDescriptionTouched] = useState(false)
  const [localPreviews, setLocalPreviews] = useState<string[]>([])
  const [editCategory, setEditCategory] = useState(aiTaxonomyTier2)
  const [editSubcategory, setEditSubcategory] = useState(aiSubcategory)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const descriptionRef = useRef<HTMLTextAreaElement>(null)

  const trimmedDescription = description.trim()
  const descriptionError =
    trimmedDescription.length === 0
      ? 'Describe what you need so vendors can respond.'
      : trimmedDescription.length < 20
        ? 'Please describe what you need in at least a few sentences so vendors can respond accurately.'
        : null

  const totalPhotos = uploadedMediaUrls.length + localPreviews.length

  // Get tier2 group for subcategory display
  const selectedGroup: Tier2Group | undefined = (() => {
    for (const tier1 of EQUIPMENT_TAXONOMY) {
      for (const group of tier1.groups) {
        if (group.id === editCategory) return group
      }
    }
    return undefined
  })()

  const handleAddPhotos = async (fileList: FileList | null) => {
    if (!fileList) return
    const remaining = MAX_PHOTOS - totalPhotos
    if (remaining <= 0) {
      setUploadError("You've reached the maximum number of photos for this SOS.")
      return
    }

    setUploading(true)
    setUploadError(null)
    const newUrls: string[] = []
    const newPreviews: string[] = []

    try {
      for (let i = 0; i < Math.min(fileList.length, remaining); i++) {
        const file = fileList[i]
        if (file.size > MAX_FILE_SIZE) {
          setUploadError('Photo must be under 10MB.')
          continue
        }

        const outcome = await uploadSosPhotoWithRetry(file, () => setUploadRetrying(true))
        setUploadRetrying(false)
        if (!outcome.ok) {
          setUploadError(outcome.error)
          continue
        }
        newUrls.push(outcome.url)
        newPreviews.push(URL.createObjectURL(file))
      }

      if (newUrls.length > 0) {
        onChange({ uploadedMediaUrls: [...uploadedMediaUrls, ...newUrls] })
        setLocalPreviews(prev => [...prev, ...newPreviews])
      }
    } finally {
      setUploading(false)
      setUploadRetrying(false)
    }
  }

  const handleRemovePhoto = (index: number) => {
    const newUrls = uploadedMediaUrls.filter((_, i) => i !== index)
    onChange({ uploadedMediaUrls: newUrls })
    if (index >= uploadedMediaUrls.length - localPreviews.length) {
      const previewIdx = index - (uploadedMediaUrls.length - localPreviews.length)
      URL.revokeObjectURL(localPreviews[previewIdx])
      setLocalPreviews(prev => prev.filter((_, i) => i !== previewIdx))
    }
  }

  const handleSubmit = async () => {
    if (descriptionError) {
      setDescriptionTouched(true)
      toast.error(descriptionError)
      requestAnimationFrame(() => {
        descriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        descriptionRef.current?.focus()
      })
      return
    }

    setSending(true)
    try {
      // Build title from AI data
      const catLabel = getTier2Label(editCategory) || aiEquipmentType
      const subLabel = editSubcategory ? getSubcategoryLabel(editSubcategory) : ''
      const parts = [brandPreference || aiManufacturer, subLabel || catLabel, aiModel].filter(Boolean)
      const title = parts.join(' ') || catLabel || aiEquipmentType || 'Equipment needed'

      const result = await createSosRequest({
        title,
        description,
        equipment_category: editCategory || aiTaxonomyTier2,
        equipment_subcategory: editSubcategory || aiSubcategory || undefined,
        brand: brandPreference || aiManufacturer || undefined,
        model: aiModel || undefined,
        urgency,
        transport_needed: transportNeeded,
        photos: uploadedMediaUrls,
        max_distance_miles: 500,
        expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      // Count vendors from SOS routing (we don't have direct access, but the action returns the id)
      // The vendor count is handled server-side in notifications; we'll show a generic message
      onSubmit(result.data!.id, -1) // -1 signals we don't have the exact count
    } catch (err) {
      console.error('[SOSConfirmStep] submit failed', err)
      toast.error(err instanceof Error ? err.message : 'Failed to send SOS. Please try again.')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 font-body text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" />
        Retake photo
      </button>

      {/* AI confidence notice */}
      {aiConfidence > 0 && aiConfidence < 0.5 && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-500" />
          <p className="font-body text-sm text-amber-600 dark:text-amber-400">
            Couldn&apos;t identify equipment automatically — please describe below.
          </p>
        </div>
      )}

      {/* Section 1: Photo strip */}
      <div>
        <div className="flex flex-wrap gap-2">
          {uploadedMediaUrls.map((url, i) => (
            <div key={i} className="relative size-16 overflow-hidden rounded-lg border border-border">
              <Image
                src={url}
                alt={`Photo ${i + 1}`}
                fill
                className="object-cover"
                unoptimized
              />
              <button
                type="button"
                onClick={() => handleRemovePhoto(i)}
                className="absolute right-0.5 top-0.5 flex size-5 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
          {totalPhotos < MAX_PHOTOS && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="flex size-16 flex-col items-center justify-center rounded-lg border-2 border-dashed border-border text-muted-foreground transition-colors hover:border-[#FF6B2B]/50 hover:text-[#FF6B2B]"
            >
              <Camera className="size-4" />
              <span className="text-[10px]">
                {uploadRetrying ? 'Retry' : uploading ? '...' : 'Add'}
              </span>
            </button>
          )}
        </div>
        {uploadError && (
          <p className="mt-2 font-body text-xs text-destructive">{uploadError}</p>
        )}
        {uploadedMediaUrls.length === 1 && (
          <p className="mt-1.5 font-body text-xs text-muted-foreground">
            Add nameplate photo for better matches &rarr;
          </p>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
          multiple
          onChange={(e) => {
            handleAddPhotos(e.target.files)
            e.target.value = ''
          }}
          className="hidden"
          style={{ fontSize: '16px' }}
        />
      </div>

      {/* Section 2: Description */}
      <div className="space-y-2">
        <Label className="font-body text-sm">
          Describe the issue <span className="text-[#FF6B2B]">*</span>
        </Label>
        <textarea
          ref={descriptionRef}
          value={description}
          onChange={(e) => onChange({ description: e.target.value.slice(0, MAX_DESCRIPTION) })}
          onBlur={() => setDescriptionTouched(true)}
          placeholder="Describe the equipment, issue, or need in detail. Include model numbers, symptoms, or specs if you have them."
          rows={3}
          className="w-full rounded-md border border-border bg-surface px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground"
          aria-invalid={descriptionTouched && !!descriptionError}
        />
        <div className="flex items-start justify-between gap-2">
          {descriptionTouched && descriptionError ? (
            <p className="font-body text-xs text-destructive">{descriptionError}</p>
          ) : (
            <span />
          )}
          <p className="font-body text-xs text-muted-foreground">
            {description.length}/{MAX_DESCRIPTION}
          </p>
        </div>
      </div>

      {/* Section 3: Urgency toggle */}
      <div className="space-y-2">
        <Label className="font-body text-sm">Urgency</Label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => onChange({ urgency: 'normal' })}
            className={`rounded-lg border px-4 py-3 text-center font-display text-sm font-semibold transition-all ${
              urgency === 'normal'
                ? 'border-border bg-card text-foreground ring-1 ring-border'
                : 'border-border bg-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            Normal
          </button>
          <button
            type="button"
            onClick={() => onChange({ urgency: 'critical' })}
            className={`rounded-lg border px-4 py-3 text-center font-display text-sm font-semibold transition-all ${
              urgency === 'critical'
                ? 'border-[#FF6B2B] bg-[#FF6B2B] text-white'
                : 'border-[#FF6B2B] bg-transparent text-[#FF6B2B] hover:bg-[#FF6B2B]/10'
            }`}
          >
            Critical
          </button>
        </div>
        <p className="font-body text-xs text-muted-foreground">
          {urgency === 'critical'
            ? 'Vendors matching your equipment type will be notified immediately'
            : 'Vendors will see this in their SOS feed'}
        </p>
      </div>

      {/* Transport / rigging */}
      <div className="flex items-center justify-between rounded-lg border border-border p-4">
        <div className="pr-3">
          <p className="font-body text-sm font-medium text-foreground">I also need transport / rigging</p>
          <p className="mt-0.5 font-body text-xs text-muted-foreground">
            Notify logistics and rigging providers who can move this equipment
          </p>
        </div>
        <Switch
          checked={transportNeeded}
          onCheckedChange={(v) => onChange({ transportNeeded: v })}
        />
      </div>

      {/* Section 4: More details (collapsible) */}
      <div className="rounded-lg border border-border">
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="flex w-full items-center justify-between px-4 py-3 font-body text-sm text-muted-foreground hover:text-foreground"
        >
          <span>Add more details (optional)</span>
          {expanded ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>

        {expanded && (
          <div className="space-y-4 border-t border-border px-4 py-4">
            <div className="space-y-2">
              <Label className="font-body text-xs">Brand / Manufacturer</Label>
              <Input
                value={brandPreference || aiManufacturer}
                onChange={(e) => onChange({ brandPreference: e.target.value })}
                placeholder="e.g., Alfa Laval"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-body text-xs">Equipment Category</Label>
              <select
                value={editCategory}
                onChange={(e) => {
                  setEditCategory(e.target.value)
                  setEditSubcategory('')
                }}
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
            </div>

            {selectedGroup && selectedGroup.subcategories.length > 0 && (
              <div className="space-y-2">
                <Label className="font-body text-xs">Subcategory</Label>
                <select
                  value={editSubcategory}
                  onChange={(e) => setEditSubcategory(e.target.value)}
                  className="w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Select subcategory...</option>
                  {selectedGroup.subcategories.map((sub) => (
                    <option key={sub.id} value={sub.id}>{sub.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="font-body text-xs">Quantity needed</Label>
                <Input
                  type="number"
                  min={1}
                  value={quantity ?? ''}
                  onChange={(e) => onChange({ quantity: e.target.value ? parseInt(e.target.value) : null })}
                  placeholder="1"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-body text-xs">Budget range</Label>
                <Input
                  value={budget}
                  onChange={(e) => onChange({ budget: e.target.value })}
                  placeholder="$5,000–$10,000"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Submit CTA */}
      <Button
        onClick={handleSubmit}
        aria-disabled={sending || !!descriptionError}
        className={`w-full gap-2 bg-[#FF6B2B] text-white hover:bg-[#FF6B2B]/90 ${
          sending || descriptionError ? 'opacity-70' : ''
        }`}
        size="lg"
      >
        {sending ? (
          'Sending SOS...'
        ) : (
          <>
            <Send className="size-4" />
            Send SOS Broadcast
          </>
        )}
      </Button>
    </div>
  )
}
