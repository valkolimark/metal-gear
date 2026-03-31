# Cycle 37 — Import Progress UX: Persistent Banner, Humor & Completion Notifications
**Target version:** 4.8.0  
**Prompt file:** `prompts/cycle-37-import-progress-ux.md`

---

## Prerequisite Check

Before writing any code, run all of the following:

```bash
# 1. Confirm current version
grep '^\#\# \[' CHANGELOG.md | head -1
# Expected: ## [4.7.0]

# 2. Confirm import components exist
ls src/app/(main)/listings/import/components/ImportProgressBar.tsx
ls src/app/(main)/listings/import/components/ImportPreviewTable.tsx
ls src/app/(main)/listings/import/components/ImportUploadZone.tsx
ls src/app/(main)/listings/import/components/ImportCompleteSummary.tsx
ls src/app/actions/import.ts
ls src/app/(main)/layout.tsx

# 3. Confirm existing stores
ls src/lib/stores/

# 4. Confirm notification infrastructure
grep -r "import_complete\|createNotification" src/app/actions/ --include="*.ts" -l
grep -r "sendPushNotification\|sendEmail" src/app/actions/ --include="*.ts" -l
grep -r "push_subscriptions" src/app/actions/ --include="*.ts" -l

# 5. Check how existing notifications are fired (for pattern consistency)
cat src/app/actions/notifications.ts 2>/dev/null || \
  grep -r "notifications.*insert\|createNotification" src/app/actions/ --include="*.ts" | head -20
```

Read every output before writing a single line of code. The notification and store
patterns in this codebase must be matched exactly.

---

## Critical Rules

- All DB operations use `createAdminClient()` in server actions. Never client-side Supabase.
- All media uploads route through `src/lib/media.ts`. Never Supabase Storage.
- Never pass functions from Server Components to Client Components.
- Tailwind CSS v4 — no `tailwind.config.ts`. Use CSS variables.
- `next-themes` only adds `.dark`. Light-mode overrides use `html:not(.dark)`.
- SOS orange `#FF6B2B` is never changed.
- The `ImportProgressBanner` must follow the `MobileNavClient` pattern exactly — a thin
  `'use client'` wrapper rendered in `(main)/layout.tsx`, with all data flowing through
  the Zustand store. No server data passed as props to the banner.

---

## Objective

The bulk import currently shows progress only while the user stays on `/listings/import`.
With large inventories — like the 557-listing, 2,652-image import we're targeting — Phase 2
can run for 20–60 minutes. Users should be able to leave the page freely, see progress
anywhere in the app, and receive a notification the moment their inventory is ready.

This cycle delivers four things:

1. **Size-aware humor messaging** — personality at the preview stage and during Phase 2
2. **"You can leave" UX** — clear messaging + `beforeunload` warning removed once import starts
3. **Persistent floating progress banner** — appears on every page while an import runs;
   powered by Zustand + `sessionStorage` so it survives navigation
4. **Completion notifications** — in-app bell, web push, and email fallback fired from
   `startImportJob()` when the import finishes or fails

**Architecture decision — polling over Realtime:**
`listing_imports` has no RLS policies and is not in any Realtime publication. Adding
Realtime support would require schema changes (publication + RLS). Instead, this cycle
lifts the existing polling logic (`GET /api/import/progress/[importId]`) into the Zustand
store so polling continues across navigation. Zero schema changes required.

---

## Files to Create / Modify

### Create
- `src/lib/stores/import-store.ts` — Zustand store with `sessionStorage` persistence
- `src/components/import-progress-banner.tsx` — floating bottom-left progress pill
- `src/lib/import/humor.ts` — size-based humor message generator (pure, unit-testable)
- `src/test/import-humor.test.ts` — unit tests for humor message logic

### Modify
- `src/app/(main)/layout.tsx` — mount `ImportProgressBannerClient` wrapper
- `src/app/(main)/listings/import/components/ImportPreviewTable.tsx` — size message below preview
- `src/app/(main)/listings/import/components/ImportProgressBar.tsx` — unified weighted bar,
  time estimate, "you can leave" banner, Phase 2 image quip
- `src/app/actions/import.ts` — fire notifications on complete/failed

---

## Implementation Steps

### Step 1 — Humor Message Library (`src/lib/import/humor.ts`)

Pure functions, no side effects, no imports from the app. Fully unit-testable.

