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
- **Theme:** Light/dark mode via `next-themes` (system default, `enableSystem`, `storageKey="metal-gear-theme"`); ThemeToggle is three-state: Auto (system) → Light → Dark; Facebook palette: dark `#18191A`/`#242526`/`#3A3B3C` bg layers, light `#F0F2F5`/`#FFFFFF` bg; `#1877F2` primary blue; SOS stays orange `#FF6B2B`; `ThemeToggle` in header + admin header + mobile menu drawer
- **Brand palettes:** Industrial (default) and Ocean (navy/teal/cyan); `data-palette` attribute on `<html>`; switchable from Admin Settings → Brand Palette; persisted in `system_config` + cookie
- **Admin CSS isolation:** `src/app/(admin)/admin.css` with scoped `[data-section="admin"]` tokens; sidebar always dark
- **Mobile nav:** `MobileHeader` (52px) + `MobileBottomNav` (5 tabs, raised SOS) + `MobileMenuDrawer` (slide from right) via `MobileNavClient` wrapper; `md:hidden`
- **Fonts:** Chakra Petch (display/headings) + Manrope (body) via `next/font/google`
- **Components:** 15 shadcn/ui components installed (button, input, card, dialog, dropdown-menu, avatar, badge, separator, skeleton, sonner, tooltip, label, select, switch, sheet)

## Testing
- **Unit tests:** Vitest + React Testing Library (`npm test`)
- **E2E tests:** Playwright (`npm run test:e2e`)
- **Config:** `vitest.config.ts`, `playwright.config.ts`
- **Test files:** `src/test/*.test.{ts,tsx}`, `e2e/*.spec.ts`

## Route Groups
- `(auth)` — login, signup, forgot-password, reset-password, callback
- `(main)` — feed, dashboard, search, listings, messages, profile, favorites, sellers, companies (protected; `/listings/[id]`, `/sellers/[id]`, and `/companies/[slug]` are publicly accessible)
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
- `/api/cron/reset-credits` — Monthly contact credit reset (schedule: `0 6 1 * *`)
- `/api/cron/listing-freshness` — Daily AI refresh suggestions for stale listings >45 days (schedule: `0 10 * * *`)
- `/api/listings/[id]/ask` — Ask Metal Gear streaming AI chat with professor mode (listing-context, 10/day free, 100/day Pro+)
- `/api/help/chat` — AI Help Assistant streaming chat (platform-context, 30 req/hr rate limit)
- `/api/feed/upload-media` — Feed post media upload (POST: multipart upload with auth/size/rate limit; GET: video status polling)

## Pricing Tiers
- **Free:** 3 listings, 5 photos, 100mi search radius
- **Pro ($179/mo):** 25 listings, 20 photos, 3 videos, 500mi radius, all AI features
- **Business ($349/mo):** 100 listings, 30 photos, 5 videos, unlimited radius, all AI features
- **Enterprise ($599/mo):** Unlimited listings, 50 photos, 10 videos, unlimited radius, all AI + priority
- **Legacy aliases:** `premium` → Pro, `boost` → Business (DB may still contain these; constants handle both)

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

