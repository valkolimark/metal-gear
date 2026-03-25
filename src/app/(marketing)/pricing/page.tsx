'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Check, Zap, Crown, ArrowRight, Building2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Switch } from '@/components/ui/switch'
import { useAuthStore } from '@/stores/auth-store'
import { TIER_LIMITS, SEAT_LIMITS } from '@/lib/constants'

const PLANS = [
  {
    tier: 'free' as const,
    name: 'Free',
    monthlyPrice: 0,
    annualPrice: 0,
    annualTotal: 0,
    description: 'Get started listing your equipment',
    icon: null,
    seats: SEAT_LIMITS.free,
    features: [
      `${TIER_LIMITS.free.listings} active listings`,
      `${TIER_LIMITS.free.photos} photos per listing`,
      `${TIER_LIMITS.free.conversations} conversations`,
      `${TIER_LIMITS.free.searchRadius} mile search radius`,
      `${SEAT_LIMITS.free} team seat`,
      'Basic seller profile',
      'Email support',
    ],
    cta: 'Get Started',
    monthlyPriceId: null,
    annualPriceId: null,
    popular: false,
  },
  {
    tier: 'pro' as const,
    name: 'Pro',
    monthlyPrice: 179,
    annualPrice: 143,
    annualTotal: 1720,
    description: 'For active sellers and dealers',
    icon: Zap,
    seats: SEAT_LIMITS.pro,
    features: [
      `${TIER_LIMITS.pro.listings} active listings`,
      `${TIER_LIMITS.pro.photos} photos per listing`,
      `${TIER_LIMITS.pro.videos} videos per listing`,
      'Unlimited conversations',
      `${TIER_LIMITS.pro.searchRadius} mile search radius`,
      `${SEAT_LIMITS.pro} team seats`,
      'All AI features',
      'Priority in search results',
      'Verified seller badge',
      'Priority support',
    ],
    cta: 'Upgrade to Pro',
    monthlyPriceId: 'price_1T5qSuK0aD0I9hZISnkpcF3E',
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_PRO_ANNUAL_PRICE_ID ?? null,
    popular: true,
  },
  {
    tier: 'business' as const,
    name: 'Business',
    monthlyPrice: 349,
    annualPrice: 279,
    annualTotal: 3350,
    description: 'For high-volume dealers and enterprises',
    icon: Crown,
    seats: SEAT_LIMITS.business,
    features: [
      `${TIER_LIMITS.business.listings} active listings`,
      `${TIER_LIMITS.business.photos} photos per listing`,
      `${TIER_LIMITS.business.videos} videos per listing`,
      'Unlimited conversations',
      'Unlimited search radius',
      `${SEAT_LIMITS.business} team seats`,
      'All AI features',
      'Featured listings',
      'Verified dealer badge',
      'Dedicated account manager',
    ],
    cta: 'Upgrade to Business',
    monthlyPriceId: 'price_1T5qTBK0aD0I9hZIYYNtRrBt',
    annualPriceId: process.env.NEXT_PUBLIC_STRIPE_BUSINESS_ANNUAL_PRICE_ID ?? null,
    popular: false,
  },
  {
    tier: 'enterprise' as const,
    name: 'Enterprise',
    monthlyPrice: 599,
    annualPrice: 0,
    annualTotal: 0,
    description: 'For large organizations with custom needs',
    icon: Building2,
    seats: Infinity,
    features: [
      'Unlimited listings',
      `${TIER_LIMITS.enterprise.photos} photos per listing`,
      `${TIER_LIMITS.enterprise.videos} videos per listing`,
      'Unlimited conversations',
      'Unlimited search radius',
      'Unlimited team seats',
      'All AI features + priority',
      'Custom integrations',
      'SSO & advanced security',
      'Dedicated success manager',
    ],
    cta: 'Contact Sales',
    monthlyPriceId: null,
    annualPriceId: null,
    popular: false,
  },
]

