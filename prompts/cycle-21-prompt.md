# Metal Gear — Cycle 21: Mobile Cleanup, Thumbnail Restore & Admin Tier Control

## Context

Read `CLAUDE.md` and `CHANGELOG.md` before starting. This cycle is a focused polish pass addressing eight specific issues identified from live user testing. No new feature surfaces are being added — everything here is fixing regressions or filling gaps in existing UI.

**Live app:** https://metal-gear-five.vercel.app  
**GitHub:** valkolimark/metal-gear (branch: main)  
**Supabase project:** fkcyfpdkcrhjieauhchn  
**Vercel team:** team_9n9GosoaraicsoDdbAFgzr5j  
**Vercel project:** prj_HQBv7jMhui6LGW5vzVC5pmCMndlx

---

## Critical Rule (always)

All DB operations MUST use server actions with `createAdminClient()`. Never client-side Supabase calls — they hang in production due to RLS + SSR. Never pass functions from Server Components to Client Components.

## Deployment (always)

Trigger via Vercel API, not CLI:
```bash
curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=team_9n9GosoaraicsoDdbAFgzr5j" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"metal-gear","project":"prj_HQBv7jMhui6LGW5vzVC5pmCMndlx","gitSource":{"type":"github","ref":"main","org":"valkolimark","repo":"metal-gear"},"target":"production"}'
```

---

## Objective

Fix eight high-priority UX issues:

1. Remove the floating orange SOS siren FAB from mobile (separate from the MobileBottomNav SOS tab)
2. Remove the floating blue help chat bubble from mobile, move help into MobileMenuDrawer
3. Restore listing thumbnail images on all listing cards (search/browse results)
4. Fix the SOS bottom nav tab to show a two-option modal instead of navigating directly
5. Fix unread message badge missing on Messages icon in MobileBottomNav
6. Fix favorites button not actually saving listings to collections
7. Fix message image delivery — recipient sees image immediately, not just a filename/paperclip
8. Admin: add manual subscription tier override (no Stripe required)

---

## Fix 1 — Remove Floating SOS Siren FAB

**Problem:** There is a floating orange circle button (siren icon) anchored to the bottom-left of the mobile viewport. This is separate from the raised orange SOS tab in `MobileBottomNav`. It overlaps listing cards and blocks taps on content below it.

**Investigation:** Search for the component rendering this FAB. It may be:
- A component named something like `SOSButton`, `FloatingSOS`, `SOSFab`
- Rendered in `src/app/(main)/layout.tsx` or a layout wrapper
- A `fixed bottom-X left-X` positioned element

**Fix:** Remove the floating SOS FAB component entirely from the layout. The raised SOS tab in `MobileBottomNav` is the correct and only entry point. Do not remove or modify `MobileBottomNav` or its SOS tab.

**Files to investigate:**
- `src/app/(main)/layout.tsx`
- Any component imported into the main layout that renders a fixed/absolute SOS circle
- Search codebase for `SOSButton`, `sos-fab`, `FloatingSOS`, `siren`, `fixed bottom` combined with `sos`

---

## Fix 2 — Remove Floating Help Chat Bubble, Move into Menu

**Problem:** There is a floating blue circle button (chat/help icon) anchored to the bottom-right of the mobile viewport. This covers content and makes it impossible to tap items in the bottom-right area of listing pages.

**Investigation:** This is the AI Help Assistant component, likely `HelpButton` or similar. It renders as a floating `fixed bottom-X right-X` button that opens an AI chat panel (`POST /api/help/chat`).

**Fix — Two parts:**

**Part A:** Remove the floating help button from its current position. Find where it's rendered (likely `src/app/(main)/layout.tsx` or a layout component) and remove it.

**Part B:** Add a "Help & Support" entry to `MobileMenuDrawer` that opens the same AI chat panel. The drawer already has a grouped nav section structure — add Help as a nav item in an appropriate group (e.g., near the bottom before Sign Out). When tapped, it should open the same chat panel that the floating button previously opened. The chat panel itself (the AI chat UI) is preserved — only the floating trigger button is removed and replaced with a menu item trigger.

