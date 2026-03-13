import { describe, it, expect } from 'vitest'
import {
  TIER_LIMITS,
  TIER_PRICES,
  EQUIPMENT_CATEGORIES,
  INDUSTRIES,
  LISTING_CONDITIONS,
  SORT_OPTIONS,
} from '@/lib/constants'

describe('Constants', () => {
  describe('TIER_LIMITS', () => {
    it('has all tiers including legacy aliases', () => {
      expect(TIER_LIMITS).toHaveProperty('free')
      expect(TIER_LIMITS).toHaveProperty('pro')
      expect(TIER_LIMITS).toHaveProperty('business')
      expect(TIER_LIMITS).toHaveProperty('enterprise')
      expect(TIER_LIMITS).toHaveProperty('premium')
      expect(TIER_LIMITS).toHaveProperty('boost')
    })

    it('free tier has correct limits', () => {
      expect(TIER_LIMITS.free.listings).toBe(3)
      expect(TIER_LIMITS.free.photos).toBe(5)
      expect(TIER_LIMITS.free.conversations).toBe(10)
      expect(TIER_LIMITS.free.searchRadius).toBe(100)
    })

    it('pro tier has higher limits than free', () => {
      expect(TIER_LIMITS.pro.listings).toBeGreaterThan(TIER_LIMITS.free.listings)
      expect(TIER_LIMITS.pro.photos).toBeGreaterThan(TIER_LIMITS.free.photos)
      expect(TIER_LIMITS.pro.conversations).toBe(Infinity)
    })

    it('business tier has higher limits than pro', () => {
      expect(TIER_LIMITS.business.listings).toBeGreaterThan(TIER_LIMITS.pro.listings)
      expect(TIER_LIMITS.business.photos).toBeGreaterThan(TIER_LIMITS.pro.photos)
      expect(TIER_LIMITS.business.searchRadius).toBe(Infinity)
    })

    it('enterprise tier has highest limits', () => {
      expect(TIER_LIMITS.enterprise.listings).toBe(Infinity)
      expect(TIER_LIMITS.enterprise.photos).toBeGreaterThan(TIER_LIMITS.business.photos)
    })

    it('legacy aliases match their counterparts', () => {
      expect(TIER_LIMITS.premium.listings).toBe(TIER_LIMITS.pro.listings)
      expect(TIER_LIMITS.boost.listings).toBe(TIER_LIMITS.business.listings)
    })
  })

  describe('TIER_PRICES', () => {
    it('free tier is $0', () => {
      expect(TIER_PRICES.free).toBe(0)
    })

    it('pro costs $179/mo', () => {
      expect(TIER_PRICES.pro).toBe(17900)
    })

    it('business costs $349/mo', () => {
      expect(TIER_PRICES.business).toBe(34900)
    })

    it('enterprise costs $599/mo', () => {
      expect(TIER_PRICES.enterprise).toBe(59900)
    })

    it('legacy aliases match their counterparts', () => {
      expect(TIER_PRICES.premium).toBe(TIER_PRICES.pro)
      expect(TIER_PRICES.boost).toBe(TIER_PRICES.business)
    })
  })

  describe('EQUIPMENT_CATEGORIES', () => {
    it('includes essential industrial categories', () => {
      expect(EQUIPMENT_CATEGORIES).toContain('CNC Machines')
      expect(EQUIPMENT_CATEGORIES).toContain('Welding Equipment')
      expect(EQUIPMENT_CATEGORIES).toContain('Generators')
      expect(EQUIPMENT_CATEGORIES).toContain('Pumps')
    })

    it('includes Other as fallback', () => {
      expect(EQUIPMENT_CATEGORIES).toContain('Other')
    })
  })

  describe('INDUSTRIES', () => {
    it('includes Houston-relevant industries', () => {
      expect(INDUSTRIES).toContain('Oil & Gas')
      expect(INDUSTRIES).toContain('Petrochemical')
      expect(INDUSTRIES).toContain('Manufacturing')
    })
  })

  describe('LISTING_CONDITIONS', () => {
    it('has value/label pairs', () => {
      for (const condition of LISTING_CONDITIONS) {
        expect(condition).toHaveProperty('value')
        expect(condition).toHaveProperty('label')
      }
    })

    it('ranges from new to for_parts', () => {
      const values = LISTING_CONDITIONS.map((c) => c.value)
      expect(values[0]).toBe('new')
      expect(values[values.length - 1]).toBe('for_parts')
    })
  })

  describe('SORT_OPTIONS', () => {
    it('has expected sort options', () => {
      const values = SORT_OPTIONS.map((s) => s.value)
      expect(values).toContain('newest')
      expect(values).toContain('price_asc')
      expect(values).toContain('price_desc')
    })
  })
})
