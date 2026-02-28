'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Save, Loader2, ArrowLeft } from 'lucide-react'
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
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import {
  EQUIPMENT_CATEGORIES,
  LISTING_CONDITIONS,
  LISTING_STATUSES,
} from '@/lib/constants'

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
    industry: '',
    condition: 'good',
    price_cents: '',
    negotiable: false,
    contact_for_price: false,
    location_city: '',
    location_state: '',
    status: 'draft',
  })

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
        industry: data.industry || '',
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
          industry: form.industry || null,
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
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="font-body">Title</Label>
              <Input
                name="title"
                value={form.title}
                onChange={handleChange}
                className="font-body"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Description</Label>
              <Textarea
                name="description"
                value={form.description}
                onChange={handleChange}
                rows={5}
                className="font-body"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-body">Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, category: v }))
                  }
                >
                  <SelectTrigger className="font-body">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EQUIPMENT_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c} className="font-body">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Condition</Label>
                <Select
                  value={form.condition}
                  onValueChange={(v) =>
                    setForm((p) => ({ ...p, condition: v }))
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
            </div>
            <div className="space-y-2">
              <Label className="font-body">Status</Label>
              <Select
                value={form.status}
                onValueChange={(v) => setForm((p) => ({ ...p, status: v }))}
              >
                <SelectTrigger className="font-body">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LISTING_STATUSES.filter(
                    (s) => s !== 'removed'
                  ).map((s) => (
                    <SelectItem
                      key={s}
                      value={s}
                      className="font-body capitalize"
                    >
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <label className="flex items-center gap-2 font-body text-sm">
              <input
                type="checkbox"
                name="contact_for_price"
                checked={form.contact_for_price}
                onChange={handleChange}
                className="size-4"
              />
              Contact for Price
            </label>
            {!form.contact_for_price && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label className="font-body">Price (USD)</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                      $
                    </span>
                    <Input
                      name="price_cents"
                      type="number"
                      step="0.01"
                      value={form.price_cents}
                      onChange={handleChange}
                      className="pl-7 font-body"
                    />
                  </div>
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 font-body text-sm">
                    <input
                      type="checkbox"
                      name="negotiable"
                      checked={form.negotiable}
                      onChange={handleChange}
                      className="size-4"
                    />
                    Negotiable
                  </label>
                </div>
              </div>
            )}
          </CardContent>
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
