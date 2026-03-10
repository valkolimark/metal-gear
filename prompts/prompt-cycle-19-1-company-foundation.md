# Cycle 19-1 — Multi-Company Profiles: Foundation

## Objective

Split the current 1-user → 1-company architecture into a proper multi-tenant model. One user can belong to multiple companies and switch between them. All marketplace activity (listings, SOS, subscriptions, storefronts) is scoped to the **active company**, not the individual user.

This prompt covers everything below the UI: database schema, data migration, TypeScript types, server actions, Zustand store update, and company context plumbing. Cycle 19-2 covers the UI.

**This is the most critical migration in the project. Follow the order exactly. Do not skip the migration steps.**

---

## Architecture Overview

### Two axes of identity

| Layer | What it represents | Where stored |
|-------|--------------------|--------------|
| `profiles` | The human — login, personal settings | `profiles` table |
| `company_profiles` | The business entity — listings, subscriptions, storefront | `company_profiles` table |
| `company_memberships` | Junction: which humans belong to which companies, with roles | `company_memberships` table |

### Active company context

The "active company" is which company the user is currently acting as. It needs to be available in three places:

| Layer | Storage | Purpose |
|-------|---------|---------|
| Server (SSR) | `active_company_id` cookie | Root layout, Server Components, server actions |
| Client | Zustand `auth` store | Client components, instant switching |
| Persistent | `profiles.active_company_id` column | Remembered across devices/sessions |

### What moves to company scope

| Feature | Before | After |
|---------|--------|-------|
| Subscriptions | `subscriptions.user_id` | `subscriptions.company_id` (+ keep `user_id` as payer) |
| Listings | `listings.user_id` (seller) | `listings.company_id` (seller company) |
| Seller storefront | `seller_storefronts.user_id` | `seller_storefronts.company_id` |
| Tier limits | Per user | Per company |
| SOS broadcasts | Per user | Per company |

### What stays on user scope

- Auth (login, password, OAuth) — always personal
- Reviews left by a user — `reviewer_id` stays user
- Messages — personal
- Favorites / saved collections — personal
- Admin roles — personal

---

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | `src/types/company.ts` — TypeScript types |
| Create | `src/app/actions/company.ts` — company CRUD server actions |
| Create | `src/app/actions/company-context.ts` — active company switching |
| Modify | `src/lib/stores/auth-store.ts` — add company fields |
| Modify | `src/app/actions/tier.ts` — scope tier checks to company |
| Modify | `src/lib/media.ts` — add company logo/banner upload functions |
| Modify | `src/middleware.ts` — company guard after auth guard |
| Create | `scripts/migrate-companies.ts` — one-time migration script |

---

## 1. Database Schema

Run all migrations via Supabase Management API in the exact order listed below. Each is idempotent (uses `IF NOT EXISTS` / `IF NOT EXISTS`).

### Migration 1 — Create `company_profiles` table

```sql
CREATE TABLE IF NOT EXISTS company_profiles (
  id                UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name              TEXT        NOT NULL,
  slug              TEXT        UNIQUE NOT NULL,
  logo_url          TEXT,
  banner_url        TEXT,
  tagline           TEXT,
  description       TEXT,
  website           TEXT,
  phone             TEXT,
  industry          TEXT,
  company_size      TEXT        CHECK (company_size IN ('1-10','11-50','51-200','201-500','500+')),
  address_line1     TEXT,
  address_line2     TEXT,
  city              TEXT,
  state             TEXT,
  zip               TEXT,
  country           TEXT        NOT NULL DEFAULT 'US',
  is_verified       BOOLEAN     NOT NULL DEFAULT FALSE,
  verified_at       TIMESTAMPTZ,
  verified_by       UUID        REFERENCES profiles(id),
  is_suspended      BOOLEAN     NOT NULL DEFAULT FALSE,
  created_by        UUID        NOT NULL REFERENCES profiles(id),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Slug must be lowercase alphanumeric + hyphens
ALTER TABLE company_profiles
  ADD CONSTRAINT company_profiles_slug_format
  CHECK (slug ~ '^[a-z0-9][a-z0-9\-]{1,62}[a-z0-9]$');

-- Indexes
CREATE INDEX IF NOT EXISTS idx_company_profiles_slug       ON company_profiles(slug);
CREATE INDEX IF NOT EXISTS idx_company_profiles_created_by ON company_profiles(created_by);
CREATE INDEX IF NOT EXISTS idx_company_profiles_is_verified ON company_profiles(is_verified);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_company_profiles_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER company_profiles_updated_at
  BEFORE UPDATE ON company_profiles
  FOR EACH ROW EXECUTE FUNCTION update_company_profiles_updated_at();
```