## Multi-Company Architecture (Cycle 19)
- **Architecture:** `profiles` = human identity, `company_profiles` = B2B entity, `company_memberships` = junction (user/company/role)
- **Active company:** Cookie (`active_company_id`) → Zustand (`activeCompany`) → DB (`profiles.active_company_id`); cookie is source of truth for SSR
- **Company-scoped tables:** `listings.company_id`, `subscriptions.company_id`, `seller_storefronts.company_id`, `sos_requests.company_id`
- **Company guard:** Middleware redirects users without companies to `/companies/new`; exempt: auth, onboarding, API, marketing routes
- **Company server actions:** `src/app/actions/company.ts` (CRUD) + `src/app/actions/company-context.ts` (switch/get active)
- **Company types:** `src/types/company.ts` — `CompanyProfile`, `CompanyMembership`, `CompanyWithRole`, `CompanyWithMembers`
- **Company UI:** `CompanyAvatar`, `CompanyContextProvider`, `CompanySwitcher` (header pill + drawer variant)
- **Company pages:** `/companies/new`, `/settings/company`, `/settings/company/members`
- **Migration script:** `scripts/migrate-companies.ts` — idempotent, creates companies from `user_business_profiles`

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
- `company_profiles` — B2B company entities (name, slug, logo_url, banner_url, industry, company_size, website, city, state)
- `company_memberships` — User-company junction (user_id, company_id, role enum, is_active, joined_at)
- `company_invites` — Token-based team invites (company_id, invited_by, email, role, token UNIQUE, status pending/accepted/expired/revoked, expires_at 7 days)
- `contact_credits` — Monthly credit ledger per user (user_id, credits_remaining, credits_used_this_month, period_start)
- `contact_reveals` — Contact reveal log with monthly dedup (viewer_id, seller_id, credits_spent, period_month)
- `credit_purchases` — Stripe one-time credit pack purchases (user_id, credits_purchased, amount_paid, stripe_payment_intent_id)
- `feed_posts` — Social feed posts (author_id, company_id, content, hashtags[], tagged_user_ids[], reactions_count, comments_count, is_deleted, edited_at)
- `feed_post_media` — Post media attachments (post_id, media_url, media_type image/video, stream_video_id, thumbnail_url, sort_order)
- `feed_post_reactions` — Like reactions (post_id, user_id, UNIQUE constraint)
- `feed_hashtags` — Hashtag aggregation for trending (tag PK, post_count, last_used_at)
- `listing_freshness_suggestions` — AI refresh suggestions for stale listings (listing_id, seller_id, ai_title_suggestion, ai_price_suggestion, ai_price_reasoning, ai_description_tip, email_sent_at, acted_on, acted_on_at); UNIQUE active-suggestion constraint per listing

## AI Infrastructure
- **Anthropic SDK:** `@anthropic-ai/sdk` with client at `src/lib/anthropic.ts`
- **Model:** Claude Sonnet 4 for all AI features
- **AI columns on listings:** `ai_analyzed`, `ai_fraud_flagged`, `ai_fraud_reason`, `ai_assist_used`, `ai_assist_accepted`, `listing_quality_score`, `ai_price_suggested`, `ai_price_accepted`
- **AI columns on saved_searches:** `ai_query`, `ai_filters`, `is_ai_search`
- **AI columns on profiles:** `reputation_summary` (JSONB), `reputation_summary_updated_at`
- **AI columns on disputes:** `ai_summary` (JSONB)
- **AI columns on sos_requests:** `ai_categorized`, `ranked_response_ids`
- **Key components:** `ConversationalSearch`, `ProblemDiagnoser`, `AIDescriptionGenerator`, `AITitleOptimizer`, `ListingQualityScore`, `AIImageCapture`, `ReputationSummary`, `DisputeAISummary`, `VideoPlayer`, `AskMetalGear`, `HelpButton` (AI chat)
- **AI utilities:** `src/lib/ai/churn-scorer.ts` — heuristic churn signal weights and scoring
- **AI Professor Mode (Cycle 25):** Ask Metal Gear (`/api/listings/[id]/ask`) detects compatibility/suitability questions via regex triggers and enters professor mode — asks 2–4 targeted follow-up questions based on equipment category before rendering a direct verdict; recommends alternatives with `[SEARCH_SUGGESTION:{"query":"...","label":"..."}]` markers rendered as clickable search buttons in `AskMetalGear.tsx`; rate limit: 10/day free, 100/day Pro+ (daily IP-based); system prompt injects listing title, specs, condition, category at request time

## Notification Sounds & Education (Cycle 26)
- **Sound assets:** `/public/sounds/notification.wav` (standard ping), `/public/sounds/alert.wav` (high-priority two-tone); generated via `scripts/generate-sounds.mjs`
- **Sound hook:** `src/hooks/use-notification-sound.ts` — `useNotificationSound()` exposes `playStandard()`, `playHighPriority(id?)`, `acknowledgeAlert(id)`, `acknowledgeAllAlerts()`; preloads audio on mount; repeating cadence: high-priority alerts replay up to 3× at 2-min intervals if unacknowledged
- **Sound preferences:** localStorage key `mg-sound-prefs` — `{ soundEnabled: boolean, highPrioritySoundEnabled: boolean }`; toggled in Profile → Notification Sounds card
- **High-priority triggers:** `sos_request_match`, any SOS with `urgency=critical`, offers >$10K
- **Education modal:** `src/components/notification-education-modal.tsx` — `NotificationEducationModal` (shadcn Dialog) + `useNotificationEducation()` hook; shows before browser permission prompt
- **Education triggers:** post-onboarding (`?onboarded=true` URL param), first bell click when `Notification.permission === 'default'`; localStorage key `mg-notification-education-seen` prevents repeat
- **Persistent nudge:** notification dropdown shows "Enable notifications" banner when permission is `default`
- **Layout integration:** `NotificationEducationTrigger` component in `(main)/layout.tsx` handles post-onboarding trigger

