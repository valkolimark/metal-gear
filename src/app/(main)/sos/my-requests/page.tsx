'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ArrowLeft, AlertTriangle, Clock, MessageSquare, Siren } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { getMySosRequests } from '@/app/actions/sos'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-500/10 text-green-500 border-green-500/30',
  fulfilled: 'bg-blue-500/10 text-blue-500 border-blue-500/30',
  expired: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-red-500/10 text-red-500 border-red-500/30',
}

export default function MySosRequestsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [requests, setRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const result = await getMySosRequests()
      if (!('error' in result)) {
        setRequests(result.requests || [])
      }
      setLoading(false)
    }
    load()
  }, [])

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-6 flex items-center gap-3">
        <Link href="/sos" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">My SOS Requests</h1>
          <p className="mt-1 font-body text-sm text-muted-foreground">Your SOS history</p>
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-24 w-full rounded-lg" />
          ))}
        </div>
      ) : requests.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border py-12 text-center">
          <Siren className="mx-auto mb-3 size-10 text-muted-foreground/30" />
          <p className="font-display text-lg text-muted-foreground">No SOS requests yet</p>
          <p className="mt-1 text-sm text-muted-foreground/70">
            Hit the SOS button when you need something fast.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {requests.map((req) => {
            const r = req as Record<string, unknown>
            const responseCount = Array.isArray(r.response_count) && r.response_count.length > 0
              ? (r.response_count[0] as { count: number }).count
              : 0
            return (
              <Link
                key={r.id as string}
                href={`/sos/${r.id}`}
                className="block rounded-lg border border-border bg-surface p-4 transition-all hover:border-primary/30"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={r.urgency === 'critical' ? 'destructive' : 'secondary'}
                        className="text-[10px]"
                      >
                        {r.urgency === 'critical' && <AlertTriangle className="mr-0.5 size-3" />}
                        {(r.urgency as string).toUpperCase()}
                      </Badge>
                      <span className="font-display text-sm font-semibold text-foreground">
                        {r.title as string}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <Clock className="size-3" />
                        {timeAgo(r.created_at as string)}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <MessageSquare className="size-3" />
                        {responseCount} response{responseCount !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={STATUS_COLORS[r.status as string] || ''}
                  >
                    {(r.status as string).toUpperCase()}
                  </Badge>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
