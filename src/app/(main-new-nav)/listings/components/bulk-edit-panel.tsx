'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Loader2, Lock } from 'lucide-react'
import { toast } from 'sonner'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import { LISTING_CONDITIONS, EQUIPMENT_CATEGORIES } from '@/lib/constants'
import { bulkEditListings } from '@/app/actions/bulk-edit-listings'
import type { BulkEditField } from '@/app/actions/bulk-edit-listings'

interface SelectedListing {
  id: string
  title: string
  price_cents: number | null
  condition: string | null
}

interface BulkEditPanelProps {
  open: boolean
  onClose: () => void
  selectedIds: string[]
  selectedListings: SelectedListing[]
  isPro: boolean
  onSuccess: (updatedCount: number) => void
}

export function BulkEditPanel({
  open,
  onClose,
  selectedIds,
  selectedListings,
  isPro,
  onSuccess,
}: BulkEditPanelProps) {
  const [submitting, setSubmitting] = useState(false)

  // Field toggles
  const [statusEnabled, setStatusEnabled] = useState(false)
  const [priceEnabled, setPriceEnabled] = useState(false)
  const [conditionEnabled, setConditionEnabled] = useState(false)
  const [categoryEnabled, setCategoryEnabled] = useState(false)
  const [locationEnabled, setLocationEnabled] = useState(false)

  // Field values
  const [status, setStatus] = useState<'active' | 'draft' | 'archived'>('active')
  const [priceMode, setPriceMode] = useState<'fixed' | 'percent'>('fixed')
  const [fixedPrice, setFixedPrice] = useState('')
  const [percentChange, setPercentChange] = useState('')
  const [condition, setCondition] = useState('')
  const [category, setCategory] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')

  const anyEnabled = statusEnabled || priceEnabled || conditionEnabled || categoryEnabled || locationEnabled

  // Price preview for percent mode
  const pricePreview = useMemo(() => {
    if (!priceEnabled || priceMode !== 'percent') return null
    const pct = parseFloat(percentChange)
    if (isNaN(pct)) return null

    const withPrice = selectedListings.filter((l) => l.price_cents && l.price_cents > 0)
    const nullCount = selectedListings.length - withPrice.length

    if (withPrice.length === 0) {
      return { text: 'No listings have a price set', nullCount: 0 }
    }

    const multiplier = 1 + pct / 100
    const oldAvg = withPrice.reduce((sum, l) => sum + l.price_cents!, 0) / withPrice.length
    const newAvg = Math.max(100, Math.round(oldAvg * multiplier))

    return {
      text: `${withPrice.length} listing${withPrice.length !== 1 ? 's' : ''}: avg $${Math.round(oldAvg / 100).toLocaleString()} → $${Math.round(newAvg / 100).toLocaleString()}`,
      nullCount,
    }
  }, [priceEnabled, priceMode, percentChange, selectedListings])

  function resetForm() {
    setStatusEnabled(false)
    setPriceEnabled(false)
    setConditionEnabled(false)
    setCategoryEnabled(false)
    setLocationEnabled(false)
    setStatus('active')
    setPriceMode('fixed')
    setFixedPrice('')
    setPercentChange('')
    setCondition('')
    setCategory('')
    setCity('')
    setState('')
  }

  function handleClose() {
    resetForm()
    onClose()
  }

  async function handleSubmit() {
    const fields: BulkEditField[] = []

    if (statusEnabled) {
      fields.push({ field: 'status', value: status })
    }

    if (priceEnabled && isPro) {
      if (priceMode === 'fixed') {
        const val = parseFloat(fixedPrice)
        if (isNaN(val) || val < 1) {
          toast.error('Enter a valid price ($1 minimum)')
          return
        }
        fields.push({ field: 'price', mode: 'fixed', value: val })
      } else {
        const pct = parseFloat(percentChange)
        if (isNaN(pct) || pct < -99 || pct > 99) {
          toast.error('Enter a percent between -99 and 99')
          return
        }
        fields.push({ field: 'price', mode: 'percent', value: pct })
      }
    }

    if (conditionEnabled && isPro) {
      if (!condition) {
        toast.error('Select a condition')
        return
      }
      fields.push({ field: 'condition', value: condition })
    }

    if (categoryEnabled && isPro) {
      if (!category) {
        toast.error('Select a category')
        return
      }
      fields.push({ field: 'category', value: category })
    }

    if (locationEnabled && isPro) {
      if (!city.trim() || !state.trim()) {
        toast.error('Enter both city and state')
        return
      }
      fields.push({ field: 'location', city: city.trim(), state: state.trim() })
    }

    if (fields.length === 0) {
      toast.error('Toggle at least one field to edit')
      return
    }

    setSubmitting(true)
    try {
      const result = await bulkEditListings(selectedIds, fields)
      if (result.success) {
        let msg = `Updated ${result.updatedCount} listing${result.updatedCount !== 1 ? 's' : ''}`
        if (result.skippedCount) {
          msg += ` (${result.skippedCount} skipped — no price)`
        }
        toast.success(msg)
        resetForm()
        onSuccess(result.updatedCount)
        onClose()
      } else {
        toast.error(result.error || 'Failed to update listings')
      }
    } catch {
      toast.error('Failed to update listings')
    }
    setSubmitting(false)
  }

  return (
    <Sheet open={open} onOpenChange={(v) => !v && handleClose()}>
      <SheetContent className="flex flex-col overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="font-display">
            Edit {selectedIds.length} Listing{selectedIds.length !== 1 ? 's' : ''}
          </SheetTitle>
          <SheetDescription className="font-body">
            Only toggled fields will be updated.
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 space-y-6 py-4">
          {/* ─── STATUS (all tiers) ─── */}
          <FieldSection
            label="Change Status"
            enabled={statusEnabled}
            onToggle={setStatusEnabled}
            disabled={submitting}
          >
            <div className="flex flex-wrap gap-2">
              {(['active', 'draft', 'archived'] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  disabled={submitting}
                  className={`rounded-full border px-3 py-1 font-body text-sm capitalize transition-colors ${
                    status === s
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:border-primary/50'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </FieldSection>

          <Separator />

          {/* ─── PRO FIELDS ─── */}
          {isPro ? (
            <div className="space-y-6">
              {/* PRICE */}
              <FieldSection
                label="Change Price"
                enabled={priceEnabled}
                onToggle={setPriceEnabled}
                disabled={submitting}
              >
                <div className="space-y-3">
                  <div className="flex gap-2">
                    {(['fixed', 'percent'] as const).map((m) => (
                      <button
                        key={m}
                        onClick={() => setPriceMode(m)}
                        disabled={submitting}
                        className={`rounded-full border px-3 py-1 font-body text-sm transition-colors ${
                          priceMode === m
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border text-muted-foreground hover:border-primary/50'
                        }`}
                      >
                        {m === 'fixed' ? 'Set fixed price' : 'Apply % change'}
                      </button>
                    ))}
                  </div>

                  {priceMode === 'fixed' ? (
                    <div className="flex items-center gap-2">
                      <span className="font-body text-sm text-muted-foreground">$</span>
                      <Input
                        type="number"
                        min="1"
                        step="1"
                        placeholder="e.g. 5000"
                        value={fixedPrice}
                        onChange={(e) => setFixedPrice(e.target.value)}
                        disabled={submitting}
                        className="font-body"
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Input
                          type="number"
                          min="-99"
                          max="99"
                          step="1"
                          placeholder="e.g. -10 for 10% discount"
                          value={percentChange}
                          onChange={(e) => setPercentChange(e.target.value)}
                          disabled={submitting}
                          className="font-body"
                        />
                        <span className="font-body text-sm text-muted-foreground">%</span>
                      </div>
                      {pricePreview && (
                        <p className="font-body text-xs text-muted-foreground">
                          {pricePreview.text}
                          {pricePreview.nullCount > 0 && (
                            <span className="block text-amber-500">
                              ({pricePreview.nullCount} listing{pricePreview.nullCount !== 1 ? 's' : ''} with no price will be skipped)
                            </span>
                          )}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              </FieldSection>

              {/* CONDITION */}
              <FieldSection
                label="Change Condition"
                enabled={conditionEnabled}
                onToggle={setConditionEnabled}
                disabled={submitting}
              >
                <Select value={condition} onValueChange={setCondition} disabled={submitting}>
                  <SelectTrigger className="font-body">
                    <SelectValue placeholder="Select condition" />
                  </SelectTrigger>
                  <SelectContent>
                    {LISTING_CONDITIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="font-body">
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldSection>

              {/* CATEGORY */}
              <FieldSection
                label="Change Category"
                enabled={categoryEnabled}
                onToggle={setCategoryEnabled}
                disabled={submitting}
              >
                <Select value={category} onValueChange={setCategory} disabled={submitting}>
                  <SelectTrigger className="font-body">
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="font-body">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldSection>

              {/* LOCATION */}
              <FieldSection
                label="Change Location"
                enabled={locationEnabled}
                onToggle={setLocationEnabled}
                disabled={submitting}
              >
                <div className="flex gap-2">
                  <div className="flex-1">
                    <Label className="font-body text-xs text-muted-foreground">City</Label>
                    <Input
                      placeholder="Houston"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      disabled={submitting}
                      className="mt-1 font-body"
                    />
                  </div>
                  <div className="w-24">
                    <Label className="font-body text-xs text-muted-foreground">State</Label>
                    <Input
                      placeholder="TX"
                      value={state}
                      onChange={(e) => setState(e.target.value)}
                      disabled={submitting}
                      className="mt-1 font-body"
                    />
                  </div>
                </div>
              </FieldSection>
            </div>
          ) : (
            /* ─── LOCKED PRO SECTION ─── */
            <div className="relative">
              <div className="pointer-events-none select-none space-y-6 opacity-30">
                <FieldSection label="Change Price" enabled={false} onToggle={() => {}} disabled>
                  <div className="h-10 rounded-md border border-border" />
                </FieldSection>
                <FieldSection label="Change Condition" enabled={false} onToggle={() => {}} disabled>
                  <div className="h-10 rounded-md border border-border" />
                </FieldSection>
                <FieldSection label="Change Category" enabled={false} onToggle={() => {}} disabled>
                  <div className="h-10 rounded-md border border-border" />
                </FieldSection>
                <FieldSection label="Change Location" enabled={false} onToggle={() => {}} disabled>
                  <div className="h-10 rounded-md border border-border" />
                </FieldSection>
              </div>
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-lg bg-background/80 p-4 text-center">
                <Lock className="size-5 text-muted-foreground" />
                <p className="font-body text-sm text-muted-foreground">
                  Bulk editing price, condition, category, and location requires Pro.
                </p>
                <Button size="sm" asChild className="font-body">
                  <Link href="/pricing">Upgrade to Pro &rarr;</Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="flex-row gap-2 border-t border-border pt-4">
          <Button
            variant="outline"
            onClick={handleClose}
            disabled={submitting}
            className="flex-1 font-body"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !anyEnabled}
            className="flex-1 font-body"
          >
            {submitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Applying...
              </>
            ) : (
              `Apply to ${selectedIds.length} listing${selectedIds.length !== 1 ? 's' : ''}`
            )}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}

function FieldSection({
  label,
  enabled,
  onToggle,
  disabled,
  children,
}: {
  label: string
  enabled: boolean
  onToggle: (v: boolean) => void
  disabled?: boolean
  children: React.ReactNode
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="font-body text-sm font-medium">{label}</Label>
        <Switch
          checked={enabled}
          onCheckedChange={onToggle}
          disabled={disabled}
        />
      </div>
      {enabled && <div className="pl-0.5">{children}</div>}
    </div>
  )
}
