import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { useState } from 'react'
import { MultiIndustryPicker } from '@/components/forms/MultiIndustryPicker'

/**
 * Cycle 65 audit (`/profile` industry editor).
 *
 * The /profile page swaps a divergent <Select> (writing the singleton
 * `profiles.industry`) for `<MultiIndustryPicker />` default-capped, hydrating
 * from `profile.industry` as a 1-element array and writing back `industries[0]`
 * to the legacy column for back-compat. These tests cover the wire-up shape:
 * hydration, save round-trip, and that the cap (default 5) is enforced.
 *
 * Full RTL coverage of the /profile page itself is out of scope — that page
 * mounts ~12 cards (avatar, contact, notifs, sounds, verification, storefront,
 * referrals, tier badges, equipment interests, etc.) so a focused harness
 * around the editor wins on signal-to-noise.
 */

interface Profile {
  industry: string | null
}

function ProfileIndustryHarness({
  initialProfile,
  onSave,
}: {
  initialProfile: Profile
  onSave: (industrySingleton: string | null) => void
}) {
  const [industries, setIndustries] = useState<string[]>(
    initialProfile.industry ? [initialProfile.industry] : [],
  )
  return (
    <div>
      <MultiIndustryPicker
        value={industries}
        onChange={setIndustries}
      />
      <button
        type="button"
        onClick={() => onSave(industries[0] || null)}
      >
        Save
      </button>
    </div>
  )
}

describe('/profile industry editor (Cycle 65 audit)', () => {
  it('hydrates a legacy singleton as a 1-element chip', () => {
    render(
      <ProfileIndustryHarness
        initialProfile={{ industry: 'Mining' }}
        onSave={() => {}}
      />,
    )
    // The chip exposes a per-row "Remove <label>" aria-label
    expect(
      screen.getByRole('button', { name: /Remove Mining/i }),
    ).toBeInTheDocument()
  })

  it('hydrates a null industry as an empty picker', () => {
    render(
      <ProfileIndustryHarness
        initialProfile={{ industry: null }}
        onSave={() => {}}
      />,
    )
    // No "Remove …" buttons → no chips
    expect(
      screen.queryByRole('button', { name: /^Remove /i }),
    ).toBeNull()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('round-trips industries[0] back to the legacy singleton on save', () => {
    const onSave = vi.fn()
    render(
      <ProfileIndustryHarness
        initialProfile={{ industry: null }}
        onSave={onSave}
      />,
    )
    fireEvent.mouseDown(screen.getByRole('option', { name: /^Mining$/ }))
    fireEvent.click(screen.getByRole('option', { name: /^Mining$/ }))
    fireEvent.click(screen.getByRole('button', { name: /Save/i }))
    expect(onSave).toHaveBeenLastCalledWith('Mining')
  })

  it('saves null when the user removes the only chip', () => {
    const onSave = vi.fn()
    render(
      <ProfileIndustryHarness
        initialProfile={{ industry: 'Mining' }}
        onSave={onSave}
      />,
    )
    fireEvent.click(screen.getByRole('button', { name: /Remove Mining/i }))
    fireEvent.click(screen.getByRole('button', { name: /Save/i }))
    expect(onSave).toHaveBeenLastCalledWith(null)
  })

  it('default cap (5) is enforced — picker is gated, not unlimited', () => {
    function CappedHarness() {
      const [v, setV] = useState<string[]>([
        'Oil & Gas',
        'Petrochemical',
        'Mining',
        'Manufacturing',
        'Plastics & Chemicals',
      ])
      return <MultiIndustryPicker value={v} onChange={setV} />
    }
    render(<CappedHarness />)
    expect(
      screen.getByText(/Maximum 5 industries selected/i),
    ).toBeInTheDocument()
    expect(screen.queryByRole('combobox')).toBeNull()
  })
})
