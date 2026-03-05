import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminSOSPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">SOS Monitor</h1>
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardHeader>
          <CardTitle className="font-display text-base">Coming in Cycle 11-2</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-body text-sm text-muted-foreground">
            SOS broadcast monitoring with analytics, response tracking, and routing debug tool.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
