// Schema check performed 2026-03-31:
// listing_images.is_primary: NOT EXISTS
// Primary image strategy: sort_order=0 (position column) + listings.primary_image_url

'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { EQUIPMENT_CATEGORIES, INDUSTRIES, LISTING_CONDITIONS, TIER_LIMITS } from '@/lib/constants'
import { parseCSV, parseXLSX, parseGoogleSheet, getMappedHeaders } from '@/lib/import/parse-file'
import { fetchAndUploadImage } from '@/lib/import/fetch-image'
import { getActiveCompanyId } from '@/app/actions/company-context'
import { createNotification } from '@/app/actions/notifications'
import { getCompletionMessage, getFailureMessage } from '@/lib/import/humor'
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
  detectedImageColumnCount: number
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
            detectedImageColumnCount: 0,
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
        detectedImageColumnCount: 0,
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
      detectedImageColumnCount: 0,
      errors: [error instanceof Error ? error.message : 'Failed to parse file'],
    }
  }

  const { mapped, unmapped } = getMappedHeaders(result.headers)
  const imageUrlCount = result.rows.filter((r) => r.image_urls.length > 0).length

  return {
    rows: result.rows,
    headers: result.headers,
    mappedHeaders: mapped,
    unmappedHeaders: unmapped,
    totalRows: result.totalRows,
    imageUrlCount,
    detectedImageColumnCount: result.detectedImageColumnCount,
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

// ─── Verify Import Counter Function ─────────────────────────────────

/**
 * Verifies that the increment_import_counter Postgres function exists and is
 * configured with SECURITY INVOKER (not DEFINER).
 *
 * Reads from pg_proc (a Postgres system catalog) — zero writes to any
 * application table. This is intentionally read-only; it never creates or
 * modifies the function. DDL lives exclusively in scripts/migrate-import-counter.ts.
 */
async function verifyImportCounter(
  supabaseAdmin: ReturnType<typeof createAdminClient>
): Promise<void> {
  // Use a no-op RPC call (amount=0) to verify the function exists.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabaseAdmin.rpc as any)('increment_import_counter', {
    import_id: '00000000-0000-0000-0000-000000000000',
    column_name: 'image_fetch_attempted',
    amount: 0,
  })

  // If the function doesn't exist, the RPC call will error
  if (error) {
    if (error.message.includes('Could not find the function') ||
        (error.message.includes('function') && error.message.includes('does not exist'))) {
      throw new Error(
        'increment_import_counter function is missing from the database. ' +
        'Run: SUPABASE_ACCESS_TOKEN=your_token npx tsx scripts/migrate-import-counter.ts'
      )
    }
    // Other errors (e.g. no matching import_id) are fine — the function exists
  }
}

/**
 * Helper to call increment_import_counter RPC.
 * The function isn't in generated Supabase types so we cast to any.
 */
 
async function incrementImportCounter(
  supabaseAdmin: ReturnType<typeof createAdminClient>,
  importId: string,
  columnName: 'image_fetch_attempted' | 'image_fetch_succeeded' | 'image_fetch_failed',
  amount: number
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (supabaseAdmin.rpc as any)('increment_import_counter', {
    import_id: importId,
    column_name: columnName,
    amount,
  })
}

// ─── Start Import Job ───────────────────────────────────────────────

export type DuplicateMode = 'create_new' | 'skip' | 'update'

export type DedupResult = {
  duplicateCount: number
  newCount: number
  duplicateSkus: string[]
}

export type ImportJobResult = {
  importId: string
  error?: string
  tierLimitWarning?: string
  updatedCount?: number
  skippedCount?: number
}

// ─── Check for Duplicates ───────────────────────────────────────────

/**
 * Checks imported rows against existing listings in the same company.
 * Matches by SKU (exact) or by title+manufacturer+model (fuzzy).
 * Returns counts and matched SKUs for the UI to display.
 */
export async function checkImportDuplicates(
  rows: ParsedRow[]
): Promise<DedupResult & { error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { duplicateCount: 0, newCount: rows.length, duplicateSkus: [], error: 'Not authenticated' }

  const admin = createAdminClient()
  const companyId = await getActiveCompanyId(user.id)
  if (!companyId) return { duplicateCount: 0, newCount: rows.length, duplicateSkus: [] }

  // Fetch existing listings for this company (active/draft only)
  const { data: existing } = await admin
    .from('listings')
    .select('id, title, sku, specifications')
    .eq('company_id', companyId)
    .in('status', ['active', 'draft'])

  if (!existing || existing.length === 0) {
    return { duplicateCount: 0, newCount: rows.length, duplicateSkus: [] }
  }

  // Build lookup indexes
  const skuMap = new Map<string, string>() // sku → listing id
  const titleKeyMap = new Map<string, string>() // "title|mfr|model" → listing id
  for (const l of existing) {
    if (l.sku) skuMap.set(l.sku.toLowerCase().trim(), l.id)
    const specs = l.specifications as Record<string, unknown> | null
    const key = buildTitleKey(l.title, specs?.manufacturer as string, specs?.model as string)
    if (key) titleKeyMap.set(key, l.id)
  }

  let duplicateCount = 0
  const duplicateSkus: string[] = []

  for (const row of rows) {
    if (row.errors.length > 0) continue
    const match = findDuplicate(row.data, skuMap, titleKeyMap)
    if (match) {
      duplicateCount++
      if (row.data.sku) duplicateSkus.push(row.data.sku)
    }
  }

  return {
    duplicateCount,
    newCount: rows.filter(r => r.errors.length === 0).length - duplicateCount,
    duplicateSkus: duplicateSkus.slice(0, 10), // Show up to 10 for preview
  }
}

