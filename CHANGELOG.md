# Changelog

All notable changes to Metal Gear are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versions map to development cycles.

---

## [4.37.0] — 2026-05-08 · Archetype soft-disable: Trader & Logistics, admin re-activation surface, drift guards (Cycle 66)

### Added
- **`src/lib/archetypes.ts`** — Single source of truth for enabled-archetype state. Server-only helpers `getEnabledArchetypes()`, `isArchetypeEnabled()`, `getDisabledArchetypes()`. Cached read of `system_config.enabled_archetypes` (5-min `unstable_cache` + Next 16 `updateTag('enabled-archetypes-config')` on every admin write for read-your-own-writes semantics). Falls back to `ARCHETYPE_DEFAULT_ENABLED` (`['operator', 'service_provider']`) when config is missing or invalid; resilient to malformed JSON and unknown archetype strings.
- **`scripts/check-archetype-references.mjs`** — CI grep gate. Fails the build if `'trader'` or `'logistics'` archetype string literals appear outside an explicit allowlist of files (helper, constants, archetype-specific server actions/UI, admin actions, archetype panel, equipment-taxonomy ROLES list, dev seed scripts). Wired into `npm run lint` via the new `check:archetypes` script.
- **`/admin/settings` → Archetypes panel** (`EnabledArchetypesPanel.tsx`). Superadmin + manage_subscriptions permission. Checkbox list of all four archetypes; prevents disabling the last enabled archetype (UI tooltip + server-side Zod `min(1)`). Toggle invalidates the helper's cache and takes effect on the next onboarding session.
- **Admin actions** `getEnabledArchetypesConfig()` and `updateEnabledArchetypesConfig({ enabled })` in `src/app/(admin)/admin/actions.ts`. Same audit-trail pattern as `updateCreditSystemConfig`. Zod-validated; rejects empty arrays and unknown archetype strings; `logAdminAction('update_enabled_archetypes', 'system', 'enabled_archetypes', { enabled })`.
- **Re-activation Runbook** in `CLAUDE.md` Onboarding section — exact steps for re-enabling a soft-disabled archetype, including audit, smoke-test authoring, and copy restoration.
- **Tests:** `src/test/archetypes-helper.test.ts` (10 cases — defaults, JSON-string parsing, invalid-value filtering, empty fallback, `isArchetypeEnabled`, `getDisabledArchetypes`); `src/test/admin-enabled-archetypes.test.ts` (7 cases — read returns current state, write persists + revalidates cache, audit-log row created, empty array rejected, unknown archetype rejected, upsert errors surface as `{ success: false, error }`).

### Changed
- **`/onboarding`** — page is now a Server Component (`page.tsx`) that fetches `getEnabledArchetypes()` and renders `OnboardingClient.tsx` with the filtered list. Step 1 only displays archetypes in the enabled set. Trader and Logistics no longer render as choices for new signups.
- **`submitOnboarding` server action** rejects archetype values not in the enabled set with `'Selected archetype is not currently available.'`. Defense-in-depth against direct POST.
- **`src/lib/constants/onboarding.ts`** — comment block above the `Archetype` union noting filtering is now config-driven via `src/lib/archetypes.ts`. Constants array unchanged (all four archetypes preserved for type completeness, exhaustive switch coverage, and re-activation).
- **`README.md`** — fixed pre-existing drift ("3 archetypes" → "4 supported, 2 enabled at launch") at line ~82 and the directory tree comment.
- **`package.json`** — `lint` script now chains `check:archetypes`; new `check:archetypes` script runs `node scripts/check-archetype-references.mjs`.

### Migration
- `system_config` row inserted: `key='enabled_archetypes'`, `value='["operator", "service_provider"]'::jsonb`. Idempotent (`ON CONFLICT (key) DO NOTHING`). Verified via Supabase Management API. Production archetype distribution at migration time: 1 operator, 3 service_provider, 2 trader, 0 logistics.
- No schema changes. No changes to `user_business_profiles`. Existing trader rows untouched and continue to function exactly as today.

### Rationale
Pivoting to a lighter launch posture: two enabled archetypes (Operator/Plant Manager, Service Provider) focus polish on the asset-owner ecosystem. Trader and Logistics are soft-disabled — code paths preserved, signup blocked at the onboarding surface, existing users grandfathered with zero behavior change. Re-activation is a single admin toggle, not a code change. The grep gate prevents future cycles from silently coupling new code to disabled archetype string literals during dormancy.

---

## [4.36.1] — 2026-04-28 · Mobile menu: Radar tile + nav row, "Create a Listing" rename (Cycle 65 patch)

### Changed
- **`MobileMenuDrawer` Quick Action tile** "Saved" replaced with **Radar** (`/radar`, Lucide `Radar` icon). Cycle 40 unified saves under Radar; the mobile menu was the last surface still pointing at the legacy `/favorites` redirect.
- **`MobileMenuDrawer` Marketplace nav group** now lists **Radar** between "Create a Listing" and "SOS Dashboard" so users have a discoverable second entry alongside the Quick Action tile.
- **`MobileMenuDrawer` "Post a Listing"** renamed to **"Create a Listing"** for consistency with the desktop header CTA and `/listings/create` tile copy.

---

## [4.36.0] — 2026-04-28 · Company multi-industry, profile/seller/admin industry audit, drop deprecated listings.industry (Cycle 65)

### Added
- **`company_profiles.industries TEXT[]`** column with GIN index `idx_company_profiles_industries_gin`. Backfilled from `company_profiles.industry` (legacy singleton, now deprecated).
- **`MultiIndustryPicker` `unlimited` prop** — when `true`, removes the cap and shows an informational `{N} selected` counter instead of the gating "Maximum N" warning. Used only by company-level surfaces (broad reach claims). Listings stay capped at 5 (specific equipment fit).
- **`scripts/migrate-companies-industries-array.ts`** — idempotent Supabase Management API migration with dry-run mode. Mirrors `scripts/migrate-listings-industries-array.ts` from Cycle 64.
- **`scripts/drop-listings-industry-column.ts`** — destructive migration with pre-flight grep gate. Fails loud if any source file still references `listing.industry` singleton; idempotent (`DROP COLUMN IF EXISTS`); verifies row count unchanged.
- **`getCompanyIndustries()` / `getPrimaryCompanyIndustry()`** in `src/types/company.ts` — read both shapes during the deprecation window.

### Changed
- **`/companies/new` + `/settings/company`** — single-select industry dropdown replaced with `<MultiIndustryPicker unlimited />`. Companies can now tag any number of industries served (e.g., a fabricator serving Oil & Gas + Petrochemical + Power Generation + Marine).
- **`/companies/[slug]` public page** — renders full chip row of industries in the hero/metadata section. No truncation.
- **OG image route (`/api/og?type=company`)** — accepts new `industries` query param (joined, max 4) for visual consistency. Layout unchanged.
- **`Listing` type and DB types** — removed `industry` column references; `listings.industries: string[]` is the only shape.
- **`listings.industry` column dropped** after pre-flight grep gate verified zero remaining references in source.
- **`SearchFilters.industry: Industry`** replaced with `SearchFilters.industries?: Industry[]`. `useListings()` now filters via `.overlaps('industries', …)`.
- **`getIndustries()` / `getPrimaryIndustry()` in `src/lib/listings/industries.ts`** — collapsed: legacy singleton fallback removed. Both helpers now read `row.industries` only.
- **`/profile`** — divergent single-select Industry control replaced with `<MultiIndustryPicker />` (default cap 5). Hydrates from `profile.industry` as a 1-element array; saves write `industries[0]` back to the legacy column for back-compat with existing seller-page readers.
- **`/sellers/[id]` + `/profile/[id]`** — industry display switched from single muted label to chip row. Reads `user_business_profiles.industries` (canonical array) first, falls back to `profile.industry` for legacy rows.
- **`/admin/listings/[id]`** — Industry → Industries column; renders the array joined.
- **CSV export (`exportListingsCSV`)** — Industry column → Industries (semicolon-separated array values).
- **`/saved-searches`** — formatted filter description prefers `filters.industries` (CSV) over the legacy `filters.industry` singleton when both exist.

### Audit results (Cycle 65)
- **`/profile` industry editing:** divergent single-select editing `profiles.industry` was redundant with the multi-industry chip picker on the same page (`EquipmentInterestsEditor`, writing `user_business_profiles.industries`). Replaced the single-select with `<MultiIndustryPicker />` per the audit directive; the singleton column is mirrored as `industries[0]` on save so legacy display surfaces still resolve. Covered by `src/test/profile-industries-audit.test.tsx`.
- **`/sellers/[id]` public seller page:** rendered `profile.industry` as a single label; updated to fetch `user_business_profiles.industries` and render a chip row, falling back to the singleton for legacy rows.
- **`/profile/[id]` legacy public profile page:** same treatment as `/sellers/[id]`.
- **Admin user detail (`/admin/users/[id]`):** confirmed industries surface absent (700-line file, zero industry references). Not added speculatively per the prompt's "fix what exists" directive — defer to a future cycle if support requests it.
- **`get_for_you_feed` RPC:** verified — references `user_business_profiles.industries` (already array-shaped); does NOT reference `company_profiles.industry`. **No change needed.**

### Migration
- `company_profiles` rows: 6 backfilled (`industries[1] = industry`). Idempotent.
- `listings.industry` column dropped after pre-flight grep verified zero references. 605 rows preserved.
- GIN index `idx_company_profiles_industries_gin` created.

### Deprecation
- `CompanyProfile.industry: string | null` is deprecated this cycle. New code must use `CompanyProfile.industries: string[]`. Drop scheduled Cycle 66.
- `profiles.industry` singleton is now write-mirrored from `industries[0]` and read with array-first fallback. Keeping it one more cycle for back-compat with any unseen consumers; column drop scheduled when the audit closes Cycle 66.

### Tests
- `src/test/companies-industries-migration.test.ts` — 9 cases for `getCompanyIndustries` / `getPrimaryCompanyIndustry`.
- `src/components/forms/MultiIndustryPicker.test.tsx` — extended with 4 cases for `unlimited` mode (no cap, counter renders, default mode unchanged).
- `src/test/profile-industries-audit.test.tsx` — 5 cases: hydration of singleton ↔ array, save round-trip back to singleton, default cap enforced.
- `src/test/listings-industries-migration.test.ts` — legacy-fallback cases removed; shim now reads only the array.

### Rationale
Cycle 64 unified the listing surface; Cycle 65 finishes the company surface and closes the listings deprecation tail. The `unlimited` mode reflects that companies make broad reach claims (multi-vertical fabricators, MRO providers serving all process industries) while individual equipment listings make narrower, more specific industry-fit claims (capped at 5 in Cycle 64). The audit triangle (profile / seller / admin) catches drift across the read/write/moderate paths that always degrade independently when not explicitly checked. The pre-flight grep gate on the destructive migration is the same safety pattern Cycle 62's enum extension used — fail loud rather than silently corrupt.

---

## [4.35.0] — 2026-04-28 · Listing taxonomy alignment, multi-industry tagging, SOS dashboard tabs (Cycle 64)

### Added
- **`MultiIndustryPicker`** — `src/components/forms/MultiIndustryPicker.tsx`. Controlled chip multi-select sourced from canonical `INDUSTRY_OPTIONS` (alias of `ONBOARDING_INDUSTRIES` in `src/lib/constants/onboarding.ts`). Supports `other:<slug>` sentinel for free-text additions, cap of 5 (configurable), full keyboard navigation (Backspace removes last chip when input is empty), and ARIA combobox semantics.
- **`SosDashboardTabs`** — `src/app/(main)/sos/components/SosDashboardTabs.tsx`. Replaces the stacked SOS dashboard layout from Cycle 55 with shadcn `Tabs`. Hash-routed (`#mine` / `#feed`), count badges in labels, conditional default-to-`feed` when the user has zero owned SOS, pulse-dot decoration on the `My SOS Requests` tab when any owned SOS has new responses since last view (uses the same `mg-sos-last-viewed-{id}` localStorage key shipped in Cycle 55).
- **`scripts/migrate-listings-industries-array.ts`** — idempotent Supabase Management API migration: adds `listings.industries TEXT[]` (NOT NULL, default `'{}'`), backfills from legacy `listings.industry`, creates `idx_listings_industries_gin`, and writes a deprecation comment on the legacy column. Supports `--dry-run`. Verifies post-run.
- **`src/lib/listings/industries.ts`** — read-side shim exposing `getIndustries()`, `getPrimaryIndustry()`, `industryDisplayLabel()`, and `normalizeOtherIndustry()`. Used by display surfaces (listing detail, search cards, listing edit hydration, related-listings scoring) so legacy singleton rows and migrated array rows render identically during the deprecation window.
- **`OTHER_INDUSTRY_PREFIX = 'other:'`** sentinel for free-text industries; humanised on render via `industryDisplayLabel()`.

### Changed
- **`/listings/new` + `/listings/[id]/edit` + `/listings/bulk-edit`** — Category dropdown replaced with the same tier-2 taxonomy picker SOS uses (`searchTaxonomy` from `@/lib/constants/equipment-taxonomy`). The legacy 22-item `EQUIPMENT_CATEGORIES` constant is no longer the listing-form category source. The AI Photo-to-Listing flow now writes the tier-2 id directly into `form.category` when available so listings align cleanly with `user_equipment_interests.tier2`, For You feed, and Snipe alerts.
- **`/listings/new` + `/listings/[id]/edit` + `/listings/bulk-edit`** — Industry single-select replaced with `MultiIndustryPicker` (max 5). Equipment can be tagged with multiple verticals (e.g., extruder serving Plastics + Food & Beverage + Pharma).
- **`listings.industry` column deprecated** in favour of `listings.industries TEXT[]`. The legacy column stays in place for one cycle as a read-only shim source — it is kept in sync (`industry = industries[0]`) on every write through the new form, edit, bulk-edit, and import paths. Drop scheduled in Cycle 65.
- **Search Industries filter** (`/search`) — switched from single-value `<Select>` + `.eq('industry', x)` to a chip multi-select pill row + `.overlaps('industries', selected)`. URL param renamed to `industries=A,B`; legacy `industry=A` URLs continue to be honoured for one cycle for back-compat with bookmarks and saved searches.
- **`/api/cron/saved-search-alerts`** — match logic updated to support both new `filters.industries` (CSV) and legacy `filters.industry` (singleton); listing-side overlap check reads `listing.industries` first, falling back to `listing.industry`.
- **`/sos` page** — stacked sections replaced with tabs via the new `SosDashboardTabs` component. The page header (SOS-orange "Send SOS" button) stays above the tabs; the filter bar is passed through to the feed tab via the `filtersBar` prop.
- **`saveListingCell`** — added `industries` to the field allowlist (validates as `string[]` with cap 5, accepts `other:<slug>` sentinels). Category validator relaxed to accept either tier-2 ids or legacy free-text labels (with a length cap) so existing rows continue to be editable while new rows steer toward tier-2 ids.
- **`bulk-edit-grid`** — new Industries column with popover `MultiIndustryPicker` (chip stack with `+N` overflow when collapsed); Category cell converted to popover taxonomy search (replaces native `<select>`); category filter dropdown converted to popover taxonomy search (replaces 22-item `<Select>`). Per-cell save state UX from Cycle 45 preserved.
- **Listing detail page** — industry badge replaced with chip row rendered via `getIndustries(listing)`; category badge passes through `getTier2Label()` so tier-2 ids show as human labels and legacy free-text rows render unchanged.
- **Search result cards** — category and industry chip rendering: up to 2 industry chips with `+N` overflow (read via the new shim).

### Migration
- One-time idempotent Supabase migration: adds `industries TEXT[]` column, backfills from non-null `industry` values, creates `idx_listings_industries_gin`. Empty/null `industry` rows initialise to `'{}'`. Legacy `industry` column **not** dropped (deferred to Cycle 65).

### Deprecation
- `Listing.industry: string | null` (and any client code still reading it directly). New code MUST go through `getIndustries()` / `getPrimaryIndustry()` from `src/lib/listings/industries.ts`. Drop in Cycle 65.

### Tests
- `src/test/listings-industries-migration.test.ts` — 21 unit tests over the read shim (`getIndustries`, `getPrimaryIndustry`, `coerceIndustryArray`) and the `other:<slug>` normalisation helpers.
- `src/components/forms/MultiIndustryPicker.test.tsx` — 10 RTL tests: empty state, dropdown visibility, chip add/remove (mouse + Backspace), cap enforcement, already-selected hiding, case-insensitive filter, Enter-to-add-first-match, "Other" → `other:<slug>` flow.
- `src/test/sos-dashboard-tabs.test.tsx` — 7 RTL tests: default-tab logic (with and without owned SOS), `#feed` deep-link on mount, hash sync on tab change, pulse-dot rendering vs. read state, label counts.

### Rationale
The hardcoded 22-item category dropdown predated both the equipment registry (Cycle 61a) and the `user_equipment_interests.tier2` system. Listings could not match cleanly to user interests, the For You feed, or Snipe alerts because the keys lived in different namespaces. Aligning the listing form to the same picker SOS already uses closes that gap — submitting "extruder" finally surfaces the registry tier-2 entry. Multi-industry follows the same shape `user_business_profiles.industries` has used since onboarding shipped, so the platform's industry vocabulary is finally consistent end-to-end. SOS dashboard tabs are a pure UX win — the second section was below the fold on mobile, and tabs surface both with one tap while preserving Cycle 55's pulse-dot signal.

---

## [4.34.0] — 2026-04-28 · User-facing AI feedback chips ("Was this right?") (Cycle 63)

### Added
- **`SuggestionFeedbackChip`** — `src/components/feedback/SuggestionFeedbackChip.tsx`. Small inline chip rendered next to AI-populated fields. Three states: 👍 Looks good · ✏️ Not quite · 🤷 Not sure. Append-only — every action writes a fresh row; latest-per-field wins on aggregation. Override detection: a post-action change to `currentValue` writes a follow-up `'overridden'` row. Hidden when `suggestedValue` is null.
- **`ai_suggestion_feedback`** table — captures non-registry field feedback (title, equipment_type, condition, year, serial, taxonomy, specs). Manufacturer/model continue to write to Cycle 61's `registry_match_feedback`. RLS enabled (`feedback insert own`); admin reads via service role.
- **`recordSuggestionFeedback()`** + **`recordRegistryFeedbackFromChip()`** — `src/app/actions/ai-feedback.ts`. Zod-validated, ownership-checked against `listing_drafts.owner_id` / `sos_requests.requester_id` / `listings.seller_id`. Fail-soft: returns `{ ok: false, error }` rather than throwing. Toast on error in the chip; never blocks the parent flow.
- **Admin feedback breakdown** — added below `AccuracySampler` on `/admin/snap-list-metrics`. Aggregates accept/reject/overridden/unsure counts per field over the last 30 days. `getFeedbackBreakdown()` UNIONs the two tables, dedups latest-per-(user, source_table, source_row_id, field), and flags fields with >40% reject share + ≥5 events as "hot" for prompt iteration.

### Surfaces wired
- **Photo-to-Listing review** (`/listings/snap/review/[draftId]`) — chips on title, manufacturer (registry), model (registry), serial number, year, condition.
- **SOS sent step** — chips on manufacturer (registry), model (registry), equipment type, taxonomy. Surfaced post-create on the success step where the new `sos_requests.id` is known. Optional copy: "How did we do on the auto-fill? Skip if you're in a hurry."

### Deviation from prompt scope
- **Manual-form photo helper not wired this cycle.** The manual listing form at `/listings/new` doesn't insert a `listings` row until the user saves, so there's no `source_row_id` to attach pre-publish feedback to (server action ownership check requires an existing row). Same constraint as the SOS Confirm step, which this cycle resolved by deferring chips to the post-create `SOSSentStep`. The manual-form helper needs either (a) a transient `listing_drafts`-equivalent for the manual flow or (b) saving the listing row before the helper runs — both out of scope here. Tracked as a follow-up; chip component, server action, RLS policy, and admin breakdown are all in place to slot it in once persistence is available.

### Architecture invariants
- Feedback is optional, append-only, never blocks save/publish.
- Server actions fail soft — UI shows a toast on error.
- Domain isolation: feedback writes happen in form components / server actions, never inside `src/lib/vision-analysis/`.
- Copy rule preserved (Cycles 59–60): chip labels are neutral ("Was this right?", "Looks good", "Not quite", "Not sure") — no "AI" / "Smart" / "Magic" in user-facing strings.

### Tests
- `src/test/suggestion-feedback-action.test.ts` — 10 tests covering Zod validation, unauthenticated rejection, ownership checks across all three source tables, DB error fail-soft, and the registry-wrapper input mapping.

### Rationale
Builds the structured signal we need to iterate on prompt quality and registry coverage. High reject rates on a free-text field signal a prompt issue; high reject rates on a manufacturer hint signal an alias gap or tier misclassification. The data is the seed for a future automated training-loop cycle. No user-visible aggregation surfacing — internal signal only, to avoid gamification.

---

## [4.33.0] — 2026-04-27 · AI cost & usage telemetry — internal observability (Cycle 62)

### Added
- **`ai_usage_events`** ledger — fires on every Anthropic and Google Vision call platform-wide. Captures `user_id`, `company_id`, `surface` (14 enum values: photo_to_listing_analysis, sos_analysis, listing_analyzer_helper, listing_freshness_cron, weekly_brief_cron, demand_insights_cron, ask_metal_gear, ai_search, dispute_mediation, churn_scoring_cron, registry_seeding, registry_disambiguation, plus `other` for surfaces not yet broken out), `vendor` (anthropic / google_vision / other), `model`, `input_tokens`, `output_tokens`, `vision_units`, `cost_cents` (NUMERIC(12,4) — token-derived estimate), `latency_ms`, `success`, `error_class`, `trace_id`. RLS enabled with no SELECT policy — admin reads go through the service-role client. Indexes on `occurred_at DESC`, `(user_id, occurred_at)`, `(surface, occurred_at)`, `(vendor, occurred_at)`.
- **`recordAiUsage()` + `withAiUsageTracking()`** — `src/lib/telemetry/ai-usage.ts`. Fire-and-forget logger; **never throws** (covered by `src/test/ai-usage-logger.test.ts` across DB-error, sync-throw, async-reject, and extractor-throw paths). Wrapping helper measures latency, captures success/failure, derives cost cents from token counts, and re-throws the wrapped function's error unchanged. Same invariant as Cycle 58's `logSnapListEvent`.
- **`src/lib/telemetry/cost-models.ts`** — pure-function cost estimators for Anthropic (Sonnet 4 / Opus 4 / Haiku 4.5, with tolerant model-string classification) and Google Vision (DOCUMENT_TEXT_DETECTION, WEB_DETECTION). Pricing table documented with vendor source URLs + as-of date (2026-04-25). Free tier is not subtracted; the dashboard footer discloses this.
- **Vision-analysis `onUsageEvent` callback** — `EquipmentAnalysisOptions` gains `onUsageEvent?: (event: VisionUsageEvent) => void`. Fires once per vendor call (Claude, OCR per photo, web detection on the first photo). The pipeline never imports from `@/lib/telemetry/*`; the orchestrator wires the callback. Same architecture pattern as Cycle 61b's registry callback. Codified by `src/test/vision-analysis-isolation.test.ts` (now asserts no `@/lib/telemetry` imports too).
- **`/admin/ai-costs`** — admin dashboard (RBAC: superadmin + analyst, matching `/admin/snap-list-metrics`). KPIs (7d, 30d, MoM, daily run-rate from trailing 12h × 2), daily cost chart stacked by vendor (Anthropic / Google Vision / Other), by-surface table (calls / total $ / mean $/call / p95 latency / success rate), top-20 users by 30d cost, anomaly callouts (any surface where 24h cost > 3× 30-day daily average AND > 5¢). Footer disclaimer that values are best-effort estimates. Cross-linked from `/admin/snap-list-metrics`.
- **`scripts/migrate-ai-usage-events.ts`** — idempotent migration runner that creates the table + indexes + RLS via Supabase Management API. `verifyTable()` post-check fails loud on missing columns or absent RLS.

