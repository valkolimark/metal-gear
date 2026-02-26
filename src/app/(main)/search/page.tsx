'use client'

import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Sidebar } from '@/components/layout/sidebar'
import { PageLayout } from '@/components/layout/page-layout'

function SearchFiltersPlaceholder() {
  return (
    <div className="flex flex-col gap-4">
      <p className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        Filters
      </p>
      <div className="space-y-3">
        {['Category', 'Industry', 'Condition', 'Price Range', 'Distance'].map(
          (filter) => (
            <div
              key={filter}
              className="rounded-lg border border-border bg-card p-3"
            >
              <p className="font-body text-sm text-muted-foreground">
                {filter}
              </p>
            </div>
          )
        )}
      </div>
    </div>
  )
}

export default function SearchPage() {
  const [filtersOpen, setFiltersOpen] = useState(true)

  return (
    <PageLayout
      sidebarOpen={filtersOpen}
      sidebar={
        <Sidebar
          open={filtersOpen}
          onClose={() => setFiltersOpen(false)}
          title="Filters"
        >
          <SearchFiltersPlaceholder />
        </Sidebar>
      }
    >
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="font-display text-3xl font-bold text-foreground">
            Search Equipment
          </h1>
          {!filtersOpen && (
            <Button
              variant="outline"
              size="sm"
              className="font-body"
              onClick={() => setFiltersOpen(true)}
            >
              <SlidersHorizontal className="size-4" />
              Filters
            </Button>
          )}
        </div>
        <p className="font-body text-muted-foreground">
          Find industrial equipment near you
        </p>
        {/* Search results will be built in Cycle 2 */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="h-48 rounded-lg border border-border bg-card"
            />
          ))}
        </div>
      </div>
    </PageLayout>
  )
}
