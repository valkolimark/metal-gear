# Cycle 6 — Seller Tools, Smart Discovery & Trust Infrastructure

## Context
Metal Gear is an industrial equipment marketplace for Houston, TX. Cycles 1–5 are complete — see `prompts/cycle-5-complete.md` for the latest state. The project uses Next.js 15, Supabase, Tailwind v4, shadcn/ui, Zustand, TanStack Query, Stripe, Resend, Sentry, and Leaflet. Read `CLAUDE.md` at the project root for full project context.

**Critical pattern:** All database operations MUST use server actions with admin client. Client-side Supabase DB/storage calls hang in production. See `CLAUDE.md` for details.

## Credentials Needed
At the start of this session, I'll need:
- **Vercel token** (for deployments)
- **Supabase Management API token** (if schema changes needed)

## Cycle 6 Tasks

### Task 1: Saved Search Alerts & Smart Recommendations
- Enhance saved searches: add `notify_email` boolean and `last_notified_at` timestamp to `saved_searches`
- Daily digest email via Resend: match saved search filters against new listings from last 24h, send email with matches
- API route `/api/cron/saved-search-alerts` triggered by Vercel Cron (daily at 8am CT)
- "Recommended for You" section on dashboard: suggest listings based on user's recent views, favorites, and search history
- New table: `user_activity` (user_id, action: 'view'|'search'|'favorite', listing_id nullable, metadata JSONB, created_at)
- Track views, searches, and favorites to build recommendation signals
- Recommendation algorithm: category affinity + price range matching + recency weighting

### Task 2: Seller Storefront & Business Profile
- Public seller storefront at `/sellers/[id]`: banner image, bio, company info, all active listings, reviews, response stats
- Storefront customization: sellers can set a banner image, tagline, and featured listings (up to 3)
- New table: `seller_storefronts` (user_id, banner_url, tagline, featured_listing_ids UUID[], theme_color)
- Storefront editor on profile page: upload banner, set tagline, pick featured listings
- Seller stats card: member since, total listings, avg response time, avg rating, total sales
- "Visit Storefront" link on listing detail pages and seller profile cards
- SEO metadata and JSON-LD Organization schema on storefront pages

### Task 3: Bulk Listing Import via CSV
- CSV upload page at `/listings/import` (Premium/Boost tiers only)
- CSV template download with required columns: title, description, category, condition, price, city, state, industry
- Upload flow: parse CSV → validate rows → preview table with error highlighting → confirm import
- Server action processes rows: create listings as drafts, skip invalid rows, return summary
- Import history: track past imports with row counts and status
- New table: `listing_imports` (user_id, filename, total_rows, success_count, error_count, errors JSONB, created_at)
- Enforce tier listing limits during import (skip rows that exceed quota)

### Task 4: Verified Seller Badge & Trust System
- Verified seller program: sellers submit business verification documents
- New table: `seller_verifications` (user_id, business_name, tax_id_hash, document_url, status: pending/approved/rejected, reviewed_by, reviewed_at, created_at)
- Verification request form on profile page: business name, EIN/tax ID (hashed before storage), upload business license
- Admin verification queue: review pending verifications, approve/reject with notes
- Verified badge (checkmark icon) displayed on listing cards, listing detail, seller profile, storefront
- Trust score calculation: verified status + review rating + response time + account age → displayed as trust level (New/Trusted/Verified/Top Seller)
- `trust_score` integer column on profiles table (0-100)

### Task 5: Transaction & Order Management
- New tables: `transactions` (buyer_id, seller_id, listing_id, offer_id, amount_cents, status: initiated/payment_pending/paid/shipped/delivered/completed/disputed/refunded, tracking_number, created_at, updated_at)
- Transaction flow: accepted offer → initiate transaction → buyer pays (Stripe payment intent) → seller marks shipped → buyer confirms delivery → complete
- Transaction detail page at `/transactions/[id]` with status timeline
- Transaction list on dashboard with filter by status
- Seller shipment tracking: enter tracking number and carrier
- Buyer delivery confirmation button
- Email notifications at each status change (payment received, item shipped, delivery confirmed)
- Transaction history accessible from both buyer and seller dashboards

### Task 6: Enhanced Messaging & Document Sharing
- File attachments in messages: upload images, PDFs, documents (stored in Supabase Storage `message-attachments` bucket)
- New table: `message_attachments` (message_id, file_url, file_name, file_type, file_size_bytes)
- Inline image previews and PDF download links in message thread
- Quick reply templates: sellers can save canned responses for common questions
- New table: `reply_templates` (user_id, name, body, created_at)
- Template picker in message compose area
- Typing indicator via Supabase Realtime presence
- Message search: search across all conversations by keyword

### Task 7: Advanced Analytics & Market Insights
- Market insights page at `/insights` (Premium/Boost tiers)
- Average price by category chart (bar chart)
- Listing volume trends by category over 6 months (line chart)
- Demand heatmap: which categories have high search volume vs low supply
- Price comparison tool: "How does your listing compare?" — show where a listing's price falls vs category median/avg
- Seller performance dashboard: conversion funnel (views → inquiries → offers → sales), revenue tracking
- Export analytics data as CSV
- All charts built with pure CSS/SVG (no charting library needed, keep bundle small)

### Task 8: Internationalization & Accessibility Foundations
- i18n infrastructure: set up `next-intl` with English as default locale and Spanish as second locale
- Translate all static UI strings (nav, buttons, labels, placeholders, empty states, error messages)
- Language switcher in header dropdown
- Store user locale preference in profile (`preferred_locale` column on profiles)
- Accessibility audit and fixes: proper ARIA labels on all interactive elements, keyboard navigation for dropdowns/modals/tabs, focus management, skip-to-content link
- Color contrast verification: ensure all text meets WCAG AA (4.5:1 ratio) against dark background
- Screen reader testing: ensure all images have alt text, form fields have labels, status changes announced

## Design Guidelines
- Dark theme only (#0A0A0F bg, #FF6B2B primary, #3A8FD4 accent)
- Chakra Petch for headings, Manrope for body
- Mobile-first responsive (Mobile < 768px, Tablet 768-1023px, Desktop 1024px+)
- Use existing shadcn/ui components; install new ones as needed
- All DB operations via server actions (never client-side Supabase for DB/storage)
- Pure CSS/SVG for charts — avoid adding heavyweight charting libraries

## Workflow
- Do each task sequentially
- Build, commit, push, and deploy after each task
- Troubleshoot errors autonomously — I'll provide credentials upfront
