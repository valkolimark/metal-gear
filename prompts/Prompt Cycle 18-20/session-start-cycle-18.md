# Metal Gear — Cycle 18 Session Start

## Project
B2B industrial equipment marketplace. Houston, TX. Oil & gas, petrochemical, mining, manufacturing, CNC.

**Live:** https://metal-gear-five.vercel.app
**GitHub:** valkolimark/metal-gear (branch: main)
**Supabase:** fkcyfpdkcrhjieauhchn
**Vercel team:** team_9n9GosoaraicsoDdbAFgzr5j
**Vercel project:** prj_HQBv7jMhui6LGW5vzVC5pmCMndlx

---

## Stack
Next.js 15 App Router · TypeScript · Supabase (PostgreSQL + Auth + Realtime) · Tailwind CSS v4 (CSS config, no tailwind.config.ts) · shadcn/ui (new-york) · Zustand + TanStack Query · Stripe · Resend · Anthropic Claude Sonnet 4 · Cloudflare R2 + Stream · Vercel · Sentry

## Design System
Light/dark via `next-themes`. Dark default: `#0A0A0F` bg · `#FF6B2B` orange · `#3A8FD4` steel blue. Light: `#FAFAFA` bg. Chakra Petch (headings) · Manrope (body).

---

## Critical Rules — Read Before Writing Any Code

1. **All DB ops use server actions with `createAdminClient()`.** Never client-side Supabase — hangs in production due to RLS + SSR.
2. **Never pass functions from Server Components to Client Components.** Use server actions in separate `'use server'` files.
3. **All media uploads go through `src/lib/media.ts`.** Never use Supabase Storage directly.
4. **Deploy via Vercel API curl, not CLI** (git author mismatch):
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

Cycles 1–17 complete. Full marketplace + AI Intelligence Layer (14 features) + Cycle 17 listing page redesign all live. See `CHANGELOG.md` for full history.

The last completed work (Cycle 17) includes:
- Amazon-style 3-column listing detail page
- Mobile touch swipe gallery
- Inline Ask Metal Gear AI chat (streaming)
- Floating AI Help assistant (streaming)
- Public/anonymous listing access with soft signup gating

---

## This Session — Cycle 18

Execute the following three prompt files **in order**. Each must be fully implemented, tested, and verified before moving to the next. Do not start 18-B until 18-A passes all its success criteria. Do not start 18-C until 18-B passes all its success criteria.

```
prompts/prompt-cycle-18-A-mobile-nav.md
prompts/prompt-cycle-18-B-admin-css.md
prompts/prompt-cycle-18-C-ocean-palette.md
```

---

## Execution Plan

### Phase 1 — Implement 18-A: Mobile Navigation Redesign

Read `prompts/prompt-cycle-18-A-mobile-nav.md` in full before writing any code.

Implement in this order:
1. Add CSS keyframes to `src/app/globals.css` (SOS pulse, drawer animations, body scroll lock)
2. Create `src/components/mobile-nav/MobileHeader.tsx`
3. Create `src/components/mobile-nav/MobileBottomNav.tsx`
4. Create `src/components/mobile-nav/MobileMenuDrawer.tsx`
5. Create `src/components/mobile-nav/MobileNavClient.tsx`
6. Modify `src/app/(main)/layout.tsx` — fetch server-side data, render `MobileNavClient`, add correct padding offsets

**Before moving on**, verify 18-A success criteria:
- [ ] `npm run build` passes with zero errors
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] No horizontal scroll at 320px viewport (inspect element in devtools)
- [ ] Header renders: wordmark + search + bell + hamburger (4 items only)
- [ ] Bottom nav renders: 5 tabs, SOS button raised above nav bar
- [ ] Drawer opens/closes, slides from right, backdrop present
- [ ] Desktop layout unchanged (sidebar still renders at md+ breakpoints)
- [ ] `pt-[52px] pb-[72px]` padding applies on mobile, removed at `md:`

### Phase 2 — Implement 18-B: Admin CSS Isolation

Read `prompts/prompt-cycle-18-B-admin-css.md` in full before writing any code.

Implement in this order:
1. Create `src/app/(admin)/admin.css` with full scoped token set (dark + light)
2. Modify `src/app/(admin)/layout.tsx` — import admin.css, add `data-section="admin"` wrapper, add `admin-sidebar` class to sidebar element, add `ThemeToggle` to admin header

**Before moving on**, verify 18-B success criteria:
- [ ] `npm run build` passes with zero errors
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] Admin pages in dark mode: near-black bg, original design preserved
- [ ] Admin pages in light mode: cool grey/slate, no white #FAFAFA bleed
- [ ] Admin sidebar is dark in BOTH light and dark modes
- [ ] Main app toggle (non-admin pages) is unaffected
- [ ] `ThemeToggle` visible in admin header

