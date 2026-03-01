'use client'

import { useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  Package,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Loader2,
  Search,
  MoreHorizontal,
  Edit,
  AlertTriangle,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/auth-store'
import { getInventory, bulkUpdateInventory } from './actions'

type InventoryItem = {
  id: string
  title: string
  category: string
  status: string
  price_cents: number | null
  quantity: number
  sku: string | null
  warehouse_location: string | null
  views_count: number
  favorites_count: number
  created_at: string
  contact_for_price: boolean
}

type SortField = 'title' | 'sku' | 'quantity' | 'price_cents' | 'views_count' | 'status' | 'created_at'
type SortDir = 'asc' | 'desc'

export default function InventoryPage() {
  const { user } = useAuthStore()
  const [items, setItems] = useState<InventoryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortField, setSortField] = useState<SortField>('created_at')
  const [sortDir, setSortDir] = useState<SortDir>('desc')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [bulkAction, setBulkAction] = useState('')
  const [bulkValue, setBulkValue] = useState('')
  const [applying, setApplying] = useState(false)

  const loadInventory = useCallback(async () => {
    const result = await getInventory()
    if ('error' in result) return
    setItems(result.items as InventoryItem[])
    setLoading(false)
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    if (user) loadInventory()
  }, [user, loadInventory])

  // Filter
  const filtered = items.filter((item) => {
    if (search && !item.title.toLowerCase().includes(search.toLowerCase()) &&
        !(item.sku && item.sku.toLowerCase().includes(search.toLowerCase()))) {
      return false
    }
    if (statusFilter !== 'all' && item.status !== statusFilter) return false
    if (categoryFilter !== 'all' && item.category !== categoryFilter) return false
    return true
  })

  // Sort
  const sorted = [...filtered].sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1
    switch (sortField) {
      case 'title': return dir * a.title.localeCompare(b.title)
      case 'sku': return dir * ((a.sku || '').localeCompare(b.sku || ''))
      case 'quantity': return dir * (a.quantity - b.quantity)
      case 'price_cents': return dir * ((a.price_cents || 0) - (b.price_cents || 0))
      case 'views_count': return dir * (a.views_count - b.views_count)
      case 'status': return dir * a.status.localeCompare(b.status)
      case 'created_at': return dir * (new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      default: return 0
    }
  })

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (selected.size === sorted.length) {
      setSelected(new Set())
    } else {
      setSelected(new Set(sorted.map((i) => i.id)))
    }
  }

  async function handleBulkAction() {
    if (selected.size === 0 || !bulkAction) return
    setApplying(true)
    const ids = [...selected]
    const result = await bulkUpdateInventory(ids, bulkAction, bulkValue)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success(`Updated ${ids.length} listing${ids.length !== 1 ? 's' : ''}`)
      setSelected(new Set())
      setBulkAction('')
      setBulkValue('')
      await loadInventory()
    }
    setApplying(false)
  }

  const categories = [...new Set(items.map((i) => i.category))].sort()
  const totalQuantity = items.reduce((sum, i) => sum + i.quantity, 0)
  const lowStockCount = items.filter((i) => i.quantity <= 1 && i.status === 'active').length

  function sortIcon(field: SortField) {
    if (sortField !== field) return <ArrowUpDown className="ml-1 inline size-3 text-muted-foreground/50" />
    return sortDir === 'asc'
      ? <ArrowUp className="ml-1 inline size-3 text-primary" />
      : <ArrowDown className="ml-1 inline size-3 text-primary" />
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <p className="font-body text-muted-foreground">Sign in to manage inventory</p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Inventory</h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            {items.length} listings &middot; {totalQuantity} total units
            {lowStockCount > 0 && (
              <span className="ml-2 text-yellow-400">
                <AlertTriangle className="mr-1 inline size-3" />
                {lowStockCount} low stock
              </span>
            )}
          </p>
        </div>
        <Link href="/listings/new">
          <Button className="font-body">
            <Package className="mr-2 size-4" />
            New Listing
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 sm:max-w-xs">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by title or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 font-body"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-32 font-body text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-body">All Status</SelectItem>
            <SelectItem value="active" className="font-body">Active</SelectItem>
            <SelectItem value="draft" className="font-body">Draft</SelectItem>
            <SelectItem value="sold" className="font-body">Sold</SelectItem>
            <SelectItem value="expired" className="font-body">Expired</SelectItem>
          </SelectContent>
        </Select>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-40 font-body text-sm">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-body">All Categories</SelectItem>
            {categories.map((c) => (
              <SelectItem key={c} value={c} className="font-body text-sm">{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <Card className="border-primary/50 bg-card">
          <CardContent className="flex flex-wrap items-center gap-3 p-4">
            <span className="font-body text-sm text-foreground">
              {selected.size} selected
            </span>
            <Select value={bulkAction} onValueChange={setBulkAction}>
              <SelectTrigger className="w-44 font-body text-sm">
                <SelectValue placeholder="Bulk action..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="status_active" className="font-body">Set Active</SelectItem>
                <SelectItem value="status_draft" className="font-body">Set Draft</SelectItem>
                <SelectItem value="adjust_price" className="font-body">Adjust Price</SelectItem>
                <SelectItem value="adjust_quantity" className="font-body">Set Quantity</SelectItem>
              </SelectContent>
            </Select>
            {(bulkAction === 'adjust_price' || bulkAction === 'adjust_quantity') && (
              <Input
                type="number"
                value={bulkValue}
                onChange={(e) => setBulkValue(e.target.value)}
                placeholder={bulkAction === 'adjust_price' ? 'New price ($)' : 'New quantity'}
                className="w-36 font-body text-sm"
              />
            )}
            <Button
              size="sm"
              onClick={handleBulkAction}
              disabled={applying || !bulkAction}
              className="font-body"
            >
              {applying ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              Apply
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setSelected(new Set())}
              className="font-body text-muted-foreground"
            >
              Clear
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : sorted.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <Package className="size-12 text-muted-foreground/50" />
          <p className="font-display text-lg font-semibold text-foreground">No inventory items</p>
          <p className="font-body text-sm text-muted-foreground">
            {items.length === 0 ? 'Create your first listing to get started.' : 'No items match your filters.'}
          </p>
        </div>
      ) : (
        <Card className="overflow-hidden border-border bg-card">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-surface/50">
                  <th className="p-3 text-left">
                    <input
                      type="checkbox"
                      checked={selected.size === sorted.length && sorted.length > 0}
                      onChange={toggleSelectAll}
                      className="size-4 rounded border-border"
                    />
                  </th>
                  <th className="cursor-pointer p-3 text-left font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground" onClick={() => toggleSort('title')}>
                    Title {sortIcon('title')}
                  </th>
                  <th className="cursor-pointer p-3 text-left font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground" onClick={() => toggleSort('sku')}>
                    SKU {sortIcon('sku')}
                  </th>
                  <th className="cursor-pointer p-3 text-right font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground" onClick={() => toggleSort('quantity')}>
                    Qty {sortIcon('quantity')}
                  </th>
                  <th className="cursor-pointer p-3 text-right font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground" onClick={() => toggleSort('price_cents')}>
                    Price {sortIcon('price_cents')}
                  </th>
                  <th className="cursor-pointer p-3 text-center font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground" onClick={() => toggleSort('status')}>
                    Status {sortIcon('status')}
                  </th>
                  <th className="cursor-pointer p-3 text-right font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground" onClick={() => toggleSort('views_count')}>
                    Views {sortIcon('views_count')}
                  </th>
                  <th className="p-3 text-left font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Location
                  </th>
                  <th className="p-3" />
                </tr>
              </thead>
              <tbody>
                {sorted.map((item) => (
                  <tr
                    key={item.id}
                    className={`border-b border-border/50 transition-colors hover:bg-surface/30 ${
                      selected.has(item.id) ? 'bg-primary/5' : ''
                    }`}
                  >
                    <td className="p-3">
                      <input
                        type="checkbox"
                        checked={selected.has(item.id)}
                        onChange={() => toggleSelect(item.id)}
                        className="size-4 rounded border-border"
                      />
                    </td>
                    <td className="max-w-[200px] p-3">
                      <Link href={`/listings/${item.id}`} className="font-body text-sm font-medium text-foreground hover:text-primary">
                        <span className="line-clamp-1">{item.title}</span>
                      </Link>
                      <p className="font-body text-[10px] text-muted-foreground">{item.category}</p>
                    </td>
                    <td className="p-3 font-body text-sm text-muted-foreground">
                      {item.sku || '—'}
                    </td>
                    <td className="p-3 text-right">
                      <span className={`font-display text-sm font-bold ${
                        item.quantity <= 1 && item.status === 'active' ? 'text-yellow-400' : 'text-foreground'
                      }`}>
                        {item.quantity}
                      </span>
                    </td>
                    <td className="p-3 text-right font-display text-sm font-bold text-primary">
                      {item.contact_for_price
                        ? 'Contact'
                        : item.price_cents
                          ? `$${(item.price_cents / 100).toLocaleString()}`
                          : '—'}
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        variant="outline"
                        className={`font-body text-[10px] capitalize ${
                          item.status === 'active' ? 'border-green-500/50 text-green-400'
                            : item.status === 'draft' ? 'border-yellow-500/50 text-yellow-400'
                            : item.status === 'sold' ? 'border-blue-500/50 text-blue-400'
                            : ''
                        }`}
                      >
                        {item.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-right font-body text-sm text-muted-foreground">
                      {item.views_count}
                    </td>
                    <td className="max-w-[120px] p-3 font-body text-xs text-muted-foreground">
                      <span className="line-clamp-1">{item.warehouse_location || '—'}</span>
                    </td>
                    <td className="p-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="size-7">
                            <MoreHorizontal className="size-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem asChild>
                            <Link href={`/listings/${item.id}/edit`} className="font-body text-sm">
                              <Edit className="mr-2 size-4" />
                              Edit
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuItem asChild>
                            <Link href={`/listings/${item.id}`} className="font-body text-sm">
                              <Package className="mr-2 size-4" />
                              View
                            </Link>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
