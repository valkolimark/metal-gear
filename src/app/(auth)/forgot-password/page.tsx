'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { getProvidersForEmail } from '@/app/actions/auth'
import { friendlyAuthError } from '@/lib/auth/errors'

function ForgotPasswordForm() {
  const searchParams = useSearchParams()
  const queryError = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(queryError)
  const [isLoading, setIsLoading] = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      // Check whether the account uses OAuth before triggering a reset email.
      // If it does, we tell the user to use the OAuth button — no reset email
      // is sent because there is no password to reset.
      const lookup = await getProvidersForEmail(email)
      if (lookup.exists && !lookup.hasPassword) {
        if (lookup.primary === 'google') {
          setError(
            'This account uses Google sign-in. Password reset is not available — please continue with Google on the sign-in page.'
          )
          return
        }
        if (lookup.primary === 'apple') {
          setError(
            'This account uses Apple sign-in. Password reset is not available — please continue with Apple on the sign-in page.'
          )
          return
        }
      }

      const supabase = createClient()
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/callback?next=/reset-password`,
        }
      )

      if (resetError) {
        setError(friendlyAuthError(resetError.message))
        return
      }

      setEmailSent(true)
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  if (emailSent) {
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="font-display text-2xl">Check your email</CardTitle>
          <CardDescription className="font-body">
            If an account exists for{' '}
            <span className="font-semibold text-foreground">{email}</span>,
            we sent a password reset link.
          </CardDescription>
        </CardHeader>
        <CardFooter>
          <Button variant="outline" className="w-full font-body" asChild>
            <Link href="/login">Back to Sign In</Link>
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-display text-2xl">Reset Password</CardTitle>
        <CardDescription className="font-body">
          Enter your email and we&apos;ll send you a reset link
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="email" className="font-body">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="ron@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
              className="font-body"
            />
          </div>

          {error && (
            <p className="font-body text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full font-body" disabled={isLoading}>
            {isLoading ? 'Sending...' : 'Send Reset Link'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="font-body text-sm text-muted-foreground">
          Remember your password?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={null}>
      <ForgotPasswordForm />
    </Suspense>
  )
}
