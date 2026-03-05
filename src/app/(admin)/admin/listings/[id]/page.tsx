import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminListingDetailPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Listing Detail</h1>
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardHeader>
          <CardTitle className="font-display text-base">Coming in Cycle 11-2</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-body text-sm text-muted-foreground">
            Full listing preview with admin edit, fraud review, and action panel.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
