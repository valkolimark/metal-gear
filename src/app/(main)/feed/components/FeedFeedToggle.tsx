'use client'

interface FeedFeedToggleProps {
  value: 'all' | 'for-you'
  onChange: (v: 'all' | 'for-you') => void
}

export function FeedFeedToggle({ value, onChange }: FeedFeedToggleProps) {
  return (
    <div className="inline-flex rounded-full bg-muted p-1">
      <button
        className={`rounded-full px-4 py-1.5 font-body text-sm font-medium transition-colors ${
          value === 'all'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onClick={() => onChange('all')}
      >
        All Posts
      </button>
      <button
        className={`rounded-full px-4 py-1.5 font-body text-sm font-medium transition-colors ${
          value === 'for-you'
            ? 'bg-primary text-primary-foreground'
            : 'text-muted-foreground hover:text-foreground'
        }`}
        onClick={() => onChange('for-you')}
      >
        For You
      </button>
    </div>
  )
}
