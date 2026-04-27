'use client'

import { useState } from 'react'
import { Loader2, BarChart3, Star, AlertTriangle, Check, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface RankedResponse {
  responseId: string
  rank: number
  score: number
  reasoning: string
  flags?: string[]
}

interface ResponseRankerProps {
  sosRequestId: string
  responseCount: number
}

export function ResponseRanker({ sosRequestId, responseCount }: ResponseRankerProps) {
  const [loading, setLoading] = useState(false)
  const [rankings, setRankings] = useState<RankedResponse[]>([])
  const [summary, setSummary] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function fetchRankings() {
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/sos/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'rank_responses',
          sosRequestId,
        }),
      })

      const data = await res.json()
      if (data.rankedResponses) {
        setRankings(data.rankedResponses)
        setSummary(data.rankingSummary || null)
      } else {
        setError(data.error || 'Failed to rank responses')
      }
    } catch {
      setError('Failed to connect to ranking service')
    } finally {
      setLoading(false)
    }
  }

  if (responseCount < 2) return null

  if (rankings.length === 0) {
    return (
      <div className="mb-4">
        <Button
          variant="outline"
          size="sm"
          onClick={fetchRankings}
          disabled={loading}
          className="font-body text-sm"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 size-4 animate-spin" />
              Ranking responses...
            </>
          ) : (
            <>
              <BarChart3 className="mr-2 size-4" />
              Rank responses by quality
            </>
          )}
        </Button>
        {error && <p className="mt-1 font-body text-xs text-red-400">{error}</p>}
      </div>
    )
  }

  return (
    <Card className="mb-4 border-[#1877F2]/20 bg-[#1877F2]/5">
      <CardContent className="space-y-3 p-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-4 text-[#1877F2]" />
          <h4 className="font-display text-sm font-semibold">Best Match</h4>
        </div>

        {summary && (
          <p className="font-body text-xs text-muted-foreground">{summary}</p>
        )}

        <div className="space-y-2">
          {rankings.map((r) => {
            const isTop = r.rank === 1
            const hasFlags = r.flags && r.flags.length > 0
            const scoreColor = r.score >= 80
              ? 'text-emerald-400'
              : r.score >= 50
                ? 'text-amber-400'
                : 'text-red-400'

            return (
              <div
                key={r.responseId}
                className={`rounded border p-2 ${
                  isTop
                    ? 'border-[#1877F2]/30 bg-[#1877F2]/10'
                    : hasFlags
                      ? 'border-amber-500/20 bg-amber-500/5'
                      : 'border-border/30 bg-background/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {isTop && <Star className="size-3 text-[#1877F2]" />}
                    <span className="font-display text-sm font-semibold">
                      #{r.rank}
                    </span>
                    <span className={`font-body text-xs font-semibold ${scoreColor}`}>
                      {r.score}/100
                    </span>
                  </div>
                  {isTop && (
                    <Badge className="bg-[#1877F2]/20 text-[#1877F2] font-body text-[10px]">
                      Best Match
                    </Badge>
                  )}
                </div>

                <p className="mt-1 font-body text-xs text-foreground/70">{r.reasoning}</p>

                {hasFlags && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    {r.flags!.map((flag, i) => (
                      <div key={i} className="flex items-center gap-1">
                        <AlertTriangle className="size-3 text-amber-400" />
                        <span className="font-body text-[10px] text-amber-400/80">{flag}</span>
                      </div>
                    ))}
                  </div>
                )}

                {r.score >= 80 && (
                  <div className="mt-1 flex flex-wrap gap-1">
                    <div className="flex items-center gap-0.5">
                      <Check className="size-3 text-emerald-400" />
                      <span className="font-body text-[10px] text-emerald-400">Strong match</span>
                    </div>
                    <div className="flex items-center gap-0.5">
                      <ShieldCheck className="size-3 text-emerald-400" />
                      <span className="font-body text-[10px] text-emerald-400">Trusted</span>
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <Button
          variant="ghost"
          size="sm"
          onClick={fetchRankings}
          disabled={loading}
          className="font-body text-xs text-muted-foreground"
        >
          {loading ? <Loader2 className="mr-1 size-3 animate-spin" /> : null}
          Re-rank
        </Button>
      </CardContent>
    </Card>
  )
}
