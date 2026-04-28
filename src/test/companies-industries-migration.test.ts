import { describe, it, expect } from 'vitest'
import { getCompanyIndustries, getPrimaryCompanyIndustry } from '@/types/company'

describe('company industries shim', () => {
  describe('getCompanyIndustries', () => {
    it('returns the array when industries[] is populated', () => {
      expect(
        getCompanyIndustries({
          industries: ['Oil & Gas', 'Petrochemical'],
          industry: 'Oil & Gas',
        }),
      ).toEqual(['Oil & Gas', 'Petrochemical'])
    })

    it('falls back to legacy industry singleton when array is empty', () => {
      expect(
        getCompanyIndustries({ industries: [], industry: 'Mining' }),
      ).toEqual(['Mining'])
    })

    it('returns empty when nothing is set', () => {
      expect(getCompanyIndustries({ industries: [], industry: null })).toEqual([])
      expect(getCompanyIndustries(null)).toEqual([])
      expect(getCompanyIndustries(undefined)).toEqual([])
    })

    it('skips legacy industry when only whitespace', () => {
      expect(
        getCompanyIndustries({ industries: [], industry: '   ' }),
      ).toEqual([])
    })

    it('filters empty entries out of the array', () => {
      expect(
        getCompanyIndustries({
          industries: ['', 'Plastics & Chemicals', '   '],
          industry: null,
        }),
      ).toEqual(['Plastics & Chemicals'])
    })

    it('prefers the array over the legacy singleton when both are set', () => {
      expect(
        getCompanyIndustries({
          industries: ['Mining', 'Petrochemical'],
          industry: 'Old Singleton',
        }),
      ).toEqual(['Mining', 'Petrochemical'])
    })
  })

  describe('getPrimaryCompanyIndustry', () => {
    it('returns the first array entry', () => {
      expect(
        getPrimaryCompanyIndustry({
          industries: ['Marine', 'Pharmaceutical'],
          industry: null,
        }),
      ).toBe('Marine')
    })

    it('returns the legacy singleton when array is empty', () => {
      expect(
        getPrimaryCompanyIndustry({ industries: [], industry: 'Construction' }),
      ).toBe('Construction')
    })

    it('returns null when nothing is set', () => {
      expect(
        getPrimaryCompanyIndustry({ industries: [], industry: null }),
      ).toBeNull()
    })
  })
})
