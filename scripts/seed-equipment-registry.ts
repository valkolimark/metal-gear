#!/usr/bin/env tsx
/**
 * Seed: Equipment Registry from data/manufacturers/*.md
 *
 *   ANTHROPIC_API_KEY=sk-ant-... \
 *   SUPABASE_ACCESS_TOKEN=sbp_... \
 *   npx tsx scripts/seed-equipment-registry.ts [options]
 *
 * Options:
 *   --file=<name.md>   Seed only this file (relative to data/manufacturers/)
 *   --dry-run          Extract only — print summary, do NOT insert
 *   --limit=N          Process at most N chunks total
 *
 * Idempotent: keyed on manufacturers.slug. Re-running picks up edits to the
 * .md files. Aliases and equipment_categories union across runs and across
 * files (a manufacturer mentioned in both pump and motor files gets both
 * categories appended).
 *
 * Two-pass insert:
 *   Pass 1 — upsert all manufacturer rows (no parent FK).
 *   Pass 2 — fill parent_manufacturer_id by name → slug → id lookup.
 *   Pass 3 — upsert all manufacturer_models rows.
 */

import fs from "node:fs"
import path from "node:path"
import Anthropic from "@anthropic-ai/sdk"
import {
  buildExtractionPrompt,
  primaryCategoryFromFilename,
} from "./seed-equipment-registry.prompt"

// ─── Config ──────────────────────────────────────────────────────────────

const MANUFACTURERS_DIR = path.resolve(
  process.cwd(),
  "data/manufacturers",
)
const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF ?? "fkcyfpdkcrhjieauhchn"
const SUPABASE_ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN
const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-20250514"
const MAX_OUTPUT_TOKENS = 16384

// ─── CLI parsing ─────────────────────────────────────────────────────────

interface CliArgs {
  fileFilter: string | null
  dryRun: boolean
  chunkLimit: number | null
}

function parseArgs(argv: string[]): CliArgs {
  const out: CliArgs = { fileFilter: null, dryRun: false, chunkLimit: null }
  for (const arg of argv) {
    if (arg === "--dry-run") out.dryRun = true
    else if (arg.startsWith("--file=")) out.fileFilter = arg.slice("--file=".length)
    else if (arg.startsWith("--limit=")) out.chunkLimit = parseInt(arg.slice("--limit=".length), 10)
  }
  return out
}

const args = parseArgs(process.argv.slice(2))

if (!ANTHROPIC_API_KEY) {
  console.error("ERROR: ANTHROPIC_API_KEY required.")
  process.exit(1)
}
if (!args.dryRun && !SUPABASE_ACCESS_TOKEN) {
  console.error("ERROR: SUPABASE_ACCESS_TOKEN required (or pass --dry-run).")
  process.exit(1)
}

// ─── Types from extraction ──────────────────────────────────────────────

interface ExtractedModel {
  name: string
  series: string | null
  equipment_type: string | null
  notes: string | null
}

interface ExtractedManufacturer {
  name: string
  country: string | null
  tier: 1 | 2 | 3
  equipment_categories: string[]
  aliases: string[]
  parent_name: string | null
  models: ExtractedModel[]
  notes: string | null
}

interface ExtractedChunk {
  manufacturers: ExtractedManufacturer[]
}

// ─── Slug helpers ────────────────────────────────────────────────────────

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\([^)]*\)/g, " ") // strip parentheticals
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9\s-]/g, " ") // ascii alnum + hyphen + space
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

function modelSlug(name: string): string {
  // Models can have things like "DPM-100" or "Series 70" — preserve digits.
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
}

// ─── Chunking ────────────────────────────────────────────────────────────

/**
 * Split a markdown file into chunks at H2 boundaries (`## `).
 * Preserves the H1 title at the top of every chunk for context.
 */
