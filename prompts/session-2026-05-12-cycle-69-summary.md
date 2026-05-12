# Session 2026-05-12 — Cycle 69 summary

**Versions shipped:** `4.39.0` (Cycle 68 backfill) → `4.40.0` (Cycle 69 IA migration)

This summary describes what actually happened during the cycle. The cycle prompt itself lives at `prompts/session-2026-05-12-cycle-69.md`.

## Part A — 4.39.0 backfill (Cycle 68 documentation)

Cycle 68 (commits `c75a741` → `b1beb74`, six commits, +872/−257 lines across 33 files) had shipped without a CHANGELOG entry. Reconstructed the entry from the actual diff and individual commit messages on `main`. Audit findings disclosed in the entry's "Documentation drift" section:

1. **Design-preview infrastructure** (`src/components/design-preview/`, `src/app/design/`) is NOT in the Cycle 68 commit range. It shipped in 8 separate commits BETWEEN Cycle 67 and Cycle 68 (`e29fdb5` → `4807e31`) as preparatory work. Did not double-document those commits inside the 4.39.0 entry; they're upstream of the Cycle 68 chrome migration.
2. **Design-preview routes path:** live at `src/app/design/` (top-level), not `src/app/(main)/design/` as the Cycle 69 prompt's verification step expected. Routes set `noindex,nofollow` and live in a separate route group.
3. **`/sellers/[id]` trust-strip rebuild** was anticipated in the Cycle 68 session note but did NOT actually ship — only the cover grid migrated. The trust-strip rebuild is now a Cycle 69 deliverable.

Also added a **Cycle 68 conventions** subsection to `CLAUDE.md` under Design System covering six load-bearing tokens: soft-card shadow, cover-grid pattern, cover-chip palette, KPI tile spec, sticky save bar spec, design-preview route convention.

Committed separately as `docs(changelog): backfill Cycle 68 entry as 4.39.0` (`f9e9455`).

## Part B — 4.40.0 Cycle 69 work

### What shipped

**Database:**
- `seller_followers` table via `scripts/migrate-create-seller-followers.ts` (idempotent — verified by running twice; second run is a confirmed no-op). XOR target check, no-self-follow check, partial unique indexes for (follower, target), reverse-lookup indexes for fan-out counts, RLS: public select / self-insert / self-delete.
- `src/types/database.ts` regenerated from Supabase Management API (`GET /v1/projects/.../types/typescript?included_schemas=public`) — now includes the new table's four references.

**Shared profile components (`src/components/profile-shared/`):**
- `TrustStripCard` — 5-stat soft-card grid; em-dashes for null metrics; mobile 2-col collapse.
- `ProfileTabsNav` — sticky tab nav; URL `?tab=` routing via `useRouter().replace`; arrow-key keyboard nav; disabled tab support.
- `CoverGrid` — 4-tile grid (desktop) + single banner (mobile); real-photo + gradient-fallback hybrid; editable variant with "Edit cover" CTA.
- `ActivityFeed` — typed timeline; relative-time humanization (m/h/d/w/mo/y).
- `ListingsGridModule` — reusable N-up grid with title, subtitle, See-all link, featured-badge variant.
- `FollowButton` — optimistic flip with rollback on error.

**Server helpers (`src/lib/profile/`):**
- `trust-metrics.ts` — `getSellerTrustMetrics({ profileId | companyId })`. NULL-safe across all 5 stats. Company variant aggregates across `company_memberships`. Mirrors codebase pattern from `storefront.ts`'s `getSellerStats` rather than introducing a Postgres RPC.
- `cover-photos.ts` — `getCoverPhotosForSeller(...)`. Dedup across listings, backfill within-listing.
- `activity.ts` — `getActivityFeed(...)`. Synthesized from listings/reviews/transactions/sos_responses (NOT from `user_activity` view-tracking).

**Server action:**
- `src/app/actions/follow-seller.ts` — `toggleFollow()` (Zod-validated, target-XOR, self-follow-reject, idempotent on unique-constraint races) + `isFollowing()`.

**Page rewrites:**
- `/sellers/[id]` — full IA: breadcrumb, real-photo cover grid, identity row with Message/SOS/Follow CTAs, 5-stat trust strip, 6-tab nav, Storefront tab (About → Featured listings → More listings → Recent reviews + AI summary, right rail: SOS card / activity / certs placeholder), dedicated Listings / Reviews / About tabs, "Coming soon" placeholders for Services + Locations.
- `/profile` (own variant) — cover hero with edit CTA, identity row, 5-stat trust strip (`profile-own` variant), 5-tab nav, About tab (recent activity + certs placeholder + existing editor form), My listings (6-up), Posts (deferred placeholder), Reviews, SOS history.
- Existing 1247-line `/profile` client form → moved to `src/app/(main)/profile/components/ProfileEditor.tsx` (renamed export, fixed relative imports, removed old cover hero + page-title block).

