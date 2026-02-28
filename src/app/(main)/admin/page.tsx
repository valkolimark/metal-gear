'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  Users,
  Package,
  DollarSign,
  Crown,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Shield,
  Ban,
  CheckCircle2,
  XCircle,
  BarChart3,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import {
  checkIsAdmin,
  getAdminStats,
  getAdminListings,
  getAdminUsers,
  adminUpdateListingStatus,
  adminToggleUserBan,
  getSignupsByMonth,
  getListingsByMonth,
} from '@/app/actions/admin'
import { TIER_LABELS } from '@/lib/constants'

interface Stats {
  totalUsers: number
  totalListings: number
  activeListings: number
  activeSubscriptions: number
  totalRevenue: number
}

interface ChartData {
  month: string
  count: number
}

export default function AdminPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [listings, setListings] = useState<any[]>([])
  const [listingTotal, setListingTotal] = useState(0)
  const [listingPage, setListingPage] = useState(1)
  const [listingFilter, setListingFilter] = useState<string | undefined>()
  const [users, setUsers] = useState<any[]>([])
  const [userTotal, setUserTotal] = useState(0)
  const [userPage, setUserPage] = useState(1)
  const [signupChart, setSignupChart] = useState<ChartData[]>([])
  const [listingChart, setListingChart] = useState<ChartData[]>([])

  useEffect(() => {
    checkIsAdmin().then((isAdmin) => {
      if (!isAdmin) {
        router.replace('/dashboard')
        return
      }
      loadAll()
    })
  }, [router])

  async function loadAll() {
    try {
      const [statsData, listingsData, usersData, signups, listingsChart] =
        await Promise.all([
          getAdminStats(),
          getAdminListings(1),
          getAdminUsers(1),
          getSignupsByMonth(),
          getListingsByMonth(),
        ])
      setStats(statsData)
      setListings(listingsData.listings)
      setListingTotal(listingsData.total)
      setUsers(usersData.users)
      setUserTotal(usersData.total)
      setSignupChart(signups)
      setListingChart(listingsChart)
    } catch {
      toast.error('Failed to load admin data')
    } finally {
      setLoading(false)
    }
  }

  async function loadListings(page: number, status?: string) {
    const data = await getAdminListings(page, status)
    setListings(data.listings)
    setListingTotal(data.total)
    setListingPage(page)
  }

  async function loadUsers(page: number) {
    const data = await getAdminUsers(page)
    setUsers(data.users)
    setUserTotal(data.total)
    setUserPage(page)
  }

  async function handleListingAction(id: string, status: string) {
    try {
      await adminUpdateListingStatus(id, status)
      toast.success(`Listing ${status}`)
      loadListings(listingPage, listingFilter)
    } catch {
      toast.error('Failed to update listing')
    }
  }

  async function handleBanToggle(userId: string, currentlyBanned: boolean) {
    try {
      await adminToggleUserBan(userId, !currentlyBanned)
      toast.success(currentlyBanned ? 'User unbanned' : 'User banned')
      loadUsers(userPage)
    } catch {
      toast.error('Failed to update user')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!stats) return null

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Shield className="size-7 text-primary" />
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            Admin Dashboard
          </h1>
          <p className="font-body text-sm text-muted-foreground">
            Platform overview and management
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard
          icon={Users}
          label="Total Users"
          value={stats.totalUsers.toLocaleString()}
        />
        <StatCard
          icon={Package}
          label="Total Listings"
          value={stats.totalListings.toLocaleString()}
        />
        <StatCard
          icon={Package}
          label="Active Listings"
          value={stats.activeListings.toLocaleString()}
        />
        <StatCard
          icon={Crown}
          label="Paid Subscribers"
          value={stats.activeSubscriptions.toLocaleString()}
        />
        <StatCard
          icon={DollarSign}
          label="Total Revenue"
          value={`$${(stats.totalRevenue / 100).toLocaleString()}`}
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <MiniChart title="Signups (Last 6 Months)" data={signupChart} />
        <MiniChart title="Listings Created (Last 6 Months)" data={listingChart} />
      </div>

      {/* Tabs */}
      <Tabs defaultValue="listings">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="listings" className="font-body">
            Listings ({listingTotal})
          </TabsTrigger>
          <TabsTrigger value="users" className="font-body">
            Users ({userTotal})
          </TabsTrigger>
        </TabsList>

        {/* Listings Tab */}
        <TabsContent value="listings" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {[undefined, 'active', 'draft', 'sold', 'removed'].map((s) => (
              <Button
                key={s ?? 'all'}
                variant={listingFilter === s ? 'default' : 'outline'}
                size="sm"
                className="font-body text-xs"
                onClick={() => {
                  setListingFilter(s)
                  loadListings(1, s)
                }}
              >
                {s ?? 'All'}
              </Button>
            ))}
          </div>

          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full font-body text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="p-3">Title</th>
                      <th className="p-3">Seller</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Views</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((l: any) => (
                      <tr
                        key={l.id}
                        className="border-b border-border/50 transition-colors hover:bg-surface"
                      >
                        <td className="max-w-[200px] truncate p-3 font-medium text-foreground">
                          {l.title}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {l.profiles?.display_name || l.profiles?.full_name || 'Unknown'}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {l.category}
                        </td>
                        <td className="p-3">
                          <StatusBadge status={l.status} />
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {l.views_count}
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {l.status !== 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-green-400 hover:text-green-300"
                                onClick={() =>
                                  handleListingAction(l.id, 'active')
                                }
                              >
                                <CheckCircle2 className="mr-1 size-3" />
                                Approve
                              </Button>
                            )}
                            {l.status !== 'removed' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
                                onClick={() =>
                                  handleListingAction(l.id, 'removed')
                                }
                              >
                                <XCircle className="mr-1 size-3" />
                                Remove
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {listings.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-8 text-center text-muted-foreground"
                        >
                          No listings found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Pagination
            page={listingPage}
            total={listingTotal}
            perPage={20}
            onPageChange={(p) => loadListings(p, listingFilter)}
          />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4 space-y-4">
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full font-body text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="p-3">Name</th>
                      <th className="p-3">Company</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Tier</th>
                      <th className="p-3">Joined</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((u: any) => {
                      const isBanned = u.bio?.startsWith('[BANNED]')
                      return (
                        <tr
                          key={u.id}
                          className={`border-b border-border/50 transition-colors hover:bg-surface ${
                            isBanned ? 'opacity-60' : ''
                          }`}
                        >
                          <td className="p-3 font-medium text-foreground">
                            {u.display_name || u.full_name || 'Anonymous'}
                            {u.is_admin && (
                              <Badge className="ml-2 bg-primary/20 text-primary text-[10px]">
                                Admin
                              </Badge>
                            )}
                            {isBanned && (
                              <Badge className="ml-2 bg-red-500/20 text-red-400 text-[10px]">
                                Banned
                              </Badge>
                            )}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {u.company_name || '—'}
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {u.location_city && u.location_state
                              ? `${u.location_city}, ${u.location_state}`
                              : '—'}
                          </td>
                          <td className="p-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${
                                u.subscription_tier === 'boost'
                                  ? 'border-primary/50 text-primary'
                                  : u.subscription_tier === 'premium'
                                    ? 'border-blue-500/50 text-blue-400'
                                    : ''
                              }`}
                            >
                              {TIER_LABELS[
                                u.subscription_tier as keyof typeof TIER_LABELS
                              ] ?? 'Free'}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">
                            {new Date(u.created_at).toLocaleDateString()}
                          </td>
                          <td className="p-3">
                            {!u.is_admin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className={`h-7 px-2 text-xs ${
                                  isBanned
                                    ? 'text-green-400 hover:text-green-300'
                                    : 'text-red-400 hover:text-red-300'
                                }`}
                                onClick={() =>
                                  handleBanToggle(u.id, isBanned)
                                }
                              >
                                <Ban className="mr-1 size-3" />
                                {isBanned ? 'Unban' : 'Ban'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {users.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-8 text-center text-muted-foreground"
                        >
                          No users found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Pagination
            page={userPage}
            total={userTotal}
            perPage={20}
            onPageChange={loadUsers}
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType
  label: string
  value: string
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex size-10 items-center justify-center rounded-lg bg-surface">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-display text-xl font-bold text-foreground">
            {value}
          </p>
          <p className="font-body text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    active: 'border-green-500/50 text-green-400',
    draft: 'border-yellow-500/50 text-yellow-400',
    sold: 'border-blue-500/50 text-blue-400',
    removed: 'border-red-500/50 text-red-400',
    expired: 'border-zinc-500/50 text-zinc-400',
  }
  return (
    <Badge
      variant="outline"
      className={`text-[10px] ${colors[status] ?? ''}`}
    >
      {status}
    </Badge>
  )
}

function Pagination({
  page,
  total,
  perPage,
  onPageChange,
}: {
  page: number
  total: number
  perPage: number
  onPageChange: (page: number) => void
}) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between">
      <p className="font-body text-xs text-muted-foreground">
        Showing {(page - 1) * perPage + 1}–
        {Math.min(page * perPage, total)} of {total}
      </p>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function MiniChart({
  title,
  data,
}: {
  title: string
  data: ChartData[]
}) {
  if (data.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <BarChart3 className="size-4 text-muted-foreground" />
            {title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center font-body text-sm text-muted-foreground">
            No data yet
          </p>
        </CardContent>
      </Card>
    )
  }

  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-base">
          <BarChart3 className="size-4 text-muted-foreground" />
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          {data.map((d) => (
            <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
              <span className="font-body text-xs text-foreground">
                {d.count}
              </span>
              <div
                className="w-full rounded-t bg-primary/80"
                style={{
                  height: `${Math.max((d.count / max) * 120, 4)}px`,
                }}
              />
              <span className="font-body text-[10px] text-muted-foreground">
                {d.month.slice(5)}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
