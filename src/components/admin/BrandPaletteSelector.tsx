'use client'

import { useState, useTransition } from 'react'
import { setPlatformPalette, type PaletteType } from '@/app/actions/palette'
import { toast } from 'sonner'
import { Sun, Moon, Check } from 'lucide-react'

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
      bg: '#0A0A0F',
      card: '#111118',
      primary: '#FF6B2B',
      secondary: '#3A8FD4',
      text: '#F2F2F2',
      muted: '#555568',
    },
    light: {
      bg: '#FAFAFA',
      card: '#FFFFFF',
      primary: '#FF6B2B',
      secondary: '#3A8FD4',
      text: '#18181B',
      muted: '#71717A',
    },
  },
  {
    id: 'ocean',
    name: 'Ocean',
    tagline: 'Deep navy to luminous cyan. Bold, modern, coastal confidence.',
    dark: {
      bg: '#020D1C',
      card: '#061525',
      primary: '#0077B6',
      secondary: '#00B4D8',
      text: '#D4F5FB',
      muted: '#4A8FA8',
    },
    light: {
      bg: '#EAF8FC',
      card: '#FFFFFF',
      primary: '#023E8A',
      secondary: '#0077B6',
      text: '#020347',
      muted: '#3A6E8A',
    },
  },
]

interface BrandPaletteSelectorProps {
  currentPalette: PaletteType
}

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
      <div className="flex items-center gap-1 mb-0.5">
        {mode === 'dark' ? (
          <Moon size={9} style={{ color: colors.muted }} />
        ) : (
          <Sun size={9} style={{ color: colors.muted }} />
        )}
        <span
          className="text-[8px] font-medium uppercase tracking-widest"
          style={{ color: colors.muted }}
        >
          {mode}
        </span>
      </div>

      <div
        className="rounded px-1.5 py-1 flex items-center gap-1.5"
        style={{ backgroundColor: colors.card }}
      >
        <span
          className="w-3 h-3 rounded-full flex-shrink-0"
          style={{ backgroundColor: colors.primary }}
        />
        <div className="flex flex-col gap-0.5 flex-1 min-w-0">
          <div
            className="h-1.5 rounded-full w-3/4"
            style={{ backgroundColor: colors.text, opacity: 0.9 }}
          />
          <div
            className="h-1 rounded-full w-1/2"
            style={{ backgroundColor: colors.muted }}
          />
        </div>
        <span
          className="w-8 h-3 rounded-sm flex-shrink-0 text-[6px] font-bold flex items-center justify-center"
          style={{ backgroundColor: colors.primary, color: '#fff' }}
        >
          CTA
        </span>
      </div>

      <div className="flex gap-0.5 mt-auto">
        {[colors.primary, colors.secondary, colors.muted].map((c, i) => (
          <span
            key={i}
            className="flex-1 h-1 rounded-full"
            style={{ backgroundColor: c }}
          />
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
      <div>
        <h3 className="text-base font-semibold text-foreground font-display">
          Brand Palette
        </h3>
        <p className="text-sm text-muted-foreground mt-1 leading-relaxed">
          Controls the color system for all users across the entire platform. Each
          palette includes a <strong className="text-foreground">dark</strong> and{' '}
          <strong className="text-foreground">light</strong> mode — use the{' '}
          <span className="inline-flex items-center gap-0.5">
            <Sun size={12} className="inline" />
            <span>/</span>
            <Moon size={12} className="inline" />
          </span>{' '}
          toggle in the header to switch between them.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {PALETTES.map((p) => {
          const isSelected = selected === p.id
          const isActive = currentPalette === p.id

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
              {isSelected && (
                <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                  <Check
                    size={11}
                    className="text-primary-foreground"
                    strokeWidth={3}
                  />
                </span>
              )}

              <div className="mb-3 pr-6">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-foreground font-display uppercase tracking-wide">
                    {p.name}
                  </span>
                  {isActive && (
                    <span className="text-[9px] font-semibold uppercase tracking-widest bg-primary/15 text-primary px-1.5 py-0.5 rounded-full border border-primary/30">
                      Active
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-relaxed">
                  {p.tagline}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <PalettePreview colors={p.dark} mode="dark" />
                <PalettePreview colors={p.light} mode="light" />
              </div>

              <div className="flex gap-1 mt-3">
                {[
                  p.dark.bg,
                  p.dark.primary,
                  p.dark.secondary,
                  p.light.bg,
                  p.light.primary,
                  p.light.secondary,
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

      <div className="flex items-start gap-3 rounded-lg bg-muted/50 border border-border px-4 py-3 text-xs text-muted-foreground">
        <span className="flex-shrink-0 mt-0.5">
          <Sun size={13} className="inline mr-1" />
          <Moon size={13} className="inline" />
        </span>
        <p className="leading-relaxed">
          <strong className="text-foreground">Two independent controls:</strong> this
          card picks the palette (Industrial or Ocean). The sun/moon toggle in the header
          switches dark / light within whichever palette is active. Changes here apply
          instantly for all users — no redeploy needed.
        </p>
      </div>

      <div className="flex items-center justify-between pt-1 border-t border-border">
        <p className="text-xs text-muted-foreground">
          {selected === currentPalette
            ? `${currentPalette === 'ocean' ? 'Ocean' : 'Industrial'} is the active palette`
            : `Switching from ${currentPalette} \u2192 ${selected}`}
        </p>
        <button
          onClick={handleApply}
          disabled={isPending || selected === currentPalette}
          className="px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:opacity-90 active:scale-95"
        >
          {isPending ? 'Applying\u2026' : 'Apply Palette'}
        </button>
      </div>
    </div>
  )
}
