import { describe, it, expect } from 'vitest'
import {
  getIndustries,
  getPrimaryIndustry,
  industryDisplayLabel,
  normalizeOtherIndustry,
  coerceIndustryArray,
} from '@/lib/listings/industries'

describe('listings.industries shim', () => {
  describe('getIndustries', () => {
    it('returns the array when industries[] is populated', () => {
      expect(getIndustries({ industries: ['Plastics', 'Food & Beverage'] })).toEqual([
        'Plastics',
        'Food & Beverage',
      ])
    })

    it('falls back to legacy industry singleton when array is empty', () => {
      expect(getIndustries({ industries: [], industry: 'Mining' })).toEqual(['Mining'])
    })

    it('falls back to legacy industry singleton when array is null', () => {
      expect(getIndustries({ industries: null, industry: 'Oil & Gas' })).toEqual(['Oil & Gas'])
    })

    it('returns empty array for a row with neither field', () => {
      expect(getIndustries({})).toEqual([])
      expect(getIndustries(null)).toEqual([])
      expect(getIndustries(undefined)).toEqual([])
    })

    it('strips empty strings out of industries[]', () => {
      expect(getIndustries({ industries: ['', 'Plastics', ''] })).toEqual(['Plastics'])
    })

    it('skips legacy industry when only whitespace', () => {
      expect(getIndustries({ industry: '   ' })).toEqual([])
    })
  })

  describe('getPrimaryIndustry', () => {
    it('returns the first array element', () => {
      expect(getPrimaryIndustry({ industries: ['A', 'B'] })).toBe('A')
    })

    it('returns the legacy singleton when array is empty', () => {
      expect(getPrimaryIndustry({ industries: [], industry: 'X' })).toBe('X')
    })

    it('returns null when nothing is set', () => {
      expect(getPrimaryIndustry({})).toBeNull()
    })
  })

  describe('normalizeOtherIndustry', () => {
    it('produces other:<kebab-slug>', () => {
      expect(normalizeOtherIndustry('Marine Logistics')).toBe('other:marine-logistics')
    })

    it('strips punctuation and collapses whitespace', () => {
      expect(normalizeOtherIndustry("  Aero/space & R&D  ")).toBe('other:aerospace-rd')
    })

    it('returns null for too-short input', () => {
      expect(normalizeOtherIndustry('a')).toBeNull()
      expect(normalizeOtherIndustry(' ')).toBeNull()
    })

    it('caps slug at 40 chars', () => {
      const long = 'A'.repeat(80)
      const result = normalizeOtherIndustry(long)
      expect(result).not.toBeNull()
      expect(result!.length).toBeLessThanOrEqual('other:'.length + 40)
    })
  })

  describe('industryDisplayLabel', () => {
    it('passes canonical values through', () => {
      expect(industryDisplayLabel('Oil & Gas')).toBe('Oil & Gas')
    })

    it('humanises other:<slug>', () => {
      expect(industryDisplayLabel('other:marine-logistics')).toBe('Marine Logistics')
    })

    it('handles a bare other: prefix', () => {
      expect(industryDisplayLabel('other:')).toBe('Other')
    })
  })

  describe('coerceIndustryArray', () => {
    it('returns array as-is when given an array', () => {
      expect(coerceIndustryArray(['A', 'B'])).toEqual(['A', 'B'])
    })

    it('wraps a non-empty string', () => {
      expect(coerceIndustryArray('Mining')).toEqual(['Mining'])
    })

    it('returns empty for empty/whitespace string', () => {
      expect(coerceIndustryArray('')).toEqual([])
      expect(coerceIndustryArray('   ')).toEqual([])
    })

    it('returns empty for null/undefined/non-string', () => {
      expect(coerceIndustryArray(null)).toEqual([])
      expect(coerceIndustryArray(undefined)).toEqual([])
      expect(coerceIndustryArray(42)).toEqual([])
    })

    it('strips non-string array entries', () => {
      expect(coerceIndustryArray(['A', 42, '', 'B'])).toEqual(['A', 'B'])
    })
  })
})