## Social Feed (Cycle 27a-1)
- **Tables:** `feed_posts`, `feed_post_media`, `feed_post_reactions`, `feed_hashtags` — all with RLS
- **Server actions:** `src/app/actions/feed-posts.ts` — `getFeedPosts()` (cached 30s), `createFeedPost()`, `editFeedPost()` (15-min window), `deleteFeedPost()` (soft-delete), `toggleFeedPostReaction()` (optimistic), `reportFeedPost()`
- **Media upload:** `/api/feed/upload-media` — POST (multipart, auth + size + rate limit), GET (video status poll); uses `uploadFeedPostMedia()` / `deleteFeedPostMedia()` from `src/lib/media.ts`
- **R2 key pattern:** `feed/{postId}/{uuid}.ext` with `CacheControl: 'public, max-age=31536000, immutable'`
- **For You feed:** `get_for_you_feed` Postgres RPC — CTE matching equipment interests (tier2) and industries (GIN overlap); falls back to "all" when no interests
- **Atomic counts:** `increment_post_reactions`, `decrement_post_reactions`, `upsert_feed_hashtags`, `decrement_feed_hashtags` — Postgres functions prevent race conditions
- **Indexes:** `idx_feed_posts_active_created` (partial), `idx_feed_posts_hashtags` (GIN), `idx_feed_posts_active_author` (composite), `idx_user_business_profiles_industries_gin` (GIN)
- **Components:** `FeedComposer`, `FeedPost`, `FeedPostMedia` (1-4 image grid + lightbox), `FeedFeedToggle`, `FeedPostSkeleton`, `FeedPageClient` (interleaves posts with discovery blocks)
- **Feed page:** Server Component shell fetches initial posts + discovery data, passes to `FeedPageClient`; toggle "All Posts" / "For You" with localStorage persistence
- **Admin:** Feed Posts moderation tab in `/admin/moderation` — `getFeedPostReports()`, `adminSoftDeleteFeedPost()`
- **Post constraints:** 1000 char max, up to 4 images OR 1 video, max 10 mentions, edit within 15 min

## Social Feed: Comments, Hashtags, Mentions (Cycle 27a-2)
- **Comments table:** `feed_post_comments` with RLS, partial index `idx_feed_post_comments_active`, author index
- **Comment actions:** `getPostComments()` (cached 15s, per-post tag), `addComment()`, `deleteComment()` (soft-delete)
- **Atomic counts:** `increment_post_comments`, `decrement_post_comments` — Postgres functions
- **Mention search:** `/api/feed/mentions-search` — `pg_trgm` GIN-indexed `ILIKE` on `profiles.display_name` + `company_profiles.name`; 60 req/min rate limit
- **MentionAutocomplete:** dropdown in `FeedComposer` triggered by `@`; debounced 200ms; keyboard nav; inserts `@DisplayName` + tracks entity IDs
- **Mention resolution:** `resolveMentionedUsers()` (cached 5min) resolves `tagged_user_ids` to display names; `@mentions` in post content link to `/companies/[slug]` or `/sellers/[id]`
- **CommentSection:** lazy-loads on first expand; per-post count sync; delete/report per comment; `CommentInput` with auto-expand, Enter-to-submit
- **Hashtag pages:** `/feed/hashtag/[tag]` — SSR with metadata, `totalCount` from `feed_hashtags.post_count` (O(1)), cursor pagination
- **TrendingHashtags:** `getTrendingHashtags()` cached 1hr; auto-invalidated on post create/delete; used on hashtag pages
- **Notifications:** `post_comment`, `post_mention` types; fire-and-forget via `Promise.allSettled`; self-notification guards
- **Components:** `CommentSection`, `CommentInput`, `MentionAutocomplete`, `TrendingHashtags`, `HashtagFeedClient`

