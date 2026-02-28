'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Suspense } from 'react'
import { CheckCircle, Loader2, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  )
}

function SuccessContent() {
  useSearchParams() // triggers Suspense boundary
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Give the webhook a moment to process
    const timer = setTimeout(() => setReady(true), 2000)
    return () => clearTimeout(timer)
  }, [])

  if (!ready) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <Loader2 className="size-8 animate-spin text-primary" />
        <p className="font-body text-muted-foreground">
          Activating your subscription...
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md items-center justify-center px-4">
      <Card className="w-full border-border bg-card">
        <CardContent className="flex flex-col items-center gap-6 p-8 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-green-500/20">
            <CheckCircle className="size-8 text-green-400" />
          </div>

          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">
              Welcome to Premium!
            </h1>
            <p className="mt-2 font-body text-muted-foreground">
              Your subscription is now active. You have access to all premium
              features.
            </p>
          </div>

          <div className="flex w-full flex-col gap-3">
            <Button asChild className="w-full font-body">
              <Link href="/dashboard">
                Go to Dashboard
                <ArrowRight className="ml-2 size-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="w-full font-body">
              <Link href="/listings/new">Create a Listing</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
