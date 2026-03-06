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
- AI-powered Quick SOS: describe your problem in plain text, Claude extracts taxonomy, specs, and urgency
- Intelligent responder routing via `find_sos_responders()` with cross-list expansion
- AI Response Ranker: scores and ranks vendor responses by spec match, trust, speed, and price
- Predictive demand alerts: seller dashboard widget forecasting equipment demand by category and season

### Transactions & Trust
- Stripe escrow payments with authorize-then-capture and 5% platform fee
- Dispute resolution with evidence uploads, admin resolution panel, and AI mediation summaries
- Equipment condition reports (grade A-F, mechanical/cosmetic/electrical scores)
- Verified seller program with business document review and trust scores (0-100)
- Star ratings and reviews with seller response time tracking
- AI reputation summarizer: plain-English seller summaries replacing raw star ratings

### Communication
- Real-time messaging via Supabase Realtime with unread count tracking
- File attachments (images, PDFs, Office docs) and quick reply templates
- Offer & negotiation system with full lifecycle and 72-hour auto-expiration
- AI negotiation coaching for buyers and sellers with private strategy advice
- Seller availability scheduling with timezone-aware viewing requests

### AI-Powered Tools
- **Conversational Search** — natural language to structured filter mapping via Claude with multi-turn context
- **Problem Diagnoser** — equipment problem descriptions routed to AI search with diagnostic reasoning
- **Description Generator** — streaming AI copy with regenerate and edit-before-using
- **Title Optimizer** — 3 SEO-optimized title suggestions with issue warnings
- **Quality Scorer** — 0-100 listing quality grade (A-F) with per-category breakdown and improvement tips
- **Image Recognition** — equipment identification, nameplate OCR, and fraud detection via Claude Vision
- **Pricing Intelligence** — market-based price suggestions from comparable sales
- **Smart Search Alerts** — AI relevance scoring (0-100) for saved search notifications; only notifies on high-quality matches with explanation
- **Seller Reputation Summarizer** — AI-generated reputation summaries with evidence-backed strengths, watchouts, and buyer recommendation %
- **Dispute Mediation** — AI case summaries with buyer/seller positions, key disagreements, evidence assessment, and possible outcomes

### Operator Intelligence (Admin)
- **Weekly AI Business Brief** — Monday email to founders with executive summary, key metrics, concerns, and 3 recommended actions
- **Churn Prediction** — nightly heuristic scoring of paid subscribers across 9 signals; AI-generated personalized outreach for at-risk users
- **Market Gap Alerts** — weekly analysis of unmet SOS demand by subcategory; AI recruitment target identification with cold outreach drafts

