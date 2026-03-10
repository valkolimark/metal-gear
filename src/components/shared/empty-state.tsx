interface EmptyStateProps {
  title: string
  message: string
  action?: {
    label: string
    href: string
  }
}

export function EmptyState({ title, message, action }: EmptyStateProps) {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="font-display text-lg font-semibold text-white">{title}</p>
        <p className="max-w-md font-body text-sm text-zinc-400">{message}</p>
        {action && (
          <a
            href={action.href}
            className="mt-2 rounded-lg bg-primary px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-primary/90"
          >
            {action.label}
          </a>
        )}
      </div>
    </div>
  )
}
