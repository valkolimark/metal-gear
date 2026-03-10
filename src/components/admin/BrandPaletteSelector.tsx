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
            {selected === p.id && (
              <span className="absolute top-3 right-3 w-2 h-2 rounded-full bg-primary" />
            )}

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

            {p.id === currentPalette && (
              <span className="mt-2 inline-block text-[10px] font-medium uppercase tracking-wide bg-muted text-muted-foreground px-2 py-0.5 rounded-full">
                Active
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Changes apply instantly for all users — no deploy needed.
        </p>
        <button
          onClick={handleApply}
          disabled={isPending || selected === currentPalette}
          className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
        >
          {isPending ? 'Applying\u2026' : 'Apply Palette'}
        </button>
      </div>
    </div>
  )
}
