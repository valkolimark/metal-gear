'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { sendCompanyInvite } from '@/app/actions/invites'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import Link from 'next/link'

interface InviteFormProps {
  companyId: string
  userId: string
  atSeatLimit: boolean
  seatLimit: number
  memberCount: number
}

export function InviteForm({ companyId, userId, atSeatLimit, seatLimit, memberCount }: InviteFormProps) {
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<'admin' | 'member'>('member')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleSubmit() {
    if (!email.trim()) return
    setLoading(true)
    const result = await sendCompanyInvite(companyId, userId, email, role)
    if (result.success) {
      toast.success(`Invite sent to ${email}`)
      setEmail('')
      router.refresh()
    } else {
      toast.error(result.error ?? 'Failed to send invite')
    }
    setLoading(false)
  }

  if (atSeatLimit) {
    return (
      <div className="rounded-xl border border-border bg-muted/30 p-4 text-sm">
        <p className="font-medium mb-1">Seat limit reached ({memberCount}/{seatLimit})</p>
        <p className="text-muted-foreground mb-3">
          Upgrade your plan to add more team members.
        </p>
        <Button size="sm" asChild>
          <Link href="/pricing">Upgrade Plan</Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          type="email"
          placeholder="colleague@company.com"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="flex-1"
          onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        />
        <Select value={role} onValueChange={(v: string) => setRole(v as 'admin' | 'member')}>
          <SelectTrigger className="w-28">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="member">Member</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
          </SelectContent>
        </Select>
        <Button
          onClick={handleSubmit}
          disabled={loading || !email.trim()}
          className="bg-[#1877F2] hover:bg-[#1565d8]"
        >
          {loading ? 'Sending...' : 'Invite'}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        They&apos;ll receive an email with a link to join your company. Invite expires in 7 days.
      </p>
    </div>
  )
}
