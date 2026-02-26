interface ErrorDisplayProps {
  title?: string
  message?: string
  retry?: () => void
}

export function ErrorDisplay({
  title = 'Something went wrong',
  message = 'An unexpected error occurred. Please try again.',
  retry,
}: ErrorDisplayProps) {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="flex flex-col items-center gap-3 text-center">
        <p className="font-display text-lg font-semibold text-white">{title}</p>
        <p className="max-w-md font-body text-sm text-zinc-400">{message}</p>
        {retry && (
          <button
            onClick={retry}
            className="mt-2 rounded-lg bg-[#FF6B2B] px-4 py-2 font-body text-sm font-semibold text-white transition-colors hover:bg-[#e55e25]"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  )
}
