#!/usr/bin/env tsx
/**
 * Cycle 61b — one-time idempotent backfill of registry FKs on `listings` and
 * `sos_requests`.
 *
 *   SUPABASE_ACCESS_TOKEN=sbp_... npx tsx scripts/backfill-registry-matches.ts [--dry-run] [--limit=N]
 *
 * Strategy:
 *   1. Load all manufacturers into memory (one query).
 *   2. Page through `listings WHERE manufacturer_id IS NULL` (and free-text
 *      manufacturer present in `specifications` or `specs` JSONB). For each
 *      row, score against the registry. Bucket into auto-confirm (>= 0.90),
 *      review band (0.70-0.90), or unmatched (< 0.70).
 *   3. Same loop for `sos_requests WHERE manufacturer_id IS NULL AND brand IS NOT NULL`.
 *   4. Print final distribution counts.
 *
 * Idempotency: only touches rows where `manufacturer_id IS NULL`. Re-runs
 * after seed updates can promote previously-unmatched rows.
 *
 * Writes update via the Supabase Management API (same pattern as the seed
 * script — never connects directly to the DB).
 */

import {
  scoreRowAgainstRegistry,
  extractListingManufacturer,
  type RegistryMatchTier,
} from "../src/lib/registry/backfill"
import type { Manufacturer } from "../src/lib/registry"

// ─── Config ──────────────────────────────────────────────────────────────

const SUPABASE_PROJECT_REF =
  process.env.SUPABASE_PROJECT_REF ?? "fkcyfpdkcrhjieauhchn"
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const PAGE_SIZE = 500

interface CliArgs {
  dryRun: boolean
  limit: number | null
}

function parseArgs(): CliArgs {
  const args: CliArgs = { dryRun: false, limit: null }
  for (const a of process.argv.slice(2)) {
    if (a === "--dry-run") args.dryRun = true
    else if (a.startsWith("--limit=")) args.limit = Number(a.slice("--limit=".length))
  }
  return args
}

// ─── Supabase Management API ─────────────────────────────────────────────

async function runSql<T = unknown>(sql: string): Promise<T[]> {
  const url = `https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${SUPABASE_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ query: sql }),
  })
  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Supabase API error (HTTP ${res.status}): ${body}`)
  }
  const json = (await res.json()) as unknown
  if (Array.isArray(json)) return json as T[]
  if (json && typeof json === "object" && "data" in json) {
    const d = (json as { data: unknown }).data
    return (Array.isArray(d) ? d : []) as T[]
  }
  return []
}

function sqlString(s: string): string {
  return "'" + s.replace(/'/g, "''") + "'"
}

// ─── Registry load ───────────────────────────────────────────────────────

interface ManufacturerRow {
  id: string
  slug: string
  name: string
  aliases: string[] | null
  country: string | null
  tier: number
  equipment_categories: string[] | null
  parent_manufacturer_id: string | null
  source_file: string
  notes: string | null
}

async function loadAllManufacturers(): Promise<Manufacturer[]> {
  const rows = await runSql<ManufacturerRow>(
    `SELECT id, slug, name, aliases, country, tier, equipment_categories,
            parent_manufacturer_id, source_file, notes
     FROM manufacturers
     ORDER BY name`,
  )
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    name: r.name,
    aliases: r.aliases ?? [],
    country: r.country,
    tier: (r.tier === 1 || r.tier === 2 || r.tier === 3 ? r.tier : 3) as 1 | 2 | 3,
    equipmentCategories: r.equipment_categories ?? [],
    parentManufacturerId: r.parent_manufacturer_id,
    sourceFile: r.source_file,
    notes: r.notes,
  }))
}

// ─── Listings backfill ───────────────────────────────────────────────────

interface ListingRow {
  id: string
  category: string | null
  specifications: Record<string, unknown> | null
  specs: Record<string, unknown> | null
}

