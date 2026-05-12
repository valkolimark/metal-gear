import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, act } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/feed',
  useSearchParams: () => new URLSearchParams(),
}))

import { AppMobileNavDrawer } from '@/components/layout/AppMobileNavDrawer'

const baseProps = {
  badges: { unreadMessages: 0, activeSosInCategories: 0 },
  companies: [],
}

describe('<AppMobileNavDrawer>', () => {
  beforeEach(() => {
    document.body.style.overflow = ''
  })

  it('locks body scroll while open', () => {
    const onClose = vi.fn()
    const { rerender } = render(<AppMobileNavDrawer open={false} onClose={onClose} {...baseProps} />)
    expect(document.body.style.overflow).toBe('')
    rerender(<AppMobileNavDrawer open={true} onClose={onClose} {...baseProps} />)
    expect(document.body.style.overflow).toBe('hidden')
    rerender(<AppMobileNavDrawer open={false} onClose={onClose} {...baseProps} />)
    expect(document.body.style.overflow).toBe('')
  })

  it('closes on Escape', () => {
    const onClose = vi.fn()
    render(<AppMobileNavDrawer open={true} onClose={onClose} {...baseProps} />)
    act(() => {
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }))
    })
    expect(onClose).toHaveBeenCalled()
  })

  it('closes when the close button is clicked', () => {
    const onClose = vi.fn()
    render(<AppMobileNavDrawer open={true} onClose={onClose} {...baseProps} />)
    fireEvent.click(screen.getByLabelText(/close menu/i))
    expect(onClose).toHaveBeenCalled()
  })

  it('renders company list when companies are provided', () => {
    render(
      <AppMobileNavDrawer
        open={true}
        onClose={vi.fn()}
        badges={baseProps.badges}
        companies={[
          {
            companyId: 'c1',
            companySlug: 'acme',
            companyName: 'Acme Industrial',
            initials: 'AI',
            role: 'owner',
            logoUrl: null,
          },
        ]}
      />,
    )
    expect(screen.getByText(/your companies/i)).toBeTruthy()
    expect(screen.getByText('Acme Industrial')).toBeTruthy()
  })
})
