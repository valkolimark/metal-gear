# Metal Gear — Industrial Equipment Marketplace

## Project Overview
Houston, TX industrial equipment marketplace. Buy/sell heavy machinery across oil & gas, petrochemical, mining, manufacturing, and CNC machining.

## Cinematic Landing (Cycle 67)
- **Surface:** `src/app/page.tsx` is a Server Component that mounts `LandingDesktop` (`hidden md:block`) and `LandingMobile` (`md:hidden`) under `<div data-section="landing">`. Both layouts are hand-tuned per the design handoff — not a single responsive component.
- **Components:** `src/components/landing/` — `LandingDesktop.tsx`, `LandingMobile.tsx`, `shared.tsx` (primitives), `icons.tsx` (hand-rolled SVGs), `data.ts` (design fallbacks), `types.ts`.
- **Server data:** `src/app/actions/landing.ts` — `getLandingNetworkSummary`, `getLandingFeaturedShops`, `getLandingTicker`, `getLandingStats`. Real DB rows wherever available (`company_profiles`, `listings`, `sos_requests`); falls back to design fixtures only when a table is genuinely empty.
- **Palette tokens:** cinematic blue (`--mg-accent: #3B9EFF`, `--mg-accent-rgb: 59, 158, 255`, `--mg-warm-1: #0B1A2E`, `--mg-warm-2: #163763`, `--mg-warm-3: #1F5BB8`) live as inline style on the homepage wrapper. Children read `var(--mg-accent)` and `rgb(var(--mg-accent-rgb) / <alpha>)`. `--mg-font-display` / `--mg-font-body` map to Manrope, `--mg-font-mono` to JetBrains Mono.
- **Fonts:** Manrope (weights 300–800) + JetBrains Mono (weights 500–700) + Chakra Petch (existing display family for the rest of the app) all wired via `next/font/google` in `src/styles/fonts.ts`. CSS variables `--font-manrope`, `--font-jetbrains-mono`, `--font-chakra-petch` exposed on `<body>`.
- **Hero photo:** `/landing/hero-rotor.webp` (294 KB). Replace with a properly licensed equivalent before final launch.
- **Brand framing:** SOS-first ("Find the shop you can trust" / "When the line goes down at 3 AM"), positions Metal Gear as the trust layer for verified industrial rebuilders. Marketplace functionality is still the engine; just no longer the headline. Keep "rebuilders" as a marketing-only label that resolves to `company_profiles` until a verified-rebuilder concept is added.
- **Stats discipline:** only show numbers backed by real DB queries. Do not re-introduce `$184M traded` / `< 4 hrs avg response` / `4,287 verified rebuilders` literal copy until those metrics are real.
- **Animations:** `mg-pulse` and `mg-sos-pulse` keyframes scoped to `[data-section="landing"]` in `globals.css` to keep landing motion out of the rest of the app.

## Tech Stack
- **Framework:** Next.js 15 (App Router, RSC, TypeScript)
- **Database/Auth:** Supabase (PostgreSQL, Auth, Realtime)
- **Media Storage:** Cloudflare R2 (images/docs via `media.metalgear.com`) + Cloudflare Stream (videos)
- **Styling:** Tailwind CSS v4 (CSS-based config, no tailwind.config.ts) + shadcn/ui (new-york style)
- **State:** Zustand (4 stores: auth, ui, search, import) + TanStack Query
- **Error Tracking:** Sentry
- **Hosting:** Vercel

## Design System
- **Theme:** Light/dark mode via `next-themes` (system default, `enableSystem`, `storageKey="metal-gear-theme"`); ThemeToggle is three-state: Auto (system) → Light → Dark; Facebook palette: dark `#18191A`/`#242526`/`#3A3B3C` bg layers, light `#F0F2F5`/`#FFFFFF` bg; `#1877F2` primary blue; SOS stays orange `#FF6B2B`; `ThemeToggle` in header + admin header + mobile menu drawer
- **Brand palettes:** Industrial (default) and Ocean (navy/teal/cyan); `data-palette` attribute on `<html>`; switchable from Admin Settings → Brand Palette; persisted in `system_config` + cookie
- **Admin CSS isolation:** `src/app/(admin)/admin.css` with scoped `[data-section="admin"]` tokens; sidebar always dark
- **Mobile nav:** `MobileHeader` (52px) + `MobileBottomNav` (5 tabs, raised SOS) + `MobileMenuDrawer` (slide from right) via `MobileNavClient` wrapper; `md:hidden`; feed page uses document-level scroll (not overflow-y-auto container) for iOS fixed-position compatibility; feed post media: `max-h-[300px] md:max-h-none object-cover` on mobile
- **Fonts:** Chakra Petch (display/headings) + Manrope (body) via `next/font/google`
- **Components:** 15 shadcn/ui components installed (button, input, card, dialog, dropdown-menu, avatar, badge, separator, skeleton, sonner, tooltip, label, select, switch, sheet)

## Navigation system (Cycle 71)
- **Canonical spec:** `docs/navigation-system.md` is the source of truth. Read it before touching any nav code. Changes to the IA must update the spec FIRST.
- **Primitives:** `src/components/layout/` ships the canonical nav. Composers `<AppShellDashboard>` (top bar + sidebar + mobile bottom nav) and `<AppShellFullBleed>` (top bar only, no sidebar). Header trio: `AppHeader` + `AppHeaderSearch` (Cmd+K) + `AppHeaderNotificationsBell` (modes: `sos`/`messages`/`combined`) + `AppHeaderAvatarMenu`. Sidebar trio: `AppSidebar` + `AppSidebarItem` (`active-path.ts` helpers handle prefix vs. query-param matching) + `AppSidebarCompanyList` + `AppSidebarToggle` (uses `useSyncExternalStore` to sync `localStorage["mg.sidebar.collapsed"]`). Mobile: `AppMobileTopBar` + `AppMobileBottomNav` + `AppMobileBottomNavItem` + `AppMobileNavDrawer` (focus-trapped, Esc-to-close, body-scroll lock). Shared: `BrandMark`, `SidebarStatePreloader` (inline `<script>` for SSR-safe sidebar state).
- **Route group convention:** routes migrate to one of two sibling new-nav groups, depending on which shell their page wants:
  - `src/app/(main-new-nav)/` → `<AppShellDashboard>` (top bar + sidebar + mobile bottom nav). Used for `/feed`, `/sos`, `/messages`, `/listings`, `/search`.
  - `src/app/(main-new-nav-fullbleed)/` → `<AppShellFullBleed>` (top bar + mobile bottom nav, **no sidebar**). Used for storefront/profile surfaces with Cycle 68 cover-grid heroes: `/sellers/[id]`, `/companies/[slug]`, `/profile`, `/profile/[id]`.
  Routes still under `src/app/(main)/` continue to use the legacy chrome (`Header` / `DesktopNav` / `MobileNavClient` / `mobile-drawer`). Decide a route's shell by whether its hero needs full-viewport visual real estate (cover-grid pattern) — if yes, full-bleed.
- **Storefront cluster rule (Cycle 73):** any route showcasing a cover-grid hero (4-tile pattern) belongs in `(main-new-nav-fullbleed)`. New such routes go here. Sidebars compete with cover-grid heroes for visual weight — keep them apart.
- **Both new-nav layouts mirror the same global concerns:** `CompanyContextProvider`, `ArchetypeMigrationBanner`, `HelpButton`, `NotificationEducationTrigger`, `ImportProgressBannerClient`. If you fork a third sibling group, mirror these or storefronts silently lose global affordances (company switcher, archetype migration banner, etc.).
- **Top-bar palette is canonical across shells.** The Cycle 71 follow-up (`b0f643d`) navy palette lives in `<AppHeader>` and is inherited by both `<AppShellDashboard>` and `<AppShellFullBleed>`. **Visual parity between `/feed` and `/sellers/[id]` is the canary** — they must look identical above the fold. Do not branch `AppHeader` on `variant`.
- **Nav-context fetch pattern:** `getNavContext()` in `src/lib/layout/nav-data.ts` is called **once** per shell render and threaded via the `ctx` prop. Never call it twice on the same page. Returns `null` for unauthenticated; shells `redirect('/login')` at that boundary.
- **Fail-open badges:** every badge query (unread messages, active SOS in categories, credits balance) is wrapped — a failing query returns `0`, logged via `console.warn` (silenced in `test` and `phase-production-build`). Navigation is too high-stakes to ever block on a count.
- **Sidebar state persistence:** `localStorage` key `mg.sidebar.collapsed`. SSR-safe via `<SidebarStatePreloader>`'s inline script — same shape as `next-themes`. CSS in `app-shell.css` keys off `:root[data-sidebar-collapsed]`. **Do not** move the read into a `useEffect`; that produces a visible expand-then-collapse flash.
- **Mobile bottom nav 5 items are canonical:** Feed · Browse · SOS · Messages · Profile. Adding a 6th is a spec change — update `docs/navigation-system.md` first.
- **SOS orange `#FF6B2B` on mobile bottom-nav SOS button is load-bearing** — visual differentiator for field-side SOS posting. Do not desaturate, recolor, or downsize.
- **Telemetry:** `data-nav-event` attributes (e.g., `primary:feed`, `mobile-bottom:sos`, `drawer:opened`, `bell:sos`, `footer:sos-send`) collected by the existing analytics pipeline. Add new events to the spec doc's §7 before adding to code.
- **Test guardrails:** `src/test/nav-route-isolation.test.ts` codifies (a) `(main)` group MUST NOT import `AppShellDashboard` or `AppShellFullBleed`, (b) `(main-new-nav)` group MUST have a layout.tsx that imports `AppShellDashboard`, (c) `(main-new-nav-fullbleed)` group MUST have a layout.tsx that imports `AppShellFullBleed`, (d) exactly one production `/feed/page.tsx`, `/sellers/[id]/page.tsx`, `/companies/[slug]/page.tsx`, `/profile/page.tsx`, `/profile/[id]/page.tsx` exists in `src/app` (the `/design/*` reference pages are excluded by path), each under the expected group. Breaking any of these fails CI.
- **Theme toggle placement (Cycle 72):** the `<ThemeToggle />` at `src/components/ui/theme-toggle.tsx` is reused unchanged inside the new nav. Desktop = `AppHeaderAvatarMenu` dropdown under an "Appearance" `<DropdownMenuLabel>`, wrapped in a `<div onClick={(e) => e.stopPropagation()}>` so cycling theme states keeps the menu open. Mobile = `AppMobileNavDrawer` footer "Appearance" row above the orange Send SOS pill. Both consume the single root `next-themes` provider — toggling on a new-nav surface immediately applies on every legacy-nav surface. **Do not fork the toggle component**; wrap if needed.
- **Bell-rendering rule (Cycle 72):** `AppHeaderNotificationsBell` always renders its button + icon. Only the count badge is conditional on `count > 0`. Codified by `src/test/components/layout/AppHeaderNotificationsBell.test.tsx`. Hiding the bell on zero count is a regression — users need to see the affordance to know it exists.
- **Avatar fallback rule (Cycle 72):** `nav-data.ts`'s `computeInitials()` always returns at least the `'MG'` ultimate fallback. `AppHeaderAvatarMenu` uses `AvatarFallback` with these initials; never renders an empty button. Codified by `AppHeaderAvatarMenu.test.tsx`.
- **Rollout status:** consult `docs/navigation-system.md` §11.1 for current rollout state per surface. Update that table every cycle that moves routes. Cycle 72 added the dashboard cluster (`/sos`, `/messages`, `/listings`, `/search`); Cycle 73 added the storefront cluster on the full-bleed shell (`/sellers/[id]`, `/companies/[slug]`, `/profile`, `/profile/[id]`).

