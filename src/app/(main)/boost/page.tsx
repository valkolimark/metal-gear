'use client'

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Star, Pin, Home, Store, Zap, Loader2, Clock, X, RefreshCw, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { BOOST_PRODUCTS, type BoostType } from '@/lib/constants'
import {
  getUserActiveBoosts,
  getUserListingsForBoost,
  createBoostCheckout,
  cancelBoost,
} from '@/app/actions/boost'

const BOOST_ICONS: Record<string, typeof Star> = {
  star: Star,
  pin: Pin,
  home: Home,
  store: Store,
  zap: Zap,
}

type ActiveBoost = {
  id: string
  boost_type: string
  listing_id: string | null
  expires_at: string
  amount_cents: number
  admin_override: boolean
  status: string
}

type BoostListing = {
  id: string
  title: string
  status: string
  is_featured: boolean
  pinned_position: number | null
  pinned_category: string | null
}

export default function BoostStorePage() {
  const searchParams = useSearchParams()
  const [selectedType, setSelectedType] = useState<BoostType>('listing_featured')
  const [selectedDuration, setSelectedDuration] = useState<number>(14)
  const [selectedListing, setSelectedListing] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [activeBoosts, setActiveBoosts] = useState<ActiveBoost[]>([])
  const [listings, setListings] = useState<BoostListing[]>([])
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      toast.success('Boost purchased! It may take a moment to activate.')
    }
  }, [searchParams])

  useEffect(() => {
    async function load() {
      const [boostResult, listingResult] = await Promise.all([
        getUserActiveBoosts(),
        getUserListingsForBoost(),
      ])
      setActiveBoosts(boostResult.boosts as ActiveBoost[])
      setListings(listingResult.listings as BoostListing[])
    }
    load()
  }, [refreshKey])

  const product = BOOST_PRODUCTS[selectedType]
  const Icon = BOOST_ICONS[product.icon] || Star

  function selectBoostType(type: BoostType) {
    setSelectedType(type)
    const p = BOOST_PRODUCTS[type]
    setSelectedDuration(p.options.length > 1 ? p.options[1].days : p.options[0].days)
    setSelectedListing('')
  }

  async function handlePurchase() {
    if (product.needsListing && !selectedListing) {
      toast.error('Please select a listing')
      return
    }
    setLoading(true)
    const result = await createBoostCheckout(
      selectedType,
      selectedDuration,
      selectedListing || undefined
    )
    if (result.error) {
      toast.error(result.error)
      setLoading(false)
    } else if (result.url) {
      window.location.href = result.url
    }
  }

  async function handleCancel(boostId: string) {
    const result = await cancelBoost(boostId)
    if (result.error) {
      toast.error(result.error)
    } else {
      toast.success('Boost cancelled')
      setRefreshKey((k) => k + 1)
    }
  }

  const [now] = useState(() => Date.now())

  function daysRemaining(expiresAt: string): number {
    return Math.max(0, Math.ceil((new Date(expiresAt).getTime() - now) / (1000 * 60 * 60 * 24)))
  }

  const boostTypes = Object.entries(BOOST_PRODUCTS) as [BoostType, typeof product][]

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground sm:text-3xl">
          Boost Your Visibility
        </h1>
        <p className="mt-1 font-body text-muted-foreground">
          Get your listings in front of more buyers
        </p>
      </div>

      {/* Active Boosts */}
      {activeBoosts.length > 0 && (
        <Card className="bg-card">
          <CardHeader className="pb-3">
            <CardTitle className="font-display text-base">Your Active Boosts</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {activeBoosts.map((boost) => {
              const bp = BOOST_PRODUCTS[boost.boost_type as BoostType]
              const BoostIcon = bp ? BOOST_ICONS[bp.icon] || Star : Star
              const days = daysRemaining(boost.expires_at)
              return (
                <div
                  key={boost.id}
                  className="flex items-center justify-between rounded-lg border border-border bg-surface/50 p-3"
                >
                  <div className="flex items-center gap-3">
                    <BoostIcon className="size-4 text-primary" />
                    <div>
                      <p className="font-body text-sm font-medium text-foreground">
                        {bp?.label || boost.boost_type}
                        {boost.admin_override && (
                          <Badge variant="secondary" className="ml-2 text-[10px]">Admin Grant</Badge>
                        )}
                      </p>
                      <p className="font-body text-xs text-muted-foreground">
                        <Clock className="mr-1 inline size-3" />
                        {days} day{days !== 1 ? 's' : ''} remaining
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {days <= 3 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          selectBoostType(boost.boost_type as BoostType)
                          if (boost.listing_id) setSelectedListing(boost.listing_id)
                        }}
                        className="font-body text-xs"
                      >
                        <RefreshCw className="mr-1 size-3" />
                        Renew
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleCancel(boost.id)}
                      className="font-body text-xs text-muted-foreground"
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        {/* Boost Type Selector */}
        <div className="space-y-2">
          {boostTypes.map(([type, p]) => {
            const TypeIcon = BOOST_ICONS[p.icon] || Star
            const isActive = type === selectedType
            return (
              <button
                key={type}
                onClick={() => selectBoostType(type)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${
                  isActive
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-surface hover:text-foreground'
                }`}
              >
                <TypeIcon className="size-4 shrink-0" />
                <span className="font-body text-sm font-medium">{p.label}</span>
              </button>
            )
          })}
        </div>

        {/* Product Detail */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-display text-lg">
              <Icon className="size-5 text-primary" />
              {product.label}
            </CardTitle>
            <p className="font-body text-sm text-muted-foreground">{product.description}</p>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Duration/Price Options */}
            <div className="space-y-2">
              <p className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Duration
              </p>
              <div className="grid gap-2 sm:grid-cols-3">
                {product.options.map((opt, i) => {
                  const isBest = product.options.length === 3 && i === 1
                  const isSelected = opt.days === selectedDuration
                  return (
                    <button
                      key={opt.days}
                      onClick={() => setSelectedDuration(opt.days)}
                      className={`relative rounded-lg border-2 p-3 text-center transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/30'
                      }`}
                    >
                      {isBest && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-primary px-2 py-0.5 font-body text-[10px] font-bold text-white">
                          BEST VALUE
                        </span>
                      )}
                      <p className="font-display text-lg font-bold text-foreground">
                        ${(opt.cents / 100).toFixed(0)}
                      </p>
                      <p className="font-body text-xs text-muted-foreground">
                        {opt.days} days
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            <Separator />

            {/* Listing Picker */}
            {product.needsListing && (
              <div className="space-y-2">
                <p className="font-body text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Select Listing
                </p>
                {listings.length === 0 ? (
                  <p className="font-body text-sm text-muted-foreground">
                    No active listings. Create a listing first.
                  </p>
                ) : (
                  <Select value={selectedListing} onValueChange={setSelectedListing}>
                    <SelectTrigger className="font-body text-sm">
                      <SelectValue placeholder="Choose a listing..." />
                    </SelectTrigger>
                    <SelectContent>
                      {listings.map((l) => (
                        <SelectItem key={l.id} value={l.id} className="font-body text-sm">
                          <div className="flex items-center gap-2">
                            <span className="truncate">{l.title}</span>
                            {l.is_featured && (
                              <Badge variant="secondary" className="text-[10px]">Featured</Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>
            )}

            <Button
              onClick={handlePurchase}
              disabled={loading || (product.needsListing && !selectedListing)}
              className="w-full font-body"
              size="lg"
            >
              {loading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <CheckCircle className="mr-2 size-4" />
              )}
              Purchase — $
              {((product.options.find((o) => o.days === selectedDuration)?.cents ?? 0) / 100).toFixed(0)}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
