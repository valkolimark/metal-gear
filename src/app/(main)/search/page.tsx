'use client'

import { Suspense, useEffect, useState, useCallback, useRef } from 'react'
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
  Bookmark,
  BookmarkCheck,
  Clock,
  Trash2,
} from 'lucide-react'
import { toast } from 'sonner'
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Sidebar } from '@/components/layout/sidebar'
import { PageLayout } from '@/components/layout/page-layout'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import {
  getSavedSearches,
  saveSearch,
  deleteSavedSearch,
} from '@/app/actions/search'
import {
  EQUIPMENT_CATEGORIES,
  INDUSTRIES,
  LISTING_CONDITIONS,
  SORT_OPTIONS,
} from '@/lib/constants'
import type { Tables } from '@/types/database'

type Listing = Tables<'listings'>

const PAGE_SIZE = 12

// Common search suggestions
const SEARCH_SUGGESTIONS = [
  'CNC Machines',
  'Lathes',
  'Milling Machines',
  'Welding Equipment',
  'Compressors',
  'Generators',
  'Pumps',
  'Cranes',
  'Forklifts',
  'Drilling',
  'Grinding',
  'Valves',
  'Heat Exchangers',
  'Transformers',
  'Conveyors',
  'Tanks',
  'Piping',
  'Safety Equipment',
]

// Recent searches localStorage key
const RECENT_SEARCHES_KEY = 'mg-recent-searches'
const MAX_RECENT_SEARCHES = 10

function getRecentSearches(): string[] {
  if (typeof window === 'undefined') return []
  try {
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || '[]')
  } catch {
    return []
  }
}

function addRecentSearch(query: string) {
  if (!query.trim()) return
  const recent = getRecentSearches().filter((s) => s !== query)
  recent.unshift(query)
  localStorage.setItem(
    RECENT_SEARCHES_KEY,
    JSON.stringify(recent.slice(0, MAX_RECENT_SEARCHES))
  )
}

