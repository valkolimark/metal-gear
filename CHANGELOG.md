# Changelog

All notable changes to Metal Gear are documented in this file.

Format follows [Keep a Changelog](https://keepachangelog.com/). Versions map to development cycles.

---

## [Unreleased]

### Planned
- Cycle 9: Bulk listing import via Excel with downloadable template, SOS bulk creation, and full field coverage

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
