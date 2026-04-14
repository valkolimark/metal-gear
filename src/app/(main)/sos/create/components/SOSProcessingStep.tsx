'use client'

import { useEffect, useState, useRef } from 'react'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'
import { toast } from 'sonner'
import { uploadSosPhotoWithRetry } from '../upload-helper'
import type { AIAnalysisResult } from '@/types/ai-analysis'

const STATUS_MESSAGES = [
  'Identifying equipment...',
  'Reading specifications...',
  'Finding the right vendors...',
]

const AI_TIMEOUT_MS = 15_000

interface SOSProcessingStepProps {
  files: File[]
  onComplete: (aiResult: AIAnalysisResult | null, urls: string[]) => void
  onError: () => void
}

export function SOSProcessingStep({ files, onComplete, onError }: SOSProcessingStepProps) {
  const [statusIndex, setStatusIndex] = useState(0)
  const [previews] = useState(() => files.map(f => URL.createObjectURL(f)))
  const hasStarted = useRef(false)

  // Rotate status messages
  useEffect(() => {
    const interval = setInterval(() => {
      setStatusIndex(i => (i + 1) % STATUS_MESSAGES.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [])

  // Run upload + AI analysis
  useEffect(() => {
    if (hasStarted.current) return
    hasStarted.current = true

    async function process() {
      // Step 1: Upload all files to R2 (one silent retry on transient errors)
      const uploadedUrls: string[] = []
      for (const file of files) {
        const outcome = await uploadSosPhotoWithRetry(file)
        if (!outcome.ok) {
          toast.error(outcome.error)
          onError()
          return
        }
        uploadedUrls.push(outcome.url)
      }

      // Step 2: AI analysis — convert first image(s) to base64
      let aiResult: AIAnalysisResult | null = null
      try {
        const toBase64 = (file: File): Promise<string> =>
          new Promise((resolve, reject) => {
            const reader = new FileReader()
            reader.onload = () => {
              const dataUrl = reader.result as string
              resolve(dataUrl.split(',')[1])
            }
            reader.onerror = reject
            reader.readAsDataURL(file)
          })

        const wideShot = await toBase64(files[0])
        const nameplateShot = files.length > 1 ? await toBase64(files[1]) : undefined

        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), AI_TIMEOUT_MS)

        const res = await fetch('/api/listings/analyze-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            wideShot,
            nameplateShot,
            mimeType: files[0].type || 'image/jpeg',
            nameplateMimeType: files[1]?.type || undefined,
          }),
          signal: controller.signal,
        })

        clearTimeout(timeout)

        if (res.ok) {
          aiResult = await res.json()
        }
      } catch (err) {
        // AI failure is non-blocking — proceed with empty pre-fills
        if (err instanceof DOMException && err.name === 'AbortError') {
          // Timeout — handled below
        }
        // else network error — also non-blocking
      }

      onComplete(aiResult, uploadedUrls)
    }

    process()
  }, [files, onComplete, onError])

  return (
    <div className="flex flex-col items-center justify-center py-16">
      {/* Thumbnail strip */}
      <div className="mb-8 flex gap-2">
        {previews.slice(0, 4).map((src, i) => (
          <div key={i} className="relative size-14 overflow-hidden rounded-lg border border-border">
            <Image
              src={src}
              alt={`Photo ${i + 1}`}
              fill
              className="object-cover"
              unoptimized
            />
          </div>
        ))}
        {previews.length > 4 && (
          <div className="flex size-14 items-center justify-center rounded-lg border border-border bg-muted text-xs text-muted-foreground">
            +{previews.length - 4}
          </div>
        )}
      </div>

      {/* Spinner */}
      <Loader2 className="mb-4 size-10 animate-spin text-[#FF6B2B]" />

      {/* Rotating status text */}
      <p className="font-body text-sm text-muted-foreground animate-pulse">
        {STATUS_MESSAGES[statusIndex]}
      </p>
    </div>
  )
}
