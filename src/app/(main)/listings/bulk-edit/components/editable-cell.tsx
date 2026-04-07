'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Loader2, Check, X } from 'lucide-react'
import { cn } from '@/lib/utils'

export type SaveState = 'idle' | 'saving' | 'saved' | 'error'

interface EditableCellProps {
  listingId: string
  field: string
  value: string | number | null
  saveState: SaveState
  errorMsg?: string
  onSave: (listingId: string, field: string, value: string | number | null) => Promise<void>
  className?: string
  type?: 'text' | 'number'
  placeholder?: string
  prefix?: string
  displayDivisor?: number
  min?: number
  step?: number
}

export function EditableCell({
  listingId,
  field,
  value,
  saveState,
  errorMsg,
  onSave,
  className,
  type = 'text',
  placeholder = '',
  prefix,
  displayDivisor,
  min,
  step,
}: EditableCellProps) {
  const externalDisplay = useMemo(() => {
    const dv = displayDivisor && value != null ? Math.round((value as number) / displayDivisor) : value
    return dv != null ? String(dv) : ''
  }, [value, displayDivisor])

  const [localValue, setLocalValue] = useState(externalDisplay)
  const [isEditing, setIsEditing] = useState(false)

  // Sync from parent when not actively editing
  const prevExternal = usePrevious(externalDisplay)
  if (externalDisplay !== prevExternal && !isEditing) {
    setLocalValue(externalDisplay)
  }

  const commit = useCallback(() => {
    setIsEditing(false)
    if (localValue === externalDisplay) return
    let saveVal: string | number | null = localValue
    if (type === 'number') {
      if (localValue === '') {
        saveVal = null
      } else {
        const num = parseInt(localValue, 10)
        saveVal = displayDivisor ? num * displayDivisor : num
      }
    }
    onSave(listingId, field, saveVal)
  }, [localValue, externalDisplay, type, displayDivisor, onSave, listingId, field])

  const revert = useCallback(() => {
    setLocalValue(externalDisplay)
    setIsEditing(false)
  }, [externalDisplay])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      commit()
      const target = e.currentTarget as HTMLElement
      const cell = target.closest('[data-cell]')
      if (cell) {
        const row = cell.closest('tr')
        const nextRow = row?.nextElementSibling
        if (nextRow) {
          const nextCell = nextRow.querySelector(`[data-cell="${field}"]`)
          const input = nextCell?.querySelector('input') as HTMLElement
          input?.focus()
        }
      }
    }
    if (e.key === 'Escape') {
      revert()
      ;(e.currentTarget as HTMLElement).blur()
    }
    if (e.key === 'Tab') {
      commit()
    }
  }

  return (
    <div
      data-cell={field}
      className={cn(
        'relative h-14 border-r border-border',
        saveState === 'error' && 'ring-2 ring-inset ring-destructive',
        className
      )}
    >
      <div className="flex h-full items-center">
        {prefix && (
          <span className="pl-2 font-body text-sm text-muted-foreground">{prefix}</span>
        )}
        <input
          type={type}
          value={localValue}
          onChange={(e) => {
            setLocalValue(e.target.value)
            setIsEditing(true)
          }}
          onBlur={commit}
          onKeyDown={handleKeyDown}
          onFocus={() => setIsEditing(true)}
          placeholder={placeholder}
          min={min}
          step={step}
          className={cn(
            'h-full w-full border-none bg-transparent py-1 font-body text-sm text-foreground outline-none focus:ring-2 focus:ring-inset focus:ring-primary',
            prefix ? 'px-1' : 'px-2',
            type === 'number' && '[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none'
          )}
        />
      </div>

      {saveState !== 'idle' && (
        <div className="absolute right-1 top-1 z-10">
          {saveState === 'saving' && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          )}
          {saveState === 'saved' && (
            <Check className="size-3.5 text-green-500" />
          )}
          {saveState === 'error' && (
            <span title={errorMsg || 'Save failed'}>
              <X className="size-3.5 text-destructive" />
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function usePrevious<T>(value: T): T {
  const [prev, setPrev] = useState(value)
  const [current, setCurrent] = useState(value)
  if (value !== current) {
    setPrev(current)
    setCurrent(value)
  }
  return prev
}
