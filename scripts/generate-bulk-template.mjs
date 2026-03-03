#!/usr/bin/env node
/**
 * Metal Gear — Bulk Upload Excel Template Generator
 *
 * Generates: public/templates/MetalGear_BulkUpload_Template.xlsx
 *
 * 4 sheets:
 *   1. Listings       — equipment inventory rows with dropdowns
 *   2. SOS Requests   — urgent equipment need broadcasts
 *   3. Reference - Listing Fields — valid categories, conditions, industries, states
 *   4. Reference - SOS Taxonomy   — tier1/tier2/subcategory IDs for SOS routing
 *
 * Usage: node scripts/generate-bulk-template.mjs
 */

import ExcelJS from 'exceljs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUTPUT_DIR = join(__dirname, '..', 'public', 'templates')
const OUTPUT_FILE = join(OUTPUT_DIR, 'MetalGear_BulkUpload_Template.xlsx')

// ─── Reference Data ──────────────────────────────────────────────────

const EQUIPMENT_CATEGORIES = [
  'CNC Machines', 'Lathes', 'Milling Machines', 'Drilling Machines',
  'Grinding Machines', 'Welding Equipment', 'Compressors', 'Generators',
  'Pumps', 'Valves', 'Heat Exchangers', 'Transformers', 'Cranes & Hoists',
  'Forklifts', 'Conveyors', 'Tanks & Vessels', 'Piping',
  'Electrical Equipment', 'Safety Equipment', 'Hand Tools', 'Other',
]

const CONDITIONS = [
  { value: 'new', label: 'New' },
  { value: 'like_new', label: 'Like New' },
  { value: 'good', label: 'Good' },
  { value: 'fair', label: 'Fair' },
  { value: 'poor', label: 'Poor' },
  { value: 'for_parts', label: 'For Parts' },
]

const INDUSTRIES = [
  'Oil & Gas', 'Petrochemical', 'Mining', 'Manufacturing', 'CNC Machining',
  'Aerospace', 'Construction', 'Power Generation', 'Water Treatment',
  'Food & Beverage', 'Pharmaceutical', 'Other',
]

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN',
  'IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH',
  'NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT',
  'VT','VA','WA','WV','WI','WY',
]

