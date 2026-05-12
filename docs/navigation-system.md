# Metal Gear Navigation System

Canonical specification for the global authenticated navigation. This document is the source of truth for Cycles 72–75 rollout. Changes to the nav IA must be documented here BEFORE shipping.

Status: Cycle 71 (shipped on `/feed` only). Other routes remain on the legacy chrome in `src/components/layout/{header,desktop-nav,mobile-drawer,mobile-nav}.tsx` until their cluster cycle.

---

## 1. Information Architecture

### 1.1 — Desktop (≥768px)

**Top bar** (every authenticated page, fixed top, 56px height):

- Brand mark `MG` (wordmark for primary surfaces, mark-only for compact) → `/feed`
- Global search field, center-left, with `Cmd+K` / `Ctrl+K` hotkey to focus
- Right cluster (right-aligned):
  - SOS bell with count badge (active SOS in user's tier-2 equipment categories, last 24h)
  - Messages bell with count badge (unread conversations across all buyer/seller threads)
  - Credits balance (small mono pill, e.g. "127 credits"); links to `/credits`
  - Avatar dropdown (Profile / Settings / Help / Sign out)
- Drop-shadow appears when page content scrolls beneath (uses Cycle 68 soft-card shadow token)

**Left sidebar** (DASHBOARD surfaces only — see §1.3 surface taxonomy):

- 240px expanded / 64px collapsed (icon-only)
- User preference for expanded/collapsed persists in `localStorage` key `mg.sidebar.collapsed`
- Primary nav stack (in order, with Lucide icon):
  1. Feed (`Home`)
  2. Browse Equipment (`Package`) — links to `/listings`
  3. SOS (`SirenIcon` — hand-rolled SVG from `src/components/landing/icons.tsx`) — links to `/sos`
  4. Messages (`MessageSquare`) — with unread badge
  5. My Listings (`LayoutList`) — links to `/listings?tab=mine`
  6. Saved (`Bookmark`) — links to `/radar`
  7. Credits (`Coins`)
- Separator
- "Your companies" sub-section (collapsible, default open):
  - List of company memberships from `getUserCompanies(userId)`
  - Each company: 2-letter initials avatar (or logo) + name + role chip
  - Click → company storefront `/companies/[slug]`
- Footer area (bottom of sidebar):
  - "Send SOS" button (orange `#FF6B2B`, prominent)
  - Settings link (small, muted)

### 1.2 — Desktop (≥768px) — surfaces WITHOUT sidebar

Top bar only, no sidebar. Used on:

- Storefront pages (`/sellers/[id]`, `/companies/[slug]`)
- Profile pages (`/profile`, `/profile/[id]`)
- Settings (has its own internal sidebar — global sidebar would conflict)
- Admin (`[data-section="admin"]` scope — admin has its own nav)
- Landing / marketing (uses `LandingNav` from Cycle 67 — entirely separate component)
- Onboarding flows
- Full-bleed editing surfaces (`/listings/new`, `/listings/bulk-edit`, `/listings/snap`)

### 1.3 — Surface taxonomy

Every authenticated route in Metal Gear belongs to one of three buckets:

| Bucket | Sidebar on desktop? | Examples |
|---|---|---|
| **Dashboard** | Yes (240px expanded by default) | `/feed`, `/sos`, `/messages`, `/listings`, `/search`, `/dashboard`, `/radar` |
| **Storefront/Profile** | No (full-bleed) | `/sellers/[id]`, `/companies/[slug]`, `/profile`, `/profile/[id]` |
| **Settings/Admin** | No (page has internal nav) | `/settings/*`, `/admin/*` |

This taxonomy is enforced by the route's layout file. It is NOT a user preference — the system decides per route.

### 1.4 — Mobile (<768px)

**Top bar** (52px height):

- Brand mark `MG` (compact) → `/feed`
- Search icon (button — opens search drawer, no inline field)
- Combined notifications bell (SOS + Messages count merged); click opens dropdown with both lists
- Avatar (32px) — tap opens account dropdown
- NO hamburger button. The sidebar drawer is opened by tapping the brand mark.

**Bottom nav** (60px height, fixed bottom, `env(safe-area-inset-bottom)` respected for iOS PWA standalone):

- 5 items, equal-width grid, icons + 10px label
- Order: **Feed · Browse · SOS · Messages · Profile**
- SOS is the middle item AND visually prominent: orange circle background `#FF6B2B`, 48px diameter centered in the 60px cell, larger icon, label "SOS" in white
- Other 4 items: muted icon, muted label; active state uses navy fill + top-border accent
- Active item has subtle top-border accent in navy `#0A1628`

**Slide-in nav drawer** (full mobile nav set):

- Opens from left when brand mark is tapped
- Full-height overlay with backdrop dim
- Contains everything in the desktop sidebar (primary nav stack, "Your companies", Send SOS footer, Settings link)
- Dismiss: tap backdrop, swipe left, tap close button, or press Esc
- Locks body scroll while open

---

## 2. Component contract

The nav system is composed of these primitives. Each is a single-purpose component:

| Component | File | Server/Client | Purpose |
|---|---|---|---|
| `<AppShellDashboard>` | `src/components/layout/AppShellDashboard.tsx` | Server | Wraps a dashboard surface with top bar + sidebar + content area + mobile bottom nav. |
| `<AppShellFullBleed>` | `src/components/layout/AppShellFullBleed.tsx` | Server | Wraps a storefront/profile surface with top bar only (no sidebar). |
| `<AppHeader>` | `src/components/layout/AppHeader.tsx` | Server | The top bar. Renders client children for interactive bits. |
| `<AppHeaderSearch>` | `src/components/layout/AppHeaderSearch.tsx` | Client | Search field + Cmd+K hotkey. |
| `<AppHeaderNotificationsBell>` | `src/components/layout/AppHeaderNotificationsBell.tsx` | Client | SOS or Messages bell with count badge and dropdown panel. Three modes: `sos`, `messages`, `combined`. |
| `<AppHeaderAvatarMenu>` | `src/components/layout/AppHeaderAvatarMenu.tsx` | Client | Avatar dropdown with Profile / Settings / Help / Sign out. |
| `<AppSidebar>` | `src/components/layout/AppSidebar.tsx` | Server | Left sidebar shell. Renders nav items + "Your companies" + footer. |
| `<AppSidebarItem>` | `src/components/layout/AppSidebarItem.tsx` | Client | Single nav row (icon + label + optional badge). Active-state detection via `usePathname`. |
| `<AppSidebarCompanyList>` | `src/components/layout/AppSidebarCompanyList.tsx` | Server | "Your companies" sub-section. |
| `<AppSidebarToggle>` | `src/components/layout/AppSidebarToggle.tsx` | Client | Collapse/expand button. Persists state in `localStorage`. |
| `<AppMobileTopBar>` | `src/components/layout/AppMobileTopBar.tsx` | Client | Mobile 52px top bar (manages drawer open state). |
| `<AppMobileBottomNav>` | `src/components/layout/AppMobileBottomNav.tsx` | Server | Mobile 5-item bottom nav. |
| `<AppMobileBottomNavItem>` | `src/components/layout/AppMobileBottomNavItem.tsx` | Client | Active-state detection for single bottom-nav item. |
| `<AppMobileNavDrawer>` | `src/components/layout/AppMobileNavDrawer.tsx` | Client | Slide-in drawer with full nav. |
| `<SidebarStatePreloader>` | `src/components/layout/SidebarStatePreloader.tsx` | Server (inline `<script>`) | Reads `localStorage` synchronously and sets `data-sidebar-collapsed` on `<html>` before paint. |
| `<BrandMark>` | `src/components/layout/BrandMark.tsx` | Server | Logo/wordmark; reusable across header and drawer. |

### 2.1 — Composition

```tsx
// Dashboard surface
export default function FeedPage() {
  return (
    <AppShellDashboard>
      <FeedContent />
    </AppShellDashboard>
  );
}

// Storefront/Profile surface (Cycle 73 rollout — built but unmounted in Cycle 71)
export default function SellerPage() {
  return (
    <AppShellFullBleed>
      <SellerContent />
    </AppShellFullBleed>
  );
}
```

The shell components handle responsive behavior internally — same component renders desktop sidebar layout and mobile bottom-nav layout, without the page knowing the difference.

---

## 3. Breakpoint matrix

| Viewport | Top bar | Sidebar | Bottom nav | Drawer |
|---|---|---|---|---|
| <640px | Mobile (52px) | hidden | shown (60px + safe-area) | accessible |
| 640–767px | Mobile (52px) | hidden | shown | accessible |
| 768–1023px | Desktop (56px) | collapsed by default (64px icons) | hidden | n/a |
| ≥1024px | Desktop (56px) | expanded by default (240px) | hidden | n/a |

The 768px breakpoint (`md`) is the desktop/mobile divide for nav purposes. Other components in the app use other breakpoints — that's fine. Nav uses 768.

---

## 4. Accessibility requirements

- **Skip-to-content link** at the top of every page (`#main-content` anchor on `<main>`).
- **Keyboard navigation:**
  - Top bar elements tab in order: brand → search → bell-SOS → bell-Msg → credits → avatar
  - Sidebar nav items: tab moves through items, Enter activates
  - Drawer: Esc closes, focus trapped while open, focus returns to trigger on close
  - Search hotkey: `Cmd+K` (Mac) / `Ctrl+K` (other). Inside the search field, `Esc` to blur.
  - Avatar dropdown: opens with Enter/Space, arrow keys inside, Esc to close (provided by Radix `DropdownMenu`)
- **Focus management:**
  - When mobile drawer opens, focus moves to the close button. Closing returns focus to the trigger.
  - Notification dropdown traps focus while open (provided by Radix).
- **ARIA:**
  - Top bar: `<header role="banner">`
  - Sidebar: `<nav aria-label="Primary navigation">`
  - Bottom nav: `<nav aria-label="Primary navigation">`
  - Active nav item: `aria-current="page"`
  - Badge counts have `aria-label` like "3 unread messages"
  - Search has a visually-hidden `<label>` for screen readers
- **Reduced motion:** Drawer slide animation respects `prefers-reduced-motion` — instant transitions when set.
- **Contrast:** All text/icon colors against backgrounds meet WCAG 2.1 AA (4.5:1 normal, 3:1 large/icon).

---

## 5. Interaction with existing layout patterns

| Existing pattern | Interaction with new nav |
|---|---|
| **Cycle 68 sticky save bar** (`/settings/company`) | Sticky save bar sits ABOVE the bottom nav on mobile. Compute z-index: top bar = 50, drawer overlay = 60, sticky save bar = 40, bottom nav = 45. Sticky save bar's bottom offset increases by `60px + env(safe-area-inset-bottom)` on mobile. |
| **Cycle 69 `<ProfileTabsNav>`** (`/sellers/[id]`, `/profile`) | Tab nav lives inside the page content area, BELOW the top bar. It uses its own sticky positioning with `top: 56px` desktop / `top: 52px` mobile. Stacks cleanly. |
| **Cycle 68 cover-grid heroes** | Hero sits below top bar. On full-bleed surfaces (no sidebar), hero spans full viewport width. On dashboard surfaces (sidebar present), hero is constrained to the content area width — academic for now, no dashboard surface uses a cover-grid hero. |
| **Cycle 67 `LandingNav`** | Separate component, separate routes (unauthenticated). The new app nav does NOT replace `LandingNav`. The two never co-render because they live in mutually-exclusive route groups. |
| **Existing search bar on `/listings` and `/search`** | The TOP-BAR global search is for cross-entity search (listings + companies + people + SOS). Page-level search inputs on `/listings` and `/search` are scoped filters and remain. They are NOT the same thing. The top-bar search routes to `/search?q=...`. |
| **Legacy `Header` / `DesktopNav` / `MobileNavClient`** (in `(main)/layout.tsx`) | Untouched in Cycle 71. Continues to render on every route still in `(main)`. Cycles 72–75 migrate routes into `(main-new-nav)` one cluster at a time. |

---

## 6. Performance budget

- Top bar must render in <50ms (no blocking server calls in the path beyond `getNavContext`)
- Sidebar performs one batched server call (`getNavContext()`) for company memberships + counts (Messages unread, SOS active, credits balance)
- The shell calls `getNavContext()` **once** per request and threads the result via `initialContext` to header + sidebar + bottom nav
- Mobile bottom nav is pure markup + icons — no extra data fetching beyond the shell's batched call
- Total nav JS bundle target: ≤30KB gzipped (icons via `lucide-react`, no additional runtime)

---

## 7. Telemetry

Add `data-nav-event="..."` attributes to nav items for product analytics. The downstream analytics pipeline already collects DOM event delegation on this attribute.

Conventional values:

- `primary:feed`, `primary:browse`, `primary:sos`, `primary:messages`, `primary:my-listings`, `primary:saved`, `primary:credits`, `primary:settings` — sidebar items
- `footer:sos-send` — the orange Send SOS pill in the sidebar footer
- `mobile-bottom:feed`, `mobile-bottom:browse`, `mobile-bottom:sos`, `mobile-bottom:messages`, `mobile-bottom:profile` — mobile bottom nav
- `bell:sos`, `bell:messages`, `bell:combined` — header bells
- `drawer:opened`, `drawer:closed` — mobile drawer state
- `search:opened`, `search:submitted` — global search
- `avatar:opened` — avatar dropdown
- `brand:click` — brand mark

---

## 8. Data layer

All nav data is fetched server-side via a single batched call:

```ts
// src/lib/layout/nav-data.ts
export async function getNavContext(): Promise<NavContext | null>
```

Returns `null` if the user is unauthenticated. The shells (`<AppShellDashboard>`, `<AppShellFullBleed>`) call this once and short-circuit to `redirect('/login')` if null.

The returned object contains:

- `user` — `{ userId, displayName, avatarUrl, initials, isAdmin, subscriptionTier }`
- `badges` — `{ unreadMessages, activeSosInCategories, creditsBalance }`
- `companies` — `NavCompanyMembership[]`
- `activeCompanyId` — `string | null`

**Fail-open per-query:** if any badge query fails, the badge defaults to `0` and the error is logged. Navigation is too high-stakes to ever block on a count.

**Underlying schema:**

- Unread messages: count of `messages` where `read_at IS NULL`, `sender_id != user_id`, and `conversation_id` is in a conversation the user participates in (`buyer_id = user_id OR seller_id = user_id`).
- Active SOS in categories: count of `sos_requests` where `status = 'active'` and `equipment_category` is one of the user's `user_equipment_interests.tier2` values. If the user has no interests, returns 0.
- Credits balance: `contact_credits.credits_remaining` for the user; 0 if no row.
- Companies: `getUserCompanies(userId)` → `CompanyWithRole[]`.

---

## 9. Sidebar collapse persistence

Collapsed state is stored in `localStorage` under the key `mg.sidebar.collapsed` (values: `"true"` / `"false"`).

To avoid a flash-of-expanded-sidebar on page load, `<SidebarStatePreloader>` renders an inline `<script>` in the page's `<head>` that reads `localStorage` synchronously and sets `data-sidebar-collapsed` on `<html>` before paint. The CSS keys off `:root[data-sidebar-collapsed="true"] [data-sidebar]` rather than React state, so the initial render is correct on first paint.

This pattern matches `next-themes`. **Do not** move the read into a `useEffect` — that produces a visible expand-then-collapse flash.

---

## 10. Route-group migration

This cycle introduces a parallel route group `src/app/(main-new-nav)/` for surgical rollout. Cycle 71 moves only `/feed` into it. Subsequent cycles (per §11 below) move additional routes one cluster at a time.

The group's `layout.tsx` wraps children in `<AppShellDashboard>` plus `<SidebarStatePreloader>`. Pages inside the group never need to import the shell themselves.

When a route needs `<AppShellFullBleed>` (Cycle 73+), the cleanest path is a sibling group `(main-new-nav-fullbleed)/` with its own layout. That decision happens at the start of Cycle 73 — not pre-emptively in Cycle 71.

---

## 11. Cluster rollout plan (Cycles 72–75)

- **Cycle 72** — Dashboard surfaces: `/sos`, `/messages`, `/listings`, `/search`, `/dashboard`, `/radar`. Move each to `(main-new-nav)`; continue with `<AppShellDashboard>`.
- **Cycle 73** — Storefront/Profile: `/sellers/[id]`, `/companies/[slug]`, `/profile`, `/profile/[id]`. Likely introduces `(main-new-nav-fullbleed)` group. Uses `<AppShellFullBleed>`.
- **Cycle 74** — `/settings/*` and `/admin/*`. Settings has its own internal nav; consider sidebar collapsed-default. Admin has its own scoped CSS — careful coexistence check.
- **Cycle 75** — Marketing/landing nav refresh — refresh `LandingNav` from Cycle 67 to match the authenticated nav visual language (separate IA, unauthenticated needs).

Each rollout cycle should:

1. Move the page file with `git mv` (not copy) so duplicate routes never coexist.
2. Verify with `find . -path "*/<route>/page.tsx"` — must return exactly one result.
3. Manually canary-check at least 5 routes from other clusters to confirm their old chrome is unchanged.

After Cycle 75, the legacy `Header` / `DesktopNav` / `MobileNavClient` / `mobile-drawer` components and the old `(main)` group can be deleted.

---

## 12. SOS orange `#FF6B2B`

The mobile bottom-nav SOS button uses the SOS orange `#FF6B2B` as a 48px circle. This is load-bearing — the visual prominence is the differentiator for field-side SOS posting from a yard or plant. Do not desaturate, recolor, or downsize.

Same orange appears on the sidebar footer "Send SOS" pill and on the SOS bell's count badge.

---

## 13. What this spec does NOT cover

- **Real-time badge updates** — counts are fetched on page load only. SSE/realtime is a future cycle.
- **Search autocomplete/typeahead** — the global search is a plain input that routes to `/search?q=...`. Typeahead is a future cycle.
- **Drawer swipe-to-close gesture** — Esc, backdrop, and close-button work; swipe is deferred.
- **Nav-level keyboard shortcut overrides** — only `Cmd+K` is reserved. Page-level shortcuts that collide with this must be documented in the page itself.
- **Multi-step deep links** (e.g., drawer → settings → submenu) — drawer items navigate to top-level routes only.

---

## 14. Authorship

Cycle 71 — initial spec and `/feed` reference implementation.
