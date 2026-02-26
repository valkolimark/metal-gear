# Cycle 2 — Core Marketplace

## Context
Metal Gear is an industrial equipment marketplace for Houston, TX. Cycle 1 (Foundation) is complete — see `prompts/cycle-1-complete.md` for details. The project uses Next.js 15, Supabase, Tailwind v4, shadcn/ui, Zustand, and TanStack Query. Read `CLAUDE.md` at the project root for full project context.

## Credentials Needed
At the start of this session, I'll need:
- **Vercel token** (for deployments)
- **Supabase Management API token** (if auth/config changes needed)

## Cycle 2 Tasks

### Task 1: Database Schema & Migrations
- Create Supabase migrations for: profiles, listings, listing_images, conversations, messages, favorites
- RLS policies for all tables
- Indexes for search performance
- Trigger for updated_at timestamps
- Generate TypeScript types from schema

### Task 2: User Profile System
- Profile creation on first sign-in (trigger or on-demand)
- Profile edit page (display name, company, industry, location, bio, avatar)
- Avatar upload to Supabase Storage
- Profile view page (public)

### Task 3: Create Listing Flow
- Multi-step form: details → photos → pricing → review → publish
- Equipment category, condition, industry selection
- Photo upload (up to tier limit) with drag-and-drop reordering
- Price input with optional "Contact for Price" toggle
- Location with city/state (default Houston, TX)
- Draft save capability

### Task 4: Listing Detail Page
- Full listing view with photo gallery/carousel
- Seller info card with contact button
- Similar listings section
- Share and favorite buttons
- Edit button (owner only)

### Task 5: Search & Browse
- Full-text search across listings
- Filter sidebar: category, condition, price range, industry, location radius
- Sort: relevance, price, newest, distance
- Grid/list view toggle
- Pagination or infinite scroll
- URL-synced search params

### Task 6: Favorites & Saved Searches
- Favorite/unfavorite listings
- Favorites page showing saved listings
- Optional: saved search alerts

### Task 7: Messaging System
- Conversation threads between buyer and seller
- Real-time messages via Supabase Realtime
- Conversation list with unread counts
- Message input with send button
- Link to listing in conversation header

### Task 8: Dashboard
- Overview stats: active listings, total views, unread messages, favorites received
- Recent activity feed
- Quick actions: create listing, view messages
- Subscription tier info with upgrade CTA

## Design Guidelines
- Dark theme only (#0A0A0F bg, #FF6B2B primary, #3A8FD4 accent)
- Chakra Petch for headings, Manrope for body
- Mobile-first responsive (Mobile < 768px, Tablet 768-1023px, Desktop 1024px+)
- Use existing shadcn/ui components; install new ones as needed

## Workflow
- Do each task sequentially
- Build, commit, push, and deploy after each task
- I'll say "proceed" to move to the next task
