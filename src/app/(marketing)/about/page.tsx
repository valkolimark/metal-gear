import type { Metadata } from 'next'
import {
  Factory,
  Search,
  MessageSquare,
  ShieldCheck,
  Truck,
  Users,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export const metadata: Metadata = {
  title: 'About',
  description:
    'Learn about Metal Gear — the industrial equipment marketplace built for Houston and the Gulf Coast.',
}

const howItWorks = [
  {
    icon: Search,
    title: 'Browse & Search',
    description:
      'Search thousands of industrial equipment listings by category, location, condition, and price. Find exactly what you need with advanced filters.',
  },
  {
    icon: MessageSquare,
    title: 'Connect Directly',
    description:
      'Message sellers directly through our built-in messaging system. Ask questions, negotiate pricing, and arrange inspections.',
  },
  {
    icon: ShieldCheck,
    title: 'Deal with Confidence',
    description:
      'Verified dealer badges, seller ratings, and transparent listing details help you make informed purchasing decisions.',
  },
]

const values = [
  {
    icon: Factory,
    title: 'Built for Industry',
    description:
      'Designed specifically for heavy equipment — not a generic classified site. Every feature serves the needs of industrial buyers and sellers.',
  },
  {
    icon: Users,
    title: 'Houston-Rooted',
    description:
      'Centered on the greater Houston area and the Gulf Coast industrial corridor, connecting the businesses that power American industry.',
  },
  {
    icon: Truck,
    title: 'All Equipment Types',
    description:
      'From CNC machines and welding rigs to forklifts and compressors — if it keeps a shop running, it belongs on Metal Gear.',
  },
]

export default function AboutPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-20 px-4 py-16 sm:px-6 lg:px-8">
      {/* Hero */}
      <section className="text-center">
        <h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">
          About Metal <span className="text-primary">Gear</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl font-body text-lg text-muted-foreground">
          The industrial equipment marketplace built for Houston and the Gulf
          Coast. We connect buyers and sellers of heavy machinery, shop
          equipment, and industrial tools.
        </p>
      </section>

      {/* Mission */}
      <section className="rounded-xl border border-border bg-card p-8 sm:p-12">
        <h2 className="font-display text-2xl font-bold text-foreground">
          Our Mission
        </h2>
        <p className="mt-4 font-body text-muted-foreground leading-relaxed">
          Industrial equipment changes hands every day — shops close, companies
          upgrade, surplus inventory sits idle. But finding or selling that
          equipment is still stuck in the past: word of mouth, auction houses
          with steep fees, or generic sites where a lathe sits next to a used
          couch.
        </p>
        <p className="mt-4 font-body text-muted-foreground leading-relaxed">
          Metal Gear exists to fix that. We built a marketplace that speaks the
          language of industry — with categories, specifications, and search
          tools designed for people who know the difference between a turret
          lathe and an engine lathe. No auction fees. No middlemen. Just direct
          connections between buyers and sellers.
        </p>
      </section>

      {/* How It Works */}
      <section>
        <h2 className="text-center font-display text-2xl font-bold text-foreground">
          How It Works
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {howItWorks.map((step, i) => (
            <Card key={step.title} className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <step.icon className="size-5 text-primary" />
                </div>
                <p className="mt-1 font-body text-xs text-muted-foreground">
                  Step {i + 1}
                </p>
                <h3 className="mt-2 font-display text-lg font-semibold text-foreground">
                  {step.title}
                </h3>
                <p className="mt-2 font-body text-sm text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Values */}
      <section>
        <h2 className="text-center font-display text-2xl font-bold text-foreground">
          Why Metal Gear
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {values.map((value) => (
            <Card key={value.title} className="border-border bg-card">
              <CardContent className="p-6">
                <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                  <value.icon className="size-5 text-primary" />
                </div>
                <h3 className="mt-3 font-display text-lg font-semibold text-foreground">
                  {value.title}
                </h3>
                <p className="mt-2 font-body text-sm text-muted-foreground leading-relaxed">
                  {value.description}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Contact / Support */}
      <section
        id="contact"
        className="rounded-xl border border-border bg-card p-8 text-center sm:p-12"
      >
        <h2 className="font-display text-2xl font-bold text-foreground">
          Contact & Support
        </h2>
        <p className="mx-auto mt-4 max-w-xl font-body text-muted-foreground">
          Have questions, feedback, or need help with your account? Reach out and
          we&rsquo;ll get back to you as soon as possible.
        </p>
        <a
          href="mailto:support@metal-gear.app"
          className="mt-6 inline-block rounded-lg bg-primary px-8 py-3 font-body font-semibold text-white transition-colors hover:bg-primary/90"
        >
          support@metal-gear.app
        </a>
        <p className="mt-4 font-body text-sm text-muted-foreground">
          Houston, TX
        </p>
      </section>
    </div>
  )
}
