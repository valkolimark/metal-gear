# Cycle 18-C — Ocean Palette System (Brand Theme Switcher)

## Objective

Add a second brand palette — **Ocean** — as a platform-level theme alongside the existing **Industrial** palette (orange/dark). The Ocean palette uses a deep navy-to-cyan range. **Both palettes fully support light and dark modes** via the existing `next-themes` ThemeToggle. Admins switch the active palette from the Admin Settings page. The setting is stored in `system_config` and applied via a `data-palette` attribute on `<html>`.

The existing Industrial palette is **unchanged and remains the default**.

---

## How the Two-Axis System Works

There are two independent controls:

| Control | Values | Where set |
|---------|--------|-----------|
| **Palette** | `industrial` \| `ocean` | `data-palette` on `<html>`, stored in `system_config` |
| **Mode** | dark \| light | `.dark` class on `<html>`, managed by `next-themes` |

This gives **4 valid combinations:**

| | Industrial | Ocean |
|---|---|---|
| **Dark** | `html.dark[data-palette="industrial"]` | `html.dark[data-palette="ocean"]` |
| **Light** | `html:not(.dark)[data-palette="industrial"]` | `html:not(.dark)[data-palette="ocean"]` |

The ThemeToggle in the header is unchanged — it still switches dark/light within whichever palette is active. The `BrandPaletteSelector` in admin only switches the palette, not the mode.

### Critical: `next-themes` does NOT add a `.light` class

`next-themes` with `attribute="class"` only toggles `.dark` on `<html>`. It does **not** add `.light`. Light mode = absence of `.dark`.

**Wrong selector:** `.light [data-palette="ocean"]` — never matches  
**Correct selector:** `html[data-palette="ocean"]:not(.dark)` — matches light ocean  
**Correct selector:** `html.dark[data-palette="ocean"]` — matches dark ocean

All CSS in this prompt uses the correct `:not(.dark)` pattern.

---

## Ocean Palette Reference

| Name | Hex | HSL | Role in Dark | Role in Light |
|------|-----|-----|-------------|---------------|
| Deep Twilight | `#03045E` | `239 97% 19%` | bg tint base | text base |
| French Blue | `#023E8A` | `214 97% 27%` | — | **primary CTA** |
| Bright Teal Blue | `#0077B6` | `203 100% 36%` | **primary CTA** | secondary CTA |
| Blue Green | `#0096C7` | `196 100% 39%` | secondary | accent |
| Turquoise Surf | `#00B4D8` | `193 100% 42%` | highlights | hover |
| Sky Aqua | `#48CAE4` | `192 75% 59%` | accent / hover | muted accent |
| Frosted Blue | `#90E0EF` | `193 72% 75%` | muted text | — |
| Frosted Blue Light | `#ADE8F4` | `193 80% 82%` | subtle text | border |
| Light Cyan | `#CAF0F8` | `194 79% 90%` | — | bg tint |

---

## Files to Create / Modify

| Action | File |
|--------|------|
| Modify | `src/app/globals.css` — Ocean dark + light token blocks |
| Create | `src/app/actions/palette.ts` — `getPlatformPalette`, `setPlatformPalette` |
| Modify | `src/app/layout.tsx` — read palette, set `data-palette` on `<html>` |
| Create | `src/components/palette-provider.tsx` — client-side `data-palette` sync |
| Create | `src/components/admin/BrandPaletteSelector.tsx` — palette switcher UI |
| Modify | `src/app/(admin)/settings/page.tsx` — render `BrandPaletteSelector` |
| Modify | `src/app/(admin)/admin.css` — Ocean dark + light admin token overrides |

---

## 1. Database

No new table. Uses existing `system_config` (key-value, from Cycle 12).

Key: `platform_palette` · Values: `'industrial'` or `'ocean'` · Default if missing: `'industrial'`

Before the server action runs, verify `system_config.key` has a UNIQUE constraint. Check in Supabase dashboard → Table Editor → `system_config` → Indexes. If missing, run via Supabase Management API:
```sql
ALTER TABLE system_config ADD CONSTRAINT system_config_key_unique UNIQUE (key);
```

---

## 2. `src/app/globals.css` — Ocean Palette Tokens

