'use client'

import { useState, useEffect, useRef } from 'react'
import { BarChart3, Loader2, ArrowUp, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface QualityBreakdown {
  score: number
  max: number
  feedback: string
}

interface QualityResult {
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  breakdown: {
    photos: QualityBreakdown
    description: QualityBreakdown
    specs: QualityBreakdown
    title: QualityBreakdown
    pricing: QualityBreakdown
  }
  topImprovements: string[]
  estimatedReachMultiplier: number
}

interface ListingQualityScoreProps {
  listing: {
    title: string
    description: string
    condition: string
    specifications: Record<string, string>
    price_cents: string
    contact_for_price: boolean
    photoCount: number
    hasVideo: boolean
  }
  onImprove?: (section: string) => void
  compact?: boolean
}

const GRADE_COLORS: Record<string, string> = {
  A: 'text-green-400',
  B: 'text-blue-400',
  C: 'text-yellow-400',
  D: 'text-orange-400',
  F: 'text-red-400',
}

const GRADE_BG: Record<string, string> = {
  A: 'bg-green-500/20',
  B: 'bg-blue-500/20',
  C: 'bg-yellow-500/20',
  D: 'bg-orange-500/20',
  F: 'bg-red-500/20',
}

export function ListingQualityScore({
  listing,
  onImprove,
  compact = false,
}: ListingQualityScoreProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<QualityResult | null>(null)
  const debounceRef = useRef<NodeJS.Timeout>(null)
  const lastHashRef = useRef('')

  // Create a hash of the listing data to detect changes
  function getHash() {
    return JSON.stringify({
      t: listing.title,
      d: listing.description?.slice(0, 50),
      s: Object.keys(listing.specifications).length,
      p: listing.price_cents,
      c: listing.contact_for_price,
      ph: listing.photoCount,
      v: listing.hasVideo,
    })
  }

  async function score() {
    setLoading(true)
    try {
      const specs = { ...listing.specifications }
      const manufacturer = specs.manufacturer
      const model = specs.model

      const res = await fetch('/api/listings/ai-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'score_quality',
          listing: {
            title: listing.title,
            manufacturer,
            model,
            condition: listing.condition,
            specs,
            description: listing.description,
            photoCount: listing.photoCount,
            hasVideo: listing.hasVideo,
            price: listing.price_cents ? parseFloat(listing.price_cents) : undefined,
          },
        }),
      })

      if (!res.ok) throw new Error('Failed to score')
      const data = (await res.json()) as QualityResult
      setResult(data)
    } catch (err) {
      console.error('Quality score error:', err)
    } finally {
      setLoading(false)
    }
  }

  // Auto-score with debounce (5 second delay)
  useEffect(() => {
    const hash = getHash()
    if (hash === lastHashRef.current) return
    lastHashRef.current = hash

    // Only auto-score if we have a title
    if (!listing.title || listing.title.length < 3) return

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => {
      score()
    }, 5000)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing.title, listing.description, listing.photoCount, listing.price_cents, listing.contact_for_price, Object.keys(listing.specifications).length])

  // Compact chip version for listing management
  if (compact && result) {
    return (
      <Badge
        variant="outline"
        className={`font-body text-xs cursor-pointer ${GRADE_COLORS[result.grade]}`}
        onClick={() => score()}
      >
        <BarChart3 className="size-3 mr-1" />
        Score: {result.score} {result.grade}
      </Badge>
    )
  }

  if (!result && !loading) {
    return (
      <Card className="border-border bg-card/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="size-4 text-muted-foreground" />
              <span className="font-body text-sm font-medium text-foreground">
                Listing Quality Score
              </span>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={score}
              disabled={!listing.title}
              className="font-body text-xs"
            >
              <BarChart3 className="size-3 mr-1" />
              Score Now
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (loading) {
    return (
      <Card className="border-border bg-card/50">
        <CardContent className="flex items-center gap-3 p-4">
          <Loader2 className="size-4 animate-spin text-primary" />
          <span className="font-body text-sm text-muted-foreground">
            Analyzing listing quality...
          </span>
        </CardContent>
      </Card>
    )
  }

  if (!result) return null

  const { score: totalScore, grade, breakdown, topImprovements, estimatedReachMultiplier } = result
  const barWidth = `${totalScore}%`

  return (
    <Card className="border-border bg-card/50">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="size-4 text-muted-foreground" />
            <span className="font-body text-sm font-medium text-foreground">
              Listing Quality Score
            </span>
          </div>
          <Badge className={`font-display text-sm ${GRADE_BG[grade]} ${GRADE_COLORS[grade]} border-0`}>
            {grade}
          </Badge>
        </div>

        {/* Overall score bar */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="font-display text-2xl font-bold text-foreground">{totalScore}</span>
            <span className="font-body text-xs text-muted-foreground">/ 100</span>
          </div>
          <div className="h-2.5 rounded-full bg-surface overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                totalScore >= 80 ? 'bg-green-500' :
                totalScore >= 65 ? 'bg-blue-500' :
                totalScore >= 50 ? 'bg-yellow-500' :
                totalScore >= 35 ? 'bg-orange-500' : 'bg-red-500'
              }`}
              style={{ width: barWidth }}
            />
          </div>
        </div>

        {/* Breakdown */}
        <div className="space-y-2">
          {Object.entries(breakdown).map(([key, data]) => {
            const pct = data.max > 0 ? (data.score / data.max) * 100 : 0
            const isGood = pct >= 70
            return (
              <div key={key} className="flex items-center gap-3">
                <span className="font-body text-xs text-muted-foreground w-20 capitalize shrink-0">
                  {key}
                </span>
                <div className="flex-1 h-1.5 rounded-full bg-surface overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isGood ? 'bg-green-500' : 'bg-yellow-500'}`}
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="font-body text-xs text-muted-foreground w-12 text-right shrink-0">
                  {data.score}/{data.max}
                </span>
                <span className="font-body text-[10px] w-4 shrink-0">
                  {isGood ? '✅' : '⚠️'}
                </span>
              </div>
            )
          })}
        </div>

        {/* Top improvements */}
        {topImprovements.length > 0 && (
          <div className="space-y-1.5">
            <p className="font-body text-xs font-medium text-muted-foreground">
              Top improvements:
            </p>
            <ol className="space-y-1">
              {topImprovements.map((tip, i) => (
                <li key={i} className="flex gap-2 font-body text-xs text-foreground">
                  <span className="text-muted-foreground shrink-0">{i + 1}.</span>
                  {tip}
                </li>
              ))}
            </ol>
          </div>
        )}

        {/* Reach multiplier */}
        {estimatedReachMultiplier > 1 && (
          <div className="flex items-center gap-2 rounded-md bg-primary/5 px-3 py-2">
            <TrendingUp className="size-3.5 text-primary shrink-0" />
            <p className="font-body text-xs text-primary">
              Complete these to reach {estimatedReachMultiplier}x more buyers
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {onImprove && topImprovements.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                // Determine which section needs most improvement
                const weakest = Object.entries(breakdown).sort(
                  (a, b) => (a[1].score / a[1].max) - (b[1].score / b[1].max)
                )[0]
                onImprove(weakest[0])
              }}
              className="font-body text-xs"
            >
              <ArrowUp className="size-3 mr-1" />
              Improve Now
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
