'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ChevronLeft,
  ChevronRight,
  HardHat,
  Repeat,
  Wrench,
  Truck,
  Check,
  Bell,
  User,
  Loader2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { getOnboardingPrefill, submitOnboarding } from '@/app/actions/onboarding'
import {
  ONBOARDING_INDUSTRIES,
  OPERATOR_SUB_ROLES,
  SOURCING_METHODS,
  TRADING_ACTIVITY_OPTIONS,
  MONTHLY_VOLUME_OPTIONS,
  SERVICE_TYPE_OPTIONS,
  SERVICE_AREA_OPTIONS,
  LOGISTICS_CAPABILITIES,
  LOGISTICS_COVERAGE_OPTIONS,
  FLEET_SIZE_OPTIONS,
  INITIAL_ONBOARDING_DATA,
} from '@/lib/constants/onboarding'
import type { OnboardingFormData, Archetype } from '@/lib/constants/onboarding'
import { EQUIPMENT_TAXONOMY, getTier2Label } from '@/lib/constants/equipment-taxonomy'

const TOTAL_STEPS = 5

// Collect all Tier 2 groups for the equipment picker
const ALL_TIER2_GROUPS = EQUIPMENT_TAXONOMY.flatMap((bucket) =>
  bucket.groups.map((g) => ({ id: g.id, label: g.label, tier1Label: bucket.label }))
)

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [formData, setFormData] = useState<OnboardingFormData>({ ...INITIAL_ONBOARDING_DATA })

  useEffect(() => {
    async function loadPrefill() {
      try {
        const result = await getOnboardingPrefill()
        if (result.prefill) {
          setFormData((prev) => ({
            ...prev,
            display_name: result.prefill.display_name || '',
            company_name: result.prefill.company_name || '',
            city: result.prefill.city || '',
            state: result.prefill.state || '',
            phone: result.prefill.phone || '',
            contact_visibility: (result.prefill.contact_visibility as 'pro_plus' | 'public' | 'hidden') || 'pro_plus',
          }))
        }
      } catch {
        // Silent fail — prefill is optional
      } finally {
        setLoading(false)
      }
    }
    loadPrefill()
  }, [])

  function canProceed(): boolean {
    switch (currentStep) {
      case 1:
        return formData.archetype !== null
      case 2:
        return formData.industries.length > 0
      case 3:
        // Role-specific step — always optional (skippable)
        return true
      case 4:
        return true
      case 5:
        return !!(formData.company_name.trim() && formData.city.trim() && formData.state.trim())
      default:
        return false
    }
  }

  function handleNext() {
    if (currentStep < TOTAL_STEPS) {
      setCurrentStep((s) => s + 1)
    }
  }

  function handleBack() {
    if (currentStep > 1) {
      setCurrentStep((s) => s - 1)
    }
  }

  async function handleSubmit() {
    if (!canProceed()) return

    setSubmitting(true)
    try {
      const result = await submitOnboarding(formData)
      if (result.error) {
        toast.error(result.error)
        setSubmitting(false)
        return
      }
      toast.success('Welcome to Metal Gear!')
      // Redirect to dashboard — middleware will route to /companies/new if needed
      // onboarded param triggers notification education modal on first load
      window.location.href = '/dashboard?onboarded=true'
    } catch {
      toast.error('Something went wrong. Please try again.')
      setSubmitting(false)
    }
  }

  function toggleArrayItem(field: keyof OnboardingFormData, value: string) {
    setFormData((prev) => {
      const arr = prev[field] as string[]
      return {
        ...prev,
        [field]: arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value],
      }
    })
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6 sm:py-10">
      {/* Progress indicator */}
      <div className="mb-6 flex items-center justify-between text-sm text-muted-foreground">
        <span>Step {currentStep} of {TOTAL_STEPS}</span>
        <div className="flex gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
            <div
              key={i}
              className={`h-1.5 w-8 rounded-full transition-colors ${
                i < currentStep ? 'bg-primary' : 'bg-muted'
              }`}
            />
          ))}
        </div>
      </div>

      {/* Step content */}
      <div className="flex-1">
        {currentStep === 1 && <StepArchetype formData={formData} setFormData={setFormData} />}
        {currentStep === 2 && <StepIndustries formData={formData} setFormData={setFormData} toggleArrayItem={toggleArrayItem} />}
        {currentStep === 3 && <StepRoleSpecific formData={formData} setFormData={setFormData} toggleArrayItem={toggleArrayItem} />}
        {currentStep === 4 && <StepSOSTransparency formData={formData} setFormData={setFormData} />}
        {currentStep === 5 && <StepProfile formData={formData} setFormData={setFormData} />}
      </div>

      {/* Navigation buttons */}
      <div className="mt-8 flex items-center justify-between gap-4">
        {currentStep > 1 ? (
          <Button variant="ghost" onClick={handleBack} className="gap-2">
            <ChevronLeft className="h-4 w-4" />
            Back
          </Button>
        ) : (
          <div />
        )}

        {currentStep < TOTAL_STEPS ? (
          <Button onClick={handleNext} disabled={!canProceed()} className="gap-2">
            Continue
            <ChevronRight className="h-4 w-4" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={!canProceed() || submitting} className="gap-2">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              'Finish Setup'
            )}
          </Button>
        )}
      </div>
    </div>
  )
}

