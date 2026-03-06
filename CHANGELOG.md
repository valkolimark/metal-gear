# Changelog

All notable changes to Metal Gear are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versions map to development cycles.

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
