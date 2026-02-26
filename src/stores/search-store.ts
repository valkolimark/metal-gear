import { create } from 'zustand'
import type { SearchFilters } from '@/types/listings'

type SortBy = 'relevance' | 'price_asc' | 'price_desc' | 'newest' | 'distance'

interface SearchStore {
  query: string
  filters: SearchFilters
  sortBy: SortBy
  setQuery: (query: string) => void
  setFilter: <K extends keyof SearchFilters>(
    key: K,
    value: SearchFilters[K]
  ) => void
  setSortBy: (sortBy: SortBy) => void
  clearFilters: () => void
  reset: () => void
}

const initialFilters: SearchFilters = {}

export const useSearchStore = create<SearchStore>((set) => ({
  query: '',
  filters: initialFilters,
  sortBy: 'relevance',
  setQuery: (query) => set({ query }),
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),
  setSortBy: (sortBy) => set({ sortBy }),
  clearFilters: () => set({ filters: initialFilters }),
  reset: () => set({ query: '', filters: initialFilters, sortBy: 'relevance' }),
}))
