'use client'

import Link from 'next/link'
import { Star, Settings } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { Tables } from '@/types/database'

interface Review {
  id: string
  rating: number
  comment: string | null
  created_at: string
  reviewer: {
    id: string
    full_name: string | null
    display_name: string | null
    avatar_url: string | null
  } | null
}

interface Props {
  reviews: Review[]
  averageRating: number
  totalReviews: number
  seller: Tables<'profiles'>
}

function StarRow({ rating, count, total }: { rating: number; count: number; total: number }) {
  const pct = total > 0 ? (count / total) * 100 : 0
  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-8 font-body text-muted-foreground">{rating} star</span>
      <div className="h-2 flex-1 rounded-full bg-zinc-200 dark:bg-zinc-800">
        <div
          className="h-2 rounded-full bg-yellow-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-6 text-right font-body text-muted-foreground">{count}</span>
    </div>
  )
}

export function ListingReviews({ reviews, averageRating, totalReviews, seller }: Props) {
  // Calculate star distribution
  const distribution = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: reviews.filter((r) => r.rating === star).length,
  }))

  // Reputation summary from seller profile
  const repSummary = seller.reputation_summary as { summary?: string } | null

  return (
    <section>
      <h2 className="font-display text-xl font-semibold text-foreground mb-4">
        Seller Reviews
      </h2>

      {totalReviews === 0 ? (
        <p className="font-body text-sm text-muted-foreground">
          No reviews yet &middot; Be the first to transact with this seller
        </p>
      ) : (
        <div className="space-y-6">
          {/* Summary bar */}
          <div className="flex gap-6">
            <div className="text-center">
              <p className="font-display text-4xl font-bold text-foreground">
                {averageRating.toFixed(1)}
              </p>
              <div className="flex justify-center gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`size-4 ${
                      s <= Math.round(averageRating)
                        ? 'fill-yellow-500 text-yellow-500'
                        : 'text-zinc-300 dark:text-zinc-700'
                    }`}
                  />
                ))}
              </div>
              <p className="mt-1 font-body text-xs text-muted-foreground">
                {totalReviews} review{totalReviews !== 1 ? 's' : ''}
              </p>
            </div>
            <div className="flex-1 space-y-1">
              {distribution.map(({ star, count }) => (
                <StarRow key={star} rating={star} count={count} total={totalReviews} />
              ))}
            </div>
          </div>

          {/* AI Reputation Summary */}
          {repSummary?.summary && (
            <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-4">
              <div className="flex items-center gap-2 mb-2">
                <Settings className="size-4 text-teal-500" />
                <span className="font-display text-sm font-semibold text-teal-600 dark:text-teal-400">
                  AI Summary &middot; Based on {totalReviews} reviews
                </span>
              </div>
              <p className="font-body text-sm text-foreground">
                &ldquo;{repSummary.summary}&rdquo;
              </p>
            </div>
          )}

          {/* Individual reviews */}
          <div className="space-y-4">
            {reviews.slice(0, 5).map((review) => (
              <div key={review.id} className="rounded-lg border border-zinc-200 dark:border-zinc-800 p-4">
                <div className="flex items-center gap-3">
                  <Avatar className="size-8">
                    <AvatarImage src={review.reviewer?.avatar_url || undefined} crossOrigin="anonymous" />
                    <AvatarFallback className="bg-primary/20 font-display text-[10px] text-primary">
                      {review.reviewer?.full_name
                        ?.split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2) || '??'}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <p className="font-body text-sm font-medium text-foreground">
                      {review.reviewer?.display_name || review.reviewer?.full_name || 'Anonymous'}
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex gap-0.5">
                        {[1, 2, 3, 4, 5].map((s) => (
                          <Star
                            key={s}
                            className={`size-3 ${
                              s <= review.rating
                                ? 'fill-yellow-500 text-yellow-500'
                                : 'text-zinc-300 dark:text-zinc-700'
                            }`}
                          />
                        ))}
                      </div>
                      <span className="font-body text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </span>
                    </div>
                  </div>
                </div>
                {review.comment && (
                  <p className="mt-2 font-body text-sm text-muted-foreground">
                    {review.comment}
                  </p>
                )}
              </div>
            ))}
          </div>

          {totalReviews > 5 && (
            <Link
              href={`/sellers/${seller.id}`}
              className="font-body text-sm text-primary hover:underline"
            >
              See all {totalReviews} reviews &rarr;
            </Link>
          )}
        </div>
      )}
    </section>
  )
}
