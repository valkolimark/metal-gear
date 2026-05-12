'use client'

interface PerformanceBarProps {
  value: number
  benchmark: number
  label?: string
}

export function PerformanceBar({ value, benchmark, label }: PerformanceBarProps) {
  if (benchmark === 0) return null
  const isAbove = value >= benchmark
  const pct = Math.min((value / benchmark) * 100, 100)

  return (
    <div className="mt-2 space-y-1">
      <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${isAbove ? 'bg-green-500' : 'bg-yellow-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {label && (
        <p className="text-xs text-muted-foreground">{label}</p>
      )}
    </div>
  )
}
