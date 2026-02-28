'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Loader2,
  ArrowRight,
  Package,
  CreditCard,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getTransactions } from '@/app/actions/transactions'

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  initiated: { label: 'Initiated', color: 'border-yellow-500/50 text-yellow-400', icon: Clock },
  payment_pending: { label: 'Payment Pending', color: 'border-yellow-500/50 text-yellow-400', icon: CreditCard },
  paid: { label: 'Paid', color: 'border-blue-500/50 text-blue-400', icon: CreditCard },
  shipped: { label: 'Shipped', color: 'border-purple-500/50 text-purple-400', icon: Truck },
  delivered: { label: 'Delivered', color: 'border-green-500/50 text-green-400', icon: Package },
  completed: { label: 'Completed', color: 'border-green-500/50 text-green-400', icon: CheckCircle2 },
  disputed: { label: 'Disputed', color: 'border-red-500/50 text-red-400', icon: AlertTriangle },
  refunded: { label: 'Refunded', color: 'border-red-500/50 text-red-400', icon: AlertTriangle },
}

export default function TransactionsPage() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [transactions, setTransactions] = useState<any[]>([])
  const [userId, setUserId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<string | undefined>()

  useEffect(() => {
    loadTransactions()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter])

  async function loadTransactions() {
    setLoading(true)
    const result = await getTransactions(filter)
    setTransactions(result.transactions)
    setUserId(result.userId || null)
    setLoading(false)
  }

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-4 py-6 sm:px-6 lg:px-8">
      <div>
        <h1 className="font-display text-3xl font-bold text-foreground">
          Transactions
        </h1>
        <p className="mt-1 font-body text-muted-foreground">
          Track your purchases and sales
        </p>
      </div>

      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        {[undefined, 'initiated', 'paid', 'shipped', 'delivered', 'completed'].map((s) => (
          <Button
            key={s ?? 'all'}
            variant={filter === s ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilter(s)}
            className="font-body text-xs"
          >
            {s ? STATUS_CONFIG[s]?.label ?? s : 'All'}
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="size-8 animate-spin text-primary" />
        </div>
      ) : transactions.length === 0 ? (
        <Card className="border-border bg-card">
          <CardContent className="flex flex-col items-center gap-4 py-12">
            <Package className="size-12 text-muted-foreground" />
            <p className="font-body text-sm text-muted-foreground">
              No transactions yet.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {transactions.map((tx) => {
            const isBuyer = tx.buyer_id === userId
            const otherParty = isBuyer ? tx.seller : tx.buyer
            const listing = tx.listings
            const config = STATUS_CONFIG[tx.status] || STATUS_CONFIG.initiated
            const StatusIcon = config.icon

            return (
              <Link key={tx.id} href={`/transactions/${tx.id}`}>
                <Card className="border-border bg-card transition-colors hover:border-primary/50">
                  <CardContent className="flex items-center gap-4 p-4">
                    <div className="flex size-10 items-center justify-center rounded-lg bg-surface">
                      <StatusIcon className={`size-5 ${config.color.split(' ')[1]}`} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate font-body text-sm font-medium text-foreground">
                        {listing?.title || 'Unknown Listing'}
                      </p>
                      <div className="mt-0.5 flex items-center gap-2">
                        <span className="font-body text-xs text-muted-foreground">
                          {isBuyer ? 'Buying from' : 'Selling to'}
                        </span>
                        <Avatar className="size-4">
                          <AvatarImage src={otherParty?.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/20 text-[8px] text-primary">
                            {(otherParty?.display_name || otherParty?.full_name || '?')[0]}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-body text-xs text-foreground">
                          {otherParty?.display_name || otherParty?.full_name || 'Unknown'}
                        </span>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <span className="font-display text-sm font-bold text-primary">
                        ${(tx.amount_cents / 100).toLocaleString()}
                      </span>
                      <Badge variant="outline" className={`font-body text-[10px] ${config.color}`}>
                        {config.label}
                      </Badge>
                    </div>

                    <ArrowRight className="size-4 shrink-0 text-muted-foreground" />
                  </CardContent>
                </Card>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
