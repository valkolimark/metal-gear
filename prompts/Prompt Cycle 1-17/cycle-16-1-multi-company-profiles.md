# Cycle 16-1 — Multi-Company Profiles

## Context
Metal Gear is a Next.js 15 B2B industrial equipment marketplace. The current data model is 1 user = 1 company identity. We're splitting this into a proper multi-company architecture before adding any more features, because nearly everything downstream depends on this structure being correct.

---

## Decisions Locked

| Decision | Answer |
|----------|--------|
| Subscriptions per user or company? | **Per company** — each company pays separately, gets its own tier benefits |
| Individual accounts allowed? | **No** — company profile is mandatory. This is B2B. |
| Display name on posts/messages | User can choose real name, username, or company name **per post**. Listings always show company. |
| Superadmin create company | Yes — no Stripe charge, no webhook, `created_by_admin = true`, full tier benefits |
| Team/member invites | **Later cycle** — design schema for it now, don't implement invite flow yet |
| Seat pricing (design only, implement later) | Premium/Boost: +$25/mo per seat, yearly +$20/mo (20% off), Enterprise: ~$15/mo |
| Reply thread display name | Lock to whatever the opening message used — prevent mid-thread identity switching |

---

## Mental Model
Think Slack workspaces. One login → multiple companies → switch via avatar menu. Every piece of content (listings, SOS, reviews, transactions, messages) belongs to a **company**, not a user. Users have *membership* in companies with a role.

---

## New Schema

### New Tables

```sql
-- Company identity (replaces the "company" half of current profiles)
CREATE TABLE company_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL, -- for /sellers/[slug] URLs
  logo_url TEXT,
  banner_url TEXT,
  tagline TEXT,
  bio TEXT,
  website TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  country TEXT DEFAULT 'US',
  industry TEXT[], -- from existing industry constants
  equipment_specialties TEXT[], -- tier2 taxonomy values
  
  -- Verification (moved from profiles)
  is_verified BOOLEAN DEFAULT false,
  verified_at TIMESTAMPTZ,
  verified_by UUID REFERENCES auth.users(id),
  trust_score INTEGER DEFAULT 0 CHECK (trust_score BETWEEN 0 AND 100),
  
  -- Admin-granted access (no Stripe)
  created_by_admin BOOLEAN DEFAULT false,
  admin_granted_tier TEXT, -- 'free' | 'premium' | 'boost' | 'enterprise'
  admin_granted_by UUID REFERENCES auth.users(id),
  admin_granted_at TIMESTAMPTZ,
  
  -- Seat tracking (for future billing)
  seat_count INTEGER DEFAULT 1,
  max_seats INTEGER DEFAULT 1, -- set by tier
  
  -- Stripe (per company, not per user)
  stripe_customer_id TEXT UNIQUE,
  
  -- Priority (moved from profiles)
  priority_tier TEXT DEFAULT 'standard', -- standard/preferred/featured/platinum
  priority_score INTEGER DEFAULT 0 CHECK (priority_score BETWEEN 0 AND 1000),
  
  -- Referral
  referral_code TEXT UNIQUE,
  
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- User ↔ Company membership
CREATE TABLE company_memberships (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner', -- 'owner' | 'admin' | 'member'
  is_active BOOLEAN DEFAULT true,
  invited_by UUID REFERENCES auth.users(id),
  joined_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, company_id)
);

CREATE INDEX idx_memberships_user ON company_memberships(user_id);
CREATE INDEX idx_memberships_company ON company_memberships(company_id);
```

### Modify Existing Tables

```sql
-- Add company_id to all content tables
ALTER TABLE listings ADD COLUMN company_id UUID REFERENCES company_profiles(id);
ALTER TABLE sos_requests ADD COLUMN company_id UUID REFERENCES company_profiles(id);
ALTER TABLE seller_storefronts ADD COLUMN company_id UUID REFERENCES company_profiles(id);
ALTER TABLE reviews ADD COLUMN company_id UUID REFERENCES company_profiles(id);
ALTER TABLE boost_purchases ADD COLUMN company_id UUID REFERENCES company_profiles(id);
ALTER TABLE seller_verifications ADD COLUMN company_id UUID REFERENCES company_profiles(id);
ALTER TABLE seller_demand_insights ADD COLUMN company_id UUID REFERENCES company_profiles(id);
ALTER TABLE churn_risk ADD COLUMN company_id UUID REFERENCES company_profiles(id);

-- Add display_as to messages
ALTER TABLE messages ADD COLUMN display_as TEXT DEFAULT 'company'; 
-- 'real_name' | 'username' | 'company'

-- Add conversation-level lock so thread is consistent
ALTER TABLE conversations ADD COLUMN initiator_display_as TEXT DEFAULT 'company';

-- Subscriptions move to company
ALTER TABLE subscriptions ADD COLUMN company_id UUID REFERENCES company_profiles(id);

-- Indexes
CREATE INDEX idx_listings_company ON listings(company_id);
CREATE INDEX idx_sos_company ON sos_requests(company_id);
```

### Data Migration

```sql
-- For each existing profile, create a company_profile and membership
-- Run as a migration script, not a raw SQL migration

-- 1. INSERT INTO company_profiles for each profile that has a company name
-- 2. INSERT INTO company_memberships (user_id, company_id, role='owner')
-- 3. UPDATE listings SET company_id = (lookup from memberships)
-- 4. UPDATE sos_requests similarly
-- 5. UPDATE subscriptions SET company_id = company from membership
```

---

## Zustand Auth Store Changes

`src/lib/stores/auth.ts` — add active company state:

