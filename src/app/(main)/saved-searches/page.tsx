'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  BookmarkCheck,
  Trash2,
  Bell,
  BellOff,
  Clock,
  Zap,
  Search,
  Loader2,
  ArrowRight,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/stores/auth-store'
import {
  getSavedSearches,
  deleteSavedSearch,
  toggleSearchAlert,
  updateSearchFrequency,
} from '@/app/actions/search'

type SavedSearch = {
  id: string
  name: string
  filters: Record<string, string>
  notify_email: boolean
  frequency: string
  created_at: string
}

export default function SavedSearchesPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [searches, setSearches] = useState<SavedSearch[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    getSavedSearches().then((result) => {
      setSearches(
        (result.searches || []).map((s) => ({
          id: s.id,
          name: s.name,
          filters: s.filters as Record<string, string>,
          notify_email: s.notify_email ?? false,
          frequency: (s as Record<string, unknown>).frequency as string || 'daily',
          created_at: s.created_at,
        }))
      )
      setLoading(false)
    })
  }, [user])

  async function handleDelete(id: string) {
    await deleteSavedSearch(id)
    setSearches((prev) => prev.filter((s) => s.id !== id))
    toast.success('Saved search removed')
  }

  async function handleToggleAlert(id: string, current: boolean) {
    const result = await toggleSearchAlert(id, !current)
    if (result.error) {
      toast.error(result.error)
      return
    }
    setSearches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, notify_email: !current } : s))
    )
    toast.success(!current ? 'Email alerts enabled' : 'Email alerts disabled')
  }

  async function handleFrequencyChange(id: string, frequency: string) {
    const result = await updateSearchFrequency(id, frequency)
    if (result.error) {
      toast.error(result.error)
      return
    }
    setSearches((prev) =>
      prev.map((s) => (s.id === id ? { ...s, frequency } : s))
    )
    toast.success('Alert frequency updated')
  }

  function applySavedSearch(filters: Record<string, string>) {
    const params = new URLSearchParams(filters)
    router.push(`/search?${params.toString()}`)
  }

  function formatFilters(filters: Record<string, string>): string {
    const parts: string[] = []
    if (filters.q) parts.push(`"${filters.q}"`)
    if (filters.category) parts.push(filters.category)
    if (filters.industries) parts.push(filters.industries.replace(/,/g, ', '))
    else if (filters.industry) parts.push(filters.industry)
    if (filters.condition) parts.push(filters.condition.replace(/,/g, ', '))
    if (filters.priceMin) parts.push(`$${Number(filters.priceMin).toLocaleString()}+`)
    if (filters.priceMax) parts.push(`up to $${Number(filters.priceMax).toLocaleString()}`)
    if (filters.radius) parts.push(`within ${filters.radius}mi`)
    return parts.join(' / ') || 'All equipment'
  }

  const frequencyIcon = (freq: string) => {
    switch (freq) {
      case 'instant': return <Zap className="size-3" />
      case 'weekly': return <Clock className="size-3" />
      default: return <Clock className="size-3" />
    }
  }

  if (!user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="font-display text-lg font-semibold text-foreground">Sign in required</p>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            Sign in to manage your saved searches
          </p>
          <Link href="/login">
            <Button className="mt-4 font-body">Sign In</Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6 px-4 py-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Saved Searches</h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">
            Manage your saved searches and alert preferences
          </p>
        </div>
        <Link href="/search">
          <Button variant="outline" className="font-body">
            <Search className="mr-2 size-4" />
            New Search
          </Button>
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : searches.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-20 text-center">
          <BookmarkCheck className="size-12 text-muted-foreground/50" />
          <p className="font-display text-lg font-semibold text-foreground">No saved searches</p>
          <p className="max-w-md font-body text-sm text-muted-foreground">
            Save your search filters to quickly re-run them and get notified about new matches.
          </p>
          <Link href="/search">
            <Button className="font-body">
              <Search className="mr-2 size-4" />
              Browse Equipment
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {searches.map((search) => (
            <Card key={search.id} className="border-border bg-card">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <BookmarkCheck className="size-4 shrink-0 text-primary" />
                      <h3 className="truncate font-body font-medium text-foreground">
                        {search.name}
                      </h3>
                    </div>
                    <p className="mt-1 font-body text-xs text-muted-foreground">
                      {formatFilters(search.filters)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      {search.notify_email && (
                        <Badge variant="outline" className="font-body text-[10px]">
                          {frequencyIcon(search.frequency)}
                          <span className="ml-1 capitalize">{search.frequency} alerts</span>
                        </Badge>
                      )}
                      <span className="font-body text-[10px] text-muted-foreground">
                        Saved {new Date(search.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>

                  <div className="flex shrink-0 items-center gap-1.5">
                    {/* Frequency selector */}
                    {search.notify_email && (
                      <Select
                        value={search.frequency}
                        onValueChange={(v) => handleFrequencyChange(search.id, v)}
                      >
                        <SelectTrigger className="h-8 w-24 font-body text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="instant" className="font-body text-xs">
                            Instant
                          </SelectItem>
                          <SelectItem value="daily" className="font-body text-xs">
                            Daily
                          </SelectItem>
                          <SelectItem value="weekly" className="font-body text-xs">
                            Weekly
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    )}

                    {/* Toggle email alerts */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => handleToggleAlert(search.id, search.notify_email)}
                      title={search.notify_email ? 'Disable alerts' : 'Enable alerts'}
                    >
                      {search.notify_email ? (
                        <Bell className="size-4 text-primary" />
                      ) : (
                        <BellOff className="size-4 text-muted-foreground" />
                      )}
                    </Button>

                    {/* Run search */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8"
                      onClick={() => applySavedSearch(search.filters)}
                      title="Run this search"
                    >
                      <ArrowRight className="size-4" />
                    </Button>

                    {/* Delete */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="size-8 text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(search.id)}
                      title="Delete saved search"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
