import Link from 'next/link'
import { Button } from '@/components/ui/button'

export function MarketingHeader() {
  return (
    <header className="border-b border-border bg-surface/95 backdrop-blur supports-[backdrop-filter]:bg-surface/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-display text-xl font-bold text-foreground"
        >
          Metal <span className="text-primary">Gear</span>
        </Link>

        <nav className="hidden items-center gap-6 sm:flex">
          <Link
            href="/pricing"
            className="font-body text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            Pricing
          </Link>
          <Link
            href="/about"
            className="font-body text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            About
          </Link>
        </nav>

        <div className="flex items-center gap-3">
          <Button asChild variant="ghost" size="sm" className="font-body">
            <Link href="/login">Sign In</Link>
          </Button>
          <Button asChild size="sm" className="font-body">
            <Link href="/signup">Get Started</Link>
          </Button>
        </div>
      </div>
    </header>
  )
}
