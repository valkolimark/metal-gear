'use client'

import { Suspense, useEffect, useState, useCallback } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  SlidersHorizontal,
  Grid3X3,
  List,
  Search,
  X,
  Loader2,
  MapPin,
  Heart,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Sidebar } from '@/components/layout/sidebar'
import { PageLayout } from '@/components/layout/page-layout'
import { createClient } from '@/lib/supabase/client'
import {
  EQUIPMENT_CATEGORIES,
  INDUSTRIES,
  LISTING_CONDITIONS,
  SORT_OPTIONS,
} from '@/lib/constants'
import type { Tables } from '@/types/database'

type Listing = Tables<'listings'>

const PAGE_SIZE = 12

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <SearchContent />
    </Suspense>
  )
}

function SearchContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [filtersOpen, setFiltersOpen] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState<Listing[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)

  // Read params from URL
  const query = searchParams.get('q') || ''
  const category = searchParams.get('category') || ''
  const industry = searchParams.get('industry') || ''
  const condition = searchParams.get('condition') || ''
  const priceMin = searchParams.get('priceMin') || ''
  const priceMax = searchParams.get('priceMax') || ''
  const sortBy = searchParams.get('sort') || 'newest'

  const [searchInput, setSearchInput] = useState(query)

  // Update URL params
  const updateParams = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v)
        else params.delete(k)
      })
      params.delete('page') // Reset page on filter change
      router.push(`/search?${params.toString()}`, { scroll: false })
    },
    [searchParams, router]
  )

  // Fetch listings
  useEffect(() => {
    async function search() {
      setLoading(true)
      const supabase = createClient()

      let q = supabase
        .from('listings')
        .select('*', { count: 'exact' })
        .eq('status', 'active')

      // Full-text search
      if (query) {
        q = q.textSearch('fts', query, { type: 'websearch' })
      }

      // Filters
      if (category) q = q.eq('category', category)
      if (industry) q = q.eq('industry', industry)
      if (condition) q = q.in('condition', condition.split(','))
      if (priceMin) q = q.gte('price_cents', parseInt(priceMin) * 100)
      if (priceMax) q = q.lte('price_cents', parseInt(priceMax) * 100)

      // Sort
      switch (sortBy) {
        case 'price_asc':
          q = q.order('price_cents', { ascending: true, nullsFirst: false })
          break
        case 'price_desc':
          q = q.order('price_cents', { ascending: false, nullsFirst: false })
          break
        case 'newest':
          q = q.order('created_at', { ascending: false })
          break
        default:
          q = q.order('created_at', { ascending: false })
      }

      // Pagination
      const from = page * PAGE_SIZE
      q = q.range(from, from + PAGE_SIZE - 1)

      const { data, error, count } = await q

      if (error) {
        console.error('Search error:', error)
        setListings([])
        setTotalCount(0)
      } else {
        setListings((data ?? []) as Listing[])
        setTotalCount(count ?? 0)
      }
      setLoading(false)
    }

    search()
  }, [query, category, industry, condition, priceMin, priceMax, sortBy, page])

  function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    updateParams({ q: searchInput })
  }

  function clearFilters() {
    router.push('/search', { scroll: false })
    setSearchInput('')
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const activeFilterCount = [category, industry, condition, priceMin, priceMax].filter(
    Boolean
  ).length

  return (
    <PageLayout
      sidebarOpen={filtersOpen}
      sidebar={
        <Sidebar
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title="Filters"
        >
          <div className="flex flex-col gap-5">
            {/* Category */}
            <div className="space-y-2">
              <p className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Category
              </p>
              <Select
                value={category}
                onValueChange={(v) =>
                  updateParams({ category: v === 'all' ? '' : v })
                }
              >
                <SelectTrigger className="font-body text-sm">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-body">
                    All categories
                  </SelectItem>
                  {EQUIPMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="font-body text-sm">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Industry */}
            <div className="space-y-2">
              <p className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Industry
              </p>
              <Select
                value={industry}
                onValueChange={(v) =>
                  updateParams({ industry: v === 'all' ? '' : v })
                }
              >
                <SelectTrigger className="font-body text-sm">
                  <SelectValue placeholder="All industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-body">
                    All industries
                  </SelectItem>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem
                      key={ind}
                      value={ind}
                      className="font-body text-sm"
                    >
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Condition */}
            <div className="space-y-2">
              <p className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Condition
              </p>
              <div className="flex flex-wrap gap-1.5">
                {LISTING_CONDITIONS.map((c) => {
                  const active = condition.split(',').includes(c.value)
                  return (
                    <button
                      key={c.value}
                      onClick={() => {
                        const current = condition
                          ? condition.split(',')
                          : []
                        const next = active
                          ? current.filter((x) => x !== c.value)
                          : [...current, c.value]
                        updateParams({ condition: next.join(',') })
                      }}
                      className={`rounded-full px-3 py-1 font-body text-xs transition-colors ${
                        active
                          ? 'bg-primary text-white'
                          : 'bg-surface text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <p className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Price Range
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={priceMin}
                  onChange={(e) => updateParams({ priceMin: e.target.value })}
                  className="font-body text-sm"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={priceMax}
                  onChange={(e) => updateParams({ priceMax: e.target.value })}
                  className="font-body text-sm"
                />
              </div>
            </div>

            <Separator />

            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="font-body text-muted-foreground"
            >
              <X className="mr-1 size-3" />
              Clear all filters
            </Button>
          </div>
        </Sidebar>
      }
    >
      <div className="space-y-4">
        {/* Search bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search equipment..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-9 font-body"
            />
          </div>
          <Button type="submit" className="font-body">
            Search
          </Button>
        </form>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            {!filtersOpen && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setFiltersOpen(true)}
                className="font-body"
              >
                <SlidersHorizontal className="mr-1 size-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <Badge className="ml-1 size-5 rounded-full p-0 text-[10px]">
                    {activeFilterCount}
                  </Badge>
                )}
              </Button>
            )}
            <p className="font-body text-sm text-muted-foreground">
              {totalCount} result{totalCount !== 1 ? 's' : ''}
              {query && (
                <>
                  {' '}
                  for &ldquo;{query}&rdquo;
                </>
              )}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Select
              value={sortBy}
              onValueChange={(v) => updateParams({ sort: v })}
            >
              <SelectTrigger className="w-44 font-body text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {SORT_OPTIONS.map((s) => (
                  <SelectItem
                    key={s.value}
                    value={s.value}
                    className="font-body text-sm"
                  >
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex rounded-md border border-border">
              <button
                onClick={() => setViewMode('grid')}
                className={`p-2 ${viewMode === 'grid' ? 'bg-surface text-foreground' : 'text-muted-foreground'}`}
              >
                <Grid3X3 className="size-4" />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`p-2 ${viewMode === 'list' ? 'bg-surface text-foreground' : 'text-muted-foreground'}`}
              >
                <List className="size-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Results */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="size-8 animate-spin text-primary" />
          </div>
        ) : listings.length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-20 text-center">
            <p className="font-display text-lg font-semibold text-foreground">
              No results found
            </p>
            <p className="max-w-md font-body text-sm text-muted-foreground">
              Try adjusting your search or filters to find what you&rsquo;re
              looking for.
            </p>
            <Button
              variant="outline"
              onClick={clearFilters}
              className="font-body"
            >
              Clear filters
            </Button>
          </div>
        ) : viewMode === 'grid' ? (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {listings.map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.id}`}>
                <Card className="h-full border-border bg-card transition-colors hover:border-primary/50">
                  <CardContent className="flex h-full flex-col p-4">
                    <p className="truncate font-body font-medium text-foreground">
                      {listing.title}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <Badge
                        variant="outline"
                        className="font-body text-[11px]"
                      >
                        {listing.category}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="font-body text-[11px] capitalize"
                      >
                        {listing.condition.replace('_', ' ')}
                      </Badge>
                    </div>
                    <div className="mt-auto pt-3">
                      <p className="font-display text-lg font-bold text-primary">
                        {listing.contact_for_price
                          ? 'Contact'
                          : listing.price_cents
                            ? `$${(listing.price_cents / 100).toLocaleString()}`
                            : 'Free'}
                      </p>
                      <p className="mt-1 flex items-center gap-1 font-body text-xs text-muted-foreground">
                        <MapPin className="size-3" />
                        {listing.location_city}, {listing.location_state}
                        <span className="ml-auto flex items-center gap-1">
                          <Heart className="size-3" />
                          {listing.favorites_count}
                        </span>
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {listings.map((listing) => (
              <Link key={listing.id} href={`/listings/${listing.id}`}>
                <Card className="border-border bg-card transition-colors hover:border-primary/50">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body font-medium text-foreground">
                        {listing.title}
                      </p>
                      <p className="mt-1 font-body text-sm text-muted-foreground">
                        {listing.category} &middot;{' '}
                        {listing.condition.replace('_', ' ')} &middot;{' '}
                        {listing.location_city}, {listing.location_state}
                      </p>
                    </div>
                    <p className="shrink-0 font-display text-lg font-bold text-primary">
                      {listing.contact_for_price
                        ? 'Contact'
                        : listing.price_cents
                          ? `$${(listing.price_cents / 100).toLocaleString()}`
                          : 'Free'}
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 pt-4">
            <Button
              variant="outline"
              size="sm"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="font-body"
            >
              Previous
            </Button>
            <span className="font-body text-sm text-muted-foreground">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="font-body"
            >
              Next
            </Button>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
