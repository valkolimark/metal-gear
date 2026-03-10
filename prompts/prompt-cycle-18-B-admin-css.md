# Cycle 18-B — Admin CSS Isolation & Light/Dark Theme Fix

## Objective

The Cycle 16 light/dark mode implementation introduced global `:root` CSS variables via `next-themes`. These are bleeding into the `(admin)` route group, overriding its dark sidebar design. The admin section needs scoped CSS custom properties isolated from the main app's palette, while still responding to both light and dark themes.

---

## Root Cause

`src/app/globals.css` defines:
- `:root { ... }` — light mode tokens (applied globally when `.dark` class is absent)
- `.dark { ... }` — dark mode tokens

The admin layout has no CSS scope boundary, so main app light-mode `:root` tokens bleed into admin UI. Admin was designed dark-only and has no light-mode fallbacks.

---

## Files to Create / Modify

| Action | File |
|--------|------|
| Create | `src/app/(admin)/admin.css` |
| Modify | `src/app/(admin)/layout.tsx` |
| Modify | `src/app/globals.css` — add isolation comment only, no token changes |

---

## Implementation

### 1. `src/app/(admin)/layout.tsx`

Import the admin CSS file and wrap the entire layout output in `<div data-section="admin">`. Do **not** add a second `ThemeProvider` — the one at root layout level is sufficient. The `data-section="admin"` attribute is the CSS scope hook; `.dark` / `.light` on `<html>` still cascades in.

```tsx
import '@/app/(admin)/admin.css'

// Wrap existing admin layout JSX:
<div data-section="admin" className="min-h-screen">
  {/* sidebar, header, children — unchanged */}
</div>
```

Add `ThemeToggle` to the admin header bar (top-right) if not already present:

```tsx
import { ThemeToggle } from '@/components/theme-toggle' // adjust to actual path

// In admin header:
<div className="flex items-center gap-3 ml-auto">
  <ThemeToggle />
  {/* existing admin header items */}
</div>
```

On the sidebar `<aside>` element, add the `admin-sidebar` class:
```tsx
<aside className="admin-sidebar fixed left-0 top-0 h-full ...">
```

---

### 2. `src/app/(admin)/admin.css`

```css
/* ============================================================
   ADMIN SECTION — Scoped CSS Custom Properties
   Scope: [data-section="admin"]
   Overrides globals.css for the entire admin subtree.
   Both .dark and .light (next-themes) are handled.
   ============================================================ */

/* ----------------------------------------------------------
   ADMIN DARK MODE (default — original admin design)
   Applies when: .dark [data-section="admin"]
   Also default (no theme class) since admin was dark-only.
   ---------------------------------------------------------- */
[data-section="admin"],
.dark [data-section="admin"] {
  --background: 240 10% 4%;
  --card: 240 6% 8%;
  --sidebar-bg: 240 8% 6%;
  --sidebar-border: 240 6% 12%;
  --popover: 240 6% 8%;

  --foreground: 0 0% 95%;
  --card-foreground: 0 0% 92%;
  --popover-foreground: 0 0% 92%;
  --muted: 240 6% 14%;
  --muted-foreground: 240 5% 55%;

  --primary: 20 100% 58%;
  --primary-foreground: 0 0% 100%;
  --secondary: 210 60% 52%;
  --secondary-foreground: 0 0% 100%;

  --border: 240 6% 15%;
  --input: 240 6% 12%;
  --ring: 20 100% 58%;
  --accent: 240 6% 14%;
  --accent-foreground: 0 0% 92%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;

  --admin-sidebar-width: 240px;
  --admin-header-height: 56px;
  --admin-stat-card-bg: 240 6% 10%;
  --admin-table-header-bg: 240 6% 10%;
  --admin-table-stripe: 240 6% 7%;
  --admin-badge-bg: 240 6% 16%;

  --radius: 0.5rem;
}

/* ----------------------------------------------------------
   ADMIN LIGHT MODE
   Applies when: .light [data-section="admin"]
   Intentionally NOT white — uses cool grey/slate surfaces
   to preserve the industrial, professional character.
   ---------------------------------------------------------- */
.light [data-section="admin"] {
  --background: 220 14% 93%;
  --card: 0 0% 100%;
  --sidebar-bg: 220 16% 20%;
  --sidebar-border: 220 16% 28%;
  --popover: 0 0% 100%;

  --foreground: 220 14% 12%;
  --card-foreground: 220 12% 15%;
  --popover-foreground: 220 12% 15%;
  --muted: 220 10% 88%;
  --muted-foreground: 220 8% 45%;

  --primary: 20 100% 58%;
  --primary-foreground: 0 0% 100%;
  --secondary: 210 60% 52%;
  --secondary-foreground: 0 0% 100%;

  --border: 220 12% 80%;
  --input: 220 12% 88%;
  --ring: 20 100% 58%;
  --accent: 220 10% 88%;
  --accent-foreground: 220 14% 12%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;

  --admin-stat-card-bg: 220 12% 96%;
  --admin-table-header-bg: 220 12% 94%;
  --admin-table-stripe: 220 10% 97%;
  --admin-badge-bg: 220 12% 88%;

  --radius: 0.5rem;
}

/* ----------------------------------------------------------
   ADMIN SIDEBAR — Always dark regardless of theme
   Dark mode:  near-black (#0d0d13)
   Light mode: dark slate (#293040) — intentional
   ---------------------------------------------------------- */
[data-section="admin"] .admin-sidebar {
  background-color: hsl(var(--sidebar-bg));
  border-right: 1px solid hsl(var(--sidebar-border));
}

/* Sidebar text always light (sidebar is always dark) */
[data-section="admin"] .admin-sidebar {
  --sidebar-fg: 0 0% 88%;
  --sidebar-muted: 0 0% 55%;
  --sidebar-active-bg: 20 80% 20%;
  color: hsl(var(--sidebar-fg));
}

/* ----------------------------------------------------------
   SCOPED SCROLLBAR — admin only
   ---------------------------------------------------------- */
[data-section="admin"] ::-webkit-scrollbar { width: 6px; height: 6px; }
[data-section="admin"] ::-webkit-scrollbar-track { background: hsl(var(--background)); }
[data-section="admin"] ::-webkit-scrollbar-thumb {
  background: hsl(var(--border));
  border-radius: 3px;
}
[data-section="admin"] ::-webkit-scrollbar-thumb:hover {
  background: hsl(var(--muted-foreground));
}
```

