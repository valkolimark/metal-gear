import { Skeleton } from '@/components/ui/skeleton'

export default function FeedLoading() {
  return (
    <div className="mx-auto flex w-full max-w-[1280px] gap-6 px-4 py-6">
      {/* Left sidebar skeleton (desktop only) */}
      <div className="hidden w-[280px] shrink-0 xl:block">
        <div className="space-y-4">
          <Skeleton className="h-16 w-full rounded-xl" />
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-9 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>

      {/* Center feed */}
      <div className="min-w-0 flex-1 max-w-[680px] mx-auto space-y-4">
        {/* Composer skeleton */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex gap-3">
            <Skeleton className="size-10 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-12 w-full rounded-lg" />
              <div className="flex justify-between">
                <div className="flex gap-2">
                  <Skeleton className="h-8 w-16 rounded-md" />
                  <Skeleton className="h-8 w-16 rounded-md" />
                </div>
                <Skeleton className="h-8 w-14 rounded-md" />
              </div>
            </div>
          </div>
        </div>

        {/* Feed toggle */}
        <Skeleton className="h-10 w-64 rounded-lg" />

        {/* Post skeletons */}
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border bg-card">
            <div className="flex items-center gap-3 p-4">
              <Skeleton className="size-10 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="mt-1 h-3 w-20" />
              </div>
            </div>
            <div className="px-4 pb-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="mt-1.5 h-4 w-3/4" />
            </div>
            {i === 0 && <Skeleton className="mx-4 mb-3 aspect-video w-[calc(100%-32px)] rounded-lg" />}
            <div className="flex gap-4 border-t border-border px-4 py-2">
              <Skeleton className="h-8 w-16 rounded-md" />
              <Skeleton className="h-8 w-20 rounded-md" />
              <Skeleton className="h-8 w-16 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      {/* Right sidebar skeleton (large desktop only) */}
      <div className="hidden w-[340px] shrink-0 space-y-4 lg:block">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    </div>
  )
}
