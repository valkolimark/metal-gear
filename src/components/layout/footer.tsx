import Link from 'next/link'

const footerLinks = [
  { href: '/about', label: 'About' },
  { href: '/pricing', label: 'Pricing' },
  { href: '#', label: 'Privacy' },
  { href: '#', label: 'Terms' },
  { href: '#', label: 'Contact' },
]

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-4 px-4 py-8 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <Link
          href="/"
          className="font-display text-lg font-bold text-foreground"
        >
          Metal <span className="text-primary">Gear</span>
        </Link>

        <nav className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
          {footerLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="font-body text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="font-body text-sm text-muted-foreground">
          &copy; {new Date().getFullYear()} Metal Gear
        </p>
      </div>
    </footer>
  )
}