Add these blocks **after** the existing Industrial `:root` / `.dark` blocks. Do not modify any existing tokens.

```css
/* ================================================================
   OCEAN PALETTE — DARK MODE
   Selector: html.dark with data-palette="ocean"
   next-themes adds .dark class for dark mode.
   ================================================================ */
html.dark[data-palette="ocean"] {
  /* Backgrounds — near-black navy */
  --background:          222 90%  5%;   /* #020D1C */
  --card:                220 70%  8%;   /* #061525 */
  --popover:             220 70%  8%;
  --sidebar-bg:          222 80%  6%;   /* #040F1E */
  --sidebar-border:      220 60% 12%;

  /* Foreground — ice-blue white */
  --foreground:          193 79% 92%;   /* #D4F5FB */
  --card-foreground:     193 60% 88%;
  --popover-foreground:  193 60% 88%;
  --muted:               220 50% 14%;
  --muted-foreground:    193 40% 58%;   /* Frosted Blue mid-tone */

  /* Primary — Bright Teal Blue #0077B6 */
  --primary:             203 100% 36%;
  --primary-foreground:    0   0% 100%;
  --primary-rgb:         0, 119, 182;   /* for rgba() in shadows/glows */

  /* Secondary — Turquoise Surf #00B4D8 */
  --secondary:           193 100% 42%;
  --secondary-foreground:  0   0% 100%;

  /* Accent — Sky Aqua tint */
  --accent:              192  72% 20%;
  --accent-foreground:   192  75% 82%;

  /* Semantic */
  --border:              220  50% 16%;
  --input:               220  50% 12%;
  --ring:                203 100% 36%;
  --destructive:           0  72% 51%;
  --destructive-foreground: 0   0% 100%;

  /* Named ocean tokens (for direct use if needed) */
  --ocean-deep-twilight: #03045E;
  --ocean-french-blue:   #023E8A;
  --ocean-teal-blue:     #0077B6;
  --ocean-blue-green:    #0096C7;
  --ocean-turquoise:     #00B4D8;
  --ocean-sky-aqua:      #48CAE4;
  --ocean-frosted-blue:  #90E0EF;
  --ocean-frosted-light: #ADE8F4;
  --ocean-light-cyan:    #CAF0F8;

  --radius: 0.5rem;
}

/* ================================================================
   OCEAN PALETTE — LIGHT MODE
   Selector: html WITHOUT .dark class, with data-palette="ocean"
   next-themes removes .dark for light mode — it does NOT add .light.
   NEVER use ".light [data-palette=ocean]" — that class doesn't exist.
   ================================================================ */
html[data-palette="ocean"]:not(.dark) {
  /* Backgrounds — icy cyan surfaces */
  --background:          194  60% 95%;  /* #EAF8FC */
  --card:                  0   0% 100%; /* #FFFFFF */
  --popover:               0   0% 100%;
  --sidebar-bg:          222  80% 18%;  /* #052C52 — navy sidebar (always dark) */
  --sidebar-border:      214  70% 24%;

  /* Foreground — deep navy on light bg */
  --foreground:          239  97% 14%;  /* #020347 — near Deep Twilight */
  --card-foreground:     222  80% 18%;
  --popover-foreground:  222  80% 18%;
  --muted:               193  50% 88%;  /* #C2EDF7 */
  --muted-foreground:    214  60% 40%;

  /* Primary — French Blue #023E8A (WCAG AA on light bg) */
  --primary:             214  97% 27%;
  --primary-foreground:    0   0% 100%;
  --primary-rgb:         2, 62, 138;

  /* Secondary — Bright Teal Blue #0077B6 */
  --secondary:           203 100% 36%;
  --secondary-foreground:  0   0% 100%;

  /* Accent — Light Cyan tint */
  --accent:              193  60% 88%;
  --accent-foreground:   239  97% 19%;

  /* Semantic */
  --border:              193  50% 78%;
  --input:               193  40% 90%;
  --ring:                214  97% 27%;
  --destructive:           0  72% 51%;
  --destructive-foreground: 0   0% 100%;

  /* Named ocean tokens (same values, both modes) */
  --ocean-deep-twilight: #03045E;
  --ocean-french-blue:   #023E8A;
  --ocean-teal-blue:     #0077B6;
  --ocean-blue-green:    #0096C7;
  --ocean-turquoise:     #00B4D8;
  --ocean-sky-aqua:      #48CAE4;
  --ocean-frosted-blue:  #90E0EF;
  --ocean-frosted-light: #ADE8F4;
  --ocean-light-cyan:    #CAF0F8;

  --radius: 0.5rem;
}

/* ================================================================
   OCEAN PALETTE — SOS Button (both modes)
   Override Industrial orange glow with teal glow.
   ================================================================ */
html[data-palette="ocean"] .sos-button,
html[data-palette="ocean"] [data-sos-trigger] {
  background-color: hsl(var(--primary)) !important;
  box-shadow: 0 4px 14px rgba(var(--primary-rgb), 0.5) !important;
}

@keyframes sos-pulse-ocean-dark {
  0%, 100% { box-shadow: 0 4px 14px rgba(0, 119, 182, 0.5); }
  50%       { box-shadow: 0 4px 24px rgba(0, 119, 182, 0.8); transform: scale(1.04); }
}
@keyframes sos-pulse-ocean-light {
  0%, 100% { box-shadow: 0 4px 14px rgba(2, 62, 138, 0.45); }
  50%       { box-shadow: 0 4px 22px rgba(2, 62, 138, 0.70); transform: scale(1.04); }
}

html.dark[data-palette="ocean"] .sos-pulse {
  animation: sos-pulse-ocean-dark 2.5s ease-in-out infinite !important;
}
html[data-palette="ocean"]:not(.dark) .sos-pulse {
  animation: sos-pulse-ocean-light 2.5s ease-in-out infinite !important;
}
```

