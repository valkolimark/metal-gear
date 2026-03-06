'use client'

import { useEffect, useState } from 'react'
import {
  Star,
  Search,
  Loader2,
  ChevronUp,
  ChevronDown,
  X,
  Plus,
  Gift,
  Clock,
  Pin,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
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
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { BOOST_PRODUCTS, EQUIPMENT_CATEGORIES, type BoostType } from '@/lib/constants'
import {
  getCompanyTiers,
  updateCompanyTier,
  getAllActiveBoosts,
  adminCancelBoost,
  adminExtendBoost,
  adminGrantFreeBoost,
  getHomepageFeaturedSlots,
  addHomepageSlot,
  removeHomepageSlot,
  reorderHomepageSlots,
  getCategoryPins,
  setCategoryPin,
  removeCategoryPin,
} from '@/app/actions/priority'

type Tab = 'tiers' | 'boosts' | 'homepage' | 'pins' | 'sos'

const TIER_BADGES: Record<string, { color: string; label: string }> = {
  standard: { color: 'bg-zinc-500/20 text-zinc-400', label: 'Standard' },
  preferred: { color: 'bg-blue-500/20 text-blue-400', label: 'Preferred' },
  featured: { color: 'bg-yellow-500/20 text-yellow-400', label: 'Featured' },
  platinum: { color: 'bg-purple-500/20 text-purple-400', label: 'Platinum' },
}

export default function AdminPriorityPage() {
  const [tab, setTab] = useState<Tab>('tiers')

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Priority Engine</h1>

      {/* Tab Nav */}
      <div className="flex gap-1 overflow-x-auto rounded-lg border border-white/5 bg-[#0D0D14] p-1">
        {[
          { id: 'tiers' as const, label: 'Company Tiers', icon: Star },
          { id: 'boosts' as const, label: 'Active Boosts', icon: Zap },
          { id: 'homepage' as const, label: 'Homepage Slots', icon: Pin },
          { id: 'pins' as const, label: 'Category Pins', icon: Pin },
          { id: 'sos' as const, label: 'SOS Priority', icon: Zap },
        ].map(({ id, label, icon: TabIcon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 whitespace-nowrap rounded-md px-3 py-2 font-body text-sm transition-colors ${
              tab === id
                ? 'bg-primary/10 text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <TabIcon className="size-3.5" />
            {label}
          </button>
        ))}
      </div>

      {tab === 'tiers' && <CompanyTiersSection />}
      {tab === 'boosts' && <ActiveBoostsSection />}
      {tab === 'homepage' && <HomepageSlotsSection />}
      {tab === 'pins' && <CategoryPinsSection />}
      {tab === 'sos' && <SOSPrioritySection />}
    </div>
  )
}

// ─── Section A: Company Priority Tiers ─────────────────────────────

function CompanyTiersSection() {
  const [companies, setCompanies] = useState<Array<{
    id: string; full_name: string; company_name: string | null; priority_tier: string
    priority_score: number; listing_count: number; set_by_name: string | null
  }>>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [editModal, setEditModal] = useState<{
    id: string; name: string; tier: string; score: number
  } | null>(null)
  const [saving, setSaving] = useState(false)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    async function load() {
      setLoading(true)
      const result = await getCompanyTiers({ page, search, tier: tierFilter })
      setCompanies(result.companies as typeof companies)
      setTotal(result.total)
      setLoading(false)
    }
    load()
  }, [page, search, tierFilter, refreshKey])

  async function handleSaveTier() {
    if (!editModal) return
    setSaving(true)
    try {
      await updateCompanyTier(
        editModal.id,
        editModal.tier as 'standard' | 'preferred' | 'featured' | 'platinum',
        editModal.score
      )
      toast.success('Priority tier updated')
      setEditModal(null)
      setRefreshKey((k) => k + 1)
    } catch {
      toast.error('Failed to update tier')
    }
    setSaving(false)
  }

  return (
    <Card className="border-white/5 bg-[#0D0D14]">
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="font-display text-base">Company Priority Tiers</CardTitle>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="h-8 w-48 pl-8 font-body text-sm"
            />
          </div>
          <Select value={tierFilter} onValueChange={(v) => { setTierFilter(v); setPage(1) }}>
            <SelectTrigger className="h-8 w-36 font-body text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tiers</SelectItem>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="preferred">Preferred</SelectItem>
              <SelectItem value="featured">Featured</SelectItem>
              <SelectItem value="platinum">Platinum</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full font-body text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-left text-xs text-muted-foreground">
                    <th className="pb-2 pr-4">User / Company</th>
                    <th className="pb-2 pr-4">Listings</th>
                    <th className="pb-2 pr-4">Tier</th>
                    <th className="pb-2 pr-4">Score</th>
                    <th className="pb-2 pr-4">Set By</th>
                    <th className="pb-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {companies.map((c) => {
                    const badge = TIER_BADGES[c.priority_tier] || TIER_BADGES.standard
                    return (
                      <tr key={c.id} className="border-b border-white/5">
                        <td className="py-3 pr-4">
                          <p className="font-medium text-foreground">{c.company_name || c.full_name}</p>
                          {c.company_name && (
                            <p className="text-xs text-muted-foreground">{c.full_name}</p>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{c.listing_count}</td>
                        <td className="py-3 pr-4">
                          <Badge className={badge.color}>{badge.label}</Badge>
                        </td>
                        <td className="py-3 pr-4 text-muted-foreground">{c.priority_score}</td>
                        <td className="py-3 pr-4 text-muted-foreground">{c.set_by_name || '—'}</td>
                        <td className="py-3">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditModal({
                              id: c.id,
                              name: c.company_name || c.full_name,
                              tier: c.priority_tier,
                              score: c.priority_score,
                            })}
                            className="h-7 font-body text-xs"
                          >
                            Edit
                          </Button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            {total > 50 && (
              <div className="mt-4 flex items-center justify-center gap-2">
                <Button size="sm" variant="outline" disabled={page === 1} onClick={() => setPage((p) => p - 1)}>Prev</Button>
                <span className="font-body text-xs text-muted-foreground">Page {page}</span>
                <Button size="sm" variant="outline" disabled={companies.length < 50} onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            )}
          </>
        )}
      </CardContent>

      {/* Edit Tier Modal */}
      <Dialog open={!!editModal} onOpenChange={(v) => !v && setEditModal(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Edit Priority — {editModal?.name}</DialogTitle>
          </DialogHeader>
          {editModal && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label className="font-body">Tier</Label>
                <Select value={editModal.tier} onValueChange={(v) => setEditModal({ ...editModal, tier: v })}>
                  <SelectTrigger className="font-body text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="standard">Standard (+0 boost)</SelectItem>
                    <SelectItem value="preferred">Preferred (+10 boost)</SelectItem>
                    <SelectItem value="featured">Featured (+25 boost)</SelectItem>
                    <SelectItem value="platinum">Platinum (+50 boost)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="font-body">Priority Score (0-1000)</Label>
                <Input
                  type="number"
                  min={0}
                  max={1000}
                  value={editModal.score}
                  onChange={(e) => setEditModal({ ...editModal, score: parseInt(e.target.value) || 0 })}
                  className="font-body"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditModal(null)}>Cancel</Button>
            <Button onClick={handleSaveTier} disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ─── Section B: Active Boosts Overview ─────────────────────────────

function ActiveBoostsSection() {
  const [boosts, setBoosts] = useState<Array<{
    id: string; user_id: string; user_name: string; listing_id: string | null
    listing_title: string | null; boost_type: string; expires_at: string
    amount_cents: number; admin_override: boolean
  }>>([])
  const [page, setPage] = useState(1)
  const [typeFilter, setTypeFilter] = useState('all')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [grantModal, setGrantModal] = useState(false)
  const [grantForm, setGrantForm] = useState({
    userId: '',
    boostType: 'listing_featured' as BoostType,
    duration: 14,
    listingId: '',
  })

  useEffect(() => {
    async function load() {
      setLoading(true)
      const result = await getAllActiveBoosts({ page, boostType: typeFilter })
      setBoosts(result.boosts as typeof boosts)
      setLoading(false)
    }
    load()
  }, [page, typeFilter, refreshKey])

  async function handleCancel(id: string, refund: boolean) {
    try {
      await adminCancelBoost(id, refund)
      toast.success(refund ? 'Boost refunded' : 'Boost cancelled')
      setRefreshKey((k) => k + 1)
    } catch { toast.error('Failed') }
  }

  async function handleExtend(id: string) {
    try {
      await adminExtendBoost(id, 7)
      toast.success('Boost extended by 7 days')
      setRefreshKey((k) => k + 1)
    } catch { toast.error('Failed') }
  }

  async function handleGrant() {
    if (!grantForm.userId) { toast.error('Enter a user ID'); return }
    try {
      await adminGrantFreeBoost(
        grantForm.userId,
        grantForm.boostType,
        grantForm.duration,
        grantForm.listingId || undefined
      )
      toast.success('Free boost granted')
      setGrantModal(false)
      setRefreshKey((k) => k + 1)
    } catch { toast.error('Failed to grant boost') }
  }

  const [now] = useState(() => Date.now())

  function daysLeft(d: string) {
    return Math.max(0, Math.ceil((new Date(d).getTime() - now) / (1000 * 60 * 60 * 24)))
  }

  return (
    <Card className="border-white/5 bg-[#0D0D14]">
      <CardHeader className="flex-row items-center justify-between gap-4 space-y-0">
        <CardTitle className="font-display text-base">Active Boosts</CardTitle>
        <div className="flex items-center gap-2">
          <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1) }}>
            <SelectTrigger className="h-8 w-44 font-body text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              {Object.entries(BOOST_PRODUCTS).map(([k, v]) => (
                <SelectItem key={k} value={k}>{v.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" onClick={() => setGrantModal(true)} className="font-body text-xs">
            <Gift className="mr-1 size-3" /> Grant Free
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : boosts.length === 0 ? (
          <p className="py-8 text-center font-body text-sm text-muted-foreground">No active boosts</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-body text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4">User</th>
                  <th className="pb-2 pr-4">Type</th>
                  <th className="pb-2 pr-4">Listing</th>
                  <th className="pb-2 pr-4">Days Left</th>
                  <th className="pb-2 pr-4">Paid</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {boosts.map((b) => (
                  <tr key={b.id} className="border-b border-white/5">
                    <td className="py-3 pr-4 text-foreground">{b.user_name}</td>
                    <td className="py-3 pr-4">
                      <Badge variant="secondary" className="text-[10px]">
                        {BOOST_PRODUCTS[b.boost_type as BoostType]?.label || b.boost_type}
                      </Badge>
                    </td>
                    <td className="max-w-[160px] truncate py-3 pr-4 text-muted-foreground">
                      {b.listing_title || '—'}
                    </td>
                    <td className="py-3 pr-4">
                      <span className={daysLeft(b.expires_at) <= 3 ? 'text-red-400' : 'text-muted-foreground'}>
                        {daysLeft(b.expires_at)}d
                      </span>
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {b.admin_override ? 'Free' : `$${(b.amount_cents / 100).toFixed(0)}`}
                    </td>
                    <td className="py-3">
                      <div className="flex gap-1">
                        <Button size="sm" variant="ghost" onClick={() => handleExtend(b.id)} className="h-7 px-2 text-xs">+7d</Button>
                        <Button size="sm" variant="ghost" onClick={() => handleCancel(b.id, false)} className="h-7 px-2 text-xs text-red-400">Cancel</Button>
                        {!b.admin_override && b.amount_cents > 0 && (
                          <Button size="sm" variant="ghost" onClick={() => handleCancel(b.id, true)} className="h-7 px-2 text-xs text-yellow-400">Refund</Button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      {/* Grant Free Boost Modal */}
      <Dialog open={grantModal} onOpenChange={setGrantModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Grant Free Boost</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-body">User ID</Label>
              <Input
                value={grantForm.userId}
                onChange={(e) => setGrantForm({ ...grantForm, userId: e.target.value })}
                placeholder="UUID"
                className="font-body text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Boost Type</Label>
              <Select value={grantForm.boostType} onValueChange={(v) => setGrantForm({ ...grantForm, boostType: v as BoostType })}>
                <SelectTrigger className="font-body text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(BOOST_PRODUCTS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-body">Duration (days)</Label>
              <Input
                type="number"
                value={grantForm.duration}
                onChange={(e) => setGrantForm({ ...grantForm, duration: parseInt(e.target.value) || 7 })}
                className="font-body text-sm"
              />
            </div>
            {BOOST_PRODUCTS[grantForm.boostType]?.needsListing && (
              <div className="space-y-2">
                <Label className="font-body">Listing ID (optional)</Label>
                <Input
                  value={grantForm.listingId}
                  onChange={(e) => setGrantForm({ ...grantForm, listingId: e.target.value })}
                  placeholder="UUID"
                  className="font-body text-sm"
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGrantModal(false)}>Cancel</Button>
            <Button onClick={handleGrant}>Grant Boost</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ─── Section C: Homepage Featured Slots ────────────────────────────

function HomepageSlotsSection() {
  const [slots, setSlots] = useState<Array<{
    id: string; slot_type: string; target_id: string; target_name: string
    position: number; label: string | null; ends_at: string | null
  }>>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [addModal, setAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ slotType: 'listing' as 'listing' | 'company', targetId: '', label: '' })

  useEffect(() => {
    async function load() {
      setLoading(true)
      const result = await getHomepageFeaturedSlots()
      setSlots(result.slots as typeof slots)
      setLoading(false)
    }
    load()
  }, [refreshKey])

  async function handleRemove(slotId: string) {
    try {
      await removeHomepageSlot(slotId)
      toast.success('Slot removed')
      setRefreshKey((k) => k + 1)
    } catch { toast.error('Failed') }
  }

  async function handleMove(index: number, direction: 'up' | 'down') {
    const newSlots = [...slots]
    const swapIdx = direction === 'up' ? index - 1 : index + 1
    if (swapIdx < 0 || swapIdx >= newSlots.length) return
    ;[newSlots[index], newSlots[swapIdx]] = [newSlots[swapIdx], newSlots[index]]
    setSlots(newSlots)
    try {
      await reorderHomepageSlots(newSlots.map((s) => s.id))
    } catch { toast.error('Failed to reorder') }
  }

  async function handleAdd() {
    if (!addForm.targetId) { toast.error('Enter a target ID'); return }
    try {
      await addHomepageSlot(addForm.slotType, addForm.targetId, addForm.label || undefined)
      toast.success('Slot added')
      setAddModal(false)
      setAddForm({ slotType: 'listing', targetId: '', label: '' })
      setRefreshKey((k) => k + 1)
    } catch { toast.error('Failed to add slot') }
  }

  return (
    <Card className="border-white/5 bg-[#0D0D14]">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="font-display text-base">
          Homepage Featured Slots ({slots.length}/6)
        </CardTitle>
        <Button size="sm" onClick={() => setAddModal(true)} className="font-body text-xs">
          <Plus className="mr-1 size-3" /> Add Slot
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : slots.length === 0 ? (
          <p className="py-8 text-center font-body text-sm text-muted-foreground">No featured slots configured</p>
        ) : (
          <div className="space-y-2">
            {slots.map((slot, i) => (
              <div
                key={slot.id}
                className="flex items-center justify-between rounded-lg border border-white/5 bg-surface/30 p-3"
              >
                <div className="flex items-center gap-3">
                  <span className="font-display text-lg font-bold text-muted-foreground">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-body text-sm font-medium text-foreground">
                      {slot.target_name}
                    </p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-[10px]">
                        {slot.slot_type}
                      </Badge>
                      {slot.label && (
                        <span className="font-body text-xs text-muted-foreground">{slot.label}</span>
                      )}
                      {slot.ends_at && (
                        <span className="font-body text-xs text-muted-foreground">
                          <Clock className="mr-0.5 inline size-3" />
                          ends {new Date(slot.ends_at).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button size="sm" variant="ghost" onClick={() => handleMove(i, 'up')} disabled={i === 0} className="h-7 w-7 p-0">
                    <ChevronUp className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleMove(i, 'down')} disabled={i === slots.length - 1} className="h-7 w-7 p-0">
                    <ChevronDown className="size-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => handleRemove(slot.id)} className="h-7 w-7 p-0 text-red-400">
                    <X className="size-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Add Featured Slot</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-body">Slot Type</Label>
              <Select value={addForm.slotType} onValueChange={(v) => setAddForm({ ...addForm, slotType: v as 'listing' | 'company' })}>
                <SelectTrigger className="font-body text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="listing">Listing</SelectItem>
                  <SelectItem value="company">Company</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-body">{addForm.slotType === 'listing' ? 'Listing' : 'Company'} ID</Label>
              <Input
                value={addForm.targetId}
                onChange={(e) => setAddForm({ ...addForm, targetId: e.target.value })}
                placeholder="UUID"
                className="font-body text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Label (optional)</Label>
              <Input
                value={addForm.label}
                onChange={(e) => setAddForm({ ...addForm, label: e.target.value })}
                placeholder='e.g. "Centrifuge Week Promo"'
                className="font-body text-sm"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Add Slot</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ─── Section D: Category Pins ──────────────────────────────────────

function CategoryPinsSection() {
  const [pins, setPins] = useState<Array<{
    id: string; title: string; category: string
    pinned_position: number | null; pinned_category: string | null; featured_until: string | null
  }>>([])
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [addModal, setAddModal] = useState(false)
  const [addForm, setAddForm] = useState({ listingId: '', category: '', position: 1 })

  useEffect(() => {
    async function load() {
      setLoading(true)
      const result = await getCategoryPins()
      setPins(result.pins as typeof pins)
      setLoading(false)
    }
    load()
  }, [refreshKey])

  async function handleRemovePin(listingId: string) {
    try {
      await removeCategoryPin(listingId)
      toast.success('Pin removed')
      setRefreshKey((k) => k + 1)
    } catch { toast.error('Failed') }
  }

  async function handleAddPin() {
    if (!addForm.listingId || !addForm.category) { toast.error('Fill all fields'); return }
    try {
      await setCategoryPin(addForm.listingId, addForm.category, addForm.position)
      toast.success('Pin added')
      setAddModal(false)
      setAddForm({ listingId: '', category: '', position: 1 })
      setRefreshKey((k) => k + 1)
    } catch { toast.error('Failed') }
  }

  return (
    <Card className="border-white/5 bg-[#0D0D14]">
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle className="font-display text-base">Category Pins</CardTitle>
        <Button size="sm" onClick={() => setAddModal(true)} className="font-body text-xs">
          <Plus className="mr-1 size-3" /> Add Pin
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-primary" />
          </div>
        ) : pins.length === 0 ? (
          <p className="py-8 text-center font-body text-sm text-muted-foreground">No category pins</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full font-body text-sm">
              <thead>
                <tr className="border-b border-white/5 text-left text-xs text-muted-foreground">
                  <th className="pb-2 pr-4">Listing</th>
                  <th className="pb-2 pr-4">Category</th>
                  <th className="pb-2 pr-4">Position</th>
                  <th className="pb-2">Actions</th>
                </tr>
              </thead>
              <tbody>
                {pins.map((p) => (
                  <tr key={p.id} className="border-b border-white/5">
                    <td className="py-3 pr-4 text-foreground">{p.title}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{p.pinned_category}</td>
                    <td className="py-3 pr-4 text-muted-foreground">#{p.pinned_position}</td>
                    <td className="py-3">
                      <Button size="sm" variant="ghost" onClick={() => handleRemovePin(p.id)} className="h-7 text-xs text-red-400">
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>

      <Dialog open={addModal} onOpenChange={setAddModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Add Category Pin</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-body">Listing ID</Label>
              <Input
                value={addForm.listingId}
                onChange={(e) => setAddForm({ ...addForm, listingId: e.target.value })}
                placeholder="UUID"
                className="font-body text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="font-body">Category</Label>
              <Select value={addForm.category} onValueChange={(v) => setAddForm({ ...addForm, category: v })}>
                <SelectTrigger className="font-body text-sm"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {EQUIPMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-body">Position (1-3)</Label>
              <Select value={String(addForm.position)} onValueChange={(v) => setAddForm({ ...addForm, position: parseInt(v) })}>
                <SelectTrigger className="font-body text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Position 1</SelectItem>
                  <SelectItem value="2">Position 2</SelectItem>
                  <SelectItem value="3">Position 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModal(false)}>Cancel</Button>
            <Button onClick={handleAddPin}>Add Pin</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}

// ─── Section E: SOS Priority ───────────────────────────────────────

function SOSPrioritySection() {
  return (
    <Card className="border-white/5 bg-[#0D0D14]">
      <CardHeader>
        <CardTitle className="font-display text-base">SOS Priority Boosts</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-body text-sm text-muted-foreground">
          SOS Priority boosts are managed through the Active Boosts tab. Users who purchase SOS Priority
          have their broadcasts reach 2x more responders and appear at the top of receiver dashboards.
        </p>
        <Separator className="my-4" />
        <p className="font-body text-xs text-muted-foreground">
          To grant a free SOS Priority boost, use the &ldquo;Grant Free&rdquo; button in the Active Boosts tab
          and select &ldquo;SOS Priority&rdquo; as the boost type.
        </p>
      </CardContent>
    </Card>
  )
}