### Discovery & Analytics
- Saved search alerts with AI relevance scoring and daily digest emails
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

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/webhooks/stripe` | POST | Stripe subscription webhook |
| `/api/unsubscribe` | GET | Email unsubscribe endpoint |
| `/api/search/ai` | POST | Conversational AI search (NL to filter mapping) |
| `/api/listings/ai-copy` | POST | AI description generator (streaming), title optimizer, quality scorer |
| `/api/listings/analyze-image` | POST | Claude Vision equipment recognition + fraud detection |
| `/api/sos/ai` | POST | SOS auto-categorization, response ranking, demand prediction |
| `/api/users/[id]/reputation-summary` | GET | AI seller reputation summary |
| `/api/admin/users/[id]/generate-outreach` | POST | AI churn retention email generator |
| `/api/admin/market-gaps/generate-outreach` | POST | AI seller recruitment email generator |
| `/api/cron/smart-search-alerts` | GET | Daily AI-scored saved search alerts |
| `/api/cron/expire-boosts` | GET | Daily boost expiration cleanup |
| `/api/cron/engagement-digest` | GET | Weekly engagement digest emails |
| `/api/cron/listing-expiration` | GET | Daily listing expiration + auto-renew |
| `/api/cron/demand-insights` | GET | Nightly AI demand prediction for sellers |
| `/api/cron/weekly-brief` | GET | Monday AI business brief for founders |
| `/api/cron/churn-prediction` | GET | Nightly churn risk scoring for subscribers |
| `/api/cron/market-gaps` | GET | Weekly SOS demand gap analysis |
| `/api/cron/cleanup` | GET | Periodic notification and data cleanup |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Supabase project (PostgreSQL, Auth, Storage)
- Stripe account (for payments)
- Resend account (for emails)
- Anthropic API key (for AI features)

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
ANTHROPIC_API_KEY=your_anthropic_key

NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public
VAPID_PRIVATE_KEY=your_vapid_private

SENTRY_DSN=your_sentry_dsn
CRON_SECRET=your_cron_secret
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
│   ├── (admin)/         # Super admin dashboard with RBAC (superadmin, moderator, analyst)
│   ├── (marketing)/     # Public pages (pricing, about, terms, privacy)
│   ├── (onboarding)/    # 6-step onboarding wizard
│   ├── api/             # Webhooks, crons, AI endpoints, OG images
│   └── actions/         # Shared server actions (30+ files)
├── components/
│   ├── ui/              # shadcn/ui components
│   ├── reputation-summary.tsx  # AI reputation display
│   └── dispute-ai-summary.tsx  # AI dispute mediation panel
├── lib/
│   ├── ai/              # Churn scorer, AI utilities
│   ├── constants/       # Equipment taxonomy, onboarding config
│   ├── supabase/        # Client and admin Supabase clients
│   ├── anthropic.ts     # Anthropic SDK client
│   ├── email.ts         # Resend email templates
│   ├── stripe.ts        # Stripe client
│   └── stores/          # Zustand stores (auth, ui, search)
├── types/               # TypeScript type definitions
└── test/                # Vitest unit tests
```

### Key Architecture Pattern

All database operations use server actions with `createAdminClient()`. Client-side Supabase calls are not used — they hang in production due to RLS + SSR interaction. Server actions live in:

- `src/app/actions/` — Shared actions (tier, analytics, search, admin, reputation, disputes, etc.)
- `src/app/(main)/*/actions.ts` — Route-specific actions
- `src/app/(admin)/admin/actions.ts` — Admin-specific actions

---

## Admin Dashboard

Role-based access control with three roles: **superadmin**, **moderator**, **analyst**.

| Section | Description |
|---------|-------------|
| Control Tower | Real-time stats, alert queue, activity feed |
| Users | User management with search, tier/role filters, churn risk badges, suspension/ban |
| Listings | Listing moderation with status filters and bulk actions |
| Moderation | Reports queue, AI fraud queue, review disputes, transaction disputes with AI mediation |
| Analytics | User growth, listing health, SOS performance, search analytics, AI metrics, market gaps |
| Financials | Revenue tracking and payout management |
| SOS | SOS broadcast dashboard with demand gap analysis |
| Priority | Featured slot management |
| Settings | Platform config, admin roles, integrations, database stats, audit log, weekly briefs archive |

---

## Authentication

- Email/password (Supabase Auth)
- Google OAuth
- Apple SSO

---

## Database

PostgreSQL via Supabase with 40+ tables including:

`profiles`, `listings`, `listing_images`, `listing_videos`, `favorites`, `conversations`, `messages`, `message_attachments`, `subscriptions`, `payments`, `notifications`, `push_subscriptions`, `offers`, `reviews`, `reports`, `saved_searches`, `saved_search_alert_log`, `listing_views`, `user_activity`, `seller_storefronts`, `listing_imports`, `seller_verifications`, `transactions`, `reply_templates`, `disputes`, `condition_reports`, `collections`, `collection_items`, `seller_availability`, `viewing_requests`, `help_articles`, `onboarding_progress`, `referrals`, `price_watches`, `price_history`, `user_business_profiles`, `user_equipment_interests`, `sos_requests`, `sos_responses`, `sos_notifications`, `seller_demand_insights`, `offer_coaching_log`, `boost_purchases`, `homepage_featured_slots`, `system_config`, `admin_audit_log`, `weekly_briefs`, `churn_risk`, `market_gap_reports`

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
