import { Skeleton } from '@/components/ui/skeleton'

export default function MessagesLoading() {
  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] w-full max-w-7xl px-4 sm:px-6 lg:px-8">
      {/* Conversation list */}
      <div className="w-80 shrink-0 border-r border-border p-4">
        <Skeleton className="mb-4 h-8 w-full" />
        <div className="space-y-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 rounded-lg p-2">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="mt-1 h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Message area */}
      <div className="flex flex-1 flex-col p-4">
        <Skeleton className="mb-4 h-6 w-48" />
        <div className="flex-1 space-y-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className={`flex ${i % 2 === 0 ? '' : 'justify-end'}`}
            >
              <Skeleton
                className={`h-12 rounded-lg ${i % 2 === 0 ? 'w-2/3' : 'w-1/2'}`}
              />
            </div>
          ))}
        </div>
        <Skeleton className="mt-4 h-12 w-full rounded-lg" />
      </div>
    </div>
  )
}
