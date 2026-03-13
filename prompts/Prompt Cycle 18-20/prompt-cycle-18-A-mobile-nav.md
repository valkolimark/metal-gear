# Cycle 18-A — Mobile Navigation Redesign (Facebook-Style)

## Objective

The current mobile header causes horizontal overflow/side-scrolling and the overall mobile navigation is cluttered. Redesign the mobile navigation system using a Facebook-inspired pattern: a minimal sticky header, a clean 5-tab bottom nav with a raised SOS button, and a smooth slide-in drawer for the full menu. Desktop navigation is unchanged.

---

## Reference Pattern (Facebook Mobile)

- **Header:** Logo left, 2–3 icon buttons right — no overflow, no horizontal scroll
- **Bottom nav:** 5 tabs with icon + label, single active color highlight
- **Menu drawer:** Slides in from right, dimmed backdrop, profile card at top, grouped nav items, settings at bottom

---

## Files to Create / Modify

| Action | File |
|--------|------|
| Modify | `src/app/(main)/layout.tsx` — mobile header + bottom nav + drawer |
| Create | `src/components/mobile-nav/MobileHeader.tsx` |
| Create | `src/components/mobile-nav/MobileBottomNav.tsx` |
| Create | `src/components/mobile-nav/MobileMenuDrawer.tsx` |
| Create | `src/components/mobile-nav/MobileNavClient.tsx` |
| Modify | `src/app/globals.css` — drawer + SOS animation keyframes |

---

## Component Architecture

```
(main)/layout.tsx  [Server Component — fetches data]
└── MobileNavClient  [Client Component — holds drawer state]
    ├── MobileHeader          ← fixed top, mobile only (md:hidden)
    ├── MobileBottomNav       ← fixed bottom, mobile only (md:hidden)
    └── MobileMenuDrawer      ← portaled, open/close state
```

State management: `useState<boolean>` for drawer open/close lives in `MobileNavClient`. Data fetching stays server-side in layout. Pass all data as props to `MobileNavClient`.

---

## 1. MobileHeader Component

**File:** `src/components/mobile-nav/MobileHeader.tsx`

**Layout:** Fixed top, full width, `z-50`. Hidden on `md` and above (`md:hidden`).

**Structure (left → right):**
```
[ METAL GEAR wordmark ]  ·····  [ 🔍 Search ] [ 🔔 Bell (badge) ] [ ☰ Menu ]
```

**Specs:**
- Height: 52px
- Background: `hsl(var(--background))` + `border-b border-border/50`
- Wordmark: "METAL GEAR" in Chakra Petch, `var(--color-primary)` (resolves to orange in Industrial palette, teal in Ocean palette), ~18px, font-weight 700
- Icons: 40×40px touch targets, `lucide-react` — `Search`, `Bell` (with red dot badge if `unreadNotifications > 0`), `Menu`
- Badge: small 8px red dot, `top-1 right-1`, `absolute`, no count number (count shown in drawer)
- `backdrop-blur-sm bg-background/90` scroll effect via `position: sticky`
- Never overflows — max 4 elements total

**Props:**
```ts
interface MobileHeaderProps {
  unreadNotifications: number
  onMenuOpen: () => void
}
```

---

## 2. MobileBottomNav Component

**File:** `src/components/mobile-nav/MobileBottomNav.tsx`

**Layout:** Fixed bottom, full width, `z-50`. `md:hidden`.

**5 tabs (left → right):**
```
[ Home ]  [ Search ]  [ 🆘 SOS ]  [ Messages ]  [ Profile ]
```

**Specs:**
- Height: 56px + `env(safe-area-inset-bottom)`
- Background: `hsl(var(--background))` + `border-t border-border/40`
- Tab width: `flex-1` equal
- Active tab: icon + label in `hsl(var(--primary))`
- Inactive: `hsl(var(--muted-foreground))`
- Icon: 22px. Label: 10px `font-medium`
- Active state: `usePathname()` from `next/navigation`

**SOS tab (center) — raised:**
- 48×48px circle, `bg-[hsl(var(--primary))]`, positioned `−16px` above nav baseline via `mt-[-16px]`
- White "SOS" label below
- `box-shadow: 0 4px 14px rgba(var(--primary-rgb), 0.45)` glow
- CSS pulse animation: `animation: sos-pulse 2.5s ease-in-out infinite`
- Parent nav must have `overflow: visible` for raised button to render above nav top edge

**Messages tab:** red pill badge if `unreadMessages > 0`

**Routes:**
- Home → `/dashboard`
- Search → `/search`
- SOS → `/sos/new`
- Messages → `/messages`
- Profile → `/profile`

**Props:**
```ts
interface MobileBottomNavProps {
  unreadMessages: number
}
```

---

## 3. MobileMenuDrawer Component

**File:** `src/components/mobile-nav/MobileMenuDrawer.tsx`
Mark as `'use client'`. Use `createPortal(content, document.body)`.

**Animation:** Slides in from RIGHT. Backdrop dims rest of screen.

