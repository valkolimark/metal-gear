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
  Flag,
  AlertTriangle,
  Download,
  ClipboardList,
  Eye,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  checkIsAdmin,
  getAdminStats,
  getAdminListings,
  getAdminUsers,
  adminUpdateListingStatus,
  adminToggleUserBan,
  getSignupsByMonth,
  getListingsByMonth,
  getReports,
  resolveReport,
  bulkUpdateListingStatus,
  bulkBanUsers,
  getRevenueByMonth,
  getTopCategories,
  exportListingsCSV,
  exportUsersCSV,
  getAuditLog,
  getFlaggedListings,
} from '@/app/actions/admin'
import { TIER_LABELS } from '@/lib/constants'
import { getPendingVerifications, reviewVerification } from '@/app/actions/verification'
import { getAdminDisputes, resolveDispute } from '@/app/actions/disputes'

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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [listings, setListings] = useState<any[]>([])
  const [listingTotal, setListingTotal] = useState(0)
  const [listingPage, setListingPage] = useState(1)
  const [listingFilter, setListingFilter] = useState<string | undefined>()
  const [selectedListings, setSelectedListings] = useState<string[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [users, setUsers] = useState<any[]>([])
  const [userTotal, setUserTotal] = useState(0)
  const [userPage, setUserPage] = useState(1)
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [signupChart, setSignupChart] = useState<ChartData[]>([])
  const [listingChart, setListingChart] = useState<ChartData[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [reports, setReports] = useState<any[]>([])
  const [reportTotal, setReportTotal] = useState(0)
  const [reportPage, setReportPage] = useState(1)
  const [reportFilter, setReportFilter] = useState<string | undefined>()
  const [revenueChart, setRevenueChart] = useState<{ month: string; amount: number }[]>([])
  const [topCategories, setTopCategories] = useState<{ category: string; count: number }[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [auditLogs, setAuditLogs] = useState<any[]>([])
  const [auditTotal, setAuditTotal] = useState(0)
  const [auditPage, setAuditPage] = useState(1)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [flaggedListings, setFlaggedListings] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [verifications, setVerifications] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [adminDisputes, setAdminDisputes] = useState<any[]>([])
  const [disputeResNotes, setDisputeResNotes] = useState<Record<string, string>>({})

  useEffect(() => {
    checkIsAdmin().then((isAdmin) => {
      if (!isAdmin) {
        router.replace('/dashboard')
        return
      }
      loadAll()
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function loadAll() {
    try {
      const [statsData, listingsData, usersData, signups, listingsChartData, reportsData, revenue, categories, audit, flagged] =
        await Promise.all([
          getAdminStats(),
          getAdminListings(1),
          getAdminUsers(1),
          getSignupsByMonth(),
          getListingsByMonth(),
          getReports(1),
          getRevenueByMonth(),
          getTopCategories(),
          getAuditLog(1),
          getFlaggedListings(),
        ])
      setStats(statsData)
      setListings(listingsData.listings)
      setListingTotal(listingsData.total)
      setUsers(usersData.users)
      setUserTotal(usersData.total)
      setSignupChart(signups)
      setListingChart(listingsChartData)
      setReports(reportsData.reports)
      setReportTotal(reportsData.total)
      setRevenueChart(revenue)
      setTopCategories(categories)
      setAuditLogs(audit.logs)
      setAuditTotal(audit.total)
      setFlaggedListings(flagged.flagged)
      // Load verifications and disputes separately (non-blocking)
      getPendingVerifications().then((v) => setVerifications(v.verifications))
      getAdminDisputes().then((d) => setAdminDisputes(d.disputes || []))
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
    setSelectedListings([])
  }

  async function loadUsers(page: number) {
    const data = await getAdminUsers(page)
    setUsers(data.users)
    setUserTotal(data.total)
    setUserPage(page)
    setSelectedUsers([])
  }

  async function loadReports(page: number, status?: string) {
    const data = await getReports(page, status)
    setReports(data.reports)
    setReportTotal(data.total)
    setReportPage(page)
  }

  async function loadAudit(page: number) {
    const data = await getAuditLog(page)
    setAuditLogs(data.logs)
    setAuditTotal(data.total)
    setAuditPage(page)
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

  async function handleBulkListingAction(status: string) {
    if (selectedListings.length === 0) return
    try {
      await bulkUpdateListingStatus(selectedListings, status)
      toast.success(`${selectedListings.length} listing(s) updated to ${status}`)
      loadListings(listingPage, listingFilter)
    } catch {
      toast.error('Failed to update listings')
    }
  }

  async function handleBulkUserAction(ban: boolean) {
    if (selectedUsers.length === 0) return
    try {
      await bulkBanUsers(selectedUsers, ban)
      toast.success(`${selectedUsers.length} user(s) ${ban ? 'banned' : 'unbanned'}`)
      loadUsers(userPage)
    } catch {
      toast.error('Failed to update users')
    }
  }

  async function handleResolveReport(reportId: string, action: 'resolved' | 'dismissed') {
    try {
      await resolveReport(reportId, action)
      toast.success(`Report ${action}`)
      loadReports(reportPage, reportFilter)
    } catch {
      toast.error('Failed to update report')
    }
  }

  function downloadCSV(csv: string, filename: string) {
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  async function handleExportListings() {
    const result = await exportListingsCSV()
    if (result.csv) {
      downloadCSV(result.csv, `listings-export-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success('Listings exported')
    } else {
      toast.error('No data to export')
    }
  }

  async function handleExportUsers() {
    const result = await exportUsersCSV()
    if (result.csv) {
      downloadCSV(result.csv, `users-export-${new Date().toISOString().slice(0, 10)}.csv`)
      toast.success('Users exported')
    } else {
      toast.error('No data to export')
    }
  }

  function toggleListingSelection(id: string) {
    setSelectedListings((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
  }

  function toggleUserSelection(id: string) {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    )
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
      <div className="flex items-center justify-between gap-3">
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="font-body text-xs" onClick={handleExportListings}>
            <Download className="mr-1 size-3" />
            Listings CSV
          </Button>
          <Button variant="outline" size="sm" className="font-body text-xs" onClick={handleExportUsers}>
            <Download className="mr-1 size-3" />
            Users CSV
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <StatCard icon={Users} label="Total Users" value={stats.totalUsers.toLocaleString()} />
        <StatCard icon={Package} label="Total Listings" value={stats.totalListings.toLocaleString()} />
        <StatCard icon={Package} label="Active Listings" value={stats.activeListings.toLocaleString()} />
        <StatCard icon={Crown} label="Paid Subscribers" value={stats.activeSubscriptions.toLocaleString()} />
        <StatCard icon={DollarSign} label="Total Revenue" value={`$${(stats.totalRevenue / 100).toLocaleString()}`} />
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-3">
        <MiniChart title="Signups (6 mo)" data={signupChart} />
        <MiniChart title="Listings Created (6 mo)" data={listingChart} />
        <RevenueChart data={revenueChart} />
      </div>

      {/* Top Categories */}
      {topCategories.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <BarChart3 className="size-4 text-muted-foreground" />
              Top Categories
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {topCategories.map((c) => (
                <Badge key={c.category} variant="outline" className="font-body text-xs">
                  {c.category} ({c.count})
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="listings">
        <TabsList className="grid w-full max-w-5xl grid-cols-7">
          <TabsTrigger value="listings" className="font-body text-xs">
            Listings
          </TabsTrigger>
          <TabsTrigger value="users" className="font-body text-xs">
            Users
          </TabsTrigger>
          <TabsTrigger value="reports" className="font-body text-xs">
            Reports
          </TabsTrigger>
          <TabsTrigger value="flagged" className="font-body text-xs">
            Flagged
          </TabsTrigger>
          <TabsTrigger value="disputes" className="font-body text-xs">
            Disputes {adminDisputes.filter((d: { status: string }) => !['resolved_buyer', 'resolved_seller'].includes(d.status)).length > 0 && `(${adminDisputes.filter((d: { status: string }) => !['resolved_buyer', 'resolved_seller'].includes(d.status)).length})`}
          </TabsTrigger>
          <TabsTrigger value="audit" className="font-body text-xs">
            Audit
          </TabsTrigger>
          <TabsTrigger value="verifications" className="font-body text-xs">
            Verify {verifications.length > 0 && `(${verifications.length})`}
          </TabsTrigger>
        </TabsList>

        {/* Listings Tab */}
        <TabsContent value="listings" className="mt-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
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
            {selectedListings.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="font-body text-xs text-muted-foreground">
                  {selectedListings.length} selected
                </span>
                <Button size="sm" className="h-7 font-body text-xs" onClick={() => handleBulkListingAction('active')}>
                  <CheckCircle2 className="mr-1 size-3" />
                  Approve
                </Button>
                <Button size="sm" variant="destructive" className="h-7 font-body text-xs" onClick={() => handleBulkListingAction('removed')}>
                  <XCircle className="mr-1 size-3" />
                  Remove
                </Button>
              </div>
            )}
          </div>

          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full font-body text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="p-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedListings.length === listings.length && listings.length > 0}
                          onChange={() => {
                            if (selectedListings.length === listings.length) {
                              setSelectedListings([])
                            } else {
                              setSelectedListings(listings.map((l: { id: string }) => l.id))
                            }
                          }}
                          className="accent-primary"
                        />
                      </th>
                      <th className="p-3">Title</th>
                      <th className="p-3">Seller</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Views</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {listings.map((l: any) => (
                      <tr key={l.id} className="border-b border-border/50 transition-colors hover:bg-surface">
                        <td className="p-3">
                          <input
                            type="checkbox"
                            checked={selectedListings.includes(l.id)}
                            onChange={() => toggleListingSelection(l.id)}
                            className="accent-primary"
                          />
                        </td>
                        <td className="max-w-[200px] truncate p-3 font-medium text-foreground">{l.title}</td>
                        <td className="p-3 text-muted-foreground">
                          {l.profiles?.display_name || l.profiles?.full_name || 'Unknown'}
                        </td>
                        <td className="p-3 text-muted-foreground">{l.category}</td>
                        <td className="p-3"><StatusBadge status={l.status} /></td>
                        <td className="p-3 text-muted-foreground">{l.views_count}</td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            {l.status !== 'active' && (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-400 hover:text-green-300"
                                onClick={() => handleListingAction(l.id, 'active')}>
                                <CheckCircle2 className="mr-1 size-3" />Approve
                              </Button>
                            )}
                            {l.status !== 'removed' && (
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
                                onClick={() => handleListingAction(l.id, 'removed')}>
                                <XCircle className="mr-1 size-3" />Remove
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                    {listings.length === 0 && (
                      <tr>
                        <td colSpan={7} className="p-8 text-center text-muted-foreground">No listings found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          <Pagination page={listingPage} total={listingTotal} perPage={20} onPageChange={(p) => loadListings(p, listingFilter)} />
        </TabsContent>

        {/* Users Tab */}
        <TabsContent value="users" className="mt-4 space-y-4">
          {selectedUsers.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="font-body text-xs text-muted-foreground">
                {selectedUsers.length} selected
              </span>
              <Button size="sm" variant="destructive" className="h-7 font-body text-xs" onClick={() => handleBulkUserAction(true)}>
                <Ban className="mr-1 size-3" />Ban All
              </Button>
              <Button size="sm" variant="outline" className="h-7 font-body text-xs" onClick={() => handleBulkUserAction(false)}>
                Unban All
              </Button>
            </div>
          )}
          <Card className="border-border bg-card">
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full font-body text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="p-3 w-8">
                        <input
                          type="checkbox"
                          checked={selectedUsers.length === users.length && users.length > 0}
                          onChange={() => {
                            if (selectedUsers.length === users.length) {
                              setSelectedUsers([])
                            } else {
                              // eslint-disable-next-line @typescript-eslint/no-explicit-any
                              setSelectedUsers(users.filter((u: any) => !u.is_admin).map((u: { id: string }) => u.id))
                            }
                          }}
                          className="accent-primary"
                        />
                      </th>
                      <th className="p-3">Name</th>
                      <th className="p-3">Company</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Tier</th>
                      <th className="p-3">Joined</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {users.map((u: any) => {
                      const isBanned = u.bio?.startsWith('[BANNED]')
                      return (
                        <tr key={u.id} className={`border-b border-border/50 transition-colors hover:bg-surface ${isBanned ? 'opacity-60' : ''}`}>
                          <td className="p-3">
                            {!u.is_admin && (
                              <input
                                type="checkbox"
                                checked={selectedUsers.includes(u.id)}
                                onChange={() => toggleUserSelection(u.id)}
                                className="accent-primary"
                              />
                            )}
                          </td>
                          <td className="p-3 font-medium text-foreground">
                            {u.display_name || u.full_name || 'Anonymous'}
                            {u.is_admin && <Badge className="ml-2 bg-primary/20 text-primary text-[10px]">Admin</Badge>}
                            {isBanned && <Badge className="ml-2 bg-red-500/20 text-red-400 text-[10px]">Banned</Badge>}
                          </td>
                          <td className="p-3 text-muted-foreground">{u.company_name || '\u2014'}</td>
                          <td className="p-3 text-muted-foreground">
                            {u.location_city && u.location_state ? `${u.location_city}, ${u.location_state}` : '\u2014'}
                          </td>
                          <td className="p-3">
                            <Badge variant="outline" className={`text-[10px] ${
                              u.subscription_tier === 'boost' ? 'border-primary/50 text-primary'
                                : u.subscription_tier === 'premium' ? 'border-blue-500/50 text-blue-400' : ''
                            }`}>
                              {TIER_LABELS[u.subscription_tier as keyof typeof TIER_LABELS] ?? 'Free'}
                            </Badge>
                          </td>
                          <td className="p-3 text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                          <td className="p-3">
                            {!u.is_admin && (
                              <Button variant="ghost" size="sm"
                                className={`h-7 px-2 text-xs ${isBanned ? 'text-green-400 hover:text-green-300' : 'text-red-400 hover:text-red-300'}`}
                                onClick={() => handleBanToggle(u.id, isBanned)}>
                                <Ban className="mr-1 size-3" />{isBanned ? 'Unban' : 'Ban'}
                              </Button>
                            )}
                          </td>
                        </tr>
                      )
                    })}
                    {users.length === 0 && (
                      <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No users found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <Pagination page={userPage} total={userTotal} perPage={20} onPageChange={loadUsers} />
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="mt-4 space-y-4">
          <div className="flex flex-wrap gap-2">
            {[undefined, 'pending', 'resolved', 'dismissed'].map((s) => (
              <Button
                key={s ?? 'all'}
                variant={reportFilter === s ? 'default' : 'outline'}
                size="sm"
                className="font-body text-xs"
                onClick={() => { setReportFilter(s); loadReports(1, s) }}
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
                      <th className="p-3">Reporter</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Reason</th>
                      <th className="p-3">Details</th>
                      <th className="p-3">Status</th>
                      <th className="p-3">Date</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {reports.map((r: any) => (
                      <tr key={r.id} className="border-b border-border/50 transition-colors hover:bg-surface">
                        <td className="p-3 text-foreground">
                          {r.profiles?.display_name || r.profiles?.full_name || 'Unknown'}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="font-body text-[10px]">{r.target_type}</Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">{r.reason}</td>
                        <td className="max-w-[200px] truncate p-3 text-muted-foreground">{r.details || '\u2014'}</td>
                        <td className="p-3"><StatusBadge status={r.status} /></td>
                        <td className="p-3 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                        <td className="p-3">
                          {r.status === 'pending' && (
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-green-400 hover:text-green-300"
                                onClick={() => handleResolveReport(r.id, 'resolved')}>
                                <CheckCircle2 className="mr-1 size-3" />Resolve
                              </Button>
                              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                                onClick={() => handleResolveReport(r.id, 'dismissed')}>
                                <XCircle className="mr-1 size-3" />Dismiss
                              </Button>
                            </div>
                          )}
                          {r.admin_notes && (
                            <p className="font-body text-[10px] text-muted-foreground">{r.admin_notes}</p>
                          )}
                        </td>
                      </tr>
                    ))}
                    {reports.length === 0 && (
                      <tr><td colSpan={7} className="p-8 text-center text-muted-foreground">No reports found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <Pagination page={reportPage} total={reportTotal} perPage={20} onPageChange={(p) => loadReports(p, reportFilter)} />
        </TabsContent>

        {/* Flagged Content Tab */}
        <TabsContent value="flagged" className="mt-4 space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <AlertTriangle className="size-4 text-yellow-400" />
                Auto-Flagged Listings ({flaggedListings.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full font-body text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="p-3">Title</th>
                      <th className="p-3">Seller</th>
                      <th className="p-3">Category</th>
                      <th className="p-3">Flagged Words</th>
                      <th className="p-3">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {flaggedListings.map((l: any) => (
                      <tr key={l.id} className="border-b border-border/50 transition-colors hover:bg-surface">
                        <td className="max-w-[200px] truncate p-3 font-medium text-foreground">{l.title}</td>
                        <td className="p-3 text-muted-foreground">
                          {l.profiles?.display_name || l.profiles?.full_name || 'Unknown'}
                        </td>
                        <td className="p-3 text-muted-foreground">{l.category}</td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {l.flaggedWords.map((w: string) => (
                              <Badge key={w} className="bg-yellow-500/20 text-yellow-400 text-[10px]">
                                <Flag className="mr-0.5 size-2.5" />{w}
                              </Badge>
                            ))}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex gap-1">
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                              onClick={() => window.open(`/listings/${l.id}`, '_blank')}>
                              <Eye className="mr-1 size-3" />View
                            </Button>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-red-400 hover:text-red-300"
                              onClick={() => handleListingAction(l.id, 'removed')}>
                              <XCircle className="mr-1 size-3" />Remove
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {flaggedListings.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No flagged content found</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Audit Log Tab */}
        <TabsContent value="audit" className="mt-4 space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <ClipboardList className="size-4 text-muted-foreground" />
                Admin Activity Log
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full font-body text-sm">
                  <thead>
                    <tr className="border-b border-border text-left text-xs text-muted-foreground">
                      <th className="p-3">Admin</th>
                      <th className="p-3">Action</th>
                      <th className="p-3">Target</th>
                      <th className="p-3">Details</th>
                      <th className="p-3">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                    {auditLogs.map((log: any) => (
                      <tr key={log.id} className="border-b border-border/50 transition-colors hover:bg-surface">
                        <td className="p-3 text-foreground">
                          {log.profiles?.display_name || log.profiles?.full_name || 'Admin'}
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="font-body text-[10px]">
                            {log.action.replace(/_/g, ' ')}
                          </Badge>
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {log.target_type}: {log.target_id.length > 20 ? `${log.target_id.slice(0, 20)}...` : log.target_id}
                        </td>
                        <td className="max-w-[200px] truncate p-3 text-muted-foreground">
                          {log.details ? JSON.stringify(log.details) : '\u2014'}
                        </td>
                        <td className="p-3 text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr><td colSpan={5} className="p-8 text-center text-muted-foreground">No audit log entries</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
          <Pagination page={auditPage} total={auditTotal} perPage={20} onPageChange={loadAudit} />
        </TabsContent>

        {/* Verifications Tab */}
        <TabsContent value="verifications" className="mt-4 space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="font-display text-base">
                Pending Verification Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              {verifications.length === 0 ? (
                <p className="py-4 text-center font-body text-sm text-muted-foreground">
                  No pending verification requests
                </p>
              ) : (
                <div className="space-y-3">
                  {verifications.map((v: {
                    id: string
                    user_id: string
                    business_name: string
                    document_url: string | null
                    created_at: string
                    profiles: { full_name: string; display_name: string | null; company_name: string | null; avatar_url: string | null } | null
                  }) => (
                    <div
                      key={v.id}
                      className="flex items-center justify-between rounded-lg border border-border p-3"
                    >
                      <div className="space-y-1">
                        <p className="font-body text-sm font-medium text-foreground">
                          {v.profiles?.display_name || v.profiles?.full_name || 'Unknown'}
                        </p>
                        <p className="font-body text-xs text-muted-foreground">
                          Business: {v.business_name}
                        </p>
                        <p className="font-body text-[10px] text-muted-foreground">
                          Submitted {new Date(v.created_at).toLocaleDateString()}
                        </p>
                        {v.document_url && (
                          <a
                            href={v.document_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="font-body text-xs text-secondary hover:underline"
                          >
                            View Document
                          </a>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="font-body text-xs text-red-400 hover:text-red-300"
                          onClick={async () => {
                            const res = await reviewVerification(v.id, 'rejected', 'Rejected by admin')
                            if (res.error) toast.error(res.error)
                            else {
                              toast.success('Verification rejected')
                              setVerifications((prev: typeof verifications) => prev.filter((x: { id: string }) => x.id !== v.id))
                            }
                          }}
                        >
                          <XCircle className="mr-1 size-3" />
                          Reject
                        </Button>
                        <Button
                          size="sm"
                          className="font-body text-xs"
                          onClick={async () => {
                            const res = await reviewVerification(v.id, 'approved')
                            if (res.error) toast.error(res.error)
                            else {
                              toast.success('Seller verified!')
                              setVerifications((prev: typeof verifications) => prev.filter((x: { id: string }) => x.id !== v.id))
                            }
                          }}
                        >
                          <CheckCircle2 className="mr-1 size-3" />
                          Approve
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Disputes Tab */}
        <TabsContent value="disputes" className="mt-4 space-y-4">
          <Card className="border-border bg-card">
            <CardHeader>
              <CardTitle className="font-display text-lg">Transaction Disputes</CardTitle>
            </CardHeader>
            <CardContent>
              {adminDisputes.length === 0 ? (
                <p className="py-8 text-center font-body text-sm text-muted-foreground">No disputes</p>
              ) : (
                <div className="space-y-4">
                  {adminDisputes.map((d: {
                    id: string
                    reason: string
                    description: string
                    evidence_urls: string[]
                    status: string
                    seller_response: string | null
                    seller_evidence_urls: string[]
                    resolution_notes: string | null
                    created_at: string
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    transactions: any
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    opener: any
                  }) => {
                    const tx = d.transactions
                    const reasonLabel: Record<string, string> = {
                      item_not_received: 'Item Not Received',
                      item_not_as_described: 'Not as Described',
                      damaged_in_shipping: 'Damaged',
                      wrong_item: 'Wrong Item',
                      other: 'Other',
                    }
                    const isResolved = ['resolved_buyer', 'resolved_seller'].includes(d.status)

                    return (
                      <div key={d.id} className="rounded-lg border border-border p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="font-body text-sm font-medium text-foreground">
                              {tx?.listings?.title || 'Unknown Listing'}
                            </p>
                            <p className="font-body text-xs text-muted-foreground">
                              {reasonLabel[d.reason] || d.reason} · {new Date(d.created_at).toLocaleDateString()}
                            </p>
                          </div>
                          <Badge className={`font-body text-[10px] ${
                            d.status === 'open' ? 'bg-yellow-500/20 text-yellow-400'
                              : d.status === 'under_review' ? 'bg-blue-500/20 text-blue-400'
                              : d.status === 'escalated' ? 'bg-red-500/20 text-red-400'
                              : 'bg-green-500/20 text-green-400'
                          }`}>
                            {d.status.replace(/_/g, ' ')}
                          </Badge>
                        </div>

                        <div className="grid gap-2 sm:grid-cols-2">
                          <div className="rounded bg-surface/50 p-2">
                            <p className="font-body text-[10px] text-muted-foreground">Buyer</p>
                            <p className="font-body text-xs text-foreground">{tx?.buyer?.display_name || tx?.buyer?.full_name || '?'}</p>
                          </div>
                          <div className="rounded bg-surface/50 p-2">
                            <p className="font-body text-[10px] text-muted-foreground">Seller</p>
                            <p className="font-body text-xs text-foreground">{tx?.seller?.display_name || tx?.seller?.full_name || '?'}</p>
                          </div>
                        </div>

                        <div className="rounded bg-surface/50 p-2">
                          <p className="font-body text-[10px] text-muted-foreground">Buyer&apos;s Complaint</p>
                          <p className="font-body text-xs text-foreground">{d.description}</p>
                          {d.evidence_urls.length > 0 && (
                            <div className="mt-1 flex gap-1">
                              {d.evidence_urls.map((url, i) => (
                                <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="size-10 overflow-hidden rounded border border-border">
                                  <img src={url} alt="" className="size-full object-cover" />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>

                        {d.seller_response && (
                          <div className="rounded bg-blue-500/5 p-2">
                            <p className="font-body text-[10px] text-muted-foreground">Seller&apos;s Response</p>
                            <p className="font-body text-xs text-foreground">{d.seller_response}</p>
                            {d.seller_evidence_urls.length > 0 && (
                              <div className="mt-1 flex gap-1">
                                {d.seller_evidence_urls.map((url, i) => (
                                  <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="size-10 overflow-hidden rounded border border-border">
                                    <img src={url} alt="" className="size-full object-cover" />
                                  </a>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        {d.resolution_notes && (
                          <div className="rounded bg-green-500/5 p-2">
                            <p className="font-body text-[10px] text-muted-foreground">Resolution</p>
                            <p className="font-body text-xs text-foreground">{d.resolution_notes}</p>
                          </div>
                        )}

                        {!isResolved && (
                          <div className="space-y-2 border-t border-border pt-3">
                            <textarea
                              placeholder="Resolution notes..."
                              value={disputeResNotes[d.id] || ''}
                              onChange={(e) => setDisputeResNotes((prev) => ({ ...prev, [d.id]: e.target.value }))}
                              rows={2}
                              className="w-full rounded-md border border-border bg-surface px-3 py-2 font-body text-xs text-foreground placeholder:text-muted-foreground"
                            />
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  const result = await resolveDispute(d.id, 'resolved_buyer', disputeResNotes[d.id] || 'Resolved in favor of buyer')
                                  if ('error' in result && result.error) toast.error(result.error)
                                  else { toast.success('Resolved — buyer refunded'); getAdminDisputes().then((r) => setAdminDisputes(r.disputes || [])) }
                                }}
                                className="font-body text-xs text-green-400"
                              >
                                <CheckCircle2 className="mr-1 size-3" />
                                Refund Buyer
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={async () => {
                                  const result = await resolveDispute(d.id, 'resolved_seller', disputeResNotes[d.id] || 'Resolved in favor of seller')
                                  if ('error' in result && result.error) toast.error(result.error)
                                  else { toast.success('Resolved — funds released to seller'); getAdminDisputes().then((r) => setAdminDisputes(r.disputes || [])) }
                                }}
                                className="font-body text-xs text-blue-400"
                              >
                                <DollarSign className="mr-1 size-3" />
                                Release to Seller
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function StatCard({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center gap-4 p-5">
        <div className="flex size-10 items-center justify-center rounded-lg bg-surface">
          <Icon className="size-5 text-muted-foreground" />
        </div>
        <div>
          <p className="font-display text-xl font-bold text-foreground">{value}</p>
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
    pending: 'border-yellow-500/50 text-yellow-400',
    resolved: 'border-green-500/50 text-green-400',
    dismissed: 'border-zinc-500/50 text-zinc-400',
  }
  return (
    <Badge variant="outline" className={`text-[10px] ${colors[status] ?? ''}`}>
      {status}
    </Badge>
  )
}

function Pagination({ page, total, perPage, onPageChange }: { page: number; total: number; perPage: number; onPageChange: (page: number) => void }) {
  const totalPages = Math.ceil(total / perPage)
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between">
      <p className="font-body text-xs text-muted-foreground">
        Showing {(page - 1) * perPage + 1}\u2013{Math.min(page * perPage, total)} of {total}
      </p>
      <div className="flex gap-1">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="size-4" />
        </Button>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}

function MiniChart({ title, data }: { title: string; data: { month: string; count: number }[] }) {
  if (data.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <BarChart3 className="size-4 text-muted-foreground" />{title}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center font-body text-sm text-muted-foreground">No data yet</p>
        </CardContent>
      </Card>
    )
  }

  const max = Math.max(...data.map((d) => d.count), 1)

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-base">
          <BarChart3 className="size-4 text-muted-foreground" />{title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          {data.map((d) => (
            <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
              <span className="font-body text-xs text-foreground">{d.count}</span>
              <div className="w-full rounded-t bg-primary/80" style={{ height: `${Math.max((d.count / max) * 120, 4)}px` }} />
              <span className="font-body text-[10px] text-muted-foreground">{d.month.slice(5)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

function RevenueChart({ data }: { data: { month: string; amount: number }[] }) {
  if (data.length === 0) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-base">
            <DollarSign className="size-4 text-muted-foreground" />Revenue (6 mo)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-4 text-center font-body text-sm text-muted-foreground">No data yet</p>
        </CardContent>
      </Card>
    )
  }

  const max = Math.max(...data.map((d) => d.amount), 1)

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-base">
          <DollarSign className="size-4 text-muted-foreground" />Revenue (6 mo)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-2">
          {data.map((d) => (
            <div key={d.month} className="flex flex-1 flex-col items-center gap-1">
              <span className="font-body text-xs text-foreground">${(d.amount / 100).toLocaleString()}</span>
              <div className="w-full rounded-t bg-green-500/80" style={{ height: `${Math.max((d.amount / max) * 120, 4)}px` }} />
              <span className="font-body text-[10px] text-muted-foreground">{d.month.slice(5)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
