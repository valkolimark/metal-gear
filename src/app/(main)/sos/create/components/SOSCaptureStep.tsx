'use client'

import { useState, useRef } from 'react'
import { Camera, Paperclip, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Image from 'next/image'

const MAX_PHOTOS = 10
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

interface SOSCaptureStepProps {
  capturedFiles: File[]
  onFilesChange: (files: File[]) => void
  onAnalyze: () => void
  onSkip: () => void
}

function isMobile() {
  return typeof window !== 'undefined' && /Mobi|Android/i.test(navigator.userAgent)
}

export function SOSCaptureStep({ capturedFiles, onFilesChange, onAnalyze, onSkip }: SOSCaptureStepProps) {
  const cameraInputRef = useRef<HTMLInputElement>(null)
  const uploadInputRef = useRef<HTMLInputElement>(null)
  const [previews, setPreviews] = useState<string[]>([])

  const validateAndAddFiles = (fileList: FileList | null) => {
    if (!fileList) return
    const remaining = MAX_PHOTOS - capturedFiles.length
    if (remaining <= 0) {
      toast.error(`Maximum ${MAX_PHOTOS} photos allowed`)
      return
    }

    const newFiles: File[] = []
    const newPreviews: string[] = []

    for (let i = 0; i < Math.min(fileList.length, remaining); i++) {
      const file = fileList[i]
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file.')
        continue
      }
      if (file.size > MAX_FILE_SIZE) {
        toast.error('Image must be under 10MB.')
        continue
      }
      newFiles.push(file)
      newPreviews.push(URL.createObjectURL(file))
    }

    if (newFiles.length > 0) {
      onFilesChange([...capturedFiles, ...newFiles])
      setPreviews(prev => [...prev, ...newPreviews])
    }
  }

  const removeFile = (index: number) => {
    URL.revokeObjectURL(previews[index])
    onFilesChange(capturedFiles.filter((_, i) => i !== index))
    setPreviews(prev => prev.filter((_, i) => i !== index))
  }

  const hasFiles = capturedFiles.length > 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-display text-2xl font-bold text-foreground">
          <span className="text-[#FF6B2B]">Send SOS</span> Broadcast
        </h1>
        <p className="mt-1 font-body text-sm text-muted-foreground">
          Get your urgent equipment need in front of the right vendors immediately.
        </p>
      </div>

      {/* Primary capture zone */}
      {!hasFiles && (
        <button
          type="button"
          onClick={() => cameraInputRef.current?.click()}
          className="flex w-full min-h-[200px] flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-[#FF6B2B]/40 bg-[#FF6B2B]/5 p-8 transition-colors hover:border-[#FF6B2B]/60 hover:bg-[#FF6B2B]/10"
        >
          <div className="flex size-16 items-center justify-center rounded-full bg-[#FF6B2B]/10">
            <Camera className="size-8 text-[#FF6B2B]" />
          </div>
          <div className="text-center">
            <p className="font-display text-base font-semibold text-foreground">Take a Photo</p>
            <p className="mt-0.5 font-body text-sm text-muted-foreground">
              or tap to upload from gallery
            </p>
          </div>
        </button>
      )}

      {/* Camera input (with capture on mobile) */}
      <input
        ref={cameraInputRef}
        type="file"
        accept="image/*"
        multiple
        {...(isMobile() ? { capture: 'environment' as const } : {})}
        onChange={(e) => {
          validateAndAddFiles(e.target.files)
          e.target.value = ''
        }}
        className="hidden"
        style={{ fontSize: '16px' }}
      />

      {/* Upload input (no capture attribute) */}
      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        multiple
        onChange={(e) => {
          validateAndAddFiles(e.target.files)
          e.target.value = ''
        }}
        className="hidden"
        style={{ fontSize: '16px' }}
      />

      {/* Upload from files button (shown when no files yet) */}
      {!hasFiles && (
        <Button
          variant="outline"
          onClick={() => uploadInputRef.current?.click()}
          className="w-full gap-2"
        >
          <Paperclip className="size-4" />
          Upload from Files
        </Button>
      )}

      {/* Thumbnail previews */}
      {hasFiles && (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2">
            {previews.map((src, i) => (
              <div key={i} className="relative aspect-square overflow-hidden rounded-lg border border-border">
                <Image
                  src={src}
                  alt={`Photo ${i + 1}`}
                  fill
                  className="object-cover"
                  unoptimized
                />
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-full bg-black/60 text-white transition-colors hover:bg-black/80"
                >
                  <X className="size-3.5" />
                </button>
              </div>
            ))}
          </div>

          {capturedFiles.length < MAX_PHOTOS && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => uploadInputRef.current?.click()}
              className="gap-1"
            >
              <Camera className="size-3.5" />
              Add another photo ({capturedFiles.length}/{MAX_PHOTOS})
            </Button>
          )}

          {/* Analyze CTA */}
          <Button
            onClick={onAnalyze}
            disabled={capturedFiles.length === 0}
            className="w-full gap-2 bg-[#FF6B2B] text-white hover:bg-[#FF6B2B]/90"
            size="lg"
          >
            Analyze Equipment
            <ArrowRight className="size-4" />
          </Button>
        </div>
      )}

      {/* Skip link */}
      <div className="text-center">
        <button
          type="button"
          onClick={onSkip}
          className="font-body text-sm text-muted-foreground hover:text-foreground"
        >
          Skip — describe it in text instead &rarr;
        </button>
      </div>
    </div>
  )
}
