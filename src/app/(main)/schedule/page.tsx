'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  CalendarDays,
  Clock,
  Loader2,
  Check,
  X,
  Eye,
  MapPin,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { useAuthStore } from '@/stores/auth-store'
import {
  getSellerAvailability,
  saveAvailability,
  getMyViewingRequests,
  respondToViewing,
  cancelViewing,
  DAY_NAMES,
} from '@/app/actions/scheduling'

const HOURS = Array.from({ length: 24 }, (_, i) => {
  const h = i % 12 || 12
  const ampm = i < 12 ? 'AM' : 'PM'
  return { value: `${String(i).padStart(2, '0')}:00`, label: `${h}:00 ${ampm}` }
})

export default function SchedulePage() {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [availability, setAvailability] = useState<
    { day_of_week: number; start_time: string; end_time: string; enabled: boolean }[]
  >(
    DAY_NAMES.map((_, i) => ({
      day_of_week: i,
      start_time: '09:00',
      end_time: '17:00',
      enabled: false,
    }))
  )
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [buyerRequests, setBuyerRequests] = useState<any[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [sellerRequests, setSellerRequests] = useState<any[]>([])

  const loadData = useCallback(async () => {
    if (!user) return

    const [avail, requests] = await Promise.all([
      getSellerAvailability(user.id),
      getMyViewingRequests(),
    ])

    if (avail.slots.length > 0) {
      setAvailability((prev) =>
        prev.map((slot) => {
          const saved = avail.slots.find((s) => s.day_of_week === slot.day_of_week)
          if (saved) {
            return {
              ...slot,
              start_time: saved.start_time.slice(0, 5),
              end_time: saved.end_time.slice(0, 5),
              enabled: true,
            }
          }
          return slot
        })
      )
    }

    if ('asBuyer' in requests) {
      setBuyerRequests(requests.asBuyer ?? [])
      setSellerRequests(requests.asSeller ?? [])
    }

    setLoading(false)
  }, [user])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- data fetch on mount
    loadData()
  }, [loadData])

  async function handleSaveAvailability() {
    setSaving(true)
    const slots = availability
      .filter((s) => s.enabled)
      .map((s) => ({
        day_of_week: s.day_of_week,
        start_time: s.start_time,
        end_time: s.end_time,
      }))

    const result = await saveAvailability(slots)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Availability saved')
    }
    setSaving(false)
  }

  async function handleRespond(requestId: string, action: 'accepted' | 'declined') {
    const result = await respondToViewing(requestId, action)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success(action === 'accepted' ? 'Viewing confirmed' : 'Viewing declined')
      loadData()
    }
  }

  async function handleCancel(requestId: string) {
    const result = await cancelViewing(requestId)
    if ('error' in result) {
      toast.error(result.error)
    } else {
      toast.success('Viewing cancelled')
      loadData()
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Schedule
        </h1>
        <p className="mt-1 font-body text-muted-foreground">
          Manage your availability and viewing appointments
        </p>
      </div>

      {/* Availability Settings */}
      <Card className="border-border bg-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 font-display text-lg">
            <Clock className="size-5 text-primary" />
            Weekly Availability
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="font-body text-sm text-muted-foreground">
            Set when you&rsquo;re available for equipment viewings. Times are in Central Time (CT).
          </p>
          <div className="space-y-3">
            {availability.map((slot, i) => (
              <div
                key={slot.day_of_week}
                className="flex flex-wrap items-center gap-3 rounded-lg border border-border/50 p-3"
              >
                <div className="flex w-28 items-center gap-2">
                  <Switch
                    checked={slot.enabled}
                    onCheckedChange={(checked) => {
                      setAvailability((prev) =>
                        prev.map((s, idx) =>
                          idx === i ? { ...s, enabled: checked } : s
                        )
                      )
                    }}
                  />
                  <Label className="font-body text-sm">
                    {DAY_NAMES[slot.day_of_week].slice(0, 3)}
                  </Label>
                </div>
                {slot.enabled && (
                  <div className="flex items-center gap-2">
                    <Select
                      value={slot.start_time}
                      onValueChange={(v) => {
                        setAvailability((prev) =>
                          prev.map((s, idx) =>
                            idx === i ? { ...s, start_time: v } : s
                          )
                        )
                      }}
                    >
                      <SelectTrigger className="w-28 font-body text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOURS.map((h) => (
                          <SelectItem key={h.value} value={h.value} className="font-body text-xs">
                            {h.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span className="font-body text-xs text-muted-foreground">to</span>
                    <Select
                      value={slot.end_time}
                      onValueChange={(v) => {
                        setAvailability((prev) =>
                          prev.map((s, idx) =>
                            idx === i ? { ...s, end_time: v } : s
                          )
                        )
                      }}
                    >
                      <SelectTrigger className="w-28 font-body text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {HOURS.map((h) => (
                          <SelectItem key={h.value} value={h.value} className="font-body text-xs">
                            {h.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {!slot.enabled && (
                  <span className="font-body text-xs text-muted-foreground">Unavailable</span>
                )}
              </div>
            ))}
          </div>
          <Button onClick={handleSaveAvailability} disabled={saving} className="font-body">
            {saving ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Check className="mr-2 size-4" />}
            Save Availability
          </Button>
        </CardContent>
      </Card>

      <Separator />

      {/* Incoming Requests (as seller) */}
      {sellerRequests.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Eye className="size-5 text-primary" />
              Viewing Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sellerRequests.map((req) => {
              const dt = new Date(req.proposed_datetime)
              const buyerName = req.buyer?.display_name || req.buyer?.full_name || 'Unknown'
              return (
                <div
                  key={req.id}
                  className="rounded-lg border border-border p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/listings/${req.listings?.id}`}
                        className="font-body font-medium text-foreground hover:text-primary"
                      >
                        {req.listings?.title || 'Unknown Listing'}
                      </Link>
                      <p className="font-body text-xs text-muted-foreground">
                        Requested by {buyerName}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`font-body text-[10px] ${
                        req.status === 'pending'
                          ? 'border-yellow-500/50 text-yellow-400'
                          : req.status === 'accepted'
                            ? 'border-green-500/50 text-green-400'
                            : ''
                      }`}
                    >
                      {req.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 font-body text-sm text-foreground">
                    <CalendarDays className="size-3.5 text-primary" />
                    {dt.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {' at '}
                    {dt.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      timeZone: 'America/Chicago',
                    })}
                    {' CT'}
                  </div>
                  {req.message && (
                    <p className="font-body text-xs italic text-muted-foreground">
                      &ldquo;{req.message}&rdquo;
                    </p>
                  )}
                  {req.status === 'pending' && (
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1 font-body text-xs"
                        onClick={() => handleRespond(req.id, 'accepted')}
                      >
                        <Check className="mr-1 size-3" />
                        Accept
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 font-body text-xs text-destructive"
                        onClick={() => handleRespond(req.id, 'declined')}
                      >
                        <X className="mr-1 size-3" />
                        Decline
                      </Button>
                    </div>
                  )}
                  {req.status === 'accepted' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-body text-xs"
                      onClick={() => handleCancel(req.id)}
                    >
                      Cancel Viewing
                    </Button>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* My Requests (as buyer) */}
      {buyerRequests.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <MapPin className="size-5 text-primary" />
              Your Viewing Requests
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {buyerRequests.map((req) => {
              const dt = new Date(req.proposed_datetime)
              const sellerName = req.seller?.display_name || req.seller?.full_name || 'Unknown'
              return (
                <div
                  key={req.id}
                  className="rounded-lg border border-border p-4 space-y-2"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <Link
                        href={`/listings/${req.listings?.id}`}
                        className="font-body font-medium text-foreground hover:text-primary"
                      >
                        {req.listings?.title || 'Unknown Listing'}
                      </Link>
                      <p className="font-body text-xs text-muted-foreground">
                        Seller: {sellerName}
                      </p>
                    </div>
                    <Badge
                      variant="outline"
                      className={`font-body text-[10px] ${
                        req.status === 'pending'
                          ? 'border-yellow-500/50 text-yellow-400'
                          : req.status === 'accepted'
                            ? 'border-green-500/50 text-green-400'
                            : ''
                      }`}
                    >
                      {req.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 font-body text-sm text-foreground">
                    <CalendarDays className="size-3.5 text-primary" />
                    {dt.toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                    {' at '}
                    {dt.toLocaleTimeString('en-US', {
                      hour: 'numeric',
                      minute: '2-digit',
                      timeZone: 'America/Chicago',
                    })}
                    {' CT'}
                  </div>
                  {req.status === 'pending' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-body text-xs"
                      onClick={() => handleCancel(req.id)}
                    >
                      Cancel Request
                    </Button>
                  )}
                  {req.status === 'accepted' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="font-body text-xs"
                      onClick={() => handleCancel(req.id)}
                    >
                      Cancel Viewing
                    </Button>
                  )}
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {sellerRequests.length === 0 && buyerRequests.length === 0 && (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center gap-3 py-12">
            <CalendarDays className="size-10 text-muted-foreground" />
            <p className="font-display text-lg font-semibold text-foreground">
              No upcoming viewings
            </p>
            <p className="max-w-md text-center font-body text-sm text-muted-foreground">
              When you request or receive equipment viewing requests, they&rsquo;ll appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
