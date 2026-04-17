# Metal Gear

Industrial equipment marketplace built for Houston, TX and beyond. Buy, sell, and source heavy machinery across oil & gas, petrochemical, mining, manufacturing, and CNC machining.

**Live:** [metal-gear-five.vercel.app](https://metal-gear-five.vercel.app)

---

## Features

### Marketplace
- **Snap & List** (Cycle 58) — upload 1–10 photos and AI drafts the full listing (title, category, description, specs, nameplate fields, condition, price range from real comparables, photo coach). Google Cloud Vision OCR + Claude Sonnet analysis in ~8–12 seconds. Inline-editable review screen with amber dots on low-confidence fields. Free tier: 3/month; Pro+: unlimited. AI-Assisted badge on published listings. Old multi-step flow preserved at `/listings/new?mode=advanced`.
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

### Contact Credits
- Credit-based contact reveal system: spend credits to see seller phone/email
- Tiered monthly allowances: Free (0), Pro (25), Business (75), Enterprise (unlimited)
- Same-month re-reveals are free (idempotent)
- Stripe one-time credit pack purchases: Starter (10/$29), Standard (30/$69), Pro Pack (100/$179)
- `/credits` page with balance, purchase packs, and transaction history
- Admin-configurable allowances, costs, and pack pricing via dashboard

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
- **AI Professor Mode (Ask Metal Gear)** — compatibility questions trigger expert follow-up flow: 2–4 targeted process questions, then direct yes/no verdict with reasoning; honest alternative equipment recommendations with clickable search suggestions
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
- Radar (formerly Collections) — save and organize equipment into radar lists with public/private visibility and shareable URLs
- Referral program with unique codes, 30-day tracking, and $10 reward

### Platform
- Role-aware onboarding wizard with 3 archetypes (Operator, Trader, Service Provider), branching role-specific questions, multi-industry selection, equipment interest seeding, SOS opt-in, contact visibility; onboarding data carries over into profile and company creation
- Web Push notifications with category filters and per-category preferences
- **Notification sounds** — standard metallic ping for messages, two-tone industrial alert for high-priority SOS/offers; sounds repeat up to 3× if unacknowledged; configurable in Profile → Notification Sounds
- **Notification education modal** — branded opt-in flow explaining SOS alert value before browser permission prompt; persistent nudge in bell dropdown
- **Three-state theme toggle** — Auto (OS) / Light / Dark with system preference auto-detection; manual override persists across sessions
- Internationalization (EN/ES) with cookie-based locale detection
- Help center with 16 articles across 7 categories, keyword search, and FAQ
- Social sharing with dynamic OG images via `@vercel/og`
- **Seller contact info** — phone and contact email with tier-gated visibility (Pro+ only, Everyone, or Hidden); server-side rendered to prevent harvesting
- **Mobile navigation** — Facebook-style fixed header, 5-tab bottom nav with raised SOS button, slide-in drawer with profile card, quick actions, and subscription upgrade CTA; Home tab navigates to browse/discovery feed
- **Brand palette switcher** — Admin-controlled Ocean / Industrial theme; persisted in system_config; applies instantly platform-wide with no deploy
- **Multi-company profiles** — `profiles` = human identity, `company_profiles` = B2B entity, `company_memberships` = junction; company switcher in header; all listings/subscriptions/storefronts scoped to active company
- Mobile PWA with pull-to-refresh, swipe gestures, and bottom nav

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router, RSC, TypeScript) |
| Database & Auth | Supabase (PostgreSQL, Auth, Realtime) |
| Media Storage | Cloudflare R2 (images/docs) + Cloudflare Stream (videos) via `media.metalgear.com` |
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

- **Theme:** Light/dark mode toggle via `next-themes` (dark default, system preference detection); Facebook palette — dark: `#18191A`/`#242526`/`#3A3B3C` bg layers, light: `#F0F2F5`/`#FFFFFF` bg; `#1877F2` primary blue; SOS stays orange `#FF6B2B`
- **Brand palettes:** Industrial (default — Facebook blue) and Ocean (navy/teal/cyan); switchable from Admin Settings; `data-palette` attribute on `<html>`
- **Admin CSS:** Scoped via `[data-section="admin"]` in `admin.css`; sidebar always dark navy
- **Fonts:** Chakra Petch (display/headings) + Manrope (body)
- **Components:** 15 shadcn/ui components (button, input, card, dialog, dropdown-menu, avatar, badge, separator, skeleton, sonner, tooltip, label, select, switch, sheet)

---

## Pricing Tiers

| | Free | Pro ($179/mo) | Business ($349/mo) | Enterprise ($599/mo) |
|---|---|---|---|---|
| Listings | 3 | 25 | 100 | Unlimited |
| Photos per listing | 5 | 20 | 30 | 50 |
| Videos per listing | — | 3 | 5 | 10 |
| Search radius (mi) | 100 | 500 | Unlimited | Unlimited |
| AI-powered features | Basic | All | All | All + priority |
| Demand forecasts | — | Yes | Yes | Yes |
| Negotiation coaching | — | Yes | Yes | Yes |
| Smart search alerts | — | Yes | Yes | Yes |
| Market insights | — | Yes | Yes | Yes |

---

## API Routes

| Route | Method | Description |
|-------|--------|-------------|
| `/api/webhooks/stripe` | POST | Stripe subscription webhook |
| `/api/webhooks/cloudflare-stream` | POST | Cloudflare Stream video processing webhook |
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
| `/api/listings/[id]/ask` | POST | Ask Metal Gear streaming AI chat (listing-context) |
| `/api/help/chat` | POST | AI Help Assistant streaming chat (platform-context) |

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Supabase project (PostgreSQL, Auth, Realtime)
- Cloudflare account (R2 bucket + Stream for media)
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

# Google Cloud Vision — Snap & List (Cycle 58)
# Base64-encode the full service-account JSON: `base64 < key.json | tr -d '\n'`
GOOGLE_CLOUD_PROJECT_ID=your_gcp_project_id
GOOGLE_APPLICATION_CREDENTIALS_JSON=base64_encoded_service_account_json

NEXT_PUBLIC_VAPID_PUBLIC_KEY=your_vapid_public
VAPID_PRIVATE_KEY=your_vapid_private

CLOUDFLARE_ACCOUNT_ID=your_cloudflare_account_id
R2_BUCKET_NAME=your_r2_bucket
R2_PUBLIC_URL=https://media.yourdomain.com
R2_ACCESS_KEY_ID=your_r2_access_key
R2_SECRET_ACCESS_KEY=your_r2_secret_key
CLOUDFLARE_STREAM_TOKEN=your_stream_token
CLOUDFLARE_CUSTOMER_SUBDOMAIN=your_stream_subdomain
CLOUDFLARE_STREAM_WEBHOOK_SECRET=your_stream_webhook_secret

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
│   ├── (onboarding)/    # 5-step role-aware onboarding wizard (3 archetypes)
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
│   ├── r2.ts            # Cloudflare R2 storage client
│   ├── cloudflare-stream.ts  # Cloudflare Stream video client
│   ├── media.ts         # Unified media upload/delete interface
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
