'use client'

import { useState } from 'react'
import {
  Elements,
  PaymentElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js'
import { loadStripe } from '@stripe/stripe-js'
import { Loader2, CreditCard, ShieldCheck } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY!)

interface PaymentFormProps {
  clientSecret: string
  amount: number
  platformFee: number
  onSuccess: () => void
  onCancel: () => void
}

function CheckoutForm({ amount, platformFee, onSuccess, onCancel }: Omit<PaymentFormProps, 'clientSecret'>) {
  const stripe = useStripe()
  const elements = useElements()
  const [processing, setProcessing] = useState(false)
  const [ready, setReady] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!stripe || !elements) return

    setProcessing(true)

    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: window.location.href,
      },
      redirect: 'if_required',
    })

    if (error) {
      toast.error(error.message || 'Payment failed')
      setProcessing(false)
    } else {
      toast.success('Payment authorized successfully')
      onSuccess()
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="rounded-lg border border-border bg-[#0d0d14] p-4">
        <PaymentElement
          onReady={() => setReady(true)}
          options={{
            layout: 'tabs',
          }}
        />
      </div>

      {ready && (
        <>
          <div className="space-y-2 rounded-lg border border-border bg-surface/50 p-4">
            <div className="flex items-center justify-between font-body text-sm">
              <span className="text-muted-foreground">Item total</span>
              <span className="text-foreground">${(amount / 100).toLocaleString()}</span>
            </div>
            <div className="flex items-center justify-between font-body text-sm">
              <span className="text-muted-foreground">Platform fee (5%)</span>
              <span className="text-muted-foreground">${(platformFee / 100).toLocaleString()}</span>
            </div>
            <div className="border-t border-border pt-2">
              <div className="flex items-center justify-between font-body text-sm font-medium">
                <span className="text-foreground">You pay</span>
                <span className="font-display text-lg font-bold text-primary">
                  ${(amount / 100).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-lg bg-green-500/10 p-3">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-green-400" />
            <p className="font-body text-xs text-green-300">
              Your payment is held securely until you confirm delivery. Funds are only released to the seller after you approve.
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={processing}
              className="font-body"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!stripe || processing}
              className="flex-1 font-body"
            >
              {processing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <CreditCard className="mr-2 size-4" />
              )}
              {processing ? 'Processing...' : `Authorize $${(amount / 100).toLocaleString()}`}
            </Button>
          </div>
        </>
      )}

      {!ready && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      )}
    </form>
  )
}

export function StripePaymentForm({
  clientSecret,
  amount,
  platformFee,
  onSuccess,
  onCancel,
}: PaymentFormProps) {
  return (
    <Elements
      stripe={stripePromise}
      options={{
        clientSecret,
        appearance: {
          theme: 'night',
          variables: {
            colorPrimary: '#FF6B2B',
            colorBackground: '#0d0d14',
            colorText: '#e5e5e5',
            colorTextSecondary: '#888',
            colorDanger: '#ef4444',
            fontFamily: 'Manrope, system-ui, sans-serif',
            borderRadius: '8px',
            spacingUnit: '4px',
          },
          rules: {
            '.Input': {
              border: '1px solid #2a2a35',
              backgroundColor: '#0d0d14',
            },
            '.Input:focus': {
              border: '1px solid #FF6B2B',
              boxShadow: '0 0 0 1px #FF6B2B33',
            },
            '.Tab': {
              border: '1px solid #2a2a35',
              backgroundColor: '#0d0d14',
            },
            '.Tab--selected': {
              border: '1px solid #FF6B2B',
              backgroundColor: '#FF6B2B1a',
            },
          },
        },
      }}
    >
      <CheckoutForm
        amount={amount}
        platformFee={platformFee}
        onSuccess={onSuccess}
        onCancel={onCancel}
      />
    </Elements>
  )
}
