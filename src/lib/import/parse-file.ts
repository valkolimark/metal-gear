import ExcelJS from 'exceljs'

export type ParsedRow = {
  rowIndex: number
  data: Record<string, string>
  errors: string[]
}

export type ParseResult = {
  rows: ParsedRow[]
  headers: string[]
  totalRows: number
  errors: string[]
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
  // image
  image_url: 'image_url',
  'image url': 'image_url',
  'photo url': 'image_url',
  image: 'image_url',
  photo: 'image_url',
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

export function parseCSV(csvText: string): ParseResult {
  const lines = csvText.trim().split(/\r?\n/)
  const errors: string[] = []

  if (lines.length < 2) {
    return { rows: [], headers: [], totalRows: 0, errors: ['File must have a header row and at least one data row'] }
  }

  const rawHeaders = parseCSVLine(lines[0])
  const headers = rawHeaders.map(normalizeHeader)

  if (!headers.includes('title')) {
    errors.push('No "title" column found. Tried: title, name, equipment name, item')
  }

  if (errors.length > 0) {
    return { rows: [], headers, totalRows: 0, errors }
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
        // If same normalized key appears multiple times, first wins
        if (!data[key]) {
          data[key] = val
        }
      }
    }

    if (isEmptyRow(data)) continue

    const rowErrors: string[] = []
    if (!data.title) rowErrors.push('Missing required field "title"')

    rows.push({ rowIndex: i, data, errors: rowErrors })
  }

  return { rows, headers: [...new Set(headers)], totalRows: rows.length, errors }
}

export async function parseXLSX(buffer: Buffer | ArrayBuffer): Promise<ParseResult> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer as ArrayBuffer)

  const worksheet = workbook.worksheets[0]
  if (!worksheet || worksheet.rowCount < 2) {
    return { rows: [], headers: [], totalRows: 0, errors: ['Spreadsheet is empty or has no data rows'] }
  }

  const errors: string[] = []
  const headerRow = worksheet.getRow(1)
  const rawHeaders: string[] = []

  headerRow.eachCell({ includeEmpty: true }, (cell, colNumber) => {
    while (rawHeaders.length < colNumber - 1) rawHeaders.push('')
    rawHeaders.push(String(cell.value ?? ''))
  })

  const headers = rawHeaders.map(normalizeHeader)

  if (!headers.includes('title')) {
    errors.push('No "title" column found. Tried: title, name, equipment name, item')
  }

  if (errors.length > 0) {
    return { rows: [], headers, totalRows: 0, errors }
  }

  const rows: ParsedRow[] = []

  for (let i = 2; i <= worksheet.rowCount; i++) {
    const row = worksheet.getRow(i)
    const data: Record<string, string> = {}

    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const key = headers[colNumber - 1]
      if (key) {
        const val = String(cell.value ?? '').trim()
        if (val && !data[key]) {
          data[key] = val
        }
      }
    })

    if (isEmptyRow(data)) continue

    const rowErrors: string[] = []
    if (!data.title) rowErrors.push('Missing required field "title"')

    rows.push({ rowIndex: i, data, errors: rowErrors })
  }

  return { rows, headers: [...new Set(headers)], totalRows: rows.length, errors }
}

export async function parseGoogleSheet(url: string): Promise<ParseResult> {
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!idMatch) {
    return { rows: [], headers: [], totalRows: 0, errors: ['Invalid Google Sheets URL. Please paste a full Google Sheets URL.'] }
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
      }
    }
    return { rows: [], headers: [], totalRows: 0, errors: [`Failed to fetch Google Sheet: HTTP ${response.status}`] }
  }

  const csvText = await response.text()

  // Google sometimes returns an HTML login page for private sheets
  if (csvText.trim().startsWith('<!DOCTYPE') || csvText.trim().startsWith('<html')) {
    return {
      rows: [],
      headers: [],
      totalRows: 0,
      errors: ['This Google Sheet is not publicly accessible. Set sharing to "Anyone with the link can view."'],
    }
  }

  return parseCSV(csvText)
}

export function getMappedHeaders(headers: string[]): { mapped: string[]; unmapped: string[] } {
  const mapped: string[] = []
  const unmapped: string[] = []

  for (const h of headers) {
    if (Object.values(COLUMN_ALIASES).includes(h)) {
      mapped.push(h)
    } else {
      unmapped.push(h)
    }
  }

  return { mapped: [...new Set(mapped)], unmapped }
}