### Instrumented surfaces (12 surface enums + `other` catch-all)
- **`photo_to_listing_analysis`** — snap-list pipeline (vision-analysis emits Claude + GCV events; photo coach instruments separately).
- **`sos_analysis`** — analyze-image route w/ `mode='sos'`; SOS AI route `categorize` + `rank_responses`.
- **`listing_analyzer_helper`** — analyze-image route w/ `mode='listing-helper'`.
- **`listing_freshness_cron`** — daily stale-listing AI suggestions.
- **`weekly_brief_cron`** — Monday founder brief.
- **`demand_insights_cron`** — SOS AI `predict_demand` (called via `/api/cron/demand-insights` internal fetch).
- **`ask_metal_gear`** — listing detail Ask Metal Gear stream (post-stream usage capture via `stream.finalMessage()`).
- **`ai_search`** — conversational search route (logs only on cache miss — `unstable_cache` wraps `callClaude`).
- **`dispute_mediation`** — admin dispute summary generator.
- **`other`** — ai-copy (description stream + title/quality), ai-pricing (×2), help/chat stream, reputation summary, admin churn outreach, admin market-gap recruitment outreach, smart-search-alerts cron, market-gaps cron.
- **Reserved (no events yet logged):** `churn_scoring_cron` (heuristic-only, no Anthropic call), `registry_seeding` (one-time script — instrument-on-rerun), `registry_disambiguation` (pure-function CPU; no vendor call).

### Architecture invariants
- Telemetry never throws — wraps DB writes in try/catch and silently swallows. A logger failure cannot break a user-facing AI call.
- No PII / prompt content / response content / photo URLs / OCR text in the ledger — token counts and metadata only.
- Vision-analysis stays domain-isolated. `grep -rnE "from ['\"]@?/lib/telemetry" src/lib/vision-analysis/` returns empty (codified in `vision-analysis-isolation.test.ts`).
- `surface` enum is exhaustive at the DB level via CHECK constraint. New AI surfaces require an enum extension via the Supabase Management API BEFORE shipping.

### Tests
- `src/test/ai-usage-logger.test.ts` — 10 tests, never-throws invariant across (a) DB returns error, (b) DB throws sync, (c) DB rejects async, (d) extractor throws, (e) cost derivation, (f) failed-call zero-cost, (g) wrapped-fn error rethrow.
- `src/test/cost-models.test.ts` — 18 tests covering model classification + pricing math.
- `src/test/vision-analysis-usage-events.test.ts` — 5 tests verifying analyzer emits one anthropic event, one OCR per photo, one web-detection event, with success/failure routing and a throwing callback that doesn't break analysis.
- `src/test/vision-analysis-isolation.test.ts` — gains a fourth assertion for `@/lib/telemetry`.

### Rationale
Foundational observability for any future usage-based pricing decision. Cycle 58 added pilot instrumentation only for Snap & List events — no $ amounts, no cross-surface aggregation, no per-user cost view. This cycle builds 30+ days of cross-surface cost data without changing user-facing behavior. Admin-only by design — user-facing surfacing and any tier $ caps are deferred until the data justifies a product decision. The dashboard is for trend-spotting; authoritative billing comes from vendor consoles.

---

## [4.32.1] — 2026-04-27 · Equipment Registry: nameplate disambiguation + backfill (Cycle 61b)

### Added
- **Registry-aware nameplate disambiguation in production** — `analyzeEquipmentImages()` now accepts an optional `registryLookup` callback on `EquipmentAnalysisOptions`. The vision-analysis layer remains domain-isolated (no imports from `@/lib/registry/*` or `@/app/actions/*`). All three consumers — Photo-to-Listing (`src/app/actions/snap-list.ts`), SOS camera-first (`/api/listings/analyze-image` route via `mode=sos`), and the manual-form Photo Helper (same route via `mode=listing-helper`) — pass `buildNameplateRegistryCallback()` as the lookup. The callback runs `searchManufacturers` + `disambiguateNameplateCandidates` (the "Baldor fix" from 61a). When confidence ≥ 0.90 the analyzer overrides `identification.manufacturer` with the canonical registry name; the FK pair is attached to `result.registryMatch` for the orchestrator to persist.
- **`src/lib/registry/nameplate-callback.ts`** — shared factory that joins registry + vision-analysis. The only place these layers touch each other. Pure-server module, never imported from `src/lib/vision-analysis/`. Optional dependency injection (`searchManufacturers` / `searchModels`) makes it unit-testable. Manufacturer threshold 0.90 for FK persistence; model lookup only fires above that, with a stricter 0.90 acceptance threshold on the model itself.
- **`scripts/backfill-registry-matches.ts`** — one-time idempotent backfill that walks every `listings` and `sos_requests` row with a NULL `manufacturer_id` and a free-text manufacturer present. Loads all manufacturers once into memory, scores each row via the same `disambiguateNameplateCandidates` path, and buckets into auto-confirm (≥ 0.90), review band (0.70-0.90), or unmatched (< 0.70). Writes batched via `UPDATE … FROM (VALUES …)` chunks per page so the Supabase Management API rate limit holds. `WHERE registry_match_method IS NULL` keeps re-runs cheap — already-classified rows skip.
- **`src/lib/registry/backfill.ts`** — pure-function helpers (`scoreRowAgainstRegistry`, `extractListingManufacturer`) extracted from the script for unit testing.
- **`src/test/vision-analysis-isolation.test.ts`** — codifies the domain-isolation invariant in CI via `grep`. Asserts no imports from `@/lib/registry`, `@/app/actions`, or `@/lib/snap-list` inside `src/lib/vision-analysis/`.
- **`src/test/registry-vision-callback.test.ts`** — 9 tests covering the callback factory: empty input, no hits, the centrifuge-with-Baldor case (Sharples wins), motor-only correctness (Baldor wins), model FK acceptance threshold, error survival, dedup across candidate searches.
- **`src/test/vision-analysis-registry-integration.test.ts`** — 6 tests verifying the analyzer's contract: undefined callback preserves Cycle 60 behavior, high-confidence callback overrides manufacturer, low-confidence callback attaches the summary without overriding, null result preserves Claude output, throwing callback survives + appends to `errors[]`, callback receives candidates + equipmentType + model.
- **`src/test/backfill-registry-matches.test.ts`** — 12 tests covering the row-scoring helpers: empty input, exact / alias / substring matches, equipment-type boost, tier classification thresholds, listing-manufacturer extraction (specifications JSONB preferred over specs).

### Changed
- **`src/types/ai-analysis.ts`** — `AIAnalysisResult` gains an optional `registryMatch?: RegistryMatchInfo | null` field surfaced from the analyze-image route response.
- **`src/lib/snap-list/types.ts`** — `SnapListDraftFields` gains `manufacturerId` + `manufacturerModelId` so the FK pair persists on draft state and propagates into the published listing row.
- **`src/app/actions/snap-list-draft.ts`** — `publishDraft` writes `manufacturer_id`, `manufacturer_model_id`, and `registry_match_method = 'user_confirmed'` on the new `listings` row when the draft carries a registry match.
- **`src/app/(main)/sos/create/components/SOSCameraFirstFlow.tsx` + `SOSConfirmStep.tsx`** — registry FK threads through state from analysis result into `createSosRequest`. Dropped if the user edits the brand text away from the AI suggestion (so we never tag an SOS with a manufacturer the user no longer wants).

### Backfill summary (production)
- **Listings:** 15 auto-matched (≥ 0.90), 545 in review band (0.70-0.90), 2 unmatched (< 0.70), 43 skipped (no free-text manufacturer). Spot-check on 15 auto-matched rows: 100% precision (GEA, Sharples, Centrisys, Jaygo, Westfalia Separator).
- **SOS Requests:** 8 auto-matched, 2 review-band, 6 unmatched (out of 16 total).
- Free-text values left untouched. Safe to re-run after seed updates — `WHERE registry_match_method IS NULL` on listings, `manufacturer_id IS NULL` on SOS.

### Architecture invariants (still enforced)
- `grep -rnE "from ['\"]\@?/lib/registry" src/lib/vision-analysis/` returns empty (codified by `vision-analysis-isolation.test.ts`).
- `grep -rnE "from ['\"]\@?/app/actions" src/lib/vision-analysis/` returns empty.
- `grep -rnE "from ['\"]\@?/lib/snap-list" src/lib/vision-analysis/` returns empty.
- Free-text fallback remains mandatory in both manual forms; the registry autocomplete is a helper, not a gate.

---

## [4.32.0] — 2026-04-27 · Equipment Registry: seeding + autocomplete (Cycle 61a)

### Added
- **Equipment Registry tables** — `manufacturers` (slug, name, aliases[], country, tier 1/2/3, equipment_categories[], parent_manufacturer_id, source_file), `manufacturer_models` (manufacturer FK, slug, name, series, equipment_type), `registry_match_feedback` (audit trail of accept/reject/override on registry suggestions). `pg_trgm` extension enabled with GIN indexes on names + alias arrays for sub-100ms fuzzy autocomplete.
- **Seed pipeline** — `scripts/seed-equipment-registry.ts` reads the 14 `data/manufacturers/*.md` research files (centrifuges, compressors, conveyors, crushers/mills, dryers, extruders, filter presses, gearboxes, heat exchangers, mixers, motors, pumps, tanks/pressure vessels, valves), chunks each by H2 section, sends to Claude Sonnet 4 for structured extraction, and inserts via `createAdminClient()`. Idempotent slug-keyed upsert; aliases capture sub-brand relationships (Lightnin → SPX FLOW, Prochem/Greerco/Kenics → Chemineer/NOV, Sharples → Alfa Laval, …). Two-pass insert resolves parent FKs after all manufacturers persist.
- **Migration script** — `scripts/migrate-equipment-registry.ts` runs the schema migration via the Supabase Management API. 15 idempotent statements, 6 verifications, fails loud on missing tables/columns. Adds `manufacturer_id`, `manufacturer_model_id`, `registry_match_confidence`, `registry_match_method` columns to `listings` (the latter two are wired in 61b for backfill); adds the same FK pair to `sos_requests`.
- **`src/lib/registry/`** — pure-function domain layer. `index.ts` exports stable types (`Manufacturer`, `ManufacturerModel`, `RegistryMatch`, `COMPONENT_CATEGORIES`); `match.ts` exports `normalizeManufacturerString` (strips Inc./LLC/GmbH/Co./…, parentheticals, normalizes whitespace), `scoreCandidate` (exact 1.0 / alias 0.95 / substring 0.85 / trigram-Jaccard 0–0.85), and `disambiguateNameplateCandidates` (the "Baldor fix" — equipment-category overlap boosts non-component manufacturers when multiple OCR brand candidates appear on one nameplate; demotes component-only vendors when a non-component hit is present). Pure functions, no DB, no I/O. The vision-analysis layer never imports from `@/lib/registry/*`; 61b will inject this module via a callback parameter to preserve domain isolation.
- **`src/app/actions/registry.ts`** — `searchManufacturers`, `getManufacturerById`, `searchModels`, `recordRegistryFeedback`. Zod-validated, RLS-respecting (read for `authenticated`, feedback insert owner-checked). `searchManufacturers` accepts an `equipmentType` bias to sort hits with category overlap first.
- **`src/components/registry/ManufacturerAutocomplete.tsx`** + **`ModelAutocomplete.tsx`** — controlled typeahead components. 200ms debounced search via the server actions, keyboard navigation (↑/↓/Enter/Esc), close-on-outside-click. **Free-text fallback always present as the last item** ("Use '<typed>' as-is") — the autocomplete is a helper, not a gate. Tier-1 manufacturers render in a slightly bolder weight as a subtle trust signal (no copy). `ModelAutocomplete` is disabled with a hint until a manufacturer is picked.
- **`scripts/seed-equipment-registry.prompt.ts`** — extraction prompt module exporting `EXTRACTION_SYSTEM_PROMPT`, `buildExtractionPrompt(input)`, and `primaryCategoryFromFilename(filename)`. Separated from the seed runner so the prompt structure can be unit-tested without invoking the LLM.
- **Tests** — `src/test/registry-match.test.ts` (22 tests, including the centrifuge+Baldor disambiguation, motor-only correctness, empty-input safety), `src/test/registry-actions.test.ts` (16 tests covering Zod validation, ownership enforcement on feedback writes, equipmentType boost), `src/test/seed-extraction.test.ts` (8 tests asserting prompt structure + `primaryCategoryFromFilename` filename → tag derivation).

