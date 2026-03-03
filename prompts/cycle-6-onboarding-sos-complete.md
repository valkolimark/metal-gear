# Cycle 6 Addendum Complete — Enhanced Onboarding & SOS Broadcast System

## Summary
Implemented a 6-step B2B onboarding wizard and SOS (urgent equipment need) broadcast system, plus post-deployment bug fixes. All features deployed to production at https://metal-gear-five.vercel.app.

---

## Features Delivered

### 1. Enhanced 6-Step Onboarding Wizard
Full-screen wizard at `/onboarding` collects business profile data before users can access the main app.

**Steps:**
1. **Identity** — Full name, company name, job title, work email (prefilled), work phone with visibility control, primary role (End User, Dealer/Reseller, OEM/Manufacturer, Service Provider, Broker/Trader, Scrapper/Recycler), secondary roles
2. **Equipment Interests** — Select from 13 equipment categories with sub-types and brand preferences. Search/filter support. Powers feed and SOS routing.
3. **Industry & Pain Points** — Industry selection (Oil & Gas, Petrochemical, Mining, etc.) and common pain points checklist with free-text "other" field
4. **Trading Intent** — What brings the user to the platform (buying, selling, sourcing parts, etc.) with role-specific follow-ups
5. **Transparency & SOS** — Profile visibility controls (show company, name, email visibility), SOS responder opt-in with category selection, urgency level, notification method preferences, real-time contact permission
6. **Quality Agreement** — 4-checkbox commitment to marketplace standards (real inventory, prompt updates, quality photos, no misrepresentation)

**Key behaviors:**
- Middleware guard redirects authenticated users to `/onboarding` if `user_business_profiles.onboarding_completed` is false
- Guard is fail-open: if DB query fails, users pass through to the app
- Prefills name/company/email from existing `profiles` table
- Progress is saved per-step so users can resume later
- On completion, marks both `user_business_profiles.onboarding_completed` and legacy `onboarding_progress` as done

### 2. SOS Broadcast System
Urgent equipment need broadcasting to qualified suppliers.

**Create SOS** (`/sos/create`):
- Title, description, equipment category/sub-type, brand, model
- Urgency level: Normal or Critical (red pulsing UI)
- Photo and video uploads to `sos-media` storage bucket
- Location auto-populated from profile, overridable
- Max distance reach (tier-limited: Free 100mi, Premium 500mi, Boost unlimited)
- Configurable expiration (default 72 hours)

**SOS Dashboard** (`/sos`):
- Feed of active SOS requests matching user's equipment interests
- Filter by category and urgency
- Response count badges
- Direct link to respond

**SOS Detail** (`/sos/[id]`):
- Full request details with photos/videos
- Response form: message, price estimate, lead time, condition, photos
- Real-time response updates via Supabase Realtime subscriptions
- Requester view: see all responses, accept a response (marks as fulfilled)
- Duplicate response prevention (DB unique constraint)

**My SOS Requests** (`/sos/my-requests`):
- User's own SOS history with status badges (active/fulfilled/cancelled/expired)
- Response count and cancel/close actions

**SOS Routing:**
- `find_sos_responders()` PostgreSQL function matches SOS category against `user_business_profiles.sos_categories`
- Filters by `sos_responder = true` and urgency level preferences
- Sends in-app notifications to matched responders
- Responder limit enforced by tier (Free: 10, Premium: unlimited, Boost: unlimited)

**Floating SOS Button:**
- Pulsing red FAB in bottom-right of all main layout pages
- Routes to `/sos/create`

### 3. Tier Limits for SOS
| Feature | Free | Premium ($29.99/mo) | Boost ($79.99/mo) |
|---------|------|---------------------|---------------------|
| Active SOS requests | 1 | 3 | Unlimited |
| Max reach (miles) | 100 | 500 | Unlimited |
| Responders notified | 10 | Unlimited | Unlimited |

---

## Database Migration (`031_cycle6_onboarding_sos.sql`)

### New Tables
- **`user_business_profiles`** — B2B profile data, onboarding state, SOS responder config, visibility settings
- **`user_equipment_interests`** — Equipment category interests with sub-types and brands (per user)
- **`sos_requests`** — SOS broadcast requests with equipment details, location, urgency, expiration
- **`sos_responses`** — Responses to SOS requests with price estimates, lead times, condition, photos
- **`sos_notifications`** — Delivery log for SOS notifications (method, read status, timestamps)

### New Enums
- `sos_urgency` — `'critical' | 'normal'`
- `sos_status` — `'active' | 'fulfilled' | 'cancelled' | 'expired'`
- `visibility_level` — `'everyone' | 'messaged' | 'no_one'`

### New Functions
- `find_sos_responders(p_category, p_sub_type)` — Finds users opted in as SOS responders for a given category
- `get_user_active_sos_count(p_user_id)` — Counts active SOS requests for tier limit enforcement
- `expire_old_sos_requests()` — Marks expired SOS requests (called by cron or trigger)

### Indexes (14 total)
- Covering user_id, category, status, urgency, timestamps, and location across all new tables

