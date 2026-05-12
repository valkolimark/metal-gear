import Link from 'next/link'
import { Star } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import type { SellerPageReview } from '../data'

interface SellerRecentReviewsProps {
  reviews: SellerPageReview[]
  total: number
  average: number
  distribution: Record<number, number>
  seeAllHref?: string
}

export function SellerRecentReviews({
  reviews,
  total,
  average,
  distribution,
  seeAllHref,
}: SellerRecentReviewsProps) {
  if (total === 0) {
    return (
      <section className="rounded-2xl bg-card p-5 shadow-[0_1px_2px_rgba(11,37,69,0.04),0_4px_12px_rgba(11,37,69,0.05)]">
        <h3 className="font-display text-[15px] font-bold tracking-tight text-foreground">
          Reviews
        </h3>
        <p className="mt-2 text-sm text-muted-foreground">No reviews yet.</p>
      </section>
    )
  }

  return (
    <section className="rounded-2xl bg-card shadow-[0_1px_2px_rgba(11,37,69,0.04),0_4px_12px_rgba(11,37,69,0.05)]">
      <header className="flex items-center justify-between border-b border-border px-5 py-4">
        <div>
          <h3 className="font-display text-[15px] font-bold tracking-tight text-foreground">
            Recent reviews
          </h3>
          <p className="mt-0.5 text-[12px] text-muted-foreground">
            {average.toFixed(1)}★ over {total.toLocaleString()} review
            {total === 1 ? '' : 's'}
          </p>
        </div>
        {seeAllHref && (
          <Link
            href={seeAllHref}
            className="text-[12px] font-bold text-[#FF6B2B]"
          >
            All reviews →
          </Link>
        )}
      </header>

      <div className="grid gap-6 px-5 py-5 md:grid-cols-[200px_1fr]">
        <div className="flex flex-col items-center gap-2">
          <span className="font-display text-4xl font-bold text-foreground">
            {average.toFixed(1)}
          </span>
          <div className="flex gap-0.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`size-4 ${
                  star <= Math.round(average)
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted-foreground/40'
                }`}
              />
            ))}
          </div>
          <div className="w-full space-y-1">
            {[5, 4, 3, 2, 1].map((bucket) => {
              const count = distribution[bucket] ?? 0
              const pct = total > 0 ? (count / total) * 100 : 0
              return (
                <div key={bucket} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span className="w-3 font-semibold">{bucket}</span>
                  <Star className="size-2.5 fill-yellow-400 text-yellow-400" />
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-yellow-400"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-6 text-right">{count}</span>
                </div>
              )
            })}
          </div>
        </div>

        <div className="space-y-4">
          {reviews.slice(0, 3).map((review) => (
            <div key={review.id} className="space-y-1.5">
              <div className="flex items-center gap-2">
                <Avatar className="size-7">
                  <AvatarImage
                    src={review.reviewer?.avatar_url || undefined}
                    crossOrigin="anonymous"
                  />
                  <AvatarFallback className="bg-primary/20 text-[10px] text-primary">
                    {(
                      review.reviewer?.display_name ||
                      review.reviewer?.full_name ||
                      '?'
                    )
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-medium text-foreground">
                    {review.reviewer?.display_name ||
                      review.reviewer?.full_name ||
                      'Anonymous'}
                  </p>
                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`size-2.5 ${
                          star <= review.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground/40'
                        }`}
                      />
                    ))}
                    <span className="text-[10px] text-muted-foreground">
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
                <p className="text-[13px] text-muted-foreground">
                  {review.comment}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