```typescript
interface AuthStore {
  // existing...
  user: User | null
  profile: UserProfile | null
  
  // NEW
  activeCompany: CompanyProfile | null
  userCompanies: CompanyMembership[] // all companies user belongs to
  activeRole: 'owner' | 'admin' | 'member' | null
  
  // Actions
  setActiveCompany: (company: CompanyProfile) => void
  switchCompany: (companyId: string) => Promise<void>
  // switchCompany: updates activeCompany, activeRole, invalidates TanStack Query cache
}
```

`activeCompany` persists in localStorage so the user lands on the same company after refresh.

---

## UI Components

### Company Switcher (nav avatar menu)
Location: wherever the current avatar dropdown renders in the nav

```
[Avatar] ▾
├── Centrifuge World          ← active, checkmark
├── Mixer Works
├── Gear World  
├── G-Force Machine
├── ─────────────────
├── + Add Company
└── Account Settings
```

- Clicking a company calls `switchCompany(id)` → updates store → refreshes page data
- "Add Company" → `/company/new` — create new company profile
- Show company logo (small) next to name if set
- Active company has a checkmark and bold name

### Company Profile Pages
- `/company/new` — create company wizard (name, industry, equipment specialties)
- `/company/[slug]/settings` — edit company profile, logo, bio, specialties
- `/sellers/[slug]` — public storefront (was `/sellers/[userId]`)

### Listings Display Name
On listing creation and message compose, show a small toggle:

```
Listing as: [Centrifuge World ▾]  ← dropdown: real name | username | company
```
Listings: always locked to company (no toggle shown).
Messages: show toggle, default to active company.

---

## Server Actions to Create/Modify

### New: `src/app/actions/company.ts`
```typescript
// createCompany(data): Promise<CompanyProfile>
// updateCompany(companyId, data): Promise<CompanyProfile>
// getUserCompanies(userId): Promise<CompanyMembership[]>
// switchActiveCompany(companyId): Promise<CompanyProfile>
// getCompanyBySlug(slug): Promise<CompanyProfile>
// adminCreateCompany(userId, data, tier): Promise<CompanyProfile>
//   → sets created_by_admin=true, skips Stripe, assigns tier
// adminGrantTier(companyId, tier, adminId): Promise<void>
```

### Modify: `src/app/actions/tier.ts`
- All tier checks now look at `company.admin_granted_tier` OR active subscription on `subscriptions.company_id`
- `getTierLimits(companyId)` instead of `getTierLimits(userId)`

### Modify: `src/app/(main)/listings/new/actions.ts`
- `createListing()` requires `company_id` from active company in store
- Never uses `user_id` as the owner

### Modify: `src/app/actions/sos.ts`
- `createSOSRequest()` attaches `company_id`

---

## Admin: Create Company for User

Location: `/admin/users/[id]` user detail page

Add "Create Company Profile" button → modal:
- Company name (required)
- Industry (multi-select)
- Assign tier: Free / Premium / Boost / Enterprise
- Internal notes

On submit:
- INSERT into `company_profiles` with `created_by_admin=true`, `admin_granted_tier`
- INSERT into `company_memberships` (user, company, role='owner')
- Log to `admin_audit_log`
- No Stripe call, no webhook

Admin can also view all companies a user belongs to on their detail page.

---

## RLS Policies

```sql
-- company_profiles: public read, members can update
CREATE POLICY "Public can view company profiles"
  ON company_profiles FOR SELECT USING (true);

CREATE POLICY "Company members can update"
  ON company_profiles FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM company_memberships
      WHERE company_id = id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
      AND is_active = true
    )
  );

-- company_memberships: users see their own
CREATE POLICY "Users see own memberships"
  ON company_memberships FOR SELECT
  USING (user_id = auth.uid());
```

---

## Implementation Sequence

| Step | What | Notes |
|------|------|-------|
| 1 | Schema migration + data migration script | Dry-run first |
| 2 | `company.ts` server actions | Full CRUD |
| 3 | Zustand store update + `switchCompany()` | With localStorage persist |
| 4 | Company switcher in nav | Avatar dropdown |
| 5 | Tier checks → company-based | Update `tier.ts` |
| 6 | Listings + SOS → `company_id` | All server actions |
| 7 | `/sellers/[slug]` → company storefronts | Update routing |
| 8 | Subscriptions → attach to company | Stripe customer per company |
| 9 | Superadmin: create company for user | User detail page |
| 10 | `display_as` on messages | Default: company |
| 11 | `/company/new` + `/company/[slug]/settings` | Company management pages |

Team invites, seat billing → **Cycle 17**.
Global cross-company dashboard → **Cycle 17**.

---

## Edge Cases & Validation
- User with no company → force to `/company/new` before accessing any protected route (middleware)
- Deleting a company → soft delete only, listings go to `archived` status
- Transferring company ownership → admin action only (for now)
- Slug generation → auto from company name, enforce uniqueness, allow edit once
- Stripe customer already exists on old user profile → migrate to company on first subscription action
- If `admin_granted_tier` is set, it takes precedence over Stripe subscription tier

---

## Success Criteria
- User can create multiple company profiles under one login
- Switching companies updates all listings, SOS, and analytics to that company's data
- Listings always display company name, never personal name
- Messages default to company display name, user can switch per message
- Superadmin can create a company for any user with no Stripe interaction
- All existing users migrated with one default company — zero disruption
- `/sellers/[slug]` public storefronts working per company

---

## Commit Message
```
feat: multi-company profiles architecture

- company_profiles and company_memberships tables
- Mandatory company profile for all users (B2B)
- Active company context in Zustand auth store with localStorage persist
- Company switcher in nav avatar menu
- All listings, SOS, reviews, subscriptions attach to company_id
- display_as on messages (real_name | username | company)
- Superadmin: create company for user, assign tier, no Stripe charge
- /sellers/[slug] company storefronts
- Data migration for all existing users

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