## Desktop Feed Layout (Cycle 27b-1)
- **Three-column layout:** Facebook-style on `/feed` — left sidebar (280px), center feed (max 680px), right sidebar (340px)
- **Breakpoints:** `xl` (≥1280px) all 3 columns; `lg` (≥1024px) center + right; `md` and below center only
- **FeedLeftSidebar:** sticky full-height nav with profile card, primary nav links (active route highlighting), company switcher, footer links; `'use client'` (uses `usePathname()`)
- **FeedActiveSOSRow:** horizontal scrollable row above feed composer; "Send SOS" card + matched SOS requests with urgency badges; desktop only (`hidden md:block`)
- **FeedRightSidebar:** wrapper for `RightSOSWidget` (urgency-colored SOS alerts) + `RightDiscoveryWidget` (equipment-matched listings with thumbnails)
- **`getFeedSOSAlerts()`:** server action in `src/app/actions/feed.ts`; matches `sos_requests` against `user_equipment_interests.tier2`, joins `company_profiles` for company name
- **Feed page data:** all sidebar data fetched in server component (`page.tsx`) and passed as props; unread count for messages badge
- **TrendingHashtags removed from feed:** replaced by SOS alerts + discovery widgets in right sidebar

## AI Image Analyzer (Cycle 27c)
- **Multi-image analysis:** wide shot + nameplate sent in single Claude call with positional context; falls back to single-image if only one provided
- **Structured output:** system prompt enforces JSON schema with per-field confidence scores (0.0–1.0); `FieldConfidenceScores` type in `src/types/ai-analysis.ts`
- **Auto re-prompt:** when `overallConfidence < 0.55`, second Claude call targets `lowConfidenceFields`; merges higher-confidence results; max 1 retry
- **Image quality validation:** `src/lib/ai/image-quality.ts` — `validateImageQuality(file, mode)` checks resolution, brightness, blur (Laplacian variance), file size; runs client-side via Canvas API
- **Equipment prompts:** `src/lib/ai/equipment-prompts.ts` — `EQUIPMENT_ANALYSIS_SYSTEM_PROMPT`, `MULTI_IMAGE_ANALYSIS_PROMPT`, `SINGLE_IMAGE_ANALYSIS_PROMPT`, `buildClarificationPrompt()`
- **Confidence UI:** green/yellow/red dots per field; low-confidence fields get yellow border; overall confidence banner (green/amber/red); analysis mode label ("Analyzed 1/2 images")
- **Backward compatible:** all new fields on `AIAnalysisResult` are optional; single-image requests work unchanged

## Team Invites & Seat Limits (Cycle 28)
- **`company_invites` table:** token-based invite records with 7-day expiration, RLS (company members can view), indexes on company_id/token/email
- **Seat limits:** `SEAT_LIMITS` in `src/lib/constants.ts` — Free: 1, Pro: 3, Business: 8, Enterprise: Infinity; legacy aliases: premium→3, boost→8
- **Invite flow:** owner/admin sends invite → email sent via Resend → invitee clicks `/invite/[token]` → redirected to signup if unauthenticated → `acceptInvite()` adds membership + sets active company
- **Server actions:** `src/app/actions/invites.ts` — `getCompanyMemberCount()`, `getCompanySeatLimit()`, `getPendingInvites()`, `sendCompanyInvite()`, `revokeInvite()`, `acceptInvite()`, `removeCompanyMember()`
- **Invite acceptance route:** `src/app/(main)/invite/[token]/page.tsx` — server component fetches invite data, redirects to `/signup` if unauthenticated, renders `InviteAcceptClient`
- **Middleware exemption:** `/invite/` exempt from both auth redirect and company guard in `src/lib/supabase/middleware.ts`
- **Members page:** `/settings/company/members` — seat usage progress bar, `InviteForm` component, `PendingInvites` component with revoke
- **Seat enforcement:** checked at invite creation AND invite acceptance to prevent race conditions

