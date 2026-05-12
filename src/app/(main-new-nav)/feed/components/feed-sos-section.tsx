'use client'

import Link from 'next/link'
import { AlertTriangle, Clock } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'

interface SOSItem {
  id: string
  title: string
  equipment_category: string
  urgency: string | null
  created_at: string | null
  requester_id: string
}

interface FeedSosSectionProps {
  items: SOSItem[]
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export function FeedSosSection({ items }: FeedSosSectionProps) {
  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-display text-xl font-semibold">Active SOSs in Your Categories</h2>
        <Link href="/sos" className="text-sm text-primary hover:underline">
          View all &rarr;
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
        {items.map((sos) => (
          <Link key={sos.id} href={`/sos/${sos.id}`} className="flex-shrink-0">
            <Card className="w-72 border-[#FF6B2B]/30 bg-[#FF6B2B]/5 transition-colors hover:border-[#FF6B2B]/50">
              <CardContent className="p-4">
                <div className="mb-2 flex items-center gap-2">
                  <AlertTriangle className="size-4 text-[#FF6B2B]" />
                  {sos.urgency === 'critical' && (
                    <Badge className="bg-red-500/20 text-[11px] text-red-400">Critical</Badge>
                  )}
                </div>
                <p className="mb-1 truncate font-body text-sm font-semibold text-foreground">
                  {sos.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {sos.equipment_category.replace(/_/g, ' ')}
                </p>
                <div className="mt-3 flex items-center justify-end text-xs text-muted-foreground">
                  {sos.created_at && (
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {timeAgo(sos.created_at)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  )
}
