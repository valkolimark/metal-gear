'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Zap, Crown, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { useAuthStore } from '@/stores/auth-store'
import { TIER_LIMITS } from '@/lib/constants'

const PLANS = [
  {
    tier: 'free' as const,
    name: 'Free',
    price: 0,
    description: 'Get started listing your equipment',
    icon: null,
    features: [
      `${TIER_LIMITS.free.listings} active listings`,
      `${TIER_LIMITS.free.photos} photos per listing`,
      `${TIER_LIMITS.free.conversations} conversations`,
      `${TIER_LIMITS.free.searchRadius} mile search radius`,
      'Basic seller profile',
      'Email support',
    ],
    cta: 'Get Started',
    priceId: null,
    popular: false,
  },
  {
    tier: 'premium' as const,
    name: 'Premium',
    price: 29.99,
    description: 'For active sellers and dealers',
    icon: Zap,
    features: [
      `${TIER_LIMITS.premium.listings} active listings`,
      `${TIER_LIMITS.premium.photos} photos per listing`,
      `${TIER_LIMITS.premium.videos} videos per listing`,
      'Unlimited conversations',
      `${TIER_LIMITS.premium.searchRadius} mile search radius`,
      'Priority in search results',
      'Verified seller badge',
      'Priority support',
    ],
    cta: 'Upgrade to Premium',
    priceId: process.env.NEXT_PUBLIC_STRIPE_PREMIUM_PRICE_ID,
    popular: true,
  },
  {
    tier: 'boost' as const,
    name: 'Boost',
    price: 79.99,
    description: 'For high-volume dealers and enterprises',
    icon: Crown,
    features: [
      `${TIER_LIMITS.boost.listings} active listings`,
      `${TIER_LIMITS.boost.photos} photos per listing`,
      `${TIER_LIMITS.boost.videos} videos per listing`,
      'Unlimited conversations',
      'Unlimited search radius',
      'Featured listings',
      'Verified dealer badge',
      'Dedicated account manager',
    ],
    cta: 'Upgrade to Boost',
    priceId: process.env.NEXT_PUBLIC_STRIPE_BOOST_PRICE_ID,
    popular: false,
  },
]

const COMPARISON = [
  { feature: 'Active Listings', free: '3', premium: '15', boost: '50' },
  { feature: 'Photos per Listing', free: '5', premium: '15', boost: '25' },
  { feature: 'Videos per Listing', free: '—', premium: '3', boost: '5' },
  { feature: 'Conversations', free: '10', premium: 'Unlimited', boost: 'Unlimited' },
  { feature: 'Search Radius', free: '100 mi', premium: '500 mi', boost: 'Unlimited' },
  { feature: 'Priority Search', free: '—', premium: '✓', boost: '✓' },
  { feature: 'Verified Badge', free: '—', premium: '✓', boost: '✓' },
  { feature: 'Featured Listings', free: '—', premium: '—', boost: '✓' },
  { feature: 'Support', free: 'Email', premium: 'Priority', boost: 'Dedicated' },
]

const FAQS = [
  {
    q: 'Can I change my plan later?',
    a: 'Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we prorate billing for the remainder of your cycle.',
  },
  {
    q: 'What happens to my listings if I downgrade?',
    a: 'Your existing listings remain active, but you won\'t be able to create new ones until you\'re within the limits of your new plan.',
  },
  {
    q: 'Is there a contract or commitment?',
    a: 'No. All plans are month-to-month with no long-term commitment. Cancel anytime from your profile settings.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit and debit cards through Stripe, including Visa, Mastercard, American Express, and Discover.',
  },
  {
    q: 'Do you offer refunds?',
    a: 'We offer a pro-rated refund if you cancel within the first 7 days of your billing cycle. After that, your plan remains active until the end of the current period.',
  },
]

