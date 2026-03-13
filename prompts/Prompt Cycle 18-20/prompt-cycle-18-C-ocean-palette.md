# Cycle 18-C — Ocean Palette System (Brand Theme Switcher)

## Objective

Add a second brand palette — **Ocean** — as a platform-level theme alongside the existing **Industrial** palette (orange/dark). The Ocean palette uses a deep navy-to-cyan range. Both palettes work across light and dark modes. Admins switch the active palette from the Admin Settings page. The setting is stored in `system_config` and applied globally via a `data-palette` attribute on `<html>`.

The existing Industrial palette is **unchanged and remains the default**.

---

## Ocean Palette Reference

| Name | Hex | HSL (approx) | Role |
|------|-----|------|------|
| Deep Twilight | `#03045E` | `239 97% 19%` | darkest navy, dark-mode bg tint |
| French Blue | `#023E8A` | `214 97% 27%` | bold blue, light-mode primary |
| Bright Teal Blue | `#0077B6` | `203 100% 36%` | **primary CTA (dark mode)** |
| Blue Green | `#0096C7` | `196 100% 39%` | secondary actions |
| Turquoise Surf | `#00B4D8` | `193 100% 42%` | **secondary / highlights** |
| Sky Aqua | `#48CAE4` | `192 75% 59%` | accent, hover states |
| Frosted Blue | `#90E0EF` | `193 72% 75%` | muted foreground, light elements |
| Frosted Blue Light | `#ADE8F4` | `193 80% 82%` | subtle highlights |
| Light Cyan | `#CAF0F8` | `194 79% 90%` | light-mode bg tint, borders |

---

## Files to Create / Modify

| Action | File |
|--------|------|
| Modify | `src/app/globals.css` — add Ocean palette CSS tokens |
| Create | `src/app/actions/palette.ts` — server actions for palette read/write |
| Modify | `src/app/layout.tsx` — read palette from system_config, set `data-palette` on `<html>` |
| Create | `src/components/palette-provider.tsx` — client component for client-side palette sync |
| Modify | `src/app/(admin)/settings/page.tsx` — add Brand Palette selector card |
| Modify | `src/app/(admin)/admin.css` — palette-aware admin tokens (Ocean variants) |

---

## 1. Database

No new table needed. Uses existing `system_config` table (key-value, already exists from Cycle 12).

**Write the palette setting via server action (see section 3).** The key is `platform_palette`, value is `'industrial'` or `'ocean'`.

If no row exists, default is `'industrial'`.

---

## 2. `src/app/globals.css` — Ocean Palette Tokens

Add the following blocks **after** the existing Industrial `:root` and `.dark` blocks. The scope selector `[data-palette="ocean"]` overrides Industrial tokens for the Ocean theme. Both dark and light variants are included.

