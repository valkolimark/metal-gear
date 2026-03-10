'use client'

import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  getSystemConfig,
  updateSystemConfig,
  getAdminUsers,
  grantAdminRole,
  revokeAdminRole,
  searchUsersForAdmin,
  checkIntegrationStatus,
  getDatabaseStats,
  getAuditLog,
  exportAuditLogCSV,
} from '@/app/actions/settings'
import { getWeeklyBriefs } from '../actions'
import { getPlatformPalette } from '@/app/actions/palette'
import { BrandPaletteSelector } from '@/components/admin/BrandPaletteSelector'

// ─── Types ──────────────────────────────────────────────────────────

type Tab = 'config' | 'admins' | 'pricing' | 'integrations' | 'data' | 'audit' | 'briefs'

interface ConfigItem {
  key: string
  value: unknown
  description: string
  updated_by: string | null
  updated_at: string | null
}

interface AdminUser {
  id: string
  full_name: string | null
  avatar_url: string | null
  admin_role: string | null
  is_admin: boolean
  created_at: string
  last_action: string | null
  granted_by: string
}

interface Integration {
  name: string
  status: 'ok' | 'error' | 'not_configured'
  latency?: number
  detail?: string
}

interface AuditLogEntry {
  id: string
  admin_id: string
  admin_name: string
  action: string
  target_type: string
  target_id: string
  metadata: Record<string, unknown>
  created_at: string
}

interface SearchUser {
  id: string
  full_name: string | null
  avatar_url: string | null
  is_admin: boolean
  admin_role: string | null
}

// ─── Constants ──────────────────────────────────────────────────────

const TABS: { key: Tab; label: string }[] = [
  { key: 'config', label: 'Platform Config' },
  { key: 'admins', label: 'Admin Users' },
  { key: 'pricing', label: 'Pricing' },
  { key: 'integrations', label: 'Integrations' },
  { key: 'data', label: 'Data Management' },
  { key: 'audit', label: 'Audit Log' },
  { key: 'briefs', label: 'Weekly Briefs' },
]

const BOOLEAN_KEYS = [
  'maintenance_mode',
  'new_registrations_enabled',
  'listing_auto_approve',
  'sos_enabled',
  'boost_store_enabled',
]

const NUMERIC_KEYS = ['free_trial_days', 'max_free_listings', 'ai_fraud_threshold']

const TIER_PRICES = [
  { name: 'Free', price: 0, features: '3 listings, 5 photos, 10 conversations, 100mi search' },
  { name: 'Premium', price: 2999, features: '15 listings, 15 photos, 3 videos, unlimited conversations, 500mi search' },
  { name: 'Boost', price: 7999, features: '50 listings, 25 photos, 5 videos, unlimited everything' },
]

// ─── Helpers ────────────────────────────────────────────────────────

function formatDate(dateStr: string | null) {
  if (!dateStr) return 'Never'
  return new Date(dateStr).toLocaleString()
}

