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
} from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getTransaction, updateTransactionStatus } from '@/app/actions/transactions'
import { createPaymentIntent, capturePayment, cancelPayment } from '@/app/actions/payments'
import { StripePaymentForm } from '@/components/payments/stripe-payment-form'

const STATUS_STEPS = [
  { key: 'initiated', label: 'Initiated', icon: Clock },
  { key: 'payment_pending', label: 'Payment', icon: CreditCard },
  { key: 'paid', label: 'Paid', icon: DollarSign },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: Package },
  { key: 'completed', label: 'Complete', icon: CheckCircle2 },
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
      // Reload to get updated status
      await loadTransaction()
    }
    setPaymentLoading(false)
  }

  async function handlePaymentSuccess() {
    setShowPaymentForm(false)
    setClientSecret(null)
    // The payment has been authorized — update status to paid
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
                  <Label htmlFor="tracking" className="font-body">
                    Tracking Number
                  </Label>
                  <Input
                    id="tracking"
                    value={trackingNumber}
                    onChange={(e) => setTrackingNumber(e.target.value)}
                    placeholder="Enter tracking number"
                    className="font-body"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="carrier" className="font-body">
                    Carrier
                  </Label>
                  <Input
                    id="carrier"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="UPS, FedEx, USPS..."
                    className="font-body"
                  />
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
              {/* Buyer: Proceed to Payment */}
              {isBuyer && tx.status === 'initiated' && !showPaymentForm && (
                <Button
                  onClick={handleProceedToPayment}
                  disabled={paymentLoading}
                  className="font-body"
                >
                  {paymentLoading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 size-4" />
                  )}
                  Proceed to Payment
                </Button>
              )}

              {/* Buyer: Resume payment if already started */}
              {isBuyer && tx.status === 'payment_pending' && !showPaymentForm && (
                <Button
                  onClick={handleProceedToPayment}
                  disabled={paymentLoading}
                  className="font-body"
                >
                  {paymentLoading ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <CreditCard className="mr-2 size-4" />
                  )}
                  Complete Payment
                </Button>
              )}

              {/* Seller: Mark as Shipped */}
              {isSeller && tx.status === 'paid' && (
                <Button
                  onClick={() =>
                    handleStatusUpdate('shipped', {
                      tracking_number: trackingNumber || undefined,
                      carrier: carrier || undefined,
                    })
                  }
                  disabled={updating}
                  className="font-body"
                >
                  {updating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Truck className="mr-2 size-4" />}
                  Mark as Shipped
                </Button>
              )}

              {/* Buyer: Confirm Delivery */}
              {isBuyer && tx.status === 'shipped' && (
                <Button
                  onClick={() => handleStatusUpdate('delivered')}
                  disabled={updating}
                  className="font-body"
                >
                  {updating ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Package className="mr-2 size-4" />}
                  Confirm Delivery
                </Button>
              )}

              {/* Buyer: Complete Transaction (captures payment) */}
              {isBuyer && tx.status === 'delivered' && (
                <Button
                  onClick={handleCompleteTransaction}
                  disabled={updating}
                  className="font-body"
                >
                  {updating ? (
                    <Loader2 className="mr-2 size-4 animate-spin" />
                  ) : (
                    <CheckCircle2 className="mr-2 size-4" />
                  )}
                  Complete & Release Funds
                </Button>
              )}

              {/* Cancel button for buyer (before shipped) */}
              {isBuyer && ['payment_pending', 'paid'].includes(tx.status) && tx.stripe_payment_intent_id && (
                <Button
                  variant="outline"
                  onClick={handleCancelTransaction}
                  disabled={updating}
                  className="font-body text-red-400 hover:text-red-300"
                >
                  <XCircle className="mr-2 size-4" />
                  Cancel Transaction
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

      {/* Meta */}
      <div className="font-body text-xs text-muted-foreground">
        <p>Created: {new Date(tx.created_at).toLocaleString()}</p>
        <p>Updated: {new Date(tx.updated_at).toLocaleString()}</p>
        {tx.stripe_payment_intent_id && (
          <p>Payment ID: {tx.stripe_payment_intent_id}</p>
        )}
        <p>ID: {tx.id}</p>
      </div>
    </div>
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
