'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { Camera, Upload, X, ChevronDown, AlertTriangle, Sparkles, RotateCcw, ArrowRight, Loader2, AlertCircle, CheckCircle2, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { cn } from '@/lib/utils'
import { validateImageQuality, type ImageQualityResult } from '@/lib/ai/image-quality'
import type { AIAnalysisResult } from '@/types/ai-analysis'
import { uploadListingImageAction } from '@/app/(main)/listings/new/actions'

interface AIImageCaptureProps {
  onComplete: (data: AIAnalysisResult, preloadedImages?: string[]) => void
  onSkip: () => void
  listingId?: string
}

type Step = 'mode' | 'capture' | 'processing' | 'results'

function compressImage(file: File, maxWidth = 1200, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        let w = img.width
        let h = img.height
        if (w > maxWidth) {
          h = (h * maxWidth) / w
          w = maxWidth
        }
        canvas.width = w
        canvas.height = h
        const ctx = canvas.getContext('2d')!
        ctx.drawImage(img, 0, 0, w, h)
        const dataUrl = canvas.toDataURL('image/jpeg', quality)
        // Strip the data:image/jpeg;base64, prefix
        const base64 = dataUrl.split(',')[1]
        resolve(base64)
      }
      img.onerror = reject
      img.src = e.target?.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

