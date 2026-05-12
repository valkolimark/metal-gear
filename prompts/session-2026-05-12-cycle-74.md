# Session Summary — Cycle 74

**Date:** 2026-05-12
**Cycle shape:** rollout-only. Three commits (Sub-steps A / B / C).
**Version shipped:** 4.45.0
**Branch:** main

---

## Result

- **Sub-step A (ed429a4):** `feat(layout): roll out new nav to dashboard secondary surfaces (Cycle 74 Part A)` — 24 file renames.
- **Sub-step B (69cc72f):** `feat(layout): roll out new nav to settings cluster (Cycle 74 Part B)` — 11 file renames.
- **Sub-step C (this commit):** docs + tests + CHANGELOG + session summary.

After this cycle, every page in the previously-explicit Cycle 74 scope (dashboard secondaries + settings) resolves only under the new-nav route groups. The legacy `(main)` group still contains `/companies/new`, `layout.tsx`, and 8 TBD routes that the prompt did not scope (see §3 below).

---

## 1. Pre-flight inventory

### 1.1 — Dashboard secondaries (Sub-step A scope)

| Route | Files moved |
|---|---|
| `/dashboard` | `page.tsx`, `loading.tsx`, `components/` (7 component files: `hidden-listings-alert.tsx`, `locked-metric.tsx`, `new-listings-snipe-feed.tsx`, `performance-bar.tsx`, `seller-intelligence.tsx`, `team-activity-widget.tsx`, `trusted-vendors-widget.tsx`) |
| `/radar` | `page.tsx`, `loading.tsx`, `RadarPageClient.tsx`, `[id]/page.tsx`, `[id]/components/radar-list-actions.tsx` |
| `/credits` | `page.tsx` |
| `/notifications` | `page.tsx`, `loading.tsx` |
| `/favorites` | `page.tsx`, `loading.tsx` |
| `/saved-searches` | `page.tsx`, `loading.tsx` |
| `/transactions` | `page.tsx`, `loading.tsx`, `[id]/page.tsx` |

24 files. All renames clean (git status showed 100% similarity).

### 1.2 — Settings cluster (Sub-step B scope)

| Route | Files moved |
|---|---|
| `/settings/company` | `page.tsx`, `CompanySettingsForm.tsx`, `members/page.tsx`, `members/MembersList.tsx`, `members/invite-form.tsx`, `members/pending-invites.tsx` |
| `/settings/services` | `page.tsx`, `ServicesEditor.tsx`, `typeahead-action.ts` |
| `/settings/team-visibility` | `page.tsx`, `TeamVisibilityList.tsx` |

11 files. All renames clean.

The prompt's §5.1 anticipated more settings sub-routes (`profile`, `verification`, `marketplace`, `listing-defaults`, etc.) — these don't yet exist in the codebase. The settings cluster as built is narrower than the design preview suggests. No settings-internal left-rail nav component currently exists; the lone passing reference in `src/components/layout/page-layout.tsx:23` is a code comment, not a component import. The "settings nav" planned for the design preview is Cycle 75 work.

---

## 2. Architectural decision — settings uses full-bleed shell

The prompt directed settings into `(main-new-nav-fullbleed)`. Verified that none of the existing settings sub-routes currently render a global sidebar or page-level settings nav, so:

- **Today:** the move just shifts settings pages from the legacy `Header`/`DesktopNav` chrome to the new `<AppShellFullBleed>` (top bar + mobile bottom nav, no sidebar). No visual regression — both pre- and post-move had no global left rail.
- **Cycle 75:** when the settings-internal left-rail nav lands, it can be a pure page-level component without competing with a global sidebar. The shell choice future-proofs the planned `/design/settings` IA.

Documented in `docs/navigation-system.md` §11.1 and `CLAUDE.md` Navigation section.

---

## 3. TBD discoveries — routes under `(main)` NOT in cycle scope

The prompt's §0 step D directed: "Anything we haven't accounted for is a TBD case — flag it." §11 note 9: "TBD discoveries belong in the session summary, not in the prompt's scope."

Pre-move `(main)` directory listing showed 17 entries. The prompt explicitly scoped 8 (dashboard, radar, credits, notifications, favorites, saved-searches, transactions, settings) and explicitly deferred `/companies/new` and `/admin/*`. The remaining 8 are **TBDs for Cycle 75 operator decision**:

| Route | What's there | Likely fate |
|---|---|---|
| `/boost` | `page.tsx` only | Likely a boost-purchase landing page — Dashboard shell candidate |
| `/checkout` | `page.tsx`, `success/page.tsx` | Stripe-driven checkout flow — full-bleed minimal-chrome candidate (or its own route group) |
| `/collections` | `page.tsx`, `[id]/page.tsx` | Per CLAUDE.md "Unified Radar (Cycle 40)": `/collections` is a redirect to `/radar?tab=lists` — may be safe to delete instead of move |
| `/compare` | `page.tsx` only | Listing-comparison page — Dashboard shell candidate |
| `/insights` | `page.tsx` only | Likely seller intelligence / insights page — Dashboard shell candidate |
| `/inventory` | `page.tsx` only | Likely seller inventory view — Dashboard shell candidate |
| `/invite/[token]` | `page.tsx` only | Cycle 28 team-invite acceptance; middleware-exempt from auth + company guard — needs its own shell decision (minimal chrome to reduce friction?) |
| `/schedule` | `page.tsx` only | Likely calendar / scheduling — Dashboard shell candidate |

