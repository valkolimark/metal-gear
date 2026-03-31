# Cycle 34 — Bulk Inventory Import Upgrade

## Prerequisite Check
Before starting, verify:
1. `CHANGELOG.md` contains `[4.3.0]` as the most recent version entry (Cycle 33 must be complete)
2. `src/app/(main)/listings/import/` directory exists (bulk import from Cycle 5)
3. `listing_imports` table exists in the DB with at least: `id`, `user_id`, `status`, `total_rows`, `processed_rows`, `created_at`
4. `src/app/actions/` contains an import-related server action file
5. `src/lib/media.ts` contains `uploadListingImage()`
6. `SheetJS` (`xlsx` npm package) — check `package.json`. If not installed, it will need to be added.

If any check fails, stop and report which file is missing before proceeding.

---

## Critical Rules
- All DB operations use `createAdminClient()` from `@/lib/supabase/admin` — never client-side Supabase
- All media uploads go through `src/lib/media.ts` — never Supabase Storage directly
- Never pass functions from Server Components to Client Components
- SOS orange `#FF6B2B` is always preserved — never override
- Image fetching from external URLs runs **server-side only** — never fetch external URLs from the browser
- Import jobs run as server actions with progress tracked in `listing_imports` table — never block the UI

---

## Objective

Upgrade the existing bulk import at `/listings/import` to support:

1. **CSV** (existing — preserve and improve)
2. **XLS/XLSX** — parse via SheetJS on the server
3. **Google Sheets URL** — user pastes a public sheet URL; server fetches it as CSV via Google's export endpoint
4. **Image URL fetching** — if a row has an `image_url` column, the server fetches that URL server-side and uploads the image to R2 via `uploadListingImage()`
5. **Real-time progress bar** — two-phase progress: "Creating listings" then "Fetching images"; client polls every 2 seconds

**Behavior:** Fail-open on image fetch failures. The listing is created regardless. Failed image fetches are counted and shown in the completion summary. A failed image fetch for one row never blocks other rows.

---

## Files to Create
1. `src/app/(main)/listings/import/components/ImportUploadZone.tsx` — file/URL input, format switcher
2. `src/app/(main)/listings/import/components/ImportProgressBar.tsx` — two-phase progress display
3. `src/app/(main)/listings/import/components/ImportPreviewTable.tsx` — parsed rows preview before import
4. `src/app/(main)/listings/import/components/ImportCompleteSummary.tsx` — results: created / failed / image errors
5. `src/app/actions/import.ts` — all import server actions (replace or extend existing)
6. `src/app/api/import/progress/[importId]/route.ts` — polling endpoint for import progress
7. `src/lib/import/parse-file.ts` — file parsing logic: CSV, XLSX, Google Sheets URL
8. `src/lib/import/fetch-image.ts` — server-side image URL fetching and R2 upload

## Files to Modify
1. `src/app/(main)/listings/import/page.tsx` — full rework of page UI
2. `listing_imports` table — add columns if missing (see DB Changes)

---

## DB Changes

Audit `listing_imports` table. Add any missing columns:

```sql
ALTER TABLE listing_imports 
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES company_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS file_name text,
  ADD COLUMN IF NOT EXISTS file_format text CHECK (file_format IN ('csv', 'xlsx', 'google_sheets')),
  ADD COLUMN IF NOT EXISTS total_rows integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS processed_rows integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS successful_rows integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_rows integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_fetch_attempted integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_fetch_succeeded integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_fetch_failed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending' 
    CHECK (status IN ('pending', 'parsing', 'importing', 'fetching_images', 'complete', 'failed')),
  ADD COLUMN IF NOT EXISTS error_log jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS created_listing_ids uuid[] DEFAULT '{}';

CREATE INDEX IF NOT EXISTS idx_listing_imports_company ON listing_imports(company_id);
CREATE INDEX IF NOT EXISTS idx_listing_imports_status ON listing_imports(status);
```

Regenerate Supabase types:
```bash
npx supabase gen types typescript --project-id fkcyfpdkcrhjieauhchn > src/types/database.ts
```

---

## Implementation

### Install SheetJS (if not in package.json)
```bash
npm install xlsx
```

---

### 1. File Parser — `src/lib/import/parse-file.ts`

