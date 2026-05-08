import { Chakra_Petch, JetBrains_Mono, Manrope } from 'next/font/google'

export const chakraPetch = Chakra_Petch({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-chakra-petch',
  display: 'swap',
})

export const manrope = Manrope({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  variable: '--font-manrope',
  display: 'swap',
})

// Cycle 67 — JetBrains Mono powers the cinematic landing surface
// (stencil labels, kickers, ticker timestamps, spec callouts).
export const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})
