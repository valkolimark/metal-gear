# Cycle 4 — Growth, Analytics & User Experience

## Context
Metal Gear is an industrial equipment marketplace for Houston, TX. Cycles 1–3 are complete — see `prompts/cycle-3-complete.md` for the latest state. The project uses Next.js 15, Supabase, Tailwind v4, shadcn/ui, Zustand, Stripe, Resend, and Sentry. Read `CLAUDE.md` at the project root for full project context.

**Critical pattern:** All database operations MUST use server actions with admin client. Client-side Supabase DB/storage calls hang in production. See `prompts/cycle-2-complete.md` for details.

## Credentials Needed
At the start of this session, I'll need:
- **Vercel token** (for deployments)
- **Supabase Management API token** (if schema changes needed)

## Cycle 4 Tasks

### Task 1: Notification Preferences & Email Wiring
- Add notification preferences UI to profile settings page (toggles for: new messages, listing inquiries, subscription updates, marketing)
- Wire welcome email on signup (auth trigger or callback)
- Wire new message email (when recipient is offline/hasn't read within 5 min)
- Wire listing inquiry email (when a new conversation is started about a listing)
- Add unsubscribe link to all emails
- Test email delivery end-to-end (requires RESEND_API_KEY in Vercel env)

### Task 2: Listing Analytics & Seller Insights
- Per-listing analytics: views over time, favorites over time, inquiries count
- Seller dashboard enhancements: views chart, top-performing listings, conversion rate (views → inquiries)
- "How your listings are performing" section on dashboard
- Store view events with timestamps (new table or extend existing views_count)

### Task 3: Search Enhancements
- Saved searches: save current filter set, get notified of new matches
- Recent searches history (local storage)
- Search suggestions / autocomplete for equipment categories and common terms
- Map view toggle: show listings on a map using coordinates (Mapbox or Google Maps)
- Distance-based sorting using user's location or entered zip code

### Task 4: Listing Enhancements
- Listing edit page improvements: match create flow UX, photo reorder on edit
- Listing status management: mark as sold, relist expired listings
- Duplicate listing: clone an existing listing as a starting point
- Share to social media (Facebook, LinkedIn, X/Twitter) with Open Graph preview
- QR code generation for each listing (for print/trade show use)

### Task 5: User Reputation & Trust
- Seller ratings/reviews system (buyers can rate after conversation)
- Verified dealer badge program (manual admin approval)
- Response time tracking: show "Usually responds within X hours" on seller profiles
- Report listing / report user functionality with admin review queue
- Profile completion percentage indicator

### Task 6: Performance & Optimization
- Image optimization pipeline: resize uploads to max 1920px, generate WebP thumbnails
- Implement Next.js Image component for all listing photos (lazy loading, blur placeholder)
- API response caching with revalidation for listing detail pages
- Database query optimization: review and add missing indexes
- Bundle size analysis and code splitting review
- Lighthouse audit: target 90+ on all scores

### Task 7: Mobile Experience
- PWA configuration (manifest.json, service worker, install prompt)
- Mobile-optimized photo upload (camera capture, multi-select from gallery)
- Pull-to-refresh on listing feeds
- Bottom navigation bar for mobile (dashboard, search, create, messages, profile)
- Touch-friendly image gallery with swipe gestures

### Task 8: Testing & Documentation
- Set up Vitest + React Testing Library
- Unit tests for server actions (tier checks, admin actions, checkout)
- Integration tests for critical flows (create listing, send message, checkout)
- E2E tests with Playwright for auth flow and listing creation
- API documentation for webhook endpoints
- Update CLAUDE.md with Cycle 4 changes

## Design Guidelines
- Dark theme only (#0A0A0F bg, #FF6B2B primary, #3A8FD4 accent)
- Chakra Petch for headings, Manrope for body
- Mobile-first responsive (Mobile < 768px, Tablet 768-1023px, Desktop 1024px+)
- Use existing shadcn/ui components; install new ones as needed
- All DB operations via server actions (never client-side Supabase for DB/storage)

## Workflow
- Do each task sequentially
- Build, commit, push, and deploy after each task
- Troubleshoot errors autonomously — I'll provide credentials upfront
