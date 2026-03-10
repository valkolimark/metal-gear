# Cycle 9: Bulk Listing Import & Excel Template System

## Overview

Replace the basic CSV import at `/listings/import` with a production-grade **Excel bulk import system** that supports:

1. **Equipment Listings** — full field coverage (every column in the `listings` table)
2. **SOS Requests** — bulk-create urgent equipment need broadcasts
3. **Downloadable Excel Template** — pre-formatted `.xlsx` with dropdown validation, reference sheets, and example rows

The existing CSV import is minimal (8 columns, no specs, no photos, no SOS). This upgrade makes it a real inventory management ingress.

---

## Scope

### In Scope
- New server action: `processExcelImport()` — parses `.xlsx`, validates, batch-inserts
- New server action: `processSosImport()` — parses SOS sheet, validates, batch-creates SOS requests
- Rewrite `/listings/import` page — drag-and-drop `.xlsx` upload, sheet selector, preview table, progress bar, error report
- Downloadable Excel template at `/api/template/bulk-upload` (generated server-side with `exceljs`)
- Template includes: data validation dropdowns, conditional formatting, reference sheets, example rows
- Tier-limit enforcement: Free users blocked; Premium/Boost gated by listing limits
- Duplicate detection: warn on identical title + category + condition combos
- Photo URL column: accepts comma-separated public image URLs; server downloads and re-uploads to `listing-images` bucket
- Specifications column: accepts `key=value|key=value` pipe-separated format → stored as JSONB

