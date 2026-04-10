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
  description: string
  urgency: 'normal' | 'critical'
  brandPreference: string
  quantity: number | null
  budget: string
  transportNeeded: boolean
  sosId: string | null
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
  description: '',
  urgency: 'normal',
  brandPreference: '',
  quantity: null,
  budget: '',
  transportNeeded: false,
  sosId: null,
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
          onChange={(partial) => setState(s => ({ ...s, ...partial }))}
          onBack={() => setState(s => ({ ...s, step: 'capture', capturedFiles: [], uploadedMediaUrls: [] }))}
          onSubmit={(sosId, vendorCount) =>
            setState(s => ({ ...s, step: 'sent', sosId, vendorsNotified: vendorCount }))
          }
        />
      )}

      {state.step === 'sent' && (
        <SOSSentStep
          vendorsNotified={state.vendorsNotified}
          onReset={() => setState({ ...initialState })}
        />
      )}
    </>
  )
}
