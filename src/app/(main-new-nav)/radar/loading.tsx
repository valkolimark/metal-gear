import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent } from '@/components/ui/card'

export default function RadarLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <Skeleton className="h-8 w-32" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-border pb-2">
        {['Equipment', 'Posts', 'Videos', 'Lists'].map((tab) => (
          <Skeleton key={tab} className="h-9 w-24 rounded-lg" />
        ))}
      </div>

      {/* Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Card key={i} className="border-border bg-card">
            <Skeleton className="aspect-[4/3] w-full rounded-t-lg" />
            <CardContent className="p-4">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="mt-2 h-3 w-1/2" />
              <Skeleton className="mt-3 h-6 w-24" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