```css
/* ============================================================
   OCEAN PALETTE — Dark Mode
   Applied when: [data-palette="ocean"].dark or
                 [data-palette="ocean"] (dark is default theme)
   ============================================================ */
[data-palette="ocean"].dark,
.dark [data-palette="ocean"] {
  /* Backgrounds — deep navy, darker than Deep Twilight */
  --background: 222 90% 5%;          /* #020D1C — near-black navy */
  --card: 220 70% 8%;                /* #061525 — dark navy card */
  --popover: 220 70% 8%;
  --sidebar-bg: 222 80% 6%;          /* #040F1E — sidebar navy */
  --sidebar-border: 220 60% 12%;

  /* Foreground */
  --foreground: 193 79% 92%;         /* #D4F5FB — ice blue white */
  --card-foreground: 193 60% 88%;
  --popover-foreground: 193 60% 88%;
  --muted: 220 50% 14%;              /* muted bg */
  --muted-foreground: 193 40% 58%;   /* Frosted Blue mid-tone */

  /* Primary — Bright Teal Blue #0077B6 */
  --primary: 203 100% 36%;
  --primary-foreground: 0 0% 100%;
  --primary-rgb: 0, 119, 182;        /* for rgba() usage (SOS glow, etc.) */

  /* Secondary — Turquoise Surf #00B4D8 */
  --secondary: 193 100% 42%;
  --secondary-foreground: 0 0% 100%;

  /* Accent — Sky Aqua #48CAE4 */
  --accent: 192 72% 25%;             /* subtle accent bg */
  --accent-foreground: 192 75% 80%;

  /* Semantic */
  --border: 220 50% 16%;
  --input: 220 50% 12%;
  --ring: 203 100% 36%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;

  /* Ocean-specific tokens */
  --color-deep-twilight: #03045E;
  --color-french-blue: #023E8A;
  --color-teal-blue: #0077B6;
  --color-blue-green: #0096C7;
  --color-turquoise: #00B4D8;
  --color-sky-aqua: #48CAE4;
  --color-frosted-blue: #90E0EF;
  --color-frosted-light: #ADE8F4;
  --color-light-cyan: #CAF0F8;

  /* Preserve radius */
  --radius: 0.5rem;
}

/* ============================================================
   OCEAN PALETTE — Light Mode
   Applied when: .light [data-palette="ocean"]
   Uses navy text on icy cyan surfaces.
   ============================================================ */
.light [data-palette="ocean"] {
  /* Backgrounds — icy cyan/white */
  --background: 194 60% 95%;         /* #EAF8FC — very light cyan */
  --card: 0 0% 100%;                 /* #FFFFFF */
  --popover: 0 0% 100%;
  --sidebar-bg: 222 80% 18%;         /* #052C52 — dark navy sidebar */
  --sidebar-border: 214 70% 24%;

  /* Foreground — deep navy on light bg */
  --foreground: 239 97% 14%;         /* #020347 — near Deep Twilight */
  --card-foreground: 222 80% 18%;
  --popover-foreground: 222 80% 18%;
  --muted: 193 50% 88%;              /* #C2EDF7 */
  --muted-foreground: 214 60% 40%;   /* mid-blue */

  /* Primary — French Blue #023E8A (dark enough for light bg contrast) */
  --primary: 214 97% 27%;
  --primary-foreground: 0 0% 100%;
  --primary-rgb: 2, 62, 138;

  /* Secondary — Bright Teal Blue #0077B6 */
  --secondary: 203 100% 36%;
  --secondary-foreground: 0 0% 100%;

  /* Accent — Light Cyan tint */
  --accent: 193 60% 88%;
  --accent-foreground: 239 97% 19%;

  /* Semantic */
  --border: 193 50% 78%;
  --input: 193 40% 90%;
  --ring: 214 97% 27%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;

  /* Ocean-specific tokens (same as dark) */
  --color-deep-twilight: #03045E;
  --color-french-blue: #023E8A;
  --color-teal-blue: #0077B6;
  --color-blue-green: #0096C7;
  --color-turquoise: #00B4D8;
  --color-sky-aqua: #48CAE4;
  --color-frosted-blue: #90E0EF;
  --color-frosted-light: #ADE8F4;
  --color-light-cyan: #CAF0F8;

  --radius: 0.5rem;
}

/* ============================================================
   OCEAN PALETTE — SOS Button Glow
   Override the Industrial orange glow with teal glow
   ============================================================ */
[data-palette="ocean"] .sos-button,
[data-palette="ocean"] [data-sos-trigger] {
  background-color: hsl(var(--primary)) !important;
  box-shadow: 0 4px 14px rgba(var(--primary-rgb), 0.5) !important;
}

@keyframes sos-pulse-ocean {
  0%, 100% { box-shadow: 0 4px 14px rgba(0, 119, 182, 0.5); }
  50%       { box-shadow: 0 4px 24px rgba(0, 119, 182, 0.8); transform: scale(1.04); }
}

[data-palette="ocean"] .sos-pulse {
  animation: sos-pulse-ocean 2.5s ease-in-out infinite !important;
}
```

---

## 3. `src/app/actions/palette.ts` — Server Actions

