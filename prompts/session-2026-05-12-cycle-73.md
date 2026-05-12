# Cycle 73 — Storefront cluster rollout (full-bleed shell)

**Date:** 2026-05-12
**Version shipped:** `4.44.0`
**Prompt revision:** v2

---

## Outcome

Mounted `<AppShellFullBleed>` on the storefront cluster. Three commits land cleanly. URLs unchanged. Page content unchanged. All 417 unit tests + `next build` pass.

| Commit | Sub-step | SHA |
|---|---|---|
| A | Introduce `(main-new-nav-fullbleed)` route group | `b188799` |
| B | Move four storefront routes via `git mv` | `50536de` |
| C | Documentation + CLAUDE.md promotion | (this commit) |

---

## §5.1 — File inventory before move

```
(main)/sellers/[id]/
  data.ts
  page.tsx
  components/SellerRecentReviews.tsx

(main)/companies/[slug]/
  page.tsx
  components/company-hero.tsx
  components/company-listings.tsx
  components/company-reputation.tsx

(main)/profile/
  actions.ts
  data.ts
  loading.tsx
  page.tsx
  components/ProfileEditor.tsx
  components/equipment-interests-editor.tsx
  components/verification-form.tsx
  components/verification-status-card.tsx
  [id]/page.tsx
  [id]/report-button.tsx
```

**Decision:** `(main)/companies/new/` (company-creation onboarding step) stays in `(main)` — unrelated to public storefront, will be reassessed in a later cycle. `(main)/sellers/` removed (became empty after the move).

`/profile/[id]` DOES exist — moved with the rest of `/profile`.

---

## Deviations from the prompt

### 1. Layout shape — mirrored `(main-new-nav)/layout.tsx`, not the v2 §4.1 minimal template

The v2 §4.1 template is a 3-line layout (`<SidebarStatePreloader />` + `<AppShellFullBleed>{children}</AppShellFullBleed>`). The existing `(main-new-nav)/layout.tsx` is much richer: it fetches the user's archetype + active company + company list, sets the `mg_archetype` cookie if drifted, and threads:

- `CompanyContextProvider` (hydrates `useAuthStore.activeCompany`)
- `ArchetypeMigrationBanner` (migration prompt if `archetype_locked = false`)
- `HelpButton`
- `NotificationEducationTrigger`
- `ImportProgressBannerClient`

Two of the moved files reference `useAuthStore` directly:

- `profile/[id]/report-button.tsx` (`const { user } = useAuthStore()`)
- `profile/components/ProfileEditor.tsx` (`useAuthStore()` for user + profile + setProfile)

If the fullbleed layout had been the minimal template, deep-linking to `/profile/[id]` or hard-refreshing `/profile` would have produced an empty Zustand store (no `CompanyContextProvider` hydration) — a regression vs. the legacy `(main)/layout.tsx`. So the fullbleed layout mirrors the dashboard one's auth/company/archetype logic exactly, with only the shell swapped.

### 2. `SidebarStatePreloader` intentionally omitted

The v2 §4.1 template instructs to include `<SidebarStatePreloader>` even on the no-sidebar shell. Rationale given: round-trip sidebar-collapsed persistence.

In practice, `SidebarStatePreloader` is already mounted inside `<AppShellDashboard>` (see `src/components/layout/AppShellDashboard.tsx:19`). Its job is to stamp `data-sidebar-collapsed` on `<html>` before paint — relevant only when a sidebar is about to render. On a full-bleed page, there is no sidebar to apply the attribute to. `localStorage["mg.sidebar.collapsed"]` persists across navigation regardless; the dashboard shell re-stamps it on the next dashboard route.

Including it on the full-bleed layout would be cargo-culting. Documented in the layout file's JSDoc.

### 3. Test file path

The v2 §7.4 CHANGELOG template references `src/test/route-isolation.test.ts`. The actual file is `src/test/nav-route-isolation.test.ts`. Used the actual path; extended the existing file rather than create a new one. CHANGELOG corrected.

---

## Cycle 71 follow-up (`b0f643d`) palette verification

### §5.5 — Static check

```
grep -n "variant.*===.*dashboard\|variant.*===.*full-bleed" src/components/layout/AppHeader.tsx
# (no matches)
```

`AppHeader` reads `variant` only to stamp `data-nav-shell={variant}` (a data-attribute marker). Palette is set inline via `style={{ background: '#0B2545', color: '#E8EEF5' }}` and applies identically to both shells. No fork. Cycle 71 follow-up palette inherits cleanly.