## Annual Billing (Cycle 28)
- **Billing toggle:** pricing page has monthly/annual `Switch` with "Save 20%" badge
- **Annual prices:** Pro $1,720/year (~$143/mo), Business $3,350/year (~$279/mo); Enterprise annual shows "Contact Sales"
- **`billing_period` column:** `subscriptions.billing_period` — `'monthly'` (default) or `'annual'`; stored from checkout metadata or Stripe price interval
- **Env vars:** `STRIPE_PRO_ANNUAL_PRICE_ID`, `STRIPE_BUSINESS_ANNUAL_PRICE_ID` (+ `NEXT_PUBLIC_` variants for pricing page)
- **Checkout:** `billingPeriod` metadata passed to Stripe, determines correct price ID
- **Webhook:** `handleCheckoutCompleted` and `handleSubscriptionUpdated` both persist `billing_period`

## Seller Intelligence Dashboard (Cycle 29)
- **Widget:** `SellerIntelligence` in `src/app/(main)/dashboard/components/seller-intelligence.tsx` — tier-aware performance overview
- **Tier gating (UI-level):** Free tier sees quality grade (A–F), raw view count, listing count, generic tip. Pro+ (`['pro', 'business', 'enterprise', 'premium', 'boost']`) unlocks benchmark bars, offer acceptance rate, top listing, specific tips, demand signals
- **`isPro` resolution:** `['pro', 'business', 'enterprise', 'premium', 'boost'].includes(tier)` — must include legacy aliases `premium` and `boost`
- **`LockedMetric` component:** `src/app/(main)/dashboard/components/locked-metric.tsx` — reusable locked-state card with blurred placeholder, upgrade CTA; used for any Pro+-gated metric card
- **`PerformanceBar` component:** `src/app/(main)/dashboard/components/performance-bar.tsx` — green (above avg) / yellow (below avg) benchmark bar
- **Server action:** `src/app/actions/seller-intelligence.ts` — `getSellerPerformance(userId, companyId)` computes all metrics regardless of tier; gating is in the UI
- **Render guard:** only rendered when `performanceData.listingCount > 0 || isPro` (pure buyer on free sees nothing)

## Listing Freshness AI (Cycle 29)
- **Cron:** `/api/cron/listing-freshness` (daily 10:00 UTC) — finds active listings >45 days old with no offers in last 30 days; max 10 AI calls per run
- **AI model:** Claude Sonnet 4 — generates title suggestion, optional price suggestion with reasoning, description tip
- **Table:** `listing_freshness_suggestions` — one active (unacted) suggestion per listing via unique partial index
- **Column:** `listings.refreshed_at` — set when seller acts on suggestion via `markFreshnessSuggestionActedOn()`
- **Integration:** listing edit page calls `markFreshnessSuggestionActedOn(listingId)` after successful save
- **"Recently Updated" badge:** shown on search cards and listing detail when `refreshed_at` is within 14 days; no tier gate
- **Email:** freshness email sent to all tiers (no gate); uses `sendEmail()` from `src/lib/email.ts`
- **No tier gate on freshness:** emails and badge are free for all sellers; stale inventory hurts the whole platform

## Media Infrastructure
- **R2 client:** `src/lib/r2.ts` — S3-compatible uploads/deletes to Cloudflare R2
- **Stream client:** `src/lib/cloudflare-stream.ts` — video upload, status, delete via Cloudflare API
- **Unified media:** `src/lib/media.ts` — `uploadListingImage()`, `uploadListingVideo()`, `uploadAvatar()`, `uploadSOSMedia()`, `uploadDisputeEvidence()`, `uploadConditionReport()`, `uploadMessageAttachmentFile()`, `uploadStorefrontBannerFile()`, `uploadVerificationDocument()`, `uploadCompanyLogo()`, `uploadCompanyBanner()`, `uploadFeedPostMedia()`, `deleteFeedPostMedia()`, `deleteMedia()`
- **Key naming:** `listings/{id}/images/{uuid}.ext`, `avatars/{userId}/{uuid}.ext`, `sos/{sosId}/{uuid}.ext`, etc.
- **Video columns on listing_videos:** `stream_video_id`, `thumbnail_url`, `embed_url`, `hls_url`, `duration_seconds`, `status` (processing/ready/error)
- **Migration script:** `scripts/migrate-media.ts` — run with `--limit=N` for test batches
- Supabase Storage URLs still resolve for legacy data; new uploads go exclusively to R2/Stream