### Migration 2 — Create `company_memberships` table

```sql
CREATE TYPE IF NOT EXISTS company_role AS ENUM ('owner', 'admin', 'member');

CREATE TABLE IF NOT EXISTS company_memberships (
  id           UUID              PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   UUID              NOT NULL REFERENCES company_profiles(id) ON DELETE CASCADE,
  user_id      UUID              NOT NULL REFERENCES profiles(id)         ON DELETE CASCADE,
  role         company_role      NOT NULL DEFAULT 'member',
  invited_by   UUID              REFERENCES profiles(id),
  joined_at    TIMESTAMPTZ       NOT NULL DEFAULT NOW(),
  is_active    BOOLEAN           NOT NULL DEFAULT TRUE,
  UNIQUE(company_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_company_memberships_user    ON company_memberships(user_id);
CREATE INDEX IF NOT EXISTS idx_company_memberships_company ON company_memberships(company_id);
CREATE INDEX IF NOT EXISTS idx_company_memberships_active  ON company_memberships(user_id, is_active);
```

### Migration 3 — Add company context to `profiles`

```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS active_company_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_profiles_active_company ON profiles(active_company_id);
```

### Migration 4 — Add `company_id` to `subscriptions`

```sql
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_subscriptions_company ON subscriptions(company_id);
```

Note: `user_id` stays on `subscriptions` — it identifies the Stripe customer (billing entity). `company_id` identifies which company has this subscription.

### Migration 5 — Add `company_id` to `listings`

```sql
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS company_id            UUID REFERENCES company_profiles(id) ON DELETE SET NULL;
ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS display_name_override TEXT;

-- display_name_override: when set, shown on listing instead of company name
-- Allows "Acting as: Acme Corp" with override "John's Equipment Division"

CREATE INDEX IF NOT EXISTS idx_listings_company ON listings(company_id);
```

### Migration 6 — Add `company_id` to `seller_storefronts`

```sql
ALTER TABLE seller_storefronts
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_seller_storefronts_company ON seller_storefronts(company_id);
```

### Migration 7 — Add `company_id` to `sos_requests`

```sql
ALTER TABLE sos_requests
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES company_profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sos_requests_company ON sos_requests(company_id);
```

### Migration 8 — RLS Policies

```sql
-- company_profiles: anyone can read; members can update; only owner/admin
ALTER TABLE company_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_profiles_read_all"
  ON company_profiles FOR SELECT USING (true);

CREATE POLICY "company_profiles_insert_authenticated"
  ON company_profiles FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "company_profiles_update_by_member"
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

-- company_memberships: members can read their own; owner/admin can manage
ALTER TABLE company_memberships ENABLE ROW LEVEL SECURITY;

CREATE POLICY "company_memberships_read_own"
  ON company_memberships FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "company_memberships_read_by_company_member"
  ON company_memberships FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM company_memberships cm
      WHERE cm.company_id = company_id
        AND cm.user_id = auth.uid()
        AND cm.is_active = true
    )
  );

CREATE POLICY "company_memberships_insert_by_owner_admin"
  ON company_memberships FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM company_memberships cm
      WHERE cm.company_id = company_id
        AND cm.user_id = auth.uid()
        AND cm.role IN ('owner', 'admin')
        AND cm.is_active = true
    )
  );
```

---

## 2. TypeScript Types

**File:** `src/types/company.ts`

```ts
export type CompanyRole = 'owner' | 'admin' | 'member'
export type CompanySize = '1-10' | '11-50' | '51-200' | '201-500' | '500+'

export interface CompanyProfile {
  id: string
  name: string
  slug: string
  logo_url: string | null
  banner_url: string | null
  tagline: string | null
  description: string | null
  website: string | null
  phone: string | null
  industry: string | null
  company_size: CompanySize | null
  address_line1: string | null
  address_line2: string | null
  city: string | null
  state: string | null
  zip: string | null
  country: string
  is_verified: boolean
  verified_at: string | null
  is_suspended: boolean
  created_by: string
  created_at: string
  updated_at: string
}

export interface CompanyMembership {
  id: string
  company_id: string
  user_id: string
  role: CompanyRole
  invited_by: string | null
  joined_at: string
  is_active: boolean
  // Joined fields
  company?: CompanyProfile
}

export interface CompanyWithRole extends CompanyProfile {
  role: CompanyRole
  membership_id: string
}

export interface CompanyWithMembers extends CompanyProfile {
  members: Array<{
    membership_id: string
    user_id: string
    role: CompanyRole
    joined_at: string
    full_name: string | null
    avatar_url: string | null
    email: string | null
  }>
}
```

