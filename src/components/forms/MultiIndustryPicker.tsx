'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { X, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  INDUSTRY_OPTIONS,
  OTHER_INDUSTRY_PREFIX,
} from '@/lib/constants/onboarding'
import {
  industryDisplayLabel,
  normalizeOtherIndustry,
} from '@/lib/listings/industries'

const OTHER_OPTION = 'Other'

interface MultiIndustryPickerProps {
  value: string[]
  onChange: (next: string[]) => void
  max?: number
  disabled?: boolean
  id?: string
  /** Optional label rendered as a `<legend>`. Omit when the parent already
   *  renders a `<Label>` next to the field. */
  legend?: string
  placeholder?: string
}

export function MultiIndustryPicker({
  value,
  onChange,
  max = 5,
  disabled = false,
  id,
  legend,
  placeholder = 'Select all industries this equipment serves',
}: MultiIndustryPickerProps) {
  const reactId = useId()
  const fieldsetId = id ?? `mip-${reactId}`
  const listboxId = `${fieldsetId}-listbox`
  const [query, setQuery] = useState('')
  const [otherText, setOtherText] = useState('')
  const [showOtherInput, setShowOtherInput] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const atCap = value.length >= max
  const lc = query.toLowerCase()

  const remainingOptions = useMemo(() => {
    const selectedSet = new Set(value)
    return INDUSTRY_OPTIONS.filter((opt) => {
      if (selectedSet.has(opt)) return false
      if (!lc) return true
      return opt.toLowerCase().includes(lc)
    })
  }, [value, lc])

  function addValue(next: string) {
    if (atCap || disabled) return
    if (value.includes(next)) return
    onChange([...value, next])
    setQuery('')
    inputRef.current?.focus()
  }

  function removeAt(idx: number) {
    if (disabled) return
    onChange(value.filter((_, i) => i !== idx))
  }

  function commitOther() {
    const slug = normalizeOtherIndustry(otherText)
    if (!slug) return
    if (value.includes(slug)) {
      setOtherText('')
      setShowOtherInput(false)
      return
    }
    addValue(slug)
    setOtherText('')
    setShowOtherInput(false)
  }

  function handleInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && query === '' && value.length > 0) {
      e.preventDefault()
      removeAt(value.length - 1)
      return
    }
    if (e.key === 'Enter' && remainingOptions.length > 0) {
      e.preventDefault()
      const first = remainingOptions[0]
      if (first === OTHER_OPTION) {
        setShowOtherInput(true)
      } else {
        addValue(first)
      }
    }
  }

  return (
    <fieldset
      id={fieldsetId}
      className="space-y-2"
      disabled={disabled}
      aria-describedby={atCap ? `${fieldsetId}-cap` : undefined}
    >
      {legend ? (
        <legend className="font-body text-sm font-medium text-foreground">
          {legend}
        </legend>
      ) : null}

      {/* Selected chips */}
      {value.length > 0 ? (
        <div className="flex flex-wrap gap-1.5" role="list" aria-label="Selected industries">
          {value.map((v, idx) => {
            const isOther = v.startsWith(OTHER_INDUSTRY_PREFIX)
            return (
              <Badge
                key={v}
                role="listitem"
                variant={isOther ? 'outline' : 'secondary'}
                className="gap-1 font-body text-xs"
              >
                {industryDisplayLabel(v)}
                <button
                  type="button"
                  onClick={() => removeAt(idx)}
                  aria-label={`Remove ${industryDisplayLabel(v)}`}
                  className="ml-0.5 rounded-full transition-colors hover:bg-foreground/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <X className="size-3" />
                </button>
              </Badge>
            )
          })}
        </div>
      ) : null}

      {/* Combobox input + dropdown */}
      {!atCap ? (
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            role="combobox"
            aria-expanded={remainingOptions.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
            placeholder={value.length === 0 ? placeholder : 'Add another…'}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleInputKeyDown}
            className="font-body"
          />
          {(query !== '' || value.length === 0) && remainingOptions.length > 0 ? (
            <ul
              id={listboxId}
              role="listbox"
              className="mt-1 max-h-56 overflow-y-auto rounded-md border border-border bg-popover p-1 shadow-md"
            >
              {remainingOptions.map((opt) => (
                <li key={opt}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    onClick={() => {
                      if (opt === OTHER_OPTION) {
                        setShowOtherInput(true)
                        setQuery('')
                      } else {
                        addValue(opt)
                      }
                    }}
                    onMouseDown={(e) => {
                      // Prevent Input blur eating the click on mobile
                      e.preventDefault()
                    }}
                    className="flex w-full items-center justify-between rounded-sm px-2 py-1.5 text-left font-body text-sm text-foreground hover:bg-accent hover:text-accent-foreground focus:outline-none focus:bg-accent"
                  >
                    <span>{opt}</span>
                    <Plus className="size-3.5 text-muted-foreground" />
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ) : (
        <p
          id={`${fieldsetId}-cap`}
          className="font-body text-xs text-muted-foreground"
        >
          Maximum {max} industries selected.
        </p>
      )}

      {/* Other free-text input */}
      {showOtherInput ? (
        <div className="flex flex-col gap-2 rounded-md border border-dashed border-border bg-muted/40 p-2 sm:flex-row sm:items-center">
          <Input
            type="text"
            value={otherText}
            onChange={(e) => setOtherText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                commitOther()
              } else if (e.key === 'Escape') {
                e.preventDefault()
                setOtherText('')
                setShowOtherInput(false)
              }
            }}
            placeholder="Type your industry…"
            maxLength={40}
            className="font-body text-sm"
            aria-label="Other industry"
            autoFocus
          />
          <div className="flex gap-2">
            <Button
              type="button"
              size="sm"
              onClick={commitOther}
              disabled={!normalizeOtherIndustry(otherText)}
              className="font-body"
            >
              Add
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                setOtherText('')
                setShowOtherInput(false)
              }}
              className="font-body"
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : null}
    </fieldset>
  )
}
