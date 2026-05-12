'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

export function AppHeaderSearch() {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [value, setValue] = useState('')

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        inputRef.current?.focus()
        inputRef.current?.select()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = value.trim()
    if (trimmed.length === 0) return
    router.push(`/search?q=${encodeURIComponent(trimmed)}`)
  }

  return (
    <form
      onSubmit={onSubmit}
      className="hidden flex-1 md:flex md:max-w-md"
      role="search"
      data-nav-event="search:submitted"
    >
      <label htmlFor="app-global-search" className="sr-only">
        Search Metal Gear
      </label>
      <div className="relative w-full">
        <Search
          aria-hidden="true"
          className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        />
        <input
          ref={inputRef}
          id="app-global-search"
          type="search"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              setValue('')
              inputRef.current?.blur()
            }
          }}
          placeholder="Search equipment, companies, SOS… (⌘K)"
          className="h-9 w-full rounded-lg border border-transparent bg-muted/50 pl-9 pr-3 text-sm focus:border-border focus:bg-background focus:outline-none focus:ring-2 focus:ring-ring"
          aria-label="Search Metal Gear"
        />
      </div>
    </form>
  )
}
