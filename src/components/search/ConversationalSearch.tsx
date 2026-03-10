'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  Search,
  X,
  Loader2,
  Sparkles,
  Send,
  MessageSquare,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/auth-store'
import { saveSearch } from '@/app/actions/search'

interface AIFilters {
  tier1?: string
  tier2?: string
  subcategories?: string[]
  manufacturer?: string
  minPrice?: number
  maxPrice?: number
  condition?: string[]
  radiusMiles?: number
  keywords?: string
}

interface AIResponse {
  intent: 'search' | 'clarify' | 'recommend' | 'no_results_suggestion'
  filters: AIFilters
  clarifyingQuestion?: string
  explanation: string
  suggestions?: string[]
  rawResponse: string
}

interface ConversationMessage {
  role: 'user' | 'assistant'
  content: string
}

interface ConversationalSearchProps {
  onResults: (listings: unknown[], totalCount: number) => void
  onLoading: (loading: boolean) => void
  onFiltersChange: (params: Record<string, string>) => void
  intentHint?: 'problem'
  initialQuery?: string
}

export function ConversationalSearch({
  onResults,
  onLoading,
  onFiltersChange,
  intentHint,
  initialQuery,
}: ConversationalSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user } = useAuthStore()
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [aiResponse, setAiResponse] = useState<AIResponse | null>(null)
  const [conversationHistory, setConversationHistory] = useState<
    ConversationMessage[]
  >([])
  const [activeFilters, setActiveFilters] = useState<AIFilters>({})
  const [showConversation, setShowConversation] = useState(false)
  const [autoSearchDone, setAutoSearchDone] = useState(false)

  const performSearch = useCallback(
    async (
      query: string,
      history: ConversationMessage[],
      hint?: 'problem'
    ) => {
      setLoading(true)
      onLoading(true)

      try {
        const res = await fetch('/api/search/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            query,
            conversationHistory: history.length > 0 ? history : undefined,
            intent_hint: hint,
          }),
        })

        if (!res.ok) {
          throw new Error('AI search failed')
        }

        const data = await res.json()
        const ai = data.ai as AIResponse

        setAiResponse(ai)
        setActiveFilters(ai.filters)

        // Update conversation history
        const newHistory: ConversationMessage[] = [
          ...history,
          { role: 'user', content: query },
          { role: 'assistant', content: ai.explanation },
        ]
        setConversationHistory(newHistory)
        if (newHistory.length > 2) {
          setShowConversation(true)
        }

        // Update URL params for shareability
        const params: Record<string, string> = {}
        if (ai.filters.keywords) params.q = ai.filters.keywords
        if (ai.filters.minPrice) params.priceMin = String(ai.filters.minPrice)
        if (ai.filters.maxPrice) params.priceMax = String(ai.filters.maxPrice)
        if (ai.filters.condition?.length)
          params.condition = ai.filters.condition.join(',')
        if (ai.filters.radiusMiles)
          params.radius = String(ai.filters.radiusMiles)
        params.ai = '1'
        onFiltersChange(params)

        // Pass results up
        if (ai.intent !== 'clarify') {
          onResults(data.listings ?? [], data.totalCount ?? 0)
        }
      } catch {
        // Fallback to standard keyword search
        toast.error('AI search unavailable, falling back to keyword search')
        const params = new URLSearchParams(searchParams.toString())
        params.set('q', query)
        params.delete('ai')
        router.push(`/search?${params.toString()}`, { scroll: false })
      } finally {
        setLoading(false)
        onLoading(false)
      }
    },
    [onResults, onLoading, onFiltersChange, searchParams, router]
  )

  // Auto-search on mount if initialQuery is provided
  useEffect(() => {
    if (initialQuery && !autoSearchDone) {
      setAutoSearchDone(true)
      performSearch(initialQuery, [], intentHint)
    }
  }, [initialQuery, autoSearchDone, performSearch, intentHint])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!input.trim() || loading) return
    const query = input.trim()
    setInput('')
    performSearch(query, conversationHistory, intentHint)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  function removeFilter(key: keyof AIFilters) {
    const updated = { ...activeFilters }
    delete updated[key]
    setActiveFilters(updated)

    // Re-run search with remaining filters
    const params: Record<string, string> = {}
    if (updated.keywords) params.q = updated.keywords
    if (updated.minPrice) params.priceMin = String(updated.minPrice)
    if (updated.maxPrice) params.priceMax = String(updated.maxPrice)
    if (updated.condition?.length)
      params.condition = updated.condition.join(',')
    if (updated.radiusMiles) params.radius = String(updated.radiusMiles)
    params.ai = '1'
    onFiltersChange(params)

    // Re-fetch with remaining filters (rebuild query from remaining context)
    const lastQuery = conversationHistory
      .filter((m) => m.role === 'user')
      .pop()?.content
    if (lastQuery) {
      performSearch(
        `${lastQuery} (remove ${key} filter)`,
        conversationHistory,
        intentHint
      )
    }
  }

  function clearAll() {
    setAiResponse(null)
    setActiveFilters({})
    setConversationHistory([])
    setShowConversation(false)
    setInput('')
    onResults([], 0)
    onFiltersChange({})
    router.push('/search', { scroll: false })
  }

  async function handleSaveSearch() {
    if (!user) {
      toast.error('Sign in to save searches')
      return
    }
    const lastQuery = conversationHistory
      .filter((m) => m.role === 'user')
      .pop()?.content
    if (!lastQuery) return

    const filters: Record<string, string> = {}
    searchParams.forEach((v, k) => {
      filters[k] = v
    })

    const result = await saveSearch(
      lastQuery.slice(0, 50),
      filters,
      'daily'
    )
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('AI search saved')
    }
  }

  const filterChips = getFilterChips(activeFilters)
  const hasResults = aiResponse && aiResponse.intent !== 'clarify'

  return (
    <div className="space-y-3">
      {/* Conversation thread */}
      {showConversation && conversationHistory.length > 2 && (
        <div className="rounded-lg border border-border bg-card/50 p-3">
          <div className="flex items-center gap-2 mb-2">
            <MessageSquare className="size-3.5 text-primary" />
            <span className="font-body text-xs font-medium text-muted-foreground">
              Conversation
            </span>
          </div>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {conversationHistory.slice(0, -2).map((msg, i) => (
              <div key={i} className="font-body text-sm">
                <span
                  className={
                    msg.role === 'user'
                      ? 'text-foreground font-medium'
                      : 'text-primary italic'
                  }
                >
                  {msg.role === 'user' ? 'You: ' : 'AI: '}
                </span>
                <span
                  className={
                    msg.role === 'user'
                      ? 'text-foreground'
                      : 'text-primary'
                  }
                >
                  {msg.content}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main search input */}
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative flex items-start gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 size-4 text-muted-foreground" />
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                intentHint === 'problem'
                  ? 'Describe your equipment problem...'
                  : 'Describe what you need... "3-phase decanter centrifuge for oily sludge, <$40k"'
              }
              rows={1}
              className="w-full resize-none rounded-lg border border-border bg-card py-2.5 pl-9 pr-4 font-body text-sm text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
            />
            <div className="absolute right-2 top-1.5 flex items-center gap-1">
              <Badge
                variant="secondary"
                className="font-body text-[10px] gap-1 bg-primary/10 text-primary border-0"
              >
                <Sparkles className="size-2.5" />
                AI Search
              </Badge>
            </div>
          </div>
          <Button
            type="submit"
            disabled={loading || !input.trim()}
            className="font-body shrink-0"
            size="default"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </form>

      {/* Loading state */}
      {loading && (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card/50 p-3">
          <Loader2 className="size-4 animate-spin text-primary" />
          <p className="font-body text-sm italic text-primary">
            Analyzing your query...
          </p>
        </div>
      )}

      {/* AI explanation */}
      {aiResponse && !loading && (
        <div className="rounded-lg border border-border bg-card/50 p-3 space-y-2">
          <p className="font-body text-sm italic text-primary">
            {aiResponse.explanation}
          </p>

          {/* Clarifying question */}
          {aiResponse.intent === 'clarify' && aiResponse.clarifyingQuestion && (
            <div className="mt-2 rounded-md bg-primary/10 p-3">
              <p className="font-body text-sm text-primary">
                {aiResponse.clarifyingQuestion}
              </p>
            </div>
          )}

          {/* No results suggestions */}
          {aiResponse.intent === 'no_results_suggestion' &&
            aiResponse.suggestions?.length && (
              <div className="mt-2 space-y-1">
                <p className="font-body text-xs text-muted-foreground">
                  Try these related searches:
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {aiResponse.suggestions.map((s) => (
                    <button
                      key={s}
                      onClick={() => {
                        setInput(s)
                        performSearch(s, [], intentHint)
                      }}
                      className="rounded-full bg-surface px-3 py-1 font-body text-xs text-foreground transition-colors hover:bg-primary/20 hover:text-primary"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}
        </div>
      )}

      {/* Filter chips */}
      {hasResults && filterChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-body text-xs text-muted-foreground">
            Active filters:
          </span>
          {filterChips.map((chip) => (
            <button
              key={chip.key}
              onClick={() => removeFilter(chip.key as keyof AIFilters)}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-1 font-body text-xs text-primary transition-colors hover:bg-primary/20"
            >
              {chip.label}
              <X className="size-3" />
            </button>
          ))}
          <button
            onClick={clearAll}
            className="font-body text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Clear all
          </button>
          <div className="ml-auto flex gap-1.5">
            {user && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSaveSearch}
                className="font-body text-xs h-7"
              >
                Save search
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                const lastQuery = conversationHistory
                  .filter((m) => m.role === 'user')
                  .pop()?.content
                if (lastQuery) setInput(lastQuery)
              }}
              className="font-body text-xs h-7"
            >
              <RefreshCw className="size-3 mr-1" />
              Refine
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}

function getFilterChips(
  filters: AIFilters
): { key: string; label: string }[] {
  const chips: { key: string; label: string }[] = []

  if (filters.tier1)
    chips.push({
      key: 'tier1',
      label: filters.tier1.replace(/_/g, ' '),
    })
  if (filters.tier2)
    chips.push({
      key: 'tier2',
      label: filters.tier2.replace(/_/g, ' '),
    })
  if (filters.subcategories?.length)
    chips.push({
      key: 'subcategories',
      label: filters.subcategories
        .map((s) => s.replace(/_/g, ' '))
        .join(', '),
    })
  if (filters.manufacturer)
    chips.push({ key: 'manufacturer', label: filters.manufacturer })
  if (filters.minPrice)
    chips.push({
      key: 'minPrice',
      label: `$${filters.minPrice.toLocaleString()} min`,
    })
  if (filters.maxPrice)
    chips.push({
      key: 'maxPrice',
      label: `$${filters.maxPrice.toLocaleString()} max`,
    })
  if (filters.condition?.length)
    chips.push({
      key: 'condition',
      label: filters.condition.map((c) => c.replace(/_/g, ' ')).join(', '),
    })
  if (filters.radiusMiles)
    chips.push({
      key: 'radiusMiles',
      label: `${filters.radiusMiles} mi radius`,
    })
  if (filters.keywords)
    chips.push({ key: 'keywords', label: `"${filters.keywords}"` })

  return chips
}
