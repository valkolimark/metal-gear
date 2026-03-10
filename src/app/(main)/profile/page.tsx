'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Camera, Save, Loader2, Bell, CheckCircle2, Store, ImagePlus, ExternalLink, Shield, BadgeCheck, Users, Copy, Gift } from 'lucide-react'
import { toast } from 'sonner'
import Link from 'next/link'
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
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/auth-store'
import { uploadAvatar, updateProfile, updateNotificationPreferences } from './actions'
import { createBillingPortalSession } from '@/app/(main)/checkout/actions'
import { getStorefront, updateStorefront, uploadStorefrontBanner } from '@/app/actions/storefront'
import { getVerificationStatus, submitVerificationRequest } from '@/app/actions/verification'
import { getReferralData } from '@/app/actions/referrals'
import { INDUSTRIES, TIER_LABELS } from '@/lib/constants'
import type { Profile } from '@/types/users'
import type { Tables } from '@/types/database'

function getTrustLevel(score: number): string {
  if (score >= 80) return 'Top Seller'
  if (score >= 60) return 'Verified'
  if (score >= 30) return 'Trusted'
  return 'New'
}

function ProfileCompletion({ profile }: { profile: Profile | null }) {
  if (!profile) return null

  const fields = [
    { key: 'full_name', label: 'Full Name', weight: 15 },
    { key: 'display_name', label: 'Display Name', weight: 10 },
    { key: 'company_name', label: 'Company', weight: 10 },
    { key: 'bio', label: 'Bio', weight: 15 },
    { key: 'phone', label: 'Phone', weight: 10 },
    { key: 'industry', label: 'Industry', weight: 10 },
    { key: 'location_city', label: 'City', weight: 10 },
    { key: 'avatar_url', label: 'Avatar', weight: 20 },
  ]

  let score = 0
  for (const field of fields) {
    const value = profile[field.key as keyof Profile]
    if (value && String(value).trim()) score += field.weight
  }

  const color =
    score >= 80
      ? 'text-green-400'
      : score >= 50
        ? 'text-yellow-400'
        : 'text-orange-400'

  return (
    <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
      <CheckCircle2 className={`size-5 ${color}`} />
      <div>
        <p className="font-body text-sm font-medium text-foreground">
          {score}%
        </p>
        <p className="font-body text-[10px] text-muted-foreground">
          Complete
        </p>
      </div>
    </div>
  )
}