const COMPARISON = [
  { feature: 'Active Listings', free: '3', pro: '25', business: '100', enterprise: 'Unlimited' },
  { feature: 'Photos per Listing', free: '5', pro: '20', business: '30', enterprise: '50' },
  { feature: 'Videos per Listing', free: '\u2014', pro: '3', business: '5', enterprise: '10' },
  { feature: 'Conversations', free: '10', pro: 'Unlimited', business: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'Search Radius', free: '100 mi', pro: '500 mi', business: 'Unlimited', enterprise: 'Unlimited' },
  { feature: 'Team Seats', free: '1', pro: '3', business: '8', enterprise: 'Unlimited' },
  { feature: 'AI Features', free: '\u2014', pro: '\u2713', business: '\u2713', enterprise: '\u2713 + Priority' },
  { feature: 'Verified Badge', free: '\u2014', pro: '\u2713', business: '\u2713', enterprise: '\u2713' },
  { feature: 'Featured Listings', free: '\u2014', pro: '\u2014', business: '\u2713', enterprise: '\u2713' },
  { feature: 'Support', free: 'Email', pro: 'Priority', business: 'Dedicated', enterprise: 'Dedicated' },
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
    a: 'Monthly plans have no commitment \u2014 cancel anytime. Annual plans are billed upfront for 12 months at a 20% discount.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept all major credit and debit cards through Stripe, including Visa, Mastercard, American Express, and Discover.',
  },
  {
    q: 'How do team seats work?',
    a: 'Each plan includes a set number of team seats. Company owners can invite team members via email. Members share the company\'s listings, subscription, and branding.',
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
  const [annual, setAnnual] = useState(false)

  function handleSelectPlan(plan: (typeof PLANS)[number]) {
    if (plan.tier === 'free') {
      router.push(isAuthenticated ? '/dashboard' : '/signup')
      return
    }

    if (plan.tier === 'enterprise') {
      window.open('mailto:sales@metalgear.com?subject=Enterprise%20Plan%20Inquiry', '_self')
      return
    }

    if (!isAuthenticated) {
      router.push('/signup')
      return
    }

    if (plan.tier === currentTier) return

    const priceId = annual ? plan.annualPriceId : plan.monthlyPriceId
    if (!priceId) {
      // Annual price not configured yet — fall back to monthly
      router.push(`/checkout?price=${plan.monthlyPriceId}`)
      return
    }
    router.push(`/checkout?price=${priceId}&billing=${annual ? 'annual' : 'monthly'}`)
  }

  return (
    <div className="mx-auto max-w-7xl space-y-16 px-4 py-16 sm:px-6 lg:px-8">
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

      {/* Billing Toggle */}
      <div className="flex items-center justify-center gap-3">
        <span className={`text-sm font-medium ${!annual ? 'text-foreground' : 'text-muted-foreground'}`}>
          Monthly
        </span>
        <Switch checked={annual} onCheckedChange={setAnnual} />
        <span className={`text-sm font-medium ${annual ? 'text-foreground' : 'text-muted-foreground'}`}>
          Annual
        </span>
        {annual && (
          <span className="text-xs font-semibold text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full">
            Save 20%
          </span>
        )}
      </div>

      {/* Pricing Cards */}
      <div className="grid gap-6 lg:grid-cols-4">
        {PLANS.map((plan) => {
          const isCurrent = isAuthenticated && (plan.tier === currentTier ||
            (plan.tier === 'pro' && currentTier === 'premium') ||
            (plan.tier === 'business' && currentTier === 'boost'))
          const Icon = plan.icon
          const displayPrice = plan.tier === 'enterprise'
            ? (annual ? null : plan.monthlyPrice)
            : (annual && plan.monthlyPrice > 0 ? plan.annualPrice : plan.monthlyPrice)

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
                  {plan.tier === 'enterprise' && annual ? (
                    <span className="font-display text-2xl font-bold text-foreground">
                      Custom
                    </span>
                  ) : (
                    <>
                      <span className="font-display text-4xl font-bold text-foreground">
                        ${displayPrice}
                      </span>
                      {(displayPrice ?? 0) > 0 && (
                        <span className="font-body text-muted-foreground">
                          /mo
                        </span>
                      )}
                    </>
                  )}
                  {annual && plan.annualTotal > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Billed ${plan.annualTotal.toLocaleString()}/year
                    </p>
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
                  Pro
                </th>
                <th className="pb-4 px-4 text-center font-medium text-muted-foreground">
                  Business
                </th>
                <th className="pb-4 pl-4 text-center font-medium text-muted-foreground">
                  Enterprise
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
                    {row.pro}
                  </td>
                  <td className="py-3 px-4 text-center text-foreground">
                    {row.business}
                  </td>
                  <td className="py-3 pl-4 text-center text-foreground">
                    {row.enterprise}
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
