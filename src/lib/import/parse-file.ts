import ExcelJS from 'exceljs'

export type ParsedRow = {
  rowIndex: number
  data: Record<string, string>
  image_urls: string[]
  errors: string[]
}

export type ParseResult = {
  rows: ParsedRow[]
  headers: string[]
  totalRows: number
  errors: string[]
  detectedImageColumnCount: number
}

const COLUMN_ALIASES: Record<string, string> = {
  // title
  title: 'title',
  name: 'title',
  'equipment name': 'title',
  item: 'title',
  // price
  price: 'price',
  'asking price': 'price',
  'list price': 'price',
  cost: 'price',
  // description
  description: 'description',
  desc: 'description',
  details: 'description',
  notes: 'description',
  // condition
  condition: 'condition',
  grade: 'condition',
  quality: 'condition',
  // category
  category: 'category',
  type: 'category',
  'equipment type': 'category',
  // manufacturer
  manufacturer: 'manufacturer',
  make: 'manufacturer',
  brand: 'manufacturer',
  mfr: 'manufacturer',
  // model
  model: 'model',
  'model number': 'model',
  'model no': 'model',
  'part number': 'model',
  // year
  year: 'year',
  'year manufactured': 'year',
  'manufacture year': 'year',
  // location
  city: 'city',
  state: 'state',
  location: 'location',
  // industry
  industry: 'industry',
  sector: 'industry',
  // image (single column — may contain pipe-separated URLs)
  image_url: 'image_url',
  'image url': 'image_url',
  'photo url': 'image_url',
  image: 'image_url',
  photo: 'image_url',
  images: 'image_url',
  photos: 'image_url',
  picture: 'image_url',
  // quantity
  quantity: 'quantity',
  qty: 'quantity',
  count: 'quantity',
  // sku
  sku: 'sku',
  part: 'sku',
  'stock number': 'sku',
}

function normalizeHeader(header: string): string {
  const normalized = header.toLowerCase().trim()
  return COLUMN_ALIASES[normalized] ?? normalized
}

function parseCSVLine(line: string): string[] {
  const values: string[] = []
  let current = ''
  let inQuotes = false

  for (let i = 0; i < line.length; i++) {
    const char = line[i]
    if (char === '"') {
      if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
        current += '"'
        i++
      } else {
        inQuotes = !inQuotes
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current)
      current = ''
    } else {
      current += char
    }
  }
  values.push(current)
  return values
}

function isEmptyRow(data: Record<string, string>): boolean {
  return Object.values(data).every((v) => !v || !v.trim())
}

/**
 * Inspects the header row and returns the column indices that contain image URLs.
 *
 * Handles three patterns (all optional, all combinable):
 *   - Single column: 'image_url', 'photo_url', 'image', 'photo', 'images', 'photos'
 *     → contents may be a single URL or pipe-separated multiple URLs
 *   - Numbered columns: 'image_url_1', 'image_url_2' ... 'image_url_N'
 *     also: 'photo_url_1', 'photo_1', 'image_1'
 *     → sorted by numeric suffix to guarantee order regardless of column position in file
 */
export function detectImageColumns(headers: string[]): {
  singleColumnIndex: number | null
  numberedColumnIndices: number[]
} {
  const normalized = headers.map(h =>
    h.trim().toLowerCase().replace(/\s+/g, '_')
  )

  const singleAliases = new Set([
    'image_url', 'photo_url', 'image', 'photo', 'images', 'photos',
    'image_url_url', 'photo_url_url',
  ])
  const singleColumnIndex = normalized.findIndex(h => singleAliases.has(h))

  const numberedPattern = /^(image_url|photo_url|image|photo)_(\d+)$/
  const numbered: { index: number; n: number }[] = []
  normalized.forEach((h, i) => {
    const match = h.match(numberedPattern)
    if (match) numbered.push({ index: i, n: parseInt(match[2], 10) })
  })
  numbered.sort((a, b) => a.n - b.n)

  return {
    singleColumnIndex: singleColumnIndex === -1 ? null : singleColumnIndex,
    numberedColumnIndices: numbered.map(e => e.index),
  }
}

/**
 * Extracts all image URLs from a single row given the detected column layout.
 *
 * Order:
 *   1. Pipe-split values from the single column (if present), in pipe order
 *   2. Values from numbered columns, in ascending numeric suffix order
 *
 * Deduplicates while preserving order. Filters empty strings.
 * The first URL in the returned array will become the primary image (position = 0).
 */
export function extractImageUrls(
  rawValues: string[],
  imageColumnInfo: ReturnType<typeof detectImageColumns>
): string[] {
  const urls: string[] = []

  if (imageColumnInfo.singleColumnIndex !== null) {
    const raw = rawValues[imageColumnInfo.singleColumnIndex] ?? ''
    urls.push(...raw.split('|').map(u => u.trim()).filter(Boolean))
  }

  for (const idx of imageColumnInfo.numberedColumnIndices) {
    const url = (rawValues[idx] ?? '').trim()
    if (url) urls.push(url)
  }

  const seen = new Set<string>()
  return urls.filter(url => {
    if (seen.has(url)) return false
    seen.add(url)
    return true
  })
}