### Phase 3 — Implement 18-C: Ocean Palette

Read `prompts/prompt-cycle-18-C-ocean-palette-v2.md` in full before writing any code.

**Critical CSS rule — read before touching globals.css:**
`next-themes` with `attribute="class"` only toggles `.dark` on `<html>`. It does **not** add a `.light` class. Light mode = absence of `.dark`.
- ✅ Dark Ocean: `html.dark[data-palette="ocean"] { ... }`
- ✅ Light Ocean: `html[data-palette="ocean"]:not(.dark) { ... }`
- ❌ WRONG — never use: `.light [data-palette="ocean"]` — this never matches

Implement in this order:
1. Add Ocean token blocks to `src/app/globals.css` using the corrected selectors above
2. Create `src/app/actions/palette.ts` — `getPlatformPalette`, `setPlatformPalette` server actions
3. **Check `system_config` table for UNIQUE constraint on `key` column.** If missing, run:
   ```sql
   ALTER TABLE system_config ADD CONSTRAINT system_config_key_unique UNIQUE (key);
   ```
   via Supabase Management API before proceeding.
4. Modify `src/app/layout.tsx` — read palette (cookie → DB fallback), set `data-palette` on `<html>`
5. Create `src/components/palette-provider.tsx` — client-side sync component
6. Create `src/components/admin/BrandPaletteSelector.tsx` — palette switcher with split dark/light previews
7. Modify `src/app/(admin)/settings/page.tsx` — import and render `BrandPaletteSelector`
8. Modify `src/app/(admin)/admin.css` — add Ocean dark + light admin token variants using corrected selectors

**Before moving on**, verify all 4 palette × mode combinations in browser devtools:
- [ ] **Industrial dark** — `html.dark + data-palette="industrial"` → `#0A0A0F` bg, orange CTAs (unchanged from today)
- [ ] **Industrial light** — `html:not(.dark) + data-palette="industrial"` → `#FAFAFA` bg, orange CTAs (unchanged)
- [ ] **Ocean dark** — `html.dark + data-palette="ocean"` → near-black navy bg, teal blue CTAs, ice-blue text
- [ ] **Ocean light** — `html:not(.dark) + data-palette="ocean"` → icy cyan bg `#EAF8FC`, French Blue `#023E8A` CTAs, deep navy text

Additional checks:
- [ ] `npm run build` passes with zero errors
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes
- [ ] `<html data-palette="industrial">` by default (no visible change to current site)
- [ ] Admin settings shows Brand Palette card with split dark/light preview panels per palette
- [ ] Switching to Ocean updates `<html data-palette>` live, no page reload needed
- [ ] Palette persists after hard refresh (cookie preserved)
- [ ] Admin sidebar stays dark (navy) in Ocean light mode
- [ ] ThemeToggle still works within Ocean palette (switches dark ↔ light)
- [ ] No hydration warnings in browser console
- [ ] No SSR flash — palette applied server-side before paint

---

## Full Test Suite — Run After All Three Phases Complete

Once all three phases pass their individual checks, run the full test suite:

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

All four commands must pass with zero errors before committing. Fix any failures before proceeding to the commit step. Do not skip or suppress errors.

If `npm test` has pre-existing failures unrelated to Cycle 18 changes, document them in the commit message under a "Known pre-existing test failures" note, but do not introduce new failures.

---

## Cross-Feature Regression Checks

After the build passes, manually verify these areas were not broken by Cycle 18 changes:

- [ ] **Listing detail page** — opens without auth (anonymous), gallery swipes work, Ask Metal Gear chat loads
- [ ] **Search page** — conversational AI search renders, filters apply
- [ ] **SOS** — Quick SOS flow opens, floating SOS button visible on mobile (bottom-left, not obscured by bottom nav)
- [ ] **Admin Control Tower** — loads, stats visible, no white-bleed in dark mode
- [ ] **Admin Settings** — all existing tabs work, new Brand Palette card is present
- [ ] **Desktop layout** — sidebar renders correctly at ≥768px, no bottom nav visible, no extra padding

**Theme × Palette matrix — all 4 combinations must look correct:**

| Step | Action in devtools | Expected result |
|------|-------------------|-----------------|
| 1 | `html.className = "dark"`, `html.dataset.palette = "industrial"` | Black bg `#0A0A0F`, orange buttons |
| 2 | `html.className = ""` (remove dark) | White/grey bg `#FAFAFA`, orange buttons |
| 3 | `html.className = "dark"`, `html.dataset.palette = "ocean"` | Near-black navy bg, teal blue buttons |
| 4 | `html.className = ""`, `html.dataset.palette = "ocean"` | Icy cyan bg `#EAF8FC`, French Blue buttons |

