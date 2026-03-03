import Link from 'next/link'

export const metadata = {
  title: 'Setup Your Account | Metal Gear',
}

export default function OnboardingLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="flex items-center justify-center border-b border-border py-4">
        <Link href="/" className="font-display text-2xl font-bold text-foreground">
          Metal <span className="text-primary">Gear</span>
        </Link>
      </header>
      <main className="flex flex-1 flex-col">
        {children}
      </main>
    </div>
  )
}
