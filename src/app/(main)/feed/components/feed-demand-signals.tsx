'use client'

import { TrendingUp } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface DemandData {
  insights: unknown
  valid_until: string | null
  generated_at: string | null
}

interface FeedDemandSignalsProps {
  data: DemandData
}

interface DemandInsight {
  category?: string
  demand_level?: string
  description?: string
  recommendation?: string
}

export function FeedDemandSignals({ data }: FeedDemandSignalsProps) {
  const insights = (data.insights as DemandInsight[] | null) ?? []

  if (!insights.length) return null

  const topInsights = insights.slice(0, 2)

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold flex items-center gap-2">
          <TrendingUp className="size-5 text-amber-500" />
          Demand Signals
        </h2>
        <Badge variant="outline" className="text-xs">Pro+</Badge>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {topInsights.map((insight, i) => (
          <Card key={i} className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4">
              {insight.category && (
                <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                  {insight.category.replace(/_/g, ' ')}
                </p>
              )}
              {insight.demand_level && (
                <Badge
                  className={`mb-2 text-[11px] ${
                    insight.demand_level === 'high'
                      ? 'bg-green-500/20 text-green-600 dark:text-green-400'
                      : 'bg-blue-500/20 text-blue-600 dark:text-blue-400'
                  }`}
                >
                  {insight.demand_level} demand
                </Badge>
              )}
              {insight.description && (
                <p className="text-sm text-foreground">{insight.description}</p>
              )}
              {insight.recommendation && (
                <p className="mt-2 text-xs text-muted-foreground">{insight.recommendation}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  )
}
