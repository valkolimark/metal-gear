# Metal Gear

Industrial equipment marketplace built for Houston, TX and beyond. Buy, sell, and source heavy machinery across oil & gas, petrochemical, mining, manufacturing, and CNC machining.

**Live:** [metal-gear-five.vercel.app](https://metal-gear-five.vercel.app)

---

## Features

### Marketplace
- Multi-step listing creation with photo drag-and-drop reorder, draft saves, and gallery detail pages
- Full-text search with filters (category, condition, price range, location radius), sort options, and grid/list toggle
- 3-tier equipment taxonomy: 4 Tier 1 buckets, 28 Tier 2 groups, ~252 subcategories with cross-referencing
- Location-based discovery with Leaflet/OpenStreetMap, haversine distance sorting, and radius filters
- Bulk CSV/Excel import with downloadable template and validation preview

### SOS Broadcast
- Urgent equipment need broadcasting with category, brand, model, urgency level, and media uploads
- Intelligent responder routing via `find_sos_responders()` with cross-list expansion
- Real-time response tracking with price estimates, lead time, condition, and photos

### Transactions & Trust
- Stripe escrow payments with authorize-then-capture and 5% platform fee
- Dispute resolution with evidence uploads and admin resolution panel
- Equipment condition reports (grade A-F, mechanical/cosmetic/electrical scores)
- Verified seller program with business document review and trust scores (0-100)
- Star ratings and reviews with seller response time tracking

### Communication
- Real-time messaging via Supabase Realtime with unread count tracking
- File attachments (images, PDFs, Office docs) and quick reply templates
- Offer & negotiation system with full lifecycle and 72-hour auto-expiration
- Seller availability scheduling with timezone-aware viewing requests

### AI-Powered Tools
- Conversational AI search powered by Claude — natural language to structured filter mapping with multi-turn context
- "Describe Your Problem" diagnoser — equipment problem descriptions routed to AI search with diagnostic reasoning
- AI description generator with streaming output, regenerate, and edit-before-using actions
- AI title optimizer — 3 SEO-optimized title suggestions with issue warnings
- Listing quality scorer — 0-100 score (grades A-F) with per-category breakdown and improvement tips
- AI image recognition — equipment identification, nameplate OCR, and fraud detection via Claude Vision

### Discovery & Analytics
- Saved search alerts with daily digest emails and recommendation engine
- Market insights with category pricing, trends, and demand heatmap (Premium/Boost)
- Listing analytics with view tracking, 30-day stats, and conversion rates
- Related listings carousel with smart similarity scoring

### Business Tools
- Seller storefronts with customizable banner, tagline, and featured listings
- Inventory management with quantity, SKU, warehouse location, and bulk actions
- Saved listing collections with public/private visibility and shareable URLs
- Referral program with unique codes, 30-day tracking, and $10 reward

### Platform
- 6-step B2B onboarding wizard (identity, equipment interests, industry, trading intent, SOS opt-in, quality agreement)
- Web Push notifications with category filters and per-category preferences
- Internationalization (EN/ES) with cookie-based locale detection
- Help center with 16 articles across 7 categories, keyword search, and FAQ
- Social sharing with dynamic OG images via `@vercel/og`
- Mobile PWA with pull-to-refresh, swipe gestures, and bottom nav

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router, RSC, TypeScript) |
| Database & Auth | Supabase (PostgreSQL, Auth, Storage, Realtime) |
| Styling | Tailwind CSS v4 + shadcn/ui (new-york style) |
| State | Zustand + TanStack Query |
| Payments | Stripe (escrow, subscriptions, Billing Portal) |
| Email | Resend (transactional templates) |
| Maps | Leaflet + OpenStreetMap |
| AI | Anthropic Claude (Sonnet 4) via `@anthropic-ai/sdk` |
| Error Tracking | Sentry |
| Hosting | Vercel |
| CI/CD | GitHub Actions + Husky pre-commit hooks |

### Design System