// ─── Step 1: Archetype Selection ──────────────────────────────────────

function StepArchetype({
  formData,
  setFormData,
}: {
  formData: OnboardingFormData
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>
}) {
  const archetypes: { id: Archetype; icon: typeof HardHat; name: string; description: string; examples: string; badge?: string }[] = [
    {
      id: 'operator',
      icon: HardHat,
      name: 'Operator',
      description: 'You run facilities and need equipment to keep them running.',
      examples: 'Plant managers, maintenance managers, process engineers, procurement',
    },
    {
      id: 'trader',
      icon: Repeat,
      name: 'Trader',
      description: 'You buy and sell equipment as your business.',
      examples: 'Dealers, rebuilders, rental companies, surplus buyers, resellers',
    },
    {
      id: 'service_provider',
      icon: Wrench,
      name: 'Service Provider',
      description: 'You provide services that support equipment transactions.',
      examples: 'Rigging, crane, machine shop, demolition, scrap, inspection, fabrication',
    },
    {
      id: 'logistics',
      icon: Truck,
      name: 'Logistics',
      description: 'You move heavy equipment — fleet company or independent driver.',
      examples: 'Flatbed fleets, lowboy operators, crane trucks, owner-operators',
      badge: 'No listing tools',
    },
  ]

  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-bold sm:text-3xl">What best describes you?</h1>
      <p className="mb-8 text-muted-foreground">Choose the role that fits your primary activity. You can update this later.</p>

      <div className="grid gap-4 sm:grid-cols-2">
        {archetypes.map((arch) => {
          const Icon = arch.icon
          const selected = formData.archetype === arch.id
          return (
            <button
              key={arch.id}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, archetype: arch.id }))}
              className={`flex items-start gap-4 rounded-xl border-2 p-5 text-left transition-all ${
                selected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <div
                className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${
                  selected ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
                }`}
              >
                <Icon className="h-6 w-6" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-lg font-semibold">{arch.name}</span>
                  {selected && <Check className="h-5 w-5 text-primary" />}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{arch.description}</p>
                <p className="mt-2 text-xs text-muted-foreground/70">{arch.examples}</p>
                {arch.badge && (
                  <span className="mt-2 inline-block rounded bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
                    {arch.badge}
                  </span>
                )}
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Step 2: Industries ───────────────────────────────────────────────

function StepIndustries({
  formData,
  setFormData,
  toggleArrayItem,
}: {
  formData: OnboardingFormData
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>
  toggleArrayItem: (field: keyof OnboardingFormData, value: string) => void
}) {
  const showOther = formData.industries.includes('Other')

  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-bold sm:text-3xl">Which industries do you work in?</h1>
      <p className="mb-8 text-muted-foreground">Select all that apply. This helps us personalize your experience.</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {ONBOARDING_INDUSTRIES.map((industry) => {
          const selected = formData.industries.includes(industry)
          return (
            <button
              key={industry}
              type="button"
              onClick={() => toggleArrayItem('industries', industry)}
              className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                selected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-foreground hover:border-primary/40'
              }`}
            >
              {industry}
            </button>
          )
        })}
      </div>

      {showOther && (
        <div className="mt-4">
          <Input
            placeholder="Specify your industry..."
            value={formData.industries_other}
            onChange={(e) => setFormData((prev) => ({ ...prev, industries_other: e.target.value }))}
            className="max-w-sm"
          />
        </div>
      )}
    </div>
  )
}

// ─── Step 3: Role-Specific ────────────────────────────────────────────

function StepRoleSpecific({
  formData,
  setFormData,
  toggleArrayItem,
}: {
  formData: OnboardingFormData
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>
  toggleArrayItem: (field: keyof OnboardingFormData, value: string) => void
}) {
  if (formData.archetype === 'operator') return <OperatorBranch formData={formData} setFormData={setFormData} toggleArrayItem={toggleArrayItem} />
  if (formData.archetype === 'trader') return <TraderBranch formData={formData} setFormData={setFormData} toggleArrayItem={toggleArrayItem} />
  if (formData.archetype === 'service_provider') return <ServiceProviderBranch formData={formData} setFormData={setFormData} toggleArrayItem={toggleArrayItem} />
  if (formData.archetype === 'logistics') return <LogisticsBranch formData={formData} setFormData={setFormData} toggleArrayItem={toggleArrayItem} />

  return null
}

function OperatorBranch({
  formData,
  setFormData,
  toggleArrayItem,
}: {
  formData: OnboardingFormData
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>
  toggleArrayItem: (field: keyof OnboardingFormData, value: string) => void
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 font-display text-2xl font-bold sm:text-3xl">Tell us about your role</h1>
        <p className="mb-6 text-muted-foreground">This helps us match you with the right equipment and alerts.</p>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {OPERATOR_SUB_ROLES.map((role) => {
            const selected = formData.sub_role === role.id
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, sub_role: role.id }))}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-foreground hover:border-primary/40'
                }`}
              >
                {role.label}
              </button>
            )
          })}
        </div>
      </div>

      <EquipmentPicker
        label="What types of equipment are in your facility?"
        selected={formData.equipment_tier2s}
        onToggle={(id) => toggleArrayItem('equipment_tier2s', id)}
      />

      <div>
        <h2 className="mb-1 text-lg font-semibold">How do you typically source equipment?</h2>
        <p className="mb-4 text-sm text-muted-foreground">Select all that apply.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {SOURCING_METHODS.map((method) => {
            const selected = formData.sourcing_methods.includes(method.id)
            return (
              <button
                key={method.id}
                type="button"
                onClick={() => toggleArrayItem('sourcing_methods', method.id)}
                className={`rounded-lg border-2 px-4 py-3 text-left text-sm font-medium transition-all ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-foreground hover:border-primary/40'
                }`}
              >
                {method.label}
              </button>
            )
          })}
        </div>
      </div>

      <SkipLink />
    </div>
  )
}

