'use client'

import { useState } from 'react'
import Image from 'next/image'
import { ChevronDown, ShieldCheck } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'

interface ConditionReport {
  overall_grade: string
  mechanical_score: number
  cosmetic_score: number
  electrical_score: number
  hours_of_use?: number | null
  last_service_date?: string | null
  notes?: string | null
  photo_urls?: string[]
  created_at: string
  creator?: { is_verified_dealer?: boolean } | null
}

interface Props {
  specs: Record<string, string> | null
  conditionReport: ConditionReport | null
}

function gradeColor(grade: string) {
  switch (grade) {
    case 'A': return 'bg-green-500/20 text-green-500 dark:text-green-400'
    case 'B': return 'bg-blue-500/20 text-blue-500 dark:text-blue-400'
    case 'C': return 'bg-yellow-500/20 text-yellow-500 dark:text-yellow-400'
    default: return 'bg-red-500/20 text-red-500 dark:text-red-400'
  }
}

function scoreColor(score: number) {
  if (score >= 8) return 'bg-green-500'
  if (score >= 5) return 'bg-yellow-500'
  return 'bg-red-500'
}

function scoreTextColor(score: number) {
  if (score >= 8) return 'text-green-500 dark:text-green-400'
  if (score >= 5) return 'text-yellow-500 dark:text-yellow-400'
  return 'text-red-500 dark:text-red-400'
}

export function ListingSpecs({ specs, conditionReport }: Props) {
  const [reportExpanded, setReportExpanded] = useState(false)

  const hasSpecs = specs && Object.keys(specs).length > 0
  if (!hasSpecs && !conditionReport) return null

  return (
    <div className="space-y-8">
      {/* Technical Specifications */}
      {hasSpecs && (
        <section>
          <h2 className="font-display text-xl font-semibold text-foreground mb-4">
            Technical Specifications
          </h2>
          <div className="divide-y divide-zinc-200 dark:divide-zinc-800 rounded-lg overflow-hidden">
            {Object.entries(specs).map(([key, val], i) => (
              <div
                key={key}
                className={`flex py-3 px-3 text-sm ${
                  i % 2 === 0
                    ? 'bg-zinc-50 dark:bg-zinc-900/40'
                    : ''
                }`}
              >
                <span className="w-48 shrink-0 font-body font-medium text-zinc-500 dark:text-zinc-400">
                  {key}
                </span>
                <span className="font-body text-zinc-800 dark:text-zinc-100">
                  {String(val)}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Condition Report */}
      {conditionReport && (
        <section>
          <button
            onClick={() => setReportExpanded(!reportExpanded)}
            className="flex w-full items-center justify-between"
          >
            <h2 className="flex items-center gap-2 font-display text-xl font-semibold text-foreground">
              Inspection Report
              <Badge className={`font-display text-sm ${gradeColor(conditionReport.overall_grade)}`}>
                Grade {conditionReport.overall_grade}
              </Badge>
              {conditionReport.creator?.is_verified_dealer && (
                <Badge variant="outline" className="gap-1 border-green-500/50 font-body text-[10px] text-green-500 dark:text-green-400">
                  <ShieldCheck className="size-3" />
                  Verified
                </Badge>
              )}
            </h2>
            <ChevronDown
              className={`size-5 text-muted-foreground transition-transform ${
                reportExpanded ? 'rotate-180' : ''
              }`}
            />
          </button>

          {reportExpanded && (
            <div className="mt-4 space-y-4">
              {/* Score bars */}
              <div className="grid grid-cols-3 gap-4">
                {[
                  { label: 'Mechanical', score: conditionReport.mechanical_score },
                  { label: 'Cosmetic', score: conditionReport.cosmetic_score },
                  { label: 'Electrical', score: conditionReport.electrical_score },
                ].map(({ label, score }) => (
                  <div key={label} className="text-center">
                    <p className="font-body text-xs text-muted-foreground">{label}</p>
                    <p className={`font-display text-2xl font-bold ${scoreTextColor(score)}`}>
                      {score}/10
                    </p>
                    <div className="mx-auto mt-1 h-1.5 w-full rounded-full bg-zinc-200 dark:bg-zinc-800">
                      <div
                        className={`h-1.5 rounded-full ${scoreColor(score)}`}
                        style={{ width: `${score * 10}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="grid grid-cols-2 gap-3">
                {conditionReport.hours_of_use != null && (
                  <div>
                    <p className="font-body text-xs text-muted-foreground">Hours of Use</p>
                    <p className="font-body text-sm font-medium text-foreground">
                      {conditionReport.hours_of_use.toLocaleString()}
                    </p>
                  </div>
                )}
                {conditionReport.last_service_date && (
                  <div>
                    <p className="font-body text-xs text-muted-foreground">Last Service</p>
                    <p className="font-body text-sm font-medium text-foreground">
                      {new Date(conditionReport.last_service_date).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                )}
              </div>

              {conditionReport.notes && (
                <div>
                  <p className="font-body text-xs text-muted-foreground">Inspector Notes</p>
                  <p className="mt-1 whitespace-pre-wrap font-body text-sm text-foreground">
                    {conditionReport.notes}
                  </p>
                </div>
              )}

              {conditionReport.photo_urls && conditionReport.photo_urls.length > 0 && (
                <div>
                  <p className="mb-2 font-body text-xs text-muted-foreground">Condition Photos</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {conditionReport.photo_urls.map((url, i) => (
                      <div key={i} className="relative aspect-square overflow-hidden rounded-md border border-border">
                        <Image src={url} alt={`Condition photo ${i + 1}`} fill className="object-cover" sizes="100px" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="font-body text-[10px] text-muted-foreground">
                Report created{' '}
                {new Date(conditionReport.created_at).toLocaleDateString('en-US', {
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </p>
            </div>
          )}
        </section>
      )}
    </div>
  )
}