- **Theme:** Dark-only (`#0A0A0F` background, `#FF6B2B` primary orange, `#3A8FD4` steel blue)
- **Fonts:** Chakra Petch (display/headings) + Manrope (body)
- **Components:** 14 shadcn/ui components (button, input, card, dialog, dropdown-menu, avatar, badge, separator, skeleton, sonner, tooltip, label, select, switch)

---

## Subscription Tiers

| | Free | Premium ($29.99/mo) | Boost ($79.99/mo) |
|---|---|---|---|
| Listings | 3 | 15 | 50 |
| Photos per listing | 5 | 15 | 25 |
| Video uploads | — | 3 | 5 |
| Conversations | 10 | Unlimited | Unlimited |
| Search radius | 100 mi | 500 mi | Unlimited |
| Active SOS | 1 | 3 | Unlimited |
| SOS reach | 100 mi | 500 mi | Unlimited |
| Market insights | — | Yes | Yes |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Supabase project (PostgreSQL, Auth, Storage)
- Stripe account (for payments)
- Resend account (for emails)

### Environment Variables

Create a `.env.local` file:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key

NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_pk
STRIPE_SECRET_KEY=your_stripe_sk
STRIPE_WEBHOOK_SECRET=your_webhook_secret

RESEND_API_KEY=your_resend_key

NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public
VAPID_PRIVATE_KEY=your_vapid_private

SENTRY_DSN=your_sentry_dsn
```

### Install & Run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm start` | Start production server |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | TypeScript type checking |
| `npm test` | Run Vitest unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run analyze` | Bundle size analysis |

---

## Project Structure

```
src/
├── app/
│   ├── (auth)/          # Login, signup, password reset, OAuth callback
│   ├── (main)/          # Protected routes (dashboard, search, listings, messages, etc.)
│   ├── (marketing)/     # Public pages (pricing, about, terms, privacy)
│   ├── (onboarding)/    # 6-step onboarding wizard
│   ├── api/             # Webhooks, crons, OG images, health check
│   └── actions/         # Shared server actions
├── components/ui/       # shadcn/ui components
├── lib/
│   ├── constants/       # Equipment taxonomy, onboarding config
│   ├── supabase/        # Client and admin Supabase clients
│   └── stores/          # Zustand stores (auth, ui, search)
├── types/               # TypeScript type definitions
└── test/                # Vitest unit tests
```

### Key Architecture Pattern

All database operations use server actions with `createAdminClient()`. Client-side Supabase calls are not used — they hang in production due to RLS + SSR interaction. Server actions live in:

- `src/app/actions/` — Shared actions (tier, analytics, search, admin)
- `src/app/(main)/*/actions.ts` — Route-specific actions

---

## Authentication

- Email/password (Supabase Auth)
- Google OAuth
- Apple SSO

---

## Database

PostgreSQL via Supabase with 30+ tables including:

`profiles`, `listings`, `listing_images`, `listing_videos`, `favorites`, `conversations`, `messages`, `message_attachments`, `subscriptions`, `payments`, `notifications`, `push_subscriptions`, `offers`, `reviews`, `reports`, `saved_searches`, `listing_views`, `user_activity`, `seller_storefronts`, `listing_imports`, `seller_verifications`, `transactions`, `reply_templates`, `disputes`, `condition_reports`, `collections`, `collection_items`, `seller_availability`, `viewing_requests`, `help_articles`, `onboarding_progress`, `referrals`, `price_watches`, `price_history`, `user_business_profiles`, `user_equipment_interests`, `sos_requests`, `sos_responses`, `sos_notifications`, `boost_purchases`, `homepage_featured_slots`, `system_config`, `admin_audit_log`

Row-level security (RLS) policies on all tables. Full-text search via PostgreSQL `tsvector`.

---

## Deployment

Hosted on Vercel. Deployments are triggered via Vercel API:

```bash
curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=$VERCEL_TEAM_ID" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"metal-gear","project":"$VERCEL_PROJECT_ID","gitSource":{"type":"github","ref":"main","org":"valkolimark","repo":"metal-gear"},"target":"production"}'
```

---

## License

Private. All rights reserved.
