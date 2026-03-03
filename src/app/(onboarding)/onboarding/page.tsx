'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, Check, Building2, Wrench, Factory, ShoppingCart, Shield, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { toast } from 'sonner'
import {
  getEnhancedOnboardingProgress,
  saveEnhancedOnboardingStep,
  saveEquipmentInterests,
  completeEnhancedOnboarding,
} from '@/app/actions/onboarding'
import type { EnhancedOnboardingData } from '@/lib/constants/onboarding'
import {
  EQUIPMENT_TAXONOMY,
  INDUSTRIES,
  ROLES,
  PAIN_POINTS,
  TRADING_INTENTS,
  searchTaxonomy,
  getTier2Label,
  getTier1ForTier2,
} from '@/lib/constants/equipment-taxonomy'
import type { Tier1Bucket, Tier2Group } from '@/lib/constants/equipment-taxonomy'

const STEP_LABELS = [
  'Identity',
  'Equipment',
  'Industry',
  'Intent',
  'Transparency',
  'Agreement',
]

const STEP_ICONS = [Building2, Wrench, Factory, ShoppingCart, Eye, Shield]

export default function OnboardingPage() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<EnhancedOnboardingData>({
    show_phone_to: 'no_one',
    show_email_to: 'messaged',
    show_company: true,
    show_name: true,
    secondary_roles: [],
    equipment_interests: [],
    industries: [],
    pain_points: [],
    trading_intents: [],
    sos_responder: false,
    sos_categories: [],
    sos_urgency_level: 'all',
    sos_notify_methods: ['in_app'],
    sos_allow_realtime_contact: false,
    quality_agreement_accepted: false,
  })

  // Quality agreement individual checkboxes
  const [qaChecks, setQaChecks] = useState({
    control: false,
    update: false,
    quality: false,
    misrepresentation: false,
  })

  // Equipment search filter
  const [equipSearch, setEquipSearch] = useState('')

  useEffect(() => {
    async function load() {
      try {
        const result = await getEnhancedOnboardingProgress()
        if ('error' in result) {
          // If it's an auth error, redirect to login
          if (result.error === 'Not authenticated') {
            router.push('/login')
            return
          }
          // For other errors (e.g. table doesn't exist), show form with defaults
          console.error('Onboarding load error:', result.error)
          setLoading(false)
          return
        }
        if (result.completed) {
          router.push('/dashboard')
          return
        }
        if (result.data) {
          // Extract known fields from the DB result, converting nulls to undefined
          const d = result.data as Record<string, unknown>
          setFormData((prev) => ({
            ...prev,
            company_name: (d.company_name as string) || prev.company_name,
            job_title: (d.job_title as string) || prev.job_title,
            work_phone: (d.work_phone as string) || prev.work_phone,
            show_phone_to: (d.show_phone_to as EnhancedOnboardingData['show_phone_to']) || prev.show_phone_to,
            primary_role: (d.primary_role as string) || prev.primary_role,
            secondary_roles: (d.secondary_roles as string[]) || prev.secondary_roles,
            industries: (d.industries as string[]) || prev.industries,
            pain_points: (d.pain_points as string[]) || prev.pain_points,
            pain_points_other: (d.pain_points_other as string) || prev.pain_points_other,
            trading_intents: (d.trading_intents as string[]) || prev.trading_intents,
            show_company: d.show_company != null ? (d.show_company as boolean) : prev.show_company,
            show_name: d.show_name != null ? (d.show_name as boolean) : prev.show_name,
            show_email_to: (d.show_email_to as EnhancedOnboardingData['show_email_to']) || prev.show_email_to,
            sos_responder: d.sos_responder != null ? (d.sos_responder as boolean) : prev.sos_responder,
            sos_categories: (d.sos_categories as string[]) || prev.sos_categories,
            sos_urgency_level: (d.sos_urgency_level as EnhancedOnboardingData['sos_urgency_level']) || prev.sos_urgency_level,
            sos_notify_methods: (d.sos_notify_methods as string[]) || prev.sos_notify_methods,
            sos_allow_realtime_contact: d.sos_allow_realtime_contact != null ? (d.sos_allow_realtime_contact as boolean) : prev.sos_allow_realtime_contact,
            equipment_interests: (d.equipment_interests as EnhancedOnboardingData['equipment_interests']) || prev.equipment_interests,
          }))
          setCurrentStep(Math.min(result.step || 1, 6))
        } else if (result.prefill) {
          setFormData((prev) => ({
            ...prev,
            full_name: result.prefill?.full_name || '',
            company_name: result.prefill?.company_name || '',
            work_email: result.prefill?.work_email || '',
            work_phone: result.prefill?.work_phone || '',
          }))
        }
      } catch (err) {
        console.error('Onboarding load failed:', err)
        setLoadError('Unable to load onboarding data. You can still fill out the form or skip to dashboard.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [router])

  const updateField = useCallback(<K extends keyof EnhancedOnboardingData>(
    key: K,
    value: EnhancedOnboardingData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }, [])

  const toggleArrayItem = useCallback((key: keyof EnhancedOnboardingData, item: string) => {
    setFormData((prev) => {
      const arr = (prev[key] as string[]) || []
      return {
        ...prev,
        [key]: arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item],
      }
    })
  }, [])

  const handleNext = async () => {
    // Validate current step
    if (currentStep === 1) {
      if (!formData.company_name?.trim()) {
        toast.error('Company name is required')
        return
      }
      if (!formData.primary_role) {
        toast.error('Please select your primary role')
        return
      }
    }
    if (currentStep === 2 && (!formData.equipment_interests || formData.equipment_interests.length === 0)) {
      toast.error('Please select at least one equipment category')
      return
    }
    if (currentStep === 3 && (!formData.industries || formData.industries.length === 0)) {
      toast.error('Please select at least one industry')
      return
    }

    setSaving(true)
    try {
      // Save equipment interests separately (Step 2)
      if (currentStep === 2 && formData.equipment_interests) {
        await saveEquipmentInterests(formData.equipment_interests)
      }

      const result = await saveEnhancedOnboardingStep(currentStep, formData)
      if (result.error) {
        toast.error(result.error)
        return
      }

      if (currentStep < 6) {
        setCurrentStep(currentStep + 1)
      }
    } catch (err) {
      console.error('handleNext error:', err)
      toast.error('Failed to save. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleComplete = async () => {
    const allChecked = qaChecks.control && qaChecks.update && qaChecks.quality && qaChecks.misrepresentation
    if (!allChecked) {
      toast.error('Please agree to all quality requirements')
      return
    }

    setSaving(true)
    try {
      updateField('quality_agreement_accepted', true)
      await saveEnhancedOnboardingStep(6, { ...formData, quality_agreement_accepted: true })
      const result = await completeEnhancedOnboarding()
      if (result.error) {
        toast.error(result.error)
        return
      }
      toast.success('Welcome to Metal Gear!')
      router.push('/dashboard')
    } catch (err) {
      console.error('handleComplete error:', err)
      toast.error('Failed to complete setup. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1)
  }

  // Expanded tier1/tier2 tracking for accordion
  const [expandedTier1, setExpandedTier1] = useState<string[]>([])
  const [expandedTier2, setExpandedTier2] = useState<string[]>([])

  const toggleTier1 = (id: string) => {
    setExpandedTier1((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }
  const toggleTier2 = (id: string) => {
    setExpandedTier2((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  // Equipment interest helpers for 3-tier taxonomy
  const toggleEquipmentGroup = (tier1Id: string, tier2Id: string) => {
    const current = formData.equipment_interests || []
    const exists = current.find((i) => i.tier2 === tier2Id)
    if (exists) {
      updateField('equipment_interests', current.filter((i) => i.tier2 !== tier2Id))
    } else {
      updateField('equipment_interests', [...current, { tier1: tier1Id, tier2: tier2Id, subcategories: [], brands: [] }])
    }
  }

  const toggleSubcategory = (tier2Id: string, subId: string) => {
    const current = formData.equipment_interests || []
    updateField(
      'equipment_interests',
      current.map((i) => {
        if (i.tier2 !== tier2Id) return i
        const subs = i.subcategories.includes(subId)
          ? i.subcategories.filter((s) => s !== subId)
          : [...i.subcategories, subId]
        return { ...i, subcategories: subs }
      })
    )
  }

  const setEquipmentBrands = (tier2Id: string, brandsStr: string) => {
    const current = formData.equipment_interests || []
    updateField(
      'equipment_interests',
      current.map((i) => {
        if (i.tier2 !== tier2Id) return i
        return { ...i, brands: brandsStr.split(',').map((b) => b.trim()).filter(Boolean) }
      })
    )
  }

  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="font-body text-sm text-muted-foreground">{loadError}</p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => { setLoadError(null); setLoading(true); window.location.reload() }}>
            Try Again
          </Button>
          <Button onClick={() => router.push('/dashboard')}>
            Go to Dashboard
          </Button>
        </div>
      </div>
    )
  }

  // Search taxonomy — returns matching tier2 groups with their matching subcategories
  const searchResults = equipSearch ? searchTaxonomy(equipSearch) : null

  // Build a set of matching tier2 IDs for search filtering
  const matchingTier2Ids = searchResults
    ? new Set(searchResults.map((r) => r.tier2))
    : null

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="mb-3 flex items-center justify-between text-sm">
          <span className="font-body text-muted-foreground">Step {currentStep} of 6</span>
          <span className="font-display text-foreground">{STEP_LABELS[currentStep - 1]}</span>
        </div>
        <div className="flex gap-1.5">
          {Array.from({ length: 6 }, (_, i) => {
            const StepIcon = STEP_ICONS[i]
            return (
              <div key={i} className="flex flex-1 flex-col items-center gap-1">
                <div
                  className={`h-1.5 w-full rounded-full transition-colors ${
                    i + 1 <= currentStep ? 'bg-primary' : 'bg-border'
                  }`}
                />
                <StepIcon
                  className={`hidden size-3.5 sm:block ${
                    i + 1 <= currentStep ? 'text-primary' : 'text-muted-foreground/40'
                  }`}
                />
              </div>
            )
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="flex-1">
        {/* ─── Step 1: Identity ─── */}
        {currentStep === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Tell us about yourself</h2>
              <p className="mt-1 font-body text-muted-foreground">
                This information helps other professionals trust and connect with you.
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name">Full Name</Label>
                <Input
                  id="full_name"
                  value={formData.full_name || ''}
                  onChange={(e) => updateField('full_name', e.target.value)}
                  placeholder="John Smith"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="company_name">
                  Company Name <span className="text-primary">*</span>
                </Label>
                <Input
                  id="company_name"
                  value={formData.company_name || ''}
                  onChange={(e) => updateField('company_name', e.target.value)}
                  placeholder="Acme Industrial"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="job_title">Job Title</Label>
                <Input
                  id="job_title"
                  value={formData.job_title || ''}
                  onChange={(e) => updateField('job_title', e.target.value)}
                  placeholder="Plant Manager"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="work_email">Work Email</Label>
                <Input
                  id="work_email"
                  type="email"
                  value={formData.work_email || ''}
                  onChange={(e) => updateField('work_email', e.target.value)}
                  placeholder="john@acme.com"
                  disabled
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="work_phone">Work Phone</Label>
              <div className="flex items-center gap-4">
                <Input
                  id="work_phone"
                  type="tel"
                  value={formData.work_phone || ''}
                  onChange={(e) => updateField('work_phone', e.target.value)}
                  placeholder="(713) 555-0123"
                  className="max-w-xs"
                />
                <div className="flex items-center gap-2">
                  <Label htmlFor="phone_visibility" className="text-xs text-muted-foreground">
                    Visible to:
                  </Label>
                  <select
                    id="phone_visibility"
                    value={formData.show_phone_to || 'no_one'}
                    onChange={(e) => updateField('show_phone_to', e.target.value as 'everyone' | 'messaged' | 'no_one')}
                    className="rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground"
                  >
                    <option value="everyone">Everyone</option>
                    <option value="messaged">People I&apos;ve messaged</option>
                    <option value="no_one">No one</option>
                  </select>
                </div>
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>
                What best describes you? <span className="text-primary">*</span>
              </Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {ROLES.map((role) => (
                  <button
                    key={role.id}
                    type="button"
                    onClick={() => updateField('primary_role', role.id)}
                    className={`rounded-lg border p-3 text-left transition-all ${
                      formData.primary_role === role.id
                        ? 'border-primary bg-primary/10 ring-1 ring-primary'
                        : 'border-border bg-surface hover:border-muted-foreground/30'
                    }`}
                  >
                    <div className="font-body text-sm font-medium text-foreground">{role.label}</div>
                    <div className="font-body text-xs text-muted-foreground">{role.description}</div>
                  </button>
                ))}
              </div>
            </div>

            {formData.primary_role && (
              <div className="space-y-2">
                <Label>Secondary roles (optional)</Label>
                <div className="flex flex-wrap gap-2">
                  {ROLES.filter((r) => r.id !== formData.primary_role).map((role) => (
                    <button
                      key={role.id}
                      type="button"
                      onClick={() => toggleArrayItem('secondary_roles', role.id)}
                      className={`rounded-full border px-3 py-1 text-xs transition-all ${
                        (formData.secondary_roles || []).includes(role.id)
                          ? 'border-steel bg-steel/10 text-steel'
                          : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                      }`}
                    >
                      {role.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Step 2: Equipment Interests (3-Tier Taxonomy) ─── */}
        {currentStep === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Your equipment interests</h2>
              <p className="mt-1 font-body text-muted-foreground">
                Select the groups and subcategories you work with. This powers your feed and SOS routing.
              </p>
            </div>

            <Input
              placeholder="Search equipment (e.g., centrifuge, valve, pump)..."
              value={equipSearch}
              onChange={(e) => setEquipSearch(e.target.value)}
            />

            {/* Search results mode */}
            {searchResults && searchResults.length > 0 && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</Label>
                {searchResults.map((result) => {
                  const tier1Id = getTier1ForTier2(result.tier2)
                  const isGroupSelected = (formData.equipment_interests || []).some((i) => i.tier2 === result.tier2)
                  const subId = result.subcategory.id
                  return (
                    <button
                      key={`${result.tier2}-${subId}`}
                      type="button"
                      onClick={() => {
                        if (!isGroupSelected) {
                          // Group not yet selected — add it with this subcategory
                          const current = formData.equipment_interests || []
                          const newInterest = { tier1: tier1Id, tier2: result.tier2, subcategories: [subId], brands: [] }
                          updateField('equipment_interests', [...current, newInterest])
                        } else {
                          toggleSubcategory(result.tier2, subId)
                        }
                      }}
                      className="flex w-full items-center gap-3 rounded-lg border border-border bg-surface p-3 text-left transition-all hover:border-primary/50"
                    >
                      <div className={`flex size-6 items-center justify-center rounded ${isGroupSelected ? 'bg-primary text-white' : 'border border-border'}`}>
                        {isGroupSelected && <Check className="size-3" />}
                      </div>
                      <div>
                        <span className="text-sm font-medium text-foreground">{result.subcategory.label}</span>
                        <span className="ml-2 text-xs text-muted-foreground">{getTier2Label(result.tier2)}</span>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
            {searchResults && searchResults.length === 0 && (
              <p className="text-sm text-muted-foreground">No results found for &ldquo;{equipSearch}&rdquo;</p>
            )}

            {/* Browse taxonomy — shown when not searching */}
            {!searchResults && (
              <div className="space-y-3">
                {EQUIPMENT_TAXONOMY.map((tier1: Tier1Bucket) => {
                  const isTier1Expanded = expandedTier1.includes(tier1.id)
                  const selectedGroupCount = (formData.equipment_interests || []).filter(
                    (i) => i.tier1 === tier1.id
                  ).length
                  return (
                    <div key={tier1.id} className="rounded-lg border border-border bg-surface">
                      <button
                        type="button"
                        onClick={() => toggleTier1(tier1.id)}
                        className="flex w-full items-center justify-between p-4"
                      >
                        <div className="flex items-center gap-3">
                          <div className={`flex size-8 items-center justify-center rounded-lg ${selectedGroupCount > 0 ? 'bg-primary text-white' : 'bg-border text-muted-foreground'}`}>
                            <Wrench className="size-4" />
                          </div>
                          <div className="text-left">
                            <span className="font-display text-sm font-semibold text-foreground">{tier1.label}</span>
                            <span className="ml-2 text-xs text-muted-foreground">({tier1.groups.length} groups)</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {selectedGroupCount > 0 && (
                            <Badge variant="secondary" className="text-[10px]">{selectedGroupCount} selected</Badge>
                          )}
                          <ChevronRight className={`size-4 text-muted-foreground transition-transform ${isTier1Expanded ? 'rotate-90' : ''}`} />
                        </div>
                      </button>

                      {isTier1Expanded && (
                        <div className="border-t border-border px-4 pb-3 pt-2">
                          {tier1.groups.map((group: Tier2Group) => {
                            const isGroupSelected = (formData.equipment_interests || []).some((i) => i.tier2 === group.id)
                            const interest = (formData.equipment_interests || []).find((i) => i.tier2 === group.id)
                            const isTier2Expanded = expandedTier2.includes(group.id)
                            return (
                              <div key={group.id} className={`mb-2 rounded-lg border transition-all ${isGroupSelected ? 'border-primary/40 bg-primary/5' : 'border-border/50'}`}>
                                <div className="flex items-center gap-2 p-3">
                                  <button
                                    type="button"
                                    onClick={() => toggleEquipmentGroup(tier1.id, group.id)}
                                    className={`flex size-5 shrink-0 items-center justify-center rounded ${isGroupSelected ? 'bg-primary text-white' : 'border border-border'}`}
                                  >
                                    {isGroupSelected && <Check className="size-3" />}
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => { if (!isGroupSelected) toggleEquipmentGroup(tier1.id, group.id); toggleTier2(group.id) }}
                                    className="flex flex-1 items-center justify-between text-left"
                                  >
                                    <span className="font-body text-sm font-medium text-foreground">{group.label}</span>
                                    <span className="flex items-center gap-1 text-xs text-muted-foreground">
                                      {group.subcategories.length} items
                                      <ChevronRight className={`size-3 transition-transform ${isTier2Expanded ? 'rotate-90' : ''}`} />
                                    </span>
                                  </button>
                                </div>

                                {isGroupSelected && isTier2Expanded && (
                                  <div className="border-t border-border/50 px-3 pb-3 pt-2">
                                    <Label className="mb-2 block text-xs text-muted-foreground">Subcategories</Label>
                                    <div className="flex flex-wrap gap-1.5">
                                      {group.subcategories.map((sub) => (
                                        <button
                                          key={sub.id}
                                          type="button"
                                          onClick={() => toggleSubcategory(group.id, sub.id)}
                                          className={`rounded-full border px-2.5 py-1 text-xs transition-all ${
                                            interest?.subcategories.includes(sub.id)
                                              ? 'border-primary bg-primary/10 text-primary'
                                              : 'border-border text-muted-foreground hover:border-primary/50'
                                          }`}
                                        >
                                          {sub.label}
                                          {sub.crossListedIn && sub.crossListedIn.length > 0 && (
                                            <span className="ml-1 text-[9px] text-muted-foreground/60" title={`Also in: ${sub.crossListedIn.join(', ')}`}>+</span>
                                          )}
                                        </button>
                                      ))}
                                    </div>
                                    <div className="mt-3">
                                      <Label className="mb-1 block text-xs text-muted-foreground">
                                        Brands (comma-separated)
                                      </Label>
                                      <Input
                                        placeholder="e.g., Caterpillar, John Deere"
                                        value={interest?.brands.join(', ') || ''}
                                        onChange={(e) => setEquipmentBrands(group.id, e.target.value)}
                                        className="text-xs"
                                      />
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* Selection summary */}
            {(formData.equipment_interests || []).length > 0 && (
              <div className="rounded-lg border border-border bg-surface p-3">
                <Label className="mb-2 block text-xs text-muted-foreground">
                  {(formData.equipment_interests || []).length} group{(formData.equipment_interests || []).length !== 1 ? 's' : ''} selected
                  {' '}&middot;{' '}
                  {(formData.equipment_interests || []).reduce((sum, i) => sum + i.subcategories.length, 0)} subcategories
                </Label>
                <div className="flex flex-wrap gap-1.5">
                  {(formData.equipment_interests || []).map((i) => (
                    <Badge key={i.tier2} variant="secondary" className="gap-1">
                      {getTier2Label(i.tier2)}
                      {i.subcategories.length > 0 && (
                        <span className="text-muted-foreground">({i.subcategories.length})</span>
                      )}
                      <button
                        type="button"
                        onClick={() => toggleEquipmentGroup(i.tier1, i.tier2)}
                        className="ml-0.5 text-muted-foreground hover:text-foreground"
                      >
                        &times;
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─── Step 3: Industry & Pain Points ─── */}
        {currentStep === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Your industry</h2>
              <p className="mt-1 font-body text-muted-foreground">
                Help us understand your world so we can connect you with the right people.
              </p>
            </div>

            <div className="space-y-3">
              <Label>
                What industry are you in? <span className="text-primary">*</span>
              </Label>
              <div className="flex flex-wrap gap-2">
                {INDUSTRIES.map((ind) => (
                  <button
                    key={ind}
                    type="button"
                    onClick={() => toggleArrayItem('industries', ind)}
                    className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                      (formData.industries || []).includes(ind)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                    }`}
                  >
                    {ind}
                  </button>
                ))}
              </div>
            </div>

            <Separator />

            <div className="space-y-3">
              <Label>What are the most common problems in your job?</Label>
              <div className="space-y-2">
                {PAIN_POINTS.map((point) => (
                  <button
                    key={point}
                    type="button"
                    onClick={() => toggleArrayItem('pain_points', point)}
                    className={`flex w-full items-center gap-3 rounded-lg border p-3 text-left transition-all ${
                      (formData.pain_points || []).includes(point)
                        ? 'border-primary bg-primary/5'
                        : 'border-border bg-surface hover:border-muted-foreground/30'
                    }`}
                  >
                    <div
                      className={`flex size-5 items-center justify-center rounded ${
                        (formData.pain_points || []).includes(point)
                          ? 'bg-primary text-white'
                          : 'border border-border'
                      }`}
                    >
                      {(formData.pain_points || []).includes(point) && <Check className="size-3" />}
                    </div>
                    <span className="font-body text-sm text-foreground">{point}</span>
                  </button>
                ))}
              </div>
              <div className="space-y-1">
                <Label htmlFor="pain_other" className="text-xs text-muted-foreground">
                  Other (describe)
                </Label>
                <Input
                  id="pain_other"
                  value={formData.pain_points_other || ''}
                  onChange={(e) => updateField('pain_points_other', e.target.value)}
                  placeholder="Any other challenges..."
                />
              </div>
            </div>
          </div>
        )}

        {/* ─── Step 4: Trading Intent ─── */}
        {currentStep === 4 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">What brings you here?</h2>
              <p className="mt-1 font-body text-muted-foreground">
                Select everything that applies. We&apos;ll tailor your experience.
              </p>
            </div>

            <div className="space-y-2">
              {TRADING_INTENTS.map((intent) => (
                <button
                  key={intent.id}
                  type="button"
                  onClick={() => toggleArrayItem('trading_intents', intent.id)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-all ${
                    (formData.trading_intents || []).includes(intent.id)
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-surface hover:border-muted-foreground/30'
                  }`}
                >
                  <div
                    className={`flex size-6 items-center justify-center rounded ${
                      (formData.trading_intents || []).includes(intent.id)
                        ? 'bg-primary text-white'
                        : 'border border-border'
                    }`}
                  >
                    {(formData.trading_intents || []).includes(intent.id) && <Check className="size-4" />}
                  </div>
                  <span className="font-body text-sm font-medium text-foreground">{intent.label}</span>
                </button>
              ))}
            </div>

            {/* Role-specific follow-up */}
            {formData.primary_role === 'end_user' && (
              <>
                <Separator />
                <div className="space-y-3">
                  <Label>What do you most urgently need help with?</Label>
                  <div className="flex flex-wrap gap-2">
                    {['Spare parts', 'Emergency breakdowns', 'Disposing of boneyard equipment', 'Finding rebuilders'].map(
                      (item) => (
                        <button
                          key={item}
                          type="button"
                          onClick={() => toggleArrayItem('trading_intents', `urgent_${item.toLowerCase().replace(/\s+/g, '_')}`)}
                          className={`rounded-full border px-3 py-1.5 text-sm transition-all ${
                            (formData.trading_intents || []).includes(`urgent_${item.toLowerCase().replace(/\s+/g, '_')}`)
                              ? 'border-steel bg-steel/10 text-steel'
                              : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                          }`}
                        >
                          {item}
                        </button>
                      )
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ─── Step 5: Transparency & SOS ─── */}
        {currentStep === 5 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Visibility & SOS</h2>
              <p className="mt-1 font-body text-muted-foreground">
                Control what others see and opt in to help when someone hits SOS.
              </p>
            </div>

            <div className="space-y-4 rounded-lg border border-border bg-surface p-4">
              <h3 className="font-display text-sm font-semibold text-foreground">Profile Visibility</h3>

              <div className="flex items-center justify-between">
                <Label htmlFor="show_company" className="font-body text-sm">Show company name</Label>
                <Switch
                  id="show_company"
                  checked={formData.show_company ?? true}
                  onCheckedChange={(v) => updateField('show_company', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="show_name" className="font-body text-sm">Show name & title</Label>
                <Switch
                  id="show_name"
                  checked={formData.show_name ?? true}
                  onCheckedChange={(v) => updateField('show_name', v)}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label className="font-body text-sm">Email visible to</Label>
                <select
                  value={formData.show_email_to || 'messaged'}
                  onChange={(e) => updateField('show_email_to', e.target.value as 'everyone' | 'messaged' | 'no_one')}
                  className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                >
                  <option value="everyone">Everyone</option>
                  <option value="messaged">People I&apos;ve messaged</option>
                  <option value="no_one">No one</option>
                </select>
              </div>
            </div>

            <Separator />

            <div className="space-y-4 rounded-lg border border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary text-white">
                  <svg className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
                  </svg>
                </div>
                <h3 className="font-display text-sm font-semibold text-foreground">SOS Responder</h3>
              </div>

              <p className="font-body text-xs text-muted-foreground">
                When someone in your categories hits the SOS button, you&apos;ll get notified so you can help.
              </p>

              <div className="flex items-center justify-between">
                <Label htmlFor="sos_responder" className="font-body text-sm font-medium">
                  I can help when others hit SOS
                </Label>
                <Switch
                  id="sos_responder"
                  checked={formData.sos_responder ?? false}
                  onCheckedChange={(v) => updateField('sos_responder', v)}
                />
              </div>

              {formData.sos_responder && (
                <div className="space-y-4 pt-2">
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">SOS categories (from your interests)</Label>
                    <div className="flex flex-wrap gap-1.5">
                      {(formData.equipment_interests || []).map((i) => (
                          <button
                            key={i.tier2}
                            type="button"
                            onClick={() => toggleArrayItem('sos_categories', i.tier2)}
                            className={`rounded-full border px-2.5 py-1 text-xs transition-all ${
                              (formData.sos_categories || []).includes(i.tier2)
                                ? 'border-primary bg-primary/10 text-primary'
                                : 'border-border text-muted-foreground'
                            }`}
                          >
                            {getTier2Label(i.tier2)}
                          </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label className="font-body text-sm">Urgency level</Label>
                    <select
                      value={formData.sos_urgency_level || 'all'}
                      onChange={(e) => updateField('sos_urgency_level', e.target.value as 'critical_only' | 'all')}
                      className="rounded-md border border-border bg-background px-2 py-1 text-xs text-foreground"
                    >
                      <option value="all">Normal + Emergency</option>
                      <option value="critical_only">Only critical/emergency</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">How should we notify you?</Label>
                    <div className="flex flex-wrap gap-2">
                      {['in_app', 'email', 'sms'].map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => toggleArrayItem('sos_notify_methods', method)}
                          className={`rounded-full border px-3 py-1 text-xs transition-all ${
                            (formData.sos_notify_methods || []).includes(method)
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border text-muted-foreground'
                          }`}
                        >
                          {method === 'in_app' ? 'In-app' : method === 'email' ? 'Email' : 'SMS'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <Label htmlFor="sos_realtime" className="font-body text-xs">
                      Allow real-time contact (text/call) for SOS
                    </Label>
                    <Switch
                      id="sos_realtime"
                      checked={formData.sos_allow_realtime_contact ?? false}
                      onCheckedChange={(v) => updateField('sos_allow_realtime_contact', v)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─── Step 6: Quality Agreement ─── */}
        {currentStep === 6 && (
          <div className="space-y-6">
            <div>
              <h2 className="font-display text-2xl font-bold text-foreground">Quality commitment</h2>
              <p className="mt-1 font-body text-muted-foreground">
                Metal Gear is built on trust and real inventory. Please confirm you understand.
              </p>
            </div>

            <div className="space-y-3">
              {[
                { key: 'control' as const, text: 'I will only list equipment I actually control' },
                { key: 'update' as const, text: 'I will update or remove old / sold items promptly' },
                { key: 'quality' as const, text: 'Low-quality photos or incorrect info may be rejected' },
                { key: 'misrepresentation' as const, text: 'Repeated false listings can result in suspension' },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setQaChecks((prev) => ({ ...prev, [item.key]: !prev[item.key] }))}
                  className={`flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-all ${
                    qaChecks[item.key]
                      ? 'border-primary bg-primary/5'
                      : 'border-border bg-surface hover:border-muted-foreground/30'
                  }`}
                >
                  <div
                    className={`flex size-5 shrink-0 items-center justify-center rounded ${
                      qaChecks[item.key]
                        ? 'bg-primary text-white'
                        : 'border border-border'
                    }`}
                  >
                    {qaChecks[item.key] && <Check className="size-3" />}
                  </div>
                  <span className="font-body text-sm text-foreground">{item.text}</span>
                </button>
              ))}
            </div>

            <div className="rounded-lg border border-steel/30 bg-steel/5 p-4">
              <p className="font-body text-xs text-muted-foreground">
                By completing setup, you agree to these marketplace standards. We want Metal Gear to be the most
                trusted B2B industrial marketplace — no phantom inventory, no junkyard vibes.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Buttons */}
      <div className="mt-8 flex items-center justify-between border-t border-border pt-4">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentStep === 1 || saving}
          className="gap-1"
        >
          <ChevronLeft className="size-4" />
          Back
        </Button>

        {currentStep < 6 ? (
          <Button onClick={handleNext} disabled={saving} className="gap-1">
            {saving ? 'Saving...' : 'Continue'}
            <ChevronRight className="size-4" />
          </Button>
        ) : (
          <Button
            onClick={handleComplete}
            disabled={saving || !qaChecks.control || !qaChecks.update || !qaChecks.quality || !qaChecks.misrepresentation}
            className="gap-1 bg-primary"
          >
            {saving ? 'Setting up...' : 'Complete Setup'}
            <Check className="size-4" />
          </Button>
        )}
      </div>
    </div>
  )
}
