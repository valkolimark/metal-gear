# Session 2026-04-17 — Cycle 58: Snap & List

**Version shipped:** 4.29.0
**Prior state:** v4.28.1 (Cycle 57 hotfix)

---

## Scope

Ship Snap & List — single-photo AI-assisted listing creation — as the new default listing flow, with a reusable vision-analysis layer designed to outlive this cycle and pilot instrumentation to justify (or reject) the Cycle 59 consolidation of SOS + the existing listing analyzer + admin moderation onto the same pipeline.

## Pilot framing (critical context)

This cycle is an accuracy pilot. The prompt explicitly forbade migrating `/api/listings/analyze-image` or SOS image analysis in this cycle. Cycle 59 will make the consolidation decision based on live metrics from the five targets below. That framing drove two load-bearing architectural decisions:

1. **Reusable vision-analysis layer** — `src/lib/vision-analysis/` exports `analyzeEquipmentImages(photoUrls, options)` and is domain-agnostic. Verified by `grep -rnE "^\s*(import|require).*(snap-list|listing_drafts|@/app/actions)" src/lib/vision-analysis/` returning zero matches. Cycle 59 will import from this path without refactoring the vision logic.

2. **Instrumentation from day one** — `snap_list_events` table + `logSnapListEvent()` fire-and-forget logger + admin dashboard at `/admin/snap-list-metrics`. Without these, the Cycle 59 decision would be blind.

## Pilot metrics (Cycle 59 evaluation bar)

| Metric | Target | Red flag | Where measured |
|---|---|---|---|
| Field edit rate | ≤ 20% | ≥ 40% | `field_edited` events / (published drafts × 12 tracked fields) |
| Median time to publish | ≤ 3 min | ≥ 8 min | `draft_published.payload.time_from_analysis_ms` |
| Draft abandonment | ≤ 25% | ≥ 50% | drafts in `analyzing/ready/failed/discarded` past `expires_at` / drafts created |
| Post-publish edit rate | ≤ 30% | ≥ 60% | distinct `draft_id` in `listing_edited_post_publish` events / published count |
| Nameplate OCR accuracy (manual) | ≥ 95% | ≤ 85% | `snap_list_accuracy_reviews` sampler rows |

`/admin/snap-list-metrics` renders all five plus a daily trend chart (recharts) and the accuracy sampler. Gated by `view_financials` admin permission (superadmin + analyst).

## Architecture decisions

- **Vision-analysis layer isolation** — `EquipmentAnalysisResult` shape is stable. Supporting types (`EquipmentIdentification`, `OCRExtraction`, `FraudSignals`, `FieldConfidenceMap`, `ClarifyingQuestion`, `TaxonomyTree`) are exported from `types.ts` and re-exported via `index.ts`. The taxonomy is injected as a parameter so the layer doesn't import from the codebase's `EQUIPMENT_TAXONOMY` constant — a future caller can pass a different tree if needed.
- **Confidence mapping** — three distinct sources map to three non-overlapping bands:
  - OCR-sourced: [0.85, 1.00]
  - Claude with OCR grounding: [0.75, 0.95]
  - Claude visual-only (no nameplate): [0.40, 0.80]
  - Merged (OCR + Claude agree): [0.90, 1.00]
  This makes "low confidence" visually obvious via the `ConfirmFlag` dot at <0.75.
- **OCR-wins-on-nameplate rule** — `mergeOCRWithVisual` prefers OCR for manufacturer / model / serial / year when OCR confidence >0.85. Claude wins otherwise. This is the core behavior that's expected to lift nameplate accuracy from ~80% → ~97%.
- **Deferred background work** — `analyzePhotos` returns `{draftId}` immediately and uses Next.js `after()` to run the full vision + pricing + coaching pipeline server-side after the response is flushed. The client polls `getDraft(draftId)` at 400ms on the analyzing screen.
- **publishDraft → real listing row** — writes to `listings` with `ai_assisted=true` and `source_draft_id=draft.id`. Photos re-used from the draft (same R2 URLs — no re-upload) via `listing_images` inserts. Tier listing limit is enforced at publish time, not at draft creation, so a Free user who's already at their 3-listing cap can still experiment with drafts but can't publish past the cap.

