'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { EQUIPMENT_CATEGORIES, INDUSTRIES, LISTING_CONDITIONS, TIER_LIMITS } from '@/lib/constants'
import { parseCSV, parseXLSX, parseGoogleSheet, getMappedHeaders } from '@/lib/import/parse-file'
import { fetchAndUploadImage } from '@/lib/import/fetch-image'
import { getActiveCompanyId } from '@/app/actions/company-context'
import type { ParsedRow, ParseResult } from '@/lib/import/parse-file'
import type { Json } from '@/types/database'

// Note: maxDuration = 300 is set on the import page route segment

const VALID_CATEGORIES = EQUIPMENT_CATEGORIES as readonly string[]
const VALID_CONDITIONS: string[] = LISTING_CONDITIONS.map((c) => c.value)

const CONDITION_ALIASES: Record<string, string> = {
  new: 'new',
  'like new': 'like_new',
  like_new: 'like_new',
  excellent: 'like_new',
  good: 'good',
  fair: 'fair',
  poor: 'poor',
  'for parts': 'for_parts',
  for_parts: 'for_parts',
  parts: 'for_parts',
  a: 'like_new',
  b: 'good',
  c: 'fair',
  d: 'poor',
  f: 'for_parts',
}

// ─── Parse Import File ──────────────────────────────────────────────

export type ParseImportResult = {
  rows: ParsedRow[]
  headers: string[]
  mappedHeaders: string[]
  unmappedHeaders: string[]
  totalRows: number
  imageUrlCount: number
  errors: string[]
}

export async function parseImportFile(
  formData: FormData
): Promise<ParseImportResult> {
  const file = formData.get('file') as File | null
  const googleUrl = formData.get('googleUrl') as string | null
  const format = formData.get('format') as string

  let result: ParseResult

  try {
    if (format === 'google_sheets' && googleUrl) {
      result = await parseGoogleSheet(googleUrl)
    } else if (file) {
      if (format === 'xlsx') {
        const buffer = Buffer.from(await file.arrayBuffer())
        if (buffer.length > 50 * 1024 * 1024) {
          return {
            rows: [],
            headers: [],
            mappedHeaders: [],
            unmappedHeaders: [],
            totalRows: 0,
            imageUrlCount: 0,
            errors: ['File exceeds 50MB limit'],
          }
        }
        result = await parseXLSX(buffer)
      } else {
        const text = await file.text()
        result = parseCSV(text)
      }
    } else {
      return {
        rows: [],
        headers: [],
        mappedHeaders: [],
        unmappedHeaders: [],
        totalRows: 0,
        imageUrlCount: 0,
        errors: ['No file or URL provided'],
      }
    }
  } catch (error) {
    return {
      rows: [],
      headers: [],
      mappedHeaders: [],
      unmappedHeaders: [],
      totalRows: 0,
      imageUrlCount: 0,
      errors: [error instanceof Error ? error.message : 'Failed to parse file'],
    }
  }

  const { mapped, unmapped } = getMappedHeaders(result.headers)
  const imageUrlCount = result.rows.filter((r) => r.data.image_url).length

  return {
    rows: result.rows,
    headers: result.headers,
    mappedHeaders: mapped,
    unmappedHeaders: unmapped,
    totalRows: result.totalRows,
    imageUrlCount,
    errors: result.errors,
  }
}

// ─── Map Row to Listing ─────────────────────────────────────────────

