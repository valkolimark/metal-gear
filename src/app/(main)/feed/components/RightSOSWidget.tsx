'use client'

import Link from 'next/link'
import { Siren, Clock } from 'lucide-react'

interface SOSAlert {
  id: string
  title: string
  equipment_category: string
  urgency: string | null
  created_at: string | null
  company_id: string | null
  company_name: string | null
}

interface RightSOSWidgetProps {
  sosAlerts: SOSAlert[]
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

function urgencyColor(urgency: string | null) {
  if (urgency === 'critical') return 'border-l-red-500'
  if (urgency === 'high') return 'border-l-orange-500'
  return 'border-l-blue-500'
}

function urgencyLabel(urgency: string | null) {
  if (urgency === 'critical') return { text: 'CRITICAL', color: 'text-red-500' }
  if (urgency === 'high') return { text: 'HIGH', color: 'text-orange-500' }
  return { text: 'NORMAL', color: 'text-blue-500' }
}

export function RightSOSWidget({ sosAlerts }: RightSOSWidgetProps) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-3">
        <Siren className="size-4 text-[#FF6B2B]" />
        <h3 className="font-display text-sm font-semibold text-foreground">SOS Alerts</h3>
        {sosAlerts.length > 0 && (
          <span className="ml-auto flex items-center justify-center rounded-full bg-[#FF6B2B]/15 text-[#FF6B2B] text-[10px] font-bold px-1.5 py-0.5 min-w-[20px]">
            {sosAlerts.length}
          </span>
        )}
      </div>

      {sosAlerts.length === 0 ? (
        <div className="text-center py-4">
          <p className="font-body text-xs text-muted-foreground mb-2">
            No urgent SOS in your equipment categories.
          </p>
          <Link href="/sos" className="font-body text-xs text-primary hover:underline">
            Browse all SOS &rarr;
          </Link>
        </div>
      ) : (
        <div className="space-y-0">
          {sosAlerts.map((alert) => {
            const urg = urgencyLabel(alert.urgency)
            return (
              <Link
                key={alert.id}
                href={`/sos/${alert.id}`}
                className={`block border-l-2 ${urgencyColor(alert.urgency)} pl-3 py-2.5 hover:bg-muted/50 rounded-r-lg transition-colors -mx-1 px-3`}
              >
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`font-body text-[10px] font-bold ${urg.color}`}>
                    {urg.text}
                  </span>
                  {alert.created_at && (
                    <span className="flex items-center gap-0.5 text-[10px] text-muted-foreground ml-auto">
                      <Clock className="size-3" />
                      {timeAgo(alert.created_at)}
                    </span>
                  )}
                </div>
                <p className="font-body text-sm font-medium text-foreground truncate">
                  {alert.title}
                </p>
                {alert.company_name && (
                  <p className="font-body text-xs text-muted-foreground truncate mt-0.5">
                    {alert.company_name}
                  </p>
                )}
              </Link>
            )
          })}
          <div className="pt-2 border-t border-border mt-2">
            <Link
              href="/sos"
              className="font-body text-xs text-primary hover:underline"
            >
              See all SOS alerts &rarr;
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}
