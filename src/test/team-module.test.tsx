import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { TeamModule } from '@/components/profile-shared/TeamModule'
import type { TeamMemberData } from '@/lib/profile/team'

function member(overrides: Partial<TeamMemberData> = {}): TeamMemberData {
  return {
    profileId: 'u-1',
    name: 'Jane Doe',
    avatarUrl: null,
    role: 'Owner',
    profileHref: '/sellers/u-1',
    ...overrides,
  }
}

describe('TeamModule', () => {
  it('renders nothing when there are no public members', () => {
    const { container } = render(
      <TeamModule
        members={[]}
        totalPublicCount={0}
        totalAllCount={12}
      />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders a single member with role + name + link', () => {
    render(
      <TeamModule
        members={[member()]}
        totalPublicCount={1}
        totalAllCount={1}
      />
    )
    expect(screen.getByText('Jane Doe')).toBeInTheDocument()
    expect(screen.getByText('Owner')).toBeInTheDocument()
    const card = screen.getByTestId('team-member-card')
    expect(card.getAttribute('href')).toBe('/sellers/u-1')
  })

  it('shows plain "{N} members" subtitle by default — private count is NOT leaked', () => {
    render(
      <TeamModule
        members={[member()]}
        totalPublicCount={1}
        totalAllCount={12}
      />
    )
    expect(screen.getByText('1 member')).toBeInTheDocument()
    expect(screen.queryByText(/of 12/i)).not.toBeInTheDocument()
  })

  it('shows "1 member · of 12 (others private)" only when showPrivateCountHint is true', () => {
    render(
      <TeamModule
        members={[member()]}
        totalPublicCount={1}
        totalAllCount={12}
        showPrivateCountHint
      />
    )
    expect(screen.getByText('1 member · of 12 (others private)')).toBeInTheDocument()
  })

  it('singularizes "1 member" / pluralizes "5 members"', () => {
    const five = Array.from({ length: 5 }, (_, i) =>
      member({ profileId: `u-${i}`, name: `Member ${i}` })
    )
    render(
      <TeamModule members={five} totalPublicCount={5} totalAllCount={5} />
    )
    expect(screen.getByText('5 members')).toBeInTheDocument()
  })
})
