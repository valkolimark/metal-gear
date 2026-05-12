# Session — 2026-05-12 — Cycle 72 (Nav fixes + dashboard cluster rollout)

## Three deliverables, three commits

1. **Part A — defensive coverage for nav icons.** Audit-first, fix-if-needed pattern. The audit found Cycle 71's icon-rendering code was already structurally correct: `AppHeaderNotificationsBell` renders its button + icon unconditionally with only the count badge conditional; `SirenIcon` is imported from `@/components/landing/icons` (correct hand-rolled SVG, not Lucide); `nav-data.ts`'s `computeInitials()` always falls back to `'MG'` so `AvatarFallback` never renders empty. No production fix needed. Added 9 Vitest tests across `AppHeaderNotificationsBell` (5 cases) and `AppHeaderAvatarMenu` (4 cases) to lock the behavior — these would have caught the imagined regression at PR time.
2. **Part B — three-state theme toggle restored.** Reused `<ThemeToggle />` from `src/components/ui/theme-toggle.tsx` unchanged. Placed inside `AppHeaderAvatarMenu` under a new "Appearance" `<DropdownMenuLabel>`, wrapped in a click-stop-propagation `<div>` so cycling theme states keeps the menu open. Mirrored on mobile in `AppMobileNavDrawer`'s footer above the Send SOS pill. `docs/navigation-system.md` §1.1 + §1.4 updated to reference the Appearance placement; new §1.5 documents the theme-system integration (single `next-themes` provider, theme-invariant SOS-orange, three states).
3. **Part C — dashboard cluster moved into `(main-new-nav)`.** Four routes: `/sos`, `/messages`, `/listings`, `/search`, all with child routes and colocated `actions.ts` / `components/` directories. All moves via `git mv` (history preserved). Updated 6 cross-module import paths that pointed at the old `(main)/...` paths.

## Existing ThemeToggle audit

- File: `src/components/ui/theme-toggle.tsx`.
- Shape: single cycling icon button (`<Button variant="ghost" size="icon">`). Click cycles `system → light → dark → system`. Icon is `Monitor` / `Sun` / `Moon` from Lucide. Title attribute shows the current state.
- Consumes `useTheme()` from `next-themes`. No props — relies entirely on the root `<ThemeProvider>`.
- **Decision:** dropped into the new nav as-is. The "Auto / Light / Dark" three-state surface that the README implies is achieved via cycling, not via three discrete chips. If a future cycle wants three chips inline (e.g., GitHub-style), it should ship a sibling `ThemeToggleSegmented` component — never modify `ThemeToggle` because the legacy `Header` chrome depends on its current API on every route still in `(main)`.

## Cross-module import rewrites (Part C side-effect)

Six files had stale `@/app/(main)/{sos,messages,listings,search}/...` imports after the route moves. All rewritten to `@/app/(main-new-nav)/...`:

- `src/app/actions/messaging.ts` — imports from `@/app/(main-new-nav)/messages/actions`
- `src/app/(main-new-nav)/listings/[id]/components/MobilePurchaseBar.tsx` — imports from `@/app/(main-new-nav)/messages/actions`
- `src/app/(main-new-nav)/listings/[id]/components/ListingPurchasePanel.tsx` — same
- `src/test/sos-dashboard-tabs.test.tsx` — imports the moved `SosDashboardTabs`
- `src/test/listings-actions.test.ts` — imports the moved `actions.ts`
- `src/components/listings/AIImageCapture.tsx` — imports from `@/app/(main-new-nav)/listings/new/actions`

Found via `grep -rln "@/app/(main)/(sos|messages|listings|search)" src/`. Will need to repeat the same grep after each future cluster rollout.

## Canary on the legacy chrome

After the moves, `npm run build` succeeded and listed every URL as expected: `/sos`, `/messages`, `/listings`, `/search` resolve from `(main-new-nav)`; `/sellers`, `/companies`, `/profile`, `/settings/*`, `/dashboard`, `/radar`, `/credits`, `/notifications`, `/transactions`, `/checkout`, `/boost`, `/collections`, `/compare`, `/favorites`, `/insights`, `/inventory`, `/invite`, `/saved-searches`, `/schedule` still resolve from `(main)`. Will manually canary on production after deploy by loading at least three legacy-chrome routes and confirming they look unchanged.

## Build state at end of session

- `npx tsc --noEmit` — clean (after `.next/types` reset to flush stale validator references to the old paths).
- `npm run lint` — 0 errors, 62 warnings (all pre-existing).
- `npx vitest run` — 412 / 412 tests pass (was 403; Cycle 72 added 9).
- `npm run build` — clean.

## What's next

**Cycle 73 — storefront/profile cluster.** `/sellers/[id]`, `/companies/[slug]`, `/profile`, `/profile/[id]`. These need `<AppShellFullBleed>` (no sidebar). Likely introduces a sibling group `(main-new-nav-fullbleed)/` with its own layout, since route groups can have only one layout per group. Cycle 73's first decision is the group structure.

**Cycle 74 — settings + admin.** Settings has its own internal nav; consider whether `<AppShellDashboard>` should respect a sidebar-collapsed-default prop on settings routes. Admin lives under `[data-section="admin"]` scoped CSS — needs careful coexistence check before moving.