export default function ProfilePage() {
  const router = useRouter()
  const { user, profile, setProfile } = useAuthStore()
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [avatarKey, setAvatarKey] = useState(0)
  const [savingNotifs, setSavingNotifs] = useState(false)
  const [notifPrefs, setNotifPrefs] = useState({
    messages: true,
    inquiries: true,
    subscription: true,
    marketing: true,
  })
  const [verificationStatus, setVerificationStatus] = useState<string | null>(null)
  const [verifyBizName, setVerifyBizName] = useState('')
  const [verifyTaxId, setVerifyTaxId] = useState('')
  const [submittingVerify, setSubmittingVerify] = useState(false)
  const verifyDocRef = useRef<HTMLInputElement>(null)
  const [storefrontData, setStorefrontData] = useState<Tables<'seller_storefronts'> | null>(null)
  const [sfTagline, setSfTagline] = useState('')
  const [sfFeaturedIds, setSfFeaturedIds] = useState<string[]>([])
  const [savingSf, setSavingSf] = useState(false)
  const [uploadingBanner, setUploadingBanner] = useState(false)
  const bannerInputRef = useRef<HTMLInputElement>(null)
  const [userListings, setUserListings] = useState<{ id: string; title: string }[]>([])
  const [referralData, setReferralData] = useState<{
    referralLink: string
    referrals: { id: string; status: string; reward_cents: number; created_at: string; referredName: string }[]
    totalEarnings: number
    totalReferrals: number
    completedReferrals: number
  } | null>(null)
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
      // Load notification preferences
      const prefs = profile.email_notifications as Record<string, boolean> | null
      if (prefs) {
        setNotifPrefs({
          messages: prefs.messages !== false,
          inquiries: prefs.inquiries !== false,
          subscription: prefs.subscription !== false,
          marketing: prefs.marketing !== false,
        })
      }

      // Load verification status
      getVerificationStatus().then((res) => {
        setVerificationStatus(res.verification?.status ?? null)
      })

      // Load storefront data
      getStorefront(profile.id).then((res) => {
        if (res.storefront) {
          setStorefrontData(res.storefront)
          setSfTagline(res.storefront.tagline || '')
          setSfFeaturedIds(res.storefront.featured_listing_ids || [])
        }
      })

      // Load referral data
      getReferralData().then((res) => {
        if (!('error' in res)) {
          setReferralData(res)
        }
      })

      // Load user's active listings for featured picker
      import('@/lib/supabase/client').then(({ createClient }) => {
        const supabase = createClient()
        supabase
          .from('listings')
          .select('id, title')
          .eq('seller_id', profile.id)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(50)
          .then(({ data }) => {
            if (data) setUserListings(data)
          })
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
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Profile
          </h1>
          <p className="mt-1 font-body text-muted-foreground">
            Manage your account settings and public profile
          </p>
        </div>
        <ProfileCompletion profile={profile} />
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
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
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

        {/* Notification Preferences */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Bell className="size-5" />
              Email Notifications
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {[
              {
                key: 'messages' as const,
                label: 'New Messages',
                desc: 'Get notified when someone sends you a message',
              },
              {
                key: 'inquiries' as const,
                label: 'Listing Inquiries',
                desc: 'Get notified when someone inquires about your listing',
              },
              {
                key: 'subscription' as const,
                label: 'Subscription Updates',
                desc: 'Billing confirmations and plan changes',
              },
              {
                key: 'marketing' as const,
                label: 'Marketing',
                desc: 'Tips, new features, and promotions',
              },
            ].map((item) => (
              <div
                key={item.key}
                className="flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="font-body text-sm font-medium text-foreground">
                    {item.label}
                  </p>
                  <p className="font-body text-xs text-muted-foreground">
                    {item.desc}
                  </p>
                </div>
                <Switch
                  checked={notifPrefs[item.key]}
                  onCheckedChange={(checked) =>
                    setNotifPrefs((prev) => ({ ...prev, [item.key]: checked }))
                  }
                />
              </div>
            ))}

            <Separator />

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={savingNotifs}
                onClick={async () => {
                  setSavingNotifs(true)
                  try {
                    const result =
                      await updateNotificationPreferences(notifPrefs)
                    if (result.error) {
                      toast.error(result.error)
                    } else {
                      if (result.profile) {
                        setProfile(result.profile as Profile)
                      }
                      toast.success('Notification preferences saved')
                    }
                  } catch {
                    toast.error('Failed to save preferences')
                  } finally {
                    setSavingNotifs(false)
                  }
                }}
                className="font-body"
              >
                {savingNotifs ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Preferences'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Storefront Editor */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Store className="size-5" />
              Storefront
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="font-body text-sm text-muted-foreground">
                Customize your public seller storefront.
              </p>
              {user && (
                <Button variant="outline" size="sm" asChild className="font-body">
                  <Link href={`/sellers/${user.id}`}>
                    <ExternalLink className="mr-1.5 size-3" />
                    View Storefront
                  </Link>
                </Button>
              )}
            </div>

            <Separator />

            {/* Banner Upload */}
            <div className="space-y-2">
              <Label className="font-body">Banner Image</Label>
              <div className="relative overflow-hidden rounded-lg border border-border">
                {storefrontData?.banner_url ? (
                  <img
                    src={storefrontData.banner_url}
                    alt="Storefront banner"
                    className="h-32 w-full object-cover"
                  />
                ) : (
                  <div className="flex h-32 items-center justify-center bg-surface">
                    <ImagePlus className="size-8 text-muted-foreground/40" />
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => bannerInputRef.current?.click()}
                  disabled={uploadingBanner}
                  className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-md bg-card/90 px-3 py-1.5 font-body text-xs text-foreground backdrop-blur transition-colors hover:bg-card"
                >
                  {uploadingBanner ? (
                    <Loader2 className="size-3 animate-spin" />
                  ) : (
                    <Camera className="size-3" />
                  )}
                  {uploadingBanner ? 'Uploading...' : 'Change Banner'}
                </button>
                <input
                  ref={bannerInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    if (!file) return
                    if (file.size > 10 * 1024 * 1024) {
                      toast.error('Image must be under 10MB')
                      return
                    }
                    setUploadingBanner(true)
                    try {
                      const fd = new FormData()
                      fd.append('file', file)
                      const result = await uploadStorefrontBanner(fd)
                      if (result.error) toast.error(result.error)
                      else if (result.storefront) {
                        setStorefrontData(result.storefront)
                        toast.success('Banner updated')
                      }
                    } catch {
                      toast.error('Upload failed')
                    } finally {
                      setUploadingBanner(false)
                      if (bannerInputRef.current) bannerInputRef.current.value = ''
                    }
                  }}
                  className="hidden"
                />
              </div>
            </div>

            {/* Tagline */}
            <div className="space-y-2">
              <Label htmlFor="sf_tagline" className="font-body">
                Tagline
              </Label>
              <Input
                id="sf_tagline"
                value={sfTagline}
                onChange={(e) => setSfTagline(e.target.value)}
                placeholder="Your equipment, our expertise"
                maxLength={120}
                className="font-body"
              />
              <p className="font-body text-[10px] text-muted-foreground">
                A short line that appears below your name on your storefront.
              </p>
            </div>

            {/* Featured Listings */}
            <div className="space-y-2">
              <Label className="font-body">
                Featured Listings (up to 3)
              </Label>
              {userListings.length > 0 ? (
                <div className="space-y-1">
                  {userListings.map((listing) => {
                    const isFeatured = sfFeaturedIds.includes(listing.id)
                    return (
                      <button
                        key={listing.id}
                        type="button"
                        onClick={() => {
                          if (isFeatured) {
                            setSfFeaturedIds((ids) =>
                              ids.filter((id) => id !== listing.id)
                            )
                          } else if (sfFeaturedIds.length < 3) {
                            setSfFeaturedIds((ids) => [...ids, listing.id])
                          } else {
                            toast.error('Maximum 3 featured listings')
                          }
                        }}
                        className={`flex w-full items-center justify-between rounded-lg border p-2 text-left transition-colors ${
                          isFeatured
                            ? 'border-primary/50 bg-primary/10'
                            : 'border-border hover:bg-surface'
                        }`}
                      >
                        <span className="truncate font-body text-sm text-foreground">
                          {listing.title}
                        </span>
                        {isFeatured && (
                          <Badge className="shrink-0 bg-primary/20 font-body text-[10px] text-primary">
                            Featured
                          </Badge>
                        )}
                      </button>
                    )
                  })}
                </div>
              ) : (
                <p className="font-body text-sm text-muted-foreground">
                  No active listings to feature. Create a listing first.
                </p>
              )}
            </div>

            <Separator />

            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                disabled={savingSf}
                onClick={async () => {
                  setSavingSf(true)
                  try {
                    const result = await updateStorefront({
                      tagline: sfTagline || null,
                      featured_listing_ids: sfFeaturedIds,
                    })
                    if (result.error) toast.error(result.error)
                    else {
                      if (result.storefront) setStorefrontData(result.storefront)
                      toast.success('Storefront updated')
                    }
                  } catch {
                    toast.error('Failed to save storefront')
                  } finally {
                    setSavingSf(false)
                  }
                }}
                className="font-body"
              >
                {savingSf ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  'Save Storefront'
                )}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Referral Program */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Users className="size-5" />
              Referral Program
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="font-body text-sm text-muted-foreground">
              Invite colleagues and earn $10 credit when they complete their first transaction.
            </p>

            {referralData && (
              <>
                {/* Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className="font-display text-xl font-bold text-foreground">{referralData.totalReferrals}</p>
                    <p className="font-body text-[10px] text-muted-foreground">Referrals</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className="font-display text-xl font-bold text-foreground">{referralData.completedReferrals}</p>
                    <p className="font-body text-[10px] text-muted-foreground">Completed</p>
                  </div>
                  <div className="rounded-lg border border-border p-3 text-center">
                    <p className="font-display text-xl font-bold text-primary">
                      ${(referralData.totalEarnings / 100).toFixed(0)}
                    </p>
                    <p className="font-body text-[10px] text-muted-foreground">Earned</p>
                  </div>
                </div>

                {/* Referral Link */}
                <div className="space-y-2">
                  <Label className="font-body">Your Referral Link</Label>
                  <div className="flex gap-2 min-w-0">
                    <Input
                      readOnly
                      value={referralData.referralLink}
                      className="font-body text-sm min-w-0"
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard.writeText(referralData.referralLink)
                        toast.success('Referral link copied!')
                      }}
                    >
                      <Copy className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* Referral List */}
                {referralData.referrals.length > 0 && (
                  <div className="space-y-2">
                    <Label className="font-body">Your Referrals</Label>
                    <div className="space-y-1">
                      {referralData.referrals.map((ref) => (
                        <div
                          key={ref.id}
                          className="flex items-center justify-between rounded-lg border border-border p-2"
                        >
                          <div>
                            <p className="font-body text-sm text-foreground">{ref.referredName}</p>
                            <p className="font-body text-[10px] text-muted-foreground">
                              {new Date(ref.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge
                              variant="outline"
                              className={`font-body text-[10px] capitalize ${
                                ref.status === 'first_transaction'
                                  ? 'border-green-500/50 text-green-400'
                                  : ref.status === 'first_listing'
                                    ? 'border-blue-500/50 text-blue-400'
                                    : 'border-yellow-500/50 text-yellow-400'
                              }`}
                            >
                              {ref.status.replace('_', ' ')}
                            </Badge>
                            {ref.reward_cents > 0 && (
                              <Badge className="bg-primary/20 font-body text-[10px] text-primary">
                                <Gift className="mr-1 size-3" />
                                ${(ref.reward_cents / 100).toFixed(0)}
                              </Badge>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Verification & Trust */}
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Shield className="size-5" />
              Seller Verification
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Trust Score Display */}
            {profile && (
              <div className="flex items-center gap-3 rounded-lg border border-border p-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/20 font-display text-lg font-bold text-primary">
                  {profile.trust_score ?? 0}
                </div>
                <div>
                  <p className="font-body text-sm font-medium text-foreground">
                    Trust Score
                  </p>
                  <p className="font-body text-xs text-muted-foreground">
                    Level: {getTrustLevel(profile.trust_score ?? 0)}
                  </p>
                </div>
              </div>
            )}

            <Separator />

            {profile?.is_verified_dealer ? (
              <div className="flex items-center gap-2 rounded-lg bg-secondary/10 p-3">
                <BadgeCheck className="size-5 text-secondary" />
                <p className="font-body text-sm font-medium text-secondary">
                  Verified Seller
                </p>
              </div>
            ) : verificationStatus === 'pending' ? (
              <div className="flex items-center gap-2 rounded-lg bg-yellow-500/10 p-3">
                <Loader2 className="size-5 animate-spin text-yellow-400" />
                <p className="font-body text-sm text-yellow-400">
                  Verification request pending review
                </p>
              </div>
            ) : verificationStatus === 'rejected' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 rounded-lg bg-red-500/10 p-3">
                  <Shield className="size-5 text-red-400" />
                  <p className="font-body text-sm text-red-400">
                    Previous verification request was rejected. You may resubmit.
                  </p>
                </div>
                <VerificationForm />
              </div>
            ) : (
              <VerificationForm />
            )}
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

  function VerificationForm() {
    return (
      <div className="space-y-3">
        <p className="font-body text-sm text-muted-foreground">
          Get verified to earn buyer trust and display a verified badge.
        </p>
        <div className="space-y-2">
          <Label htmlFor="biz_name" className="font-body">
            Business Name
          </Label>
          <Input
            id="biz_name"
            value={verifyBizName}
            onChange={(e) => setVerifyBizName(e.target.value)}
            placeholder="Your registered business name"
            className="font-body"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="tax_id" className="font-body">
            EIN / Tax ID
          </Label>
          <Input
            id="tax_id"
            value={verifyTaxId}
            onChange={(e) => setVerifyTaxId(e.target.value)}
            placeholder="XX-XXXXXXX"
            className="font-body"
          />
          <p className="font-body text-[10px] text-muted-foreground">
            Your tax ID is hashed before storage and never stored in plain text.
          </p>
        </div>
        <div className="space-y-2">
          <Label className="font-body">Business License (optional)</Label>
          <input
            ref={verifyDocRef}
            type="file"
            accept="image/*,.pdf"
            className="block w-full font-body text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/20 file:px-3 file:py-1.5 file:font-body file:text-xs file:text-primary"
          />
        </div>
        <Button
          type="button"
          disabled={submittingVerify || !verifyBizName || !verifyTaxId}
          onClick={async () => {
            setSubmittingVerify(true)
            try {
              let docFd: FormData | undefined
              const file = verifyDocRef.current?.files?.[0]
              if (file) {
                docFd = new FormData()
                docFd.append('file', file)
              }
              const result = await submitVerificationRequest(
                verifyBizName,
                verifyTaxId,
                docFd
              )
              if (result.error) toast.error(result.error)
              else {
                setVerificationStatus('pending')
                toast.success('Verification request submitted')
              }
            } catch {
              toast.error('Failed to submit verification')
            } finally {
              setSubmittingVerify(false)
            }
          }}
          className="font-body"
        >
          {submittingVerify ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Submitting...
            </>
          ) : (
            'Submit for Verification'
          )}
        </Button>
      </div>
    )
  }
}
