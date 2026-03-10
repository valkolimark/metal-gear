'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Wrench, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

export function ProblemDiagnoser() {
  const router = useRouter()
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim()) return
    setLoading(true)
    // Navigate to search page with the problem query pre-loaded
    const params = new URLSearchParams()
    params.set('problem', input.trim())
    params.set('ai', '1')
    router.push(`/search?${params.toString()}`)
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <div className="flex items-center gap-2 mb-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <Wrench className="size-4 text-primary" />
        </div>
        <h3 className="font-display text-base font-semibold text-foreground">
          Describe your equipment problem
        </h3>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={'"My centrifuge bowl is vibrating under load..."'}
          rows={2}
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2.5 font-body text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <Button
          type="submit"
          disabled={!input.trim() || loading}
          variant="outline"
          className="font-body text-sm border-primary text-primary hover:bg-primary/10"
        >
          {loading ? (
            <Loader2 className="size-4 animate-spin mr-1.5" />
          ) : (
            <ArrowRight className="size-4 mr-1.5" />
          )}
          Diagnose
        </Button>
      </form>
    </div>
  )
}