**Lint config:**
- `eslint.config.mjs` — added `design_handoff_core/**` and `design_handoff_inner_pages/**` to global ignores (untracked operator-side design reference JSX with no eslint config; pre-existed before this cycle, now declared out-of-scope).
- `scripts/check-archetype-references.mjs` — design-preview sellers files added to ALLOWLIST (design fidelity references the Person/Company/Logistics/Trader kind switcher).

### Architectural deviation from the prompt

The prompt mandated a Postgres RPC (`get_seller_trust_metrics()`) for the trust strip. The codebase's established pattern is TypeScript-side batched aggregation (`getSellerStats`). I chose to follow the codebase pattern: trust metrics live in `src/lib/profile/trust-metrics.ts` as a single server-only helper. Single-source-of-truth is preserved, just at the TS layer instead of the SQL layer. Operator confirmed this deviation up front.

### Schema verification surprises

| Prompt assumption | Reality |
|---|---|
| `listing_images.r2_url` | Actually `url` |
| `reviews.reviewed_profile_id` / `reviewed_company_id` | Actually a single `seller_id` (profile-id). Company reviews aggregate via `company_memberships`. |
| `sos_responses.first_response_at` | Doesn't exist. Derived response time from `conversations.messages` time-diff. |
| `transactions.seller_company_id` | Doesn't exist. `transactions` is profile-keyed only. |
| `services`, `seller_locations`, `user_certifications` tables | None exist. All deferred to Cycle 70 with "Coming soon" placeholder tabs. |
| `user_activity` event types `listed`/`sos_responded`/etc. | Doesn't have rich event types — only `view`/`search`/`favorite`. Activity feed is synthesized from underlying tables instead. |

### Test coverage

- **`src/test/profile-shared.test.tsx`** (13 cases): TrustStripCard em-dash/populated/variant, CoverGrid real-photo/fallback/fewer-than-3/editable/verified, ActivityFeed empty/populated/time-ago, ProfileTabsNav rendering/active-state/disabled.
- **`src/test/follow-seller-validation.test.ts`** (5 cases): toggleFollow Zod guards — neither/both/unauth/self-follow/malformed-UUID.

Full suite: **337/337 passing across 33 files.**

### Build / lint / typecheck

- `npx tsc --noEmit` — clean
- `npm run lint` — 0 errors, 62 pre-existing warnings (none in new code)
- `npm run build` — succeeds
- `npm test` — 337/337 pass
- `npm run check:archetypes` — 575 files scanned, 0 violations

### Deferred to Cycle 70+

**Schema-blocked (need new tables):**
- Services tab on sellers (needs `services` or `seller_services` table)
- Locations tab on sellers (needs `seller_locations` table)
- Certifications grid on profile + sellers (needs `user_certifications` or `seller_certifications` table)
- Team module on company storefronts (needs richer `company_memberships` query work — info is there, just no UI)
- Posts tab on profile (needs feed-post-by-user surface)

**Other deferrals:**
- `/profile/[id]` (public other-user POV) — bespoke restyle to match `/sellers/[id]` (current behavior unchanged this cycle)
- Photos strip on profile (needs `profile_photos` or `user_media` table OR strategy decision)
- Service area map render — defer until we wire a tile source for `<ServiceMapCard>`
- Mobile-specific layouts — the production surfaces use responsive Tailwind; the bespoke `Mobile*` layouts from `src/components/design-preview/` would need follow-up work to port
- `/messages` open-thread panel + RFQ counter card (Cycle 68 carry-over)
- `/sos` real KPI queries (Cycle 68 carry-over — avg-response and win-rate placeholders)
- Search NL parser (Cycle 68 carry-over)

### Open questions for Cycle 70

1. **`/profile/[id]` IA mirror:** when we restyle the visiting-other-user POV, should it consolidate into `/sellers/[id]` (with viewer-aware copy) or stay as a separate route? Current behavior is two routes for two different content types (storefront vs personal profile); the IA convergence makes the two surfaces nearly identical.
2. **Certifications schema:** `user_certifications` or `seller_certifications`? Probably the former (it's about the person, not their seller role). What's the minimal column set? Need-by date, issuing org, name, doc URL, verified-by-admin flag?
3. **Services schema:** is "services" really separate from "listings" (where each service is a listing with category=service)? Or is it a separate `services` table with its own fields? Today the design preview models them as bespoke; production might collapse.
4. **Photo strip on profile:** does the strip pull from `feed_post_media` of the user's posts, or from a dedicated `profile_photos` upload surface? Both have UX implications.