```
Drawer width: min(320px, 85vw)
Animation in:  260ms ease-out
Animation out: 220ms ease-in
```

Use a `closing` state: on close → set `closing=true` → wait 220ms → call `onClose()`. This lets the CSS exit animation play before the component unmounts.

**Drawer content (top → bottom):**

### A. Profile Card
```
[ Avatar 48px ]  Full Name (Chakra Petch)
                 Tier badge (Free / Pro / Business / Enterprise)
                 "View Profile →"
```
- Background: `from-[hsl(var(--primary)/0.15)] to-transparent` gradient
- Tap avatar/name → `/profile`, closes drawer

### B. Quick Action Tiles (2×2 grid)
```
[ My Listings ]  [ Saved ]
[ Transactions ] [ Notifications (badge) ]
```
- `bg-card rounded-xl` tiles, icon + small label
- Notifications tile shows badge count

### C. Nav Groups

**Marketplace**
- Browse Equipment → `/search`
- Post a Listing → `/listings/new`
- SOS Broadcast → `/sos`
- Market Insights → `/insights` *(Pro+ badge if free tier)*

**Account**
- Dashboard → `/dashboard`
- Messages → `/messages` *(unread badge)*
- Profile & Settings → `/profile`
- Seller Storefront → `/sellers/[userId]` *(only if `hasStorefront === true`)*

**Support**
- Help Center → `/help`
- Pricing → `/pricing`

Group headers: `text-muted-foreground text-[10px] uppercase tracking-widest font-semibold px-3 pt-4 pb-1`
Nav rows: full-width, icon left, label center, badge/arrow right. `active:bg-accent` press state.

### D. Subscription Upsell (free tier only)
```
⚡ Upgrade to Pro
Unlock AI tools, pricing intelligence, demand forecasts & more.
[ Upgrade — $179/mo ]  (orange gradient button)
```
- `bg-[hsl(var(--primary)/0.1)] border border-[hsl(var(--primary)/0.3)] rounded-xl` card
- Only rendered when `subscriptionTier === 'free'`

### E. Drawer Footer
```
[ ThemeToggle ]          [ Sign Out ]
```
- `ThemeToggle` — same component used in main header
- Sign Out → existing sign-out server action

**Closing behavior:**
- Tap backdrop → close
- Swipe left 50px+ on drawer panel → close
- `useEffect(() => setDrawerOpen(false), [pathname])` — close on route change
- Escape key → close
- `aria-modal="true"` `role="dialog"` on drawer panel, focus trap on open

**Props:**
```ts
interface MobileMenuDrawerProps {
  open: boolean
  onClose: () => void
  user: { name: string; avatarUrl: string | null; id: string }
  subscriptionTier: 'free' | 'pro' | 'business' | 'enterprise'
  unreadMessages: number
  unreadNotifications: number
  hasStorefront: boolean
}
```

---

## 4. MobileNavClient Wrapper

**File:** `src/components/mobile-nav/MobileNavClient.tsx`
`'use client'`

Holds `drawerOpen` state. Renders `MobileHeader`, `MobileBottomNav`, `MobileMenuDrawer`. Receives all data as props from the server layout. This keeps the layout a Server Component.

```tsx
'use client'
import { useState } from 'react'
import { MobileHeader } from './MobileHeader'
import { MobileBottomNav } from './MobileBottomNav'
import { MobileMenuDrawer } from './MobileMenuDrawer'

interface MobileNavClientProps {
  user: { name: string; avatarUrl: string | null; id: string }
  subscriptionTier: 'free' | 'pro' | 'business' | 'enterprise'
  unreadMessages: number
  unreadNotifications: number
  hasStorefront: boolean
}

export function MobileNavClient(props: MobileNavClientProps) {
  const [drawerOpen, setDrawerOpen] = useState(false)
  return (
    <>
      <MobileHeader
        unreadNotifications={props.unreadNotifications}
        onMenuOpen={() => setDrawerOpen(true)}
      />
      <MobileBottomNav unreadMessages={props.unreadMessages} />
      <MobileMenuDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        {...props}
      />
    </>
  )
}
```

---

## 5. Layout Integration — `src/app/(main)/layout.tsx`

### Server-side data to fetch (using `createAdminClient()`):
```ts
// Fetch for current authenticated user:
const unreadMessages    // COUNT from messages where conversation is user's + is_read = false
const unreadNotifications // COUNT from notifications where user_id = userId AND is_read = false
const subscriptionTier  // from subscriptions table or profiles.subscription_tier
const profile           // { full_name, avatar_url, id } from profiles
const hasStorefront     // EXISTS check in seller_storefronts where user_id = userId
```

