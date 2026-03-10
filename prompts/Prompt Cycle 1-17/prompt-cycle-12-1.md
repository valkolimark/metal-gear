# Cycle 12 — Prompt 1: Priority Engine — Self-Serve Paid Boosts + Admin Override
## Metal Gear · Industrial Equipment Marketplace

---

## Context

You are continuing development of Metal Gear's Super Admin Dashboard. Prompts 11-1 and 11-2 built the admin shell, user management, listing management, and SOS monitor. This prompt builds the **Priority Engine** — the system that allows companies to purchase featured placement for their listings/profiles, and gives admins full override control over all prioritization.

---

## Goal

Two interlinked systems:
1. **Self-serve boost store** — companies purchase time-limited featured placements via Stripe
2. **Admin Priority Engine** — superadmins can assign company tiers, override placements, and manage the featured slots on any page

---

## Deliverables

### 1. Data Model

```sql
-- Company/seller priority tiers (admin-assigned)
CREATE TYPE company_priority_tier AS ENUM ('standard', 'preferred', 'featured', 'platinum');

ALTER TABLE profiles
  ADD COLUMN priority_tier company_priority_tier DEFAULT 'standard',
  ADD COLUMN priority_score integer DEFAULT 0 CHECK (priority_score BETWEEN 0 AND 1000),
  ADD COLUMN priority_set_by uuid REFERENCES profiles(id),
  ADD COLUMN priority_set_at timestamptz;

-- Self-serve boost purchases
CREATE TABLE boost_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) NOT NULL,
  listing_id uuid REFERENCES listings(id), -- null = profile/storefront boost
  boost_type text NOT NULL, -- 'listing_featured' | 'category_pin' | 'homepage_slot' | 'storefront_featured' | 'sos_priority'
  stripe_payment_intent_id text UNIQUE,
  amount_cents integer NOT NULL,
  duration_days integer NOT NULL,
  starts_at timestamptz DEFAULT now(),
  expires_at timestamptz NOT NULL,
  status text DEFAULT 'active', -- 'active' | 'expired' | 'cancelled' | 'refunded'
  admin_override boolean DEFAULT false, -- true = admin granted this without payment
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_boosts_listing ON boost_purchases(listing_id, expires_at) WHERE status = 'active';
CREATE INDEX idx_boosts_user ON boost_purchases(user_id, expires_at DESC);

-- Featured homepage slots (admin-curated, drag-and-drop ordered)
CREATE TABLE homepage_featured_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_type text NOT NULL, -- 'listing' | 'company' | 'category_banner'
  target_id text NOT NULL, -- listing_id, profile_id, or category slug
  position integer NOT NULL, -- 1-based display order
  label text, -- optional admin label, e.g. "Centrifuge Week Promo"
  active boolean DEFAULT true,
  starts_at timestamptz DEFAULT now(),
  ends_at timestamptz,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);
```

### 2. Boost Store — User-Facing (Self-Serve)

New page: `/boost` — accessible from the seller dashboard and listing management pages.

**Boost product catalog:**

| Boost Type | What It Does | Price | Duration Options |
|---|---|---|---|
| **Listing Featured** | Listing appears in "Featured" carousel on browse + category pages, `⭐ Featured` badge | $49 / $89 / $149 | 7d / 14d / 30d |
| **Category Pin** | Listing pinned to position 1–3 on a specific category page | $79 / $139 / $229 | 7d / 14d / 30d |
| **Homepage Slot** | Listing or company card in homepage featured section (limited slots) | $199 / $349 | 7d / 14d |
| **Storefront Featured** | Seller storefront promoted in "Top Sellers" widget | $59 / $99 | 14d / 30d |
| **SOS Priority** | SOS broadcasts reach 2× more responders, appear at top of receiver dashboards | $29 / $49 | 7d / 14d |

**Boost store UI layout:**
```
┌─────────────────────────────────────────────────────┐
│  ⭐ Boost Your Visibility                           │
│  Get your listings in front of more buyers         │
├───────────────────┬─────────────────────────────────┤
│  [Listing        │  ┌──────────────────────────┐   │
│   Featured]      │  │ ⭐ Listing Featured       │   │
│  [Category Pin]  │  │                          │   │
│  [Homepage Slot] │  │  7 days   — $49          │   │
│  [Storefront]    │  │  14 days  — $89 ← BEST   │   │
│  [SOS Priority]  │  │  30 days  — $149         │   │
│                  │  │                          │   │
│                  │  │  Select listing:         │   │
│                  │  │  [Your listing picker]   │   │
│                  │  │                          │   │
│                  │  │  [Purchase with Stripe →]│   │
│                  │  └──────────────────────────┘   │
└───────────────────┴─────────────────────────────────┘
```

