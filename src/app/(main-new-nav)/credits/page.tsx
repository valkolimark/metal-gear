'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Coins, ShoppingCart, Eye, ArrowUpRight, Loader2, Check } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  getCreditBalance,
  getCreditHistory,
  getCreditConfig,
  createCreditCheckoutSession,
} from '@/app/actions/credits'
import type { CreditBalance, CreditConfig } from '@/app/actions/credits'

export default function CreditsPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const justPurchased = searchParams.get('purchased') === 'true'

  const [balance, setBalance] = useState<CreditBalance | null>(null)
  const [config, setConfig] = useState<CreditConfig | null>(null)
  const [history, setHistory] = useState<{
    reveals: Array<{ id: string; seller_id: string; seller_name: string; credits_spent: number; revealed_at: string | null }>
    purchases: Array<{ id: string; credits_purchased: number; amount_paid: number; purchased_at: string | null }>
  }>({ reveals: [], purchases: [] })
  const [loading, setLoading] = useState(true)
  const [purchasing, setPurchasing] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getCreditBalance(), getCreditHistory(), getCreditConfig()]).then(
      ([bal, hist, cfg]) => {
        setBalance(bal)
        setHistory(hist)
        setConfig(cfg)
        setLoading(false)
      }
    )
  }, [])

  useEffect(() => {
    if (justPurchased) {
      toast.success('Credits purchased successfully!')
    }
  }, [justPurchased])

  const handleBuyPack = useCallback(async (packId: string) => {
    setPurchasing(packId)
    const result = await createCreditCheckoutSession(packId)
    if (result.error) {
      toast.error(result.error)
      setPurchasing(null)
    } else if (result.url) {
      router.push(result.url)
    }
  }, [router])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const isUnlimited = balance?.monthlyAllowance === -1
  const resetDate = new Date()
  resetDate.setMonth(resetDate.getMonth() + 1, 1)
  const resetDateStr = resetDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })

  const packs = config?.packs ?? []

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8">
      <h1 className="font-display text-2xl font-bold text-foreground mb-6">
        Contact Credits
      </h1>

      {/* Balance Card */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-sm text-muted-foreground">Credits Remaining</p>
              <p className="font-display text-5xl font-bold text-foreground mt-1">
                {isUnlimited ? '∞' : balance?.creditsRemaining ?? 0}
              </p>
              {!isUnlimited && (
                <p className="font-body text-xs text-muted-foreground mt-2">
                  {balance?.creditsUsedThisMonth ?? 0} used this month
                  {balance?.monthlyAllowance ? ` of ${balance.monthlyAllowance} monthly allowance` : ''}
                </p>
              )}
            </div>
            <div className="text-right">
              <Badge className="bg-primary/20 text-primary border-0 font-body text-xs uppercase mb-2">
                {balance?.tier || 'free'}
              </Badge>
              {!isUnlimited && (
                <p className="font-body text-xs text-muted-foreground">
                  Resets {resetDateStr}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Monthly Allowance Table */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">Monthly Allowance by Plan</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 gap-2 text-center">
            {[
              { tier: 'Free', credits: config?.allowances?.free ?? 0, current: balance?.tier === 'free' },
              { tier: 'Pro', credits: config?.allowances?.pro ?? 25, current: balance?.tier === 'pro' || balance?.tier === 'premium' },
              { tier: 'Business', credits: config?.allowances?.business ?? 75, current: balance?.tier === 'business' || balance?.tier === 'boost' },
              { tier: 'Enterprise', credits: (config?.allowances?.enterprise ?? -1) === -1 ? -1 : config?.allowances?.enterprise ?? 0, current: balance?.tier === 'enterprise' },
            ].map((t) => (
              <div
                key={t.tier}
                className={`rounded-lg p-3 ${t.current ? 'bg-primary/10 ring-1 ring-primary/30' : 'bg-muted'}`}
              >
                <p className="font-display text-lg font-bold text-foreground">
                  {t.credits === -1 ? '∞' : t.credits}
                </p>
                <p className="font-body text-xs text-muted-foreground">{t.tier}</p>
                {t.current && (
                  <Badge className="mt-1 bg-primary/20 text-primary border-0 text-[9px]">Current</Badge>
                )}
              </div>
            ))}
          </div>
          {balance?.tier === 'free' && (
            <div className="mt-4 text-center">
              <Button asChild size="sm" className="font-body">
                <Link href="/pricing">
                  <ArrowUpRight className="mr-1 size-3.5" />
                  Upgrade for monthly credits
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Purchase Credit Packs */}
      {!isUnlimited && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <ShoppingCart className="size-4 text-primary" />
              Buy Additional Credits
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {packs.map((pack) => (
                <div
                  key={pack.id}
                  className="rounded-xl border border-zinc-200 dark:border-zinc-700/60 p-4 text-center hover:border-primary/50 transition-colors"
                >
                  <p className="font-display text-2xl font-bold text-foreground">{pack.credits}</p>
                  <p className="font-body text-xs text-muted-foreground">credits</p>
                  <p className="font-display text-lg font-bold text-primary mt-2">
                    ${(pack.priceCents / 100).toFixed(0)}
                  </p>
                  <p className="font-body text-[10px] text-muted-foreground mb-3">
                    ${(pack.priceCents / pack.credits / 100).toFixed(2)}/credit
                  </p>
                  <Button
                    size="sm"
                    className="w-full font-body"
                    onClick={() => handleBuyPack(pack.id)}
                    disabled={purchasing !== null}
                  >
                    {purchasing === pack.id ? (
                      <Loader2 className="mr-1 size-3.5 animate-spin" />
                    ) : (
                      <Coins className="mr-1 size-3.5" />
                    )}
                    {pack.label}
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-display text-base">This Month</CardTitle>
        </CardHeader>
        <CardContent>
          {history.reveals.length === 0 && history.purchases.length === 0 ? (
            <p className="font-body text-sm text-muted-foreground text-center py-4">
              No activity this month
            </p>
          ) : (
            <div className="space-y-2">
              {history.purchases.map((p) => (
                <div key={p.id} className="flex items-center justify-between rounded-lg px-3 py-2 bg-green-500/5">
                  <div className="flex items-center gap-2">
                    <ShoppingCart className="size-3.5 text-green-500" />
                    <span className="font-body text-sm text-foreground">
                      Purchased {p.credits_purchased} credits
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="font-body text-sm font-medium text-green-500">
                      +{p.credits_purchased}
                    </span>
                    <p className="font-body text-[10px] text-muted-foreground">
                      {p.purchased_at ? new Date(p.purchased_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                </div>
              ))}
              {history.reveals.map((r) => (
                <div key={r.id} className="flex items-center justify-between rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2">
                    <Eye className="size-3.5 text-muted-foreground" />
                    <span className="font-body text-sm text-foreground">
                      {r.seller_name}
                    </span>
                  </div>
                  <div className="text-right">
                    {r.credits_spent > 0 ? (
                      <span className="font-body text-sm text-muted-foreground">
                        -{r.credits_spent}
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 font-body text-xs text-muted-foreground">
                        <Check className="size-3" /> Free
                      </span>
                    )}
                    <p className="font-body text-[10px] text-muted-foreground">
                      {r.revealed_at ? new Date(r.revealed_at).toLocaleDateString() : ''}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
