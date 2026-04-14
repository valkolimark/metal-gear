'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { friendlyAuthError } from '@/lib/auth/errors'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  // Recovery-session check: Supabase sets a session on the reset-link click
  // via /callback. If a user lands on /reset-password without that session,
  // their link is expired or they typed the URL directly — bounce them back.
  const [checking, setChecking] = useState(true)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    let cancelled = false
    supabase.auth.getUser().then(({ data, error: getUserError }) => {
      if (cancelled) return
      if (getUserError || !data.user) {
        // No recovery session — send them back to request a new link.
        router.replace(
          '/forgot-password?error=This+reset+link+has+expired+or+is+invalid.+Please+request+a+new+one.'
        )
        return
      }
      setHasSession(true)
      setChecking(false)
    })
    return () => {
      cancelled = true
    }
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }

    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error: updateError } = await supabase.auth.updateUser({
        password,
      })

      if (updateError) {
        setError(friendlyAuthError(updateError.message))
        return
      }

      // Sign out of the recovery session so the user explicitly logs in
      // again with their new password. This makes the reset feel like a
      // reset instead of a silent login.
      await supabase.auth.signOut()

      // Full navigation (not router.push) so middleware re-runs against a
      // cleared session cookie before the login page mounts.
      window.location.assign('/login?reset=success')
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (checking) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Checking reset link…</CardTitle>
          <CardDescription className="font-body">
            One moment while we verify your reset link.
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  if (!hasSession) {
    // useEffect already redirected; render nothing to avoid a flash of the form.
    return null
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-display text-2xl">Set New Password</CardTitle>
        <CardDescription className="font-body">
          Enter your new password below. You&apos;ll log in again with it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="password" className="font-body">
              New Password
            </Label>
            <Input
              id="password"
              type="password"
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              disabled={isLoading}
              className="font-body"
            />
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="confirmPassword" className="font-body">
              Confirm New Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={8}
              disabled={isLoading}
              className="font-body"
            />
          </div>

          {error && (
            <p className="font-body text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full font-body" disabled={isLoading}>
            {isLoading ? 'Updating...' : 'Update Password'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
