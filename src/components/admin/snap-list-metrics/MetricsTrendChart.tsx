"use client"

import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { DailyPoint } from "@/app/actions/snap-list-metrics"

export function MetricsTrendChart({ data }: { data: DailyPoint[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-[240px] items-center justify-center rounded-lg border bg-card text-sm text-muted-foreground">
        No events yet in this range.
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-2 text-sm font-medium">Daily funnel</div>
      <ResponsiveContainer width="100%" height={240}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
          <XAxis dataKey="date" fontSize={11} />
          <YAxis fontSize={11} allowDecimals={false} />
          <Tooltip />
          <Legend wrapperStyle={{ fontSize: "12px" }} />
          <Line type="monotone" dataKey="analyses" stroke="#1877F2" strokeWidth={2} />
          <Line type="monotone" dataKey="publishes" stroke="#FF6B2B" strokeWidth={2} />
          <Line type="monotone" dataKey="fieldEdits" stroke="#9333ea" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
