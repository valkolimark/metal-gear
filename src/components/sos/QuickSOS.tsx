'use client'

import { useState } from 'react'
import { Loader2, Check, Edit3, Send, AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface Categorization {
  tier1: string
  tier2: string
  subcategory: string
  confidence: 'high' | 'medium' | 'low'
  extractedSpecs: Record<string, string>
  extractedUrgency: 'critical' | 'urgent' | 'normal'
  extractedBrand?: string | null
  suggestedTitle: string
  clarifyingQuestion?: string | null
}

interface QuickSOSProps {
  onCategorized: (data: {
    equipment_category: string
    equipment_subcategory: string
    brand: string
    title: string
    description: string
    urgency: 'critical' | 'normal'
    ai_categorized: boolean
  }) => void
  onSwitchToDetailed: () => void
}

export function QuickSOS({ onCategorized, onSwitchToDetailed }: QuickSOSProps) {
  const [text, setText] = useState('')
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<Categorization | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [budget, setBudget] = useState('')
  const [location, setLocation] = useState('')

  async function handleSubmit() {
    if (!text.trim()) return
    setLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/sos/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'categorize', description: text }),
      })

      const data = await res.json()
      if (data.categorization) {
        setResult(data.categorization)
      } else {
        setError(data.error || 'Failed to categorize')
      }
    } catch {
      setError('Failed to connect to AI service')
    } finally {
      setLoading(false)
    }
  }

  function handleSendSOS() {
    if (!result) return
    onCategorized({
      equipment_category: result.tier2,
      equipment_subcategory: result.subcategory,
      brand: result.extractedBrand || '',
      title: result.suggestedTitle,
      description: text,
      urgency: result.extractedUrgency === 'urgent' ? 'critical' : result.extractedUrgency as 'critical' | 'normal',
      ai_categorized: true,
    })
  }

  const urgencyColors = {
    critical: 'bg-red-500/20 text-red-400 border-red-500/30',
    urgent: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    normal: 'bg-green-500/20 text-green-400 border-green-500/30',
  }

  // Step 1: Text input
  if (!result) {
    return (
      <Card className="border-red-500/20 bg-red-500/5">
        <CardContent className="space-y-4 p-4">
          <div className="flex items-center gap-2">
            <span className="text-lg">🆘</span>
            <h3 className="font-display text-base font-semibold text-foreground">
              Quick SOS — Describe what you need
            </h3>
          </div>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={'e.g., "Need an Alfa Laval decanter centrifuge ASAP, 75HP minimum, for oily water — we\'re down"'}
            rows={3}
            className="w-full rounded-md border border-border bg-background px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground"
          />

          {error && <p className="font-body text-sm text-red-400">{error}</p>}

          {loading && (
            <div className="flex items-center gap-2 rounded bg-background/50 p-3">
              <Loader2 className="size-4 animate-spin text-primary" />
              <span className="font-body text-sm text-muted-foreground">AI is routing your SOS...</span>
            </div>
          )}

          <div className="flex items-center gap-3">
            <Button
              onClick={handleSubmit}
              disabled={!text.trim() || loading}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Get Help Now'
              )}
            </Button>
            <button
              onClick={onSwitchToDetailed}
              className="font-body text-sm text-muted-foreground hover:text-foreground"
            >
              Use detailed form →
            </button>
          </div>
        </CardContent>
      </Card>
    )
  }

  // Step 2: Show extracted details for confirmation
  return (
    <Card className="border-green-500/20 bg-green-500/5">
      <CardContent className="space-y-4 p-4">
        <div className="flex items-center gap-2">
          <Check className="size-5 text-green-400" />
          <h3 className="font-display text-base font-semibold text-foreground">
            Got it — here&apos;s what I found:
          </h3>
        </div>

        {/* Clarifying question */}
        {result.confidence === 'low' && result.clarifyingQuestion && (
          <div className="flex items-start gap-2 rounded border border-amber-500/30 bg-amber-500/10 p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" />
            <p className="font-body text-sm text-amber-400">{result.clarifyingQuestion}</p>
          </div>
        )}

        {/* Extracted fields */}
        <div className="space-y-2 rounded bg-background/50 p-3">
          <div className="grid grid-cols-2 gap-2 font-body text-sm">
            <div>
              <span className="text-xs text-muted-foreground">Equipment</span>
              <p className="text-foreground">{result.subcategory?.replace(/_/g, ' ') || result.tier2?.replace(/_/g, ' ')}</p>
            </div>
            <div>
              <span className="text-xs text-muted-foreground">Category</span>
              <p className="text-foreground">{result.tier1}</p>
            </div>
            {result.extractedBrand && (
              <div>
                <span className="text-xs text-muted-foreground">Brand</span>
                <p className="text-foreground">{result.extractedBrand} (preferred)</p>
              </div>
            )}
            {Object.keys(result.extractedSpecs).length > 0 && (
              <div>
                <span className="text-xs text-muted-foreground">Specs</span>
                <p className="text-foreground">
                  {Object.entries(result.extractedSpecs).map(([k, v]) => `${k}: ${v}`).join(', ')}
                </p>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="font-body text-xs text-muted-foreground">Urgency:</span>
            <Badge className={urgencyColors[result.extractedUrgency]}>
              {result.extractedUrgency === 'critical' ? '🔴 CRITICAL' : result.extractedUrgency.toUpperCase()}
            </Badge>
          </div>
        </div>

        {/* Optional additions */}
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label className="font-body text-xs">Budget (optional)</Label>
            <Input
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="e.g., $25,000 max"
              className="font-body"
            />
          </div>
          <div className="space-y-1">
            <Label className="font-body text-xs">Location (optional)</Label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Houston, TX"
              className="font-body"
            />
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSendSOS}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            <Send className="mr-2 size-4" />
            Send SOS Now 🆘
          </Button>
          <Button
            variant="outline"
            onClick={onSwitchToDetailed}
          >
            <Edit3 className="mr-2 size-4" />
            Edit Details
          </Button>
        </div>

        {/* Confidence indicator */}
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="font-body text-[10px]">
            AI confidence: {result.confidence}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}
