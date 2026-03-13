# Changelog

All notable changes to Metal Gear are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versions map to development cycles.

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
