# Cycle 7 Complete — Payments, Disputes & Community

## Summary
All 8 tasks completed and deployed to production.

## Tasks Completed

### Task 1: Stripe Escrow Payments for Transactions
- Stripe PaymentIntent integration with `capture_method: 'manual'` (authorize-then-capture escrow)
- Buyer completes payment via Stripe Elements on transaction detail page
- On successful authorization, transaction auto-transitions to `paid`
- Funds captured and released to seller only when buyer confirms delivery and completes transaction
- Disputed/cancelled transactions cancel the PaymentIntent (refund to buyer)
- 5% platform service fee calculated and stored on each transaction
- Webhook handler for `payment_intent.succeeded`, `payment_intent.canceled`, `payment_intent.payment_failed`
- New columns on `transactions`: `platform_fee_cents`, `stripe_payment_intent_status`
- Files: `src/app/actions/payments.ts`, `src/app/(main)/transactions/[id]/page.tsx`, `src/app/api/webhooks/stripe/route.ts`

### Task 2: Dispute Resolution System
- `disputes` table with full lifecycle: open → under_review → resolved_buyer / resolved_seller / escalated
- Buyer can open a dispute from transaction detail page (when status is shipped or delivered)
- Dispute form: reason dropdown (5 options), description, evidence photo upload (up to 5 images)
- `dispute-evidence` Supabase Storage bucket for evidence photos
- Seller can respond to disputes with counter-evidence and written response
- Admin dispute resolution panel: review evidence from both parties, resolve in favor of buyer (refund) or seller (release funds)
- Email notifications at each dispute lifecycle event
- Dispute history timeline displayed on transaction detail page
- Files: `src/app/actions/disputes.ts`, `src/app/(main)/transactions/[id]/page.tsx`

### Task 3: Buyer & Seller Reviews (Post-Transaction)
- Extended `reviews` table with `transaction_id`, `listing_id`, and `review_type` (seller/buyer) columns
- After transaction completion, both buyer and seller can leave star ratings (1-5) with optional comments
- Review prompts on transaction detail page (only visible when status = completed)
- Duplicate prevention: unique index on (reviewer_id, transaction_id)
- Reviews displayed on public profile pages for both buyers and sellers
- Trust score recalculated when new reviews are submitted
- Files: `src/app/actions/reputation.ts`, `src/app/(main)/transactions/[id]/page.tsx`

### Task 4: Equipment Condition Reports
- `condition_reports` table with grade (A-F), three 1-10 scores (mechanical, cosmetic, electrical), hours of use, last service date, notes, and photos
- Seller creates condition reports from listing edit page with grade selector, sliders, and photo upload
- `condition-reports` Supabase Storage bucket for inspection photos
- Collapsible "Inspection Report" card on listing detail page with color-coded grade badge, score bars, and photos
- Condition grade badges displayed on listing cards in search results (grid and list views) and favorites page
- Batch grade fetching via `getConditionReportsForListings` for efficient rendering
- Verified sellers' reports display a "Verified Inspection" badge
- Files: `src/app/actions/condition-reports.ts`, `src/app/(main)/listings/[id]/page.tsx`, `src/app/(main)/search/page.tsx`, `src/app/(main)/favorites/page.tsx`

### Task 5: Saved Listing Collections
- `collections` and `collection_items` tables with full CRUD operations
- Collections page at `/collections` with grid of user collections and item counts
- Collection detail page at `/collections/[id]` with listing grid, remove items, and share button
- "Add to Collection" dropdown on listing detail page with inline collection creation
- Public collections visible to anyone via shareable URL, private collections owner-only
- Backwards compatible with existing Favorites (shown as default collection link)
- Files: `src/app/actions/collections.ts`, `src/app/(main)/collections/page.tsx`, `src/app/(main)/collections/[id]/page.tsx`, `src/app/(main)/listings/[id]/page.tsx`

### Task 6: Seller Availability & Scheduling
- `seller_availability` table (day of week, start/end time, timezone) and `viewing_requests` table
- Schedule page at `/schedule` with weekly availability settings (day toggles, time selectors)
- Incoming viewing requests section for sellers (accept/decline with email notifications)
- Outgoing viewing requests section for buyers (cancel pending requests)
- "Request Viewing" button and dialog on listing detail page
- Email notifications via Resend for requests, acceptances, and declines
- Timezone-aware scheduling (default: America/Chicago for Houston)
- Files: `src/app/actions/scheduling.ts`, `src/app/(main)/schedule/page.tsx`, `src/app/(main)/listings/[id]/page.tsx`

