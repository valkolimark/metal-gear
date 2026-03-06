# Metal Gear — Industrial Equipment Marketplace

## Project Overview
Houston, TX industrial equipment marketplace. Buy/sell heavy machinery across oil & gas, petrochemical, mining, manufacturing, and CNC machining.

## Tech Stack
- **Framework:** Next.js 15 (App Router, RSC, TypeScript)
- **Database/Auth:** Supabase (PostgreSQL, Auth, Realtime)
- **Media Storage:** Cloudflare R2 (images/docs via `media.metalgear.com`) + Cloudflare Stream (videos)
- **Styling:** Tailwind CSS v4 (CSS-based config, no tailwind.config.ts) + shadcn/ui (new-york style)
- **State:** Zustand (3 stores: auth, ui, search) + TanStack Query
- **Error Tracking:** Sentry
- **Hosting:** Vercel

## Design System
- **Theme:** Dark-only (`#0A0A0F` background, `#FF6B2B` primary orange, `#3A8FD4` steel blue)
- **Fonts:** Chakra Petch (display/headings) + Manrope (body) via `next/font/google`
- **Components:** 14 shadcn/ui components installed (button, input, card, dialog, dropdown-menu, avatar, badge, separator, skeleton, sonner, tooltip, label, select, switch)

## Testing
- **Unit tests:** Vitest + React Testing Library (`npm test`)
- **E2E tests:** Playwright (`npm run test:e2e`)
- **Config:** `vitest.config.ts`, `playwright.config.ts`
- **Test files:** `src/test/*.test.{ts,tsx}`, `e2e/*.spec.ts`

## Route Groups
- `(auth)` — login, signup, forgot-password, reset-password, callback
- `(main)` — dashboard, search, listings, messages, profile, favorites, sellers (protected)
- `(admin)` — super admin dashboard with RBAC (superadmin, moderator, analyst)
- `(marketing)` — pricing, about, terms, privacy (public)

## API Routes
- `/api/webhooks/stripe` — Stripe subscription webhook
- `/api/webhooks/cloudflare-stream` — Stream video processing status webhook
- `/api/unsubscribe` — Email unsubscribe endpoint
- `/api/search/ai` — Conversational AI search (Claude-powered NL→filter mapping)
- `/api/listings/ai-copy` — AI description generator (streaming), title optimizer, quality scorer
- `/api/listings/analyze-image` — Claude Vision equipment recognition + fraud detection
- `/api/sos/ai` — SOS auto-categorization, response ranking, demand prediction
- `/api/users/[id]/reputation-summary` — AI seller reputation summary (cached)
- `/api/admin/users/[id]/generate-outreach` — AI churn retention email generator
- `/api/admin/market-gaps/generate-outreach` — AI seller recruitment email generator
- `/api/cron/smart-search-alerts` — Daily AI-scored saved search alerts
- `/api/cron/expire-boosts` — Daily boost expiration cleanup
- `/api/cron/engagement-digest` — Weekly engagement digest emails
- `/api/cron/listing-expiration` — Daily listing expiration + auto-renew
- `/api/cron/demand-insights` — Nightly AI demand prediction for sellers
- `/api/cron/weekly-brief` — Monday AI business brief for founders (schedule: `0 14 * * 1`)
- `/api/cron/churn-prediction` — Nightly churn risk scoring for subscribers
- `/api/cron/market-gaps` — Weekly SOS demand gap analysis
- `/api/cron/cleanup` — Periodic notification and data cleanup

## Pricing Tiers
- **Free:** 3 listings
- **Pro ($179/mo):** Expanded limits, all AI features
- **Business ($349/mo):** Expanded limits, all AI features
- **Enterprise ($599/mo):** Expanded limits, all AI features + priority

## Key Infrastructure
- **Supabase project:** fkcyfpdkcrhjieauhchn
- **Production URL:** https://metal-gear-five.vercel.app
- **GitHub:** valkolimark/metal-gear
- **Vercel team:** team_9n9GosoaraicsoDdbAFgzr5j
- **Vercel project:** prj_HQBv7jMhui6LGW5vzVC5pmCMndlx
- **Sentry org:** metal-gear, project: javascript-nextjs
- **Cloudflare account:** c61e1a513e96a3b9df409959c2853c9c
- **R2 bucket:** metal-gear-media → `media.metalgear.com`
- **Stream subdomain:** customer-305dqqczrx52n91m.cloudflarestream.com

## Auth Providers
- Email/password (Supabase Auth)
- Google OAuth (enabled)
- Apple SSO (enabled, JWT secret expires Aug 25, 2026)

## Deployment
Deploys are triggered via Vercel API (not CLI, due to git author mismatch):
```bash
curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=team_9n9GosoaraicsoDdbAFgzr5j" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"metal-gear","project":"prj_HQBv7jMhui6LGW5vzVC5pmCMndlx","gitSource":{"type":"github","ref":"main","org":"valkolimark","repo":"metal-gear"},"target":"production"}'
```

## Prompts
Cycle prompts live in `/prompts/`. Start a new session by pasting the relevant prompt file.

