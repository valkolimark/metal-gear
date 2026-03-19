'use client'

import {
  NotificationEducationModal,
  useNotificationEducation,
} from '@/components/notification-education-modal'

/**
 * Renders the notification education modal when triggered by post-onboarding URL param.
 * Place this in the main layout so it can detect ?onboarded=true.
 */
export function NotificationEducationTrigger() {
  const { showModal, setShowModal } = useNotificationEducation()

  return (
    <NotificationEducationModal open={showModal} onOpenChange={setShowModal} />
  )
}
