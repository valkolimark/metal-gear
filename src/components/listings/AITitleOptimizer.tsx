'use client'

import { useState } from 'react'
import { Sparkles, Loader2, Check, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

interface AITitleOptimizerProps {
  title: string
  manufacturer?: string
  model?: string
  condition: string
  specifications: Record<string, string>
  onApplyTitle: (title: string) => void
}

interface TitleResult {
  optimizedTitle: string
  titleAlternatives: string[]
  titleIssues: string[]
}

export function AITitleOptimizer({
  title,
  manufacturer,
  model,
  condition,
  specifications,
  onApplyTitle,
}: AITitleOptimizerProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TitleResult | null>(null)
  const [selectedIdx, setSelectedIdx] = useState(0)

  const canOptimize = title.length > 3 && (manufacturer || model || specifications?.manufacturer || specifications?.model)

  async function optimize() {
    if (!canOptimize) return
    setLoading(true)
    setResult(null)

    try {
      const mfr = specifications?.manufacturer || manufacturer
      const mdl = specifications?.model || model

      const res = await fetch('/api/listings/ai-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'optimize_title',
          listing: {
            title,
            manufacturer: mfr,
            model: mdl,
            condition,
            specs: specifications,
          },
        }),
      })

      if (!res.ok) throw new Error('Failed to optimize')
      const data = (await res.json()) as TitleResult
      setResult(data)
      setSelectedIdx(0)
    } catch (err) {
      console.error('Title optimization error:', err)
    } finally {
      setLoading(false)
    }
  }

  if (!result) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={optimize}
        disabled={!canOptimize || loading}
        className="font-body text-xs text-primary hover:text-primary shrink-0"
      >
        {loading ? (
          <Loader2 className="size-3 animate-spin mr-1" />
        ) : (
          <Sparkles className="size-3 mr-1" />
        )}
        Optimize
      </Button>
    )
  }

  const allTitles = [result.optimizedTitle, ...result.titleAlternatives]

  return (
    <div className="mt-2 space-y-2 rounded-lg border border-border bg-card/50 p-3">
      {/* Issues */}
      {result.titleIssues.length > 0 && (
        <div className="flex items-start gap-2">
          <AlertTriangle className="size-3.5 shrink-0 text-yellow-500 mt-0.5" />
          <p className="font-body text-xs text-yellow-500">
            {result.titleIssues.join('. ')}
          </p>
        </div>
      )}

      {/* Title options */}
      <p className="font-body text-xs font-medium text-muted-foreground">Suggested:</p>
      <div className="space-y-1.5">
        {allTitles.map((t, i) => (
          <label
            key={i}
            className={`flex items-center gap-2 rounded-md border px-3 py-2 cursor-pointer transition-colors ${
              selectedIdx === i
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/30'
            }`}
          >
            <input
              type="radio"
              name="title-option"
              checked={selectedIdx === i}
              onChange={() => setSelectedIdx(i)}
              className="sr-only"
            />
            <div
              className={`size-3.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
                selectedIdx === i ? 'border-primary' : 'border-muted-foreground'
              }`}
            >
              {selectedIdx === i && (
                <div className="size-1.5 rounded-full bg-primary" />
              )}
            </div>
            <span className="font-body text-sm text-foreground">{t}</span>
            {i === 0 && (
              <Badge variant="secondary" className="ml-auto font-body text-[9px] bg-primary/10 text-primary border-0">
                Best
              </Badge>
            )}
          </label>
        ))}
      </div>

      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={() => {
            onApplyTitle(allTitles[selectedIdx])
            setResult(null)
          }}
          className="font-body"
        >
          <Check className="size-3 mr-1" />
          Apply Selected
        </Button>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => setResult(null)}
          className="font-body text-muted-foreground"
        >
          Keep Original
        </Button>
      </div>
    </div>
  )
}