function ConfidenceDot({ confidence }: { confidence: number }) {
  if (confidence >= 0.8) {
    return (
      <span className="inline-flex items-center gap-1" title="High confidence">
        <span className="size-2 rounded-full bg-green-500" />
        <span className="text-[10px] text-green-600 dark:text-green-400">High</span>
      </span>
    )
  }
  if (confidence >= 0.5) {
    return (
      <span className="inline-flex items-center gap-1" title="Medium confidence — verify">
        <span className="size-2 rounded-full bg-amber-500" />
        <span className="text-[10px] text-amber-600 dark:text-amber-400">Verify</span>
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1" title="Low confidence — verify manually">
      <span className="size-2 rounded-full bg-red-500" />
      <span className="text-[10px] text-red-600 dark:text-red-400">Low</span>
    </span>
  )
}

export default function AIImageCapture({ onComplete, onSkip, listingId }: AIImageCaptureProps) {
  const [currentStep, setCurrentStep] = useState<Step>('mode')
  const [wideShot, setWideShot] = useState<{ file: File; preview: string; base64: string } | null>(null)
  const [nameplateShot, setNameplateShot] = useState<{ file: File; preview: string; base64: string } | null>(null)
  const [wideQuality, setWideQuality] = useState<ImageQualityResult | null>(null)
  const [nameplateQuality, setNameplateQuality] = useState<ImageQualityResult | null>(null)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<AIAnalysisResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [editedFields, setEditedFields] = useState<Record<string, string | number | undefined>>({})
  const [showAlternatives, setShowAlternatives] = useState(false)
  const [isMobile, setIsMobile] = useState(false)

  const wideShotRef = useRef<HTMLInputElement>(null)
  const wideShotCameraRef = useRef<HTMLInputElement>(null)
  const nameplateShotRef = useRef<HTMLInputElement>(null)
  const nameplateShotCameraRef = useRef<HTMLInputElement>(null)
  const progressTimerRef = useRef<NodeJS.Timeout | null>(null)
  const preloadedImagesRef = useRef<string[]>([])

  useEffect(() => {
    setIsMobile(window.innerWidth < 768)
  }, [])

  const handleImageSelect = useCallback(async (
    file: File,
    setter: typeof setWideShot,
    mode: 'wide_shot' | 'nameplate',
    qualitySetter: typeof setWideQuality
  ) => {
    // Run quality validation
    const quality = await validateImageQuality(file, mode)
    qualitySetter(quality)

    if (!quality.passed) {
      // Don't process further if quality check fails
      return
    }

    const preview = URL.createObjectURL(file)
    try {
      const base64 = await compressImage(file)
      // Check compressed size (~3MB limit)
      const sizeBytes = (base64.length * 3) / 4
      if (sizeBytes > 3 * 1024 * 1024) {
        setError('Image is too large even after compression. Please use a smaller image.')
        return
      }
      setter({ file, preview, base64 })
      setError(null)
    } catch {
      setError('Failed to process image. Please try again.')
    }
  }, [])

  const handleFileChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement>,
    setter: typeof setWideShot,
    mode: 'wide_shot' | 'nameplate',
    qualitySetter: typeof setWideQuality
  ) => {
    const file = e.target.files?.[0]
    if (file) handleImageSelect(file, setter, mode, qualitySetter)
    // Reset input so the same file can be re-selected
    e.target.value = ''
  }, [handleImageSelect])

  const clearWideShot = useCallback(() => {
    setWideShot(null)
    setWideQuality(null)
  }, [])

  const clearNameplateShot = useCallback(() => {
    setNameplateShot(null)
    setNameplateQuality(null)
  }, [])

  async function analyzeImages() {
    if (!wideShot && !nameplateShot) return

    setCurrentStep('processing')
    setProgress(0)
    setError(null)

    // Fake progress bar — fills to ~90% over 15s, resolves when API returns
    const startTime = Date.now()
    progressTimerRef.current = setInterval(() => {
      const elapsed = Date.now() - startTime
      const target = Math.min(90, (elapsed / 15000) * 90)
      setProgress(target)
    }, 200)

    // 45s timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 45000)

    try {
      // Build R2 upload promises (run in parallel with AI analysis)
      const uploadPromises: Promise<string | null>[] = []
      if (listingId) {
        if (wideShot) {
          uploadPromises.push(
            (async () => {
              try {
                const fd = new FormData()
                fd.append('file', wideShot.file)
                fd.append('listingId', listingId)
                const result = await uploadListingImageAction(fd)
                return result.url ?? null
              } catch {
                return null
              }
            })()
          )
        }
        if (nameplateShot) {
          uploadPromises.push(
            (async () => {
              try {
                const fd = new FormData()
                fd.append('file', nameplateShot.file)
                fd.append('listingId', listingId)
                const result = await uploadListingImageAction(fd)
                return result.url ?? null
              } catch {
                return null
              }
            })()
          )
        }
      }

      // Run AI analysis and R2 uploads in parallel
      const aiPromise = fetch('/api/listings/analyze-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wideShot: wideShot?.base64,
          nameplateShot: nameplateShot?.base64,
          mimeType: 'image/jpeg',
          mode: 'listing-helper',
        }),
        signal: controller.signal,
      })

      const [response, ...uploadResults] = await Promise.all([
        aiPromise,
        ...uploadPromises,
      ])

      clearTimeout(timeout)

      // Collect successful R2 URLs (filter nulls)
      const preloadedImages = (uploadResults as (string | null)[]).filter(Boolean) as string[]

      if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Unknown error' }))
        const details = data.details ? ` (${data.details.join('; ')})` : ''
        throw new Error((data.error || `HTTP ${response.status}`) + details)
      }

      const data: AIAnalysisResult = await response.json()
      setResult(data)
      // Store preloaded images for passing through on apply
      preloadedImagesRef.current = preloadedImages
      setProgress(100)

      // Haptic feedback on mobile
      if (isMobile && 'vibrate' in navigator) {
        navigator.vibrate(200)
      }

      setTimeout(() => setCurrentStep('results'), 300)
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        setError('Analysis is taking longer than expected.')
      } else {
        setError(err instanceof Error ? err.message : 'Couldn\'t analyze this image.')
      }
      setCurrentStep('capture')
    } finally {
      if (progressTimerRef.current) {
        clearInterval(progressTimerRef.current)
        progressTimerRef.current = null
      }
    }
  }

  function getEditedValue(field: string, original: string | number | undefined): string | number | undefined {
    return field in editedFields ? editedFields[field] : original
  }

  function getFieldConfidence(field: string): number | undefined {
    if (!result?.confidenceScores) return undefined
    const map: Record<string, keyof NonNullable<typeof result.confidenceScores>> = {
      title: 'title',
      manufacturer: 'manufacturer',
      model: 'model',
      serialNumber: 'serial_number',
      year: 'year',
    }
    const key = map[field]
    return key ? result.confidenceScores[key] : undefined
  }

  function handleApply() {
    if (!result) return
    // Merge edited fields into result
    const applied: AIAnalysisResult = {
      ...result,
      listing: {
        ...result.listing,
        title: getEditedValue('title', result.listing.title) as string | undefined,
        manufacturer: getEditedValue('manufacturer', result.listing.manufacturer) as string | undefined,
        model: getEditedValue('model', result.listing.model) as string | undefined,
        serialNumber: getEditedValue('serialNumber', result.listing.serialNumber) as string | undefined,
        year: getEditedValue('year', result.listing.year) as number | undefined,
      },
    }
    onComplete(applied, preloadedImagesRef.current)
  }

  // ─── Mode Selection ───────────────────────────────────────────────
  if (currentStep === 'mode') {
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center gap-5 p-8 text-center">
          <div className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/10">
            <Camera className="size-7 text-primary" />
          </div>
          <div>
            <h2 className="font-display text-xl font-bold text-foreground">
              Photo Assist
            </h2>
            <p className="mt-1 font-body text-sm text-muted-foreground">
              Pre-fill your listing from equipment photos. You&apos;ll review every field before publishing.
            </p>
          </div>
          <div className="flex w-full max-w-xs flex-col gap-3">
            <Button
              onClick={() => setCurrentStep('capture')}
              className="w-full font-body"
              size="lg"
            >
              <Camera className="mr-2 size-5" />
              {isMobile ? 'Take photos with camera' : 'Upload equipment photos'}
            </Button>
            <p className="font-body text-xs text-muted-foreground">
              Best results — upload both a wide shot and a nameplate photo
            </p>
            <Button
              variant="ghost"
              onClick={onSkip}
              className="w-full font-body text-muted-foreground"
            >
              Skip — I&apos;ll fill it in myself
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ─── Capture / Upload ─────────────────────────────────────────────
  if (currentStep === 'capture') {
    const hasBlockingIssue =
      (wideQuality && !wideQuality.passed) ||
      (nameplateQuality && !nameplateQuality.passed)

    return (
      <Card className="border-border bg-card">
        <CardContent className="space-y-6 p-6">
          <div className="text-center">
            <h2 className="font-display text-lg font-bold text-foreground">
              Capture Equipment Photos
            </h2>
            <p className="mt-1 font-body text-sm text-muted-foreground">
              Upload a wide shot and optionally a nameplate for best results
            </p>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-lg bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="size-4 shrink-0" />
              <span className="font-body">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto shrink-0">
                <X className="size-4" />
              </button>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Wide Shot Slot */}
            <div className="space-y-2">
              <Label className="font-body text-sm font-medium">
                Equipment Photo <span className="text-destructive">*</span>
              </Label>
              {wideShot ? (
                <div className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border">
                  <img
                    src={wideShot.preview}
                    alt="Wide shot"
                    className="size-full object-cover"
                  />
                  <button
                    onClick={clearWideShot}
                    className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:bg-black/80"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/30 transition-colors hover:border-primary">
                  <Camera className="mb-2 size-8 text-primary/50" />
                  <p className="font-body text-xs text-muted-foreground">
                    Full equipment view
                  </p>
                  <div className="mt-3 flex gap-2">
                    {isMobile && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => wideShotCameraRef.current?.click()}
                        className="font-body text-xs"
                      >
                        <Camera className="mr-1 size-3" />
                        Camera
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={isMobile ? 'outline' : 'default'}
                      onClick={() => wideShotRef.current?.click()}
                      className="font-body text-xs"
                    >
                      <Upload className="mr-1 size-3" />
                      Upload
                    </Button>
                  </div>
                  <input
                    ref={wideShotRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, setWideShot, 'wide_shot', setWideQuality)}
                    className="hidden"
                  />
                  <input
                    ref={wideShotCameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFileChange(e, setWideShot, 'wide_shot', setWideQuality)}
                    className="hidden"
                  />
                </div>
              )}
              {/* Wide shot quality feedback */}
              {wideQuality && !wideQuality.passed && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <div className="flex gap-2">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-500" />
                    <div>
                      <p className="font-body text-sm font-medium text-red-600 dark:text-red-400">Photo issue detected</p>
                      {wideQuality.issues.map(issue => (
                        <p key={issue} className="font-body text-xs text-muted-foreground">{issue}</p>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { clearWideShot(); wideShotRef.current?.click() }}
                        className="mt-2 font-body text-xs"
                      >
                        Retake Photo
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {wideQuality && wideQuality.passed && wideQuality.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <div className="flex gap-2">
                    <Info className="mt-0.5 size-4 shrink-0 text-amber-500" />
                    <div>
                      {wideQuality.warnings.map(w => (
                        <p key={w} className="font-body text-xs text-muted-foreground">{w}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Nameplate Shot Slot */}
            <div className="space-y-2">
              <Label className="font-body text-sm font-medium">
                Nameplate / Data Plate <span className="text-muted-foreground">(optional)</span>
              </Label>
              {nameplateShot ? (
                <div className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border">
                  <img
                    src={nameplateShot.preview}
                    alt="Nameplate"
                    className="size-full object-cover"
                  />
                  <button
                    onClick={clearNameplateShot}
                    className="absolute right-2 top-2 flex size-7 items-center justify-center rounded-full bg-black/60 text-white transition-opacity hover:bg-black/80"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              ) : (
                <div className="flex aspect-[4/3] flex-col items-center justify-center rounded-lg border-2 border-dashed border-primary/30 transition-colors hover:border-primary">
                  <Camera className="mb-2 size-8 text-primary/50" />
                  <p className="font-body text-xs text-muted-foreground">
                    Close-up of data plate
                  </p>
                  <div className="mt-3 flex gap-2">
                    {isMobile && (
                      <Button
                        size="sm"
                        variant="default"
                        onClick={() => nameplateShotCameraRef.current?.click()}
                        className="font-body text-xs"
                      >
                        <Camera className="mr-1 size-3" />
                        Camera
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant={isMobile ? 'outline' : 'default'}
                      onClick={() => nameplateShotRef.current?.click()}
                      className="font-body text-xs"
                    >
                      <Upload className="mr-1 size-3" />
                      Upload
                    </Button>
                  </div>
                  <input
                    ref={nameplateShotRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileChange(e, setNameplateShot, 'nameplate', setNameplateQuality)}
                    className="hidden"
                  />
                  <input
                    ref={nameplateShotCameraRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handleFileChange(e, setNameplateShot, 'nameplate', setNameplateQuality)}
                    className="hidden"
                  />
                </div>
              )}
              {/* Nameplate quality feedback */}
              {nameplateQuality && !nameplateQuality.passed && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3">
                  <div className="flex gap-2">
                    <AlertCircle className="mt-0.5 size-4 shrink-0 text-red-500" />
                    <div>
                      <p className="font-body text-sm font-medium text-red-600 dark:text-red-400">Photo issue detected</p>
                      {nameplateQuality.issues.map(issue => (
                        <p key={issue} className="font-body text-xs text-muted-foreground">{issue}</p>
                      ))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => { clearNameplateShot(); nameplateShotRef.current?.click() }}
                        className="mt-2 font-body text-xs"
                      >
                        Retake Photo
                      </Button>
                    </div>
                  </div>
                </div>
              )}
              {nameplateQuality && nameplateQuality.passed && nameplateQuality.warnings.length > 0 && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                  <div className="flex gap-2">
                    <Info className="mt-0.5 size-4 shrink-0 text-amber-500" />
                    <div>
                      {nameplateQuality.warnings.map(w => (
                        <p key={w} className="font-body text-xs text-muted-foreground">{w}</p>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              onClick={onSkip}
              className="font-body text-muted-foreground"
            >
              Skip
            </Button>
            <Button
              onClick={analyzeImages}
              disabled={!wideShot || !!hasBlockingIssue}
              className="font-body"
            >
              {wideShot && nameplateShot ? 'Analyze Both' : 'Analyze Equipment'}
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ─── Processing State ─────────────────────────────────────────────
  if (currentStep === 'processing') {
    const imageCount = (wideShot ? 1 : 0) + (nameplateShot ? 1 : 0)
    return (
      <Card className="border-border bg-card">
        <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
          <Loader2 className="size-10 animate-spin text-primary" />
          <div>
            <h2 className="font-display text-lg font-bold text-foreground">
              Analyzing {imageCount > 1 ? '2 images' : 'your equipment'}...
            </h2>
            <p className="mt-1 font-body text-sm text-muted-foreground">
              This takes about 10–15 seconds
            </p>
          </div>
          <div className="w-full max-w-sm">
            <div className="h-2 overflow-hidden rounded-full bg-surface">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-primary/70 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="mt-2 flex justify-between font-body text-xs text-muted-foreground">
              <span>{wideShot ? 'Identifying equipment...' : ''}</span>
              <span>{nameplateShot ? 'Reading nameplate...' : ''}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    )
  }

  // ─── Results Review ───────────────────────────────────────────────
  if (currentStep === 'results' && result) {
    const confidence = result.taxonomy.confidence
    const confidenceColor =
      confidence === 'high'
        ? 'bg-green-500/20 text-green-400 border-green-500/30'
        : confidence === 'medium'
          ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
          : 'bg-red-500/20 text-red-400 border-red-500/30'

    const overall = result.overallConfidence
    const isLowConfidence = result.lowConfidenceFields && result.lowConfidenceFields.length > 0

    const fields = [
      { key: 'title', label: 'Title', value: result.listing.title },
      { key: 'manufacturer', label: 'Manufacturer', value: result.listing.manufacturer },
      { key: 'model', label: 'Model', value: result.listing.model },
      { key: 'serialNumber', label: 'Serial #', value: result.listing.serialNumber },
      { key: 'year', label: 'Year', value: result.listing.year?.toString() },
    ]

    const specs = Object.entries(result.listing.specs || {})

    return (
      <Card className="border-border bg-card">
        <CardContent className="space-y-5 p-6">
          {/* Overall confidence banner */}
          {overall !== undefined && (
            <div className={cn(
              "flex items-center gap-2 rounded-lg border p-3",
              overall >= 0.8
                ? "border-green-500/30 bg-green-500/10"
                : overall >= 0.55
                  ? "border-amber-500/30 bg-amber-500/10"
                  : "border-red-500/30 bg-red-500/10"
            )}>
              {overall >= 0.8 ? (
                <CheckCircle2 className="size-4 shrink-0 text-green-500" />
              ) : (
                <AlertTriangle className="size-4 shrink-0 text-amber-500" />
              )}
              <span className="font-body text-sm">
                {overall >= 0.8
                  ? 'High confidence analysis'
                  : overall >= 0.55
                    ? 'Medium confidence — verify highlighted fields'
                    : 'Low confidence — manual review recommended'}
              </span>
              <span className="ml-auto font-body text-xs text-muted-foreground">
                {result.analysisMode === 'multi_image' ? 'Analyzed 2 images' : 'Analyzed 1 image'}
                {result.wasReprompted && ' (refined)'}
              </span>
            </div>
          )}

          {/* Fraud warning */}
          {result.fraud.flagged && (
            <div className="flex items-start gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-red-400" />
              <p className="font-body text-sm text-red-300">
                Warning: This image may not be an authentic photo of real equipment. Please verify before listing.
                {result.fraud.reason && <span className="block mt-1 text-red-400/80">{result.fraud.reason}</span>}
              </p>
            </div>
          )}

          {/* Taxonomy result */}
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-primary" />
                <h2 className="font-display text-lg font-bold text-foreground">
                  Equipment Identified
                </h2>
              </div>
              {result.taxonomy.tier1 && (
                <p className="mt-1 font-body text-sm text-muted-foreground">
                  {result.taxonomy.tier1?.replace(/_/g, ' ')} → {result.taxonomy.tier2?.replace(/_/g, ' ')} → {result.taxonomy.subcategory?.replace(/_/g, ' ')}
                </p>
              )}
            </div>
            <Badge className={`border ${confidenceColor} font-body text-xs uppercase`}>
              {confidence}
            </Badge>
          </div>

          {/* Alternatives */}
          {result.taxonomy.alternatives && result.taxonomy.alternatives.length > 0 && (
            <div>
              <button
                onClick={() => setShowAlternatives(!showAlternatives)}
                className="flex items-center gap-1 font-body text-xs text-muted-foreground hover:text-foreground"
              >
                <ChevronDown className={`size-3 transition-transform ${showAlternatives ? 'rotate-180' : ''}`} />
                Also considered {result.taxonomy.alternatives.length} alternative{result.taxonomy.alternatives.length > 1 ? 's' : ''}
              </button>
              {showAlternatives && (
                <div className="mt-2 flex flex-wrap gap-2">
                  {result.taxonomy.alternatives.map((alt, i) => (
                    <Badge key={i} variant="outline" className="font-body text-xs">
                      {alt.subcategory?.replace(/_/g, ' ')}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="h-px bg-border" />

          {/* Editable fields with confidence indicators */}
          <div className="space-y-3">
            {fields.map(({ key, label, value }) => {
              if (!value && !(key in editedFields)) return null
              const displayValue = (getEditedValue(key, value) ?? '').toString()
              const conf = getFieldConfidence(key)
              const isLow = conf !== undefined && conf < 0.5
              return (
                <div key={key} className="flex items-center gap-3">
                  <Label className="w-28 shrink-0 font-body text-sm text-muted-foreground">
                    {label}
                  </Label>
                  <div className="relative flex-1">
                    <Input
                      value={displayValue}
                      onChange={(e) => setEditedFields(prev => ({ ...prev, [key]: e.target.value }))}
                      className={cn(
                        "font-body text-sm",
                        isLow && !(key in editedFields) && "border-amber-500/50 ring-1 ring-amber-500/20"
                      )}
                      placeholder={isLow ? 'Please verify' : undefined}
                    />
                    <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
                      {conf !== undefined && !(key in editedFields) && (
                        <ConfidenceDot confidence={conf} />
                      )}
                      {!(key in editedFields) && (
                        <Badge className="bg-primary/20 px-1.5 py-0 font-body text-[10px] text-primary">
                          Draft
                        </Badge>
                      )}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Low confidence hint */}
          {isLowConfidence && (
            <p className="font-body text-xs text-amber-600 dark:text-amber-400">
              Fields with yellow borders had lower confidence. Please verify or correct them.
            </p>
          )}

          {/* Specs */}
          {specs.length > 0 && (
            <>
              <div className="h-px bg-border" />
              <div>
                <h3 className="mb-2 font-display text-sm font-semibold text-foreground">
                  Specifications
                </h3>
                <div className="grid gap-2 sm:grid-cols-2">
                  {specs.map(([key, value]) => (
                    <div key={key} className="flex items-center gap-2 rounded-md bg-surface px-3 py-2">
                      <span className="font-body text-xs text-muted-foreground capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </span>
                      <span className="font-body text-sm text-foreground">{value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Suggested description */}
          {result.listing.suggestedDescription && (
            <>
              <div className="h-px bg-border" />
              <div>
                <h3 className="mb-1 font-display text-sm font-semibold text-foreground">
                  Suggested Description
                </h3>
                <p className="font-body text-sm text-muted-foreground">
                  {result.listing.suggestedDescription}
                </p>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="flex items-center justify-between pt-2">
            <Button
              variant="outline"
              onClick={() => {
                setCurrentStep('capture')
                setResult(null)
                setEditedFields({})
                setProgress(0)
              }}
              className="font-body"
            >
              <RotateCcw className="mr-2 size-4" />
              Retake
            </Button>
            <Button onClick={handleApply} className="font-body">
              Apply to listing
              <ArrowRight className="ml-2 size-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return null
}