---

### 3. `src/app/globals.css` — Add isolation comment

Near the top of `globals.css`, add:

```css
/* NOTE: Admin section uses scoped tokens in src/app/(admin)/admin.css
   under [data-section="admin"]. Do not add admin-specific tokens here. */
```

No other changes to `globals.css`.

---

## Edge Cases & Validation

- **shadcn/ui components** inside admin (Card, Badge, Table, etc.) use `hsl(var(--background))` etc. — they automatically pick up scoped tokens via CSS cascade. No component changes needed.
- **Portal-rendered dialogs** (shadcn Dialog, DropdownMenu, Select) render at `document.body`, outside `[data-section="admin"]`. They will fall back to `<html>` `.dark`/`.light` tokens — acceptable, since they inherit correct dark/light state. Document this known limitation.
- **SSR hydration**: `data-section="admin"` is a static JSX attribute — no hydration mismatch.
- **Tailwind v4**: reads CSS variables at build time; runtime CSS specificity overrides work correctly. No `tailwind.config.ts` changes needed.
- **No second ThemeProvider**: The root layout's `ThemeProvider` handles `.dark`/`.light` class on `<html>`. Admin CSS uses these classes as selectors. One provider is sufficient.

---

## Success Criteria

- [ ] Admin pages render correctly with original dark design in dark mode
- [ ] Admin pages render in professional cool-grey design in light mode
- [ ] Admin sidebar is dark-tinted in BOTH themes
- [ ] Main app light/dark toggle is unaffected by admin CSS changes
- [ ] shadcn/ui components (Card, Table, Badge, Dialog) use admin-scoped tokens
- [ ] No `#FAFAFA` white background bleeding into admin panels
- [ ] `ThemeToggle` visible and functional in admin header
- [ ] No TypeScript or ESLint errors
- [ ] No hydration warnings in browser console
- [ ] Admin stats, tables, modals all render with correct palette

---

## Commit Message

```
fix(admin): isolate admin CSS from global theme tokens; add light mode

- Create src/app/(admin)/admin.css with [data-section="admin"] scoped tokens
- Dark admin palette: near-black bg, original design preserved
- Light admin palette: cool grey/slate surfaces, sidebar always dark
- Wrap admin layout root in data-section="admin" div
- Add ThemeToggle to admin header
- Sidebar keeps admin-sidebar class for always-dark treatment
- globals.css: add isolation comment, no token changes

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
