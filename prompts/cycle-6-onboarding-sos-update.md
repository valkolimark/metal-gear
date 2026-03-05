# Metal Gear — Cycle 6: Enhanced Onboarding & SOS Broadcast System

## Session Setup

Metal Gear is an industrial equipment marketplace for Houston, TX. Cycles 1–8 are complete — see `prompts/cycle-6-onboarding-sos-complete.md` for the latest state. The project uses Next.js 15, Supabase, Tailwind v4, shadcn/ui, Zustand, Stripe, Resend, and Sentry. Read `CLAUDE.md` at the project root for full project context.

---

## Cycle 6 Overview

This cycle adds two major feature systems plus a comprehensive industry taxonomy:

1. **Machinio 3-Tier Equipment Taxonomy** — A hierarchical classification system (4 buckets → 28 groups → 252 subcategories) with cross-referencing, powering all equipment selection UI across onboarding, SOS, listings, and search. Based on the Machinio Taxonomy v3 spreadsheet (included in `/prompts/` or uploaded separately).

2. **Enhanced Multi-Step Onboarding** — A guided wizard that collects B2B identity, equipment interests, trading intent, transparency preferences, SOS opt-in, and quality agreement. Replaces the current basic signup flow with a post-registration onboarding that populates the user's profile and powers feed personalization + SOS routing.

3. **SOS Broadcast System** — An urgent-need broadcast button that lets end users (plant managers, maintenance, procurement) send a targeted distress signal to qualified dealers, rebuilders, scrap yards, and peer plants who have opted in for those equipment categories. Suppliers respond with what they have, price, lead time — the buyer posts once and help comes to them.

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
  sos_categories TEXT[] DEFAULT '{}',           -- Tier 2 group IDs user will respond to
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

-- Equipment categories and interests (maps to Machinio 3-tier taxonomy)
CREATE TABLE user_equipment_interests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tier1 TEXT NOT NULL,            -- e.g., 'machines_equipment', 'parts_components', 'materials', 'transportation'
  tier2 TEXT NOT NULL,            -- e.g., 'processing_separation', 'mining_oil_gas', 'heavy_equipment'
  subcategories TEXT[] DEFAULT '{}',  -- e.g., ['centrifugal_separators', 'industrial_centrifuges']
  brands TEXT[] DEFAULT '{}',     -- e.g., ['Alfa Laval', 'Flottweg', 'Westfalia']
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, tier2)          -- One row per user per Tier 2 group
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
  equipment_category TEXT NOT NULL,       -- Tier 2 group ID (e.g., 'processing_separation')
  equipment_subcategory TEXT,             -- Tier 3 subcategory (e.g., 'centrifugal_separators')
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
CREATE INDEX idx_uei_tier2 ON user_equipment_interests(tier2);
CREATE INDEX idx_uei_tier1 ON user_equipment_interests(tier1);
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

