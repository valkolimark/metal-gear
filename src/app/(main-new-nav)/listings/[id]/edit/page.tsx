'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Save, Loader2, ArrowLeft, Upload, XCircle, ClipboardCheck } from 'lucide-react'
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
import { createClient } from '@/lib/supabase/client'
import { markFreshnessSuggestionActedOn } from '@/app/actions/freshness'
import { useAuthStore } from '@/stores/auth-store'
import {
  LISTING_CONDITIONS,
  LISTING_STATUSES,
} from '@/lib/constants'
import { searchTaxonomy, getTier2Label } from '@/lib/constants/equipment-taxonomy'
import { MultiIndustryPicker } from '@/components/forms/MultiIndustryPicker'
import { getIndustries } from '@/lib/listings/industries'
import { saveConditionReport, getConditionReport, uploadConditionPhoto } from '@/app/actions/condition-reports'

const GRADES = ['A', 'B', 'C', 'D', 'F'] as const
const GRADE_COLORS: Record<string, string> = {
  A: 'bg-green-500/20 text-green-400',
  B: 'bg-blue-500/20 text-blue-400',
  C: 'bg-yellow-500/20 text-yellow-400',
  D: 'bg-orange-500/20 text-orange-400',
  F: 'bg-red-500/20 text-red-400',
}

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    industries: [] as string[],
    condition: 'good',
    price_cents: '',
    negotiable: false,
    contact_for_price: false,
    location_city: '',
    location_state: '',
    status: 'draft',
  })

  // Category search-as-you-type (Cycle 64 — same pattern as SOS / new listing)
  const [categorySearch, setCategorySearch] = useState('')
  const categoryResults = (() => {
    if (categorySearch.trim().length < 2) return []
    return searchTaxonomy(categorySearch).slice(0, 8)
  })()

  // Condition report state
  const [showConditionForm, setShowConditionForm] = useState(false)
  const [conditionReport, setConditionReport] = useState({
    overall_grade: 'B',
    mechanical_score: 7,
    cosmetic_score: 7,
    electrical_score: 7,
    hours_of_use: '',
    last_service_date: '',
    notes: '',
    photo_urls: [] as string[],
  })
  const [hasExistingReport, setHasExistingReport] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [savingReport, setSavingReport] = useState(false)

  useEffect(() => {
    async function load() {
      const supabase = createClient()
      const { data, error } = await supabase
        .from('listings')
        .select('*')
        .eq('id', id)
        .single()

      if (error || !data) {
        toast.error('Listing not found')
        router.push('/listings')
        return
      }

      if (data.seller_id !== user?.id) {
        toast.error('Not authorized')
        router.push('/listings')
        return
      }

      setForm({
        title: data.title,
        description: data.description || '',
        category: data.category,
        industries: getIndustries(data),
        condition: data.condition,
        price_cents: data.price_cents
          ? (data.price_cents / 100).toString()
          : '',
        negotiable: data.negotiable,
        contact_for_price: data.contact_for_price,
        location_city: data.location_city,
        location_state: data.location_state,
        status: data.status,
      })

      // Load existing condition report
      const reportResult = await getConditionReport(id)
      if (reportResult.report) {
        setHasExistingReport(true)
        setShowConditionForm(true)
        setConditionReport({
          overall_grade: reportResult.report.overall_grade,
          mechanical_score: reportResult.report.mechanical_score,
          cosmetic_score: reportResult.report.cosmetic_score,
          electrical_score: reportResult.report.electrical_score,
          hours_of_use: reportResult.report.hours_of_use?.toString() || '',
          last_service_date: reportResult.report.last_service_date || '',
          notes: reportResult.report.notes || '',
          photo_urls: reportResult.report.photo_urls || [],
        })
      }

      setLoading(false)
    }

    if (user) load()
  }, [id, user, router])

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

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return

    setUploadingPhoto(true)
    for (const file of Array.from(files).slice(0, 10 - conditionReport.photo_urls.length)) {
      const formData = new FormData()
      formData.append('file', file)
      const result = await uploadConditionPhoto(formData)
      if (result.url) {
        setConditionReport((prev) => ({
          ...prev,
          photo_urls: [...prev.photo_urls, result.url!],
        }))
      }
    }
    setUploadingPhoto(false)
  }

  async function handleSaveReport() {
    setSavingReport(true)
    const result = await saveConditionReport(id, {
      overall_grade: conditionReport.overall_grade,
      mechanical_score: conditionReport.mechanical_score,
      cosmetic_score: conditionReport.cosmetic_score,
      electrical_score: conditionReport.electrical_score,
      hours_of_use: conditionReport.hours_of_use ? parseInt(conditionReport.hours_of_use) : null,
      last_service_date: conditionReport.last_service_date || null,
      notes: conditionReport.notes || null,
      photo_urls: conditionReport.photo_urls,
    })
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Condition report saved')
      setHasExistingReport(true)
    }
    setSavingReport(false)
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('listings')
        .update({
          title: form.title,
          description: form.description,
          category: form.category,
          industries: form.industries,
          industry: form.industries[0] ?? null,
          condition: form.condition,
          price_cents: form.price_cents
            ? Math.round(parseFloat(form.price_cents) * 100)
            : null,
          negotiable: form.negotiable,
          contact_for_price: form.contact_for_price,
          location_city: form.location_city,
          location_state: form.location_state,
          status: form.status,
        })
        .eq('id', id)

      if (error) throw error
      // Mark any freshness suggestion as acted on + set refreshed_at
      markFreshnessSuggestionActedOn(id).catch(console.error)
      toast.success('Listing updated')
      router.push(`/listings/${id}`)
    } catch (err) {
      toast.error('Failed to update listing')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Edit Listing
          </h1>
          <p className="mt-1 font-body text-muted-foreground">
            Update your listing details
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="font-body">Title</Label>
              <Input name="title" value={form.title} onChange={handleChange} className="font-body" />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Description</Label>
              <Textarea name="description" value={form.description} onChange={handleChange} rows={5} className="font-body" />
            </div>
            {/* Category — tier-2 taxonomy search (Cycle 64) */}
            <div className="space-y-2">
              <Label className="font-body" htmlFor="category-search">Category</Label>
              <Input
                id="category-search"
                type="text"
                value={categorySearch}
                onChange={(e) => setCategorySearch(e.target.value)}
                placeholder={
                  form.category
                    ? 'Search to change category…'
                    : "e.g. 'extruder', 'centrifuge', 'CNC mill'"
                }
                className="font-body"
              />
              {categoryResults.length > 0 ? (
                <ul role="listbox" className="max-h-56 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md">
                  {categoryResults.map((r) => (
                    <li key={`${r.tier2}-${r.subcategory.id}`}>
                      <button
                        type="button"
                        onClick={() => {
                          setForm((prev) => ({ ...prev, category: r.tier2 }))
                          setCategorySearch('')
                        }}
                        className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left font-body text-sm text-foreground hover:bg-accent hover:text-accent-foreground"
                      >
                        <span>{r.subcategory.label}</span>
                        <span className="text-xs text-muted-foreground">{getTier2Label(r.tier2)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              {form.category ? (
                <p className="font-body text-xs text-muted-foreground">
                  Selected:{' '}
                  <span className="font-medium text-foreground">
                    {getTier2Label(form.category) || form.category}
                  </span>
                </p>
              ) : null}
            </div>

            {/* Industries — multi-select (Cycle 64) */}
            <div className="space-y-2">
              <Label className="font-body">Industries</Label>
              <MultiIndustryPicker
                value={form.industries}
                onChange={(next) => setForm((prev) => ({ ...prev, industries: next }))}
                max={5}
              />
            </div>

            <div className="space-y-2">
              <Label className="font-body">Condition</Label>
              <Select value={form.condition} onValueChange={(v) => setForm((p) => ({ ...p, condition: v }))}>
                <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LISTING_CONDITIONS.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="font-body">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-body">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}>
                <SelectTrigger className="font-body"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {LISTING_STATUSES.filter((s) => s !== 'removed').map((s) => (
                    <SelectItem key={s} value={s} className="font-body capitalize">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 font-body text-sm">
              <input type="checkbox" name="contact_for_price" checked={form.contact_for_price} onChange={handleChange} className="size-4" />
              Contact for Price
            </label>
            {!form.contact_for_price && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-body">Price (USD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input name="price_cents" type="number" step="0.01" value={form.price_cents} onChange={handleChange} className="pl-7 font-body" />
                  </div>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 font-body text-sm">
                    <input type="checkbox" name="negotiable" checked={form.negotiable} onChange={handleChange} className="size-4" />
                    Negotiable
                  </label>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Condition Report */}
        <Card className="bg-card">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 font-display text-lg">
                <ClipboardCheck className="size-5" />
                Inspection Report
              </CardTitle>
              {!showConditionForm && (
                <Button type="button" variant="outline" size="sm" onClick={() => setShowConditionForm(true)} className="font-body">
                  {hasExistingReport ? 'Edit Report' : 'Add Report'}
                </Button>
              )}
              {hasExistingReport && (
                <Badge className={`ml-2 ${GRADE_COLORS[conditionReport.overall_grade]}`}>
                  Grade {conditionReport.overall_grade}
                </Badge>
              )}
            </div>
          </CardHeader>
          {showConditionForm && (
            <CardContent className="space-y-4">
              {/* Overall Grade */}
              <div className="space-y-2">
                <Label className="font-body">Overall Grade</Label>
                <div className="flex gap-2">
                  {GRADES.map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setConditionReport((p) => ({ ...p, overall_grade: g }))}
                      className={`flex size-10 items-center justify-center rounded-lg border-2 font-display text-lg font-bold transition-colors ${
                        conditionReport.overall_grade === g
                          ? 'border-primary bg-primary/20 text-primary'
                          : 'border-border text-muted-foreground hover:border-primary/50'
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              {/* Score Sliders */}
              <div className="grid gap-4 sm:grid-cols-3">
                {(['mechanical_score', 'cosmetic_score', 'electrical_score'] as const).map((field) => (
                  <div key={field} className="space-y-2">
                    <Label className="font-body capitalize">{field.replace('_score', '')}</Label>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min={1}
                        max={10}
                        value={conditionReport[field]}
                        onChange={(e) => setConditionReport((p) => ({ ...p, [field]: parseInt(e.target.value) }))}
                        className="flex-1 accent-primary"
                      />
                      <span className="w-6 text-center font-display text-sm font-bold text-foreground">
                        {conditionReport[field]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Hours & Service Date */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-body">Hours of Use</Label>
                  <Input
                    type="number"
                    value={conditionReport.hours_of_use}
                    onChange={(e) => setConditionReport((p) => ({ ...p, hours_of_use: e.target.value }))}
                    placeholder="e.g., 5000"
                    className="font-body"
                  />
                </div>
                <div className="space-y-2">
                  <Label className="font-body">Last Service Date</Label>
                  <Input
                    type="date"
                    value={conditionReport.last_service_date}
                    onChange={(e) => setConditionReport((p) => ({ ...p, last_service_date: e.target.value }))}
                    className="font-body"
                  />
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label className="font-body">Inspection Notes</Label>
                <Textarea
                  value={conditionReport.notes}
                  onChange={(e) => setConditionReport((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Describe the equipment condition, any wear or damage..."
                  rows={3}
                  className="font-body"
                />
              </div>

              {/* Photos */}
              <div className="space-y-2">
                <Label className="font-body">Condition Photos (up to 10)</Label>
                <div className="flex flex-wrap gap-2">
                  {conditionReport.photo_urls.map((url, i) => (
                    <div key={i} className="relative size-20 overflow-hidden rounded-lg border border-border">
                      <img src={url} alt={`Photo ${i + 1}`} className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setConditionReport((p) => ({ ...p, photo_urls: p.photo_urls.filter((_, j) => j !== i) }))}
                        className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5"
                      >
                        <XCircle className="size-3 text-red-400" />
                      </button>
                    </div>
                  ))}
                  {conditionReport.photo_urls.length < 10 && (
                    <label className="flex size-20 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary/50">
                      {uploadingPhoto ? <Loader2 className="size-5 animate-spin text-muted-foreground" /> : <Upload className="size-5 text-muted-foreground" />}
                      <input type="file" accept="image/*" multiple onChange={handlePhotoUpload} className="hidden" />
                    </label>
                  )}
                </div>
              </div>

              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => setShowConditionForm(false)} className="font-body">
                  Cancel
                </Button>
                <Button type="button" onClick={handleSaveReport} disabled={savingReport} className="font-body">
                  {savingReport ? <Loader2 className="mr-2 size-4 animate-spin" /> : <ClipboardCheck className="mr-2 size-4" />}
                  {hasExistingReport ? 'Update Report' : 'Save Report'}
                </Button>
              </div>
            </CardContent>
          )}
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={saving} className="font-body">
            {saving ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="mr-2 size-4" />
                Save Changes
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  )
}