function chunkMarkdown(md: string): string[] {
  const lines = md.split("\n")
  const h1 = lines.find(l => /^#\s+/.test(l)) ?? ""

  const chunks: string[] = []
  let current: string[] = []
  let inH2 = false

  for (const line of lines) {
    if (/^##\s+/.test(line)) {
      // Flush previous chunk (skip the empty pre-first-H2 chunk).
      if (current.length > 0 && inH2) {
        chunks.push(current.join("\n"))
      }
      current = h1 ? [h1, "", line] : [line]
      inH2 = true
    } else if (inH2) {
      current.push(line)
    }
  }
  if (current.length > 0 && inH2) {
    chunks.push(current.join("\n"))
  }
  return chunks
}

// ─── Anthropic client ────────────────────────────────────────────────────

const client = new Anthropic({ apiKey: ANTHROPIC_API_KEY })

async function extractChunk(chunk: string, sourceFile: string, primaryCategory: string): Promise<ExtractedChunk> {
  const { system, messages } = buildExtractionPrompt({
    chunk,
    sourceFile,
    primaryCategory,
  })

  const res = await client.messages.create({
    model: ANTHROPIC_MODEL,
    max_tokens: MAX_OUTPUT_TOKENS,
    system,
    messages,
  })

  const textBlock = res.content.find((b): b is Anthropic.TextBlock => b.type === "text")
  if (!textBlock) {
    throw new Error(`Claude returned no text block (chunk: ${sourceFile})`)
  }

  // Be defensive: model may wrap in code fences despite the rule.
  let text = textBlock.text.trim()
  if (text.startsWith("```")) {
    text = text.replace(/^```[a-z]*\n?/i, "").replace(/```\s*$/, "")
  }

  let parsed: ExtractedChunk
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error(
      `Failed to parse JSON from Claude (chunk: ${sourceFile}). Response head: ${text.slice(0, 240)}`,
    )
  }
  if (!parsed || !Array.isArray(parsed.manufacturers)) {
    throw new Error(`Malformed JSON shape from Claude (chunk: ${sourceFile})`)
  }
  return parsed
}

// ─── In-memory accumulator ───────────────────────────────────────────────

interface MergedManufacturer {
  slug: string
  name: string
  country: string | null
  tier: 1 | 2 | 3
  equipmentCategories: Set<string>
  aliases: Set<string>
  parentName: string | null
  notes: string | null
  sourceFile: string
  models: Map<string, ExtractedModel & { sourceFile: string }>
}

const accumulator = new Map<string, MergedManufacturer>()

function mergeIntoAccumulator(extracted: ExtractedManufacturer, sourceFile: string) {
  const slug = slugify(extracted.name)
  if (!slug) return

  let row = accumulator.get(slug)
  if (!row) {
    row = {
      slug,
      name: extracted.name.trim(),
      country: extracted.country,
      // Lowest tier wins (tier 1 is most prominent).
      tier: extracted.tier,
      equipmentCategories: new Set(),
      aliases: new Set(),
      parentName: extracted.parent_name,
      notes: extracted.notes,
      sourceFile,
      models: new Map(),
    }
    accumulator.set(slug, row)
  } else {
    if (extracted.tier < row.tier) row.tier = extracted.tier
    if (!row.country && extracted.country) row.country = extracted.country
    if (!row.parentName && extracted.parent_name) row.parentName = extracted.parent_name
    if (!row.notes && extracted.notes) row.notes = extracted.notes
  }

  for (const cat of extracted.equipment_categories) {
    if (cat && cat.trim()) row.equipmentCategories.add(cat.trim().toLowerCase())
  }
  for (const alias of extracted.aliases) {
    if (alias && alias.trim()) row.aliases.add(alias.trim())
  }

  for (const model of extracted.models) {
    if (!model.name || !model.name.trim()) continue
    const mSlug = modelSlug(model.name)
    if (!mSlug) continue
    if (!row.models.has(mSlug)) {
      row.models.set(mSlug, { ...model, name: model.name.trim(), sourceFile })
    }
  }
}

// ─── Supabase Management API helpers ─────────────────────────────────────

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
    const data = (json as { data: unknown }).data
    return (Array.isArray(data) ? data : []) as T[]
  }
  return []
}