---

## 3. Migration Script

**File:** `scripts/migrate-companies.ts`

This script runs **once** to backfill `company_profiles` and `company_memberships` from existing `user_business_profiles` data, then links `listings`, `subscriptions`, `seller_storefronts`, and `sos_requests` to their new company records.

```ts
/**
 * One-time migration: create company_profiles from user_business_profiles
 *
 * Run: npx ts-node --project tsconfig.scripts.json scripts/migrate-companies.ts
 * Flags:
 *   --dry-run      Print what would happen, no writes
 *   --limit=N      Only process first N users (for testing)
 *   --user-id=X    Migrate a single user only
 */

import { createClient } from '@supabase/supabase-js'
import { randomUUID } from 'crypto'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const args = process.argv.slice(2)
const DRY_RUN    = args.includes('--dry-run')
const LIMIT      = parseInt(args.find(a => a.startsWith('--limit='))?.split('=')[1] ?? '99999')
const ONLY_USER  = args.find(a => a.startsWith('--user-id='))?.split('=')[1]

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 63) || 'company'
}

async function uniqueSlug(base: string): Promise<string> {
  let slug = base
  let attempt = 0
  while (true) {
    const { data } = await supabase
      .from('company_profiles')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!data) return slug
    attempt++
    slug = `${base}-${attempt}`
  }
}

async function main() {
  console.log(`\n🏭 Metal Gear — Company Migration ${DRY_RUN ? '[DRY RUN]' : '[LIVE]'}\n`)

  // Fetch all users with business profiles
  let query = supabase
    .from('profiles')
    .select(`
      id,
      full_name,
      active_company_id,
      user_business_profiles (
        company_name,
        industry,
        company_size,
        website,
        phone,
        city,
        state
      )
    `)
    .order('created_at', { ascending: true })
    .limit(LIMIT)

  if (ONLY_USER) query = query.eq('id', ONLY_USER)

  const { data: users, error } = await query
  if (error) throw error

  console.log(`Found ${users?.length ?? 0} users to process\n`)

  let created = 0, skipped = 0, failed = 0

  for (const user of users ?? []) {
    // Skip if already has a company (re-run safe)
    const { data: existing } = await supabase
      .from('company_memberships')
      .select('id')
      .eq('user_id', user.id)
      .limit(1)
      .maybeSingle()

    if (existing) {
      skipped++
      console.log(`  ⏭  ${user.full_name ?? user.id} — already has company, skipping`)
      continue
    }

    // Build company name from business profile or fall back to personal name
    const bp = (user as any).user_business_profiles?.[0]
    const companyName = bp?.company_name
      || (user.full_name ? `${user.full_name}'s Company` : 'My Company')

    const slug = await uniqueSlug(slugify(companyName))

    const companyData = {
      id:           randomUUID(),
      name:         companyName,
      slug,
      industry:     bp?.industry     ?? null,
      company_size: bp?.company_size ?? null,
      website:      bp?.website      ?? null,
      phone:        bp?.phone        ?? null,
      city:         bp?.city         ?? null,
      state:        bp?.state        ?? null,
      country:      'US',
      created_by:   user.id,
    }

    console.log(`  → Creating company "${companyName}" (${slug}) for user ${user.id}`)
    if (!DRY_RUN) {
      const { error: cpError } = await supabase
        .from('company_profiles')
        .insert(companyData)
      if (cpError) { console.error(`     ❌ company_profiles insert:`, cpError.message); failed++; continue }

      // Create owner membership
      const { error: cmError } = await supabase
        .from('company_memberships')
        .insert({ company_id: companyData.id, user_id: user.id, role: 'owner' })
      if (cmError) { console.error(`     ❌ company_memberships insert:`, cmError.message); failed++; continue }

      // Set active_company_id on profile
      await supabase
        .from('profiles')
        .update({ active_company_id: companyData.id })
        .eq('id', user.id)

      // Backfill listings
      const { count: lc } = await supabase
        .from('listings')
        .update({ company_id: companyData.id })
        .eq('user_id', user.id)
        .is('company_id', null)
        .select('id', { count: 'exact', head: true })
      console.log(`     ✅ linked ${lc ?? 0} listings`)

      // Backfill subscriptions
      await supabase
        .from('subscriptions')
        .update({ company_id: companyData.id })
        .eq('user_id', user.id)
        .is('company_id', null)

      // Backfill seller_storefronts
      await supabase
        .from('seller_storefronts')
        .update({ company_id: companyData.id })
        .eq('user_id', user.id)
        .is('company_id', null)

      // Backfill sos_requests
      await supabase
        .from('sos_requests')
        .update({ company_id: companyData.id })
        .eq('user_id', user.id)
        .is('company_id', null)

      created++
    } else {
      console.log(`     [dry] would create + link listings/subscriptions/storefronts/sos`)
      created++
    }
  }

  console.log(`\n✅ Done. Created: ${created} | Skipped: ${skipped} | Failed: ${failed}\n`)
}