**Files to investigate:**
- `src/app/(main)/layout.tsx`
- `src/components/mobile-menu-drawer.tsx` (or similar path)
- The HelpButton/HelpAssistant component file
- The AI help chat panel component

**On desktop:** The floating help button behavior on desktop can remain as-is or also be moved to a header menu item. Check if the current floating button is mobile-only or shown on all viewports. If it's already `md:hidden` then no desktop change needed.

---

## Fix 3 — Restore Listing Thumbnail Images

**Problem:** Listing cards in Browse Equipment and Search results show no thumbnail image — only title, tags, price, and location text. The image area is blank or missing entirely. This is a regression; cards previously showed a thumbnail.

**Investigation — find the root cause before fixing:**

1. Check the listing card component. Find where listing cards are rendered for search/browse results (likely `src/components/listing-card.tsx` or similar). Look at how images are fetched and rendered.

2. Check the data: Does the search/browse query fetch `listing_images`? The query may be fetching listings but not joining `listing_images`, so `images` or `primary_image` is undefined on the listing object. Check the server action or API route that powers the browse/search page.

3. Check the image URL: If `listing_images` is fetched, verify the image URL is a valid R2/CDN URL (`media.metalgear.com/...`). Legacy Supabase Storage URLs may be broken.

4. Check `next.config.ts`: Ensure `media.metalgear.com` is in the `images.remotePatterns` config.

