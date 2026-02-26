import { create } from 'zustand'
import { persist } from 'zustand/middleware'
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
  removeFilter: (key: keyof SearchFilters) => void
  setSortBy: (sortBy: SortBy) => void
  clearFilters: () => void
  reset: () => void
  /** Number of active filters */
  activeFilterCount: () => number
}

const initialFilters: SearchFilters = {}

export const useSearchStore = create<SearchStore>()(
  persist(
    (set, get) => ({
      query: '',
      filters: initialFilters,
      sortBy: 'relevance',
      setQuery: (query) => set({ query }),
      setFilter: (key, value) =>
        set((state) => ({
          filters: { ...state.filters, [key]: value },
        })),
      removeFilter: (key) =>
        set((state) => {
          const { [key]: _, ...rest } = state.filters
          return { filters: rest as SearchFilters }
        }),
      setSortBy: (sortBy) => set({ sortBy }),
      clearFilters: () => set({ filters: initialFilters }),
      reset: () =>
        set({ query: '', filters: initialFilters, sortBy: 'relevance' }),
      activeFilterCount: () => {
        const filters = get().filters
        return Object.values(filters).filter(
          (v) => v !== undefined && v !== null
        ).length
      },
    }),
    {
      name: 'mg-search',
      partialize: (state) => ({
        filters: state.filters,
        sortBy: state.sortBy,
      }),
    }
  )
)