## What shipped

7 SQL migrations (applied via Supabase Management API `/database/query` as one transactional batch); `@google-cloud/vision` installed; `src/lib/google-vision.ts` low-level wrapper (never throws); `src/lib/vision-analysis/` reusable layer (6 files); `src/lib/snap-list/` (types, orchestrator, events); server actions (`snap-list.ts`, `snap-list-draft.ts`, `snap-list-usage.ts`, `comparable-listings.ts`, `photo-coach.ts`, `snap-list-metrics.ts`, `snap-list-accuracy-sample.ts`); API route `/api/snap-list/analyze`; 3 route pages + 10 client components; admin dashboard + 3 admin components; `/listings/new` redirect; mobile nav + header + mobile compose sheet updated; `SnapListBadge` on listing detail; cron cleanup wired; env example; 4 test files (all 120 tests green).

## Caveats / deferred

- **pHash internal duplicate detection** — `internal_duplicate_listing_id` column exists; not surfaced in UI this cycle.
- **Teardown / parts-lot listings (>10 photos)** — out of scope; the upload cap is 10 in Snap & List, and the advanced form covers the larger case.
- **No-nameplate confidence** — when Google Vision returns empty OCR, Claude gets flagged as visual-only and all nameplate fields cap at 0.8 confidence. Description explicitly tells the user exact model/manufacturer requires nameplate confirmation. UI shows amber dots broadly, but publish is not blocked.
- **SOS + existing analyzer migration** — Cycle 59. Waiting for the five metrics above to settle.
- **Generated Supabase types** — regenerated via Management API `/types/typescript` endpoint after migrations; `src/types/database.ts` now includes all 4 new tables and 2 new `listings` columns. JSONB writes cast via `as unknown as Json` at insert/update sites since my application types (`SnapListDraftFields`, `PriceSuggestion`, `PhotoCoachOutput`, `ClarifyingQuestion[]`) are not structurally `Json`-compatible (TypeScript's strict JSON type requires recursive assertion). Casts are localized to snap-list server actions.

## Cycle 59 plan

Predicated on pilot metrics being green (or yellow trending green) across the five targets above:

1. Refactor `/api/listings/analyze-image/route.ts` to call `analyzeEquipmentImages` from `@/lib/vision-analysis`. Keep the route's existing request/response shape (it's consumed by `AIImageCapture` and the existing listing create flow) but swap the underlying pipeline.
2. Migrate `/api/sos/ai` image analysis to the same `analyzeEquipmentImages` call with `callerTag: 'sos'`.
3. Migrate admin moderation's image review tools (if/where they exist) to the same path with `callerTag: 'admin_review'`.
4. Retire the hand-rolled Claude-only equipment prompt in `src/lib/ai/equipment-prompts.ts` once all callers are migrated.

If metrics are red (field edit rate >40%, post-publish edit rate >60%, or OCR accuracy <85%), Cycle 59 instead investigates root causes: prompt drift, OCR failure modes (on catalog images vs real field photos), or taxonomy mismatches. Consolidation doesn't ship until the pipeline is validated.

## Cost note

Google Cloud Vision: 1,000 units/month/feature free tier. Pilot volume (100 dealers × 10 analyses) sits inside it. Scaling model:

- 1,000 analyses/month: ~$0
- 10,000 analyses/month: ~$45
- 100,000 analyses/month: ~$500

Claude costs stay roughly flat (we're now paying for vision from Google instead of from Claude — the OCR workload moves vendors).

## Commands run

- `npm install @google-cloud/vision` — +60 packages
- 7 migrations via `POST /v1/projects/{ref}/database/query` — one atomic batch, HTTP 201
- Supabase types regenerated via `GET /v1/projects/{ref}/types/typescript?included_schemas=public` → overwritten into `src/types/database.ts`
- `npm run typecheck` — clean
- `npm run lint` — clean (pre-existing warnings only)
- `npm test` — 120/120 pass
- `npm run build` — clean; 98 routes generated including the 3 new Snap & List pages and the admin dashboard