function buildTitleKey(title: string, manufacturer?: string, model?: string): string | null {
  const t = title?.toLowerCase().trim()
  if (!t) return null
  const m = manufacturer?.toLowerCase().trim() || ''
  const mo = model?.toLowerCase().trim() || ''
  return `${t}|${m}|${mo}`
}

function findDuplicate(
  data: Record<string, string>,
  skuMap: Map<string, string>,
  titleKeyMap: Map<string, string>
): string | null {
  // SKU match takes priority
  if (data.sku) {
    const match = skuMap.get(data.sku.toLowerCase().trim())
    if (match) return match
  }
  // Fallback: title + manufacturer + model
  const key = buildTitleKey(data.title, data.manufacturer, data.model)
  if (key) {
    const match = titleKeyMap.get(key)
    if (match) return match
  }
  return null
}

export async function startImportJob(
  rows: ParsedRow[],
  fileName: string | null,
  fileFormat: string,
  duplicateMode: DuplicateMode = 'create_new'
): Promise<ImportJobResult> {
  const supabase = await createClient()
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) return { importId: '', error: 'Not authenticated' }

  const admin = createAdminClient()

  // ── Security gate: verify counter function before Phase 2 ─────────
  try {
    await verifyImportCounter(admin)
  } catch (err) {
    // Cannot proceed without the counter function — fail the import early
    return { importId: '', error: (err as Error).message }
  }
  // ── End security gate ─────────────────────────────────────────────

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
  let skippedCount = 0
  let updatedCount = 0

  // Track which rows had images and their listing IDs for Phase 2
  const listingsWithImages: { listingId: string; imageUrls: string[] }[] = []

  // Build dedup indexes if needed
  const skuMap = new Map<string, string>()
  const titleKeyMap = new Map<string, string>()

  if (duplicateMode !== 'create_new') {
    const { data: existing } = await admin
      .from('listings')
      .select('id, title, sku, specifications')
      .eq('company_id', companyId)
      .in('status', ['active', 'draft'])

    if (existing) {
      for (const l of existing) {
        if (l.sku) skuMap.set(l.sku.toLowerCase().trim(), l.id)
        const specs = l.specifications as Record<string, unknown> | null
        const key = buildTitleKey(l.title, specs?.manufacturer as string, specs?.model as string)
        if (key) titleKeyMap.set(key, l.id)
      }
    }
  }

  // Phase 1: Create or update listings
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

      // Check for duplicate if mode is skip or update
      const existingId = duplicateMode !== 'create_new'
        ? findDuplicate(row.data, skuMap, titleKeyMap)
        : null

      if (existingId && duplicateMode === 'skip') {
        skippedCount++
        errorLog.push({ row: row.rowIndex, error: `Skipped — duplicate of existing listing (${row.data.sku || row.data.title})` })
      } else if (existingId && duplicateMode === 'update') {
        // Update existing listing fields (don't change seller_id, company_id, status)
        const { seller_id: _s, company_id: _c, status: _st, ai_assist_used: _a, ...updateFields } = listingData
        const { error } = await admin
          .from('listings')
          .update(updateFields)
          .eq('id', existingId)

        if (error) {
          failCount++
          errorLog.push({ row: row.rowIndex, error: `Update failed: ${error.message}` })
        } else {
          updatedCount++
          createdListingIds.push(existingId)

          // Track images for Phase 2 (will replace existing images)
          if (row.image_urls.length > 0) {
            listingsWithImages.push({
              listingId: existingId,
              imageUrls: row.image_urls,
            })
          }
        }
      } else {
        // Create new listing
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

          // Track images for Phase 2
          if (row.image_urls.length > 0) {
            listingsWithImages.push({
              listingId: listing.id,
              imageUrls: row.image_urls,
            })
          }
        }
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
        successful_rows: successCount + updatedCount,
        failed_rows: failCount,
        error_log: errorLog as unknown as Json,
        created_listing_ids: createdListingIds,
      })
      .eq('id', importId)
  }

  // Phase 2: Fetch images (multi-image support)
  const tierPhotoLimit: number = TIER_LIMITS[tier]?.photos ?? 5

  if (listingsWithImages.length > 0) {
    await admin
      .from('listing_imports')
      .update({
        status: 'fetching_images',
        processed_rows: 0,
      })
      .eq('id', importId)

    for (let li = 0; li < listingsWithImages.length; li++) {
      const { listingId, imageUrls } = listingsWithImages[li]
      const urlsToFetch = imageUrls.slice(0, tierPhotoLimit)

      // Increment attempted counter atomically
      await incrementImportCounter(admin, importId, 'image_fetch_attempted', urlsToFetch.length)

      const imageRecords: {
        listing_id: string
        url: string
        storage_path: string
        position: number
      }[] = []
      let fetchSuccessCount = 0

      for (let i = 0; i < urlsToFetch.length; i++) {
        try {
          const result = await fetchAndUploadImage(urlsToFetch[i], listingId)

          if (result.success && result.r2Url) {
            imageRecords.push({
              listing_id: listingId,
              url: result.r2Url,
              storage_path: result.r2Url,
              position: i,
            })
            fetchSuccessCount++
          } else {
            await incrementImportCounter(admin, importId, 'image_fetch_failed', 1)
            if (result.error) {
              errorLog.push({
                row: 0,
                error: `Image fetch failed for listing ${listingId} — ${result.error} (${urlsToFetch[i]})`,
              })
            }
          }
        } catch {
          await incrementImportCounter(admin, importId, 'image_fetch_failed', 1)
        }
      }

      if (imageRecords.length > 0) {
        await admin.from('listing_images').insert(imageRecords)

        await incrementImportCounter(admin, importId, 'image_fetch_succeeded', fetchSuccessCount)
      }

      // Update progress
      await admin
        .from('listing_imports')
        .update({
          processed_rows: li + 1,
          error_log: errorLog as unknown as Json,
        })
        .eq('id', importId)
    }
  }

  // Count how many created listings have no media (hidden from search)
  let hiddenCount: number | null = null
  if (createdListingIds.length > 0) {
    const { count } = await admin
      .from('listings')
      .select('id', { count: 'exact', head: true })
      .in('id', createdListingIds)
      .eq('has_media', false)
      .eq('status', 'active')
    hiddenCount = count ?? 0
  }

  // Mark complete
  await admin
    .from('listing_imports')
    .update({
      status: 'complete',
      success_count: successCount,
      error_count: failCount,
      hidden_listing_count: hiddenCount,
    })
    .eq('id', importId)

  // Fire completion notifications (fire-and-forget)
  // Read back image stats from DB since they were tracked via atomic counters
  const { data: finalImport } = await admin
    .from('listing_imports')
    .select('image_fetch_succeeded, image_fetch_failed')
    .eq('id', importId)
    .single()

  const imagesFailed = finalImport?.image_fetch_failed ?? 0
  const { title: notifTitle, body: notifBody } = getCompletionMessage(
    successCount,
    failCount,
    imagesFailed
  )

  createNotification(
    user.id,
    'import_complete',
    notifTitle,
    notifBody,
    { importId, successfulRows: successCount, failedRows: failCount, imagesFailed }
  ).catch(() => {}) // fire-and-forget

  return { importId, tierLimitWarning, updatedCount, skippedCount }
}

