import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn() }),
  usePathname: () => '/feed',
  useSearchParams: () => new URLSearchParams(),
}))

import { AppSidebarToggle } from '@/components/layout/AppSidebarToggle'

const KEY = 'mg.sidebar.collapsed'

describe('<AppSidebarToggle>', () => {
  beforeEach(() => {
    window.localStorage.clear()
    document.documentElement.removeAttribute('data-sidebar-collapsed')
  })
  afterEach(() => {
    document.documentElement.removeAttribute('data-sidebar-collapsed')
  })

  it('writes "true" to localStorage when expanded → collapsed', () => {
    render(<AppSidebarToggle />)
    const btn = screen.getByLabelText(/collapse sidebar/i)
    fireEvent.click(btn)
    expect(window.localStorage.getItem(KEY)).toBe('true')
    expect(document.documentElement.getAttribute('data-sidebar-collapsed')).toBe('true')
  })

  it('reads persisted collapsed state on mount', () => {
    window.localStorage.setItem(KEY, 'true')
    render(<AppSidebarToggle />)
    expect(document.documentElement.getAttribute('data-sidebar-collapsed')).toBe('true')
    expect(screen.getByLabelText(/expand sidebar/i)).toBeTruthy()
  })

  it('round-trips back to expanded', () => {
    window.localStorage.setItem(KEY, 'true')
    render(<AppSidebarToggle />)
    fireEvent.click(screen.getByLabelText(/expand sidebar/i))
    expect(window.localStorage.getItem(KEY)).toBe('false')
    expect(document.documentElement.getAttribute('data-sidebar-collapsed')).toBe('false')
  })
})
