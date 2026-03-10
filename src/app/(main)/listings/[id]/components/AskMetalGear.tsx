'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { Settings, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AnonInteractionGate } from '@/components/AnonInteractionGate'
import type { Tables } from '@/types/database'
import type { User } from '@supabase/supabase-js'

type Listing = Tables<'listings'>

interface Props {
  listing: Listing
  currentUser: User | null
}

interface Message {
  role: 'user' | 'ai'
  content: string
}

const QUESTION_BANKS: Record<string, string[]> = {
  'CNC Machines': [
    'What control system does this use?',
    'How does pricing compare to market?',
    'What tooling is included?',
    'What maintenance has been done?',
  ],
  'Compressors': [
    'What CFM does this deliver?',
    'How does pricing compare to market?',
    'What power supply does it require?',
    'What condition issues should I know about?',
  ],
  'Generators': [
    'What fuel type does this use?',
    'What load capacity does it support?',
    'How does pricing compare to market?',
    'What condition issues should I know about?',
  ],
}

const DEFAULT_QUESTIONS = [
  'Is this compatible with my process?',
  'How does pricing compare to market?',
  "What's included in the sale?",
  'What condition issues should I know about?',
]

export function AskMetalGear({ listing, currentUser }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [messageCount, setMessageCount] = useState(0)
  const [gateOpen, setGateOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  const ANON_LIMIT = 3

  const questions = QUESTION_BANKS[listing.category ?? ''] || DEFAULT_QUESTIONS

  useEffect(() => {
    return () => {
      abortRef.current?.abort()
    }
  }, [])

  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages])

  const handleSubmit = useCallback(
    async (text?: string) => {
      const question = (text || input).trim()
      if (!question || loading) return

      if (!currentUser && messageCount >= ANON_LIMIT) {
        setGateOpen(true)
        return
      }

      setError(null)
      setInput('')
      setMessages((prev) => [...prev, { role: 'user', content: question }])
      setMessageCount((c) => c + 1)
      setLoading(true)

      // Add placeholder for AI response
      setMessages((prev) => [...prev, { role: 'ai', content: '' }])

      try {
        abortRef.current = new AbortController()
        const res = await fetch(`/api/listings/${listing.id}/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            question,
            history: messages.map((m) => ({
              role: m.role === 'ai' ? 'assistant' : 'user',
              content: m.content,
            })),
          }),
          signal: abortRef.current.signal,
        })

        if (!res.ok) {
          throw new Error('Failed to get response')
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error('No stream')

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const currentBuffer = buffer
          setMessages((prev) => {
            const updated = [...prev]
            updated[updated.length - 1] = { role: 'ai', content: currentBuffer }
            return updated
          })
        }
      } catch (err) {
        if (err instanceof Error && err.name === 'AbortError') return
        setError('Something went wrong. Try again.')
        setMessages((prev) => prev.slice(0, -1)) // Remove empty AI message
      } finally {
        setLoading(false)
      }
    },
    [input, loading, currentUser, messageCount, listing.id, messages]
  )

  return (
    <section>
      <div className="rounded-xl border border-zinc-200 dark:border-zinc-700/60 bg-white/90 dark:bg-zinc-900/80 overflow-hidden">
        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-700/60 px-4 py-3">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
            <Settings className="size-5 text-primary" />
            Ask Metal Gear
          </h2>
          <p className="font-body text-xs text-muted-foreground">
            Get instant answers about this listing
          </p>
        </div>

        {/* Suggested questions */}
        {messages.length === 0 && (
          <div className="flex flex-wrap gap-2 px-4 py-3 border-b border-zinc-200 dark:border-zinc-700/60">
            {questions.map((q) => (
              <button
                key={q}
                onClick={() => handleSubmit(q)}
                className="border border-zinc-300 dark:border-zinc-600 rounded-full px-4 py-1.5 font-body text-sm text-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Chat thread */}
        {messages.length > 0 && (
          <div ref={threadRef} className="max-h-96 overflow-y-auto px-4 py-3 space-y-3">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {msg.role === 'ai' && (
                  <div className="mr-2 mt-1 flex size-6 shrink-0 items-center justify-center rounded-full bg-primary/20">
                    <Settings className="size-3 text-primary" />
                  </div>
                )}
                <div
                  className={`max-w-[80%] rounded-xl px-4 py-2 font-body text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary/20 border border-primary/30 text-foreground'
                      : 'bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 text-foreground'
                  }`}
                >
                  {msg.content || (
                    <span className="flex items-center gap-1 text-muted-foreground">
                      <span className="animate-bounce">.</span>
                      <span className="animate-bounce [animation-delay:0.2s]">.</span>
                      <span className="animate-bounce [animation-delay:0.4s]">.</span>
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && (
          <p className="px-4 py-2 font-body text-xs text-red-500">{error}</p>
        )}

        {/* Input */}
        <div className="border-t border-zinc-200 dark:border-zinc-700/60 p-3 flex gap-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            placeholder="Ask a question about this listing..."
            className="flex-1 font-body text-sm focus-visible:ring-primary"
            disabled={loading}
          />
          <Button
            onClick={() => handleSubmit()}
            disabled={loading || !input.trim()}
            size="sm"
            className="bg-primary hover:bg-primary/90 text-white px-3"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>

      <AnonInteractionGate open={gateOpen} onClose={() => setGateOpen(false)} action="ask" />
    </section>
  )
}
