# Cycle 8 Complete — Notifications v2, Social & Marketplace Maturity

## Summary
All 8 tasks completed and deployed to production.

## Tasks Completed

### Task 1: Push Notifications & Notification Center
- Web Push API integration with VAPID keys and service worker
- Push subscription management via server actions
- Full notification center page with category filters (All, Unread, Messages, Offers, Transactions)
- Notification preferences page with per-category push/email/off toggles
- Push notification delivery alongside existing email notifications
- Files: `src/app/(main)/notifications/page.tsx`, `src/app/actions/notifications.ts`, `public/sw.js`
- Migration: `024_cycle8_task1.sql`

### Task 2: Listing Expiration & Auto-Renewal
- `expires_at` column on listings with 90-day default
- Auto-renewal settings: `auto_renew` boolean on listings
- Cron job at `/api/cron/listing-expiration`: expires listings past date, auto-renews eligible ones
- Expiration warnings sent 7 days before expiry via notifications
- Seller dashboard shows expiring listings count
- Migration: `025_cycle8_task2.sql`

### Task 3: Related Listings & Cross-Sell
- `getRelatedListings` server action: same category, similar price range, excluding current listing
- Related listings carousel on listing detail page (up to 6 items)
- Smart similarity scoring based on category match, price proximity, and condition match
- Files: `src/app/actions/related.ts`, listing detail page updated
- Migration: `026_cycle8_task3.sql`

### Task 4: Saved Search Enhancements & Price Drop Alerts
- `target_price_cents` on price watches for target-price alerts
- `frequency` on saved searches (instant/daily/weekly)
- `setPriceAlert` server action with auto-create price watch
- Price alert dialog on listing detail page
- Frequency selector on search save dialog
- Dedicated saved searches management page at `/saved-searches`
- Files: `src/app/actions/compare.ts`, `src/app/actions/search.ts`, `src/app/(main)/saved-searches/page.tsx`
- Migration: `027_cycle8_task4.sql`

### Task 5: User Dashboard v2
- Complete dashboard rewrite with modular widget layout
- Role detection: seller widgets vs buyer widgets
- Seller: revenue summary (month-over-month % change), pending shipments, expiring listings, recent offers
- Buyer: active transactions, price watches with drop indicators, upcoming viewings
- Collapsible widgets with localStorage persistence
- `getDashboardData` consolidated server action
- Files: `src/app/actions/dashboard.ts`, `src/app/(main)/dashboard/page.tsx`

### Task 6: Inventory Management & Stock Tracking
- `quantity`, `sku`, `warehouse_location` columns on listings
- Full inventory management page at `/inventory` with sortable/filterable table
- Sort by: title, SKU, quantity, price, status, views, created_at
- Filter by: search (title/SKU), status, category
- Bulk actions: set active, set draft, adjust price, set quantity
- Auto-decrement quantity on transaction completion
- Mark listing as sold when quantity hits 0
- Low stock notification when quantity drops to 1
- Inventory fields added to listing creation form
- Files: `src/app/(main)/inventory/page.tsx`, `src/app/(main)/inventory/actions.ts`
- Migration: `028_cycle8_task6.sql`

### Task 7: Social Sharing & Referral Program
- Dynamic OG images via `@vercel/og` at `/api/og?listing=<id>`
- Branded OG image: listing photo, title, price, condition badge, Metal Gear branding
- Listing detail layout serves rich OpenGraph + Twitter Card metadata
- Referral system: unique `referral_code` on profiles, `referrals` table
- `/ref/[code]` route: validates code, sets 30-day cookie, redirects to signup
- Signup page stores referral code in user metadata
- Auth callback tracks referral signup automatically
- $10 reward when referred user completes first transaction
- Referral dashboard on profile page: stats, shareable link, referral list with status badges
- Files: `src/app/actions/referrals.ts`, `src/app/api/og/route.tsx`, `src/app/ref/[code]/route.ts`
- Migration: `029_cycle8_task7.sql`

### Task 8: Performance, Monitoring & Production Polish
- Loading skeletons for 6 routes: collections, inventory, notifications, saved-searches, schedule, transactions
- 15 composite database indexes for common query patterns
- Health check endpoint at `/api/health`: Supabase connection, Stripe config, latency, commit SHA
- Weekly cleanup cron at `/api/cron/cleanup`: old notifications (90+ days), read notifications (30+ days), stale listing views, orphaned price history
- Structured server action logging utility (`withLogging` wrapper)
- Vercel cron config for weekly cleanup (Sundays 3am UTC)
- Migration: `030_cycle8_task8.sql`

## Migrations Run
- `024_cycle8_task1.sql` — Push notification subscriptions
- `025_cycle8_task2.sql` — Listing expiration & auto-renewal
- `026_cycle8_task3.sql` — Related listings support
- `027_cycle8_task4.sql` — Price alert targets & search frequency
- `028_cycle8_task6.sql` — Inventory columns (quantity, sku, warehouse_location)
- `029_cycle8_task7.sql` — Referral codes & referrals table
- `030_cycle8_task8.sql` — Composite indexes (15 indexes)

## New API Routes
- `GET /api/og?listing=<id>` — Dynamic OG image generation
- `GET /api/health` — Health check endpoint
- `GET /api/cron/cleanup` — Weekly data cleanup
- `GET /ref/[code]` — Referral redirect

## New Pages
- `/inventory` — Inventory management dashboard
- `/saved-searches` — Saved search management
- `/notifications` — Full notification center

## Production URL
https://metal-gear-five.vercel.app
