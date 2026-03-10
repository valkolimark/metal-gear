# Cycle 2 — Core Marketplace (Complete)

## Tasks Completed

| # | Task | Details |
|---|------|---------|
| 1 | Database Schema & Migrations | 6 tables (profiles, listings, listing_images, favorites, conversations, messages) with RLS, indexes, triggers, FTS, storage buckets |
| 2 | User Profile System | Profile edit page, avatar upload via server action, public profile view `/profile/[id]` |
| 3 | Create Listing Flow | Multi-step form (details → photos → pricing → review → publish), drag-and-drop photo reorder, draft save |
| 4 | Listing Detail Page | Photo gallery/carousel, seller card, similar listings, favorite/share/edit, view tracking |
| 5 | Search & Browse | Full-text search (tsvector), filter sidebar, sort, grid/list toggle, pagination, URL-synced params |
| 6 | Favorites & Saved Searches | Favorites page, favorite/unfavorite toggle, added to nav |
| 7 | Messaging System | Real-time via Supabase Realtime, conversation threads, unread counts, auto-read marking |
| 8 | Dashboard | Stats cards, quick actions, recent listings, subscription info with upgrade CTA |

## Key Files Created/Modified

### Server Actions (critical pattern)
- `src/app/actions.ts` — `getCurrentUser()`, `fetchProfileServer()` (used by AuthProvider)
- `src/app/(main)/profile/actions.ts` — `uploadAvatar()`, `updateProfile()`

### Pages
- `src/app/(main)/dashboard/page.tsx` — Dashboard with stats
- `src/app/(main)/search/page.tsx` — Search with filters
- `src/app/(main)/listings/page.tsx` — My Listings management
- `src/app/(main)/listings/new/page.tsx` — Create listing flow
- `src/app/(main)/listings/[id]/page.tsx` — Listing detail
- `src/app/(main)/listings/[id]/edit/page.tsx` — Edit listing
- `src/app/(main)/favorites/page.tsx` — Saved listings
- `src/app/(main)/messages/page.tsx` — Messaging
- `src/app/(main)/profile/page.tsx` — Profile edit
- `src/app/(main)/profile/[id]/page.tsx` — Public profile view

### Database
- `supabase/migrations/001_core_tables.sql` — profiles, listings, listing_images, favorites
- `supabase/migrations/003_messaging.sql` — conversations, messages
- `supabase/migrations/004_monetization.sql` — placeholder for Cycle 3
- `src/types/database.ts` — Auto-generated Supabase types

### New shadcn/ui components
textarea, select, tabs, slider, checkbox

## Post-Cycle Bug Fixes
- **Client-side Supabase hanging**: All DB/storage operations moved to server actions with admin client
- **AuthProvider**: Migrated from client-side profile fetch to `getCurrentUser()` server action
- **Avatar upload**: Server action with admin client (client-side storage uploads hang)
- **Avatar display**: Plain `<img>` tag instead of Radix AvatarImage (preloading fails cross-origin)
- **Profile save**: Server action with admin client (client-side updates hang)
- **Missing profiles**: Backfilled profiles for users created before `on_auth_user_created` trigger

## Critical Architecture Note
Client-side Supabase DB/storage calls hang in production. All database operations MUST use server actions with admin client. Client-side Supabase is only used for auth operations (`getUser`, `onAuthStateChange`, `signOut`).
