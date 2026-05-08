// Cycle 67 — inline SVG icons for the cinematic landing surface.
// Hand-rolled (not from lucide-react) to match the design's exact stroke
// weights and corner brackets specified in the handoff.

interface IconProps {
  size?: number
  className?: string
}

export function SirenIcon({ size = 16, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M7 18a5 5 0 0 1 10 0" />
      <path d="M5 22h14" />
      <line x1="12" y1="2" x2="12" y2="6" />
      <line x1="3" y1="10" x2="5.5" y2="11" />
      <line x1="18.5" y1="11" x2="21" y2="10" />
      <line x1="5" y1="6" x2="6.6" y2="8" />
      <line x1="17.4" y1="8" x2="19" y2="6" />
      <line x1="5" y1="22" x2="5" y2="18" />
      <line x1="19" y1="22" x2="19" y2="18" />
    </svg>
  )
}

export function ArrowRightThin({ size = 14, className }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="4" y1="12" x2="20" y2="12" />
      <polyline points="14 6 20 12 14 18" />
    </svg>
  )
}

export function HamburgerIcon({ size = 18, className }: IconProps) {
  // Two-line ghost hamburger from the mobile design (24x16 viewbox).
  return (
    <svg
      width={size}
      height={(size * 12) / 18}
      viewBox="0 0 24 16"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden="true"
    >
      <line x1="3" y1="3" x2="21" y2="3" />
      <line x1="3" y1="13" x2="21" y2="13" />
    </svg>
  )
}

interface CornerBracketsProps {
  color?: string
  size?: number
  inset?: number
}

export function CornerBrackets({
  color = 'rgba(255,255,255,0.30)',
  size = 14,
  inset = 8,
}: CornerBracketsProps) {
  const base = {
    position: 'absolute' as const,
    width: size,
    height: size,
    pointerEvents: 'none' as const,
  }
  return (
    <>
      <span
        style={{
          ...base,
          top: inset,
          left: inset,
          borderTop: `1.5px solid ${color}`,
          borderLeft: `1.5px solid ${color}`,
        }}
      />
      <span
        style={{
          ...base,
          top: inset,
          right: inset,
          borderTop: `1.5px solid ${color}`,
          borderRight: `1.5px solid ${color}`,
        }}
      />
      <span
        style={{
          ...base,
          bottom: inset,
          left: inset,
          borderBottom: `1.5px solid ${color}`,
          borderLeft: `1.5px solid ${color}`,
        }}
      />
      <span
        style={{
          ...base,
          bottom: inset,
          right: inset,
          borderBottom: `1.5px solid ${color}`,
          borderRight: `1.5px solid ${color}`,
        }}
      />
    </>
  )
}
