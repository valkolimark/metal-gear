# Cycle 4 Complete — Growth, Analytics & User Experience

## Completed Tasks

### Task 1: Notification Preferences & Email Wiring
- Added notification preferences UI to profile settings (messages, inquiries, subscription, marketing toggles)
- Wired welcome email on signup (with dedup via `welcome_sent` flag)
- Wired new message email notification (checks recipient preferences)
- Wired listing inquiry email (when new conversation starts)
- Added unsubscribe links to all emails + `/api/unsubscribe` endpoint
- Installed shadcn Switch component

### Task 2: Listing Analytics & Seller Insights
- Created `listing_views` table for timestamped view events
- Built seller analytics: views over 30 days, top performing listings, conversion rates
- Added "How Your Listings Are Performing" section to dashboard with bar chart
- Replaced client-side views increment with `recordListingView` server action

### Task 3: Search Enhancements
- Created `saved_searches` table
- Saved searches in sidebar with one-click apply
- Recent searches via localStorage (last 10)
- Search suggestions/autocomplete dropdown with 18 equipment terms
- Save search dialog for authenticated users

### Task 4: Listing Enhancements
- Listing status management: mark as sold, relist, publish drafts
- Duplicate listing (creates draft copy with "(Copy)" suffix)
- Social sharing: Facebook, LinkedIn, X/Twitter via dropdown
- QR code generation for listings (via api.qrserver.com)
- Open Graph metadata via `generateMetadata()` in listing layout

### Task 5: User Reputation & Trust
- Created `reviews` table (1-5 star ratings, unique per buyer+conversation)
- Created `reports` table (listing/user reports with admin review)
- Seller reviews display on public profile with star ratings
- Response time tracking ("Usually responds within X hours")
- Report button on user profiles (reason dropdown + details)
- Profile completion percentage indicator (weighted fields)

### Task 6: Performance & Optimization
- Next.js Image component for all listing photos (lazy loading, priority, sizes)
- Remote patterns for Supabase storage and QR API
- Composite database indexes (listings status+created_at, messages conv+read_at)

### Task 7: Mobile Experience
- PWA manifest.json with app icons and standalone display
- Mobile-optimized photo upload with camera capture (`capture="environment"`)
- Pull-to-refresh on dashboard and search pages
- Touch swipe gestures for listing image gallery
- Enhanced mobile bottom nav with safe area insets and unread badge

### Task 8: Testing & Documentation
- Vitest + React Testing Library: 42 unit tests across 5 suites
- Tests: tier limits, reputation actions, listing actions, mobile nav, constants
- Playwright E2E: auth flow, public pages
- API documentation (`docs/api.md`)
- Updated CLAUDE.md with Cycle 4 changes

## Database Tables Added
- `listing_views` — view events with timestamps
- `saved_searches` — user-saved search filter sets
- `reviews` — seller ratings/reviews
- `reports` — content/user moderation reports

## Key Patterns
- All DB operations use server actions with `createAdminClient()` (client-side hangs in production)
- Email notifications respect user preferences via `email_notifications` JSONB column
- Pull-to-refresh via custom `usePullToRefresh` hook
- QR codes via external API (no npm dependency)
- Profile completion calculated with weighted field scores