function mapRowToListing(
  data: Record<string, string>,
  companyId: string,
  userId: string
) {
  const priceRaw = data.price?.replace(/[$,]/g, '')
  const price = priceRaw ? parseFloat(priceRaw) : null
  const priceCents = price && !isNaN(price) && price > 0 ? Math.round(price * 100) : null

  const conditionRaw = (data.condition || 'fair').toLowerCase().trim()
  const condition = CONDITION_ALIASES[conditionRaw] ?? 'fair'

  const yearRaw = data.year ? parseInt(data.year) : null
  const year = yearRaw && yearRaw >= 1900 && yearRaw <= 2030 ? yearRaw : null

  const quantityRaw = data.quantity ? parseInt(data.quantity) : null
  const quantity = quantityRaw && quantityRaw > 0 ? quantityRaw : 1

  // Build specs object from manufacturer, model, year
  const specs: Record<string, unknown> = {}
  if (data.manufacturer) specs.manufacturer = data.manufacturer
  if (data.model) specs.model = data.model
  if (year) specs.year = year

  return {
    seller_id: userId,
    company_id: companyId,
    title: data.title!,
    description: data.description || '',
    category: VALID_CATEGORIES.includes(data.category as string) ? data.category : 'Other',
    condition,
    price_cents: priceCents,
    contact_for_price: !priceCents,
    location_city: data.city || 'Houston',
    location_state: data.state?.toUpperCase() || 'TX',
    industry: data.industry && (INDUSTRIES as readonly string[]).includes(data.industry) ? data.industry : null,
    status: 'active' as const,
    quantity,
    sku: data.sku || null,
    specifications: Object.keys(specs).length > 0 ? (specs as Json) : null,
    ai_assist_used: false,
  }
}

// ─── Start Import Job ───────────────────────────────────────────────

export type ImportJobResult = {
  importId: string
  error?: string
  tierLimitWarning?: string
}

