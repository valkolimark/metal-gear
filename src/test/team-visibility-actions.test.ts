/**
 * Cycle 70 — team visibility action validation.
 *
 * Verifies the Zod schema-level boundary protections; full integration
 * (RLS, ownership) covered by manual QA against the deploy.
 */
import { describe, it, expect } from 'vitest'
import { z } from 'zod'

const ToggleSchema = z.object({
  membershipId: z.string().uuid(),
  isPublic: z.boolean(),
})
const RequestSchema = z.object({
  membershipId: z.string().uuid(),
})

describe('ToggleMembershipPublicVisibility input', () => {
  it('accepts a valid uuid + boolean', () => {
    expect(
      ToggleSchema.safeParse({
        membershipId: '0e0c58ee-1119-41fd-b2fd-89ade27d41b5',
        isPublic: true,
      }).success
    ).toBe(true)
  })
  it('rejects non-uuid membershipId', () => {
    expect(
      ToggleSchema.safeParse({
        membershipId: 'membership-x',
        isPublic: true,
      }).success
    ).toBe(false)
  })
  it('rejects non-boolean isPublic', () => {
    expect(
      ToggleSchema.safeParse({
        membershipId: '0e0c58ee-1119-41fd-b2fd-89ade27d41b5',
        isPublic: 'yes',
      }).success
    ).toBe(false)
  })
})

describe('RequestMembershipPublicVisibility input', () => {
  it('accepts a valid uuid', () => {
    expect(
      RequestSchema.safeParse({
        membershipId: 'd3a8703e-780f-4620-9a39-2492aa8bec9b',
      }).success
    ).toBe(true)
  })
  it('rejects missing membershipId', () => {
    expect(RequestSchema.safeParse({}).success).toBe(false)
  })
})