// Full 3-tier taxonomy for SOS reference
const SOS_TAXONOMY = [
  // Machines & Equipment (17 groups)
  { tier1: 'machines_equipment', tier1Label: 'Machines & Equipment', tier2: 'heavy_equipment_construction', tier2Label: 'Heavy Equipment & Construction', exampleSubs: 'excavators, cranes, wheel_loaders, dozers, drilling_rigs' },
  { tier1: 'machines_equipment', tier1Label: 'Machines & Equipment', tier2: 'mining_oil_gas', tier2Label: 'Mining, Oil & Gas', exampleSubs: 'crushers, oilfield_equipment, mud_pumps, screening_equipment' },
  { tier1: 'machines_equipment', tier1Label: 'Machines & Equipment', tier2: 'agriculture', tier2Label: 'Agriculture', exampleSubs: 'tractors, combines, harvesters, planters, irrigation' },
  { tier1: 'machines_equipment', tier1Label: 'Machines & Equipment', tier2: 'forestry', tier2Label: 'Forestry', exampleSubs: 'chippers, forestry_harvesters, skidders, log_splitters' },
  { tier1: 'machines_equipment', tier1Label: 'Machines & Equipment', tier2: 'manufacturing_machine_tools', tier2Label: 'Manufacturing & Machine Tools', exampleSubs: 'cnc_machining_centers, cnc_lathes, cnc_mills, presses, welding_systems' },
  { tier1: 'machines_equipment', tier1Label: 'Machines & Equipment', tier2: 'processing_separation', tier2Label: 'Processing & Separation', exampleSubs: 'compressors, conveyors, centrifuges, mixers_blenders, heat_exchangers' },
  { tier1: 'machines_equipment', tier1Label: 'Machines & Equipment', tier2: 'food_beverage', tier2Label: 'Food & Beverage', exampleSubs: 'bottling_lines, bakery_equipment, dairy_equipment, meat_processing' },
  { tier1: 'machines_equipment', tier1Label: 'Machines & Equipment', tier2: 'printing_graphics', tier2Label: 'Printing & Graphics', exampleSubs: 'digital_printing, post_press, screen_printing, wide_format' },
  { tier1: 'machines_equipment', tier1Label: 'Machines & Equipment', tier2: 'textile_leather', tier2Label: 'Textile & Leather Manufacturing', exampleSubs: 'sewing_machines, knitting_machines, dyeing_equipment, laundry' },
  { tier1: 'machines_equipment', tier1Label: 'Machines & Equipment', tier2: 'woodworking', tier2Label: 'Woodworking', exampleSubs: 'table_saws, planers, cnc_routers_wood, sanders, edgebanders' },
  { tier1: 'machines_equipment', tier1Label: 'Machines & Equipment', tier2: 'semiconductors_electronics', tier2Label: 'Semiconductors & Electronics', exampleSubs: 'pcb_assembly, deposition_systems, soldering, pick_and_place' },
  { tier1: 'machines_equipment', tier1Label: 'Machines & Equipment', tier2: 'test_lab_medical', tier2Label: 'Test, Lab & Medical Equipment', exampleSubs: 'lab_centrifuges, imaging_equipment, spectrometers, oscilloscopes' },
  { tier1: 'machines_equipment', tier1Label: 'Machines & Equipment', tier2: 'energy_power', tier2Label: 'Energy & Power Generation', exampleSubs: 'turbines, boilers, generator_sets_power, solar_equipment' },
  { tier1: 'machines_equipment', tier1Label: 'Machines & Equipment', tier2: 'material_handling', tier2Label: 'Material Handling', exampleSubs: 'forklifts, overhead_cranes, pallet_trucks, stackers, dock_equipment' },
  { tier1: 'machines_equipment', tier1Label: 'Machines & Equipment', tier2: 'boats_marine', tier2Label: 'Boats & Marine Equipment', exampleSubs: 'power_boats, ships, dredges, marine_engines, barges' },
  { tier1: 'machines_equipment', tier1Label: 'Machines & Equipment', tier2: 'recycling_equipment', tier2Label: 'Recycling Equipment & Systems', exampleSubs: 'shredders, balers, magnetic_separators, melting_furnaces' },
  { tier1: 'machines_equipment', tier1Label: 'Machines & Equipment', tier2: 'waste_management', tier2Label: 'Waste Management', exampleSubs: 'composting_equipment, landfill_compactors, wastewater_systems, scrubbers' },
  // Parts & Components (4 groups)
  { tier1: 'parts_components', tier1Label: 'Parts & Components', tier2: 'automation_controls', tier2Label: 'Automation & Controls', exampleSubs: 'plcs, sensors, hmis, servo_motors, vfds' },
  { tier1: 'parts_components', tier1Label: 'Parts & Components', tier2: 'electrical_power_components', tier2Label: 'Electrical & Power Components', exampleSubs: 'transformers, circuit_breakers, batteries, switchgear' },
  { tier1: 'parts_components', tier1Label: 'Parts & Components', tier2: 'tooling_consumables', tier2Label: 'Tooling & Consumables', exampleSubs: 'carbide_inserts, end_mills, abrasives, welding_wire, drill_bits' },
  { tier1: 'parts_components', tier1Label: 'Parts & Components', tier2: 'pumps_fluid_power', tier2Label: 'Pumps & Fluid Power', exampleSubs: 'centrifugal_pumps, positive_displacement, vacuum_pumps, pressure_washers' },
  // Materials (3 groups)
  { tier1: 'materials', tier1Label: 'Materials', tier2: 'raw_materials_stock', tier2Label: 'Raw Materials & Stock', exampleSubs: 'steel_plate, aluminum_stock, copper, stainless_steel, plastics' },
  { tier1: 'materials', tier1Label: 'Materials', tier2: 'scrap_metal_recycling', tier2Label: 'Scrap Metal & Recycling', exampleSubs: 'ferrous_scrap, non_ferrous_scrap, mixed_demolition, e_scrap' },
  { tier1: 'materials', tier1Label: 'Materials', tier2: 'carbide_specialty_metals', tier2Label: 'Carbide & Specialty Metals', exampleSubs: 'tungsten_carbide, cobalt, titanium, nickel_alloys, tool_steel' },
  // Transportation (4 groups)
  { tier1: 'transportation', tier1Label: 'Transportation', tier2: 'trucks_commercial', tier2Label: 'Trucks & Commercial Vehicles', exampleSubs: 'dump_trucks, box_trucks, flatbed_trucks, bucket_boom_trucks, buses' },
  { tier1: 'transportation', tier1Label: 'Transportation', tier2: 'trailers_towables', tier2Label: 'Trailers & Towables', exampleSubs: 'flatbed_trailers, enclosed_trailers, rvs, concession_trailers' },
  { tier1: 'transportation', tier1Label: 'Transportation', tier2: 'offroad_specialty', tier2Label: 'Off-Road & Specialty Vehicles', exampleSubs: 'atvs, pickup_trucks' },
  { tier1: 'transportation', tier1Label: 'Transportation', tier2: 'engines_drivetrain', tier2Label: 'Engines & Drivetrain', exampleSubs: 'truck_engines, transmissions, automotive_equipment' },
]

