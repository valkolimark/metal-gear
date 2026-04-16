'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import Image from 'next/image'
import { ImagePlus, X, Check, Loader2, RefreshCw, ArrowUp, ArrowDown } from 'lucide-react'
import { toast } from 'sonner'
import { uploadFileWithProgress } from '@/lib/upload/xhr-upload'
import { uploadInParallel } from '@/lib/upload/parallel'

type FileStatus = 'queued' | 'uploading' | 'done' | 'error'

interface UploadItem {
  id: string
  file: File
  previewUrl: string
  uploadedUrl: string | null
  status: FileStatus
  progress: number
  error?: string
}

interface MultiPhotoUploaderProps {
  maxFiles: number
  maxSizeMb?: number
  acceptedTypes?: string[]
  uploadUrl: string
  uploadFields?: Record<string, string>
  onComplete: (urls: string[]) => void
  existingUrls?: string[]
  onRemove?: (url: string) => void
  onReorder?: (urls: string[]) => void
  disabled?: boolean
  className?: string
  label?: string
  upgradeNudge?: string | null
}

export function MultiPhotoUploader({
  maxFiles,
  maxSizeMb = 10,
  uploadUrl,
  uploadFields = {},
  onComplete,
  existingUrls = [],
  onRemove,
  onReorder,
  disabled = false,
  className = '',
  label = 'Add photos',
  upgradeNudge = null,
}: MultiPhotoUploaderProps) {
  const [items, setItems] = useState<UploadItem[]>([])
  const [errors, setErrors] = useState<string[]>([])
  const [isDragOver, setIsDragOver] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const isUploadingRef = useRef(false)

  const maxSizeBytes = maxSizeMb * 1024 * 1024
  const totalCount = existingUrls.length + items.filter((i) => i.status !== 'error').length
  const canAddMore = totalCount < maxFiles && !disabled
  const isAtLimit = totalCount >= maxFiles

  // Warn before leaving mid-upload
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (items.some((i) => i.status === 'uploading' || i.status === 'queued')) {
        e.preventDefault()
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [items])

  // Notify parent of completed URLs as they come in
  useEffect(() => {
    const doneUrls = items.filter((i) => i.status === 'done' && i.uploadedUrl).map((i) => i.uploadedUrl!)
    if (doneUrls.length > 0) {
      onComplete([...existingUrls, ...doneUrls])
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.filter((i) => i.status === 'done').length])

  const processFiles = useCallback(
    (files: File[]) => {
      setErrors([])
      const remaining = maxFiles - existingUrls.length - items.filter((i) => i.status !== 'error').length
      if (remaining <= 0) {
        if (upgradeNudge) toast.info(upgradeNudge)
        return
      }

      const toUpload: File[] = []
      const newErrors: string[] = []

      for (const file of files) {
        if (toUpload.length >= remaining) {
          newErrors.push(`Skipped ${file.name} — max ${maxFiles} photos`)
          continue
        }
        if (file.size > maxSizeBytes) {
          newErrors.push(`${file.name} exceeds ${maxSizeMb}MB limit`)
          continue
        }
        if (!file.type.startsWith('image/')) {
          newErrors.push(`${file.name} is not an image`)
          continue
        }
        toUpload.push(file)
      }

      if (newErrors.length > 0) setErrors(newErrors)
      if (toUpload.length === 0) return

      // Create items immediately with preview URLs
      const newItems: UploadItem[] = toUpload.map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        uploadedUrl: null,
        status: 'queued' as const,
        progress: 0,
      }))

      setItems((prev) => [...prev, ...newItems])

      // Don't start a new batch if one is already running
      if (isUploadingRef.current) return
      isUploadingRef.current = true

      // Start uploading after state update
      setTimeout(() => {
        uploadInParallel(
          toUpload,
          (file, onProgress) =>
            uploadFileWithProgress(uploadUrl, file, uploadFields, onProgress),
          (file, pct) => {
            setItems((prev) =>
              prev.map((item) =>
                item.file === file ? { ...item, status: 'uploading', progress: pct } : item
              )
            )
          },
          (file, result) => {
            if ('error' in result) {
              setItems((prev) =>
                prev.map((item) =>
                  item.file === file
                    ? { ...item, status: 'error' as const, error: String(result.error) }
                    : item
                )
              )
            } else {
              setItems((prev) =>
                prev.map((item) =>
                  item.file === file
                    ? { ...item, status: 'done', progress: 100, uploadedUrl: result.url }
                    : item
                )
              )
            }
          },
          4
        ).finally(() => {
          isUploadingRef.current = false
        })
      }, 0)
    },
    [maxFiles, maxSizeBytes, maxSizeMb, existingUrls.length, items, uploadUrl, uploadFields, upgradeNudge]
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    processFiles(files)
    e.target.value = ''
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const files = Array.from(e.dataTransfer.files)
    processFiles(files)
  }

  const handleRetry = useCallback(
    (item: UploadItem) => {
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, status: 'queued', progress: 0, error: undefined } : i))
      )

      uploadFileWithProgress(uploadUrl, item.file, uploadFields, (pct) => {
        setItems((prev) =>
          prev.map((i) => (i.id === item.id ? { ...i, status: 'uploading', progress: pct } : i))
        )
      })
        .then((result) => {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id ? { ...i, status: 'done', progress: 100, uploadedUrl: result.url } : i
            )
          )
        })
        .catch((err) => {
          setItems((prev) =>
            prev.map((i) =>
              i.id === item.id
                ? { ...i, status: 'error', error: err instanceof Error ? err.message : 'Retry failed' }
                : i
            )
          )
        })
    },
    [uploadUrl, uploadFields]
  )

  const removeItem = (id: string) => {
    setItems((prev) => {
      const item = prev.find((i) => i.id === id)
      if (item) URL.revokeObjectURL(item.previewUrl)
      return prev.filter((i) => i.id !== id)
    })
  }

  const moveItem = (index: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? index - 1 : index + 1
    // For existing URLs
    if (index < existingUrls.length && onReorder) {
      const newUrls = [...existingUrls]
      ;[newUrls[index], newUrls[targetIdx]] = [newUrls[targetIdx], newUrls[index]]
      onReorder(newUrls)
    }
  }

  return (
    <div
      className={`space-y-3 ${className}`}
      onDragOver={(e) => {
        e.preventDefault()
        if (canAddMore) setIsDragOver(true)
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={canAddMore ? handleDrop : undefined}
    >
      {/* Existing photos */}
      {(existingUrls.length > 0 || items.length > 0) && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-5">
          {existingUrls.map((url, idx) => (
            <div
              key={url}
              className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
            >
              <Image
                src={url}
                alt={`Photo ${idx + 1}`}
                fill
                className="object-cover"
                sizes="120px"
              />
              <div className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100">
                <div className="absolute right-1 top-1 flex gap-0.5">
                  {onReorder && idx > 0 && (
                    <button
                      onClick={() => moveItem(idx, 'up')}
                      className="flex size-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    >
                      <ArrowUp className="size-3" />
                    </button>
                  )}
                  {onReorder && idx < existingUrls.length - 1 && (
                    <button
                      onClick={() => moveItem(idx, 'down')}
                      className="flex size-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    >
                      <ArrowDown className="size-3" />
                    </button>
                  )}
                  {onRemove && (
                    <button
                      onClick={() => onRemove(url)}
                      className="flex size-6 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                    >
                      <X className="size-3" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* New upload items */}
          {items.map((item) => (
            <div
              key={item.id}
              className={`relative aspect-square overflow-hidden rounded-lg border bg-muted ${
                item.status === 'error' ? 'border-destructive' : 'border-border'
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={item.previewUrl}
                alt="Upload preview"
                className="h-full w-full object-cover"
              />

              {/* Queued overlay */}
              {item.status === 'queued' && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <Loader2 className="size-5 animate-spin text-white" />
                </div>
              )}

              {/* Uploading progress */}
              {item.status === 'uploading' && (
                <>
                  <div className="absolute inset-0 bg-black/30" />
                  <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/30">
                    <div
                      className="h-full bg-primary transition-all duration-200"
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  <div className="absolute inset-0 flex items-center justify-center">
                    <span className="font-body text-xs font-medium text-white drop-shadow">
                      {item.progress}%
                    </span>
                  </div>
                </>
              )}

              {/* Done badge */}
              {item.status === 'done' && (
                <div className="absolute bottom-1 right-1 flex size-5 items-center justify-center rounded-full bg-green-500 text-white">
                  <Check className="size-3" />
                </div>
              )}

              {/* Error overlay with retry */}
              {item.status === 'error' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50">
                  <button
                    onClick={() => handleRetry(item)}
                    className="flex items-center gap-1 rounded-full bg-white/90 px-2 py-1 font-body text-xs text-destructive hover:bg-white"
                    title={item.error}
                  >
                    <RefreshCw className="size-3" />
                    Retry
                  </button>
                </div>
              )}

              {/* Remove button */}
              <button
                onClick={() => removeItem(item.id)}
                className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity hover:bg-black/80 group-hover:opacity-100 [.group:hover_&]:opacity-100"
                style={{ opacity: item.status === 'error' ? 1 : undefined }}
              >
                <X className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Errors */}
      {errors.length > 0 && (
        <div className="space-y-1">
          {errors.map((err, i) => (
            <p key={i} className="font-body text-xs text-destructive">{err}</p>
          ))}
        </div>
      )}

      {/* Add button / drop zone */}
      {canAddMore && (
        <div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileSelect}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className={`flex w-full items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 font-body text-sm transition-colors ${
              isDragOver
                ? 'border-primary bg-primary/5 text-primary'
                : 'border-border text-muted-foreground hover:border-primary/50 hover:text-foreground'
            }`}
          >
            <ImagePlus className="size-5" />
            {label} ({totalCount}/{maxFiles})
          </button>
        </div>
      )}

      {/* Upgrade nudge when at limit */}
      {isAtLimit && upgradeNudge && (
        <p className="font-body text-xs text-muted-foreground">{upgradeNudge}</p>
      )}
    </div>
  )
}