## Critical Pattern
All database operations MUST use server actions with `createAdminClient()`. Client-side Supabase DB/storage calls hang in production. All media uploads MUST go through `src/lib/media.ts` — never use Supabase Storage for new uploads. **Never pass functions from Server Components to Client Components** — use server actions in separate `'use server'` files instead. Server actions live in:
- `src/app/actions/` — Shared actions (tier, analytics, search, reputation, disputes, dispute-mediation, admin, sos, etc.)
- `src/app/(main)/*/actions.ts` — Route-specific actions (listings, messages, profile, checkout)
- `src/app/(main)/listings/[id]/components/favorite-action.ts` — Listing favorite toggle
- `src/app/(admin)/admin/actions.ts` — Admin-specific actions (users, listings, moderation, churn, market gaps, weekly briefs)

## Onboarding (Cycle 23)
- **Flow:** 5-step role-aware wizard at `/onboarding` (route group `(onboarding)`)
- **Archetypes:** `operator` (plant/facility), `trader` (dealer/reseller), `service_provider` (logistics/rigging/etc.)
- **Step 1:** Archetype selection → **Step 2:** Multi-industry select → **Step 3:** Branching role-specific questions → **Step 4:** SOS opt-in + contact visibility → **Step 5:** Profile (name, company, city/state)
- **Single-submit:** All data held in client state; written to DB via `submitOnboarding()` server action on final step
- **DB columns (Cycle 23):** `user_business_profiles.archetype`, `sub_role`, `trading_activities`, `service_types`, `service_area`, `sourcing_methods`, `monthly_volume`, `sos_opted_in`
- **Equipment interests:** Tier 2 group selections saved to `user_equipment_interests` table
- **Middleware guard:** `src/lib/supabase/middleware.ts` redirects users without `onboarding_completed: true` to `/onboarding`
- **Post-onboarding redirect:** `window.location.href = '/dashboard'` (full page load so middleware re-evaluates; routes to `/companies/new` if no company yet)
- **Data carryover:** Onboarding saves to `profiles` (name, company, city, state, phone, contact_visibility) and `user_business_profiles` (industries, archetype, etc.); `/companies/new` page reads these to prefill the company creation form
- **Constants:** `src/lib/constants/onboarding.ts` — `OnboardingFormData`, archetype options, industry list, role-specific option arrays

## Seller Contact Info (Cycle 22, updated Cycle 24)
- **DB columns:** `profiles.contact_email` (TEXT), `profiles.contact_visibility` (TEXT, default `pro_plus`, check: `public`/`pro_plus`/`hidden`)
- **Visibility logic:** `public` = free for all logged-in users; `pro_plus` = costs 1 credit to reveal; `hidden` = no contact section shown
- **Server-side only:** Contact info computed in listing detail page server component, passed as props — never exposed via client API
- **Profile settings:** Contact email + visibility preference in `/profile` page via `updateContactSettings` server action
- **Display:** Below seller card in `ListingPurchasePanel`; credit-based reveal UI replaces simple tier gate

## Contact Credits (Cycle 24)
- **Monthly allowances:** Free: 0, Pro: 25, Business: 75, Enterprise: unlimited; reset 1st of month
- **Credit reveal:** 1 credit to reveal `pro_plus` seller contact info; same-month re-reveals free (idempotent); `public` visibility free; `hidden` shows nothing
- **Stripe credit packs:** Starter (10/$29), Standard (30/$69), Pro Pack (100/$179) — one-time payments via Stripe Checkout
- **Admin-editable config:** `system_config` keys: `credit_allowances`, `credit_extra_cost`, `credit_packs` — editable in Admin Settings → Contact Credits
- **Server actions:** `src/app/actions/credits.ts` — `getCreditBalance()`, `revealContactInfo()`, `getRevealedContacts()`, `createCreditCheckoutSession()`, `getCreditHistory()`, `getCreditConfig()`
- **Admin actions:** `adminGrantCredits()`, `getCreditSystemConfig()`, `updateCreditSystemConfig()` in `src/app/(admin)/admin/actions.ts`
- **Cron:** `/api/cron/reset-credits` — monthly reset (schedule: `0 6 1 * *`)
- **Webhook:** Stripe `checkout.session.completed` with `metadata.type === 'credit_purchase'` adds credits to ledger
- **Pages:** `/credits` (balance, history, purchase), Admin Settings → Contact Credits tab, Admin User Detail → Credits card

## Radar (formerly Collections, Cycle 22)
- "Collections" renamed to "Radar" in all UI copy; DB tables/columns/routes unchanged (`/collections` routes still work)
- "Collection" → "Radar List", "Add to Collection" → "Add to Radar", "My Collections" → "My Radar"

