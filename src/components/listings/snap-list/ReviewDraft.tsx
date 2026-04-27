"use client"

import { useRef, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { toast } from "sonner"
import { Trash2, Upload, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MultiPhotoUploader } from "@/components/upload/MultiPhotoUploader"
import { InlineEditField } from "./InlineEditField"
import { PriceSuggestionCard } from "./PriceSuggestionCard"
import { PhotoCoachCard } from "./PhotoCoachCard"
import { ClarifyingQuestion } from "./ClarifyingQuestion"
import { SpecsEditor } from "./SpecsEditor"
import {
  publishDraft,
  discardDraft,
  appendDraftPhotos,
} from "@/app/actions/snap-list-draft"
import type { SnapListDraft } from "@/lib/snap-list/types"

interface Props {
  draft: SnapListDraft
  currentUserId: string
}

const CONDITION_OPTIONS = [
  { value: "excellent", label: "Excellent — like new" },
  { value: "good", label: "Good — normal wear" },
  { value: "fair", label: "Fair — visible wear" },
  { value: "poor", label: "Poor — needs work" },
]

export function ReviewDraft({ draft, currentUserId }: Props) {
  const router = useRouter()
  const [photos, setPhotos] = useState<string[]>(draft.photoUrls)
  const [showUploader, setShowUploader] = useState(false)
  const [publishing, startPublish] = useTransition()

  const conf = draft.confidenceScores
  const fields = draft.fields

  const anyLowConfidence = Object.values(conf).some((c) => c < 0.55)

  const uploaderRef = useRef<HTMLDivElement | null>(null)
  const openUploader = () => {
    setShowUploader(true)
    // Next tick so the uploader is in the DOM before we scroll.
    requestAnimationFrame(() => {
      uploaderRef.current?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }

  const onPublish = () => {
    startPublish(async () => {
      const res = await publishDraft(draft.id)
      if ("error" in res) {
        toast.error(res.error)
        return
      }
      toast.success("Published! Your listing is live.")
      router.push(`/listings/${res.listingId}`)
    })
  }

  const onDiscard = async () => {
    if (!window.confirm("Discard this draft? This can't be undone.")) return
    const res = await discardDraft(draft.id)
    if ("error" in res) {
      toast.error(res.error)
      return
    }
    router.push("/listings")
  }

  const handleAddPhotos = async (allUrls: string[]) => {
    const added = allUrls.filter((u) => !photos.includes(u))
    if (added.length === 0) return
    setPhotos(allUrls)
    const res = await appendDraftPhotos(draft.id, added)
    if ("error" in res) {
      toast.error(res.error)
      setPhotos(photos)
    } else {
      toast.success(`Added ${added.length} photo${added.length === 1 ? "" : "s"}`)
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl overflow-x-hidden p-4 pb-[calc(env(safe-area-inset-bottom)+1.5rem)] md:pb-6">
      {/* Photo strip */}
      <div className="mb-4 flex gap-2 overflow-x-auto">
        {photos.map((url, i) => (
          <div
            key={url}
            className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md border bg-muted"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={url} alt={`Photo ${i + 1}`} className="h-full w-full object-cover" />
            {draft.nameplatePhotoIndex !== null && i === draft.nameplatePhotoIndex && (
              <span className="absolute left-1 top-1 rounded bg-primary px-1 text-[10px] font-medium text-primary-foreground">
                Nameplate
              </span>
            )}
            {i === 0 && (
              <span className="absolute right-1 top-1 rounded bg-black/70 px-1 text-[10px] font-medium text-white">
                Cover
              </span>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={() => (showUploader ? setShowUploader(false) : openUploader())}
          className="flex h-20 w-20 shrink-0 items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground hover:bg-muted/50"
        >
          <Upload className="h-5 w-5" />
        </button>
      </div>

      {showUploader && (
        <div
          ref={uploaderRef}
          className="mb-4 rounded-lg border bg-card p-3"
        >
          <MultiPhotoUploader
            maxFiles={15}
            uploadUrl="/api/listings/upload-media"
            uploadFields={{ listingId: draft.id }}
            existingUrls={photos}
            onComplete={handleAddPhotos}
            onRemove={(url) => {
              setPhotos((prev) => prev.filter((u) => u !== url))
            }}
            label="Add more photos"
          />
        </div>
      )}

      {anyLowConfidence && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
          <AlertTriangle className="mt-0.5 h-4 w-4 text-amber-600" />
          <div>
            <div className="font-medium text-amber-900 dark:text-amber-200">
              Please verify the fields with amber dots
            </div>
            <div className="text-amber-800/80 dark:text-amber-200/80">
              These had lower confidence — tap to edit. The dot clears when you confirm.
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-4">
          <InlineEditField
            draftId={draft.id}
            field="title"
            label="Title"
            value={fields.title}
            confidence={conf.suggested_title ?? 0}
            placeholder="e.g. 2018 Caterpillar 336 Excavator"
            hint="Tap to edit title"
          />

          {fields.tier1 && fields.tier2 && (
            <div className="rounded-md border bg-muted/30 px-3 py-2 text-xs">
              <span className="text-muted-foreground">Category:</span>{" "}
              <span className="font-medium">
                {fields.tier2} {fields.subcategory ? `→ ${fields.subcategory}` : ""}
              </span>
            </div>
          )}

          <InlineEditField
            draftId={draft.id}
            field="description"
            label="Description"
            value={fields.description}
            confidence={conf.suggested_description ?? 1.0}
            variant="textarea"
            placeholder="Describe the equipment, condition, and any recent maintenance."
            hint="Tap to edit description"
          />

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <InlineEditField
              draftId={draft.id}
              field="manufacturer"
              label="Manufacturer"
              value={fields.manufacturer}
              confidence={conf.manufacturer ?? 0}
            />
            <InlineEditField
              draftId={draft.id}
              field="model"
              label="Model"
              value={fields.model}
              confidence={conf.model ?? 0}
            />
            <InlineEditField
              draftId={draft.id}
              field="serialNumber"
              label="Serial number"
              value={fields.serialNumber}
              confidence={conf.serial_number ?? 0}
            />
            <InlineEditField
              draftId={draft.id}
              field="year"
              label="Year"
              value={fields.year}
              confidence={conf.year ?? 0}
              variant="number"
            />
            <InlineEditField
              draftId={draft.id}
              field="condition"
              label="Condition"
              value={fields.condition}
              confidence={conf.condition_estimate ?? 0}
              variant="select"
              options={CONDITION_OPTIONS}
            />
            <InlineEditField
              draftId={draft.id}
              field="locationCity"
              label="Location — city"
              value={fields.locationCity}
              confidence={1.0}
            />
            <InlineEditField
              draftId={draft.id}
              field="locationState"
              label="Location — state"
              value={fields.locationState}
              confidence={1.0}
            />
          </div>

          <SpecsEditor draftId={draft.id} specs={fields.specs ?? {}} />

          {draft.clarifyingQuestions.length > 0 && (
            <div className="space-y-2">
              {draft.clarifyingQuestions.map((q) => (
                <ClarifyingQuestion
                  key={q.field}
                  draftId={draft.id}
                  ownerId={currentUserId}
                  field={q.field}
                  question={q.question}
                  options={q.options}
                />
              ))}
            </div>
          )}

          {draft.stockPhotoMatches.length > 0 && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
              <div className="font-medium text-amber-900 dark:text-amber-200">
                Heads up — these photos appear on other websites.
              </div>
              <div className="mt-1 text-xs text-amber-800/80 dark:text-amber-200/80">
                If you took these yourself, ignore this. Otherwise, upload original photos to maintain buyer trust.
              </div>
            </div>
          )}
        </div>

        <aside className="min-w-0 space-y-4">
          <div className="rounded-lg border bg-card p-3">
            <InlineEditField
              draftId={draft.id}
              field="askingPrice"
              label="Your asking price"
              value={fields.askingPrice}
              confidence={1.0}
              variant="number"
              placeholder={
                fields.priceSuggestion?.median
                  ? `Suggested: $${Math.round(fields.priceSuggestion.median / 100).toLocaleString()}`
                  : "e.g. 12500"
              }
              displayPrefix="$"
              hint="Tap to set price"
            />
          </div>
          <PriceSuggestionCard price={fields.priceSuggestion} />
          <PhotoCoachCard
            draftId={draft.id}
            ownerId={currentUserId}
            coach={draft.photoCoach}
            onAddPhoto={openUploader}
          />
        </aside>
      </div>

      {/* Action bar — inline, not fixed. On mobile the extra margin-bottom
          clears the MobileBottomNav (56px + safe-area-inset-bottom). */}
      <div className="mt-8 mb-[calc(env(safe-area-inset-bottom)+4rem)] rounded-lg border bg-card p-3 md:mb-0 md:border-0 md:bg-transparent md:p-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button
            type="button"
            onClick={onDiscard}
            className="inline-flex items-center justify-center gap-1 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-muted"
          >
            <Trash2 className="h-4 w-4" /> Discard
          </button>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href="/listings"
              className="rounded-md px-3 py-2 text-center text-sm text-muted-foreground hover:bg-muted"
            >
              Save for later
            </Link>
            <Button
              onClick={onPublish}
              disabled={publishing}
              size="lg"
              className="w-full bg-[#FF6B2B] text-white hover:bg-[#e65a1e] sm:w-auto"
            >
              {publishing ? "Publishing…" : "Publish listing"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