```typescript
import * as XLSX from 'xlsx'

export type ParsedRow = {
  rowIndex: number
  data: Record<string, string>  // all values as strings; coercion happens at import time
  errors: string[]              // per-row parse errors
}

export type ParseResult = {
  rows: ParsedRow[]
  headers: string[]
  totalRows: number
  errors: string[]              // file-level errors
}

// CSV string → ParsedRow[]
export function parseCSV(csvText: string): ParseResult { ... }

// XLSX ArrayBuffer → ParsedRow[] (reads first sheet)
export function parseXLSX(buffer: ArrayBuffer): ParseResult { ... }

// Google Sheets URL → fetch CSV export → ParsedRow[]
// Accepts formats:
//   https://docs.google.com/spreadsheets/d/{ID}/edit#gid=0
//   https://docs.google.com/spreadsheets/d/{ID}/pub
// Converts to: https://docs.google.com/spreadsheets/d/{ID}/export?format=csv&gid={GID}
export async function parseGoogleSheet(url: string): Promise<ParseResult> {
  // Extract spreadsheet ID and optional gid from URL
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/)
  if (!idMatch) throw new Error('Invalid Google Sheets URL')
  
  const spreadsheetId = idMatch[1]
  const gidMatch = url.match(/gid=(\d+)/)
  const gid = gidMatch?.[1] ?? '0'
  
  const exportUrl = `https://docs.google.com/spreadsheets/d/${spreadsheetId}/export?format=csv&gid=${gid}`
  
  const response = await fetch(exportUrl, {
    headers: { 'User-Agent': 'MetalGear-Import/1.0' }
  })
  
  if (!response.ok) {
    if (response.status === 403 || response.status === 401) {
      throw new Error('This Google Sheet is not publicly accessible. Set sharing to "Anyone with the link can view."')
    }
    throw new Error(`Failed to fetch Google Sheet: ${response.status}`)
  }
  
  const csvText = await response.text()
  return parseCSV(csvText)
}
```

**Column mapping:** The parser should be flexible about column names. Map common variations:
```typescript
const COLUMN_ALIASES: Record<string, string> = {
  // title
  'title': 'title', 'name': 'title', 'equipment name': 'title', 'item': 'title',
  // price
  'price': 'price', 'asking price': 'price', 'list price': 'price', 'cost': 'price',
  // description
  'description': 'description', 'desc': 'description', 'details': 'description', 'notes': 'description',
  // condition
  'condition': 'condition', 'grade': 'condition', 'quality': 'condition',
  // manufacturer
  'manufacturer': 'manufacturer', 'make': 'manufacturer', 'brand': 'manufacturer', 'mfr': 'manufacturer',
  // model
  'model': 'model', 'model number': 'model', 'model no': 'model', 'part number': 'model',
  // year
  'year': 'year', 'year manufactured': 'year', 'manufacture year': 'year',
  // location
  'city': 'city', 'state': 'state', 'location': 'location',
  // image
  'image_url': 'image_url', 'image url': 'image_url', 'photo url': 'image_url', 
  'image': 'image_url', 'photo': 'image_url', 'picture': 'image_url',
  // quantity
  'quantity': 'quantity', 'qty': 'quantity', 'count': 'quantity',
  // sku
  'sku': 'sku', 'part': 'sku', 'stock number': 'sku',
}
```

Normalize all incoming header names to lowercase and trim before mapping.

---

### 2. Image Fetcher — `src/lib/import/fetch-image.ts`

```typescript
import { uploadListingImage } from '@/lib/media'

export type ImageFetchResult = {
  success: boolean
  r2Url?: string
  error?: string
}

export async function fetchAndUploadImage(
  imageUrl: string,
  listingId: string,
  sortOrder: number = 0,
  timeoutMs: number = 15000
): Promise<ImageFetchResult> {
  try {
    // Validate URL is http/https (never allow file://, data:, etc.)
    const url = new URL(imageUrl)
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { success: false, error: 'Invalid URL protocol' }
    }

    // Fetch with timeout
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), timeoutMs)
    
    const response = await fetch(imageUrl, {
      signal: controller.signal,
      headers: { 'User-Agent': 'MetalGear-Import/1.0' }
    })
    clearTimeout(timeout)
    
    if (!response.ok) {
      return { success: false, error: `HTTP ${response.status}` }
    }

    // Validate content type
    const contentType = response.headers.get('content-type') ?? ''
    if (!contentType.startsWith('image/')) {
      return { success: false, error: `Not an image (content-type: ${contentType})` }
    }

    // Validate size (max 10MB)
    const contentLength = parseInt(response.headers.get('content-length') ?? '0')
    if (contentLength > 10 * 1024 * 1024) {
      return { success: false, error: 'Image exceeds 10MB limit' }
    }

    // Convert to File object for uploadListingImage
    const blob = await response.blob()
    if (blob.size > 10 * 1024 * 1024) {
      return { success: false, error: 'Image exceeds 10MB limit' }
    }
    
    const extension = contentType.split('/')[1]?.split(';')[0] ?? 'jpg'
    const file = new File([blob], `imported-${sortOrder}.${extension}`, { type: contentType })
    
    // Upload to R2 via media.ts
    const r2Url = await uploadListingImage(file, listingId, sortOrder)
    return { success: true, r2Url }
    
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      return { success: false, error: 'Timeout after 15s' }
    }
    return { success: false, error: String(error) }
  }
}
```

---

### 3. Import Server Actions — `src/app/actions/import.ts`

```typescript
'use server'

