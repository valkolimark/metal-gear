/**
 * Public surface of the registry domain — types only.
 *
 * `match.ts` provides pure-function matchers and is also re-exported here.
 * Server actions live in `src/app/actions/registry.ts` and import from this
 * file. The vision-analysis layer MUST NOT import from this module
 * (architecture invariant; see CLAUDE.md → Cycle 60 architecture rules).
 */

export type ManufacturerTier = 1 | 2 | 3

export interface Manufacturer {
  id: string
  slug: string
  name: string
  aliases: string[]
  country: string | null
  tier: ManufacturerTier
  equipmentCategories: string[]
  parentManufacturerId: string | null
  sourceFile: string
  notes: string | null
}

export interface ManufacturerModel {
  id: string
  manufacturerId: string
  slug: string
  name: string
  series: string | null
  equipmentType: string | null
  notes: string | null
  sourceFile: string
}

export type RegistryMatchMethod = "exact" | "alias" | "fuzzy" | "none"

export interface RegistryMatch {
  manufacturer: Manufacturer | null
  model: ManufacturerModel | null
  /** 0..1 confidence — see scoreCandidate() in match.ts. */
  confidence: number
  method: RegistryMatchMethod
}

/**
 * Component manufacturer categories. When a nameplate's brand candidates
 * include both a component vendor (e.g., Baldor motor) AND a non-component
 * manufacturer (e.g., Sharples centrifuge), the disambiguator demotes
 * candidates whose categories are *exclusively* in this set.
 */
export const COMPONENT_CATEGORIES: ReadonlySet<string> = new Set([
  "motor",
  "gearbox",
  "seal",
  "bearing",
  "coupling",
])

export {
  normalizeManufacturerString,
  scoreCandidate,
  disambiguateNameplateCandidates,
} from "./match"

export type {
  ScoredManufacturer,
  DisambiguationResult,
} from "./match"
