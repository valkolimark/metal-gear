'use client'

import { useState } from 'react'
import { Loader2, Handshake, ShieldCheck, AlertTriangle, MessageSquare } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface CoachingResult {
  assessment: string
  recommendedAction: string
  recommendedPrice?: number | null
  rationale: string
  acceptanceProbability: 'high' | 'medium' | 'low'
  redFlags?: string[]
  talkingPoints?: string[]
}

interface OfferCoachProps {
  side: 'buyer' | 'seller'
  listingId: string
  askPrice: number
  offerPrice: number
  offerCount: number
  daysOnMarket: number
  condition: string
  subcategory: string
}

export function OfferCoach({
  side,
  listingId,
  askPrice,
  offerPrice,
  offerCount,
  daysOnMarket,
  condition,
  subcategory,
}: OfferCoachProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<CoachingResult | null>(null)
  const [expanded, setExpanded] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function fetchCoaching() {
    setLoading(true)
    setExpanded(true)
    setError(null)

    try {
      const res = await fetch('/api/listings/ai-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'coach_negotiation',
          negotiation: {
            side,
            listingId,
            askPrice,
            offerPrice,
            offerCount,
            daysOnMarket,
            condition,
            subcategory,
          },
        }),
      })

      const data = await res.json()
      if (data.coaching) {
        setResult(data.coaching)
      } else {
        setError(data.error || 'Failed to get coaching advice')
      }
    } catch {
      setError('Failed to connect to coaching service')
    } finally {
      setLoading(false)
    }
  }

  const probColors = {
    high: 'bg-emerald-500/20 text-emerald-400',
    medium: 'bg-amber-500/20 text-amber-400',
    low: 'bg-red-500/20 text-red-400',
  }

  const percentDiff = Math.round((1 - offerPrice / askPrice) * 100)

  if (!expanded) {
    return (
      <Card className="border-border/30 bg-card/30">
        <CardContent className="p-3">
          <button
            onClick={fetchCoaching}
            className="flex w-full items-center gap-2 text-left"
          >
            <Handshake className="size-4 text-steel-blue shrink-0" />
            <span className="font-body text-sm text-foreground/70">
              Private Deal Coach
            </span>
            <Badge variant="outline" className="ml-auto font-body text-[10px] text-muted-foreground">
              Only you see this
            </Badge>
          </button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-[#3A8FD4]/30 bg-card/50">
      <CardContent className="space-y-4 p-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Handshake className="size-5 text-[#3A8FD4]" />
            <h4 className="font-display text-sm font-semibold">Private Deal Coach</h4>
          </div>
          <Badge variant="outline" className="font-body text-[10px] text-muted-foreground">
            <ShieldCheck className="mr-1 size-3" />
            Only you see this
          </Badge>
        </div>

        {loading && (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="size-4 animate-spin text-[#3A8FD4]" />
            <span className="font-body text-sm text-muted-foreground">Analyzing deal...</span>
          </div>
        )}

        {error && (
          <p className="font-body text-sm text-red-400">{error}</p>
        )}

        {result && (
          <>
            {/* Offer summary */}
            <div className="rounded bg-background/50 p-3 font-body text-sm">
              {side === 'seller' ? (
                <p className="text-foreground/80">
                  Offer received: <span className="font-semibold text-foreground">${offerPrice.toLocaleString()}</span> on your{' '}
                  <span className="font-semibold text-foreground">${askPrice.toLocaleString()}</span> ask
                  {percentDiff > 0 && (
                    <span className="ml-1 text-amber-400">({percentDiff}% below ask)</span>
                  )}
                </p>
              ) : (
                <p className="text-foreground/80">
                  Your offer: <span className="font-semibold text-foreground">${offerPrice.toLocaleString()}</span> on a{' '}
                  <span className="font-semibold text-foreground">${askPrice.toLocaleString()}</span> listing
                  {daysOnMarket > 0 && (
                    <span className="ml-1 text-muted-foreground">&middot; Listed {daysOnMarket} days</span>
                  )}
                </p>
              )}
            </div>

            {/* Assessment */}
            <p className="font-body text-sm text-foreground/80">{result.assessment}</p>

            {/* Recommendation */}
            <div className="rounded border border-[#3A8FD4]/20 bg-[#3A8FD4]/5 p-3">
              <div className="flex items-center gap-2">
                <span className="font-body text-xs text-[#3A8FD4]">Recommendation</span>
              </div>
              <p className="mt-1 font-display text-base font-semibold text-foreground">
                {result.recommendedAction}
              </p>
              <p className="mt-1 font-body text-xs text-foreground/60">{result.rationale}</p>
              <div className="mt-2">
                <Badge className={`${probColors[result.acceptanceProbability]} font-body text-xs`}>
                  {result.acceptanceProbability} acceptance probability
                </Badge>
              </div>
            </div>

            {/* Red flags */}
            {result.redFlags && result.redFlags.length > 0 && (
              <div className="space-y-1">
                {result.redFlags.map((flag, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <AlertTriangle className="mt-0.5 size-3 shrink-0 text-amber-400" />
                    <p className="font-body text-xs text-amber-400/80">{flag}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Talking points */}
            {result.talkingPoints && result.talkingPoints.length > 0 && (
              <div className="space-y-1.5 border-t border-border/30 pt-3">
                <div className="flex items-center gap-1.5">
                  <MessageSquare className="size-3 text-muted-foreground" />
                  <span className="font-body text-xs text-muted-foreground">What to say:</span>
                </div>
                {result.talkingPoints.map((point, i) => (
                  <p key={i} className="font-body text-xs text-foreground/70 italic">
                    &ldquo;{point}&rdquo;
                  </p>
                ))}
              </div>
            )}

            {/* Refresh */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={fetchCoaching}
              disabled={loading}
              className="font-body text-xs text-muted-foreground"
            >
              {loading ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
              Load new analysis
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  )
}
