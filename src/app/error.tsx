'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect } from 'react'
import Link from 'next/link'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <h1 className="font-display text-4xl font-bold text-primary">
        Something went wrong
      </h1>
      <p className="mt-4 max-w-md text-center font-body text-muted-foreground">
        An unexpected error occurred. Our team has been notified and is looking
        into it.
      </p>
      <div className="mt-8 flex gap-4">
        <button
          onClick={reset}
          className="rounded-lg bg-primary px-6 py-3 font-body font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          Try Again
        </button>
        <Link
          href="/dashboard"
          className="rounded-lg border border-border px-6 py-3 font-body font-semibold text-foreground transition-colors hover:bg-accent"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  )
}