function formatKey(key: string) {
  return key.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

// ─── Main Page ──────────────────────────────────────────────────────

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('config')

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">System Settings</h1>

      {/* Tab Navigation */}
      <div className="flex flex-wrap gap-2">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`font-body rounded-md px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-[#FF6B2B] text-white'
                : 'bg-[#0D0D14] text-muted-foreground hover:text-foreground border border-white/5'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'config' && <PlatformConfigSection />}
      {activeTab === 'admins' && <AdminUsersSection />}
      {activeTab === 'pricing' && <PricingSection />}
      {activeTab === 'integrations' && <IntegrationsSection />}
      {activeTab === 'data' && <DataManagementSection />}
      {activeTab === 'audit' && <AuditLogSection />}
      {activeTab === 'briefs' && <WeeklyBriefsSection />}
    </div>
  )
}

// ─── Section A: Platform Config ─────────────────────────────────────

function PlatformConfigSection() {
  const [config, setConfig] = useState<ConfigItem[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [currentPalette, setCurrentPalette] = useState<'industrial' | 'ocean' | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchConfig() {
      try {
        const [{ config: data }, palette] = await Promise.all([
          getSystemConfig(),
          getPlatformPalette(),
        ])
        if (!cancelled) {
          setConfig(data as ConfigItem[])
          setCurrentPalette(palette)
        }
      } catch (err) {
        if (!cancelled) toast.error('Failed to load config: ' + (err instanceof Error ? err.message : 'Unknown error'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchConfig()
    return () => { cancelled = true }
  }, [refreshKey])

  const handleUpdate = async (key: string, value: unknown) => {
    setSaving(key)
    try {
      await updateSystemConfig(key, value as Parameters<typeof updateSystemConfig>[1])
      toast.success(`Updated ${formatKey(key)}`)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      toast.error('Failed to update: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSaving(null)
    }
  }

  if (loading) {
    return (
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardContent className="space-y-4 pt-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  const configMap = Object.fromEntries(config.map((c) => [c.key, c]))

  return (
    <div className="space-y-4">
      {/* Brand Palette */}
      {currentPalette && <BrandPaletteSelector currentPalette={currentPalette} />}

      {/* Boolean Toggles */}
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardHeader>
          <CardTitle className="font-display text-base">Feature Flags</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {BOOLEAN_KEYS.map((key) => {
            const item = configMap[key]
            if (!item) return null
            return (
              <div key={key} className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <Label className="font-body text-sm font-medium text-foreground">
                    {formatKey(key)}
                  </Label>
                  <p className="font-body text-xs text-muted-foreground">
                    {item.description || 'No description'}
                  </p>
                  <p className="font-body mt-1 text-xs text-muted-foreground/60">
                    Last updated: {formatDate(item.updated_at)}
                  </p>
                </div>
                <Switch
                  checked={Boolean(item.value)}
                  disabled={saving === key}
                  onCheckedChange={(checked) => handleUpdate(key, checked)}
                />
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Numeric Inputs */}
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardHeader>
          <CardTitle className="font-display text-base">Numeric Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {NUMERIC_KEYS.map((key) => {
            const item = configMap[key]
            if (!item) return null
            return (
              <div key={key} className="space-y-2">
                <Label className="font-body text-sm font-medium text-foreground">
                  {formatKey(key)}
                </Label>
                <p className="font-body text-xs text-muted-foreground">
                  {item.description || 'No description'}
                </p>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    defaultValue={Number(item.value) || 0}
                    className="w-32"
                    onBlur={(e) => {
                      const val = Number(e.target.value)
                      if (val !== Number(item.value)) {
                        handleUpdate(key, val)
                      }
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const val = Number((e.target as HTMLInputElement).value)
                        if (val !== Number(item.value)) {
                          handleUpdate(key, val)
                        }
                      }
                    }}
                  />
                  {saving === key && (
                    <span className="font-body text-xs text-muted-foreground">Saving...</span>
                  )}
                </div>
                <p className="font-body text-xs text-muted-foreground/60">
                  Last updated: {formatDate(item.updated_at)}
                </p>
              </div>
            )
          })}
        </CardContent>
      </Card>

      {/* Sitewide Banner */}
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardHeader>
          <CardTitle className="font-display text-base">Sitewide Banner</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="font-body text-sm font-medium text-foreground">Banner Message</Label>
            <Input
              defaultValue={String(configMap['sitewide_banner']?.value ?? '')}
              placeholder="Enter banner text (leave empty to hide)"
              onBlur={(e) => {
                const current = String(configMap['sitewide_banner']?.value ?? '')
                if (e.target.value !== current) {
                  handleUpdate('sitewide_banner', e.target.value)
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const current = String(configMap['sitewide_banner']?.value ?? '')
                  const val = (e.target as HTMLInputElement).value
                  if (val !== current) {
                    handleUpdate('sitewide_banner', val)
                  }
                }
              }}
            />
            <p className="font-body text-xs text-muted-foreground">
              {configMap['sitewide_banner']?.description || 'Text shown in a banner across all pages'}
            </p>
          </div>
          <div className="space-y-2">
            <Label className="font-body text-sm font-medium text-foreground">Banner Type</Label>
            <Select
              defaultValue={String(configMap['sitewide_banner_type']?.value ?? 'info')}
              onValueChange={(val) => handleUpdate('sitewide_banner_type', val)}
            >
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warning">Warning</SelectItem>
                <SelectItem value="critical">Critical</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Section B: Admin Users ─────────────────────────────────────────

function AdminUsersSection() {
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [loading, setLoading] = useState(true)
  const [revokeTarget, setRevokeTarget] = useState<AdminUser | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<SearchUser[]>([])
  const [searching, setSearching] = useState(false)
  const [grantRole, setGrantRole] = useState<'superadmin' | 'moderator' | 'analyst'>('moderator')

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function fetchAdmins() {
      try {
        const { admins: data } = await getAdminUsers()
        if (!cancelled) setAdmins(data as AdminUser[])
      } catch (err) {
        if (!cancelled) toast.error('Failed to load admins: ' + (err instanceof Error ? err.message : 'Unknown error'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchAdmins()
    return () => { cancelled = true }
  }, [refreshKey])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setSearching(true)
    try {
      const { users } = await searchUsersForAdmin(searchQuery.trim())
      setSearchResults(users as SearchUser[])
    } catch (err) {
      toast.error('Search failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setSearching(false)
    }
  }

  const handleGrant = async (userId: string) => {
    try {
      await grantAdminRole(userId, grantRole)
      toast.success('Admin role granted')
      setSearchResults([])
      setSearchQuery('')
      setRefreshKey((k) => k + 1)
    } catch (err) {
      toast.error('Failed to grant role: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const handleRevoke = async () => {
    if (!revokeTarget) return
    try {
      await revokeAdminRole(revokeTarget.id)
      toast.success('Admin access revoked')
      setRevokeTarget(null)
      setRefreshKey((k) => k + 1)
    } catch (err) {
      toast.error('Failed to revoke: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      await grantAdminRole(userId, newRole as 'superadmin' | 'moderator' | 'analyst')
      toast.success('Role updated')
      setRefreshKey((k) => k + 1)
    } catch (err) {
      toast.error('Failed to update role: ' + (err instanceof Error ? err.message : 'Unknown error'))
    }
  }

  if (loading) {
    return (
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardContent className="space-y-4 pt-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Admin Table */}
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardHeader>
          <CardTitle className="font-display text-base">Current Admins</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="font-body w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-muted-foreground">
                  <th className="pb-3 pr-4">User</th>
                  <th className="pb-3 pr-4">Role</th>
                  <th className="pb-3 pr-4">Granted By</th>
                  <th className="pb-3 pr-4">Last Action</th>
                  <th className="pb-3">Actions</th>
                </tr>
              </thead>
              <tbody>
                {admins.map((admin) => (
                  <tr key={admin.id} className="border-b border-white/5">
                    <td className="py-3 pr-4">
                      <div>
                        <p className="font-medium text-foreground">{admin.full_name || 'Unknown'}</p>
                        <p className="text-xs text-muted-foreground">Admin since {new Date(admin.created_at).toLocaleDateString()}</p>
                      </div>
                    </td>
                    <td className="py-3 pr-4">
                      <Select
                        defaultValue={admin.admin_role || 'moderator'}
                        onValueChange={(val) => handleRoleChange(admin.id, val)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="superadmin">Superadmin</SelectItem>
                          <SelectItem value="moderator">Moderator</SelectItem>
                          <SelectItem value="analyst">Analyst</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">{admin.granted_by}</td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatDate(admin.last_action)}
                    </td>
                    <td className="py-3">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => setRevokeTarget(admin)}
                      >
                        Revoke
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Add Admin */}
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardHeader>
          <CardTitle className="font-display text-base">Add Admin</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name or email..."
              className="flex-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSearch()
              }}
            />
            <Select
              value={grantRole}
              onValueChange={(val) => setGrantRole(val as typeof grantRole)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="superadmin">Superadmin</SelectItem>
                <SelectItem value="moderator">Moderator</SelectItem>
                <SelectItem value="analyst">Analyst</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch} disabled={searching || !searchQuery.trim()}>
              {searching ? 'Searching...' : 'Search'}
            </Button>
          </div>

          {searchResults.length > 0 && (
            <div className="space-y-2">
              {searchResults.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between rounded-md border border-white/5 bg-[#0A0A0F] px-4 py-3"
                >
                  <div>
                    <p className="font-body text-sm font-medium text-foreground">
                      {user.full_name || 'Unknown'}
                    </p>
                    <p className="font-body text-xs text-muted-foreground">{user.is_admin ? user.admin_role : 'Not admin'}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {user.is_admin ? (
                      <Badge variant="secondary">
                        Already {user.admin_role || 'admin'}
                      </Badge>
                    ) : (
                      <Button size="sm" onClick={() => handleGrant(user.id)}>
                        Grant {grantRole}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={!!revokeTarget} onOpenChange={() => setRevokeTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display">Revoke Admin Access</DialogTitle>
            <DialogDescription className="font-body">
              Are you sure you want to revoke admin access for{' '}
              <strong>{revokeTarget?.full_name || 'this user'}</strong>? This action will be
              logged.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRevokeTarget(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleRevoke}>
              Revoke Access
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ─── Section C: Subscription Pricing ────────────────────────────────

function PricingSection() {
  return (
    <Card className="border-white/5 bg-[#0D0D14]">
      <CardHeader>
        <CardTitle className="font-display text-base">Subscription Tiers</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="overflow-x-auto">
          <table className="font-body w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-muted-foreground">
                <th className="pb-3 pr-4">Tier</th>
                <th className="pb-3 pr-4">Price</th>
                <th className="pb-3">Features</th>
              </tr>
            </thead>
            <tbody>
              {TIER_PRICES.map((tier) => (
                <tr key={tier.name} className="border-b border-white/5">
                  <td className="py-3 pr-4">
                    <Badge
                      variant={tier.name === 'Free' ? 'secondary' : 'default'}
                      className={
                        tier.name === 'Premium'
                          ? 'bg-[#3A8FD4] text-white'
                          : tier.name === 'Boost'
                            ? 'bg-[#FF6B2B] text-white'
                            : ''
                      }
                    >
                      {tier.name}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 font-medium text-foreground">
                    {tier.price === 0 ? '$0' : `$${(tier.price / 100).toFixed(2)}/mo`}
                  </td>
                  <td className="py-3 text-muted-foreground">{tier.features}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <Separator className="bg-white/5" />

        <div className="flex items-center gap-3">
          <p className="font-body text-sm text-muted-foreground">
            Pricing is managed through the Stripe Dashboard.
          </p>
          <Button variant="outline" size="sm" asChild>
            <a href="https://dashboard.stripe.com/products" target="_blank" rel="noopener noreferrer">
              Edit in Stripe
              <svg
                className="ml-1.5 h-3 w-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                />
              </svg>
            </a>
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

// ─── Section D: Integration Status ──────────────────────────────────

function IntegrationsSection() {
  const [integrations, setIntegrations] = useState<Integration[]>([])
  const [appleJwtExpiry, setAppleJwtExpiry] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [now] = useState(() => Date.now())

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function fetchIntegrations() {
      try {
        const result = await checkIntegrationStatus()
        if (!cancelled) {
          setIntegrations(result.integrations)
          setAppleJwtExpiry(result.appleJwtExpiry)
        }
      } catch (err) {
        if (!cancelled) toast.error('Failed to check integrations: ' + (err instanceof Error ? err.message : 'Unknown error'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchIntegrations()
    return () => { cancelled = true }
  }, [refreshKey])

  const daysUntilAppleExpiry = appleJwtExpiry
    ? Math.ceil((new Date(appleJwtExpiry).getTime() - now) / (1000 * 60 * 60 * 24))
    : null

  if (loading) {
    return (
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardContent className="space-y-4 pt-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardHeader>
          <CardTitle className="font-display text-base">Integration Health</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {integrations.map((integration) => (
            <div
              key={integration.name}
              className="flex items-center justify-between rounded-md border border-white/5 bg-[#0A0A0F] px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {integration.status === 'ok' && (
                  <span className="text-green-400" title="OK">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
                {integration.status === 'not_configured' && (
                  <span className="text-yellow-400" title="Not Configured">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3l9.66 16.59A1 1 0 0120.78 21H3.22a1 1 0 01-.88-1.41L12 3z" />
                    </svg>
                  </span>
                )}
                {integration.status === 'error' && (
                  <span className="text-red-400" title="Error">
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </span>
                )}
                <span className="font-body text-sm font-medium text-foreground">
                  {integration.name}
                </span>
              </div>
              <div className="flex items-center gap-3">
                {integration.latency !== undefined && (
                  <span className="font-body text-xs text-muted-foreground">
                    {integration.latency}ms
                  </span>
                )}
                {integration.detail && (
                  <span className="font-body text-xs text-red-400">{integration.detail}</span>
                )}
                <Badge
                  variant="secondary"
                  className={
                    integration.status === 'ok'
                      ? 'bg-green-400/10 text-green-400'
                      : integration.status === 'not_configured'
                        ? 'bg-yellow-400/10 text-yellow-400'
                        : 'bg-red-400/10 text-red-400'
                  }
                >
                  {integration.status === 'ok'
                    ? 'Connected'
                    : integration.status === 'not_configured'
                      ? 'Not Configured'
                      : 'Error'}
                </Badge>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Apple JWT Expiry */}
      {appleJwtExpiry && (
        <Card className="border-white/5 bg-[#0D0D14]">
          <CardHeader>
            <CardTitle className="font-display text-base">Apple SSO JWT</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-body text-sm text-foreground">
                  JWT Secret Expiry:{' '}
                  <span className="font-medium">{new Date(appleJwtExpiry).toLocaleDateString()}</span>
                </p>
                <p className="font-body text-xs text-muted-foreground">
                  {daysUntilAppleExpiry !== null && daysUntilAppleExpiry > 0
                    ? `${daysUntilAppleExpiry} days remaining`
                    : 'Expired'}
                </p>
              </div>
              <Badge
                variant="secondary"
                className={
                  daysUntilAppleExpiry !== null && daysUntilAppleExpiry > 90
                    ? 'bg-green-400/10 text-green-400'
                    : daysUntilAppleExpiry !== null && daysUntilAppleExpiry > 30
                      ? 'bg-yellow-400/10 text-yellow-400'
                      : 'bg-red-400/10 text-red-400'
                }
              >
                {daysUntilAppleExpiry !== null && daysUntilAppleExpiry > 90
                  ? 'Healthy'
                  : daysUntilAppleExpiry !== null && daysUntilAppleExpiry > 30
                    ? 'Expiring Soon'
                    : 'Critical'}
              </Badge>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setRefreshKey((k) => k + 1)}>
          Refresh Status
        </Button>
      </div>
    </div>
  )
}

// ─── Section E: Data Management ─────────────────────────────────────

function DataManagementSection() {
  const [tableCounts, setTableCounts] = useState<{ table: string; count: number }[]>([])
  const [loading, setLoading] = useState(true)

  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    let cancelled = false
    async function fetchStats() {
      try {
        const { tableCounts: data } = await getDatabaseStats()
        if (!cancelled) setTableCounts(data)
      } catch (err) {
        if (!cancelled) toast.error('Failed to load stats: ' + (err instanceof Error ? err.message : 'Unknown error'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchStats()
    return () => { cancelled = true }
  }, [refreshKey])

  if (loading) {
    return (
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardContent className="space-y-4 pt-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardHeader>
          <CardTitle className="font-display text-base">Database Row Counts</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="font-body w-full text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-muted-foreground">
                  <th className="pb-3 pr-4">Table</th>
                  <th className="pb-3 text-right">Rows</th>
                </tr>
              </thead>
              <tbody>
                {tableCounts.map(({ table, count }) => (
                  <tr key={table} className="border-b border-white/5">
                    <td className="py-2.5 pr-4">
                      <code className="rounded bg-white/5 px-1.5 py-0.5 text-xs text-foreground">
                        {table}
                      </code>
                    </td>
                    <td className="py-2.5 text-right font-medium text-foreground">
                      {count.toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card className="border-white/5 bg-[#0D0D14]">
        <CardHeader>
          <CardTitle className="font-display text-base">Maintenance Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button
            variant="outline"
            onClick={() => toast.info('Cleanup job will be available in a future cycle')}
          >
            Run Cleanup
          </Button>
          <Button
            variant="outline"
            onClick={() => toast.info('Expired boosts check will be available in a future cycle')}
          >
            Run Expired Boosts Check
          </Button>
          <Button variant="outline" onClick={() => setRefreshKey((k) => k + 1)}>
            Refresh Counts
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Section F: Audit Log ───────────────────────────────────────────

function AuditLogSection() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [total, setTotal] = useState(0)
  const [expandedRow, setExpandedRow] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)

  useEffect(() => {
    let cancelled = false
    async function fetchLogs() {
      setLoading(true)
      try {
        const result = await getAuditLog({ page })
        if (!cancelled) {
          setLogs(result.logs as AuditLogEntry[])
          setTotalPages(result.totalPages)
          setTotal(result.total)
        }
      } catch (err) {
        if (!cancelled) toast.error('Failed to load audit log: ' + (err instanceof Error ? err.message : 'Unknown error'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchLogs()
    return () => { cancelled = true }
  }, [page])

  const handleExport = async () => {
    setExporting(true)
    try {
      const csv = await exportAuditLogCSV()
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `audit-log-${new Date().toISOString().slice(0, 10)}.csv`
      link.click()
      URL.revokeObjectURL(url)
      toast.success('Audit log exported')
    } catch (err) {
      toast.error('Export failed: ' + (err instanceof Error ? err.message : 'Unknown error'))
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-4">
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-display text-base">Audit Log</CardTitle>
            <p className="font-body mt-1 text-xs text-muted-foreground">
              {total.toLocaleString()} total entries
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <p className="font-body py-8 text-center text-sm text-muted-foreground">
              No audit log entries found.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="font-body w-full text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-muted-foreground">
                    <th className="pb-3 pr-4">Admin</th>
                    <th className="pb-3 pr-4">Action</th>
                    <th className="pb-3 pr-4">Target</th>
                    <th className="pb-3 pr-4">Date</th>
                    <th className="pb-3">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map((log) => (
                    <tr key={log.id} className="border-b border-white/5">
                      <td className="py-3 pr-4 font-medium text-foreground">{log.admin_name}</td>
                      <td className="py-3 pr-4">
                        <Badge variant="secondary" className="font-mono text-xs">
                          {log.action}
                        </Badge>
                      </td>
                      <td className="py-3 pr-4 text-muted-foreground">
                        <span className="text-xs">
                          {log.target_type}/{log.target_id?.slice(0, 8)}
                        </span>
                      </td>
                      <td className="py-3 pr-4 text-xs text-muted-foreground">
                        {formatDate(log.created_at)}
                      </td>
                      <td className="py-3">
                        {log.metadata && Object.keys(log.metadata).length > 0 && (
                          <button
                            className="font-body text-xs text-[#3A8FD4] hover:underline"
                            onClick={() =>
                              setExpandedRow(expandedRow === log.id ? null : log.id)
                            }
                          >
                            {expandedRow === log.id ? 'Hide' : 'Show'}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {/* Expanded metadata rows rendered separately to avoid nesting issues */}
                  {logs.map(
                    (log) =>
                      expandedRow === log.id &&
                      log.metadata &&
                      Object.keys(log.metadata).length > 0 && (
                        <tr key={`${log.id}-meta`} className="border-b border-white/5">
                          <td colSpan={5} className="px-4 py-3">
                            <pre className="overflow-x-auto rounded bg-[#0A0A0F] p-3 font-mono text-xs text-muted-foreground">
                              {JSON.stringify(log.metadata, null, 2)}
                            </pre>
                          </td>
                        </tr>
                      )
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="font-body text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1 || loading}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages || loading}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

// ─── Weekly Briefs Archive ─────────────────────────────────────────

function WeeklyBriefsSection() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [briefs, setBriefs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchBriefs() {
      setLoading(true)
      try {
        const data = await getWeeklyBriefs(20)
        if (!cancelled) setBriefs(data)
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchBriefs()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="space-y-4">
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardHeader>
          <CardTitle className="font-display text-base text-foreground">
            Weekly Briefs Archive
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="font-body text-sm text-muted-foreground">Loading...</p>
          ) : briefs.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground">No briefs generated yet. The weekly brief cron runs every Monday at 8:00 AM CT.</p>
          ) : (
            <div className="space-y-3">
              {briefs.map((brief) => (
                <div
                  key={brief.id}
                  className="rounded-lg border border-white/5 bg-surface p-4"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-display text-sm font-semibold text-foreground">
                        Week of {brief.period_start} — {brief.period_end}
                      </p>
                      <p className="font-body text-xs text-muted-foreground">
                        Sent to: {(brief.sent_to || []).join(', ') || 'None'}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="font-body text-xs"
                      onClick={() => setExpanded(expanded === brief.id ? null : brief.id)}
                    >
                      {expanded === brief.id ? 'Collapse' : 'View Brief'}
                    </Button>
                  </div>
                  {expanded === brief.id && (
                    <div className="mt-4 space-y-3 border-t border-white/5 pt-4">
                      <div className="prose prose-invert max-w-none">
                        <pre className="whitespace-pre-wrap rounded bg-[#0D0D14] p-4 font-body text-sm text-foreground">
                          {brief.ai_brief}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