## Navigation (Cycle 22, updated Cycle 27)
- Home tab (mobile + desktop) navigates to `/feed` (personalized discovery feed), not `/search`
- Search tab navigates to `/search` (browse/discovery page)
- Dashboard accessible via desktop nav tab and mobile hamburger menu
- **Desktop SOS:** `SosNavPopover` renders a two-row popover dropdown below the nav button ("Send SOS" → `/sos/create`, "SOS Dashboard" → `/sos`); no overlay/modal; desktop only (`src/components/sos-nav-popover.tsx`)
- **Mobile SOS:** bottom sheet pattern unchanged (opens Sheet with same two options)

## Personalized Feed (Cycle 27)
- **Route:** `/feed` — protected, server-rendered; Home tab destination for logged-in users
- **Content blocks:** For You (listings matching `user_equipment_interests.tier2` → `listings.category`), Active SOSs, Recently Reduced (price drops ≥5% in 14 days), Saved Search Matches (last 7 days), Demand Signals (Pro+ only)
- **Server actions:** `src/app/actions/feed.ts` — `getFeedForYouListings()`, `getFeedActiveSOS()`, `getFeedPriceDrops()`, `getFeedSavedSearchMatches()`, `getFeedDemandSignals()`
- **Empty state:** Users without equipment interests see `FeedEmptyState` with link to `/profile`

## Public Company Pages (Cycle 27)
- **Route:** `/companies/[slug]` — public (no auth required), SEO-indexed with OG metadata
- **Components:** `CompanyHero` (banner, logo, stats), `CompanyListings` (active listings grid), `CompanyReputation` (star distribution + recent reviews)
- **Server actions:** `src/app/actions/companies-public.ts` — `getPublicCompanyBySlug()`, `getCompanyActiveListings()`, `getCompanyReputationStats()`, `getCompanyListingCount()`
- **Middleware:** `/companies/[slug]` exempt from auth redirect (same pattern as `/listings/[id]` and `/sellers/[id]`)

## Listing Detail Page Architecture
The listing detail page (`src/app/(main)/listings/[id]/page.tsx`) is a **Server Component** that fetches data server-side and passes to 7 client sub-components:
- `ListingGallery` — image/video gallery with desktop thumbnails + mobile swipe
- `ListingMainContent` — title, badges, description, share/QR
- `ListingPurchasePanel` — price, CTAs, seller info, buyer protection (sticky sidebar on desktop)
- `ListingSpecs` — specs table + condition report
- `AskMetalGear` — AI chat with streaming responses
- `ListingReviews` — seller reviews with star distribution
- `MobilePurchaseBar` — fixed bottom bar with Sheet drawer
- `AnonInteractionGate` — signup prompt for anonymous users

## SEO & Structured Data (Cycle 30)
- **`JsonLd` component:** `src/components/json-ld.tsx` — wraps `<script type="application/ld+json">`, accepts any data object
- **Product schema:** on listing detail pages (`page.tsx`) — name, price, condition, availability, seller org
- **LocalBusiness schema:** on company pages — address, aggregate rating when reviews exist
- **Organization schema:** on homepage — Metal Gear branding, Houston TX
- **OG image route:** `/api/og?type={default|listing|company|category}` — pass data as query params (no DB calls in edge runtime); legacy `?listing=ID` still works
- **OG params:** listing: `title`, `price`, `condition`, `location`, `image`; company: `name`, `location`, `listings`, `logo`; category: `category`, `count`
- **Canonical URLs:** set via `alternates.canonical` in `generateMetadata` on all public pages
- **Feed page:** `robots: { index: false, follow: false }` — personalized content not useful to index
- **robots.ts:** allows `/feed/hashtag/`; disallows `/feed`, `/dashboard`, `/admin`, `/settings`, `/messages`, `/notifications`, `/profile`, `/credits`, `/invite`, `/api/`, `/onboarding`, `/companies/new`
- **Sitemap:** static pages + equipment categories + companies (500) + quality listings (≥50 score, 500) + recent listings (500) + sellers (200) + hashtag pages (100)
- **`EmptyState` component:** `src/components/shared/empty-state.tsx` — icon, title, message, primary + secondary action buttons

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
