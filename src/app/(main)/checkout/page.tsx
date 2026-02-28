'use client'

import { useEffect } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { createCheckoutSession } from './actions'

export default function CheckoutPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <CheckoutContent />
    </Suspense>
  )
}

function CheckoutContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const priceId = searchParams.get('price')

  useEffect(() => {
    if (!priceId) {
      router.push('/pricing')
      return
    }

    async function redirectToStripe() {
      const result = await createCheckoutSession(priceId!)
      if (result.error) {
        toast.error(result.error)
        router.push('/pricing')
        return
      }
      if (result.url) {
        window.location.href = result.url
      }
    }

    redirectToStripe()
  }, [priceId, router])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
      <Loader2 className="size-8 animate-spin text-primary" />
      <p className="font-body text-muted-foreground">
        Redirecting to checkout...
      </p>
    </div>
  )
}
