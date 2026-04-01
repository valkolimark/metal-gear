'use client'

import { Share2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

interface Props {
  collectionId: string
  isPublic: boolean
  isOwner: boolean
}

export function RadarListActions({ collectionId, isPublic, isOwner }: Props) {
  function handleShare() {
    navigator.clipboard.writeText(`${window.location.origin}/radar/${collectionId}`)
    toast.success('Link copied to clipboard')
  }

  if (!isPublic) return null

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleShare}
      className="font-body"
    >
      <Share2 className="mr-1.5 size-3.5" />
      Share
    </Button>
  )
}
