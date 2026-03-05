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
import {
  getAdminUserDetail,
  adminUpdateUser,
  adminSuspendUser,
  adminBanUser,
  adminGrantRole,
} from '../../actions'

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

  useEffect(() => {
    getAdminUserDetail(userId).then((d) => {
      setData(d)
      setNotes(d.profile?.admin_notes || '')
    })
  }, [userId])

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
    return (
      <div className="py-20 text-center">
        <p className="font-body text-muted-foreground">User not found</p>
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

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Profile Info */}
        <Card className="border-white/5 bg-[#0D0D14]">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex size-16 items-center justify-center overflow-hidden rounded-full bg-surface">
                {profile.avatar_url ? (
                  <Image src={profile.avatar_url} alt="" width={64} height={64} className="size-full object-cover" />
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
        <Card className="border-white/5 bg-[#0D0D14]">
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

            <div className="h-px bg-white/5" />

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

            <div className="h-px bg-white/5" />

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

        {/* Stats Summary */}
        <Card className="border-white/5 bg-[#0D0D14]">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">Activity</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-surface p-3 text-center">
              <Package className="mx-auto mb-1 size-4 text-green-400" />
              <p className="font-display text-lg font-bold">{listings.length}</p>
              <p className="font-body text-[10px] text-muted-foreground">Listings</p>
            </div>
            <div className="rounded-lg bg-surface p-3 text-center">
              <Megaphone className="mx-auto mb-1 size-4 text-orange-400" />
              <p className="font-display text-lg font-bold">{sosRequests.length}</p>
              <p className="font-body text-[10px] text-muted-foreground">SOS Requests</p>
            </div>
            <div className="rounded-lg bg-surface p-3 text-center">
              <Star className="mx-auto mb-1 size-4 text-amber-400" />
              <p className="font-display text-lg font-bold">{reviews.length}</p>
              <p className="font-body text-[10px] text-muted-foreground">Reviews</p>
            </div>
            <div className="rounded-lg bg-surface p-3 text-center">
              <AlertTriangle className="mx-auto mb-1 size-4 text-red-400" />
              <p className="font-display text-lg font-bold">{reports.length}</p>
              <p className="font-body text-[10px] text-muted-foreground">Reports</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Listings */}
      {listings.length > 0 && (
        <Card className="border-white/5 bg-[#0D0D14]">
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
                  className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/5"
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

      {/* Audit Log */}
      {auditLog.length > 0 && (
        <Card className="border-white/5 bg-[#0D0D14]">
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
                    {new Date(entry.created_at).toLocaleString()}
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
