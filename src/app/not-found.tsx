import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Page Not Found',
}

export default function NotFound() {
  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center bg-background px-4"
      role="main"
      aria-label="Page not found"
    >
      <h1 className="font-display text-6xl font-bold text-primary">404</h1>
      <p className="mt-4 text-center font-body text-lg text-zinc-400">
        This equipment has been moved or doesn&apos;t exist.
      </p>
      <div className="mt-8 flex gap-4">
        <Link
          href="/"
          className="rounded-lg bg-primary px-6 py-3 font-body font-semibold text-white transition-colors hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background"
        >
          Back to Home
        </Link>
        <Link
          href="/search"
          className="rounded-lg border border-zinc-700 px-6 py-3 font-body font-semibold text-zinc-300 transition-colors hover:bg-zinc-800 focus:outline-none focus:ring-2 focus:ring-zinc-500 focus:ring-offset-2 focus:ring-offset-background"
        >
          Browse Equipment
        </Link>
      </div>
    </div>
  )
}