main().catch(e => { console.error(e); process.exit(1) })
```

**Run order:**
1. `npx ts-node scripts/migrate-companies.ts --dry-run` — review output
2. `npx ts-node scripts/migrate-companies.ts --limit=5` — test on 5 users
3. `npx ts-node scripts/migrate-companies.ts` — full migration
4. Verify in Supabase dashboard before proceeding

---

## 4. Company Server Actions

**File:** `src/app/actions/company.ts`

```ts
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import type { CompanyProfile, CompanyWithRole, CompanyWithMembers } from '@/types/company'

// ─── Read ─────────────────────────────────────────────────────────

/** Get all companies the current user belongs to, with their role */
export async function getUserCompanies(userId: string): Promise<CompanyWithRole[]> {
  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('company_memberships')
    .select(`
      id,
      role,
      company_profiles (*)
    `)
    .eq('user_id', userId)
    .eq('is_active', true)
    .order('joined_at', { ascending: true })

  if (error || !data) return []

  return data
    .filter(m => m.company_profiles)
    .map(m => ({
      ...(m.company_profiles as CompanyProfile),
      role: m.role as any,
      membership_id: m.id,
    }))
}

/** Get a company by slug (public) */
export async function getCompanyBySlug(slug: string): Promise<CompanyProfile | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('slug', slug)
    .single()
  return data ?? null
}

/** Get a company by id */
export async function getCompanyById(id: string): Promise<CompanyProfile | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('id', id)
    .single()
  return data ?? null
}

/** Get company with members list (for settings page) */
export async function getCompanyWithMembers(companyId: string): Promise<CompanyWithMembers | null> {
  const supabase = createAdminClient()
  const { data: company } = await supabase
    .from('company_profiles')
    .select('*')
    .eq('id', companyId)
    .single()
  if (!company) return null

  const { data: memberships } = await supabase
    .from('company_memberships')
    .select(`
      id,
      user_id,
      role,
      joined_at,
      profiles ( full_name, avatar_url, email )
    `)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('joined_at', { ascending: true })

  return {
    ...company,
    members: (memberships ?? []).map(m => ({
      membership_id: m.id,
      user_id: m.user_id,
      role: m.role as any,
      joined_at: m.joined_at,
      full_name:  (m.profiles as any)?.full_name  ?? null,
      avatar_url: (m.profiles as any)?.avatar_url ?? null,
      email:      (m.profiles as any)?.email      ?? null,
    })),
  }
}

// ─── Create ───────────────────────────────────────────────────────

export interface CreateCompanyInput {
  name: string
  industry?: string
  company_size?: string
  website?: string
  phone?: string
  city?: string
  state?: string
  tagline?: string
  description?: string
}

