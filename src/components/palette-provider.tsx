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