async function fetchListingsPage(
  pageSize: number,
): Promise<ListingRow[]> {
  // Use registry_match_method IS NULL as the unprocessed marker. Both
  // auto-confirmed rows (manufacturer_id set) AND review/none rows (only
  // confidence/method set) are excluded from the next fetch — paging by id
  // alone (with OFFSET) would skip review-band rows whose IDs come after
  // already-processed auto rows.
  return runSql<ListingRow>(
    `SELECT id, category, specifications, specs
     FROM listings
     WHERE registry_match_method IS NULL
     ORDER BY id
     LIMIT ${pageSize}`,
  )
}

interface ListingUpdate {
  id: string
  manufacturerId: string | null
  confidence: number
  method: string
}

async function flushListingUpdates(
  updates: ListingUpdate[],
  dryRun: boolean,
): Promise<void> {
  if (dryRun || updates.length === 0) return
  // One UPDATE … FROM (VALUES …) per chunk to keep round-trips low and
  // stay under the Management API's request rate limit.
  const valueRows = updates.map((u) => {
    const mfrSql = u.manufacturerId
      ? sqlString(u.manufacturerId) + "::uuid"
      : "NULL::uuid"
    return `(${sqlString(u.id)}::uuid, ${u.confidence.toFixed(4)}::real, ${sqlString(u.method)}::text, ${mfrSql})`
  })
  const sql = `UPDATE listings AS l
SET registry_match_confidence = v.confidence,
    registry_match_method = v.method,
    manufacturer_id = COALESCE(v.mfr_id, l.manufacturer_id)
FROM (VALUES ${valueRows.join(", ")}) AS v(id, confidence, method, mfr_id)
WHERE l.id = v.id`
  await runSql(sql)
}

interface BucketCounts {
  auto: number
  review: number
  none: number
  skipped_no_text: number
}

async function backfillListings(
  manufacturers: Manufacturer[],
  args: CliArgs,
): Promise<BucketCounts> {
  const counts: BucketCounts = { auto: 0, review: 0, none: 0, skipped_no_text: 0 }
  let processedTotal = 0
  // Track no-text rows we'd re-fetch forever (they never get a method written).
  // Stash their ids so the next page query can exclude them.
  const skippedIds = new Set<string>()

  while (true) {
    const page = await fetchListingsPage(PAGE_SIZE)
    // Filter out rows we've previously skipped this run (no free-text mfr —
    // we never write a method for those, so the WHERE clause re-includes them).
    const fresh = page.filter((r) => !skippedIds.has(r.id))
    if (fresh.length === 0) break

    const pageUpdates: ListingUpdate[] = []
    for (const row of fresh) {
      if (args.limit !== null && processedTotal >= args.limit) break
      const mfrText = extractListingManufacturer(row.specifications, row.specs)
      if (!mfrText) {
        counts.skipped_no_text++
        skippedIds.add(row.id)
        processedTotal++
        continue
      }
      const score = scoreRowAgainstRegistry(
        { manufacturer: mfrText, equipmentType: row.category },
        manufacturers,
      )
      counts[score.tier as RegistryMatchTier]++
      pageUpdates.push({
        id: row.id,
        manufacturerId: score.manufacturerId,
        confidence: score.confidence,
        method: score.method,
      })
      processedTotal++
    }

    try {
      await flushListingUpdates(pageUpdates, args.dryRun)
    } catch (err) {
      console.error(`[backfill listings] page update failed:`, err)
      // Stop the loop — otherwise we'd retry forever.
      break
    }

    if (args.limit !== null && processedTotal >= args.limit) break

    process.stdout.write(
      `[listings] processed ${processedTotal} (auto=${counts.auto}, review=${counts.review}, none=${counts.none})\n`,
    )
  }

  return counts
}

// ─── SOS backfill ────────────────────────────────────────────────────────

interface SosRow {
  id: string
  brand: string | null
  equipment_category: string | null
}

async function fetchSosPage(offset: number, pageSize: number): Promise<SosRow[]> {
  return runSql<SosRow>(
    `SELECT id, brand, equipment_category
     FROM sos_requests
     WHERE manufacturer_id IS NULL
       AND brand IS NOT NULL
     ORDER BY id
     LIMIT ${pageSize} OFFSET ${offset}`,
  )
}