export function parseCSV(csvText: string): ParseResult {
  const lines = csvText.trim().split(/\r?\n/)
  const errors: string[] = []

  if (lines.length < 2) {
    return { rows: [], headers: [], totalRows: 0, errors: ['File must have a header row and at least one data row'], detectedImageColumnCount: 0 }
  }

  const rawHeaders = parseCSVLine(lines[0])
  const headers = rawHeaders.map(normalizeHeader)
  const imageColumnInfo = detectImageColumns(rawHeaders)

  if (!headers.includes('title')) {
    errors.push('No "title" column found. Tried: title, name, equipment name, item')
  }

  if (errors.length > 0) {
    return { rows: [], headers, totalRows: 0, errors, detectedImageColumnCount: 0 }
  }

  const rows: ParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    const values = parseCSVLine(line)
    const data: Record<string, string> = {}

    for (let j = 0; j < headers.length; j++) {
      const key = headers[j]
      const val = (values[j] ?? '').trim()
      if (key && val) {
        if (!data[key]) {
          data[key] = val
        }
      }
    }

    if (isEmptyRow(data)) continue

    const rowErrors: string[] = []
    if (!data.title) rowErrors.push('Missing required field "title"')

    const imageUrls = extractImageUrls(values, imageColumnInfo)

    rows.push({ rowIndex: i, data, image_urls: imageUrls, errors: rowErrors })
  }

  const detectedImageColumnCount = Math.max(
    imageColumnInfo.singleColumnIndex !== null ? 1 : 0,
    imageColumnInfo.numberedColumnIndices.length
  )

  return { rows, headers: [...new Set(headers)], totalRows: rows.length, errors, detectedImageColumnCount }
}

export async function parseXLSX(buffer: Buffer | ArrayBuffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as ArrayBuffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet || worksheet.rowCount < 2) {
    return { rows: [], headers: [], totalRows: 0, errors: ['Spreadsheet is empty or has no data rows'], detectedImageColumnCount: 0 }
  }

  const errors: string[] = []
  const headerRow = worksheet.getRow(1)
  const rawHeaders: string[] = []

  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    while (rawHeaders.length < colNumber - 1) rawHeaders.push('')
    rawHeaders.push(String(cell.value ?? ''))
  })

  const headers = rawHeaders.map(normalizeHeader)
  const imageColumnInfo = detectImageColumns(rawHeaders)

  if (!headers.includes('title')) {
    errors.push('No "title" column found. Tried: title, name, equipment name, item')
  }

  if (errors.length > 0) {
    return { rows: [], headers, totalRows: 0, errors, detectedImageColumnCount: 0 }
  }

  const rows: ParsedRow[] = []

  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i)
    const data: Record<string, string> = {}
    const rawValues: string[] = new Array(rawHeaders.length).fill('')

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = headers[colNumber - 1]
      const val = String(cell.value ?? '').trim()
      if (colNumber - 1 < rawValues.length) {
        rawValues[colNumber - 1] = val
      }
      if (key && val && !data[key]) {
        data[key] = val
      }
    })

    if (isEmptyRow(data)) continue

    const rowErrors: string[] = []
    if (!data.title) rowErrors.push('Missing required field "title"')

    const imageUrls = extractImageUrls(rawValues, imageColumnInfo)

    rows.push({ rowIndex: i, data, image_urls: imageUrls, errors: rowErrors })
  }

  const detectedImageColumnCount = Math.max(
    imageColumnInfo.singleColumnIndex !== null ? 1 : 0,
    imageColumnInfo.numberedColumnIndices.length
  )

  return { rows, headers: [...new Set(headers)], totalRows: rows.length, errors, detectedImageColumnCount }
}

export async function parseGoogleSheet(url: string): Promise<ParseResult> {
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!idMatch) {
    return { rows: [], headers: [], totalRows: 0, errors: ['Invalid Google Sheets URL. Please paste a full Google Sheets URL.'], detectedImageColumnCount: 0 }
  }

  const spreadsheetId = idMatch[1]
  const gidMatch = url.match(/gid=(\d+)/)
  const gid = gidMatch?.[1] ?? '0'

  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`

  const response = await fetch(exportUrl, {
    headers: { 'User-Agent': 'MetalGear-Import/1.0' },
  })

  if (!response.ok) {
    if (response.status === 403 || response.status === 401) {
      return {
        rows: [],
        headers: [],
        totalRows: 0,
        errors: ['This Google Sheet is not publicly accessible. Set sharing to "Anyone with the link can view."'],
        detectedImageColumnCount: 0,
      }
    }
    return { rows: [], headers: [], totalRows: 0, errors: [`Failed to fetch Google Sheet: HTTP ${response.status}`], detectedImageColumnCount: 0 }
  }

  const csvText = await response.text()

  // Google sometimes returns an HTML login page for private sheets
  if (csvText.trim().startsWith('<!DOCTYPE') || csvText.trim().startsWith('<html')) {
    return {
      rows: [],
      headers: [],
      totalRows: 0,
      errors: ['This Google Sheet is not publicly accessible. Set sharing to "Anyone with the link can view."'],
      detectedImageColumnCount: 0,
    }
  }

  return parseCSV(csvText)
}

export function getMappedHeaders(headers: string[]): { mapped: string[]; unmapped: string[] } {
  const mapped: string[] = []
  const unmapped: string[] = []

  // Numbered image columns (image_url_1, photo_url_2, etc.) are detected
  // dynamically by detectImageColumns() — not via COLUMN_ALIASES.
  // Normalize with underscore replacement to match detectImageColumns() logic.
  const numberedImagePattern = /^(image_url|photo_url|image|photo)_\d+$/

  for (const h of headers) {
    const underscored = h.trim().toLowerCase().replace(/\s+/g, '_')
    if (Object.values(COLUMN_ALIASES).includes(h) || numberedImagePattern.test(underscored)) {
      mapped.push(h)
    } else {
      unmapped.push(h)
    }
  }

  return { mapped: [...new Set(mapped)], unmapped }
}
