# Cycle 1 — Foundation (Complete)

## Tasks Completed

| # | Task | Commit |
|---|------|--------|
| 1 | Next.js 15 Project Scaffold | Route groups, Supabase clients, stores, hooks, types, constants |
| 2 | Deploy to Vercel | GitHub repo, Vercel project, env vars, production deploy |
| 3 | Tailwind + shadcn/ui + Theme | Dark theme, CSS variables, 12 components installed |
| 4 | Supabase Project Connection | Real credentials, client/server/middleware/admin clients |
| 5 | Auth — Email/Password | Login, signup, forgot-password, reset-password pages |
| 6 | Google SSO | OAuth flow with Supabase, provider enabled |
| 7 | Apple SSO | OAuth flow, JWT client secret, provider enabled |
| 8 | Core Layout — Header & Nav | Header, DesktopNav, MobileNav, MobileDrawer, Footer, MarketingHeader |
| 9 | Responsive Grid & Sidebar | Sidebar component, PageLayout, desktop/tablet/mobile breakpoints |
| 10 | Zustand State Management | auth-store, ui-store, search-store (persisted), AuthProvider |
| 11 | TanStack Query Config | QueryProvider, useProfile, useListings hooks |
| 12 | Sentry Error Tracking | Client/server/edge configs, error boundaries, instrumentation |
| 13 | Environment Variables | .env.local.example with all required vars |
| 14 | Font & Typography System | Chakra Petch + Manrope via next/font/google |

## Key Files Created
- `middleware.ts` — Auth route protection, OAuth code redirect
- `src/lib/supabase/` — client.ts, server.ts, middleware.ts, admin.ts
- `src/lib/constants.ts` — Tiers, categories, industries, conditions, locations
- `src/stores/` — auth-store.ts, ui-store.ts, search-store.ts
- `src/hooks/` — use-auth.ts, use-profile.ts, use-listings.ts, use-debounce.ts
- `src/components/layout/` — header, desktop-nav, mobile-nav, mobile-drawer, sidebar, page-layout, marketing-header, footer
- `src/components/auth/` — oauth-buttons.tsx
- `src/components/providers/` — auth-provider.tsx, query-provider.tsx
- `src/app/(auth)/` — login, signup, forgot-password, reset-password, callback
- `src/app/(main)/` — dashboard, search, listings, messages, profile
- `src/app/(marketing)/` — pricing, about
- `sentry.*.config.ts` — client, server, edge configs

## Known Issues / Notes
- Supabase type generation not working (IPv6 routing) — using placeholder types
- Vercel CLI deploys fail due to git author email mismatch — use API instead
- Apple JWT secret expires Aug 25, 2026 — will need regeneration
- Database schema is empty — migrations are placeholders for Cycle 2
- Google OAuth requires redirect URI configured in Google Cloud Console
