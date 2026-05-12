'use client'

import Link from 'next/link'

export function FeedEmptyState() {
  return (
    <div className="mx-auto max-w-lg px-4 py-20 text-center">
      <div className="mb-4 text-5xl">&#9881;&#65039;</div>
      <h2 className="mb-3 font-display text-2xl font-semibold">
        Your feed is getting ready
      </h2>
      <p className="mb-6 text-muted-foreground">
        Tell us what equipment you&apos;re interested in and we&apos;ll surface the right
        listings, SOSs, and market signals for you.
      </p>
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Link
          href="/profile"
          className="inline-flex items-center justify-center rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Set Equipment Interests
        </Link>
        <Link
          href="/search"
          className="inline-flex items-center justify-center rounded-lg border border-border bg-card px-6 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-accent"
        >
          Browse All Listings
        </Link>
      </div>
    </div>
  )
}
