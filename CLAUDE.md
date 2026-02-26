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
- **Components:** 12 shadcn/ui components installed (button, input, card, dialog, dropdown-menu, avatar, badge, separator, skeleton, sonner, tooltip, label)

## Route Groups
- `(auth)` — login, signup, forgot-password, reset-password, callback
- `(main)` — dashboard, search, listings, messages, profile (protected)
- `(marketing)` — pricing, about (public)

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

## Conventions
- User preference: "I want you to do all the work. Just ask me for credentials."
- Build, commit, push, and deploy after each task
- Commit messages include `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
- Supabase env vars managed via Management API (token needed per session)
- Vercel env vars managed via REST API