function sqlString(value: string): string {
  return "'" + value.replace(/'/g, "''") + "'"
}

function sqlNullableString(value: string | null): string {
  return value === null ? "NULL" : sqlString(value)
}

function sqlTextArray(values: string[]): string {
  if (values.length === 0) return "ARRAY[]::TEXT[]"
  return "ARRAY[" + values.map(sqlString).join(", ") + "]::TEXT[]"
}

// ─── Database upsert passes ──────────────────────────────────────────────

async function upsertManufacturers(): Promise<Map<string, string>> {
  // Build one big VALUES list for atomic upsert.
  // Returns slug → id map (used by parent + model passes).
  const rows = Array.from(accumulator.values())
  if (rows.length === 0) return new Map()

  const valueRows = rows.map(r => {
    return `(${[
      sqlString(r.slug),
      sqlString(r.name),
      sqlTextArray(Array.from(r.aliases)),
      sqlNullableString(r.country),
      String(r.tier),
      sqlTextArray(Array.from(r.equipmentCategories)),
      sqlString(r.sourceFile),
      sqlNullableString(r.notes),
    ].join(", ")})`
  })

  const sql = `
    INSERT INTO manufacturers
      (slug, name, aliases, country, tier, equipment_categories, source_file, notes)
    VALUES
      ${valueRows.join(",\n      ")}
    ON CONFLICT (slug) DO UPDATE SET
      name = EXCLUDED.name,
      aliases = EXCLUDED.aliases,
      country = COALESCE(EXCLUDED.country, manufacturers.country),
      tier = LEAST(manufacturers.tier, EXCLUDED.tier),
      equipment_categories = EXCLUDED.equipment_categories,
      source_file = EXCLUDED.source_file,
      notes = COALESCE(EXCLUDED.notes, manufacturers.notes),
      updated_at = NOW()
    RETURNING id, slug;
  `
  const result = await runSql<{ id: string; slug: string }>(sql)
  const slugToId = new Map<string, string>()
  for (const row of result) slugToId.set(row.slug, row.id)
  return slugToId
}

async function fillParentLinks(slugToId: Map<string, string>) {
  const updates: string[] = []
  for (const [slug, row] of accumulator) {
    if (!row.parentName) continue
    const parentSlug = slugify(row.parentName)
    const parentId = slugToId.get(parentSlug)
    if (!parentId) continue
    if (parentId === slugToId.get(slug)) continue // avoid self-reference
    updates.push(
      `UPDATE manufacturers SET parent_manufacturer_id = ${sqlString(parentId)}::uuid WHERE slug = ${sqlString(slug)};`,
    )
  }
  if (updates.length === 0) return 0
  // Execute as a single batch (one round-trip).
  await runSql(updates.join("\n"))
  return updates.length
}

async function upsertModels(slugToId: Map<string, string>) {
  const rows: Array<{
    manufacturerId: string
    slug: string
    name: string
    series: string | null
    equipmentType: string | null
    notes: string | null
    sourceFile: string
  }> = []

  for (const [slug, mfr] of accumulator) {
    const mfrId = slugToId.get(slug)
    if (!mfrId) continue
    for (const [mSlug, model] of mfr.models) {
      rows.push({
        manufacturerId: mfrId,
        slug: mSlug,
        name: model.name,
        series: model.series,
        equipmentType: model.equipment_type,
        notes: model.notes,
        sourceFile: model.sourceFile,
      })
    }
  }

  if (rows.length === 0) return 0

  // Upsert in batches of 500 to keep statement size reasonable.
  const BATCH = 500
  let inserted = 0
  for (let i = 0; i < rows.length; i += BATCH) {
    const batch = rows.slice(i, i + BATCH)
    const valueRows = batch.map(r => {
      return `(${[
        sqlString(r.manufacturerId) + "::uuid",
        sqlString(r.slug),
        sqlString(r.name),
        sqlNullableString(r.series),
        sqlNullableString(r.equipmentType),
        sqlNullableString(r.notes),
        sqlString(r.sourceFile),
      ].join(", ")})`
    })

    const sql = `
      INSERT INTO manufacturer_models
        (manufacturer_id, slug, name, series, equipment_type, notes, source_file)
      VALUES
        ${valueRows.join(",\n        ")}
      ON CONFLICT (manufacturer_id, slug) DO UPDATE SET
        name = EXCLUDED.name,
        series = COALESCE(EXCLUDED.series, manufacturer_models.series),
        equipment_type = COALESCE(EXCLUDED.equipment_type, manufacturer_models.equipment_type),
        notes = COALESCE(EXCLUDED.notes, manufacturer_models.notes),
        source_file = EXCLUDED.source_file,
        updated_at = NOW();
    `
    await runSql(sql)
    inserted += batch.length
  }
  return inserted
}

// ─── Main ────────────────────────────────────────────────────────────────

async function main() {
  if (!fs.existsSync(MANUFACTURERS_DIR)) {
    console.error(`ERROR: ${MANUFACTURERS_DIR} does not exist.`)
    process.exit(1)
  }

  const allFiles = fs
    .readdirSync(MANUFACTURERS_DIR)
    .filter(f => f.endsWith(".md"))
    .sort()

  const files = args.fileFilter ? allFiles.filter(f => f === args.fileFilter) : allFiles
  if (files.length === 0) {
    console.error(`ERROR: no .md files matched (filter=${args.fileFilter ?? "none"})`)
    process.exit(1)
  }

  console.log(`Seeding equipment registry from ${files.length} file(s).`)
  console.log(`Mode: ${args.dryRun ? "DRY RUN (no DB writes)" : "LIVE"}`)
  console.log(`Model: ${ANTHROPIC_MODEL}`)
  console.log()

  let chunkCount = 0
  const startedAt = Date.now()

  for (const file of files) {
    const filePath = path.join(MANUFACTURERS_DIR, file)
    const md = fs.readFileSync(filePath, "utf-8")
    const primaryCategory = primaryCategoryFromFilename(file)
    const chunks = chunkMarkdown(md)

    console.log(`📄 ${file} → category="${primaryCategory}", ${chunks.length} chunks`)

    for (let i = 0; i < chunks.length; i++) {
      if (args.chunkLimit !== null && chunkCount >= args.chunkLimit) {
        console.log(`  (chunk limit ${args.chunkLimit} reached, stopping early)`)
        break
      }
      const chunk = chunks[i]
      const heading = (chunk.match(/^##\s+(.+)/m) ?? [, "(unknown)"])[1]
      process.stdout.write(`  [${i + 1}/${chunks.length}] ${heading.slice(0, 60)} ... `)

      try {
        const result = await extractChunk(chunk, file, primaryCategory)
        for (const m of result.manufacturers) {
          mergeIntoAccumulator(m, file)
        }
        console.log(`extracted ${result.manufacturers.length} manufacturers`)
      } catch (err) {
        console.log(`FAILED`)
        console.error(`    ${err instanceof Error ? err.message : String(err)}`)
        // Persist the failing chunk for inspection but keep going.
        const debugPath = path.join(MANUFACTURERS_DIR, `.failed-chunk-${file}-${i}.md`)
        fs.writeFileSync(debugPath, chunk)
        console.error(`    chunk saved to ${debugPath}`)
      }
      chunkCount++
    }

    if (args.chunkLimit !== null && chunkCount >= args.chunkLimit) break
  }

  const totalManufacturers = accumulator.size
  let totalModels = 0
  for (const m of accumulator.values()) totalModels += m.models.size

  console.log()
  console.log(`Extraction complete: ${totalManufacturers} unique manufacturers, ${totalModels} models`)
  console.log(`Wall time: ${((Date.now() - startedAt) / 1000).toFixed(1)}s`)

  if (args.dryRun) {
    console.log()
    console.log("Dry run — sample of first 10 extracted manufacturers:")
    let i = 0
    for (const [slug, m] of accumulator) {
      if (i++ >= 10) break
      console.log(
        `  - ${m.name} (slug=${slug}, tier=${m.tier}, country=${m.country ?? "—"}, categories=[${[...m.equipmentCategories].join(",")}], aliases=${m.aliases.size}, models=${m.models.size}, parent=${m.parentName ?? "—"})`,
      )
    }
    return
  }

  console.log()
  console.log("Pass 1: upserting manufacturers ...")
  const slugToId = await upsertManufacturers()
  console.log(`  → ${slugToId.size} rows persisted`)

  console.log("Pass 2: filling parent_manufacturer_id ...")
  const linksUpdated = await fillParentLinks(slugToId)
  console.log(`  → ${linksUpdated} parent links set`)

  console.log("Pass 3: upserting models ...")
  const modelsUpserted = await upsertModels(slugToId)
  console.log(`  → ${modelsUpserted} model rows persisted`)

  console.log()
  console.log("Seed complete.")
}

main().catch(err => {
  console.error("Unexpected error:", err)
  process.exit(1)
})