The ThemeToggle button in the header must correctly switch between steps 3↔4 when Ocean is active, and between steps 1↔2 when Industrial is active.

---

## Commit & Deploy

After all tests pass and regression checks are complete, commit everything in a single structured commit:

```bash
git add -A
git commit -m "feat(cycle-18): mobile nav redesign, admin CSS isolation, Ocean palette

18-A — Mobile Navigation
- MobileHeader: wordmark + search + notifications + hamburger (no overflow)
- MobileBottomNav: 5 tabs, raised SOS button with teal/orange pulse glow
- MobileMenuDrawer: slides from right 260ms, profile card, quick actions,
  grouped nav, upgrade CTA (free tier), theme toggle + sign out footer
- MobileNavClient: thin client state wrapper, data stays server-side
- Drawer: backdrop blur, swipe-to-close, focus trap, body scroll lock,
  auto-close on pathname change, Escape key
- Layout: 52px top / 72px bottom padding mobile; stripped at md:

18-B — Admin CSS Isolation
- admin.css: scoped [data-section=\"admin\"] tokens, dark + light palettes
- Admin sidebar always dark in both themes
- Fixes Cycle 16 globals.css bleed into admin UI
- ThemeToggle added to admin header

18-C — Ocean Palette
- globals.css: Ocean dark (html.dark[data-palette=ocean]) +
  Ocean light (html[data-palette=ocean]:not(.dark)) token blocks
  Fix: next-themes never adds .light class — :not(.dark) is correct
  Dark primary: Teal Blue #0077B6 | Light primary: French Blue #023E8A
  Full range: Deep Twilight #03045E → Light Cyan #CAF0F8
- palette.ts: getPlatformPalette / setPlatformPalette server actions
  Cookie-first read, system_config upsert, revalidatePath
- Root layout: data-palette on <html> server-side (no flash)
- BrandPaletteSelector: split dark/light preview panels per palette,
  active badge, ThemeToggle explanation, live apply
- Industrial palette unchanged, remains default

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

Then push:
```bash
git push origin main
```

Then deploy via Vercel API:
```bash
curl -s -X POST "https://api.vercel.com/v13/deployments?teamId=team_9n9GosoaraicsoDdbAFgzr5j" \
  -H "Authorization: Bearer $VERCEL_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"metal-gear","project":"prj_HQBv7jMhui6LGW5vzVC5pmCMndlx","gitSource":{"type":"github","ref":"main","org":"valkolimark","repo":"metal-gear"},"target":"production"}'
```

Wait for deployment to complete and verify the live URL: https://metal-gear-five.vercel.app

---

## Post-Deploy Documentation

After successful deployment, complete these documentation steps:

### 1. Update `CHANGELOG.md`

Add a new versioned entry at the top following Keep a Changelog format:

```markdown
## [2.2.0] — 2026-03-09 · Mobile Nav Redesign, Admin CSS Isolation, Ocean Palette (Cycle 18)

### Added
- **MobileHeader** — fixed 52px header with wordmark, search, notification bell (dot badge), and hamburger; no horizontal overflow at any viewport width
- **MobileBottomNav** — fixed 5-tab bottom nav (Home / Search / SOS / Messages / Profile); center SOS tab raised 16px above baseline with pulse glow; iOS safe area aware
- **MobileMenuDrawer** — right-sliding drawer (260ms), dimmed backdrop, profile card, quick-action tiles, grouped nav sections, upgrade CTA for free-tier users, theme toggle + sign out footer
- **MobileNavClient** — thin client wrapper for drawer state; all data fetched server-side in layout
- **Admin CSS isolation** — `src/app/(admin)/admin.css` with scoped `[data-section="admin"]` tokens; dark and light admin palettes; sidebar always dark in both themes
- **Ocean brand palette** — Deep Twilight (`#03045E`) → French Blue (`#023E8A`) → Teal Blue (`#0077B6`) → Turquoise (`#00B4D8`) → Light Cyan (`#CAF0F8`); full dark + light variants
- **Brand Palette Switcher** — `BrandPaletteSelector` component in Admin Settings; visual swatches, active badge, live preview on apply; persisted in `system_config` + cookie
- **`getPlatformPalette` / `setPlatformPalette`** server actions in `src/app/actions/palette.ts`
- **`PaletteProvider`** client component for client-side `data-palette` sync
- ThemeToggle added to admin header

