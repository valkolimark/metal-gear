import { unstable_cache } from 'next/cache'
import { createAdminClient } from '@/lib/supabase/admin'

// Cycle 66 — single source of truth for which archetypes are enabled at signup.
// `system_config.enabled_archetypes` (JSONB array) is the live state. Default
// covers fresh environments where the migration hasn't run yet (preview deploys,
// dev DBs).

export const ALL_ARCHETYPES = ['operator', 'trader', 'service_provider', 'logistics'] as const
export type Archetype = (typeof ALL_ARCHETYPES)[number]

export const ARCHETYPE_DEFAULT_ENABLED: Archetype[] = ['operator', 'service_provider']

export const ENABLED_ARCHETYPES_CACHE_TAG = 'enabled-archetypes-config'

function coerceEnabled(value: unknown): Archetype[] {
  if (!Array.isArray(value)) return ARCHETYPE_DEFAULT_ENABLED
  const valid = value.filter(
    (v): v is Archetype =>
      typeof v === 'string' && (ALL_ARCHETYPES as readonly string[]).includes(v),
  )
  return valid.length > 0 ? valid : ARCHETYPE_DEFAULT_ENABLED
}

async function readEnabledArchetypes(): Promise<Archetype[]> {
  try {
    const supabase = createAdminClient()
    const { data, error } = await supabase
      .from('system_config')
      .select('value')
      .eq('key', 'enabled_archetypes')
      .maybeSingle()

    if (error || !data?.value) return ARCHETYPE_DEFAULT_ENABLED

    const raw = data.value as unknown
    const parsed = typeof raw === 'string' ? safeJsonParse(raw) : raw
    return coerceEnabled(parsed)
  } catch {
    return ARCHETYPE_DEFAULT_ENABLED
  }
}

function safeJsonParse(s: string): unknown {
  try {
    return JSON.parse(s)
  } catch {
    return null
  }
}

export const getEnabledArchetypes = unstable_cache(readEnabledArchetypes, [ENABLED_ARCHETYPES_CACHE_TAG], {
  tags: [ENABLED_ARCHETYPES_CACHE_TAG],
  revalidate: 300,
})

export async function isArchetypeEnabled(archetype: Archetype): Promise<boolean> {
  const enabled = await getEnabledArchetypes()
  return enabled.includes(archetype)
}

export async function getDisabledArchetypes(): Promise<Archetype[]> {
  const enabled = await getEnabledArchetypes()
  return ALL_ARCHETYPES.filter((a) => !enabled.includes(a))
}

// Exported for tests — bypasses the unstable_cache wrapper.
export { readEnabledArchetypes as _readEnabledArchetypesUncached, coerceEnabled as _coerceEnabled }
