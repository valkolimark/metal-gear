'use client'

import { useState, useEffect } from 'react'
import { Shield, CheckCircle2, AlertTriangle, ThumbsUp } from 'lucide-react'
import { Star } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

interface ReputationData {
  summary: string
  strengths: string[]
  watchouts: string[]
  responseTime: string
  verifiedClaims: string[]
  buyerRecommendation: string
  confidenceLevel: 'high' | 'medium' | 'low'
  reviewCount: number
  avgRating: number
  lastUpdated: string
}

export function ReputationSummary({ sellerId }: { sellerId: string }) {
  const [data, setData] = useState<ReputationData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function fetchReputation() {
      try {
        const res = await fetch(`/api/users/${sellerId}/reputation-summary`)
        if (res.ok) {
          const json = await res.json()
          if (!cancelled) setData(json)
        }
      } catch {
        // Silently fail — reviews section still shows
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchReputation()
    return () => { cancelled = true }
  }, [sellerId])

  if (loading) {
    return (
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Shield className="size-5 text-secondary" />
            Seller Reputation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    )
  }

  if (!data) return null

  const confidenceBadge = {
    high: { label: 'High confidence', className: 'bg-green-500/20 text-green-400' },
    medium: { label: 'Medium confidence', className: 'bg-yellow-500/20 text-yellow-400' },
    low: { label: 'Limited data', className: 'bg-zinc-500/20 text-zinc-400' },
  }[data.confidenceLevel]

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 font-display text-lg">
          <Shield className="size-5 text-secondary" />
          Seller Reputation
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Rating + confidence */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`size-5 ${
                  star <= Math.round(data.avgRating)
                    ? 'fill-yellow-400 text-yellow-400'
                    : star - 0.5 <= data.avgRating
                      ? 'fill-yellow-400/50 text-yellow-400'
                      : 'text-muted-foreground'
                }`}
              />
            ))}
          </div>
          <span className="font-display text-lg font-bold text-foreground">{data.avgRating}</span>
          <span className="font-body text-sm text-muted-foreground">({data.reviewCount} reviews)</span>
          <Badge className={`border-0 font-body text-[10px] ${confidenceBadge.className}`}>
            {confidenceBadge.label}
          </Badge>
        </div>

        {/* AI Summary */}
        <p className="font-body text-sm leading-relaxed text-muted-foreground">
          {data.summary}
        </p>

        {/* Strengths */}
        {data.strengths.length > 0 && (
          <div className="space-y-2">
            {data.strengths.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-green-400" />
                <span className="font-body text-sm text-foreground">{s}</span>
              </div>
            ))}
          </div>
        )}

        {/* Watchouts */}
        {data.watchouts.length > 0 && (
          <div className="space-y-2">
            {data.watchouts.map((w, i) => (
              <div key={i} className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
                <span className="font-body text-sm text-muted-foreground">{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Buyer recommendation */}
        <div className="flex items-center gap-2 rounded-lg bg-surface p-3">
          <ThumbsUp className="size-4 text-primary" />
          <span className="font-body text-sm text-foreground">{data.buyerRecommendation}</span>
        </div>

        {/* Response time */}
        <p className="font-body text-xs text-muted-foreground">
          {data.responseTime}
        </p>
      </CardContent>
    </Card>
  )
}