-- Route SOS to matching responders (matches on Tier 2 group + optional subcategory)
CREATE OR REPLACE FUNCTION find_sos_responders(
  p_tier2 TEXT,
  p_subcategory TEXT DEFAULT NULL
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
    AND uei.tier2 = p_tier2
    AND (p_subcategory IS NULL OR p_subcategory = ANY(uei.subcategories))
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

## Part 2: Machinio 3-Tier Equipment Taxonomy

Create a shared constants file that both onboarding and SOS reference. This is the **single source of truth** for all taxonomy data across the app. Based on the Machinio Taxonomy v3 spreadsheet (4 Tier 1 buckets → 28 Tier 2 groups → 252 subcategories).

### File: `src/lib/constants/equipment-taxonomy.ts`

Export a typed, hierarchical data structure:

```typescript
export interface Subcategory {
  id: string;            // slug: 'centrifugal_separators'
  label: string;         // display: 'Centrifugal Separators (Disc/Decanter)'
  crossListedIn?: string[];  // other Tier 2 groups this also appears in
}

export interface Tier2Group {
  id: string;            // slug: 'heavy_equipment_construction'
  label: string;         // display: 'Heavy Equipment & Construction'
  subcategories: Subcategory[];
}

export interface Tier1Bucket {
  id: string;            // slug: 'machines_equipment'
  label: string;         // display: 'Machines & Equipment'
  groups: Tier2Group[];
}

export const EQUIPMENT_TAXONOMY: Tier1Bucket[]
```

### Full Taxonomy Data

**Tier 1: Machines & Equipment** (17 groups, 183 subcategories)

| Tier 2 Group | Subcategories |
|---|---|
| Heavy Equipment & Construction | Excavators, Lifts, Cranes*, Wheel Loaders, Generator Sets*, Construction/Industrial Engines, Dozers, Block/Brick/Paver Making Machines, Drilling Rigs*, Compactors, Concrete Mixers*, Concrete Batching Plants, Backhoe Loaders, Skid Steer Loaders, Compact Track Loaders |
| Mining, Oil & Gas | Crushers & Screening Plants, Mineral Processing*, Oilfield Equipment, Articulated Haulers, Haul Trucks*, Tanks & Vessels*, Mud Pumps, Mills (mineral processing), Well Control Equipment, LHD Mining Loaders, Oil Cleaning Centrifuges* |
| Agriculture | Tractors, Tillage Equipment, Combines, Lawn Mowers, Planting Equipment, Applicators, Harvester Headers, Balers, Fertilizer Spreaders, Livestock Equipment |
| Forestry | Wood Chippers, Mulchers, Forwarders, Forestry Harvesters, Skidders, Stump Grinders, Horizontal Grinders*, Feller Bunchers, Knuckleboom Loaders, Forestry Attachments |
| Manufacturing & Machine Tools | Machining Centers, CNC Lathes, Lathes (Manual), Milling Machines, Grinding Machines, Bending & Forming, Welding Equipment, Saws (Metal), Laser Cutters, Presses |
| Processing & Separation | Packaging Machinery*, Industrial Compressors, Coating & Laminating, Tanks & Kettles, Conveyors*, Extruders, Industrial Chillers, Injection Molding, Plastic/Rubber Processing, **Centrifuges:** Centrifugal Separators (Disc/Decanter)*, Industrial Centrifuges, Oil Cleaning Centrifuges*, Disc Nozzle Centrifuges, Continuous Centrifuges, **Mixers & Blenders:** Agitators/Blenders/Mixers*, Industrial Batch Mixers, Industrial Planetary Mixers*, Industrial Emulsion Mixers, Homogenizers* |
| Food & Beverage Processing | Bottling/Filling/Packaging*, Kitchen & Restaurant Equipment, Bakery & Pastry Equipment*, Fruit & Vegetable Processing, Industrial Cooking Machines, Meat & Poultry Processing, Ovens & Grills, Dairy Processing*, Food Refrigeration, Confectionery Equipment, Food-Grade Centrifugal Separators* |
| Printing & Graphics | Digital Printing, Post-press, Sheet-fed Press, Die Cutters, Folders, Screen Printing, Large Wide Format Printers, Flexographic Printing, Book Binding, Guillotines |
| Textile & Leather Manufacturing | Sewing Machines, Non Woven, Knitting, Weaving, Shoe Machines, Industrial Laundry Equipment, Dyeing & Finishing, Yarn Manufacturing, Winders & Unwinders*, Mattress Manufacturing |
| Woodworking | Wood Saws, Planers & Moulders, Edgebanders, Sanders, CNC Wood Routers, Wood Sawmills*, Boring/Dowel Inserting/Gluing, Wood Finishing Equipment, Veneer Machines, Mortisers & Tenoners |
| Semiconductors & Electronics | Supporting Equipment, PCB Assembly, Test & Measurement (semi)*, Metrology/Inspection, Deposition Equipment (CVD/PVD), Laser Marking, Surface Treatment/Cleaning, Die Bonders, Soldering, Wire Bonders |
| Test, Lab & Medical Equipment | General Medical Equipment, General Laboratory Equipment, General Analytical Equipment, Medical Imaging, Electrical Test Instruments, Oscilloscopes, Medical Ultrasound, Test Generators, Flow/Electric/Gas Meters, Materials Testing, Laboratory Centrifuges*, Ultra Centrifuges*, Micro Centrifuges*, Lab Mixers/Shakers/Stirrers* |
| Energy & Power Generation | Turbines, Boilers, Solar Power, Diesel Engines & Generators, Power Plants |
| Material Handling | Forklifts, Telehandlers, Pallet Trucks, Pallet Stackers, Overhead Cranes, Reach Trucks, Material Handlers, Airport GSE, Vacuum Lifts/Sheet Metal Lifters, Order Pickers |
| Boats & Marine Equipment | Power Boats, Marine Equipment, Marine Engines & Generators*, Sail Boats, Cargo Ships, Dredges, Offshore Support Vessels*, Fishing Vessels, Service Vessels, Maritime Cranes & Port Equipment* |
| Recycling Equipment & Systems | Scrap Metal Shears*, Balers (Metal & Material)*, Shredders (Metal & Industrial)*, Granulators & Hammer Mills*, Magnetic Separators & Eddy Current, Wire Strippers & Choppers, Briquetters & Compactors*, Sorting Systems (Optical/XRF/NIR)*, Melting Furnaces & Smelters, Catalytic Converter Processing*, E-Waste Recycling Lines* |
| Waste Management | Recycling & Disposal*, Industrial Shredders*, Industrial Balers*, Wastewater Recycling, Waste Compactors*, Construction Waste Recycling*, Floor Scrubbers & Sweepers |

**Tier 1: Parts, Components & Tooling** (4 groups, 26 subcategories)

| Tier 2 Group | Subcategories |
|---|---|
| Automation & Controls | PLCs, Sensors, HMIs, Motion Controllers, I/O Modules, Actuators, Feedback Devices, Drives (VFD/Servo), Electric Motors, IT Infrastructure (Industrial) |
| Electrical & Power Components | Electrical & Electronic Components, Power Supply (AC/DC), Circuit Breakers, Transformers, Batteries & Chargers |
| Tooling & Consumables | Carbide Inserts & Indexable Tooling*, Carbide End Mills & Drills*, HSS Tooling & Taps*, Abrasives & Grinding Wheels*, Welding Consumables & Wire*, Saw Blades & Cutting Tools* |
| Pumps & Fluid Power | Centrifugal Pumps*, Positive Displacement Pumps, Vacuum Pumps, Water Pumps, Pressure Washers |

**Tier 1: Materials & Commodities** (3 groups, 26 subcategories)

| Tier 2 Group | Subcategories |
|---|---|
| Raw Materials & Stock | Steel (Sheet/Plate/Structural/Bar), Aluminum (Sheet/Plate/Extrusion/Bar), Copper & Brass (Sheet/Bar/Tube), Stainless Steel (Sheet/Plate/Bar/Tube), Plastics & Polymers*, Lumber & Wood Products*, Pipe/Tube/Fittings/Valves*, Fasteners & Hardware (Bulk/Surplus), Chemicals & Industrial Fluids |
| Scrap Metal & Metal Recycling | Ferrous Scrap (Steel/Iron/Cast), Non-Ferrous Scrap (Aluminum/Copper/Brass), Stainless Steel Scrap, Mixed/Demolition Scrap*, Auto & Truck Scrap*, Turnings/Chips/Swarf*, Wire & Cable Scrap*, E-Scrap (Circuit Boards/Electronics)* |
| Carbide & Specialty Metals | Tungsten Carbide Scrap & Inserts*, Carbide Grades & Blanks, Cobalt & Cobalt Alloys, Titanium Scrap & Alloys, Nickel Alloys (Inconel/Monel/Hastelloy), Molybdenum & Tungsten, Tool Steel & HSS Scrap*, Precious Metals (Catalysts/Contacts), Carbide Recycling & Processing* |

**Tier 1: Transportation & Logistics** (4 groups, 17 subcategories)

| Tier 2 Group | Subcategories |
|---|---|
| Trucks & Commercial Vehicles | Conventional Trucks, Dump Trucks*, Vans, Bucket (Boom) Trucks*, Cab Chassis Trucks, Service & Utility Trucks, Box Trucks, Flatbed Trucks, Buses |
| Trailers & Towables | Trailers (Flatbed/Enclosed/Lowboy), Concession Trailers, Box Trailers, RVs/Campers/Motorhomes/Caravans |
| Off-Road & Specialty Vehicles | ATV & UTV, Pickup Trucks |
| Engines & Drivetrain | Truck Engines, Automotive Equipment |

*Items marked with \* are cross-listed in other Tier 2 groups — see Cross-Reference data below.*

### Cross-Reference Logic

Some equipment legitimately appears in multiple categories (e.g., Centrifugal Separators live in Processing & Separation but cross-list to Oil & Gas and Food & Bev). The taxonomy constants file should include a `crossListedIn` field on subcategories so the system can:

1. **During onboarding** — If a user selects "Mining, Oil & Gas" interests, also surface cross-listed items like Oil Cleaning Centrifuges from Processing & Separation.
2. **During SOS routing** — If an SOS is posted for a cross-listed subcategory, also notify responders from the cross-listed Tier 2 groups.
3. **During search/browse** — Show cross-listed items when browsing any of their parent groups.

Implement as a helper function:
```typescript
// Returns all Tier 2 group IDs where a subcategory appears (primary + cross-listed)
export function getAllGroupsForSubcategory(subcategoryId: string): string[]

// Returns all subcategories relevant to a Tier 2 group (own + cross-listed into it)
export function getEffectiveSubcategories(tier2Id: string): Subcategory[]

// Flat search across all tiers — for search/autocomplete in SOS creation
export function searchTaxonomy(query: string): { tier1: string, tier2: string, subcategory: Subcategory }[]
```

### Additional Constants (same file or companion file)

```typescript
// src/lib/constants/equipment-taxonomy.ts (continued)

export const INDUSTRIES = [
  'Food & Beverage', 'Pharmaceutical', 'Oil & Gas', 'Mining',
  'Chemical', 'Maritime', 'Agriculture', 'Packaging',
  'Power Generation', 'Water / Wastewater', 'Pulp & Paper',
  'Automotive', 'Aerospace', 'Construction', 'Forestry',
  'Textile', 'Semiconductor', 'Printing & Packaging',
  'Recycling & Waste', 'Other'
] as const;

export const ROLES = [
  { id: 'end_user', label: 'End User / Plant', description: 'Plant manager, maintenance, engineering, procurement' },
  { id: 'dealer', label: 'Dealer / Broker', description: 'Buy and resell equipment' },
  { id: 'rebuilder', label: 'Rebuilder / Repair Shop', description: 'Rebuild, repair, refurbish equipment' },
  { id: 'scrap', label: 'Scrap / Investment Recovery', description: 'Buy/sell scrap, surplus, decommissioned' },
  { id: 'logistics', label: 'Logistics / Trucking', description: 'Heavy haul, rigging, transportation' },
  { id: 'services', label: 'Services', description: 'Hydraulic, valves, springs, specialized services' },
] as const;

export const PAIN_POINTS = [
  'Unplanned downtime',
  'Hard-to-find spare parts',
  'Finding trusted rebuilders',
  'Reliable scrap buyers',
  'Logistics / shipping',
  'Equipment valuations',
  'Quality verification',
  'Other'
] as const;
```

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

**Screen 2: Equipment Interests** (3-tier taxonomy browser)
- Start with 4 Tier 1 bucket cards: Machines & Equipment, Parts/Components/Tooling, Materials & Commodities, Transportation & Logistics
- Clicking a Tier 1 bucket expands to show its Tier 2 groups as selectable cards/chips
- Clicking a Tier 2 group expands to show subcategories as checkboxes/chips
- Include a **search bar at top** that searches across all 252 subcategories (uses `searchTaxonomy()`) — typing "centrifuge" should surface results from Processing, Oil & Gas, Test/Lab, and Food & Bev
- Cross-listed items: when a user selects a subcategory, show a subtle note "Also found in: [other groups]" so they understand the cross-referencing
- For each selected Tier 2 group, allow entering common brands (free-text tag input)
- Visual approach: accordion or expandable card layout, not a flat checkbox wall. Tier 1 = large cards with icons, Tier 2 = medium cards, Tier 3 = chips/tags
- Show selection count: "12 subcategories selected across 4 groups"
- Mobile: collapsible accordion works best for the 3-tier depth

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
  - If Yes: pick Tier 2 groups to respond to (prefill from Screen 2 selections), urgency level, notification methods (in-app / email / SMS)

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
// saveEquipmentInterests(userId: string, interests: EquipmentInterestInput[]) — Upsert to user_equipment_interests (tier1, tier2, subcategories[], brands[])
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

1. **What do you need?** (uses 3-tier taxonomy)
   - **Search-first pattern**: Type-ahead search across all 252 subcategories (uses `searchTaxonomy()`)
   - OR browse: Tier 1 bucket → Tier 2 group → Subcategory (collapsible drill-down)
   - Selected subcategory auto-populates: Tier 2 group, cross-listed groups for broader routing
   - Brand + Model (free text, autocomplete from known brands in taxonomy)
   - Title (auto-generated from selections: e.g., "Centrifugal Separator — Alfa Laval", editable)
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

// createSosRequest(data: SosRequestData) — Create + trigger routing (includes cross-list expansion)
// respondToSos(sosId: string, response: SosResponseData) — Submit response
// getSosRequests(filters?: SosFilters) — Active SOS for responder dashboard (filtered by user's Tier 2 groups + cross-listed subcategories)
// getMySosRequests(userId: string) — User's own SOS + response counts
// getSosDetail(sosId: string) — Full SOS with responses
// updateSosStatus(sosId: string, status: 'fulfilled' | 'cancelled') — Lifecycle management
// markSosFulfilled(sosId: string, fulfilledBy: string) — Mark fulfilled + prompt review
// uploadSosMedia(file: FormData) — Upload to sos-media bucket (follows listing-videos pattern)
```

### SOS Routing Flow

1. User submits SOS with a Tier 2 group + subcategory
2. Server action calls `find_sos_responders()` with the tier2 group + subcategory
3. **Cross-list expansion**: Also calls `getAllGroupsForSubcategory()` to find responders registered under cross-listed groups (e.g., an SOS for "Oil Cleaning Centrifuges" routes to both Mining/Oil & Gas AND Processing & Separation responders)
4. Creates `sos_notifications` records for each matching responder (deduped by user_id)
5. For `in_app` method → **insert into existing `notifications` table** with new type `sos_request_match`, which triggers the existing Supabase Realtime subscription + bell icon badge
6. For `email` → use existing email infrastructure (or queue for future)
7. For `sms` → store as pending in `sos_notifications` (future implementation)

### SOS Dashboard (`/sos`)

For responders — shows active SOS requests matching their Tier 2 equipment groups (including cross-listed subcategories):
- Cards: title, requester company, urgency badge (red for critical), time posted, distance, Tier 2 group + subcategory tags, response count
- Filters: Tier 1 bucket, Tier 2 group, Urgency, Distance, Date
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
2. **Machinio 3-tier taxonomy constants** — `src/lib/constants/equipment-taxonomy.ts` with full hierarchy, cross-reference helpers, and search utility
3. **Onboarding server actions** — `src/app/actions/onboarding.ts`
4. **Onboarding UI** — Route group, layout, 6 screens (with 3-tier taxonomy browser on Screen 2), save/resume
5. **Onboarding middleware guard** — Extend existing middleware
6. **SOS server actions** — `src/app/actions/sos.ts` (with cross-list routing logic)
7. **SOS creation flow** — Create page with taxonomy search + media upload
8. **SOS routing + notification dispatch** — Integration with existing notifications system + cross-list expansion
9. **SOS dashboard + detail pages** — Browse, respond, accept, fulfill
10. **Floating SOS button** — Main layout, pulsing animation
11. **Navigation updates** — Sidebar + mobile nav + badges
12. **Real-time subscriptions** — Supabase Realtime on `sos_responses` for live response updates
13. **Admin extensions** — SOS in moderation queue + analytics
14. **Testing** — Unit tests for taxonomy helpers + server actions via Vitest, E2E for onboarding + SOS via Playwright

---

## Design Notes

- The onboarding wizard is the **first impression** — make it feel premium, not like a boring form. Dark theme, subtle animations, orange/steel-blue accents. Think "high-end B2B platform," not "government form."
- The SOS button is the **hero feature** — pulsing animation, feels urgent and powerful, distinct from everything else on the page. A plant manager standing next to a broken machine should be able to tap SOS → pick category → describe → send in under 60 seconds.
- Equipment category selection should be **visual and intuitive** — Tier 1 buckets as large cards with icons, Tier 2 groups as expandable cards, Tier 3 subcategories as selectable chips. Search bar at top lets users skip the hierarchy entirely. Not a wall of 252 checkboxes.
- Cross-listing is a **key differentiator** — a centrifuge user shouldn't need to know whether their item is "Processing" or "Oil & Gas." The search-first pattern + cross-reference logic handles this automatically.
- All SOS interactions should feel **real-time and transparent** — live response updates, clear status indicators, no mystery about what's happening.
- Reuse existing UI patterns: the offers accept/reject flow maps well to SOS response acceptance. The listing detail layout maps well to SOS detail. Don't reinvent wheels.

---

## Future: Taxonomy Integration with Existing Listings

The Machinio 3-tier taxonomy should eventually replace or augment the existing category system used by listings and search. This is **out of scope for Cycle 6** but keep the taxonomy constants file structured so it can power:

- **Listing creation** — Replace free-text category with taxonomy drill-down
- **Search filters** — Tier 1/2/3 faceted filtering on the search page
- **Category landing pages** — Map existing `/equipment/[slug]` SEO pages to Tier 2 groups
- **Listing-to-SOS matching** — "Someone needs what you're selling" notifications

Build the taxonomy constants as a clean, importable module that any part of the app can consume.

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