## Cycle 68 conventions (chrome tokens)
- **Soft-card shadow token** (canonical surface treatment from Cycle 68 forward): no border, `rounded-2xl`, layered drop-shadow `0 1px 2px rgba(11,37,69,0.04), 0 4px 12px rgba(11,37,69,0.05)`. Lives on the shared `<Card>` primitive in `src/components/ui/card.tsx` — every consumer inherits automatically. Surfaces using inline shadow (feed components, design-preview, future profile-shared components) must use this exact string. Do not redefine.
- **Cover-grid pattern** (sellers, companies, profile): 280px tall, `grid-template-columns: 2fr 1fr 1fr`, `grid-template-rows: 1fr 1fr`, `gap: 4px`, background `#0A1628` (intentional in both light + dark mode — not a theme variable). Large left tile spans `1 / span 2`. Mobile (<768px) collapses to a single banner photo (drops the 3 small tiles — they don't read at that size).
- **Cover-chip palette** (overlay chips on cover grids): JetBrains Mono, 10px, uppercase, `letter-spacing: 0.10em`. Two variants — `category` (white text on translucent black, e.g. "COMPANY · STOREFRONT", "INDIVIDUAL · STOREFRONT", "MEMBER · YOUR PROFILE") and `verified` (emerald text on emerald-tinted translucent, e.g. "VERIFIED SELLER", "VERIFIED DEALER", "ID + INSURANCE VERIFIED").
- **KPI tile spec** (listing dashboard, SOS dashboard, future profile/sellers strips): `rounded-xl bg-card px-4 py-2.5`; label is 11px uppercase muted; value is 22–28px Manrope display. Optional sub-pill below the value (em-dash `—` when the underlying metric isn't yet wired). Never render `0` in place of an unknown stat — render `—`.
- **Sticky save bar spec** (settings forms): navy background `#0A1628`, orange `#FF6B2B` action pill, fixed-bottom or sticky positioning with shadow lifting it above the form content. Used in `/settings/company` and any future settings surface with destructive-or-batch save semantics.
- **Design-preview route convention:** `/design/*` (top-level under `src/app/design/`, NOT under `(main)`) is the internal-only reference surface. All design-preview pages set `noindex,nofollow`. Components live under `src/components/design-preview/` with per-surface mock fixtures (`*-data.ts`). Production code must NEVER import from `src/components/design-preview/` — these are visual references, not production primitives.

## Services + Team modules (Cycle 70)
- **Services tables (Cycle 70):** `seller_services_taxonomy` (curated reference, ~41 seeded entries across 8 categories — centrifuge-services / pump-services / gearbox-drivetrain / field-service / inspection-testing / fabrication / rigging-logistics / other; `slug` UNIQUE, public-read RLS, admin writes only, trigram GIN index on `label`). `seller_services` (per-seller rows; XOR target via `seller_profile_id`/`seller_company_id`; XOR label via `taxonomy_id`/`custom_label`; CHECK constraints on SLA range + non-negative price; soft-delete via `is_active`; full owner-scoped RLS — owner policies scoped `TO authenticated` to side-step the pre-existing `company_memberships` recursion).
- **Services tier-gate** is **applied at the read layer** in `getServicesForSeller`, not at creation. Free-tier sellers have `priceFromUsd` stripped to `null`; the `ServiceCard` renders a lock icon + "Pricing on Pro+" pill. SLA renders for ALL tiers — only price is gated. Sellers can still configure prices on `/settings/services` — they just don't render publicly until upgrade. Tier resolution for companies routes through the company's owner-membership `user_id` via `getActiveTier(ownerUserId, companyId)`.
- **Services taxonomy + free-text pattern** mirrors the Equipment Registry (Cycle 61a). `taxonomy_id` for curated entries; `custom_label` for long-tail. Never both. DB CHECK enforces. Free-text submissions are sanitized via `sanitizeText` at the action layer.
- **`src/lib/profile/services.ts` (server)** = the canonical read path. `src/lib/profile/services-format.ts` = pure helpers (`formatPriceFrom`, `formatSla`) — kept separate so they can be imported into client/test code without pulling in `server-only`.
- **`src/lib/profile/services-taxonomy.ts`** — `searchServicesTaxonomy(query, limit)` for the typeahead. Empty/<2-char query returns first 20 by sort_order. Free-text sanitized via `escapePostgrestValue`.
- **Team module — opt-in privacy model.** `company_memberships.is_public_on_profile BOOLEAN NOT NULL DEFAULT FALSE`. ALL existing rows default to FALSE at migration time, including owners. Only the member themselves can toggle via `toggleMembershipPublicVisibility` (server action enforces `user_id = auth.uid()`). Admins can fire `requestMembershipPublicVisibility` which sends a `team_visibility_request` notification deep-linking to `/settings/team-visibility`; the action does NOT change the visibility itself.
- **Private member count never exposed publicly.** `TeamModule.totalAllCount` is internal — the default subtitle is plain "{N} members". Companies can opt into "{N} of {M} (others private)" via `showPrivateCountHint` prop, but the default UI keeps the aggregate hidden to avoid leaking team-size signal.
- **No new Postgres RPCs for read paths.** Trust/services/team metrics computed in TS. See the canonical invariant in **Critical Pattern** below.
- **Pre-existing RLS bug**: `company_memberships_read_by_company_member` has an EXISTS subquery that recursively SELECTs `company_memberships`, triggering Postgres 42P17 ("infinite recursion") on anon-role PostgREST queries. **Does not affect Cycle 70 surfaces** because all reads go through `createAdminClient()` (bypasses RLS). Surfaces only when a client makes a direct `/rest/v1/company_memberships` call as anon. Fix deferred to Cycle 71+ (refactor to SECURITY DEFINER function). Cycle 70 mitigation: `seller_services` owner policies scoped `TO authenticated` so the recursion never triggers from anon.

## Profile + Sellers IA (Cycle 69)
- **Shared building blocks:** `src/components/profile-shared/` — `TrustStripCard`, `ProfileTabsNav`, `CoverGrid`, `ActivityFeed`, `ListingsGridModule`, `FollowButton`. Reused across `/sellers/[id]`, `/profile`, `/companies/[slug]` (Cycle 70+), `/profile/[id]` (Cycle 70+). **Production code may import from `profile-shared/` freely.** (Contrast with `design-preview/` which is reference-only.)
- **Tab routing convention:** `/sellers/[id]` and `/profile` use `?tab=<id>` query-param tab routing, server-rendered tab content (no `<Suspense>` flicker — keeps SEO and time-to-first-paint clean). Unknown tab → falls back to default. Disabled tabs render in the nav but cannot be activated; placeholder content explains the deferral.
- **Trust metrics — TypeScript, not RPC:** `src/lib/profile/trust-metrics.ts` (`getSellerTrustMetrics({ profileId, companyId })`) is the canonical 5-stat read path. Aggregates reviews, transactions (status=completed), SOS responses, response time/rate (derived from `conversations.messages` first-reply diff), follower count, on-platform tenure. Company variant aggregates across `company_memberships`. Pattern mirrors the existing `getSellerStats` in `src/app/actions/storefront.ts`. **Do not query the underlying tables directly for trust-strip stats** — keeps the formula in one place.
- **Cover photos:** `src/lib/profile/cover-photos.ts` (`getCoverPhotosForSeller({ profileId | companyId, limit })`) returns up to N photo URLs for the small tiles in a cover grid. Strategy: most-recently-active listings, position-0 photos first, dedup'd across listings, backfill within-listing if needed. Returns `[]` when no media exists (CoverGrid falls back to gradients for any empty slot).
- **Activity feed source:** `src/lib/profile/activity.ts` synthesizes the activity timeline from `listings`, `reviews`, `transactions` (status=completed), and `sos_responses`. **Do NOT** read from `user_activity` for this surface — that table tracks view/search/favorite events at page granularity and is too noisy. Five entry types: `listing_created`, `listing_sold`, `review_received`, `transaction_completed`, `sos_responded`.
- **Em-dash for null trust stats:** brand-new sellers/profiles render `—` rather than `0` for rating, transactions, SOS responses, response time, on-platform. **This is intentional.** "0 reviews" misreads as "bad seller" — "—" reads as "new." Followers count CAN legitimately render `0` (no misleading implication). Do not "fix" the em-dashes.
- **`seller_followers` table** — `id`, `follower_id`, EITHER `seller_profile_id` OR `seller_company_id` (CHECK enforces XOR), `created_at`. Self-follow rejected at row level via CHECK + at action level via Zod guard. RLS: public select, self-only insert/delete. Two partial unique indexes prevent duplicate follow rows per (follower, target).
- **Follow/unfollow action:** `src/app/actions/follow-seller.ts` — `toggleFollow({ sellerProfileId | sellerCompanyId })` and `isFollowing(...)`. Zod-validated. Idempotent — race conditions land in the unique-constraint branch and short-circuit to `{ok:true,isFollowing:true}` rather than erroring. `revalidatePath` on the target seller/company route on every state change.

## Testing
- **Unit tests:** Vitest + React Testing Library (`npm test`)
- **E2E tests:** Playwright (`npm run test:e2e`)
- **Config:** `vitest.config.ts`, `playwright.config.ts`
- **Test files:** `src/test/*.test.{ts,tsx}`, `e2e/*.spec.ts`

## Route Groups
- `(auth)` — login, signup, forgot-password, reset-password, callback
- `(main)` — feed, dashboard, search, listings, listings/bulk-edit, messages, profile, favorites, sellers, companies (protected; `/listings/[id]`, `/sellers/[id]`, and `/companies/[slug]` are publicly accessible)
- `(admin)` — super admin dashboard with RBAC (superadmin, moderator, analyst)
- `(marketing)` — pricing, about, terms, privacy (public)

## API Routes
- `/api/webhooks/stripe` — Stripe subscription webhook
- `/api/webhooks/cloudflare-stream` — Stream video processing status webhook
- `/api/unsubscribe` — Email unsubscribe endpoint
- `/api/search/ai` — Conversational AI search (Claude-powered NL→filter mapping)
- `/api/listings/ai-copy` — AI description generator (streaming), title optimizer, quality scorer
- `/api/listings/analyze-image` — Claude Vision equipment recognition + fraud detection
- `/api/sos/ai` — SOS auto-categorization, response ranking, demand prediction
- `/api/users/[id]/reputation-summary` — AI seller reputation summary (cached)
- `/api/admin/users/[id]/generate-outreach` — AI churn retention email generator
- `/api/admin/market-gaps/generate-outreach` — AI seller recruitment email generator
- `/api/cron/smart-search-alerts` — Daily AI-scored saved search alerts
- `/api/cron/expire-boosts` — Daily boost expiration cleanup
- `/api/cron/engagement-digest` — Weekly engagement digest emails
- `/api/cron/listing-expiration` — Daily listing expiration + auto-renew
- `/api/cron/demand-insights` — Nightly AI demand prediction for sellers
- `/api/cron/weekly-brief` — Monday AI business brief for founders (schedule: `0 14 * * 1`)
- `/api/cron/churn-prediction` — Nightly churn risk scoring for subscribers
- `/api/cron/market-gaps` — Weekly SOS demand gap analysis
- `/api/cron/cleanup` — Periodic notification and data cleanup
- `/api/cron/reset-credits` — Monthly contact credit reset (schedule: `0 6 1 * *`)
- `/api/cron/listing-freshness` — Daily AI refresh suggestions for stale listings >45 days (schedule: `0 10 * * *`)
- `/api/listings/[id]/ask` — Ask Metal Gear streaming AI chat with professor mode (listing-context, 10/day free, 100/day Pro+)
- `/api/help/chat` — AI Help Assistant streaming chat (platform-context, 30 req/hr rate limit)
- `/api/feed/upload-media` — Feed post media upload (POST: multipart upload with auth/size/rate limit; GET: video status polling)
- `/api/snap-list/analyze` — Snap & List pilot: POST photoUrls → kicks off `analyzePhotos` server action, returns `draftId` (5/10min rate limit)

## Pricing Tiers
- **Free:** 3 listings, 5 photos, 100mi search radius
- **Pro ($179/mo):** 25 listings, 20 photos, 3 videos, 500mi radius, all AI features
- **Business ($349/mo):** 100 listings, 30 photos, 5 videos, unlimited radius, all AI features
- **Enterprise ($599/mo):** Unlimited listings, 50 photos, 10 videos, unlimited radius, all AI + priority
- **Legacy aliases:** `premium` → Pro, `boost` → Business (DB may still contain these; constants handle both)

## Key Infrastructure
- **Supabase project:** fkcyfpdkcrhjieauhchn
- **Production URL:** https://metal-gear-five.vercel.app
- **GitHub:** valkolimark/metal-gear
- **Vercel team:** team_9n9GosoaraicsoDdbAFgzr5j
- **Vercel project:** prj_HQBv7jMhui6LGW5vzVC5pmCMndlx
- **Sentry org:** metal-gear, project: javascript-nextjs
- **Cloudflare account:** c61e1a513e96a3b9df409959c2853c9c
- **R2 bucket:** metal-gear-media → `media.metalgear.com`
- **Stream subdomain:** customer-305dqqczrx52n91m.cloudflarestream.com
- **Google Cloud Vision (Cycle 58):** project `metalgear-488603`; service account `metal-gear-vision@metalgear-488603.iam.gserviceaccount.com`. Used by `src/lib/google-vision.ts` for nameplate OCR (`DOCUMENT_TEXT_DETECTION`) and stock-photo fraud detection (`WEB_DETECTION`). Credentials supplied via `GOOGLE_CLOUD_PROJECT_ID` + `GOOGLE_APPLICATION_CREDENTIALS_JSON` (base64). Free tier: 1,000 units/feature/month.

## Auth Providers
- Email/password (Supabase Auth)
- Google OAuth (enabled)
- Apple SSO (enabled, JWT secret expires Aug 25, 2026)

## Auth Single-Method Enforcement (Cycle 54)
- **One method per account.** A user registered with email cannot also sign in with Google/Apple, and vice versa. Enforced at two layers: (1) Supabase dashboard → Auth → Settings → **disable "Enable automatic identity linking"** (primary defense), (2) code-level guard in `src/app/(auth)/callback/route.ts` that detects multi-provider identities after `exchangeCodeForSession()`, signs the user out, and redirects to `/login?error=wrong_method&provider=email`. Guard is skipped when `next=/reset-password` so password recovery isn't blocked
- **Provider lookup RPC:** `public.get_auth_providers_for_email(text)` — SECURITY DEFINER, granted to `service_role` only; returns distinct `provider` values from `auth.identities` for the given email. Created via Supabase Management API in Cycle 54. Wrapped by `getProvidersForEmail()` server action in `src/app/actions/auth.ts`
- **Enumeration discipline:** `getProvidersForEmail()` is only called *after* a failed password login or a forgot-password submit — never on page load — so the login page cannot be used as an email-enumeration oracle
- **Friendly error mapper:** `src/lib/auth/errors.ts` — `friendlyAuthError(msg)` maps Supabase raw errors to actionable copy (`invalid_credentials`, `email_not_confirmed`, rate limits, etc.); `providerLabel(p)` renders human-readable provider names
- **Login page cues:** after a failed password attempt, we probe the provider for that email; if the account is OAuth-only we render a specific "This email is registered with Google/Apple sign-in" message and visually highlight the OAuth button row (`ring-2 ring-primary`). `?reset=success` shows a green "Password updated, please log in" banner. `?error=wrong_method&provider=<p>` shows a cross-method warning
- **Forgot-password flow:** pre-checks the provider; if OAuth-only, returns a provider-specific message and does NOT send a reset email. Non-existent emails fall through to the generic "if an account exists…" copy to preserve non-enumeration
- **Reset-password flow:** requires a valid recovery session (`supabase.auth.getUser()` on mount); bounces to `/forgot-password?error=…` if absent. On successful `updateUser({ password })` the page explicitly `signOut()`s and forces `window.location.assign('/login?reset=success')` so the user logs in again with their new password (no silent login to `/dashboard`). The Supabase password-reset email `redirectTo` is `${origin}/callback?next=/reset-password` — always routes through the callback code-exchange before landing on the form

## Deployment
Deploys are triggered via Vercel API (not CLI, due to git author mismatch):
```bash
curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=team_9n9GosoaraicsoDdbAFgzr5j" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"metal-gear","project":"prj_HQBv7jMhui6LGW5vzVC5pmCMndlx","gitSource":{"type":"github","ref":"main","org":"valkolimark","repo":"metal-gear"},"target":"production"}'
```

## Prompts
Cycle prompts live in `/prompts/`. Start a new session by pasting the relevant prompt file.

## Multi-Company Architecture (Cycle 19)
- **Architecture:** `profiles` = human identity, `company_profiles` = B2B entity, `company_memberships` = junction (user/company/role)
- **Active company:** Cookie (`active_company_id`) → Zustand (`activeCompany`) → DB (`profiles.active_company_id`); cookie is source of truth for SSR
- **Company-scoped tables:** `listings.company_id`, `subscriptions.company_id`, `seller_storefronts.company_id`, `sos_requests.company_id`
- **Company guard:** Middleware redirects users without companies to `/companies/new`; exempt: auth, onboarding, API, marketing routes
- **Company server actions:** `src/app/actions/company.ts` (CRUD) + `src/app/actions/company-context.ts` (switch/get active)
- **Company types:** `src/types/company.ts` — `CompanyProfile`, `CompanyMembership`, `CompanyWithRole`, `CompanyWithMembers`
- **Company UI:** `CompanyAvatar`, `CompanyContextProvider`, `CompanySwitcher` (header pill + drawer variant)
- **Company pages:** `/companies/new`, `/settings/company`, `/settings/company/members`
- **Migration script:** `scripts/migrate-companies.ts` — idempotent, creates companies from `user_business_profiles`

## Database Tables (notable)
- `listing_views` — Timestamped view events per listing (viewer_id, listing_id, viewed_at)
- `saved_searches` — User-saved search filter sets (user_id, name, filters JSONB, ai_query, ai_filters, is_ai_search)
- `saved_search_alert_log` — AI relevance scoring log for smart alerts (saved_search_id, listing_id, ai_relevance_score, alert_sent)
- `reviews` — Seller ratings/reviews (reviewer_id, seller_id, conversation_id, rating 1-5)
- `reports` — User/listing reports for moderation (reporter_id, target_type, target_id, reason, status)
- `disputes` — Transaction disputes with AI mediation (buyer statement, seller response, evidence, ai_summary JSONB)
- `boost_purchases` — Self-serve boost purchases with Stripe checkout
- `homepage_featured_slots` — Admin-curated homepage slots
- `system_config` — Key-value platform configuration with audit trail
- `admin_audit_log` — All admin actions with admin_id, target, metadata, timestamp
- `seller_demand_insights` — AI-generated demand predictions per seller (JSONB insights, valid_until)
- `offer_coaching_log` — AI negotiation coaching sessions
- `weekly_briefs` — Monday AI business briefs (period, raw_data JSONB, ai_brief text, sent_to emails)
- `churn_risk` — Nightly churn scoring for paid subscribers (user_id UNIQUE, risk_score, risk_level, signals JSONB)
- `market_gap_reports` — Weekly SOS demand gap analysis (gaps JSONB, ai_analysis JSONB)
- **Listings industries (Cycle 64, finalized Cycle 65):** `listings.industries TEXT[]` (NOT NULL default `'{}'`, GIN-indexed via `idx_listings_industries_gin`). Cycle 65 dropped the legacy `listings.industry` singleton column; `getIndustries()`/`getPrimaryIndustry()` in `src/lib/listings/industries.ts` now read the array only. Use `MultiIndustryPicker` (`src/components/forms/MultiIndustryPicker.tsx`) for any listing-level industry input. Search filter uses `.overlaps('industries', selected)`. Free-text industries are stored as `other:<slug>` and humanised via `industryDisplayLabel()`. Cap of 5 per listing
- **Company industries (Cycle 65):** `company_profiles.industries TEXT[]` (NOT NULL default `'{}'`, GIN-indexed via `idx_company_profiles_industries_gin`). Backfilled from legacy `company_profiles.industry`. Legacy column deprecated, drop scheduled Cycle 66. **Uncapped** — companies make broad reach claims (multi-vertical fabricators, MRO providers). `MultiIndustryPicker unlimited` is the canonical edit surface; `getCompanyIndustries()`/`getPrimaryCompanyIndustry()` in `src/types/company.ts` are the read shim
- **`MultiIndustryPicker` modes (Cycle 65):** default cap is 5 (listings, user_business_profiles); `unlimited` prop removes the cap (company_profiles only). Counter UI is gating when capped, informational `{N} selected` when unlimited
- `company_profiles` — B2B company entities (name, slug, logo_url, banner_url, industries, company_size, website, city, state)
- `company_memberships` — User-company junction (user_id, company_id, role enum, is_active, joined_at)
- `company_invites` — Token-based team invites (company_id, invited_by, email, role, token UNIQUE, status pending/accepted/expired/revoked, expires_at 7 days)
- `company_favorites` — User-favorited companies for trusted vendor system (user_id, company_id, UNIQUE constraint, RLS: users manage own favorites)
- `contact_credits` — Monthly credit ledger per user (user_id, credits_remaining, credits_used_this_month, period_start)
- `contact_reveals` — Contact reveal log with monthly dedup (viewer_id, seller_id, credits_spent, period_month)
- `credit_purchases` — Stripe one-time credit pack purchases (user_id, credits_purchased, amount_paid, stripe_payment_intent_id)
- `feed_posts` — Social feed posts (author_id, company_id, content, hashtags[], tagged_user_ids[], reactions_count, comments_count, is_deleted, edited_at)
- `feed_post_media` — Post media attachments (post_id, media_url, media_type image/video, stream_video_id, thumbnail_url, sort_order)
- `feed_post_reactions` — Like reactions (post_id, user_id, UNIQUE constraint)
- `feed_hashtags` — Hashtag aggregation for trending (tag PK, post_count, last_used_at)
- `listing_freshness_suggestions` — AI refresh suggestions for stale listings (listing_id, seller_id, ai_title_suggestion, ai_price_suggestion, ai_price_reasoning, ai_description_tip, email_sent_at, acted_on, acted_on_at); UNIQUE active-suggestion constraint per listing
- `seller_verifications` — EIN verification queue (user_id, business_name, tax_id_hash, ein, ein_submitted_at, document_url, status pending/approved/rejected, reviewed_by, reviewed_at, rejection_reason, admin_notes); profile page submits, admin moderation reviews
- `r2_cleanup_queue` — Async R2 media deletion queue (r2_key, created_at, processed_at, error); processed by `/api/cron/cleanup` (max 50/run)
- `listing_drafts` (Cycle 58) — Snap & List draft state (photo_urls, nameplate_photo_index, raw AI outputs in JSONB, structured `fields` + `confidence_scores`, `photo_coach`, `clarifying_questions`, `stock_photo_matches`, status lifecycle `analyzing/ready/publishing/published/discarded/failed`, 7-day `expires_at` TTL); RLS: owner-only SELECT/ALL
- `snap_list_usage` (Cycle 58) — Monthly analysis + publish counters per user (unique on `owner_id, month_year`); Free: 3/month, paid: unlimited
- `snap_list_events` (Cycle 58) — Pilot funnel event log (BIGSERIAL, 14 event_type CHECK constraint); no user-facing RLS policy (admin server actions only)
- `snap_list_accuracy_reviews` (Cycle 58) — Manual OCR accuracy sample per field (unique on `draft_id, field_name, reviewer_id`); admin-only

## AI Infrastructure
- **Anthropic SDK:** `@anthropic-ai/sdk` with client at `src/lib/anthropic.ts`
- **Model:** Claude Sonnet 4 for all AI features
- **AI columns on listings:** `ai_analyzed`, `ai_fraud_flagged`, `ai_fraud_reason`, `ai_assist_used`, `ai_assist_accepted`, `listing_quality_score`, `ai_price_suggested`, `ai_price_accepted`
- **Media gate column on listings:** `has_media` (boolean, NOT NULL, default false) — trigger-maintained; set to true when any `listing_images` or non-error `listing_videos` exist; all public discovery queries filter `has_media = true`; triggers: `trg_listing_images_has_media`, `trg_listing_videos_has_media`
- **AI columns on saved_searches:** `ai_query`, `ai_filters`, `is_ai_search`
- **AI columns on profiles:** `reputation_summary` (JSONB), `reputation_summary_updated_at`
- **AI columns on disputes:** `ai_summary` (JSONB)
- **AI columns on sos_requests:** `ai_categorized`, `ranked_response_ids`
- **Key components:** `ConversationalSearch`, `ProblemDiagnoser`, `AIDescriptionGenerator`, `AITitleOptimizer`, `ListingQualityScore`, `AIImageCapture`, `ReputationSummary`, `DisputeAISummary`, `VideoPlayer`, `AskMetalGear`, `HelpButton` (AI chat)
- **AI utilities:** `src/lib/ai/churn-scorer.ts` — heuristic churn signal weights and scoring
- **AI Professor Mode (Cycle 25):** Ask Metal Gear (`/api/listings/[id]/ask`) detects compatibility/suitability questions via regex triggers and enters professor mode — asks 2–4 targeted follow-up questions based on equipment category before rendering a direct verdict; recommends alternatives with `[SEARCH_SUGGESTION:{"query":"...","label":"..."}]` markers rendered as clickable search buttons in `AskMetalGear.tsx`; rate limit: 10/day free, 100/day Pro+ (daily IP-based); system prompt injects listing title, specs, condition, category at request time

## Notification Sounds & Education (Cycle 26, updated Cycle 53)
- **Sound assets:** `/public/sounds/notification.wav` (standard ping), `/public/sounds/alert.wav` (high-priority two-tone), `/public/sounds/sos-response.wav` (sharp 880→1200 Hz two-pulse, SOS-specific); all generated via `scripts/generate-sounds.mjs`
- **Sound hook:** `src/hooks/use-notification-sound.ts` — `useNotificationSound()` exposes `playStandard()`, `playHighPriority(id?)`, `playSosResponse(id?)`, `acknowledgeAlert(id)`, `acknowledgeAllAlerts()`; preloads all three audio elements on mount; repeating cadence: high-priority alerts replay up to 3× at 2-min intervals if unacknowledged; `alertTrackers` map carries a `sound: 'alert' | 'sos-response'` flag so the replay interval dispatches to the correct audio element per notification
- **SOS response type routing:** `useNotifications()` detects `type === 'sos_response_received'` and routes to `playSosResponse()` *before* the generic `isHighPriority()` branch, then fires a Sonner toast (8 s, SOS orange left border) with a "View Response" action deep-linking to `/sos/{sos_id}?tab=responses`. `sos_response_received` uses the `highPrioritySoundEnabled` preference gate
- **Sound preferences:** localStorage key `mg-sound-prefs` — `{ soundEnabled: boolean, highPrioritySoundEnabled: boolean }`; toggled in Profile → Notification Sounds card
- **High-priority triggers:** `sos_request_match`, any SOS with `urgency=critical`, offers >$10K
- **Education modal:** `src/components/notification-education-modal.tsx` — `NotificationEducationModal` (shadcn Dialog) + `useNotificationEducation()` hook; shows before browser permission prompt
- **Education triggers:** post-onboarding (`?onboarded=true` URL param), first bell click when `Notification.permission === 'default'`; localStorage key `mg-notification-education-seen` prevents repeat
- **Persistent nudge:** notification dropdown shows "Enable notifications" banner when permission is `default`
- **Layout integration:** `NotificationEducationTrigger` component in `(main)/layout.tsx` handles post-onboarding trigger

## Social Feed (Cycle 27a-1)
- **Tables:** `feed_posts`, `feed_post_media`, `feed_post_reactions`, `feed_hashtags` — all with RLS
- **Server actions:** `src/app/actions/feed-posts.ts` — `getFeedPosts()` (cached 30s), `createFeedPost()`, `editFeedPost()` (15-min window), `deleteFeedPost()` (soft-delete), `toggleFeedPostReaction()` (optimistic), `reportFeedPost()`
- **Media upload:** `/api/feed/upload-media` — POST (multipart, auth + size + rate limit), GET (video status poll); uses `uploadFeedPostMedia()` / `deleteFeedPostMedia()` from `src/lib/media.ts`
- **R2 key pattern:** `feed/{postId}/{uuid}.ext` with `CacheControl: 'public, max-age=31536000, immutable'`
- **For You feed:** `get_for_you_feed` Postgres RPC — CTE matching equipment interests (tier2) and industries (GIN overlap); falls back to "all" when no interests
- **Atomic counts:** `increment_post_reactions`, `decrement_post_reactions`, `upsert_feed_hashtags`, `decrement_feed_hashtags` — Postgres functions prevent race conditions
- **Indexes:** `idx_feed_posts_active_created` (partial), `idx_feed_posts_hashtags` (GIN), `idx_feed_posts_active_author` (composite), `idx_user_business_profiles_industries_gin` (GIN)
- **Components:** `FeedComposer`, `FeedPost`, `FeedPostMedia` (1-4 image grid + lightbox), `FeedFeedToggle`, `FeedPostSkeleton`, `FeedPageClient` (interleaves posts with discovery blocks)
- **Feed page:** Server Component shell fetches initial posts + discovery data, passes to `FeedPageClient`; toggle "All Posts" / "For You" with localStorage persistence
- **Admin:** Feed Posts moderation tab in `/admin/moderation` — `getFeedPostReports()`, `adminSoftDeleteFeedPost()`
- **Post constraints:** 1000 char max, up to 4 images OR 1 video, max 10 mentions, edit within 15 min

## Social Feed: Comments, Hashtags, Mentions (Cycle 27a-2, updated Cycle 51)
- **Comments table:** `feed_post_comments` with RLS, partial index `idx_feed_post_comments_active`, author index; `parent_comment_id uuid REFERENCES feed_post_comments(id) ON DELETE CASCADE` for 1-level-deep threaded replies; partial index `idx_feed_post_comments_parent` on `parent_comment_id WHERE parent_comment_id IS NOT NULL`
- **Comment actions:** all in `src/app/actions/feed-comments.ts` — `getPostComments()` (cached 15s, returns `CommentWithReplyCount[]`, top-level only via `parent_comment_id IS NULL`), `getReplies(parentCommentId)` (on-demand, no cache), `addComment()`, `addReply()` (rejects depth > 1 server-side by checking parent's `parent_comment_id IS NULL`), `deleteComment()` (hard delete)
- **Hard delete:** `deleteComment()` removes the row (no `is_deleted` flag); comment authors, post owners, and admins (`superadmin`/`moderator`) can delete; top-level delete counts replies via `head: true` count and decrements `feed_posts.comments_count` by `1 + reply_count` (cascade handles reply rows)
- **Atomic counts:** `increment_post_comments`, `decrement_post_comments` — Postgres functions; replies also increment via `increment_post_comments`
- **Mention search:** `/api/feed/mentions-search` — `pg_trgm` GIN-indexed `ILIKE` on `profiles.display_name` + `company_profiles.name`; 60 req/min rate limit
- **MentionAutocomplete:** dropdown in `FeedComposer` triggered by `@`; debounced 200ms; keyboard nav; inserts `@DisplayName` + tracks entity IDs
- **Mention resolution:** `resolveMentionedUsers()` (cached 5min) resolves `tagged_user_ids` to display names; `@mentions` in post content link to `/companies/[slug]` or `/sellers/[id]`
- **CommentSection:** lazy-loads on first expand; per-post count sync; delegates row rendering to `CommentItem`; requires `postAuthorId` prop from `FeedPost`
- **CommentItem:** `'use client'` recursive component; renders avatar, author, timestamp, content, action row (Reply, View replies toggle, overflow menu); uses inline `ReplyInput` for composing replies; recursive render for replies with `isReply=true` (no Reply button, no nested toggle, `pl-8` indent)
- **ReplyInput:** pre-fills `@ParentAuthorName `, auto-focused, Escape cancels, inline X/Send buttons; calls `addReply()` and returns the hydrated reply optimistically
- **Hashtag pages:** `/feed/hashtag/[tag]` — SSR with metadata, `totalCount` from `feed_hashtags.post_count` (O(1)), cursor pagination
- **TrendingHashtags:** `getTrendingHashtags()` cached 1hr; auto-invalidated on post create/delete; used on hashtag pages
- **Notifications:** `post_comment`, `post_mention` types; fire-and-forget via `Promise.allSettled`; self-notification guards; replies notify the parent comment author (not the post author)
- **Components:** `CommentSection`, `CommentItem`, `CommentInput`, `ReplyInput`, `MentionAutocomplete`, `TrendingHashtags`, `HashtagFeedClient`

## Desktop Feed Layout (Cycle 27b-1)
- **Three-column layout:** Facebook-style on `/feed` — left sidebar (280px), center feed (max 680px), right sidebar (340px)
- **Breakpoints:** `xl` (≥1280px) all 3 columns; `lg` (≥1024px) center + right; `md` and below center only
- **FeedLeftSidebar:** sticky full-height nav with profile card, primary nav links (active route highlighting), company switcher, footer links; `'use client'` (uses `usePathname()`)
- **FeedActiveSOSRow:** horizontal scrollable row above feed composer; "Send SOS" card + matched SOS requests with urgency badges; desktop only (`hidden md:block`)
- **FeedRightSidebar:** wrapper for `RightSOSWidget` (urgency-colored SOS alerts) + `RightDiscoveryWidget` (equipment-matched listings with thumbnails)
- **`getFeedSOSAlerts()`:** server action in `src/app/actions/feed.ts`; matches `sos_requests` against `user_equipment_interests.tier2`, joins `company_profiles` for company name
- **Feed page data:** all sidebar data fetched in server component (`page.tsx`) and passed as props; unread count for messages badge
- **TrendingHashtags removed from feed:** replaced by SOS alerts + discovery widgets in right sidebar

## Social Feed Tightening (Cycle 33)
- **Activity indicators:** `formatActivityStatus()` in `src/lib/utils/time.ts` — green dot (<1hr), yellow dot (<24hr), gray label (1-7d), hidden >7d; uses `profiles.last_login_at`
- **Profile links:** author avatar, name, and company name on feed posts link to `/companies/[slug]` (if company) or `/sellers/[id]`
- **URL linkification:** raw URLs in post content rendered as clickable `<a>` tags; trailing punctuation stripped; hashtags/mentions not double-processed
- **UX polish:** post card hover state (`hover:bg-muted/30`), timestamp full-datetime tooltip, character counter at 800+ (red at 950+), 44px touch target on media close buttons, skeleton loading on Load More, scroll position restoration
- **Feed query update:** `getFeedPosts()` now includes `last_login_at` from profiles join; `FeedPostWithDetails.author` has `last_active_at: string | null`

## Bulk Import Upgrade (Cycle 34)
- **Formats:** CSV, XLSX/XLS (via ExcelJS), Google Sheets URL (fetched server-side as CSV export)
- **File parser:** `src/lib/import/parse-file.ts` — `parseCSV()`, `parseXLSX()`, `parseGoogleSheet()`, `getMappedHeaders()`, `detectImageColumns()`, `extractImageUrls()`; flexible column aliases (e.g., "make" → manufacturer, "photo url" → image_url)
- **Image fetcher:** `src/lib/import/fetch-image.ts` — `fetchAndUploadImage(url, listingId)` with 15s timeout, content-type validation, 10MB limit; uploads to R2 via `uploadListingImage()`
- **Server actions:** `src/app/actions/import.ts` — `parseImportFile()` (FormData → ParseResult), `startImportJob()` (two-phase: create listings → fetch images), `getImportProgress()`, `getImportHistory()`
- **Progress endpoint:** `GET /api/import/progress/[importId]` — polls `listing_imports` table; auth-gated to import owner
- **UI components:** `src/app/(main)/listings/import/components/` — `ImportUploadZone` (3-tab format switcher + drag-drop), `ImportPreviewTable` (5-row preview with column mapping badges), `ImportProgressBar` (two-phase with polling), `ImportCompleteSummary` (stats + expandable error details)
- **DB columns added to `listing_imports`:** `company_id`, `file_format`, `processed_rows`, `successful_rows`, `failed_rows`, `image_fetch_attempted/succeeded/failed`, `status` (pending/parsing/importing/fetching_images/complete/failed), `error_log` JSONB, `created_listing_ids` uuid[]
- **Multi-image support:** `image_urls: string[]` on ParsedRow; pipe-separated single column OR numbered columns (image_url_1...N); tier photo limit enforced before fetch
- **Counter function:** `increment_import_counter(import_id, column_name, amount)`; SECURITY INVOKER; allowlist: image_fetch_attempted/succeeded/failed; created via `scripts/migrate-import-counter.ts` (never at runtime in application code)
- **`verifyImportCounter()`** — reads pg_proc; runs at startImportJob() start before Phase 2; aborts import if function missing or has SECURITY DEFINER
- **Dedup/update flow:** `checkImportDuplicates()` matches by SKU or title+manufacturer+model within company; three modes: skip, update existing, or create all new; `DuplicateMode` type
- **Bulk delete:** `bulkDeleteListings(ids)` soft-deletes up to 1000 listings; `bulkDeleteByImport(importId)` removes all listings from an import job; My Listings page has multi-select + bulk remove action bar
- **Fail-open:** image fetch failure never blocks listing creation; failures counted and shown in summary
- **Tier gate:** Pro+ required; tier limit checked before import start; excess rows skipped with warning
- **Import humor library** — `src/lib/import/humor.ts` — pure functions for size-aware messaging at preview, start, Phase 2, and completion; 5 tiers: tiny/small/medium/large/massive
- **`importStore`** — `src/stores/import-store.ts`; sessionStorage-persisted Zustand store; tracks active import state across navigation
- **`ImportProgressBanner`** — `src/components/import-progress-banner.tsx`; fixed bottom-left; mounts via `ImportProgressBannerClient` in (main)/layout.tsx
- **Import notifications** — `createNotification()` called in startImportJob() on complete; in-app + push; notification types: `import_complete`, `import_failed`

## Admin Account Deletion (Cycle 35)
- **Soft delete (archive):** `softDeleteAccount()` — bans user, archives listings, cancels SOS, suspends company memberships, cancels Stripe, revokes pending invites; reversible via `reactivateAccount()`
- **Hard delete (permanent):** `hardDeleteAccount()` — requires `confirmationText === 'DELETE'`; deletes profile + auth user + all owned data; anonymizes seller reviews (seller_id → null); replaces sent message content; queues R2 media keys for async cleanup
- **Server actions:** `src/app/actions/admin-delete-account.ts` — `softDeleteAccount()`, `reactivateAccount()`, `hardDeleteAccount()`, `getDeleteAccountWarnings()`, `deleteOrphanedAuthUser()`
- **`hardDeleteAccount()` return type:** `HardDeleteResult` — discriminated union: `{ success: true; authDeleteFailed: false }` | `{ success: true; authDeleteFailed: true; authError: string }` | `{ success: false; error: string }`; auth deletion uses fresh `createAdminClient()` in isolated try/catch
- **`deleteOrphanedAuthUser()`:** cleans up auth records when profile is already deleted; rejects if profile exists; superadmin-only
- **UI:** `DeleteAccountPanel` in `src/app/(admin)/admin/users/[id]/components/` — superadmin-only; archive or permanent delete with mode selection, reason field, hard delete confirmation gate; orphaned auth record mode when `hasProfile=false`
- **Orphaned account layout:** admin user detail page renders minimal layout with "Delete Auth Record" button when profile is null (no 404)
- **Reactivation banner:** shown on soft-deleted user detail page with archive date, reason, and reactivate button
- **R2 cleanup:** `r2_cleanup_queue` table; listing image R2 keys queued during hard delete; processed by `/api/cron/cleanup` (max 50 per run)
- **FK changes:** `reviews.seller_id`, `conversations.buyer_id/seller_id`, `messages.sender_id` changed from ON DELETE CASCADE to ON DELETE SET NULL to preserve data
- **Guards:** superadmin-only, self-deletion prevented, superadmin-to-superadmin blocked, sole company owner warned
- **DB columns:** `profiles.deleted_at`, `deletion_type`, `deleted_by`, `deletion_reason`; `messages.is_deleted`, `deleted_content_replacement`

## AI Image Analyzer (Cycle 27c)
- **Multi-image analysis:** wide shot + nameplate sent in single Claude call with positional context; falls back to single-image if only one provided
- **Structured output:** system prompt enforces JSON schema with per-field confidence scores (0.0–1.0); `FieldConfidenceScores` type in `src/types/ai-analysis.ts`
- **Auto re-prompt:** when `overallConfidence < 0.55`, second Claude call targets `lowConfidenceFields`; merges higher-confidence results; max 1 retry
- **Image quality validation:** `src/lib/ai/image-quality.ts` — `validateImageQuality(file, mode)` checks resolution, brightness, blur (Laplacian variance), file size; runs client-side via Canvas API
- **Equipment prompts:** `src/lib/ai/equipment-prompts.ts` — `EQUIPMENT_ANALYSIS_SYSTEM_PROMPT`, `MULTI_IMAGE_ANALYSIS_PROMPT`, `SINGLE_IMAGE_ANALYSIS_PROMPT`, `buildClarificationPrompt()`
- **Confidence UI:** green/yellow/red dots per field; low-confidence fields get yellow border; overall confidence banner (green/amber/red); analysis mode label ("Analyzed 1/2 images")
- **Backward compatible:** all new fields on `AIAnalysisResult` are optional; single-image requests work unchanged
- **AI-to-gallery carry-forward (Cycle 31-1):** AI analysis step uploads both images to R2 in parallel with Claude call; URLs carried forward to Photos step as `preloadedImages`; `listingId` generated at form init via `crypto.randomUUID()`; `AIImageCapture` accepts `listingId` prop and `onComplete` returns `preloadedImages` array

## iOS Safari Zoom Fix (Cycle 31-1)
- **Global rule:** `font-size: max(16px, 1em)` on `input, select, textarea` in `src/app/globals.css` prevents iOS Safari viewport zoom on input focus
- **`overflow-x: hidden`** on `html, body` confirmed in globals.css

## Team Invites & Seat Limits (Cycle 28)
- **`company_invites` table:** token-based invite records with 7-day expiration, RLS (company members can view), indexes on company_id/token/email
- **Seat limits:** `SEAT_LIMITS` in `src/lib/constants.ts` — Free: 1, Pro: 3, Business: 8, Enterprise: Infinity; legacy aliases: premium→3, boost→8
- **Invite flow:** owner/admin sends invite → email sent via Resend → invitee clicks `/invite/[token]` → redirected to signup if unauthenticated → `acceptInvite()` adds membership + sets active company
- **Server actions:** `src/app/actions/invites.ts` — `getCompanyMemberCount()`, `getCompanySeatLimit()`, `getPendingInvites()`, `sendCompanyInvite()`, `revokeInvite()`, `acceptInvite()`, `removeCompanyMember()`
- **Invite acceptance route:** `src/app/(main)/invite/[token]/page.tsx` — server component fetches invite data, redirects to `/signup` if unauthenticated, renders `InviteAcceptClient`
- **Middleware exemption:** `/invite/` exempt from both auth redirect and company guard in `src/lib/supabase/middleware.ts`
- **Members page:** `/settings/company/members` — seat usage progress bar, `InviteForm` component, `PendingInvites` component with revoke
- **Seat enforcement:** checked at invite creation AND invite acceptance to prevent race conditions

## Annual Billing (Cycle 28)
- **Billing toggle:** pricing page has monthly/annual `Switch` with "Save 20%" badge
- **Annual prices:** Pro $1,720/year (~$143/mo), Business $3,350/year (~$279/mo); Enterprise annual shows "Contact Sales"
- **`billing_period` column:** `subscriptions.billing_period` — `'monthly'` (default) or `'annual'`; stored from checkout metadata or Stripe price interval
- **Env vars:** `STRIPE_PRO_ANNUAL_PRICE_ID`, `STRIPE_BUSINESS_ANNUAL_PRICE_ID` (+ `NEXT_PUBLIC_` variants for pricing page)
- **Checkout:** `billingPeriod` metadata passed to Stripe, determines correct price ID
- **Webhook:** `handleCheckoutCompleted` and `handleSubscriptionUpdated` both persist `billing_period`

## Seller Intelligence Dashboard (Cycle 29)
- **Widget:** `SellerIntelligence` in `src/app/(main)/dashboard/components/seller-intelligence.tsx` — tier-aware performance overview
- **Tier gating (UI-level):** Free tier sees quality grade (A–F), raw view count, listing count, generic tip. Pro+ (`['pro', 'business', 'enterprise', 'premium', 'boost']`) unlocks benchmark bars, offer acceptance rate, top listing, specific tips, demand signals
- **`isPro` resolution:** `['pro', 'business', 'enterprise', 'premium', 'boost'].includes(tier)` — must include legacy aliases `premium` and `boost`
- **`LockedMetric` component:** `src/app/(main)/dashboard/components/locked-metric.tsx` — reusable locked-state card with blurred placeholder, upgrade CTA; used for any Pro+-gated metric card
- **`PerformanceBar` component:** `src/app/(main)/dashboard/components/performance-bar.tsx` — green (above avg) / yellow (below avg) benchmark bar
- **Server action:** `src/app/actions/seller-intelligence.ts` — `getSellerPerformance(userId, companyId)` computes all metrics regardless of tier; gating is in the UI
- **Render guard:** only rendered when `performanceData.listingCount > 0 || isPro` (pure buyer on free sees nothing)

## Listing Freshness AI (Cycle 29)
- **Cron:** `/api/cron/listing-freshness` (daily 10:00 UTC) — finds active listings >45 days old with no offers in last 30 days; max 10 AI calls per run
- **AI model:** Claude Sonnet 4 — generates title suggestion, optional price suggestion with reasoning, description tip
- **Table:** `listing_freshness_suggestions` — one active (unacted) suggestion per listing via unique partial index
- **Column:** `listings.refreshed_at` — set when seller acts on suggestion via `markFreshnessSuggestionActedOn()`
- **Integration:** listing edit page calls `markFreshnessSuggestionActedOn(listingId)` after successful save
- **"Recently Updated" badge:** shown on search cards and listing detail when `refreshed_at` is within 14 days; no tier gate
- **Email:** freshness email sent to all tiers (no gate); uses `sendEmail()` from `src/lib/email.ts`
- **No tier gate on freshness:** emails and badge are free for all sellers; stale inventory hurts the whole platform

## Plant Manager Dashboard (Cycle 32)
- **Trusted Vendors:** `company_favorites` table (user_id, company_id, UNIQUE, RLS); heart button on `/companies/[slug]` with optimistic add/remove
- **Server actions:** `src/app/actions/trusted-vendors.ts` — `getTrustedVendors()`, `addTrustedVendor()`, `removeTrustedVendor()`, `isCompanyFavorited()`
- **Team Activity:** `src/app/actions/team-activity.ts` — `getTeamActivity(companyId)` returns members with last-active status + recent listing views; `getSnipeListings(userId)` returns listings from last 72hr matching `user_equipment_interests.tier2`; `hasEquipmentInterests(userId)`
- **Dashboard widgets:** `TeamActivityWidget` (activity dots + thumbnails), `TrustedVendorsWidget` (favorited companies), `NewListingsSnipeFeed` (72hr interest-matched listings with NEW badge <6hr)
- **Render guards:** SnipeFeed hidden when no equipment interests; TeamActivity only shown when activeCompany exists with members
- **`listing_views.viewer_id`** — existing column used for team activity tracking (indexed)

## SOS Form Validation & Upload (Cycle 52)
- **Required-field gate:** the Send SOS button uses `aria-disabled` (not native `disabled`) so a click on an invalid form marks every required field as touched, toasts a fix-it message, and smooth-scrolls to the first error via per-field `ref` callbacks stored in a `useRef` map
- **Category validation:** the taxonomy search UI stores the selected tier2 id in `form.equipment_category`; free-text brand names never populate this field. Inline error: *"Select a category from the list (e.g. 'Oil cleaning centrifuges', not a brand name)."* A "Selected: <label>" line renders under the field as confirmation
- **Listing form categories use the same tier-2 taxonomy picker (Cycle 64):** `/listings/new`, `/listings/[id]/edit`, and `/listings/bulk-edit` all use the same `searchTaxonomy(query)` + tier-2-id-store-on-select pattern that SOS uses. The legacy hardcoded 22-item `EQUIPMENT_CATEGORIES` dropdown was removed from listing forms (the constant survives only for back-compat reads on existing rows). Legacy free-text category labels still render correctly via `getTier2Label(value) || value`. New listings persist tier-2 ids, ending the namespace mismatch that was breaking For You feed matching and equipment-interest alerts
- **Title / description gates:** title requires ≥10 chars; description requires ≥20 chars in `SOSConfirmStep` (warning-only on the text form — `createSosRequest()` accepts empty description); the camera flow's confirm step replaces `if (!description.trim()) return` with visible error + textarea focus/scroll
- **Upload helper:** `src/app/(main)/sos/create/upload-helper.ts` — `uploadSosPhotoWithRetry(file, onRetry?)` wraps `uploadSosMedia()` with one silent retry on transient `server` failures; used by the text form, `SOSConfirmStep`, and `SOSProcessingStep`
- **`uploadSosMedia()` server action:** returns `{ path, url }` on success or `{ error, code }` where `code` is one of `auth` / `missing` / `too_large` / `bad_type` / `corrupt` / `server`. Performs 10 MB size check, case-insensitive MIME allowlist (JPEG/PNG/WebP/HEIC/HEIF), and `validateImageBytes()` magic-byte check; the *detected* MIME (not browser-reported) is passed to R2 so uppercase `.JPEG` uploads and spoofed content-types are normalized
- **HEIC/HEIF support:** `validateImageBytes()` recognizes the ISO base-media "ftyp" box for HEIF brands (`heic`, `heix`, `hevc`, `mif1`, …); `extFromContentType()` maps these to `.heic` / `.heif`; iPhone photos upload as-is (no Sharp conversion)
- **Inline error UI:** upload errors render next to the photo picker as `text-destructive`, not just toasts; retries show a "Retrying…" label on the picker button

## SOS Dashboard & Microcopy (Cycle 55)
- **Tabbed dashboard (Cycle 64):** `/sos` renders `<SosDashboardTabs>` (in `src/app/(main)/sos/components/SosDashboardTabs.tsx`) wrapping the two existing sections in shadcn `Tabs`. Tab values: `mine` (`My SOS Requests`, default when user owns ≥1 SOS) and `feed` (`Active SOS in Your Categories`, default when user owns zero SOS). URL hash syncs (`#mine` / `#feed`); deep-link on mount; tab switch uses `history.replaceState` so scroll position is preserved. Tab labels show counts (`(N)`). Pulse-dot decoration on the `mine` tab label when any owned SOS has new responses since last view (uses Cycle 55's `mg-sos-last-viewed-{id}` localStorage key). Header (SOS-orange "Send SOS" → `/sos/create`) stays above the tabs; the "Filter" bar from Cycle 55 is passed through to the feed tab via the `filtersBar` prop.
- **Response chip:** 44 px min touch target, SOS orange (`#FF6B2B`) when `response_count > 0`, muted gray otherwise. `response_count` is a PostgREST aggregation returned as `Array<{count:number}>` — use `extractResponseCount()` in `src/app/(main)/sos/page.tsx`
- **Unread pulse:** `localStorage['mg-sos-last-viewed-{id}']` set by the SOS detail page when the owner visits; dashboard compares against the SOS's `created_at` to decide whether to render the pulsing white dot
- **Sort control:** `response_recency` (default) / `posted` / `urgency` — pure client-side reorder
- **Notification permission hint:** one-shot per session (`sessionStorage['mg-sos-notif-hint-shown']`), fires when any own SOS has 0 responses older than 30 min and `Notification.permission === 'default'`; opens `NotificationEducationModal`
- **SOSEducationBlocks:** `src/app/(main)/sos/create/components/SOSEducationBlocks.tsx` — `HowSosWorksHint` (collapsible three-audience explainer) and `MultiSegmentCallout` (animated SOS-orange callout below the transport toggle); both used by the camera confirm step and the text form
- **`SOSSentStep` props:** now `{ vendorsNotified, sosTitle?, transportIncluded?, onReset }`. Nice-work callout renders only when `transportIncluded`. `vendorsNotified > 0` → "Delivered to N matching vendors"; otherwise "Vendors will be notified as they come online"
- **Ownership clarity on `/sos/[id]`:** "Your SOS Request" pill (SOS orange) next to urgency/status when `isRequester`. "You responded to this SOS" green banner with scroll-to-responses link for non-requester viewers who already responded. Owner visit writes `mg-sos-last-viewed-{id}` to clear the dashboard pulse
- **`FeedActiveSOSRow.currentUserId`** (optional) — renders "Yours" badge on own cards and flips CTA to "View responses →"

## SOS Camera-First Flow (Cycle 31-2)
- **Components:** `src/app/(main)/sos/create/components/` — `SOSCameraFirstFlow` (orchestrator), `SOSCaptureStep`, `SOSProcessingStep`, `SOSConfirmStep`, `SOSSentStep`
- **Flow:** 4-step: Capture (photo/upload) → Processing (R2 upload + AI analysis) → Confirm (pre-filled, editable) → Sent (vendor count + dashboard link)
- **AI integration:** Uses `/api/listings/analyze-image` for equipment identification; pre-fills description, category, manufacturer, model; 15s timeout fallback
- **Skip link:** "Skip — describe it in text instead" renders existing Quick SOS text flow (QuickSOS component + detailed form)
- **Photo limits:** Up to 10 photos per SOS, validated client-side (type + 10MB size)
- **Urgency toggle:** Normal / Critical with SOS orange `#FF6B2B` styling
- **Existing flows preserved:** Quick SOS text input and detailed form remain fully functional as text flow fallback

## Media Infrastructure
- **R2 client:** `src/lib/r2.ts` — S3-compatible uploads/deletes to Cloudflare R2
- **Stream client:** `src/lib/cloudflare-stream.ts` — video upload, status, delete via Cloudflare API
- **Unified media:** `src/lib/media.ts` — `uploadListingImage()`, `uploadListingVideo()`, `uploadAvatar()`, `uploadSOSMedia()`, `uploadDisputeEvidence()`, `uploadConditionReport()`, `uploadMessageAttachmentFile()`, `uploadStorefrontBannerFile()`, `uploadVerificationDocument()`, `uploadCompanyLogo()`, `uploadCompanyBanner()`, `uploadFeedPostMedia()`, `deleteFeedPostMedia()`, `deleteMedia()`
- **Key naming:** `listings/{id}/images/{uuid}.ext`, `avatars/{userId}/{uuid}.ext`, `sos/{sosId}/{uuid}.ext`, etc.
- **Video columns on listing_videos:** `stream_video_id`, `thumbnail_url`, `embed_url`, `hls_url`, `duration_seconds`, `status` (processing/ready/error)
- **Video columns on feed_post_media:** `stream_video_id`, `thumbnail_url`, `status` (processing/ready/error — added Cycle 56)
- **FeedVideoPlayer:** `src/components/feed/FeedVideoPlayer.tsx` — poster-first pattern; shows thumbnail+play button, swaps to Stream iframe on click; handles processing (polls 5s × 24), error, and missing-stream states
- **VideoPlayer poster-first:** `src/components/ui/video-player.tsx` — same poster-first pattern for listing videos; shows thumbnail until user taps play
- **MultiPhotoUploader:** `src/components/upload/MultiPhotoUploader.tsx` — reusable multi-file upload; up to N photos in parallel (concurrency 4); per-file progress, retry, drag-and-drop; uses XHR via `src/lib/upload/xhr-upload.ts`
- **Upload API routes:** `POST /api/listings/upload-media`, `POST /api/feed/upload-media`, `POST /api/sos/upload-media` — all with auth, rate limit, magic-byte validation
- **TUS Direct Upload (Cycle 56):** `createStreamDirectUpload()` in `src/app/actions/stream.ts` — returns one-time TUS URL; client uploads directly to Cloudflare via `tus-js-client`; no Vercel in the video upload path
- **Client-side video thumbnail:** Feed composer captures first frame via `<video>` + `<canvas>`, uploads to R2 as immediate poster while Stream transcodes
- **Stream actions:** `src/app/actions/stream.ts` — `createStreamDirectUpload()`, `attachStreamVideoToFeedPost()`, `attachStreamVideoToListing()`, `uploadVideoPoster()`
- **Migration script:** `scripts/migrate-media.ts` — run with `--limit=N` for test batches
- Supabase Storage URLs still resolve for legacy data; new uploads go exclusively to R2/Stream

## Performance (Cycle 56)
- **Image optimization:** `next.config.ts` — `formats: ['image/avif', 'image/webp']`, `minimumCacheTTL: 2592000` (30-day CDN cache); all 7 remote patterns configured
- **Skeleton loading:** `loading.tsx` files for `/feed`, `/search`, `/listings/[id]`, `/sos`, `/dashboard`, `/radar`, `/messages` — structurally match real page layouts
- **Parallel data fetching:** feed page (13 concurrent), listing detail (10 concurrent — credit/reveal/tier pre-fetched in parallel batch)
- **Poster-first video:** videos in feed and listings render a static thumbnail; iframe loads only on user tap — saves one full Cloudflare iframe per video in viewport

## Critical Pattern
All database operations MUST use server actions with `createAdminClient()`. Client-side Supabase DB/storage calls hang in production. All media uploads MUST go through `src/lib/media.ts` — never use Supabase Storage for new uploads. **Never pass functions from Server Components to Client Components** — use server actions in separate `'use server'` files instead.

**No new Postgres RPCs for read paths.** Trust metrics, services, team data, navigation counts, cover photos, activity feed, and similar read-layer computations live in TS helpers under `src/lib/profile/`, `src/lib/layout/`, `src/lib/registry/`, etc. — never in Postgres functions. This pattern was established in Cycle 69 to match the existing `getSellerStats` codebase pattern and confirmed across Cycles 70–73. **Write-path mutations** can use Postgres functions when transactionally beneficial (e.g. `increment_post_reactions`, `cleanup_expired_drafts`); the rule applies to read paths only.

Server actions live in:
- `src/app/actions/` — Shared actions (tier, analytics, search, reputation, disputes, dispute-mediation, admin, sos, admin-delete-account, bulk-edit-listings, bulk-edit-cell, etc.)
- `src/app/(main)/*/actions.ts` — Route-specific actions (listings, messages, profile, checkout)
- `src/app/actions/radar.ts` — Unified Radar save/unsave (listings, posts, videos)
- `src/app/(admin)/admin/actions.ts` — Admin-specific actions (users, listings, moderation, churn, market gaps, weekly briefs)
- `src/app/actions/admin-delete-account.ts` — Superadmin account deletion (soft/hard) + reactivation

## Onboarding (Cycle 23, soft-disable Cycle 66)
- **Flow:** 5-step role-aware wizard at `/onboarding` (route group `(onboarding)`). The page is now a Server Component (`page.tsx`) that fetches `getEnabledArchetypes()` and renders `OnboardingClient.tsx` with the filtered list as a prop.
- **Archetypes:** `operator` (plant/facility), `trader` (dealer/reseller), `service_provider` (rigging/machining/etc.), `logistics` (fleet/driver — blocked from listing tools). **Two enabled by default at launch** (`operator`, `service_provider`); **`trader` and `logistics` are soft-disabled** (Cycle 66) via `system_config.enabled_archetypes`. Existing trader/logistics users are grandfathered with zero behavior change. See `src/lib/archetypes.ts` for the helper and the **Re-activation Runbook** below.
- **Soft-disable model (Cycle 66):** `src/lib/archetypes.ts` is the single source of truth. `getEnabledArchetypes()` is a `unstable_cache`-wrapped read of `system_config.enabled_archetypes` keyed on cache tag `enabled-archetypes-config` (5-min revalidate, plus explicit Next 16 `updateTag('enabled-archetypes-config')` on every admin write for read-your-own-writes semantics). `ARCHETYPE_DEFAULT_ENABLED = ['operator', 'service_provider']` is the fallback for fresh environments. The constants array in `src/lib/constants/onboarding.ts` keeps all four archetypes for type completeness; filtering is render-time only. `submitOnboarding` in `src/app/actions/onboarding.ts` rejects archetypes not in the enabled set as defense-in-depth against direct POSTs. **`scripts/check-archetype-references.mjs`** is a CI grep gate (wired into `npm run lint`) that fails the build if `'trader'` or `'logistics'` string literals appear outside the explicit allowlist (helper, constants, archetype-specific server actions/UI, admin re-activation panel, equipment-taxonomy ROLES list, dev seed scripts). Route any new archetype branching through `isArchetypeEnabled()`.
- **Admin re-activation:** `/admin/settings` → **Archetypes** tab renders `EnabledArchetypesPanel.tsx` (superadmin + manage_subscriptions permission, mirrors the credit-config pattern). Toggling persists to `system_config.enabled_archetypes`, audit-logs via `logAdminAction('update_enabled_archetypes', ...)`, and `updateTag('enabled-archetypes-config')` so the next onboarding session picks up the change. UI prevents un-checking the last enabled archetype; server action also rejects empty arrays via Zod (`z.array(z.enum(ALL_ARCHETYPES)).min(1)`).
- **Archetype lock:** `user_business_profiles.archetype_locked` boolean; set on onboarding completion or migration confirmation; `mg_archetype` cookie drives middleware gate
- **Logistics columns:** `logistics_type` (fleet/individual), `fleet_size`, `equipment_capabilities[]`, `dot_mc_number`, `logistics_coverage` on `user_business_profiles`
- **SOS transport:** `sos_requests.transport_needed` boolean; routes to logistics users when true
- **Step 1:** Archetype selection → **Step 2:** Multi-industry select → **Step 3:** Branching role-specific questions → **Step 4:** SOS opt-in + contact visibility → **Step 5:** Profile (name, company, city/state)
- **Single-submit:** All data held in client state; written to DB via `submitOnboarding()` server action on final step
- **DB columns (Cycle 23):** `user_business_profiles.archetype`, `sub_role`, `trading_activities`, `service_types`, `service_area`, `sourcing_methods`, `monthly_volume`, `sos_opted_in`
- **Equipment interests:** Tier 2 group selections saved to `user_equipment_interests` table
- **Middleware guard:** `src/lib/supabase/middleware.ts` redirects users without `onboarding_completed: true` to `/onboarding`
- **Post-onboarding redirect:** `window.location.href = '/dashboard'` (full page load so middleware re-evaluates; routes to `/companies/new` if no company yet)
- **Data carryover:** Onboarding saves to `profiles` (name, company, city, state, phone, contact_visibility) and `user_business_profiles` (industries, archetype, etc.); `/companies/new` page reads these to prefill the company creation form
- **Constants:** `src/lib/constants/onboarding.ts` — `OnboardingFormData`, archetype options, industry list, role-specific option arrays

### Re-activation Runbook (Disabled Archetypes)

To re-enable a soft-disabled archetype:

1. Audit cycles since disable: list every cycle that touched `user_business_profiles`, `submitOnboarding`, dashboard widgets, profile edit, SOS routing, or archetype-keyed branching. Confirm the disabled archetype's flows still match current schema and conventions.
2. Run `npm run check:archetypes` and confirm clean. (Should always be clean — the gate runs in CI.)
3. Smoke-test the disabled archetype's flows manually:
   - Sign up fresh as the archetype (toggle enabled in admin first)
   - Complete onboarding end-to-end
   - Verify dashboard, profile, SOS, listings (if applicable)
   - Verify any archetype-specific middleware behavior
4. Author smoke-test suite under `src/test/archetype-{name}-flows.test.ts` covering the above. Land it in the re-activation cycle.
5. Toggle on in Admin Settings → Archetypes.
6. Update README and marketing copy to reflect newly available archetype.
7. Announce.

## Seller Contact Info (Cycle 22, updated Cycle 24)
- **DB columns:** `profiles.contact_email` (TEXT), `profiles.contact_visibility` (TEXT, default `pro_plus`, check: `public`/`pro_plus`/`hidden`)
- **Visibility logic:** `public` = free for all logged-in users; `pro_plus` = costs 1 credit to reveal; `hidden` = no contact section shown
- **Server-side only:** Contact info computed in listing detail page server component, passed as props — never exposed via client API
- **Profile settings:** Contact email + visibility preference in `/profile` page via `updateContactSettings` server action
- **Display:** Below seller card in `ListingPurchasePanel`; credit-based reveal UI replaces simple tier gate

## Contact Credits (Cycle 24)
- **Monthly allowances:** Free: 0, Pro: 25, Business: 75, Enterprise: unlimited; reset 1st of month
- **Credit reveal:** 1 credit to reveal `pro_plus` seller contact info; same-month re-reveals free (idempotent); `public` visibility free; `hidden` shows nothing
- **Stripe credit packs:** Starter (10/$29), Standard (30/$69), Pro Pack (100/$179) — one-time payments via Stripe Checkout
- **Admin-editable config:** `system_config` keys: `credit_allowances`, `credit_extra_cost`, `credit_packs` — editable in Admin Settings → Contact Credits
- **Server actions:** `src/app/actions/credits.ts` — `getCreditBalance()`, `revealContactInfo()`, `getRevealedContacts()`, `createCreditCheckoutSession()`, `getCreditHistory()`, `getCreditConfig()`
- **Admin actions:** `adminGrantCredits()`, `getCreditSystemConfig()`, `updateCreditSystemConfig()` in `src/app/(admin)/admin/actions.ts`
- **Cron:** `/api/cron/reset-credits` — monthly reset (schedule: `0 6 1 * *`)
- **Webhook:** Stripe `checkout.session.completed` with `metadata.type === 'credit_purchase'` adds credits to ledger
- **Pages:** `/credits` (balance, history, purchase), Admin Settings → Contact Credits tab, Admin User Detail → Credits card

## Unified Radar (Cycle 40, replaces Favorites + Collections)
- **Architecture:** Single save system for listings, feed posts, and videos; `collections` table with `is_default` flag; `collection_items` with `item_type` discriminator (`listing` | `feed_post` | `video`)
- **Default radar list:** Every user has one `is_default = true` collection ("Saved"); created on migration or on first save
- **Server actions:** `src/app/actions/radar.ts` — `toggleRadarListing()`, `toggleRadarPost()`, `toggleRadarVideo()`, `getRadarListingIds()`, `getRadarPostIds()`, `isListingInRadar()`, `getRadarEquipment()`, `getRadarPosts()`, `getRadarVideos()`, `getRadarCounts()`, `getRadarLists()`
- **Components:** `RadarSaveButton` (universal, Lucide `Radar` icon, optimistic state); `RadarPageClient` (tabbed page)
- **Routes:** `/radar` (primary, 4 tabs: Equipment | Posts | Videos | Lists), `/radar/[id]` (named list detail)
- **Redirects:** `/collections` → `/radar?tab=lists`, `/collections/[id]` → `/radar/[id]`, `/favorites` → `/radar?tab=equipment`
- **Navigation:** Single "Radar" link in desktop nav + mobile drawer (Lucide `Radar` icon); no more separate Favorites/Collections links
- **Listing cards:** Radar icon replaces heart icon on search cards, listing detail, mobile purchase bar
- **Feed posts:** Radar save button in action row (right-aligned)
- **Video player:** Optional `radarProps` prop renders Radar overlay button
- **`company_favorites`** (trusted vendors) completely unrelated — uses its own table and heart icon
- **`favorites` table** retained as read-only archive; not dropped

## Navigation (Cycle 22, updated Cycle 27)
- Home tab (mobile + desktop) navigates to `/feed` (personalized discovery feed), not `/search`
- Search tab navigates to `/search` (browse/discovery page)
- Dashboard accessible via desktop nav tab and mobile hamburger menu
- **Desktop SOS:** `SosNavPopover` renders a two-row popover dropdown below the nav button ("Send SOS" → `/sos/create`, "SOS Dashboard" → `/sos`); no overlay/modal; desktop only (`src/components/sos-nav-popover.tsx`)
- **Mobile SOS:** bottom sheet pattern unchanged (opens Sheet with same two options)

## Personalized Feed (Cycle 27)
- **Route:** `/feed` — protected, server-rendered; Home tab destination for logged-in users
- **Content blocks:** For You (listings matching `user_equipment_interests.tier2` → `listings.category`), Active SOSs, Recently Reduced (price drops ≥5% in 14 days), Saved Search Matches (last 7 days), Demand Signals (Pro+ only)
- **Server actions:** `src/app/actions/feed.ts` — `getFeedForYouListings()`, `getFeedActiveSOS()`, `getFeedPriceDrops()`, `getFeedSavedSearchMatches()`, `getFeedDemandSignals()`
- **Empty state:** Users without equipment interests see `FeedEmptyState` with link to `/profile`

## Public Company Pages (Cycle 27)
- **Route:** `/companies/[slug]` — public (no auth required), SEO-indexed with OG metadata
- **Components:** `CompanyHero` (banner, logo, stats), `CompanyListings` (active listings grid), `CompanyReputation` (star distribution + recent reviews)
- **Server actions:** `src/app/actions/companies-public.ts` — `getPublicCompanyBySlug()`, `getCompanyActiveListings()`, `getCompanyReputationStats()`, `getCompanyListingCount()`
- **Middleware:** `/companies/[slug]` exempt from auth redirect (same pattern as `/listings/[id]` and `/sellers/[id]`)

## Snap & List — AI-assisted listing creation (Cycle 58)
- **Primary flow (Cycle 59):** `/listings/new` is the **default** listing creation entry and renders the multi-step manual form. `/listings/snap` is preserved as an **opt-in experimental flow labeled "Photo-to-Listing"**. `/listings/new?mode=photo` redirects to `/listings/snap`; `/listings/new?mode=advanced` renders the manual form (back-compat alias for default). `/listings/create` single-listing tile, `MobileBottomNav +` action, `MobileMenuDrawer` "Create a Listing", and header "Create Listing" all route to `/listings/new`. The **"Photo-to-Listing draft"** badge (formerly "AI-Assisted") renders on listings with `ai_assisted = true`.
- **Copy rule (Cycle 59):** no user-visible string in `src/app/(main)/listings/snap`, `src/app/(main)/listings/new`, `src/app/(main)/listings/create`, `src/components/listings`, `src/components/upload`, `src/components/layout`, `src/components/nav`, `src/components/shared` may contain "AI-Assisted", "AI-Powered", "Snap & List", "Smart Assist", or "Magic". `/admin/snap-list-metrics` and code identifiers (`SnapListBadge`, `snap_list_events`, `SNAP_LIST_QUOTA`) are exempt. Enforce via grep on each change touching these surfaces.
- **`PhotoToListingHint` (Cycle 59):** `src/components/listings/PhotoToListingHint.tsx`. Dismissable opt-in card shown above the manual form on `/listings/new`. Dismissal persisted via `localStorage['mg-photo-to-listing-dismissed']`. Hidden below 360px. `useSyncExternalStore`-based SSR-safe read (same pattern as `PhotoTipsBanner`).
- **Pilot framing:** this began as an **accuracy pilot** for a new vision pipeline. Cycle 60 migrated `/api/listings/analyze-image` and the SOS camera-first flow onto the same pipeline (`src/lib/vision-analysis/`); admin moderation has no image-analysis surface today.
- **Vision pipeline consumers (Cycle 60):** three surfaces call `analyzeEquipmentImages()`:
  1. Photo-to-Listing — `mode: 'snap-list'` (default), via `src/lib/snap-list/orchestrator.ts`.
  2. SOS create — `mode: 'sos'` (passed by `SOSProcessingStep.tsx` to `/api/listings/analyze-image`); response is projected through `src/lib/sos/vision-orchestrator.ts`.
  3. Manual listing form's photo helper — `mode: 'listing-helper'` (passed by `AIImageCapture.tsx` to `/api/listings/analyze-image`).

  All three modes share the JSON response schema; mode only injects a single framing sentence into the Claude prompt. `src/lib/ai/equipment-prompts.ts` is **deprecated** (Cycle 60); do not import from it.
- **Analyzer route base64 bridge (Cycle 60):** `/api/listings/analyze-image` accepts base64 input from clients, writes it to `tmp/analyze/{userId}/{uuid}.{ext}` in R2, calls `analyzeEquipmentImages(urls, { mode })`, then best-effort deletes the temp keys. Response shape stays `AIAnalysisResult` so existing clients are source-compatible.
- **Reusable vision-analysis layer:** `src/lib/vision-analysis/` — domain-agnostic pipeline (`analyzeEquipmentImages(photoUrls, options)`). Fans out Google Vision OCR + web detection + Claude via `Promise.allSettled`. **MUST NOT** import from `@/lib/snap-list/`, `listing_drafts`, `listings`, or any domain table — enforce via `grep -rnE "^\s*(import\|require).*(snap-list\|listing_drafts\|@/app/actions)" src/lib/vision-analysis/`. Types in `types.ts` are stable — Cycle 59 depends on their shape.
- **Snap & List orchestrator:** `src/lib/snap-list/orchestrator.ts` — pure functions that compose `analyzeEquipmentImages` output with pricing + photo coaching. The only module coupling vision analysis to the `listing_drafts` persistence layer sits in the server actions.
- **Server actions:** `src/app/actions/snap-list.ts` (top-level `analyzePhotos`, deferred via Next.js `after()`), `snap-list-draft.ts` (`createDraft` / `getDraft` / `updateDraftField` / `publishDraft` / `discardDraft` / `appendDraftPhotos`), `snap-list-usage.ts` (quota), `comparable-listings.ts` (`findComparables` + `getPriceSuggestion`), `photo-coach.ts`.
- **3-screen UX:** (1) upload — `SnapUploadZone` reuses `MultiPhotoUploader` with a client-minted UUID key, starts analysis and redirects. (2) `/listings/snap/analyzing/[draftId]` — `AnalysisStream` polls draft every 400ms, renders animated stage timeline. (3) `/listings/snap/review/[draftId]` — `ReviewDraft` with `InlineEditField` (click-to-edit, blur-to-save), `ConfirmFlag` amber dots on fields with confidence <0.75, `PriceSuggestionCard`, `PhotoCoachCard`, `ClarifyingQuestion` tap-to-answer inline cards. Publish button is SOS orange `#FF6B2B`.
- **Condition multipliers for price suggestion:** excellent ×1.15, good ×1.00, fair ×0.80, poor ×0.65. Requires ≥5 comparables for a confident range — otherwise renders "not enough data" with a clear message.
- **Quota gating:** `SNAP_LIST_QUOTA` in `src/lib/constants.ts`: `free: 3/month`, paid tiers: `Infinity`. Enforced in `analyzePhotos`; free users see `QuotaBanner`. Exceeded returns HTTP 402.
- **AI-Assisted badge:** `SnapListBadge` renders on listing detail when `listings.ai_assisted = true` (added as subtle trust signal near the title badges).
- **Pilot instrumentation:** `src/lib/snap-list/events.ts` `logSnapListEvent()` — fire-and-forget, **never throws** (covered by `src/test/snap-list-events.test.ts`). 14 event types across the funnel. Post-publish edits auto-logged by Postgres trigger `snap_list_post_publish_edit_trigger`.
- **Admin dashboard:** `/admin/snap-list-metrics` — superadmin + analyst only (gated by `view_financials` permission). Five `MetricCard` tiles (field edit rate, time-to-publish, abandonment, post-publish edit rate, manual OCR accuracy), daily `MetricsTrendChart` (recharts), `AccuracySampler` for 30 random published drafts with per-field ✓/✗ review buttons.
- **Targets / red flags:** field edit <20%/>40%, time-to-publish <3min/>8min median, abandonment <25%/>50%, post-publish edit <30%/>60%, OCR accuracy ≥95%/<85%.
- **Graceful degradation:** Google Vision down → Claude-only with lower confidence. Claude down → draft `status=failed` with retry. Never blocks publish when confidence is low, but shows warning banner.
- **DB columns added to `listings`:** `ai_assisted BOOLEAN NOT NULL DEFAULT false`, `source_draft_id UUID REFERENCES listing_drafts(id)`. Partial index on `ai_assisted WHERE ai_assisted = true`.
- **Cleanup cron:** `/api/cron/cleanup` calls `cleanup_expired_drafts()` (Postgres fn, SECURITY INVOKER). Drafts auto-expire 7 days after creation if not published.

## Equipment Registry (Cycle 61a)
- **Tables:** `manufacturers` (slug UNIQUE, name, aliases TEXT[], country, tier 1/2/3 CHECK, equipment_categories TEXT[], parent_manufacturer_id self-FK ON DELETE SET NULL, source_file, notes, timestamps), `manufacturer_models` (manufacturer_id FK ON DELETE CASCADE, slug, name, series, equipment_type, notes, source_file, UNIQUE(manufacturer_id, slug)), `registry_match_feedback` (user_id, source_table CHECK in `listings`/`sos_requests`/`snap_list_drafts`, source_row_id, suggested_manufacturer_id, suggested_model_id, user_action CHECK in `accepted`/`rejected`/`overridden_with_text`/`ignored`, user_text_value).
- **Indexes:** `pg_trgm` GIN on `manufacturers.name` + `manufacturer_models.name`; GIN on `manufacturers.aliases` + `manufacturers.equipment_categories`; btree on `manufacturers.tier`, `manufacturer_models.manufacturer_id`, `manufacturer_models.equipment_type`.
- **RLS:** read-for-authenticated on `manufacturers` + `manufacturer_models`; `registry_match_feedback` insert-own (`user_id = auth.uid()`).
- **Listings/SOS columns:** `manufacturer_id` UUID nullable FK, `manufacturer_model_id` UUID nullable FK on both `listings` and `sos_requests`. `listings` also has `registry_match_confidence` REAL and `registry_match_method` TEXT CHECK in `exact`/`alias`/`fuzzy`/`user_confirmed`/`admin_confirmed`/`none` — these are populated by the 61b backfill.
- **Seed source:** 14 `data/manufacturers/*.md` files (centrifuges, compressors, conveyors, crushers/mills, dryers, extruders, filter presses, gearboxes, heat exchangers, mixers, motors, pumps, tanks/pressure vessels, valves). Re-run `scripts/seed-equipment-registry.ts` after editing the `.md` files; idempotent slug-keyed upsert.
- **Slug rule:** lowercase ASCII, hyphenated, parenthetical location stripped, `&` → ` and `. Computed deterministically from `name`.
- **Tier rule:** 1 = global leaders, 2 = specialty/regional, 3 = legacy/regional small. Cross-file appearances take the lowest tier number.
- **Aliases:** capture sub-brand and parent relationships for OCR matching (e.g., Lightnin/Plenty/Philadelphia Mixing Solutions all alias SPX FLOW; Prochem/Greerco/Kenics alias Chemineer; Sharples aliases Pennwalt Sharples).
- **Match logic:** `src/lib/registry/match.ts` — pure functions. `normalizeManufacturerString` strips legal-entity suffixes. `scoreCandidate` ranks exact (1.0) > alias (0.95) > substring (0.85) > trigram-Jaccard (0–0.85). `disambiguateNameplateCandidates` is the **Baldor fix**: equipment-category overlap with the visually-identified equipment type boosts non-component manufacturers by +0.15; component-only vendors (`COMPONENT_CATEGORIES = motor / gearbox / seal / bearing / coupling`) are demoted by 0.20 when a non-component hit exists. Empty input returns `{ primary: null, ... }` without throwing.
- **Server actions:** `src/app/actions/registry.ts` — `searchManufacturers` (pg_trgm + alias contains, optional `equipmentType` bias), `getManufacturerById`, `searchModels`, `recordRegistryFeedback` (Zod-validated, ownership-checked on `listings`/`sos_requests`/`snap_list_drafts` source rows).
- **Autocomplete components:** `src/components/registry/ManufacturerAutocomplete.tsx`, `ModelAutocomplete.tsx`. Free-text fallback ("Use '<typed>' as-is") always present as the last item — the autocomplete is a helper, not a gate. 200ms debounced search; ↑/↓/Enter/Esc keyboard nav. Tier-1 manufacturers render in a slightly bolder weight (subtle trust signal, no copy).
- **Manual listing form (`AdvancedListingForm.tsx`):** explicit Manufacturer + Model fields render in step 1 (Details) above the generic Specifications section. Free-text mirrors to `specifications.manufacturer` / `specifications.model` for `AITitleOptimizer` / `AIDescriptionGenerator` compatibility. `manufacturer_id` + `manufacturer_model_id` written on both draft save and publish.
- **SOS create form (text flow):** Brand and Model inputs use the registry autocomplete; `createSosRequest` accepts `manufacturer_id` + `manufacturer_model_id`. The free-text `brand` and `model` columns continue to populate alongside.
- **Listing detail tooltip:** `ListingSpecs` accepts `verifiedSpecKeys: string[]`. The page passes `["manufacturer"]` when `manufacturer_id` is non-null and `["model"]` when `manufacturer_model_id` is non-null. Spec rows for those keys render a green `ShieldCheck` with a "Verified manufacturer" tooltip. Free-text-only listings render plain text.
- **Vision integration (Cycle 61b):** `analyzeEquipmentImages()` accepts an optional `registryLookup` callback on `EquipmentAnalysisOptions`. All three callers — Photo-to-Listing's `src/app/actions/snap-list.ts`, SOS camera-first + manual-form Photo Helper via `/api/listings/analyze-image` — wire the callback via `buildNameplateRegistryCallback()` from `src/lib/registry/nameplate-callback.ts`. The vision-analysis layer never imports from `@/lib/registry/*`. CI test `src/test/vision-analysis-isolation.test.ts` codifies the grep. When confidence ≥ 0.90 the analyzer overrides `identification.manufacturer` with the canonical registry name and attaches `result.registryMatch` for the orchestrator to persist.
- **Free-text-first principle:** the autocomplete is a helper, never a gate. Users can always submit free-text values for OEMs not in the registry.

## AI Suggestion Feedback (Cycle 63)
- **Tables:** `ai_suggestion_feedback` (non-registry fields) + Cycle 61's `registry_match_feedback` (manufacturer/model). Append-only. RLS allows owner inserts; admin reads via service role. No SELECT policy on the new table.
- **Component:** `src/components/feedback/SuggestionFeedbackChip.tsx`. Three states (accepted / rejected / unsure). Renders only when `suggestedValue` is non-null. `kind="registry"` routes manufacturer/model writes through the registry-feedback wrapper.
- **Server actions:** `src/app/actions/ai-feedback.ts` — `recordSuggestionFeedback()` and `recordRegistryFeedbackFromChip()`. Fail-soft: returns `{ ok: false, error }`, never throws. Ownership check uses `listing_drafts.owner_id`, `sos_requests.requester_id`, `listings.seller_id`.
- **Aggregation rule:** latest row per `(user_id, source_table, source_row_id, field_name)` wins. Admin breakdown does this client-side via DESC sort + dedup.
- **Surfaces:** Photo-to-Listing review (`/listings/snap/review/[draftId]`), SOS sent step (`SOSSentStep`, after `sos_requests.id` exists). Manual-form photo helper deferred — no persistent row exists pre-save.
- **Admin view:** `/admin/snap-list-metrics` includes `FeedbackBreakdown` — last 30 days, accept/reject/overridden/unsure counts per field, hot-flag at >40% reject share with ≥5 events.
- **Copy rule:** neutral chip labels ("Was this right?" / "Looks good" / "Not quite" / "Not sure"). No "AI" / "Smart" / "Magic". No public surfacing of aggregates — internal signal only.

## AI Cost & Usage Telemetry (Cycle 62)
- **Ledger:** `ai_usage_events`. RLS on; admin-only reads via service-role client. No PII / prompt content / OCR text — token counts and metadata only.
- **Surfaces enum** (12 first-class + `other` catch-all): `photo_to_listing_analysis`, `sos_analysis`, `listing_analyzer_helper`, `listing_freshness_cron`, `weekly_brief_cron`, `demand_insights_cron`, `ask_metal_gear`, `ai_search`, `dispute_mediation`, `churn_scoring_cron` (reserved — no AI call today), `registry_seeding`, `registry_disambiguation` (reserved — pure-function), `other`. New surface? Add to the CHECK constraint via Management API BEFORE shipping the surface.
- **Logger:** `recordAiUsage()` and `withAiUsageTracking()` in `src/lib/telemetry/ai-usage.ts`. **Logger never throws** — wraps DB writes in try/catch (codified by `src/test/ai-usage-logger.test.ts`). `withAiUsageTracking` re-throws the wrapped function's error unchanged.
- **Vision integration:** `analyzeEquipmentImages()` accepts an `onUsageEvent` callback. Vision-analysis layer does NOT import from `@/lib/telemetry/*` — callback-based, same pattern as registry. Architecture grep enforced (`src/test/vision-analysis-isolation.test.ts`).
- **Cost models:** `src/lib/telemetry/cost-models.ts`. Sonnet 4 ($3/$15 per 1M I/O), Opus 4 ($15/$75), Haiku 4.5 ($1/$5), GCV DOCUMENT_TEXT_DETECTION ($1.50/1k), GCV WEB_DETECTION ($3.50/1k). As-of 2026-04-25; update on price changes.
- **Stream surfaces** (`ai-copy`, `ask`, `help/chat`) use `stream.finalMessage()` post-stream to capture `usage` — token counts arrive only after the stream resolves.
- **`/api/sos/ai`** has three actions: `categorize` + `rank_responses` log as `sos_analysis`; `predict_demand` logs as `demand_insights_cron` (its only consumer is the cron).
- **`/api/cron/churn-prediction`** makes NO Anthropic call (heuristic scoring only via `src/lib/ai/churn-scorer.ts`); `churn_scoring_cron` enum value is reserved.
- **Admin dashboard:** `/admin/ai-costs`. RBAC: superadmin + analyst (matches `/admin/snap-list-metrics`). KPIs (7d / 30d / MoM / 12h run-rate × 2), daily stacked-area chart by vendor, by-surface table, top-20 users, anomaly callouts (24h > 3× 30d daily avg AND > 5¢).
- **Best-effort accounting:** ledger values are estimates, NOT bills. Authoritative cost comes from vendor consoles. Footer disclaimer on dashboard.

## Registry Backfill (Cycle 61b)
- **Script:** `scripts/backfill-registry-matches.ts`. One-time idempotent. Walks `listings` and `sos_requests` rows where `manufacturer_id IS NULL`, scores the free-text manufacturer via `scoreRowAgainstRegistry` (in `src/lib/registry/backfill.ts`).
- **Confidence tiers:** ≥ 0.90 auto-confirm (writes `manufacturer_id`, `registry_match_confidence`, `registry_match_method`); 0.70-0.90 admin review band (writes confidence + method only — `manufacturer_id` stays NULL); < 0.70 marked `registry_match_method = 'none'`.
- **Idempotent:** filters listings on `registry_match_method IS NULL` (every classified row gets a method written, even unmatched). SOS uses `manufacturer_id IS NULL AND brand IS NOT NULL` (no method column on `sos_requests`). Re-runs only touch unprocessed rows; safe to re-run after seed updates.
- **Batched writes:** one `UPDATE … FROM (VALUES …)` per ~500-row page to stay under Supabase Management API rate limits.
- **Production state (post-Cycle 61b):** 15 listings + 8 SOS rows auto-confirmed; 545 listings + 2 SOS in review band; 2 listings + 6 SOS unmatched.

## SOS Vision Orchestrator (Cycle 60)
- **Module:** `src/lib/sos/vision-orchestrator.ts` — pure functions; no DB writes.
- **`projectAnalysisToSosFields(result)`** — maps `EquipmentAnalysisResult` to SOS field suggestions (manufacturer, model, equipment_type, condition, key_specs, taxonomy bracket IDs, suggested title/description).
- **`buildSosClarifyingQuestions(result)`** — returns 0–3 domain-specific clarifying questions ("Replacement part or whole machine?", "Failure mode?", "Quantity needed?").
- **Persistence stays in `src/app/actions/sos.ts`** — orchestrator only suggests; `createSosRequest` decides what to write. Currently the analyzer route invokes `projectAnalysisToSosFields` for `mode: 'sos'` callers and folds the result into the `AIAnalysisResult` envelope; SOS-side code change to `sos.ts` is deferred (no server-side image-analysis call exists today).

## Listing Creation Photos Step (Cycle 57)
- **Unified photo grid:** AI carry-forward photos from `AIImageCapture` (Cycle 31-1) render as the first tiles INSIDE `MultiPhotoUploader`'s grid via `existingUrls` prop. They are NOT visually segregated or labeled "AI." The first tile shows a "Cover" badge.
- **"+ Add more photos" tile:** persistent grid tile (not a separate button below) showing `N / maxFiles` counter. Always visible when below tier cap.
- **Tier caps:** Free 5, Pro 20, Business 30, Enterprise 50 (from `TIER_LIMITS` in `src/lib/constants.ts`). Caps enforced by `MultiPhotoUploader.maxFiles`.
- **`PhotoTipsBanner`:** `src/components/upload/PhotoTipsBanner.tsx` — dismissable education banner above the photo uploader on listing create only. Four tips: wide shot, nameplate/data tag, wear points, parts & teardown. SOS orange left border. Expanded by default; collapsed after "Got it" via `localStorage['mg-photo-tips-dismissed']`. Does not render on <360px viewports. Uses `useSyncExternalStore` for SSR-safe localStorage/matchMedia reads.

## Listing Detail Page Architecture
The listing detail page (`src/app/(main)/listings/[id]/page.tsx`) is a **Server Component** that fetches data server-side and passes to 7 client sub-components:
- `ListingGallery` — image/video gallery: desktop 44px thumbnails (max 6, "+N more" overflow tile opens image lightbox), video tiles open separate video modal; mobile swipe unchanged
- `ListingMainContent` — title, badges, description, share/QR
- `ListingPurchasePanel` — price, CTAs, seller info, buyer protection (sticky sidebar on desktop)
- `ListingSpecs` — specs table + condition report
- `AskMetalGear` — AI chat with streaming responses; desktop: left column below gallery (Amazon "Ask Rufus" pattern); mobile: below specs in center column
- `ListingReviews` — seller reviews with star distribution
- `MobilePurchaseBar` — fixed bottom bar with Sheet drawer
- `AnonInteractionGate` — signup prompt for anonymous users

## SEO & Structured Data (Cycle 30)
- **`JsonLd` component:** `src/components/json-ld.tsx` — wraps `<script type="application/ld+json">`, accepts any data object
- **Product schema:** on listing detail pages (`page.tsx`) — name, price, condition, availability, seller org
- **LocalBusiness schema:** on company pages — address, aggregate rating when reviews exist
- **Organization schema:** on homepage — Metal Gear branding, Houston TX
- **OG image route:** `/api/og?type={default|listing|company|category}` — pass data as query params (no DB calls in edge runtime); legacy `?listing=ID` still works
- **OG params:** listing: `title`, `price`, `condition`, `location`, `image`; company: `name`, `location`, `listings`, `logo`; category: `category`, `count`
- **Canonical URLs:** set via `alternates.canonical` in `generateMetadata` on all public pages
- **Feed page:** `robots: { index: false, follow: false }` — personalized content not useful to index
- **robots.ts:** allows `/feed/hashtag/`; disallows `/feed`, `/dashboard`, `/admin`, `/settings`, `/messages`, `/notifications`, `/profile`, `/credits`, `/invite`, `/api/`, `/onboarding`, `/companies/new`
- **Sitemap:** static pages + equipment categories + companies (500) + quality listings (≥50 score, 500) + recent listings (500) + sellers (200) + hashtag pages (100)
- **`EmptyState` component:** `src/components/shared/empty-state.tsx` — icon, title, message, primary + secondary action buttons

## PWA
- Manifest at `/public/manifest.json`
- Icons: `/public/icons/icon-192.svg`, `/public/icons/icon-512.svg`
- Mobile bottom nav with safe area insets

## Security Infrastructure (Cycle 38)
- **Security headers:** CSP, X-Frame-Options, X-Content-Type-Options, HSTS, Referrer-Policy, Permissions-Policy via `next.config.ts` `headers()`
- **Input validation:** Zod schemas in `src/lib/security/validate.ts` — `AISearchSchema`, `AICopySchema`, `SOSAISchema`, `AIChatSchema`, `HelpChatSchema`, `AnalyzeImageSchema`, `CreateFeedPostSchema`
- **Sanitization:** `src/lib/security/sanitize.ts` — `sanitizeText()`, `stripHtml()`, `escapePostgrestValue()` (PostgREST filter injection prevention)
- **File validation:** `src/lib/security/file-validation.ts` — magic byte validation for images/videos/documents; applied in feed upload route
- **Rate limiting:** `src/lib/security/rate-limit.ts` — token bucket rate limiter; applied in `middleware.ts` for AI routes and contact reveal; per-route configs in `RATE_LIMIT_CONFIGS`
- **Error safety:** `src/lib/security/errors.ts` — `safeErrorMessage()` / `toActionError()` prevent DB schema and stack trace leakage
- **PostgREST filter escaping:** All user-supplied values in `.or()`, `.ilike()` filters use `escapePostgrestValue()` — AI search, SOS AI, help search, admin priority search

## Conventions
- User preference: "I want you to do all the work. Just ask me for credentials."
- Build, commit, push, and deploy after each task
- Commit messages include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
- Supabase env vars managed via Management API (token needed per session)
- Vercel env vars managed via REST API
- API docs at `/docs/api.md`
- Update `CHANGELOG.md` at the end of each cycle before deploying — add a versioned entry with Added/Changed/Fixed sections following Keep a Changelog format