---

## 3. `src/app/actions/palette.ts`

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
      {
        key: 'platform_palette',
        value: palette,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )
  if (error) return { success: false }

  // Set cookie for zero-latency reads in root layout on subsequent requests
  const cookieStore = await cookies()
  cookieStore.set('platform_palette', palette, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  revalidatePath('/', 'layout')
  return { success: true }
}
```

---

## 4. `src/app/layout.tsx` — Set `data-palette` on `<html>`

```tsx
import { cookies } from 'next/headers'
import { getPlatformPalette, type PaletteType } from '@/app/actions/palette'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies()
  const paletteCookie = cookieStore.get('platform_palette')?.value
  const palette: PaletteType =
    paletteCookie === 'ocean' || paletteCookie === 'industrial'
      ? (paletteCookie as PaletteType)
      : await getPlatformPalette()

  return (
    <html
      lang="en"
      suppressHydrationWarning   // already present for next-themes
      data-palette={palette}     // ← ADD THIS ATTRIBUTE
    >
      <body>
        {/* existing ThemeProvider and children */}
      </body>
    </html>
  )
}
```

`suppressHydrationWarning` is required by `next-themes` and is already present — `data-palette` is safe to add alongside it.

---

## 5. `src/components/palette-provider.tsx`

Ensures the `data-palette` attribute stays in sync if it ever drifts on the client (e.g. after a palette change before full navigation).

```tsx
'use client'

import { useEffect } from 'react'
import type { PaletteType } from '@/app/actions/palette'

export function PaletteProvider({ palette }: { palette: PaletteType }) {
  useEffect(() => {
    document.documentElement.setAttribute('data-palette', palette)
  }, [palette])
  return null
}
```

Render inside `RootLayout`'s `<body>`, after `ThemeProvider`:
```tsx
<PaletteProvider palette={palette} />
```

---

## 6. `src/components/admin/BrandPaletteSelector.tsx`

This is the most important UX piece. The card must make the two-axis system obvious:
- **Row of palette cards** — picks Industrial or Ocean
- **Each card shows split dark/light preview** — left half dark, right half light
- **Explanatory note** — tells the admin the ThemeToggle controls dark/light within the palette

```tsx
'use client'

import { useState, useTransition } from 'react'
import { setPlatformPalette, type PaletteType } from '@/app/actions/palette'
import { toast } from 'sonner'
import { Sun, Moon, Check } from 'lucide-react'

