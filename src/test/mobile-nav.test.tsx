import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

// Mock usePathname
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/dashboard',
  useSearchParams: () => new URLSearchParams(),
  useParams: () => ({}),
}))

// Mock zustand store
vi.mock('@/stores/ui-store', () => ({
  useUIStore: vi.fn((selector: (s: { unreadMessages: number }) => unknown) =>
    selector({ unreadMessages: 3 })
  ),
}))

import { MobileNav } from '@/components/layout/mobile-nav'

describe('MobileNav', () => {
  it('renders all navigation items', () => {
    render(<MobileNav />)

    expect(screen.getByText('Home')).toBeInTheDocument()
    expect(screen.getByText('Search')).toBeInTheDocument()
    expect(screen.getByText('Sell')).toBeInTheDocument()
    expect(screen.getByText('Messages')).toBeInTheDocument()
    expect(screen.getByText('Profile')).toBeInTheDocument()
  })

  it('shows unread message badge', () => {
    render(<MobileNav />)

    // The badge should display "3" for 3 unread messages
    expect(screen.getByText('3')).toBeInTheDocument()
  })

  it('links to correct paths', () => {
    render(<MobileNav />)

    const links = screen.getAllByRole('link')
    const hrefs = links.map((l) => l.getAttribute('href'))

    expect(hrefs).toContain('/dashboard')
    expect(hrefs).toContain('/search')
    expect(hrefs).toContain('/listings/new')
    expect(hrefs).toContain('/messages')
    expect(hrefs).toContain('/profile')
  })
})