```typescript
/**
 * Size-aware humor messages for the bulk import experience.
 * All functions are pure — no side effects, no app imports.
 * Tone: industrial, warm, slightly self-aware. Never sarcastic.
 */

export type ImportSize = 'tiny' | 'small' | 'medium' | 'large' | 'massive'

/**
 * Classify an import by row count.
 * Thresholds calibrated for industrial equipment dealers:
 *   tiny   = 1–10     (spot sale, a few pieces)
 *   small  = 11–50    (one truck load)
 *   medium = 51–200   (a real yard drop)
 *   large  = 201–500  (serious inventory)
 *   massive = 500+    (full yard transfer)
 */
export function classifyImportSize(rowCount: number): ImportSize {
  if (rowCount <= 10)  return 'tiny'
  if (rowCount <= 50)  return 'small'
  if (rowCount <= 200) return 'medium'
  if (rowCount <= 500) return 'large'
  return 'massive'
}

/**
 * Preview-stage message shown below the import table, before the user clicks Import.
 * Appears after file is parsed and row count is known.
 */
export function getPreviewQuip(rowCount: number, imageCount: number): string {
  const size = classifyImportSize(rowCount)
  const imageNote = imageCount > 0
    ? ` and ${imageCount.toLocaleString()} photo${imageCount !== 1 ? 's' : ''}`
    : ''

  const quips: Record<ImportSize, string> = {
    tiny:    `${rowCount} listing${rowCount !== 1 ? 's' : ''}${imageNote}. Small load — we'll have this on the floor before the coffee's hot.`,
    small:   `${rowCount} listings${imageNote}. A solid haul. Warming up the forklifts now.`,
    medium:  `${rowCount} listings${imageNote}. Now we're talking — that's enough iron to fill a respectable yard. Grab a coffee.`,
    large:   `${rowCount} listings${imageNote}. That's a serious inventory drop. We're calling in extra hands — feel free to wander off and we'll ping you when it's all staged.`,
    massive: `${rowCount} listings${imageNote}. Holy horsepower. That's enough machinery to keep three yards busy. Go get lunch — we'll send you a notification the moment the last unit hits the floor.`,
  }

  return quips[size]
}

/**
 * Toast message shown immediately when the import job starts.
 * Replaces the beforeunload warning — user is explicitly told they can leave.
 */
export function getStartToast(rowCount: number): string {
  const size = classifyImportSize(rowCount)

  const toasts: Record<ImportSize, string> = {
    tiny:    "Import started. Done in a moment.",
    small:   "Import running in the background. You're free to browse — we'll let you know when it's done.",
    medium:  "Your inventory is being processed in the background. Go ahead and explore — we'll ping you when it's ready.",
    large:   "Big import underway. You can close this page or explore the platform — we'll send you a notification when your listings are live.",
    massive: "That's a big one. We've got it from here — seriously, go do something else. You'll get a notification, an in-app alert, and an email when it's all done.",
  }

  return toasts[size]
}

/**
 * Phase 2 subtext shown below the progress bar during image fetching.
 * Switches to a new quip at 0%, 33%, 66%, and 90% completion.
 */
export function getImageFetchQuip(
  imageCount: number,
  percentComplete: number
): string {
  if (imageCount === 0) return 'No images to fetch — almost done.'

  if (imageCount < 100) {
    return 'Hanging the price tags on your inventory...'
  }

  if (imageCount < 500) {
    const stages = [
      'Fetching photos from the source yard...',
      'Halfway through the photo haul...',
      'Almost got all the glamour shots...',
      'Last few photos coming in...',
    ]
    return stages[Math.floor(Math.min(percentComplete, 99) / 25)]
  }

  if (imageCount < 1500) {
    const stages = [
      'That\'s a lot of glamour shots. Hauling them in now...',
      'Still fetching — your equipment is very photogenic.',
      'More than halfway through the photo collection...',
      'Final stretch — tidying up the last shots...',
    ]
    return stages[Math.floor(Math.min(percentComplete, 99) / 25)]
  }

  // 1500+
  const stages = [
    `Over ${imageCount.toLocaleString()} photos. We didn\'t know centrifuges could be this photogenic.`,
    'Still going. This might be a record for us.',
    'More than halfway. Your yard is going to look incredible.',
    'Almost there. Last batch coming off the truck now...',
  ]
  return stages[Math.floor(Math.min(percentComplete, 99) / 25)]
}

/**
 * Floating banner label shown on other pages while import runs.
 */
export function getBannerLabel(
  successfulRows: number,
  totalRows: number,
  phase: 'importing' | 'fetching_images',
  imagesFetched: number,
  totalImages: number
): string {
  if (phase === 'importing') {
    return `Setting up the yard — ${successfulRows} of ${totalRows} listings`
  }
  if (totalImages > 0) {
    return `Hauling photos — ${imagesFetched.toLocaleString()} of ${totalImages.toLocaleString()}`
  }
  return `Importing inventory — ${successfulRows} of ${totalRows} listings`
}

/**
 * Completion notification message.
 */
export function getCompletionMessage(
  successfulRows: number,
  failedRows: number,
  imagesFailed: number
): { title: string; body: string } {
  const issues: string[] = []
  if (failedRows > 0)   issues.push(`${failedRows} listing${failedRows !== 1 ? 's' : ''} failed`)
  if (imagesFailed > 0) issues.push(`${imagesFailed} image${imagesFailed !== 1 ? 's' : ''} couldn't be fetched`)

  const title = issues.length === 0
    ? 'Your yard is open! 🏭'
    : 'Import complete — a few things to check'

  const body = issues.length === 0
    ? `${successfulRows} listing${successfulRows !== 1 ? 's are' : ' is'} now live on Metal Gear.`
    : `${successfulRows} listing${successfulRows !== 1 ? 's' : ''} live. ${issues.join(', ')}.`

  return { title, body }
}

/**
 * Failure notification message.
 */
export function getFailureMessage(errorMessage?: string): { title: string; body: string } {
  return {
    title: 'Import hit a snag',
    body:  errorMessage
      ? `Something went wrong: ${errorMessage}. Head to Import History to try again.`
      : 'Something went wrong with your import. Head to Import History to try again.',
  }
}
```

---

### Step 2 — Zustand Import Store (`src/lib/stores/import-store.ts`)

```typescript
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface ActiveImport {
  importId:       string
  totalRows:      number
  totalImages:    number   // detected at preview time from ParseResult
  successfulRows: number
  failedRows:     number
  imagesAttempted: number
  imagesFetched:  number
  imagesFailed:   number
  phase:          'pending' | 'importing' | 'fetching_images' | 'complete' | 'failed'
  startedAt:      number   // Date.now()
  completedAt:    number | null
  errorMessage:   string | null
  dismissed:      boolean  // user clicked × on banner; job still runs
}

