'use client'

import { useState, useCallback } from 'react'
import { SOSCaptureStep } from './SOSCaptureStep'
import { SOSProcessingStep } from './SOSProcessingStep'
import { SOSConfirmStep } from './SOSConfirmStep'
import { SOSSentStep } from './SOSSentStep'
import type { AIAnalysisResult } from '@/types/ai-analysis'

type Step = 'capture' | 'processing' | 'confirm' | 'sent'

interface SOSCameraFirstState {
  step: Step
  capturedFiles: File[]
  uploadedMediaUrls: string[]
  aiEquipmentType: string
  aiManufacturer: string
  aiModel: string
  aiTaxonomyTier1: string
  aiTaxonomyTier2: string
  aiSubcategory: string
  aiSuggestedDescription: string
  aiConfidence: number
  /** Equipment Registry FK (Cycle 61b) — only set on confident matches. */
  registryManufacturerId: string | null
  registryManufacturerModelId: string | null
  description: string
  urgency: 'normal' | 'critical'
  brandPreference: string
  quantity: number | null
  budget: string
  transportNeeded: boolean
  sosId: string | null
  sentTitle: string
  sentTransport: boolean
  vendorsNotified: number
}

const initialState: SOSCameraFirstState = {
  step: 'capture',
  capturedFiles: [],
  uploadedMediaUrls: [],
  aiEquipmentType: '',
  aiManufacturer: '',
  aiModel: '',
  aiTaxonomyTier1: '',
  aiTaxonomyTier2: '',
  aiSubcategory: '',
  aiSuggestedDescription: '',
  aiConfidence: 0,
  registryManufacturerId: null,
  registryManufacturerModelId: null,
  description: '',
  urgency: 'normal',
  brandPreference: '',
  quantity: null,
  budget: '',
  transportNeeded: false,
  sosId: null,
  sentTitle: '',
  sentTransport: false,
  vendorsNotified: 0,
}

interface SOSCameraFirstFlowProps {
  onSkipToText: () => void
}

export function SOSCameraFirstFlow({ onSkipToText }: SOSCameraFirstFlowProps) {
  const [state, setState] = useState<SOSCameraFirstState>(initialState)

  const handleProcessingComplete = useCallback((aiResult: AIAnalysisResult | null, urls: string[]) => {
    const equipmentType = aiResult?.listing?.title || ''
    const manufacturer = aiResult?.listing?.manufacturer || ''
    const model = aiResult?.listing?.model || ''
    const tier1 = aiResult?.taxonomy?.tier1 || ''
    const tier2 = aiResult?.taxonomy?.tier2 || ''
    const subcategory = aiResult?.taxonomy?.subcategory || ''
    const confidence = aiResult?.overallConfidence ?? 0
    // Cycle 61b — only carry forward FKs at high registry confidence so we
    // never tag an SOS with a low-confidence guess.
    const reg = aiResult?.registryMatch ?? null
    const registryManufacturerId =
      reg && reg.confidence >= 0.9 ? reg.manufacturerId : null
    const registryManufacturerModelId =
      reg && reg.confidence >= 0.9 ? reg.manufacturerModelId : null

    // Build suggested description
    const parts = [equipmentType, manufacturer, model].filter(Boolean)
    const prefix = parts.length > 0 ? parts.join(' — ') : ''
    const suggestedDescription = prefix
      ? `${prefix}. Describe the issue below.`
      : ''

    setState(s => ({
      ...s,
      step: 'confirm',
      uploadedMediaUrls: urls,
      aiEquipmentType: equipmentType,
      aiManufacturer: manufacturer,
      aiModel: model,
      aiTaxonomyTier1: tier1,
      aiTaxonomyTier2: tier2,
      aiSubcategory: subcategory,
      aiSuggestedDescription: suggestedDescription,
      aiConfidence: confidence,
      registryManufacturerId,
      registryManufacturerModelId,
      description: suggestedDescription,
      brandPreference: manufacturer,
    }))
  }, [])

  const handleProcessingError = useCallback(() => {
    setState(s => ({ ...s, step: 'capture' }))
  }, [])

  return (
    <>
      {state.step === 'capture' && (
        <SOSCaptureStep
          capturedFiles={state.capturedFiles}
          onFilesChange={(files) => setState(s => ({ ...s, capturedFiles: files }))}
          onAnalyze={() => setState(s => ({ ...s, step: 'processing' }))}
          onSkip={onSkipToText}
        />
      )}

      {state.step === 'processing' && (
        <SOSProcessingStep
          files={state.capturedFiles}
          onComplete={handleProcessingComplete}
          onError={handleProcessingError}
        />
      )}

      {state.step === 'confirm' && (
        <SOSConfirmStep
          uploadedMediaUrls={state.uploadedMediaUrls}
          description={state.description}
          urgency={state.urgency}
          brandPreference={state.brandPreference}
          quantity={state.quantity}
          budget={state.budget}
          transportNeeded={state.transportNeeded}
          aiTaxonomyTier1={state.aiTaxonomyTier1}
          aiTaxonomyTier2={state.aiTaxonomyTier2}
          aiSubcategory={state.aiSubcategory}
          aiManufacturer={state.aiManufacturer}
          aiModel={state.aiModel}
          aiEquipmentType={state.aiEquipmentType}
          aiConfidence={state.aiConfidence}
          registryManufacturerId={state.registryManufacturerId}
          registryManufacturerModelId={state.registryManufacturerModelId}
          onChange={(partial) => setState(s => ({ ...s, ...partial }))}
          onBack={() => setState(s => ({ ...s, step: 'capture', capturedFiles: [], uploadedMediaUrls: [] }))}
          onSubmit={(sosId, vendorCount, sentTitle) =>
            setState(s => ({
              ...s,
              step: 'sent',
              sosId,
              vendorsNotified: vendorCount,
              sentTitle: sentTitle ?? '',
              sentTransport: s.transportNeeded,
            }))
          }
        />
      )}

      {state.step === 'sent' && (
        <SOSSentStep
          vendorsNotified={state.vendorsNotified}
          sosTitle={state.sentTitle || undefined}
          transportIncluded={state.sentTransport}
          sosId={state.sosId}
          analysisFields={{
            manufacturer: state.aiManufacturer || null,
            model: state.aiModel || null,
            equipmentType: state.aiEquipmentType || null,
            category: state.aiTaxonomyTier2 || null,
            subcategory: state.aiSubcategory || null,
            registryManufacturerId: state.registryManufacturerId,
            registryManufacturerModelId: state.registryManufacturerModelId,
          }}
          onReset={() => setState({ ...initialState })}
        />
      )}
    </>
  )
}