Recommendation for Cycle 75:
- Audit `/collections` middleware/redirect status and likely DELETE rather than move (per Cycle 40 unification).
- Move `/boost`, `/compare`, `/insights`, `/inventory`, `/schedule` to Dashboard shell.
- Decide `/checkout` and `/invite/[token]` shell separately — both have friction-minimization reasons to avoid the full sidebar.

---

## 4. Risk-area verification

### 4.1 — Single-resolution (every moved route)

`find src/app -path "*/$ROUTE/page.tsx"` returned exactly one result for each of: dashboard, radar, credits, notifications, favorites, saved-searches, transactions, settings/company, settings/company/members, settings/services, settings/team-visibility. None under `(main)`; all under the target new-nav group. Plus radar/[id] and transactions/[id] resolved as expected.

### 4.2 — External imports

`grep -rn "from ['\"]@/app/(main)/<route>" src/` returned ZERO matches for any of the moved routes. No external files reference `(main)` paths — moves were safe.

### 4.3 — Relative imports

`grep -rn "from ['\"]\.\." src/app/(main)/settings/` and equivalent for dashboard-secondary directories returned ZERO matches. All page imports use `@/...` absolute paths. No import path repair needed post-move.

### 4.4 — Typecheck

After `rm -rf .next/types && npm run typecheck`: clean. (Initial run failed against stale `.next/types/validator.ts` references to the old `(main)/...` paths — Next.js-generated cache, regenerates from current route tree on next build/dev.)

### 4.5 — Test suite

- `npm test` full suite: **426 passing** (was 417 pre-cycle). +9 from extended `nav-route-isolation.test.ts`.
- `nav-route-isolation.test.ts` standalone: **17 passing** (was 8 pre-cycle).

### 4.6 — Lint

`npm run lint`: 0 errors, 62 pre-existing warnings unchanged.

### 4.7 — Manual canary

Not run in this session (no dev server start). Operator should verify post-deploy:
- `/feed`, `/sellers/[id]`, `/settings/company` top bars visually identical (navy palette parity).
- Theme toggle on any new-nav surface propagates globally.
- Settings sub-routes render without global sidebar; existing forms function.
- `/companies/new` and `/admin/*` still render legacy chrome.

---

## 5. Cycle 70 module behavior — unaffected

Per the prompt's §6.6 callout, Cycle 70 modules required explicit re-verification. None were modified in this cycle. The moved files include `/settings/services/ServicesEditor.tsx` (the Cycle 70 services-edit UI), `/settings/services/typeahead-action.ts` (the Cycle 70 typeahead server action), and `/settings/team-visibility/TeamVisibilityList.tsx` (the Cycle 70 self-service opt-in switches). All moved as part of the settings directory tree; no content changes; absolute imports preserved.

Storefront-side rendering of Cycle 70 services (with the Free-tier pricing lock) lives in `/sellers/[id]` and `/companies/[slug]`, which were migrated in Cycle 73 — also unaffected.

The Cycle 70 admin nudge UI on `/settings/company/members` (the "Request public visibility" link that fires `requestMembershipPublicVisibility`) moved as part of the settings/company/members directory tree. No content changes.

---

## 6. No new RPCs

The Cycle 73 invariant in CLAUDE.md Critical Pattern (`No new Postgres RPCs for read paths`) was not violated this cycle. No new Postgres functions, no new read-path RPCs, no new server actions. Pure file renames + test extensions + doc updates.

---

## 7. Notes for Cycle 75

1. **Settings nav component** is the highest-value Cycle 75 addition for settings. Now that settings lives on the full-bleed shell, a page-level `<SettingsNav>` component can be introduced under `src/app/(main-new-nav-fullbleed)/settings/_components/` (or `src/components/settings/`) without any architectural reshape.
2. **Buyer-preview rail** on `/settings/company` (per design preview): three new components (`<ProfileHealthScorer>`, `<ProfileHealthChecklist>`, `<StorefrontPreviewCard>`) plus activity-feed wiring. New server queries — but `getSellerStats`-pattern in TS, NOT new RPCs.
3. **TBD route audit** (see §3 above): Cycle 75 should triage the 8 unmigrated `(main)` routes — likely 5 to Dashboard shell, `/collections` to deletion, `/checkout` + `/invite/[token]` shell decisions individually.
4. **Legacy component deletion sweep:** `src/components/layout/header.tsx`, `desktop-nav.tsx`, `mobile-nav/MobileNavClient.tsx`, `mobile-drawer.tsx`, and the `src/components/mobile-nav/` mobile components are no longer imported by any cycle-71–74-migrated route. After Cycle 75 completes the remaining routes, full deletion is safe. Confirm no other consumers before deleting.
5. **`(main)/layout.tsx`** itself remains in place. Once `(main)` contains only `/companies/new` (after Cycle 75 disposition of the 8 TBDs), the legacy layout file can be moved/inlined or replaced with a minimal layout specifically for `/companies/new`.

---

## 8. Commits

```
69cc72f feat(layout): roll out new nav to settings cluster (Cycle 74 Part B)
ed429a4 feat(layout): roll out new nav to dashboard secondary surfaces (Cycle 74 Part A)
```

Sub-step C (this session summary + docs + tests + CHANGELOG) is pending commit.