// Each palette defines its dark and light preview colors
const PALETTES: Array<{
  id: PaletteType
  name: string
  tagline: string
  dark: {
    bg: string
    card: string
    primary: string
    secondary: string
    text: string
    muted: string
  }
  light: {
    bg: string
    card: string
    primary: string
    secondary: string
    text: string
    muted: string
  }
}> = [
  {
    id: 'industrial',
    name: 'Industrial',
    tagline: 'Combustion orange on deep black. The original Metal Gear identity.',
    dark: {
      bg:        '#0A0A0F',
      card:      '#111118',
      primary:   '#FF6B2B',
      secondary: '#3A8FD4',
      text:      '#F2F2F2',
      muted:     '#555568',
    },
    light: {
      bg:        '#FAFAFA',
      card:      '#FFFFFF',
      primary:   '#FF6B2B',
      secondary: '#3A8FD4',
      text:      '#18181B',
      muted:     '#71717A',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    tagline: 'Deep navy to luminous cyan. Bold, modern, coastal confidence.',
    dark: {
      bg:        '#020D1C',
      card:      '#061525',
      primary:   '#0077B6',
      secondary: '#00B4D8',
      text:      '#D4F5FB',
      muted:     '#4A8FA8',
    },
    light: {
      bg:        '#EAF8FC',
      card:      '#FFFFFF',
      primary:   '#023E8A',
      secondary: '#0077B6',
      text:      '#020347',
      muted:     '#3A6E8A',
    },
  },
]

interface BrandPaletteSelectorProps {
  currentPalette: PaletteType
}

// Mini mock-UI preview rendered inside each palette card
function PalettePreview({
  colors,
  mode,
}: {
  colors: (typeof PALETTES)[0]['dark']
  mode: 'dark' | 'light'
}) {
  return (
    <div
      className="relative w-full h-[80px] rounded-lg overflow-hidden flex flex-col p-2 gap-1"
      style={{ backgroundColor: colors.bg }}
    >
      {/* Mode label */}
      <div className="flex items-center gap-1 mb-0.5">
        {mode === 'dark'
          ? <Moon size={9} style={{ color: colors.muted }} />
          : <Sun  size={9} style={{ color: colors.muted }} />
        }
        <span className="text-[8px] font-medium uppercase tracking-widest"
          style={{ color: colors.muted }}>
          {mode}
        </span>
      </div>

      {/* Mock card */}
      <div
        className="rounded px-1.5 py-1 flex items-center gap-1.5"
        style={{ backgroundColor: colors.card }}
      >
        {/* Primary color dot */}
        <span className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: colors.primary }} />
        {/* Text lines */}
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <div className="h-1.5 rounded-full w-3/4"
            style={{ backgroundColor: colors.text, opacity: 0.9 }} />
          <div className="h-1 rounded-full w-1/2"
            style={{ backgroundColor: colors.muted }} />
        </div>
        {/* Secondary accent */}
        <span className="w-8 h-3 rounded-sm flex-shrink-0 text-[6px] font-bold flex items-center justify-center"
          style={{ backgroundColor: colors.primary, color: '#fff' }}>
          CTA
        </span>
      </div>

      {/* Secondary color strip */}
      <div className="flex gap-0.5 mt-auto">
        {[colors.primary, colors.secondary, colors.muted].map((c, i) => (
          <span key={i} className="flex-1 h-1 rounded-full" style={{ backgroundColor: c }} />
        ))}
      </div>
    </div>
  )
}

