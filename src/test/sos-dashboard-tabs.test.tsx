import { describe, it, expect, beforeEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

// Mock notification education hook used inside SosDashboardTabs.
vi.mock('@/components/notification-education-modal', () => ({
  NotificationEducationModal: () => null,
  useNotificationEducation: () => ({
    showModal: false,
    setShowModal: vi.fn(),
    notificationPermission: 'granted',
  }),
}))

import { SosDashboardTabs } from '@/app/(main)/sos/components/SosDashboardTabs'

const NOW = new Date('2026-04-28T12:00:00Z').getTime()

function makeMine(opts: { id: string; createdMinAgo: number; responseCount: number }) {
  return {
    id: opts.id,
    title: `My ${opts.id}`,
    status: 'active',
    urgency: 'critical',
    location_city: 'Houston',
    location_state: 'TX',
    equipment_category: 'pumps-centrifugal',
    created_at: new Date(NOW - opts.createdMinAgo * 60_000).toISOString(),
    response_count: [{ count: opts.responseCount }],
  }
}

function makeBroadcast(id: string) {
  return {
    id,
    title: `Broadcast ${id}`,
    status: 'active',
    urgency: 'normal',
    location_city: 'Austin',
    location_state: 'TX',
    equipment_category: 'pumps-centrifugal',
    requester: { full_name: 'Acme Co' },
    created_at: new Date(NOW - 30 * 60_000).toISOString(),
    description: '',
  }
}

describe('SosDashboardTabs', () => {
  beforeEach(() => {
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', '/sos')
      window.localStorage.clear()
      window.sessionStorage.clear()
    }
  })

  it('defaults to the mine tab when user has owned SOS', () => {
    const mine = [makeMine({ id: 'm1', createdMinAgo: 60, responseCount: 0 })]
    render(<SosDashboardTabs myRequests={mine} broadcastRequests={[makeBroadcast('b1')]} />)
    const mineTab = screen.getByTestId('tab-mine')
    expect(mineTab).toHaveAttribute('data-state', 'active')
  })

  it('defaults to the feed tab when user has zero owned SOS', () => {
    render(<SosDashboardTabs myRequests={[]} broadcastRequests={[makeBroadcast('b1')]} />)
    const feedTab = screen.getByTestId('tab-feed')
    expect(feedTab).toHaveAttribute('data-state', 'active')
  })

  it('honours #feed hash on mount', () => {
    window.history.replaceState(null, '', '/sos#feed')
    const mine = [makeMine({ id: 'm1', createdMinAgo: 60, responseCount: 0 })]
    render(<SosDashboardTabs myRequests={mine} broadcastRequests={[makeBroadcast('b1')]} />)
    expect(screen.getByTestId('tab-feed')).toHaveAttribute('data-state', 'active')
  })

  it('updates the URL hash when the user switches tabs (no router push)', async () => {
    const user = userEvent.setup()
    const mine = [makeMine({ id: 'm1', createdMinAgo: 60, responseCount: 0 })]
    render(<SosDashboardTabs myRequests={mine} broadcastRequests={[makeBroadcast('b1')]} />)
    // Radix Tabs uses pointerdown internally; userEvent simulates the full
    // pointer + click sequence so the onValueChange callback fires reliably
    // in jsdom.
    await user.click(screen.getByTestId('tab-feed'))
    expect(window.location.hash).toBe('#feed')
    await user.click(screen.getByTestId('tab-mine'))
    expect(window.location.hash).toBe('#mine')
  })

  it('shows the pulse dot on the mine tab when an owned SOS has new responses', () => {
    // SOS posted 60 min ago, has responses, and last-viewed is older than created_at
    const sosId = 'm1'
    window.localStorage.setItem(
      `mg-sos-last-viewed-${sosId}`,
      String(NOW - 90 * 60_000)
    )
    const mine = [makeMine({ id: sosId, createdMinAgo: 60, responseCount: 2 })]
    render(<SosDashboardTabs myRequests={mine} broadcastRequests={[]} />)
    expect(screen.getByTestId('mine-pulse')).toBeInTheDocument()
  })

  it('omits the pulse dot when responses have already been viewed', () => {
    const sosId = 'm1'
    window.localStorage.setItem(
      `mg-sos-last-viewed-${sosId}`,
      String(NOW + 60_000) // viewed in the future = effectively read
    )
    const mine = [makeMine({ id: sosId, createdMinAgo: 60, responseCount: 2 })]
    render(<SosDashboardTabs myRequests={mine} broadcastRequests={[]} />)
    expect(screen.queryByTestId('mine-pulse')).toBeNull()
  })

  it('renders tab labels with counts', () => {
    const mine = [
      makeMine({ id: 'm1', createdMinAgo: 60, responseCount: 0 }),
      makeMine({ id: 'm2', createdMinAgo: 30, responseCount: 0 }),
    ]
    const broadcast = [makeBroadcast('b1'), makeBroadcast('b2'), makeBroadcast('b3')]
    render(<SosDashboardTabs myRequests={mine} broadcastRequests={broadcast} />)
    expect(screen.getByTestId('tab-mine')).toHaveTextContent('(2)')
    expect(screen.getByTestId('tab-feed')).toHaveTextContent('(3)')
  })
})
