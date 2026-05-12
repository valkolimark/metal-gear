import type { ReactNode } from 'react'

/**
 * Phone-shaped frame for previewing the mobile mockups inside a desktop browser.
 *
 * - 390×844 — iPhone 14 logical viewport
 * - Renders a fake iOS status bar (time / signal / wifi / battery) inside the
 *   44px top inset so the mobile shells (which already pad 44px for the
 *   safe-area) end up with something visible behind that band.
 * - The shell's own scroll is hidden via the `[data-section="design-preview"]`
 *   CSS rule in globals.css — the user sees one calm browser scroll, not
 *   three competing scrollbars.
 */
export function MobileFrame({ children }: { children: ReactNode }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        padding: '24px 16px 48px',
        background: '#F4F6FA',
      }}
    >
      <div
        style={{
          width: 390,
          height: 844,
          background: '#0A0A0F',
          borderRadius: 48,
          padding: 8,
          boxShadow:
            '0 24px 60px rgba(11,37,69,0.18), 0 2px 0 rgba(255,255,255,0.06) inset',
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: '#F0F2F5',
            borderRadius: 40,
            overflow: 'hidden',
            position: 'relative',
          }}
        >
          <StatusBar />
          {/* iPhone-style notch */}
          <div
            style={{
              position: 'absolute',
              top: 8,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 120,
              height: 28,
              background: '#0A0A0F',
              borderRadius: 999,
              zIndex: 50,
              pointerEvents: 'none',
            }}
          />
          {children}
        </div>
      </div>
    </div>
  )
}

function StatusBar() {
  return (
    <div
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 44,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        color: '#0A1628',
        fontFamily: 'var(--mg-font-display)',
        fontSize: 14,
        fontWeight: 700,
        letterSpacing: '-0.01em',
        zIndex: 40,
        pointerEvents: 'none',
      }}
    >
      <span style={{ minWidth: 56 }}>9:41</span>
      <span style={{ width: 120 }} />
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          minWidth: 56,
          justifyContent: 'flex-end',
        }}
      >
        <SignalBars />
        <WifiGlyph />
        <BatteryGlyph />
      </span>
    </div>
  )
}

function SignalBars() {
  return (
    <svg width="17" height="11" viewBox="0 0 17 11" fill="currentColor" aria-hidden>
      <rect x="0" y="7" width="3" height="4" rx="0.5" />
      <rect x="5" y="5" width="3" height="6" rx="0.5" />
      <rect x="10" y="3" width="3" height="8" rx="0.5" />
      <rect x="14" y="0" width="3" height="11" rx="0.5" opacity="0.35" />
    </svg>
  )
}

function WifiGlyph() {
  return (
    <svg width="15" height="11" viewBox="0 0 15 11" fill="none" aria-hidden>
      <path
        d="M1 4.1a10 10 0 0 1 13 0M3.3 6.3a6.6 6.6 0 0 1 8.4 0M5.6 8.5a3.3 3.3 0 0 1 3.8 0"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinecap="round"
      />
      <circle cx="7.5" cy="10" r="1" fill="currentColor" />
    </svg>
  )
}

function BatteryGlyph() {
  return (
    <svg width="25" height="12" viewBox="0 0 25 12" fill="none" aria-hidden>
      <rect
        x="0.5"
        y="0.5"
        width="21"
        height="11"
        rx="2.5"
        stroke="currentColor"
        opacity="0.35"
      />
      <rect x="23" y="3.5" width="1.5" height="5" rx="0.5" fill="currentColor" opacity="0.35" />
      <rect x="2" y="2" width="15" height="8" rx="1.5" fill="currentColor" />
    </svg>
  )
}
