# Cycle 62 — AI Surface Audit

Audit performed: 2026-04-27. Run before any code changes per §3 of the cycle 62 prompt.

Greps used:
- `grep -rnE "anthropic\.messages\.create|anthropic\.messages\.stream|@anthropic-ai/sdk" src/`
- `grep -rnE "ImageAnnotatorClient|@google-cloud/vision" src/`
- Excluded: `src/test/`, `node_modules/`, `src/lib/anthropic.ts` (singleton init only).

Result: every AI call site below maps to one of the 14 `surface` enum values defined in §3 of the prompt.

## Anthropic call sites

| File | Line | Method | Model | Surface |
|---|---|---|---|---|
| `src/lib/vision-analysis/analyze.ts` | 254 | `messages.create` | `claude-sonnet-4-20250514` | `photo_to_listing_analysis` · `sos_analysis` · `listing_analyzer_helper` (depends on `options.mode`) |
| `src/app/actions/photo-coach.ts` | 47 | `messages.create` | `claude-sonnet-4-20250514` | `photo_to_listing_analysis` (called only from snap-list pipeline) |
| `src/app/actions/dispute-mediation.ts` | 95 | `messages.create` | `claude-sonnet-4-20250514` | `dispute_mediation` |
| `src/app/api/listings/ai-pricing/route.ts` | 211, 259 | `messages.create` (×2) | `claude-sonnet-4-20250514` | `ai_search` (price-suggestion adjacent — bucket as `other` if needed). NOTE: route name is "ai-pricing"; treat as `other` since neither manual listing form nor snap-list publish currently calls it. **Verify before wrapping.** |
| `src/app/api/listings/ai-copy/route.ts` | 119 (stream), 156 | `messages.stream` + `messages.create` | `claude-sonnet-4-20250514` | `other` (AI title/desc generator + quality scorer; not in the §3 enum — bucket as `other`). |
| `src/app/api/listings/[id]/ask/route.ts` | 204 | `messages.stream` | `claude-sonnet-4-20250514` | `ask_metal_gear` |
| `src/app/api/help/chat/route.ts` | 82 | `messages.stream` | `claude-sonnet-4-20250514` | `other` (Help Assistant; not in enum). Track explicitly so we can split later if Help volume rises. |
| `src/app/api/search/ai/route.ts` | 141 | `messages.create` | `claude-sonnet-4-20250514` | `ai_search` |
| `src/app/api/sos/ai/route.ts` | 111, 206, 298 | `messages.create` (×3 actions: `categorize`, `rank_responses`, `predict_demand`) | `claude-sonnet-4-20250514` | `sos_analysis` (categorize/rank); `demand_insights_cron` (predict_demand when called from `/api/cron/demand-insights`) |
| `src/app/api/users/[id]/reputation-summary/route.ts` | 136 | `messages.create` | `claude-sonnet-4-20250514` | `other` (reputation summary — not in enum). |
| `src/app/api/admin/users/[id]/generate-outreach/route.ts` | 72 | `messages.create` | `claude-sonnet-4-20250514` | `other` (admin churn outreach generator). |
| `src/app/api/admin/market-gaps/generate-outreach/route.ts` | 33 | `messages.create` | `claude-sonnet-4-20250514` | `other` (admin recruitment outreach generator). |
| `src/app/api/cron/listing-freshness/route.ts` | 91 | `messages.create` | `claude-sonnet-4-20250514` | `listing_freshness_cron` |
| `src/app/api/cron/smart-search-alerts/route.ts` | 255 | `messages.create` | `claude-sonnet-4-20250514` | `other` (smart-search alerts AI scorer; not in enum) |
| `src/app/api/cron/market-gaps/route.ts` | 74 | `messages.create` | `claude-sonnet-4-20250514` | `other` (weekly SOS gap analysis; not in enum) |
| `src/app/api/cron/weekly-brief/route.ts` | 202 | `messages.create` | `claude-sonnet-4-20250514` | `weekly_brief_cron` |
| `scripts/seed-equipment-registry.ts` | 27 (import) | `messages.create` | (Cycle 61 seed) | `registry_seeding` — script-only; instrument when re-run. |

## Google Cloud Vision call sites

| File | Function | Feature | Surface |
|---|---|---|---|
| `src/lib/google-vision.ts` | `detectNameplateText` | `DOCUMENT_TEXT_DETECTION` | inherited from caller via `onUsageEvent` callback |
| `src/lib/google-vision.ts` | `detectWebMatches` | `WEB_DETECTION` | inherited from caller via `onUsageEvent` callback |

