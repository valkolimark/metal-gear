import type { Metadata } from 'next'
import { chakraPetch, manrope } from '@/styles/fonts'
import { TooltipProvider } from '@/components/ui/tooltip'
import { Toaster } from '@/components/ui/sonner'
import { AuthProvider } from '@/components/providers/auth-provider'
import './globals.css'

export const metadata: Metadata = {
  title: 'Metal Gear — Industrial Equipment Marketplace',
  description:
    'Buy and sell used industrial equipment in Houston, TX. Oil & gas, petrochemical, mining, manufacturing, and CNC machining.',
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
        <TooltipProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
          <Toaster richColors position="bottom-right" />
        </TooltipProvider>
      </body>
    </html>
  )
}
