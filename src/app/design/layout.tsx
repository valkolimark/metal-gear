import type { ReactNode } from 'react'

export const metadata = {
  title: 'Design Preview',
  robots: { index: false, follow: false },
}

export default function DesignPreviewLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-section="design-preview"
      style={{
        minHeight: '100vh',
        background: '#F4F6FA',
        // Map the design-handoff font tokens to the app's already-loaded fonts.
        ['--mg-font-display' as never]: 'var(--font-manrope), system-ui, sans-serif',
        ['--mg-font-body' as never]: 'var(--font-manrope), system-ui, sans-serif',
        ['--mg-font-mono' as never]: 'var(--font-jetbrains-mono), ui-monospace, monospace',
        fontFamily: 'var(--font-manrope), system-ui, sans-serif',
        color: '#0A1628',
      }}
    >
      {children}
    </div>
  )
}
