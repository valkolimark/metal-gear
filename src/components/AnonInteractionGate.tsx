'use client'

import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Settings } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  open: boolean
  onClose: () => void
  action: 'offer' | 'contact' | 'save' | 'ask'
}

const copy = {
  offer: {
    title: 'Create a free account to make an offer',
    body: 'Join Metal Gear to contact sellers, make offers, and buy industrial equipment securely.',
  },
  contact: {
    title: 'Create a free account to contact sellers',
    body: 'Sign up free to message sellers directly about this listing.',
  },
  save: {
    title: 'Save listings with a free account',
    body: 'Create an account to save this listing and get alerts when prices change.',
  },
  ask: {
    title: 'Sign up to continue the conversation',
    body: "You've used your 3 free questions. Create a free account to ask unlimited questions.",
  },
}

export function AnonInteractionGate({ open, onClose, action }: Props) {
  const params = useParams<{ id: string }>()
  const redirect = encodeURIComponent(`/listings/${params.id}`)
  const { title, body } = copy[action]

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 font-display">
            <Settings className="size-5 text-primary" />
            {title}
          </DialogTitle>
          <DialogDescription className="font-body text-sm text-muted-foreground">
            {body}
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-3 pt-2">
          <Button asChild className="w-full font-body">
            <Link href={`/signup?redirect=${redirect}`}>
              Create Free Account
            </Link>
          </Button>
          <Button asChild variant="outline" className="w-full font-body">
            <Link href={`/login?redirect=${redirect}`}>
              Sign In
            </Link>
          </Button>
          <p className="text-center font-body text-xs text-muted-foreground">
            No credit card required. Free accounts include 3 listings.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  )
}
