'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Search,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Shield,
  Ban,
  Eye,
  UserCog,
} from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  getAdminUsers,
  adminSuspendUser,
  adminBanUser,
  adminGrantRole,
  getChurnRiskMap,
} from '../actions'

const TIER_COLORS: Record<string, string> = {
  free: 'bg-zinc-500/20 text-zinc-400',
  premium: 'bg-blue-500/20 text-blue-400',
  boost: 'bg-primary/20 text-primary',
}

const ROLE_COLORS: Record<string, string> = {
  superadmin: 'bg-amber-500/20 text-amber-400',
  moderator: 'bg-blue-500/20 text-blue-400',
  analyst: 'bg-green-500/20 text-green-400',
}

type UserRow = {
  id: string
  full_name: string | null
  avatar_url: string | null
  subscription_tier: string | null
  is_admin: boolean | null
  admin_role: string | null
  created_at: string
  last_sign_in_at: string | null
  is_suspended: boolean | null
  is_banned: boolean | null
  listing_count: number
}

export default function AdminUsersPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [users, setUsers] = useState<UserRow[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(Number(searchParams.get('page')) || 1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState(searchParams.get('search') || '')
  const [tier, setTier] = useState(searchParams.get('tier') || 'all')
  const [role, setRole] = useState(searchParams.get('role') || 'all')
  const [loading, setLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [churnFilter, setChurnFilter] = useState('all')
  const [churnMap, setChurnMap] = useState<Record<string, { risk_score: number; risk_level: string }>>({})

  useEffect(() => {
    let cancelled = false
    async function fetchUsers() {
      setLoading(true)
      const result = await getAdminUsers({ page, search, tier, role })
      if (!cancelled) {
        setUsers(result.users as UserRow[])
        setTotal(result.total)
        setTotalPages(result.totalPages)
        setLoading(false)
      }
    }
    fetchUsers()
    return () => { cancelled = true }
  }, [page, search, tier, role, refreshKey])

  useEffect(() => {
    let cancelled = false
    async function fetchChurn() {
      const data = await getChurnRiskMap()
      if (!cancelled) setChurnMap(data)
    }
    fetchChurn()
    return () => { cancelled = true }
  }, [refreshKey])

  function refreshUsers() { setRefreshKey((k) => k + 1) }

  function handleSearch() {
    setPage(1)
  }

  async function handleSuspend(userId: string, duration: '24h' | '7d' | '30d' | 'permanent') {
    try {
      await adminSuspendUser(userId, duration)
      toast.success(`User suspended (${duration})`)
      refreshUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to suspend')
    }
  }

  async function handleBan(userId: string) {
    try {
      await adminBanUser(userId)
      toast.success('User banned')
      refreshUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to ban')
    }
  }

  async function handleGrantRole(userId: string, newRole: string) {
    try {
      await adminGrantRole(userId, newRole === 'none' ? null : (newRole as 'superadmin' | 'moderator' | 'analyst'))
      toast.success('Role updated')
      refreshUsers()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold text-foreground">
          User Management
        </h1>
        <Badge variant="outline" className="font-body">
          {total} users
        </Badge>
      </div>

      {/* Filters */}
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardContent className="flex flex-wrap items-end gap-3 p-4">
          <div className="flex-1 min-w-[200px]">
            <Input
              placeholder="Search by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              className="font-body"
            />
          </div>
          <Select value={tier} onValueChange={(v) => { setTier(v); setPage(1) }}>
            <SelectTrigger className="w-[140px] font-body">
              <SelectValue placeholder="Tier" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All tiers</SelectItem>
              <SelectItem value="free">Free</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
              <SelectItem value="boost">Boost</SelectItem>
            </SelectContent>
          </Select>
          <Select value={role} onValueChange={(v) => { setRole(v); setPage(1) }}>
            <SelectTrigger className="w-[160px] font-body">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All roles</SelectItem>
              <SelectItem value="non-admin">Non-admin</SelectItem>
              <SelectItem value="superadmin">Superadmin</SelectItem>
              <SelectItem value="moderator">Moderator</SelectItem>
              <SelectItem value="analyst">Analyst</SelectItem>
            </SelectContent>
          </Select>
          <Select value={churnFilter} onValueChange={(v) => { setChurnFilter(v); setPage(1) }}>
            <SelectTrigger className="w-[160px] font-body">
              <SelectValue placeholder="Churn Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All churn risk</SelectItem>
              <SelectItem value="high_risk">High Risk</SelectItem>
              <SelectItem value="at_risk">At Risk</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="sm" onClick={handleSearch}>
            <Search className="mr-1 size-4" />
            Search
          </Button>
        </CardContent>
      </Card>

      {/* User Table */}
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                    User
                  </th>
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                    Tier
                  </th>
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                    Listings
                  </th>
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                    Joined
                  </th>
                  <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-body text-xs font-medium text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center">
                      <p className="font-body text-sm text-muted-foreground">
                        Loading...
                      </p>
                    </td>
                  </tr>
                ) : users.filter((u) => churnFilter === 'all' || churnMap[u.id]?.risk_level === churnFilter).length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center">
                      <p className="font-body text-sm text-muted-foreground">
                        No users found
                      </p>
                    </td>
                  </tr>
                ) : (
                  users.filter((u) => churnFilter === 'all' || churnMap[u.id]?.risk_level === churnFilter).map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-white/5 hover:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <Link
                          href={`/admin/users/${user.id}`}
                          className="flex items-center gap-3"
                        >
                          <div className="flex size-8 items-center justify-center overflow-hidden rounded-full bg-surface">
                            {user.avatar_url ? (
                              <Image
                                src={user.avatar_url}
                                alt=""
                                width={32}
                                height={32}
                                className="size-full object-cover"
                              />
                            ) : (
                              <span className="font-body text-xs text-muted-foreground">
                                {(user.full_name || '?')[0]}
                              </span>
                            )}
                          </div>
                          <span className="font-body text-sm text-foreground hover:text-primary">
                            {user.full_name || 'Unnamed'}
                          </span>
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        {user.admin_role ? (
                          <Badge
                            className={`border-0 font-body text-[10px] uppercase ${ROLE_COLORS[user.admin_role] || ''}`}
                          >
                            {user.admin_role}
                          </Badge>
                        ) : (
                          <span className="font-body text-xs text-muted-foreground">
                            —
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={`border-0 font-body text-[10px] uppercase ${TIER_COLORS[user.subscription_tier || 'free']}`}
                        >
                          {user.subscription_tier || 'free'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-body text-sm text-muted-foreground">
                        {user.listing_count}
                      </td>
                      <td className="px-4 py-3 font-body text-xs text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          {user.is_banned ? (
                            <Badge className="border-0 bg-red-500/20 text-red-400 font-body text-[10px]">
                              Banned
                            </Badge>
                          ) : user.is_suspended ? (
                            <Badge className="border-0 bg-amber-500/20 text-amber-400 font-body text-[10px]">
                              Suspended
                            </Badge>
                          ) : (
                            <Badge className="border-0 bg-green-500/20 text-green-400 font-body text-[10px]">
                              Active
                            </Badge>
                          )}
                          {churnMap[user.id]?.risk_level === 'high_risk' && (
                            <Badge className="border-0 bg-red-500/20 text-red-400 font-body text-[10px]">
                              HIGH RISK
                            </Badge>
                          )}
                          {churnMap[user.id]?.risk_level === 'at_risk' && (
                            <Badge className="border-0 bg-yellow-500/20 text-yellow-400 font-body text-[10px]">
                              AT RISK
                            </Badge>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => router.push(`/admin/users/${user.id}`)}>
                              <Eye className="mr-2 size-4" />
                              View details
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleGrantRole(user.id, 'moderator')}>
                              <UserCog className="mr-2 size-4" />
                              Make moderator
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGrantRole(user.id, 'analyst')}>
                              <UserCog className="mr-2 size-4" />
                              Make analyst
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleGrantRole(user.id, 'none')}>
                              <Shield className="mr-2 size-4" />
                              Remove admin role
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleSuspend(user.id, '24h')}>
                              Suspend 24h
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleSuspend(user.id, '7d')}>
                              Suspend 7 days
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleBan(user.id)}
                              className="text-red-400"
                            >
                              <Ban className="mr-2 size-4" />
                              Ban user
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-white/5 px-4 py-3">
              <p className="font-body text-xs text-muted-foreground">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  <ChevronLeft className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight className="size-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
