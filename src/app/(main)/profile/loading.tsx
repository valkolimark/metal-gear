import { Skeleton } from '@/components/ui/skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'

export default function ProfileLoading() {
  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <Skeleton className="h-9 w-32" />

      {/* Avatar */}
      <Card className="border-border bg-card">
        <CardHeader>
          <Skeleton className="h-5 w-24" />
        </CardHeader>
        <CardContent className="flex items-center gap-4">
          <Skeleton className="size-20 rounded-full" />
          <Skeleton className="h-9 w-32" />
        </CardContent>
      </Card>

      {/* Form fields */}
      <Card className="border-border bg-card">
        <CardHeader>
          <Skeleton className="h-5 w-36" />
        </CardHeader>
        <CardContent className="space-y-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i}>
              <Skeleton className="h-3 w-20" />
              <Skeleton className="mt-1 h-10 w-full" />
            </div>
          ))}
          <Skeleton className="mt-4 h-10 w-24" />
        </CardContent>
      </Card>
    </div>
  )
}
