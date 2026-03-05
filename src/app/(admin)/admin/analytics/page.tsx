import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminAnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Analytics</h1>
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardHeader>
          <CardTitle className="font-display text-base">Coming in a future cycle</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-body text-sm text-muted-foreground">
            Platform analytics including user growth, listing trends, search patterns, and engagement metrics.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