export default function PricingPage() {
  const router = useRouter()
  const { isAuthenticated, profile } = useAuthStore()
  const currentTier = profile?.subscription_tier ?? 'free'

  function handleSelectPlan(plan: (typeof PLANS)[number]) {
    if (plan.tier === 'free') {
      router.push(isAuthenticated ? '/dashboard' : '/signup')
      return
    }

    if (!isAuthenticated) {
      router.push('/signup')
      return
    }

    if (plan.tier === currentTier) return

    // Redirect to checkout with the Stripe price ID
    const priceId =
      plan.tier === 'premium'
        ? 'price_1T5qSuK0aD0I9hZISnkpcF3E'
        : 'price_1T5qTBK0aD0I9hZIYYNtRrBt'
    router.push(`/checkout?price=${priceId}`)
  }

  return (
    <div className="mx-auto max-w-6xl space-y-16 px-4 py-16 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center">
        <h1 className="font-display text-4xl font-bold text-foreground sm:text-5xl">
          Simple, transparent pricing
        </h1>
        <p className="mx-auto mt-4 max-w-2xl font-body text-lg text-muted-foreground">
          Start free and upgrade as your business grows. No hidden fees, no
          long-term commitments.
        </p>
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-6 lg:grid-cols-3">
        {PLANS.map((plan) => {
          const isCurrent = isAuthenticated && plan.tier === currentTier
          const Icon = plan.icon

          return (
            <Card
              key={plan.tier}
              className={`relative border-border bg-card ${
                plan.popular
                  ? 'border-primary ring-1 ring-primary'
                  : ''
              }`}
            >
              {plan.popular && (
                <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary font-body text-xs">
                  Most Popular
                </Badge>
              )}

              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  {Icon && <Icon className="size-5 text-primary" />}
                  <CardTitle className="font-display text-xl">
                    {plan.name}
                  </CardTitle>
                </div>
                <p className="font-body text-sm text-muted-foreground">
                  {plan.description}
                </p>
              </CardHeader>

              <CardContent className="space-y-6">
                <div>
                  <span className="font-display text-4xl font-bold text-foreground">
                    ${plan.price}
                  </span>
                  {plan.price > 0 && (
                    <span className="font-body text-muted-foreground">
                      /month
                    </span>
                  )}
                </div>

                <Button
                  onClick={() => handleSelectPlan(plan)}
                  variant={plan.popular ? 'default' : 'outline'}
                  className="w-full font-body"
                  disabled={isCurrent}
                >
                  {isCurrent ? (
                    'Current Plan'
                  ) : (
                    <>
                      {plan.cta}
                      <ArrowRight className="ml-2 size-4" />
                    </>
                  )}
                </Button>

                <Separator />

                <ul className="space-y-3">
                  {plan.features.map((feature) => (
                    <li
                      key={feature}
                      className="flex items-start gap-2 font-body text-sm text-muted-foreground"
                    >
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Feature Comparison Table */}
      <div>
        <h2 className="mb-8 text-center font-display text-2xl font-bold text-foreground">
          Compare Plans
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full font-body text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="pb-4 pr-4 text-left font-medium text-muted-foreground">
                  Feature
                </th>
                <th className="pb-4 px-4 text-center font-medium text-muted-foreground">
                  Free
                </th>
                <th className="pb-4 px-4 text-center font-medium text-primary">
                  Premium
                </th>
                <th className="pb-4 pl-4 text-center font-medium text-muted-foreground">
                  Boost
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.feature} className="border-b border-border/50">
                  <td className="py-3 pr-4 text-foreground">{row.feature}</td>
                  <td className="py-3 px-4 text-center text-muted-foreground">
                    {row.free}
                  </td>
                  <td className="py-3 px-4 text-center text-foreground">
                    {row.premium}
                  </td>
                  <td className="py-3 pl-4 text-center text-foreground">
                    {row.boost}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* FAQ */}
      <div>
        <h2 className="mb-8 text-center font-display text-2xl font-bold text-foreground">
          Frequently Asked Questions
        </h2>
        <div className="mx-auto max-w-3xl space-y-6">
          {FAQS.map((faq) => (
            <Card key={faq.q} className="border-border bg-card">
              <CardContent className="p-6">
                <h3 className="font-display text-base font-semibold text-foreground">
                  {faq.q}
                </h3>
                <p className="mt-2 font-body text-sm text-muted-foreground">
                  {faq.a}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