export async function createCompany(
  userId: string,
  input: CreateCompanyInput
): Promise<{ success: boolean; company?: CompanyProfile; error?: string }> {
  const supabase = createAdminClient()

  // Generate unique slug
  const base = input.name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 50) || 'company'

  let slug = base
  let attempt = 0
  while (true) {
    const { data: existing } = await supabase
      .from('company_profiles')
      .select('id')
      .eq('slug', slug)
      .maybeSingle()
    if (!existing) break
    slug = `${base}-${++attempt}`
  }

  const { data: company, error } = await supabase
    .from('company_profiles')
    .insert({ ...input, slug, created_by: userId })
    .select()
    .single()

  if (error || !company) {
    return { success: false, error: error?.message ?? 'Failed to create company' }
  }

  // Create owner membership
  await supabase.from('company_memberships').insert({
    company_id: company.id,
    user_id: userId,
    role: 'owner',
  })

  // Set as active company on profile
  await supabase
    .from('profiles')
    .update({ active_company_id: company.id })
    .eq('id', userId)

  // Set active_company_id cookie
  const cookieStore = await cookies()
  cookieStore.set('active_company_id', company.id, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  revalidatePath('/', 'layout')
  return { success: true, company }
}

// ─── Update ───────────────────────────────────────────────────────

export type UpdateCompanyInput = Partial<Omit<
  CompanyProfile,
  'id' | 'slug' | 'created_by' | 'created_at' | 'updated_at' | 'is_verified' | 'verified_at' | 'is_suspended'
>>