### Out of Scope
- Migrating the listings table from flat `EQUIPMENT_CATEGORIES` to the 3-tier taxonomy (that's a future cycle)
- Scheduled/recurring imports
- Direct Google Sheets / Airtable integration
- Listing image generation or AI-assisted description writing

---

## Database

### No new tables required.

Use the existing `listing_imports` table for tracking import history:
```sql
listing_imports (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES profiles(id),
  filename TEXT,
  total_rows INTEGER,
  success_count INTEGER,
  error_count INTEGER,
  errors JSONB,        -- [{row: number, field: string, error: string}]
  created_at TIMESTAMP
)
```

**Enhancement:** Add a `sheet_name TEXT` column and a `type TEXT DEFAULT 'listing'` column to distinguish listing imports from SOS imports in the same history view:
```sql
ALTER TABLE listing_imports ADD COLUMN IF NOT EXISTS sheet_name TEXT DEFAULT 'Listings';
ALTER TABLE listing_imports ADD COLUMN IF NOT EXISTS import_type TEXT DEFAULT 'listing';
```

---

## Excel Template Structure

The template is a `.xlsx` file with 4 sheets:

### Sheet 1: "Listings" (Equipment & Inventory)

| Column | Header | Required | Type | Validation | Notes |
|--------|--------|----------|------|------------|-------|
| A | title | Yes | Text (max 200) | Non-empty | Equipment name/title |
| B | description | Yes | Text | Non-empty | Full description |
| C | category | Yes | Dropdown | Must match EQUIPMENT_CATEGORIES | e.g., "CNC Machines", "Pumps" |
| D | condition | Yes | Dropdown | new, like_new, good, fair, poor, for_parts | Underscore format accepted |
| E | price | No | Number (USD) | Numeric or blank | Blank = "Contact for Price" |
| F | negotiable | No | Dropdown | YES / NO | Default: NO |
| G | quantity | No | Number (integer) | ≥ 1 | Default: 1 |
| H | sku | No | Text | — | Internal stock number |
| I | warehouse_location | No | Text | — | e.g., "Bay 3, East Yard" |
| J | industry | No | Dropdown | Must match INDUSTRIES | e.g., "Oil & Gas" |
| K | city | Yes | Text | Non-empty | e.g., "Houston" |
| L | state | Yes | Text (2 chars) | 2-letter code | e.g., "TX" |
| M | auto_renew | No | Dropdown | YES / NO | Default: NO |
| N | specifications | No | Text | pipe-separated key=value | e.g., `Weight=5000 lbs\|Power=50kW\|RPM=3600` |
| O | photo_urls | No | Text | comma-separated URLs | Public image URLs, downloaded on import |

### Sheet 2: "SOS Requests"

| Column | Header | Required | Type | Validation | Notes |
|--------|--------|----------|------|------------|-------|
| A | title | Yes | Text | Non-empty | Short description of need |
| B | description | No | Text | — | Detailed description |
| C | equipment_category | Yes | Dropdown | Must match Tier 2 group ID | e.g., "pumps_fluid_power" |
| D | equipment_subcategory | No | Text | Should match subcategory ID | e.g., "centrifugal_pumps" |
| E | brand | No | Text | — | e.g., "Flowserve" |
| F | model | No | Text | — | e.g., "Mark III" |
| G | urgency | Yes | Dropdown | critical / normal | Default: normal |
| H | max_distance_miles | Yes | Number | 100, 250, 500, or 99999 | Default: 500 |
| I | expires_hours | No | Dropdown | 24, 48, 72, 168 | Default: 72 |
| J | notes | No | Text | — | Additional context |
| K | city | No | Text | — | Falls back to profile location |
| L | state | No | Text (2 chars) | — | Falls back to profile location |

### Sheet 3: "Reference - Listing Fields"

Read-only reference sheet with:
- Column A: All valid **Equipment Categories** (21 items from `EQUIPMENT_CATEGORIES`)
- Column C: All valid **Conditions** with labels (6 items)
- Column E: All valid **Industries** (12 items from `INDUSTRIES` in constants.ts)
- Column G: All valid **US State Codes** (50 states + DC)
- Column I: **Specifications format example** with common key names

### Sheet 4: "Reference - SOS Taxonomy"

Read-only reference sheet with:
- Column A: Tier 1 ID
- Column B: Tier 1 Label
- Column C: Tier 2 ID (use this in SOS `equipment_category`)
- Column D: Tier 2 Label
- Column F: Example subcategory IDs per Tier 2 group

This sheet helps users look up valid IDs for the SOS sheet.

---

## Template Generation Endpoint

### `GET /api/template/bulk-upload`

Server-side route handler that generates the `.xlsx` on the fly using `exceljs`:

```
src/app/api/template/bulk-upload/route.ts
```

**Behavior:**
1. Create workbook with 4 sheets
2. Apply header styling (bold, colored fill, frozen row)
3. Add data validation dropdowns on columns C, D, F, J, M (Listings) and C, G, H, I (SOS)
4. Add 3 example rows per data sheet
5. Lock reference sheets (read-only protection, no password)
6. Set column widths for readability
7. Stream response with `Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
8. `Content-Disposition: attachment; filename="MetalGear_BulkUpload_Template.xlsx"`

---

## Server Actions

### `src/app/actions/bulk-import.ts`

#### `processExcelImport(formData: FormData)`

1. **Auth check** — `createClient().auth.getUser()`
2. **Tier check** — Free users get error; Premium/Boost proceed
3. **Parse `.xlsx`** — Use `exceljs` to read the uploaded file buffer
4. **Select sheet** — Find "Listings" sheet (by name or first sheet)
5. **Validate headers** — Must contain required columns (title, description, category, condition, city, state)
6. **Per-row validation:**
   - title: non-empty, max 200 chars
   - description: non-empty
   - category: must be in `EQUIPMENT_CATEGORIES`
   - condition: must be valid (normalize spaces → underscores)
   - price: numeric or blank (blank → `contact_for_price = true`)
   - quantity: integer ≥ 1 (default 1)
   - state: 2-letter uppercase
   - industry: if provided, must be in `INDUSTRIES`
   - specifications: parse `key=value|key=value` → `JSONB`
7. **Tier limit check** — count remaining listing slots, stop inserting when full
8. **Batch insert** — Insert all valid rows as `status: 'draft'`
9. **Photo processing** — For rows with `photo_urls`:
   - Download each URL server-side
   - Upload to `listing-images` bucket
   - Insert into `listing_images` table with position
10. **Log import** — Record in `listing_imports` table
11. **Return** — `{ success: number, errors: {row, field, error}[], importId: string }`

#### `processSosImport(formData: FormData)`

1. **Auth check**
2. **Tier check** — enforce `SOS_TIER_LIMITS`
3. **Parse "SOS Requests" sheet** from the `.xlsx`
4. **Per-row validation:**
   - title: non-empty
   - equipment_category: must be valid Tier 2 group ID
   - equipment_subcategory: if provided, must be valid subcategory ID within that group
   - urgency: 'critical' or 'normal'
   - max_distance_miles: enforce tier limit
5. **Active SOS count check** — stop when `activeSos` limit reached
6. **Batch create** — Call `createSosRequest()` per valid row (to trigger routing/notifications)
7. **Log import** — Record in `listing_imports` with `import_type = 'sos'`
8. **Return** — `{ success: number, errors: {row, field, error}[] }`

---

## UI Rewrite: `/listings/import`

### Layout

```
┌──────────────────────────────────────────────────────────┐
│  ← Back to Listings                                       │
│                                                           │
│  Bulk Import                                              │
│  Upload your inventory via Excel spreadsheet              │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  📥 Download Template                                │ │
│  │  MetalGear_BulkUpload_Template.xlsx                  │ │
│  │  Pre-formatted with dropdowns, examples, and         │ │
│  │  reference sheets for all valid field values.        │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │                                                     │ │
│  │        Drag & drop your .xlsx file here             │ │
│  │        or click to browse                           │ │
│  │                                                     │ │
│  │        Supports: .xlsx (max 10MB)                   │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  [ ] Import Listings (Sheet 1)                            │
│  [ ] Import SOS Requests (Sheet 2)                        │
│                                                           │
│  ┌─────────────────────────────────────────────────────┐ │
│  │  Preview: 15 rows detected                          │ │
│  │  ┌────────┬──────────┬──────────┬─────────┐         │ │
│  │  │ Title  │ Category │ Cond.    │ Price   │ ...     │ │
│  │  ├────────┼──────────┼──────────┼─────────┤         │ │
│  │  │ CNC 5x │ CNC Mac. │ good    │ $45,000 │ ...     │ │
│  │  │ Pump   │ Pumps    │ like_new │ $12,000 │ ...     │ │
│  │  └────────┴──────────┴──────────┴─────────┘         │ │
│  │                                                     │ │
│  │  Validation: 14 valid, 1 error                      │ │
│  │  ⚠ Row 8: Invalid category "Turbines"               │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                           │
│  Tier: Premium (12 of 15 listing slots remaining)         │
│                                                           │
│  [  Import 14 Listings as Drafts  ]                       │
│                                                           │
│  ──────────────────────────────────────────────────────── │
│                                                           │
│  Import History                                           │
│  ┌──────────┬──────┬─────────┬────────┬──────────────┐   │
│  │ File     │ Type │ Success │ Errors │ Date         │   │
│  ├──────────┼──────┼─────────┼────────┼──────────────┤   │
│  │ inv.xlsx │ List │ 42      │ 3      │ Mar 1, 2026  │   │
│  │ sos.xlsx │ SOS  │ 5       │ 0      │ Feb 28, 2026 │   │
│  └──────────┴──────┴─────────┴────────┴──────────────┘   │
└──────────────────────────────────────────────────────────┘
```

### Components

**Upload zone:**
- Drag-and-drop with `<input type="file" accept=".xlsx">`
- File size validation (max 10MB)
- Show filename + size after selection

**Sheet selector:**
- Checkboxes for which sheets to import (Listings / SOS Requests)
- Auto-detect which sheets have data

**Preview table:**
- Client-side `.xlsx` parsing via `exceljs` (loaded in browser)
- Show first 20 rows with column headers
- Color-code: green = valid, red = error with tooltip
- Show row count and validation summary

**Progress bar:**
- During import: "Importing row 23 of 47..."
- Animated progress bar
- Show real-time success/error count

**Error report:**
- Expandable list of per-row errors
- Row number, field name, error message
- Option to "Download Error Report" as CSV

**Tier limit display:**
- Show current tier and remaining slots
- "You have 12 of 15 listing slots remaining on Premium"
- If importing more than available slots, warn and cap

---

## Validation Rules (Complete)

### Listing Fields

| Field | Rule | Error Message |
|-------|------|---------------|
| title | Required, max 200 chars | "Title is required" / "Title exceeds 200 characters" |
| description | Required | "Description is required" |
| category | Must be in EQUIPMENT_CATEGORIES | "Invalid category '{value}'. See Reference sheet." |
| condition | Must be: new, like_new, good, fair, poor, for_parts | "Invalid condition '{value}'" |
| price | Numeric ≥ 0 or blank | "Price must be a positive number" |
| negotiable | YES or NO (case-insensitive) | "Negotiable must be YES or NO" |
| quantity | Integer ≥ 1 | "Quantity must be at least 1" |
| state | Exactly 2 uppercase letters | "State must be a 2-letter code" |
| city | Required, non-empty | "City is required" |
| industry | If provided, must be in INDUSTRIES | "Invalid industry" |
| specifications | Valid pipe-separated key=value format | "Invalid specifications format" |
| photo_urls | Each URL must be valid HTTP(S) | "Invalid photo URL" |

### SOS Fields

| Field | Rule | Error Message |
|-------|------|---------------|
| title | Required | "Title is required" |
| equipment_category | Must be valid Tier 2 group ID | "Invalid equipment category" |
| equipment_subcategory | If provided, must exist in that Tier 2 group | "Subcategory not found in group" |
| urgency | "critical" or "normal" | "Urgency must be critical or normal" |
| max_distance_miles | Positive number, ≤ tier limit | "Exceeds your tier's max reach" |
| expires_hours | 24, 48, 72, or 168 | "Invalid expiry" |
| state | If provided, 2-letter code | "Invalid state code" |

---

## Files to Create

| File | Purpose |
|------|---------|
| `src/app/api/template/bulk-upload/route.ts` | GET endpoint — generates and streams .xlsx template |
| `src/app/actions/bulk-import.ts` | Server actions: `processExcelImport()`, `processSosImport()` |
| `supabase/migrations/033_bulk_import_columns.sql` | ALTER listing_imports: add sheet_name, import_type |

## Files to Modify

| File | Changes |
|------|---------|
| `src/app/(main)/listings/import/page.tsx` | Full rewrite — drag-and-drop .xlsx upload, sheet selector, preview, progress |
| `src/app/(main)/listings/import/actions.ts` | Keep legacy CSV import as fallback, add import to new bulk-import actions |
| `package.json` | `exceljs` already installed as devDependency — move to dependencies for server-side use |

---

## Implementation Order

1. **Migration** — Add columns to `listing_imports`
2. **Template endpoint** — `GET /api/template/bulk-upload` generates the .xlsx
3. **Server actions** — `processExcelImport()` and `processSosImport()`
4. **UI rewrite** — `/listings/import` page with upload, preview, progress
5. **Build & test** — Verify template download, upload round-trip, error handling
6. **Update CHANGELOG.md** — Add a `[0.10.0]` entry under the `[Unreleased]` section with all features added, files changed, and any bug fixes. Move the `[Unreleased]` planned note down or remove it. Follow the existing format (Added/Changed/Fixed sections with bold feature names).
7. **Deploy**

---

## Key Patterns to Follow

- All DB operations via server actions with `createAdminClient()` (no client-side DB calls)
- Dark theme: `#0A0A0F` bg, `#FF6B2B` primary, `#3A8FD4` steel blue
- Tailwind CSS v4 + shadcn/ui components
- Tier-gated: Free users blocked with upgrade prompt
- Toast notifications via `sonner` for success/error feedback
- File upload via `FormData` passed to server actions
- `exceljs` for both server-side generation and client-side preview parsing
- **Always update `CHANGELOG.md`** at the end of each cycle before deploying — add a versioned entry with Added/Changed/Fixed sections following the existing format

---

## Testing Checklist

- [ ] Template downloads with correct filename and 4 sheets
- [ ] Dropdowns work in Excel/Google Sheets/Numbers
- [ ] Reference sheets are read-only
- [ ] Upload .xlsx with valid data → all rows import as drafts
- [ ] Upload .xlsx with errors → error rows skipped, valid rows imported
- [ ] Tier limits enforced (Free blocked, Premium capped at 15, Boost at 50)
- [ ] SOS import respects `SOS_TIER_LIMITS`
- [ ] Photo URLs downloaded and re-uploaded to storage
- [ ] Specifications parsed correctly as JSONB
- [ ] Import history shows listing vs SOS imports
- [ ] Duplicate title+category+condition shows warning
- [ ] File > 10MB rejected with clear error
- [ ] Non-.xlsx files rejected
- [ ] Empty sheets handled gracefully