### Updated layout structure:
```tsx
<div className="flex min-h-screen">
  {/* Desktop sidebar — hidden on mobile */}
  <DesktopSidebar className="hidden md:flex" />

  <div className="flex flex-col flex-1 md:ml-[var(--desktop-nav-width, 240px)]">
    {/* Mobile nav (header + bottom + drawer) */}
    <MobileNavClient
      user={{ name: profile.full_name, avatarUrl: profile.avatar_url, id: profile.id }}
      subscriptionTier={subscriptionTier}
      unreadMessages={unreadMessages}
      unreadNotifications={unreadNotifications}
      hasStorefront={hasStorefront}
    />

    {/* Page content — padded for mobile header + bottom nav */}
    <main className="flex-1 pt-[52px] pb-[72px] md:pt-0 md:pb-0">
      {children}
    </main>
  </div>
</div>
```

The `pt-[52px]` accounts for the fixed 52px mobile header. The `pb-[72px]` accounts for the 56px bottom nav + safe area. Both are removed at `md:` breakpoint.

---

## 6. globals.css Additions

```css
/* SOS button pulse */
@keyframes sos-pulse {
  0%, 100% {
    box-shadow: 0 4px 14px rgba(255, 107, 43, 0.45);
  }
  50% {
    box-shadow: 0 4px 22px rgba(255, 107, 43, 0.75);
    transform: scale(1.04);
  }
}

/* Drawer slide animations */
@keyframes drawer-slide-in {
  from { transform: translateX(100%); }
  to   { transform: translateX(0); }
}
@keyframes drawer-slide-out {
  from { transform: translateX(0); }
  to   { transform: translateX(100%); }
}
@keyframes mobile-backdrop-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}

/* Body scroll lock when drawer is open */
body.drawer-open {
  overflow: hidden;
  touch-action: none;
}

/* Bottom nav iOS safe area */
.mobile-bottom-nav {
  padding-bottom: max(8px, env(safe-area-inset-bottom));
}
```

---

## Edge Cases & Validation

- **Horizontal overflow:** Header must never overflow at 320px. "METAL GEAR" wordmark can be truncated to just the gear icon monogram at very narrow viewports if needed. Test at 320px.
- **SOS raised button + overflow:** Bottom nav must have `overflow: visible` and no parent `overflow: hidden` clipping it.
- **iOS safe areas:** Header: `padding-top: env(safe-area-inset-top)`. Bottom nav: `padding-bottom: max(8px, env(safe-area-inset-bottom))`.
- **Portal dialogs:** `MobileMenuDrawer` renders via `createPortal` to `document.body` — avoids z-index stacking context issues with fixed positioned parents.
- **Body scroll lock:** Add `document.body.classList.add('drawer-open')` on open. Remove on close. Restore on component unmount.
- **Swipe-to-close:** Touch events on the drawer panel only. `touchstart` stores start X. `touchmove` tracks delta. `touchend` triggers close if `deltaX < -50` (left swipe ≥ 50px).
- **Storefront link:** Query `seller_storefronts` in layout. Only pass `hasStorefront: true` if record exists.
- **Desktop untouched:** All mobile components have `md:hidden`. Desktop sidebar/nav receives zero changes.
- **Unauthenticated users:** If user is not logged in, gracefully handle null profile. The `(main)` layout already requires auth — this shouldn't be reachable, but add null guard.

---

## Success Criteria

- [ ] No horizontal scrolling at any mobile viewport (320px–430px)
- [ ] Header: wordmark + search + bell + hamburger — 4 elements, never overflows
- [ ] Bottom nav: 5 tabs, SOS raised +16px above nav, pulse glow animation active
- [ ] Active tab highlighted in `hsl(var(--primary))`
- [ ] Drawer slides in from right ≤260ms, smooth, no jank on low-end Android
- [ ] Backdrop dims + blurs on drawer open; tap backdrop closes drawer
- [ ] Swipe left on drawer ≥50px closes it
- [ ] Profile card, quick actions, nav groups, upgrade CTA, footer all render
- [ ] Free tier sees upgrade CTA; Pro+ does not
- [ ] Drawer closes on pathname change (route navigation)
- [ ] Body scroll locked while drawer open; restored on close
- [ ] Focus trapped in drawer; Escape closes it
- [ ] Desktop layout completely unaffected
- [ ] No TypeScript errors, no ESLint warnings
- [ ] Tested on iOS Safari (safe areas, overflow clipping) and Android Chrome

---

## Commit Message

```
feat(mobile): Facebook-style mobile nav — header, bottom tabs, slide-in drawer

- MobileHeader: wordmark + search + notifications + hamburger (no overflow)
- MobileBottomNav: 5 tabs, raised SOS button with pulse glow, unread badges
- MobileMenuDrawer: slides from right 260ms, profile card, quick actions,
  grouped nav, upgrade CTA for free tier, theme toggle + sign out footer
- MobileNavClient: thin client wrapper holds drawer state; data server-side
- Drawer: backdrop blur, swipe-to-close, focus trap, body scroll lock,
  auto-close on pathname change, Escape key support
- globals.css: sos-pulse, drawer-slide-in/out, backdrop-in keyframes
- Layout: 52px top / 72px bottom padding on mobile; stripped at md:

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
