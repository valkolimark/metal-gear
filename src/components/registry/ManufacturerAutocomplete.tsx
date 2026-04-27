"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { searchManufacturers } from "@/app/actions/registry"
import type { Manufacturer } from "@/lib/registry"

export interface ManufacturerSelection {
  /** UUID when the user picks a registry suggestion; null for free-text. */
  manufacturerId: string | null
  /** Always populated. Canonical name when registry-picked, raw input otherwise. */
  manufacturerText: string
}

interface Props {
  value: ManufacturerSelection
  onChange: (next: ManufacturerSelection) => void
  /** Bias results to manufacturers active in this equipment category (e.g. "centrifuge"). */
  equipmentType?: string
  placeholder?: string
  disabled?: boolean
  id?: string
  required?: boolean
  /** Optional className applied to the underlying Input. */
  className?: string
  /** Called when the user picks a registry suggestion (vs free-text). */
  onPickRegistry?: (manufacturer: Manufacturer) => void
}

export function ManufacturerAutocomplete({
  value,
  onChange,
  equipmentType,
  placeholder = "Manufacturer",
  disabled,
  id,
  required,
  className,
  onPickRegistry,
}: Props) {
  const [results, setResults] = useState<Manufacturer[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const query = value.manufacturerText

  // Debounced search
  useEffect(() => {
    if (!open) return
    if (query.trim().length === 0) {
      setResults([])
      return
    }
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const out = await searchManufacturers({
          query: query.trim(),
          equipmentType,
          limit: 8,
        })
        setResults(out)
        setActiveIndex(0)
      } finally {
        setLoading(false)
      }
    }, 200)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, equipmentType, open])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handler(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [open])

  const pickRegistry = useCallback(
    (m: Manufacturer) => {
      onChange({ manufacturerId: m.id, manufacturerText: m.name })
      onPickRegistry?.(m)
      setOpen(false)
    },
    [onChange, onPickRegistry],
  )

  const pickFreeText = useCallback(() => {
    // Keep typed value as-is; clear any registry FK.
    if (query.trim().length === 0) return
    onChange({ manufacturerId: null, manufacturerText: query.trim() })
    setOpen(false)
  }, [onChange, query])

  // Total selectable items = results.length + 1 (free-text fallback)
  const totalItems = results.length + (query.trim().length > 0 ? 1 : 0)
  const freeTextIndex = results.length

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter") {
        setOpen(true)
      }
      return
    }
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex(i => (totalItems === 0 ? 0 : (i + 1) % totalItems))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex(i => (totalItems === 0 ? 0 : (i - 1 + totalItems) % totalItems))
    } else if (e.key === "Enter") {
      if (totalItems === 0) return
      e.preventDefault()
      if (activeIndex < results.length) {
        pickRegistry(results[activeIndex])
      } else {
        pickFreeText()
      }
    } else if (e.key === "Escape") {
      e.preventDefault()
      setOpen(false)
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={id}
        type="text"
        value={value.manufacturerText}
        placeholder={placeholder}
        disabled={disabled}
        required={required}
        autoComplete="off"
        onChange={e => {
          // Typing clears any registry FK — user is editing free-text.
          onChange({ manufacturerId: null, manufacturerText: e.target.value })
          setOpen(true)
        }}
        onFocus={() => {
          if (value.manufacturerText.trim().length > 0) setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          // Defer close so onMouseDown on dropdown items has time to fire.
          setTimeout(() => setOpen(false), 150)
        }}
        className={className}
      />
      {open && (results.length > 0 || loading || query.trim().length > 0) && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 max-h-72 overflow-y-auto rounded-lg border border-border bg-card shadow-lg">
          {loading && results.length === 0 ? (
            <div className="space-y-2 p-2">
              {[0, 1].map(i => (
                <Skeleton key={i} className="h-6 w-full" />
              ))}
            </div>
          ) : (
            <div className="py-1">
              {results.map((m, i) => (
                <button
                  key={m.id}
                  type="button"
                  onMouseDown={e => {
                    e.preventDefault()
                    pickRegistry(m)
                  }}
                  onMouseEnter={() => setActiveIndex(i)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/50 ${
                    i === activeIndex ? "bg-muted/50" : ""
                  }`}
                >
                  <span
                    className={`flex-1 truncate font-body text-sm text-foreground ${
                      m.tier === 1 ? "font-medium" : ""
                    }`}
                  >
                    {m.name}
                  </span>
                  {m.country && (
                    <span className="font-body text-[11px] text-muted-foreground">
                      {m.country}
                    </span>
                  )}
                </button>
              ))}
              {query.trim().length > 0 && (
                <button
                  type="button"
                  onMouseDown={e => {
                    e.preventDefault()
                    pickFreeText()
                  }}
                  onMouseEnter={() => setActiveIndex(freeTextIndex)}
                  className={`flex w-full items-center gap-2 border-t border-border px-3 py-2 text-left transition-colors hover:bg-muted/50 ${
                    activeIndex === freeTextIndex ? "bg-muted/50" : ""
                  }`}
                >
                  <span className="flex-1 truncate font-body text-sm text-muted-foreground">
                    Use &ldquo;{query.trim()}&rdquo; as-is
                  </span>
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
