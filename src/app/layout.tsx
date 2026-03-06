import type { Metadata } from 'next'
import { NextIntlClientProvider } from 'next-intl'
import { getLocale, getMessages } from 'next-intl/server'
import { ThemeProvider } from 'next-themes'
import { chakraPetch, manrope } from '@/styles/fonts'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/components/providers/auth-provider'
import { QueryProvider } from '@/components/providers/query-provider'
import './globals.css'

export const metadata: Metadata = {
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Metal Gear',
  },
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

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const locale = await getLocale()
  const messages = await getMessages()

  return (
    <html lang={locale} suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0A0A0F" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#FAFAFA" media="(prefers-color-scheme: light)" />
        <link rel="apple-touch-icon" href="/icons/icon-192.svg" />
      </head>
      <body
        className={`${chakraPetch.variable} ${manrope.variable} font-body antialiased`}
      >
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:font-body focus:text-sm focus:text-white focus:outline-none"
        >
          Skip to main content
        </a>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          <NextIntlClientProvider messages={messages}>
            <QueryProvider>
              <TooltipProvider>
                <AuthProvider>
                  {children}
                </AuthProvider>
                <Toaster richColors position="bottom-right" />
              </TooltipProvider>
            </QueryProvider>
          </NextIntlClientProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
