import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface ActiveImport {
  importId: string
  totalRows: number
  totalImages: number
  successfulRows: number
  failedRows: number
  imagesAttempted: number
  imagesFetched: number
  imagesFailed: number
  phase:
    | 'pending'
    | 'importing'
    | 'fetching_images'
    | 'complete'
    | 'failed'
  startedAt: number
  completedAt: number | null
  errorMessage: string | null
  timeEstimate: string | null
  dismissed: boolean
}

interface ImportStore {
  activeImport: ActiveImport | null
  startImport: (
    importId: string,
    totalRows: number,
    totalImages: number
  ) => void
  updateProgress: (data: Partial<ActiveImport>) => void
  dismissBanner: () => void
  clearImport: () => void
}

export const useImportStore = create<ImportStore>()(
  persist(
    (set) => ({
      activeImport: null,

      startImport: (importId, totalRows, totalImages) =>
        set({
          activeImport: {
            importId,
            totalRows,
            totalImages,
            successfulRows: 0,
            failedRows: 0,
            imagesAttempted: 0,
            imagesFetched: 0,
            imagesFailed: 0,
            phase: 'pending',
            startedAt: Date.now(),
            completedAt: null,
            errorMessage: null,
            timeEstimate: null,
            dismissed: false,
          },
        }),

      updateProgress: (data) =>
        set((state) => ({
          activeImport: state.activeImport
            ? { ...state.activeImport, ...data }
            : null,
        })),

      dismissBanner: () =>
        set((state) => ({
          activeImport: state.activeImport
            ? { ...state.activeImport, dismissed: true }
            : null,
        })),

      clearImport: () => set({ activeImport: null }),
    }),
    {
      name: 'mg-active-import',
      storage: createJSONStorage(() => sessionStorage),
      partialize: (state) => ({ activeImport: state.activeImport }),
    }
  )
)
