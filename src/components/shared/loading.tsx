export function Loading({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-zinc-700 border-t-primary" />
        <p className="font-body text-sm text-zinc-400">{text}</p>
      </div>
    </div>
  )
}
