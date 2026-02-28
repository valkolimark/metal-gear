'use client'

import { useState, useCallback, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Upload,
  X,
  GripVertical,
  Video,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import { checkListingLimit } from '@/app/actions/tier'
import {
  EQUIPMENT_CATEGORIES,
  INDUSTRIES,
  LISTING_CONDITIONS,
  TIER_LIMITS,
} from '@/lib/constants'

const STEPS = ['Details', 'Photos', 'Pricing', 'Review']

interface ListingForm {
  title: string
  description: string
  category: string
  industry: string
  condition: string
  price_cents: string
  negotiable: boolean
  contact_for_price: boolean
  location_city: string
  location_state: string
  specifications: Record<string, string>
}

interface UploadedImage {
  id: string
  file?: File
  preview: string
  storage_path: string
  url: string
  uploading: boolean
}

export default function CreateListingPage() {
  const router = useRouter()
  const { user, profile } = useAuthStore()
  const tier = profile?.subscription_tier ?? 'free'
  const tierLimits = TIER_LIMITS[tier as keyof typeof TIER_LIMITS]
  const maxPhotos = tierLimits.photos
  const maxVideos = tierLimits.videos

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [images, setImages] = useState<UploadedImage[]>([])
  const [videos, setVideos] = useState<{ id: string; file?: File; preview: string; storage_path: string; url: string; uploading: boolean }[]>([])
  const [dragIdx, setDragIdx] = useState<number | null>(null)
  const [specKey, setSpecKey] = useState('')
  const [specValue, setSpecValue] = useState('')
  const [limitInfo, setLimitInfo] = useState<{
    allowed: boolean
    current: number
    limit: number
    error: string | null
  } | null>(null)

  useEffect(() => {
    checkListingLimit().then((result) => {
      if ('current' in result && 'limit' in result) {
        setLimitInfo({
          allowed: result.allowed,
          current: result.current as number,
          limit: result.limit as number,
          error: result.error ?? null,
        })
      }
    })
  }, [])

  const [form, setForm] = useState<ListingForm>({
    title: '',
    description: '',
    category: '',
    industry: '',
    condition: 'good',
    price_cents: '',
    negotiable: false,
    contact_for_price: false,
    location_city: profile?.location_city || 'Houston',
    location_state: profile?.location_state || 'TX',
    specifications: {},
  })

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value, type } = e.target
    setForm((prev) => ({
      ...prev,
      [name]:
        type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }))
  }

  function addSpec() {
    if (!specKey.trim() || !specValue.trim()) return
    setForm((prev) => ({
      ...prev,
      specifications: { ...prev.specifications, [specKey.trim()]: specValue.trim() },
    }))
    setSpecKey('')
    setSpecValue('')
  }

  function removeSpec(key: string) {
    setForm((prev) => {
      const specs = { ...prev.specifications }
      delete specs[key]
      return { ...prev, specifications: specs }
    })
  }

  // Photo upload
  const handleFileSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || !user) return
      const remaining = maxPhotos - images.length
      const toUpload = Array.from(files).slice(0, remaining)

      if (toUpload.length === 0) {
        toast.error(`Maximum ${maxPhotos} photos allowed on your plan`)
        return
      }

      const supabase = createClient()

      for (const file of toUpload) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 10MB limit`)
          continue
        }

        const tempId = crypto.randomUUID()
        const preview = URL.createObjectURL(file)

        setImages((prev) => [
          ...prev,
          { id: tempId, file, preview, storage_path: '', url: '', uploading: true },
        ])

        const ext = file.name.split('.').pop()
        const path = `${user.id}/${tempId}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('listing-images')
          .upload(path, file)

        if (uploadError) {
          toast.error(`Failed to upload ${file.name}`)
          setImages((prev) => prev.filter((i) => i.id !== tempId))
          continue
        }

        const {
          data: { publicUrl },
        } = supabase.storage.from('listing-images').getPublicUrl(path)

        setImages((prev) =>
          prev.map((i) =>
            i.id === tempId
              ? { ...i, storage_path: path, url: publicUrl, uploading: false }
              : i
          )
        )
      }
    },
    [user, images.length, maxPhotos]
  )

  function removeImage(id: string) {
    setImages((prev) => prev.filter((i) => i.id !== id))
  }

  // Video upload
  const handleVideoSelect = useCallback(
    async (files: FileList | null) => {
      if (!files || !user || maxVideos === 0) return
      const remaining = maxVideos - videos.length
      const toUpload = Array.from(files).slice(0, remaining)

      if (toUpload.length === 0) {
        toast.error(`Maximum ${maxVideos} videos allowed on your plan`)
        return
      }

      const supabase = createClient()

      for (const file of toUpload) {
        if (file.size > 100 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 100MB limit`)
          continue
        }

        const tempId = crypto.randomUUID()
        const preview = URL.createObjectURL(file)

        setVideos((prev) => [
          ...prev,
          { id: tempId, file, preview, storage_path: '', url: '', uploading: true },
        ])

        const ext = file.name.split('.').pop()
        const path = `${user.id}/${tempId}.${ext}`

        const { error: uploadError } = await supabase.storage
          .from('listing-videos')
          .upload(path, file)

        if (uploadError) {
          toast.error(`Failed to upload ${file.name}`)
          setVideos((prev) => prev.filter((v) => v.id !== tempId))
          continue
        }

        const { data: { publicUrl } } = supabase.storage
          .from('listing-videos')
          .getPublicUrl(path)

        setVideos((prev) =>
          prev.map((v) =>
            v.id === tempId
              ? { ...v, storage_path: path, url: publicUrl, uploading: false }
              : v
          )
        )
      }
    },
    [user, videos.length, maxVideos]
  )

  // Drag and drop reorder
  function handleDragStart(idx: number) {
    setDragIdx(idx)
  }

  function handleDragOver(e: React.DragEvent, idx: number) {
    e.preventDefault()
    if (dragIdx === null || dragIdx === idx) return
    setImages((prev) => {
      const copy = [...prev]
      const [moved] = copy.splice(dragIdx, 1)
      copy.splice(idx, 0, moved)
      return copy
    })
    setDragIdx(idx)
  }

  function handleDragEnd() {
    setDragIdx(null)
  }

  // Validation
  function canProceed(): boolean {
    switch (step) {
      case 0:
        return !!(form.title && form.category && form.condition)
      case 1:
        return true // photos are optional
      case 2:
        return form.contact_for_price || !!form.price_cents
      case 3:
        return true
      default:
        return false
    }
  }

  // Save as draft
  async function saveDraft() {
    if (!user) return
    // Check listing limit
    const limit = await checkListingLimit()
    if (!limit.allowed) {
      toast.error(limit.error || 'Listing limit reached')
      router.push('/pricing')
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.from('listings').insert({
        seller_id: user.id,
        title: form.title || 'Untitled Draft',
        description: form.description,
        category: form.category || 'Other',
        industry: form.industry || null,
        condition: form.condition,
        price_cents: form.price_cents ? Math.round(parseFloat(form.price_cents) * 100) : null,
        negotiable: form.negotiable,
        contact_for_price: form.contact_for_price,
        location_city: form.location_city,
        location_state: form.location_state,
        specifications: form.specifications,
        status: 'draft',
      })
      if (error) throw error
      toast.success('Draft saved')
      router.push('/listings')
    } catch (err) {
      toast.error('Failed to save draft')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // Publish listing
  async function publish() {
    if (!user) return
    // Check listing limit
    const limit = await checkListingLimit()
    if (!limit.allowed) {
      toast.error(limit.error || 'Listing limit reached')
      router.push('/pricing')
      return
    }
    setSaving(true)
    try {
      const supabase = createClient()
      const priceCents = form.price_cents
        ? Math.round(parseFloat(form.price_cents) * 100)
        : null

      const { data: listing, error: listingError } = await supabase
        .from('listings')
        .insert({
          seller_id: user.id,
          title: form.title,
          description: form.description,
          category: form.category,
          industry: form.industry || null,
          condition: form.condition,
          price_cents: priceCents,
          negotiable: form.negotiable,
          contact_for_price: form.contact_for_price,
          location_city: form.location_city,
          location_state: form.location_state,
          specifications: form.specifications,
          status: 'active',
        })
        .select()
        .single()

      if (listingError) throw listingError

      // Save images linked to the listing
      if (images.length > 0) {
        const imageRows = images
          .filter((i) => i.url && !i.uploading)
          .map((img, idx) => ({
            listing_id: listing.id,
            url: img.url,
            storage_path: img.storage_path,
            position: idx,
          }))

        if (imageRows.length > 0) {
          const { error: imgError } = await supabase
            .from('listing_images')
            .insert(imageRows)
          if (imgError) console.error('Image save error:', imgError)
        }
      }

      // Save videos linked to the listing
      if (videos.length > 0) {
        const videoRows = videos
          .filter((v) => v.url && !v.uploading)
          .map((vid, idx) => ({
            listing_id: listing.id,
            url: vid.url,
            storage_path: vid.storage_path,
            position: idx,
          }))

        if (videoRows.length > 0) {
          const { error: vidError } = await supabase
            .from('listing_videos')
            .insert(videoRows)
          if (vidError) console.error('Video save error:', vidError)
        }
      }

      toast.success('Listing published!')
      router.push(`/listings/${listing.id}`)
    } catch (err) {
      toast.error('Failed to publish listing')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  // If at limit, show upgrade prompt
  if (limitInfo && !limitInfo.allowed) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
        <Card className="w-full border-border bg-card">
          <CardContent className="flex flex-col items-center gap-4 p-8 text-center">
            <div className="flex size-12 items-center justify-center rounded-full bg-primary/20">
              <Upload className="size-6 text-primary" />
            </div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Listing Limit Reached
            </h2>
            <p className="font-body text-sm text-muted-foreground">
              You&apos;ve used {limitInfo.current} of {limitInfo.limit} listings
              on the {tier} plan. Upgrade to create more.
            </p>
            <div className="flex w-full gap-3">
              <Button
                variant="outline"
                className="flex-1 font-body"
                onClick={() => router.push('/listings')}
              >
                My Listings
              </Button>
              <Button
                className="flex-1 font-body"
                onClick={() => router.push('/pricing')}
              >
                Upgrade Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Create Listing
        </h1>
        <p className="mt-1 font-body text-muted-foreground">
          List your industrial equipment for sale
        </p>
      </div>

      {/* Step indicators */}
      <div className="flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex items-center gap-2">
            <button
              onClick={() => i < step && setStep(i)}
              disabled={i > step}
              className={`flex size-8 items-center justify-center rounded-full font-body text-sm font-medium transition-colors ${
                i < step
                  ? 'bg-primary text-white'
                  : i === step
                    ? 'bg-primary/20 text-primary ring-2 ring-primary'
                    : 'bg-surface text-muted-foreground'
              }`}
            >
              {i < step ? <Check className="size-4" /> : i + 1}
            </button>
            <span
              className={`hidden font-body text-sm sm:inline ${
                i === step
                  ? 'font-medium text-foreground'
                  : 'text-muted-foreground'
              }`}
            >
              {label}
            </span>
            {i < STEPS.length - 1 && (
              <div
                className={`h-px w-8 ${i < step ? 'bg-primary' : 'bg-border'}`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Details */}
      {step === 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Equipment Details
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title" className="font-body">
                Title *
              </Label>
              <Input
                id="title"
                name="title"
                value={form.title}
                onChange={handleChange}
                placeholder="e.g. Haas VF-2 CNC Vertical Machining Center"
                className="font-body"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description" className="font-body">
                Description
              </Label>
              <Textarea
                id="description"
                name="description"
                value={form.description}
                onChange={handleChange}
                placeholder="Describe the equipment, its condition, history, and any included accessories..."
                rows={5}
                className="font-body"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-body">Category *</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, category: v }))
                  }
                >
                  <SelectTrigger className="font-body">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_CATEGORIES.map((cat) => (
                      <SelectItem key={cat} value={cat} className="font-body">
                        {cat}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-body">Industry</Label>
                <Select
                  value={form.industry}
                  onValueChange={(v) =>
                    setForm((prev) => ({ ...prev, industry: v }))
                  }
                >
                  <SelectTrigger className="font-body">
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((ind) => (
                      <SelectItem key={ind} value={ind} className="font-body">
                        {ind}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-body">Condition *</Label>
              <Select
                value={form.condition}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, condition: v }))
                }
              >
                <SelectTrigger className="font-body">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LISTING_CONDITIONS.map((c) => (
                    <SelectItem
                      key={c.value}
                      value={c.value}
                      className="font-body"
                    >
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Specifications */}
            <div className="space-y-2">
              <Label className="font-body">Specifications</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Key (e.g. Weight)"
                  value={specKey}
                  onChange={(e) => setSpecKey(e.target.value)}
                  className="font-body"
                />
                <Input
                  placeholder="Value (e.g. 5,000 lbs)"
                  value={specValue}
                  onChange={(e) => setSpecValue(e.target.value)}
                  className="font-body"
                />
                <Button type="button" variant="outline" onClick={addSpec}>
                  Add
                </Button>
              </div>
              {Object.keys(form.specifications).length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(form.specifications).map(([k, v]) => (
                    <Badge
                      key={k}
                      variant="outline"
                      className="gap-1 font-body text-xs"
                    >
                      {k}: {v}
                      <button onClick={() => removeSpec(k)}>
                        <X className="size-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Photos */}
      {step === 1 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Photos ({images.length}/{maxPhotos})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Upload options */}
            <div className="grid gap-3 sm:grid-cols-2">
              {/* Camera capture (mobile) */}
              <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-8 transition-colors hover:border-primary/50 sm:hidden">
                <Upload className="mb-2 size-6 text-primary" />
                <p className="font-body text-sm font-medium text-foreground">
                  Take Photo
                </p>
                <p className="mt-0.5 font-body text-xs text-muted-foreground">
                  Use your camera
                </p>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
              </label>

              {/* Gallery / file picker */}
              <label
                className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-8 transition-colors hover:border-primary/50 sm:col-span-2 sm:py-12"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault()
                  handleFileSelect(e.dataTransfer.files)
                }}
              >
                <Upload className="mb-2 size-6 text-muted-foreground sm:mb-3 sm:size-8" />
                <p className="font-body text-sm font-medium text-foreground">
                  <span className="hidden sm:inline">Drag & drop photos or click to browse</span>
                  <span className="sm:hidden">Choose from Gallery</span>
                </p>
                <p className="mt-0.5 font-body text-xs text-muted-foreground sm:mt-1">
                  JPG, PNG, WebP up to 10MB each
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFileSelect(e.target.files)}
                  className="hidden"
                />
              </label>
            </div>

            {/* Video upload (Premium/Boost only) */}
            {maxVideos > 0 && (
              <div className="space-y-3">
                <Separator />
                <p className="font-body text-sm font-medium text-foreground">
                  Videos ({videos.length}/{maxVideos})
                </p>
                <label className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-border py-6 transition-colors hover:border-primary/50">
                  <Video className="mb-2 size-6 text-muted-foreground" />
                  <p className="font-body text-sm font-medium text-foreground">
                    Upload Video
                  </p>
                  <p className="mt-0.5 font-body text-xs text-muted-foreground">
                    MP4, MOV up to 100MB
                  </p>
                  <input
                    type="file"
                    accept="video/mp4,video/quicktime"
                    onChange={(e) => handleVideoSelect(e.target.files)}
                    className="hidden"
                  />
                </label>
                {videos.length > 0 && (
                  <div className="space-y-2">
                    {videos.map((vid) => (
                      <div key={vid.id} className="flex items-center gap-3 rounded-lg border border-border p-3">
                        <Video className="size-5 shrink-0 text-primary" />
                        <div className="min-w-0 flex-1">
                          {vid.uploading ? (
                            <div className="flex items-center gap-2">
                              <Loader2 className="size-4 animate-spin text-primary" />
                              <span className="font-body text-sm text-muted-foreground">Uploading...</span>
                            </div>
                          ) : (
                            <p className="truncate font-body text-sm text-foreground">Video uploaded</p>
                          )}
                        </div>
                        <button
                          onClick={() => setVideos((prev) => prev.filter((v) => v.id !== vid.id))}
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          <X className="size-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Image grid with drag reorder */}
            {images.length > 0 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {images.map((img, idx) => (
                  <div
                    key={img.id}
                    draggable
                    onDragStart={() => handleDragStart(idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`group relative aspect-square overflow-hidden rounded-lg border border-border ${
                      dragIdx === idx ? 'opacity-50' : ''
                    }`}
                  >
                    <img
                      src={img.preview || img.url}
                      alt={`Photo ${idx + 1}`}
                      className="size-full object-cover"
                    />
                    {img.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/60">
                        <Loader2 className="size-6 animate-spin text-white" />
                      </div>
                    )}
                    <div className="absolute left-1 top-1 cursor-grab opacity-0 transition-opacity group-hover:opacity-100">
                      <GripVertical className="size-5 text-white drop-shadow" />
                    </div>
                    <button
                      onClick={() => removeImage(img.id)}
                      className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100"
                    >
                      <X className="size-4" />
                    </button>
                    {idx === 0 && (
                      <Badge className="absolute bottom-1 left-1 bg-primary text-xs text-white">
                        Cover
                      </Badge>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 3: Pricing */}
      {step === 2 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Pricing & Location
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 font-body text-sm">
                <input
                  type="checkbox"
                  checked={form.contact_for_price}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      contact_for_price: e.target.checked,
                    }))
                  }
                  className="size-4 rounded border-border"
                />
                Contact for Price
              </label>
            </div>

            {!form.contact_for_price && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price" className="font-body">
                    Price (USD) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-body text-muted-foreground">
                      $
                    </span>
                    <Input
                      id="price"
                      name="price_cents"
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.price_cents}
                      onChange={handleChange}
                      placeholder="0.00"
                      className="pl-7 font-body"
                    />
                  </div>
                </div>
                <div className="flex items-end">
                  <label className="flex items-center gap-2 pb-2 font-body text-sm">
                    <input
                      type="checkbox"
                      checked={form.negotiable}
                      onChange={(e) =>
                        setForm((prev) => ({
                          ...prev,
                          negotiable: e.target.checked,
                        }))
                      }
                      className="size-4 rounded border-border"
                    />
                    Price is negotiable
                  </label>
                </div>
              </div>
            )}

            <Separator />

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location_city" className="font-body">
                  City
                </Label>
                <Input
                  id="location_city"
                  name="location_city"
                  value={form.location_city}
                  onChange={handleChange}
                  className="font-body"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location_state" className="font-body">
                  State
                </Label>
                <Input
                  id="location_state"
                  name="location_state"
                  value={form.location_state}
                  onChange={handleChange}
                  maxLength={2}
                  className="font-body"
                />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 4: Review */}
      {step === 3 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Review Your Listing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {images.length > 0 && (
              <div className="aspect-video overflow-hidden rounded-lg">
                <img
                  src={images[0].preview || images[0].url}
                  alt="Cover"
                  className="size-full object-cover"
                />
              </div>
            )}

            <h2 className="font-display text-xl font-bold text-foreground">
              {form.title}
            </h2>

            <div className="flex flex-wrap gap-2">
              <Badge variant="outline" className="font-body">
                {form.category}
              </Badge>
              {form.industry && (
                <Badge variant="outline" className="font-body">
                  {form.industry}
                </Badge>
              )}
              <Badge variant="outline" className="font-body capitalize">
                {form.condition.replace('_', ' ')}
              </Badge>
            </div>

            <p className="font-display text-2xl font-bold text-primary">
              {form.contact_for_price
                ? 'Contact for Price'
                : form.price_cents
                  ? `$${parseFloat(form.price_cents).toLocaleString()}`
                  : 'Free'}
              {form.negotiable && !form.contact_for_price && (
                <span className="ml-2 font-body text-sm font-normal text-muted-foreground">
                  (Negotiable)
                </span>
              )}
            </p>

            {form.description && (
              <>
                <Separator />
                <p className="whitespace-pre-wrap font-body text-sm text-muted-foreground">
                  {form.description}
                </p>
              </>
            )}

            {Object.keys(form.specifications).length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-2 font-display text-sm font-semibold text-foreground">
                    Specifications
                  </h3>
                  <dl className="grid grid-cols-2 gap-2">
                    {Object.entries(form.specifications).map(([k, v]) => (
                      <div key={k}>
                        <dt className="font-body text-xs text-muted-foreground">
                          {k}
                        </dt>
                        <dd className="font-body text-sm text-foreground">
                          {v}
                        </dd>
                      </div>
                    ))}
                  </dl>
                </div>
              </>
            )}

            <Separator />
            <p className="font-body text-sm text-muted-foreground">
              {form.location_city}, {form.location_state} &middot;{' '}
              {images.length} photo{images.length !== 1 ? 's' : ''}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {step > 0 && (
            <Button
              variant="outline"
              onClick={() => setStep((s) => s - 1)}
              className="font-body"
            >
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Button>
          )}
          <Button
            variant="ghost"
            onClick={saveDraft}
            disabled={saving}
            className="font-body text-muted-foreground"
          >
            Save as Draft
          </Button>
        </div>

        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canProceed()}
            className="font-body"
          >
            Next
            <ArrowRight className="ml-2 size-4" />
          </Button>
        ) : (
          <Button
            onClick={publish}
            disabled={saving || !canProceed()}
            className="font-body"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Publishing...
              </>
            ) : (
              <>
                <Check className="mr-2 size-4" />
                Publish Listing
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