## Database Tables (notable)
- `listing_views` — Timestamped view events per listing (viewer_id, listing_id, viewed_at)
- `saved_searches` — User-saved search filter sets (user_id, name, filters JSONB, ai_query, ai_filters, is_ai_search)
- `saved_search_alert_log` — AI relevance scoring log for smart alerts (saved_search_id, listing_id, ai_relevance_score, alert_sent)
- `reviews` — Seller ratings/reviews (reviewer_id, seller_id, conversation_id, rating 1-5)
- `reports` — User/listing reports for moderation (reporter_id, target_type, target_id, reason, status)
- `disputes` — Transaction disputes with AI mediation (buyer statement, seller response, evidence, ai_summary JSONB)
- `boost_purchases` — Self-serve boost purchases with Stripe checkout
- `homepage_featured_slots` — Admin-curated homepage slots
- `system_config` — Key-value platform configuration with audit trail
- `admin_audit_log` — All admin actions with admin_id, target, metadata, timestamp
- `seller_demand_insights` — AI-generated demand predictions per seller (JSONB insights, valid_until)
- `offer_coaching_log` — AI negotiation coaching sessions
- `weekly_briefs` — Monday AI business briefs (period, raw_data JSONB, ai_brief text, sent_to emails)
- `churn_risk` — Nightly churn scoring for paid subscribers (user_id UNIQUE, risk_score, risk_level, signals JSONB)
- `market_gap_reports` — Weekly SOS demand gap analysis (gaps JSONB, ai_analysis JSONB)

## AI Infrastructure
- **Anthropic SDK:** `@anthropic-ai/sdk` with client at `src/lib/anthropic.ts`
- **Model:** Claude Sonnet 4 for all AI features
- **AI columns on listings:** `ai_analyzed`, `ai_fraud_flagged`, `ai_fraud_reason`, `ai_assist_used`, `ai_assist_accepted`, `listing_quality_score`, `ai_price_suggested`, `ai_price_accepted`
- **AI columns on saved_searches:** `ai_query`, `ai_filters`, `is_ai_search`
- **AI columns on profiles:** `reputation_summary` (JSONB), `reputation_summary_updated_at`
- **AI columns on disputes:** `ai_summary` (JSONB)
- **AI columns on sos_requests:** `ai_categorized`, `ranked_response_ids`
- **Key components:** `ConversationalSearch`, `ProblemDiagnoser`, `AIDescriptionGenerator`, `AITitleOptimizer`, `ListingQualityScore`, `AIImageCapture`, `ReputationSummary`, `DisputeAISummary`, `VideoPlayer`
- **AI utilities:** `src/lib/ai/churn-scorer.ts` — heuristic churn signal weights and scoring

## Media Infrastructure
- **R2 client:** `src/lib/r2.ts` — S3-compatible uploads/deletes to Cloudflare R2
- **Stream client:** `src/lib/cloudflare-stream.ts` — video upload, status, delete via Cloudflare API
- **Unified media:** `src/lib/media.ts` — `uploadListingImage()`, `uploadListingVideo()`, `uploadAvatar()`, `uploadSOSMedia()`, `uploadDisputeEvidence()`, `uploadConditionReport()`, `uploadMessageAttachmentFile()`, `uploadStorefrontBannerFile()`, `uploadVerificationDocument()`, `deleteMedia()`
- **Key naming:** `listings/{id}/images/{uuid}.ext`, `avatars/{userId}/{uuid}.ext`, `sos/{sosId}/{uuid}.ext`, etc.
- **Video columns on listing_videos:** `stream_video_id`, `thumbnail_url`, `embed_url`, `hls_url`, `duration_seconds`, `status` (processing/ready/error)
- **Migration script:** `scripts/migrate-media.ts` — run with `--limit=N` for test batches
- Supabase Storage URLs still resolve for legacy data; new uploads go exclusively to R2/Stream

## Critical Pattern
All database operations MUST use server actions with `createAdminClient()`. Client-side Supabase DB/storage calls hang in production. All media uploads MUST go through `src/lib/media.ts` — never use Supabase Storage for new uploads. Server actions live in:
- `src/app/actions/` — Shared actions (tier, analytics, search, reputation, disputes, dispute-mediation, admin, sos, etc.)
- `src/app/(main)/*/actions.ts` — Route-specific actions (listings, messages, profile, checkout)
- `src/app/(admin)/admin/actions.ts` — Admin-specific actions (users, listings, moderation, churn, market gaps, weekly briefs)

## PWA
- Manifest at `/public/manifest.json`
- Icons: `/public/icons/icon-192.svg`, `/public/icons/icon-512.svg`
- Mobile bottom nav with safe area insets

## Conventions
- User preference: "I want you to do all the work. Just ask me for credentials."
- Build, commit, push, and deploy after each task
- Commit messages include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
- Supabase env vars managed via Management API (token needed per session)
- Vercel env vars managed via REST API
- API docs at `/docs/api.md`
- Update `CHANGELOG.md` at the end of each cycle before deploying — add a versioned entry with Added/Changed/Fixed sections following Keep a Changelog format