interface SosUpdate {
  id: string
  manufacturerId: string
}

async function flushSosUpdates(
  updates: SosUpdate[],
  dryRun: boolean,
): Promise<void> {
  if (dryRun || updates.length === 0) return
  const valueRows = updates.map(
    (u) => `(${sqlString(u.id)}::uuid, ${sqlString(u.manufacturerId)}::uuid)`,
  )
  const sql = `UPDATE sos_requests AS s
SET manufacturer_id = v.mfr_id
FROM (VALUES ${valueRows.join(", ")}) AS v(id, mfr_id)
WHERE s.id = v.id`
  await runSql(sql)
}

async function backfillSosRequests(
  manufacturers: Manufacturer[],
  args: CliArgs,
): Promise<BucketCounts> {
  const counts: BucketCounts = { auto: 0, review: 0, none: 0, skipped_no_text: 0 }
  let offset = 0
  let processed = 0

  while (true) {
    const page = await fetchSosPage(offset, PAGE_SIZE)
    if (page.length === 0) break

    const pageUpdates: SosUpdate[] = []
    for (const row of page) {
      if (args.limit !== null && processed >= args.limit) break
      if (!row.brand || row.brand.trim().length === 0) {
        counts.skipped_no_text++
        processed++
        continue
      }
      const score = scoreRowAgainstRegistry(
        { manufacturer: row.brand, equipmentType: row.equipment_category },
        manufacturers,
      )
      counts[score.tier as RegistryMatchTier]++
      if (score.tier === "auto" && score.manufacturerId) {
        pageUpdates.push({ id: row.id, manufacturerId: score.manufacturerId })
      }
      processed++
    }

    try {
      await flushSosUpdates(pageUpdates, args.dryRun)
    } catch (err) {
      console.error(`[backfill sos] page update failed:`, err)
      break
    }

    if (args.limit !== null && processed >= args.limit) break
    // SOS query is `manufacturer_id IS NULL` — auto-confirmed rows leave the
    // result set after their update, so paging by offset would skip rows.
    // Restart from offset=0; the unmatched rows that remain stay at the top.
    offset = 0
    // If everything in this page was either skipped (no text) or unmatched
    // (review/none — no FK update), break to avoid infinite loop.
    if (pageUpdates.length === 0) break
  }

  return counts
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  if (!SUPABASE_ACCESS_TOKEN) {
    console.error("SUPABASE_ACCESS_TOKEN is required")
    process.exit(1)
  }

  const args = parseArgs()
  if (args.dryRun) {
    console.log("DRY RUN — no DB writes will be performed.")
  }

  console.log("[backfill] loading manufacturers...")
  const manufacturers = await loadAllManufacturers()
  console.log(`[backfill] loaded ${manufacturers.length} manufacturers.`)

  console.log("[backfill] starting listings...")
  const listingsCounts = await backfillListings(manufacturers, args)

  console.log("[backfill] starting sos_requests...")
  const sosCounts = await backfillSosRequests(manufacturers, args)

  console.log("\n──── Backfill Summary ────")
  console.log("Listings:")
  console.log(`  auto-confirmed  (>= 0.90): ${listingsCounts.auto}`)
  console.log(`  review band  (0.70-0.90): ${listingsCounts.review}`)
  console.log(`  unmatched         (< 0.70): ${listingsCounts.none}`)
  console.log(`  skipped (no free-text mfr): ${listingsCounts.skipped_no_text}`)
  console.log("SOS Requests:")
  console.log(`  auto-confirmed  (>= 0.90): ${sosCounts.auto}`)
  console.log(`  review band  (0.70-0.90): ${sosCounts.review}`)
  console.log(`  unmatched         (< 0.70): ${sosCounts.none}`)
  console.log(`  skipped (no brand text):    ${sosCounts.skipped_no_text}`)
}

main().catch((err) => {
  console.error("[backfill] fatal:", err)
  process.exit(1)
})