### Changed
- **Manual listing form (`AdvancedListingForm.tsx`)** — explicit Manufacturer + Model fields added to step 1 (Details), placed above the generic Specifications section. Free-text continues to mirror to `specifications.manufacturer` and `specifications.model` for compatibility with `AITitleOptimizer` / `AIDescriptionGenerator`. New fields write `manufacturer_id` and `manufacturer_model_id` to `listings` on both draft save and publish. Picking a different manufacturer clears the model FK but preserves the typed model text.
- **SOS create form (`/sos/create` text flow)** — Brand and Model inputs replaced with `ManufacturerAutocomplete` + `ModelAutocomplete`. `createSosRequest` server action accepts new optional `manufacturer_id` and `manufacturer_model_id`; insert payload writes them only when present. The free-text `brand` and `model` columns continue to populate alongside (industrial UX rule: subsidiaries, custom builds, regional brands won't always be in the registry).
- **Listing detail (`ListingSpecs`)** — accepts a new `verifiedSpecKeys: string[]` prop. When the listing has a non-null `manufacturer_id` / `manufacturer_model_id`, the corresponding spec rows render a small green `ShieldCheck` icon with a "Verified manufacturer" tooltip. Free-text-only listings render plain text — no false-trust signal.

### Architecture invariants
- Free-text fallback is mandatory across both forms — no Zod or UI gate rejects free-text manufacturer/model.
- Registry seed is reproducible: re-running `scripts/seed-equipment-registry.ts` against updated `.md` files updates rows in place; never duplicates. Re-running on a fresh DB reproduces the seeded state.
- Vision-analysis layer stays domain-isolated. `grep -rnE "from ['\"]\@?/lib/registry" src/lib/vision-analysis/` returns empty (verified pre-commit). 61b will wire the registry into vision via a callback parameter rather than imports.

### Deferred to 61b (`4.32.1`)
- Registry-aware OCR disambiguation in `analyzeEquipmentImages()` (the Baldor-fix logic landing in production via `src/lib/snap-list/orchestrator.ts`, `src/lib/sos/vision-orchestrator.ts`, and `/api/listings/analyze-image`).
- Backfill of existing `listings` and `sos_requests` rows against the registry (`scripts/backfill-registry-matches.ts`).

### Rationale
The Equipment Registry is the foundation for canonicalized search, accurate matchmaking, registry-aware OCR (61b), and the future external manufacturers API (deferred). Seeding from the `.md` research files (rather than committing static SQL) means new manufacturer research drops into `data/manufacturers/` and re-running the seed picks it up. Splitting the cycle at autocomplete-vs-disambiguation keeps the 61a deploy small and the production-data backfill (61b) under its own change window.

---

## [4.31.0] — 2026-04-22 · Vision pipeline consolidation: SOS + listing analyzer migrated (Cycle 60)

### Changed
- **`/api/listings/analyze-image`** routed through the shared vision pipeline (`src/lib/vision-analysis/`). The route now bridges incoming base64 to a temporary R2 key (`tmp/analyze/{userId}/{uuid}.{ext}`), invokes `analyzeEquipmentImages()`, and projects the result into the legacy `AIAnalysisResult` envelope. Best-effort cleanup of the temp keys on success or failure. Both consumers (Photo-to-Listing's manual-form helper, SOS camera-first flow) keep working without code changes — same response shape, same auth gate, same input contract.
- **SOS camera-first flow** (`SOSProcessingStep.tsx`) now passes `mode: 'sos'` to the analyzer route. Manual-form helper (`AIImageCapture.tsx`) passes `mode: 'listing-helper'`. Both flows now use the same OCR + Vision pipeline that powers Photo-to-Listing.
- **`src/lib/vision-analysis/index.ts`** accepts a new `mode: 'snap-list' | 'sos' | 'listing-helper'` option. Default `'snap-list'` preserves Cycle 58 behavior. Mode injects domain-specific framing into the Claude prompt without changing the JSON schema.
- **SOS UI copy neutralized** (Cycle 59 rule extended to `src/app/(main)/sos` + `src/components/sos`): "AI is routing your SOS…" → "Routing your SOS…", "AI: Rank responses by quality" → "Rank responses by quality", "AI confidence" badge → "Confidence", "Failed to connect to AI service" → "Failed to reach the analysis service".

### Added
- **`src/lib/sos/vision-orchestrator.ts`** — pure-function SOS orchestrator. `projectAnalysisToSosFields(result)` maps vision output to SOS field suggestions (manufacturer, model, equipment_type, condition, key_specs, taxonomy, suggested title/description). `buildSosClarifyingQuestions(result)` returns 0–3 SOS-specific clarifying questions ("Replacement part or whole machine?", "Failure mode?", "How many do you need?"). No imports from `@/lib/sos/*`, `@/app/actions/*`, or domain tables — orchestrator stays domain-isolated.
- **SOS-mode prompt framing** — when `mode: 'sos'`, the Claude prompt is nudged toward "user requesting parts/service; prioritize specific identification" without changing the JSON schema.
- **Listing-helper-mode prompt framing** — when `mode: 'listing-helper'`, the prompt limits inference to fields visibly supported in the photo.
- **`AnalysisMode` type** exported from `@/lib/vision-analysis`.

### Deprecated
- **`src/lib/ai/equipment-prompts.ts`** — superseded by `src/lib/vision-analysis/prompts.ts`. Header `@deprecated` tag added; no active callers remain. Scheduled for removal in Cycle 64+.

### Tests
- `src/test/sos-vision-orchestrator.test.ts` — 6 tests covering full / partial / empty result projection plus clarifying-question generation (always 0–3, never throws on null input).
- `src/test/vision-analysis.test.ts` — 3 new test cases asserting mode-dispatched prompt framing and the snap-list default.
- `e2e/sos.spec.ts` — analyzer route auth gate + non-breaking input-contract regression.

### Architecture invariants (still enforced)
- `grep -rnE "^\s*(import|require).*(snap-list|sos|listing_drafts|sos_requests|@/app/actions)" src/lib/vision-analysis/` returns empty. The vision-analysis layer remains domain-isolated; orchestrators per domain compose its output with persistence.

### Audit findings (resolved)
- `src/app/actions/sos.ts` has no server-side image-analysis path; SOS analysis is client-driven through the analyzer route. No code change to `sos.ts` this cycle.
- No admin moderation image-analysis surface found; nothing additional to migrate.
- The analyzer route's base64 input contract was preserved via a temp-R2 bridge to keep the existing clients (`SOSProcessingStep`, `AIImageCapture`) source-compatible.

### Rationale
Cycle 58 introduced `src/lib/vision-analysis/` as a reusable layer; Cycle 60 retires the parallel Claude-only image path so all image analysis on the platform runs through one pipeline. This is the prerequisite for Cycle 61 (Equipment Registry — nameplate disambiguation hooks into the shared pipeline) and Cycle 62 (cost telemetry — instrumentation hooks into the shared pipeline). One pipeline, one accuracy story, one place to optimize.

---

## [4.30.0] — 2026-04-21 · Manual-first listing creation; Snap & List demoted to experimental (Cycle 59)

### Changed
- **Manual listing creation is now the default.** `/listings/new` renders the multi-step manual form. The Cycle 58 redirect to `/listings/snap` is reversed. Back-compat: `/listings/new?mode=advanced` still renders the manual form (same as default now).
- **Entry points restored to the manual flow.** Mobile bottom-nav `+` action, `MobileMenuDrawer` "Post a Listing", desktop/mobile header "Create Listing" button, "My Listings" header CTA, and the `/listings/create` Single Listing tile all route to `/listings/new` (the manual form), not `/listings/snap`.
- **Snap & List renamed to "Photo-to-Listing" in all user-visible copy** and labeled "experimental". URL `/listings/snap` is unchanged and still works end-to-end. Internal code identifiers (`SnapListBadge`, `snap_list_events`, `SNAP_LIST_QUOTA`, `/admin/snap-list-metrics`) are unchanged.
- **`SnapListBadge` rendered text** changes from "AI-Assisted" to "Photo-to-Listing draft". Component name and import paths unchanged. All existing listings with `ai_assisted = true` now display the new label.
- **`QuotaBanner` copy** on the Photo-to-Listing upload screen replaces "free AI listings/month" with "Photo-to-Listing drafts this month".
- **Analysis stage labels** on `/listings/snap/analyzing/[draftId]` rewritten to neutral language ("Drafting description…", "Reviewing your photos…", "Analyzing your photos…").
- **Manual-form copy pass.** `AIDescriptionGenerator`, `AIImageCapture`, `AIPriceSuggestion`, and `ConfirmFlag` user-visible strings rewritten to remove "AI" / "AI-Assisted" / "AI-Generated" labels; component file/export names unchanged.

### Added
- **`PhotoToListingHint`** — `src/components/listings/PhotoToListingHint.tsx`. Small, dismissable entry-point card rendered above the manual form. "Try Photo-to-Listing" label with an "experimental" pill and a neutral "Try it" outline CTA. Dismissal persisted via `localStorage['mg-photo-to-listing-dismissed']`. Hidden below 360px. Uses `useSyncExternalStore` for SSR-safe localStorage read.
- **`/listings/new?mode=photo`** query-string variant redirects to `/listings/snap` (used by the hint card and any future deep-links).

### Preserved
- **Snap & List / Photo-to-Listing pipeline fully intact.** `src/lib/vision-analysis/`, `src/lib/snap-list/orchestrator.ts`, `src/lib/google-vision.ts`, all Snap & List server actions, `/api/snap-list/analyze`, all pilot tables, `cleanup_expired_drafts()` cron — all unchanged. Cycle 60 SOS + `/api/listings/analyze-image` migration onto the shared vision layer is unaffected.
- **Pilot instrumentation stays live.** `snap_list_events`, `snap_list_usage`, `snap_list_accuracy_reviews`, and `/admin/snap-list-metrics` continue to function. Volume is expected to drop as Photo-to-Listing becomes opt-in. AccuracySampler remains valuable at lower volume.
- **All Cycle 58 graceful-degradation paths** (Google Vision unavailable → Claude-only, Claude unavailable → draft failed) still apply to the experimental flow.

### Tests
- `e2e/snap-list.spec.ts` — updated assertions for the reversed routing (`/listings/new` renders the form; `?mode=photo` redirects to `/listings/snap`; `?mode=advanced` renders the form for back-compat).
- `src/test/mobile-nav.test.tsx` — `+` action href updated from `/listings/snap` to `/listings/new`.

### Rationale
Cycle 58 shipped Snap & List as the default flow with pilot instrumentation designed to measure whether AI-first creation works for industrial B2B. Early product feedback from plant-manager testers indicated AI-first UX creates distrust in listing quality for high-value equipment. Reverting to manual-first while keeping the experimental flow (and its pilot instrumentation) alive lets us preserve the pipeline investment and continue gathering accuracy data at lower volume, while giving buyers the trustworthy, deterministic creation flow they expect. Cycle 60 continues as planned (SOS + image-analyzer migration onto `src/lib/vision-analysis/`).

---

## [4.29.0] — 2026-04-17 · Snap & List — Single-Photo Listing Creation Pilot (Cycle 58)

### Added
- **`/listings/snap`** — new **default** listing creation flow. Dealer uploads 1–10 photos, AI drafts the listing end-to-end (title, category, description, specs, nameplate data, condition, suggested price range from real comparables, photo coach), dealer reviews inline and publishes with one tap. The old multi-step form is preserved at `/listings/new?mode=advanced` for edge cases. `/listings/new` without `?mode=advanced` now redirects to Snap & List.
- **`/listings/snap/analyzing/[draftId]`** — streaming reveal screen with stage-by-stage progress (reading nameplate → identifying → categorizing → finding comps → writing → photo coach). Polls draft status every 400ms.
- **`/listings/snap/review/[draftId]`** — inline-editable review screen. Low-confidence fields render with an amber `ConfirmFlag` dot that clears on first edit. Clarifying questions, photo coach suggestions, and stock-photo warnings render inline — no blocking modals.
- **New vendor: Google Cloud Vision** — `DOCUMENT_TEXT_DETECTION` for nameplate OCR accuracy (~97% vs Claude-only ~80%) and `WEB_DETECTION` for stock-photo fraud detection. Credentials supplied via `GOOGLE_CLOUD_PROJECT_ID` + `GOOGLE_APPLICATION_CREDENTIALS_JSON` (base64-encoded service-account JSON). Free tier covers pilot volume (~1,000 units/feature/month).
- **`src/lib/vision-analysis/`** — NEW REUSABLE LAYER. Domain-agnostic pipeline (`analyzeEquipmentImages(photoUrls, options)`) designed to outlive Snap & List. Cycle 59 will migrate SOS, the existing `/api/listings/analyze-image` endpoint, and admin moderation to this same pipeline. Zero imports from `@/lib/snap-list/`, `listing_drafts`, or any domain table — enforced by architecture grep (`grep -rnE "^\s*(import|require).*(snap-list|listing_drafts|@/app/actions)" src/lib/vision-analysis/` must return empty).
- **`src/lib/google-vision.ts`** — low-level wrapper exporting `detectNameplateText(url)` and `detectWebMatches(url)`. Module-singleton client; lazy init from base64 credentials; never throws (returns typed empty result on failure so callers can fall back to Claude-only analysis).
- **`src/lib/snap-list/orchestrator.ts`** — pure functions gluing vision-analysis output to draft fields + pricing intelligence + photo coaching. `computePriceSuggestion` uses median + IQR range with condition multipliers (excellent ×1.15, good ×1.00, fair ×0.80, poor ×0.65). Returns `hasEnoughData=false` with clear messaging when fewer than 5 comparables.
- **Server actions** — `analyzePhotos()` (kicks off async pipeline via Next.js `after()`), `createDraft / getDraft / updateDraftField / publishDraft / discardDraft / appendDraftPhotos`, `checkSnapListQuota / incrementSnapListUsage`, `findComparables / getPriceSuggestion`, `generatePhotoCoaching`.
- **API route** `/api/snap-list/analyze` — thin POST wrapper with per-user rate limit (5 per 10 min, token bucket).
- **AI-Assisted badge** — `SnapListBadge` renders next to the title on listing detail when `listings.ai_assisted = true`. Subtle trust signal for buyers.
- **Free tier quota** — 3 AI-assisted listings/month. Pro/Business/Enterprise: unlimited. Enforced at `analyzePhotos` kickoff; exceeded attempts return HTTP 402 with an upgrade prompt.

### Pilot instrumentation (required for Cycle 59 consolidation decision)
- **`snap_list_events` table** — logs 14 event types across the funnel (`draft_created`, `analysis_started`, `analysis_stage_completed`, `analysis_completed`, `analysis_failed`, `field_viewed`, `field_edited`, `clarifying_question_answered`, `photo_coach_suggestion_acted`, `photos_added_post_analysis`, `draft_abandoned`, `draft_discarded`, `draft_published`, `listing_edited_post_publish`).
- **`logSnapListEvent()`** — fire-and-forget logger in `src/lib/snap-list/events.ts`. Wraps every DB call in try/catch and never throws — instrumentation failures cannot break user flow. Covered by `src/test/snap-list-events.test.ts` (three scenarios: DB returns error, DB throws, DB rejects).
- **Post-publish edit trigger** — Postgres trigger `snap_list_post_publish_edit_trigger` on `listings` fires `listing_edited_post_publish` events when an AI-assisted listing is edited within 24h of publish.
- **`snap_list_accuracy_reviews` table** — admin-only manual accuracy sample for nameplate OCR verification.
- **`/admin/snap-list-metrics`** — new admin dashboard, RBAC-gated to superadmin + analyst (`view_financials` permission). Shows the five pilot metrics as `MetricCard` tiles with target + red-flag thresholds and green/yellow/red status, a daily `MetricsTrendChart` (analyses / publishes / field edits), and the `AccuracySampler` — 30 random published drafts with ✓/✗ per-field review buttons and a running accuracy percent.

### Pilot metric targets
| Metric | Target | Red flag |
|---|---|---|
| Field edit rate | ≤ 20% | ≥ 40% |
| Median time to publish | ≤ 3 min | ≥ 8 min |
| Draft abandonment | ≤ 25% | ≥ 50% |
| Post-publish edit rate | ≤ 30% | ≥ 60% |
| Nameplate OCR accuracy (manual) | ≥ 95% | ≤ 85% |

### Database
- **`listing_drafts`** — full draft state (photo urls, raw OCR/Claude/web-detection JSONB, structured `fields` + `confidence_scores`, `photo_coach`, `clarifying_questions`, `stock_photo_matches`, status lifecycle `analyzing / ready / publishing / published / discarded / failed`, 7-day `expires_at` TTL). RLS: owner-only SELECT/ALL.
- **`snap_list_usage`** — monthly analysis + publish counters per user (unique on `owner_id, month_year`).
- **`snap_list_events`** — pilot event log (BIGSERIAL, 14 event_type CHECK constraint). RLS enabled, no user-facing policy — metrics accessed via admin server actions only.
- **`snap_list_accuracy_reviews`** — admin accuracy sample records (unique on `draft_id, field_name, reviewer_id`).
- **`listings`** — added `ai_assisted BOOLEAN NOT NULL DEFAULT false` and `source_draft_id UUID REFERENCES listing_drafts(id)` with partial index `idx_listings_ai_assisted WHERE ai_assisted = true`.
- **`cleanup_expired_drafts()`** — SECURITY INVOKER Postgres function wired into `/api/cron/cleanup`. Deletes drafts past `expires_at` in statuses `analyzing / ready / failed / discarded`; returns count for the cron summary payload.
- **`log_post_publish_edit()`** + trigger — inserts `listing_edited_post_publish` events when an AI-assisted listing is updated within 24h of creation.

### Constants & env
- **`SNAP_LIST_QUOTA`** in `src/lib/constants.ts` — `free: 3, pro/business/enterprise: Infinity` (+ legacy aliases).
- **`.env.local.example`** — adds `GOOGLE_CLOUD_PROJECT_ID` and `GOOGLE_APPLICATION_CREDENTIALS_JSON` with usage note about base64 encoding.

### Tests
- `src/test/vision-analysis.test.ts` — confidence scoring, OCR field extraction, `mergeOCRWithVisual` conflict resolution (OCR wins at >0.85 conf), prompt builder taxonomy + OCR-text inclusion.
- `src/test/snap-list-orchestrator.test.ts` — price aggregation math (<5 comps / normal / outliers), condition multipliers, `projectAnalysisToDraftFields`, `topCoachingSuggestions` priority sort.
- `src/test/snap-list-events.test.ts` — critical invariant: logger never throws across DB error / sync throw / async reject.
- `e2e/snap-list.spec.ts` — auth gating, `/listings/new` → `/listings/snap` redirect, `?mode=advanced` bypass.

### Graceful degradation
- **Google Vision down or unconfigured** — analysis proceeds with Claude-only; nameplate fields get lower visual-only confidence (0.4–0.8) and show `ConfirmFlag` dots.
- **Claude down** — draft transitions to `failed` with `error_message`; analyzing screen shows "Try again" + "Review what we got" (partial results preserved).
- **Partial photo upload failure** — standard `MultiPhotoUploader` per-file retry; analysis only starts once all uploads complete.

### Out of scope (flagged for future cycles)
- pHash internal duplicate detection UI (column `internal_duplicate_listing_id` present but unused this cycle).
- Teardown / parts-lot listings (>10 photos) — suggest advanced mode.
- SOS and existing listing analyzer migration — **Cycle 59** pending pilot metrics.

---

## [4.28.1] — 2026-04-16 · Video upload + playback hotfix

### Fixed
- **Video uploads stuck at 0%** — three issues found and fixed: (1) `tus-js-client` sends PATCH requests but Cloudflare's Direct Creator Upload URL expects a multipart POST. (2) `captureVideoFirstFrame()` in the feed composer created a `<video>` element that could hang forever if the browser couldn't seek the file (common with `.mov`). (3) CSP `connect-src` was missing `upload.cloudflarestream.com`. **Fix:** reverted both feed and listing video uploads to the proven server-side proxy pattern — XHR POST to `/api/feed/upload-media` (feed) and new `/api/listings/upload-video` (listings), which proxy to Cloudflare Stream via `uploadToStream()`. Removed all TUS/direct-upload/client-thumbnail-capture code. This is the same flow that produced the existing working video in the database.
- **Feed video iframe blocked by CSP** (previous deploy) — added `iframe.videodelivery.net` to `frame-src` CSP directive. Videos now play when clicked instead of showing white.
- **Listing video uploads failed at 10MB** (previous deploy) — listing videos now upload directly to Cloudflare via XHR (same as feed), bypassing the 10MB Vercel server action body limit.

---

## [4.28.0] — 2026-04-16 · Listing photo UX fix + industrial photo guidance (Cycle 57)

### Fixed
- **Listing Photos step "only 2 photos" illusion** — the 2 AI carry-forward photos from `AIImageCapture` were rendered in a segregated section labeled "Carried over from AI analysis" ABOVE the `MultiPhotoUploader`, with the uploader showing `0/18` (on Pro). Users perceived the cap as 2. Now the AI photos render as the first tiles INSIDE the uploader grid, indistinguishable from user-added photos. The `N / maxFiles` counter shows the true total (e.g., `2 / 20`). Bug ticket: *"Market listing: be able to select more than 2 photos ... GE Frame 9 Turbine in pieces, 50+ pics."*
- **"+ Add more photos" now a persistent tile** in the uploader grid (same row as existing photos) instead of a full-width dashed button below. Always visible when below cap, showing `N / maxFiles`. Much clearer affordance that more photos are expected.
- **Removed dead code** — old sequential `handleFileSelect` / `removeImage` / `uploadListingImageAction` from listing create page, replaced by `MultiPhotoUploader` in Cycle 56.

### Added
- **`PhotoTipsBanner`** — `src/components/upload/PhotoTipsBanner.tsx`; dismissable education banner with industrial equipment photography guidance. Four tips: wide shot, nameplate/data tag, wear points, parts & teardown. SOS orange left border (`#FF6B2B`). Expanded by default on first visit; collapsed after "Got it" (persisted via `localStorage['mg-photo-tips-dismissed']`). Does not render on viewports <360px. Placed on listing create Photos step only (listing edit has no general photo manager).
- **Cover badge** — first photo in the uploader grid now shows a "Cover" label, giving users a mental model for photo ordering.

### Compatibility
- Tier caps unchanged: Free 5, Pro 20, Business 30, Enterprise 50.
- `MultiPhotoUploader` props are additive — feed composer and SOS callers are unaffected.
- Teardown/parts-lot listing type (50+ photos) flagged for future cycle.

---

## [4.27.0] — 2026-04-16 · Media bug fixes + performance audit (Cycle 56)

### Fixed
- **Feed video playback** — replaced eager iframe loading with poster-first pattern using `FeedVideoPlayer`. Videos in `processing` state show a thumbnail + animated "Processing video…" badge instead of a broken-media icon. Auto-polls for status every 5s (max 2 min).
- **VideoPlayer poster-first** — the existing `VideoPlayer` component now shows a thumbnail with a play button instead of loading the Cloudflare Stream iframe immediately. Reduces feed weight by one iframe per video until user taps.
- **Listing detail waterfall** — moved `getRevealedContacts()`, `getActiveTier()`, and `getCreditBalance()` into the main `Promise.all` batch, eliminating 3 sequential awaits on the listing detail page.

### Added
- **`FeedVideoPlayer`** component — `src/components/feed/FeedVideoPlayer.tsx`; handles processing/ready/error states with polling, poster-first iframe embed, 10s load timeout with retry, and graceful fallback for missing `stream_video_id`.
- **`MultiPhotoUploader`** component — `src/components/upload/MultiPhotoUploader.tsx`; reusable multi-file upload primitive supporting up to N photos in parallel (concurrency cap 4), per-file progress bars, inline error/retry, drag-and-drop, and tier-aware `maxFiles`.
- **Parallel upload utilities** — `src/lib/upload/parallel.ts` (pLimit-style concurrency) and `src/lib/upload/xhr-upload.ts` (XHR with `onprogress` events).
- **Listing image upload API** — `POST /api/listings/upload-media` for client-side XHR uploads with auth, rate limit (30/10min), and magic-byte validation.
- **SOS image upload API** — `POST /api/sos/upload-media` for client-side XHR uploads with auth, rate limit (20/10min), and magic-byte validation.
- **Cloudflare Stream Direct Creator Uploads** — `createStreamDirectUpload()` server action returns a one-time TUS URL; client uploads directly to Cloudflare via `tus-js-client` (no Vercel in the path). Real progress bar during upload.
- **Client-side video first-frame thumbnail** — captures frame 0.1s via `<video>` + `<canvas>`, uploads to R2 as immediate poster while Stream transcodes.
- **Stream actions** — `src/app/actions/stream.ts`: `createStreamDirectUpload()`, `attachStreamVideoToFeedPost()`, `attachStreamVideoToListing()`, `uploadVideoPoster()`.
- **Skeleton loading pages** — added `loading.tsx` for `/feed`, `/listings/[id]`, `/sos`, `/radar` — all structurally match their real page layouts.
- **`feed_post_media.status`** column — `TEXT NOT NULL DEFAULT 'ready'` with check constraint `(processing, ready, error)` and partial index on `status = 'processing'`.

### Changed
- **Feed composer video flow** — now uses TUS direct upload instead of proxying through Vercel. Posts are submittable as soon as upload completes (video shows as "processing" in the feed). Toast: "Your post is live! Video will appear in ~1 min."
- **Listing creation photos** — replaced sequential server-action uploads with `MultiPhotoUploader` using XHR to `/api/listings/upload-media` for parallel uploads with real progress.
- **Video status polling endpoint** — `GET /api/feed/upload-media` now returns `thumbnailUrl` and `hlsUrl` alongside `status`.
- **`FeedPostWithDetails.media`** type includes `status` field (`processing | ready | error`).

### Performance
- **Image optimization** — added `formats: ['image/avif', 'image/webp']` and `minimumCacheTTL: 2592000` (30-day CDN cache) to `next.config.ts` images config.
- **CSP updated** — added `https://*.cloudflarestream.com` and `https://upload.videodelivery.net` to `connect-src` for TUS direct uploads.
- **Listing detail waterfall eliminated** — 3 sequential credit/reveal/tier awaits moved to parallel batch (saves ~200–400ms on detail page load).
- **Skeleton loading states** — 4 new `loading.tsx` files ensure immediate structural rendering before data loads.

### Compatibility
- All existing `feed_post_media` rows default to `status = 'ready'` (no data migration needed).
- `VideoPlayer` is backward-compatible — existing callers with `embedUrl`/`videoId` props work unchanged; poster-first is the only visual change.
- `FeedPostMedia` now requires `postId` prop (passed from `FeedPost`).
- `tus-js-client` added as a new dependency.

---

## [4.26.0] — 2026-04-14 · SOS dashboard UX + inline education & microcopy (Cycle 55)

### Added
- **SOS dashboard split into two explicit sections** — `src/app/(main)/sos/page.tsx` now fetches `getMySosRequests()` and `getSosRequests()` in parallel and renders them under "My SOS Requests" and "Active SOS in Your Categories" headers. Broadcast SOSs that the viewer already owns are filtered out of section 2 to avoid duplication.
- **Prominent response chip on every owned SOS card** — 44 px minimum touch target, SOS orange (`#FF6B2B`) when `response_count > 0`, muted gray otherwise ("No responses yet"). Chip links directly to `/sos/{id}?tab=responses` so the dashboard → deep-link flow is one tap.
- **Unread pulse dot** — the chip shows a pulsing white dot when `response_count > 0` AND `localStorage['mg-sos-last-viewed-{id}']` is older than the SOS's `created_at`. Last-viewed timestamp is written on the detail page in a `useEffect` when the owner visits, so opening the SOS clears the pulse on next dashboard load.
- **Sort control** on "My SOS Requests" — three options: most recent response (default), most recently posted, urgency (critical first). Pure client-side reorder on already-loaded data.
- **Notification permission hint** — a one-time-per-session orange banner above the dashboard that fires when the user has any SOS with 0 responses older than 30 minutes AND `Notification.permission === 'default'`. "Turn on notifications" opens the existing `NotificationEducationModal`; "Not now" dismisses via `sessionStorage`.
- **`SOSEducationBlocks`** component — `src/app/(main)/sos/create/components/SOSEducationBlocks.tsx` exports `HowSosWorksHint` (collapsible, default closed, explains the three vendor audiences) and `MultiSegmentCallout` (animated SOS-orange left-border callout that appears below the "I also need transport / rigging" toggle when flipped on). Both are used by the camera-first `SOSConfirmStep` and the text-form `create/page.tsx`.
- **`SOSSentStep` Nice-work variant** — now accepts `sosTitle` and `transportIncluded` props. Always shows the SOS title in quotes, the vendor count when available, and a "Nice work — you just sent one SOS that covers equipment, repair, AND logistics…" orange callout when logistics was included. `vendorsNotified > 0` → "Delivered to N matching vendors." Otherwise "Vendors will be notified as they come online." Button labels changed from "View SOS Dashboard" / "Send Another SOS" to "View My SOS" / "Send Another".
- **"Yours" badge on the home-feed SOS row** — `FeedActiveSOSRow` now accepts `currentUserId` and renders a subtle SOS-orange "Yours" badge on cards where `sos.requester_id === currentUserId`. The card's CTA flips from "Respond →" to "View responses →" for owned SOSs. `/feed/page.tsx` passes `currentUserId={user.id}`.
- **SOS detail page ownership clarity** — a "Your SOS Request" pill (SOS orange) renders next to the urgency/status badges when `isRequester`. A separate green "You responded to this SOS" banner renders for non-requester viewers who already have a row in `responses`, with a "View your response" link that scrolls to the responses section. The detail page also writes `localStorage['mg-sos-last-viewed-{id}']` for owners so the dashboard's unread pulse clears.

### Changed
- **SOS dashboard header** — title now uses SOS orange (`#FF6B2B`) for the Siren icon (previously red). The "My Requests" outline button is replaced with a filled SOS-orange "Send SOS" button that links directly to `/sos/create`. Separate `/sos/my-requests` page still works but is no longer the primary entry point.
- **Camera-flow + text-flow submit handlers** — both forms now pass the SOS title and the `transportNeeded` flag into `SOSSentStep` via `SOSCameraFirstFlow` state (`sentTitle`, `sentTransport`) so the confirmation screen can render the Nice-work variant correctly.
- **`SOSConfirmStep.onSubmit` signature** — now `(sosId, vendorCount, sosTitle) => void` to propagate the generated title upward.

### Fixed
- **Dashboard broadcast list no longer showed a user's own SOSs mixed in with other users' SOSs.** They're now filtered out of the broadcast list and always appear in the "My SOS Requests" section, eliminating a double-render.

### Compatibility
- No DB schema or server-action changes. All work is client-side rendering, prop plumbing, and localStorage.
- `/sos/my-requests` page kept in place — still functional — but no longer linked from the main dashboard header.
- `FeedActiveSOSRow.currentUserId` is an optional prop, so any other callers of that component keep working unchanged.

---

## [4.25.0] — 2026-04-14 · Auth: single sign-in method + password reset fix (Cycle 54)

### Added
- **`public.get_auth_providers_for_email(text)` RPC** — a SECURITY DEFINER Postgres function that, given an email, returns the `provider` values from `auth.identities` for that user (or an empty array). Granted to `service_role` only; revoked from `anon` and `authenticated`. Lets server actions detect whether an account was registered with email, Google, or Apple without exposing `auth.users` directly.
- **`src/app/actions/auth.ts`** — new `getProvidersForEmail(email)` server action wrapping the RPC. Returns `{ providers, hasPassword, primary, exists }`. Invoked only *after* the user has proven intent to sign in (failed password attempt, forgot-password submit) to avoid email enumeration on page load.
- **`src/lib/auth/errors.ts`** — `friendlyAuthError()` maps Supabase raw error messages to user-safe copy (`invalid_credentials`, `email_not_confirmed`, `rate_limit`, `user_not_found`, `weak_password`, `otp expired`, OAuth fallback). `providerLabel()` renders `'email and password'` / `'Google sign-in'` / `'Apple sign-in'`.
- **Login page: `?reset=success` banner** — green banner above the form saying "Password updated. Please log in with your new password." after a successful password reset.
- **Login page: `?error=wrong_method&provider=<p>` banner** — shown when the OAuth callback bounces a cross-method sign-in attempt. Message is specific per provider (`email` / `google` / `apple`).
- **Login page: wrong-provider hint after failed password attempt** — when `signInWithPassword()` returns `invalid_credentials`, we call `getProvidersForEmail(email)`. If the account exists but has no `email` identity, we show the relevant "This email is registered with Google/Apple sign-in" message and visually highlight the OAuth button row with a `ring-2 ring-primary` emphasis. If the account doesn't exist at all, we show "No account found with that email." instead of the generic Supabase message.
- **Forgot-password page: provider pre-check** — before calling `resetPasswordForEmail()`, we look up the email. If the account exists and is OAuth-only, we return `'This account uses Google/Apple sign-in. Password reset is not available — please continue with [provider] on the sign-in page.'` and do not fire the reset email. If the email doesn't exist, we fall through to Supabase's "if an account exists…" generic copy to preserve non-enumeration.
- **Reset-password page: session gate + explicit sign-out flow** — on mount, `supabase.auth.getUser()` is called; if there's no session we redirect to `/forgot-password?error=This+reset+link+has+expired+or+is+invalid...`. After a successful `updateUser({ password })`, we explicitly `supabase.auth.signOut()` and `window.location.assign('/login?reset=success')` — a full navigation so middleware re-runs against a cleared cookie before the login page mounts. No more "silent login to /dashboard" behavior.
- **OAuth callback cross-method guard** — `src/app/(auth)/callback/route.ts` now inspects `data.user.identities` after `exchangeCodeForSession()`. If the user has BOTH an `email` identity and a `google`/`apple` identity (Supabase auto-linking did its thing), we `signOut()` and redirect to `/login?error=wrong_method&provider=email`. The guard is skipped when `next=/reset-password` so password recovery never gets blocked.

### Changed
- **Friendly errors applied everywhere in auth** — login, forgot-password, and reset-password now run Supabase errors through `friendlyAuthError()` so the user-facing copy is specific and actionable. Generic "Something went wrong" / raw Supabase messages are gone.
- **Forgot-password page now uses `useSearchParams()`** and is wrapped in `<Suspense>` so the reset-password redirect can preseed an error banner via `?error=…`.
- **Reset-password copy clarified** — the page title keeps "Set New Password" but the description now reads "Enter your new password below. You'll log in again with it." so users don't expect to be dropped into the app.

### Security notes
- **Account enumeration discipline** — `getProvidersForEmail()` is only called *after* (a) a failed password login or (b) a forgot-password submission. Login-time probing is explicitly avoided. The forgot-password "if an account exists, we sent a link" generic copy is preserved for non-existent emails.
- **SECURITY DEFINER function scoping** — the RPC is revoked from `anon` and `authenticated`, so it can only be called from server code using the service role key.
- **Supabase auto-linking recommendation** — disable "Enable automatic identity linking" in the Supabase dashboard (Auth → Settings). The callback-side guard is the belt-and-suspenders defense; the dashboard toggle is the primary fix. Documented in CLAUDE.md.

### Compatibility
- No user-facing URL changes. `/login`, `/signup`, `/forgot-password`, `/reset-password`, and `/callback` all keep their existing paths and query-param contracts.
- `redirectTo=` post-login param still respected. OAuth sign-in for fresh Google/Apple accounts still works normally (only multi-identity accounts are blocked). Email confirmation flow for new signups is unaffected (single `email` identity → no block). The password-recovery code-exchange flow is explicitly exempted from the multi-identity guard.

---

## [4.24.0] — 2026-04-14 · SOS response notifications: badge, toast, sound (Cycle 53)

### Added
- **`sos-response.wav` sound asset** — a sharp two-pulse 880 Hz → 1200 Hz tone (~600 ms total, 80 ms gap) distinct from `alert.wav`. Generated via `scripts/generate-sounds.mjs`, which now has a third `sosResponseTone()` generator and writes `public/sounds/sos-response.wav` alongside the existing files.
- **`useNotificationSound().playSosResponse(notificationId?)`** — new play method that preloads `sos-response.wav` at volume 0.65, gates on the existing `highPrioritySoundEnabled` preference, and registers the notification in the alert tracker with `sound: 'sos-response'`. The repeat-cadence interval now dispatches to the right audio element per tracker (alert vs sos-response) so up to 3 replays across 4 minutes work for both types without cross-contamination.
- **Realtime hook toast** — `useNotifications()` now fires a Sonner toast on every new `sos_response_received` notification: 8-second duration, SOS orange left border (`border-l-[#FF6B2B]`), and a "View Response" action button that deep-links to `/sos/{sos_id}?tab=responses`.
- **SOS detail page deep-link** — `src/app/(main)/sos/[id]/page.tsx` now reads `?tab=responses` via `useSearchParams()` and smooth-scrolls to the Responses section on load (with `scroll-mt-16` anchor offset so the header doesn't overlap).

### Changed
- **Notification dropdown: SOS response color → SOS orange.** `sos_response_received` entries in `NOTIFICATION_COLORS` now use `text-[#FF6B2B]`, and the unread left-border/background tint for this type switches from red (`border-red-500 bg-red-500/5`) to SOS orange (`border-[#FF6B2B] bg-[#FF6B2B]/5`), visually distinguishing "someone replied to *your* SOS" from generic SOS broadcasts. Other SOS notification types keep their existing red styling.
- **Dropdown deep link for SOS responses** — `getNotificationHref()` now returns `/sos/{sos_id}?tab=responses` for `sos_response_received` so clicking the notification jumps straight to the responses list. Other SOS types still link to `/sos/{sos_id}` without a tab param.
- **Realtime hook sound routing** — new `sos_response_received` notifications route to `playSosResponse()` *before* the generic `isHighPriority()` check, so the distinct SOS-response tone always wins over the generic `alert.wav` tone.

### Compatibility note
- **No new `type` string introduced.** The existing `sos_response_received` type (in the `NotificationType` union, the `notifications_type_check` constraint, and already fired by `respondToSos()` since cycle 50.1) is the canonical type. No DB migration was needed: all UX upgrades target the existing type to avoid breaking historical notifications, push-notification tags, the `NOTIFICATION_ICONS` / `NOTIFICATION_COLORS` maps, and the realtime sound routing.

---

## [4.23.0] — 2026-04-14 · SOS form: validation, image upload, text-only (Cycle 52)

### Added
- **Field-level validation on the SOS text form** (`src/app/(main)/sos/create/page.tsx`) — category, title, and description now track `touched` state and render inline `text-destructive` errors below the field. The Send SOS button is no longer natively `disabled`; it uses `aria-disabled` so a click on an invalid form marks all required fields as touched, toasts a fix-it message, and smooth-scrolls to the first error.
- **Inline validation in `SOSConfirmStep`** — description now requires ≥20 trimmed characters (with a friendly "describe what you need in at least a few sentences…" message). Submit is `aria-disabled` and reveals the error + focuses the textarea instead of silently returning.
- **Client upload helper** `src/app/(main)/sos/create/upload-helper.ts` — `uploadSosPhotoWithRetry()` wraps `uploadSosMedia()` and performs one silent retry on transient `server` failures. Used by `create/page.tsx`, `SOSConfirmStep`, and `SOSProcessingStep`.
- **Specific upload error codes** — `uploadSosMedia()` now returns a discriminated `{ error, code }` shape (`auth` / `missing` / `too_large` / `bad_type` / `corrupt` / `server`) so the UI can render targeted messages like "Photo must be under 10MB" or "Only JPG, PNG, WebP, and HEIC photos are supported" instead of a generic failure.
- **HEIC/HEIF image support** — `validateImageBytes()` in `src/lib/security/file-validation.ts` now recognizes the ISO base-media "ftyp" box for HEIF brands (`heic`, `heix`, `hevc`, `mif1`, …) and returns `image/heic`. `extFromContentType()` in `src/lib/media.ts` maps `image/heic`, `image/heif`, and their sequence variants to `.heic` / `.heif`.
- **Inline upload error banner** — both the text flow and `SOSConfirmStep` now render the upload error next to the photo picker and show a "Retrying…" label while the auto-retry is in flight.
- **"Selected: <category label>" confirmation line** beneath the category field, so users can see which taxonomy entry is actually stored (not just what they typed in the search box).

### Changed
- **`uploadSosMedia()`** (`src/app/actions/sos.ts`) — case-insensitive MIME allowlist, 10 MB size check, magic-byte validation via `validateImageBytes()`. The detected MIME (not the browser-reported header) is passed to R2 so an uppercase `.JPEG` upload is stored as `image/jpeg`. Errors are no longer interpolated from raw `err.message`; each failure mode returns a user-safe message.
- **`extFromContentType()`** — lowercases the content type before lookup; accepts `image/jpeg`, `image/jpg`, `image/pjpeg`, `image/heic`, `image/heif`, and their sequence variants. Uppercase `.JPEG` uploads no longer fall through to a `.bin` extension on R2.
- **File input `accept` attributes** on the text form and `SOSConfirmStep` now allow `image/heic`, `image/heif`, and the `.heic` / `.heif` extension forms (plus `.jpg/.jpeg/.png/.webp`) so iPhone photo pickers surface the right files.
- **Description placeholder** in both the text form and `SOSConfirmStep` updated to "Describe the equipment, issue, or need in detail. Include model numbers, symptoms, or specs if you have them."

### Fixed
- **Silent disabled Send SOS button** — clicking the (visually) disabled button now reveals every validation error at once and scrolls to the first problem. Previously a click on a disabled button did nothing and gave no feedback about which field was the blocker.
- **Brand name typed into equipment category** — the category field is a taxonomy-backed search; a free-text entry like "Alfa Laval" no longer leaves the field looking filled while `form.equipment_category` stays empty. An inline error now reads: *"Select a category from the list (e.g. 'Oil cleaning centrifuges', not a brand name)."*
- **Text-only SOS rejected** — `SOSConfirmStep.handleSubmit()` previously did `if (!description.trim()) return` with no user feedback, and the submit button's native `disabled` attribute swallowed clicks. Both replaced with visible validation + aria-disabled click-to-reveal. `createSosRequest()` already accepted empty `photos`, so text-only now round-trips end-to-end once the UI unblock is in place.
- **`.JPEG` / `.JPG` uppercase extensions** no longer fall through the MIME allowlist.
- **HEIC photos from iPhones** — no longer stored as `.bin` on R2; stored as `.heic` with `image/heic` content type. (Conversion to JPEG is not performed — HEIC is accepted as-is.)
- **Generic "Failed to upload image" error** replaced with specific, actionable messages depending on failure mode (auth, size, type, corruption, or transient server).

---

## [4.22.0] — 2026-04-14 · Feed comment replies & owner delete (Cycle 51)

### Added
- **Threaded replies on feed comments** — Facebook-style 1-level-deep replies. Top-level comments now show a **Reply** text button that opens an inline input pre-filled with `@AuthorName ` and auto-focused. Replies render indented under the parent with no further Reply button (depth gate). A "View N replies" / "Hide replies" toggle expands the reply list on demand via a separate `getReplies()` server action — replies are not fetched up-front.
- **`parent_comment_id` FK** on `feed_post_comments` with `ON DELETE CASCADE` and partial index `idx_feed_post_comments_parent`. Deleting a parent cascades its replies at the DB level.
- **`addReply()`** server action — resolves `post_id` from the parent row, rejects if the parent itself has a non-null `parent_comment_id` (depth enforced server-side), increments `comments_count`, notifies the parent comment author.
- **`getReplies(parentCommentId)`** — on-demand reply fetch, no cache.
- **`getPostComments()` now returns `CommentWithReplyCount[]`** — each top-level comment carries a `reply_count` so the toggle can render without a follow-up query.
- **Dedicated `src/app/actions/feed-comments.ts`** — all comment/reply mutations now live here (`getPostComments`, `getReplies`, `addComment`, `addReply`, `deleteComment`). `FeedComment` type moved here; `feed-posts.ts` re-exports it for back-compat.
- **`CommentItem` component** — extracted from `CommentSection` as a reusable `'use client'` component, used recursively for the reply list.
- **`ReplyInput` component** — variant of `CommentInput` with `@mention` pre-fill, auto-focus, Escape-to-cancel, and an inline cancel button.

### Changed
- **Comment deletes are now hard deletes** for all paths — comment authors, post owners, and admins (`superadmin` / `moderator`). The row is removed from `feed_post_comments` rather than soft-deleted via `is_deleted = true`. Deleting a parent comment cascades its replies and decrements `feed_posts.comments_count` by `1 + reply_count`. `is_deleted` column on `feed_post_comments` remains in the schema but is no longer written by the delete path and no longer filtered on reads of top-level comments (replaced by `parent_comment_id IS NULL`).
- **Post owners can delete any comment on their post** — permission check in `deleteComment()` resolves the post's `author_id` and grants delete rights alongside the comment author and admins.
- **`CommentSection` signature** — now requires `postAuthorId: string`. `FeedPost` passes `post.author.id`.

### Fixed
- **Soft-deleted comments no longer linger in the DB** — the hard-delete path reclaims rows instead of leaving orphaned `is_deleted = true` records.

---

## [4.21.3] — 2026-04-10 · SOS tier-limit constants hotfix (Cycle 50.3)

### Fixed
- **`SOS_TIER_LIMITS`** had only `free` / `premium` / `boost` keys (legacy aliases). Users on the modern tier names (`pro` / `business` / `enterprise`) hit `SOS_TIER_LIMITS[tier] === undefined`, and the next line `limits.activeSos` would crash the `createSosRequest` server action with a `TypeError`. Added explicit `pro` / `business` / `enterprise` entries (legacy `premium` / `boost` kept for back-compat) and a defensive `?? SOS_TIER_LIMITS.free` fallback in `createSosRequest` so an unknown tier string can never crash SOS creation
- Symptom that surfaced this: a free-tier user already at the 1-active-SOS cap clicks Send SOS, the action returns `{ error: 'You can have 1 active SOS request on your free plan...' }`, the toast fires but is easily missed → looks like "the page does nothing"

---

## [4.21.2] — 2026-04-10 · SOS dashboard query hotfix (Cycle 50.2)

### Fixed
- **SOS Dashboard rendered empty for everyone** — `getSosRequests()` (powering `/sos`), `getSosDetail()` (powering `/sos/[id]`), and the `/api/sos/ai` ranking endpoint all used PostgREST embedded joins like `requester:profiles!sos_requests_requester_id_fkey(...)`. But `sos_requests.requester_id` is FK'd to `auth.users(id)`, not `profiles(id)`, so PostgREST returned `PGRST200` ("Could not find a relationship between 'sos_requests' and 'profiles'"). The actions returned `{ error: ... }`, the dashboard's `'error' in result` check skipped state updates, and the page rendered the empty state. **Bug had been silent since SOS shipped in Cycle 6.**
- All three locations now fetch SOS rows first and resolve requester/responder profiles in a separate query, merging in JS — same pattern used in `admin-sos.ts`
- **`/sos` dashboard now respects `sos_receive_all`** — users with the receive-all flag get the unfiltered firehose instead of being filtered by their explicit equipment interests

### Diagnostic notes
- The bug was masked because admin-side `getAdminSOS()` and the new admin detail page (Cycle 50) both avoid embedded joins and fetch profiles separately, so they always rendered correctly. Only the user-facing `/sos` dashboard was broken.

---

## [4.21.1] — 2026-04-10 · SOS notification delivery hotfix (Cycle 50.1)

### Fixed
- **`notifications.type` check constraint** — was missing `sos_request_match` (and every other notification type added after Cycle 5). Every SOS in-app notification insert was silently failing the constraint and getting swallowed by the fire-and-forget `Promise.allSettled` in `createNotification`. Constraint expanded to cover all 24 current notification types
- **`find_sos_responders()` Postgres RPC** — required SOS subcategory to be a member of `user_equipment_interests.subcategories`, but the Cycle 49 Equipment Interests Editor inserts rows with `subcategories: []` (meaning "match all"). The RPC now treats null/empty subcategories arrays as "match all subcategories under this tier2"
- **`find_sos_responders()` opt-in gate** — was checking the legacy `sos_responder` boolean. Switched to `sos_opted_in` (the column the current onboarding actually sets)
- **Recovered the Mireles → Readco SOS** — manually inserted notification + delivery rows for the 2 matching opted-in users (including Mark/Solid Snake) so the missed SOS now appears in their bell + Notification Delivery audit panel

### Added
- **`user_business_profiles.sos_receive_all`** — new boolean column (default false). When true, the user receives every SOS broadcast regardless of equipment interest matches. Useful for admins, monitors, and dealers who need full market visibility
- **"Receive all SOS notifications" toggle** — new SOS-orange toggle card in the Profile → Equipment Interests editor; persists to `sos_receive_all`
- **Defense-in-depth recipient pull** — `broadcastSOSNotifications()` and `adminRebroadcastSOS()` now also fetch `sos_receive_all = true` users at the application level, in addition to relying on the RPC. This ensures admin/monitor delivery even if the RPC version drifts from the application code

### Migration
- `supabase/migrations/20260410_sos_notification_delivery_fix.sql` — already applied to production via Supabase Management API

---

## [4.21.0] — 2026-04-10 · Admin SOS Detail View + Notification Audit + Re-broadcast (Cycle 50)

### Added
- **Admin urgency escalation** — inline Select dropdown next to the urgency badge on `/admin/sos/[id]` lets a moderator change a SOS between Normal and Critical; escalating to Critical fires a one-time critical-urgency email blast to every user already in the notification log (in-app/push are NOT re-fired — use Re-broadcast for that); confirmation Dialog before send; logs to `admin_audit_log` as `update_sos_urgency`
- **`adminEscalateSOSUrgency()`** — new server action in `src/app/actions/admin-sos.ts`; gated by `requireAdmin('moderate')`
- **`/admin/sos/[id]`** — dedicated SOS detail page (SSR shell + `SOSDetailClient`); accessible by clicking any row in the SOS Monitor or via the new "Open detail page" dropdown action
- **Notification Delivery audit panel** — collapsible (closed by default), lazy-loaded once per page load; per-user table with avatar, archetype, status (read vs sent), sent timestamp, read timestamp, and responded indicator with response-preview tooltip; mobile collapses to 3 columns
- **Notification summary row** — `{responded} responded · {read} read · {unread} unread · {total} total notified` computed from the lazy-loaded log
- **Response Timeline** — collapsible (open by default); chronological list of every submitted response with avatar, display name, company, archetype, full message, and price/lead/condition badges
- **Re-broadcast action** — admin button on the Notification Delivery panel that re-runs SOS recipient matching and only notifies users not already in `sos_notifications`; confirmation Dialog before send; toast reports new vs skipped counts; disabled with tooltip when SOS is not active
- **`src/app/actions/admin-sos.ts`** — new admin-only server actions: `getSOSDetail()`, `getSOSNotificationLog()`, `getSOSResponseTimeline()`, `adminRebroadcastSOS()`

### Changed
- **SOS Monitor table rows** — entire row is now clickable and navigates to `/admin/sos/[id]`; existing Actions dropdown still works (`stopPropagation` on cell + trigger); the drawer-based "Quick view" remains as a secondary dropdown action
- **`broadcastSOSNotifications()` (Cycle 49)** — now sets `sent_at = now()` on the `sos_notifications` upsert so the new audit panel can render delivery timestamps

---

## [4.20.0] — 2026-04-10 · SOS Submission Fix + Equipment Interests Editor + SOS Push Broadcast (Cycle 49)

### Fixed
- **SOS submission** — responder lookup, sos_notifications upsert, and cross-list expansion moved out of the main create path and wrapped in try/catch so RPC or downstream failures never break SOS creation; real server errors now surface to the submit toast instead of a generic "Failed to send SOS" message
- **`transport_needed` wiring** — camera-first flow now carries `transportNeeded` through shared state → `SOSConfirmStep` → `createSosRequest()` payload so logistics routing works for both text and camera submission paths

### Added
- **`broadcastSOSNotifications()`** — new fire-and-forget SOS fan-out in `src/app/actions/sos.ts`; runs after successful insert, never blocks the confirm step
- **SOS opt-in guard** — recipients filtered by `user_business_profiles.sos_opted_in` before any notification fires
- **Transport routing** — when `transport_needed` is true, logistics archetype users are added to the recipient set
- **Critical-urgency email broadcast** — Resend email to matched recipients' `profiles.contact_email` for `urgency = 'critical'` SOS, capped at 500/blast, orange CTA to `/sos/[id]`
- **`transport_needed` toggle in SOSConfirmStep** — new switch below urgency picker in the camera-first flow
- **Equipment Interests editor on profile page** — new `EquipmentInterestsEditor` client component with industry chips (blue selected state) and all 28 Tier 2 equipment groups as toggle chips (SOS orange selected state), grouped by Tier 1 bucket
- **`src/app/actions/interests.ts`** — `getEquipmentInterests()` + `updateEquipmentInterests()` server actions; atomic delete+insert on `user_equipment_interests`, derives `tier1` from taxonomy, upserts `industries` on `user_business_profiles`, revalidates `/profile`, `/feed`, `/dashboard`
- **Service worker `sos_request_match` click handler** — push clicks now route to `/sos/[id]` instead of the generic `/notifications` fallback

### Changed
- **SOS create error handling in `SOSConfirmStep`** — catches now surface the actual server error message to the toast instead of a generic string

---

## [4.19.0] — 2026-04-08 · Four-Archetype Onboarding + Logistics Access Layer (Cycle 48)

### Added
- **Logistics archetype** — new fourth user type for fleet companies and independent drivers; logistics users cannot create listings but can post, message, respond to SOS, and build network presence
- **One-time archetype migration banner** — non-dismissible sticky banner for existing users prompting archetype confirmation; selection is permanent after confirmation
- **Archetype lock system** — `user_business_profiles.archetype_locked` column; set on new user onboarding completion and migration confirmation
- **Logistics Step 3 fields** — sub-type (fleet/individual), fleet size, equipment capabilities multi-select, coverage area, service states, DOT/MC number
- **`mg_archetype` cookie** — set at onboarding/migration; read by middleware to block listing routes for logistics users; auto-refreshed in layout if DB diverges
- **Listing tool gate for logistics** — middleware blocks `/listings/new`, `/listings/create`, `/listings/import`, `/listings/bulk-edit`, `/inventory` for logistics users
- **SOS transport routing** — `sos_requests.transport_needed` boolean; toggle on SOS create form; logistics users receive transport SOS alerts
- **`src/app/actions/archetype.ts`** — `confirmArchetype()`, `adminUpdateArchetype()`, `getArchetypeStatus()` server actions

### Changed
- **`ARCHETYPE_OPTIONS` constant** — expanded from 3 to 4 archetypes with logistics
- **Service Provider archetype clarified** — removed "Logistics" from examples (now its own archetype)
- **`submitOnboarding()`** — now sets `archetype_locked = TRUE` and `mg_archetype` cookie on completion
- **Onboarding Step 1** — 2x2 grid layout for 4 archetype cards; logistics card shows "No listing tools" badge

---

## [4.18.0] — 2026-04-08 · EIN Verification Queue (Cycle 47)

### Added
- **EIN Verification flow** — users submit EIN and supporting document from profile page; record created in `seller_verifications` with status `pending`
- **Verification status card** — profile shows pending/approved/rejected state with masked EIN, submission date, and rejection reason; rejected users can resubmit
- **Admin Verifications queue** — new "Verifications" tab in admin moderation; shows pending submissions with full EIN, document link, seller info, approve and reject (with reason) actions
- **EIN auto-format** — EIN input auto-formats to `XX-XXXXXXX` as digits are typed
- `ein`, `ein_submitted_at`, `rejection_reason` columns on `seller_verifications`
- Admin actions: `getPendingVerifications()`, `approveVerification()`, `rejectVerification()`

### Fixed
- **EIN/WIN input focus bug** — input no longer loses focus after each keystroke; root cause was nested function component remounting on every parent re-render; extracted to stable `VerificationForm` component

---

## [4.17.0] — 2026-04-08 · Mobile Feed Polish (Cycle 46)

### Fixed
- MobileHeader and MobileBottomNav now remain fixed during scroll on iOS Safari and Android
  Chrome; document-level scroll restored on feed page to ensure position:fixed elements
  behave correctly
- Feed post media capped at max-h-[300px] on mobile; portrait images use object-cover so
  they don't dominate the viewport
- Comment section vertical thread line removed; comment layout is now flat
  (avatar → name → text) with no border-l artifact
- iOS safe area padding added to MobileBottomNav (env(safe-area-inset-bottom)) for
  notched devices
- overscroll-behavior: none on html element prevents iOS bounce revealing background
- Feed post card now has overflow-hidden so media clips within rounded corners instead of
  bleeding to screen edge; images render edge-to-edge on mobile (no inner padding) matching
  Facebook/Instagram pattern

---

## [4.16.0] — 2026-04-07 · My Listings Search/Filter + Bulk Edit Spreadsheet (Cycle 45)

### Added
- **My Listings search & filter** — search bar (filter by title) and dropdown filters for status, condition, and category; "Clear filters" link when active
- **"Bulk Edit Listings" button** on My Listings page — navigates to new spreadsheet editor at `/listings/bulk-edit`
- **Bulk Edit Listings page** — full-width spreadsheet grid; one row per listing; inline-editable columns: thumbnail, title, price, status, condition, category, city, state, quantity, SKU, description
- **Auto-save per cell** — cells save on blur/Enter; per-cell save state: spinner → green check (fades 2s) → red X with tooltip on error
- **Sticky columns** — thumbnail and title stay fixed during horizontal scroll
- **Description popover** — description cells expand into a positioned textarea overlay on click, save on close
- **`saveListingCell()` server action** — field allowlist, ownership verification, per-field value validation
- **Navigation guard** — `beforeunload` warning if saves are in flight when navigating away
- **200-row cap** with amber banner for large inventories

---

## [4.15.0] — 2026-04-07 · Bulk Edit Listings (Cycle 44)

### Added
- **Bulk edit listings** — multi-select listings on My Listings page and edit multiple fields at once via a right-side Sheet panel
- **Bulk edit fields (Pro+):** price (fixed or % change with live preview), condition grade, category, location (city/state)
- **Bulk edit fields (all tiers):** status (active / draft / archived)
- **`bulkEditListings()` server action** — ownership-verified, tier-gated, handles fixed and percent price updates; percent price clamps to $1 minimum and rounds to nearest dollar
- **Locked state for free tier** — Pro field section shows blurred overlay with upgrade CTA when user is on free tier
- **Price % preview** — real-time client-side preview showing avg price before/after for selected listings

---

## [4.14.0] — 2026-04-07 · Card Image Fix, Homepage Featured & Radar Posts Render (Cycle 43)

### Fixed
- **Listing card image flush** — removed `py-6 gap-6` padding above card images across all surfaces (search grid/list, feed discovery, snipe feed, saved search, company listings, radar equipment/videos, equipment category pages, homepage featured); image now fills flush to top edge of card with `overflow-hidden` on card container
- **Homepage featured images** — featured listing cards on marketing homepage now fetch `listing_images` and display equipment photos with the same flush-image card pattern used across the site
- **Equipment category page images** — `/equipment/[slug]` category pages now fetch and display listing images
- **Radar Posts tab empty** — refactored `getRadarPosts()` to use a two-step query (collection items → feed posts) to avoid FK join failures; posts now include author profile and company data; soft-deleted posts excluded from render; tab badge count uses actual rendered post count

---

## [4.13.0] — 2026-04-07 · Hard Delete Fix, Orphaned Auth Recovery & Homepage Auth Awareness (Cycle 42)

### Added
- **Orphaned auth record cleanup** — `deleteOrphanedAuthUser()` server action for superadmins to delete auth records when profile data is already gone
- **Orphaned account UI** — admin user detail page renders minimal "orphaned account" layout (no 404) with "Delete Auth Record" button when profile is null
- **`getCurrentAdminInfo()` action** — returns both admin user ID and role for client components
- **Homepage welcome strip** — `WelcomeBackStrip` component shows personalized "Welcome back, {firstName}" with dashboard link for logged-in users visiting the marketing homepage; dismissible, no forced redirect

### Changed
- **`hardDeleteAccount()` return type** — now returns `HardDeleteResult` discriminated union with `authDeleteFailed` boolean and `authError` string for partial success states
- **Auth deletion isolation** — auth user deletion uses a fresh `createAdminClient()` and is wrapped in its own try/catch, separate from data deletion
- **Auth deletion audit logging** — `hard_delete_auth_user_failed` now includes actual error message and status code in `metadata.error`/`metadata.code`; `hard_delete_auth_user_success` logged on success
- **`DeleteAccountPanel`** — handles `authDeleteFailed` return with warning toast and page reload to orphaned mode; accepts `hasProfile` and `adminUserId` props

### Fixed
- **Hard delete auth failure** — auth user deletion now uses a fresh admin client to prevent stale client issues after profile cascade deletion

---

## [4.12.0] — 2026-03-31 · Listing Gallery Desktop Overhaul (Cycle 41)

### Added
- **Image lightbox modal** — full-screen dialog with 4:3 aspect, filmstrip thumbnails at bottom, prev/next arrow navigation, keyboard support (ArrowLeft/ArrowRight/Escape)
- **Video modal** — separate dialog for listing videos; single player for 1 video, vertical list for multiple; uses existing `VideoPlayer` component
- **"+N more" overflow tile** — slot 6 in thumbnail strip shows dimmed 6th image with count overlay; clicking opens lightbox at image 6
- **Video thumbnail tiles** — play-icon tile for 1 video, count+play tile for 2+ videos; rendered below image thumbnails in strip

### Changed
- **Desktop thumbnail size** — 72×72px → 44×44px for a tighter, Amazon-style strip
- **Thumbnail strip hard cap** — max 6 visible image slots; no vertical scrollbar ever (`overflow-y-auto` and `max-height` removed)
- **Main image click-to-lightbox** — clicking the main desktop image opens the lightbox at the current active index
- **Desktop arrows** — navigate only within images (not videos); videos accessed exclusively via video thumbnail tile
- **AskMetalGear placement** — moved from center content column to left column below gallery on desktop (`lg:`); mobile placement unchanged (below specs, above reviews)

---

## [4.11.0] — 2026-03-31 · Unified Radar (Cycle 40)

### Added
- **Unified Radar save system** — single save mechanism for equipment listings, feed posts, and videos via `RadarSaveButton` component
- **`/radar` route** with 4 tabs: Equipment | Posts | Videos | Lists — shows all saved items organized by type
- **`/radar/[id]`** route for individual named radar lists with mixed item types
- **Radar save on feed posts** — radar icon in post action row for one-tap save
- **Radar save on video player** — optional overlay button via `radarProps` prop
- **`src/app/actions/radar.ts`** — server actions: toggleRadarListing, toggleRadarPost, toggleRadarVideo, getRadarListingIds, getRadarPostIds, getRadarCounts, getRadarEquipment, getRadarPosts, getRadarVideos, getRadarLists
- **`is_default` column on `collections`** — unique per user; auto-created "Saved" default list for every user
- **`item_type`, `feed_post_id`, `video_ref_id`, `video_source_type`, `video_thumbnail_url`, `video_title`, `video_listing_id`, `video_post_id` columns on `collection_items`** — per-type unique indexes replace old listing-only constraint
- **Favorites data migration** — all `favorites` rows migrated to `collection_items` with `item_type='listing'` in each user's default radar list

### Changed
- **Radar icon** updated to Lucide `Radar` everywhere: desktop nav, mobile drawer, listing cards, listing detail, mobile purchase bar
- **Desktop nav** consolidated: separate Favorites and Radar links merged into single "Radar" link
- **`/collections` and `/favorites` redirect to `/radar`** — all old routes preserved as redirects
- **Listing save state** reads from `collection_items` instead of `favorites` table (search page, listing detail, listing purchase panel, mobile purchase bar)
- **AnonInteractionGate** save copy updated to reference "Radar"
- **Admin hard-delete** now cleans up `collection_items` and `collections` for deleted users
- **Middleware** adds `/radar` and `/collections` to protected route prefixes

### Removed
- **`favorite-action.ts`** — deleted; `toggleFavoriteAction` replaced by `toggleRadarListing`
- **Heart/favorites UI** across all surfaces replaced with Radar icon

---

## [4.10.0] — 2026-03-31 · Listing Media Quality Gate (Cycle 39)

### Added
- **`listings.has_media` column** — trigger-maintained boolean; `true` when any `listing_images` or non-error `listing_videos` exist; backfilled on migration
- **Postgres triggers** — `sync_listing_has_media()` fires on `listing_images` INSERT/DELETE and `listing_videos` INSERT/DELETE/UPDATE OF status to keep `has_media` in sync
- **Media quality gate on all public surfaces** — search, AI search, feed discovery (For You, price drops, saved search matches, general feed, recent listings), snipe feed, related listings, recommended/trending, seller/profile/company pages, equipment category pages, homepage featured, sitemap, smart search alert cron all filter `has_media = true`
- **HiddenListingsAlert** dashboard widget — amber alert showing count of no-media listings with "Fix now" link to filtered My Listings view
- **"No media — hidden" badge** on My Listings page rows for active listings without media; links to edit page photos step
- **`?filter=no-media` param** on My Listings page — filters to only show hidden-from-media listings, with banner and "Show all" link
- **Seller warning banner** on listing detail page — amber banner with "Add Photos" CTA, shown only to listing owner when `has_media = false`
- **Non-blocking amber callout** on listing creation Review step when no photos or videos uploaded
- **`hidden_listing_count`** column on `listing_imports` — populated at import completion; shown in import summary with "Fix now" link
- **`listing-media-gate` server actions** — `getHiddenListingCount()`, `isListingHiddenFromPublic()`

### Changed
- **Import completion** — `startImportJob()` now counts hidden listings among created IDs and stores count in `listing_imports.hidden_listing_count`
- **ImportCompleteSummary** — shows amber warning row when imported listings are hidden due to missing media

---

## [4.9.0] — 2026-03-31 · Security Hardening (Cycle 38)

### Added
- **Security headers** — CSP, X-Frame-Options (SAMEORIGIN), X-Content-Type-Options (nosniff), HSTS, Referrer-Policy, Permissions-Policy applied to all routes via `next.config.ts`
- **Input validation** — Zod schemas for all AI API routes (search, copy, SOS, image analysis, ask, help chat) in `src/lib/security/validate.ts`
- **HTML/text sanitization** — `sanitizeText()`, `stripHtml()`, `sanitizeUrl()`, `escapePostgrestValue()` utilities in `src/lib/security/sanitize.ts`
- **Magic byte file validation** — `validateImageBytes()`, `validateVideoBytes()`, `validateDocumentBytes()` check actual file signatures, not just Content-Type headers; in `src/lib/security/file-validation.ts`
- **Token bucket rate limiter** — per-route configs for AI (10 req burst), contact reveal (10 req burst), general endpoints; applied in middleware for all AI API routes; in `src/lib/security/rate-limit.ts`
- **Safe error serialization** — `safeErrorMessage()` / `toActionError()` prevent DB schema details, stack traces, and Postgres errors from leaking to clients; in `src/lib/security/errors.ts`

### Fixed
- **SQL injection via PostgREST filter interpolation** — `filters.tier2` and `filters.manufacturer` in AI search, `subcategory` in SOS AI demand prediction, `query` in help article search, `search` in admin priority search all now escaped via `escapePostgrestValue()`
- **Raw AI response leakage** — AI copy and SOS AI routes no longer return `raw: rawText` in error responses; logged server-side only
- **Base64 image size unbounded** — Analyze image route now enforces 15MB cap on base64 inputs and validates MIME types against allowlist
- **Feed post content unsanitized** — `createFeedPost` and `editFeedPost` now sanitize content via `sanitizeText()` and enforce 1000-char limit server-side; hashtags capped at 10 and 50 chars each
- **Feed post DB error message leakage** — Supabase errors no longer thrown directly as user-facing messages

### Changed
- **Middleware** — now checks rate limits on AI routes and contact reveal endpoints before Supabase session handling
- **Feed upload route** — validates file bytes (magic numbers) before uploading to R2

---

## [4.8.0] — 2026-03-31 · Import Progress UX (Cycle 37)

### Added
- **Size-aware humor messaging** — `src/lib/import/humor.ts` pure utility library; 5 import size tiers (tiny/small/medium/large/massive) with industrial-themed quips at preview, job start, Phase 2 image fetching, and completion; all pure functions, fully unit-tested
- **"You can leave" UX** — info banner inside progress bar; start toast on import launch; beforeunload warning removed once job starts; secondary text for large imports explains push/email notification will follow
- **`importStore` Zustand store** — `src/stores/import-store.ts`; sessionStorage persistence; survives navigation and F5 refresh; tracks phase, row counts, image counts, timestamps, dismissal state
- **`ImportProgressBanner`** — fixed bottom-left floating pill on every (main) layout page while import runs; shows live % + label; View link + dismiss button; fires completion/failure toasts; clears store automatically on terminal state
- **`ImportProgressBannerClient`** — thin 'use client' wrapper following MobileNavClient pattern; mounted in (main)/layout.tsx
- **Unified weighted progress bar** — Phase 1 (listing creation) = 15%, Phase 2 (image fetching) = 85%; time estimate shown once Phase 2 >= 10% complete
- **Completion notifications** — `createNotification()` fires at end of startImportJob() on complete; in-app bell notification + web push (via existing sendPushNotification)
- **Phase 2 image quip** — rotating subtext below progress bar during image fetch; 4 stages keyed to completion %; varies by total image count

### Changed
- **`ImportProgressBar`** — rewritten: unified weighted bar replaces two-phase bars; polling writes to importStore instead of local state; beforeunload warning removed
- **`ImportPreviewTable`** — preview quip block added below 5-row table; driven by `getPreviewQuip(totalRows, totalImages)` from humor library
- **`startImportJob()`** — calls `createNotification()` on complete with import stats

---

## [4.7.0] — 2026-03-31 · Import Dedup & Bulk Delete (Cycle 36)

### Added
- **Import duplicate detection** — on file parse, automatically checks existing listings by SKU (exact match) or title+manufacturer+model combo; displays duplicate count badge in preview
- **Duplicate handling modes** — three options when duplicates detected: **Skip** (import only new rows), **Update** (update existing listings' fields + create new), **Create all as new** (original behavior); defaults to Skip
- **`checkImportDuplicates()`** server action — scans parsed rows against active/draft listings within the same company; returns duplicate count, new count, and matched SKUs
- **Bulk delete on My Listings page** — checkbox multi-select with "Select all" toggle; bulk "Remove N listings" destructive action bar; soft-deletes (status → removed)
- **Delete all from import** — trash icon on each import history entry; calls `bulkDeleteByImport()` to remove all listings created by that import job
- **`bulkDeleteListings()`** server action — accepts up to 1000 listing IDs; verifies ownership; soft-deletes in single query
- **`bulkDeleteByImport()`** server action — looks up `created_listing_ids` from import record; delegates to `bulkDeleteListings()`

### Changed
- **`startImportJob()`** accepts optional `duplicateMode` parameter (`create_new` | `skip` | `update`); defaults to `create_new` for backward compatibility
- **`ImportJobResult`** now includes `updatedCount` and `skippedCount` fields
- **`ImportPreviewTable`** shows duplicate handling card with mode selector when duplicates detected; shows "checking duplicates..." badge during scan
- **Import page** runs `checkImportDuplicates()` in background after parse; passes `duplicateMode` to `startImportJob()`; shows toast for skipped/updated counts on completion
- **My Listings page** has checkbox column on each non-removed listing; select all toggle; bulk action bar appears when selections active

---

## [4.6.0] — 2026-03-31 · Multi-Image Bulk Import (Cycle 36)

### Added
- **Multi-image bulk import** — two accepted formats: pipe-separated values in a single `image_url` column (`a.jpg|b.jpg|c.jpg`) or numbered columns (`image_url_1`, `image_url_2`, `image_url_3`...); both formats accepted simultaneously in the same file
- **`detectImageColumns()` utility** — inspects CSV/XLSX header row; detects single, numbered, and mixed image column configurations; supports image_url/photo_url/image/photo aliases with numeric suffix variants; sorted by suffix regardless of column position
- **`extractImageUrls()` utility** — merges and deduplicates image URLs from all detected columns per row; preserves insertion order; filters empty strings
- **Tier photo cap enforcement** — images per listing capped at plan photo limit (Free: 5, Pro: 20, Business: 30, Enterprise: 50) before fetching; excess silently skipped
- **`increment_import_counter()` Postgres function** — atomic counter increment for `listing_imports` counter columns; SECURITY INVOKER; strict column-name allowlist (image_fetch_attempted/succeeded/failed only); %I identifier quoting (defence-in-depth)
- **`scripts/migrate-import-counter.ts`** — one-time migration via Supabase Management API; verifies SECURITY INVOKER post-creation; safe to re-run (CREATE OR REPLACE)
- **`verifyImportCounter()` guard** — reads pg_proc (catalog only, no app table writes); runs at startImportJob() start; aborts with descriptive error if function missing or misconfigured; Phase 2 never runs with an unverified counter function
- **Multi-image preview badges** — `ImportPreviewTable` shows per-row image count and total image/listing summary below preview table
- **Updated CSV template** — `image_url_1/2/3` columns with example values; format hints document both pipe-separated and numbered column formats
- **11 unit tests** for `detectImageColumns()` and `extractImageUrls()` in `import-multi-image.test.ts`

### Changed
- **`ParsedRow.image_url`** (string) → **`ParsedRow.image_urls`** (string[])
- **`ParseResult.detectedImageColumnCount`** added — max image columns detected in file
- **Image fetch counters** now track total images across all listings (not listing count)
- **Phase 2 image fetching** loops over `image_urls[]` per listing with position assignment

### Security
- `increment_import_counter` uses SECURITY INVOKER — runs with service role privileges, not superuser; no privilege escalation possible
- column_name allowlist inside function raises Postgres exception on any value outside the three counter columns — defence-in-depth alongside %I identifier quoting
- GRANT EXECUTE restricted to service_role — anon/authenticated roles cannot call directly
- Schema management strictly separated from application code — no DDL in request handlers

---

## [4.5.1] — 2026-03-30 · Listing Creation Router (Cycle 36)

### Added
- **`/listings/create` routing page** — server component checks subscription tier and routes accordingly
- **Two-card choice UI** — Pro/Business/Enterprise users see single listing vs bulk import cards; Free users are server-redirected to `/listings/new` with no flash

### Changed
- **All "Post a Listing" / "List Equipment" CTAs** updated to route through `/listings/create` (header, mobile menu, dashboard, my listings, inventory, checkout success)
- Bulk import page now discoverable from every listing creation entry point

---

## [4.5.0] — 2026-03-30 · Super Admin Account Deletion (Cycle 35)

### Added
- **Soft delete (archive)** — superadmins can archive accounts: bans user, archives listings, cancels SOS requests, suspends company memberships, cancels Stripe subscription; fully reversible via "Reactivate Account"
- **Hard delete (permanent wipe)** — requires typing "DELETE" to confirm; deletes profile, listings, SOS, feed posts, credits, notifications, saved searches, company memberships; anonymizes seller reviews (seller_id → null); replaces sent message content with "[Message from deleted account]"; deletes Supabase Auth user
- **R2 cleanup queue** — `r2_cleanup_queue` table queues R2 media keys for async deletion; processed by existing daily `/api/cron/cleanup` (max 50 per run)
- **DeleteAccountPanel** — client component in admin user detail page; mode selection (archive/permanent), reason field, hard delete confirmation gate; only rendered for superadmins
- **Reactivation banner** — soft-deleted user detail shows orange banner with archive date, reason, and "Reactivate Account" button
- **Pre-delete warnings** — sole company owner detection, superadmin-to-superadmin block, self-deletion prevention

### Changed
- **FK constraints** — `reviews.seller_id`, `conversations.buyer_id/seller_id`, `messages.sender_id` changed from ON DELETE CASCADE to ON DELETE SET NULL (preserves conversations and anonymized reviews after hard delete)
- **Messages table** — added `is_deleted` and `deleted_content_replacement` columns for soft-delete support
- **Profiles table** — added `deleted_at`, `deletion_type`, `deleted_by`, `deletion_reason` columns
- **Cron cleanup** — R2 cleanup queue processing added to `/api/cron/cleanup` route

---

## [4.4.0] — 2026-03-30 · Bulk Inventory Import Upgrade (Cycle 34)

### Added
- **Excel (XLSX/XLS) import** — parse spreadsheets via ExcelJS; reads first sheet automatically
- **Google Sheets import** — paste a public sheet URL; server fetches as CSV via Google export endpoint
- **Image URL fetching** — `image_url` column detected in import; server-side fetch + R2 upload via `media.ts`; fail-open (image failure never blocks listing creation)
- **Flexible column mapping** — aliases for common column names (e.g., "make" → manufacturer, "qty" → quantity, "photo url" → image_url)
- **Two-phase progress bar** — Phase 1: listing creation count; Phase 2: image fetch count; polls every 2 seconds via `GET /api/import/progress/[importId]`
- **Import preview table** — shows first 5 rows with column mapping status (green = mapped, yellow = ignored), image URL count badge
- **Completion summary** — created/failed/images imported/image failures with expandable error details per row
- **Tier limit check** — warns user before import if rows exceed remaining listing allowance; processes up to limit
- **`beforeunload` warning** — prevents accidental navigation during active import
- **File parser module** — `src/lib/import/parse-file.ts` with `parseCSV()`, `parseXLSX()`, `parseGoogleSheet()`, `getMappedHeaders()`
- **Image fetcher module** — `src/lib/import/fetch-image.ts` with URL validation, 15s timeout, 10MB size limit, content-type check

### Changed
- **Import page UI** — fully reworked with three-tab format switcher (CSV / Excel / Google Sheets), drag-and-drop upload zone
- **Import status labels** — "Premium Feature" → "Pro Feature"; import creates listings as `active` (was `draft`)
- **Import history** — shows file format badge, image count, supports null filenames (Google Sheets)
- **`listing_imports` table** — added columns: `company_id`, `file_format`, `processed_rows`, `successful_rows`, `failed_rows`, `image_fetch_attempted/succeeded/failed`, `status` (6 states), `error_log`, `created_listing_ids`
- **Page subtitle** — "Bulk import equipment listings from a CSV file" → "Bulk import from CSV, Excel, or Google Sheets"

---

## [4.3.0] — 2026-03-30 · Social Feed Tightening (Cycle 33)

### Added
- **Activity status indicators** — green/yellow dot on post author avatars showing recent login activity; `formatActivityStatus()` utility in `src/lib/utils/time.ts`
- **Activity label** — muted "Active 44m ago" text below post author name when recently active (hidden >7 days)
- **URL linkification** — raw URLs in post content rendered as clickable links; trailing punctuation stripped; hashtags/mentions not double-processed
- **Scroll position restoration** — feed remembers scroll position when navigating to profiles/hashtag pages and restores on return

### Changed
- **Profile links on posts** — author avatar, name, and company name all link to `/companies/[slug]` (if company) or `/sellers/[id]`
- **Post card hover state** — subtle `hover:bg-muted/30` transition on post cards
- **Timestamp tooltip** — relative time shows full datetime on hover via `title` attribute
- **FeedComposer character counter** — only visible at 800+ characters (was always visible); turns red at 950+
- **FeedComposer placeholder** — updated to "Share an update, equipment tip, or industry insight..."
- **Image preview close button** — enlarged to 44px touch target for mobile
- **Load More** — shows skeleton posts instead of spinner while loading
- **Feed query** — `getFeedPosts()` now includes `last_login_at` from profiles for activity indicators

---

## [4.2.0] — 2026-03-27 · Plant Manager Dashboard (Cycle 32)

### Added
- **Trusted Vendors system** — `company_favorites` table with RLS; users can favorite companies via heart button on company pages
- **Heart/favorite button** on `/companies/[slug]` — optimistic UI toggle, hidden for own company and anonymous users
- **TeamActivityWidget** — dashboard widget showing team members' last-active status (green/yellow/gray dot), role badges, and up to 3 recently viewed listing thumbnails per member
- **TrustedVendorsWidget** — dashboard widget showing favorited companies with remove button (optimistic UI) and empty-state CTA
- **NewListingsSnipeFeed** — dashboard widget surfacing listings from last 72 hours matching user's equipment interests; "NEW" badge on listings <6 hours old
- **Server actions:** `src/app/actions/trusted-vendors.ts` (getTrustedVendors, addTrustedVendor, removeTrustedVendor, isCompanyFavorited) and `src/app/actions/team-activity.ts` (getTeamActivity, getSnipeListings, hasEquipmentInterests)

### Changed
- **Dashboard** — three new plant manager widgets inserted between ProblemDiagnoser and SellerIntelligence; all widget data fetched in parallel; NewListingsSnipeFeed only shown when user has equipment interests

---

## [4.1.0] — 2026-03-27 · Mobile Input Zoom Fix + AI Image Auto-Gallery + SOS Camera-First (Cycle 31)

### Added
- **Camera-first SOS flow** — 4-step wizard: Capture → AI Processing → Confirm → Sent; default experience on `/sos/create`
- **SOSCaptureStep** — large tappable camera zone with mobile `capture="environment"`, gallery upload, up to 10 photos, thumbnail grid with delete
- **SOSProcessingStep** — parallel R2 upload + AI equipment identification via `/api/listings/analyze-image`; rotating status animation; 15s timeout fallback
- **SOSConfirmStep** — AI pre-filled description (editable), urgency toggle (Normal/Critical with `#FF6B2B` orange), thumbnail strip with add/delete, collapsible "More details" section (brand, category, subcategory, quantity, budget)
- **SOSSentStep** — confirmation screen with vendor count (or fallback message), dashboard link, reset flow
- **SOSCameraFirstFlow** — orchestrator managing shared state across all 4 steps

### Changed
- **SOS create page** — camera-first flow is now the default; "Skip — describe it in text instead" link falls back to existing Quick SOS text + detailed form (both preserved, untouched)
- **iOS Safari zoom fix** — global `font-size: max(16px, 1em)` on all input/select/textarea elements prevents viewport zoom on focus
- **AI image auto-gallery** — images uploaded during AI analysis are now uploaded to R2 in parallel and carried forward to the Photos step as preloaded images
- **Listing form** — stable `listingId` UUID generated at form mount via `crypto.randomUUID()`, used consistently for all R2 uploads
- **Photos step** — preloaded AI images shown with "Carried over from AI analysis" label, individual delete buttons, max photo cap includes preloaded images

---

## [4.0.1] — 2026-03-24 · Launch Prep — SEO, Empty States, OG Images, Sitemap (Cycle 30)

### Added
- **`JsonLd` component** (`src/components/json-ld.tsx`) — reusable JSON-LD structured data injector for SEO
- **Product schema** on listing detail pages — includes name, description, price, condition, availability, seller organization
- **LocalBusiness schema** on company pages — includes address, aggregate rating (when reviews exist)
- **Organization schema** on homepage — Metal Gear branding, founding location, area served
- **OG image templates** — four typed templates via `/api/og?type=`: `default`/`home`, `listing` (image + price + condition), `company` (logo + location + listing count), `category` (category name + count)
- **Canonical URLs** on listing, company, and seller pages via `alternates.canonical` in `generateMetadata`
- **Feed page `noindex`** — personalized feed excluded from search engine indexing
- **Sitemap expansion** — now includes company pages (500), seller storefronts (200), quality-filtered listings (quality ≥50 priority, plus recent), top 100 hashtag pages from `feed_hashtags`
- **robots.txt overhaul** — explicit allow for `/feed/hashtag/`; disallow for all protected routes (feed, dashboard, admin, settings, messages, notifications, profile, credits, invite, onboarding, companies/new)
- **Image priority** on first 4 listing card images in search grid view for better LCP

### Changed
- **`EmptyState` component** — enhanced with icon, dual-action buttons (primary + secondary), theme-aware styling using `text-foreground`/`text-muted-foreground`
- **Search empty state** — improved with emoji icon, broader guidance text, clear filters CTA
- **Messages empty state** — added heading, contextual description, "Browse Equipment" CTA
- **SOS dashboard empty state** — added emoji icon, "Update Your Categories" CTA link
- **Notifications empty state** — added heading, descriptive text about notification types
- **Homepage metadata** — explicit `generateMetadata` with Houston/TX keywords, typed OG image, canonical URL
- **Listing metadata** — title now includes price; OG image uses typed query params instead of DB lookup
- **Company metadata** — OG image uses typed company template with logo, location, listing count
- **Seller metadata** — added canonical URL and `siteName` in OpenGraph

---

## [4.0.0] — 2026-03-24 · Seller Intelligence Dashboard & Listing Freshness AI (Cycle 29)

### Added
- **Seller Intelligence Dashboard** — "Your Performance This Month" widget on dashboard with quality grade (A–F), 30-day view count, active listing count, and generic quality improvement tips (all free tier)
- **Tier-gated comparative intelligence** — Pro+ users see views vs platform benchmark bar, offer acceptance rate, top performing listing, specific quality improvement tips, and demand forecast signals
- **`LockedMetric` component** — reusable locked-state card with blurred placeholder, lock icon, contextual upgrade reason, and "Upgrade to Pro →" CTA for free-tier users
- **`PerformanceBar` component** — benchmark comparison bar (green if above average, yellow if below) for Pro+ seller metrics
- **Listing Freshness AI cron** (`/api/cron/listing-freshness`, daily 10:00 UTC) — identifies active listings older than 45 days with no recent offers, generates Claude-powered refresh suggestions (title rewrite, price check, description tip), emails seller regardless of tier
- **`listing_freshness_suggestions` table** — stores AI suggestions per listing with unique active-suggestion constraint preventing duplicates; RLS for seller access
- **`listings.refreshed_at` column** — timestamped when seller acts on a freshness suggestion; indexed for active listings
- **"Recently Updated" badge** — shown on listing cards (search grid/list) and listing detail page when `refreshed_at` is within 14 days; visible to all users
- **Freshness email template** — branded dark-theme HTML email with suggested title, optional price suggestion, description tip, and "Update My Listing" CTA
- **`markFreshnessSuggestionActedOn` server action** — marks suggestion as acted on and sets `refreshed_at` on listing; called automatically from listing edit page on save

### Changed
- **Dashboard page** — added `SellerIntelligence` widget between problem diagnoser and seller widgets; only renders when user has listings or is on a paid tier
- **Listing edit page** — calls `markFreshnessSuggestionActedOn` after successful listing update
- **`vercel.json`** — added listing-freshness cron schedule
- **Supabase types** — regenerated to include `listing_freshness_suggestions` table and `refreshed_at` column

---

## [3.9.0] — 2026-03-24 · Team Invites, Seat Limits & Annual Billing (Cycle 28)

### Added
- **Team invites** — company owners/admins can invite colleagues via email with token-based links; invitees accept via `/invite/[token]`, create an account (or log in), and are added to the company
- **Seat limits per tier** — Free: 1 seat, Pro: 3 seats, Business: 8 seats, Enterprise: unlimited; enforced at invite creation and invite acceptance
- **Seat usage indicator** — progress bar on team members page showing "X of N seats used" with upgrade CTA at limit
- **Invite management** — pending invites list with revoke option; duplicate invite and existing member detection
- **Annual billing toggle** — 20% discount for annual commitment on pricing page; monthly/annual switch with "Save 20%" badge
- **Annual pricing** — Pro Annual at $143/mo ($1,720/year), Business Annual at $279/mo ($3,350/year); Enterprise shows "Contact Sales" for annual
- **`billing_period` column** — `subscriptions` table now tracks `monthly` or `annual` billing period
- **`company_invites` table** — token-based invite records with 7-day expiration, RLS, and indexes
- **Invite email template** — branded HTML email via Resend with "Accept Invite" CTA
- **Dashboard welcome banner** — dismissible blue banner on `?joined=true` confirming team membership
- **Enterprise tier on pricing page** — fourth pricing card with unlimited features and "Contact Sales" CTA

### Changed
- **Pricing page redesigned** — 4-column layout (Free, Pro, Business, Enterprise) with team seat counts, annual/monthly toggle, and updated comparison table
- **Stripe webhook** — now stores `billing_period` from checkout metadata or price interval on subscription create/update
- **Checkout flow** — passes `billingPeriod` metadata to Stripe for annual vs monthly tracking
- **`getTierFromPriceId`** — handles annual Business price ID mapping
- **Team members page** — removed "Coming soon" placeholder; added invite form, pending invites, and seat bar
- **Middleware** — `/invite/` routes exempt from auth redirect and company guard

---

## [3.8.5] — 2026-03-21 · AI Image Analyzer Upgrade (Cycle 27c)

### Added
- **Multi-image analysis** — wide shot + nameplate sent in a single Claude API call for cross-referenced equipment identification; Image 1 context informs nameplate OCR in Image 2
- **Confidence scoring** — per-field confidence scores (0.0–1.0) on all analysis results; `overallConfidence` metric averages critical fields (equipment_type, manufacturer, model, taxonomy, title)
- **Auto re-prompt** — when `overallConfidence < 0.55`, automatically makes a second Claude call targeting low-confidence fields; merges higher-confidence results into original
- **Client-side image quality validation** — `validateImageQuality()` in `src/lib/ai/image-quality.ts` checks resolution, brightness, blur (Laplacian variance), and file size before upload
- **Quality error UI** — blocking red banners for too-dark/too-small/corrupt images with "Retake Photo" button; non-blocking yellow warnings for potential blur
- **Confidence indicators** — green/yellow/red dots next to each field in results step; low-confidence fields get yellow border and "Please verify" placeholder
- **Overall confidence banner** — color-coded banner at top of results: green (high), amber (medium, verify highlighted), red (low, manual review)
- **Analysis mode label** — results show "Analyzed 1 image" or "Analyzed 2 images" with "(refined)" suffix when re-prompted
- **Equipment prompts module** — `src/lib/ai/equipment-prompts.ts` with structured system prompt, single/multi-image analysis prompts, and clarification prompt builder

### Changed
- **Analyze button** — dynamic label: "Analyze Both" when both images present, "Analyze Equipment" for single image
- **Processing step** — shows "Analyzing 2 images..." in multi-image mode
- **API route** — rewritten to use structured JSON output with confidence scores via system prompt; single unified Claude call replaces separate wide-shot + nameplate calls
- **Types** — `AIAnalysisResult` extended with `confidenceScores`, `overallConfidence`, `lowConfidenceFields`, `analysisMode`, `wasReprompted`; all new fields optional for backward compatibility

---

## [3.8.4] — 2026-03-21 · Mobile Nav Flatten + Compose Sheet + SOS Feed Banner (Cycle 27b-2)

### Added
- **Compose sheet** — new `MobileComposeSheet` bottom sheet with three actions: New Post, List Equipment, and Send SOS (orange, urgent badge)
- **SOS feed banner** — dismissible orange CTA banner above feed content on mobile; persists dismiss state in localStorage
- **Compose deep link** — `/feed?compose=true` query param auto-focuses the feed composer textarea on navigation

### Changed
- **Mobile bottom nav flattened** — replaced raised SOS center tab with flat [+] compose button (`bg-primary` circle); all 5 tabs now same height (56px), no raised/elevated button
- **Tab labels updated** — "Search" renamed to "Browse" for consistency with desktop nav
- **SOS Dashboard moved** — SOS Dashboard now accessible via hamburger menu drawer (renamed from "SOS Broadcast" to "SOS Dashboard")
- **FeedComposer** — added `data-feed-composer` attribute for programmatic focus from compose sheet

---

## [3.8.3] — 2026-03-21 · Desktop Feed Layout — Facebook 3-Column (Cycle 27b-1)

### Added
- **Three-column desktop feed layout** — Facebook-style layout with persistent left sidebar (280px), center feed (max 680px), and right sidebar (340px); `xl:` shows all three, `lg:` shows center + right, `md` and below shows center only
- **Left sidebar** — sticky full-height navigation with profile card, primary nav links (Feed, Browse, Dashboard, Messages, SOS, Radar, Credits), active route highlighting, company switcher for multi-company users, and footer links
- **Active SOS row** — horizontal scrollable row above feed composer showing equipment-matched SOS requests with urgency badges, time-ago display, and a persistent "Send SOS" card; graceful empty/no-interests states
- **Right SOS widget** — up to 5 urgency-colored SOS alerts matching user equipment interests with company names, time-ago, and urgency indicators
- **Right discovery widget** — "Recently Listed For You" showing up to 5 equipment-interest-matched listings with thumbnails, prices, and locations
- **`getFeedSOSAlerts()` server action** — fetches open SOS requests matching user equipment interests with company name join, ordered by urgency then recency

### Changed
- **Feed page restructured** — moved from single-column + trending sidebar to 3-column layout; discovery blocks still interleaved in center feed
- **TrendingHashtags sidebar removed from feed** — replaced by more relevant SOS alerts and equipment discovery widgets in the right sidebar
- **FeedPageClient simplified** — removed internal grid layout (sidebars now handled by parent); removed `trendingHashtags` prop
- **Unread message count** — now fetched in feed page for left sidebar badge display

---

## [3.8.2] — 2026-03-18 · Comments, Hashtags, Mentions & Notifications (Cycle 27a-2)

### Added
- **Inline comments** — lazy-loaded comment section on each feed post; expand/collapse toggle with live count sync; oldest-first conversation order; 500 char limit
- **Comment actions** — delete own comments (soft-delete with confirmation), report others' comments; atomic `increment_post_comments`/`decrement_post_comments` Postgres functions
- **@Mention autocomplete** — real-time dropdown in feed composer triggered by `@`; debounced search (200ms) against `pg_trgm` GIN-indexed profiles + company names; keyboard navigation (arrows, Enter/Tab, Escape); prefix-match priority sorting
- **Mention resolution** — `@mentions` in feed post content resolve to display names with clickable navigation to `/companies/[slug]` or `/sellers/[id]`
- **Hashtag pages** — `/feed/hashtag/[tag]` with SSR metadata, post count from `feed_hashtags.post_count` (O(1), no COUNT query), cursor-based pagination, empty state
- **Trending hashtags sidebar** — top 10 hashtags (7-day window) in sticky desktop sidebar at `lg:` breakpoint; `unstable_cache` with 1-hour TTL; auto-invalidated on post create/delete
- **Two-column feed layout** — feed content + 280px trending sidebar on desktop; single column on mobile
- **Mention search API** — `/api/feed/mentions-search` with auth gate, 60 req/min rate limit, parallel user+company trigram search
- **Notification types** — `post_comment` (someone commented on your post) and `post_mention` (you were @mentioned); fire-and-forget delivery via `Promise.allSettled`; self-comment/self-mention guards
- **Database migration** — `feed_post_comments` table with RLS, partial index on active comments, author index; `pg_trgm` extension + trigram GIN indexes on `profiles.display_name` and `company_profiles.name`
- **Server-side caching** — `getPostComments` (15s TTL, per-post tag), `getTrendingHashtags` (1hr TTL), `resolveMentionedUsers` (5min TTL); surgical cache invalidation per post

---

## [3.8.1] — 2026-03-18 · Social Feed Layer (Cycle 27a-1)

### Added
- **Social feed posts** — users can write posts with text (1000 char limit), hashtags, @mentions, and attach up to 4 images or 1 video; posts appear in a reverse-chronological feed on `/feed` above discovery blocks
- **Feed composer** — inline composer with XHR upload progress, hashtag preview, image/video selection, and company branding display
- **Feed post cards** — full-featured post cards with author/company info, relative timestamps, "Edited" label, content rendering with highlighted hashtags and mentions
- **Image grid layouts** — adaptive 1/2/3/4 image layouts with inline lightbox (keyboard nav, prev/next arrows)
- **Like reactions** — optimistic toggle with atomic Postgres count functions; server-synced count on response
- **Post editing** — in-place edit within 15-minute window of creation; server-side timestamp check authoritative
- **Post deletion** — soft-delete with confirmation dialog; fire-and-forget media cleanup from R2/Stream
- **Post reporting** — report dialog with reason selection (Spam, Misinformation, Inappropriate, Harassment, Other); inserts into existing reports table
- **Feed toggle** — "All Posts" / "For You" pill toggle with localStorage persistence; For You uses CTE-based Postgres function matching equipment interests and industries
- **Feed pagination** — cursor-based "Load More" with post/discovery block interleaving
- **Feed post moderation** — "Feed Posts" tab in admin moderation queue with view, delete, dismiss actions and pagination
- **Media upload API** — `/api/feed/upload-media` with auth gate, size validation (10MB images, 200MB videos), in-memory rate limiting (20/10min), video processing status polling
- **Database tables** — `feed_posts`, `feed_post_media`, `feed_post_reactions`, `feed_hashtags` with RLS policies
- **Performance indexes** — partial index on active posts, GIN on hashtags/industries, composite indexes for For You CTE
- **Atomic Postgres functions** — `get_for_you_feed`, `upsert_feed_hashtags`, `decrement_feed_hashtags`, `increment_post_reactions`, `decrement_post_reactions`
- **Server-side caching** — `unstable_cache` with 30s TTL and `updateTag('feed-posts')` invalidation on writes
- **Time utility** — `formatRelativeTime()` in `src/lib/utils/time.ts`

---

## [3.8.0] — 2026-03-18 · Personalized Feed, Company Pages & Desktop SOS (Cycle 27)

### Added
- **Personalized Discovery Feed** — `/feed` route with curated content blocks: "For You" listings based on equipment interests, active SOSs in matching categories, recently reduced price drops, saved search matches, and demand signals (Pro+ only)
- **Public Company Pages** — `/companies/[slug]` public-facing B2B company profile with hero banner, logo, stats (listings, rating, members, member since), active listings grid, and aggregate reputation with star distribution and recent reviews; SEO-indexed with Open Graph metadata
- **Desktop SOS Popover** — `SosNavPopover` component replaces direct SOS link in desktop nav with a two-row popover dropdown ("Send SOS" + "SOS Dashboard"), no overlay/modal; closes on outside click and Escape key; mobile bottom sheet unchanged
- **Feed data seeding** — `scripts/seed-feed-data.ts` seeds equipment interests, business profiles, listing views, and saved searches for existing test users

### Changed
- **Home tab destination** — desktop nav and mobile bottom nav Home tab now navigates to `/feed` instead of `/search`; Search tab still goes to `/search`
- **Desktop nav restructure** — added explicit Search tab, moved SOS to popover at end of nav bar
- **Middleware** — `/companies/[slug]` paths exempt from auth redirect (public access); `/feed` added to protected routes

---

## [3.7.0] — 2026-03-18 · Notifications, Sound Design & OS Theme Sync (Cycle 26)

### Added
- **Notification sounds** — two distinct audio tones generated programmatically: standard metallic ping for messages/responses, industrial two-tone pulse for high-priority SOS alerts and high-value offers (>$10K)
- **Repeating alert cadence** — high-priority notifications repeat the alert sound up to 3 times at 2-minute intervals if unacknowledged; acknowledging via bell dropdown or navigating to SOS stops the cadence
- **Sound preference toggles** — "Notification sounds" and "High-priority alert sounds" on/off switches in Profile → Notification Sounds card; persisted in localStorage
- **Notification education modal** — branded Dialog explaining SOS alert value before browser permission prompt; triggered post-onboarding (`?onboarded=true`) and on first bell click when permission is `default`
- **Persistent notification nudge** — "Enable notifications to get real-time SOS alerts" banner in notification dropdown for users who haven't granted permission
- **Three-state ThemeToggle** — Auto (system) → Light → Dark cycle with Monitor/Sun/Moon icons; shows current resolved theme in title

### Changed
- **Default theme** — changed from `dark` to `system` (OS auto-detection); existing users with a saved preference are unaffected
- **ThemeProvider** — added `storageKey="metal-gear-theme"` for explicit localStorage key
- **Onboarding redirect** — now navigates to `/dashboard?onboarded=true` to trigger notification education modal

---

## [3.6.0] — 2026-03-18 · AI Professor Mode (Cycle 25)

### Added
- **AI Professor Mode** — Ask Metal Gear detects compatibility/suitability questions and enters follow-up mode, gathering 2–4 process-specific questions before rendering a direct yes/no verdict with reasoning
- **Equipment-category-aware question bank** — professor follow-up questions tailored by equipment type (centrifuges, pumps, mixers, heat exchangers, compressors, generators, CNC machines)
- **Alternative equipment suggestions** — AI honestly recommends against the listed item when it's a poor fit, names specific alternatives, and provides clickable search suggestion buttons
- **Search suggestion cards** — `[SEARCH_SUGGESTION]` markers in AI responses render as styled "Search for X →" buttons that navigate to `/search?q=...` for conversational AI search
- **Updated starter question chips** — professor-mode prompts ("Is this compatible with my process?", "What specs should I verify?", "What's the alternative?", "Help me evaluate") replace generic Q&A chips; category-aware variants per equipment type

### Changed
- **Ask Metal Gear system prompt** — upgraded from simple Q&A assistant to senior process engineer persona with 20+ year expertise; injected listing specs, condition, and category at request time
- **Rate limiting** — changed from 20 req/hr IP-based to daily caps: 10/day for free users, 100/day for Pro+ subscribers; tier detected via `x-user-id` header
- **Max tokens** — increased from 512 to 768 to accommodate professor-mode multi-question responses
- **Subtitle copy** — "Get instant answers" → "AI equipment expert — ask about compatibility, specs, or alternatives"
- **Input placeholder** — updated to "Ask about compatibility, specs, or alternatives..."

---

## [3.5.0] — 2026-03-18 · Contact Credit System (Cycle 24)

### Added
- **Contact credit system** — users spend credits to reveal seller contact info; replaces simple Pro+ tier gate from Cycle 22
- **Tiered monthly allowances** — Free: 0, Pro: 25, Business: 75, Enterprise: unlimited; credits reset on the 1st of each month
- **Credit reveal interaction** — "Reveal Contact Info — 1 credit" button on listing detail; same-month re-reveals are free (idempotent)
- **Stripe credit pack purchases** — Starter (10/$29), Standard (30/$69), Pro Pack (100/$179) one-time purchases via Stripe Checkout
- **`/credits` page** — balance display, monthly allowance table, credit pack purchase, transaction history (reveals + purchases)
- **Admin credit management** — grant credits from user detail page; configure allowances, per-credit costs, and pack pricing in Admin Settings → Contact Credits
- **Monthly credit reset cron** — `/api/cron/reset-credits` runs 1st of month at 6am UTC; reseeds all users based on tier
- **Admin-editable config** — credit allowances, extra credit costs, and pack definitions stored in `system_config` table; changes take effect immediately
- **New DB tables** — `contact_credits` (ledger), `contact_reveals` (reveal log with monthly dedup), `credit_purchases` (Stripe purchases)

### Changed
- **Listing detail contact section** — replaced tier-gated display with credit-based reveal UI; shows masked values, credit balance, and reveal/upgrade/buy prompts based on user state
- **Stripe webhook** — now handles `credit_purchase` checkout sessions alongside subscriptions and boosts
- **Header navigation** — added "My Credits" link in desktop user dropdown and mobile menu drawer

---

## [3.4.0] — 2026-03-18 · Role-Aware Onboarding Redesign (Cycle 23)

### Added
- **Three user archetypes** — Operator (plant/facility managers), Trader (dealers/rebuilders/resellers), Service Provider (logistics/rigging/machine shops); archetype selection is the first onboarding step
- **Branching Step 3** — role-specific questions per archetype: operators get sub-role + sourcing methods, traders get trading activities + monthly volume, service providers get service types + service area
- **Multi-industry selection** — users pick from 12 industry options (with "Other" free-text); replaces single industry dropdown
- **Equipment type multi-select** — all 28 Tier 2 taxonomy groups as toggle chips; seeds feed and SOS matching via `user_equipment_interests`
- **SOS opt-in at onboarding** — toggle (default ON) captured during Step 4
- **Contact visibility at onboarding** — three options (Pro+, Everyone, Messaging only) mapped to `profiles.contact_visibility`
- **New DB columns** — `archetype`, `sub_role`, `trading_activities`, `service_types`, `service_area`, `sourcing_methods`, `monthly_volume`, `sos_opted_in` on `user_business_profiles`

### Changed
- **Onboarding flow redesigned** — from 6 generic steps to 5 role-aware steps with archetype branching
- **Single-submit pattern** — all form data held in client state until final "Finish Setup"; no partial DB saves during onboarding
- **Existing users unaffected** — onboarding guard only redirects users without `onboarding_completed: true`

### Fixed
- **Onboarding → company prefill** — company name, city, state, phone, and first industry from onboarding carry over into `/companies/new` form; no re-entry needed
- **Onboarding → profile carryover** — display name, company name, city, state, phone, and contact visibility written to `profiles` on completion
- **Company industry list expanded** — industry dropdown on company creation now includes all onboarding industries (Food & Beverage, Pharmaceutical, Plastics & Chemicals, Dairy, Pulp & Paper, Power Generation)
- **Onboarding completion redirect** — "Finish Setup" now navigates to dashboard via full page load (middleware routes to `/companies/new` if no company yet); previously stayed on Step 5
- **Selection highlighting** — all toggle chips use `border-2` for clearly visible blue border on selection
- **Save error handling** — non-critical DB writes (profiles, legacy onboarding progress) wrapped in try-catch so they can't break the main save

---

## [3.3.0] — 2026-03-18 · Mobile Listing Actions, Radar, Feed Nav & Seller Contact (Cycle 22)

### Added
- **Mobile listing actions complete** — Make Offer (orange, primary), Contact Seller (outlined), and Save to Radar (heart icon) all functional in `MobilePurchaseBar`; Sheet expansion shows full purchase panel
- **Seller contact info system** — new `contact_email` and `contact_visibility` columns on `profiles` table; sellers set visibility preference (Pro+ only, Everyone, Hidden) in profile settings
- **Tier-gated contact display** — eligible viewers (Pro/Business/Enterprise) see seller phone and email on listing detail page; ineligible viewers see masked values with upgrade prompt; hidden = no contact section
- **Contact info anti-harvest** — contact data rendered server-side only, never exposed via client-side API; embedded in HTML only when server confirms eligibility
- **Dashboard in menus** — Dashboard added to desktop header user dropdown and accessible from mobile hamburger menu Account section

### Changed
- **Collections → Radar** — all UI-facing text renamed: "Collections" → "My Radar", "Collection" → "Radar List", "Add to Collection" → "Add to Radar", etc. Routes (`/collections`) and DB tables unchanged
- **Home → Feed** — Home tab in mobile bottom nav and desktop logo now navigate to `/search` (browse/discovery page) instead of `/dashboard`; Dashboard replaced Browse Equipment in desktop nav bar
- **Save Listing → Save to Radar** — listing detail page CTA and toast messages updated

---

## [3.2.1] — 2026-03-13 · Admin Light Theme, Sidebar Redesign & Tier Fix (Cycle 21 Polish)

### Fixed
- **Admin light theme** — replaced hardcoded dark colors (`bg-[#0D0D14]`, `border-white/5`, `bg-surface`) with CSS variable classes (`bg-card`, `border-border`, `bg-muted`) across all 12 admin pages so light/dark theme works correctly
- **Admin avatar display** — added `unoptimized` prop for external avatar URLs; replaced invalid `bg-surface` with `bg-muted` for avatar placeholder circle; added `lh3.googleusercontent.com` to Next.js image remotePatterns for Google OAuth avatars
- **Dashboard crash for new tiers** — `TIER_LIMITS` in `src/lib/constants.ts` only had old tier names (`free`/`premium`/`boost`); accessing `TIER_LIMITS['enterprise']` returned `undefined` causing `TypeError: Cannot read properties of undefined (reading 'listings')`; added `pro`/`business`/`enterprise` tiers with legacy aliases
- **Subscription DB constraints** — updated `subscriptions_tier_check` to allow `pro`/`business`/`enterprise`; fixed `canceled` spelling (single L) in `setUserSubscriptionTier` to match `subscriptions_status_check` constraint
- **Admin tier override** — fixed return-based error handling in `setUserSubscriptionTier`; fixed `getChurnRiskDetail` from `.single()` to `.maybeSingle()` to prevent crash on missing churn data

### Changed
- **Admin sidebar redesigned** — logo header now Facebook blue (`#1877F2`) with white text; sidebar body dark navy (`#1B2838`); active nav item solid blue pill; Ocean palette variant with deep navy + teal accents
- **Tier constants updated** — `TIER_LIMITS`, `TIER_PRICES`, `TIER_LABELS` in `src/lib/constants.ts` now include `pro` ($179/mo, 25 listings), `business` ($349/mo, 100 listings), `enterprise` ($599/mo, unlimited) with `premium`/`boost` kept as legacy aliases

---

## [3.2.0] — 2026-03-13 · Mobile Cleanup, Thumbnail Restore & Admin Tier Control (Cycle 21)

### Fixed
- **Floating SOS FAB removed** — orange siren button no longer overlaps mobile content; SOS tab in bottom nav is the sole entry point
- **Floating help bubble removed from mobile** — no longer blocks taps on bottom-right content; AI Help Assistant now accessible via hamburger menu drawer
- **Listing thumbnails restored** — browse/search cards show primary image (16:10 aspect ratio) with gray placeholder for listings without photos
- **SOS nav tab** — now opens a two-option bottom sheet (Send SOS / SOS Dashboard) instead of navigating directly
- **Unread message badge** — Messages tab in mobile bottom nav now shows accurate unread count badge with real-time Zustand store updates
- **Favorites button** — heart icon on search/browse listing cards now properly toggles favorites with optimistic UI updates
- **Message image delivery** — recipients see images immediately via Realtime attachment subscription + retry polling; file-only messages show "Sent an image" instead of paperclip filename
- **Unread message count accuracy** — layout query now filters by user's conversations instead of all messages in the system

### Added
- **Admin subscription tier override** — superadmins can change any user's tier (Free/Pro/Business/Enterprise) from the user detail page without Stripe; logged to admin audit trail
- **AI Help Assistant** menu entry in MobileMenuDrawer (opens the same chat panel as the floating button)
- Favorite toggle + listing image state in search page for improved card UX

---

## [3.1.0] — 2026-03-10 · Facebook Color Palette + Mobile Responsive Overhaul (Cycle 20)

### Changed
- **Design system rebranded** — color palette migrated to Facebook's calm blue system:
  light mode (#F0F2F5 bg, #FFFFFF cards, #1877F2 primary blue, #050505 text, #CED0D4 borders);
  dark mode (#18191A bg, #242526 cards, #3A3B3C elevated surfaces, #E4E6EB text, #B0B3B8 muted)
- **Primary action color** — all primary buttons, links, and focus rings now use #1877F2 (Facebook blue)
  replacing the previous #FF6B2B orange (SOS elements intentionally preserved in orange)
- **Browse/search mobile UX** — filter sidebar replaced with bottom-sheet drawer on mobile (<lg);
  trigger bar shows active filter count badge; results grid responsive 1/2/3 columns
- **Post a listing** — step indicator abbreviated to "Step N of 5" on mobile; form sections stack
  vertically on narrow screens; navigation bar reordered for mobile
- **Global overflow** — html/body overflow-x-hidden; all layout wrappers audited
- **Admin CSS** — updated to match new Facebook palette; sidebar active color now blue

### Fixed
- Horizontal side scrolling eliminated on all pages at 390px viewport
- Filter sidebar no longer takes 75% of screen on mobile browse page
- Dashboard stat cards, profile form, storefront stats, listing creation — all responsive
- Hardcoded #FF6B2B orange and #3A8FD4 steel blue replaced with CSS variable references across 40+ files
- Email templates updated from orange to blue brand color

---

## [3.0.0] — 2026-03-10 · Multi-Company Profiles (Cycle 19)

### Added
- **`company_profiles` table** — B2B company entities with name, slug, logo, banner, industry, size, website, city/state
- **`company_memberships` table** — junction table linking users to companies with `owner`/`admin`/`member` roles; unique constraint on (company_id, user_id)
- **`company_role` enum** — PostgreSQL enum for membership roles
- **RLS policies** — row-level security on both new tables (members can read, owners can write)
- **`profiles.active_company_id`** column — persistent active company selection per user
- **`company_id` columns** — added to `listings`, `subscriptions`, `seller_storefronts`, `sos_requests` for company-scoped activity
- **`listings.display_name_override`** column — optional per-listing display name override
- **Company server actions** — `getUserCompanies`, `getCompanyBySlug`, `getCompanyById`, `getCompanyWithMembers`, `createCompany`, `updateCompany`, `removeMember` in `src/app/actions/company.ts`
- **Company context actions** — `switchActiveCompany`, `getActiveCompanyId` (cookie-first, DB fallback) in `src/app/actions/company-context.ts`
- **`CompanyAvatar`** component — logo with initials fallback
- **`CompanyContextProvider`** — Zustand hydration from SSR data
- **`CompanySwitcher`** — header pill variant (desktop) + drawer full-width variant (mobile)
- **Create Company page** — `/companies/new` with `CreateCompanyForm` client component
- **Company Settings page** — `/settings/company` with `CompanySettingsForm` client component
- **Team Members page** — `/settings/company/members` with `MembersList` and remove member action
- **Company guard in middleware** — redirects users without companies to `/companies/new` (exempt paths: auth, onboarding, API, marketing)
- **Migration script** — `scripts/migrate-companies.ts` creates companies from `user_business_profiles`, backfills `company_id` on listings/subscriptions/storefronts/sos_requests
- **`uploadCompanyLogo`** and **`uploadCompanyBanner`** media functions in `src/lib/media.ts`
- **`getActiveTier`** — company-first subscription tier check with user fallback in `src/app/actions/tier.ts`
- **Company types** — `CompanyProfile`, `CompanyMembership`, `CompanyWithRole`, `CompanyWithMembers` in `src/types/company.ts`

### Changed
- **Auth store** — added `activeCompany`, `userCompanies`, `setActiveCompany` (with cookie sync), `setUserCompanies`; cleared on sign out
- **Main layout** — fetches company data server-side; renders `CompanyContextProvider`; passes company data to mobile nav
- **Desktop header** — added `CompanySwitcher` (pill variant) + "Company Settings" link in user dropdown
- **Mobile menu drawer** — replaced subscription badge with `CompanySwitcher` (drawer variant); added "Company Settings" nav link
- **Dashboard** — shows "Acting as [Company Name]" banner with settings link
- **Listing detail page** — fetches and passes `company_profiles` to purchase panel and mobile bar
- **Listing purchase panel** — shows company logo/name as primary seller identity with "Listed by [user]" secondary line
- **Mobile purchase bar** — passes `company` prop through to purchase panel
- **Listing creation** — injects `company_id` from active company into both draft and publish inserts
- **Database types** — regenerated `src/types/database.ts` with all new tables/columns

---

## [2.2.0] — 2026-03-09 · Mobile Nav Redesign, Admin CSS Isolation, Ocean Palette (Cycle 18)

### Added
- **MobileHeader** — fixed 52px header with wordmark, search, notification bell (dot badge), and hamburger; no horizontal overflow at any viewport width
- **MobileBottomNav** — fixed 5-tab bottom nav (Home / Search / SOS / Messages / Profile); center SOS tab raised 16px above baseline with pulse glow; iOS safe area aware
- **MobileMenuDrawer** — right-sliding drawer (260ms), dimmed backdrop, profile card, quick-action tiles, grouped nav sections, upgrade CTA for free-tier users, theme toggle + sign out footer
- **MobileNavClient** — thin client wrapper for drawer state; all data fetched server-side in layout
- **Admin CSS isolation** — `src/app/(admin)/admin.css` with scoped `[data-section="admin"]` tokens; dark and light admin palettes; sidebar always dark in both themes
- **Ocean brand palette** — Deep Twilight (`#03045E`) to French Blue (`#023E8A`) to Teal Blue (`#0077B6`) to Turquoise (`#00B4D8`) to Light Cyan (`#CAF0F8`); full dark + light variants
- **Brand Palette Switcher** — `BrandPaletteSelector` component in Admin Settings; visual swatches, active badge, live preview on apply; persisted in `system_config` + cookie
- **`getPlatformPalette` / `setPlatformPalette`** server actions in `src/app/actions/palette.ts`
- **`PaletteProvider`** client component for client-side `data-palette` sync
- ThemeToggle added to admin header

### Changed
- `(main)/layout.tsx` — renders `MobileNavClient` server-side; adds `pt-[52px] pb-[72px]` on mobile, removed at `md:`
- Root layout — reads palette from cookie (fast) or `system_config` (fallback); sets `data-palette` on `<html>` server-side (no flash)
- `globals.css` — Ocean palette token blocks added under `[data-palette="ocean"]`; isolation comment added; no existing token changes

### Fixed
- Cycle 16 global `:root` CSS variables bleeding into admin section; scoped admin tokens now override correctly
- Mobile header horizontal overflow/side-scroll eliminated

---

## [2.1.0] — 2026-03-06 · Amazon-Style Listing Page, AI Help, Public QR Access (Cycle 17)

### Added
- **Amazon-style three-column listing page** — gallery (460px) / main content (flex) / sticky purchase panel (320px, `position: sticky; top: 80px`) replacing old two-column Apple-esque layout
- **ListingGallery component** — vertical thumbnail strip (72x72) on desktop with active border highlight, zoom on hover (`group-hover:scale-110`), prev/next arrows; mobile horizontal dot indicators with swipe navigation
- **Mobile touch swipe gallery** — native touch events with 50px threshold, horizontal vs vertical scroll detection, slide-in CSS animations (`slideInFromRight`/`slideInFromLeft`)
- **ListingPurchasePanel component** — bordered card with price, stock status, condition grade, quality score bar, Make Offer (orange), Contact Seller (blue outline), Save Listing CTAs, seller mini-card with trust score, buyer protection badge
- **ListingSpecs component** — Amazon-style alternating-row specs table, collapsible condition report with A-F grade badges and mechanical/cosmetic/electrical score bars
- **Ask Metal Gear AI chat** (`AskMetalGear` component + `POST /api/listings/[id]/ask`) — inline AI assistant on listing pages with streaming responses, 4 category-specific suggested question chips, session-only chat (no DB writes), 20 req/hr rate limit
- **ListingReviews component** — seller reviews with star distribution bars (Amazon-style), AI reputation summary callout, individual review cards, "See all reviews" link to storefront
- **ListingMainContent component** — title, badges, meta info, description with Read More truncation at 600 chars, share dropdown with QR code
- **MobilePurchaseBar component** — fixed bottom bar with price + "Make Offer" CTA, expanding to full purchase panel via shadcn Sheet bottom drawer
- **AI Help Assistant** — rebuilt floating help button as streaming AI chat panel (`POST /api/help/chat`), context-aware (current pathname), 4 starter question chips, Escape to close, 30 req/hr rate limit
- **AnonInteractionGate component** — reusable signup prompt modal with action-specific copy (offer/contact/save/ask), redirect-aware signup/login links (`/signup?redirect=/listings/[id]`)
- **Public listing access** — `/listings/[id]` now renders fully without authentication for QR codes and shared links; middleware exempts listing detail pattern from auth redirect
- **Anonymous user gating** — visitors can view full listing, read reviews, use Ask Metal Gear (3 free messages); Make Offer / Contact Seller / Save require account creation
- **Favorite toggle server action** (`favorite-action.ts`) — replaces old client-side Supabase favorite toggle
- **Gallery slide animations** in `globals.css` — `slideInFromRight`/`slideInFromLeft` keyframes for mobile swipe transitions
- **shadcn Sheet component** installed for mobile purchase drawer

### Changed
- **Listing detail page is now a Server Component** — data fetched server-side with `createAdminClient()`, passed to client sub-components; eliminates all client-side Supabase calls on the listing page
- **Help button** — transformed from static link (`/help`) to floating AI chat panel with streaming Claude responses
- **Middleware** — listing detail pages (`/listings/[id]`) and seller storefronts (`/sellers/[id]`) exempted from auth redirect for anonymous access
- **Condition reports query** — fixed `is_verified` → `is_verified_dealer` column reference in `getConditionReport`
- Draft listings remain auth-gated (404 for anonymous users)

### Fixed
- **RSC serialization error** — removed non-serializable function prop (`onToggleFavorite={() => {}}`) from Server→Client Component boundary; favorites now handled entirely via `toggleFavoriteAction` server action

---

## [2.0.0] — 2026-03-06 · Cloudflare R2 + Stream, Light/Dark Mode, Listing Redesign (Cycle 16-0)

### Added
- **Light/dark mode toggle** — site-wide theme switching via `next-themes` with `ThemeProvider`; `ThemeToggle` component (Sun/Moon icon) in header; system preference detection with `enableSystem`
- **Light mode color palette** — full `:root` light theme in `globals.css`: `#FAFAFA` background, `#FFFFFF` cards, `#18181B` foreground, semantic border/muted/accent colors; dark mode preserved under `.dark` class
- **Cloudflare R2 storage** (`src/lib/r2.ts`) — S3-compatible client for all image/document uploads via `media.metalgear.com` CDN with zero egress fees
- **Cloudflare Stream** (`src/lib/cloudflare-stream.ts`) — video upload, transcoding, adaptive bitrate streaming, thumbnail generation
- **Unified media interface** (`src/lib/media.ts`) — single entry point for all upload/delete operations across listings, avatars, SOS, disputes, condition reports, messages, storefronts, verification docs
- **VideoPlayer component** (`src/components/ui/video-player.tsx`) — Cloudflare Stream iframe embed with 16:9 aspect ratio, loading skeleton, thumbnail poster
- **Stream webhook handler** (`/api/webhooks/cloudflare-stream`) — processes video ready/error events, updates `listing_videos.status`
- **Listing media server actions** (`src/app/(main)/listings/new/actions.ts`) — `uploadListingImageAction`, `uploadListingVideoAction`, `deleteListingImageAction` replacing client-side Supabase Storage calls
- **Migration script** (`scripts/migrate-media.ts`) — idempotent, concurrency-limited migration of existing Supabase Storage files to R2/Stream with `--limit` flag for test runs
- Database: `stream_video_id`, `thumbnail_url`, `embed_url`, `hls_url`, `duration_seconds`, `status` columns on `listing_videos`; index on `stream_video_id`

### Changed
- **Listing detail page redesigned** — Apple-esque 2-column hero layout with 4:3 `object-contain` gallery (rounded-2xl, thumbnail strip, dot indicators), key info sidebar (title, price, badges, seller mini-card, CTA buttons); content below in 3-column grid (description, specs, condition report, price history on left; offers on right)
- **Theme architecture** — replaced hardcoded `dark` class on `<html>` with `next-themes` `ThemeProvider attribute="class" defaultTheme="dark" enableSystem`; dual `theme-color` meta tags for light/dark
- All media uploads now route through Cloudflare R2 instead of Supabase Storage (listing images, avatars, SOS media, dispute evidence, condition reports, message attachments, storefront banners, verification documents)
- Listing video uploads now use Cloudflare Stream with processing status tracking
- Listing creation page uses server actions for media uploads instead of client-side Supabase Storage calls
- Listing detail page uses `VideoPlayer` component for Stream videos, with fallback to HTML5 `<video>` for legacy URLs
- `next.config.ts` updated with `media.metalgear.com`, `videodelivery.net`, and Cloudflare Stream domain patterns
- Video size limit increased from 100MB to 200MB (Cloudflare Stream supports larger files)
- Storefront avatar positioning fixed — avatar no longer clipped by `overflow-hidden` banner container
- SOS floating button moved from bottom-right to bottom-left to avoid overlaying mobile nav elements

### Dependencies
- Added `@aws-sdk/client-s3`, `@aws-sdk/lib-storage` for R2 uploads
- Added `next-themes` for light/dark mode switching

---

## [1.9.0] — 2026-03-06 · Weekly Brief, Churn Prediction, Market Gaps (Cycle 15-2)

### Added
- **Weekly AI Business Brief** (`/api/cron/weekly-brief`) — Monday cron gathers growth, listings, revenue, SOS, search, and quality metrics; Claude generates executive summary with key numbers, concerns, recommended actions; emailed to all superadmins via Resend with dark-themed HTML template
- **Churn Prediction System** (`/api/cron/churn-prediction`) — nightly heuristic scoring of paid subscribers across 9 signals (login recency, listing activity, messages, SOS engagement, etc.); scores 0-100 with at_risk (50+) and high_risk (75+) levels
- **AI Outreach Generator** (`/api/admin/users/[id]/generate-outreach`) — Claude writes personalized retention emails based on user's activity, churn signals, and subscription value; admin reviews and copies to clipboard
- **Market Gap Alert System** (`/api/cron/market-gaps`) — weekly analysis of unmet SOS demand by equipment subcategory over 90 days; Claude identifies top 5 recruitment opportunities with seller type, revenue potential, and outreach approach
- **Market Gap Outreach** (`/api/admin/market-gaps/generate-outreach`) — AI-drafted cold outreach emails for seller recruitment in high-gap categories
- **Churn Risk in Admin Users** — churn risk filter (High Risk / At Risk) in admin user management; risk badges on user rows; detailed signal breakdown on user detail page
- **Market Gaps in Admin Analytics** — new Market Gaps section showing AI-analyzed recruitment opportunities with draft outreach email generation
- **Weekly Briefs Archive** — new "Weekly Briefs" tab in admin settings showing all past briefs with expandable content
- Churn scorer utility at `src/lib/ai/churn-scorer.ts` with configurable signal weights
- Database: `weekly_briefs`, `churn_risk`, `market_gap_reports` tables

---

## [1.8.0] — 2026-03-06 · Smart Alerts, Reputation Summarizer, Dispute Mediation (Cycle 15-1)

### Added
- **Smart Saved Search Alerts** (`/api/cron/smart-search-alerts`) — AI-powered relevance scoring replaces naive filter matching; Claude evaluates each listing-search pair (0-100), only notifies on score >= 75 with a 1-sentence explanation of why it matches
- **AI Seller Reputation Summarizer** (`/api/users/[id]/reputation-summary`) — generates plain-English reputation summaries from reviews: strengths, watchouts, verified claims, buyer recommendation percentage, confidence level; cached per-seller, auto-invalidated on new review
- **Reputation Summary UI** — new `ReputationSummary` component on seller storefront showing AI summary, evidence-backed strengths, watchouts, and buyer recommendation
- **AI Dispute Mediation** — `generateDisputeSummary()` server action reads dispute evidence and generates neutral case summary with buyer/seller positions, key disagreements, evidence assessment, possible outcomes, and recommended action
- **Dispute AI Panel** — new "Transaction Disputes" tab in admin moderation with expandable dispute details and AI case summary generation (on-demand, advisory only)
- Database: `saved_search_alert_log` table, `profiles.reputation_summary` + `profiles.reputation_summary_updated_at` columns, `disputes.ai_summary` column

### Changed
- Saved search alert cron now uses AI relevance scoring instead of exact filter matching; logs all send/skip decisions to `saved_search_alert_log`
- Alert emails now include AI-generated explanation of why each listing matches
- Review submission invalidates cached reputation summary for the reviewed seller

---

## [1.7.0] — 2026-03-06 · SOS AI Features (Cycle 14-2)

### Added
- **SOS AI API** (`/api/sos/ai`) — 3 actions: `categorize` (free-text to taxonomy mapping), `rank_responses` (AI-scored vendor response ranking), `predict_demand` (historical SOS pattern analysis)
- **Quick SOS Widget** — two-step AI flow on SOS creation: describe problem in plain text, AI extracts equipment category, subcategory, brand, specs, urgency, and suggested title for confirmation before sending
- **Response Ranker** — AI-powered ranking of vendor responses to SOS requests, scoring by spec match, trust signals, speed, price, and condition; shown to requesters when 2+ responses exist
- **Demand Forecast Widget** — seller dashboard widget showing AI-predicted demand trends per equipment category with trend indicators (rising/stable/declining), historical patterns, and recommended actions
- **Demand Insights Cron** (`/api/cron/demand-insights`) — nightly job generates personalized demand insights for premium/boost subscribers and active sellers
- **Admin SOS Demand Gap** — new "Demand Gap" tab in admin SOS management showing unfulfilled categories, response rates, and AI utilization stats
- Database: `sos_requests.ai_categorized`, `sos_requests.ranked_response_ids` columns, `seller_demand_insights` table
- Server action: `getSOSDemandGap()` for admin demand gap analytics

### Changed
- SOS creation page now starts with Quick SOS mode (AI-powered) with option to switch to detailed form
- SOS detail page shows AI Response Ranker before response list for requesters
- Seller dashboard includes Demand Forecast widget after seller stats section
- Admin SOS page now has tabbed navigation (List / Demand Gap)

---

## [1.6.0] — 2026-03-06 · AI Pricing Intelligence (Cycle 14-1)

### Added
- **AI Pricing API** (`/api/listings/ai-pricing`) — `suggest_price` fetches comparables from listings DB and uses Claude Sonnet 4 to generate market-data-driven price recommendations; `coach_negotiation` provides private per-side deal advice
- **AI Price Suggestion Widget** — on listing creation pricing step, "Get AI Price Estimate" button shows suggested range, target price, confidence bar, top 3 comparables, market insight, and quick-use price buttons
- **Offer Negotiation Coach** — private "Deal Coach" widget on listing detail offers section, visible only to the viewing user (buyer or seller), provides assessment, recommended action, acceptance probability, red flags, and talking points
- **Admin Pricing Intelligence Dashboard** — new analytics section with AI-priced vs manual listings comparison, price accuracy %, days-on-market comparison, offer acceptance rates, and coaching session count
- Database: `pricing_comparables` view, `offer_coaching_log` table, `listings.ai_price_suggested` and `listings.ai_price_accepted` columns
- Server action: `getPricingIntelligenceMetrics()` for admin analytics

### Changed
- Listing creation form pricing step now includes AI price suggestion component
- Listing detail page offers now show collapsible AI Deal Coach per active offer
- Admin analytics page extended with Pricing Intelligence section

---

## [1.5.0] — 2026-03-05 · AI Listing Copy Tools (Cycle 13-2)

### Added
- **AI Copy API** (`/api/listings/ai-copy`) — single route with 3 actions: `generate_description` (streaming), `optimize_title`, `score_quality`, all powered by Claude Sonnet 4
- **AI Description Generator** — in listing creation Step 1, generates 150-300 word professional descriptions with 4-6 bullet selling points; streaming text display, "Use This" / "Regenerate" / "Edit before using" actions
- **AI Title Optimizer** — inline "Optimize" button next to title field, suggests 3 SEO-optimized title options with issue warnings (vague, missing manufacturer, etc.), radio-select to apply
- **Listing Quality Score Widget** — auto-scores listings 0-100 (grades A-F) on review step with breakdown bars for photos/description/specs/title/pricing, top improvement suggestions, estimated reach multiplier, "Improve Now" navigation
- **Quality score on listings management** — quality score chip shown on each listing row in My Listings page
- **Admin Listing Quality Analytics** — new section in admin analytics: average quality score, grade distribution pie chart, AI-assisted vs manual average comparison, AI advantage KPI
- Column: `listings.listing_quality_score` (integer)
- Server action: `getListingQualityMetrics()` for admin analytics

### Changed
- Listing creation Step 1 now includes AI description generator panel and title optimizer button
- Listing creation Step 4 (Review) now shows auto-scoring quality widget with debounced updates
- Admin analytics page extended with Section 6: Listing Quality

---

## [1.4.0] — 2026-03-05 · Conversational AI Search (Cycle 13-1)

### Added
- **AI Search API** (`/api/search/ai`) — Claude-powered natural language to structured filter mapping with multi-turn conversation support, equipment taxonomy awareness, and 1-hour response caching
- **ConversationalSearch component** — full-width AI search input replacing keyword search bar on `/search`, with conversation thread, filter chips (removable), AI explanation in steel blue, clarifying questions, and no-results suggestions
- **Problem Diagnoser** — "Describe your equipment problem" entry point on homepage hero and dashboard, routes to AI search with `intent_hint: 'problem'` for diagnostic reasoning mode
- **Multi-turn conversations** — AI remembers context across turns (e.g., "show me cheaper ones" after "centrifuges under $50k"), conversation history displayed above search input
- **Filter chip extraction** — AI-extracted filters shown as removable chips (tier1, tier2, subcategories, manufacturer, price, condition, radius, keywords); removing a chip re-runs search
- **Keyword search fallback** — standard keyword search bar preserved below AI search; automatic fallback if AI route fails
- **AI search history** — `saved_searches` table extended with `ai_query`, `ai_filters`, `is_ai_search` columns for saving/re-running AI searches
- 5 unit tests: filter extraction (2 queries), clarifying question, multi-turn history, API failure fallback

### Changed
- Search page now shows AI conversational search as primary input with classic keyword search below
- Homepage features "Describe your equipment problem" card between hero and featured listings
- Dashboard includes Problem Diagnoser card above seller widgets

---

## [1.3.0] — 2026-03-05 · Financial Dashboard, Analytics & System Settings (Cycle 12-2)

### Added
- **Financial Dashboard** (`/admin/financials`) — MRR/ARR/churn KPIs, 12-month stacked revenue chart (recharts), subscription distribution, paginated subscription table with plan/status filters, boost revenue table, failed payments view, revenue forecast widget, CSV export
- **Analytics Panel** (`/admin/analytics`) — 90-day user growth chart (signups/DAU/cumulative), listing health with category distribution pie chart, SOS performance with fulfillment/no-match rates and top requested equipment, search analytics (top 20 terms), AI assist metrics (assist rate, fraud flags), geographic distribution (top 10 cities)
- **System Settings** (`/admin/settings`) — 6-tab interface: platform config (maintenance mode, feature flags, banners, thresholds), admin user management (grant/revoke roles, search users), subscription pricing display, integration health checks (Supabase/Stripe/Anthropic/Resend/Sentry/Sightengine), database stats, audit log viewer with pagination and CSV export
- Server actions: `src/app/actions/settings.ts` (system config CRUD, admin user management, integration checks, database stats, audit log)
- Server actions: `src/app/actions/financials.ts` (KPIs, revenue by month, subscriptions table, boost revenue, failed payments, CSV exports)
- Admin analytics functions in `src/app/actions/analytics.ts` (user growth, listing health, SOS performance, search analytics, geographic data, AI metrics)
- Table: `system_config` (key-value platform configuration with audit trail)
- Installed `recharts` for data visualization charts

---

## [1.2.0] — 2026-03-06 · Priority Engine (Cycle 12-1)

### Added
- **Boost Store** (`/boost`) — self-serve boost purchasing with Stripe Checkout for 5 boost types: Listing Featured, Category Pin, Homepage Slot, Storefront Featured, SOS Priority
- **Boost product catalog** — tiered duration/pricing options (7/14/30 days) per boost type in `BOOST_PRODUCTS` constants
- **Active boosts panel** — users see their active boosts with days remaining, cancel, and renew actions
- **Admin Priority Engine** (`/admin/priority`) — 5-tab interface: Company Tiers, Active Boosts, Homepage Slots, Category Pins, SOS Priority
- **Company priority tiers** — `standard`/`preferred`/`featured`/`platinum` enum with admin-set priority scores (0-1000)
- **Admin boost management** — cancel, refund, extend (+7d), and grant free boosts to any user
- **Homepage featured slots** — admin-curated slot editor with up/down reorder, add/remove slots, labels, and end dates
- **Category pin management** — admin can pin listings to positions 1-3 on any category page
- **Cron job** (`/api/cron/expire-boosts`) — daily expiration of active boosts with cleanup of listing featured/pinned flags
- **Stripe webhook** — handles `boost_purchase` checkout sessions, creates `boost_purchases` records and applies listing effects
- **Featured badges** — search results and homepage show "Featured" and "Pinned" badges on boosted listings
- **Homepage priority** — featured section now pulls from admin-curated homepage slots, falling back to boosted/most-viewed listings
- Tables: `boost_purchases`, `homepage_featured_slots`
- Columns: `profiles.priority_tier`, `profiles.priority_score`, `profiles.priority_set_by`, `profiles.priority_set_at`
- Enum: `company_priority_tier`
- Indexes: `idx_boosts_listing`, `idx_boosts_user`

### Changed
- Homepage "Featured Equipment" section now prioritizes admin-curated slots and boosted listings over most-viewed
- Search results show Featured/Pinned badges on listing cards in both grid and list views

---

## [1.1.0] — 2026-03-05 · Super Admin Dashboard (Cycle 11)

### Added
- **Admin RBAC system** — 3 roles (superadmin, moderator, analyst) with permission matrix and `requireAdmin()` helper
- **Admin route group** `(admin)` — dark sidebar layout with role-based nav visibility, mobile hamburger, breadcrumbs
- **Control Tower** (`/admin`) — live stats (users, listings, SOS, MRR, alerts), activity feed, 30-day charts, auto-refresh every 30s
- **User Management** (`/admin/users`) — paginated table with search/filter, row actions (suspend, ban, role management)
- **User Detail** (`/admin/users/[id]`) — full dossier with listings, SOS, reviews, reports, admin notes, audit log
- **Listing Management** (`/admin/listings`) — paginated table with filters (search, status, fraud), bulk actions (approve, flag, feature, expire), row actions with admin edit
- **Listing Detail** (`/admin/listings/[id]`) — full preview with image gallery, seller card, stats, status/boost controls, audit log
- **AI Fraud Queue** — review fraud-flagged listings, clear false positives or flag & notify sellers
- **SOS Monitor** (`/admin/sos`) — analytics strip (open/fulfilled/no-match), paginated table, slide-in detail drawer with responses list and admin actions
- **Moderation Queue** (`/admin/moderation`) — 3-tab consolidation: reported content, AI fraud queue, review disputes
- **Admin audit logging** — all admin actions recorded with admin_id, target, metadata, timestamp
- Columns: `profiles.admin_role`, `profiles.admin_granted_at/by`, `profiles.admin_notes`, `profiles.is_suspended`, `profiles.is_banned`
- Columns: `listings.is_featured`, `listings.admin_boost`, `listings.pinned_position/category`, `listings.admin_flag_reason`, `listings.admin_reviewed_by/at`
- Listing statuses: `pending_review`, `flagged` added to enum
- `admin_audit_log.metadata` (JSONB) and `admin_audit_log.ip_address` columns

### Changed
- Search results now prioritize featured and boosted listings (`is_featured DESC`, `admin_boost DESC` ordering)
- Replaced old monolithic admin page with new `(admin)` route group

---

## [1.0.0] — 2026-03-05 · AI-Powered Equipment Recognition (Cycle 10)

### Added
- **Claude Vision API route** (`/api/listings/analyze-image`) — identify equipment from photos using Claude Sonnet 4
- **Wide shot analysis** — equipment type identification mapped to 3-tier taxonomy with confidence scoring and alternatives
- **Nameplate OCR** — extract manufacturer, model, serial number, year, specs from data plate close-ups
- **Fraud detection** — AI-generated image, stock photo, and screenshot detection with flagging
- **AI-Assist listing creation** — new Step 0 in listing wizard with mobile camera capture and desktop upload
- **Client-side image compression** — max 1200px width, 0.85 quality via canvas API to stay under Vercel body limit
- **4-step AI capture flow** — mode selection → camera/upload → animated processing → editable results review
- **Auto-populate form fields** — title, description, category, condition, manufacturer, model, serial, specs from AI
- **Haptic feedback** — `navigator.vibrate(200)` on mobile after successful analysis
- Anthropic SDK (`@anthropic-ai/sdk`) integration with `src/lib/anthropic.ts` client
- Type definitions: `src/types/ai-analysis.ts` (request/response shapes)
- `AIImageCapture` component with responsive mobile/desktop camera UI
- Columns: `listings.ai_analyzed`, `listings.ai_fraud_flagged`, `listings.ai_fraud_reason`, `listings.specs` (JSONB), `listings.ai_assist_used`, `listings.ai_assist_accepted`
- 8 unit tests for image analysis (response shape, markdown fence stripping, input validation)

### Changed
- Listing creation form: 4-step → 5-step wizard (AI Assist → Details → Photos → Pricing → Review)

---

## [0.9.0] — 2026-03-02 · 3-Tier Equipment Taxonomy

### Added
- **3-tier equipment taxonomy** replacing flat 13-category system: 4 Tier 1 buckets → 28 Tier 2 groups → ~252 subcategories with cross-referencing
- `equipment-taxonomy.ts` — single source of truth with helper functions (`searchTaxonomy`, `getTier2Label`, `getSubcategoryLabel`, `getAllGroupsForSubcategory`)
- Cross-list expansion in SOS routing — subcategories appearing in multiple Tier 2 groups now reach all relevant responders
- Onboarding Step 2 rewritten with 3-tier accordion UI and real-time search
- SOS create page with search-first taxonomy browser and grouped dropdown
- Cycle 9 prompt and Excel bulk upload template (`MetalGear_BulkUpload_Template.xlsx`)

### Changed
- `user_equipment_interests` table: `category`/`sub_types` → `tier1`/`tier2`/`subcategories`
- `sos_requests` table: `equipment_sub_type` → `equipment_subcategory`
- `find_sos_responders()` function: params changed to `p_tier2`/`p_subcategory`
- SOS dashboard and detail pages use taxonomy label lookups
- Updated constants: 20 industries (was 13), 8 pain points (was 6)

### Removed
- `src/lib/constants/equipment-categories.ts` — replaced by `equipment-taxonomy.ts`

---

## [0.8.0] — 2026-03-02 · Enhanced Onboarding & SOS Broadcast (Cycle 6 Addendum)

### Added
- **6-step B2B onboarding wizard** — identity, equipment interests, industry/pain points, trading intent, transparency/SOS opt-in, quality agreement
- **SOS broadcast system** — urgent equipment need posting with category, brand, model, urgency level, and media uploads
- SOS dashboard with filterable feed matching user equipment interests
- SOS response system with price estimates, lead time, condition, photos, and Supabase Realtime updates
- SOS tier limits: Free (1 active / 100mi / 10 responders), Premium (3 / 500mi / unlimited), Boost (unlimited)
- Floating pulsing SOS FAB on all main layout pages
- Middleware onboarding guard (fail-open) redirecting unauthenticated users to `/onboarding`
- `find_sos_responders()` PostgreSQL function for category-based notification routing
- Tables: `user_business_profiles`, `user_equipment_interests`, `sos_requests`, `sos_responses`, `sos_notifications`
- Enums: `sos_urgency`, `sos_status`, `visibility_level`
- Storage bucket: `sos-media`

### Fixed
- `'use server'` export restriction — moved constants out of server action file
- Infinite spinner on onboarding page — added try-catch-finally and fail-open middleware

---

## [0.7.0] — 2026-03-02 · Notifications v2, Social & Marketplace Maturity (Cycle 8)

### Added
- **Web Push notifications** with VAPID keys, service worker, notification center with category filters and per-category preferences
- **Listing expiration** — 90-day default with auto-renewal and 7-day warning notifications
- **Related listings** carousel with smart similarity scoring (category, price, condition)
- **Saved search enhancements** — target price alerts, search frequency (instant/daily/weekly), dedicated management page
- **Dashboard v2** — modular widget layout with role detection (seller vs buyer), revenue summary, pending shipments
- **Inventory management** — quantity, SKU, warehouse location fields; sortable/filterable table with bulk actions
- **Social sharing** — dynamic OG images via `@vercel/og`, branded listing preview cards
- **Referral program** — unique codes, 30-day tracking cookie, $10 reward, referral dashboard
- Performance: loading skeletons (6 routes), 15 composite DB indexes, health check endpoint, weekly cleanup cron
- Routes: `/inventory`, `/saved-searches`, `/notifications`, `/api/og`, `/api/health`, `/api/cron/cleanup`, `/ref/[code]`
- Tables/columns: `push_subscriptions`, `referrals`, `listings.expires_at`, `listings.auto_renew`, `listings.quantity`, `listings.sku`, `listings.warehouse_location`, `profiles.referral_code`

---

## [0.6.0] — 2026-02-28 · Payments, Disputes & Community (Cycle 7)

### Added
- **Stripe escrow payments** — authorize-then-capture PaymentIntent with 5% platform fee, funds released on delivery confirmation
- **Dispute resolution** — full lifecycle with evidence uploads (up to 5 images per party), admin resolution panel
- **Post-transaction reviews** — buyer and seller star ratings with trust score recalculation
- **Equipment condition reports** — grade (A–F), mechanical/cosmetic/electrical scores (1–10), hours tracking, inspection photos
- **Saved listing collections** — public/private visibility, shareable URLs, backwards compatible with favorites
- **Seller availability & scheduling** — weekly time slots, timezone-aware viewing requests with email notifications
- **Help center** — 16 seeded articles across 7 categories, keyword search, FAQ accordion, floating help button
- **Onboarding checklist** — dashboard widget with auto-detection, weekly engagement digest (Monday 9am CT)
- Tables: `disputes`, `condition_reports`, `collections`, `collection_items`, `seller_availability`, `viewing_requests`, `help_articles`, `onboarding_progress`
- Routes: `/collections`, `/collections/[id]`, `/schedule`, `/help`, `/help/[slug]`, `/api/cron/engagement-digest`
- Storage buckets: `dispute-evidence`, `condition-reports`

---

## [0.5.0] — 2026-02-28 · Seller Tools, Smart Discovery & Trust (Cycle 6)

### Added
- **Saved search alerts** — daily digest emails matching new listings, recommendation engine with category affinity
- **Seller storefront** — public profile at `/sellers/[id]` with customizable banner, tagline, featured listings
- **Bulk CSV import** — template download, validation, preview, import history
- **Verified seller program** — business verification documents, admin review queue, trust score (0–100)
- **Transaction management** — full lifecycle (initiated → paid → shipped → delivered → completed), shipment tracking
- **Enhanced messaging** — file attachments (images, PDFs, Office docs), quick reply templates (20 limit)
- **Market insights** — analytics page (Premium/Boost gated) with category pricing, trends, demand heatmap, SVG charts
- **Internationalization** — next-intl (EN/ES), cookie-based locale detection, language switcher
- **Accessibility** — skip-to-content, semantic landmarks, ARIA labels, `aria-current="page"`
- Tables: `user_activity`, `seller_storefronts`, `listing_imports`, `seller_verifications`, `transactions`, `message_attachments`, `reply_templates`
- Routes: `/sellers/[id]`, `/listings/import`, `/transactions`, `/transactions/[id]`, `/insights`, `/api/cron/saved-search-alerts`

---

## [0.4.0] — 2026-02-28 · Real-Time, Location & Marketplace Intelligence (Cycle 5)

### Added
- **Real-time notifications** — 5 notification types, bell dropdown with unread badge, activity feed
- **Location & mapping** — Leaflet + OpenStreetMap, custom dark map tiles, haversine distance sorting, radius filters
- **Offer & negotiation system** — full lifecycle (pending → accepted/rejected/countered/expired/withdrawn), 72-hour auto-expiration
- **Video uploads** — Premium/Boost tier, HTML5 player on listing detail page
- **Comparison & watchlist** — compare tool with side-by-side view, price watches with history tracking
- **Advanced admin** — moderation queue, bulk actions, revenue analytics, suspicious keyword flagging, CSV exports, audit logging
- **SEO & marketing** — 20 category landing pages (SSR), dynamic sitemap, robots.txt, JSON-LD Product schema
- **CI/CD** — GitHub Actions (lint, typecheck, tests, build), Husky pre-commit hooks, bundle analysis
- Tables: `notifications`, `offers`, `listing_videos`, `price_watches`, `price_history`, `admin_audit_log`
- Routes: `/compare`, `/equipment/[slug]`, `/robots.txt`, `/sitemap.xml`

---

## [0.3.0] — 2026-02-27 · Growth, Analytics & User Experience (Cycle 4)

### Added
- **Notification preferences** — granular toggles for messages, inquiries, marketing emails
- **Listing analytics** — view tracking, seller insights dashboard with 30-day stats and conversion rates
- **Search enhancements** — saved searches, recent history, 18 autocomplete suggestions
- **Listing management** — mark sold, relist, duplicate, publish drafts, social share (Facebook, LinkedIn, X), QR codes
- **Reputation system** — star ratings, reviews, seller response time tracking, report system
- **Performance** — Next.js Image optimization, database indexes, remote image patterns
- **Mobile PWA** — manifest.json, icons, pull-to-refresh, swipe gestures, bottom nav with safe area insets
- **Testing** — 42 Vitest unit tests, Playwright E2E config, API documentation
- Tables: `listing_views`, `saved_searches`, `reviews`, `reports`

---

## [0.2.0] — 2026-02-27 · Monetization, Polish & Production Readiness (Cycle 3)

### Added
- **Stripe integration** — payment processing, 5 webhook event types, Billing Portal
- **Checkout flow** with Stripe Checkout sessions for Premium ($29.99/mo) and Boost ($79.99/mo)
- **Pricing page** — 3-tier comparison table with feature matrix and FAQ
- **Tier limit enforcement** — listing/photo/video/conversation caps with upgrade prompts
- **Email notifications** via Resend — welcome, new message, inquiry, subscription branded HTML templates
- **Marketing pages** — About (mission/values), Terms of Service (12 sections), Privacy Policy (10 sections)
- **Admin dashboard** — platform stats, listing moderation, user management, charts
- **Production hardening** — Zod v4 validation, SEO metadata, loading skeletons (5 routes), rate limiting, 404 polish
- Tables: `subscriptions`, `payments`

---

## [0.1.0] — 2026-02-25 · Core Marketplace (Cycles 1 & 2)

### Added
- **Project scaffold** — Next.js 15 App Router, TypeScript, Tailwind CSS v4, shadcn/ui (14 components)
- **Design system** — dark-only theme (`#0A0A0F` bg, `#FF6B2B` primary, `#3A8FD4` steel blue), Chakra Petch + Manrope fonts
- **Authentication** — email/password, Google OAuth, Apple SSO via Supabase Auth
- **Database schema** — 6 tables (profiles, listings, listing_images, favorites, conversations, messages) with RLS, FTS, triggers
- **User profiles** — edit page, avatar upload, public profile viewing
- **Listing system** — multi-step creation form, photo drag-and-drop reorder, draft saves, detail page with gallery
- **Search & browse** — full-text search, filters (category, condition, price, location), sort options, grid/list toggle, pagination
- **Favorites** — save/unsave listings with dedicated page
- **Real-time messaging** — Supabase Realtime conversations with unread count tracking
- **Dashboard** — stats overview, quick actions, recent listings, subscription info
- **Infrastructure** — Supabase project, GitHub repo, Vercel deployment, Sentry error tracking, Zustand stores, TanStack Query

### Fixed
- Client-side Supabase DB/storage calls hanging in production — migrated all operations to server actions with `createAdminClient()`
- Avatar upload and display issues across multiple fixes (cross-origin, unique filenames, server-side upload)
