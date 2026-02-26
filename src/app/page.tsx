import Link from 'next/link'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#0A0A0F] px-4">
      <main className="flex max-w-2xl flex-col items-center gap-8 text-center">
        <h1 className="font-display text-5xl font-bold tracking-tight text-white sm:text-6xl">
          Metal <span className="text-[#FF6B2B]">Gear</span>
        </h1>
        <p className="font-body text-lg text-zinc-400 sm:text-xl">
          The industrial equipment marketplace for Houston, TX.
          <br />
          Buy and sell heavy machinery across oil &amp; gas, petrochemical,
          mining, manufacturing, and CNC machining.
        </p>
        <div className="flex flex-col gap-4 sm:flex-row">
          <Link
            href="/signup"
            className="rounded-lg bg-[#FF6B2B] px-8 py-3 font-body font-semibold text-white transition-colors hover:bg-[#e55e25]"
          >
            Get Started
          </Link>
          <Link
            href="/login"
            className="rounded-lg border border-zinc-700 px-8 py-3 font-body font-semibold text-zinc-300 transition-colors hover:border-zinc-500 hover:text-white"
          >
            Sign In
          </Link>
        </div>
        <p className="font-body text-sm text-zinc-600">
          Free to list. Premium plans start at $29.99/mo.
        </p>
      </main>
    </div>
  )
}