function TraderBranch({
  formData,
  setFormData,
  toggleArrayItem,
}: {
  formData: OnboardingFormData
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>
  toggleArrayItem: (field: keyof OnboardingFormData, value: string) => void
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 font-display text-2xl font-bold sm:text-3xl">How do you operate?</h1>
        <p className="mb-6 text-muted-foreground">Select all that apply to your business.</p>

        <div className="grid grid-cols-2 gap-3">
          {TRADING_ACTIVITY_OPTIONS.map((opt) => {
            const selected = formData.trading_activities.includes(opt.id)
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleArrayItem('trading_activities', opt.id)}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-foreground hover:border-primary/40'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <EquipmentPicker
        label="What equipment do you specialize in?"
        selected={formData.equipment_tier2s}
        onToggle={(id) => toggleArrayItem('equipment_tier2s', id)}
      />

      <div>
        <h2 className="mb-1 text-lg font-semibold">How many units do you typically handle per month?</h2>
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {MONTHLY_VOLUME_OPTIONS.map((opt) => {
            const selected = formData.monthly_volume === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, monthly_volume: opt.id }))}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-foreground hover:border-primary/40'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <SkipLink />
    </div>
  )
}

function ServiceProviderBranch({
  formData,
  setFormData,
  toggleArrayItem,
}: {
  formData: OnboardingFormData
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>
  toggleArrayItem: (field: keyof OnboardingFormData, value: string) => void
}) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="mb-2 font-display text-2xl font-bold sm:text-3xl">What type of services do you provide?</h1>
        <p className="mb-6 text-muted-foreground">Select all that apply.</p>

        <div className="grid grid-cols-2 gap-3">
          {SERVICE_TYPE_OPTIONS.map((opt) => {
            const selected = formData.service_types.includes(opt.id)
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => toggleArrayItem('service_types', opt.id)}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-foreground hover:border-primary/40'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <div>
        <h2 className="mb-1 text-lg font-semibold">What is your service area?</h2>
        <div className="mt-4 grid grid-cols-2 gap-3">
          {SERVICE_AREA_OPTIONS.map((opt) => {
            const selected = formData.service_area === opt.id
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, service_area: opt.id }))}
                className={`rounded-lg border-2 px-4 py-3 text-sm font-medium transition-all ${
                  selected
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border text-foreground hover:border-primary/40'
                }`}
              >
                {opt.label}
              </button>
            )
          })}
        </div>
      </div>

      <EquipmentPicker
        label="What equipment types do your services support?"
        selected={formData.equipment_tier2s}
        onToggle={(id) => toggleArrayItem('equipment_tier2s', id)}
      />

      <SkipLink />
    </div>
  )
}