export type ImportJobResult = {
  importId: string
  error?: string
}

// Phase 1: Parse file server-side, return preview rows (no DB writes yet)
export async function parseImportFile(
  formData: FormData
): Promise<{ rows: ParsedRow[]; headers: string[]; error?: string }> {
  // Handles: file upload (CSV, XLSX) or Google Sheets URL
  // Returns first 5 rows as preview + all rows count
  // Does NOT write to DB
}

// Phase 2: Start the actual import job (background, non-blocking)
// Creates listing_imports record, then processes rows sequentially
// Updates progress in DB after each row
export async function startImportJob(
  rows: ParsedRow[],
  companyId: string,
  userId: string
): Promise<ImportJobResult> {
  const supabase = createAdminClient()
  
  // Create import record
  const { data: importRecord } = await supabase
    .from('listing_imports')
    .insert({
      user_id: userId,
      company_id: companyId,
      status: 'importing',
      total_rows: rows.length,
      processed_rows: 0,
    })
    .select('id')
    .single()

  const importId = importRecord.id

  // Process rows — this is the critical path
  // Row processing must happen here (server action), not in a separate API route
  // Use a for...of loop (not Promise.all) to avoid rate-limiting R2/Supabase
  
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    
    try {
      // Map row data to listing fields
      const listingData = mapRowToListing(row.data, companyId, userId)
      
      // Insert listing (without images first)
      const { data: listing } = await supabase
        .from('listings')
        .insert(listingData)
        .select('id')
        .single()
      
      // Update progress after each listing created
      await supabase
        .from('listing_imports')
        .update({
          processed_rows: i + 1,
          successful_rows: supabase.rpc('increment', { x: 1 }),  // or raw increment
        })
        .eq('id', importId)
        
      // Store listing ID for image phase
      await supabase
        .from('listing_imports')
        .update({
          created_listing_ids: supabase.rpc('array_append_listing_id', { id: listing.id })
        })
        .eq('id', importId)
        
    } catch (error) {
      // Log failure, continue to next row
      await supabase
        .from('listing_imports')
        .update({
          failed_rows: supabase.rpc('increment', { x: 1 }),
          error_log: supabase.rpc('append_error', { 
            row: i, 
            error: String(error) 
          })
        })
        .eq('id', importId)
    }
  }

  // Phase 2: Fetch images for rows that have image_url
  // Update status to fetching_images
  await supabase
    .from('listing_imports')
    .update({ status: 'fetching_images', processed_rows: 0 })
    .eq('id', importId)
    
  const rowsWithImages = rows.filter(r => r.data.image_url)
  
  for (let i = 0; i < rowsWithImages.length; i++) {
    const row = rowsWithImages[i]
    const listingId = /* match listing created from this row */ 
    
    if (listingId && row.data.image_url) {
      const result = await fetchAndUploadImage(row.data.image_url, listingId, 0)
      
      if (result.success && result.r2Url) {
        // Insert listing image record
        await supabase.from('listing_images').insert({
          listing_id: listingId,
          image_url: result.r2Url,
          sort_order: 0
        })
        await updateImportProgress(importId, 'image_fetch_succeeded', i + 1)
      } else {
        await updateImportProgress(importId, 'image_fetch_failed', i + 1)
      }
    }
  }

  // Mark complete
  await supabase
    .from('listing_imports')
    .update({ status: 'complete' })
    .eq('id', importId)

  return { importId }
}
```

**Important implementation note:** Server actions have a default timeout on Vercel (typically 60s on Pro). Large imports (100+ rows with image fetching) may exceed this. Add `export const maxDuration = 300` to the route if using Next.js 14+ route-level timeout config. Document this clearly in the code.

For very large imports (500+ rows), the server action approach may time out. Implement a **chunked approach** as a fallback: process 50 rows per server action call, store intermediate state in `listing_imports`, and let the client trigger the next chunk via polling.

---

### 4. Progress Polling Endpoint — `src/app/api/import/progress/[importId]/route.ts`

```typescript
export async function GET(req: Request, { params }: { params: { importId: string } }) {
  const supabase = createAdminClient()
  
  const { data, error } = await supabase
    .from('listing_imports')
    .select('id, status, total_rows, processed_rows, successful_rows, failed_rows, image_fetch_attempted, image_fetch_succeeded, image_fetch_failed, error_log')
    .eq('id', params.importId)
    .single()

  if (error || !data) {
    return Response.json({ error: 'Import not found' }, { status: 404 })
  }

  return Response.json(data)
}
```

This is a public-ish endpoint — add auth check: the requesting user must own the import (check `listing_imports.user_id`).

---

### 5. UI — `src/app/(main)/listings/import/page.tsx`

The page has a 4-stage flow managed by client state:

**Stage 1 — Upload**
Three-tab input selector:
```
[ CSV ] [ Excel ] [ Google Sheets ]
```

- **CSV tab:** drag-and-drop zone or file picker (`accept=".csv"`)
- **Excel tab:** drag-and-drop zone or file picker (`accept=".xlsx,.xls"`)
- **Google Sheets tab:** text input for URL + "Preview" button

Below the input, always show:
```
Download template → [CSV template] [Excel template]
```
Template includes all supported columns with example data.

**Stage 2 — Preview**
After file is parsed (client-side for CSV/XLSX using SheetJS on client, or server-side for Google Sheets):

Show a table of the first 5 rows with detected columns. Show:
- ✅ green: columns that mapped successfully to listing fields
- ⚠️ yellow: unrecognized columns (will be ignored)
- 📷: if `image_url` column detected, show "X image URLs detected — will be fetched automatically"

Below preview table:
- `"X rows ready to import"` count
- `"Import X Listings"` primary CTA button (orange, full-width on mobile)
- `"Back"` link

**Stage 3 — Progress**

```
[ImportProgressBar]
```

Two-phase display:

**Phase 1: Creating listings**
```
Creating listings...
[███████████░░░░░░░░░] 47 of 100
```

**Phase 2: Fetching images (only shown if image_url column was present)**
```
✅ Listings created (98 of 100)
Fetching images...
[████████░░░░░░░░░░░░] 23 of 47 images
```

Progress bar uses the existing primary blue `#1877F2`. Status text updates every 2 seconds via polling `GET /api/import/progress/[importId]`.