export function BrandPaletteSelector({ currentPalette }: BrandPaletteSelectorProps) {
  const [selected, setSelected] = useState<PaletteType>(currentPalette)
  const [isPending, startTransition] = useTransition()

  const handleApply = () => {
    startTransition(async () => {
      const result = await setPlatformPalette(selected)
      if (result.success) {
        // Live preview — update html attribute immediately
        document.documentElement.setAttribute('data-palette', selected)
        toast.success(
          `${selected === 'ocean' ? 'Ocean' : 'Industrial'} palette applied platform-wide`
        )
      } else {
        toast.error('Failed to save palette — try again')
      }
    })
  }

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-5">

      {/* Header */}
      <div>
        <h3 className="text-base font-semibold text-foreground font-['Chakra_Petch']">
          Brand Palette
        </h3>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          Controls the color system for all users across the entire platform.
          Each palette includes a <strong className="text-foreground">dark</strong> and{' '}
          <strong className="text-foreground">light</strong> mode — use the{' '}
          <span className="inline-flex items-center gap-0.5">
            <Sun size={12} className="inline" /><span>/</span><Moon size={12} className="inline" />
          </span>{' '}
          toggle in the header to switch between them.
        </p>
      </div>

      {/* Palette cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PALETTES.map((p) => {
          const isSelected = selected === p.id
          const isActive   = currentPalette === p.id

          return (
            <button
              key={p.id}
              onClick={() => setSelected(p.id)}
              className={[
                'relative text-left rounded-xl border-2 p-4 transition-all duration-150',
                'hover:scale-[1.01] active:scale-[0.99]',
                isSelected
                  ? 'border-primary bg-primary/5 shadow-sm'
                  : 'border-border bg-card hover:border-muted-foreground/40',
              ].join(' ')}
            >
              {/* Selected checkmark */}
              {isSelected && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary
                  flex items-center justify-center">
                  <Check size={11} className="text-primary-foreground" strokeWidth={3} />
                </span>
              )}

              {/* Palette name + tagline */}
              <div className="mb-3 pr-6">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground
                    font-['Chakra_Petch'] uppercase tracking-wide">
                    {p.name}
                  </span>
                  {isActive && (
                    <span className="text-[9px] font-semibold uppercase tracking-widest
                      bg-primary/15 text-primary px-1.5 py-0.5 rounded-full border
                      border-primary/30">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {p.tagline}
                </p>
              </div>

              {/* Split dark / light preview */}
              <div className="grid grid-cols-2 gap-2">
                <PalettePreview colors={p.dark}  mode="dark"  />
                <PalettePreview colors={p.light} mode="light" />
              </div>

              {/* Color swatch strip */}
              <div className="flex gap-1 mt-3">
                {[p.dark.bg, p.dark.primary, p.dark.secondary,
                  p.light.bg, p.light.primary, p.light.secondary
                ].map((color, i) => (
                  <span
                    key={i}
                    className="flex-1 h-2 rounded-full border border-border/30"
                    style={{ backgroundColor: color }}
                    title={color}
                  />
                ))}
              </div>
            </button>
          )
        })}
      </div>

      {/* Explanation callout */}
      <div className="flex items-start gap-3 rounded-lg bg-muted/50 border border-border
        px-4 py-3 text-xs text-muted-foreground">
        <span className="flex-shrink-0 mt-0.5">
          <Sun size={13} className="inline mr-1" />
          <Moon size={13} className="inline" />
        </span>
        <p className="leading-relaxed">
          <strong className="text-foreground">Two independent controls:</strong> this card
          picks the palette (Industrial or Ocean). The{' '}
          <span className="font-medium text-foreground">☀️ / 🌙 toggle</span> in the
          header switches dark ↔ light within whichever palette is active.
          Changes here apply instantly for all users — no redeploy needed.
        </p>
      </div>

      {/* Apply row */}
      <div className="flex items-center justify-between pt-1 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {selected === currentPalette
            ? `${currentPalette === 'ocean' ? 'Ocean' : 'Industrial'} is the active palette`
            : `Switching from ${currentPalette} → ${selected}`
          }
        </p>
        <button
          onClick={handleApply}
          disabled={isPending || selected === currentPalette}
          className={[
            'px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150',
            'disabled:opacity-40 disabled:cursor-not-allowed',
            'bg-primary text-primary-foreground',
            'hover:opacity-90 active:scale-95',
          ].join(' ')}
        >
          {isPending ? 'Applying…' : 'Apply Palette'}
        </button>
      </div>
    </div>
  )
}
```

---

## 7. `src/app/(admin)/settings/page.tsx`

Fetch current palette server-side and pass to `BrandPaletteSelector`. Add to the Platform Configuration tab (or create an "Appearance" sub-section if the config tab is already long):

```tsx
import { getPlatformPalette } from '@/app/actions/palette'
import { BrandPaletteSelector } from '@/components/admin/BrandPaletteSelector'

// In the page component (server-side):
const currentPalette = await getPlatformPalette()

