'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  softDeleteAccount,
  hardDeleteAccount,
  getDeleteAccountWarnings,
  deleteOrphanedAuthUser,
} from '@/app/actions/admin-delete-account'

type Mode = 'none' | 'soft' | 'hard'

export function DeleteAccountPanel({
  userId,
  userName,
  hasProfile = true,
  adminUserId,
  onDeleted,
}: {
  userId: string
  userName: string
  hasProfile?: boolean
  adminUserId?: string
  onDeleted?: () => void
}) {
  const [mode, setMode] = useState<Mode>('none')
  const [reason, setReason] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [warnings, setWarnings] = useState<string[]>([])

  useEffect(() => {
    if (mode === 'hard') {
      getDeleteAccountWarnings(userId).then(result => {
        setWarnings(result.warnings)
      })
    }
  }, [mode, userId])

  async function handleSoftDelete() {
    setLoading(true)
    setError(null)
    const result = await softDeleteAccount(userId, reason.trim())
    if (result.success) {
      toast.success('Account archived successfully')
      onDeleted?.()
    } else {
      setError(result.error || 'Failed to archive account')
    }
    setLoading(false)
  }

  async function handleHardDelete() {
    setLoading(true)
    setError(null)
    const result = await hardDeleteAccount(userId, confirmText, reason.trim())
    if (result.success) {
      if (result.warnings?.length) {
        result.warnings.forEach(w => toast.warning(w))
      }
      if (result.authDeleteFailed) {
        toast.warning('Account data deleted. Auth record cleanup failed — use the "Delete Auth Record" button to retry.')
        window.location.reload()
      } else {
        toast.success('Account permanently deleted')
        onDeleted?.()
      }
    } else {
      setError(result.error || 'Failed to delete account')
    }
    setLoading(false)
  }

  async function handleDeleteOrphanedAuth() {
    if (!adminUserId) return
    setLoading(true)
    setError(null)
    const result = await deleteOrphanedAuthUser(userId, adminUserId)
    if (result.success) {
      toast.success('Auth record deleted')
      onDeleted?.()
    } else {
      setError(result.error || 'Failed to delete auth record')
    }
    setLoading(false)
  }

  // ── Orphaned auth record mode ──
  if (!hasProfile) {
    return (
      <div className="border border-amber-500/40 rounded-lg p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold text-amber-400 font-display mb-1">
            Orphaned Auth Record
          </h3>
          <p className="text-xs text-muted-foreground font-body">
            This account&apos;s data has been deleted but the authentication record still exists.
            The user cannot log in, but the auth record should be cleaned up.
          </p>
        </div>

        {error && <p className="text-xs text-destructive font-body">{error}</p>}

        <Button
          variant="destructive"
          size="sm"
          disabled={loading || !adminUserId}
          onClick={handleDeleteOrphanedAuth}
          className="font-body"
        >
          {loading ? 'Deleting...' : 'Delete Auth Record'}
        </Button>
      </div>
    )
  }

  // ── Mode selection ──
  if (mode === 'none') {
    return (
      <div className="border border-destructive/30 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-destructive font-display mb-1">Delete Account</h3>
        <p className="text-xs text-muted-foreground font-body mb-4">
          Choose how to handle this account. Soft delete is reversible. Hard delete is permanent.
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 font-body"
            onClick={() => setMode('soft')}
          >
            Archive Account
          </Button>
          <Button
            variant="destructive"
            size="sm"
            className="flex-1 font-body"
            onClick={() => setMode('hard')}
          >
            Permanently Delete
          </Button>
        </div>
      </div>
    )
  }

  // ── Soft Delete ──
  if (mode === 'soft') {
    return (
      <div className="border border-orange-500/40 rounded-lg p-4 space-y-3">
        <div>
          <h3 className="text-sm font-semibold font-display mb-1">Archive Account</h3>
          <p className="text-xs text-muted-foreground font-body">
            {userName} will be banned immediately and cannot log in. All listings will be
            archived. SOS requests will be closed. <strong>This can be reversed.</strong>
          </p>
        </div>

        <div>
          <label className="text-xs font-medium font-body">Reason (required)</label>
          <Textarea
            value={reason}
            onChange={e => setReason(e.target.value)}
            placeholder="Reason for archiving this account..."
            className="mt-1 font-body text-sm"
            rows={2}
          />
        </div>

        {error && <p className="text-xs text-destructive font-body">{error}</p>}

        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="font-body"
            onClick={() => { setMode('none'); setReason(''); setError(null) }}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={!reason.trim() || loading}
            onClick={handleSoftDelete}
            className="flex-1 bg-orange-500 text-white hover:bg-orange-600 font-body"
          >
            {loading ? 'Archiving...' : 'Archive Account'}
          </Button>
        </div>
      </div>
    )
  }

  // ── Hard Delete ──
  return (
    <div className="border border-destructive rounded-lg p-4 space-y-3 bg-destructive/5">
      <div>
        <h3 className="text-sm font-semibold text-destructive font-display mb-1">
          Permanently Delete Account
        </h3>
        <p className="text-xs text-muted-foreground font-body">
          This will permanently delete <strong>{userName}</strong>&apos;s account, all listings,
          SOS requests, messages, and credit records. Reviews they wrote will be deleted.
          Reviews about them will be anonymized. <strong>This cannot be undone.</strong>
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="rounded-md border border-orange-500/40 bg-orange-500/10 p-3 space-y-1">
          {warnings.map((w, i) => (
            <p key={i} className="text-xs text-orange-400 font-body">Warning: {w}</p>
          ))}
        </div>
      )}

      <div className="text-xs bg-muted rounded-md p-3 space-y-1 font-body">
        <p className="font-medium">What gets deleted:</p>
        <ul className="space-y-0.5 text-muted-foreground">
          <li>Profile and authentication</li>
          <li>All listings and listing images (queued for R2 cleanup)</li>
          <li>SOS requests, notifications, saved searches</li>
          <li>Reviews they wrote as a buyer</li>
          <li>Credit records and purchase history</li>
          <li>Company memberships and invites</li>
        </ul>
        <p className="font-medium mt-2">What is preserved/anonymized:</p>
        <ul className="space-y-0.5 text-muted-foreground">
          <li>Reviews about them (seller anonymized)</li>
          <li>Their messages (replaced with &quot;[Message from deleted account]&quot;)</li>
          <li>Conversations (remain for the other party)</li>
        </ul>
      </div>

      <div>
        <label className="text-xs font-medium font-body">Reason (required)</label>
        <Textarea
          value={reason}
          onChange={e => setReason(e.target.value)}
          placeholder="Reason for permanent deletion..."
          className="mt-1 font-body text-sm"
          rows={2}
        />
      </div>

      <div>
        <label className="text-xs font-medium text-destructive font-body">
          Type <strong>DELETE</strong> to confirm
        </label>
        <Input
          type="text"
          value={confirmText}
          onChange={e => setConfirmText(e.target.value)}
          placeholder="DELETE"
          className="mt-1 font-mono text-sm border-destructive/50"
        />
      </div>

      {error && <p className="text-xs text-destructive font-body">{error}</p>}

      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          className="font-body"
          onClick={() => { setMode('none'); setReason(''); setConfirmText(''); setError(null) }}
        >
          Cancel
        </Button>
        <Button
          variant="destructive"
          size="sm"
          disabled={confirmText !== 'DELETE' || !reason.trim() || loading}
          onClick={handleHardDelete}
          className="flex-1 font-body"
        >
          {loading ? 'Deleting permanently...' : 'Permanently Delete Account'}
        </Button>
      </div>
    </div>
  )
}
