import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { MarketingHeader } from '@/components/layout/marketing-header'
import { Footer } from '@/components/layout/footer'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <MarketingHeader />
      <main className="flex flex-1 flex-col items-center justify-center px-4">
        <div className="flex max-w-2xl flex-col items-center gap-8 text-center">
          <Badge variant="secondary" className="font-body text-sm">
            Houston, TX Industrial Marketplace
          </Badge>
          <h1 className="font-display text-5xl font-bold tracking-tight text-foreground sm:text-6xl">
            Metal <span className="text-primary">Gear</span>
          </h1>
          <p className="font-body text-lg text-muted-foreground sm:text-xl">
            The industrial equipment marketplace for Houston, TX.
            <br />
            Buy and sell heavy machinery across oil &amp; gas, petrochemical,
            mining, manufacturing, and CNC machining.
          </p>
          <div className="flex flex-col gap-4 sm:flex-row">
            <Button asChild size="lg" className="font-body">
              <Link href="/signup">Get Started</Link>
            </Button>
            <Button asChild variant="outline" size="lg" className="font-body">
              <Link href="/login">Sign In</Link>
            </Button>
          </div>
          <p className="font-body text-sm text-muted-foreground">
            Free to list. Premium plans start at $29.99/mo.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  )
}