const COMMON_SPEC_KEYS = [
  'Weight', 'Power (HP)', 'Power (kW)', 'Voltage', 'RPM', 'Capacity',
  'Working Width', 'Working Height', 'Year Manufactured', 'Hours',
  'Serial Number', 'Dimensions (LxWxH)', 'Material', 'Pressure Rating',
  'Flow Rate', 'Temperature Range', 'Certification',
]

// ─── Styling ─────────────────────────────────────────────────────────

const HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } }
const HEADER_FONT = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' }
const REQUIRED_FONT = { bold: true, color: { argb: 'FFFF6B2B' }, size: 11, name: 'Calibri' }
const REF_HEADER_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2A2A3E' } }
const REF_HEADER_FONT = { bold: true, color: { argb: 'FF3A8FD4' }, size: 11, name: 'Calibri' }
const EXAMPLE_FONT = { color: { argb: 'FF888888' }, italic: true, size: 10, name: 'Calibri' }
const TIER1_FILL = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1E1E2E' } }

// ─── Build Workbook ──────────────────────────────────────────────────

async function generate() {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Metal Gear'
  wb.created = new Date()

  // ═══════════════════════════════════════════════════════════════════
  // SHEET 1: LISTINGS
  // ═══════════════════════════════════════════════════════════════════
  const ls = wb.addWorksheet('Listings', {
    properties: { tabColor: { argb: 'FFFF6B2B' } },
  })

  const listingCols = [
    { header: 'title *', key: 'title', width: 35 },
    { header: 'description *', key: 'description', width: 50 },
    { header: 'category *', key: 'category', width: 22 },
    { header: 'condition *', key: 'condition', width: 14 },
    { header: 'price', key: 'price', width: 12 },
    { header: 'negotiable', key: 'negotiable', width: 12 },
    { header: 'quantity', key: 'quantity', width: 10 },
    { header: 'sku', key: 'sku', width: 15 },
    { header: 'warehouse_location', key: 'warehouse_location', width: 20 },
    { header: 'industry', key: 'industry', width: 18 },
    { header: 'city *', key: 'city', width: 16 },
    { header: 'state *', key: 'state', width: 8 },
    { header: 'auto_renew', key: 'auto_renew', width: 12 },
    { header: 'specifications', key: 'specifications', width: 45 },
    { header: 'photo_urls', key: 'photo_urls', width: 50 },
  ]
  ls.columns = listingCols

  // Header styling
  const hRow = ls.getRow(1)
  hRow.font = HEADER_FONT
  hRow.fill = HEADER_FILL
  hRow.alignment = { vertical: 'middle', horizontal: 'center' }
  hRow.height = 24
  // Mark required columns with orange font
  for (const colIdx of [1, 2, 3, 4, 11, 12]) {
    ls.getCell(1, colIdx).font = REQUIRED_FONT
  }

  // Freeze header row
  ls.views = [{ state: 'frozen', ySplit: 1 }]

  // Data validation — category dropdown (rows 2-500)
  const catList = `"${EQUIPMENT_CATEGORIES.join(',')}"`
  for (let r = 2; r <= 500; r++) {
    ls.getCell(r, 3).dataValidation = { type: 'list', formulae: [catList], showErrorMessage: true, error: 'Select a valid category from the dropdown' }
    ls.getCell(r, 4).dataValidation = { type: 'list', formulae: ['"new,like_new,good,fair,poor,for_parts"'], showErrorMessage: true, error: 'Select a valid condition' }
    ls.getCell(r, 6).dataValidation = { type: 'list', formulae: ['"YES,NO"'], showErrorMessage: true }
    ls.getCell(r, 10).dataValidation = { type: 'list', formulae: [`"${INDUSTRIES.join(',')}"`], showErrorMessage: true }
    ls.getCell(r, 13).dataValidation = { type: 'list', formulae: ['"YES,NO"'], showErrorMessage: true }
  }

  // Example rows
  const listingExamples = [
    {
      title: 'Haas VF-2SS CNC Vertical Mill 2021',
      description: 'Haas VF-2SS 5-axis CNC vertical machining center, 2021 model, 12000 RPM, 30x16x20 travel, through-spindle coolant, 4th axis ready. Low hours, excellent condition.',
      category: 'CNC Machines',
      condition: 'good',
      price: 85000,
      negotiable: 'YES',
      quantity: 1,
      sku: 'CNC-VF2-001',
      warehouse_location: 'Bay 3, East Yard',
      industry: 'Manufacturing',
      city: 'Houston',
      state: 'TX',
      auto_renew: 'YES',
      specifications: 'RPM=12000|Travel X=30in|Travel Y=16in|Travel Z=20in|Spindle Taper=CT40|Year=2021|Hours=2400',
      photo_urls: '',
    },
    {
      title: 'Flowserve Mark III Centrifugal Pump',
      description: 'Flowserve Mark III ANSI process pump, 3x2-10, 316SS wetted parts, mechanical seal, 50HP motor included. Rebuilt 2024.',
      category: 'Pumps',
      condition: 'like_new',
      price: 12500,
      negotiable: 'NO',
      quantity: 3,
      sku: 'PMP-MK3-042',
      warehouse_location: 'Building B, Rack 12',
      industry: 'Oil & Gas',
      city: 'Houston',
      state: 'TX',
      auto_renew: 'NO',
      specifications: 'Flow Rate=500 GPM|Head=150 ft|Power=50 HP|Material=316SS|Size=3x2-10',
      photo_urls: '',
    },
    {
      title: 'Atlas Copco GA75 Rotary Screw Compressor',
      description: 'Atlas Copco GA75 oil-injected rotary screw air compressor, 100HP, 460V 3-phase, integrated dryer, 2019 model year.',
      category: 'Compressors',
      condition: 'good',
      price: '',
      negotiable: '',
      quantity: 1,
      sku: '',
      warehouse_location: '',
      industry: 'Manufacturing',
      city: 'Pasadena',
      state: 'TX',
      auto_renew: 'NO',
      specifications: 'Power=100 HP|Voltage=460V 3Ph|Pressure=125 PSI|CFM=350|Year=2019',
      photo_urls: '',
    },
  ]

  for (const ex of listingExamples) {
    const row = ls.addRow(ex)
    row.font = EXAMPLE_FONT
  }

  // ═══════════════════════════════════════════════════════════════════
  // SHEET 2: SOS REQUESTS
  // ═══════════════════════════════════════════════════════════════════
  const ss = wb.addWorksheet('SOS Requests', {
    properties: { tabColor: { argb: 'FFFF0000' } },
  })

  ss.columns = [
    { header: 'title *', key: 'title', width: 35 },
    { header: 'description', key: 'description', width: 50 },
    { header: 'equipment_category *', key: 'equipment_category', width: 30 },
    { header: 'equipment_subcategory', key: 'equipment_subcategory', width: 28 },
    { header: 'brand', key: 'brand', width: 18 },
    { header: 'model', key: 'model', width: 18 },
    { header: 'urgency *', key: 'urgency', width: 12 },
    { header: 'max_distance_miles *', key: 'max_distance_miles', width: 20 },
    { header: 'expires_hours', key: 'expires_hours', width: 14 },
    { header: 'notes', key: 'notes', width: 40 },
    { header: 'city', key: 'city', width: 16 },
    { header: 'state', key: 'state', width: 8 },
  ]

  const sRow = ss.getRow(1)
  sRow.font = HEADER_FONT
  sRow.fill = HEADER_FILL
  sRow.alignment = { vertical: 'middle', horizontal: 'center' }
  sRow.height = 24
  for (const colIdx of [1, 3, 7, 8]) {
    ss.getCell(1, colIdx).font = REQUIRED_FONT
  }
  ss.views = [{ state: 'frozen', ySplit: 1 }]

  // Tier2 IDs for dropdown
  const tier2Ids = SOS_TAXONOMY.map(t => t.tier2)
  const tier2List = `"${tier2Ids.join(',')}"`

  for (let r = 2; r <= 200; r++) {
    ss.getCell(r, 3).dataValidation = { type: 'list', formulae: [tier2List], showErrorMessage: true, error: 'Select a valid Tier 2 group ID. See Reference - SOS Taxonomy sheet.' }
    ss.getCell(r, 7).dataValidation = { type: 'list', formulae: ['"critical,normal"'], showErrorMessage: true }
    ss.getCell(r, 8).dataValidation = { type: 'list', formulae: ['"100,250,500,99999"'], showErrorMessage: true }
    ss.getCell(r, 9).dataValidation = { type: 'list', formulae: ['"24,48,72,168"'], showErrorMessage: true }
  }

  // SOS example rows
  const sosExamples = [
    {
      title: 'Flowserve Mark III Centrifugal Pump 3x2-10',
      description: 'Need replacement centrifugal pump for refinery process loop. 316SS wetted parts required. 500 GPM, 150ft head minimum.',
      equipment_category: 'pumps_fluid_power',
      equipment_subcategory: 'centrifugal_pumps',
      brand: 'Flowserve',
      model: 'Mark III',
      urgency: 'critical',
      max_distance_miles: 500,
      expires_hours: 72,
      notes: 'Plant is down. Will pay premium for immediate availability.',
      city: 'Houston',
      state: 'TX',
    },
    {
      title: 'Allen-Bradley CompactLogix PLC',
      description: 'Need CompactLogix L33ER PLC for packaging line replacement. Must have EtherNet/IP.',
      equipment_category: 'automation_controls',
      equipment_subcategory: 'plcs',
      brand: 'Allen-Bradley',
      model: 'CompactLogix L33ER',
      urgency: 'normal',
      max_distance_miles: 99999,
      expires_hours: 168,
      notes: 'Planned maintenance shutdown next week.',
      city: '',
      state: '',
    },
    {
      title: 'CAT D6 Dozer Undercarriage',
      description: 'Complete undercarriage for CAT D6T dozer. Tracks, rollers, idlers, sprockets. Used OK if 70%+ remaining life.',
      equipment_category: 'heavy_equipment_construction',
      equipment_subcategory: 'dozers',
      brand: 'Caterpillar',
      model: 'D6T',
      urgency: 'normal',
      max_distance_miles: 250,
      expires_hours: 72,
      notes: '',
      city: 'Midland',
      state: 'TX',
    },
  ]

  for (const ex of sosExamples) {
    const row = ss.addRow(ex)
    row.font = EXAMPLE_FONT
  }

  // ═══════════════════════════════════════════════════════════════════
  // SHEET 3: REFERENCE — LISTING FIELDS
  // ═══════════════════════════════════════════════════════════════════
  const ref1 = wb.addWorksheet('Reference - Listing Fields', {
    properties: { tabColor: { argb: 'FF3A8FD4' } },
  })

  // Column A-B: Equipment Categories
  ref1.getColumn(1).width = 24
  ref1.getColumn(2).width = 4
  ref1.getColumn(3).width = 14
  ref1.getColumn(4).width = 4
  ref1.getColumn(5).width = 20
  ref1.getColumn(6).width = 4
  ref1.getColumn(7).width = 8
  ref1.getColumn(8).width = 4
  ref1.getColumn(9).width = 45

  // Headers
  ref1.getCell('A1').value = 'Equipment Categories'
  ref1.getCell('A1').font = REF_HEADER_FONT
  ref1.getCell('A1').fill = REF_HEADER_FILL
  ref1.getCell('C1').value = 'Conditions'
  ref1.getCell('C1').font = REF_HEADER_FONT
  ref1.getCell('C1').fill = REF_HEADER_FILL
  ref1.getCell('E1').value = 'Industries'
  ref1.getCell('E1').font = REF_HEADER_FONT
  ref1.getCell('E1').fill = REF_HEADER_FILL
  ref1.getCell('G1').value = 'States'
  ref1.getCell('G1').font = REF_HEADER_FONT
  ref1.getCell('G1').fill = REF_HEADER_FILL
  ref1.getCell('I1').value = 'Common Specification Keys'
  ref1.getCell('I1').font = REF_HEADER_FONT
  ref1.getCell('I1').fill = REF_HEADER_FILL

  for (let i = 0; i < EQUIPMENT_CATEGORIES.length; i++) {
    ref1.getCell(i + 2, 1).value = EQUIPMENT_CATEGORIES[i]
  }
  for (let i = 0; i < CONDITIONS.length; i++) {
    ref1.getCell(i + 2, 3).value = `${CONDITIONS[i].value} (${CONDITIONS[i].label})`
  }
  for (let i = 0; i < INDUSTRIES.length; i++) {
    ref1.getCell(i + 2, 5).value = INDUSTRIES[i]
  }
  for (let i = 0; i < US_STATES.length; i++) {
    ref1.getCell(i + 2, 7).value = US_STATES[i]
  }
  for (let i = 0; i < COMMON_SPEC_KEYS.length; i++) {
    ref1.getCell(i + 2, 9).value = COMMON_SPEC_KEYS[i]
  }

  // Add format instructions
  const instrRow = Math.max(EQUIPMENT_CATEGORIES.length, US_STATES.length, COMMON_SPEC_KEYS.length) + 4
  ref1.getCell(instrRow, 1).value = 'SPECIFICATIONS FORMAT:'
  ref1.getCell(instrRow, 1).font = { bold: true, color: { argb: 'FFFF6B2B' } }
  ref1.getCell(instrRow + 1, 1).value = 'Use pipe-separated key=value pairs in the specifications column.'
  ref1.getCell(instrRow + 2, 1).value = 'Example: Weight=5000 lbs|Power=50 HP|RPM=3600|Year=2021'
  ref1.getCell(instrRow + 2, 1).font = EXAMPLE_FONT

  ref1.getCell(instrRow + 4, 1).value = 'PHOTO URLS:'
  ref1.getCell(instrRow + 4, 1).font = { bold: true, color: { argb: 'FFFF6B2B' } }
  ref1.getCell(instrRow + 5, 1).value = 'Comma-separated public image URLs. They will be downloaded and stored in Metal Gear.'
  ref1.getCell(instrRow + 6, 1).value = 'Example: https://example.com/photo1.jpg, https://example.com/photo2.jpg'
  ref1.getCell(instrRow + 6, 1).font = EXAMPLE_FONT

  ref1.getCell(instrRow + 8, 1).value = 'PRICE:'
  ref1.getCell(instrRow + 8, 1).font = { bold: true, color: { argb: 'FFFF6B2B' } }
  ref1.getCell(instrRow + 9, 1).value = 'Enter price in USD (e.g., 45000). Leave blank for "Contact for Price".'

  // Freeze & protect
  ref1.views = [{ state: 'frozen', ySplit: 1 }]

  // ═══════════════════════════════════════════════════════════════════
  // SHEET 4: REFERENCE — SOS TAXONOMY
  // ═══════════════════════════════════════════════════════════════════
  const ref2 = wb.addWorksheet('Reference - SOS Taxonomy', {
    properties: { tabColor: { argb: 'FFFF0000' } },
  })

  ref2.columns = [
    { header: 'Tier 1 ID', key: 'tier1', width: 22 },
    { header: 'Tier 1 Label', key: 'tier1Label', width: 24 },
    { header: 'Tier 2 ID (use in SOS sheet)', key: 'tier2', width: 32 },
    { header: 'Tier 2 Label', key: 'tier2Label', width: 30 },
    { header: '', key: 'spacer', width: 2 },
    { header: 'Example Subcategory IDs', key: 'exampleSubs', width: 60 },
  ]

  const tRow = ref2.getRow(1)
  tRow.font = REF_HEADER_FONT
  tRow.fill = REF_HEADER_FILL
  tRow.alignment = { vertical: 'middle', horizontal: 'center' }
  tRow.height = 24
  ref2.views = [{ state: 'frozen', ySplit: 1 }]

  let currentTier1 = ''
  for (const entry of SOS_TAXONOMY) {
    const row = ref2.addRow(entry)
    if (entry.tier1 !== currentTier1) {
      // Highlight tier1 group divider
      row.getCell(1).fill = TIER1_FILL
      row.getCell(2).fill = TIER1_FILL
      row.getCell(1).font = { bold: true, color: { argb: 'FFFF6B2B' } }
      row.getCell(2).font = { bold: true, color: { argb: 'FFFF6B2B' } }
      currentTier1 = entry.tier1
    }
  }

  // Add usage note
  const noteRow = SOS_TAXONOMY.length + 4
  ref2.getCell(noteRow, 1).value = 'HOW TO USE:'
  ref2.getCell(noteRow, 1).font = { bold: true, color: { argb: 'FFFF6B2B' } }
  ref2.getCell(noteRow + 1, 1).value = '1. Find the equipment group that matches your need in the "Tier 2 ID" column (Column C).'
  ref2.getCell(noteRow + 2, 1).value = '2. Copy that ID into the "equipment_category" column on the SOS Requests sheet.'
  ref2.getCell(noteRow + 3, 1).value = '3. Optionally, choose a subcategory ID from Column F for "equipment_subcategory".'
  ref2.getCell(noteRow + 4, 1).value = '4. Subcategories narrow the SOS broadcast to specialists in that exact equipment type.'

  // ═══════════════════════════════════════════════════════════════════
  // SAVE
  // ═══════════════════════════════════════════════════════════════════
  mkdirSync(OUTPUT_DIR, { recursive: true })
  await wb.xlsx.writeFile(OUTPUT_FILE)
  console.log(`Template generated: ${OUTPUT_FILE}`)
  console.log(`  Sheets: ${wb.worksheets.map(s => s.name).join(', ')}`)
  console.log(`  Listing columns: ${listingCols.length}`)
  console.log(`  SOS Taxonomy entries: ${SOS_TAXONOMY.length}`)
}

generate().catch((err) => {
  console.error('Failed to generate template:', err)
  process.exit(1)
})