Do not allow navigation away during import — show a `beforeunload` warning.

**Stage 4 — Complete**

```
✅ Import Complete

98 listings created
2 rows failed (see details)
43 images imported
4 image fetches failed (see details)

[ View My Listings ]    [ Import Another File ]

▼ Error Details (collapsed)
  Row 14: Missing required field "title"
  Row 27: Image fetch failed — timeout after 15s (http://example.com/img.jpg)
```

Error details section collapsed by default, expandable. Each error shows row number + message.

---

### 6. ImportProgressBar Component

```tsx
'use client'

type ImportPhase = 'importing' | 'fetching_images' | 'complete' | 'failed'

type ImportProgressBarProps = {
  importId: string
  totalRows: number
  hasImageUrls: boolean
  onComplete: (summary: ImportSummary) => void
}

export function ImportProgressBar({ importId, totalRows, hasImageUrls, onComplete }: ImportProgressBarProps) {
  const [progress, setProgress] = useState<ImportProgress | null>(null)
  
  useEffect(() => {
    const interval = setInterval(async () => {
      const res = await fetch(`/api/import/progress/${importId}`)
      const data = await res.json()
      setProgress(data)
      
      if (data.status === 'complete' || data.status === 'failed') {
        clearInterval(interval)
        onComplete(data)
      }
    }, 2000)
    
    return () => clearInterval(interval)
  }, [importId])
  
  // Render two-phase progress based on progress.status
}
```

---

### 7. Column Mapping — `mapRowToListing()`

Required fields (row fails if missing):
- `title` — listing title

