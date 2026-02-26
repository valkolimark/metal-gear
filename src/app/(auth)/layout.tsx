import Link from 'next/link'

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-center py-8">
        <Link href="/" className="font-display text-2xl font-bold text-foreground">
          Metal <span className="text-primary">Gear</span>
        </Link>
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16">
        {children}
      </main>
    </div>
  )
}
