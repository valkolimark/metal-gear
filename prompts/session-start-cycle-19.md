# Metal Gear — Cycle 19 Session Start

## Project
B2B industrial equipment marketplace. Houston, TX. Oil & gas, petrochemical, mining, manufacturing, CNC.

**Live:** https://metal-gear-five.vercel.app
**GitHub:** valkolimark/metal-gear (branch: main)
**Supabase:** fkcyfpdkcrhjieauhchn
**Vercel team:** team_9n9GosoaraicsoDdbAFgzr5j
**Vercel project:** prj_HQBv7jMhui6LGW5vzVC5pmCMndlx

---

## Stack
Next.js 15 App Router · TypeScript · Supabase (PostgreSQL + Auth + Realtime) · Tailwind CSS v4 · shadcn/ui (new-york) · Zustand + TanStack Query · Stripe · Resend · Anthropic Claude Sonnet 4 · Cloudflare R2 + Stream · Vercel · Sentry

## Critical Rules

1. **All DB ops use server actions with `createAdminClient()`.** Never client-side Supabase.
2. **Never pass functions from Server Components to Client Components.**
3. **All media uploads through `src/lib/media.ts`.**
4. **Deploy via Vercel API curl, not CLI:**
   ```bash
   curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=team_9n9GosoaraicsoDdbAFgzr5j" \
     -H "Authorization: Bearer $VERCEL_TOKEN" \
     -H "Content-Type: application/json" \
     -d '{"name":"metal-gear","project":"prj_HQBv7jMhui6LGW5vzVC5pmCMndlx","gitSource":{"type":"github","ref":"main","org":"valkolimark","repo":"metal-gear"},"target":"production"}'
   ```
5. **Commit co-author:** `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`

---

## Credentials for This Session

- **Vercel token:** `[INSERT VERCEL TOKEN]`
- **Supabase Management API token:** `[INSERT SUPABASE TOKEN]`

---

## Current State

Cycles 1–18 complete. Full marketplace + AI Intelligence Layer + Cycle 17 listing page redesign + Cycle 18 mobile nav, admin CSS, and Ocean palette all live.

---

## This Session — Cycle 19: Multi-Company Profiles

This is the most architecturally significant change in the project. One user can now belong to multiple company profiles and switch between them. All marketplace activity (listings, SOS, subscriptions, storefronts) is scoped to the **active company**.

Read both prompt files in full before writing any code:
```
prompts/prompt-cycle-19-1-company-foundation.md
prompts/prompt-cycle-19-2-company-ui.md
```

**Do not deploy until both phases are complete.** 19-1 alone leaves the UI broken (no create-company page, no switcher). Deploy both together.

---

## Architecture in One Sentence

`profiles` = the human. `company_profiles` = the business. `company_memberships` = junction. Active company stored in cookie + Zustand + `profiles.active_company_id`. Everything the user does on the marketplace is attributed to their active company.

---

## Phase 1 — Foundation (prompt-cycle-19-1-company-foundation.md)

### Step-by-step execution order

**A. Run database migrations (8 total, in order):**

Use the Supabase Management API with the provided token. Run each SQL block separately and confirm no errors before proceeding to the next.

1. Create `company_profiles` table
2. Create `company_memberships` table + `company_role` enum
3. Add `profiles.active_company_id` column
4. Add `subscriptions.company_id` column
5. Add `listings.company_id` + `listings.display_name_override` columns
6. Add `seller_storefronts.company_id` column
7. Add `sos_requests.company_id` column
8. Add RLS policies on both new tables

After each migration: verify in Supabase dashboard that the change is present before running the next.

**B. Run the migration script:**

1. Check if `tsconfig.scripts.json` exists at root. If not, create it (spec in 19-1 prompt).
2. Run: `npx ts-node scripts/migrate-companies.ts --dry-run`
3. Review output — confirm every user gets a company, names look correct
4. Run: `npx ts-node scripts/migrate-companies.ts --limit=3`
5. Verify 3 companies created in Supabase dashboard
6. Run: `npx ts-node scripts/migrate-companies.ts`
7. Verify all users have companies, all listings/subscriptions/storefronts have `company_id`

**C. Create TypeScript types and server actions:**

8. Create `src/types/company.ts`
9. Create `src/app/actions/company.ts`
10. Create `src/app/actions/company-context.ts`
11. Update `src/lib/stores/auth-store.ts` — add company fields
12. Update `src/app/actions/tier.ts` — company-first tier checks
13. Update `src/lib/media.ts` — add `uploadCompanyLogo`, `uploadCompanyBanner`
14. Update `src/middleware.ts` — company guard

**Phase 1 gate — before moving to Phase 2:**
- [ ] `npm run typecheck` — zero errors
- [ ] `npm run build` — zero errors
- [ ] All 8 migrations confirmed in Supabase dashboard
- [ ] Migration script ran successfully, all users have companies
- [ ] All listings have `company_id` set
- [ ] Middleware company guard does NOT redirect existing users (they have cookie + membership)
- [ ] Existing listing pages, search, admin all still work