```ts
'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'
import { cookies } from 'next/headers'

export type PaletteType = 'industrial' | 'ocean'

export async function getPlatformPalette(): Promise<PaletteType> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('system_config')
    .select('value')
    .eq('key', 'platform_palette')
    .single()
  return (data?.value as PaletteType) ?? 'industrial'
}

export async function setPlatformPalette(palette: PaletteType): Promise<{ success: boolean }> {
  const supabase = createAdminClient()
  const { error } = await supabase
    .from('system_config')
    .upsert(
      { key: 'platform_palette', value: palette, updated_at: new Date().toISOString() },
      { onConflict: 'key' }
    )
  if (error) return { success: false }

  // Also set a cookie so the root layout can read it server-side on next request
  const cookieStore = await cookies()
  cookieStore.set('platform_palette', palette, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  })

  revalidatePath('/', 'layout')
  return { success: true }
}
```

**Why the cookie:** The root layout is a Server Component and runs once per request. Reading `system_config` on every page load adds one DB query. Using a cookie is zero-latency. The cookie is set whenever the admin changes the palette and revalidation fires. For the first load before any cookie exists, fall back to `system_config` query.

---

## 4. `src/app/layout.tsx` — Apply `data-palette` to `<html>`

In the root layout, read the palette preference (cookie first, DB fallback) and set `data-palette` on `<html>`:

```tsx
import { cookies } from 'next/headers'
import { getPlatformPalette } from '@/app/actions/palette'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Read palette — cookie is fast, DB is fallback
  const cookieStore = await cookies()
  const paletteCookie = cookieStore.get('platform_palette')?.value
  const palette = (paletteCookie === 'ocean' || paletteCookie === 'industrial')
    ? paletteCookie
    : await getPlatformPalette()

  return (
    <html
      lang="en"
      suppressHydrationWarning
      data-palette={palette}         // ← ADD THIS
    >
      <body>
        {/* existing ThemeProvider, children, etc. */}
      </body>
    </html>
  )
}
```

`suppressHydrationWarning` is already present (required by `next-themes`) — the `data-palette` attribute is safe to add here.

---

## 5. `src/components/palette-provider.tsx` — Client-Side Palette Sync

This small client component ensures that if an admin switches the palette, the change reflects immediately in the current browser session without a full navigation (for admin preview purposes).

```tsx
'use client'

import { useEffect } from 'react'

interface PaletteProviderProps {
  palette: 'industrial' | 'ocean'
}

export function PaletteProvider({ palette }: PaletteProviderProps) {
  useEffect(() => {
    document.documentElement.setAttribute('data-palette', palette)
  }, [palette])
  return null
}
```

Import and render `<PaletteProvider palette={palette} />` inside `RootLayout`'s `<body>` after the `ThemeProvider`. It's a no-op on server render; on client it syncs the attribute if it ever drifts.

---

## 6. Admin Settings — Brand Palette Selector

**File:** `src/app/(admin)/settings/page.tsx` (or the relevant settings tab component)

Add a "Brand Palette" card in the Platform Configuration tab (or a new "Appearance" tab if settings are tabbed). The card shows both palettes side-by-side as visual swatches, with a radio/button selector and a live apply action.

### Card structure:

```tsx
// At the top of the settings component (server-side data fetch):
const currentPalette = await getPlatformPalette()

// In the JSX, add the BrandPaletteSelector component:
<BrandPaletteSelector currentPalette={currentPalette} />
```

### `src/components/admin/BrandPaletteSelector.tsx` — Create this component

`'use client'`

