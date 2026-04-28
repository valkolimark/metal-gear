"use client"

import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { DailyCostPoint } from "@/app/(admin)/admin/ai-costs/queries"

const ANTHROPIC_COLOR = "#1877F2"
const GOOGLE_COLOR = "#FF6B2B"
const OTHER_COLOR = "#9333ea"

export function CostByVendorChart({ data }: { data: DailyCostPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
        No cost events recorded yet.
      </div>
    )
  }

  const chartData = data.map((d) => ({
    date: d.date.slice(5), // MM-DD
    Anthropic: d.anthropicCents / 100,
    "Google Vision": d.googleVisionCents / 100,
    Other: d.otherCents / 100,
  }))

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-2 text-sm font-medium">Daily cost by vendor (last 30 days)</div>
      <ResponsiveContainer width="100%" height={260}>
        <AreaChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="date" fontSize={11} />
          <YAxis
            fontSize={11}
            tickFormatter={(v: number) => (v < 1 ? `${(v * 100).toFixed(1)}¢` : `$${v.toFixed(2)}`)}
          />
          <Tooltip
            formatter={(value) => {
              const v = typeof value === "number" ? value : 0
              return v < 1 ? `${(v * 100).toFixed(2)}¢` : `$${v.toFixed(4)}`
            }}
          />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Area
            type="monotone"
            dataKey="Anthropic"
            stackId="cost"
            stroke={ANTHROPIC_COLOR}
            fill={ANTHROPIC_COLOR}
            fillOpacity={0.5}
          />
          <Area
            type="monotone"
            dataKey="Google Vision"
            stackId="cost"
            stroke={GOOGLE_COLOR}
            fill={GOOGLE_COLOR}
            fillOpacity={0.5}
          />
          <Area
            type="monotone"
            dataKey="Other"
            stackId="cost"
            stroke={OTHER_COLOR}
            fill={OTHER_COLOR}
            fillOpacity={0.5}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
