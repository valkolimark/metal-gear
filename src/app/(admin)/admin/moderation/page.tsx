'use client'

import { useState, useEffect } from 'react'
import { Shield, AlertTriangle, Flag, Star, Gavel, MessageSquare, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DisputeAISummary } from '@/components/dispute-ai-summary'
import {
  getReportsQueue,
  adminResolveReport,
  getDisputedReviews,
  getAdminListings,
  getFeedPostReports,
  adminSoftDeleteFeedPost,
} from '../actions'
import type { FeedPostReport } from '../actions'
import { getAdminDisputes } from '@/app/actions/disputes'

type Tab = 'reports' | 'fraud' | 'disputes' | 'transaction_disputes' | 'feed_posts'

type Report = Awaited<ReturnType<typeof getReportsQueue>>[number]

type FraudListing = Awaited<ReturnType<typeof getAdminListings>>['listings'][number]

type DisputedReview = Awaited<ReturnType<typeof getDisputedReviews>>[number]

export default function AdminModerationPage() {
  const [activeTab, setActiveTab] = useState<Tab>('reports')
  const [refreshKey, setRefreshKey] = useState(0)

  // Reports state
  const [reports, setReports] = useState<Report[]>([])
  const [reportsLoading, setReportsLoading] = useState(true)

  // Fraud queue state
  const [fraudListings, setFraudListings] = useState<FraudListing[]>([])
  const [fraudLoading, setFraudLoading] = useState(true)

  // Disputed reviews state
  const [disputedReviews, setDisputedReviews] = useState<DisputedReview[]>([])
  const [disputesLoading, setDisputesLoading] = useState(true)

  // Transaction disputes state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [txDisputes, setTxDisputes] = useState<any[]>([])
  const [txDisputesLoading, setTxDisputesLoading] = useState(true)
  const [expandedDispute, setExpandedDispute] = useState<string | null>(null)

  // Feed post reports state
  const [feedPostReports, setFeedPostReports] = useState<FeedPostReport[]>([])
  const [feedPostReportsLoading, setFeedPostReportsLoading] = useState(true)
  const [feedPostReportsTotal, setFeedPostReportsTotal] = useState(0)
  const [feedPostReportsPage, setFeedPostReportsPage] = useState(1)

  // Fetch reports
  useEffect(() => {
    let cancelled = false
    async function fetchReports() {
      setReportsLoading(true)
      try {
        const data = await getReportsQueue()
        if (!cancelled) {
          setReports(data)
        }
      } catch {
        if (!cancelled) toast.error('Failed to load reports')
      } finally {
        if (!cancelled) setReportsLoading(false)
      }
    }
    fetchReports()
    return () => { cancelled = true }
  }, [refreshKey])

  // Fetch fraud listings
  useEffect(() => {
    let cancelled = false
    async function fetchFraud() {
      setFraudLoading(true)
      try {
        const result = await getAdminListings({ page: 1, ai_fraud_flagged: true })
        if (!cancelled) {
          setFraudListings(result.listings)
        }
      } catch {
        if (!cancelled) toast.error('Failed to load fraud queue')
      } finally {
        if (!cancelled) setFraudLoading(false)
      }
    }
    fetchFraud()
    return () => { cancelled = true }
  }, [refreshKey])

  // Fetch disputed reviews
  useEffect(() => {
    let cancelled = false
    async function fetchDisputes() {
      setDisputesLoading(true)
      try {
        const data = await getDisputedReviews()
        if (!cancelled) {
          setDisputedReviews(data)
        }
      } catch {
        if (!cancelled) toast.error('Failed to load disputed reviews')
      } finally {
        if (!cancelled) setDisputesLoading(false)
      }
    }
    fetchDisputes()
    return () => { cancelled = true }
  }, [refreshKey])

  // Fetch transaction disputes
  useEffect(() => {
    let cancelled = false
    async function fetchTxDisputes() {
      setTxDisputesLoading(true)
      try {
        const result = await getAdminDisputes()
        if (!cancelled && result.disputes) {
          setTxDisputes(result.disputes)
        }
      } catch {
        if (!cancelled) toast.error('Failed to load transaction disputes')
      } finally {
        if (!cancelled) setTxDisputesLoading(false)
      }
    }
    fetchTxDisputes()
    return () => { cancelled = true }
  }, [refreshKey])

  // Fetch feed post reports
  useEffect(() => {
    let cancelled = false
    async function fetchFeedPostReports() {
      setFeedPostReportsLoading(true)
      try {
        const result = await getFeedPostReports({ page: feedPostReportsPage, limit: 20 })
        if (!cancelled) {
          setFeedPostReports(result.reports)
          setFeedPostReportsTotal(result.total)
        }
      } catch {
        if (!cancelled) toast.error('Failed to load feed post reports')
      } finally {
        if (!cancelled) setFeedPostReportsLoading(false)
      }
    }
    fetchFeedPostReports()
    return () => { cancelled = true }
  }, [refreshKey, feedPostReportsPage])

  function refresh() {
    setRefreshKey((k) => k + 1)
  }

  // Report actions
  async function handleResolveReport(reportId: string, resolution: 'dismissed' | 'warned' | 'removed' | 'banned') {
    try {
      await adminResolveReport(reportId, resolution)
      toast.success(`Report ${resolution}`)
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve report')
    }
  }

  // Fraud actions — these are stubs that call existing admin actions
  async function handleClearFraud(listingId: string) {
    try {
      const { adminClearFraudFlag } = await import('../actions')
      await adminClearFraudFlag(listingId)
      toast.success('Fraud flag cleared (false positive)')
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to clear fraud flag')
    }
  }

  async function handleFlagAndNotify(listingId: string) {
    try {
      const { adminFlagListing } = await import('../actions')
      await adminFlagListing(listingId, 'AI fraud confirmed — listing flagged')
      toast.success('Listing flagged and seller notified')
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to flag listing')
    }
  }

  async function handleDeleteFraudListing(listingId: string) {
    try {
      const { adminDeleteListing } = await import('../actions')
      await adminDeleteListing(listingId)
      toast.success('Listing deleted')
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete listing')
    }
  }

  // Disputed review actions — resolve via report resolution
  async function handleDisputeAction(reviewId: string, action: 'keep' | 'remove' | 'warn') {
    try {
      // For now we just resolve as dismissed/removed/warned
      const resolution = action === 'keep' ? 'dismissed' : action === 'remove' ? 'removed' : 'warned'
      // Find the report for this review (if any) and resolve it
      const matchingReport = reports.find(
        (r) => r.target_type === 'review' && r.target_id === reviewId
      )
      if (matchingReport) {
        await adminResolveReport(matchingReport.id, resolution)
      }
      toast.success(`Review dispute: ${action}`)
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to resolve dispute')
    }
  }

  async function handleDeleteFeedPost(postId: string) {
    try {
      // Use a placeholder admin ID; the server action validates via requireAdmin
      await adminSoftDeleteFeedPost(postId, '')
      toast.success('Feed post deleted')
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete post')
    }
  }

  async function handleDismissFeedPostReport(reportId: string) {
    try {
      await adminResolveReport(reportId, 'dismissed')
      toast.success('Report dismissed')
      refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to dismiss report')
    }
  }

  const pendingCount = reports.length
  const fraudCount = fraudListings.length
  const disputeCount = disputedReviews.length
  const txDisputeCount = txDisputes.filter((d) => ['open', 'under_review', 'escalated'].includes(d.status)).length
  const feedPostCount = feedPostReportsTotal
  const totalCount = pendingCount + fraudCount + disputeCount + txDisputeCount + feedPostCount

  const tabs: { key: Tab; label: string }[] = [
    { key: 'reports', label: 'Reports' },
    { key: 'fraud', label: 'AI Fraud Queue' },
    { key: 'disputes', label: 'Review Disputes' },
    { key: 'transaction_disputes', label: 'Transaction Disputes' },
    { key: 'feed_posts', label: 'Feed Posts' },
  ]

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-foreground">
        Moderation Queue
      </h1>

      {/* Stats header */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-6 p-4">
          <div className="flex items-center gap-2">
            <Flag className="size-4 text-amber-400" />
            <span className="font-body text-sm text-muted-foreground">Pending reports:</span>
            <span className="font-display text-lg font-bold text-foreground">{pendingCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="size-4 text-red-400" />
            <span className="font-body text-sm text-muted-foreground">AI fraud queue:</span>
            <span className="font-display text-lg font-bold text-foreground">{fraudCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <Star className="size-4 text-blue-400" />
            <span className="font-body text-sm text-muted-foreground">Review disputes:</span>
            <span className="font-display text-lg font-bold text-foreground">{disputeCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <Gavel className="size-4 text-purple-400" />
            <span className="font-body text-sm text-muted-foreground">Tx disputes:</span>
            <span className="font-display text-lg font-bold text-foreground">{txDisputeCount}</span>
          </div>
          <div className="flex items-center gap-2">
            <MessageSquare className="size-4 text-green-400" />
            <span className="font-body text-sm text-muted-foreground">Feed posts:</span>
            <span className="font-display text-lg font-bold text-foreground">{feedPostCount}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Shield className="size-4 text-primary" />
            <span className="font-body text-sm text-muted-foreground">Total:</span>
            <span className="font-display text-lg font-bold text-primary">{totalCount}</span>
          </div>
        </CardContent>
      </Card>

      {/* Tab buttons */}
      <div className="flex gap-2">
        {tabs.map((tab) => (
          <Button
            key={tab.key}
            variant={activeTab === tab.key ? 'default' : 'outline'}
            size="sm"
            onClick={() => setActiveTab(tab.key)}
            className="font-body"
          >
            {tab.label}
          </Button>
        ))}
      </div>

      {/* Tab 1 — Reports */}
      {activeTab === 'reports' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <Flag className="size-4 text-amber-400" />
              Pending Reports ({pendingCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Target ID</th>
                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Reporter</th>
                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Reason</th>
                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-right font-body text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {reportsLoading ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        <p className="font-body text-sm text-muted-foreground">Loading...</p>
                      </td>
                    </tr>
                  ) : reports.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center">
                        <p className="font-body text-sm text-muted-foreground">No pending reports</p>
                      </td>
                    </tr>
                  ) : (
                    reports.map((report) => (
                      <tr key={report.id} className="border-b border-border hover:bg-white/[0.02]">
                        <td className="px-4 py-3">
                          <Badge
                            className={`border-0 font-body text-[10px] uppercase ${
                              report.target_type === 'listing'
                                ? 'bg-blue-500/20 text-blue-400'
                                : report.target_type === 'user'
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : 'bg-zinc-500/20 text-zinc-400'
                            }`}
                          >
                            {report.target_type}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 font-body text-xs text-muted-foreground">
                          {report.target_id.slice(0, 8)}...
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-foreground">
                          {report.reporter_name}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-foreground">
                          {report.reason}
                        </td>
                        <td className="px-4 py-3 font-body text-xs text-muted-foreground">
                          {new Date(report.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="font-body text-xs"
                              onClick={() => handleResolveReport(report.id, 'dismissed')}
                            >
                              Dismiss
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="font-body text-xs text-amber-400 hover:text-amber-300"
                              onClick={() => handleResolveReport(report.id, 'warned')}
                            >
                              Warn
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="font-body text-xs text-red-400 hover:text-red-300"
                              onClick={() => handleResolveReport(report.id, 'removed')}
                            >
                              Remove Content
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="font-body text-xs text-red-500 hover:text-red-400"
                              onClick={() => handleResolveReport(report.id, 'banned')}
                            >
                              Ban User
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 2 — AI Fraud Queue */}
      {activeTab === 'fraud' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <AlertTriangle className="size-4 text-red-400" />
                AI Fraud-Flagged Listings ({fraudCount})
              </CardTitle>
            </CardHeader>
          </Card>

          {fraudLoading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="font-body text-sm text-muted-foreground">Loading...</p>
              </CardContent>
            </Card>
          ) : fraudListings.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="font-body text-sm text-muted-foreground">No fraud-flagged listings</p>
              </CardContent>
            </Card>
          ) : (
            fraudListings.map((listing) => (
              <Card key={listing.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <h3 className="truncate font-display text-sm font-semibold text-foreground">
                          {listing.title}
                        </h3>
                        <Badge className="shrink-0 border-0 bg-red-500/20 font-body text-[10px] uppercase text-red-400">
                          Fraud Flagged
                        </Badge>
                      </div>
                      <p className="font-body text-sm text-red-400">
                        Reason: {listing.ai_fraud_reason || 'No reason provided'}
                      </p>
                      <div className="flex items-center gap-3">
                        <span className="font-body text-xs text-muted-foreground">
                          Seller: {listing.seller_name}
                        </span>
                        <span className="font-body text-xs text-muted-foreground">
                          ID: {listing.id.slice(0, 8)}...
                        </span>
                        <span className="font-body text-xs text-muted-foreground">
                          {new Date(listing.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-body text-xs text-green-400 hover:text-green-300"
                        onClick={() => handleClearFraud(listing.id)}
                      >
                        Clear
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-body text-xs text-amber-400 hover:text-amber-300"
                        onClick={() => handleFlagAndNotify(listing.id)}
                      >
                        Flag & Notify
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-body text-xs text-red-400 hover:text-red-300"
                        onClick={() => handleDeleteFraudListing(listing.id)}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 3 — Review Disputes */}
      {activeTab === 'disputes' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <Star className="size-4 text-blue-400" />
                Disputed Reviews ({disputeCount})
              </CardTitle>
            </CardHeader>
          </Card>

          {disputesLoading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="font-body text-sm text-muted-foreground">Loading...</p>
              </CardContent>
            </Card>
          ) : disputedReviews.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="font-body text-sm text-muted-foreground">No disputed reviews</p>
              </CardContent>
            </Card>
          ) : (
            disputedReviews.map((review) => (
              <Card key={review.id}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-body text-sm text-muted-foreground">
                          Reviewer: {review.reviewer_id.slice(0, 8)}...
                        </span>
                        <div className="flex items-center gap-0.5">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`size-3.5 ${
                                i < (review.rating ?? 0)
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'text-zinc-600'
                              }`}
                            />
                          ))}
                        </div>
                      </div>
                      <p className="font-body text-sm text-foreground">
                        {review.comment || 'No comment'}
                      </p>
                      <p className="font-body text-xs text-muted-foreground">
                        {new Date(review.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-body text-xs text-green-400 hover:text-green-300"
                        onClick={() => handleDisputeAction(review.id, 'keep')}
                      >
                        Keep
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-body text-xs text-red-400 hover:text-red-300"
                        onClick={() => handleDisputeAction(review.id, 'remove')}
                      >
                        Remove
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="font-body text-xs text-amber-400 hover:text-amber-300"
                        onClick={() => handleDisputeAction(review.id, 'warn')}
                      >
                        Warn
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Tab 4 — Transaction Disputes with AI Mediation */}
      {activeTab === 'transaction_disputes' && (
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 font-display text-base">
                <Gavel className="size-4 text-purple-400" />
                Transaction Disputes ({txDisputeCount} active)
              </CardTitle>
            </CardHeader>
          </Card>

          {txDisputesLoading ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="font-body text-sm text-muted-foreground">Loading...</p>
              </CardContent>
            </Card>
          ) : txDisputes.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="font-body text-sm text-muted-foreground">No transaction disputes</p>
              </CardContent>
            </Card>
          ) : (
            txDisputes.map((dispute) => {
              const tx = dispute.transactions
              const isExpanded = expandedDispute === dispute.id
              const statusColors: Record<string, string> = {
                open: 'bg-red-500/20 text-red-400',
                under_review: 'bg-yellow-500/20 text-yellow-400',
                escalated: 'bg-purple-500/20 text-purple-400',
                resolved_buyer: 'bg-green-500/20 text-green-400',
                resolved_seller: 'bg-blue-500/20 text-blue-400',
              }

              return (
                <Card key={dispute.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <h3 className="truncate font-display text-sm font-semibold text-foreground">
                            {tx?.listings?.title || 'Unknown Listing'}
                          </h3>
                          <Badge className={`shrink-0 border-0 font-body text-[10px] uppercase ${statusColors[dispute.status] || 'bg-zinc-500/20 text-zinc-400'}`}>
                            {dispute.status.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="font-body text-sm text-muted-foreground">
                          <span className="text-foreground">{dispute.reason.replace(/_/g, ' ')}</span>
                          {' — '}
                          {dispute.description?.slice(0, 100)}{dispute.description?.length > 100 ? '...' : ''}
                        </p>
                        <div className="flex items-center gap-3 font-body text-xs text-muted-foreground">
                          <span>Buyer: {tx?.buyer?.display_name || tx?.buyer?.full_name || 'Unknown'}</span>
                          <span>Seller: {tx?.seller?.display_name || tx?.seller?.full_name || 'Unknown'}</span>
                          <span>{new Date(dispute.created_at).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="shrink-0 font-body text-xs"
                        onClick={() => setExpandedDispute(isExpanded ? null : dispute.id)}
                      >
                        {isExpanded ? 'Collapse' : 'View & AI Summary'}
                      </Button>
                    </div>

                    {isExpanded && (
                      <div className="mt-4 space-y-4 border-t border-border pt-4">
                        {/* Buyer statement */}
                        <div>
                          <p className="mb-1 font-body text-xs font-semibold text-blue-400">Buyer Statement</p>
                          <p className="rounded bg-muted p-3 font-body text-sm text-foreground">{dispute.description}</p>
                        </div>

                        {/* Seller response */}
                        <div>
                          <p className="mb-1 font-body text-xs font-semibold text-purple-400">Seller Response</p>
                          <p className="rounded bg-muted p-3 font-body text-sm text-foreground">
                            {dispute.seller_response || 'No response yet'}
                          </p>
                        </div>

                        {/* Evidence counts */}
                        <div className="flex gap-4 font-body text-xs text-muted-foreground">
                          <span>Buyer evidence: {(dispute.evidence_urls || []).length} files</span>
                          <span>Seller evidence: {(dispute.seller_evidence_urls || []).length} files</span>
                        </div>

                        {/* AI Summary Panel */}
                        <DisputeAISummary
                          disputeId={dispute.id}
                          initialSummary={dispute.ai_summary || null}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Tab 5 — Feed Posts */}
      {activeTab === 'feed_posts' && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 font-display text-base">
              <MessageSquare className="size-4 text-green-400" />
              Reported Feed Posts ({feedPostCount})
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border">
                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Post Preview</th>
                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Author</th>
                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Company</th>
                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Reported By</th>
                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Reason</th>
                    <th className="px-4 py-3 text-left font-body text-xs font-medium text-muted-foreground">Date</th>
                    <th className="px-4 py-3 text-right font-body text-xs font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {feedPostReportsLoading ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center">
                        <p className="font-body text-sm text-muted-foreground">Loading...</p>
                      </td>
                    </tr>
                  ) : feedPostReports.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center">
                        <p className="font-body text-sm text-muted-foreground">No reported feed posts</p>
                      </td>
                    </tr>
                  ) : (
                    feedPostReports.map((report) => (
                      <tr key={report.reportId} className="border-b border-border hover:bg-white/[0.02]">
                        <td className="max-w-[200px] truncate px-4 py-3 font-body text-sm text-foreground">
                          {report.postPreview || '[no text]'}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-foreground">
                          {report.postAuthor}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-muted-foreground">
                          {report.postCompany ?? '—'}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-foreground">
                          {report.reportedBy}
                        </td>
                        <td className="px-4 py-3 font-body text-sm text-foreground">
                          {report.reason}
                        </td>
                        <td className="px-4 py-3 font-body text-xs text-muted-foreground">
                          {new Date(report.reportedAt).toLocaleDateString()}
                        </td>
                        <td className="px-4 py-3 text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="outline"
                              size="sm"
                              className="font-body text-xs"
                              onClick={() => handleDismissFeedPostReport(report.reportId)}
                            >
                              Dismiss
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="font-body text-xs text-red-400 hover:text-red-300"
                              onClick={() => handleDeleteFeedPost(report.postId)}
                            >
                              Delete Post
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {feedPostReportsTotal > 20 && (
              <div className="flex items-center justify-between border-t border-border px-4 py-3">
                <span className="font-body text-xs text-muted-foreground">
                  Page {feedPostReportsPage} of {Math.ceil(feedPostReportsTotal / 20)}
                </span>
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={feedPostReportsPage <= 1}
                    onClick={() => setFeedPostReportsPage((p) => p - 1)}
                  >
                    <ChevronLeft className="size-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={feedPostReportsPage >= Math.ceil(feedPostReportsTotal / 20)}
                    onClick={() => setFeedPostReportsPage((p) => p + 1)}
                  >
                    <ChevronRight className="size-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