```tsx
'use client'

import { useState, useTransition } from 'react'
import { setPlatformPalette, type PaletteType } from '@/app/actions/palette'
import { toast } from 'sonner'

const PALETTES = [
  {
    id: 'industrial' as PaletteType,
    name: 'Industrial',
    description: 'Default — deep black with orange primary and steel blue accents.',
    swatches: ['#0A0A0F', '#FF6B2B', '#3A8FD4', '#1A1A24'],
    primaryLabel: 'Combustion Orange',
  },
  {
    id: 'ocean' as PaletteType,
    name: 'Ocean',
    description: 'Deep navy to luminous cyan — confident, modern, coastal.',
    swatches: ['#03045E', '#0077B6', '#00B4D8', '#48CAE4'],
    primaryLabel: 'Teal Blue',
  },
]

interface BrandPaletteSelectorProps {
  currentPalette: PaletteType
}

export function BrandPaletteSelector({ currentPalette }: BrandPaletteSelectorProps) {
  const [selected, setSelected] = useState<PaletteType>(currentPalette)
  const [isPending, startTransition] = useTransition()

  const handleApply = () => {
    startTransition(async () => {
      const result = await setPlatformPalette(selected)
      if (result.success) {
        toast.success(`${selected === 'ocean' ? 'Ocean' : 'Industrial'} palette applied`)
        // Sync the html attribute immediately for live preview
        document.documentElement.setAttribute('data-palette', selected)
      } else {
        toast.error('Failed to apply palette')
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4">
      <div>
        <h3 className="text-base font-semibold text-foreground">Brand Palette</h3>
        <p className="text-sm text-muted-foreground mt-0.5">
          Controls the color system across the entire platform. Takes effect for all users immediately.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {PALETTES.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p.id)}
            className={[
              'relative text-left rounded-lg border-2 p-4 transition-all',
              selected === p.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-border/80 bg-card',
            ].join(' ')}
          >
            {/* Active indicator */}
            {selected === p.id && (
              <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary" />
            )}

            {/* Swatch row */}
            <div className="flex gap-1.5 mb-3">
              {p.swatches.map((color) => (
                <span
                  key={color}
                  className="w-8 h-8 rounded-md border border-white/10 flex-shrink-0"
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>

            <div className="font-semibold text-sm text-foreground">{p.name}</div>
            <div className="text-xs text-muted-foreground mt-0.5">{p.description}</div>

            {/* Current badge */}
            {p.id === currentPalette && (
              <span className="mt-2 inline-block text-[10px] font-medium uppercase tracking-wide
                bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Apply button — only enabled if selection differs from current */}
      <div className="flex items-center justify-between pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Changes apply instantly for all users — no deploy needed.
        </p>
        <button
          onClick={handleApply}
          disabled={isPending || selected === currentPalette}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium
            disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {isPending ? 'Applying…' : 'Apply Palette'}
        </button>
      </div>
    </div>
  )
}
```

---

## 7. Admin CSS — Ocean Palette in Admin Section

**File:** `src/app/(admin)/admin.css`

Add Ocean palette overrides for the admin section. These stack: `.dark [data-palette="ocean"] [data-section="admin"]` selects admin in ocean dark mode.

```css
/* ----------------------------------------------------------
   ADMIN — OCEAN DARK MODE
   ---------------------------------------------------------- */
.dark [data-palette="ocean"] [data-section="admin"],
[data-palette="ocean"] [data-section="admin"] {
  --background: 222 90% 5%;
  --card: 220 70% 8%;
  --sidebar-bg: 222 85% 7%;
  --sidebar-border: 214 60% 14%;
  --popover: 220 70% 8%;

  --foreground: 193 79% 92%;
  --card-foreground: 193 60% 88%;
  --muted: 220 50% 14%;
  --muted-foreground: 193 40% 58%;

  --primary: 203 100% 36%;
  --primary-foreground: 0 0% 100%;
  --secondary: 193 100% 42%;
  --secondary-foreground: 0 0% 100%;

  --border: 220 50% 16%;
  --input: 220 50% 12%;
  --ring: 203 100% 36%;
  --accent: 192 72% 20%;
  --accent-foreground: 192 75% 80%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;

  --admin-stat-card-bg: 220 65% 10%;
  --admin-table-header-bg: 222 70% 9%;
  --admin-table-stripe: 222 80% 7%;
  --admin-badge-bg: 220 50% 16%;
}

/* ----------------------------------------------------------
   ADMIN — OCEAN LIGHT MODE
   ---------------------------------------------------------- */
.light [data-palette="ocean"] [data-section="admin"] {
  --background: 194 60% 95%;
  --card: 0 0% 100%;
  --sidebar-bg: 222 80% 16%;         /* Dark navy sidebar (always dark) */
  --sidebar-border: 214 70% 22%;
  --popover: 0 0% 100%;

  --foreground: 239 97% 14%;
  --card-foreground: 222 80% 18%;
  --muted: 193 50% 88%;
  --muted-foreground: 214 60% 40%;

  --primary: 214 97% 27%;
  --primary-foreground: 0 0% 100%;
  --secondary: 203 100% 36%;
  --secondary-foreground: 0 0% 100%;

  --border: 193 50% 78%;
  --input: 193 40% 90%;
  --ring: 214 97% 27%;
  --accent: 193 60% 88%;
  --accent-foreground: 239 97% 19%;
  --destructive: 0 72% 51%;
  --destructive-foreground: 0 0% 100%;

  --admin-stat-card-bg: 193 50% 96%;
  --admin-table-header-bg: 193 45% 93%;
  --admin-table-stripe: 194 40% 97%;
  --admin-badge-bg: 193 50% 88%;
}
```

