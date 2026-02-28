'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Loader2,
  ArrowLeft,
  Package,
  CreditCard,
  Truck,
  CheckCircle2,
  Clock,
  ShieldCheck,
  XCircle,
  DollarSign,
  AlertTriangle,
  Upload,
  MessageSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { getTransaction, updateTransactionStatus } from '@/app/actions/transactions'
import { createPaymentIntent, capturePayment, cancelPayment } from '@/app/actions/payments'
import { openDispute, respondToDispute, getDispute, uploadDisputeEvidence } from '@/app/actions/disputes'
import { StripePaymentForm } from '@/components/payments/stripe-payment-form'

const STATUS_STEPS = [
  { key: 'initiated', label: 'Initiated', icon: Clock },
  { key: 'payment_pending', label: 'Payment', icon: CreditCard },
  { key: 'paid', label: 'Paid', icon: DollarSign },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Package },
  { key: 'completed', label: 'Complete', icon: CheckCircle2 },
]

const DISPUTE_REASONS = [
  { value: 'item_not_received', label: 'Item Not Received' },
  { value: 'item_not_as_described', label: 'Item Not as Described' },
  { value: 'damaged_in_shipping', label: 'Damaged in Shipping' },
  { value: 'wrong_item', label: 'Wrong Item Received' },
  { value: 'other', label: 'Other' },
]