// ─── Bulk Delete Listings ───────────────────────────────────────────

export async function bulkDeleteListings(
  listingIds: string[]
): Promise<{ deletedCount: number; error?: string }> {
  if (listingIds.length === 0) return { deletedCount: 0, error: 'No listings selected' }
  if (listingIds.length > 1000) return { deletedCount: 0, error: 'Cannot delete more than 1000 listings at once' }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { deletedCount: 0, error: 'Not authenticated' }

  const admin = createAdminClient()

  // Verify ownership of all listings
  const { data: owned, error: fetchError } = await admin
    .from('listings')
    .select('id')
    .eq('seller_id', user.id)
    .in('id', listingIds)

  if (fetchError) return { deletedCount: 0, error: fetchError.message }

  const ownedIds = (owned || []).map(l => l.id)
  if (ownedIds.length === 0) return { deletedCount: 0, error: 'No authorized listings found' }

  // Soft-delete: set status to 'removed'
  const { error } = await admin
    .from('listings')
    .update({ status: 'removed' })
    .in('id', ownedIds)

  if (error) return { deletedCount: 0, error: error.message }

  return { deletedCount: ownedIds.length }
}

export async function bulkDeleteByImport(
  importId: string
): Promise<{ deletedCount: number; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { deletedCount: 0, error: 'Not authenticated' }

  const admin = createAdminClient()

  // Get the import record and verify ownership
  const { data: importRecord } = await admin
    .from('listing_imports')
    .select('created_listing_ids')
    .eq('id', importId)
    .eq('user_id', user.id)
    .single()

  if (!importRecord?.created_listing_ids) {
    return { deletedCount: 0, error: 'Import not found or no listings to delete' }
  }

  const listingIds = importRecord.created_listing_ids as string[]
  return bulkDeleteListings(listingIds)
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
