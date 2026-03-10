# Cycle 19-2 — Multi-Company Profiles: UI

## Prerequisite

Cycle 19-1 must be complete and all migrations must have run successfully before starting this prompt. Verify:
- `company_profiles` table exists and is populated
- `company_memberships` table exists
- All existing users have at least one company (run migration script)
- `src/app/actions/company.ts` and `company-context.ts` are in place
- Zustand auth store has `activeCompany`, `userCompanies`, `setActiveCompany`

---

## Objective

Build all user-facing UI for the multi-company system:

1. **Company Switcher** — lives in desktop header and mobile drawer; shows active company, switches context
2. **Create Company page** (`/companies/new`) — first-run and add-company flow
3. **Company Settings pages** (`/settings/company`, `/settings/company/members`) — edit profile, view team
4. **Context Provider** — client component that hydrates Zustand from server-fetched data
5. **Display updates** — listings, storefronts, purchase panel, and dashboard all show company name/logo instead of (or alongside) user name

---

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | `src/components/company/CompanySwitcher.tsx` |
| Create | `src/components/company/CompanyContextProvider.tsx` |
| Create | `src/components/company/CompanyAvatar.tsx` |
| Create | `src/app/(main)/companies/new/page.tsx` |
| Create | `src/app/(main)/companies/new/CreateCompanyForm.tsx` |
| Create | `src/app/(main)/settings/company/page.tsx` |
| Create | `src/app/(main)/settings/company/CompanySettingsForm.tsx` |
| Create | `src/app/(main)/settings/company/members/page.tsx` |
| Modify | `src/app/(main)/layout.tsx` — render CompanyContextProvider + pass company data |
| Modify | `src/components/mobile-nav/MobileNavClient.tsx` — add company switcher to drawer |
| Modify | `src/components/mobile-nav/MobileMenuDrawer.tsx` — company switcher in profile section |
| Modify | `src/app/(main)/listings/[id]/components/ListingPurchasePanel.tsx` — show company name/logo |
| Modify | `src/app/(main)/sellers/[id]/page.tsx` — show company name on storefront |
| Modify | `src/app/(main)/dashboard/page.tsx` — show "Acting as: [Company]" context banner |
| Modify | `src/app/(main)/listings/new/page.tsx` — auto-set company_id on new listings |

---

## 1. `CompanyAvatar` Component

**File:** `src/components/company/CompanyAvatar.tsx`

Small reusable component. Shows company logo if available, falls back to first letter of company name in a colored square.

```tsx
'use client'

import Image from 'next/image'

interface CompanyAvatarProps {
  name: string
  logoUrl: string | null
  size?: number          // px, default 32
  className?: string
}

export function CompanyAvatar({ name, logoUrl, size = 32, className = '' }: CompanyAvatarProps) {
  const initials = name
    .split(' ')
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() ?? '')
    .join('')

  if (logoUrl) {
    return (
      <div
        className={`relative rounded-md overflow-hidden flex-shrink-0 ${className}`}
        style={{ width: size, height: size }}
      >
        <Image src={logoUrl} alt={name} fill className="object-contain" sizes={`${size}px`} />
      </div>
    )
  }

  return (
    <div
      className={`rounded-md flex items-center justify-center flex-shrink-0 
        bg-primary/15 text-primary font-bold font-['Chakra_Petch'] ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.38 }}
    >
      {initials}
    </div>
  )
}
```

---

## 2. `CompanyContextProvider` Component

**File:** `src/components/company/CompanyContextProvider.tsx`

Client component that hydrates Zustand with server-fetched company data. Renders nothing visible.

```tsx
'use client'

import { useEffect } from 'react'
import { useAuthStore } from '@/lib/stores/auth-store'
import type { CompanyWithRole } from '@/types/company'

interface CompanyContextProviderProps {
  activeCompany: CompanyWithRole | null
  userCompanies: CompanyWithRole[]
}

