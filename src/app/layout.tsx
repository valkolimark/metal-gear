import type { Metadata } from 'next'
import { chakraPetch, manrope } from '@/styles/fonts'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/components/providers/auth-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'Metal Gear — Industrial Equipment Marketplace',
    template: '%s | Metal Gear',
  },
  description:
    'Buy and sell used industrial equipment in Houston, TX. Oil & gas, petrochemical, mining, manufacturing, and CNC machining.',
  keywords: [
    'industrial equipment',
    'heavy machinery',
    'Houston',
    'used equipment',
    'CNC machines',
    'oil and gas',
    'manufacturing equipment',
    'marketplace',
  ],
  authors: [{ name: 'Metal Gear' }],
  metadataBase: new URL('https://metal-gear-five.vercel.app'),
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'Metal Gear',
    title: 'Metal Gear — Industrial Equipment Marketplace',
    description:
      'Buy and sell used industrial equipment in Houston, TX. Oil & gas, petrochemical, mining, manufacturing, and CNC machining.',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Metal Gear — Industrial Equipment Marketplace',
    description:
      'Buy and sell used industrial equipment in Houston, TX.',
  },
  robots: {
    index: true,
    follow: true,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${chakraPetch.variable} ${manrope.variable} font-body antialiased`}
      >
        <QueryProvider>
          <TooltipProvider>
            <AuthProvider>
              {children}
            </AuthProvider>
            <Toaster richColors position="bottom-right" />
          </TooltipProvider>
        </QueryProvider>
      </body>
    </html>
  )
}
