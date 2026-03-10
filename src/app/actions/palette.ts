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

  // Set cookie so root layout can read it server-side on next request
  const cookieStore = await cookies()
  cookieStore.set('platform_palette', palette, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365, // 1 year
    sameSite: 'lax',
  })

  revalidatePath('/', 'layout')
  return { success: true }
}
