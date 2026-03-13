# Metal Gear — Cycle 22: Mobile Listing Experience, Radar, Feed & Seller Contact

## Context

Read `CLAUDE.md` and `CHANGELOG.md` before starting. Cycle 21 cleaned up mobile UI and fixed core bugs. This cycle completes the mobile listing experience, renames Collections to Radar, redirects Home to the feed, and adds seller contact info with tier-gated visibility.

**Live app:** https://metal-gear-five.vercel.app  
**GitHub:** valkolimark/metal-gear (branch: main)  
**Supabase project:** fkcyfpdkcrhjieauhchn  
**Vercel team:** team_9n9GosoaraicsoDdbAFgzr5j  
**Vercel project:** prj_HQBv7jMhui6LGW5vzVC5pmCMndlx

---

## Critical Rule (always)

All DB operations MUST use server actions with `createAdminClient()`. Never client-side Supabase calls. Never pass functions from Server Components to Client Components.

## Deployment (always)

```bash
curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=team_9n9GosoaraicsoDdbAFgzr5j" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"metal-gear","project":"prj_HQBv7jMhui6LGW5vzVC5pmCMndlx","gitSource":{"type":"github","ref":"main","org":"valkolimark","repo":"metal-gear"},"target":"production"}'
```

---

## Objective

Four feature areas:

1. Mobile listing detail page — Make Offer, Contact Seller, and Save all fully functional
2. Collections renamed to "Radar" everywhere in UI, routes, and copy
3. Home tab navigates to the user's feed; Dashboard accessible from hamburger menu
4. Seller contact info — profile fields, visibility preference, tier-gated display on listings

---

## Feature 1 — Mobile Listing Actions Complete

**Problem:** On mobile, the listing detail page is missing or has non-functional Make Offer, Contact Seller, and Save Listing actions. The `MobilePurchaseBar` (fixed bottom bar) exists but may not surface all three actions.

**Fix:** The `MobilePurchaseBar` fixed bottom bar should contain:
- **Make Offer** (primary, orange button) — opens the offer flow
- **Contact Seller** (secondary, outlined) — opens internal messaging to seller
- **Save to Radar** (heart icon button) — saves listing to user's Radar (formerly Collections)

All three must work on mobile exactly as they do on desktop via `ListingPurchasePanel`.

For unauthenticated users, all three actions trigger `AnonInteractionGate` (the signup prompt modal already built in Cycle 17).

The `MobilePurchaseBar` expands to the full `ListingPurchasePanel` via shadcn `Sheet` (already installed) when the user taps the price area or a "See Details" affordance — this gives access to the full seller info card, condition grade, quality score, and buyer protection badge.

**Files to modify:**
- `src/app/(main)/listings/[id]/components/mobile-purchase-bar.tsx`
- `src/app/(main)/listings/[id]/page.tsx` — ensure all required props are passed

---

## Feature 2 — Rename Collections → Radar

**Problem:** "Collections" is the current name for saved listing groups. It feels passive and consumer-oriented. "Radar" better fits the B2B industrial context — "things I've got on my radar."

**Rename everywhere:**

| Old | New |
|-----|-----|
| Collections | Radar |
| Collection | Radar List |
| Add to Collection | Add to Radar |
| My Collections | My Radar |
| Save to Collection | Save to Radar |
| collection | radar (in UI copy only — DB column names stay as-is) |

**Scope:**
- All UI-facing text strings, button labels, page titles, empty states, toast messages
- Navigation labels in desktop header dropdown, mobile menu drawer, dashboard
- Page `<title>` and heading tags on the collections pages
- Do NOT rename database tables, columns, or route paths (keep `/collections` routes as-is to avoid breaking existing links — just change the displayed text)
- Do NOT rename TypeScript types or server action function names

**Files to search:** Run a case-insensitive search for "collection" across `src/` and update all user-facing strings. Exclude DB schema files, server action names, and TypeScript type names.

---

## Feature 3 — Home → Feed, Dashboard in Menu

**Problem:** The Home tab in mobile nav and the Home link in desktop nav take the user to a generic dashboard page. The feed (listings from followed categories, recent activity, SOS alerts) is where users should land.

**Fix — Three parts:**

**Part A: Home navigates to feed**
- The Home tab in `MobileBottomNav` should navigate to `/` or `/feed` (whichever is the live feed/discovery page — investigate which route this is)
- If no dedicated feed page exists, the Home tab should navigate to `/search` (the browse/discovery page) as the closest equivalent
- The desktop header "Home" or logo link should do the same

**Part B: Dashboard accessible from menu**
- The `/dashboard` route remains intact
- Add "Dashboard" as a named link in `MobileMenuDrawer` under an appropriate section (e.g., "My Account" group)
- Add "Dashboard" to the desktop header user dropdown if it's not already there

**Part C: Active tab highlighting**
- The Home tab in `MobileBottomNav` should show as active when on the feed/home route
- Adjust the `pathname` matching logic if needed

---

## Feature 4 — Seller Contact Info: Fields, Preference, Display

This is the largest feature in this cycle. Implement it carefully.

### 4a — Profile Fields

Add contact fields to the user profile if not already present. Check `profiles` table schema first.

