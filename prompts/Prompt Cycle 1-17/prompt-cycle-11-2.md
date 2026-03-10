# Cycle 11 — Prompt 2: Admin Listing Management + SOS Monitor
## Metal Gear · Industrial Equipment Marketplace

---

## Context

You are continuing development of Metal Gear's Super Admin Dashboard. Prompt 11-1 built the shell, RBAC, Control Tower, and User Management. This prompt adds **Listing Management** and the **SOS Monitor** admin panels. All admin server actions must call `requireAdmin()` and write to `admin_audit_log`.

---

## Deliverables

### 1. Listing Management — `/admin/listings`

**Listing table (server-side paginated, 50 per page):**

Columns: Thumbnail | Title | Seller | Category (tier2 / subcategory) | Price | Condition | Status | AI Fraud Flag | Posted | Expires | Actions

**Status badges:**
- `active` → green
- `draft` → gray
- `pending_review` → amber (new status — see below)
- `flagged` → red
- `sold` → blue
- `expired` → gray/dim

**Filters (URL query params):**
- Search: title, description, manufacturer, model, serial
- Category: tier1 / tier2 / subcategory dropdowns (cascade)
- Status: all / active / draft / pending_review / flagged / sold / expired
- AI fraud flagged: all / flagged only / cleared
- Subscription tier of seller: all / free / premium / boost
- Date range: posted between
- Price range
- Has media: any / photos only / video

**Bulk actions (checkbox select rows):**
- Approve selected (→ `active`)
- Flag for review (→ `flagged`)
- Feature selected listings (adds `is_featured = true`)
- Expire selected
- Delete selected — superadmin only, requires typed confirmation "DELETE"

**Row actions (dropdown per listing):**
- View listing (opens in new tab)
- Edit listing (admin can edit any field)
- Approve (→ active)
- Flag (→ flagged, prompt for reason)
- Feature / Unfeature
- Pin to category (see Priority Engine — stub for now, just sets `pinned_position`)
- Set admin boost score (integer 0–100)
- Force expire
- Delete — superadmin only

**Add new listing status to enum:**
```sql
ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'pending_review';
ALTER TYPE listing_status ADD VALUE IF NOT EXISTS 'flagged';
```

Add columns to listings:
```sql
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS featured_until timestamptz,
  ADD COLUMN IF NOT EXISTS admin_boost integer DEFAULT 0 CHECK (admin_boost BETWEEN 0 AND 100),
  ADD COLUMN IF NOT EXISTS pinned_position integer,
  ADD COLUMN IF NOT EXISTS pinned_category text,
  ADD COLUMN IF NOT EXISTS admin_flag_reason text,
  ADD COLUMN IF NOT EXISTS admin_reviewed_by uuid REFERENCES profiles(id),
  ADD COLUMN IF NOT EXISTS admin_reviewed_at timestamptz;
```

**Listing detail page — `/admin/listings/[id]`:**

- Full listing preview (same as public view, but in admin chrome)
- All images with AI fraud flag status per image
- Edit any field inline (admin-only form)
- Seller info card with quick link to user detail
- View count, offer count, favorite count, watch count
- Action panel: all row actions plus internal admin notes field
- Audit log for this listing (all admin actions taken on it)

### 2. AI Fraud Review Queue

Within the Listing Management page, add a **"Fraud Queue" sub-tab:**

- Shows all listings where `ai_fraud_flagged = true` and not yet reviewed
- Each card shows: listing thumbnail, fraud reason returned by Claude, seller info
- Actions per card:
  - **Clear** — mark as false positive (`ai_fraud_flagged = false`, `admin_reviewed = true`)
  - **Flag & Notify** — set status to `flagged`, send email to seller explaining the issue
  - **Delete** — remove listing entirely
- Counter badge on "Listings" nav item showing pending fraud queue count

### 3. SOS Monitor — `/admin/sos`

Full visibility into the SOS broadcast system.

**SOS table (paginated):**

Columns: Equipment (subcategory) | Brand/Model | Urgency | Requester | Responders notified | Responses received | Status | Created | Expires | Actions

**Status badges:**
- `open` → pulsing orange (matches the FAB style)
- `fulfilled` → green
- `expired` → gray
- `cancelled` → gray

**Filters:**
- Status: all / open / fulfilled / expired / cancelled
- Urgency: all / critical / urgent / normal
- Subcategory (cascade taxonomy picker)
- Date range
- No responders found: boolean filter (SOSs that went unanswered)

**SOS detail panel (slide-in drawer, not new page):**
- Full SOS details: equipment, description, location, urgency, expiration
- Requester info card (link to user detail)
- Map showing requester location and search radius (Leaflet, reuse existing map component)
- Responders list: who was notified, who responded, response details (price, condition, lead time)
- Admin actions:
  - Extend expiration
  - Manually notify additional users (search by taxonomy/location)
  - Close/cancel SOS
  - Mark as fulfilled (admin override)
  - Flag as abuse

**SOS Analytics strip (top of page):**
```
┌────────────┐ ┌────────────┐ ┌────────────┐ ┌────────────┐
│  📡  34    │ │  ✅  128   │ │  ⏱  18h   │ │  💀  7    │
│  Open SOSs │ │  Fulfilled │ │  Avg resp. │ │  No match │
│  right now │ │  all time  │ │  time      │ │  this week│
└────────────┘ └────────────┘ └────────────┘ └────────────┘
```
- "No match" = SOSs with 0 responders found — highlights taxonomy gaps to fill

**SOS Routing Debug Tool (superadmin only):**
- Input: select any taxonomy subcategory + enter a location
- Output: shows exactly which users would be notified and why (their equipment interests, radius, tier)
- Useful for debugging why certain SOSs aren't reaching the right people

### 4. Moderation Queue — `/admin/moderation`

Consolidates all flagged content needing human review.

**Three sub-tabs:**

**Tab 1 — Reported Listings/Users:**
- All rows from `reports` table with `status = 'pending'`
- Columns: Type (listing/user) | Target | Reporter | Reason | Date
- Actions: Resolve (no action), Warn user, Remove content, Ban user

**Tab 2 — AI Fraud Queue:**
- Mirror of the fraud queue from the Listings page (same component, reused)

**Tab 3 — Review & Rating Disputes:**
- Reviews flagged as inappropriate
- Actions: Keep, Remove, Warn reviewer

**Moderation stats header:**
```
Pending reports: 12   AI fraud queue: 4   Review disputes: 1   Total: 17
```

All moderation actions write to `admin_audit_log`. Resolved items move to a "Resolved" archive tab.

---

## Search Relevance Update

Now that `admin_boost` exists, update the main listings search query to factor it in:

```sql
-- In the search server action, update ORDER BY:
ORDER BY (
  ts_rank(search_vector, query) * 100 +  -- full text relevance
  admin_boost +                           -- admin-set boost (0-100)
  CASE subscription_tier                  -- subscription tier weight
    WHEN 'boost' THEN 15
    WHEN 'premium' THEN 7
    ELSE 0
  END +
  CASE WHEN is_featured THEN 20 ELSE 0 END  -- featured listings
) DESC
```

---

## Commit & Deploy
- Commit: `feat: admin listing management, fraud queue, SOS monitor, moderation queue`
- Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
- Push + Vercel deploy

---

## Next Prompt
Prompt 12-1 builds the Priority Engine (self-serve paid boosts + admin override) and Financial Dashboard.
