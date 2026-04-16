/**
 * Runs up to `concurrency` upload tasks at once.
 * Starts the next as soon as one finishes (pLimit-style).
 */
export async function uploadInParallel<T>(
  files: File[],
  uploader: (file: File, onProgress: (pct: number) => void) => Promise<T>,
  onFileProgress: (file: File, pct: number) => void,
  onFileComplete: (file: File, result: T | { error: string }) => void,
  concurrency = 4
): Promise<void> {
  let running = 0
  let idx = 0
  const total = files.length

  return new Promise<void>((resolveAll) => {
    function next() {
      while (running < concurrency && idx < total) {
        const file = files[idx++]
        running++

        uploader(file, (pct) => onFileProgress(file, pct))
          .then((result) => {
            onFileComplete(file, result)
          })
          .catch((err) => {
            onFileComplete(file, {
              error: err instanceof Error ? err.message : 'Upload failed',
            })
          })
          .finally(() => {
            running--
            if (idx >= total && running === 0) {
              resolveAll()
            } else {
              next()
            }
          })
      }
      // Edge case: no files
      if (total === 0) resolveAll()
    }

    next()
  })
}
