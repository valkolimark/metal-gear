# Metal Gear — Industrial Equipment Marketplace

## Project Overview
Houston, TX industrial equipment marketplace. Buy/sell heavy machinery across oil & gas, petrochemical, mining, manufacturing, and CNC machining.

## Tech Stack
- **Framework:** Next.js 15 (App Router, RSC, TypeScript)
- **Database/Auth:** Supabase (PostgreSQL, Auth, Storage)
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
- `(main)` — dashboard, search, listings, messages, profile, favorites, admin (protected)
- `(marketing)` — pricing, about, terms, privacy (public)
- `/api/webhooks/stripe` — Stripe subscription webhook
- `/api/unsubscribe` — Email unsubscribe endpoint

## Subscription Tiers
- **Free:** 3 listings, 5 photos, 10 conversations, 100mi search
- **Premium ($29.99/mo):** 15 listings, 15 photos, 3 videos, unlimited conversations, 500mi search
- **Boost ($79.99/mo):** 50 listings, 25 photos, 5 videos, unlimited everything

## Key Infrastructure
- **Supabase project:** fkcyfpdkcrhjieauhchn
- **Production URL:** https://metal-gear-five.vercel.app
- **GitHub:** valkolimark/metal-gear
- **Vercel team:** team_9n9GosoaraicsoDdbAFgzr5j
- **Vercel project:** prj_HQBv7jMhui6LGW5vzVC5pmCMndlx
- **Sentry org:** metal-gear, project: javascript-nextjs

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

## Database Tables (Cycle 4 additions)
- `listing_views` — Timestamped view events per listing (viewer_id, listing_id, viewed_at)
- `saved_searches` — User-saved search filter sets (user_id, name, filters JSONB)
- `reviews` — Seller ratings/reviews (reviewer_id, seller_id, conversation_id, rating 1-5)
- `reports` — User/listing reports for moderation (reporter_id, target_type, target_id, reason, status)

## Critical Pattern
All database operations MUST use server actions with `createAdminClient()`. Client-side Supabase DB/storage calls hang in production. Server actions live in:
- `src/app/actions/` — Shared actions (tier, analytics, search, reputation, admin)
- `src/app/(main)/*/actions.ts` — Route-specific actions (listings, messages, profile, checkout)

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
