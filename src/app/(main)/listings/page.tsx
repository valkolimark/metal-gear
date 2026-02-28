'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { Plus, Edit, Eye, Trash2, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import type { Listing } from '@/types/listings'

const STATUS_COLORS: Record<string, string> = {
  draft: 'bg-yellow-500/20 text-yellow-400',
  active: 'bg-green-500/20 text-green-400',
  sold: 'bg-blue-500/20 text-blue-400',
  expired: 'bg-zinc-500/20 text-zinc-400',
  removed: 'bg-red-500/20 text-red-400',
}

export default function ListingsPage() {
  const { user } = useAuthStore()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase
      .from('listings')
      .select('*')
      .eq('seller_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          toast.error('Failed to load listings')
          console.error(error)
        }
        setListings((data as Listing[]) ?? [])
        setLoading(false)
      })
  }, [user])

  async function handleDelete(id: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('listings')
      .update({ status: 'removed' })
      .eq('id', id)

    if (error) {
      toast.error('Failed to remove listing')
      return
    }
    setListings((prev) =>
      prev.map((l) => (l.id === id ? { ...l, status: 'removed' } : l))
    )
    toast.success('Listing removed')
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold text-foreground">
            My Listings
          </h1>
          <p className="mt-1 font-body text-muted-foreground">
            Manage your equipment listings
          </p>
        </div>
        <Button asChild className="font-body">
          <Link href="/listings/new">
            <Plus className="mr-2 size-4" />
            Create Listing
          </Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : listings.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <p className="font-display text-lg font-semibold text-foreground">
              No listings yet
            </p>
            <p className="max-w-md text-center font-body text-sm text-muted-foreground">
              Start selling your industrial equipment by creating your first
              listing.
            </p>
            <Button asChild className="font-body">
              <Link href="/listings/new">
                <Plus className="mr-2 size-4" />
                Create Your First Listing
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {listings.map((listing) => (
            <Card key={listing.id} className="border-border bg-card">
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-body font-medium text-foreground">
                      {listing.title}
                    </p>
                    <Badge
                      className={`text-xs ${STATUS_COLORS[listing.status] || ''}`}
                    >
                      {listing.status}
                    </Badge>
                  </div>
                  <p className="mt-1 font-body text-sm text-muted-foreground">
                    {listing.category} &middot;{' '}
                    {listing.contact_for_price
                      ? 'Contact for Price'
                      : listing.price_cents
                        ? `$${(listing.price_cents / 100).toLocaleString()}`
                        : 'Free'}
                    {' '}&middot; {listing.views_count} views &middot;{' '}
                    {listing.favorites_count} favorites
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/listings/${listing.id}`}>
                      <Eye className="size-4" />
                    </Link>
                  </Button>
                  <Button variant="ghost" size="icon" asChild>
                    <Link href={`/listings/${listing.id}/edit`}>
                      <Edit className="size-4" />
                    </Link>
                  </Button>
                  {listing.status !== 'removed' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(listing.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
