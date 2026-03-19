'use client'

import { Star } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface ReputationStats {
  totalReviews: number
  avgRating: number
  distribution: Record<number, number>
  recentReviews: Array<{
    rating: number
    created_at: string
    comment: string | null
    profiles: { full_name: string | null } | null
  }>
}

interface CompanyReputationProps {
  stats: ReputationStats
}

export function CompanyReputation({ stats }: CompanyReputationProps) {
  return (
    <section>
      <h2 className="mb-4 font-display text-xl font-semibold">Reputation</h2>
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Rating overview */}
        <Card className="lg:col-span-1">
          <CardContent className="p-6 text-center">
            <p className="font-display text-4xl font-bold text-primary">
              {stats.avgRating.toFixed(1)}
            </p>
            <div className="mt-1 flex items-center justify-center gap-0.5">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`size-4 ${
                    s <= Math.round(stats.avgRating)
                      ? 'fill-yellow-400 text-yellow-400'
                      : 'text-muted-foreground/30'
                  }`}
                />
              ))}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {stats.totalReviews} {stats.totalReviews === 1 ? 'review' : 'reviews'}
            </p>

            {/* Distribution bars */}
            <div className="mt-4 space-y-1.5">
              {[5, 4, 3, 2, 1].map((rating) => {
                const count = stats.distribution[rating] ?? 0
                const pct = stats.totalReviews > 0 ? (count / stats.totalReviews) * 100 : 0
                return (
                  <div key={rating} className="flex items-center gap-2 text-xs">
                    <span className="w-3 text-right text-muted-foreground">{rating}</span>
                    <Star className="size-3 fill-yellow-400 text-yellow-400" />
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                      <div
                        className="h-full rounded-full bg-yellow-400"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="w-6 text-right text-muted-foreground">{count}</span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>

        {/* Recent reviews */}
        <div className="space-y-3 lg:col-span-2">
          {stats.recentReviews.map((review, i) => (
            <Card key={i}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-0.5">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star
                        key={s}
                        className={`size-3.5 ${
                          s <= review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground/30'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                {review.comment && (
                  <p className="mt-2 text-sm text-foreground">{review.comment}</p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  {review.profiles?.full_name ?? 'Anonymous'}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  )
}