// In the JSX, inside the Platform Configuration section:
<section className="space-y-4">
  <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
    Appearance
  </h2>
  <BrandPaletteSelector currentPalette={currentPalette} />
</section>
```

---

## 8. `src/app/(admin)/admin.css` — Ocean Variants for Admin

Append these blocks to `admin.css`. The selector specificity correctly layers:
`html.dark[data-palette="ocean"] [data-section="admin"]` wins over
`[data-section="admin"]` (Industrial dark default).

```css
/* ==============================================================
   ADMIN — OCEAN DARK MODE
   html.dark + data-palette="ocean" + data-section="admin"
   ============================================================== */
html.dark[data-palette="ocean"] [data-section="admin"] {
  --background:           222 90%  5%;
  --card:                 220 70%  8%;
  --sidebar-bg:           222 85%  7%;
  --sidebar-border:       214 60% 14%;
  --popover:              220 70%  8%;

  --foreground:           193 79% 92%;
  --card-foreground:      193 60% 88%;
  --muted:                220 50% 14%;
  --muted-foreground:     193 40% 58%;

  --primary:              203 100% 36%;
  --primary-foreground:     0   0% 100%;
  --secondary:            193 100% 42%;
  --secondary-foreground:   0   0% 100%;

  --border:               220  50% 16%;
  --input:                220  50% 12%;
  --ring:                 203 100% 36%;
  --accent:               192  72% 20%;
  --accent-foreground:    192  75% 80%;
  --destructive:            0  72% 51%;
  --destructive-foreground: 0   0% 100%;

  --admin-stat-card-bg:       220 65% 10%;
  --admin-table-header-bg:    222 70%  9%;
  --admin-table-stripe:       222 80%  7%;
  --admin-badge-bg:           220 50% 16%;
}

/* ==============================================================
   ADMIN — OCEAN LIGHT MODE
   html:not(.dark) + data-palette="ocean" + data-section="admin"
   Sidebar ALWAYS stays dark (navy) — only content area lightens.
   ============================================================== */
html[data-palette="ocean"]:not(.dark) [data-section="admin"] {
  --background:           194  60% 95%;
  --card:                   0   0% 100%;
  --sidebar-bg:           222  80% 16%;  /* Dark navy — intentional */
  --sidebar-border:       214  70% 22%;
  --popover:                0   0% 100%;

  --foreground:           239  97% 14%;
  --card-foreground:      222  80% 18%;
  --muted:                193  50% 88%;
  --muted-foreground:     214  60% 40%;

  --primary:              214  97% 27%;  /* French Blue for light bg */
  --primary-foreground:     0   0% 100%;
  --secondary:            203 100% 36%;
  --secondary-foreground:   0   0% 100%;

  --border:               193  50% 78%;
  --input:                193  40% 90%;
  --ring:                 214  97% 27%;
  --accent:               193  60% 88%;
  --accent-foreground:    239  97% 19%;
  --destructive:            0  72% 51%;
  --destructive-foreground: 0   0% 100%;

  --admin-stat-card-bg:       193 50% 96%;
  --admin-table-header-bg:    193 45% 93%;
  --admin-table-stripe:       194 40% 97%;
  --admin-badge-bg:           193 50% 88%;
}

