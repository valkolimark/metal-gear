# Metal Gear — Cycle 6: Enhanced Onboarding & SOS Broadcast System

## Session Setup

## Context
Metal Gear is an industrial equipment marketplace for Houston, TX. Cycles 1–8 are complete — see `prompts/cycle-8-complete.md` for the latest state. The project uses Next.js 15, Supabase, Tailwind v4, shadcn/ui, Zustand, Stripe, Resend, and Sentry. Read `CLAUDE.md` at the project root for full project context.

---

## Cycle 6-amended Overview

This cycle adds two major feature systems:

1. **Enhanced Multi-Step Onboarding** — A guided wizard that collects B2B identity, equipment interests, trading intent, transparency preferences, SOS opt-in, and quality agreement. Replaces the current basic signup flow with a post-registration onboarding that populates the user's profile and powers feed personalization + SOS routing.

2. **SOS Broadcast System** — An urgent-need broadcast button that lets end users (plant managers, maintenance, procurement) send a targeted distress signal to qualified dealers, rebuilders, scrap yards, and peer plants who have opted in for those equipment categories. Suppliers respond with what they have, price, lead time — the buyer posts once and help comes to them.


---

## What Already Exists (from Cycle 5)

Reference these existing systems — extend, don't rebuild:

| System | What exists | Where | How we use it |
|--------|------------|-------|---------------|
| **Notifications** | `notifications` table, Realtime subscription, bell icon dropdown, unread badge, mark-as-read | `src/app/actions/notifications.ts`, `src/hooks/use-notifications.ts`, `src/components/layout/notification-dropdown.tsx` | Add new SOS notification types to existing system |
| **Maps / Location** | Leaflet + OpenStreetMap, dark-themed popups, haversine distance, radius filter | `src/components/map/listing-map.tsx`, `src/components/map/dynamic-map.tsx` | Reuse map components for SOS location display + radius visualization |
| **Video Uploads** | `listing_videos` table, `listing-videos` storage bucket, HTML5 player | Listings create/detail pages | Follow same upload pattern for SOS media attachments |
| **Admin / Moderation** | Moderation queue, bulk actions, auto-flagging, audit log (`admin_audit_log`) | `src/app/actions/admin.ts`, `src/app/(main)/admin/page.tsx` | Extend moderation queue to include SOS abuse reports |
| **Offers System** | `offers` table, full lifecycle (pending/accepted/rejected/countered/expired) | `src/app/actions/offers.ts` | SOS responses follow a similar accept/decline pattern |
| **Migrations** | Numbered SQL files in `supabase/migrations/` | `supabase/migrations/` | All new SQL goes here as numbered migration files |
| **CI/CD** | GitHub Actions (lint, typecheck, test, build), Husky pre-commit | `.github/workflows/ci.yml` | New code runs through existing pipeline |
| **Env Validation** | Zod schema for env vars | `src/lib/env.ts` | Add any new env vars here |

---

## Part 1: Database Schema

Add as numbered migration files in `supabase/migrations/`. Run via Supabase Management API (SQL Editor). All tables need RLS policies.

### New Tables

