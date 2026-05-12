import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/feed',
  useSearchParams: () => new URLSearchParams(),
}))

import { AppHeaderNotificationsBell } from '@/components/layout/AppHeaderNotificationsBell'

describe('<AppHeaderNotificationsBell>', () => {
  it('renders the bell button even when count is 0', () => {
    render(<AppHeaderNotificationsBell type="messages" count={0} />)
    const btn = screen.getByRole('button', { name: /unread messages/i })
    expect(btn).toBeTruthy()
    // Icon child is present
    expect(btn.querySelector('svg')).toBeTruthy()
    // No badge digit rendered
    expect(btn.textContent ?? '').not.toMatch(/\d/)
  })

  it('renders bell + badge when count > 0', () => {
    render(<AppHeaderNotificationsBell type="messages" count={5} />)
    expect(screen.getByRole('button')).toBeTruthy()
    expect(screen.getByText('5')).toBeTruthy()
  })

  it("renders '99+' when count exceeds 99", () => {
    render(<AppHeaderNotificationsBell type="messages" count={150} />)
    expect(screen.getByText('99+')).toBeTruthy()
  })

  it('SOS variant uses SirenIcon (hand-rolled SVG from @/components/landing/icons)', () => {
    render(<AppHeaderNotificationsBell type="sos" count={0} />)
    const btn = screen.getByRole('button', { name: /active sos/i })
    expect(btn).toBeTruthy()
    expect(btn.querySelector('svg')).toBeTruthy()
  })

  it('combined variant renders a Bell icon', () => {
    render(<AppHeaderNotificationsBell type="combined" count={0} />)
    expect(screen.getByRole('button', { name: /notifications/i })).toBeTruthy()
  })
})
