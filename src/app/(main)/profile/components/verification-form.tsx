'use client'

import { useState, useRef } from 'react'
import { Loader2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { submitVerificationRequest } from '@/app/actions/verification'

interface VerificationFormProps {
  userId: string
  onSubmitted?: () => void
}

export function VerificationForm({ userId, onSubmitted }: VerificationFormProps) {
  const [bizName, setBizName] = useState('')
  const [ein, setEin] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const docRef = useRef<HTMLInputElement>(null)

  function handleEinChange(e: React.ChangeEvent<HTMLInputElement>) {
    const digits = e.target.value.replace(/\D/g, '')
    const capped = digits.slice(0, 9)
    const formatted =
      capped.length > 2 ? `${capped.slice(0, 2)}-${capped.slice(2)}` : capped
    setEin(formatted)
  }

  const einValid = /^\d{2}-\d{7}$/.test(ein)

  async function handleSubmit() {
    if (!bizName.trim() || !einValid) return
    setSubmitting(true)
    try {
      let docFd: FormData | undefined
      const file = docRef.current?.files?.[0]
      if (file) {
        if (file.size > 10 * 1024 * 1024) {
          toast.error('Document must be under 10MB')
          setSubmitting(false)
          return
        }
        docFd = new FormData()
        docFd.append('file', file)
      }
      const result = await submitVerificationRequest(bizName.trim(), ein, docFd)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success('Verification request submitted')
        onSubmitted?.()
      }
    } catch {
      toast.error('Failed to submit verification')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-3">
      <p className="font-body text-sm text-muted-foreground">
        Get verified to earn buyer trust and display a verified badge. Provide
        your EIN and a supporting document (W-9, EIN confirmation letter, or
        business license). Approval typically takes 1-2 business days.
      </p>

      <div className="space-y-2">
        <Label htmlFor="biz_name" className="font-body">
          Business Name
        </Label>
        <Input
          id="biz_name"
          value={bizName}
          onChange={(e) => setBizName(e.target.value)}
          placeholder="Your registered business name"
          className="font-body"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="ein" className="font-body">
          EIN / Tax ID
        </Label>
        <Input
          id="ein"
          value={ein}
          onChange={handleEinChange}
          placeholder="12-3456789"
          maxLength={10}
          inputMode="numeric"
          autoComplete="off"
          className="font-body"
        />
        <p className="font-body text-[10px] text-muted-foreground">
          Format: XX-XXXXXXX. Your tax ID is hashed before storage and never
          stored in plain text.
        </p>
      </div>

      <div className="space-y-2">
        <Label className="font-body">Supporting Document (optional)</Label>
        <input
          ref={docRef}
          type="file"
          accept=".pdf,.jpg,.jpeg,.png"
          className="block w-full font-body text-sm text-muted-foreground file:mr-3 file:rounded-md file:border-0 file:bg-primary/20 file:px-3 file:py-1.5 file:font-body file:text-xs file:text-primary"
        />
        <p className="font-body text-[10px] text-muted-foreground">
          W-9, EIN confirmation letter, or business license. PDF, JPG, or PNG up
          to 10MB.
        </p>
      </div>

      <Button
        type="button"
        disabled={submitting || !bizName.trim() || !einValid}
        onClick={handleSubmit}
        className="font-body"
      >
        {submitting ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Upload className="mr-2 size-4" />
            Submit for Verification
          </>
        )}
      </Button>
    </div>
  )
}
