'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Image from 'next/image'
import Link from 'next/link'
import {
  ArrowLeft,
  Package,
  Megaphone,
  Star,
  AlertTriangle,
  Shield,
  Save,
  CreditCard,
  Coins,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import {
  getAdminUserDetail,
  adminUpdateUser,
  adminSuspendUser,
  adminBanUser,
  adminGrantRole,
  getChurnRiskDetail,
  setUserSubscriptionTier,
  getAdminUserCreditBalance,
  adminGrantCredits,
  getCurrentAdminRole,
  getCurrentAdminInfo,
} from '../../actions'
import { reactivateAccount } from '@/app/actions/admin-delete-account'
import { DeleteAccountPanel } from './components/DeleteAccountPanel'

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  moderator: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  analyst: 'bg-green-500/20 text-green-400 border-green-500/30',
}

export default function AdminUserDetailPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const [data, setData] = useState<Awaited<ReturnType<typeof getAdminUserDetail>> | null>(null)
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [churnRisk, setChurnRisk] = useState<any>(null)
  const [outreach, setOutreach] = useState<{ subject: string; body: string } | null>(null)
  const [generatingOutreach, setGeneratingOutreach] = useState(false)
  const [tierOverride, setTierOverride] = useState<string>('')
  const [savingTier, setSavingTier] = useState(false)
  const [creditInfo, setCreditInfo] = useState<{ creditsRemaining: number; creditsUsed: number; tier: string } | null>(null)
  const [grantAmount, setGrantAmount] = useState('')
  const [granting, setGranting] = useState(false)
  const [currentAdminRole, setCurrentAdminRole] = useState<string | null>(null)
  const [currentAdminId, setCurrentAdminId] = useState<string | null>(null)
  const [reactivating, setReactivating] = useState(false)

  useEffect(() => {
    getAdminUserDetail(userId).then((d) => {
      setData(d)
      setNotes(d.profile?.admin_notes || '')
      setTierOverride(d.profile?.subscription_tier || 'free')
    })
    getChurnRiskDetail(userId).then(setChurnRisk)
    getAdminUserCreditBalance(userId).then(setCreditInfo)
    getCurrentAdminInfo().then((info) => {
      setCurrentAdminRole(info.role)
      setCurrentAdminId(info.id)
    })
  }, [userId])

  async function handleReactivate() {
    setReactivating(true)
    const result = await reactivateAccount(userId)
    if (result.success) {
      toast.success('Account reactivated')
      const d = await getAdminUserDetail(userId)
      setData(d)
    } else {
      toast.error(result.error || 'Failed to reactivate')
    }
    setReactivating(false)
  }

  async function handleGrantCredits() {
    const amount = parseInt(grantAmount)
    if (isNaN(amount) || amount <= 0) {
      toast.error('Enter a valid amount')
      return
    }
    setGranting(true)
    const result = await adminGrantCredits(userId, amount)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Granted ${amount} credits`)
      setGrantAmount('')
      getAdminUserCreditBalance(userId).then(setCreditInfo)
    }
    setGranting(false)
  }

  async function handleSaveTier() {
    setSavingTier(true)
    const result = await setUserSubscriptionTier(userId, tierOverride as 'free' | 'pro' | 'business' | 'enterprise')
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success(`Tier updated to ${tierOverride}`)
      const d = await getAdminUserDetail(userId)
      setData(d)
    }
    setSavingTier(false)
  }

  async function handleGenerateOutreach() {
    setGeneratingOutreach(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}/generate-outreach`, { method: 'POST' })
      if (res.ok) {
        const data = await res.json()
        setOutreach(data)
      } else {
        toast.error('Failed to generate outreach')
      }
    } catch {
      toast.error('Failed to generate outreach')
    } finally {
      setGeneratingOutreach(false)
    }
  }

  async function saveNotes() {
    setSaving(true)
    try {
      await adminUpdateUser(userId, { admin_notes: notes })
      toast.success('Notes saved')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to save')
    }
    setSaving(false)
  }

  async function handleGrantRole(role: string) {
    try {
      await adminGrantRole(userId, role === 'none' ? null : (role as 'superadmin' | 'moderator' | 'analyst'))
      toast.success('Role updated')
      const d = await getAdminUserDetail(userId)
      setData(d)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
  }

  async function handleSuspend(duration: '24h' | '7d' | '30d' | 'permanent') {
    try {
      await adminSuspendUser(userId, duration)
      toast.success(`User suspended (${duration})`)
      const d = await getAdminUserDetail(userId)
      setData(d)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
  }

  async function handleBan() {
    try {
      await adminBanUser(userId)
      toast.success('User banned')
      const d = await getAdminUserDetail(userId)
      setData(d)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed')
    }
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="font-body text-muted-foreground">Loading...</p>
      </div>
    )
  }

  const { profile, listings, sosRequests, reviews, reports, auditLog } = data
  if (!profile) {
    // Orphaned auth record — profile deleted but auth may still exist
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="size-4" />
          </Button>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Orphaned Account
          </h1>
        </div>

        <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4">
          <p className="font-display text-sm font-semibold text-amber-400">
            No profile data found for this user ID
          </p>
          <p className="font-body text-xs text-muted-foreground mt-1">
            ID: {userId}. The profile has been deleted but an auth record may still exist.
          </p>
        </div>

        {currentAdminRole === 'superadmin' && currentAdminId && (
          <DeleteAccountPanel
            userId={userId}
            userName="Unknown User"
            hasProfile={false}
            adminUserId={currentAdminId}
            onDeleted={() => router.push('/admin/users')}
          />
        )}

        {/* Show audit log if available */}
        {auditLog.length > 0 && (
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <Shield className="size-4 text-purple-400" />
                Admin Actions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {auditLog.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded px-3 py-2"
                  >
                    <p className="font-body text-sm text-foreground">
                      {entry.action}
                    </p>
                    <p className="font-body text-xs text-muted-foreground">
                      {new Date(entry.created_at || '').toLocaleString()}
                    </p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.back()}>
          <ArrowLeft className="size-4" />
        </Button>
        <h1 className="font-display text-2xl font-bold text-foreground">
          {profile.full_name || 'Unnamed User'}
        </h1>
        {profile.admin_role && (
          <Badge className={`border ${ROLE_COLORS[profile.admin_role] || ''} font-body text-xs uppercase`}>
            {profile.admin_role}
          </Badge>
        )}
      </div>

      {/* Soft-deleted banner */}
      {profile.deleted_at && profile.deletion_type === 'soft' && (
        <div className="flex items-center justify-between rounded-lg border border-orange-500/40 bg-orange-500/10 p-4">
          <div>
            <p className="font-display text-sm font-semibold text-orange-400">
              This account is archived
            </p>
            <p className="font-body text-xs text-muted-foreground">
              Archived on {new Date(profile.deleted_at).toLocaleDateString()}.
              {profile.deletion_reason && ` Reason: ${profile.deletion_reason}`}
            </p>
          </div>
          {currentAdminRole === 'superadmin' && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleReactivate}
              disabled={reactivating}
              className="font-body"
            >
              {reactivating ? 'Reactivating...' : 'Reactivate Account'}
            </Button>
          )}
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-4">
        {/* Profile Info */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-muted">
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt="" width={64} height={64} unoptimized className="size-full object-cover" />
                ) : (
                  <span className="font-display text-xl text-muted-foreground">
                    {(profile.full_name || '?')[0]}
                  </span>
                )}
              </div>
              <div>
                <p className="font-body text-sm font-medium text-foreground">
                  {profile.full_name}
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  ID: {profile.id.slice(0, 8)}...
                </p>
              </div>
            </div>
            <div className="space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="font-body text-muted-foreground">Tier</span>
                <Badge className="bg-primary/20 text-primary border-0 font-body text-xs uppercase">
                  {profile.subscription_tier || 'free'}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="font-body text-muted-foreground">Joined</span>
                <span className="font-body text-foreground">
                  {new Date(profile.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="font-body text-muted-foreground">Status</span>
                {profile.is_banned ? (
                  <Badge className="bg-red-500/20 text-red-400 border-0 text-xs">Banned</Badge>
                ) : profile.is_suspended ? (
                  <Badge className="bg-amber-500/20 text-amber-400 border-0 text-xs">Suspended</Badge>
                ) : (
                  <Badge className="bg-green-500/20 text-green-400 border-0 text-xs">Active</Badge>
                )}
              </div>
              <div className="flex justify-between">
                <span className="font-body text-muted-foreground">Location</span>
                <span className="font-body text-foreground">
                  {profile.location_city && `${profile.location_city}, ${profile.location_state}`}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <Label className="font-body text-xs">Admin Role</Label>
              <Select
                value={profile.admin_role || 'none'}
                onValueChange={handleGrantRole}
              >
                <SelectTrigger className="font-body text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No admin role</SelectItem>
                  <SelectItem value="superadmin">Superadmin</SelectItem>
                  <SelectItem value="moderator">Moderator</SelectItem>
                  <SelectItem value="analyst">Analyst</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="h-px bg-border" />

            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="outline" onClick={() => handleSuspend('24h')}>
                Suspend 24h
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleSuspend('7d')}>
                Suspend 7d
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleSuspend('30d')}>
                Suspend 30d
              </Button>
            </div>

            <Button
              size="sm"
              variant="destructive"
              className="w-full"
              onClick={handleBan}
            >
              Ban Account
            </Button>

            <div className="h-px bg-border" />

            <div className="space-y-2">
              <Label className="font-body text-xs">Admin Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Internal notes about this user..."
                className="font-body text-sm"
              />
              <Button size="sm" onClick={saveNotes} disabled={saving}>
                <Save className="mr-1 size-3" />
                Save Notes
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Subscription Override */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <CreditCard className="size-4 text-primary" />
              Subscription
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-body text-muted-foreground">Current Tier</span>
              <Badge className="bg-primary/20 text-primary border-0 font-body text-xs uppercase">
                {profile.subscription_tier || 'free'}
              </Badge>
            </div>

            <div className="space-y-2">
              <Label className="font-body text-xs">Change Tier (Admin Override)</Label>
              <Select
                value={tierOverride}
                onValueChange={setTierOverride}
              >
                <SelectTrigger className="font-body text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free</SelectItem>
                  <SelectItem value="pro">Pro ($179/mo)</SelectItem>
                  <SelectItem value="business">Business ($349/mo)</SelectItem>
                  <SelectItem value="enterprise">Enterprise ($599/mo)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              size="sm"
              onClick={handleSaveTier}
              disabled={savingTier || tierOverride === (profile.subscription_tier || 'free')}
            >
              <Save className="mr-1 size-3" />
              {savingTier ? 'Saving...' : 'Save Tier'}
            </Button>

            <p className="font-body text-[10px] text-muted-foreground">
              Admin overrides bypass Stripe. Existing Stripe subscriptions are not affected.
            </p>
          </CardContent>
        </Card>

        {/* Contact Credits */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <Coins className="size-4 text-primary" />
              Contact Credits
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-body text-muted-foreground">Balance</span>
              <span className="font-display text-lg font-bold text-foreground">
                {creditInfo?.creditsRemaining ?? 0}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="font-body text-muted-foreground">Used This Month</span>
              <span className="font-body text-foreground">{creditInfo?.creditsUsed ?? 0}</span>
            </div>

            <div className="h-px bg-border" />

            <div className="space-y-2">
              <Label className="font-body text-xs">Grant Credits</Label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  value={grantAmount}
                  onChange={(e) => setGrantAmount(e.target.value)}
                  placeholder="Amount"
                  className="font-body text-sm"
                  min={1}
                />
                <Button
                  size="sm"
                  onClick={handleGrantCredits}
                  disabled={granting || !grantAmount}
                >
                  {granting ? 'Granting...' : 'Grant'}
                </Button>
              </div>
            </div>

            <p className="font-body text-[10px] text-muted-foreground">
              Granted credits are added to the current month&apos;s balance.
            </p>
          </CardContent>
        </Card>

        {/* Stats Summary */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-muted p-3 text-center">
              <Package className="mx-auto mb-1 size-4 text-green-400" />
              <p className="font-display text-lg font-bold">{listings.length}</p>
              <p className="font-body text-[10px] text-muted-foreground">Listings</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <Megaphone className="mx-auto mb-1 size-4 text-orange-400" />
              <p className="font-display text-lg font-bold">{sosRequests.length}</p>
              <p className="font-body text-[10px] text-muted-foreground">SOS Requests</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <Star className="mx-auto mb-1 size-4 text-amber-400" />
              <p className="font-display text-lg font-bold">{reviews.length}</p>
              <p className="font-body text-[10px] text-muted-foreground">Reviews</p>
            </div>
            <div className="rounded-lg bg-muted p-3 text-center">
              <AlertTriangle className="mx-auto mb-1 size-4 text-red-400" />
              <p className="font-display text-lg font-bold">{reports.length}</p>
              <p className="font-body text-[10px] text-muted-foreground">Reports</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Listings */}
      {listings.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">
              Listings ({listings.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {listings.map((l) => (
                <Link
                  key={l.id}
                  href={`/admin/listings/${l.id}`}
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-accent"
                >
                  <div>
                    <p className="font-body text-sm text-foreground">{l.title}</p>
                    <p className="font-body text-xs text-muted-foreground">
                      {l.category} &middot; {l.condition}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {l.price_cents && (
                      <span className="font-body text-sm text-foreground">
                        ${(l.price_cents / 100).toLocaleString()}
                      </span>
                    )}
                    <Badge
                      className={`border-0 text-[10px] ${
                        l.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : 'bg-zinc-500/20 text-zinc-400'
                      }`}
                    >
                      {l.status}
                    </Badge>
                  </div>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Churn Risk */}
      {churnRisk && (churnRisk.risk_level === 'at_risk' || churnRisk.risk_level === 'high_risk') && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <AlertTriangle className={`size-4 ${churnRisk.risk_level === 'high_risk' ? 'text-red-400' : 'text-yellow-400'}`} />
              Churn Risk: {churnRisk.risk_level === 'high_risk' ? 'HIGH' : 'AT RISK'} (Score: {churnRisk.risk_score})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {Object.entries(churnRisk.signals || {}).map(([signal, weight]) => (
                <Badge
                  key={signal}
                  className={`border-0 font-body text-[10px] ${Number(weight) > 0 ? 'bg-red-500/20 text-red-400' : 'bg-green-500/20 text-green-400'}`}
                >
                  {signal.replace(/([A-Z])/g, ' $1').trim()}: {Number(weight) > 0 ? '+' : ''}{String(weight)}
                </Badge>
              ))}
            </div>
            <p className="font-body text-xs text-muted-foreground">
              Last calculated: {churnRisk.last_calculated_at ? new Date(churnRisk.last_calculated_at).toLocaleString() : 'Unknown'}
            </p>
            <Button
              variant="outline"
              size="sm"
              className="font-body text-xs"
              disabled={generatingOutreach}
              onClick={handleGenerateOutreach}
            >
              {generatingOutreach ? 'Generating...' : 'Generate Outreach Email'}
            </Button>
            {outreach && (
              <div className="mt-3 space-y-2 rounded-lg border border-primary/20 bg-primary/5 p-4">
                <p className="font-body text-xs text-muted-foreground">Subject: <strong className="text-foreground">{outreach.subject}</strong></p>
                <pre className="whitespace-pre-wrap rounded bg-muted p-3 font-body text-sm text-foreground">{outreach.body}</pre>
                <Button
                  variant="outline"
                  size="sm"
                  className="font-body text-xs"
                  onClick={() => {
                    navigator.clipboard.writeText(`Subject: ${outreach.subject}\n\n${outreach.body}`)
                    toast.success('Copied to clipboard')
                  }}
                >
                  Copy to Clipboard
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Audit Log */}
      {auditLog.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <Shield className="size-4 text-purple-400" />
              Admin Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {auditLog.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded px-3 py-2"
                >
                  <p className="font-body text-sm text-foreground">
                    {entry.action}
                  </p>
                  <p className="font-body text-xs text-muted-foreground">
                    {new Date(entry.created_at || '').toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete Account — superadmin only */}
      {currentAdminRole === 'superadmin' && !profile.deleted_at && (
        <DeleteAccountPanel
          userId={userId}
          userName={profile.full_name || 'Unnamed User'}
          hasProfile={true}
          adminUserId={currentAdminId || undefined}
          onDeleted={() => router.push('/admin/users')}
        />
      )}
    </div>
  )
}
