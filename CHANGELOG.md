# Changelog

All notable changes to Metal Gear are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versions map to development cycles.

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
