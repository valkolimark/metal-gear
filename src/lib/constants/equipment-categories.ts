// ─── Equipment Categories (Single Source of Truth) ──────────────────

export interface EquipmentCategory {
  id: string
  label: string
  subTypes: string[]
  commonBrands: string[]
}

export const EQUIPMENT_CATEGORIES: EquipmentCategory[] = [
  {
    id: 'centrifuges',
    label: 'Centrifuges',
    subTypes: ['Decanter', 'Lab', 'Disk-stack', 'Tubular', 'Basket'],
    commonBrands: ['Alfa Laval', 'Flottweg', 'GEA Westfalia', 'Andritz', 'Pieralisi'],
  },
  {
    id: 'valves',
    label: 'Valves',
    subTypes: ['Fisher control', 'Ball', 'Gate', 'Butterfly', 'Check', 'Globe', 'Plug'],
    commonBrands: ['Fisher', 'Emerson', 'Flowserve', 'Cameron', 'Velan', 'Neles'],
  },
  {
    id: 'gearboxes',
    label: 'Gearboxes',
    subTypes: ['Helical', 'Planetary', 'Worm', 'Bevel', 'Parallel shaft'],
    commonBrands: ['Falk', 'SEW-Eurodrive', 'Nord', 'Sumitomo', 'Dodge'],
  },
  {
    id: 'mixers_blenders',
    label: 'Mixers / Blenders',
    subTypes: ['Ribbon', 'Sigma blade', 'Lab', 'Industrial', 'High-shear', 'Paddle'],
    commonBrands: ['Ross', 'Lightnin', 'Patterson-Kelley', 'Munson', 'IKA'],
  },
  {
    id: 'hydraulic_equipment',
    label: 'Hydraulic Equipment',
    subTypes: ['Pumps', 'Cylinders', 'Motors', 'Power units', 'Accumulators'],
    commonBrands: ['Parker', 'Eaton', 'Bosch Rexroth', 'Danfoss', 'Sun Hydraulics'],
  },
  {
    id: 'scrap_byproducts',
    label: 'Scrap & Byproducts',
    subTypes: ['Springs/coils', 'Nichrome wire', 'Stainless', 'Copper', 'Aluminum', 'Brass'],
    commonBrands: [],
  },
  {
    id: 'trucks_heavy_equipment',
    label: 'Trucks & Heavy Equipment',
    subTypes: ['Peterbilt', 'Trailers', 'Roll-off containers', 'Forklifts', 'Boom trucks'],
    commonBrands: ['Peterbilt', 'Kenworth', 'Freightliner', 'Caterpillar', 'Toyota'],
  },
  {
    id: 'bearings_seals',
    label: 'Bearings & Seals',
    subTypes: ['Ball bearings', 'Roller bearings', 'Thrust bearings', 'Mechanical seals', 'O-rings'],
    commonBrands: ['SKF', 'NSK', 'Timken', 'NTN', 'John Crane', 'Flowserve'],
  },
  {
    id: 'cnc_machine_tools',
    label: 'CNC / Machine Tools',
    subTypes: ['Lathes', 'Mills', 'Grinders', 'EDM', 'Boring machines', 'Machining centers'],
    commonBrands: ['Haas', 'Mazak', 'DMG Mori', 'Okuma', 'Makino', 'Doosan'],
  },
  {
    id: 'pumps',
    label: 'Pumps',
    subTypes: ['Centrifugal', 'Positive displacement', 'Diaphragm', 'Peristaltic', 'Gear', 'Screw'],
    commonBrands: ['Goulds', 'Grundfos', 'Flowserve', 'Sulzer', 'Moyno', 'Wilden'],
  },
  {
    id: 'heat_exchangers',
    label: 'Heat Exchangers',
    subTypes: ['Shell & tube', 'Plate', 'Air-cooled', 'Double pipe', 'Spiral'],
    commonBrands: ['Alfa Laval', 'SWEP', 'Kelvion', 'API Heat Transfer', 'Tranter'],
  },
  {
    id: 'compressors',
    label: 'Compressors',
    subTypes: ['Reciprocating', 'Screw', 'Centrifugal', 'Rotary vane', 'Scroll'],
    commonBrands: ['Atlas Copco', 'Ingersoll Rand', 'Sullair', 'Gardner Denver', 'Kaeser'],
  },
  {
    id: 'other',
    label: 'Other',
    subTypes: [],
    commonBrands: [],
  },
]

// ─── Industries ─────────────────────────────────────────────────────

export const INDUSTRIES = [
  'Food & Beverage',
  'Pharmaceutical',
  'Oil & Gas',
  'Mining',
  'Chemical',
  'Maritime',
  'Agriculture',
  'Packaging',
  'Power Generation',
  'Water / Wastewater',
  'Pulp & Paper',
  'Aerospace',
  'Manufacturing',
  'Construction',
  'Other',
] as const

export type Industry = (typeof INDUSTRIES)[number]

// ─── Roles ──────────────────────────────────────────────────────────

export interface RoleOption {
  id: string
  label: string
  description: string
}

export const ROLES: RoleOption[] = [
  { id: 'end_user', label: 'End User / Plant', description: 'Plant manager, maintenance, engineering, procurement' },
  { id: 'dealer', label: 'Dealer / Broker', description: 'Equipment dealer, surplus broker, distributor' },
  { id: 'rebuilder', label: 'Rebuilder / Repair Shop', description: 'Equipment rebuilding, refurbishment, repair services' },
  { id: 'scrap', label: 'Scrap / Investment Recovery', description: 'Scrap buyer, investment recovery, asset disposition' },
  { id: 'logistics', label: 'Logistics / Trucking', description: 'Heavy haul, rigging, freight, equipment moving' },
  { id: 'services', label: 'Services', description: 'Hydraulic, valve, spring, seal, and other specialty services' },
]

// ─── Pain Points ────────────────────────────────────────────────────

export const PAIN_POINTS = [
  'Unplanned downtime',
  'Hard-to-find spare parts',
  'Finding trusted rebuilders',
  'Reliable scrap buyers',
  'Logistics / shipping',
] as const

export type PainPoint = (typeof PAIN_POINTS)[number]

// ─── Trading Intents ────────────────────────────────────────────────

export const TRADING_INTENTS = [
  { id: 'find_equipment', label: 'Find equipment / parts' },
  { id: 'sell_surplus', label: 'Sell surplus equipment / scrap / byproducts' },
  { id: 'find_rebuilders', label: 'Find rebuilders / repair services' },
  { id: 'find_buyers', label: 'Find buyers for rebuilt gear' },
  { id: 'arrange_logistics', label: 'Arrange logistics / trucking' },
] as const

// ─── SOS Tier Limits ────────────────────────────────────────────────

export const SOS_TIER_LIMITS = {
  free: { activeSos: 1, maxReachMiles: 100, maxResponders: 10 },
  premium: { activeSos: 3, maxReachMiles: 500, maxResponders: Infinity },
  boost: { activeSos: Infinity, maxReachMiles: Infinity, maxResponders: Infinity },
} as const
