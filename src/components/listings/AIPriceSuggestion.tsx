'use client'

import { useState } from 'react'
import { Loader2, TrendingUp, BarChart3, Lightbulb, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface PricingResult {
  suggestedMin: number
  suggestedMax: number
  suggestedTarget: number
  confidence: 'high' | 'medium' | 'low'
  reasoning: string
  comparables: Array<{
    title: string
    price: number
    condition: string
    daysOnMarket: number
    soldOrActive: string
  }>
  marketInsight: string
  pricingTips: string[]
}

interface AIPriceSuggestionProps {
  category: string
  condition: string
  manufacturer?: string
  model?: string
  year?: string
  specs?: Record<string, string>
  location?: string
  onUsePrice: (price: number) => void
}

export function AIPriceSuggestion({
  category,
  condition,
  manufacturer,
  model,
  year,
  specs,
  location,
  onUsePrice,
}: AIPriceSuggestionProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<PricingResult | null>(null)
  const [noData, setNoData] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const canFetch = category && condition

  async function fetchPricing() {
    if (!canFetch) return
    setLoading(true)
    setError(null)
    setNoData(null)

    try {
      const res = await fetch('/api/listings/ai-pricing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'suggest_price',
          listing: {
            category,
            condition,
            manufacturer,
            model,
            year: year ? parseInt(year) : undefined,
            specs,
            location,
          },
        }),
      })

      const data = await res.json()

      if (data.pricing) {
        setResult(data.pricing)
      } else if (data.message) {
        setNoData(data.message)
      } else {
        setError(data.error || 'Failed to get pricing data')
      }
    } catch {
      setError('Failed to connect to pricing service')
    } finally {
      setLoading(false)
    }
  }

  if (!canFetch) return null

  const confidenceColors = {
    high: 'bg-emerald-500/20 text-emerald-400',
    medium: 'bg-amber-500/20 text-amber-400',
    low: 'bg-red-500/20 text-red-400',
  }

  const confidenceBars = {
    high: 'w-full',
    medium: 'w-2/3',
    low: 'w-1/3',
  }

  return (
    <div className="space-y-3">
      {!result && !noData && (
        <Button
          type="button"
          variant="outline"
          onClick={fetchPricing}
          disabled={loading}
          className="font-body text-sm"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Analyzing market...
            </>
          ) : (
            <>
              <BarChart3 className="mr-2 size-4" />
              Get Price Estimate
            </>
          )}
        </Button>
      )}

      {error && (
        <p className="font-body text-sm text-red-400">{error}</p>
      )}

      {noData && (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="p-4">
            <p className="font-body text-sm text-muted-foreground">{noData}</p>
          </CardContent>
        </Card>
      )}

      {result && (
        <Card className="border-border/50 bg-card/50">
          <CardContent className="space-y-4 p-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="size-5 text-primary" />
              <h4 className="font-display text-sm font-semibold">Market Price Estimate</h4>
            </div>

            {/* Price range */}
            <div className="space-y-2">
              <div className="flex items-baseline justify-between">
                <span className="font-body text-xs text-muted-foreground">Suggested range</span>
                <span className="font-display text-lg font-bold text-foreground">
                  ${result.suggestedMin.toLocaleString()} &mdash; ${result.suggestedMax.toLocaleString()}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="font-body text-xs text-muted-foreground">Target price</span>
                <div className="flex items-center gap-2">
                  <span className="font-display text-xl font-bold text-primary">
                    ${result.suggestedTarget.toLocaleString()}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => onUsePrice(result.suggestedTarget)}
                    className="h-7 font-body text-xs"
                  >
                    <Check className="mr-1 size-3" />
                    Use This
                  </Button>
                </div>
              </div>

              {/* Confidence bar */}
              <div className="flex items-center gap-2">
                <span className="font-body text-xs text-muted-foreground">Confidence</span>
                <div className="flex-1">
                  <div className="h-2 overflow-hidden rounded-full bg-border/50">
                    <div className={`h-full rounded-full bg-primary transition-all ${confidenceBars[result.confidence]}`} />
                  </div>
                </div>
                <Badge className={`${confidenceColors[result.confidence]} font-body text-xs`}>
                  {result.confidence} ({result.comparables.length} comparables)
                </Badge>
              </div>
            </div>

            {/* Comparables */}
            {result.comparables.length > 0 && (
              <div className="space-y-1.5">
                <span className="font-body text-xs text-muted-foreground">Based on:</span>
                {result.comparables.slice(0, 3).map((comp, i) => (
                  <div key={i} className="flex items-center justify-between rounded bg-background/50 px-2 py-1.5 font-body text-xs">
                    <span className="truncate text-foreground">{comp.title}</span>
                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <span className="text-muted-foreground capitalize">{comp.condition?.replace(/_/g, ' ')}</span>
                      <span className="font-semibold text-foreground">${comp.price?.toLocaleString()}</span>
                      <Badge variant="outline" className="text-[10px]">
                        {comp.soldOrActive === 'sold' ? `Sold ${comp.daysOnMarket}d` : 'Active'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Market insight */}
            {result.marketInsight && (
              <div className="flex items-start gap-2 rounded bg-primary/5 p-2">
                <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" />
                <p className="font-body text-xs text-foreground/80">{result.marketInsight}</p>
              </div>
            )}

            {/* Quick price buttons */}
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                size="sm"
                onClick={() => onUsePrice(result.suggestedTarget)}
                className="font-body text-xs"
              >
                Use ${result.suggestedTarget.toLocaleString()}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => onUsePrice(result.suggestedMax)}
                className="font-body text-xs"
              >
                Use ${result.suggestedMax.toLocaleString()}
              </Button>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={() => setResult(null)}
                className="font-body text-xs text-muted-foreground"
              >
                Set my own price
              </Button>
            </div>

            {/* Pricing tips */}
            {result.pricingTips && result.pricingTips.length > 0 && (
              <div className="space-y-1 border-t border-border/50 pt-3">
                {result.pricingTips.map((tip, i) => (
                  <p key={i} className="font-body text-xs text-muted-foreground">
                    {tip}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
