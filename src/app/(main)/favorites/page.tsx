'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Heart, Loader2, MapPin, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { createClient } from '@/lib/supabase/client'
import { useAuthStore } from '@/stores/auth-store'
import type { Tables } from '@/types/database'

type Listing = Tables<'listings'>
type Favorite = Tables<'favorites'>

interface FavoriteWithListing extends Favorite {
  listings: Listing
}

export default function FavoritesPage() {
  const { user } = useAuthStore()
  const [favorites, setFavorites] = useState<FavoriteWithListing[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    const supabase = createClient()
    supabase
      .from('favorites')
      .select('*, listings(*)')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) {
          console.error(error)
          toast.error('Failed to load favorites')
        }
        setFavorites((data as unknown as FavoriteWithListing[]) ?? [])
        setLoading(false)
      })
  }, [user])

  async function removeFavorite(favoriteId: string, listingId: string) {
    const supabase = createClient()
    const { error } = await supabase
      .from('favorites')
      .delete()
      .eq('id', favoriteId)

    if (error) {
      toast.error('Failed to remove favorite')
      return
    }

    setFavorites((prev) => prev.filter((f) => f.id !== favoriteId))
    toast.success('Removed from favorites')
  }

  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Favorites
        </h1>
        <p className="mt-1 font-body text-muted-foreground">
          Equipment you&rsquo;ve saved for later
        </p>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : favorites.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center gap-4 py-16">
            <Heart className="size-12 text-muted-foreground" />
            <p className="font-display text-lg font-semibold text-foreground">
              No favorites yet
            </p>
            <p className="max-w-md text-center font-body text-sm text-muted-foreground">
              Browse equipment and tap the heart icon to save listings you&rsquo;re
              interested in.
            </p>
            <Button asChild className="font-body">
              <Link href="/search">Browse Equipment</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {favorites.map((fav) => {
            const listing = fav.listings
            if (!listing) return null
            return (
              <Card
                key={fav.id}
                className="group relative border-border bg-card transition-colors hover:border-primary/50"
              >
                <Link href={`/listings/${listing.id}`}>
                  <CardContent className="flex flex-col p-4">
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
                    <p className="mt-3 font-display text-lg font-bold text-primary">
                      {listing.contact_for_price
                        ? 'Contact'
                        : listing.price_cents
                          ? `$${(listing.price_cents / 100).toLocaleString()}`
                          : 'Free'}
                    </p>
                    <p className="mt-1 flex items-center gap-1 font-body text-xs text-muted-foreground">
                      <MapPin className="size-3" />
                      {listing.location_city}, {listing.location_state}
                    </p>
                  </CardContent>
                </Link>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => removeFavorite(fav.id, listing.id)}
                  className="absolute right-2 top-2 text-red-500 opacity-0 transition-opacity group-hover:opacity-100"
                >
                  <Trash2 className="size-4" />
                </Button>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
