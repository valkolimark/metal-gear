'use client'

import { useState, useRef } from 'react'
import { Sparkles, Loader2, Check, RefreshCw, Pencil } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface AIDescriptionGeneratorProps {
  listing: {
    title: string
    manufacturer?: string
    model?: string
    condition: string
    specifications: Record<string, string>
  }
  onUseDescription: (description: string) => void
  onEditDescription: (description: string) => void
}

interface GeneratedResult {
  description: string
  descriptionBullets: string[]
}

export function AIDescriptionGenerator({
  listing,
  onUseDescription,
  onEditDescription,
}: AIDescriptionGeneratorProps) {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<GeneratedResult | null>(null)
  const [streamedText, setStreamedText] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  const hasEnoughInfo = listing.title && listing.title.length > 3

  async function generate(regenerate = false) {
    if (!hasEnoughInfo) return
    setLoading(true)
    setResult(null)
    setStreamedText('')

    abortRef.current = new AbortController()

    try {
      const specs = { ...listing.specifications }
      const manufacturer = specs.manufacturer || listing.manufacturer
      const model = specs.model
      delete specs.manufacturer
      delete specs.model

      const res = await fetch('/api/listings/ai-copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_description',
          listing: {
            title: listing.title,
            manufacturer,
            model,
            condition: listing.condition,
            specs,
          },
          regenerate,
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error('Failed to generate')

      // Stream the response
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No reader')

      const decoder = new TextDecoder()
      let fullText = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        const chunk = decoder.decode(value, { stream: true })
        fullText += chunk
        setStreamedText(fullText)
      }

      // Parse the completed JSON
      const cleaned = fullText
        .replace(/^```(?:json)?\s*\n?/i, '')
        .replace(/\n?```\s*$/i, '')
        .trim()

      try {
        const parsed = JSON.parse(cleaned) as GeneratedResult
        setResult(parsed)
        setStreamedText('')
      } catch {
        // If parsing fails, treat entire text as description
        setResult({ description: fullText, descriptionBullets: [] })
        setStreamedText('')
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error('AI description error:', err)
      }
    } finally {
      setLoading(false)
    }
  }

  const summary = [
    listing.specifications?.manufacturer || listing.manufacturer,
    listing.specifications?.model || listing.model,
    listing.specifications?.year,
    listing.condition?.replace(/_/g, ' '),
  ]
    .filter(Boolean)
    .join(', ')

  return (
    <Card className="border-border bg-card/50">
      <CardContent className="p-4 space-y-3">
        {!result && !loading && !streamedText && (
          <>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-body text-[10px] gap-1 bg-primary/10 text-primary border-0">
                <Sparkles className="size-2.5" />
                AI Copy
              </Badge>
              <span className="font-body text-sm font-medium text-foreground">
                Generate description with AI
              </span>
            </div>
            {summary && (
              <p className="font-body text-xs text-muted-foreground">
                Based on: {summary}
              </p>
            )}
            <Button
              onClick={() => generate()}
              disabled={!hasEnoughInfo || loading}
              variant="outline"
              size="sm"
              className="font-body"
            >
              <Sparkles className="size-3.5 mr-1.5" />
              Generate Description
            </Button>
            {!hasEnoughInfo && (
              <p className="font-body text-xs text-muted-foreground">
                Add a title first to generate a description
              </p>
            )}
          </>
        )}

        {/* Streaming text */}
        {loading && streamedText && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Loader2 className="size-3.5 animate-spin text-primary" />
              <span className="font-body text-xs text-muted-foreground">
                Generating...
              </span>
            </div>
            <p className="whitespace-pre-wrap font-body text-sm text-foreground/80 max-h-60 overflow-y-auto">
              {streamedText}
            </p>
          </div>
        )}

        {loading && !streamedText && (
          <div className="flex items-center gap-2 py-4">
            <Loader2 className="size-4 animate-spin text-primary" />
            <span className="font-body text-sm text-muted-foreground">
              Generating description...
            </span>
          </div>
        )}

        {/* Generated result */}
        {result && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="font-body text-[10px] gap-1 bg-primary/10 text-primary border-0">
                <Sparkles className="size-2.5" />
                AI-Generated Description
              </Badge>
            </div>

            <p className="whitespace-pre-wrap rounded-md border border-border bg-background p-3 font-body text-sm text-foreground max-h-60 overflow-y-auto">
              {result.description}
            </p>

            {result.descriptionBullets.length > 0 && (
              <div>
                <p className="font-body text-xs font-medium text-muted-foreground mb-1.5">
                  Key selling points:
                </p>
                <ul className="space-y-1">
                  {result.descriptionBullets.map((bullet, i) => (
                    <li key={i} className="flex gap-2 font-body text-xs text-foreground">
                      <span className="text-primary shrink-0">&#8226;</span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => onUseDescription(result.description)}
                className="font-body"
              >
                <Check className="size-3.5 mr-1" />
                Use This
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => generate(true)}
                className="font-body"
              >
                <RefreshCw className="size-3.5 mr-1" />
                Regenerate
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEditDescription(result.description)}
                className="font-body text-muted-foreground"
              >
                <Pencil className="size-3.5 mr-1" />
                Edit before using
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
