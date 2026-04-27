"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { searchModels } from "@/app/actions/registry"
import type { ManufacturerModel } from "@/lib/registry"

export interface ModelSelection {
  /** UUID when the user picks a registry suggestion; null for free-text. */
  modelId: string | null
  /** Always populated. */
  modelText: string
}

interface Props {
  value: ModelSelection
  onChange: (next: ModelSelection) => void
  /** UUID of the parent manufacturer; null disables the input with a hint. */
  manufacturerId: string | null
  placeholder?: string
  disabled?: boolean
  id?: string
  className?: string
}

export function ModelAutocomplete({
  value,
  onChange,
  manufacturerId,
  placeholder = "Model",
  disabled,
  id,
  className,
}: Props) {
  const [results, setResults] = useState<ManufacturerModel[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const query = value.modelText
  const inputDisabled = disabled || !manufacturerId

  useEffect(() => {
    if (!open || !manufacturerId) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      try {
        const out = await searchModels({
          manufacturerId,
          query: query.trim() || undefined,
          limit: 10,
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
  }, [query, manufacturerId, open])

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
    (m: ManufacturerModel) => {
      onChange({ modelId: m.id, modelText: m.name })
      setOpen(false)
    },
    [onChange],
  )

  const pickFreeText = useCallback(() => {
    if (query.trim().length === 0) return
    onChange({ modelId: null, modelText: query.trim() })
    setOpen(false)
  }, [onChange, query])

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
        value={value.modelText}
        placeholder={!manufacturerId ? "Pick a manufacturer first" : placeholder}
        disabled={inputDisabled}
        autoComplete="off"
        onChange={e => {
          onChange({ modelId: null, modelText: e.target.value })
          setOpen(true)
        }}
        onFocus={() => {
          if (manufacturerId) setOpen(true)
        }}
        onKeyDown={handleKeyDown}
        onBlur={() => {
          setTimeout(() => setOpen(false), 150)
        }}
        className={className}
      />
      {open && manufacturerId && (results.length > 0 || loading || query.trim().length > 0) && (
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
                  <span className="flex-1 truncate font-body text-sm text-foreground">{m.name}</span>
                  {m.equipmentType && (
                    <span className="font-body text-[11px] text-muted-foreground">
                      {m.equipmentType}
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