/* Admin sidebar always uses dark text treatment (sidebar-bg is always dark) */
html[data-palette="ocean"] [data-section="admin"] .admin-sidebar {
  background-color: hsl(var(--sidebar-bg));
  border-right: 1px solid hsl(var(--sidebar-border));
  --sidebar-fg:        193 79% 88%;
  --sidebar-muted:     193 30% 55%;
  --sidebar-active-bg: 203 80% 18%;    /* subtle teal tint */
  color: hsl(var(--sidebar-fg));
}
```

---

## Edge Cases & Validation

**CSS selector correctness — the most critical detail:**
- `html.dark[data-palette="ocean"]` — both attributes on the same element. This is correct: `html` has both `.dark` class and `data-palette="ocean"` attribute.
- `html[data-palette="ocean"]:not(.dark)` — `html` has `data-palette="ocean"` but NOT the `.dark` class. This is the light mode match.
- Never use `.light` as a class selector — `next-themes` does not add this class.

**Testing the 4 combinations:**
After implementation, manually test all 4 states in browser devtools:
1. Set `html.class = "dark"` and `html.data-palette = "industrial"` → Industrial dark
2. Remove `.dark` from `html.class` → Industrial light
3. Set `html.data-palette = "ocean"` with `.dark` → Ocean dark
4. Remove `.dark` with `data-palette = "ocean"` → Ocean light

All 4 must look distinctly correct.

**Cookie-first read:** First visit with no cookie → DB query. After first palette set → cookie is fast (0ms overhead). Cookie name: `platform_palette`. Verify it is set with `sameSite: 'lax'` and `path: '/'`.

**`revalidatePath('/', 'layout')` scope:** This marks the root layout cache as stale. On next navigation, the RSC re-runs and the new palette is read. The `PaletteProvider` client component also syncs the attribute immediately for the current tab.

**Portal components (shadcn Dialog, DropdownMenu, Popover):** These render at `document.body` but inherit `data-palette` from `<html>` since the attribute is on the root element. Ocean tokens apply correctly to portaled components.

**Contrast ratios — Ocean light mode:** French Blue `#023E8A` on `#EAF8FC` = 9.4:1 (AAA). Teal Blue `#0077B6` on `#FFFFFF` = 4.7:1 (AA large). Both pass WCAG. Do not swap these — French Blue must be the primary in light mode for contrast compliance.

**`system_config` unique constraint:** If upsert fails with "duplicate key" error, the UNIQUE constraint is missing. Run the migration in section 1 before calling `setPlatformPalette`.

---

## Success Criteria

- [ ] `npm run build` passes zero errors
- [ ] `npm run typecheck` passes
- [ ] `npm run lint` passes

**Four combinations (test all manually in devtools):**
- [ ] Industrial dark — `#0A0A0F` bg, orange CTAs, steel blue accents (unchanged from today)
- [ ] Industrial light — `#FAFAFA` bg, orange CTAs (unchanged from today)
- [ ] Ocean dark — near-black navy bg, teal blue CTAs, turquoise accents, ice-blue text
- [ ] Ocean light — icy cyan bg, French Blue CTAs, deep navy text

**BrandPaletteSelector:**
- [ ] Both palette cards render with split dark/light preview panels
- [ ] Active badge shows on current palette
- [ ] Selecting a different palette enables the Apply button
- [ ] Selecting the already-active palette keeps Apply disabled
- [ ] Applying live-updates `<html data-palette>` without page reload
- [ ] Explanatory note about ThemeToggle is visible

**Persistence:**
- [ ] After applying Ocean, hard-reload still shows Ocean (cookie persists)
- [ ] After applying Industrial, hard-reload still shows Industrial

**Admin section:**
- [ ] Admin sidebar stays dark (navy) in Ocean light mode
- [ ] Admin content area is light (cyan/white) in Ocean light mode
- [ ] Admin content area is dark (navy) in Ocean dark mode

**No regressions:**
- [ ] Industrial palette looks identical to pre-Cycle-18 (all 14 AI features, listing pages, admin pages)
- [ ] No hydration warnings in browser console
- [ ] No SSR flash (palette applied server-side before paint)
- [ ] SOS button glow is teal in Ocean, orange in Industrial

---

## Commit Message

```
feat(theme): Ocean palette with full dark/light mode support

- globals.css: Ocean dark (html.dark[data-palette=ocean]) and
  Ocean light (html[data-palette=ocean]:not(.dark)) token blocks
  Fix: never use .light selector — next-themes only toggles .dark class
  Colors: Deep Twilight #03045E → Light Cyan #CAF0F8 range
  Light primary: French Blue #023E8A (WCAG AAA on cyan bg)
  Dark primary: Teal Blue #0077B6 (WCAG AA on navy bg)
- palette.ts: getPlatformPalette / setPlatformPalette server actions
  Cookie-first read, system_config upsert, revalidatePath
- Root layout: data-palette on <html> server-side (no flash)
- PaletteProvider: client sync for live preview after admin change
- BrandPaletteSelector: split dark/light preview panels per palette,
  active badge, explanatory note about ThemeToggle, live apply
- admin.css: Ocean dark + light overrides, sidebar always dark
- Industrial palette unchanged, remains default

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