### RLS Policies
- Users can read/insert/update their own business profiles and equipment interests
- SOS requests readable by all authenticated users, writable by requester only
- SOS responses readable by all authenticated users, insertable by any user (not the requester)
- SOS notifications readable/updatable by the notified user only

---

## Files Created

### Server Actions
- `src/app/actions/sos.ts` — `createSosRequest`, `respondToSos`, `getSosRequests`, `getMySosRequests`, `getSosDetail`, `updateSosStatus`, `markSosFulfilled`, `uploadSosMedia`

### Constants
- `src/lib/constants/equipment-categories.ts` — 13 equipment categories with sub-types and common brands, industries, roles, pain points, trading intents, SOS tier limits
- `src/lib/constants/onboarding.ts` — `ONBOARDING_STEPS` array and `EnhancedOnboardingData` interface (extracted from server action to avoid `'use server'` export restriction)

### Pages
- `src/app/(onboarding)/onboarding/page.tsx` — 6-step onboarding wizard (client component)
- `src/app/(onboarding)/onboarding/layout.tsx` — Minimal layout with logo header
- `src/app/(main)/sos/page.tsx` — SOS dashboard with category/urgency filters
- `src/app/(main)/sos/create/page.tsx` — SOS creation form with media upload
- `src/app/(main)/sos/[id]/page.tsx` — SOS detail with Realtime response updates
- `src/app/(main)/sos/my-requests/page.tsx` — User's SOS request history

### Components
- `src/components/layout/sos-button.tsx` — Floating pulsing SOS FAB

### Documentation
- `docs/Owners-Manual/cycle-6-owner-guide.md` — Detailed owner guide for all new features

---

## Files Modified

- `src/app/actions/onboarding.ts` — Added 5 enhanced onboarding server actions, moved constants to separate file, added try-catch error handling
- `src/app/actions/notifications.ts` — Added 5 SOS notification types (`sos_request_match`, `sos_response_received`, `sos_response_accepted`, `sos_request_expired`, `sos_request_cancelled`)
- `src/lib/supabase/middleware.ts` — Added onboarding guard (fail-open) and `/sos`, `/onboarding` to protected routes
- `src/types/database.ts` — Added type definitions for all 5 new tables
- `src/app/(main)/layout.tsx` — Added `<SosButton />` floating action button
- `src/components/layout/desktop-nav.tsx` — Added SOS nav item with Siren icon and red highlight
- `src/components/layout/mobile-drawer.tsx` — Added SOS nav item with Siren icon
- `src/components/layout/notification-dropdown.tsx` — Added SOS notification icons, red-tinted styling, and routing
- `src/components/onboarding/onboarding-checklist.tsx` — Updated import path for `ONBOARDING_STEPS`
- `messages/en.json` — Added `"sos": "SOS"` translation key
- `messages/es.json` — Added `"sos": "SOS"` translation key

---

## Storage Buckets Created
- `sos-media` — Photos and videos attached to SOS requests/responses (7-day signed URLs)

---

## Bug Fixes (Post-Initial Deployment)

### Fix 1: `'use server'` export restriction
- **Error:** `A "use server" file can only export async functions, found object`
- **Cause:** `ONBOARDING_STEPS` constant and `EnhancedOnboardingData` interface were exported from a `'use server'` file
- **Fix:** Moved to `src/lib/constants/onboarding.ts`, updated all consumer imports

### Fix 2: Infinite spinner on onboarding page
- **Error:** Page spinner never resolves, page appears stuck loading
- **Cause:** `useEffect` calling `getEnhancedOnboardingProgress()` had no try-catch — any thrown error left `setLoading(false)` unreachable
- **Fixes applied:**
  - Wrapped `useEffect` load function in `try-catch-finally` so `setLoading(false)` always runs
  - Added error state UI with "Try Again" and "Go to Dashboard" buttons
  - Wrapped `getEnhancedOnboardingProgress()` DB queries in try-catch, returns `{ error }` instead of throwing
  - Made middleware onboarding guard fail-open: if `user_business_profiles` query returns an error, users pass through instead of being redirected to a broken onboarding page
  - Added try-catch to `handleNext` and `handleComplete` save handlers with toast error messages

---

## Commits
1. `5ce0c41` — `feat(cycle6): add enhanced onboarding wizard & SOS broadcast system`
2. `97c2a5f` — `docs: add Cycle 6 owner guide to Owners-Manual`
3. `9a09bf6` — `fix: move constants out of 'use server' file to fix runtime error`
4. `a69b8bf` — `fix: prevent infinite spinner on onboarding page`

---

## Key Patterns Maintained
- All DB operations via server actions with `createAdminClient()` (no client-side Supabase DB calls)
- Dark theme consistent with design system (`#0A0A0F` bg, `#FF6B2B` primary, `#3A8FD4` steel blue)
- Tailwind CSS v4 + shadcn/ui components
- Supabase Realtime for live updates (SOS responses)
- Tier-gated features with graceful upgrade prompts
- RLS policies on all new tables
- Notification system integration for SOS events
