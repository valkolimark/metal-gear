import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function AdminPriorityPage() {
  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">Priority Engine</h1>
      <Card className="border-white/5 bg-[#0D0D14]">
        <CardHeader>
          <CardTitle className="font-display text-base">Coming in Cycle 12</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="font-body text-sm text-muted-foreground">
            Self-serve paid boosts, admin override controls, and listing priority management.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
