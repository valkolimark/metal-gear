'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, AlertTriangle, Clock, MapPin, MessageSquare,
  Check, X, Send, Building2, User as UserIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Skeleton } from '@/components/ui/skeleton'
import { toast } from 'sonner'
import {
  getSosDetail,
  respondToSos,
  updateSosStatus,
  markSosFulfilled,
} from '@/app/actions/sos'
import { getTier2Label, getSubcategoryLabel } from '@/lib/constants/equipment-taxonomy'
import { createClient } from '@/lib/supabase/client'

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

const CONDITIONS = [
  { value: 'new_surplus', label: 'New Surplus' },
  { value: 'rebuilt', label: 'Rebuilt' },
  { value: 'used_good', label: 'Used - Good' },
  { value: 'used_fair', label: 'Used - Fair' },
  { value: 'as_is', label: 'As-Is' },
]

export default function SosDetailPage() {
  const params = useParams()
  const router = useRouter()
  const sosId = params.id as string

  const [sos, setSos] = useState<Record<string, unknown> | null>(null)
  const [responses, setResponses] = useState<Record<string, unknown>[]>([])
  const [isRequester, setIsRequester] = useState(false)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)

  // Response form state
  const [responseForm, setResponseForm] = useState({
    message: '',
    price_estimate: '',
    lead_time: '',
    condition: '',
  })

  const loadData = useCallback(async () => {
    const result = await getSosDetail(sosId)
    if ('error' in result) {
      toast.error(result.error || 'SOS not found')
      router.push('/sos')
      return
    }
    setSos(result.sos as Record<string, unknown>)
    setResponses(result.responses as Record<string, unknown>[])
    setIsRequester(result.isRequester)
    setLoading(false)
  }, [sosId, router])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Real-time subscription for new responses
  useEffect(() => {
    const supabase = createClient()
    const channel = supabase
      .channel(`sos-responses-${sosId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'sos_responses',
          filter: `sos_request_id=eq.${sosId}`,
        },
        () => {
          loadData()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [sosId, loadData])

  const handleRespond = async () => {
    if (!responseForm.message.trim()) {
      toast.error('Please enter a message')
      return
    }

    setSubmitting(true)
    try {
      const result = await respondToSos(sosId, {
        message: responseForm.message,
        price_estimate: responseForm.price_estimate || undefined,
        lead_time: responseForm.lead_time || undefined,
        condition: responseForm.condition || undefined,
      })

      if (result.error) {
        toast.error(result.error)
        return
      }

      toast.success('Response sent!')
      setResponseForm({ message: '', price_estimate: '', lead_time: '', condition: '' })
      loadData()
    } finally {
      setSubmitting(false)
    }
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this SOS request?')) return
    const result = await updateSosStatus(sosId, 'cancelled')
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('SOS cancelled')
    router.push('/sos/my-requests')
  }

  const handleFulfill = async (responderId: string) => {
    const result = await markSosFulfilled(sosId, responderId)
    if (result.error) {
      toast.error(result.error)
      return
    }
    toast.success('SOS marked as fulfilled!')
    loadData()
  }

  if (loading) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-6">
        <Skeleton className="mb-4 h-8 w-48" />
        <Skeleton className="mb-2 h-24 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    )
  }

  if (!sos) return null

  const catLabel = getTier2Label(sos.equipment_category as string)
  const subLabel = sos.equipment_subcategory ? getSubcategoryLabel(sos.equipment_subcategory as string) : null
  const requester = sos.requester as Record<string, string> | null
  const requesterBiz = sos.requester_business as Record<string, string> | null

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-3">
        <Link href="/sos" className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge
              variant={sos.urgency === 'critical' ? 'destructive' : 'secondary'}
            >
              {sos.urgency === 'critical' ? (
                <><AlertTriangle className="mr-0.5 size-3" /> CRITICAL</>
              ) : (
                'Normal'
              )}
            </Badge>
            <Badge variant="outline">
              {(sos.status as string).toUpperCase()}
            </Badge>
          </div>
          <h1 className="mt-1 font-display text-xl font-bold text-foreground">
            {sos.title as string}
          </h1>
        </div>
      </div>

      {/* SOS Details */}
      <div className="mb-6 rounded-lg border border-border bg-surface p-4">
        <div className="flex items-center gap-3 text-sm">
          <div className="flex size-10 items-center justify-center rounded-full bg-primary/10">
            <Building2 className="size-5 text-primary" />
          </div>
          <div>
            <div className="font-medium text-foreground">
              {requesterBiz?.company_name || requester?.company_name || requester?.full_name || 'Anonymous'}
            </div>
            <div className="text-xs text-muted-foreground">
              {requesterBiz?.primary_role && (
                <span className="capitalize">{(requesterBiz.primary_role as string).replace('_', ' ')}</span>
              )}
            </div>
          </div>
        </div>

        {sos.description ? (
          <p className="mt-3 text-sm text-foreground">{sos.description as string}</p>
        ) : null}

        <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
          {catLabel ? <Badge variant="outline">{catLabel}</Badge> : null}
          {subLabel ? <Badge variant="outline">{subLabel}</Badge> : null}
          {sos.brand ? <span>Brand: {sos.brand as string}</span> : null}
          {sos.model ? <span>Model: {sos.model as string}</span> : null}
        </div>

        <Separator className="my-3" />

        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="size-3" />
            {sos.location_city as string || 'Houston'}, {sos.location_state as string || 'TX'}
            {' '}&middot; {sos.max_distance_miles as number}mi reach
          </span>
          <span className="flex items-center gap-1">
            <Clock className="size-3" />
            Posted {timeAgo(sos.created_at as string)}
          </span>
          <span className="flex items-center gap-1">
            <MessageSquare className="size-3" />
            {responses.length} response{responses.length !== 1 ? 's' : ''}
          </span>
        </div>

        {/* Requester actions */}
        {isRequester && sos.status === 'active' && (
          <div className="mt-4 flex gap-2">
            <Button variant="outline" size="sm" onClick={handleCancel} className="text-red-500">
              <X className="mr-1 size-3" /> Cancel SOS
            </Button>
          </div>
        )}
      </div>

      {/* Responses */}
      <div className="mb-6">
        <h2 className="mb-3 font-display text-lg font-semibold text-foreground">
          Responses ({responses.length})
        </h2>

        {responses.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border py-8 text-center">
            <MessageSquare className="mx-auto mb-2 size-8 text-muted-foreground/30" />
            <p className="text-sm text-muted-foreground">
              {isRequester ? 'No responses yet. Hang tight!' : 'Be the first to respond!'}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {responses.map((resp) => {
              const responder = resp.responder as Record<string, string> | null
              return (
                <div
                  key={resp.id as string}
                  className={`rounded-lg border p-4 ${
                    resp.status === 'accepted'
                      ? 'border-green-500/30 bg-green-500/5'
                      : 'border-border bg-surface'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex size-8 items-center justify-center rounded-full bg-steel/10">
                        <UserIcon className="size-4 text-steel" />
                      </div>
                      <div>
                        <div className="text-sm font-medium text-foreground">
                          {responder?.company_name || responder?.full_name || 'Anonymous'}
                        </div>
                        <div className="text-xs text-muted-foreground">{timeAgo(resp.created_at as string)}</div>
                      </div>
                    </div>
                    {resp.status === 'accepted' && (
                      <Badge className="bg-green-600 text-white">Accepted</Badge>
                    )}
                  </div>

                  <p className="mt-2 text-sm text-foreground">{resp.message as string}</p>

                  <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
                    {resp.price_estimate ? (
                      <span className="font-medium text-foreground">Est: {resp.price_estimate as string}</span>
                    ) : null}
                    {resp.lead_time ? <span>Lead time: {resp.lead_time as string}</span> : null}
                    {resp.condition ? (
                      <Badge variant="outline">{CONDITIONS.find((c) => c.value === resp.condition)?.label || (resp.condition as string)}</Badge>
                    ) : null}
                  </div>

                  {isRequester && sos.status === 'active' && resp.status === 'pending' && (
                    <div className="mt-3 flex gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleFulfill(resp.responder_id as string)}
                        className="bg-green-600 text-white hover:bg-green-700"
                      >
                        <Check className="mr-1 size-3" /> Accept & Mark Fulfilled
                      </Button>
                      <Link href={`/messages?to=${resp.responder_id}`}>
                        <Button size="sm" variant="outline">
                          <MessageSquare className="mr-1 size-3" /> Message
                        </Button>
                      </Link>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Response Form (for non-requesters on active SOS) */}
      {!isRequester && sos.status === 'active' && (
        <div className="rounded-lg border border-steel/30 bg-steel/5 p-4">
          <h3 className="mb-3 font-display text-sm font-semibold text-foreground">
            Respond to this SOS
          </h3>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label className="text-xs">Message <span className="text-primary">*</span></Label>
              <textarea
                value={responseForm.message}
                onChange={(e) => setResponseForm((p) => ({ ...p, message: e.target.value }))}
                placeholder="I have what you need. Here's what I can offer..."
                rows={3}
                className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div className="space-y-1">
                <Label className="text-xs">Price estimate</Label>
                <Input
                  value={responseForm.price_estimate}
                  onChange={(e) => setResponseForm((p) => ({ ...p, price_estimate: e.target.value }))}
                  placeholder="$2,500"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Lead time</Label>
                <Input
                  value={responseForm.lead_time}
                  onChange={(e) => setResponseForm((p) => ({ ...p, lead_time: e.target.value }))}
                  placeholder="Same day"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Condition</Label>
                <select
                  value={responseForm.condition}
                  onChange={(e) => setResponseForm((p) => ({ ...p, condition: e.target.value }))}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="">Select...</option>
                  {CONDITIONS.map((c) => (
                    <option key={c.value} value={c.value}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              onClick={handleRespond}
              disabled={submitting || !responseForm.message.trim()}
              className="gap-1"
            >
              <Send className="size-4" />
              {submitting ? 'Sending...' : 'Send Response'}
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