Optional fields with defaults:
- `price` → parse as float, default `null`
- `condition` → map: A/B/C/D/F or excellent/good/fair/poor/parts to condition enum; default `'fair'`
- `description` → text, default `''`
- `manufacturer` → text
- `model` → text
- `year` → integer, validate 1900–2030
- `city` / `state` → text
- `quantity` → integer, default `1`
- `sku` → text
- `status` → always set to `'active'` for imported listings (never `draft`)
- `ai_assist_used` → always `false`
- `company_id` → from session active company
- `user_id` → from session user

---

## Edge Cases & Validation

- **Empty rows:** skip rows where all values are empty/whitespace
- **Header row in data:** if the first data row looks like a header (non-numeric price, etc.), warn in preview
- **Google Sheets private:** return clear error: "This sheet is not publicly accessible. Share it with 'Anyone with the link can view.'"
- **Google Sheets not a spreadsheet URL:** return clear error: "Please paste a full Google Sheets URL"
- **XLSX with multiple sheets:** always read the first sheet; note in UI "Reading Sheet 1 of N"
- **Price with currency symbols:** strip `$`, `,` before parsing: `parseFloat(val.replace(/[$,]/g, ''))`
- **Image URL with redirect:** `fetch()` follows redirects automatically — this is fine
- **Image URL returns HTML (not image):** content-type check catches this
- **Duplicate listings:** no dedup logic — if the same row is imported twice, two listings are created. Document this.
- **Import timeout on Vercel:** add `export const maxDuration = 300` to the server action file
- **Very large files:** client-side XLSX parsing should validate file size before parsing: max 50MB. Show error if exceeded.
- **Tier limits:** before starting import, check if `totalRows + existingListingCount > tierLimit`. If so, warn: "You can import X more listings on your current plan. The remaining rows will be skipped." Process up to the limit, skip the rest.

---

## Success Criteria

- [ ] CSV files parse correctly with flexible column name mapping
- [ ] XLSX/XLS files parse correctly via SheetJS (first sheet)
- [ ] Google Sheets public URL fetches and parses as CSV
- [ ] Google Sheets private URL returns clear error message
- [ ] Preview table shows first 5 rows with column mapping status
- [ ] Image URL column detected and count shown in preview
- [ ] Import creates listings in sequence (not parallel to avoid rate limiting)
- [ ] Progress bar updates every 2 seconds via polling
- [ ] Phase 1 progress shows listing creation count
- [ ] Phase 2 progress shows image fetch count (only if image_url column present)
- [ ] Image fetch failures do not block other rows
- [ ] Complete summary shows: created / failed / images imported / image fetch failures
- [ ] Error details expandable with row numbers and error messages
- [ ] Tier limit check prevents over-import, warns user
- [ ] `beforeunload` warning prevents accidental navigation during import
- [ ] Templates downloadable for CSV and Excel formats
- [ ] All image fetching is server-side only — no client-side external URL requests

---

## Session Protocol
Before committing: run `npm run typecheck`, `npm run lint`, `npm run build`, `npm test` — all must pass.

## Commit Message
```
feat: bulk inventory import — CSV, XLSX, Google Sheets + image URL fetching (#34)

- Add CSV, XLS/XLSX, and Google Sheets URL import support
- Flexible column name mapping with common aliases
- Server-side image URL fetching → R2 upload via media.ts
- Two-phase progress bar: listing creation + image fetching
- 2-second polling via GET /api/import/progress/[importId]
- Fail-open: image fetch failure never blocks listing creation
- Tier limit check before import start
- Error log with row-level detail in completion summary
- Extend listing_imports table with image fetch counters

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

## Post-Cycle Documentation
After successful build and deploy:
1. Update `CHANGELOG.md` with `[4.4.0]` entry covering all changes above
2. Update `CLAUDE.md` — update the bulk import section to note CSV/XLSX/Google Sheets support; add `src/lib/import/` to project structure; note `maxDuration = 300` on import action
3. Update `README.md` — update Bulk Import feature description to include all three formats and image URL fetching

## Deployment
```bash
curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=team_9n9GosoaraicsoDdbAFgzr5j" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"metal-gear","project":"prj_HQBv7jMhui6LGW5vzVC5pmCMndlx","gitSource":{"type":"github","ref":"main","org":"valkolimark","repo":"metal-gear"},"target":"production"}'
```

**Next prompt:** Cycle 35 — Super Admin Account Deletion (soft delete / hard delete)
