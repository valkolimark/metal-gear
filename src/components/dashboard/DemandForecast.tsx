'use client'

import { useState, useEffect } from 'react'
import { Loader2, Radio, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface DemandInsight {
  subcategory: string
  prediction: {
    nextPeakMonth: string
    historicalPattern: string
    recommendedAction: string
    demandTrend: 'rising' | 'stable' | 'declining'
    topRequestingIndustries: string[]
    avgResponseRate: number
    insight: string
  }
}

interface DemandForecastProps {
  userCategories: string[]
}

export function DemandForecast({ userCategories }: DemandForecastProps) {
  const [loading, setLoading] = useState(false)
  const [insights, setInsights] = useState<DemandInsight[]>([])
  const [loaded, setLoaded] = useState(false)

  async function fetchInsights() {
    if (userCategories.length === 0) return
    setLoading(true)

    try {
      const results: DemandInsight[] = []
      // Fetch for up to 3 categories
      for (const cat of userCategories.slice(0, 3)) {
        const res = await fetch('/api/sos/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'predict_demand',
            subcategory: cat,
          }),
        })
        const data = await res.json()
        if (data.prediction) {
          results.push({
            subcategory: cat,
            prediction: data.prediction,
          })
        }
      }
      setInsights(results)
      setLoaded(true)
    } catch {
      // Silent fail — not critical
    } finally {
      setLoading(false)
    }
  }

  const trendIcon = {
    rising: <TrendingUp className="size-4 text-red-400" />,
    stable: <Minus className="size-4 text-amber-400" />,
    declining: <TrendingDown className="size-4 text-emerald-400" />,
  }

  const trendColor = {
    rising: 'border-red-500/20 bg-red-500/5',
    stable: 'border-amber-500/20 bg-amber-500/5',
    declining: 'border-emerald-500/20 bg-emerald-500/5',
  }

  const trendDot = {
    rising: '🔴',
    stable: '🟡',
    declining: '🟢',
  }

  if (userCategories.length === 0) return null

  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 font-display text-base">
          <Radio className="size-4 text-primary" />
          Demand Forecast
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!loaded && !loading && (
          <Button
            variant="outline"
            size="sm"
            onClick={fetchInsights}
            className="font-body text-xs"
          >
            Load demand forecast
          </Button>
        )}

        {loading && (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span className="font-body text-sm text-muted-foreground">
              Analyzing demand patterns...
            </span>
          </div>
        )}

        {loaded && insights.length === 0 && (
          <p className="font-body text-sm text-muted-foreground">
            No demand data available for your equipment categories yet.
          </p>
        )}

        {insights.length > 0 && (
          <div className="space-y-3">
            {insights.map((insight) => (
              <div
                key={insight.subcategory}
                className={`rounded-lg border p-3 ${trendColor[insight.prediction.demandTrend]}`}
              >
                <div className="flex items-center gap-2">
                  <span>{trendDot[insight.prediction.demandTrend]}</span>
                  <span className="font-display text-sm font-semibold text-foreground capitalize">
                    {insight.subcategory.replace(/_/g, ' ')}
                  </span>
                  {trendIcon[insight.prediction.demandTrend]}
                </div>

                <p className="mt-1 font-body text-xs text-foreground/70">
                  {insight.prediction.historicalPattern}
                </p>

                <p className="mt-1 font-body text-xs text-foreground/80 font-medium">
                  {insight.prediction.recommendedAction}
                </p>

                <div className="mt-2 flex flex-wrap gap-1">
                  <Badge variant="outline" className="font-body text-[10px]">
                    Response rate: {insight.prediction.avgResponseRate}%
                  </Badge>
                  <Badge variant="outline" className="font-body text-[10px]">
                    Peak: {insight.prediction.nextPeakMonth}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