### §6.3 — Visual comparison

Deferred to post-deploy operator verification. The static check is sufficient evidence at the code level — both shells render the same `<AppHeader>` component, with the same style prop, with no variant-conditional branch.

---

## §6.4 — Theme propagation

Single `next-themes` provider at root layout. No new provider added. Theme toggle on `/sellers/[id]` (full-bleed shell) and `/feed` (dashboard shell) operate on the same store — no fork to verify.

---

## CLAUDE.md "No new RPCs" promotion

Moved from the per-cycle prompt §2 to a first-class `Critical Pattern` entry in CLAUDE.md. Refined the framing:

- Removed the "Cycle 69 deviation continues" phrasing (no longer a deviation — it's the established convention across Cycles 69–73).
- Expanded scope from "trust/services/team" to all read-layer concerns (added "navigation counts, cover photos, activity feed").
- Clarified the write-path exemption: `increment_post_reactions`, `cleanup_expired_drafts`, etc. remain fine.
- Left the Cycle 70 mention as a back-reference, simplified.

Future cycle prompts should no longer restate this in §2.

---

## TBD rollout-status rows surfaced for operator attention

Surfaces still on old chrome that need cycle assignment:

- `/listings/[id]` — single-listing detail. Heavy custom page (gallery, AskMetalGear, purchase panel, mobile bar). Probably wants its own cycle.
- `/listings/new`, `/listings/create`, `/listings/snap*`, `/listings/import`, `/listings/bulk-edit` — Cycle 72 moved these into `(main-new-nav)` together with `/listings`. Already on new nav.
- `/sos/new`, `/sos/[id]`, `/sos/create`, `/sos/my-requests` — Cycle 72 moved.
- `/dashboard`, `/radar`, `/saved-searches`, `/notifications`, `/credits`, `/transactions/*`, `/messages` (already moved), `/onboarding`, `/companies/new` — old chrome, needs assignment.
- `/admin/*` — scoped CSS, separate convention.

CHANGELOG and `docs/navigation-system.md` updated to flag these.

---

## Verification

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm test` | 417/417 pass (8 in nav-route-isolation incl. 5 new) |
| `npm run lint` | 0 errors, 62 pre-existing warnings (all in files predating the move) |
| `npm run check:archetypes` | clean (625 files scanned) |
| `npm run build` | succeeds; all 4 storefront paths resolve |
| `find src/app -path "*/sellers/\[id\]/page.tsx"` | 1 match, under `(main-new-nav-fullbleed)` |
| `find src/app -path "*/companies/\[slug\]/page.tsx"` | 1 match, under `(main-new-nav-fullbleed)` |
| `find src/app -path "*/profile/page.tsx"` | 1 match, under `(main-new-nav-fullbleed)` |
| `find src/app -path "*/profile/\[id\]/page.tsx"` | 1 match, under `(main-new-nav-fullbleed)` |

---

## What this cycle did NOT do

- Did not modify `<AppShellFullBleed>` — Cycle 71 built it correctly; mounting revealed no bugs.
- Did not modify any page content. Bright line per §11.8.
- Did not touch `src/components/profile-shared/`.
- Did not add any DB migrations or RPCs.
- Did not move `/settings/*`, `/admin/*`, `/companies/new`, or `/listings/[id]` — those are subsequent cycles.

---

## Post-deploy canary checklist (for operator)

1. `/feed` and `/sellers/[any-id]` open in two tabs at same viewport + theme → top bar visually identical (navy palette parity).
2. `/sellers/[any-id]`: cover grid renders full-width below top bar. No sidebar. 6-tab IA works. Services/Team modules render if data exists.
3. `/companies/[any-slug]`: cover grid full-width. Services + Team modules render. No sidebar.
4. `/profile` (logged-in user's own): trust strip, tabs, editable cover hero functional. No sidebar.
5. `/profile/[other-user-id]`: top bar renders; if route is a stub, that's expected per Cycle 69 deferral.
6. Mobile: bottom nav present on all 4 storefronts.
7. Theme toggle on `/sellers/[id]` propagates to `/feed` and `/settings/company` (legacy chrome).
8. **Canary — OLD chrome unchanged on:** `/settings/company`, `/settings/services`, `/settings/team-visibility`, `/admin/dashboard`, `/listings/[id]`, `/companies/new`, `/`.
9. `Cmd+K` global search works on storefront routes.
10. Browser console: no hydration warnings on storefront routes.
