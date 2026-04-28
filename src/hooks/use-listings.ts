'use client'

import { useQuery } from '@tanstack/react-query'
import { createClient } from '@/lib/supabase/client'
import type { Listing, SearchFilters } from '@/types/listings'

interface UseListingsOptions {
  filters?: SearchFilters
  sortBy?: string
  limit?: number
  offset?: number
}

async function fetchListings(
  options: UseListingsOptions
): Promise<Listing[]> {
  const supabase = createClient()
  let query = supabase.from('listings').select('*')

  if (options.filters?.category) {
    query = query.eq('category', options.filters.category)
  }
  if (options.filters?.industries && options.filters.industries.length > 0) {
    query = query.overlaps('industries', options.filters.industries)
  }
  if (options.filters?.condition?.length) {
    query = query.in('condition', options.filters.condition)
  }
  if (options.filters?.priceMin) {
    query = query.gte('price_cents', options.filters.priceMin)
  }
  if (options.filters?.priceMax) {
    query = query.lte('price_cents', options.filters.priceMax)
  }

  switch (options.sortBy) {
    case 'price_asc':
      query = query.order('price_cents', { ascending: true })
      break
    case 'price_desc':
      query = query.order('price_cents', { ascending: false })
      break
    case 'newest':
      query = query.order('created_at', { ascending: false })
      break
    default:
      query = query.order('created_at', { ascending: false })
  }

  query = query.range(
    options.offset ?? 0,
    (options.offset ?? 0) + (options.limit ?? 20) - 1
  )

  const { data, error } = await query

  if (error) throw error
  return (data ?? []) as Listing[]
}

export function useListings(options: UseListingsOptions = {}) {
  return useQuery({
    queryKey: ['listings', options],
    queryFn: () => fetchListings(options),
  })
}
