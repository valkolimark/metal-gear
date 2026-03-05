import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminModerationPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Moderation Queue</h1>
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardHeader>
          <CardTitle className="font-display text-base">Coming in Cycle 11-2</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-body text-sm text-muted-foreground">
            Consolidated moderation for reported content, AI fraud queue, and review disputes.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
