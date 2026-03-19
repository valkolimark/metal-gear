'use client'

import { useTheme } from 'next-themes'
import { Sun, Moon, Monitor } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useEffect, useState } from 'react'

const THEMES = ['system', 'light', 'dark'] as const

function getNextTheme(current: string): string {
  const idx = THEMES.indexOf(current as (typeof THEMES)[number])
  return THEMES[(idx + 1) % THEMES.length]
}

function getLabel(theme: string, resolvedTheme: string | undefined): string {
  if (theme === 'system') return `Auto (${resolvedTheme || 'system'})`
  return theme === 'dark' ? 'Dark' : 'Light'
}

export function ThemeToggle() {
  const { theme, resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // eslint-disable-next-line react-hooks/set-state-in-effect -- mount detection pattern
  useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <Button variant="ghost" size="icon" suppressHydrationWarning>
        <Sun className="size-5" />
        <span className="sr-only">Toggle theme</span>
      </Button>
    )
  }

  const currentTheme = theme || 'system'
  const icon =
    currentTheme === 'system' ? (
      <Monitor className="size-5" />
    ) : currentTheme === 'dark' ? (
      <Moon className="size-5" />
    ) : (
      <Sun className="size-5" />
    )

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={() => setTheme(getNextTheme(currentTheme))}
      title={getLabel(currentTheme, resolvedTheme)}
      suppressHydrationWarning
    >
      {icon}
      <span className="sr-only">{getLabel(currentTheme, resolvedTheme)}</span>
    </Button>
  )
}
