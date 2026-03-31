export function formatActivityStatus(lastActiveAt: string | null): {
  label: string
  color: 'green' | 'yellow' | 'gray'
  isRecent: boolean
} {
  if (!lastActiveAt) return { label: '', color: 'gray', isRecent: false }

  const diff = Date.now() - new Date(lastActiveAt).getTime()
  const minutes = diff / 60000

  if (minutes < 5) return { label: 'Active now', color: 'green', isRecent: true }
  if (minutes < 60) return { label: `Active ${Math.floor(minutes)}m ago`, color: 'green', isRecent: true }
  if (minutes < 1440) return { label: `Active ${Math.floor(minutes / 60)}h ago`, color: 'yellow', isRecent: true }
  if (minutes < 10080) return { label: `Active ${Math.floor(minutes / 1440)}d ago`, color: 'gray', isRecent: false }
  return { label: '', color: 'gray', isRecent: false }
}

export function formatRelativeTime(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
    new Date(dateStr)
  )
}
