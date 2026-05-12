type ChatAvatarProps = {
  tag: string
  color?: string
  size?: number
  online?: boolean
}

export function ChatAvatar({ tag, color = '#3D9BD6', size = 32, online }: ChatAvatarProps) {
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <div
        className="flex items-center justify-center font-bold w-full h-full"
        style={{
          background: color,
          color: '#fff',
          borderRadius: 999,
          fontSize: size * 0.36,
          fontFamily: 'var(--mg-font-display)',
        }}
      >
        {tag}
      </div>
      {online && (
        <span
          className="absolute right-0 bottom-0 size-2.5 rounded-full"
          style={{ background: '#22C55E', border: '2px solid #fff' }}
        />
      )}
    </div>
  )
}