### Task 7: Platform Help Center & Knowledge Base
- `help_articles` table with 16 seeded articles across 7 categories (getting_started, buying, selling, payments, shipping, account, safety)
- Help center page at `/help` with category grid, keyword search, FAQ accordion (8 questions), and contact support form
- Article detail page at `/help/[slug]` with react-markdown rendering styled for dark theme
- Category icons: BookOpen, ShoppingCart, Tag, CreditCard, Truck, User, Shield
- Floating "Help" button (fixed position, bottom-right) on all pages, auto-hidden on `/help` routes
- Contact support form sends email via Resend to admin
- Files: `src/app/actions/help.ts`, `src/app/(marketing)/help/page.tsx`, `src/app/(marketing)/help/[slug]/page.tsx`, `src/components/layout/help-button.tsx`, `src/app/(main)/layout.tsx`

### Task 8: Onboarding Flow & User Engagement
- `onboarding_progress` table tracking completed steps, completion timestamp, and dismiss state
- Onboarding checklist widget on dashboard with progress bar, step links, and dismiss button
- Auto-detects completed steps: profile info, location set, equipment browsed, listing created or search saved
- Hidden when dismissed or all steps complete
- Weekly engagement digest cron at `/api/cron/engagement-digest` (Monday 9am CT / 15:00 UTC)
- Digest targets users inactive for 7+ days with new equipment listings
- Respects `email_notifications.digest` user preference for unsubscribe
- `last_login_at` timestamp on profiles updated on each dashboard visit
- Files: `src/app/actions/onboarding.ts`, `src/components/onboarding/onboarding-checklist.tsx`, `src/app/(main)/dashboard/page.tsx`, `src/app/api/cron/engagement-digest/route.ts`, `vercel.json`

## Database Tables Added (Cycle 7)
- `disputes` — Dispute lifecycle with evidence from both parties and admin resolution
- `condition_reports` — Equipment inspection grades and scores per listing
- `collections` — User-created named collections with public/private visibility
- `collection_items` — Listings saved to collections with optional notes
- `seller_availability` — Weekly availability schedule per seller (day/time/timezone)
- `viewing_requests` — Equipment viewing appointment requests between buyers and sellers
- `help_articles` — Knowledge base articles with markdown content (16 seeded)
- `onboarding_progress` — User onboarding step tracking with dismiss state

## Database Columns Added (Cycle 7)
- `transactions.platform_fee_cents` — 5% platform service fee in cents
- `transactions.stripe_payment_intent_status` — Stripe PaymentIntent lifecycle status
- `reviews.transaction_id` — Links review to a specific transaction
- `reviews.listing_id` — Links review to a specific listing
- `reviews.review_type` — Distinguishes seller vs buyer reviews
- `profiles.last_login_at` — Last login timestamp for engagement tracking

## New Routes
- `/collections` — User's listing collections with create/manage
- `/collections/[id]` — Collection detail with listings grid
- `/schedule` — Seller availability settings and viewing request management
- `/help` — Help center with categories, search, FAQ, and contact form
- `/help/[slug]` — Individual help article with markdown rendering
- `/api/cron/engagement-digest` — Weekly engagement digest cron

## Storage Buckets Added
- `dispute-evidence` — Evidence photos for disputes
- `condition-reports` — Condition report inspection photos

## npm Packages Added
- `react-markdown` — Markdown rendering for help articles

## Vercel Cron Jobs
- `/api/cron/saved-search-alerts` — Daily at 8am CT (from Cycle 6)
- `/api/cron/engagement-digest` — Weekly Monday at 9am CT (new)

## Key Patterns Maintained
- All DB operations via server actions with `createAdminClient()`
- Profile email access via `admin.auth.admin.getUserById()` (not profiles table)
- Cookie-based i18n with EN/ES translations for all new UI strings
- Dark theme styling throughout (#0A0A0F bg, #FF6B2B primary, #3A8FD4 accent)
- Email notifications via Resend at key lifecycle events
- Role-based access control (buyer vs seller actions, owner-only operations)
- Tier gating maintained for premium features
