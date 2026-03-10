# Cycle 8 — Notifications v2, Social & Marketplace Maturity

## Context
Metal Gear is an industrial equipment marketplace for Houston, TX. Cycles 1–7 are complete — see `prompts/cycle-7-complete.md` for the latest state. The project uses Next.js 15, Supabase, Tailwind v4, shadcn/ui, Zustand, TanStack Query, Stripe, Resend, Sentry, Leaflet, next-intl, and react-markdown. Read `CLAUDE.md` at the project root for full project context.

**Critical pattern:** All database operations MUST use server actions with admin client. Client-side Supabase DB/storage calls hang in production. See `CLAUDE.md` for details.

## Credentials Needed
At the start of this session, I'll need:
- **Vercel token** (for deployments)
- **Supabase Management API token** (if schema changes needed)

## Cycle 8 Tasks

### Task 1: Push Notifications & Notification Center
- Web Push notifications via the Push API and service worker
- New table: `push_subscriptions` (user_id, endpoint text, p256dh text, auth text, created_at)
- Generate VAPID key pair, store public key in env vars
- Service worker at `/sw.js` for push event handling and notification display
- "Enable Notifications" prompt on dashboard (saves PushSubscription to DB)
- Send push notifications for: new messages, offer received, offer accepted, transaction status changes, viewing request responses
- Notification center page at `/notifications` with full history, filters (all/unread/messages/offers/transactions), and bulk mark-as-read
- Notification preferences: per-category toggle for push vs email vs both vs none (update `email_notifications` JSONB → rename to `notification_preferences`)
- Unsubscribe from push on profile settings page

### Task 2: Listing Expiration & Auto-Renewal
- New columns on `listings`: `expires_at timestamptz`, `auto_renew boolean DEFAULT false`
- Active listings expire after 90 days by default
- Expiration warning email at 7 days and 1 day before expiry
- API route `/api/cron/listing-expiration` triggered by Vercel Cron (daily at 6am CT): mark expired listings as `expired` status, send notification
- Auto-renew toggle on listing edit page: if enabled, auto-extend expiration by 90 days when expiring
- Expired listing visual indicator on My Listings page with "Renew" button
- New listing status: `expired` (add to status check constraints)
- Dashboard alert when listings are expiring within 7 days

### Task 3: Related Listings & Cross-Sell
- "Related Equipment" section on listing detail page: show 4-6 similar listings based on category, industry, price range, and keyword similarity
- Algorithm: weighted scoring — same category (40%), same industry (20%), similar price ±30% (20%), shared keywords in title (20%)
- "Frequently Bought Together" section on listing detail page: query transactions where buyers also purchased other items (show up to 3)
- "More from This Seller" carousel on listing detail page: other active listings by the same seller (up to 6)
- "Buyers Also Viewed" section: track co-view patterns via `listing_views` and surface listings commonly viewed in the same session
- New table: `view_sessions` (session_id text, user_id nullable, listing_id, viewed_at) — group views within 30-minute windows for co-view analysis
- Server action for related listings with caching (recompute hourly, store result in `listing_recommendations` table)

### Task 4: Saved Search Enhancements & Price Drop Alerts
- Price drop detection: when a listing's price is updated, compare to `price_history` and notify watchers
- Enhance `price_watches`: add `target_price_cents` column — alert when listing drops to or below target
- Price drop notification: push + email with old price, new price, and percentage drop
- Saved search enhancements: frequency selector (instant/daily/weekly) on saved search form
- Instant alerts: when a new listing matches a saved search with `frequency: 'instant'`, send notification immediately (triggered in create listing action)
- Saved search management page at `/saved-searches`: view all saved searches, edit filters, change frequency, delete
- "Price Alert" button on listing detail page: set a target price and get notified when it drops

### Task 5: User Dashboard v2
- Redesigned dashboard with modular widget layout
- Seller widgets: revenue summary (this month vs last month with % change), pending shipments count, unread messages, expiring listings alert, recent offers received
- Buyer widgets: active transactions, watchlist price drops, unread messages, upcoming viewings, recent activity
- Role detection: show seller widgets if user has any listings, buyer widgets if user has any transactions as buyer
- "Getting Started" progress card for new users (integrate existing onboarding checklist)
- Quick stats bar: total views this week, total inquiries, conversion rate, response time average
- Activity feed: unified timeline of recent events (messages received, offers made/received, listings viewed, transactions updated)
- Each widget card is collapsible with state persisted in localStorage

### Task 6: Inventory Management & Stock Tracking
- New columns on `listings`: `quantity integer DEFAULT 1`, `sku text`, `warehouse_location text`
- Quantity management: sellers can list multiple units of the same equipment
- When a transaction completes, auto-decrement quantity; when quantity hits 0, auto-mark as sold
- SKU field on listing create/edit page for internal tracking
- Warehouse/yard location field (free text) for inventory organization
- Inventory overview page at `/inventory`: table view of all listings with columns for SKU, quantity, location, status, price, views
- Sortable and filterable table (sort by any column, filter by status/category/location)
- Low stock alert: notification when quantity drops to 1
- Bulk actions on inventory page: update status, adjust price, adjust quantity for multiple listings

### Task 7: Social Sharing & Referral Program
- Enhanced social sharing: generate branded Open Graph images for listings (use `@vercel/og` for dynamic OG image generation)
- Dynamic OG image at `/api/og?listing=<id>`: listing photo, title, price, condition badge, Metal Gear branding
- Referral program: each user gets a unique referral code stored on profiles (`referral_code text UNIQUE`)
- New table: `referrals` (referrer_id, referred_id, status: 'pending'|'signed_up'|'first_listing'|'first_transaction', reward_cents integer, created_at)
- Referral link: `https://metal-gear-five.vercel.app/ref/<code>` → landing page → signup with referral tracking
- Referral rewards: $10 credit when referred user completes their first transaction
- Referral dashboard on profile page: share link, track referrals, view earnings
- API route `/ref/[code]` that redirects to signup with referral code in cookie

### Task 8: Performance, Monitoring & Production Polish
- Implement `React.Suspense` boundaries with streaming for slow-loading sections (transactions, insights, search)
- Add `loading.tsx` skeletons for all remaining routes without them (collections, schedule, help, inventory, saved-searches, notifications)
- Database query optimization: add composite indexes for common query patterns identified across cycles
- Image optimization: convert listing photo uploads to WebP format server-side before storing
- Lighthouse audit fixes: address any remaining performance, accessibility, or SEO issues
- Monitoring: structured logging for all server actions (action name, user_id, duration_ms, success/error)
- Health check endpoint at `/api/health`: verify Supabase connection, Stripe connection, basic app status
- Stale data cleanup cron at `/api/cron/cleanup` (weekly): remove orphaned images, expired sessions, old notifications (90+ days)

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