- Show seller's current active boosts with days remaining and status
- Stripe Checkout for each purchase (reuse existing Stripe infrastructure)
- On successful payment: create `boost_purchases` row, update listing fields (`is_featured`, `pinned_position`, etc.)
- Webhook handler: add `boost.expired` event check in the existing Stripe webhook — deactivate boost when it expires (or use a cron job)

**Listing picker (for boost types that target a listing):**
- Dropdown of the seller's active listings
- Shows current boost status on each option

**Active boosts panel:**
```
┌─────────────────────────────────────────┐
│  Your Active Boosts                     │
│                                         │
│  ⭐ "Alfa Laval Decanter" — Featured    │
│     11 days remaining  [Cancel]         │
│                                         │
│  📌 "Sharples P-660" — Category Pin    │
│     Centrifuges category, pos. 1        │
│     3 days remaining   [Renew]          │
└─────────────────────────────────────────┘
```

**Cron job — `src/app/api/cron/expire-boosts/route.ts`:**
- Runs daily
- Finds `boost_purchases` where `expires_at < now() AND status = 'active'`
- Sets `status = 'expired'`
- Clears `is_featured`, `featured_until`, `pinned_position` on affected listings
- Logs to audit trail

### 3. Admin Priority Engine — `/admin/priority`

**Superadmin only (hidden from moderator and analyst)**

**Section A — Company Priority Tiers:**

Table of all companies/sellers with their current priority tier:

| User | Listings | Tier | Score | Last Set By | Actions |
|---|---|---|---|---|---|
| Acme Centrifuge Co | 47 | ⭐ Featured | 750 | Mark (superadmin) | [Edit] |

- Edit modal: change tier (Standard/Preferred/Featured/Platinum), set priority score (0-1000), optional note
- Platinum companies: listings get automatic +50 admin_boost, featured badge on all listings, top placement in SOS responder lists
- Featured companies: +25 boost
- Preferred companies: +10 boost
- Standard: no bonus

**Section B — Active Boosts Overview:**

Table of all active `boost_purchases` across the entire platform:
- Filter by: boost type, user, listing, days remaining
- Admin can: cancel any boost (with optional refund flag), extend any boost (admin override, no charge), grant free boosts

**Grant free boost (admin):**
- Admin can grant any boost type to any user at no charge
- Creates a `boost_purchases` row with `admin_override = true` and `amount_cents = 0`
- Useful for: compensating for platform issues, rewarding loyal users, onboarding key partners

**Section C — Homepage Featured Slots:**

Visual slot editor:
```
┌─────────────────────────────────────────────────────┐
│  Homepage Featured Slots  (6 slots available)       │
│                                                     │
│  Slot 1: [Alfa Laval Decanter  ×]  [↑] [↓]         │
│  Slot 2: [Sharples P-660       ×]  [↑] [↓]         │
│  Slot 3: [EMPTY — click to add  ]                   │
│  ...                                                │
│                                                     │
│  [+ Add listing]  [+ Add company]  [+ Add banner]   │
│                                                     │
│  Schedule: [Active now ▼]  Ends: [date picker]      │
└─────────────────────────────────────────────────────┘
```
- Drag-and-drop reorder (use `@dnd-kit/core` or simple up/down buttons if DND adds complexity)
- Each slot has: target (listing or company), label, start/end dates
- Changes save immediately via server action
- Preview button: opens a modal showing how the homepage looks with current slots

**Section D — Category Page Pins:**

Table of all currently pinned listings by category:
- Filter by category
- Add new pin: pick category → pick listing → set position (1, 2, or 3) → set end date
- Remove pin
- Each category can have max 3 pinned positions

**Section E — SOS Priority:**

- Table of active SOS Priority boosts
- Toggle: "Show Critical SOSs at top for all users regardless of taxonomy match" — emergency override for platform-wide urgent needs

---

## Browse Page Update

Update the equipment browse page (`/search` or `/listings`) to display featured content:

1. **Featured carousel** (3–6 listings with active `is_featured = true` or `boost_type = 'listing_featured'`): horizontal scroll strip at top
2. **Pinned listings**: positions 1–3 in category results, visually marked with `📌 Pinned`
3. **Featured badge** on listing cards: `⭐ Featured` chip in orange for boosted listings
4. **Featured seller cards** in a "Top Sellers This Week" sidebar widget (if storefront boost active)

---

## Commit & Deploy
- Commit: `feat: self-serve boost store with Stripe + admin priority engine`
- Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
- Push + Vercel deploy

---

## Next Prompt
Prompt 12-2 builds the Financial Dashboard and Analytics panel, completing the Super Admin system.