interface ImportStore {
  activeImport: ActiveImport | null

  // Called when the user clicks Import — sets up the record before the job starts
  startImport: (importId: string, totalRows: number, totalImages: number) => void

  // Called by the polling loop with the latest progress data from the API
  updateProgress: (data: Partial<ActiveImport>) => void

  // Called by the banner × button — hides UI but preserves job state
  dismissBanner: () => void

  // Called when job reaches 'complete' or 'failed' — clears after notification fires
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
            successfulRows:  0,
            failedRows:      0,
            imagesAttempted: 0,
            imagesFetched:   0,
            imagesFailed:    0,
            phase:           'pending',
            startedAt:       Date.now(),
            completedAt:     null,
            errorMessage:    null,
            dismissed:       false,
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
      name:    'mg-active-import',
      storage: createJSONStorage(() => sessionStorage),
      // Only persist fields needed to reconnect after navigation.
      // Do not persist dismissed — banner should reappear after page refresh
      // so the user doesn't lose track of a running job.
      partialize: (state) => ({ activeImport: state.activeImport }),
    }
  )
)
```

---

### Step 3 — Update `ImportPreviewTable`

In `src/app/(main)/listings/import/components/ImportPreviewTable.tsx`:

Import `getPreviewQuip` from `@/lib/import/humor`. Calculate `totalImages` from
`parseResult.rows.reduce((n, r) => n + (r.image_urls?.length ?? (r.image_url ? 1 : 0)), 0)`.

**Important:** As of Cycle 36, `ImportPreviewTable` already renders a duplicate handling
card (mode selector: Skip / Update / Create all as new) when duplicates are detected, plus
a "checking duplicates..." badge during the background scan. Do not remove or replace either
of those. Place the quip block **below all existing content** (below the duplicate card if
present, below the preview table if not), and **above the Import button**:

```tsx
import { getPreviewQuip } from '@/lib/import/humor'

// Inside the component, AFTER the duplicate handling card and all existing JSX,
// BEFORE the Import button:
{parseResult.totalRows > 0 && (
  <div className="mt-4 rounded-lg border border-border bg-muted/40 px-4 py-3">
    <p className="text-sm text-muted-foreground leading-relaxed">
      <span className="mr-2">⚙️</span>
      {getPreviewQuip(parseResult.totalRows, totalImages)}
    </p>
    {parseResult.totalRows > 200 && (
      <p className="mt-1 text-xs text-muted-foreground">
        You'll get an in-app notification, push alert, and email when it's done —
        no need to stay on this page.
      </p>
    )}
  </div>
)}
```

---

### Step 4 — Update `ImportProgressBar`

Replace the existing `ImportProgressBar` component entirely with the new version.

**Key changes:**
- Single unified progress bar (Phase 1 weighted 15%, Phase 2 weighted 85%)
- Time estimate once Phase 2 is ≥ 10% complete
- "You can leave" banner at the top
- Phase 2 image quip below the bar
- Polling drives the Zustand store (not local state)
- `beforeunload` warning is REMOVED once the job starts (user is told they can leave instead)

```tsx
'use client'

import { useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useImportStore } from '@/lib/stores/import-store'
import {
  getImageFetchQuip,
  getStartToast,
  getCompletionMessage,
  getFailureMessage,
} from '@/lib/import/humor'
import { toast } from 'sonner'

interface ImportProgressBarProps {
  importId:    string
  totalRows:   number
  totalImages: number
  onComplete:  (summary: ImportSummary) => void
}

export interface ImportSummary {
  successfulRows: number
  failedRows:     number
  imagesFetched:  number
  imagesFailed:   number
}

