/**
 * Upload a file via XHR with real progress events.
 * Returns the JSON response body on success.
 */
export function uploadFileWithProgress(
  url: string,
  file: File,
  fields: Record<string, string>,
  onProgress: (pct: number) => void
): Promise<{ url: string; [key: string]: unknown }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()

    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100))
      }
    })

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText))
        } catch {
          reject(new Error('Invalid response from server'))
        }
      } else {
        try {
          const err = JSON.parse(xhr.responseText)
          reject(new Error(err.error || `Upload failed (${xhr.status})`))
        } catch {
          reject(new Error(`Upload failed (${xhr.status})`))
        }
      }
    })

    xhr.addEventListener('error', () => reject(new Error('Network error during upload')))
    xhr.addEventListener('abort', () => reject(new Error('Upload aborted')))

    const formData = new FormData()
    formData.append('file', file)
    for (const [key, value] of Object.entries(fields)) {
      formData.append(key, value)
    }

    xhr.open('POST', url)
    xhr.send(formData)
  })
}
