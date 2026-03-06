'use client'

import { useState } from 'react'
import { Bot, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { generateDisputeSummary } from '@/app/actions/dispute-mediation'

interface DisputeSummaryData {
  summary: string
  buyerClaim: string
  sellerPosition: string
  keyFactsAgreedOn: string[]
  keyDisagreements: string[]
  evidenceAssessment: string
  possibleOutcomes: Array<{
    outcome: string
    reasoning: string
    precedent: string
  }>
  recommendedAction?: string
  confidenceInRecommendation: 'high' | 'medium' | 'low'
  flaggedIssues?: string[]
}

export function DisputeAISummary({
  disputeId,
  initialSummary,
}: {
  disputeId: string
  initialSummary?: DisputeSummaryData | null
}) {
  const [summary, setSummary] = useState<DisputeSummaryData | null>(initialSummary || null)
  const [generating, setGenerating] = useState(false)

  async function handleGenerate() {
    setGenerating(true)
    try {
      const result = await generateDisputeSummary(disputeId)
      if (result.error) {
        toast.error(result.error)
      } else if (result.summary) {
        setSummary(result.summary as DisputeSummaryData)
        toast.success('AI summary generated')
      }
    } catch {
      toast.error('Failed to generate summary')
    } finally {
      setGenerating(false)
    }
  }

  const confidenceColor = {
    high: 'bg-green-500/20 text-green-400',
    medium: 'bg-yellow-500/20 text-yellow-400',
    low: 'bg-red-500/20 text-red-400',
  }

  return (
    <Card className="border-white/5 bg-[#0D0D14]">
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="flex items-center gap-2 font-display text-base">
          <Bot className="size-4 text-secondary" />
          AI Case Summary
        </CardTitle>
        <Button
          variant="outline"
          size="sm"
          onClick={handleGenerate}
          disabled={generating}
          className="font-body text-xs"
        >
          {generating ? (
            <>
              <RefreshCw className="mr-1 size-3 animate-spin" />
              Analyzing...
            </>
          ) : summary ? (
            <>
              <RefreshCw className="mr-1 size-3" />
              Refresh
            </>
          ) : (
            'Generate'
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {!summary ? (
          <p className="font-body text-sm text-muted-foreground">
            Click &quot;Generate&quot; to create an AI-powered case summary for this dispute.
          </p>
        ) : (
          <div className="space-y-4">
            {/* Summary */}
            <div className="rounded-lg bg-surface p-4">
              <p className="whitespace-pre-wrap font-body text-sm leading-relaxed text-foreground">
                {summary.summary}
              </p>
            </div>

            {/* Buyer vs Seller */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                <p className="mb-1 font-body text-xs font-semibold text-blue-400">Buyer Claim</p>
                <p className="font-body text-sm text-foreground">{summary.buyerClaim}</p>
              </div>
              <div className="rounded-lg border border-purple-500/20 bg-purple-500/5 p-3">
                <p className="mb-1 font-body text-xs font-semibold text-purple-400">Seller Position</p>
                <p className="font-body text-sm text-foreground">{summary.sellerPosition}</p>
              </div>
            </div>

            {/* Key disagreements */}
            {summary.keyDisagreements.length > 0 && (
              <div>
                <p className="mb-2 font-body text-xs font-semibold text-muted-foreground">Key Disagreements</p>
                <div className="space-y-1">
                  {summary.keyDisagreements.map((d, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <XCircle className="mt-0.5 size-3.5 shrink-0 text-red-400" />
                      <span className="font-body text-sm text-foreground">{d}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Agreed facts */}
            {summary.keyFactsAgreedOn.length > 0 && (
              <div>
                <p className="mb-2 font-body text-xs font-semibold text-muted-foreground">Agreed Facts</p>
                <div className="space-y-1">
                  {summary.keyFactsAgreedOn.map((f, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="mt-0.5 size-3.5 shrink-0 text-green-400" />
                      <span className="font-body text-sm text-foreground">{f}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Evidence assessment */}
            <div>
              <p className="mb-2 font-body text-xs font-semibold text-muted-foreground">Evidence Assessment</p>
              <p className="font-body text-sm text-muted-foreground">{summary.evidenceAssessment}</p>
            </div>

            {/* Possible outcomes */}
            {summary.possibleOutcomes.length > 0 && (
              <div>
                <p className="mb-2 font-body text-xs font-semibold text-muted-foreground">Possible Outcomes</p>
                <div className="space-y-2">
                  {summary.possibleOutcomes.map((o, i) => (
                    <div key={i} className="rounded-lg border border-white/5 bg-surface p-3">
                      <p className="font-body text-sm font-medium text-foreground">
                        {i + 1}. {o.outcome}
                      </p>
                      <p className="mt-1 font-body text-xs text-muted-foreground">{o.reasoning}</p>
                      <p className="mt-1 font-body text-[10px] italic text-muted-foreground">{o.precedent}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendation */}
            {summary.recommendedAction && (
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-3">
                <div className="flex items-center gap-2">
                  <p className="font-body text-sm font-medium text-foreground">
                    Recommendation: {summary.recommendedAction}
                  </p>
                  <Badge className={`border-0 font-body text-[10px] ${confidenceColor[summary.confidenceInRecommendation]}`}>
                    {summary.confidenceInRecommendation} confidence
                  </Badge>
                </div>
              </div>
            )}

            {/* Flagged issues */}
            {summary.flaggedIssues && summary.flaggedIssues.length > 0 && (
              <div>
                <div className="space-y-1">
                  {summary.flaggedIssues.map((issue, i) => (
                    <div key={i} className="flex items-start gap-2">
                      <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-400" />
                      <span className="font-body text-sm text-amber-400">{issue}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Disclaimer */}
            <p className="border-t border-white/5 pt-3 font-body text-[10px] text-muted-foreground">
              This is an AI-generated summary to assist review. Final decisions are made by Metal Gear staff.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
