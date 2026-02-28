'use client'

import * as Sentry from '@sentry/nextjs'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, RefreshCw, Home, ArrowLeft, Copy, CheckCircle2 } from 'lucide-react'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    Sentry.captureException(error)
  }, [error])

  function copyErrorInfo() {
    const info = [
      `Error: ${error.message}`,
      `Digest: ${error.digest ?? 'N/A'}`,
      `URL: ${window.location.href}`,
      `Time: ${new Date().toISOString()}`,
      `UA: ${navigator.userAgent}`,
    ].join('\n')
    navigator.clipboard.writeText(info)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center px-4">
      <div className="flex size-16 items-center justify-center rounded-full bg-primary/10">
        <AlertTriangle className="size-8 text-primary" />
      </div>
      <h1 className="mt-6 font-display text-3xl font-bold text-foreground">
        Something went wrong
      </h1>
      <p className="mt-3 max-w-md text-center font-body text-muted-foreground">
        An unexpected error occurred. Our team has been notified and is looking into it.
      </p>
      {error.digest && (
        <p className="mt-2 font-body text-xs text-muted-foreground">
          Error ID: <code className="rounded bg-surface px-1.5 py-0.5 text-foreground">{error.digest}</code>
        </p>
      )}
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 font-body font-semibold text-white transition-colors hover:bg-primary-hover"
        >
          <RefreshCw className="size-4" />
          Try Again
        </button>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 font-body font-semibold text-foreground transition-colors hover:bg-surface"
        >
          <ArrowLeft className="size-4" />
          Go Back
        </button>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-lg border border-border px-5 py-2.5 font-body font-semibold text-foreground transition-colors hover:bg-surface"
        >
          <Home className="size-4" />
          Dashboard
        </Link>
      </div>
      <button
        onClick={copyErrorInfo}
        className="mt-4 inline-flex items-center gap-1.5 font-body text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {copied ? (
          <>
            <CheckCircle2 className="size-3 text-green-400" />
            Copied
          </>
        ) : (
          <>
            <Copy className="size-3" />
            Copy error details
          </>
        )}
      </button>
    </div>
  )
}