function LogisticsBranch({
  formData,
  setFormData,
  toggleArrayItem,
}: {
  formData: OnboardingFormData
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>
  toggleArrayItem: (field: keyof OnboardingFormData, value: string) => void
}) {
  return (
    <div className="space-y-8">
      <h1 className="mb-2 font-display text-2xl font-bold sm:text-3xl">Tell us about your logistics operation</h1>

      {/* Sub-type */}
      <div>
        <Label className="text-base font-medium">I am a…</Label>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {[
            { id: 'fleet' as const, label: 'Fleet Company', desc: 'Multiple trucks / equipment' },
            { id: 'individual' as const, label: 'Individual Driver', desc: 'Owner-operator' },
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, logistics_type: t.id }))}
              className={`rounded-lg border-2 p-4 text-left transition-all ${
                formData.logistics_type === t.id
                  ? 'border-primary bg-primary/5'
                  : 'border-border hover:border-primary/40'
              }`}
            >
              <div className="font-medium">{t.label}</div>
              <div className="mt-1 text-xs text-muted-foreground">{t.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* Fleet size (conditional) */}
      {formData.logistics_type === 'fleet' && (
        <div>
          <Label className="text-base font-medium">Fleet size</Label>
          <div className="mt-3 flex flex-wrap gap-2">
            {FLEET_SIZE_OPTIONS.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, fleet_size: s.id }))}
                className={`rounded-full border-2 px-4 py-2 text-sm transition-all ${
                  formData.fleet_size === s.id
                    ? 'border-primary bg-primary/10 font-medium text-primary'
                    : 'border-border text-foreground hover:border-primary/40'
                }`}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Equipment capabilities */}
      <div>
        <Label className="text-base font-medium">What can you haul? <span className="text-sm font-normal text-muted-foreground">(select all)</span></Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {LOGISTICS_CAPABILITIES.map((cap) => (
            <button
              key={cap.id}
              type="button"
              onClick={() => toggleArrayItem('equipment_capabilities', cap.id)}
              className={`rounded-full border-2 px-4 py-2 text-sm transition-all ${
                formData.equipment_capabilities.includes(cap.id)
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'border-border text-foreground hover:border-primary/40'
              }`}
            >
              {cap.label}
            </button>
          ))}
        </div>
      </div>

      {/* Coverage area */}
      <div>
        <Label className="text-base font-medium">Coverage area</Label>
        <div className="mt-3 flex flex-wrap gap-2">
          {LOGISTICS_COVERAGE_OPTIONS.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, logistics_coverage: c.id }))}
              className={`rounded-full border-2 px-4 py-2 text-sm transition-all ${
                formData.logistics_coverage === c.id
                  ? 'border-primary bg-primary/10 font-medium text-primary'
                  : 'border-border text-foreground hover:border-primary/40'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Service states */}
      <div>
        <Label className="text-base font-medium">States / regions you serve</Label>
        <Input
          className="mt-2"
          value={formData.service_area}
          onChange={(e) => setFormData((prev) => ({ ...prev, service_area: e.target.value }))}
          placeholder="e.g. TX, LA, OK, Gulf Coast"
        />
      </div>

      {/* DOT/MC number */}
      <div>
        <Label className="text-base font-medium">DOT or MC number <span className="text-sm font-normal text-muted-foreground">(optional)</span></Label>
        <Input
          className="mt-2"
          value={formData.dot_mc_number}
          onChange={(e) => setFormData((prev) => ({ ...prev, dot_mc_number: e.target.value }))}
          placeholder="e.g. MC-123456"
        />
      </div>
    </div>
  )
}

// ─── Equipment Picker (shared across branches) ───────────────────────

function EquipmentPicker({
  label,
  selected,
  onToggle,
}: {
  label: string
  selected: string[]
  onToggle: (id: string) => void
}) {
  const [expanded, setExpanded] = useState(false)
  const visibleGroups = expanded ? ALL_TIER2_GROUPS : ALL_TIER2_GROUPS.slice(0, 12)

  return (
    <div>
      <h2 className="mb-1 text-lg font-semibold">{label}</h2>
      <p className="mb-4 text-sm text-muted-foreground">
        Select all that apply.{' '}
        {selected.length > 0 && (
          <span className="text-primary">{selected.length} selected</span>
        )}
      </p>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {visibleGroups.map((group) => {
          const isSelected = selected.includes(group.id)
          return (
            <button
              key={group.id}
              type="button"
              onClick={() => onToggle(group.id)}
              className={`rounded-lg border-2 px-3 py-2.5 text-left text-xs font-medium transition-all sm:text-sm ${
                isSelected
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-foreground hover:border-primary/40'
              }`}
            >
              {group.label}
            </button>
          )
        })}
      </div>

      {ALL_TIER2_GROUPS.length > 12 && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="mt-3 text-sm font-medium text-primary hover:underline"
        >
          {expanded ? 'Show less' : `Show all ${ALL_TIER2_GROUPS.length} categories`}
        </button>
      )}
    </div>
  )
}

function SkipLink() {
  return (
    <p className="text-center text-sm text-muted-foreground">
      Not sure yet?{' '}
      <span className="text-primary">These questions are optional</span> — you can skip ahead.
    </p>
  )
}

// ─── Step 4: SOS & Transparency ───────────────────────────────────────

function StepSOSTransparency({
  formData,
  setFormData,
}: {
  formData: OnboardingFormData
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>
}) {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="mb-2 font-display text-2xl font-bold sm:text-3xl">Alerts & Visibility</h1>
        <p className="mb-8 text-muted-foreground">Configure how you want to be reached on the platform.</p>
      </div>

      {/* SOS Alerts */}
      <div className="rounded-xl border border-border p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-[#FF6B2B]" />
              <h2 className="text-lg font-semibold">SOS Alerts</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              SOS alerts notify you when someone urgently needs equipment or services matching your profile.
              High-value opportunities often go to whoever responds first.
            </p>
          </div>
          <Switch
            checked={formData.sos_opted_in}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, sos_opted_in: checked }))}
          />
        </div>
      </div>

      {/* Contact Visibility */}
      <div className="rounded-xl border border-border p-5">
        <div className="flex items-center gap-2 mb-4">
          <User className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Contact Visibility</h2>
        </div>
        <p className="mb-4 text-sm text-muted-foreground">
          Are you open to being contacted directly by other members?
        </p>

        <div className="space-y-3">
          {[
            {
              value: 'pro_plus' as const,
              label: 'Show my contact info to Pro members and above',
              description: 'Pro, Business, and Enterprise subscribers can see your phone and email',
            },
            {
              value: 'public' as const,
              label: 'Show my contact info to everyone',
              description: 'Any logged-in member can see your phone and email',
            },
            {
              value: 'hidden' as const,
              label: 'Keep me reachable via internal messaging only',
              description: 'Your contact details won\'t be shown on your listings',
            },
          ].map((opt) => {
            const selected = formData.contact_visibility === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setFormData((prev) => ({ ...prev, contact_visibility: opt.value }))}
                className={`w-full rounded-lg border-2 p-4 text-left transition-all ${
                  selected ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      selected ? 'border-primary bg-primary' : 'border-muted-foreground/30'
                    }`}
                  >
                    {selected && <div className="h-2 w-2 rounded-full bg-primary-foreground" />}
                  </div>
                  <div>
                    <span className="text-sm font-medium">{opt.label}</span>
                    <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ─── Step 5: Profile Completion ───────────────────────────────────────

function StepProfile({
  formData,
  setFormData,
}: {
  formData: OnboardingFormData
  setFormData: React.Dispatch<React.SetStateAction<OnboardingFormData>>
}) {
  return (
    <div>
      <h1 className="mb-2 font-display text-2xl font-bold sm:text-3xl">Almost done — set up your profile</h1>
      <p className="mb-8 text-muted-foreground">This information will be visible on your listings and storefront.</p>

      <div className="space-y-5">
        <div>
          <Label htmlFor="display_name">Display Name</Label>
          <Input
            id="display_name"
            value={formData.display_name}
            onChange={(e) => setFormData((prev) => ({ ...prev, display_name: e.target.value }))}
            placeholder="Your name"
            className="mt-1.5"
          />
        </div>

        <div>
          <Label htmlFor="company_name">
            Company Name <span className="text-destructive">*</span>
          </Label>
          <Input
            id="company_name"
            value={formData.company_name}
            onChange={(e) => setFormData((prev) => ({ ...prev, company_name: e.target.value }))}
            placeholder="Your company"
            className="mt-1.5"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="city">
              City <span className="text-destructive">*</span>
            </Label>
            <Input
              id="city"
              value={formData.city}
              onChange={(e) => setFormData((prev) => ({ ...prev, city: e.target.value }))}
              placeholder="Houston"
              className="mt-1.5"
              required
            />
          </div>
          <div>
            <Label htmlFor="state">
              State <span className="text-destructive">*</span>
            </Label>
            <Input
              id="state"
              value={formData.state}
              onChange={(e) => setFormData((prev) => ({ ...prev, state: e.target.value }))}
              placeholder="TX"
              className="mt-1.5"
              required
            />
          </div>
        </div>

        <div>
          <Label htmlFor="phone">Phone Number (optional)</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
            placeholder="(555) 123-4567"
            className="mt-1.5"
          />
        </div>
      </div>
    </div>
  )
}
