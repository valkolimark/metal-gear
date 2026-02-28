'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Save, Loader2 } from 'lucide-react'
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
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/auth-store'
import { uploadAvatar, updateProfile } from './actions'
import { createBillingPortalSession } from '@/app/(main)/checkout/actions'
import { INDUSTRIES, TIER_LABELS } from '@/lib/constants'
import type { Profile } from '@/types/users'

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, setProfile } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarKey, setAvatarKey] = useState(0)
  const [form, setForm] = useState({
    full_name: '',
    display_name: '',
    company_name: '',
    bio: '',
    phone: '',
    industry: '',
    location_city: 'Houston',
    location_state: 'TX',
  })

  useEffect(() => {
    if (profile) {
      setForm({
        full_name: profile.full_name || '',
        display_name: profile.display_name || '',
        company_name: profile.company_name || '',
        bio: profile.bio || '',
        phone: profile.phone || '',
        industry: profile.industry || '',
        location_city: profile.location_city || 'Houston',
        location_state: profile.location_state || 'TX',
      })
    }
  }, [profile])

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file || !user) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image must be under 10MB')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', file)

      const result = await uploadAvatar(formData)

      if (result.error) {
        toast.error(result.error)
        return
      }

      if (result.profile) {
        setProfile(result.profile as Profile)
      }
      setAvatarKey((k) => k + 1)
      toast.success('Avatar updated')
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      toast.error(`Upload failed: ${message}`)
      console.error('Avatar upload error:', err)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!user) return

    setSaving(true)
    try {
      const result = await updateProfile({
        full_name: form.full_name,
        display_name: form.display_name || null,
        company_name: form.company_name || null,
        bio: form.bio || null,
        phone: form.phone || null,
        industry: form.industry || null,
        location_city: form.location_city,
        location_state: form.location_state,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      if (result.profile) {
        setProfile(result.profile as Profile)
      }
      toast.success('Profile updated')
    } catch (err) {
      toast.error('Failed to save profile')
      console.error(err)
    } finally {
      setSaving(false)
    }
  }

  const initials =
    (profile?.full_name || form.full_name)
      ?.split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'MG'

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Profile
        </h1>
        <p className="mt-1 font-body text-muted-foreground">
          Manage your account settings and public profile
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Avatar Section */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">Avatar</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-6">
            <div className="relative">
              <div className="size-20 overflow-hidden rounded-full">
                {profile?.avatar_url ? (
                  <img
                    key={avatarKey}
                    src={profile.avatar_url}
                    alt="Avatar"
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center bg-primary/20 font-display text-lg text-primary">
                    {initials}
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute -bottom-1 -right-1 flex size-8 items-center justify-center rounded-full border-2 border-card bg-primary text-white transition-colors hover:bg-primary/90 disabled:opacity-50"
              >
                {uploading ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Camera className="size-4" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>
            <div className="font-body text-sm text-muted-foreground">
              <p>Click the camera icon to upload a new avatar.</p>
              <p>JPG, PNG, or WebP. Max 10MB.</p>
            </div>
          </CardContent>
        </Card>

        {/* Personal Info */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="full_name" className="font-body">
                  Full Name
                </Label>
                <Input
                  id="full_name"
                  name="full_name"
                  value={form.full_name}
                  onChange={handleChange}
                  placeholder="John Doe"
                  className="font-body"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="display_name" className="font-body">
                  Display Name
                </Label>
                <Input
                  id="display_name"
                  name="display_name"
                  value={form.display_name}
                  onChange={handleChange}
                  placeholder="Johnny"
                  className="font-body"
                />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="company_name" className="font-body">
                  Company
                </Label>
                <Input
                  id="company_name"
                  name="company_name"
                  value={form.company_name}
                  onChange={handleChange}
                  placeholder="Acme Industrial"
                  className="font-body"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="font-body">
                  Phone
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder="(713) 555-0100"
                  className="font-body"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="industry" className="font-body">
                Industry
              </Label>
              <Select
                value={form.industry}
                onValueChange={(v) =>
                  setForm((prev) => ({ ...prev, industry: v }))
                }
              >
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Select your industry" />
                </SelectTrigger>
                <SelectContent>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind} className="font-body">
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="bio" className="font-body">
                Bio
              </Label>
              <Textarea
                id="bio"
                name="bio"
                value={form.bio}
                onChange={handleChange}
                placeholder="Tell buyers about yourself or your business..."
                rows={4}
                className="font-body"
              />
            </div>
          </CardContent>
        </Card>

        {/* Location */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">Location</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="location_city" className="font-body">
                  City
                </Label>
                <Input
                  id="location_city"
                  name="location_city"
                  value={form.location_city}
                  onChange={handleChange}
                  placeholder="Houston"
                  className="font-body"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="location_state" className="font-body">
                  State
                </Label>
                <Input
                  id="location_state"
                  name="location_state"
                  value={form.location_state}
                  onChange={handleChange}
                  placeholder="TX"
                  maxLength={2}
                  className="font-body"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Info */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="font-display text-lg">
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-body font-medium text-foreground">
                  {TIER_LABELS[profile?.subscription_tier ?? 'free']} Plan
                </p>
                <p className="font-body text-sm text-muted-foreground">
                  {profile?.subscription_tier === 'free'
                    ? 'Upgrade to list more equipment and unlock premium features.'
                    : 'You have access to premium features.'}
                </p>
              </div>
              {profile?.subscription_tier === 'free' ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/pricing')}
                  className="font-body"
                >
                  Upgrade
                </Button>
              ) : (
                <Button
                  type="button"
                  variant="outline"
                  onClick={async () => {
                    const result = await createBillingPortalSession()
                    if (result.url) window.location.href = result.url
                    else if (result.error) toast.error(result.error)
                  }}
                  className="font-body"
                >
                  Manage Subscription
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        <Separator />

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
