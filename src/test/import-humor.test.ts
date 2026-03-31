import { describe, it, expect } from 'vitest'
import {
  classifyImportSize,
  getPreviewQuip,
  getStartToast,
  getImageFetchQuip,
  getBannerLabel,
  getCompletionMessage,
  getFailureMessage,
} from '@/lib/import/humor'

describe('classifyImportSize', () => {
  it('classifies tiny imports (1–10)', () => {
    expect(classifyImportSize(1)).toBe('tiny')
    expect(classifyImportSize(10)).toBe('tiny')
  })
  it('classifies small imports (11–50)', () => {
    expect(classifyImportSize(11)).toBe('small')
    expect(classifyImportSize(50)).toBe('small')
  })
  it('classifies medium imports (51–200)', () => {
    expect(classifyImportSize(51)).toBe('medium')
    expect(classifyImportSize(200)).toBe('medium')
  })
  it('classifies large imports (201–500)', () => {
    expect(classifyImportSize(201)).toBe('large')
    expect(classifyImportSize(500)).toBe('large')
  })
  it('classifies massive imports (500+)', () => {
    expect(classifyImportSize(501)).toBe('massive')
    expect(classifyImportSize(5000)).toBe('massive')
  })
})

describe('getPreviewQuip', () => {
  it('returns a non-empty string for all size tiers', () => {
    expect(getPreviewQuip(5, 10)).toBeTruthy()
    expect(getPreviewQuip(25, 75)).toBeTruthy()
    expect(getPreviewQuip(150, 600)).toBeTruthy()
    expect(getPreviewQuip(300, 1200)).toBeTruthy()
    expect(getPreviewQuip(557, 2652)).toBeTruthy()
  })
  it('includes image count when images > 0', () => {
    const quip = getPreviewQuip(100, 500)
    expect(quip).toContain('500')
  })
  it('omits image count when images = 0', () => {
    const quip = getPreviewQuip(10, 0)
    expect(quip).not.toContain('photo')
    expect(quip).not.toContain('image')
  })
})

describe('getStartToast', () => {
  it('returns a non-empty string for all size tiers', () => {
    expect(getStartToast(1)).toBeTruthy()
    expect(getStartToast(25)).toBeTruthy()
    expect(getStartToast(100)).toBeTruthy()
    expect(getStartToast(300)).toBeTruthy()
    expect(getStartToast(600)).toBeTruthy()
  })
})

describe('getImageFetchQuip', () => {
  it('handles 0 images gracefully', () => {
    expect(getImageFetchQuip(0, 50)).toBe('No images to fetch — almost done.')
  })
  it('returns different strings at different completion stages', () => {
    const q0 = getImageFetchQuip(2000, 0)
    const q50 = getImageFetchQuip(2000, 50)
    const q90 = getImageFetchQuip(2000, 90)
    expect(q0).not.toBe(q50)
    expect(q50).not.toBe(q90)
  })
  it('does not throw at 100% completion', () => {
    expect(() => getImageFetchQuip(500, 100)).not.toThrow()
  })
})

describe('getBannerLabel', () => {
  it('shows listing count during importing phase', () => {
    const label = getBannerLabel(10, 50, 'importing', 0, 0)
    expect(label).toContain('10 of 50')
  })
  it('shows image count during fetching_images phase', () => {
    const label = getBannerLabel(50, 50, 'fetching_images', 100, 500)
    expect(label).toContain('100')
    expect(label).toContain('500')
  })
})

describe('getCompletionMessage', () => {
  it('returns celebratory title when no failures', () => {
    const { title } = getCompletionMessage(557, 0, 0)
    expect(title).toContain('open')
  })
  it('returns cautionary title when failures exist', () => {
    const { title } = getCompletionMessage(550, 7, 12)
    expect(title).toContain('check')
  })
  it('body mentions listing count', () => {
    const { body } = getCompletionMessage(557, 0, 0)
    expect(body).toContain('557')
  })
})

describe('getFailureMessage', () => {
  it('includes error message when provided', () => {
    const { body } = getFailureMessage('increment_import_counter missing')
    expect(body).toContain('increment_import_counter missing')
  })
  it('returns generic message when no error provided', () => {
    const { body } = getFailureMessage()
    expect(body).toBeTruthy()
  })
})
