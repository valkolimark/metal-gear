# Session — 2026-05-12 — Cycle 71 (Navigation system)

## Shipped

1. **`docs/navigation-system.md`** — canonical nav spec (14 sections; surface taxonomy, breakpoint matrix, accessibility, telemetry, cluster rollout plan).
2. **`src/components/layout/` (16 new files)** — composers (`AppShellDashboard`, `AppShellFullBleed`), header (`AppHeader` + 3 client children), sidebar (`AppSidebar` + `AppSidebarItem` + `AppSidebarCompanyList` + `AppSidebarToggle`), mobile (`AppMobileTopBar` + `AppMobileBottomNav` + `AppMobileBottomNavItem` + `AppMobileNavDrawer`), shared (`BrandMark`, `SidebarStatePreloader`, `active-path.ts`, `app-shell.css`, `index.ts`).
3. **`src/lib/layout/nav-data.ts`** — `getNavContext()` with fail-open per-query badge handling.
4. **Route group `(main-new-nav)/`** — `/feed` migrated via `git mv`, wrapped in `AppShellDashboard`. Layout mirrors `(main)/layout.tsx`'s side context (CompanyContextProvider, ArchetypeMigrationBanner, HelpButton, NotificationEducationTrigger, ImportProgressBannerClient).
5. **5 new test files / 26 new tests** — `active-path.test.ts`, `nav-data-fail-open.test.ts`, `app-sidebar-toggle.test.tsx`, `app-mobile-nav-drawer.test.tsx`, `nav-route-isolation.test.ts`. **403 tests pass total** (was 377).
6. **CHANGELOG 4.42.0**, **CLAUDE.md** (new "Navigation system (Cycle 71)" section), **README.md** (new "Navigation" feature blurb).

## Schema column verification (CLAUDE.md prompt §4.1 required this)

- **Unread messages:** `conversations.buyer_id`/`seller_id` → `messages` rows where `read_at IS NULL` AND `sender_id != user.id` AND `conversation_id` is in the user's conversations. (Same path the legacy `(main)/layout.tsx` uses.)
- **Active SOS in user's categories:** `sos_requests.status = 'active'` AND `equipment_category` is in the user's `user_equipment_interests.tier2`. Time-window: last 24 hours.
- **Credits balance:** `contact_credits.credits_remaining` for `user_id`. Defaults to `0` when no row exists.
- **Companies:** `getUserCompanies(userId)` from `@/app/actions/company` returns `CompanyWithRole[]`. No new query.
- **Active company:** cookie `active_company_id` (read via `getActiveCompanyId`).

The prompt's stub `getSessionUserId` does NOT exist in this codebase. Used `createClient().auth.getUser()` per the existing pattern.

## Deviations from spec (with reasons)

- **Component count:** The prompt listed 13 components in §2's contract. Final ship is **16** — added `AppMobileBottomNavItem` (needed for `usePathname` client boundary in the mobile bottom nav, called out in the prompt §4.6 as "wait — usePathname is client. Solution: make `<AppMobileBottomNav>` a server component that renders `<AppMobileBottomNavItem>` client children"), `BrandMark` (the prompt's body imports it but never lists it in §2), and `SidebarStatePreloader` (the prompt's body specifies it but doesn't put it in the §2 table). All three were called out in the prompt body — the §2 table just undercounted.
- **`<AppHeader>` is a pure server component, not "Server (renders client children for interactive bits)".** The interactive bits (`AppHeaderSearch`, bells, avatar menu, mobile drawer) are imported directly as client components — no special boundary logic needed.
- **`getNavContext` is called inside the shells, not pre-fetched in the layout.** The prompt's §4.8 spec snippet does this; the layout passes data via `initialContext`. I kept the simpler form — shells call `getNavContext()` themselves. The layout still does its own DB fetches for archetype/company (those are side context, not nav data). Two batched queries per request total, both fail-open.
- **`<AppMobileTopBar>` is `'use client'`, not server.** It manages drawer open state, so client is the right boundary.
- **`<AppSidebarToggle>` uses `useSyncExternalStore` rather than `useEffect` + `useState`.** The lint rule `react-hooks/set-state-in-effect` (new in React 19) blocked the `useEffect` form. `useSyncExternalStore` is React's canonical pattern for syncing with external state (localStorage) and gives the same SSR-safe semantics. Tests cover the round-trip.
- **`AppMobileNavDrawer` uses plain markup with `transition-transform`, not Radix `Dialog`.** Simpler, smaller, and the drawer's focus-trap/Esc/body-scroll-lock are handled in a single `useEffect`. Tests cover these behaviors.

## Canary verification (the §10 risk #1)

After the `git mv`, manually verified via `npm run build` that:
- Exactly one production `/feed/page.tsx` exists (`src/test/nav-route-isolation.test.ts` codifies this).
- Every other route still builds: `/sos`, `/sos/[id]`, `/sos/create`, `/listings`, `/listings/[id]`, `/messages`, `/sellers/[id]`, `/companies/[slug]`, `/profile`, `/profile/[id]`, `/search`, `/dashboard`, `/radar`, `/settings/*`, `/admin/*`, `/onboarding`, etc. all appear in the build output.
- `(main)` group does NOT import `AppShellDashboard` / `AppShellFullBleed` (codified by `nav-route-isolation.test.ts`).
- Build is clean: 0 errors, 0 warnings beyond pre-existing repo warnings (`62 problems, 0 errors`).

## Side-effects worth noting

- **`/feed` lost its `FeedLeftSidebar`** (the Cycle 27b-1 inline left rail). Removed because `AppSidebar` now provides equivalent functionality (profile chip via the global top bar, primary nav, companies list, Send SOS button). The page's right rail (`FeedRightSidebar` with SOS alerts + discovery listings) and center column (composer, posts, FeedActiveSOSRow) are unchanged.
- **`/feed`'s `Promise.all` was pruned** — `getUserCompanies` and the inline unread-message subquery are gone (now in `getNavContext`). Net: one fewer batched DB roundtrip on the `/feed` route.
- **`vitest.config.ts` gained a `server-only` alias** so vitest-under-jsdom can import server modules like `nav-data.ts`. Generic stub at `src/test/mocks/server-only.ts`.
- **`nav-data.ts`'s warn-log path checks `NEXT_PHASE === 'phase-production-build'`** to keep build logs clean. Next does a static-render probe of every route at build time; cookies/auth correctly throws "Dynamic server usage" during that probe; our fail-open path catches it; the warn line would otherwise pollute build output.

## Build state at end of session

- `npx tsc --noEmit` — clean (after clearing stale `.next/types/validator.ts` that referenced the old `(main)/feed` path before `next build` regenerated them).
- `npm run lint` — 0 errors, 62 warnings (all pre-existing).
- `npx vitest run` — 403 / 403 tests pass.
- `npm run build` — clean (no errors, no warnings).

## What's next

Cycle 72 — Move dashboard surfaces into `(main-new-nav)`: `/sos`, `/messages`, `/listings`, `/search`, `/dashboard`, `/radar`. Pure mounting work; no new components needed.

Cycle 73 — Storefront/profile surfaces. Likely introduces a `(main-new-nav-fullbleed)` sibling group with its own layout using `AppShellFullBleed`.