### Changed
- `(main)/layout.tsx` — renders `MobileNavClient` server-side; adds `pt-[52px] pb-[72px]` on mobile, removed at `md:`
- Root layout — reads palette from cookie (fast) or `system_config` (fallback); sets `data-palette` on `<html>` server-side (no flash)
- `globals.css` — Ocean palette token blocks added under `[data-palette="ocean"]`; isolation comment added; no existing token changes

### Fixed
- Cycle 16 global `:root` CSS variables bleeding into admin section; scoped admin tokens now override correctly
- Mobile header horizontal overflow/side-scroll eliminated
```

### 2. Update `README.md`

In the **Features** section under **Platform**, add:
```markdown
- **Mobile navigation** — Facebook-style fixed header, 5-tab bottom nav with raised SOS button, slide-in drawer with profile card, quick actions, and subscription upgrade CTA
- **Brand palette switcher** — Admin-controlled Ocean / Industrial theme; persisted in system_config; applies instantly platform-wide with no deploy
```

In the **Design System** section, update to mention:
```markdown
- **Brand palettes:** Industrial (default — orange/dark) and Ocean (navy/teal/cyan); switchable from Admin Settings
```

### 3. Write Session Summary

Create `prompts/session-2026-03-09.md`:

```markdown
# Metal Gear — Session Summary 2026-03-09

## Cycle 18 Complete

### What Was Built
Three parallel improvements shipped in one cycle:

**18-A: Mobile Navigation Redesign**
Replaced the overflowing mobile header with a clean Facebook-style system:
MobileHeader (52px, 4 items) + MobileBottomNav (5 tabs, raised SOS) + MobileMenuDrawer
(slide-in from right, 260ms). MobileNavClient thin wrapper keeps layout a Server Component.
Drawer includes profile card, quick actions, grouped nav, upgrade CTA, theme toggle.

**18-B: Admin CSS Isolation**
Created src/app/(admin)/admin.css with scoped [data-section="admin"] CSS custom properties.
Fixes the Cycle 16 globals.css bleed. Dark and light palettes both defined. Sidebar
always dark regardless of theme. ThemeToggle added to admin header.

**18-C: Ocean Palette**
Second brand palette. Deep navy (#03045E) through luminous cyan (#CAF0F8). Scoped via
[data-palette="ocean"] on <html>. Cookie-first read, system_config persistence. Admin
settings BrandPaletteSelector with swatches and live preview. Industrial palette unchanged.

### Files Created
- src/components/mobile-nav/MobileHeader.tsx
- src/components/mobile-nav/MobileBottomNav.tsx
- src/components/mobile-nav/MobileMenuDrawer.tsx
- src/components/mobile-nav/MobileNavClient.tsx
- src/app/(admin)/admin.css
- src/app/actions/palette.ts
- src/components/palette-provider.tsx
- src/components/admin/BrandPaletteSelector.tsx

### Files Modified
- src/app/(main)/layout.tsx
- src/app/(admin)/layout.tsx
- src/app/(admin)/settings/page.tsx
- src/app/layout.tsx
- src/app/globals.css
- CHANGELOG.md
- README.md

### Next Session
See CLAUDE.md "On the horizon" section for queued work:
- Multi-company profiles architecture (Cycle 16-1, queued)
- Online/offline presence indicators
- Category-specific listing field templates
- Inventory seeding (blocked until multi-company infra stable)
```

---

## If You Hit Errors

**TypeScript errors in layout.tsx after MobileNavClient:** Ensure all data passed as props has correct types. The `subscriptionTier` prop must be typed as `'free' | 'pro' | 'business' | 'enterprise'` — cast the DB string value accordingly.

**`createPortal` SSR error in MobileMenuDrawer:** Wrap portal render in `useEffect` + `useState(false)` mounted guard:
```tsx
const [mounted, setMounted] = useState(false)
useEffect(() => setMounted(true), [])
if (!mounted) return null
return createPortal(drawerContent, document.body)
```

**`system_config` upsert conflict error:** The `upsert` requires a unique constraint on `key`. Check via Supabase dashboard → Table Editor → `system_config` → indexes. If missing, run the migration in the prompt before the server action is called.

**Admin CSS not applying (tokens still from globals.css):** Verify `data-section="admin"` is on the outermost `<div>` in the admin layout return, not a child element. Check browser devtools → Elements → inspect `<div data-section="admin">` exists.

**Ocean light mode not applying (page stays dark after removing `.dark` class):** The selector is likely wrong. Check `globals.css` — the light Ocean selector must be `html[data-palette="ocean"]:not(.dark)`, NOT `.light [data-palette="ocean"]`. `next-themes` never adds a `.light` class. Find and replace any `.light` selectors with the `:not(.dark)` pattern.