export default function TransactionDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [tx, setTx] = useState<any>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState(false)
  const [trackingNumber, setTrackingNumber] = useState('')
  const [carrier, setCarrier] = useState('')
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [clientSecret, setClientSecret] = useState<string | null>(null)
  const [paymentLoading, setPaymentLoading] = useState(false)

  // Dispute state
  const [showDisputeForm, setShowDisputeForm] = useState(false)
  const [disputeReason, setDisputeReason] = useState('item_not_received')
  const [disputeDescription, setDisputeDescription] = useState('')
  const [disputeEvidence, setDisputeEvidence] = useState<string[]>([])
  const [disputeSubmitting, setDisputeSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [disputes, setDisputes] = useState<any[]>([])
  const [showSellerResponse, setShowSellerResponse] = useState(false)
  const [sellerResponseText, setSellerResponseText] = useState('')
  const [sellerEvidence, setSellerEvidence] = useState<string[]>([])

  useEffect(() => {
    loadTransaction()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function loadTransaction() {
    const result = await getTransaction(id)
    if (result.error) {
      toast.error(result.error)
      router.push('/transactions')
      return
    }
    setTx(result.transaction)
    setUserId(result.userId || null)
    if (result.transaction?.tracking_number) setTrackingNumber(result.transaction.tracking_number)
    if (result.transaction?.carrier) setCarrier(result.transaction.carrier)
    setLoading(false)

    // Load disputes
    const disputeResult = await getDispute(id)
    if (disputeResult.disputes) setDisputes(disputeResult.disputes)
  }

  async function handleStatusUpdate(newStatus: string, extraData?: { tracking_number?: string; carrier?: string }) {
    setUpdating(true)
    const result = await updateTransactionStatus(id, newStatus, extraData)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Transaction updated')
      loadTransaction()
    }
    setUpdating(false)
  }

  async function handleProceedToPayment() {
    setPaymentLoading(true)
    const result = await createPaymentIntent(id)
    if (result.error) {
      toast.error(result.error)
      setPaymentLoading(false)
      return
    }
    if (result.clientSecret) {
      setClientSecret(result.clientSecret)
      setShowPaymentForm(true)
      await loadTransaction()
    }
    setPaymentLoading(false)
  }

  async function handlePaymentSuccess() {
    setShowPaymentForm(false)
    setClientSecret(null)
    const result = await updateTransactionStatus(id, 'paid')
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Payment authorized — funds held in escrow')
    }
    loadTransaction()
  }

  async function handleCompleteTransaction() {
    setUpdating(true)
    const result = await capturePayment(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Transaction complete — funds released to seller')
    }
    loadTransaction()
    setUpdating(false)
  }

  async function handleCancelTransaction() {
    if (!confirm('Are you sure you want to cancel this transaction? The payment authorization will be voided.')) return
    setUpdating(true)
    const result = await cancelPayment(id)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Transaction cancelled')
    }
    loadTransaction()
    setUpdating(false)
  }

  async function handleEvidenceUpload(e: React.ChangeEvent<HTMLInputElement>, target: 'buyer' | 'seller') {
    const files = e.target.files
    if (!files) return

    setUploading(true)
    const urls: string[] = []
    for (const file of Array.from(files).slice(0, 5)) {
      const formData = new FormData()
      formData.append('file', file)
      const result = await uploadDisputeEvidence(formData)
      if (result.url) urls.push(result.url)
    }

    if (target === 'buyer') {
      setDisputeEvidence((prev) => [...prev, ...urls].slice(0, 5))
    } else {
      setSellerEvidence((prev) => [...prev, ...urls].slice(0, 5))
    }
    setUploading(false)
  }

  async function handleOpenDispute() {
    if (!disputeDescription.trim()) {
      toast.error('Please describe the issue')
      return
    }
    setDisputeSubmitting(true)
    const result = await openDispute(id, disputeReason, disputeDescription, disputeEvidence)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Dispute opened successfully')
      setShowDisputeForm(false)
      setDisputeDescription('')
      setDisputeEvidence([])
      loadTransaction()
    }
    setDisputeSubmitting(false)
  }

  async function handleSellerRespond(disputeId: string) {
    if (!sellerResponseText.trim()) {
      toast.error('Please provide a response')
      return
    }
    setDisputeSubmitting(true)
    const result = await respondToDispute(disputeId, sellerResponseText, sellerEvidence)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Response submitted')
      setShowSellerResponse(false)
      setSellerResponseText('')
      setSellerEvidence([])
      loadTransaction()
    }
    setDisputeSubmitting(false)
  }

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="size-8 animate-spin text-primary" />
      </div>
    )
  }

  if (!tx) return null

  const isBuyer = tx.buyer_id === userId
  const isSeller = tx.seller_id === userId
  const listing = tx.listings
  const image = listing?.listing_images
    ?.sort((a: { position: number }, b: { position: number }) => a.position - b.position)[0]?.url

  const currentStepIdx = STATUS_STEPS.findIndex((s) => s.key === tx.status)
  const isCancelled = tx.status === 'cancelled'
  const isDisputed = tx.status === 'disputed'
  const platformFeeCents = tx.platform_fee_cents || Math.round(tx.amount_cents * 5 / 100)
  const canOpenDispute = isBuyer && ['shipped', 'delivered'].includes(tx.status) && !disputes.some((d: { status: string }) => ['open', 'under_review', 'escalated'].includes(d.status))
  const activeDispute = disputes.find((d: { status: string }) => ['open', 'under_review', 'escalated'].includes(d.status))

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild className="font-body">
          <Link href="/transactions">
            <ArrowLeft className="mr-1 size-3" />
            Back
          </Link>
        </Button>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Transaction Details
        </h1>
      </div>

      {/* Cancelled / Disputed Banner */}
      {isCancelled && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
          <XCircle className="size-5 text-red-400" />
          <p className="font-body text-sm text-red-300">This transaction has been cancelled.</p>
        </div>
      )}
      {isDisputed && (
        <div className="flex items-center gap-3 rounded-lg border border-yellow-500/30 bg-yellow-500/10 p-4">
          <ShieldCheck className="size-5 text-yellow-400" />
          <p className="font-body text-sm text-yellow-300">This transaction is under dispute. Payment is held until resolved.</p>
        </div>
      )}

      {/* Status Timeline */}
      {!isCancelled && (
        <Card className="border-border bg-card">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              {STATUS_STEPS.map((step, i) => {
                const isActive = i <= currentStepIdx
                const isCurrent = step.key === tx.status
                const StepIcon = step.icon

                return (
                  <div key={step.key} className="flex flex-col items-center gap-1">
                    <div
                      className={`flex size-10 items-center justify-center rounded-full border-2 transition-colors ${
                        isCurrent
                          ? 'border-primary bg-primary/20'
                          : isActive
                            ? 'border-green-500 bg-green-500/20'
                            : 'border-border bg-surface'
                      }`}
                    >
                      <StepIcon
                        className={`size-5 ${
                          isCurrent
                            ? 'text-primary'
                            : isActive
                              ? 'text-green-400'
                              : 'text-muted-foreground'
                        }`}
                      />
                    </div>
                    <span
                      className={`font-body text-[10px] ${
                        isActive ? 'text-foreground' : 'text-muted-foreground'
                      }`}
                    >
                      {step.label}
                    </span>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Listing Info */}
      <Card className="border-border bg-card">
        <CardContent className="flex gap-4 p-4">
          <div className="size-20 shrink-0 overflow-hidden rounded-lg bg-surface">
            {image ? (
              <img src={image} alt={listing?.title} className="size-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center">
                <Package className="size-6 text-muted-foreground/40" />
              </div>
            )}
          </div>
          <div className="flex-1">
            <Link
              href={`/listings/${tx.listing_id}`}
              className="font-body text-sm font-medium text-foreground hover:text-primary"
            >
              {listing?.title || 'Unknown Listing'}
            </Link>
            <p className="mt-0.5 font-body text-xs text-muted-foreground">
              {listing?.category}
            </p>
            <p className="mt-1 font-display text-lg font-bold text-primary">
              ${(tx.amount_cents / 100).toLocaleString()}
            </p>
            {tx.platform_fee_cents > 0 && (
              <p className="font-body text-[10px] text-muted-foreground">
                Platform fee: ${(tx.platform_fee_cents / 100).toLocaleString()} (5%)
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Parties */}
      <div className="grid gap-4 sm:grid-cols-2">
        <PartyCard label="Buyer" party={tx.buyer} isYou={isBuyer} />
        <PartyCard label="Seller" party={tx.seller} isYou={isSeller} />
      </div>

      {/* Stripe Payment Form */}
      {showPaymentForm && clientSecret && (
        <Card className="border-primary/30 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <CreditCard className="size-5 text-primary" />
              Secure Payment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <StripePaymentForm
              clientSecret={clientSecret}
              amount={tx.amount_cents}
              platformFee={platformFeeCents}
              onSuccess={handlePaymentSuccess}
              onCancel={() => {
                setShowPaymentForm(false)
                setClientSecret(null)
              }}
            />
          </CardContent>
        </Card>
      )}

      {/* Escrow Info */}
      {(tx.status === 'paid' || tx.status === 'shipped') && (
        <div className="flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-blue-400" />
          <div>
            <p className="font-body text-sm font-medium text-blue-300">Payment Held in Escrow</p>
            <p className="mt-1 font-body text-xs text-blue-300/70">
              ${(tx.amount_cents / 100).toLocaleString()} is authorized and held securely. Funds will be released to the seller when you confirm delivery and complete the transaction.
            </p>
          </div>
        </div>
      )}

      {/* Tracking Info */}
      {(tx.tracking_number || tx.status === 'paid') && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Truck className="size-5" />
              Shipping
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tx.tracking_number ? (
              <div className="space-y-1">
                <p className="font-body text-sm text-foreground">
                  Tracking: <strong>{tx.tracking_number}</strong>
                </p>
                {tx.carrier && (
                  <p className="font-body text-xs text-muted-foreground">
                    Carrier: {tx.carrier}
                  </p>
                )}
              </div>
            ) : isSeller && tx.status === 'paid' ? (
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="tracking" className="font-body">Tracking Number</Label>
                  <Input id="tracking" value={trackingNumber} onChange={(e) => setTrackingNumber(e.target.value)} placeholder="Enter tracking number" className="font-body" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carrier" className="font-body">Carrier</Label>
                  <Input id="carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="UPS, FedEx, USPS..." className="font-body" />
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      {!isCancelled && !isDisputed && (
        <Card className="border-border bg-card">
          <CardContent className="p-4">
            <div className="flex flex-wrap gap-2">
              {isBuyer && tx.status === 'initiated' && !showPaymentForm && (
                <Button onClick={handleProceedToPayment} disabled={paymentLoading} className="font-body">
                  {paymentLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CreditCard className="mr-2 size-4" />}
                  Proceed to Payment
                </Button>
              )}

              {isBuyer && tx.status === 'payment_pending' && !showPaymentForm && (
                <Button onClick={handleProceedToPayment} disabled={paymentLoading} className="font-body">
                  {paymentLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CreditCard className="mr-2 size-4" />}
                  Complete Payment
                </Button>
              )}

              {isSeller && tx.status === 'paid' && (
                <Button onClick={() => handleStatusUpdate('shipped', { tracking_number: trackingNumber || undefined, carrier: carrier || undefined })} disabled={updating} className="font-body">
                  {updating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Truck className="mr-2 size-4" />}
                  Mark as Shipped
                </Button>
              )}

              {isBuyer && tx.status === 'shipped' && (
                <Button onClick={() => handleStatusUpdate('delivered')} disabled={updating} className="font-body">
                  {updating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Package className="mr-2 size-4" />}
                  Confirm Delivery
                </Button>
              )}

              {isBuyer && tx.status === 'delivered' && (
                <Button onClick={handleCompleteTransaction} disabled={updating} className="font-body">
                  {updating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <CheckCircle2 className="mr-2 size-4" />}
                  Complete & Release Funds
                </Button>
              )}

              {isBuyer && ['payment_pending', 'paid'].includes(tx.status) && tx.stripe_payment_intent_id && (
                <Button variant="outline" onClick={handleCancelTransaction} disabled={updating} className="font-body text-red-400 hover:text-red-300">
                  <XCircle className="mr-2 size-4" />
                  Cancel Transaction
                </Button>
              )}

              {/* Open Dispute button */}
              {canOpenDispute && (
                <Button variant="outline" onClick={() => setShowDisputeForm(true)} className="font-body text-yellow-400 hover:text-yellow-300">
                  <AlertTriangle className="mr-2 size-4" />
                  Open Dispute
                </Button>
              )}

              {tx.status === 'completed' && (
                <Badge className="bg-green-500/20 font-body text-green-400">
                  <CheckCircle2 className="mr-1 size-3" />
                  Transaction Complete — Funds Released
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dispute Form */}
      {showDisputeForm && (
        <Card className="border-yellow-500/30 bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg text-yellow-400">
              <AlertTriangle className="size-5" />
              Open a Dispute
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label className="font-body">Reason</Label>
              <select
                value={disputeReason}
                onChange={(e) => setDisputeReason(e.target.value)}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 font-body text-sm text-foreground"
              >
                {DISPUTE_REASONS.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label className="font-body">Describe the issue</Label>
              <textarea
                value={disputeDescription}
                onChange={(e) => setDisputeDescription(e.target.value)}
                placeholder="Please describe what happened in detail..."
                rows={4}
                className="w-full rounded-md border border-border bg-surface px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground"
              />
            </div>

            <div className="space-y-2">
              <Label className="font-body">Evidence Photos (up to 5)</Label>
              <div className="flex flex-wrap gap-2">
                {disputeEvidence.map((url, i) => (
                  <div key={i} className="relative size-16 overflow-hidden rounded-lg border border-border">
                    <img src={url} alt={`Evidence ${i + 1}`} className="size-full object-cover" />
                    <button
                      onClick={() => setDisputeEvidence((prev) => prev.filter((_, j) => j !== i))}
                      className="absolute right-0.5 top-0.5 rounded-full bg-black/70 p-0.5"
                    >
                      <XCircle className="size-3 text-red-400" />
                    </button>
                  </div>
                ))}
                {disputeEvidence.length < 5 && (
                  <label className="flex size-16 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed border-border hover:border-primary/50">
                    {uploading ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : <Upload className="size-4 text-muted-foreground" />}
                    <input type="file" accept="image/*" multiple onChange={(e) => handleEvidenceUpload(e, 'buyer')} className="hidden" />
                  </label>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowDisputeForm(false)} className="font-body">Cancel</Button>
              <Button onClick={handleOpenDispute} disabled={disputeSubmitting} className="bg-yellow-600 font-body text-white hover:bg-yellow-700">
                {disputeSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : <AlertTriangle className="mr-2 size-4" />}
                Submit Dispute
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Dispute Timeline */}
      {disputes.length > 0 && (
        <Card className="border-border bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <ShieldCheck className="size-5" />
              Dispute History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {disputes.map((d: {
              id: string
              reason: string
              description: string
              evidence_urls: string[]
              status: string
              seller_response: string | null
              seller_evidence_urls: string[]
              resolution_notes: string | null
              created_at: string
              updated_at: string
              opener: { full_name: string; display_name: string | null } | null
            }) => (
              <div key={d.id} className="space-y-3">
                {/* Dispute header */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="size-4 text-yellow-400" />
                    <span className="font-body text-sm font-medium text-foreground">
                      {DISPUTE_REASONS.find((r) => r.value === d.reason)?.label || d.reason}
                    </span>
                  </div>
                  <DisputeStatusBadge status={d.status} />
                </div>

                {/* Buyer's complaint */}
                <div className="rounded-lg border border-border bg-surface/50 p-3">
                  <p className="font-body text-xs text-muted-foreground">
                    Opened by {d.opener?.display_name || d.opener?.full_name || 'Buyer'} on{' '}
                    {new Date(d.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </p>
                  <p className="mt-1 font-body text-sm text-foreground">{d.description}</p>
                  {d.evidence_urls.length > 0 && (
                    <div className="mt-2 flex gap-2">
                      {d.evidence_urls.map((url, i) => (
                        <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="size-12 overflow-hidden rounded border border-border">
                          <img src={url} alt={`Evidence ${i + 1}`} className="size-full object-cover" />
                        </a>
                      ))}
                    </div>
                  )}
                </div>

                {/* Seller response */}
                {d.seller_response && (
                  <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                    <p className="font-body text-xs text-muted-foreground">Seller Response</p>
                    <p className="mt-1 font-body text-sm text-foreground">{d.seller_response}</p>
                    {d.seller_evidence_urls.length > 0 && (
                      <div className="mt-2 flex gap-2">
                        {d.seller_evidence_urls.map((url, i) => (
                          <a key={i} href={url} target="_blank" rel="noopener noreferrer" className="size-12 overflow-hidden rounded border border-border">
                            <img src={url} alt={`Seller evidence ${i + 1}`} className="size-full object-cover" />
                          </a>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Seller respond button */}
                {isSeller && ['open', 'under_review'].includes(d.status) && !d.seller_response && (
                  <>
                    {!showSellerResponse ? (
                      <Button variant="outline" size="sm" onClick={() => setShowSellerResponse(true)} className="font-body">
                        <MessageSquare className="mr-2 size-3" />
                        Respond to Dispute
                      </Button>
                    ) : (
                      <div className="space-y-3 rounded-lg border border-border p-3">
                        <textarea
                          value={sellerResponseText}
                          onChange={(e) => setSellerResponseText(e.target.value)}
                          placeholder="Provide your side of the story..."
                          rows={3}
                          className="w-full rounded-md border border-border bg-surface px-3 py-2 font-body text-sm text-foreground placeholder:text-muted-foreground"
                        />
                        <div className="flex flex-wrap gap-2">
                          {sellerEvidence.map((url, i) => (
                            <div key={i} className="relative size-12 overflow-hidden rounded border border-border">
                              <img src={url} alt="" className="size-full object-cover" />
                            </div>
                          ))}
                          {sellerEvidence.length < 5 && (
                            <label className="flex size-12 cursor-pointer items-center justify-center rounded border-2 border-dashed border-border">
                              {uploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3 text-muted-foreground" />}
                              <input type="file" accept="image/*" multiple onChange={(e) => handleEvidenceUpload(e, 'seller')} className="hidden" />
                            </label>
                          )}
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setShowSellerResponse(false)} className="font-body">Cancel</Button>
                          <Button size="sm" onClick={() => handleSellerRespond(d.id)} disabled={disputeSubmitting} className="font-body">
                            {disputeSubmitting && <Loader2 className="mr-2 size-3 animate-spin" />}
                            Submit Response
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Resolution notes */}
                {d.resolution_notes && (
                  <div className="rounded-lg border border-green-500/20 bg-green-500/5 p-3">
                    <p className="font-body text-xs text-muted-foreground">Resolution</p>
                    <p className="mt-1 font-body text-sm text-foreground">{d.resolution_notes}</p>
                  </div>
                )}

                {disputes.indexOf(d) < disputes.length - 1 && <Separator />}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Meta */}
      <div className="font-body text-xs text-muted-foreground">
        <p>Created: {new Date(tx.created_at).toLocaleString()}</p>
        <p>Updated: {new Date(tx.updated_at).toLocaleString()}</p>
        {tx.stripe_payment_intent_id && <p>Payment ID: {tx.stripe_payment_intent_id}</p>}
        <p>ID: {tx.id}</p>
      </div>
    </div>
  )
}

function DisputeStatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open: 'bg-yellow-500/20 text-yellow-400',
    under_review: 'bg-blue-500/20 text-blue-400',
    resolved_buyer: 'bg-green-500/20 text-green-400',
    resolved_seller: 'bg-green-500/20 text-green-400',
    escalated: 'bg-red-500/20 text-red-400',
  }
  const labels: Record<string, string> = {
    open: 'Open',
    under_review: 'Under Review',
    resolved_buyer: 'Resolved (Buyer)',
    resolved_seller: 'Resolved (Seller)',
    escalated: 'Escalated',
  }
  return (
    <Badge className={`font-body text-[10px] ${styles[status] || 'bg-muted text-muted-foreground'}`}>
      {labels[status] || status}
    </Badge>
  )
}

function PartyCard({
  label,
  party,
  isYou,
}: {
  label: string
  party: { full_name: string; display_name: string | null; avatar_url: string | null } | null
  isYou: boolean
}) {
  return (
    <Card className="border-border bg-card">
      <CardContent className="flex items-center gap-3 p-4">
        <Avatar className="size-10">
          <AvatarImage src={party?.avatar_url || undefined} />
          <AvatarFallback className="bg-primary/20 font-body text-sm text-primary">
            {(party?.display_name || party?.full_name || '?')[0]?.toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <div>
          <p className="font-body text-sm font-medium text-foreground">
            {party?.display_name || party?.full_name || 'Unknown'}
            {isYou && (
              <span className="ml-1 font-body text-[10px] text-muted-foreground">(You)</span>
            )}
          </p>
          <p className="font-body text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}