Called only from `src/lib/vision-analysis/analyze.ts` — the surface is determined by the orchestrator that invoked `analyzeEquipmentImages()`:
- snap-list orchestrator → `photo_to_listing_analysis`
- analyze-image route w/ `mode='sos'` → `sos_analysis`
- analyze-image route w/ `mode='listing-helper'` → `listing_analyzer_helper`

## Surface enum coverage check

Required by `ai_usage_events.surface` CHECK constraint:

| Enum | Wired in audit |
|---|---|
| `photo_to_listing_analysis` | ✅ snap-list orchestrator + photo-coach |
| `sos_analysis` | ✅ analyze-image route (mode=sos) + sos/ai categorize/rank |
| `listing_analyzer_helper` | ✅ analyze-image route (mode=listing-helper) |
| `listing_freshness_cron` | ✅ cron/listing-freshness |
| `weekly_brief_cron` | ✅ cron/weekly-brief |
| `demand_insights_cron` | ✅ sos/ai action=predict_demand (called via cron/demand-insights internal HTTP fetch) |
| `ask_metal_gear` | ✅ listings/[id]/ask |
| `ai_search` | ✅ search/ai |
| `dispute_mediation` | ✅ dispute-mediation server action |
| `churn_scoring_cron` | ⚠️ `cron/churn-prediction` does NOT call Anthropic (heuristic scorer only — `src/lib/ai/churn-scorer.ts`). No instrumentation needed; surface enum kept for future use. |
| `registry_seeding` | ✅ scripts/seed-equipment-registry.ts (one-time, instrument-on-rerun) |
| `registry_disambiguation` | ✅ runs inside vision-analysis registry callback; bucket lives in nameplate-callback (no separate Anthropic call — the disambiguation logic is pure-function CPU). Reserve enum value for future GCV-only registry probes. |
| `other` | catch-all for: ai-copy, help/chat, ai-pricing, reputation-summary, admin outreach (×2), smart-search-alerts, market-gaps cron |

## Notes / gotchas

1. **`/api/sos/ai` has three actions sharing one route.** Single wrapper won't suffice — wrap each `anthropic.messages.create` call separately with the right `surface` per action. `categorize`/`rank_responses` → `sos_analysis`; `predict_demand` → `demand_insights_cron` (the only consumer is the demand-insights cron).
2. **`/api/cron/demand-insights/route.ts` makes no direct Anthropic call** — it `fetch`s `/api/sos/ai` internally. Instrumentation lives at the `/api/sos/ai` boundary.
3. **`/api/cron/churn-prediction` makes no Anthropic call.** Heuristic scoring only via `src/lib/ai/churn-scorer.ts`. Skip wrapping; document in CLAUDE.md.
4. **Vision-analysis layer must stay domain-isolated.** It does not import from `@/lib/telemetry/*`. Instead `EquipmentAnalysisOptions` gains an `onUsageEvent` callback (same pattern as `registryLookup` in Cycle 61).
5. **Three orchestrators** wire the callback:
   - `src/app/actions/snap-list.ts` → surface `photo_to_listing_analysis`
   - `src/app/api/listings/analyze-image/route.ts` → surface from `mode` (`sos_analysis` or `listing_analyzer_helper`)
   - No third today — both other callers are the same route. (Cycle 60 unified.)
6. **`/api/listings/ai-pricing/route.ts`** is referenced by `src/app/(main)/listings/snap/review/components/PriceSuggestionCard.tsx` — confirmed live. Bucket as `other` for now (not a primary tracked surface; volume is low and median cost negligible).
7. All anthropic surfaces use `claude-sonnet-4-20250514`. One unified pricing entry covers the whole platform.
8. The `surface` CHECK constraint enum in §3 is exhaustive for what this audit found. No new enum values needed.

## Action plan

1. Migration writes the table with the enum from §3 verbatim.
2. Wire `onUsageEvent` callback into `src/lib/vision-analysis/types.ts` + `analyze.ts` (vendor splits inside the layer).
3. Wrap each call site listed above with `withAiUsageTracking()` mapping surface per the table.
4. Stream surfaces (`ai-copy`, `ask`, `help/chat`) need a wrapper that captures usage from `stream.usage()` after the stream resolves rather than the synchronous response shape.
