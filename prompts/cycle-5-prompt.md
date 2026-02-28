# Cycle 5 — Real-Time, Location & Marketplace Intelligence

## Context
Metal Gear is an industrial equipment marketplace for Houston, TX. Cycles 1–4 are complete — see `prompts/cycle-4-complete.md` for the latest state. The project uses Next.js 15, Supabase, Tailwind v4, shadcn/ui, Zustand, Stripe, Resend, and Sentry. Read `CLAUDE.md` at the project root for full project context.

**Critical pattern:** All database operations MUST use server actions with admin client. Client-side Supabase DB/storage calls hang in production. See `prompts/cycle-2-complete.md` for details.

## Credentials Needed
At the start of this session, I'll need:
- **Vercel token** (for deployments)
- **Supabase Management API token** (if schema changes needed)

## Cycle 5 Tasks

### Task 1: Real-Time Notifications & Activity Feed
- In-app notification system: bell icon in header with notification dropdown
- New table: `notifications` (user_id, type, title, body, data JSONB, read_at, created_at)
- Notification types: new_message, listing_inquiry, review_received, listing_sold, price_drop_alert
- Supabase Realtime subscription for live notification delivery (client-side `onINSERT`)
- Mark as read (individual + mark all), notification badge count in header
- Activity feed on dashboard: recent actions across the platform relevant to the user

### Task 2: Location & Map Integration
- Geocode listings using zip code or city/state (free geocoding API or Supabase PostGIS)
- Map view toggle on search page: show listings as pins on an interactive map
- Use Mapbox GL JS (free tier: 50k loads/mo) or Leaflet + OpenStreetMap (completely free)
- Clicking a map pin shows listing preview card
- Distance-based sorting: sort results by distance from user's location or entered zip
- Store `location_lat` and `location_lng` on listings table (columns already exist)
- Radius filter: leverage tier-based search radius limits (100mi/500mi/unlimited)

### Task 3: Offer & Negotiation System
- New table: `offers` (buyer_id, listing_id, amount_cents, message, status: pending/accepted/rejected/countered/expired)
- "Make an Offer" button on listing detail page (alternative to "Contact Seller")
- Offer management UI: sellers see incoming offers, can accept/reject/counter
- Counter-offer flow: seller proposes a different price, buyer can accept/reject
- Offer expiration: auto-expire after 72 hours if no response
- Notification on new offer, acceptance, rejection, counter
- Offer history visible to both parties in the conversation thread

### Task 4: Listing Media Upgrades
- Video upload support for Premium/Boost tiers (stored in Supabase Storage `listing-videos` bucket)
- Video player component on listing detail page (HTML5 video with controls)
- Image optimization pipeline via server action: resize to max 1920px width, generate thumbnail
- Blur hash placeholder generation for listing images (base64 encoded)
- Photo count and video count displayed on listing cards in search results

### Task 5: Comparison & Watchlist Tools
- Compare listings side-by-side: select 2-3 listings from search, view specs/price/condition in comparison table
- "Compare" checkbox on listing cards, comparison bar at bottom when items selected
- Comparison page: `/compare?ids=id1,id2,id3`
- Price drop alerts: watch a listing, get notified when price decreases
- New table: `price_watches` (user_id, listing_id, original_price_cents, created_at)
- Price history tracking: store price changes, show price trend on listing detail

### Task 6: Advanced Admin & Moderation
- Admin moderation queue: review reported listings/users with action buttons
- Bulk actions: select multiple listings/users, apply status changes
- Admin analytics: revenue by month chart, subscription churn rate, top categories by listing count
- Content moderation: flagged words list, auto-flag listings with suspicious content
- Export reports: download CSV of listings, users, or transactions
- Audit log: track admin actions (who did what, when)

### Task 7: SEO & Marketing Pages
- Category landing pages: `/equipment/[category]` (e.g., `/equipment/cnc-machines`) with SSR
- Blog/content section: `/blog` with static MDX posts for SEO content
- Structured data (JSON-LD) on listing pages: Product schema with price, condition, availability
- Dynamic sitemap.xml generation for all active listings
- robots.txt optimization
- Landing page redesign: hero section, featured listings, testimonials, category grid, CTA

### Task 8: Developer Experience & CI/CD
- GitHub Actions CI pipeline: lint, typecheck, unit tests, build on PR
- Pre-commit hooks via Husky: lint-staged for formatting
- Database migration tracking: numbered SQL files with applied tracking
- Environment variable validation on startup (Zod schema for env vars)
- Error boundary improvements: recovery actions, error reporting context
- Bundle analysis script and performance budget

## Design Guidelines
- Dark theme only (#0A0A0F bg, #FF6B2B primary, #3A8FD4 accent)
- Chakra Petch for headings, Manrope for body
- Mobile-first responsive (Mobile < 768px, Tablet 768-1023px, Desktop 1024px+)
- Use existing shadcn/ui components; install new ones as needed
- All DB operations via server actions (never client-side Supabase for DB/storage)

## Workflow
- Do each task sequentially
- Build, commit, push, and deploy after each task
- Troubleshoot errors autonomously — I'll provide credentials upfront
