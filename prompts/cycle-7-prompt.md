# Cycle 7 — Payments, Disputes & Community

## Context
Metal Gear is an industrial equipment marketplace for Houston, TX. Cycles 1–6 are complete — see `prompts/cycle-6-complete.md` for the latest state. The project uses Next.js 15, Supabase, Tailwind v4, shadcn/ui, Zustand, TanStack Query, Stripe, Resend, Sentry, Leaflet, and next-intl. Read `CLAUDE.md` at the project root for full project context.

**Critical pattern:** All database operations MUST use server actions with admin client. Client-side Supabase DB/storage calls hang in production. See `CLAUDE.md` for details.

## Credentials Needed
At the start of this session, I'll need:
- **Vercel token** (for deployments)
- **Supabase Management API token** (if schema changes needed)

## Cycle 7 Tasks

### Task 1: Stripe Escrow Payments for Transactions
- Wire Stripe Payment Intents into the transaction flow (currently status transitions are manual)
- When buyer clicks "Proceed to Payment", create a Stripe PaymentIntent for `amount_cents` with `capture_method: 'manual'` (authorize but don't capture)
- New column on `transactions`: `stripe_payment_intent_id` (already exists but unused)
- Buyer completes payment via Stripe Elements embedded on the transaction detail page
- On successful authorization, auto-transition status to `paid`
- Seller marks as shipped → buyer confirms delivery → on "Complete Transaction", capture the PaymentIntent (releases funds)
- If disputed/refunded, cancel the PaymentIntent instead of capturing
- Webhook handler updates for `payment_intent.succeeded`, `payment_intent.canceled`, `payment_intent.payment_failed`
- Platform fee: deduct 5% service fee before payout (store `platform_fee_cents` on transaction)
- New columns on `transactions`: `platform_fee_cents`, `stripe_payment_intent_status`

### Task 2: Dispute Resolution System
- New table: `disputes` (transaction_id, opened_by, reason: 'item_not_received'|'item_not_as_described'|'damaged_in_shipping'|'wrong_item'|'other', description, evidence_urls text[], status: 'open'|'under_review'|'resolved_buyer'|'resolved_seller'|'escalated', resolution_notes, resolved_by, created_at, updated_at)
- Buyer can open a dispute from the transaction detail page (only when status is 'shipped' or 'delivered')
- Dispute form: reason dropdown, description text area, evidence photo upload (up to 5 images, stored in `dispute-evidence` storage bucket)
- When a dispute is opened, transaction status changes to 'disputed', PaymentIntent capture is blocked
- Seller can respond to a dispute with counter-evidence
- Admin dispute resolution panel: view dispute details, evidence from both parties, resolve in favor of buyer (refund) or seller (release funds)
- Email notifications: dispute opened, dispute response, dispute resolved
- Dispute history visible on transaction detail page with timeline

### Task 3: Buyer & Seller Reviews (Post-Transaction)
- Extend existing `reviews` table: add `transaction_id` column (nullable, for backwards compatibility), add `listing_id` column
- After a transaction is completed, both buyer and seller can leave reviews for each other
- Review prompt on transaction detail page: star rating (1-5), comment, appears after status = 'completed'
- Buyer reviews the seller (already supported), seller reviews the buyer (new)
- Reviews display on public profile pages for both buyers and sellers
- Aggregate buyer rating displayed on profile: avg rating, total reviews received as buyer
- Prevent duplicate reviews: one review per user per transaction
- Recalculate `trust_score` when new reviews are submitted

### Task 4: Equipment Condition Reports
- New table: `condition_reports` (listing_id, created_by, overall_grade: 'A'|'B'|'C'|'D'|'F', mechanical_score 1-10, cosmetic_score 1-10, electrical_score 1-10, hours_of_use integer nullable, last_service_date date nullable, notes text, photo_urls text[], created_at)
- Seller can create a detailed condition report for their listing from the listing edit page
- Condition report form: overall grade selector, three 1-10 sliders (mechanical, cosmetic, electrical), hours of use, last service date, inspection notes, up to 10 condition photos
- `condition-reports` storage bucket for photos
- Condition report displayed on listing detail page as a collapsible "Inspection Report" card
- Condition badge on listing cards (A/B/C/D/F grade with color coding)
- Verified sellers' condition reports get a "Verified Inspection" badge

### Task 5: Saved Listing Collections
- New table: `collections` (user_id, name, description, is_public boolean, cover_image_url, created_at, updated_at)
- New table: `collection_items` (collection_id, listing_id, added_at, notes)
- Users can organize favorites into named collections (e.g., "CNC Machines Under $50K", "Potential Warehouse Equipment")
- "Add to Collection" dropdown on listing cards and listing detail page (replaces single-heart favorite with collection picker)
- Keep existing favorites as a default "Favorites" collection (backwards compatible)
- Collections page at `/collections` showing all user collections with cover images and item counts
- Public collections: users can share collection URLs, visible to anyone at `/collections/[id]`
- Collection detail page: grid of listings with reorder capability and notes per item

### Task 6: Seller Availability & Scheduling
- New table: `seller_availability` (user_id, day_of_week integer 0-6, start_time time, end_time time, timezone text)
- New table: `viewing_requests` (listing_id, buyer_id, seller_id, proposed_datetime timestamptz, status: 'pending'|'accepted'|'declined'|'cancelled', message text, created_at)
- Sellers can set weekly availability schedule on profile page (which days/hours they're available for equipment viewings)
- "Request Viewing" button on listing detail page: buyer picks preferred date/time from seller's available slots
- Seller receives notification and can accept/decline viewing requests
- Accepted viewings appear on a simple calendar view at `/schedule`
- Email confirmations for accepted/declined viewing requests
- Timezone-aware scheduling (default: America/Chicago for Houston)

### Task 7: Platform Help Center & Knowledge Base
- New table: `help_articles` (slug, title, category: 'getting_started'|'buying'|'selling'|'payments'|'shipping'|'account'|'safety', body_markdown text, sort_order integer, published boolean, created_at, updated_at)
- Help center page at `/help` with category-based article navigation
- Seed 15-20 help articles covering: getting started, how to buy, how to sell, payment process, shipping tips, account management, safety guidelines, dispute process
- Markdown rendering for article bodies (use `react-markdown` with custom styled components matching dark theme)
- Search within help articles by keyword
- "Need Help?" floating button on all pages linking to `/help`
- FAQ section on help center landing page with expandable accordion
- Contact support form: name, email, subject, category dropdown, message (sends email to admin via Resend)

### Task 8: Onboarding Flow & User Engagement
- New table: `onboarding_progress` (user_id PRIMARY KEY, steps_completed text[], completed_at timestamptz nullable, dismissed boolean, created_at)
- First-time user onboarding wizard (3-4 steps): complete profile, set location, browse categories, create first listing or save a search
- Onboarding checklist widget on dashboard: progress bar with completed/remaining steps
- Dismiss option to hide onboarding permanently
- Welcome tour: highlight key UI elements with tooltip-based walkthrough (custom CSS, no tour library)
- Weekly engagement email digest for inactive users (7+ days since last login): new listings in their categories, price drops on watched items, unread messages
- API route `/api/cron/engagement-digest` triggered by Vercel Cron (weekly on Monday 9am CT)
- Engagement tracking: `last_login_at` timestamp column on profiles, updated on each authenticated page visit

## Design Guidelines
- Dark theme only (#0A0A0F bg, #FF6B2B primary, #3A8FD4 accent)
- Chakra Petch for headings, Manrope for body
- Mobile-first responsive (Mobile < 768px, Tablet 768-1023px, Desktop 1024px+)
- Use existing shadcn/ui components; install new ones as needed
- All DB operations via server actions (never client-side Supabase for DB/storage)
- Translate new UI strings to both English and Spanish (update `messages/en.json` and `messages/es.json`)

## Workflow
- Do each task sequentially
- Build, commit, push, and deploy after each task
- Troubleshoot errors autonomously — I'll provide credentials upfront