---

## Edge Cases & Validation

- **Cookie vs DB race:** On first-ever visit (no cookie), layout reads from DB. On subsequent visits, cookie is fast. When admin changes palette, cookie is set + path revalidated — old cookie is overwritten immediately.
- **Palette persists across deployments:** Stored in `system_config` DB table, not hardcoded — survives deploys.
- **No SSR flicker:** `data-palette` is set server-side in the root layout before HTML reaches the client. No client-only flash.
- **Admin preview:** `BrandPaletteSelector` sets `document.documentElement.setAttribute('data-palette', selected)` immediately on Apply — admin sees the change live before navigating.
- **SOS pulse color:** The `sos-pulse-ocean` keyframe uses hardcoded `rgba(0, 119, 182, ...)` matching the Ocean primary. The Industrial palette keeps the existing `rgba(255, 107, 43, ...)` animation.
- **Portal components in Ocean mode:** shadcn dialogs/popovers rendered at `document.body` inherit `data-palette` from `<html>` — they will use Ocean tokens correctly since the attribute is on the root element.
- **`system_config` table:** Must have `key` column with unique constraint for upsert to work. Verify `ON CONFLICT (key)` exists. If not, add migration:
  ```sql
  ALTER TABLE system_config ADD CONSTRAINT system_config_key_unique UNIQUE (key);
  ```
- **Revalidation scope:** `revalidatePath('/', 'layout')` revalidates the root layout segment, causing all pages to regenerate on next request with the new palette.

---

## Success Criteria

- [ ] Root `<html>` element has `data-palette="industrial"` by default (no visible change from current)
- [ ] Switching to Ocean in admin settings changes `data-palette` to `"ocean"` on `<html>`
- [ ] Ocean dark mode: near-black navy bg, teal blue primary CTAs, turquoise secondary accents
- [ ] Ocean light mode: icy cyan bg, French Blue primary, dark navy text
- [ ] Both themes (Industrial + Ocean) work correctly in both light and dark modes (4 total combinations)
- [ ] Admin palette selector shows both palettes with color swatches, active badge on current
- [ ] Apply button is disabled when no change is made; enabled when a different palette is selected
- [ ] Palette persists after page reload (cookie + DB)
- [ ] Admin sidebar remains dark in Ocean light mode
- [ ] SOS glow/pulse uses teal in Ocean palette, orange in Industrial palette
- [ ] `BrandPaletteSelector` gives live preview immediately on Apply (before page reload)
- [ ] No TypeScript or ESLint errors
- [ ] No SSR hydration mismatches

---

## Commit Message

```
feat(theme): add Ocean palette as switchable brand theme

- globals.css: Ocean dark + light token sets under [data-palette="ocean"]
  Colors: Deep Twilight → French Blue → Teal Blue → Turquoise → Light Cyan
- src/app/actions/palette.ts: getPlatformPalette / setPlatformPalette server actions
  Cookie-first read (zero latency), system_config DB write, revalidatePath
- Root layout: reads palette from cookie/DB, sets data-palette on <html>
- PaletteProvider: client component syncs data-palette attribute on mount
- BrandPaletteSelector: admin UI with visual swatches, active badge, live apply
- admin.css: Ocean dark + light variants for admin section
- Industrial palette (existing) unchanged; remains default

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
