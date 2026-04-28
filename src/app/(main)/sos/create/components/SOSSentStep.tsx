'use client'

import { CheckCircle, Radio } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { SuggestionFeedbackChip } from '@/components/feedback/SuggestionFeedbackChip'

interface AnalysisFeedbackFields {
  manufacturer: string | null
  model: string | null
  equipmentType: string | null
  category: string | null
  subcategory: string | null
  registryManufacturerId?: string | null
  registryManufacturerModelId?: string | null
}

interface SOSSentStepProps {
  vendorsNotified: number
  sosTitle?: string
  transportIncluded?: boolean
  /** SOS row id — required for feedback chips. Null when not yet created. */
  sosId?: string | null
  /** AI-suggested fields, used to render feedback chips post-send. */
  analysisFields?: AnalysisFeedbackFields | null
  onReset: () => void
}

export function SOSSentStep({
  vendorsNotified,
  sosTitle,
  transportIncluded = false,
  sosId = null,
  analysisFields = null,
  onReset,
}: SOSSentStepProps) {
  const haveCount = vendorsNotified > 0
  const showFeedback =
    sosId !== null &&
    analysisFields !== null &&
    (analysisFields.manufacturer ||
      analysisFields.model ||
      analysisFields.equipmentType ||
      analysisFields.category)

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-green-500/10">
        <CheckCircle className="size-10 text-green-500" />
      </div>

      <h2 className="font-display text-2xl font-bold text-foreground">
        SOS Broadcast Sent
      </h2>

      <p className="mt-2 max-w-sm font-body text-sm text-muted-foreground">
        Your SOS is live and being matched to vendors now.
      </p>

      {sosTitle && (
        <p className="mt-3 font-display text-base font-semibold text-foreground">
          &ldquo;{sosTitle}&rdquo;
        </p>
      )}

      {haveCount ? (
        <p className="mt-2 font-body text-xs text-muted-foreground">
          Delivered to {vendorsNotified} matching vendor
          {vendorsNotified === 1 ? '' : 's'}.
        </p>
      ) : (
        <p className="mt-2 font-body text-xs text-muted-foreground">
          Vendors will be notified as they come online.
        </p>
      )}

      {transportIncluded && (
        <div className="mt-6 flex max-w-md items-start gap-3 rounded-lg border-l-4 border-[#FF6B2B] bg-orange-50 px-4 py-3 text-left dark:bg-orange-950/20">
          <Radio className="mt-0.5 size-4 shrink-0 text-[#FF6B2B]" />
          <p className="font-body text-xs text-foreground">
            Nice work — you just sent one SOS that covers equipment, repair, AND logistics. Vendors will reach out directly by phone, text, or email.
          </p>
        </div>
      )}

      {showFeedback && sosId && analysisFields && (
        <div className="mt-8 w-full max-w-md rounded-lg border border-border bg-card p-4 text-left">
          <p className="font-body text-sm font-medium text-foreground">
            How did we do on the auto-fill?
          </p>
          <p className="mt-1 font-body text-xs text-muted-foreground">
            Quick feedback helps us tune the photo analysis. Skip if you&apos;re in a hurry.
          </p>

          <div className="mt-3 space-y-2.5">
            {analysisFields.manufacturer && (
              <FeedbackRow label="Manufacturer" value={analysisFields.manufacturer}>
                <SuggestionFeedbackChip
                  kind="registry"
                  suggestedValue={analysisFields.manufacturer}
                  currentValue={analysisFields.manufacturer}
                  fieldName="manufacturer"
                  surface="sos_analysis"
                  sourceTable="sos_requests"
                  sourceRowId={sosId}
                  suggestedManufacturerId={analysisFields.registryManufacturerId}
                />
              </FeedbackRow>
            )}
            {analysisFields.model && (
              <FeedbackRow label="Model" value={analysisFields.model}>
                <SuggestionFeedbackChip
                  kind="registry"
                  suggestedValue={analysisFields.model}
                  currentValue={analysisFields.model}
                  fieldName="model"
                  surface="sos_analysis"
                  sourceTable="sos_requests"
                  sourceRowId={sosId}
                  suggestedManufacturerId={analysisFields.registryManufacturerId}
                  suggestedModelId={analysisFields.registryManufacturerModelId}
                />
              </FeedbackRow>
            )}
            {analysisFields.equipmentType && (
              <FeedbackRow label="Equipment type" value={analysisFields.equipmentType}>
                <SuggestionFeedbackChip
                  suggestedValue={analysisFields.equipmentType}
                  currentValue={analysisFields.equipmentType}
                  fieldName="equipment_type"
                  surface="sos_analysis"
                  sourceTable="sos_requests"
                  sourceRowId={sosId}
                />
              </FeedbackRow>
            )}
            {analysisFields.category && (
              <FeedbackRow label="Category" value={analysisFields.category}>
                <SuggestionFeedbackChip
                  suggestedValue={analysisFields.category}
                  currentValue={analysisFields.category}
                  fieldName="taxonomy_tier2"
                  surface="sos_analysis"
                  sourceTable="sos_requests"
                  sourceRowId={sosId}
                />
              </FeedbackRow>
            )}
          </div>
        </div>
      )}

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <Button
          asChild
          className="gap-2 bg-[#FF6B2B] text-white hover:bg-[#FF6B2B]/90"
        >
          <Link href="/sos">View My SOS</Link>
        </Button>
        <Button variant="outline" onClick={onReset}>
          Send Another
        </Button>
      </div>
    </div>
  )
}

function FeedbackRow({
  label,
  value,
  children,
}: {
  label: string
  value: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2 last:border-0 last:pb-0">
      <div className="min-w-0 flex-1">
        <span className="font-body text-xs text-muted-foreground">{label}: </span>
        <span className="font-body text-sm font-medium text-foreground">{value}</span>
      </div>
      {children}
    </div>
  )
}
