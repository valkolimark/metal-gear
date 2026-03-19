'use client'

import { useState, useEffect, useCallback } from 'react'
import { Bell, CheckCircle, XCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

const SEEN_KEY = 'mg-notification-education-seen'

function hasSeen(): boolean {
  if (typeof window === 'undefined') return true
  return localStorage.getItem(SEEN_KEY) === 'true'
}

function markSeen() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(SEEN_KEY, 'true')
  }
}

type ModalState = 'prompt' | 'granted' | 'denied'

export function NotificationEducationModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const [state, setState] = useState<ModalState>('prompt')

  const handleEnable = useCallback(async () => {
    try {
      const result = await Notification.requestPermission()
      if (result === 'granted') {
        setState('granted')
        setTimeout(() => onOpenChange(false), 2000)
      } else {
        setState('denied')
      }
    } catch {
      setState('denied')
    }
    markSeen()
  }, [onOpenChange])

  const handleNotNow = useCallback(() => {
    markSeen()
    onOpenChange(false)
  }, [onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        {state === 'prompt' && (
          <>
            <DialogHeader>
              <div className="mb-2 flex size-12 items-center justify-center rounded-full bg-primary/10">
                <Bell className="size-6 text-primary" />
              </div>
              <DialogTitle className="font-display text-xl">
                Don&apos;t miss urgent opportunities
              </DialogTitle>
              <DialogDescription className="text-left">
                Metal Gear members who enable notifications:
              </DialogDescription>
            </DialogHeader>
            <ul className="space-y-2 text-sm text-foreground">
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">•</span>
                Receive SOS alerts when someone urgently needs equipment you have
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">•</span>
                Get first-response advantage on high-value requests
              </li>
              <li className="flex items-start gap-2">
                <span className="mt-0.5 text-primary">•</span>
                See offer activity on your listings in real-time
              </li>
            </ul>
            <p className="text-xs text-muted-foreground">
              High-value SOS requests (often $50K–$500K equipment needs) go to
              whoever responds first. Notifications are how you stay ahead.
            </p>
            <div className="mt-2 flex gap-3">
              <Button onClick={handleEnable} className="flex-1 font-body">
                Enable Notifications
              </Button>
              <Button
                variant="outline"
                onClick={handleNotNow}
                className="font-body"
              >
                Not Now
              </Button>
            </div>
          </>
        )}

        {state === 'granted' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <CheckCircle className="size-12 text-green-500" />
            <DialogTitle className="font-display text-lg">
              Notifications enabled
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              You&apos;ll now receive real-time alerts for SOS requests, messages, and offers.
            </p>
          </div>
        )}

        {state === 'denied' && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <XCircle className="size-12 text-muted-foreground" />
            <DialogTitle className="font-display text-lg">
              Notifications blocked
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              To enable notifications later, click the lock icon in your browser&apos;s
              address bar and allow notifications for this site.
            </p>
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="mt-2 font-body"
            >
              Got it
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Hook to manage notification education modal visibility.
 * Shows modal after onboarding or on first bell click when permission is 'default'.
 */
export function useNotificationEducation() {
  const [showModal, setShowModal] = useState(false)

  const triggerIfNeeded = useCallback(() => {
    if (typeof window === 'undefined') return
    if (!('Notification' in window)) return
    if (Notification.permission !== 'default') return
    if (hasSeen()) return
    setShowModal(true)
  }, [])

  // Check if we should show after onboarding (via URL param)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    if (params.get('onboarded') === 'true') {
      // Small delay so the page loads first
      setTimeout(triggerIfNeeded, 1500)
    }
  }, [triggerIfNeeded])

  const notificationPermission =
    typeof window !== 'undefined' && 'Notification' in window
      ? Notification.permission
      : 'default'

  return {
    showModal,
    setShowModal,
    triggerIfNeeded,
    notificationPermission,
    hasSeenEducation: hasSeen(),
  }
}
