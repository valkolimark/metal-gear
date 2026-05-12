import { describe, it, expect, vi } from 'vitest'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/feed',
  useSearchParams: () => new URLSearchParams(),
}))

vi.mock('@/stores/auth-store', () => ({
  useAuthStore: (selector: (s: { signOut: () => Promise<void> }) => unknown) =>
    selector({ signOut: vi.fn(async () => {}) }),
}))

vi.mock('next-themes', () => ({
  useTheme: () => ({
    theme: 'system',
    resolvedTheme: 'light',
    setTheme: vi.fn(),
  }),
  ThemeProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}))

import { AppHeaderAvatarMenu } from '@/components/layout/AppHeaderAvatarMenu'

const baseUser = {
  displayName: 'Test User',
  avatarUrl: null,
  initials: 'TU',
  isAdmin: false,
}

describe('<AppHeaderAvatarMenu>', () => {
  it('renders the avatar trigger with initials fallback', () => {
    render(<AppHeaderAvatarMenu user={baseUser} />)
    expect(screen.getByLabelText(/open account menu/i)).toBeTruthy()
    expect(screen.getByText('TU')).toBeTruthy()
  })

  it('opens the dropdown and exposes the Appearance section + Profile/Settings/Help/Sign out items', async () => {
    const user = userEvent.setup()
    render(<AppHeaderAvatarMenu user={baseUser} />)
    await user.click(screen.getByLabelText(/open account menu/i))

    const body = within(document.body)
    expect(await body.findByText(/appearance/i)).toBeTruthy()
    expect(await body.findByText(/^profile$/i)).toBeTruthy()
    expect(await body.findByText(/^settings$/i)).toBeTruthy()
    expect(await body.findByText(/^help$/i)).toBeTruthy()
    expect(await body.findByText(/sign out/i)).toBeTruthy()
  })

  it('shows the Admin item when isAdmin is true', async () => {
    const user = userEvent.setup()
    render(<AppHeaderAvatarMenu user={{ ...baseUser, isAdmin: true }} />)
    await user.click(screen.getByLabelText(/open account menu/i))
    const body = within(document.body)
    expect(await body.findByText(/^admin$/i)).toBeTruthy()
  })

  it('hides the Admin item for non-admins', async () => {
    const user = userEvent.setup()
    render(<AppHeaderAvatarMenu user={baseUser} />)
    await user.click(screen.getByLabelText(/open account menu/i))
    const body = within(document.body)
    await body.findByText(/^profile$/i)
    expect(body.queryByText(/^admin$/i)).toBeNull()
  })
})
