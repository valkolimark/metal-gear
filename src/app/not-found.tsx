import Link from 'next/link'

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0F]">
      <h1 className="font-display text-6xl font-bold text-[#FF6B2B]">404</h1>
      <p className="mt-4 font-body text-lg text-zinc-400">
        This equipment has been moved or doesn&apos;t exist.
      </p>
      <Link
        href="/"
        className="mt-8 rounded-lg bg-[#FF6B2B] px-6 py-3 font-body font-semibold text-white transition-colors hover:bg-[#e55e25]"
      >
        Back to Home
      </Link>
    </div>
  )
}
