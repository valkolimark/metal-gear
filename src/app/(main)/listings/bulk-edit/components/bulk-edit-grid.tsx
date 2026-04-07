'use client'

import { useState, useMemo, useCallback, useEffect, useRef } from 'react'
import Link from 'next/link'
import {
  Search,
  Package,
  X as XIcon,
  Plus,
  AlertTriangle,
  Loader2,
  Check,
  X,
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { LISTING_CONDITIONS, EQUIPMENT_CATEGORIES } from '@/lib/constants'
import { saveListingCell } from '@/app/actions/bulk-edit-cell'
import { EditableCell, type SaveState } from './editable-cell'

export interface ListingRow {
  id: string
  title: string
  price_cents: number | null
  status: string
  condition: string
  category: string
  location_city: string
  location_state: string
  quantity: number | null
  sku: string | null
  description: string
  thumbnail: string | null
}

interface BulkEditGridProps {
  initialRows: ListingRow[]
  totalCount: number
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'draft', label: 'Draft' },
  { value: 'archived', label: 'Archived' },
]

export function BulkEditGrid({ initialRows, totalCount }: BulkEditGridProps) {
  const [rows, setRows] = useState<Record<string, ListingRow>>(() => {
    const map: Record<string, ListingRow> = {}
    for (const r of initialRows) map[r.id] = r
    return map
  })
  const [saveStates, setSaveStates] = useState<Record<string, SaveState>>({})
  const [errors, setErrors] = useState<Record<string, string>>({})
  const savingRef = useRef(false)

  // Filters
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [filterCondition, setFilterCondition] = useState('all')
  const [filterCategory, setFilterCategory] = useState('all')

  const allRowIds = useMemo(() => initialRows.map((r) => r.id), [initialRows])

  const filteredIds = useMemo(() => {
    const q = search.toLowerCase().trim()
    return allRowIds.filter((id) => {
      const r = rows[id]
      if (!r) return false
      if (q && !r.title.toLowerCase().includes(q)) return false
      if (filterStatus !== 'all' && r.status !== filterStatus) return false
      if (filterCondition !== 'all' && r.condition !== filterCondition) return false
      if (filterCategory !== 'all' && r.category !== filterCategory) return false
      return true
    })
  }, [allRowIds, rows, search, filterStatus, filterCondition, filterCategory])

  const hasFilters = search || filterStatus !== 'all' || filterCondition !== 'all' || filterCategory !== 'all'

  // Track in-flight saves for beforeunload
  useEffect(() => {
    savingRef.current = Object.values(saveStates).some((s) => s === 'saving')
  }, [saveStates])

  useEffect(() => {
    function onBeforeUnload(e: BeforeUnloadEvent) {
      if (savingRef.current) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [])

  const handleCellSave = useCallback(
    async (listingId: string, field: string, value: string | number | null) => {
      const key = `${listingId}.${field}`

      // Optimistic update
      setRows((prev) => ({
        ...prev,
        [listingId]: { ...prev[listingId], [field]: value },
      }))
      setSaveStates((prev) => ({ ...prev, [key]: 'saving' }))
      setErrors((prev) => {
        const next = { ...prev }
        delete next[key]
        return next
      })

      const result = await saveListingCell({ listingId, field, value })

      if (result.success) {
        setSaveStates((prev) => ({ ...prev, [key]: 'saved' }))
        setTimeout(() => {
          setSaveStates((prev) => ({ ...prev, [key]: 'idle' }))
        }, 2000)
      } else {
        setSaveStates((prev) => ({ ...prev, [key]: 'error' }))
        setErrors((prev) => ({ ...prev, [key]: result.error || 'Save failed' }))
      }
    },
    []
  )

  // Select auto-save
  const handleSelectSave = useCallback(
    (listingId: string, field: string, value: string) => {
      setRows((prev) => ({
        ...prev,
        [listingId]: { ...prev[listingId], [field]: value },
      }))
      handleCellSave(listingId, field, value)
    },
    [handleCellSave]
  )

  function clearFilters() {
    setSearch('')
    setFilterStatus('all')
    setFilterCondition('all')
    setFilterCategory('all')
  }

  if (initialRows.length === 0) {
    return (
      <div className="flex flex-col items-center gap-4 py-20">
        <Package className="size-12 text-muted-foreground" />
        <p className="font-display text-lg font-semibold text-foreground">
          No listings to edit
        </p>
        <Button asChild className="font-body">
          <Link href="/listings/create">
            <Plus className="mr-2 size-4" />
            Post a Listing
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col">
      {totalCount >= 200 && (
        <div className="flex items-center gap-2 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2">
          <AlertTriangle className="size-4 shrink-0 text-amber-500" />
          <p className="font-body text-sm text-amber-600 dark:text-amber-400">
            Showing your 200 most recent listings. Use filters to find specific ones.
          </p>
        </div>
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
        <div className="relative w-56">
          <Search className="absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search listings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 font-body text-sm"
          />
        </div>
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-32 font-body text-sm">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-body">All Status</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value} className="font-body">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCondition} onValueChange={setFilterCondition}>
          <SelectTrigger className="w-32 font-body text-sm">
            <SelectValue placeholder="Condition" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-body">All Condition</SelectItem>
            {LISTING_CONDITIONS.map((c) => (
              <SelectItem key={c.value} value={c.value} className="font-body">
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-44 font-body text-sm">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all" className="font-body">All Categories</SelectItem>
            {EQUIPMENT_CATEGORIES.map((c) => (
              <SelectItem key={c} value={c} className="font-body">
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1 font-body text-xs text-muted-foreground hover:text-foreground"
          >
            <XIcon className="size-3" />
            Clear filters
          </button>
        )}
        <span className="ml-auto font-body text-sm text-muted-foreground">
          {filteredIds.length} listing{filteredIds.length !== 1 ? 's' : ''} shown
        </span>
      </div>

      {/* Spreadsheet */}
      <div className="flex-1 overflow-auto">
        <table className="w-max min-w-full border-collapse">
          <thead className="sticky top-0 z-20">
            <tr className="bg-muted text-xs font-bold uppercase tracking-wide text-muted-foreground">
              <th className="sticky left-0 z-30 w-[72px] border-b border-r border-border bg-muted px-2 py-2 text-left">
                Img
              </th>
              <th className="sticky left-[72px] z-30 w-[240px] border-b border-r border-border bg-muted px-2 py-2 text-left">
                Title
              </th>
              <th className="w-[120px] border-b border-r border-border px-2 py-2 text-left">
                Price
              </th>
              <th className="w-[140px] border-b border-r border-border px-2 py-2 text-left">
                Status
              </th>
              <th className="w-[130px] border-b border-r border-border px-2 py-2 text-left">
                Condition
              </th>
              <th className="w-[220px] border-b border-r border-border px-2 py-2 text-left">
                Category
              </th>
              <th className="w-[130px] border-b border-r border-border px-2 py-2 text-left">
                City
              </th>
              <th className="w-[90px] border-b border-r border-border px-2 py-2 text-left">
                State
              </th>
              <th className="w-[90px] border-b border-r border-border px-2 py-2 text-left">
                Qty
              </th>
              <th className="w-[130px] border-b border-r border-border px-2 py-2 text-left">
                SKU
              </th>
              <th className="w-[280px] border-b border-border px-2 py-2 text-left">
                Description
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredIds.map((id) => {
              const row = rows[id]
              if (!row) return null
              return (
                <tr key={id} className="group border-b border-border hover:bg-muted/30">
                  {/* Thumbnail — sticky, view-only */}
                  <td className="sticky left-0 z-10 h-14 w-[72px] border-r border-border bg-card group-hover:bg-muted/30">
                    <Link
                      href={`/listings/${id}`}
                      target="_blank"
                      className="flex h-full items-center justify-center"
                    >
                      {row.thumbnail ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={row.thumbnail}
                          alt=""
                          className="size-10 rounded object-cover"
                        />
                      ) : (
                        <div className="flex size-10 items-center justify-center rounded bg-muted">
                          <Package className="size-5 text-muted-foreground/40" />
                        </div>
                      )}
                    </Link>
                  </td>

                  {/* Title — sticky */}
                  <td className="sticky left-[72px] z-10 w-[240px] bg-card group-hover:bg-muted/30 p-0">
                    <EditableCell
                      listingId={id}
                      field="title"
                      value={row.title}
                      saveState={saveStates[`${id}.title`] || 'idle'}
                      errorMsg={errors[`${id}.title`]}
                      onSave={handleCellSave}
                    />
                  </td>

                  {/* Price */}
                  <td className="w-[120px] p-0">
                    <EditableCell
                      listingId={id}
                      field="price_cents"
                      value={row.price_cents}
                      saveState={saveStates[`${id}.price_cents`] || 'idle'}
                      errorMsg={errors[`${id}.price_cents`]}
                      onSave={handleCellSave}
                      type="number"
                      prefix="$"
                      displayDivisor={100}
                      min={0}
                      step={1}
                      placeholder="—"
                    />
                  </td>

                  {/* Status */}
                  <td className="w-[140px] p-0">
                    <SelectCell
                      id={id}
                      field="status"
                      value={row.status}
                      options={STATUS_OPTIONS}
                      saveState={saveStates[`${id}.status`] || 'idle'}
                      error={errors[`${id}.status`]}
                      onSave={handleSelectSave}
                    />
                  </td>

                  {/* Condition */}
                  <td className="w-[130px] p-0">
                    <SelectCell
                      id={id}
                      field="condition"
                      value={row.condition}
                      options={LISTING_CONDITIONS.map((c) => ({ value: c.value, label: c.label }))}
                      saveState={saveStates[`${id}.condition`] || 'idle'}
                      error={errors[`${id}.condition`]}
                      onSave={handleSelectSave}
                    />
                  </td>

                  {/* Category */}
                  <td className="w-[220px] p-0">
                    <SelectCell
                      id={id}
                      field="category"
                      value={row.category}
                      options={EQUIPMENT_CATEGORIES.map((c) => ({ value: c, label: c }))}
                      saveState={saveStates[`${id}.category`] || 'idle'}
                      error={errors[`${id}.category`]}
                      onSave={handleSelectSave}
                    />
                  </td>

                  {/* City */}
                  <td className="w-[130px] p-0">
                    <EditableCell
                      listingId={id}
                      field="location_city"
                      value={row.location_city}
                      saveState={saveStates[`${id}.location_city`] || 'idle'}
                      errorMsg={errors[`${id}.location_city`]}
                      onSave={handleCellSave}
                      placeholder="City"
                    />
                  </td>

                  {/* State */}
                  <td className="w-[90px] p-0">
                    <EditableCell
                      listingId={id}
                      field="location_state"
                      value={row.location_state}
                      saveState={saveStates[`${id}.location_state`] || 'idle'}
                      errorMsg={errors[`${id}.location_state`]}
                      onSave={handleCellSave}
                      placeholder="ST"
                    />
                  </td>

                  {/* Quantity */}
                  <td className="w-[90px] p-0">
                    <EditableCell
                      listingId={id}
                      field="quantity"
                      value={row.quantity}
                      saveState={saveStates[`${id}.quantity`] || 'idle'}
                      errorMsg={errors[`${id}.quantity`]}
                      onSave={handleCellSave}
                      type="number"
                      min={0}
                      step={1}
                      placeholder="—"
                    />
                  </td>

                  {/* SKU */}
                  <td className="w-[130px] p-0">
                    <EditableCell
                      listingId={id}
                      field="sku"
                      value={row.sku}
                      saveState={saveStates[`${id}.sku`] || 'idle'}
                      errorMsg={errors[`${id}.sku`]}
                      onSave={handleCellSave}
                      placeholder="—"
                    />
                  </td>

                  {/* Description */}
                  <td className="w-[280px] p-0">
                    <DescriptionCell
                      listingId={id}
                      value={row.description}
                      saveState={saveStates[`${id}.description`] || 'idle'}
                      errorMsg={errors[`${id}.description`]}
                      onSave={handleCellSave}
                    />
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {filteredIds.length === 0 && (
          <div className="flex flex-col items-center gap-2 py-16">
            <p className="font-body text-sm text-muted-foreground">
              No listings match your filters
            </p>
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="font-body text-sm text-primary hover:underline"
              >
                Clear filters
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

function SelectCell({
  id,
  field,
  value,
  options,
  saveState,
  error,
  onSave,
}: {
  id: string
  field: string
  value: string
  options: { value: string; label: string }[]
  saveState: SaveState
  error?: string
  onSave: (id: string, field: string, value: string) => void
}) {
  return (
    <div
      data-cell={field}
      className="relative flex h-14 items-center border-r border-border px-1"
    >
      <select
        value={value}
        onChange={(e) => onSave(id, field, e.target.value)}
        className="h-8 w-full rounded border border-border bg-transparent px-1.5 font-body text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      {saveState !== 'idle' && (
        <div className="absolute right-1.5 top-1 z-10">
          {saveState === 'saving' && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          )}
          {saveState === 'saved' && <Check className="size-3.5 text-green-500" />}
          {saveState === 'error' && (
            <span title={error || 'Save failed'}>
              <X className="size-3.5 text-destructive" />
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function DescriptionCell({
  listingId,
  value,
  saveState,
  errorMsg,
  onSave,
}: {
  listingId: string
  value: string
  saveState: SaveState
  errorMsg?: string
  onSave: (listingId: string, field: string, value: string | number | null) => Promise<void>
}) {
  const [localValue, setLocalValue] = useState(value)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    setLocalValue(value)
  }, [value])

  function handleClose() {
    if (localValue !== value) {
      onSave(listingId, 'description', localValue)
    }
    setOpen(false)
  }

  const preview =
    value.length > 60 ? value.slice(0, 60) + '…' : value || '—'

  return (
    <div
      data-cell="description"
      className="relative h-14 border-r border-border"
    >
      <Popover open={open} onOpenChange={(v) => { if (!v) handleClose(); else setOpen(true) }}>
        <PopoverTrigger asChild>
          <button
            className="flex h-full w-full items-center px-2 text-left font-body text-sm text-muted-foreground hover:text-foreground"
            onClick={() => setOpen(true)}
          >
            <span className="line-clamp-2">{preview}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          side="bottom"
          align="start"
          className="w-80 p-2"
          onEscapeKeyDown={() => {
            setLocalValue(value)
            setOpen(false)
          }}
        >
          <textarea
            rows={6}
            value={localValue}
            onChange={(e) => setLocalValue(e.target.value)}
            maxLength={5000}
            className="w-full resize-none rounded border border-border bg-transparent p-2 font-body text-sm text-foreground outline-none focus:ring-2 focus:ring-primary"
            autoFocus
          />
          <div className="mt-1 flex items-center justify-between">
            <span className="font-body text-xs text-muted-foreground">
              {localValue.length}/5000
            </span>
          </div>
        </PopoverContent>
      </Popover>

      {saveState !== 'idle' && (
        <div className="absolute right-1 top-1 z-10">
          {saveState === 'saving' && (
            <Loader2 className="size-3.5 animate-spin text-muted-foreground" />
          )}
          {saveState === 'saved' && <Check className="size-3.5 text-green-500" />}
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
