'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

interface MentionResult {
  id: string
  display_name: string
  avatar_url: string | null
  type: 'user' | 'company'
  slug: string | null
}

interface MentionAutocompleteProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>
  value: string
  onSelect: (params: {
    newValue: string
    mention: { id: string; type: 'user' | 'company'; displayName: string }
  }) => void
}

export function MentionAutocomplete({ textareaRef, value, onSelect }: MentionAutocompleteProps) {
  const [results, setResults] = useState<MentionResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const [atIndex, setAtIndex] = useState(-1)
  const [query, setQuery] = useState('')
  const dropdownRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null)

  // Detect active mention query
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return

    const cursorPos = textarea.selectionStart
    // Walk backwards from cursor to find @
    let foundAt = -1
    for (let i = cursorPos - 1; i >= 0; i--) {
      const ch = value[i]
      if (ch === '@') {
        // Make sure @ is at start of string or preceded by whitespace
        if (i === 0 || /\s/.test(value[i - 1])) {
          foundAt = i
        }
        break
      }
      if (/\s/.test(ch)) break
    }

    if (foundAt >= 0) {
      const q = value.slice(foundAt + 1, cursorPos)
      setAtIndex(foundAt)
      setQuery(q)
      if (q.length >= 1) {
        setIsVisible(true)
      } else {
        setIsVisible(false)
        setResults([])
      }
    } else {
      setIsVisible(false)
      setResults([])
      setAtIndex(-1)
      setQuery('')
    }
  }, [value, textareaRef])

  // Debounced fetch
  useEffect(() => {
    if (!isVisible || query.length < 1) return

    if (debounceRef.current) clearTimeout(debounceRef.current)

    debounceRef.current = setTimeout(async () => {
      setIsLoading(true)
      try {
        const res = await fetch(`/api/feed/mentions-search?q=${encodeURIComponent(query)}&limit=8`)
        if (res.ok) {
          const data = await res.json()
          setResults(data.results ?? [])
          setActiveIndex(0)
        }
      } catch {
        // Silent fail
      } finally {
        setIsLoading(false)
      }
    }, 200)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, isVisible])

  const handleSelect = useCallback(
    (result: MentionResult) => {
      const before = value.slice(0, atIndex)
      const after = value.slice(atIndex + 1 + query.length)
      const newValue = `${before}@${result.display_name} ${after}`
      onSelect({
        newValue,
        mention: {
          id: result.id,
          type: result.type,
          displayName: result.display_name,
        },
      })
      setIsVisible(false)
      setResults([])
    },
    [value, atIndex, query, onSelect]
  )

  // Keyboard handler — attach to textarea
  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea || !isVisible) return

    const handler = (e: KeyboardEvent) => {
      if (!isVisible || results.length === 0) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => (prev + 1) % results.length)
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => (prev - 1 + results.length) % results.length)
      } else if (e.key === 'Enter' || e.key === 'Tab') {
        if (results[activeIndex]) {
          e.preventDefault()
          handleSelect(results[activeIndex])
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        setIsVisible(false)
      }
    }

    textarea.addEventListener('keydown', handler)
    return () => textarea.removeEventListener('keydown', handler)
  }, [textareaRef, isVisible, results, activeIndex, handleSelect])

  if (!isVisible) return null

  return (
    <div
      ref={dropdownRef}
      className="absolute bottom-full left-0 z-50 mb-1 w-full max-h-60 overflow-y-auto rounded-lg border border-border bg-card shadow-lg"
    >
      {isLoading && results.length === 0 ? (
        <div className="space-y-2 p-2">
          {[0, 1].map((i) => (
            <div key={i} className="flex items-center gap-2 px-2 py-1">
              <Skeleton className="size-6 rounded-full" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      ) : results.length === 0 ? (
        <div className="p-3 text-center">
          <p className="font-body text-xs text-muted-foreground">No results</p>
        </div>
      ) : (
        <div className="py-1">
          {results.map((result, i) => (
            <button
              key={result.id}
              type="button"
              className={`flex w-full items-center gap-2 px-3 py-1.5 text-left hover:bg-muted/50 ${
                i === activeIndex ? 'bg-muted/50' : ''
              }`}
              onMouseDown={(e) => {
                e.preventDefault() // Prevent textarea blur
                handleSelect(result)
              }}
              onMouseEnter={() => setActiveIndex(i)}
            >
              <Avatar className="size-6">
                {result.avatar_url ? (
                  <AvatarImage src={result.avatar_url} alt={result.display_name} />
                ) : null}
                <AvatarFallback className="font-display text-[10px]">
                  {result.display_name[0]?.toUpperCase() ?? '?'}
                </AvatarFallback>
              </Avatar>
              <span className="flex-1 truncate font-body text-xs text-foreground">
                {result.display_name}
              </span>
              {result.type === 'company' && (
                <Badge variant="secondary" className="font-body text-[10px] px-1 py-0">
                  Co.
                </Badge>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