**Fix:** Whatever the root cause, ensure:
- The browse/search query fetches the primary listing image (first image by `display_order ASC`, or `is_primary = true` if that column exists)
- The listing card component renders a `<Image>` (Next.js) with the image URL
- A gray placeholder/skeleton is shown when no image exists (don't break cards for listings without photos)
- Image dimensions: use a consistent aspect ratio (e.g., 16:9 or 4:3) for the card thumbnail

**The listing card should look like:**
```
┌─────────────────────────────┐
│  [Thumbnail image 16:9]     │
├─────────────────────────────┤
│  Title                      │
│  Tag  Tag                   │
│  $Price          Location   │
└─────────────────────────────┘
```

---

## Fix 4 — SOS Nav Tab: Two-Option Modal

**Problem:** Tapping the SOS tab in `MobileBottomNav` navigates directly to one view. Users need two options: send a new SOS or go to the SOS dashboard.

**Fix:** When the SOS tab is tapped, instead of navigating directly, show a bottom sheet or modal with two large tap targets:

```
┌─────────────────────────────┐
│         SOS                 │
├─────────────────────────────┤
│  🚨  Send SOS               │
│      Broadcast an urgent     │
│      equipment need          │
├─────────────────────────────┤
│  📋  SOS Dashboard          │
│      View open requests &    │
│      your active SOSes       │
└─────────────────────────────┘
```

Use a shadcn `Sheet` (bottom drawer) — it's already installed. The sheet opens on SOS tab tap. "Send SOS" navigates to `/sos/new` (or the SOS creation route). "SOS Dashboard" navigates to `/sos` (or the SOS dashboard route). Sheet closes after either selection.

**MobileBottomNav behavior:** The SOS center tab should not highlight as "active" in the same way as the other four tabs, since it's a launcher not a page.

**Files to modify:**
- `src/components/mobile-bottom-nav.tsx` (or similar path)
- May need a small `SOSLauncherSheet` sub-component

---

## Fix 5 — Unread Message Badge on Mobile Nav

**Problem:** When new messages arrive, there is no badge or indicator on the Messages icon in `MobileBottomNav`. Standard messaging UX requires a visible unread count badge.

**Fix:** 

1. Fetch the user's unread message count server-side in the main layout (or in `MobileNavClient`). This count should come from a server action, e.g., `getUnreadMessageCount()` — check if this already exists in `src/app/actions/` for messages.

2. Pass the unread count to `MobileBottomNav` as a prop.

3. Render a badge on the Messages tab: a blue circle with white count number, positioned top-right of the icon. If count > 9, show "9+". If count is 0, show nothing.

4. For real-time updates: the existing Supabase Realtime setup likely already tracks new messages. Hook into the existing unread count update mechanism (check the Zustand UI store or existing notification system) so the badge updates without a full page reload.

**Do not duplicate fetch logic** — if unread count is already tracked somewhere (Zustand store, notification bell), reuse that state.

---

## Fix 6 — Favorites Button Actually Saves Listings

**Problem:** Tapping the favorites/heart button on a listing does not save the listing to the user's collections/favorites. The button may appear to respond visually but the save does not persist.

**Investigation:**
- Find the favorite toggle — it was refactored to `src/app/(main)/listings/[id]/components/favorite-action.ts` as a server action in Cycle 17
- Check if the server action is being called correctly from listing cards in browse/search results (not just the listing detail page)
- Check the `favorites` table (or `collection_items` table if collections are used) for RLS policies — the insert may be silently failing due to RLS
- Check for any JS errors in the console when tapping the favorite button

**Fix:** Ensure the favorite toggle server action works from:
1. Listing detail page (likely already works)
2. Listing cards in browse/search results (may be missing or broken)
3. Optimistic UI update: heart icon fills/unfills immediately on tap, then server confirms

The save should go to the user's default collection or `favorites` table per the existing schema.

---

## Fix 7 — Message Image Delivery (Recipient Sees Image Immediately)

**Problem:** When a user sends an image in a message, the recipient initially sees only a paperclip icon and filename. The actual image appears only after a delay. Both sender and recipient should see the image immediately after sending.

**Investigation:**

The likely cause is a race condition: the Supabase Realtime message event fires with the message record, but the image upload to Cloudflare R2 may not be complete yet, so the `file_url` in the message record is empty or not yet populated when the Realtime event arrives.

Check the message sending flow:
1. Where is the image uploaded? (`src/lib/media.ts` → `uploadMessageAttachmentFile()`)
2. Where is the message record inserted into the DB?
3. Is the image URL included in the message record at insert time, or added in a second update?

**Fix options (pick the right one based on investigation):**
- **If URL is missing at insert time:** Upload the image first, get the URL, then insert the message record with the URL already populated. Never insert the message before the upload completes.
- **If URL is present but Realtime event arrives too fast:** The Realtime subscription may need to re-fetch the message after receiving the event to get the complete record including `file_url`.
- **If it's a CDN propagation delay:** R2 via `media.metalgear.com` should be near-instant. If there's a processing step, consider storing the URL before any processing completes.

Both sender and recipient should render the image using Next.js `<Image>` with the R2 URL, not a native `<img>` tag. Ensure the image renders inline in the message bubble, not as a download link.

---

## Fix 8 — Admin Manual Subscription Tier Override

**Problem:** Super admins need to change any user's subscription tier (Free → Pro → Business → Enterprise) without going through Stripe payment. This is needed for testing, customer support, and comping accounts. The current priority score/tier system is separate and does not control the subscription tier.

**Subscription tiers (canonical):**
- `free` — 3 listings
- `pro` — $179/mo
- `business` — $349/mo  
- `enterprise` — $599/mo

**DB investigation:** Check the `subscriptions` table schema. Understand how `getActiveTier()` in `src/app/actions/tier.ts` works — what column(s) it reads to determine a user's tier.

**Implementation:**

**Server action** (`src/app/(admin)/admin/actions.ts` or `src/app/actions/settings.ts`):
```typescript
// setUserSubscriptionTier(userId: string, tier: 'free' | 'pro' | 'business' | 'enterprise', adminId: string)
// - Upserts the subscriptions table for this user
// - Sets status to 'active', plan to the new tier
// - Sets a flag or note indicating this is an admin override (not a Stripe subscription)
// - Logs the action to admin_audit_log
```

**UI:** In the admin User Detail page (`/admin/users/[id]`):
- Add a "Subscription" section or find the existing subscription display
- Add a "Change Tier" control: a select/dropdown with the four tier options + a "Save" button
- Current tier is pre-selected
- On save: call the server action, show a success toast, refresh the displayed tier
- Display an "Admin Override" badge next to the tier if it was set manually rather than via Stripe

**Protect this action:** Only `superadmin` role can use it. Check `requireAdmin('superadmin')` or equivalent.

**Do not cancel or modify any existing Stripe subscription** — if the user has an active Stripe subscription, the admin override should exist alongside it. `getActiveTier()` should check for admin-overridden tier first.

---

## Files to Create/Modify (Summary)

Claude Code should investigate and determine exact paths, but expected touchpoints:

**Removals/moves:**
- `src/app/(main)/layout.tsx` — remove floating SOS FAB, remove floating help button
- Floating SOS component file — delete or disable
- `HelpButton` component — remove floating render, keep chat panel logic

**New/modified components:**
- `MobileMenuDrawer` — add Help entry that triggers AI chat panel
- `MobileBottomNav` — SOS tab triggers sheet instead of navigating, Messages tab gets badge
- `SOSLauncherSheet` — new small component (can live in same file as MobileBottomNav)
- Listing card component — ensure image is fetched and rendered
- Message conversation UI — fix image display timing

**Server actions:**
- Add `setUserSubscriptionTier()` to admin actions
- Add/verify `getUnreadMessageCount()` for message badge
- Verify favorite toggle server action works from listing cards

**Admin UI:**
- `/admin/users/[id]` — add Subscription tier override control

---

## Edge Cases & Validation

- **Fix 1/2:** Verify floating buttons are gone at 390px and 428px viewport widths. Confirm MobileBottomNav SOS tab still works. Confirm help is accessible via menu.
- **Fix 3:** Test with listings that have images AND listings that have no images. No broken layout for imageless listings.
- **Fix 4:** SOS sheet should not be triggerable if user is not authenticated (redirect to login). Sheet closes on backdrop tap or swipe down.
- **Fix 5:** Badge shows 0 = no badge. Badge shows correct count. Badge updates in real-time when new message arrives.
- **Fix 6:** Favorite persists across page refresh. Double-tap unfavorites. Works for anonymous users? If not, show `AnonInteractionGate`.
- **Fix 7:** Image send works for all supported formats (jpg, png, gif, webp). Large images (up to attachment limit) still work. Graceful fallback if image fails to load.
- **Fix 8:** Admin cannot break an account by setting a nonsensical tier. Audit log records who changed it and when. `getActiveTier()` returns the override tier correctly so gating works immediately.

---

## Success Criteria

- [ ] No floating orange SOS button anywhere on mobile at any viewport width
- [ ] No floating blue help button anywhere on mobile; Help accessible from hamburger menu
- [ ] All listing cards in browse/search show a thumbnail image (or clean placeholder if no photos)
- [ ] Tapping SOS tab opens a sheet with two options; both navigate correctly
- [ ] Messages tab in bottom nav shows an unread count badge when there are unread messages
- [ ] Tapping the heart/favorite on any listing card saves it; persists on refresh
- [ ] Sent images appear inline immediately for both sender and recipient; no filename-only state
- [ ] Super admin can change any user's subscription tier from the user detail page without Stripe
- [ ] All existing functionality unbroken (AI search, listing detail, SOS creation, messaging)
- [ ] No TypeScript errors, no console errors on target pages
- [ ] Deployed to production and verified on mobile browser at 390px viewport

---

## Commit Message

```
feat(cycle-21): mobile cleanup, thumbnail restore, admin tier override

- Remove floating SOS siren FAB (was covering mobile content)
- Remove floating help bubble; move Help into mobile menu drawer
- Restore listing thumbnail images on all browse/search cards
- SOS nav tab now opens two-option launcher sheet
- Add unread message badge to Messages tab in mobile bottom nav
- Fix favorites button to actually persist saves
- Fix message image delivery race condition (image shows immediately)
- Add admin manual subscription tier override (no Stripe required)

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>
```

---

## After Completing This Cycle

1. Update `CHANGELOG.md` with a `[3.2.0]` entry following Keep a Changelog format
2. Update `README.md` — reflect any changes to setup, architecture, or features that a new developer would need to know
3. Update `CLAUDE.md` if any new components, routes, or patterns were introduced
4. Deploy via Vercel API curl above
5. Confirm on mobile browser that all 8 fixes are working