**DB migration** (only add columns that don't already exist):
```sql
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,  -- separate from auth email if seller wants different
  ADD COLUMN IF NOT EXISTS contact_visibility TEXT NOT NULL DEFAULT 'pro_plus' 
    CHECK (contact_visibility IN ('public', 'pro_plus', 'hidden'));
```

`contact_visibility` options:
- `public` — anyone logged in can see contact info
- `pro_plus` — only Pro, Business, Enterprise subscribers can see it (default)
- `hidden` — no one can see contact info; internal messaging only

**RLS:** The `contact_visibility` column itself is readable by anyone. The actual `phone_number` and `contact_email` values should be readable by the profile owner always. For other users, RLS enforcement happens at the application layer (server action checks tier before returning values), not at the DB row level, to keep queries simple.

### 4b — Profile Settings UI

In the user profile settings page (`/settings/profile` or equivalent):

Add a "Contact Information" section:
- Phone Number field (text input, optional)
- Contact Email field (text input, optional, placeholder: "Leave blank to use your account email")
- Visibility preference — three radio options with clear labels:
  - **Pro & above only** (default) — "Only Pro, Business, and Enterprise subscribers can see your contact info"
  - **Everyone** — "Any logged-in user can view your phone and email"
  - **Hidden** — "Never show my contact info; buyers must use internal messaging"

Save via server action. Show success toast on save.

### 4c — Display on Listing Detail Page

On the listing detail page (`ListingPurchasePanel` and `MobilePurchaseBar` sheet), below the seller mini-card, show seller contact info if the viewing user is eligible.

**Server-side logic** (in the listing detail page server component):

```typescript
// Pseudocode for contact info visibility decision
const sellerVisibility = seller.contact_visibility  // 'public' | 'pro_plus' | 'hidden'
const viewerTier = await getActiveTier(viewerId)    // 'free' | 'pro' | 'business' | 'enterprise'

const canSeeContact = 
  sellerVisibility === 'public' && viewerId !== null ||
  sellerVisibility === 'pro_plus' && ['pro', 'business', 'enterprise'].includes(viewerTier) ||
  viewerId === seller.id  // sellers always see their own contact info

// Pass canSeeContact and (if true) the contact values to the client component
```

**UI display (when eligible):**
```
📞  (713) 555-0123
✉️  john@acmeindustrial.com
```

Shown as plain text below the seller card. Small, clean, not loud.

**UI display (when not eligible — Pro+ gated):**
```
📞  ••••••••••
✉️  ••••••••••
[Upgrade to Pro to see contact info →]
```

Masked values with an upgrade nudge linking to `/pricing`. This is a subtle monetization touchpoint — don't make it aggressive.

**UI display (when hidden):**
No contact section shown at all. Only the "Contact Seller" internal message button.

**Anonymous users:** No contact info shown. `AnonInteractionGate` applies for messaging.

### 4d — Do Not Harvest Mitigations

To reduce the risk of contact info scraping:
- Contact info is only rendered server-side and passed as props — never fetched client-side via an API that could be scraped programmatically
- The listing detail page is a Server Component — contact info is embedded in the HTML only when the server confirms eligibility
- Do not create a public API endpoint that returns contact info

---

## DB Changes Summary

```sql
-- profiles table additions
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS phone_number TEXT,
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_visibility TEXT NOT NULL DEFAULT 'pro_plus'
    CHECK (contact_visibility IN ('public', 'pro_plus', 'hidden'));
```

No new tables required for this cycle.

---

## Files to Create/Modify

- `src/app/(main)/listings/[id]/components/mobile-purchase-bar.tsx` — all three actions
- `src/app/(main)/listings/[id]/components/listing-purchase-panel.tsx` — add contact info section
- `src/app/(main)/listings/[id]/page.tsx` — compute contact visibility server-side, pass props
- `src/app/(main)/settings/profile/` — add contact fields and visibility preference
- `src/app/actions/profile.ts` (or equivalent) — server action to save contact fields
- `src/components/mobile-bottom-nav.tsx` — Home tab routing fix
- `src/components/mobile-menu-drawer.tsx` — add Dashboard link
- All files with "Collection" UI strings — rename to Radar in copy only

---

## Edge Cases & Validation

- Seller with no phone/email set: contact section shows nothing even if viewer is eligible
- Seller sets visibility to public, then downgrades to free: visibility preference is theirs to set regardless of their own tier
- Viewer is the seller themselves: always shows their own contact info
- `contact_email` blank: fall back to showing the auth email if seller is `pro_plus` or `public` — or leave blank, discuss with Mark
- Radar rename: no broken links, no 404s. `/collections` routes still work.
- Mobile purchase bar: safe area insets preserved (iOS home indicator)

---

## Success Criteria

- [ ] Make Offer, Contact Seller, Save all work from mobile listing page
- [ ] "Collections" does not appear anywhere in the UI; all copy says "Radar"
- [ ] Home tab on mobile nav goes to the feed/discovery page
- [ ] Dashboard is accessible from the mobile hamburger menu
- [ ] Phone and contact email fields exist in profile settings with visibility selector
- [ ] Eligible viewers (correct tier) see seller contact info on listing page
- [ ] Ineligible viewers see masked info + upgrade prompt
- [ ] Hidden preference = contact section absent entirely
- [ ] No TypeScript errors, no console errors
- [ ] Deployed and verified on mobile

---

## After Completing This Cycle

1. Update `CHANGELOG.md` with a `[3.3.0]` entry
2. Update `README.md` — note Radar (formerly Collections), contact info system, feed navigation
3. Update `CLAUDE.md` — add contact_visibility logic, note Radar rename
4. Deploy and verify

---

## Commit Message

```
feat(cycle-22): mobile listing actions, radar rename, feed nav, seller contact

- Mobile listing page: Make Offer, Contact Seller, Save all functional
- Rename Collections → Radar throughout UI (routes and DB unchanged)
- Home tab navigates to feed; Dashboard added to mobile menu
- Seller contact info: profile fields, visibility preference, tier-gated display
- Pro+ subscribers see seller phone/email on listing pages
- Contact info server-side only to prevent harvesting

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```