export function CompanyContextProvider({
  activeCompany,
  userCompanies,
}: CompanyContextProviderProps) {
  const { setActiveCompany, setUserCompanies } = useAuthStore()

  useEffect(() => {
    setUserCompanies(userCompanies)
    setActiveCompany(activeCompany)
  }, [activeCompany?.id, userCompanies.length])

  return null
}
```

---

## 3. `CompanySwitcher` Component

**File:** `src/components/company/CompanySwitcher.tsx`
`'use client'`

Dropdown that shows the active company and lists all user companies to switch between. Used in desktop header and mobile drawer.

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { useAuthStore } from '@/lib/stores/auth-store'
import { switchActiveCompany } from '@/app/actions/company-context'
import { CompanyAvatar } from './CompanyAvatar'
import { Check, ChevronDown, Plus, Building2 } from 'lucide-react'

interface CompanySwitcherProps {
  /** 'header' — compact, fits in nav bar. 'drawer' — full-width, in mobile drawer */
  variant?: 'header' | 'drawer'
}

export function CompanySwitcher({ variant = 'header' }: CompanySwitcherProps) {
  const { activeCompany, userCompanies, setActiveCompany } = useAuthStore()
  const [open, setOpen] = useState(false)
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  // Get user id from auth store
  const userId = useAuthStore(s => s.profile?.id ?? s.user?.id ?? '')

  const handleSwitch = (company: typeof activeCompany) => {
    if (!company || company.id === activeCompany?.id) { setOpen(false); return }
    startTransition(async () => {
      setActiveCompany(company)   // Optimistic update + cookie sync
      setOpen(false)
      await switchActiveCompany(userId, company.id)
      router.refresh()            // Re-run server components with new context
    })
  }

  if (!activeCompany) return null

  if (variant === 'drawer') {
    return (
      <div className="w-full">
        {/* Current company display */}
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-muted/50
            hover:bg-muted transition-colors"
        >
          <CompanyAvatar name={activeCompany.name} logoUrl={activeCompany.logo_url} size={40} />
          <div className="flex-1 text-left min-w-0">
            <div className="font-semibold text-sm text-foreground truncate">
              {activeCompany.name}
            </div>
            <div className="text-[11px] text-muted-foreground capitalize">
              {activeCompany.role} · {activeCompany.is_verified ? '✓ Verified' : 'Unverified'}
            </div>
          </div>
          <ChevronDown
            size={16}
            className={`text-muted-foreground transition-transform flex-shrink-0
              ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Company list */}
        {open && (
          <div className="mt-1 rounded-xl border border-border bg-card overflow-hidden">
            {userCompanies.map(company => (
              <button
                key={company.id}
                onClick={() => handleSwitch(company)}
                disabled={isPending}
                className="w-full flex items-center gap-3 px-3 py-2.5
                  hover:bg-muted/50 transition-colors text-left"
              >
                <CompanyAvatar name={company.name} logoUrl={company.logo_url} size={32} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{company.name}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">{company.role}</div>
                </div>
                {company.id === activeCompany.id && (
                  <Check size={14} className="text-primary flex-shrink-0" />
                )}
              </button>
            ))}

            {/* Divider + add company */}
            <div className="border-t border-border">
              <button
                onClick={() => { setOpen(false); router.push('/companies/new') }}
                className="w-full flex items-center gap-3 px-3 py-2.5
                  hover:bg-muted/50 transition-colors text-left"
              >
                <div className="w-8 h-8 rounded-md border-2 border-dashed border-border
                  flex items-center justify-center flex-shrink-0">
                  <Plus size={14} className="text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Add another company</span>
              </button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // variant === 'header' — compact pill for desktop nav
  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border
          text-sm font-medium transition-all
          ${open
            ? 'border-primary/50 bg-primary/5 text-foreground'
            : 'border-border bg-card text-foreground hover:border-primary/30'
          }`}
      >
        <CompanyAvatar name={activeCompany.name} logoUrl={activeCompany.logo_url} size={20} />
        <span className="max-w-[140px] truncate">{activeCompany.name}</span>
        <ChevronDown
          size={13}
          className={`text-muted-foreground transition-transform
            ${open ? 'rotate-180' : ''}`}
        />
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          {/* Dropdown */}
          <div className="absolute top-full mt-1.5 left-0 z-50 w-64 rounded-xl border
            border-border bg-card shadow-xl overflow-hidden">
            <div className="px-3 pt-3 pb-1">
              <p className="text-[10px] font-semibold uppercase tracking-widest
                text-muted-foreground">
                Your Companies
              </p>
            </div>
            {userCompanies.map(company => (
              <button
                key={company.id}
                onClick={() => handleSwitch(company)}
                disabled={isPending}
                className="w-full flex items-center gap-3 px-3 py-2.5
                  hover:bg-muted/50 transition-colors"
              >
                <CompanyAvatar name={company.name} logoUrl={company.logo_url} size={32} />
                <div className="flex-1 text-left min-w-0">
                  <div className="text-sm font-medium text-foreground truncate">{company.name}</div>
                  <div className="text-[10px] text-muted-foreground capitalize">{company.role}</div>
                </div>
                {company.id === activeCompany.id && (
                  <Check size={14} className="text-primary flex-shrink-0" />
                )}
              </button>
            ))}
            <div className="border-t border-border">
              <button
                onClick={() => { setOpen(false); router.push('/companies/new') }}
                className="w-full flex items-center gap-3 px-3 py-2.5
                  hover:bg-muted/50 transition-colors"
              >
                <div className="w-8 h-8 rounded-md border-2 border-dashed border-border
                  flex items-center justify-center flex-shrink-0">
                  <Plus size={14} className="text-muted-foreground" />
                </div>
                <span className="text-sm text-muted-foreground">Add another company</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
```

---

## 4. Create Company Page

### `src/app/(main)/companies/new/page.tsx`

Server Component. Shows the create-company form. If the user already has companies, show a back link.

```tsx
import { createAdminClient } from '@/lib/supabase/admin'
import { getCurrentUser } from '@/app/actions/auth'  // adjust to actual auth helper
import { getUserCompanies } from '@/app/actions/company'
import { CreateCompanyForm } from './CreateCompanyForm'
import { Building2 } from 'lucide-react'
import Link from 'next/link'

export default async function CreateCompanyPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const existingCompanies = await getUserCompanies(user.id)
  const isFirstCompany = existingCompanies.length === 0

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20
            flex items-center justify-center mx-auto mb-4">
            <Building2 size={26} className="text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground font-['Chakra_Petch']">
            {isFirstCompany ? 'Create Your Company' : 'Add a Company'}
          </h1>
          <p className="text-muted-foreground mt-2 text-sm">
            {isFirstCompany
              ? 'Metal Gear is a B2B platform. All activity is scoped to your company profile.'
              : 'Add another company to switch between them from the header.'
            }
          </p>
        </div>

        <CreateCompanyForm userId={user.id} isFirstCompany={isFirstCompany} />

        {/* Back link for users who already have a company */}
        {!isFirstCompany && (
          <div className="text-center mt-6">
            <Link href="/dashboard" className="text-sm text-muted-foreground hover:text-foreground">
              ← Back to dashboard
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
```

### `src/app/(main)/companies/new/CreateCompanyForm.tsx`

`'use client'` — the actual form.

```tsx
'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { createCompany } from '@/app/actions/company'
import { useAuthStore } from '@/lib/stores/auth-store'
import { toast } from 'sonner'

const INDUSTRIES = [
  'Oil & Gas', 'Petrochemical', 'Mining', 'Manufacturing',
  'CNC Machining', 'Construction', 'Agriculture', 'Marine', 'Other',
]
const SIZES = ['1-10', '11-50', '51-200', '201-500', '500+']

export function CreateCompanyForm({
  userId,
  isFirstCompany,
}: {
  userId: string
  isFirstCompany: boolean
}) {
  const router = useRouter()
  const { setActiveCompany, setUserCompanies, userCompanies } = useAuthStore()
  const [isPending, startTransition] = useTransition()

  const [form, setForm] = useState({
    name: '',
    industry: '',
    company_size: '',
    website: '',
    phone: '',
    city: '',
    state: '',
    tagline: '',
  })

  const handleSubmit = () => {
    if (!form.name.trim()) { toast.error('Company name is required'); return }

    startTransition(async () => {
      const result = await createCompany(userId, form)
      if (!result.success || !result.company) {
        toast.error(result.error ?? 'Failed to create company')
        return
      }
      const newCompany = { ...result.company, role: 'owner' as const, membership_id: '' }
      setUserCompanies([...userCompanies, newCompany])
      setActiveCompany(newCompany)
      toast.success(`${result.company.name} created`)
      router.push('/dashboard')
    })
  }

  return (
    <div className="bg-card border border-border rounded-2xl p-6 space-y-5">
      {/* Company Name — required */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">
          Company Name <span className="text-destructive">*</span>
        </label>
        <input
          type="text"
          value={form.name}
          onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="Acme Industrial Corp"
          className="w-full h-10 px-3 rounded-lg border border-input bg-background
            text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Industry + Size — side by side */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Industry</label>
          <select
            value={form.industry}
            onChange={e => setForm(f => ({ ...f, industry: e.target.value }))}
            className="w-full h-10 px-3 rounded-lg border border-input bg-background
              text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Select…</option>
            {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">Company Size</label>
          <select
            value={form.company_size}
            onChange={e => setForm(f => ({ ...f, company_size: e.target.value }))}
            className="w-full h-10 px-3 rounded-lg border border-input bg-background
              text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">Employees…</option>
            {SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* City + State */}
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">City</label>
          <input
            type="text"
            value={form.city}
            onChange={e => setForm(f => ({ ...f, city: e.target.value }))}
            placeholder="Houston"
            className="w-full h-10 px-3 rounded-lg border border-input bg-background
              text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
        <div className="space-y-1.5">
          <label className="text-sm font-medium text-foreground">State</label>
          <input
            type="text"
            value={form.state}
            onChange={e => setForm(f => ({ ...f, state: e.target.value }))}
            placeholder="TX"
            className="w-full h-10 px-3 rounded-lg border border-input bg-background
              text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>
      </div>

      {/* Website */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Website</label>
        <input
          type="url"
          value={form.website}
          onChange={e => setForm(f => ({ ...f, website: e.target.value }))}
          placeholder="https://acmeindustrial.com"
          className="w-full h-10 px-3 rounded-lg border border-input bg-background
            text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Tagline */}
      <div className="space-y-1.5">
        <label className="text-sm font-medium text-foreground">Tagline</label>
        <input
          type="text"
          value={form.tagline}
          onChange={e => setForm(f => ({ ...f, tagline: e.target.value }))}
          placeholder="Trusted industrial equipment since 1987"
          className="w-full h-10 px-3 rounded-lg border border-input bg-background
            text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        />
      </div>

      {/* Submit */}
      <button
        onClick={handleSubmit}
        disabled={isPending || !form.name.trim()}
        className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold
          text-sm disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90
          transition-opacity"
      >
        {isPending
          ? 'Creating…'
          : isFirstCompany ? 'Create Company & Continue' : 'Create Company'
        }
      </button>
    </div>
  )
}
```

---

## 5. Company Settings Pages

### `src/app/(main)/settings/company/page.tsx`

Server Component — edit company profile.

```tsx
import { getCurrentUser } from '@/app/actions/auth'
import { getActiveCompanyId } from '@/app/actions/company-context'
import { getCompanyWithMembers } from '@/app/actions/company'
import { CompanySettingsForm } from './CompanySettingsForm'
import { redirect } from 'next/navigation'

export default async function CompanySettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/login')

  const companyId = await getActiveCompanyId(user.id)
  if (!companyId) redirect('/companies/new')

  const company = await getCompanyWithMembers(companyId)
  if (!company) redirect('/companies/new')

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 space-y-8">
      <div>
        <h1 className="text-xl font-bold text-foreground font-['Chakra_Petch']">
          Company Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your company profile — visible to all buyers on Metal Gear.
        </p>
      </div>
      <CompanySettingsForm company={company} userId={user.id} />
    </div>
  )
}
```

### `src/app/(main)/settings/company/CompanySettingsForm.tsx`

`'use client'` — form with logo upload, name, description, contact fields. Mirrors the structure of `CreateCompanyForm` but with pre-populated values and logo/banner upload via server action.

Fields: logo (upload), banner (upload), name, tagline, description, industry, company_size, website, phone, city, state.

On save, call `updateCompany(company.id, userId, formValues)`. Show sonner toast on success/failure.

Logo/banner upload: use separate `<input type="file">` fields that call `uploadCompanyLogoAction` and `uploadCompanyBannerAction` server actions (create these as thin wrappers calling `uploadCompanyLogo` from `media.ts`, then `updateCompany` to save the URL).

### `src/app/(main)/settings/company/members/page.tsx`

Server Component — read-only member list. Shows each member's name, avatar, role badge, and join date. No invite UI (deferred). Owner and admins see a "Remove" button (calls a `removeMember` server action).

```tsx
// Table columns: Avatar | Name | Role | Joined | Actions
// Role badges: owner (gold) | admin (blue) | member (grey)
// "Invite team members" coming soon — show a disabled/greyed out button with "Coming soon" tooltip
```

Add `removeMember` server action to `src/app/actions/company.ts`:
```ts
export async function removeMember(
  companyId: string,
  targetUserId: string,
  requestingUserId: string
): Promise<{ success: boolean; error?: string }> {
  // Verify requester is owner or admin
  // Prevent owner from removing themselves (must transfer ownership first)
  // Set is_active = false on membership
}
```

---

## 6. Dashboard — Company Context Banner

**File:** `src/app/(main)/dashboard/page.tsx`

Add a company context indicator at the top of the dashboard, above all existing content:

```tsx
// Fetch activeCompany server-side (already done in layout — pass as prop or re-fetch)
// Show a banner like:

<div className="flex items-center justify-between px-4 py-3 rounded-xl
  bg-primary/5 border border-primary/15 mb-6">
  <div className="flex items-center gap-3">
    <CompanyAvatar name={activeCompany.name} logoUrl={activeCompany.logo_url} size={36} />
    <div>
      <div className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
        Acting as
      </div>
      <div className="font-semibold text-foreground">{activeCompany.name}</div>
    </div>
  </div>
  <Link href="/settings/company"
    className="text-xs text-muted-foreground hover:text-foreground transition-colors">
    Settings →
  </Link>
</div>
```

---

## 7. Layout — Render CompanyContextProvider + CompanySwitcher

**File:** `src/app/(main)/layout.tsx`

The layout already fetches `activeCompany` and `userCompanies` (from Cycle 19-1). Now:

1. Render `<CompanyContextProvider activeCompany={activeCompany} userCompanies={userCompanies} />` inside the layout body (after ThemeProvider, after PaletteProvider).

2. Add `<CompanySwitcher variant="header" />` to the **desktop nav header** area. Place it between the search bar and the notification bell.

3. Pass `activeCompany` and `userCompanies` as new props to `MobileNavClient`:
```tsx
<MobileNavClient
  {/* existing props */}
  activeCompany={activeCompany}
  userCompanies={userCompanies}
/>
```

---

## 8. Mobile Drawer — Company Switcher

**File:** `src/components/mobile-nav/MobileMenuDrawer.tsx`

In the Profile Card section (Section A), replace the simple name + subscription display with the `CompanySwitcher` component in drawer variant:

```tsx
{/* In the drawer, Section A becomes: */}
<div className="p-4 border-b border-border">
  {/* User identity (stays personal) */}
  <div className="flex items-center gap-3 mb-3">
    <Avatar src={user.avatarUrl} size={40} />
    <div>
      <div className="font-semibold text-sm text-foreground">{user.name}</div>
      <div className="text-xs text-muted-foreground">
        <Link href="/profile">View personal profile →</Link>
      </div>
    </div>
  </div>

  {/* Company switcher (B2B context) */}
  <CompanySwitcher variant="drawer" />
</div>
```

Update `MobileMenuDrawer` props to receive `activeCompany` and `userCompanies` (or read from Zustand directly since it's a client component).

---

## 9. Listing Display — Company Name

**File:** `src/app/(main)/listings/[id]/components/ListingPurchasePanel.tsx`

In the "Seller mini-card" section of the purchase panel, update to show company name and logo:

```tsx
// Existing: shows seller avatar + full_name + trust score
// Updated: shows company logo + company name + trust score

// The listing now has a `company` field (join company_profiles in listing query)
// Show: <CompanyAvatar> + company.name + "Verified" badge if company.is_verified

// Keep user avatar as secondary (smaller, below company name):
// "Listed by [user full_name]" in muted text under company name
```

Update the listing detail server-side query to JOIN `company_profiles`:
```sql
-- In src/app/actions/ or listing page data fetch:
SELECT listings.*, 
  company_profiles.name as company_name,
  company_profiles.logo_url as company_logo_url,
  company_profiles.is_verified as company_is_verified,
  company_profiles.slug as company_slug
FROM listings
LEFT JOIN company_profiles ON listings.company_id = company_profiles.id
WHERE listings.id = $1
```

---

## 10. New Listing — Auto-Set Company Context

**File:** `src/app/(main)/listings/new/page.tsx` (or the relevant action)

When creating a new listing, automatically set `company_id` from the active company context. The user does not need to select a company — it's always the active one.

In the listing creation server action (`src/app/(main)/listings/new/actions.ts`):
```ts
// Add to createListing action:
// Read active company from cookie
const cookieStore = await cookies()
const companyId = cookieStore.get('active_company_id')?.value ?? null

// Include in insert:
const { data: listing } = await supabase.from('listings').insert({
  ...listingData,
  user_id: userId,
  company_id: companyId,   // ← ADD THIS
})
```

---

## Edge Cases & Validation

- **`CompanySwitcher` before Zustand hydrated:** On first SSR render, `activeCompany` comes from props via `CompanyContextProvider`. The switcher reads from Zustand which is hydrated in `useEffect` — render null or skeleton until hydrated.
- **User has only 1 company:** `CompanySwitcher` still renders — users may have 1 company now but add more later. The "Add another company" option is always visible.
- **Company name in listing created before migration:** `company_id` may be null on old listings. Fall back to `profiles.full_name` in the purchase panel seller card. Use: `company?.name ?? seller.full_name`.
- **`/companies/new` redirect loop:** Middleware guard redirects to `/companies/new` if no membership. The page itself must be exempt from the guard — already listed in the exempt list in 19-1.
- **Router refresh after company switch:** `router.refresh()` re-runs all Server Components with the new cookie context. This is the correct approach — no full page reload, but server data refreshes.
- **Settings nav link:** Add "Company Settings" and "Team Members" links to the existing settings navigation in `/settings/page.tsx` or the settings sidebar.
- **Seller storefront URL:** `/sellers/[id]` uses user ID. After this cycle, storefronts should also be accessible at `/companies/[slug]`. Implement `/companies/[slug]/page.tsx` as an alias that resolves the company's `created_by` user ID and redirects to `/sellers/[id]`, or renders the full storefront directly. Keep both URLs working.

---

## Success Criteria

**Company Switcher:**
- [ ] Desktop header shows active company name + logo/initials pill
- [ ] Clicking opens dropdown with all user companies
- [ ] Active company has a checkmark
- [ ] Switching company updates Zustand state + cookie + refreshes server data
- [ ] "Add another company" link goes to `/companies/new`

**Create Company:**
- [ ] `/companies/new` renders with correct first-time vs add-another copy
- [ ] Form validates company name is required
- [ ] Successful creation: redirects to `/dashboard`, shows active company in switcher
- [ ] New company immediately selectable in switcher

**Company Settings:**
- [ ] `/settings/company` shows current company fields, pre-populated
- [ ] Saving updates company profile (name, tagline, industry, etc.)
- [ ] Logo upload saves to R2 and updates logo in switcher
- [ ] `/settings/company/members` shows member list with role badges
- [ ] Remove member works for owners/admins
- [ ] "Invite" button is visible but disabled with "Coming soon" tooltip

**Dashboard:**
- [ ] "Acting as [Company Name]" banner renders at top of dashboard
- [ ] Banner shows correct company logo/initials
- [ ] "Settings →" link goes to `/settings/company`

**Listings:**
- [ ] New listings created with `company_id` set automatically
- [ ] Listing purchase panel shows company name + logo in seller card
- [ ] Old listings (no `company_id`) fall back to user name gracefully

**Mobile drawer:**
- [ ] Profile section shows user identity (personal) + company switcher below it
- [ ] Company switcher in drawer is full-width variant
- [ ] Switching company in drawer updates header instantly

**No regressions:**
- [ ] All existing listings still display correctly
- [ ] Admin pages unaffected
- [ ] Middleware doesn't redirect existing users to `/companies/new` (they have companies from migration)

---

## Commit Message

```
feat(cycle-19-2): multi-company UI — switcher, create flow, settings, display

Components:
- CompanyAvatar: logo with initials fallback
- CompanyContextProvider: Zustand hydration from server-fetched data
- CompanySwitcher (header + drawer variants): switch active company,
  add another company link, checkmark on active, router.refresh()

Pages:
- /companies/new: create first or additional company
- /settings/company: edit company profile, logo/banner upload
- /settings/company/members: member list, role badges, remove action

Layout / Integration:
- (main)/layout.tsx: renders CompanyContextProvider, CompanySwitcher in header
- MobileMenuDrawer: company switcher in drawer profile section
- Dashboard: "Acting as [Company]" context banner
- New listings: auto-set company_id from active_company_id cookie
- ListingPurchasePanel: company name + logo in seller mini-card
- /companies/[slug] resolves to seller storefront (backward compat)

Server actions:
- company.ts: removeMember action
- Listing creation: company_id injection from cookie

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
- **Deploy 19-1 and 19-2 together in a single deployment** after both pass all tests.