---

## Phase 2 — UI (prompt-cycle-19-2-company-ui.md)

### Step-by-step execution order

1. Create `src/components/company/CompanyAvatar.tsx`
2. Create `src/components/company/CompanyContextProvider.tsx`
3. Create `src/components/company/CompanySwitcher.tsx`
4. Create `src/app/(main)/companies/new/page.tsx` + `CreateCompanyForm.tsx`
5. Create `src/app/(main)/settings/company/page.tsx` + `CompanySettingsForm.tsx`
6. Create `src/app/(main)/settings/company/members/page.tsx`
7. Update `src/app/(main)/layout.tsx` — CompanyContextProvider + CompanySwitcher + company props
8. Update `src/components/mobile-nav/MobileNavClient.tsx` + `MobileMenuDrawer.tsx`
9. Update `src/app/(main)/dashboard/page.tsx` — "Acting as" banner
10. Update `src/app/(main)/listings/new/actions.ts` — inject `company_id` from cookie
11. Update `src/app/(main)/listings/[id]/components/ListingPurchasePanel.tsx` — company in seller card
12. Update listing detail query to JOIN `company_profiles`
13. Add `removeMember` to `src/app/actions/company.ts`
14. Add settings nav links for Company Settings + Team Members

---

## Full Test Suite

Run after both phases are complete, before committing:

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

All four must pass. Do not commit if any fail.

---

## Manual Verification Checklist

### Company Switcher
- [ ] Desktop header: active company name/logo pill visible
- [ ] Click opens dropdown with all user companies
- [ ] Switching company: Zustand updates instantly, cookie set, `router.refresh()` fires
- [ ] "Add another company" → `/companies/new`

### Create Company Flow
- [ ] `/companies/new` — form renders correctly
- [ ] Empty name shows validation error
- [ ] Successful create → redirect to `/dashboard` with new company active
- [ ] New company immediately appears in switcher

### Company Settings
- [ ] `/settings/company` loads pre-populated with current company data
- [ ] Save updates company name, tagline, industry etc.
- [ ] `/settings/company/members` shows member list with role badges
- [ ] Remove member button works (owner/admin only)
- [ ] "Invite" button is visible but shows "Coming soon"

### Dashboard
- [ ] "Acting as [Company Name]" banner at top
- [ ] Switching company → banner updates after refresh

### Listings
- [ ] New listing creation: `company_id` auto-set from cookie
- [ ] Listing purchase panel: shows company name + logo in seller card
- [ ] Old listings (null company_id): fall back to user full_name gracefully

### Mobile Drawer
- [ ] Profile section: user identity on top, company switcher below
- [ ] Company switcher (drawer variant) shows all companies, full-width

### Regression Check
- [ ] All existing listing pages load correctly (including ones without company_id)
- [ ] Admin panel unaffected
- [ ] Theme toggle (Industrial/Ocean, dark/light) still works
- [ ] Middleware does not loop-redirect existing logged-in users

---

## Commit & Deploy

After all checks pass, commit everything in a **single commit** for the complete Cycle 19:

```bash
git add -A
git commit -m "feat(cycle-19): multi-company profiles — one user, many companies

Architecture:
- profiles = human identity; company_profiles = B2B entity
- company_memberships junction: user/company/role (owner|admin|member)
- active_company_id: cookie (SSR) + Zustand (client) + profiles column (persistent)
- All marketplace activity scoped to active company

Database (8 migrations):
- company_profiles, company_memberships tables with RLS
- profiles.active_company_id FK
- listings.company_id, display_name_override
- subscriptions.company_id, seller_storefronts.company_id, sos_requests.company_id

Migration:
- scripts/migrate-companies.ts (idempotent, dry-run safe)
- Every existing user gets 1 company from user_business_profiles data
- All listings/subscriptions/storefronts backfilled with company_id

Foundation:
- src/types/company.ts
- src/app/actions/company.ts (getUserCompanies, createCompany, updateCompany, removeMember)
- src/app/actions/company-context.ts (switchActiveCompany, getActiveCompanyId)
- Zustand auth store: activeCompany, userCompanies, setActiveCompany
- tier.ts: company-first subscription checks with user fallback
- media.ts: uploadCompanyLogo, uploadCompanyBanner
- middleware.ts: company guard → /companies/new if no membership

UI:
- CompanyAvatar: logo with initials fallback
- CompanyContextProvider: Zustand hydration from SSR data
- CompanySwitcher: header (pill) + drawer (full-width) variants
- /companies/new: create first or additional company
- /settings/company: edit company profile + logo/banner upload
- /settings/company/members: member list, role badges, remove action
- Dashboard: 'Acting as [Company]' banner
- ListingPurchasePanel: company name/logo in seller card
- MobileMenuDrawer: company switcher in profile section
- New listings: company_id auto-injected from cookie

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

Then push and deploy:
```bash
git push origin main

curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=team_9n9GosoaraicsoDdbAFgzr5j" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"metal-gear","project":"prj_HQBv7jMhui6LGW5vzVC5pmCMndlx","gitSource":{"type":"github","ref":"main","org":"valkolimark","repo":"metal-gear"},"target":"production"}'
```

Wait for Vercel deployment to complete. Verify live at https://metal-gear-five.vercel.app.

---

## Post-Deploy Documentation

### CHANGELOG.md entry

```markdown
## [3.0.0] — 2026-03-09 · Multi-Company Profiles (Cycle 19)

### Added
- **Multi-company architecture** — one user can belong to multiple company profiles
  and switch between them; all marketplace activity scoped to active company
- **`company_profiles` table** — business entity with name, slug, logo, industry,
  location, verification status
- **`company_memberships` table** — user/company/role junction (owner | admin | member)
- **Company context** — active company stored in cookie (SSR) + Zustand (client) +
  `profiles.active_company_id` (persistent); zero-latency context reads
- **`CompanySwitcher` component** — header pill (desktop) and drawer variant (mobile);
  instant switch with optimistic Zustand update + `router.refresh()` for SSR sync
- **`/companies/new`** — create first or additional company; required for new signups
- **`/settings/company`** — edit company profile, logo/banner upload, tagline, industry
- **`/settings/company/members`** — team member list with role badges, remove action
- **Dashboard "Acting as" banner** — shows active company with Settings link
- **Company in listing seller card** — `ListingPurchasePanel` shows company name + logo
- **Middleware company guard** — redirects new users (no membership) to `/companies/new`
- **Migration script** `scripts/migrate-companies.ts` — idempotent backfill of all
  existing users; creates company from `user_business_profiles`, links all related data
- Company media upload: `uploadCompanyLogo`, `uploadCompanyBanner` in `src/lib/media.ts`
- `src/types/company.ts` — `CompanyProfile`, `CompanyMembership`, `CompanyWithRole` types

### Changed
- `subscriptions` — `company_id` added; tier checks now company-first (user fallback)
- `listings` — `company_id` + `display_name_override` columns added; new listings
  automatically assigned to active company from cookie
- `seller_storefronts` — `company_id` column added
- `sos_requests` — `company_id` column added
- Zustand auth store — `activeCompany`, `userCompanies`, `setActiveCompany` added
- Mobile drawer — company switcher replaces simple subscription badge in profile section
- `tier.ts` — `getActiveTier(userId, companyId?)` signature; company-first lookup

### Deferred to future cycle
- Team invitations (invite by email)
- Seat-based billing via Stripe ($25/seat/mo for Pro/Business)
- Company verification document upload (new flow)
- `/companies/[slug]` public company page
```

### README.md

Add to **Features → Business Tools**:
```markdown
- **Multi-company profiles** — one account, multiple companies; switch active company
  from the header; all listings, SOS, and subscriptions scoped to the active company
- **Company settings** — edit profile, logo, industry, and location; view team members
```

### Session summary

Create `prompts/session-2026-03-09.md` summarizing Cycle 19 scope, decisions made, and what's deferred.

---

## If You Hit Errors

**`company_role` enum already exists:** Migration 2 uses `CREATE TYPE IF NOT EXISTS` — this is fine if it already ran.

**Migration script `Cannot find module`:** Ensure `tsconfig.scripts.json` exists and includes `scripts/**/*.ts`. Run with `npx ts-node --project tsconfig.scripts.json scripts/migrate-companies.ts`.

**Middleware redirect loop on `/companies/new`:** The exempt list in middleware must include `/companies/new` exactly. Check `pathname.startsWith('/companies/new')`.

**`CompanySwitcher` Zustand read before hydration:** The `CompanyContextProvider` uses `useEffect` for hydration, so on first render the Zustand store may be empty. Render the switcher as `null` if `activeCompany` from Zustand is null — the SSR-rendered layout will show correctly, and after hydration the client switcher takes over.

**`router.refresh()` not reflecting new company:** The cookie must be set client-side before `router.refresh()` fires. In `CompanySwitcher`, `setActiveCompany` sets the cookie synchronously via `document.cookie`, so by the time `router.refresh()` re-runs the server, the cookie is present. If this still fails, add a 50ms delay before refresh.

**Listing purchase panel: company is null:** Old listings may not have `company_id`. The JOIN returns null for `company_profiles`. Use optional chaining: `company?.name ?? sellerProfile.full_name`.

**Type error on `role` in `CompanyWithRole`:** The Supabase select returns the membership `role` as a string. Cast it: `role: m.role as CompanyRole`.
