'use client'

import { useState } from 'react'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { SlidersHorizontal, X } from 'lucide-react'
import {
  EQUIPMENT_CATEGORIES,
  INDUSTRIES,
  LISTING_CONDITIONS,
} from '@/lib/constants'

interface MobileFilterSheetProps {
  category: string
  industry: string
  condition: string
  priceMin: string
  priceMax: string
  radius: string
  activeFilterCount: number
  resultCount: number
  onUpdateParams: (params: Record<string, string>) => void
  onClearFilters: () => void
}

export function MobileFilterSheet({
  category,
  industry,
  condition,
  priceMin,
  priceMax,
  radius,
  activeFilterCount,
  resultCount,
  onUpdateParams,
  onClearFilters,
}: MobileFilterSheetProps) {
  const [open, setOpen] = useState(false)

  return (
    <>
      {/* Trigger bar */}
      <div className="flex items-center gap-2 lg:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="relative font-body"
        >
          <SlidersHorizontal className="mr-1.5 size-3.5" />
          Filters
          {activeFilterCount > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
              {activeFilterCount}
            </span>
          )}
        </Button>
        <span className="ml-auto font-body text-sm text-muted-foreground">
          {resultCount} result{resultCount !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Bottom sheet */}
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="bottom" className="flex h-[85vh] flex-col rounded-t-2xl">
          <SheetHeader className="flex flex-row items-center justify-between border-b pb-3">
            <SheetTitle className="font-display">Filters</SheetTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                onClearFilters()
              }}
              className="font-body text-muted-foreground"
            >
              Clear all
            </Button>
          </SheetHeader>

          {/* Scrollable filter content */}
          <div className="flex-1 space-y-5 overflow-y-auto py-4">
            {/* Category */}
            <div className="space-y-2">
              <p className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Category
              </p>
              <Select
                value={category || 'all'}
                onValueChange={(v) =>
                  onUpdateParams({ category: v === 'all' ? '' : v })
                }
              >
                <SelectTrigger className="font-body text-sm">
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-body">
                    All categories
                  </SelectItem>
                  {EQUIPMENT_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="font-body text-sm">
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Industry */}
            <div className="space-y-2">
              <p className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Industry
              </p>
              <Select
                value={industry || 'all'}
                onValueChange={(v) =>
                  onUpdateParams({ industry: v === 'all' ? '' : v })
                }
              >
                <SelectTrigger className="font-body text-sm">
                  <SelectValue placeholder="All industries" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all" className="font-body">
                    All industries
                  </SelectItem>
                  {INDUSTRIES.map((ind) => (
                    <SelectItem key={ind} value={ind} className="font-body text-sm">
                      {ind}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Condition */}
            <div className="space-y-2">
              <p className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Condition
              </p>
              <div className="flex flex-wrap gap-1.5">
                {LISTING_CONDITIONS.map((c) => {
                  const active = condition.split(',').includes(c.value)
                  return (
                    <button
                      key={c.value}
                      onClick={() => {
                        const current = condition ? condition.split(',') : []
                        const next = active
                          ? current.filter((x) => x !== c.value)
                          : [...current, c.value]
                        onUpdateParams({ condition: next.join(',') })
                      }}
                      className={`rounded-full px-3 py-1 font-body text-xs transition-colors ${
                        active
                          ? 'bg-primary text-white'
                          : 'bg-surface text-muted-foreground hover:text-foreground'
                      }`}
                    >
                      {c.label}
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Price Range */}
            <div className="space-y-2">
              <p className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Price Range
              </p>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  placeholder="Min"
                  value={priceMin}
                  onChange={(e) => onUpdateParams({ priceMin: e.target.value })}
                  className="font-body text-sm"
                />
                <span className="text-muted-foreground">-</span>
                <Input
                  type="number"
                  placeholder="Max"
                  value={priceMax}
                  onChange={(e) => onUpdateParams({ priceMax: e.target.value })}
                  className="font-body text-sm"
                />
              </div>
            </div>

            {/* Radius */}
            <div className="space-y-2">
              <p className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Distance from Houston
              </p>
              <Select
                value={radius || 'any'}
                onValueChange={(v) =>
                  onUpdateParams({ radius: v === 'any' ? '' : v })
                }
              >
                <SelectTrigger className="font-body text-sm">
                  <SelectValue placeholder="Any distance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any" className="font-body">Any distance</SelectItem>
                  <SelectItem value="25" className="font-body">Within 25 miles</SelectItem>
                  <SelectItem value="50" className="font-body">Within 50 miles</SelectItem>
                  <SelectItem value="100" className="font-body">Within 100 miles</SelectItem>
                  <SelectItem value="250" className="font-body">Within 250 miles</SelectItem>
                  <SelectItem value="500" className="font-body">Within 500 miles</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Sticky apply button */}
          <div className="border-t pt-4 pb-safe">
            <Button
              className="w-full font-body"
              onClick={() => setOpen(false)}
            >
              Show {resultCount} Result{resultCount !== 1 ? 's' : ''}
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </>
  )
}