export async function startImportJob(
  rows: ParsedRow[],
  fileName: string | null,
  fileFormat: string
): Promise<ImportJobResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { importId: '', error: 'Not authenticated' }

  const admin = createAdminClient()

  // Get user tier
  const { data: profile } = await admin
    .from('profiles')
    .select('subscription_tier')
    .eq('id', user.id)
    .single()

  const tier = (profile?.subscription_tier || 'free') as keyof typeof TIER_LIMITS
  if (tier === 'free') return { importId: '', error: 'Bulk import requires a Pro or higher subscription' }

  // Get active company
  const companyId = await getActiveCompanyId(user.id)
  if (!companyId) return { importId: '', error: 'No active company. Please create or select a company first.' }

  // Check tier listing limit
  const { count: currentCount } = await admin
    .from('listings')
    .select('id', { count: 'exact' })
    .eq('company_id', companyId)
    .in('status', ['active', 'draft'])

  const limit = TIER_LIMITS[tier].listings
  const remaining = limit === Infinity ? Infinity : limit - (currentCount || 0)

  let tierLimitWarning: string | undefined
  let rowsToProcess = rows

  if (remaining !== Infinity && rows.length > remaining) {
    if (remaining <= 0) {
      return { importId: '', error: 'You have reached your listing limit. Upgrade your plan to import more listings.' }
    }
    tierLimitWarning = `Your plan allows ${remaining} more listing${remaining !== 1 ? 's' : ''}. Only the first ${remaining} rows will be imported.`
    rowsToProcess = rows.slice(0, remaining)
  }

  // Create import record
  const { data: importRecord, error: insertError } = await admin
    .from('listing_imports')
    .insert({
      user_id: user.id,
      company_id: companyId,
      filename: fileName,
      file_format: fileFormat,
      status: 'importing',
      total_rows: rowsToProcess.length,
      processed_rows: 0,
      successful_rows: 0,
      failed_rows: 0,
    })
    .select('id')
    .single()

  if (insertError || !importRecord) {
    return { importId: '', error: 'Failed to create import record' }
  }

  const importId = importRecord.id
  const createdListingIds: string[] = []
  const errorLog: { row: number; error: string }[] = []
  let successCount = 0
  let failCount = 0

  // Phase 1: Create listings
  for (let i = 0; i < rowsToProcess.length; i++) {
    const row = rowsToProcess[i]

    // Skip rows with parse errors
    if (row.errors.length > 0) {
      failCount++
      errorLog.push({ row: row.rowIndex, error: row.errors.join('; ') })
      await admin
        .from('listing_imports')
        .update({
          processed_rows: i + 1,
          failed_rows: failCount,
          error_log: errorLog as unknown as Json,
        })
        .eq('id', importId)
      continue
    }

    try {
      const listingData = mapRowToListing(row.data, companyId, user.id)
      const { data: listing, error } = await admin
        .from('listings')
        .insert(listingData)
        .select('id')
        .single()

      if (error || !listing) {
        failCount++
        errorLog.push({ row: row.rowIndex, error: error?.message || 'Unknown insert error' })
      } else {
        successCount++
        createdListingIds.push(listing.id)
      }
    } catch (error) {
      failCount++
      errorLog.push({ row: row.rowIndex, error: error instanceof Error ? error.message : String(error) })
    }

    // Update progress every row
    await admin
      .from('listing_imports')
      .update({
        processed_rows: i + 1,
        successful_rows: successCount,
        failed_rows: failCount,
        error_log: errorLog as unknown as Json,
        created_listing_ids: createdListingIds,
      })
      .eq('id', importId)
  }

  // Phase 2: Fetch images for rows that have image_url
  const rowsWithImages = rowsToProcess
    .filter((r) => r.data.image_url && r.errors.length === 0)
    .map((r, idx) => ({ row: r, listingIdx: idx }))

  // Build a mapping from row to listing ID
  const successfulRowIndices: number[] = []
  let listingIdxCounter = 0
  for (const row of rowsToProcess) {
    if (row.errors.length === 0) {
      successfulRowIndices.push(listingIdxCounter)
      listingIdxCounter++
    } else {
      successfulRowIndices.push(-1)
    }
  }

  if (rowsWithImages.length > 0) {
    await admin
      .from('listing_imports')
      .update({
        status: 'fetching_images',
        image_fetch_attempted: rowsWithImages.length,
        processed_rows: 0,
      })
      .eq('id', importId)

    let imageFetchSucceeded = 0
    let imageFetchFailed = 0

    for (let i = 0; i < rowsWithImages.length; i++) {
      const { row } = rowsWithImages[i]
      // Find the listing ID for this row
      const rowPosition = rowsToProcess.indexOf(row)
      const listingIdIdx = successfulRowIndices[rowPosition]
      const listingId = listingIdIdx >= 0 ? createdListingIds[listingIdIdx] : null

      if (listingId && row.data.image_url) {
        const result = await fetchAndUploadImage(row.data.image_url, listingId)

        if (result.success && result.r2Url) {
          // Insert listing image record
          await admin.from('listing_images').insert({
            listing_id: listingId,
            url: result.r2Url,
            storage_path: result.r2Url,
            position: 0,
          })
          imageFetchSucceeded++
        } else {
          imageFetchFailed++
          errorLog.push({
            row: row.rowIndex,
            error: `Image fetch failed — ${result.error} (${row.data.image_url})`,
          })
        }
      } else {
        imageFetchFailed++
      }

      await admin
        .from('listing_imports')
        .update({
          processed_rows: i + 1,
          image_fetch_succeeded: imageFetchSucceeded,
          image_fetch_failed: imageFetchFailed,
          error_log: errorLog as unknown as Json,
        })
        .eq('id', importId)
    }
  }

  // Mark complete
  await admin
    .from('listing_imports')
    .update({
      status: 'complete',
      success_count: successCount,
      error_count: failCount,
    })
    .eq('id', importId)

  return { importId, tierLimitWarning }
}

// ─── Get Import Progress ────────────────────────────────────────────

export async function getImportProgress(importId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return null

  const admin = createAdminClient()
  const { data } = await admin
    .from('listing_imports')
    .select('id, status, total_rows, processed_rows, successful_rows, failed_rows, image_fetch_attempted, image_fetch_succeeded, image_fetch_failed, error_log, created_listing_ids')
    .eq('id', importId)
    .eq('user_id', user.id)
    .single()

  return data
}

// ─── Get Import History ─────────────────────────────────────────────

export async function getImportHistory() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return { imports: [] }

  const admin = createAdminClient()
  const { data } = await admin
    .from('listing_imports')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  return { imports: data || [] }
}