```sql
-- ============================================================
-- ONBOARDING & USER PROFILE EXTENSIONS
-- ============================================================

-- Extended user profiles (supplements existing profiles table)
CREATE TABLE user_business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  job_title TEXT,
  work_phone TEXT,
  show_phone_to TEXT DEFAULT 'no_one' CHECK (show_phone_to IN ('everyone', 'messaged', 'no_one')),
  show_email_to TEXT DEFAULT 'messaged' CHECK (show_email_to IN ('everyone', 'messaged', 'no_one')),
  show_company BOOLEAN DEFAULT true,
  show_name BOOLEAN DEFAULT true,
  primary_role TEXT NOT NULL CHECK (primary_role IN (
    'end_user', 'dealer', 'rebuilder', 'scrap', 'logistics', 'services'
  )),
  secondary_roles TEXT[] DEFAULT '{}',
  industries TEXT[] DEFAULT '{}',
  pain_points TEXT[] DEFAULT '{}',
  pain_points_other TEXT,
  trading_intents TEXT[] DEFAULT '{}',
  -- SOS participation
  sos_responder BOOLEAN DEFAULT false,
  sos_categories TEXT[] DEFAULT '{}',
  sos_urgency_level TEXT DEFAULT 'all' CHECK (sos_urgency_level IN ('critical_only', 'all')),
  sos_notify_methods TEXT[] DEFAULT ARRAY['in_app'],
  sos_allow_realtime_contact BOOLEAN DEFAULT false,
  -- Quality agreement
  quality_agreement_accepted BOOLEAN DEFAULT false,
  quality_agreement_accepted_at TIMESTAMPTZ,
  -- Onboarding state
  onboarding_completed BOOLEAN DEFAULT false,
  onboarding_completed_at TIMESTAMPTZ,
  onboarding_step INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Equipment categories and interests
CREATE TABLE user_equipment_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category TEXT NOT NULL,         -- e.g., 'centrifuges', 'valves', 'gearboxes'
  sub_types TEXT[] DEFAULT '{}',  -- e.g., ['decanter', 'disk-stack', 'lab']
  brands TEXT[] DEFAULT '{}',     -- e.g., ['Alfa Laval', 'Flottweg']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, category)
);

-- ============================================================
-- SOS BROADCAST SYSTEM
-- ============================================================

CREATE TYPE sos_status AS ENUM ('active', 'fulfilled', 'expired', 'cancelled');
CREATE TYPE sos_urgency AS ENUM ('critical', 'normal');
CREATE TYPE sos_response_status AS ENUM ('pending', 'accepted', 'declined', 'expired');

-- SOS requests (the broadcast)
CREATE TABLE sos_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,                    -- Short description: "Fisher control valve, model X"
  description TEXT,                       -- Detailed need
  equipment_category TEXT NOT NULL,       -- Maps to equipment categories
  equipment_sub_type TEXT,
  brand TEXT,
  model TEXT,
  urgency sos_urgency DEFAULT 'critical',
  status sos_status DEFAULT 'active',
  -- Media attachments (stored in Supabase Storage, same pattern as listing_videos)
  photos TEXT[] DEFAULT '{}',
  videos TEXT[] DEFAULT '{}',
  notes TEXT,
  -- Location context (reuses haversine from Cycle 5 map/location system)
  location_city TEXT,
  location_state TEXT,
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  max_distance_miles INTEGER DEFAULT 500,
  -- Lifecycle
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '72 hours'),
  fulfilled_at TIMESTAMPTZ,
  fulfilled_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- SOS responses (suppliers replying)
CREATE TABLE sos_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sos_request_id UUID NOT NULL REFERENCES sos_requests(id) ON DELETE CASCADE,
  responder_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  price_estimate TEXT,
  lead_time TEXT,
  condition TEXT,
  photos TEXT[] DEFAULT '{}',
  status sos_response_status DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sos_request_id, responder_id)
);

-- SOS notification log (extends existing notifications system — this is the routing/delivery log)
CREATE TABLE sos_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sos_request_id UUID NOT NULL REFERENCES sos_requests(id) ON DELETE CASCADE,
  notified_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_method TEXT NOT NULL CHECK (notify_method IN ('in_app', 'email', 'sms')),
  sent_at TIMESTAMPTZ DEFAULT NOW(),
  read_at TIMESTAMPTZ,
  UNIQUE(sos_request_id, notified_user_id, notify_method)
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX idx_ubp_user ON user_business_profiles(user_id);
CREATE INDEX idx_ubp_role ON user_business_profiles(primary_role);
CREATE INDEX idx_ubp_sos ON user_business_profiles(sos_responder) WHERE sos_responder = true;
CREATE INDEX idx_uei_user ON user_equipment_interests(user_id);
CREATE INDEX idx_uei_category ON user_equipment_interests(category);
CREATE INDEX idx_sos_req_status ON sos_requests(status) WHERE status = 'active';
CREATE INDEX idx_sos_req_category ON sos_requests(equipment_category);
CREATE INDEX idx_sos_req_requester ON sos_requests(requester_id);
CREATE INDEX idx_sos_req_expires ON sos_requests(expires_at) WHERE status = 'active';
CREATE INDEX idx_sos_resp_request ON sos_responses(sos_request_id);
CREATE INDEX idx_sos_resp_responder ON sos_responses(responder_id);
CREATE INDEX idx_sos_notif_request ON sos_notifications(sos_request_id);
CREATE INDEX idx_sos_notif_user ON sos_notifications(notified_user_id);

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE user_business_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_equipment_interests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_notifications ENABLE ROW LEVEL SECURITY;

-- Business profiles: users can read all (transparency), write own
CREATE POLICY "Users can view all business profiles"
  ON user_business_profiles FOR SELECT USING (true);
CREATE POLICY "Users can insert own business profile"
  ON user_business_profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own business profile"
  ON user_business_profiles FOR UPDATE USING (auth.uid() = user_id);

-- Equipment interests: users can read all, write own
CREATE POLICY "Users can view all equipment interests"
  ON user_equipment_interests FOR SELECT USING (true);
CREATE POLICY "Users can manage own equipment interests"
  ON user_equipment_interests FOR ALL USING (auth.uid() = user_id);

-- SOS requests: all authenticated users can view active, requester manages own
CREATE POLICY "Authenticated users can view active SOS"
  ON sos_requests FOR SELECT USING (status = 'active' OR requester_id = auth.uid());
CREATE POLICY "Users can create SOS requests"
  ON sos_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY "Requester can update own SOS"
  ON sos_requests FOR UPDATE USING (auth.uid() = requester_id);

-- SOS responses: requester + responder can view, responder can create/update own
CREATE POLICY "SOS parties can view responses"
  ON sos_responses FOR SELECT USING (
    responder_id = auth.uid() OR
    sos_request_id IN (SELECT id FROM sos_requests WHERE requester_id = auth.uid())
  );
CREATE POLICY "Users can respond to SOS"
  ON sos_responses FOR INSERT WITH CHECK (auth.uid() = responder_id);
CREATE POLICY "Responder can update own response"
  ON sos_responses FOR UPDATE USING (auth.uid() = responder_id);

-- SOS notifications: user can view own
CREATE POLICY "Users can view own SOS notifications"
  ON sos_notifications FOR SELECT USING (notified_user_id = auth.uid());

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-expire SOS requests
CREATE OR REPLACE FUNCTION expire_old_sos_requests()
RETURNS void AS $$
BEGIN
  UPDATE sos_requests
  SET status = 'expired', updated_at = NOW()
  WHERE status = 'active' AND expires_at < NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Route SOS to matching responders
CREATE OR REPLACE FUNCTION find_sos_responders(
  p_category TEXT,
  p_sub_type TEXT DEFAULT NULL
)
RETURNS TABLE(user_id UUID, notify_methods TEXT[]) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ubp.user_id,
    ubp.sos_notify_methods
  FROM user_business_profiles ubp
  JOIN user_equipment_interests uei ON uei.user_id = ubp.user_id
  WHERE ubp.sos_responder = true
    AND uei.category = p_category
    AND (p_sub_type IS NULL OR p_sub_type = ANY(uei.sub_types))
    AND ubp.onboarding_completed = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Count active SOS for a user (for tier limits)
CREATE OR REPLACE FUNCTION get_user_active_sos_count(p_user_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM sos_requests
    WHERE requester_id = p_user_id AND status = 'active'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Supabase Storage

Create a new bucket (follows same pattern as existing `listing-videos` bucket):
- **Bucket name:** `sos-media`
- **Public:** false
- **File size limit:** 50MB
- **Allowed MIME types:** `image/jpeg`, `image/png`, `image/webp`, `video/mp4`, `video/quicktime`

---

## Part 2: Equipment Category Master Data

Create a shared constants file that both onboarding and SOS reference. This is the **single source of truth** for all category/role/industry data across the app.

`src/lib/constants/equipment-categories.ts`

Exports:
- `EQUIPMENT_CATEGORIES` — Array of `{ id: string, label: string, subTypes: string[], commonBrands: string[] }`
  - Centrifuges (Decanter, Lab, Disk-stack)
  - Valves (Fisher control, Ball, Gate, Butterfly, Check)
  - Gearboxes (Helical, Planetary, Worm, Bevel)
  - Mixers / Blenders (Ribbon, Sigma blade, Lab, Industrial)
  - Hydraulic Equipment (Pumps, Cylinders, Motors, Power units)
  - Scrap & Byproducts (Springs/coils, Nichrome wire, Stainless, Copper)
  - Trucks & Heavy Equipment (Peterbilt, Trailers, Roll-off, Forklifts)
  - Bearings & Seals
  - CNC / Machine Tools (Lathes, Mills, Grinders, EDM)
  - Pumps (Centrifugal, Positive displacement, Diaphragm, Peristaltic)
  - Heat Exchangers (Shell & tube, Plate, Air-cooled)
  - Compressors (Reciprocating, Screw, Centrifugal)
  - Other (free-text)
- `INDUSTRIES` — Food & Beverage, Pharmaceutical, Oil & Gas, Mining, Chemical, Maritime, Agriculture, Packaging, Power Generation, Water/Wastewater, Pulp & Paper, Other
- `ROLES` — Array of `{ id, label, description }` for the 6 role types
- `PAIN_POINTS` — Unplanned downtime, Hard-to-find spare parts, Finding trusted rebuilders, Reliable scrap buyers, Logistics/shipping, Other

---

## Part 3: Enhanced Onboarding Flow

### Architecture

New route group:
- `src/app/(onboarding)/onboarding/page.tsx` — Main onboarding page
- `src/app/(onboarding)/onboarding/layout.tsx` — Minimal layout (no main nav, just progress bar + MG logo)
- `src/app/(onboarding)/onboarding/steps/` — Individual step components

### Onboarding Guard

Add middleware logic: after login, if `user_business_profiles.onboarding_completed = false` (or no profile row exists), redirect to `/onboarding`. Skip for `/api/*`, `/auth/*`, `/(marketing)/*`, and static assets. Check the existing middleware file and extend it — don't create a second middleware.

### 6 Screens

Progress indicator at top. Back/Next at bottom. Save progress on each step transition so users can close browser and resume.

**Screen 1: Identity** (combines basic info + role)
- Full name (prefill from auth if available)
- Company name (required)
- Job title (free text with suggestions: Plant Manager, Procurement, Dealer, Rebuilder, etc.)
- Work email (prefill from auth)
- Work phone (optional) with visibility toggle: Everyone / Messaged Only / No One
- Primary role (radio): End User / Plant, Dealer / Broker, Rebuilder / Repair Shop, Scrap / Investment Recovery, Logistics / Trucking, Services
- Secondary roles (checkboxes, optional)

**Screen 2: Equipment Interests**
- Multi-select equipment categories from `EQUIPMENT_CATEGORIES` constant
- Search/filter bar to quickly find categories
- For each selected category → expand panel to pick sub-types (chips/tags) and enter brands
- Use a visual, card-based UI — not just a wall of checkboxes. Expandable cards or tag cloud pattern.

**Screen 3: Industry & Pain Points**
- Industry multi-select from `INDUSTRIES` constant
- Pain points checkboxes from `PAIN_POINTS` constant + free-text "Other"

**Screen 4: Trading Intent**
- Multi-select + drag to rank:
  - Find equipment / parts
  - Sell surplus equipment / scrap / byproducts
  - Find rebuilders / repair services
  - Find buyers for rebuilt gear
  - Arrange logistics / trucking
  - All of the above
- Conditional follow-up based on primary role:
  - **End User**: "What do you most urgently need?" (Spare parts / Emergency breakdowns / Disposing of boneyard / Finding rebuilders / Other)
  - **Dealer/Rebuilder**: "Want to promote any listings?" (Yes / Not yet)

**Screen 5: Transparency & SOS**
- Visibility toggles: show company (default ON), show name/title (default ON), phone visibility, email visibility
- "Allow real-time contact for SOS?" toggle
- SOS Responder section:
  - "Can you help when others hit SOS?" (Yes/No)
  - If Yes: pick categories (prefill from Screen 2), urgency level, notification methods (in-app / email / SMS)

**Screen 6: Quality Agreement & Submit**
- All checkboxes must be checked:
  - "I will only list equipment I actually control"
  - "I will update or remove old/sold items"
  - "Low-quality photos or incorrect info may be rejected"
  - "Repeated false listings can result in suspension"
- Optional: "I agree to upload clear photos or short videos for each listing"
- **Complete Setup** button → saves everything, marks `onboarding_completed = true`, redirects to dashboard

### Server Actions

Create `src/app/actions/onboarding.ts`:

```typescript
'use server'

// saveOnboardingStep(step: number, data: Partial<OnboardingData>) — Upsert partial progress
// completeOnboarding(data: OnboardingData) — Final save + mark complete
// getOnboardingProgress(userId: string) — Returns current step + all saved data
// saveEquipmentInterests(userId: string, interests: EquipmentInterest[]) — Upsert to user_equipment_interests
```

### UI Notes

- Dark theme: `#0A0A0F` bg, `#FF6B2B` primary, `#3A8FD4` steel blue
- Chakra Petch for step headings, Manrope for body
- Progress bar: "Step 3 of 6" with segment indicators
- Mobile-responsive, safe area insets (PWA)
- Use existing shadcn/ui components: Switch, Select, Badge, Input, Button
- Subtle slide/fade transitions between steps

---

## Part 4: SOS Broadcast System

### Routes

- `src/app/(main)/sos/page.tsx` — SOS dashboard (active requests in responder's categories)
- `src/app/(main)/sos/create/page.tsx` — Create SOS request
- `src/app/(main)/sos/[id]/page.tsx` — Detail view (requester sees responses, responder can respond)
- `src/app/(main)/sos/my-requests/page.tsx` — User's own SOS history

### Floating SOS Button

- Add to main `(main)` layout — visible on all protected routes
- Position: bottom-right on desktop, bottom-center on mobile (above existing bottom nav, respect safe area insets)
- Style: pulsing red/orange gradient, circular, siren/alert icon (use Lucide `Siren` or `AlertTriangle`)
- Click → navigate to `/sos/create`
- Only visible to authenticated users who completed onboarding
- Show badge count of unread SOS notifications

### SOS Creation Flow (5-step form or single scrollable page)

1. **What do you need?**
   - Equipment category (dropdown from `EQUIPMENT_CATEGORIES`)
   - Sub-type (dynamic based on category)
   - Brand + Model (free text, autocomplete from known brands in constants)
   - Title (auto-generated: "Fisher Control Valve Model X", editable)
   - Description (textarea)

2. **How urgent?**
   - Critical / Emergency (default) — "Plant is down, I need this NOW"
   - Normal — "Urgent but not a shutdown"

3. **Attachments** (optional, follow existing `listing-videos` upload pattern)
   - Up to 5 photos → upload to `sos-media` bucket
   - 1 video max 15 seconds → upload to `sos-media` bucket
   - Notes field

4. **Location & Reach**
   - City + State (prefill from profile)
   - Max distance: 100mi / 250mi / 500mi / Nationwide
   - **Reuse existing Leaflet map component** to show radius preview on dark-themed map
   - Tier-limited: Free = 100mi, Premium = 500mi, Boost = Nationwide

5. **Expiration + Review**
   - Default 72h, options: 24h / 48h / 72h / 1 week
   - Preview card showing what responders will see
   - **Send SOS** button

### Server Actions

Create `src/app/actions/sos.ts`:

```typescript
'use server'

// createSosRequest(data: SosRequestData) — Create + trigger routing
// respondToSos(sosId: string, response: SosResponseData) — Submit response
// getSosRequests(filters?: SosFilters) — Active SOS for responder dashboard (filtered by user's categories)
// getMySosRequests(userId: string) — User's own SOS + response counts
// getSosDetail(sosId: string) — Full SOS with responses
// updateSosStatus(sosId: string, status: 'fulfilled' | 'cancelled') — Lifecycle management
// markSosFulfilled(sosId: string, fulfilledBy: string) — Mark fulfilled + prompt review
// uploadSosMedia(file: FormData) — Upload to sos-media bucket (follows listing-videos pattern)
```

### SOS Routing Flow

1. User submits SOS
2. Server action calls `find_sos_responders()` with category + sub_type
3. For each matching responder → insert into `sos_notifications` table
4. For `in_app` method → **insert into existing `notifications` table** with new type `sos_request_match`, which triggers the existing Supabase Realtime subscription + bell icon badge
5. For `email` → use existing email infrastructure (or queue for future)
6. For `sms` → store as pending in `sos_notifications` (future implementation)

### SOS Dashboard (`/sos`)

For responders — shows active SOS requests matching their equipment interests:
- Cards: title, requester company, urgency badge (red for critical), time posted, distance, category tags, response count
- Filters: Category, Urgency, Distance, Date
- **Reuse existing Leaflet map** to show SOS locations on map view (optional toggle)
- Real-time: use Supabase Realtime to show new SOS appearing live

### SOS Detail (`/sos/[id]`)

**For requester:**
- Full request details + media
- Response list: each shows responder name/company/role/rating (from existing `reviews` table), message, price, lead time, condition, photos
- Actions: Accept response (opens existing messaging system), Mark Fulfilled (prompts review via existing `reviews` table), Cancel SOS
- **Real-time:** Supabase Realtime subscription on `sos_responses` table so new responses appear live

**For responder:**
- Full SOS request details + media
- Response form: Message, Price estimate, Lead time, Condition dropdown (New Surplus / Rebuilt / Used-Good / Used-Fair / As-Is), Upload photos
- After submitting: see their response status

### Subscription Tier Limits

Extend existing tier system:
- **Free:** 1 active SOS, 100mi reach, max 10 responders notified
- **Premium ($29.99/mo):** 3 active SOS, 500mi reach, unlimited responders
- **Boost ($79.99/mo):** Unlimited SOS, nationwide reach, priority placement in responder feeds

---

## Part 5: Notification System Extension

**Extend the existing `notifications` table and `use-notifications` hook** — do NOT create a separate notification system.

### New Notification Types to Add

Add these to the existing notification type handling:

```typescript
// Add to existing NotificationType union
| 'sos_request_match'       // "SOS: [Company] needs a Fisher control valve — can you help?"
| 'sos_response_received'   // "Someone responded to your SOS for [item]"
| 'sos_response_accepted'   // "Your response to [Company]'s SOS was accepted"
| 'sos_expired'             // "Your SOS for [item] has expired with N responses"
| 'sos_fulfilled'           // "SOS for [item] you responded to was fulfilled"
```

### Integration Points

- `src/hooks/use-notifications.ts` — Add SOS notification rendering (distinct red/orange styling, siren icon)
- `src/components/layout/notification-dropdown.tsx` — SOS notifications get a distinct visual treatment (red accent border or background tint)
- Clicking an SOS notification → navigates to `/sos/[id]`

---

## Part 6: Navigation Updates

- Add "SOS" link to desktop sidebar navigation with siren icon + red accent color
- Add "SOS" to mobile bottom navigation
- Both show unread SOS notification badge count
- The floating SOS **create** button is separate from the nav link (nav goes to `/sos` dashboard, button goes to `/sos/create`)
- Add `/sos`, `/sos/*`, `/onboarding` to protected routes

---

## Part 7: Admin Extensions

Extend existing admin panel (`src/app/(main)/admin/page.tsx` and `src/app/actions/admin.ts`):

- **SOS Moderation**: Add SOS requests to moderation queue if reported
- **SOS Analytics**: Add to admin dashboard — active SOS count, avg response time, fulfillment rate, top categories
- **Audit log**: Log SOS moderation actions to existing `admin_audit_log` table

---

## Implementation Order

Build in this sequence to maintain a working app at each step:

1. **Database migrations** — Numbered SQL file in `supabase/migrations/`, run via Management API
2. **Equipment categories constants** — `src/lib/constants/equipment-categories.ts`
3. **Onboarding server actions** — `src/app/actions/onboarding.ts`
4. **Onboarding UI** — Route group, layout, 6 screens, save/resume
5. **Onboarding middleware guard** — Extend existing middleware
6. **SOS server actions** — `src/app/actions/sos.ts`
7. **SOS creation flow** — Create page with media upload
8. **SOS routing + notification dispatch** — Integration with existing notifications system
9. **SOS dashboard + detail pages** — Browse, respond, accept, fulfill
10. **Floating SOS button** — Main layout, pulsing animation
11. **Navigation updates** — Sidebar + mobile nav + badges
12. **Real-time subscriptions** — Supabase Realtime on `sos_responses` for live response updates
13. **Admin extensions** — SOS in moderation queue + analytics
14. **Testing** — Unit tests for server actions via Vitest, E2E for onboarding + SOS via Playwright

---

## Design Notes

- The onboarding wizard is the **first impression** — make it feel premium, not like a boring form. Dark theme, subtle animations, orange/steel-blue accents. Think "high-end B2B platform," not "government form."
- The SOS button is the **hero feature** — pulsing animation, feels urgent and powerful, distinct from everything else on the page. A plant manager standing next to a broken machine should be able to tap SOS → pick category → describe → send in under 60 seconds.
- Equipment category selection should be **visual and intuitive** — expandable cards with icons, search-first pattern, not a wall of checkboxes.
- All SOS interactions should feel **real-time and transparent** — live response updates, clear status indicators, no mystery about what's happening.
- Reuse existing UI patterns: the offers accept/reject flow maps well to SOS response acceptance. The listing detail layout maps well to SOS detail. Don't reinvent wheels.

---

## Credentials Needed

Before starting:
- Supabase Management API token (for migration SQL + creating `sos-media` storage bucket)
- Vercel token (for env vars if needed)
- Confirm: the existing `notifications` table schema so we add compatible SOS notification records

---

## Commit Convention

Each logical unit gets its own commit:
```
feat(onboarding): add multi-step wizard with business profile collection

Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>
```

Build → commit → push → deploy after each major feature block is complete and tested.
