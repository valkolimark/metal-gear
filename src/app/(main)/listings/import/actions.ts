'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { EQUIPMENT_CATEGORIES, INDUSTRIES, LISTING_CONDITIONS, TIER_LIMITS } from '@/lib/constants'
import type { Json } from '@/types/database'

const VALID_CATEGORIES = EQUIPMENT_CATEGORIES as readonly string[]
const VALID_CONDITIONS: string[] = LISTING_CONDITIONS.map((c) => c.value)
const VALID_INDUSTRIES = INDUSTRIES as readonly string[]

interface ParsedRow {
  row: number
  title: string
  description: string
  category: string
  condition: string
  price: string
  city: string
  state: string
  industry: string
  errors: string[]
  valid: boolean
}

export async function validateCSVRows(csvText: string): Promise<{
  rows: ParsedRow[]
  error?: string
}> {
  const lines = csvText.trim().split('\n')
  if (lines.length < 2) return { rows: [], error: 'CSV must have a header row and at least one data row' }

  const header = lines[0].toLowerCase().split(',').map((h) => h.trim().replace(/"/g, ''))
  const requiredCols = ['title', 'description', 'category', 'condition', 'price', 'city', 'state', 'industry']
  const missing = requiredCols.filter((c) => !header.includes(c))
  if (missing.length > 0) {
    return { rows: [], error: `Missing columns: ${missing.join(', ')}` }
  }

  const colIndex = Object.fromEntries(requiredCols.map((c) => [c, header.indexOf(c)]))
  const rows: ParsedRow[] = []

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim()
    if (!line) continue

    // Simple CSV parsing (handles quoted fields with commas)
    const values = parseCSVLine(line)
    const errors: string[] = []

    const title = values[colIndex.title]?.trim() || ''
    const description = values[colIndex.description]?.trim() || ''
    const category = values[colIndex.category]?.trim() || ''
    const condition = values[colIndex.condition]?.trim().toLowerCase().replace(/ /g, '_') || ''
    const price = values[colIndex.price]?.trim() || ''
    const city = values[colIndex.city]?.trim() || ''
    const state = values[colIndex.state]?.trim().toUpperCase() || ''
    const industry = values[colIndex.industry]?.trim() || ''

    if (!title) errors.push('Title is required')
    if (title.length > 200) errors.push('Title too long (max 200)')
    if (!description) errors.push('Description is required')
    if (!category) errors.push('Category is required')
    else if (!VALID_CATEGORIES.includes(category)) errors.push(`Invalid category: "${category}"`)
    if (!condition) errors.push('Condition is required')
    else if (!VALID_CONDITIONS.includes(condition)) errors.push(`Invalid condition: "${condition}"`)
    if (price && isNaN(Number(price))) errors.push('Price must be a number')
    if (Number(price) < 0) errors.push('Price cannot be negative')
    if (!city) errors.push('City is required')
    if (!state) errors.push('State is required')
    if (state.length !== 2) errors.push('State must be 2 letters')
    if (industry && !VALID_INDUSTRIES.includes(industry)) errors.push(`Invalid industry: "${industry}"`)

    rows.push({
      row: i,
      title,
      description,
      category,
      condition,
      price,
      city,
      state,
      industry,
      errors,
      valid: errors.length === 0,
    })
  }

  return { rows }
}

export async function processCSVImport(
  filename: string,
  rows: {
    title: string
    description: string
    category: string
    condition: string
    price: string
    city: string
    state: string
    industry: string
  }[]
) {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { error: 'Not authenticated' }

  const admin = createAdminClient()

  // Check tier
  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  const tier = (profile?.subscription_tier || 'free') as keyof typeof TIER_LIMITS
  if (tier === 'free') return { error: 'CSV import requires Premium or Boost subscription' }

  // Check current listing count
  const { count: currentCount } = await admin
    .from('listings')
    .select('id', { count: 'exact' })
    .eq('seller_id', user.id)
    .in('status', ['active', 'draft'])

  const limit = TIER_LIMITS[tier].listings
  const remaining = limit === Infinity ? Infinity : limit - (currentCount || 0)

  let successCount = 0
  let errorCount = 0
  const importErrors: { row: number; error: string }[] = []

  for (let i = 0; i < rows.length; i++) {
    if (remaining !== Infinity && successCount >= remaining) {
      importErrors.push({ row: i + 1, error: 'Listing limit reached for your tier' })
      errorCount++
      continue
    }

    const row = rows[i]
    const priceCents = row.price ? Math.round(Number(row.price) * 100) : null

    const { error } = await admin.from('listings').insert({
      seller_id: user.id,
      title: row.title,
      description: row.description,
      category: row.category,
      condition: row.condition,
      price_cents: priceCents,
      contact_for_price: !priceCents,
      location_city: row.city,
      location_state: row.state,
      industry: row.industry || null,
      status: 'draft',
    })

    if (error) {
      importErrors.push({ row: i + 1, error: error.message })
      errorCount++
    } else {
      successCount++
    }
  }

  // Record import history
  await admin.from('listing_imports').insert({
    user_id: user.id,
    filename,
    total_rows: rows.length,
    success_count: successCount,
    error_count: errorCount,
    errors: importErrors as unknown as Json,
  })

  return { successCount, errorCount, errors: importErrors }
}

export async function getImportHistory() {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { imports: [] }

  const admin = createAdminClient()
  const { data } = await admin
    .from('listing_imports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return { imports: data || [] }
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
