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
  if (rowCount <= 10) return 'tiny'
  if (rowCount <= 50) return 'small'
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
  const imageNote =
    imageCount > 0
      ? ` and ${imageCount.toLocaleString()} photo${imageCount !== 1 ? 's' : ''}`
      : ''

  const quips: Record<ImportSize, string> = {
    tiny: `${rowCount} listing${rowCount !== 1 ? 's' : ''}${imageNote}. Small load — we'll have this on the floor before the coffee's hot.`,
    small: `${rowCount} listings${imageNote}. A solid haul. Warming up the forklifts now.`,
    medium: `${rowCount} listings${imageNote}. Now we're talking — that's enough iron to fill a respectable yard. Grab a coffee.`,
    large: `${rowCount} listings${imageNote}. That's a serious inventory drop. We're calling in extra hands — feel free to wander off and we'll ping you when it's all staged.`,
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
    tiny: 'Import started. Done in a moment.',
    small:
      "Import running in the background. You're free to browse — we'll let you know when it's done.",
    medium:
      "Your inventory is being processed in the background. Go ahead and explore — we'll ping you when it's ready.",
    large:
      "Big import underway. You can close this page or explore the platform — we'll send you a notification when your listings are live.",
    massive:
      "That's a big one. We've got it from here — seriously, go do something else. You'll get a notification, an in-app alert, and an email when it's all done.",
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
      "That's a lot of glamour shots. Hauling them in now...",
      'Still fetching — your equipment is very photogenic.',
      'More than halfway through the photo collection...',
      'Final stretch — tidying up the last shots...',
    ]
    return stages[Math.floor(Math.min(percentComplete, 99) / 25)]
  }

  // 1500+
  const stages = [
    `Over ${imageCount.toLocaleString()} photos. We didn't know centrifuges could be this photogenic.`,
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
  if (failedRows > 0)
    issues.push(
      `${failedRows} listing${failedRows !== 1 ? 's' : ''} failed`
    )
  if (imagesFailed > 0)
    issues.push(
      `${imagesFailed} image${imagesFailed !== 1 ? 's' : ''} couldn't be fetched`
    )

  const title =
    issues.length === 0
      ? 'Your yard is open!'
      : 'Import complete — a few things to check'

  const body =
    issues.length === 0
      ? `${successfulRows} listing${successfulRows !== 1 ? 's are' : ' is'} now live on Metal Gear.`
      : `${successfulRows} listing${successfulRows !== 1 ? 's' : ''} live. ${issues.join(', ')}.`

  return { title, body }
}

/**
 * Failure notification message.
 */
export function getFailureMessage(errorMessage?: string): {
  title: string
  body: string
} {
  return {
    title: 'Import hit a snag',
    body: errorMessage
      ? `Something went wrong: ${errorMessage}. Head to Import History to try again.`
      : 'Something went wrong with your import. Head to Import History to try again.',
  }
}
