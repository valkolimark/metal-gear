import { ImageIcon } from './icons'
import { PHOTO_BG } from './listings-data'

export function PhotoTile({
  bg,
  hasMedia,
  size = 56,
  radius = 10,
}: {
  bg: number
  hasMedia: boolean
  size?: number
  radius?: number
}) {
  return (
    <div
      className="relative shrink-0 flex items-center justify-center"
      style={{
        width: size,
        height: size,
        background: hasMedia ? PHOTO_BG[bg] : '#F0F3F7',
        borderRadius: radius,
        overflow: 'hidden',
      }}
    >
      {!hasMedia && <ImageIcon size={size * 0.35} style={{ color: '#94A3B8' }} />}
      {hasMedia && (
        <div
          className="absolute inset-0"
          style={{
            background:
              'radial-gradient(circle at 30% 25%, rgba(255,255,255,0.18) 0%, transparent 60%)',
          }}
        />
      )}
    </div>
  )
}
