import type { Metadata } from 'next'
import { chakraPetch, manrope } from '@/styles/fonts'
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
        className={`${chakraPetch.variable} ${manrope.variable} font-body antialiased bg-[#0A0A0F] text-zinc-100`}
      >
        {children}
      </body>
    </html>
  )
}
