'use client'

import Link from 'next/link'
import { Eye, Star, TrendingUp, Zap, Package, BarChart2 } from 'lucide-react'
import { LockedMetric } from './locked-metric'
import { PerformanceBar } from './performance-bar'
import type { SellerPerformanceData } from '@/app/actions/seller-intelligence'

interface Props {
  data: SellerPerformanceData
  isPro: boolean
}

export function SellerIntelligence({ data, isPro }: Props) {
  const gradeColor =
    data.qualityGrade === 'A' ? 'text-green-500'
    : data.qualityGrade === 'B' ? 'text-blue-500'
    : data.qualityGrade === 'C' ? 'text-yellow-500'
    : data.qualityGrade === '—' ? 'text-muted-foreground'
    : 'text-red-500'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold font-display">Your Performance This Month</h2>
        {!isPro && (
          <Link href="/pricing" className="text-xs text-[#1877F2] hover:underline font-medium">
            Unlock full intelligence →
          </Link>
        )}
        {isPro && (
          <span className="text-xs text-muted-foreground">vs. platform average</span>
        )}
      </div>

      {/* Metric grid — 2 cols mobile, 4 cols desktop */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

        {/* Quality Grade — FREE */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Star className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Quality Grade</span>
          </div>
          <div className={`text-3xl font-bold font-display ${gradeColor}`}>
            {data.qualityGrade}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            {data.avgQualityScore !== null
              ? `${data.avgQualityScore} / 100`
              : 'No scored listings yet'}
          </div>
        </div>

        {/* Views — FREE (raw number) */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Eye className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Views (30d)</span>
          </div>
          <div className="text-3xl font-bold font-display">
            {data.totalViews30d.toLocaleString()}
          </div>
          {isPro ? (
            <>
              <div className="text-xs text-muted-foreground mt-1">
                Platform avg: {data.platformAvgViews30d.toLocaleString()}
              </div>
              <PerformanceBar
                value={data.totalViews30d}
                benchmark={data.platformAvgViews30d}
                label={data.totalViews30d >= data.platformAvgViews30d
                  ? 'Above average'
                  : 'Below average'}
              />
            </>
          ) : (
            <div className="text-xs text-muted-foreground mt-1">
              <Link href="/pricing" className="text-[#1877F2] hover:underline">
                Compare to average →
              </Link>
            </div>
          )}
        </div>

        {/* Offer Acceptance — PRO+ */}
        {isPro ? (
          <div className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center gap-1.5 mb-2">
              <TrendingUp className="w-4 h-4 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Offer Accept Rate</span>
            </div>
            <div className="text-3xl font-bold font-display">
              {data.offerAcceptanceRate !== null ? `${data.offerAcceptanceRate}%` : '—'}
            </div>
            <div className="text-xs text-muted-foreground mt-1">
              Platform avg: {data.platformAvgAcceptanceRate}%
            </div>
          </div>
        ) : (
          <LockedMetric
            label="Offer Accept Rate"
            upgradeReason="See your offer acceptance rate vs the platform average"
          />
        )}

        {/* Active Listings — FREE */}
        <div className="bg-card border border-border rounded-xl p-4">
          <div className="flex items-center gap-1.5 mb-2">
            <Package className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs text-muted-foreground font-medium">Active Listings</span>
          </div>
          <div className="text-3xl font-bold font-display">{data.listingCount}</div>
          <div className="text-xs text-muted-foreground mt-1">
            <Link href="/listings" className="text-[#1877F2] hover:underline">
              Manage →
            </Link>
          </div>
        </div>
      </div>

      {/* Quality improvement tip */}
      {isPro && data.qualityImprovementSpecific && (
        <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4 flex items-start gap-3">
          <BarChart2 className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-400 mb-1">
              Improve your reach
            </p>
            <p className="text-sm text-muted-foreground">{data.qualityImprovementSpecific}</p>
            <Link href="/listings" className="text-xs text-[#1877F2] hover:underline mt-1 inline-block">
              Improve listings →
            </Link>
          </div>
        </div>
      )}

      {!isPro && data.qualityImprovementGeneric && (
        <div className="bg-muted/40 border border-border rounded-xl p-4 flex items-start gap-3">
          <BarChart2 className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <p className="text-sm font-medium mb-1">Improve your listings</p>
            <p className="text-sm text-muted-foreground">{data.qualityImprovementGeneric}</p>
            <Link href="/listings" className="text-xs text-[#1877F2] hover:underline mt-1 inline-block">
              Review listings →
            </Link>
          </div>
        </div>
      )}

      {/* Top performing listing — PRO+ */}
      {isPro && data.topListing && (
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Top listing this month
            </p>
            <p className="text-sm font-medium truncate">{data.topListing.title}</p>
            <Link
              href={`/listings/${data.topListing.id}`}
              className="text-xs text-[#1877F2] hover:underline"
            >
              View listing →
            </Link>
          </div>
          <div className="text-right ml-4 flex-shrink-0">
            <p className="text-2xl font-bold font-display">{data.topListing.views}</p>
            <p className="text-xs text-muted-foreground">views</p>
          </div>
        </div>
      )}

      {!isPro && (
        <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground font-medium mb-1 flex items-center gap-1">
              <Zap className="w-3 h-3" />
              Top listing this month
            </p>
            <p className="text-sm text-muted-foreground">Upgrade to see which listing is driving the most traffic</p>
          </div>
          <Link
            href="/pricing"
            className="text-xs font-semibold text-[#1877F2] hover:underline ml-4 flex-shrink-0"
          >
            Upgrade →
          </Link>
        </div>
      )}

      {/* Demand signals — PRO+ */}
      {isPro && data.demandInsights && (
        <div className="bg-[#1877F2]/5 border border-[#1877F2]/20 rounded-xl p-4">
          <p className="text-xs text-[#1877F2] font-semibold mb-2 tracking-wide uppercase">
            Demand Forecast
          </p>
          <p className="text-sm text-muted-foreground">
            {typeof data.demandInsights === 'string'
              ? data.demandInsights
              : (data.demandInsights as Record<string, unknown>)?.summary as string ?? 'Demand forecast for your equipment categories.'}
          </p>
        </div>
      )}
    </div>
  )
}
