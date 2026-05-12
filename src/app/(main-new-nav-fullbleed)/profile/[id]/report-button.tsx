'use client'

import { useState } from 'react'
import { Flag, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/stores/auth-store'
import { submitReport } from '@/app/actions/reputation'

const REPORT_REASONS = [
  'Spam or misleading',
  'Fraudulent listing',
  'Inappropriate content',
  'Harassment',
  'Impersonation',
  'Other',
]

export function ReportButton({
  targetType,
  targetId,
}: {
  targetType: 'listing' | 'user'
  targetId: string
}) {
  const { user } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (!user || user.id === targetId) return null

  async function handleSubmit() {
    if (!reason) {
      toast.error('Please select a reason')
      return
    }

    setSubmitting(true)
    const result = await submitReport(targetType, targetId, reason, details)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Report submitted. We will review it shortly.')
      setOpen(false)
      setReason('')
      setDetails('')
    }
    setSubmitting(false)
  }

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        onClick={() => setOpen(true)}
        className="shrink-0 text-muted-foreground hover:text-destructive"
        title={`Report ${targetType}`}
      >
        <Flag className="size-4" />
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">
              Report {targetType === 'listing' ? 'Listing' : 'User'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="font-body">Reason</Label>
              <Select value={reason} onValueChange={setReason}>
                <SelectTrigger className="font-body">
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  {REPORT_REASONS.map((r) => (
                    <SelectItem key={r} value={r} className="font-body">
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="font-body">Details (optional)</Label>
              <Textarea
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="Provide additional details..."
                rows={3}
                className="font-body"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              className="font-body"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!reason || submitting}
              variant="destructive"
              className="font-body"
            >
              {submitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Flag className="mr-2 size-4" />
              )}
              Submit Report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
