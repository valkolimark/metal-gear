export function IndustrialMark({ size = 36, blue = true }: { size?: number; blue?: boolean }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40">
      <polygon
        points="20,2 36,11 36,29 20,38 4,29 4,11"
        fill={blue ? '#1877F2' : '#0B2545'}
        stroke={blue ? '#3D9BD6' : '#13315C'}
        strokeWidth="1"
      />
      <polygon
        points="20,8 31,14.5 31,25.5 20,32 9,25.5 9,14.5"
        fill="none"
        stroke="rgba(255,255,255,0.25)"
        strokeWidth="0.8"
      />
    </svg>
  )
}
