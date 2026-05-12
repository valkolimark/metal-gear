import type { TrustMetrics } from './types'

interface TrustStripCardProps {
  metrics: TrustMetrics
  variant?: 'seller' | 'profile-own' | 'profile-visiting'
}

interface StatCell {
  label: string
  value: string
  sub: string | null
  accent?: string
}

function formatRating(avg: number | null, count: number): StatCell {
  return {
    label: 'Rating',
    value: avg !== null ? avg.toFixed(1) : '—',
    sub:
      avg !== null
        ? `${count.toLocaleString()} review${count === 1 ? '' : 's'}`
        : 'No reviews yet',
  }
}

function formatTransactions(count: number): StatCell {
  return {
    label: 'Transactions',
    value: count > 0 ? count.toLocaleString() : '—',
    sub: count > 0 ? 'Completed' : 'No sales yet',
  }
}

function formatSosResponses(count: number): StatCell {
  return {
    label: 'SOS responses',
    value: count > 0 ? count.toLocaleString() : '—',
    sub: count > 0 ? 'Lifetime' : 'No responses yet',
  }
}

function formatResponseTime(
  avgMinutes: number | null,
  ratePct: number | null,
): StatCell {
  if (avgMinutes === null) {
    return { label: 'Response', value: '—', sub: 'Not enough data' }
  }
  let humanTime: string
  if (avgMinutes < 60) humanTime = `${Math.round(avgMinutes)}m`
  else if (avgMinutes < 1440) humanTime = `${Math.round(avgMinutes / 60)}h`
  else humanTime = `${Math.round(avgMinutes / 1440)}d`
  const rateSub =
    ratePct !== null ? `${ratePct}% reply rate` : 'Avg first reply'
  return { label: 'Response', value: humanTime, sub: rateSub }
}

function formatFollowers(count: number): StatCell {
  return {
    label: 'Followers',
    value: count.toLocaleString(),
    sub: count === 0 ? 'Be the first' : 'Watching this seller',
  }
}

function formatOnPlatform(
  sinceYear: number | null,
  years: number | null,
): StatCell {
  if (sinceYear === null) {
    return { label: 'On platform', value: '—', sub: 'Member' }
  }
  const yearLabel =
    years === null || years < 1
      ? 'Just joined'
      : years === 1
        ? '1 year'
        : `${years} years`
  return {
    label: 'On platform',
    value: `since ${sinceYear}`,
    sub: yearLabel,
  }
}

export function TrustStripCard({ metrics, variant = 'seller' }: TrustStripCardProps) {
  // 5 stats; the selection differs subtly by variant but the rendering is
  // shared. Brand-new accounts render an em-dash for any null metric rather
  // than "0", which would mislead buyers ("0 reviews" reads as "bad", but
  // "—" reads as "new").
  const stats: StatCell[] =
    variant === 'profile-own' || variant === 'profile-visiting'
      ? [
          formatRating(metrics.rating.avg, metrics.rating.count),
          formatTransactions(metrics.transactions.count),
          formatSosResponses(metrics.sosResponses.count),
          formatResponseTime(
            metrics.responseTime.avgMinutes,
            metrics.responseTime.ratePct,
          ),
          formatOnPlatform(metrics.onPlatform.sinceYear, metrics.onPlatform.years),
        ]
      : [
          formatRating(metrics.rating.avg, metrics.rating.count),
          formatResponseTime(
            metrics.responseTime.avgMinutes,
            metrics.responseTime.ratePct,
          ),
          formatTransactions(metrics.transactions.count),
          formatFollowers(metrics.followers.count),
          formatOnPlatform(metrics.onPlatform.sinceYear, metrics.onPlatform.years),
        ]

  return (
    <div
      data-testid="trust-strip"
      className="grid grid-cols-2 gap-3 rounded-2xl bg-card p-1 shadow-[0_1px_2px_rgba(11,37,69,0.04),0_4px_12px_rgba(11,37,69,0.05)] md:grid-cols-5 md:gap-0 md:p-0"
    >
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="px-4 py-3 md:px-5 md:py-4"
          style={{
            borderRight:
              i < stats.length - 1
                ? 'var(--mg-trust-divider, 1px solid var(--border))'
                : 'none',
          }}
        >
          <div
            className="mb-1 text-[10px] font-bold uppercase tracking-[0.08em] text-muted-foreground"
            style={{ fontFamily: 'var(--font-jetbrains-mono), monospace' }}
          >
            {s.label}
          </div>
          <div className="font-display text-[22px] font-bold leading-none tracking-tight text-foreground">
            {s.value}
          </div>
          {s.sub && (
            <div className="mt-1 text-[11px] text-muted-foreground">{s.sub}</div>
          )}
        </div>
      ))}
    </div>
  )
}