function removeRecentSearch(query: string) {
  const recent = getRecentSearches().filter((s) => s !== query)
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(recent))
}

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
  const { user } = useAuthStore()

  const [filtersOpen, setFiltersOpen] = useState(true)
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [loading, setLoading] = useState(true)
  const [listings, setListings] = useState<Listing[]>([])
  const [totalCount, setTotalCount] = useState(0)
  const [page, setPage] = useState(0)

  // Search suggestions state
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [recentSearches, setRecentSearches] = useState<string[]>([])
  const searchInputRef = useRef<HTMLInputElement>(null)
  const suggestionsRef = useRef<HTMLDivElement>(null)

  // Saved searches state
  const [savedSearches, setSavedSearches] = useState<
    { id: string; name: string; filters: Record<string, string> }[]
  >([])
  const [saveDialogOpen, setSaveDialogOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [savingSearch, setSavingSearch] = useState(false)

  // Read params from URL
  const query = searchParams.get('q') || ''
  const category = searchParams.get('category') || ''
  const industry = searchParams.get('industry') || ''
  const condition = searchParams.get('condition') || ''
  const priceMin = searchParams.get('priceMin') || ''
  const priceMax = searchParams.get('priceMax') || ''
  const sortBy = searchParams.get('sort') || 'newest'

  const [searchInput, setSearchInput] = useState(query)

  // Load recent searches on mount
  useEffect(() => {
    setRecentSearches(getRecentSearches())
  }, [])

  // Load saved searches
  useEffect(() => {
    if (!user) return
    getSavedSearches().then((result) => {
      if (result.searches) {
        setSavedSearches(
          result.searches.map((s) => ({
            id: s.id,
            name: s.name,
            filters: s.filters as Record<string, string>,
          }))
        )
      }
    })
  }, [user])

  // Close suggestions on click outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target as Node)
      ) {
        setShowSuggestions(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

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
    if (searchInput.trim()) {
      addRecentSearch(searchInput.trim())
      setRecentSearches(getRecentSearches())
    }
    updateParams({ q: searchInput })
    setShowSuggestions(false)
  }

  function handleSuggestionClick(term: string) {
    setSearchInput(term)
    addRecentSearch(term)
    setRecentSearches(getRecentSearches())
    updateParams({ q: term })
    setShowSuggestions(false)
  }

  function clearFilters() {
    router.push('/search', { scroll: false })
    setSearchInput('')
  }

  async function handleSaveSearch() {
    if (!saveName.trim()) return
    setSavingSearch(true)

    const filters: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      filters[key] = value
    })

    const result = await saveSearch(saveName.trim(), filters)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Search saved')
      setSaveDialogOpen(false)
      setSaveName('')
      // Reload saved searches
      const updated = await getSavedSearches()
      if (updated.searches) {
        setSavedSearches(
          updated.searches.map((s) => ({
            id: s.id,
            name: s.name,
            filters: s.filters as Record<string, string>,
          }))
        )
      }
    }
    setSavingSearch(false)
  }

  async function handleDeleteSavedSearch(id: string) {
    await deleteSavedSearch(id)
    setSavedSearches((prev) => prev.filter((s) => s.id !== id))
    toast.success('Saved search removed')
  }

  function applySavedSearch(filters: Record<string, string>) {
    const params = new URLSearchParams(filters)
    router.push(`/search?${params.toString()}`, { scroll: false })
    if (filters.q) setSearchInput(filters.q)
  }

  const totalPages = Math.ceil(totalCount / PAGE_SIZE)
  const activeFilterCount = [
    category,
    industry,
    condition,
    priceMin,
    priceMax,
  ].filter(Boolean).length

  // Filter suggestions based on input
  const filteredSuggestions = searchInput
    ? SEARCH_SUGGESTIONS.filter((s) =>
        s.toLowerCase().includes(searchInput.toLowerCase())
      )
    : SEARCH_SUGGESTIONS.slice(0, 6)

  const hasActiveFilters = query || activeFilterCount > 0

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
            {/* Saved Searches */}
            {user && savedSearches.length > 0 && (
              <div className="space-y-2">
                <p className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Saved Searches
                </p>
                <div className="space-y-1">
                  {savedSearches.map((s) => (
                    <div key={s.id} className="flex items-center gap-1">
                      <button
                        onClick={() => applySavedSearch(s.filters)}
                        className="flex-1 truncate rounded px-2 py-1.5 text-left font-body text-sm text-foreground transition-colors hover:bg-surface"
                      >
                        <BookmarkCheck className="mr-1.5 inline size-3 text-primary" />
                        {s.name}
                      </button>
                      <button
                        onClick={() => handleDeleteSavedSearch(s.id)}
                        className="shrink-0 rounded p-1 text-muted-foreground transition-colors hover:text-destructive"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>
                  ))}
                </div>
                <Separator />
              </div>
            )}

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
        {/* Search bar with suggestions */}
        <form onSubmit={handleSearch} className="relative flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              ref={searchInputRef}
              type="search"
              placeholder="Search equipment..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              onFocus={() => setShowSuggestions(true)}
              className="pl-9 font-body"
              autoComplete="off"
            />

            {/* Suggestions dropdown */}
            {showSuggestions && (
              <div
                ref={suggestionsRef}
                className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border border-border bg-card shadow-lg"
              >
                {/* Recent searches */}
                {recentSearches.length > 0 && (
                  <div className="border-b border-border p-2">
                    <p className="px-2 py-1 font-body text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Recent
                    </p>
                    {recentSearches.slice(0, 5).map((term) => (
                      <div
                        key={term}
                        className="flex items-center justify-between rounded px-2 py-1.5 transition-colors hover:bg-surface"
                      >
                        <button
                          type="button"
                          onClick={() => handleSuggestionClick(term)}
                          className="flex flex-1 items-center gap-2 font-body text-sm text-foreground"
                        >
                          <Clock className="size-3 text-muted-foreground" />
                          {term}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            removeRecentSearch(term)
                            setRecentSearches(getRecentSearches())
                          }}
                          className="rounded p-0.5 text-muted-foreground hover:text-foreground"
                        >
                          <X className="size-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Suggestions */}
                <div className="p-2">
                  <p className="px-2 py-1 font-body text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Suggestions
                  </p>
                  {filteredSuggestions.map((term) => (
                    <button
                      key={term}
                      type="button"
                      onClick={() => handleSuggestionClick(term)}
                      className="flex w-full items-center gap-2 rounded px-2 py-1.5 font-body text-sm text-foreground transition-colors hover:bg-surface"
                    >
                      <Search className="size-3 text-muted-foreground" />
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <Button type="submit" className="font-body">
            Search
          </Button>
          {user && hasActiveFilters && (
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={() => setSaveDialogOpen(true)}
              title="Save this search"
            >
              <Bookmark className="size-4" />
            </Button>
          )}
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

      {/* Save Search Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Save Search</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="search-name" className="font-body">
                Name
              </Label>
              <Input
                id="search-name"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g., CNC machines under $50k"
                className="font-body"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    handleSaveSearch()
                  }
                }}
              />
            </div>
            <p className="font-body text-xs text-muted-foreground">
              Current filters:{' '}
              {query && `"${query}"`}
              {category && ` ${category}`}
              {industry && ` ${industry}`}
              {condition && ` ${condition}`}
              {priceMin && ` $${priceMin}+`}
              {priceMax && ` up to $${priceMax}`}
              {!hasActiveFilters && 'None'}
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setSaveDialogOpen(false)}
              className="font-body"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveSearch}
              disabled={!saveName.trim() || savingSearch}
              className="font-body"
            >
              {savingSearch ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Bookmark className="mr-2 size-4" />
              )}
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </PageLayout>
  )
}
