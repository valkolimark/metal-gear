import { describe, it, expect } from 'vitest'
import { detectImageColumns, extractImageUrls } from '@/lib/import/parse-file'

describe('detectImageColumns', () => {
  it('detects single image_url column', () => {
    const r = detectImageColumns(['title', 'image_url', 'description'])
    expect(r.singleColumnIndex).toBe(1)
    expect(r.numberedColumnIndices).toEqual([])
  })

  it('detects numbered columns sorted by numeric suffix regardless of column order', () => {
    const r = detectImageColumns(['title', 'image_url_3', 'image_url_1', 'image_url_2'])
    expect(r.singleColumnIndex).toBeNull()
    expect(r.numberedColumnIndices).toEqual([2, 3, 1])
  })

  it('detects both single and numbered columns simultaneously', () => {
    const r = detectImageColumns(['title', 'image_url', 'image_url_1', 'image_url_2'])
    expect(r.singleColumnIndex).toBe(1)
    expect(r.numberedColumnIndices).toEqual([2, 3])
  })

  it('detects photo_url_N aliases', () => {
    const r = detectImageColumns(['title', 'photo_url_1', 'photo_url_2'])
    expect(r.numberedColumnIndices).toEqual([1, 2])
  })

  it('returns null and empty array when no image columns present', () => {
    const r = detectImageColumns(['title', 'description', 'price'])
    expect(r.singleColumnIndex).toBeNull()
    expect(r.numberedColumnIndices).toEqual([])
  })
})

describe('extractImageUrls', () => {
  it('splits pipe-separated single column into ordered array', () => {
    const info = detectImageColumns(['title', 'image_url'])
    const urls = extractImageUrls(
      ['My Listing', 'https://a.jpg|https://b.jpg|https://c.jpg'],
      info
    )
    expect(urls).toEqual(['https://a.jpg', 'https://b.jpg', 'https://c.jpg'])
  })

  it('collects numbered columns in ascending suffix order', () => {
    const info = detectImageColumns(['title', 'image_url_1', 'image_url_2', 'image_url_3'])
    const urls = extractImageUrls(
      ['My Listing', 'https://a.jpg', 'https://b.jpg', 'https://c.jpg'],
      info
    )
    expect(urls).toEqual(['https://a.jpg', 'https://b.jpg', 'https://c.jpg'])
  })

  it('deduplicates URLs that appear in both single and numbered columns', () => {
    const info = detectImageColumns(['title', 'image_url', 'image_url_1'])
    const urls = extractImageUrls(['My Listing', 'https://a.jpg', 'https://a.jpg'], info)
    expect(urls).toEqual(['https://a.jpg'])
  })

  it('filters empty strings and whitespace-only values from numbered columns', () => {
    const info = detectImageColumns(['title', 'image_url_1', 'image_url_2', 'image_url_3'])
    const urls = extractImageUrls(['My Listing', 'https://a.jpg', '', '   '], info)
    expect(urls).toEqual(['https://a.jpg'])
  })

  it('returns empty array when no image columns are present', () => {
    const info = detectImageColumns(['title', 'description'])
    const urls = extractImageUrls(['My Listing', 'Some description'], info)
    expect(urls).toEqual([])
  })

  it('single URL with no pipe returns a single-element array (backward compat)', () => {
    const info = detectImageColumns(['title', 'image_url'])
    const urls = extractImageUrls(['My Listing', 'https://a.jpg'], info)
    expect(urls).toEqual(['https://a.jpg'])
  })
})