export async function updateCompany(
  companyId: string,
  userId: string,
  input: UpdateCompanyInput
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Verify user is owner or admin
  const { data: membership } = await supabase
    .from('company_memberships')
    .select('role')
    .eq('company_id', companyId)
    .eq('user_id', userId)
    .eq('is_active', true)
    .single()

  if (!membership || !['owner', 'admin'].includes(membership.role)) {
    return { success: false, error: 'Insufficient permissions' }
  }

  const { error } = await supabase
    .from('company_profiles')
    .update(input)
    .eq('id', companyId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/settings/company')
  revalidatePath(`/companies/${companyId}`)
  return { success: true }
}
```

---

## 5. Company Context Server Action

**File:** `src/app/actions/company-context.ts`

```ts
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

/**
 * Switch the active company for a user.
 * Updates: cookie (SSR), profiles.active_company_id (persistent)
 * Zustand is updated client-side by the CompanySwitcher component.
 */
export async function switchActiveCompany(
  userId: string,
  companyId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createAdminClient()

  // Verify user actually belongs to this company
  const { data: membership } = await supabase
    .from('company_memberships')
    .select('id')
    .eq('user_id', userId)
    .eq('company_id', companyId)
    .eq('is_active', true)
    .single()

  if (!membership) {
    return { success: false, error: 'Not a member of this company' }
  }

  // Update persistent active company on profile
  await supabase
    .from('profiles')
    .update({ active_company_id: companyId })
    .eq('id', userId)

  // Update cookie for SSR
  const cookieStore = await cookies()
  cookieStore.set('active_company_id', companyId, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  revalidatePath('/', 'layout')
  return { success: true }
}

/**
 * Get active company ID for current request.
 * Cookie-first (fast), falls back to profiles table.
 */
export async function getActiveCompanyId(userId: string): Promise<string | null> {
  const cookieStore = await cookies()
  const cookieValue = cookieStore.get('active_company_id')?.value
  if (cookieValue) return cookieValue

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('active_company_id')
    .eq('id', userId)
    .single()

  return data?.active_company_id ?? null
}
```

---

## 6. Zustand Auth Store — Add Company Fields

**File:** `src/lib/stores/auth-store.ts`

Locate the existing auth store and add the following fields and actions. Do not remove any existing fields.

```ts
// Add to existing imports:
import type { CompanyProfile, CompanyWithRole } from '@/types/company'

// Add to existing store interface:
activeCompany: CompanyWithRole | null
userCompanies: CompanyWithRole[]
setActiveCompany: (company: CompanyWithRole | null) => void
setUserCompanies: (companies: CompanyWithRole[]) => void

// Add to existing store implementation:
activeCompany: null,
userCompanies: [],

setActiveCompany: (company) => {
  set({ activeCompany: company })
  // Sync cookie for SSR (client-side update for instant switching)
  if (typeof document !== 'undefined' && company) {
    document.cookie = `active_company_id=${company.id}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`
  }
},

setUserCompanies: (companies) => set({ userCompanies: companies }),
```

---

## 7. Update `src/app/actions/tier.ts` — Company-Scoped Tier Checks

The tier system currently checks `subscriptions` by `user_id`. Update all queries to check by `company_id` instead. The fallback (if no company_id match) checks `user_id` for backward compatibility during migration.

```ts
// Pattern to update in tier.ts:
// Before:
const { data } = await supabase
  .from('subscriptions')
  .select('plan, status')
  .eq('user_id', userId)
  .eq('status', 'active')
  .single()

// After (company-first, user fallback):
export async function getActiveTier(
  userId: string,
  companyId?: string | null
): Promise<SubscriptionTier> {
  const supabase = createAdminClient()

  // Try company subscription first
  if (companyId) {
    const { data } = await supabase
      .from('subscriptions')
      .select('plan, status')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .maybeSingle()
    if (data) return data.plan as SubscriptionTier
  }

  // Fallback to user subscription (backward compat during migration)
  const { data } = await supabase
    .from('subscriptions')
    .select('plan, status')
    .eq('user_id', userId)
    .eq('status', 'active')
    .maybeSingle()

  return (data?.plan as SubscriptionTier) ?? 'free'
}
```

Update all callers of the tier check in server actions to pass `companyId` from context.

---

## 8. Media Library — Company Logo/Banner

**File:** `src/lib/media.ts`

Add two new upload functions alongside existing ones:

```ts
export async function uploadCompanyLogo(
  companyId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const key = `companies/${companyId}/logo/${randomUUID()}.${ext}`
  return uploadToR2(key, file)
}

export async function uploadCompanyBanner(
  companyId: string,
  file: File
): Promise<string> {
  const ext = file.name.split('.').pop() ?? 'jpg'
  const key = `companies/${companyId}/banner/${randomUUID()}.${ext}`
  return uploadToR2(key, file)
}
```

---

## 9. Middleware — Company Guard

**File:** `src/middleware.ts`

After the existing auth guard (which redirects unauthenticated users to `/login`), add a company guard: if an authenticated user has **no company memberships**, redirect them to `/companies/new` to create their first company.

Exempt from the company guard:
- `/companies/new` — the page itself
- `/api/*` — API routes
- `/onboarding/*` — existing onboarding flow
- `/_next/*`, `/favicon.ico`, static assets

```ts
// In middleware, after auth check passes:
// Check if user needs to create a company
const companyGuardExempt = [
  '/companies/new',
  '/onboarding',
  '/api/',
  '/login',
  '/signup',
  '/pricing',
  '/about',
  '/terms',
  '/privacy',
]

const isExempt = companyGuardExempt.some(p => pathname.startsWith(p))

if (!isExempt && userId) {
  // Fast check: does the active_company_id cookie exist?
  const activeCompanyCookie = request.cookies.get('active_company_id')?.value
  if (!activeCompanyCookie) {
    // Slower check: does the user have any company membership?
    // Use Supabase admin client to check
    const supabase = createAdminClient()
    const { count } = await supabase
      .from('company_memberships')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('is_active', true)

    if ((count ?? 0) === 0) {
      return NextResponse.redirect(new URL('/companies/new', request.url))
    }
  }
}
```

**Performance note:** The company guard DB check only fires when the cookie is absent. After first company creation, the cookie is always present and the check is skipped. This keeps middleware fast.

---

## 10. Company Context in Root Layout

**File:** `src/app/(main)/layout.tsx`

Read active company server-side and pass to all child components. Extend the existing server-side data fetching:

```ts
import { getActiveCompanyId } from '@/app/actions/company-context'
import { getUserCompanies, getCompanyById } from '@/app/actions/company'

// In layout data fetching (alongside existing unread counts, subscription tier, etc.):
const activeCompanyId = await getActiveCompanyId(userId)
const userCompanies   = await getUserCompanies(userId)
const activeCompany   = userCompanies.find(c => c.id === activeCompanyId) ?? userCompanies[0] ?? null
```

Pass `activeCompany` and `userCompanies` as props to `MobileNavClient` (Cycle 18) and the new `CompanyContextProvider` (Cycle 19-2).

Update `MobileNavClient` props interface to include:
```ts
activeCompany: CompanyWithRole | null
userCompanies: CompanyWithRole[]
```

---

## Edge Cases & Validation

- **User with no business profile:** Migration script falls back to `"${full_name}'s Company"` as company name. Every user gets at least one company regardless.
- **Slug collision on migration:** `uniqueSlug()` function appends `-1`, `-2`, etc. until unique. Safe for any user count.
- **Re-running migration:** Script checks `company_memberships` for existing membership before creating. Fully idempotent — safe to run multiple times.
- **Backward compatibility:** `listings.user_id` stays populated. All existing code that queries `listings` by `user_id` continues to work. `company_id` is additive. Migration backfills both.
- **Subscription fallback:** `getActiveTier()` checks `company_id` first, falls back to `user_id`. During the post-migration window before Stripe subscriptions are re-linked, users retain their existing tier.
- **Active company = null:** If `active_company_id` cookie exists but references a deleted/suspended company, `userCompanies.find()` returns `undefined` and we fall back to `userCompanies[0]`. Handle this null case in all components that consume `activeCompany`.
- **RLS in production:** The new `company_profiles` and `company_memberships` tables use RLS. Server actions use `createAdminClient()` (service role key) which bypasses RLS — correct pattern. Client-side queries must never be used.
- **Cookie lifetime:** `active_company_id` cookie max-age is 1 year. On logout, clear this cookie alongside the auth cookie in the sign-out server action.
- **`tsconfig.scripts.json`:** If it doesn't exist, create it at root:
  ```json
  {
    "extends": "./tsconfig.json",
    "compilerOptions": {
      "module": "commonjs",
      "outDir": "./dist"
    },
    "include": ["scripts/**/*.ts", "src/**/*.ts"]
  }
  ```

---

## Success Criteria

- [ ] All 8 migrations run without error in Supabase
- [ ] `company_profiles` table exists with correct columns and constraints
- [ ] `company_memberships` table exists with UNIQUE(company_id, user_id)
- [ ] `profiles.active_company_id` column exists
- [ ] `subscriptions.company_id`, `listings.company_id`, `seller_storefronts.company_id`, `sos_requests.company_id` columns exist
- [ ] Migration script dry-run prints expected output for all existing users
- [ ] Migration script live run creates 1 company per existing user
- [ ] Every existing listing is linked to its owner's company_id
- [ ] Every existing subscription is linked to its owner's company_id
- [ ] `company.ts` server actions compile with no TypeScript errors
- [ ] `company-context.ts` server actions compile
- [ ] Zustand store compiles with new fields
- [ ] `tier.ts` updated with company-first checks, backward-compat fallback
- [ ] Middleware company guard redirects new users (no cookie) without membership to `/companies/new`
- [ ] Middleware guard is skipped when `active_company_id` cookie is present (fast path)
- [ ] `npm run typecheck` passes
- [ ] `npm run build` passes
- [ ] No existing functionality broken — listing pages, search, admin still work

---

## Commit Message

```
feat(cycle-19-1): multi-company foundation — schema, migration, actions, context

Database:
- company_profiles table (id, name, slug, logo_url, industry, size, location, etc.)
- company_memberships table (user_id, company_id, role: owner/admin/member)
- profiles.active_company_id FK for persistent active context
- listings.company_id, subscriptions.company_id, seller_storefronts.company_id,
  sos_requests.company_id, listings.display_name_override columns
- RLS policies on both new tables

Migration:
- scripts/migrate-companies.ts — idempotent, dry-run safe
- Creates 1 company per existing user from user_business_profiles data
- Backfills company_id on listings, subscriptions, storefronts, sos_requests
- Unique slug generation with collision handling

Server actions:
- src/app/actions/company.ts — getUserCompanies, getCompanyBySlug, getCompanyById,
  getCompanyWithMembers, createCompany, updateCompany
- src/app/actions/company-context.ts — switchActiveCompany, getActiveCompanyId

State:
- Zustand auth store: activeCompany, userCompanies, setActiveCompany, setUserCompanies
- active_company_id cookie (SSR + client sync)

Infrastructure:
- tier.ts: company-first subscription checks with user fallback
- media.ts: uploadCompanyLogo, uploadCompanyBanner
- middleware.ts: company guard → /companies/new if no membership + no cookie

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## Critical Rules

- All DB ops use server actions with `createAdminClient()` — never client-side Supabase
- Deploy via Vercel API curl:
  ```bash
  curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=team_9n9GosoaraicsoDdbAFgzr5j" \
    -H "Authorization: Bearer $VERCEL_TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"metal-gear","project":"prj_HQBv7jMhui6LGW5vzVC5pmCMndlx","gitSource":{"type":"github","ref":"main","org":"valkolimark","repo":"metal-gear"},"target":"production"}'
  ```
- After deploy: update `CHANGELOG.md`, update `README.md`, write `prompts/session-2026-03-09.md`
- **Do not deploy until Cycle 19-2 is also complete.** This prompt alone leaves the UI in an incomplete state (no company switcher, no create-company page). Deploy both together.
