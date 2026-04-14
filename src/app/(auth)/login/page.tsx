'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
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
import { Skeleton } from '@/components/ui/skeleton'
import { Separator } from '@/components/ui/separator'
import { OAuthButtons } from '@/components/auth/oauth-buttons'
import { getProvidersForEmail } from '@/app/actions/auth'
import { friendlyAuthError, providerLabel } from '@/lib/auth/errors'

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const redirectTo = searchParams.get('redirectTo') || '/dashboard'
  const callbackError = searchParams.get('error')
  const callbackProvider = searchParams.get('provider')
  const resetSuccess = searchParams.get('reset') === 'success'

  const initialError = (() => {
    if (callbackError === 'auth_callback_error') return 'Authentication failed. Please try again.'
    if (callbackError === 'wrong_method') {
      const provider = callbackProvider as 'email' | 'google' | 'apple' | null
      if (provider === 'email') {
        return 'This account uses email and password. Please log in with your password instead.'
      }
      if (provider === 'google') {
        return 'This account uses Google sign-in. Please continue with Google.'
      }
      if (provider === 'apple') {
        return 'This account uses Apple sign-in. Please continue with Apple.'
      }
      return 'This account uses a different sign-in method.'
    }
    return null
  })()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(initialError)
  const [methodHint, setMethodHint] = useState<'google' | 'apple' | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setMethodHint(null)
    setIsLoading(true)

    try {
      const supabase = createClient()
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        // Only probe identity providers when the credentials were wrong —
        // every other failure already has a specific cause.
        const isCredentialsError = /invalid login credentials|invalid_credentials/i.test(
          signInError.message
        )
        if (isCredentialsError && email) {
          try {
            const lookup = await getProvidersForEmail(email)
            if (lookup.exists && !lookup.hasPassword) {
              // Account exists but has no password identity → wrong method.
              if (lookup.primary === 'google' || lookup.primary === 'apple') {
                setMethodHint(lookup.primary)
                setError(
                  `This email is registered with ${providerLabel(lookup.primary)}. Please continue with ${lookup.primary === 'google' ? 'Google' : 'Apple'}.`
                )
                return
              }
            }
            if (!lookup.exists) {
              setError('No account found with that email.')
              return
            }
          } catch {
            // Lookup failures fall through to the generic friendly error below
          }
        }
        setError(friendlyAuthError(signInError.message))
        return
      }

      router.push(redirectTo)
      router.refresh()
    } catch {
      setError('An unexpected error occurred. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <CardTitle className="font-display text-2xl">Sign In</CardTitle>
        <CardDescription className="font-body">
          Welcome back to Metal Gear
        </CardDescription>
      </CardHeader>
      <CardContent>
        {resetSuccess && (
          <div className="mb-4 rounded-md border border-green-500/40 bg-green-500/10 px-3 py-2 font-body text-sm text-green-700 dark:text-green-400">
            Password updated. Please log in with your new password.
          </div>
        )}

        <div
          className={
            methodHint ? 'rounded-lg p-0.5 ring-2 ring-primary' : ''
          }
        >
          <OAuthButtons />
        </div>

        <div className="relative my-6">
          <Separator />
          <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 font-body text-xs text-muted-foreground">
            or continue with email
          </span>
        </div>

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

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="font-body">
                Password
              </Label>
              <Link
                href="/forgot-password"
                className="font-body text-sm text-primary hover:underline"
              >
                Forgot password?
              </Link>
            </div>
            <Input
              id="password"
              type="password"
              placeholder="Enter your password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoading}
              className="font-body"
            />
          </div>

          {error && (
            <p className="font-body text-sm text-destructive">{error}</p>
          )}

          <Button type="submit" className="w-full font-body" disabled={isLoading}>
            {isLoading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <p className="font-body text-sm text-muted-foreground">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary hover:underline">
            Create one
          </Link>
        </p>
      </CardFooter>
    </Card>
  )
}

function LoginSkeleton() {
  return (
    <Card className="w-full max-w-md">
      <CardHeader>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-4 w-48" />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-full" />
      </CardContent>
    </Card>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSkeleton />}>
      <LoginForm />
    </Suspense>
  )
}