export function ImportProgressBar({
  importId,
  totalRows,
  totalImages,
  onComplete,
}: ImportProgressBarProps) {
  const { activeImport, startImport, updateProgress } = useImportStore()
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null)
  const startMsRef = useRef<number>(Date.now())
  const router     = useRouter()

  // Initialise store on mount
  useEffect(() => {
    startImport(importId, totalRows, totalImages)
    startMsRef.current = Date.now()

    // Show "you can leave" toast
    toast(getStartToast(totalRows), {
      duration: totalRows > 100 ? 8000 : 4000,
      icon: '⚙️',
    })

    // Remove beforeunload warning — user is explicitly told they can leave
    const noop = (e: BeforeUnloadEvent) => { e.preventDefault = () => {} }
    window.removeEventListener('beforeunload', noop)
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

  // Polling loop — writes to store, not local state
  const poll = useCallback(async () => {
    try {
      const res  = await fetch(`/api/import/progress/${importId}`)
      if (!res.ok) return
      const data = await res.json()

      updateProgress({
        phase:           data.status,
        successfulRows:  data.successful_rows   ?? 0,
        failedRows:      data.failed_rows        ?? 0,
        imagesAttempted: data.image_fetch_attempted ?? 0,
        imagesFetched:   data.image_fetch_succeeded ?? 0,
        imagesFailed:    data.image_fetch_failed    ?? 0,
        errorMessage:    data.error_log?.[0]?.message ?? null,
      })

      if (data.status === 'complete' || data.status === 'failed') {
        if (pollRef.current) clearInterval(pollRef.current)
        updateProgress({ completedAt: Date.now() })
        onComplete({
          successfulRows: data.successful_rows   ?? 0,
          failedRows:     data.failed_rows        ?? 0,
          imagesFetched:  data.image_fetch_succeeded ?? 0,
          imagesFailed:   data.image_fetch_failed    ?? 0,
        })
      }
    } catch {
      // Swallow network errors — poll will retry on next tick
    }
  }, [importId, updateProgress, onComplete])

  useEffect(() => {
    pollRef.current = setInterval(poll, 2000)
    return () => { if (pollRef.current) clearInterval(pollRef.current) }
  }, [poll])

  if (!activeImport) return null

  // ── Progress calculation ─────────────────────────────────────────────────
  // Phase 1 (listing creation) = 15% of total bar
  // Phase 2 (image fetching)   = 85% of total bar
  const phase1Pct = totalRows > 0
    ? Math.min((activeImport.successfulRows + activeImport.failedRows) / totalRows, 1)
    : 0

  const phase2Pct = (totalImages > 0 && activeImport.phase === 'fetching_images')
    ? Math.min(activeImport.imagesAttempted / totalImages, 1)
    : (activeImport.phase === 'complete' ? 1 : 0)

  const overallPct = totalImages > 0
    ? phase1Pct * 0.15 + phase2Pct * 0.85
    : phase1Pct

  const displayPct = Math.round(overallPct * 100)

  // ── Time estimate (only once Phase 2 is ≥ 10% complete) ─────────────────
  let timeEstimate: string | null = null
  if (
    activeImport.phase === 'fetching_images' &&
    phase2Pct >= 0.10 &&
    activeImport.imagesAttempted > 0
  ) {
    const elapsedMs      = Date.now() - startMsRef.current
    const msPerImage     = elapsedMs / activeImport.imagesAttempted
    const remaining      = totalImages - activeImport.imagesAttempted
    const remainingMs    = remaining * msPerImage
    const remainingMins  = Math.ceil(remainingMs / 60000)
    timeEstimate = remainingMins <= 1
      ? 'Less than a minute remaining'
      : `~${remainingMins} minute${remainingMins !== 1 ? 's' : ''} remaining`
  }

  // ── Phase 2 image quip ───────────────────────────────────────────────────
  const imageFetchQuip = activeImport.phase === 'fetching_images'
    ? getImageFetchQuip(totalImages, Math.round(phase2Pct * 100))
    : null

  // ── Phase label ──────────────────────────────────────────────────────────
  const phaseLabel = (() => {
    switch (activeImport.phase) {
      case 'pending':         return 'Starting import...'
      case 'importing':       return `Setting up the yard — ${activeImport.successfulRows} of ${totalRows} listings`
      case 'fetching_images': return totalImages > 0
        ? `Hauling photos — ${activeImport.imagesAttempted.toLocaleString()} of ${totalImages.toLocaleString()}`
        : 'Finishing up...'
      case 'complete':        return 'All done!'
      case 'failed':          return 'Import encountered an error'
      default:                return 'Processing...'
    }
  })()

  return (
    <div className="space-y-4">
      {/* "You can leave" banner */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 dark:border-blue-900 dark:bg-blue-950/40">
        <p className="text-sm text-blue-800 dark:text-blue-300">
          <span className="font-medium">This is running in the background.</span>
          {' '}You can safely leave this page — we'll send you a notification when
          your inventory is ready.
        </p>
      </div>

      {/* Combined progress bar */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">{phaseLabel}</span>
          <span className="tabular-nums font-medium">{displayPct}%</span>
        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500 ease-out"
            style={{ width: `${displayPct}%` }}
          />
        </div>

        {/* Time estimate */}
        {timeEstimate && (
          <p className="text-xs text-muted-foreground">{timeEstimate}</p>
        )}

        {/* Phase 2 image quip */}
        {imageFetchQuip && (
          <p className="text-xs text-muted-foreground italic">{imageFetchQuip}</p>
        )}
      </div>

      {/* Phase breakdown (subtle secondary detail) */}
      {activeImport.phase === 'fetching_images' && totalImages > 0 && (
        <div className="flex gap-6 text-xs text-muted-foreground">
          <span>✓ {activeImport.successfulRows} listings created</span>
          <span>
            {activeImport.imagesFetched.toLocaleString()} /
            {' '}{totalImages.toLocaleString()} images
          </span>
          {activeImport.imagesFailed > 0 && (
            <span className="text-destructive">
              {activeImport.imagesFailed} images failed
            </span>
          )}
        </div>
      )}
    </div>
  )
}
```

---

### Step 5 — Floating Progress Banner (`src/components/import-progress-banner.tsx`)

This component renders on every page in the main layout while an import is active.
It reads from the Zustand store — no props from the server layout.

```tsx
'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { X, Package } from 'lucide-react'
import { useImportStore } from '@/lib/stores/import-store'
import { getBannerLabel, getCompletionMessage, getFailureMessage } from '@/lib/import/humor'
import { toast } from 'sonner'

/**
 * Floating bottom-left progress pill that persists across navigation.
 * Mounts globally in (main)/layout.tsx via ImportProgressBannerClient.
 * Reads from importStore — no server data, no props.
 *
 * Lifecycle:
 *   running  → shows progress pill with live % and label
 *   complete → shows success toast, clears store after 3s
 *   failed   → shows error toast, clears store after 3s
 *   dismissed → hides pill, job continues running
 */
export function ImportProgressBanner() {
  const { activeImport, dismissBanner, clearImport } = useImportStore()

  // Fire toast and clear store when job finishes
  useEffect(() => {
    if (!activeImport) return

    if (activeImport.phase === 'complete' && activeImport.completedAt) {
      const { title, body } = getCompletionMessage(
        activeImport.successfulRows,
        activeImport.failedRows,
        activeImport.imagesFailed,
      )
      toast.success(title, {
        description: body,
        duration: 8000,
        action: {
          label: 'View Listings',
          onClick: () => { window.location.href = '/listings' },
        },
      })
      setTimeout(clearImport, 3000)
    }

    if (activeImport.phase === 'failed' && activeImport.completedAt) {
      const { title, body } = getFailureMessage(activeImport.errorMessage ?? undefined)
      toast.error(title, {
        description: body,
        duration: 10000,
        action: {
          label: 'View History',
          onClick: () => { window.location.href = '/listings/import' },
        },
      })
      setTimeout(clearImport, 3000)
    }
  }, [activeImport?.phase, activeImport?.completedAt]) // eslint-disable-line react-hooks/exhaustive-deps

  // Don't render if no import, dismissed, or terminal state handled above
  if (
    !activeImport ||
    activeImport.dismissed ||
    activeImport.phase === 'complete' ||
    activeImport.phase === 'failed'
  ) {
    return null
  }

  // ── Progress calculation (mirrors ImportProgressBar) ─────────────────────
  const { totalRows, totalImages } = activeImport

  const phase1Pct = totalRows > 0
    ? Math.min(
        (activeImport.successfulRows + activeImport.failedRows) / totalRows, 1
      )
    : 0

  const phase2Pct = totalImages > 0 && activeImport.phase === 'fetching_images'
    ? Math.min(activeImport.imagesAttempted / totalImages, 1)
    : 0

  const overallPct = totalImages > 0
    ? phase1Pct * 0.15 + phase2Pct * 0.85
    : phase1Pct

  const displayPct = Math.round(overallPct * 100)

  const label = getBannerLabel(
    activeImport.successfulRows,
    activeImport.totalRows,
    activeImport.phase as 'importing' | 'fetching_images',
    activeImport.imagesFetched,
    activeImport.totalImages,
  )

  return (
    <div
      className={[
        // Fixed bottom-left, above mobile nav safe area.
        // (main)/layout.tsx adds pb-[72px] for MobileBottomNav — confirmed in Cycle 18.
        // bottom-20 (80px) clears the 72px nav with 8px to spare.
        'fixed bottom-20 left-4 z-50',
        'md:bottom-6',
        // Card styling
        'w-72 rounded-xl border border-border bg-card shadow-lg',
        'overflow-hidden',
      ].join(' ')}
      role="status"
      aria-live="polite"
      aria-label={`Import progress: ${displayPct}%`}
    >
      {/* Progress bar strip at top */}
      <div className="h-1 w-full bg-muted">
        <div
          className="h-full bg-primary transition-all duration-500 ease-out"
          style={{ width: `${displayPct}%` }}
        />
      </div>

      <div className="flex items-center gap-3 px-3 py-2.5">
        {/* Icon */}
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
          <Package className="h-4 w-4 text-primary" />
        </div>

        {/* Label + pct */}
        <div className="min-w-0 flex-1">
          <p className="truncate text-xs font-medium text-foreground">
            {label}
          </p>
          <p className="text-xs text-muted-foreground">{displayPct}% complete</p>
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1">
          <Link
            href="/listings/import"
            className="rounded px-1.5 py-0.5 text-xs text-primary hover:underline"
          >
            View
          </Link>
          <button
            onClick={dismissBanner}
            className="rounded p-1 text-muted-foreground hover:text-foreground"
            aria-label="Dismiss import progress banner"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}
```

---

### Step 6 — Mount Banner in Main Layout

In `src/app/(main)/layout.tsx`:

Following the exact pattern of `MobileNavClient` — a thin `'use client'` wrapper so the
Server Component layout can render a client component without prop-drilling:

Create `src/components/import-progress-banner-client.tsx`:

```tsx
'use client'
// Thin client wrapper for ImportProgressBanner.
// Matches the MobileNavClient pattern in (main)/layout.tsx.
// No props — all state flows through importStore.
import { ImportProgressBanner } from '@/components/import-progress-banner'
export function ImportProgressBannerClient() {
  return <ImportProgressBanner />
}
```

In `src/app/(main)/layout.tsx`, add alongside `MobileNavClient` and `NotificationEducationTrigger`:

```tsx
import { ImportProgressBannerClient } from '@/components/import-progress-banner-client'

// Inside the layout JSX, after MobileNavClient:
<ImportProgressBannerClient />
```

---

### Step 7 — Fire Notifications from `startImportJob()`

In `src/app/actions/import.ts`, at the end of `startImportJob()`, after the final
`status: 'complete'` or `status: 'failed'` update, fire three signals.

**First, read the notification firing pattern from the codebase** (checked in prerequisite
step) and match it exactly. The pattern below assumes the standard notifications table
insert + push notification approach already used for SOS and messaging:

```typescript
// ── Completion notifications ───────────────────────────────────────────────
// Fire after status is written to DB so the banner poll picks up 'complete' first.

async function fireImportNotifications(params: {
  supabaseAdmin:  ReturnType<typeof createAdminClient>
  userId:         string
  importId:       string
  successfulRows: number
  failedRows:     number
  imagesFailed:   number
  failed:         boolean
  errorMessage:   string | null
}): Promise<void> {
  const {
    supabaseAdmin, userId, importId,
    successfulRows, failedRows, imagesFailed, failed, errorMessage,
  } = params

  const { title, body } = failed
    ? getFailureMessage(errorMessage ?? undefined)
    : getCompletionMessage(successfulRows, failedRows, imagesFailed)

  // 1. In-app notification (notifications table)
  // Match the exact insert pattern used elsewhere in this codebase.
  // Check src/app/actions/notifications.ts for the correct column names.
  await supabaseAdmin
    .from('notifications')
    .insert({
      user_id:    userId,
      type:       failed ? 'import_failed' : 'import_complete',
      title,
      message:    body,
      data:       { importId, successfulRows, failedRows, imagesFailed },
      is_read:    false,
    })
    .throwOnError()

  // 2. Web push (if user has an active push subscription)
  // Match the exact push pattern used for SOS/offer notifications.
  // Check how sendPushNotification / push_subscriptions is used elsewhere.
  try {
    const { data: pushSubs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('endpoint, p256dh, auth')
      .eq('user_id', userId)

    if (pushSubs && pushSubs.length > 0) {
      // Use the existing push notification helper from this codebase.
      // If a helper doesn't exist, inline the Web Push API call here
      // matching the pattern in src/app/actions/ or api routes.
      for (const sub of pushSubs) {
        await sendPushNotification(sub, {
          title,
          body,
          icon:  '/icons/icon-192.svg',
          badge: '/icons/icon-192.svg',
          data:  { url: failed ? '/listings/import' : '/listings' },
        }).catch(() => {}) // fire-and-forget; expired subscriptions are normal
      }
    }
  } catch {
    // Push failure never blocks the import from being marked complete
  }

  // 3. Email fallback via Resend
  // Only send if the user has NO active push subscription (avoid double-notifying).
  // Match the sendEmail() call pattern from src/lib/email.ts.
  try {
    const { data: pushSubs } = await supabaseAdmin
      .from('push_subscriptions')
      .select('id')
      .eq('user_id', userId)
      .limit(1)

    if (!pushSubs || pushSubs.length === 0) {
      const { data: profile } = await supabaseAdmin
        .from('profiles')
        .select('email, display_name')
        .eq('id', userId)
        .single()

      if (profile?.email) {
        await sendEmail({
          to:      profile.email,
          subject: title,
          // Use the existing email template pattern from src/lib/email.ts.
          // Pass title, body, and a CTA link as the template data.
          template: 'import-complete',
          data: {
            name:           profile.display_name ?? 'there',
            title,
            body,
            ctaLabel:       failed ? 'View Import History' : 'View Your Listings',
            ctaUrl:         failed ? '/listings/import' : '/listings',
          },
        })
      }
    }
  } catch {
    // Email failure never blocks import completion
  }
}
```

Call `fireImportNotifications()` at the end of `startImportJob()`:

```typescript
// After final status update to 'complete' or 'failed':
// NOTE: startImportJob() now accepts an optional duplicateMode parameter
// ('create_new' | 'skip' | 'update') added in Cycle 36. Preserve that
// parameter and any other signature changes present in the live file.
// fireImportNotifications() is appended to the END of the existing function
// body — do not alter the function signature or any existing logic.
await fireImportNotifications({
  supabaseAdmin,
  userId,
  importId,
  successfulRows: finalSuccessfulRows,
  failedRows:     finalFailedRows,
  imagesFailed:   finalImagesFailed,
  failed:         jobFailed,
  errorMessage:   jobErrorMessage,
})
```

**Email template note:** Check `src/lib/email.ts` for the existing template pattern.
If an `import-complete` template doesn't exist, create a minimal one following the
same structure as the other transactional templates (dark-themed HTML with title,
body paragraph, and CTA button). Do not invent a new template system — extend what exists.

---

### Step 8 — Unit Tests (`src/test/import-humor.test.ts`)

```typescript
import { describe, it, expect } from 'vitest'
import {
  classifyImportSize,
  getPreviewQuip,
  getStartToast,
  getImageFetchQuip,
  getBannerLabel,
  getCompletionMessage,
  getFailureMessage,
} from '@/lib/import/humor'

describe('classifyImportSize', () => {
  it('classifies tiny imports (1–10)', () => {
    expect(classifyImportSize(1)).toBe('tiny')
    expect(classifyImportSize(10)).toBe('tiny')
  })
  it('classifies small imports (11–50)', () => {
    expect(classifyImportSize(11)).toBe('small')
    expect(classifyImportSize(50)).toBe('small')
  })
  it('classifies medium imports (51–200)', () => {
    expect(classifyImportSize(51)).toBe('medium')
    expect(classifyImportSize(200)).toBe('medium')
  })
  it('classifies large imports (201–500)', () => {
    expect(classifyImportSize(201)).toBe('large')
    expect(classifyImportSize(500)).toBe('large')
  })
  it('classifies massive imports (500+)', () => {
    expect(classifyImportSize(501)).toBe('massive')
    expect(classifyImportSize(5000)).toBe('massive')
  })
})

describe('getPreviewQuip', () => {
  it('returns a non-empty string for all size tiers', () => {
    expect(getPreviewQuip(5, 10)).toBeTruthy()
    expect(getPreviewQuip(25, 75)).toBeTruthy()
    expect(getPreviewQuip(150, 600)).toBeTruthy()
    expect(getPreviewQuip(300, 1200)).toBeTruthy()
    expect(getPreviewQuip(557, 2652)).toBeTruthy()
  })
  it('includes image count when images > 0', () => {
    const quip = getPreviewQuip(100, 500)
    expect(quip).toContain('500')
  })
  it('omits image count when images = 0', () => {
    const quip = getPreviewQuip(10, 0)
    expect(quip).not.toContain('photo')
    expect(quip).not.toContain('image')
  })
})

describe('getImageFetchQuip', () => {
  it('handles 0 images gracefully', () => {
    expect(getImageFetchQuip(0, 50)).toBe('No images to fetch — almost done.')
  })
  it('returns different strings at different completion stages', () => {
    const q0  = getImageFetchQuip(2000, 0)
    const q50 = getImageFetchQuip(2000, 50)
    const q90 = getImageFetchQuip(2000, 90)
    expect(q0).not.toBe(q50)
    expect(q50).not.toBe(q90)
  })
  it('does not throw at 100% completion', () => {
    expect(() => getImageFetchQuip(500, 100)).not.toThrow()
  })
})

describe('getCompletionMessage', () => {
  it('returns celebratory title when no failures', () => {
    const { title } = getCompletionMessage(557, 0, 0)
    expect(title).toContain('open')
  })
  it('returns cautionary title when failures exist', () => {
    const { title } = getCompletionMessage(550, 7, 12)
    expect(title).toContain('check')
  })
  it('body mentions listing count', () => {
    const { body } = getCompletionMessage(557, 0, 0)
    expect(body).toContain('557')
  })
})

describe('getFailureMessage', () => {
  it('includes error message when provided', () => {
    const { body } = getFailureMessage('increment_import_counter missing')
    expect(body).toContain('increment_import_counter missing')
  })
  it('returns generic message when no error provided', () => {
    const { body } = getFailureMessage()
    expect(body).toBeTruthy()
  })
})
```

---

## Edge Cases & Validation

**sessionStorage unavailable (SSR / private browsing):** `createJSONStorage(() => sessionStorage)` is safe — Zustand's persist middleware catches the `sessionStorage` access error in SSR and silently falls back to in-memory. No crash.

**Multiple tabs:** If the user has two tabs open and starts an import in one, the other tab's `sessionStorage` is isolated (same-origin but different tab). The banner only appears in the tab that started the import. This is correct behavior — don't try to sync across tabs.

**Import already complete when user refreshes:** On mount, `ImportProgressBar` starts polling immediately. If the job is already `complete` in the DB, the first poll response triggers the completion path, fires the toast, and clears the store. The "you can leave" banner renders briefly then disappears — acceptable.

**Banner position on mobile:** `bottom-20` clears the `MobileBottomNav` (56px + safe area). Confirm the value against the actual bottom nav height in the codebase — adjust if needed.

**Push notification permissions not granted:** The push subscription query returns zero rows. Email fallback fires. No error, no console warning.

**Resend email failure:** Wrapped in try/catch, fire-and-forget. Import is already marked complete before the email attempt. User still has the in-app notification.

**`import-complete` email template doesn't exist:** The implementation step says to check first. If the template doesn't exist, create it following the exact pattern of `freshness` or `invite` email templates in `src/lib/email.ts`. Use the same dark-themed HTML structure, CTA button, and footer as the existing templates.

**`notification.type` enum:** Check whether `notifications.type` has a DB constraint or TypeScript enum. If `'import_complete'` and `'import_failed'` are not already valid values, add them to the relevant type/enum. Do not insert values that would violate a DB check constraint.

**Time estimate negative:** If `msPerImage` calculation produces a negative value (clock skew, very fast completion), clamp `remainingMins` to 0 and show "Almost done" instead.

---

## Success Criteria

**Humor & Messaging**
- [ ] Preview quip appears below the 5-row preview table for all import sizes
- [ ] 557-row import shows the "massive" tier quip mentioning 2,652 photos
- [ ] "You can leave" secondary line appears for imports > 200 rows
- [ ] Start toast fires immediately when Import is clicked
- [ ] `beforeunload` warning does NOT fire once import has started
- [ ] Phase 2 image quip changes at 0%, ~33%, ~66%, ~90% completion
- [ ] Time estimate appears once Phase 2 ≥ 10% complete; does not appear before

**Persistent Banner**
- [ ] `ImportProgressBanner` renders bottom-left on every page in (main) layout while import runs
- [ ] Banner survives navigation (user can browse to /feed, /listings, etc. and banner persists)
- [ ] Banner survives F5 page refresh (sessionStorage persistence)
- [ ] Banner × dismiss button hides the banner; job continues running
- [ ] Progress percentage in banner matches ImportProgressBar on the import page
- [ ] Banner disappears automatically when job reaches complete or failed
- [ ] Banner does not render when no import is active

**Progress Bar**
- [ ] Single unified bar: Phase 1 weighted 15%, Phase 2 weighted 85%
- [ ] Phase 1 label: "Setting up the yard — X of Y listings"
- [ ] Phase 2 label: "Hauling photos — X of Y" when images present
- [ ] "You can leave" blue info banner appears at top of progress section
- [ ] Phase breakdown row shows listing count + image count during Phase 2
- [ ] Failed image count shown in destructive color when > 0

**Completion Notifications**
- [ ] In-app notification inserted into `notifications` table on complete
- [ ] In-app notification inserted on failed with error summary
- [ ] Web push fires for users with active push subscriptions
- [ ] Email sent only when user has NO push subscription
- [ ] All three notification paths are fire-and-forget (failure of one doesn't block others)
- [ ] Email not sent if push subscription exists (no double-notification)
- [ ] Toast fires in banner when job completes (even if user is on a different page)
- [ ] Toast fires in banner when job fails

**Code Quality**
- [ ] All unit tests pass: `npm test`
- [ ] TypeScript: `npm run typecheck` — zero errors
- [ ] Lint: `npm run lint` — zero warnings
- [ ] Build: `npm run build` — succeeds

---

## Session Protocol

Before starting:
```bash
npm run typecheck && npm run lint && npm run build && npm test
```

After implementation:
```bash
npm run typecheck && npm run lint && npm run build && npm test
```

All must pass before commit.

---

## Post-Cycle Documentation

After successful build and test:

1. Update `CHANGELOG.md` — add `## [4.8.0]` entry:

```
## [4.8.0] — YYYY-MM-DD · Import Progress UX (Cycle 37)

### Added
- **Size-aware humor messaging** — `src/lib/import/humor.ts` pure utility library;
  5 import size tiers (tiny/small/medium/large/massive) with industrial-themed quips
  at preview, job start, Phase 2 image fetching, and completion; all pure functions,
  fully unit-tested
- **"You can leave" UX** — info banner inside progress bar; start toast on import
  launch; beforeunload warning removed once job starts; secondary text for large imports
  explains push/email notification will follow
- **`importStore` Zustand store** — `src/lib/stores/import-store.ts`; sessionStorage
  persistence; survives navigation and F5 refresh; tracks phase, row counts, image
  counts, timestamps, dismissal state
- **`ImportProgressBanner`** — fixed bottom-left floating pill on every (main) layout
  page while import runs; shows live % + label; View link + dismiss button; fires
  completion/failure toasts; clears store automatically on terminal state
- **`ImportProgressBannerClient`** — thin 'use client' wrapper following MobileNavClient
  pattern; mounted in (main)/layout.tsx
- **Unified weighted progress bar** — Phase 1 (listing creation) = 15%, Phase 2
  (image fetching) = 85%; time estimate shown once Phase 2 ≥ 10% complete
- **Completion notifications** — `fireImportNotifications()` fires at end of
  startImportJob(): in-app bell notification, web push (if subscription exists),
  Resend email fallback (if no push subscription); all fire-and-forget
- **Phase 2 image quip** — rotating subtext below progress bar during image fetch;
  4 stages keyed to completion %; varies by total image count

### Changed
- **`ImportProgressBar`** — rewritten: unified weighted bar replaces two-phase bars;
  polling writes to importStore instead of local state; beforeunload warning removed
- **`ImportPreviewTable`** — preview quip block added below 5-row table; driven by
  `getPreviewQuip(totalRows, totalImages)` from humor library
- **`startImportJob()`** — calls `fireImportNotifications()` on complete and failed
```

2. Update `README.md` — Bulk Import bullet:
```
- Bulk CSV/Excel/Google Sheets import with multi-image support, size-aware humor
  messaging, persistent background progress banner, and push/email completion notifications
```

3. Update `CLAUDE.md` — Tech Stack section: change `Zustand (3 stores: auth, ui, search)` to `Zustand (4 stores: auth, ui, search, import)`.

   Also update the Bulk Import Upgrade section:
```
- **Import humor library** — `src/lib/import/humor.ts` — pure functions for size-aware
  messaging at preview, start, Phase 2, and completion; 5 tiers: tiny/small/medium/large/massive
- **`importStore`** — `src/lib/stores/import-store.ts`; sessionStorage-persisted Zustand
  store; tracks active import state across navigation
- **`ImportProgressBanner`** — `src/components/import-progress-banner.tsx`; fixed
  bottom-left; mounts via `ImportProgressBannerClient` in (main)/layout.tsx
- **Import notifications** — `fireImportNotifications()` in import.ts; in-app +
  push + email fallback on complete/failed; all fire-and-forget
```

4. Write session summary to `prompts/session-YYYY-MM-DD.md`

---

## Commit Message

```
feat(import): persistent progress banner, humor messaging & completion notifications

- src/lib/import/humor.ts: pure humor library, 5 import size tiers,
  quips at preview/start/phase2/completion, fully unit-tested
- src/lib/stores/import-store.ts: Zustand store with sessionStorage
  persistence; survives navigation and refresh
- ImportProgressBanner: fixed bottom-left pill on all (main) pages;
  live % + label; dismiss button; completion/failure toasts; auto-clears
- ImportProgressBannerClient: thin 'use client' wrapper in main layout
- ImportProgressBar: unified weighted bar (Phase1=15%, Phase2=85%);
  time estimate at >=10% Phase 2; "you can leave" banner; image quip;
  polling writes to importStore not local state
- ImportPreviewTable: preview quip block driven by humor library
- startImportJob(): fireImportNotifications() on complete + failed;
  in-app notification + web push + Resend email fallback; all fire-and-forget
- Remove beforeunload warning once import starts
- Add 13 unit tests in import-humor.test.ts

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## Deploy

```bash
curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=team_9n9GosoaraicsoDdbAFgzr5j" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"metal-gear","project":"prj_HQBv7jMhui6LGW5vzVC5pmCMndlx","gitSource":{"type":"github","ref":"main","org":"valkolimark","repo":"metal-gear"},"target":"production"}'
```
