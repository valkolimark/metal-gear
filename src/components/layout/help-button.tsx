'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import { MessageCircle, X, Send, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

interface Message {
  role: 'user' | 'ai'
  content: string
}

const STARTER_QUESTIONS = [
  'How does SOS work?',
  "What's included in Pro?",
  'How do I make an offer?',
  'Is my transaction protected?',
]

export function HelpButton() {
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const threadRef = useRef<HTMLDivElement>(null)
  const abortRef = useRef<AbortController | null>(null)

  // Don't show on the help page itself
  if (pathname.startsWith('/help')) return null

  const handleClose = () => {
    setOpen(false)
    setMessages([])
    setInput('')
    setError(null)
    abortRef.current?.abort()
  }

  const handleSubmit = async (text?: string) => {
    const message = (text || input).trim()
    if (!message || loading) return

    setError(null)
    setInput('')
    setMessages((prev) => [...prev, { role: 'user', content: message }])
    setLoading(true)
    setMessages((prev) => [...prev, { role: 'ai', content: '' }])

    try {
      abortRef.current = new AbortController()
      const res = await fetch('/api/help/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: messages.map((m) => ({
            role: m.role === 'ai' ? 'assistant' : 'user',
            content: m.content,
          })),
          context: { pathname },
        }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) throw new Error('Failed')

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
      setMessages((prev) => prev.slice(0, -1))
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      {/* Floating help button */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-20 right-4 z-50 flex size-12 items-center justify-center rounded-full bg-[#3A8FD4] text-white shadow-lg transition-all duration-200 hover:bg-[#2a7fc4] hover:scale-110 active:scale-95 lg:bottom-6 lg:right-6"
          aria-label="Get help"
        >
          <MessageCircle className="size-5" />
        </button>
      )}

      {/* Chat panel */}
      {open && (
        <>
          {/* Backdrop on mobile */}
          <div
            className="fixed inset-0 z-40 bg-black/20 lg:hidden"
            onClick={handleClose}
          />
          <HelpPanel
            messages={messages}
            input={input}
            setInput={setInput}
            loading={loading}
            error={error}
            onSubmit={handleSubmit}
            onClose={handleClose}
            threadRef={threadRef}
          />
        </>
      )}
    </>
  )
}

function HelpPanel({
  messages,
  input,
  setInput,
  loading,
  error,
  onSubmit,
  onClose,
  threadRef,
}: {
  messages: Message[]
  input: string
  setInput: (v: string) => void
  loading: boolean
  error: string | null
  onSubmit: (text?: string) => void
  onClose: () => void
  threadRef: React.RefObject<HTMLDivElement | null>
}) {
  useEffect(() => {
    if (threadRef.current) {
      threadRef.current.scrollTop = threadRef.current.scrollHeight
    }
  }, [messages, threadRef])

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [onClose])

  return (
    <div className="fixed bottom-24 right-4 z-50 flex w-80 flex-col rounded-2xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-950 shadow-2xl lg:bottom-20 lg:right-6"
      style={{ height: '480px' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-zinc-200 dark:border-zinc-700 px-4 py-3">
        <div>
          <h3 className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
            <Settings className="size-4 text-[#3A8FD4]" />
            Metal Gear Help
          </h3>
          <p className="font-body text-[10px] text-muted-foreground">
            Ask me anything about the platform
          </p>
        </div>
        <button
          onClick={onClose}
          className="flex size-7 items-center justify-center rounded-full text-muted-foreground hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* Messages area */}
      <div ref={threadRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
        {messages.length === 0 ? (
          <div className="space-y-2">
            <p className="font-body text-xs text-muted-foreground text-center mt-4 mb-3">
              Popular questions
            </p>
            {STARTER_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => onSubmit(q)}
                className="block w-full rounded-lg border border-zinc-200 dark:border-zinc-700 px-3 py-2 text-left font-body text-sm text-foreground hover:border-[#3A8FD4] hover:text-[#3A8FD4] transition-colors"
              >
                {q}
              </button>
            ))}
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'ai' && (
                <div className="mr-1.5 mt-1 flex size-5 shrink-0 items-center justify-center rounded-full bg-[#3A8FD4]/20">
                  <Settings className="size-2.5 text-[#3A8FD4]" />
                </div>
              )}
              <div
                className={`max-w-[85%] rounded-xl px-3 py-2 font-body text-xs ${
                  msg.role === 'user'
                    ? 'bg-[#FF6B2B]/20 border border-[#FF6B2B]/30 text-foreground'
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
          ))
        )}
        {error && (
          <p className="font-body text-xs text-red-500 text-center">{error}</p>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-zinc-200 dark:border-zinc-700 p-2 flex gap-1.5">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && onSubmit()}
          placeholder="Ask anything..."
          className="flex-1 h-8 font-body text-xs focus-visible:ring-[#3A8FD4]"
          disabled={loading}
        />
        <Button
          onClick={() => onSubmit()}
          disabled={loading || !input.trim()}
          size="sm"
          className="h-8 w-8 p-0 bg-[#3A8FD4] hover:bg-[#2a7fc4] text-white"
        >
          <Send className="size-3.5" />
        </Button>
      </div>
    </div>
  )
}
