// Metal Gear 3-Tier Equipment Taxonomy
// 4 Tier 1 buckets → 28 Tier 2 groups → ~252 subcategories
// Single source of truth for all equipment classification across the app.

// ─── Type Definitions ──────────────────────────────────────────────

export interface Subcategory {
  id: string
  label: string
  crossListedIn?: string[] // other Tier 2 group IDs this also appears in
}

export interface Tier2Group {
  id: string
  label: string
  subcategories: Subcategory[]
}

export interface Tier1Bucket {
  id: string
  label: string
  groups: Tier2Group[]
}

// ─── Full Taxonomy ─────────────────────────────────────────────────

export const EQUIPMENT_TAXONOMY: Tier1Bucket[] = [
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TIER 1: MACHINES & EQUIPMENT (17 groups)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'machines_equipment',
    label: 'Machines & Equipment',
    groups: [
      {
        id: 'heavy_equipment_construction',
        label: 'Heavy Equipment & Construction',
        subcategories: [
          { id: 'excavators', label: 'Excavators' },
          { id: 'lifts', label: 'Lifts' },
          { id: 'cranes', label: 'Cranes', crossListedIn: ['boats_marine', 'material_handling'] },
          { id: 'wheel_loaders', label: 'Wheel Loaders' },
          { id: 'generator_sets', label: 'Generator Sets', crossListedIn: ['energy_power'] },
          { id: 'construction_engines', label: 'Construction / Industrial Engines' },
          { id: 'dozers', label: 'Dozers' },
          { id: 'block_brick_paver_machines', label: 'Block / Brick / Paver Making Machines' },
          { id: 'drilling_rigs', label: 'Drilling Rigs', crossListedIn: ['mining_oil_gas'] },
          { id: 'compactors', label: 'Compactors' },
          { id: 'concrete_mixers', label: 'Concrete Mixers', crossListedIn: ['processing_separation'] },
          { id: 'concrete_batching_plants', label: 'Concrete Batching Plants' },
          { id: 'backhoe_loaders', label: 'Backhoe Loaders' },
          { id: 'skid_steer_loaders', label: 'Skid Steer Loaders' },
          { id: 'compact_track_loaders', label: 'Compact Track Loaders' },
        ],
      },
      {
        id: 'mining_oil_gas',
        label: 'Mining, Oil & Gas',
        subcategories: [
          { id: 'crushers_screening', label: 'Crushers & Screening Plants' },
          { id: 'mineral_processing', label: 'Mineral Processing', crossListedIn: ['processing_separation'] },
          { id: 'oilfield_equipment', label: 'Oilfield Equipment' },
          { id: 'articulated_haulers', label: 'Articulated Haulers' },
          { id: 'haul_trucks', label: 'Haul Trucks', crossListedIn: ['trucks_commercial'] },
          { id: 'tanks_vessels', label: 'Tanks & Vessels', crossListedIn: ['processing_separation'] },
          { id: 'mud_pumps', label: 'Mud Pumps' },
          { id: 'mills_mineral', label: 'Mills (Mineral Processing)' },
          { id: 'well_control_equipment', label: 'Well Control Equipment' },
          { id: 'lhd_mining_loaders', label: 'LHD Mining Loaders' },
          { id: 'oil_cleaning_centrifuges', label: 'Oil Cleaning Centrifuges', crossListedIn: ['processing_separation'] },
        ],
      },
      {
        id: 'agriculture',
        label: 'Agriculture',
        subcategories: [
          { id: 'tractors', label: 'Tractors' },
          { id: 'tillage_equipment', label: 'Tillage Equipment' },
          { id: 'combines', label: 'Combines' },
          { id: 'lawn_mowers', label: 'Lawn Mowers' },
          { id: 'planting_equipment', label: 'Planting Equipment' },
          { id: 'applicators', label: 'Applicators' },
          { id: 'harvester_headers', label: 'Harvester Headers' },
          { id: 'balers_ag', label: 'Balers' },
          { id: 'fertilizer_spreaders', label: 'Fertilizer Spreaders' },
          { id: 'livestock_equipment', label: 'Livestock Equipment' },
        ],
      },
      {
        id: 'forestry',
        label: 'Forestry',
        subcategories: [
          { id: 'wood_chippers', label: 'Wood Chippers' },
          { id: 'mulchers', label: 'Mulchers' },
          { id: 'forwarders', label: 'Forwarders' },
          { id: 'forestry_harvesters', label: 'Forestry Harvesters' },
          { id: 'skidders', label: 'Skidders' },
          { id: 'stump_grinders', label: 'Stump Grinders' },
          { id: 'horizontal_grinders', label: 'Horizontal Grinders', crossListedIn: ['recycling_equipment'] },
          { id: 'feller_bunchers', label: 'Feller Bunchers' },
          { id: 'knuckleboom_loaders', label: 'Knuckleboom Loaders' },
          { id: 'forestry_attachments', label: 'Forestry Attachments' },
        ],
      },
      {
        id: 'manufacturing_machine_tools',
        label: 'Manufacturing & Machine Tools',
        subcategories: [
          { id: 'machining_centers', label: 'Machining Centers' },
          { id: 'cnc_lathes', label: 'CNC Lathes' },
          { id: 'manual_lathes', label: 'Lathes (Manual)' },
          { id: 'milling_machines', label: 'Milling Machines' },
          { id: 'grinding_machines', label: 'Grinding Machines' },
          { id: 'bending_forming', label: 'Bending & Forming' },
          { id: 'welding_equipment', label: 'Welding Equipment' },
          { id: 'saws_metal', label: 'Saws (Metal)' },
          { id: 'laser_cutters', label: 'Laser Cutters' },
          { id: 'presses', label: 'Presses' },
        ],
      },
      {
        id: 'processing_separation',
        label: 'Processing & Separation',
        subcategories: [
          { id: 'packaging_machinery', label: 'Packaging Machinery', crossListedIn: ['food_beverage'] },
          { id: 'industrial_compressors', label: 'Industrial Compressors' },
          { id: 'coating_laminating', label: 'Coating & Laminating' },
          { id: 'tanks_kettles', label: 'Tanks & Kettles' },
          { id: 'conveyors', label: 'Conveyors', crossListedIn: ['material_handling'] },
          { id: 'extruders', label: 'Extruders' },
          { id: 'industrial_chillers', label: 'Industrial Chillers' },
          { id: 'injection_molding', label: 'Injection Molding' },
          { id: 'plastic_rubber_processing', label: 'Plastic / Rubber Processing' },
          // Centrifuges
          { id: 'centrifugal_separators', label: 'Centrifugal Separators (Disc/Decanter)', crossListedIn: ['mining_oil_gas', 'food_beverage'] },
          { id: 'industrial_centrifuges', label: 'Industrial Centrifuges' },
          { id: 'disc_nozzle_centrifuges', label: 'Disc Nozzle Centrifuges' },
          { id: 'continuous_centrifuges', label: 'Continuous Centrifuges' },
          // Mixers & Blenders
          { id: 'agitators_blenders_mixers', label: 'Agitators / Blenders / Mixers', crossListedIn: ['food_beverage'] },
          { id: 'industrial_batch_mixers', label: 'Industrial Batch Mixers' },
          { id: 'industrial_planetary_mixers', label: 'Industrial Planetary Mixers', crossListedIn: ['food_beverage'] },
          { id: 'industrial_emulsion_mixers', label: 'Industrial Emulsion Mixers' },
          { id: 'homogenizers', label: 'Homogenizers', crossListedIn: ['food_beverage'] },
        ],
      },
      {
        id: 'food_beverage',
        label: 'Food & Beverage Processing',
        subcategories: [
          { id: 'bottling_filling_packaging', label: 'Bottling / Filling / Packaging', crossListedIn: ['processing_separation'] },
          { id: 'kitchen_restaurant_equipment', label: 'Kitchen & Restaurant Equipment' },
          { id: 'bakery_pastry_equipment', label: 'Bakery & Pastry Equipment', crossListedIn: ['processing_separation'] },
          { id: 'fruit_vegetable_processing', label: 'Fruit & Vegetable Processing' },
          { id: 'industrial_cooking_machines', label: 'Industrial Cooking Machines' },
          { id: 'meat_poultry_processing', label: 'Meat & Poultry Processing' },
          { id: 'ovens_grills', label: 'Ovens & Grills' },
          { id: 'dairy_processing', label: 'Dairy Processing', crossListedIn: ['processing_separation'] },
          { id: 'food_refrigeration', label: 'Food Refrigeration' },
          { id: 'confectionery_equipment', label: 'Confectionery Equipment' },
          { id: 'food_grade_centrifugal_separators', label: 'Food-Grade Centrifugal Separators', crossListedIn: ['processing_separation'] },
        ],
      },
      {
        id: 'printing_graphics',
        label: 'Printing & Graphics',
        subcategories: [
          { id: 'digital_printing', label: 'Digital Printing' },
          { id: 'post_press', label: 'Post-Press' },
          { id: 'sheet_fed_press', label: 'Sheet-Fed Press' },
          { id: 'die_cutters', label: 'Die Cutters' },
          { id: 'folders', label: 'Folders' },
          { id: 'screen_printing', label: 'Screen Printing' },
          { id: 'large_wide_format_printers', label: 'Large / Wide Format Printers' },
          { id: 'flexographic_printing', label: 'Flexographic Printing' },
          { id: 'book_binding', label: 'Book Binding' },
          { id: 'guillotines', label: 'Guillotines' },
        ],
      },
      {
        id: 'textile_leather',
        label: 'Textile & Leather Manufacturing',
        subcategories: [
          { id: 'sewing_machines', label: 'Sewing Machines' },
          { id: 'non_woven', label: 'Non Woven' },
          { id: 'knitting', label: 'Knitting' },
          { id: 'weaving', label: 'Weaving' },
          { id: 'shoe_machines', label: 'Shoe Machines' },
          { id: 'industrial_laundry', label: 'Industrial Laundry Equipment' },
          { id: 'dyeing_finishing', label: 'Dyeing & Finishing' },
          { id: 'yarn_manufacturing', label: 'Yarn Manufacturing' },
          { id: 'winders_unwinders', label: 'Winders & Unwinders', crossListedIn: ['printing_graphics'] },
          { id: 'mattress_manufacturing', label: 'Mattress Manufacturing' },
        ],
      },
      {
        id: 'woodworking',
        label: 'Woodworking',
        subcategories: [
          { id: 'wood_saws', label: 'Wood Saws' },
          { id: 'planers_moulders', label: 'Planers & Moulders' },
          { id: 'edgebanders', label: 'Edgebanders' },
          { id: 'sanders', label: 'Sanders' },
          { id: 'cnc_wood_routers', label: 'CNC Wood Routers' },
          { id: 'wood_sawmills', label: 'Wood Sawmills', crossListedIn: ['forestry'] },
          { id: 'boring_dowel_gluing', label: 'Boring / Dowel Inserting / Gluing' },
          { id: 'wood_finishing', label: 'Wood Finishing Equipment' },
          { id: 'veneer_machines', label: 'Veneer Machines' },
          { id: 'mortisers_tenoners', label: 'Mortisers & Tenoners' },
        ],
      },
      {
        id: 'semiconductors_electronics',
        label: 'Semiconductors & Electronics',
        subcategories: [
          { id: 'supporting_equipment_semi', label: 'Supporting Equipment' },
          { id: 'pcb_assembly', label: 'PCB Assembly' },
          { id: 'test_measurement_semi', label: 'Test & Measurement', crossListedIn: ['test_lab_medical'] },
          { id: 'metrology_inspection', label: 'Metrology / Inspection' },
          { id: 'deposition_cvd_pvd', label: 'Deposition Equipment (CVD/PVD)' },
          { id: 'laser_marking', label: 'Laser Marking' },
          { id: 'surface_treatment_cleaning', label: 'Surface Treatment / Cleaning' },
          { id: 'die_bonders', label: 'Die Bonders' },
          { id: 'soldering', label: 'Soldering' },
          { id: 'wire_bonders', label: 'Wire Bonders' },
        ],
      },
      {
        id: 'test_lab_medical',
        label: 'Test, Lab & Medical Equipment',
        subcategories: [
          { id: 'general_medical', label: 'General Medical Equipment' },
          { id: 'general_laboratory', label: 'General Laboratory Equipment' },
          { id: 'general_analytical', label: 'General Analytical Equipment' },
          { id: 'medical_imaging', label: 'Medical Imaging' },
          { id: 'electrical_test_instruments', label: 'Electrical Test Instruments' },
          { id: 'oscilloscopes', label: 'Oscilloscopes' },
          { id: 'medical_ultrasound', label: 'Medical Ultrasound' },
          { id: 'test_generators', label: 'Test Generators' },
          { id: 'flow_electric_gas_meters', label: 'Flow / Electric / Gas Meters' },
          { id: 'materials_testing', label: 'Materials Testing' },
          { id: 'laboratory_centrifuges', label: 'Laboratory Centrifuges', crossListedIn: ['processing_separation'] },
          { id: 'ultra_centrifuges', label: 'Ultra Centrifuges', crossListedIn: ['processing_separation'] },
          { id: 'micro_centrifuges', label: 'Micro Centrifuges', crossListedIn: ['processing_separation'] },
          { id: 'lab_mixers_shakers_stirrers', label: 'Lab Mixers / Shakers / Stirrers', crossListedIn: ['processing_separation'] },
        ],
      },
      {
        id: 'energy_power',
        label: 'Energy & Power Generation',
        subcategories: [
          { id: 'turbines', label: 'Turbines' },
          { id: 'boilers', label: 'Boilers' },
          { id: 'solar_power', label: 'Solar Power' },
          { id: 'diesel_engines_generators', label: 'Diesel Engines & Generators' },
          { id: 'power_plants', label: 'Power Plants' },
        ],
      },
      {
        id: 'material_handling',
        label: 'Material Handling',
        subcategories: [
          { id: 'forklifts', label: 'Forklifts' },
          { id: 'telehandlers', label: 'Telehandlers' },
          { id: 'pallet_trucks', label: 'Pallet Trucks' },
          { id: 'pallet_stackers', label: 'Pallet Stackers' },
          { id: 'overhead_cranes', label: 'Overhead Cranes' },
          { id: 'reach_trucks', label: 'Reach Trucks' },
          { id: 'material_handlers', label: 'Material Handlers' },
          { id: 'airport_gse', label: 'Airport GSE' },
          { id: 'vacuum_lifts_sheet_lifters', label: 'Vacuum Lifts / Sheet Metal Lifters' },
          { id: 'order_pickers', label: 'Order Pickers' },
        ],
      },
      {
        id: 'boats_marine',
        label: 'Boats & Marine Equipment',
        subcategories: [
          { id: 'power_boats', label: 'Power Boats' },
          { id: 'marine_equipment', label: 'Marine Equipment' },
          { id: 'marine_engines_generators', label: 'Marine Engines & Generators', crossListedIn: ['energy_power'] },
          { id: 'sail_boats', label: 'Sail Boats' },
          { id: 'cargo_ships', label: 'Cargo Ships' },
          { id: 'dredges', label: 'Dredges' },
          { id: 'offshore_support_vessels', label: 'Offshore Support Vessels', crossListedIn: ['mining_oil_gas'] },
          { id: 'fishing_vessels', label: 'Fishing Vessels' },
          { id: 'service_vessels', label: 'Service Vessels' },
          { id: 'maritime_cranes_port', label: 'Maritime Cranes & Port Equipment', crossListedIn: ['material_handling'] },
        ],
      },
      {
        id: 'recycling_equipment',
        label: 'Recycling Equipment & Systems',
        subcategories: [
          { id: 'scrap_metal_shears', label: 'Scrap Metal Shears', crossListedIn: ['waste_management'] },
          { id: 'balers_metal_material', label: 'Balers (Metal & Material)', crossListedIn: ['waste_management'] },
          { id: 'shredders_metal_industrial', label: 'Shredders (Metal & Industrial)', crossListedIn: ['waste_management'] },
          { id: 'granulators_hammer_mills', label: 'Granulators & Hammer Mills', crossListedIn: ['processing_separation'] },
          { id: 'magnetic_separators_eddy', label: 'Magnetic Separators & Eddy Current' },
          { id: 'wire_strippers_choppers', label: 'Wire Strippers & Choppers' },
          { id: 'briquetters_compactors', label: 'Briquetters & Compactors', crossListedIn: ['waste_management'] },
          { id: 'sorting_systems', label: 'Sorting Systems (Optical/XRF/NIR)', crossListedIn: ['waste_management'] },
          { id: 'melting_furnaces_smelters', label: 'Melting Furnaces & Smelters' },
          { id: 'catalytic_converter_processing', label: 'Catalytic Converter Processing', crossListedIn: ['scrap_metal_recycling'] },
          { id: 'ewaste_recycling_lines', label: 'E-Waste Recycling Lines', crossListedIn: ['waste_management'] },
        ],
      },
      {
        id: 'waste_management',
        label: 'Waste Management',
        subcategories: [
          { id: 'recycling_disposal', label: 'Recycling & Disposal', crossListedIn: ['recycling_equipment'] },
          { id: 'industrial_shredders_wm', label: 'Industrial Shredders', crossListedIn: ['recycling_equipment'] },
          { id: 'industrial_balers_wm', label: 'Industrial Balers', crossListedIn: ['recycling_equipment'] },
          { id: 'wastewater_recycling', label: 'Wastewater Recycling' },
          { id: 'waste_compactors', label: 'Waste Compactors', crossListedIn: ['recycling_equipment'] },
          { id: 'construction_waste_recycling', label: 'Construction Waste Recycling', crossListedIn: ['recycling_equipment'] },
          { id: 'floor_scrubbers_sweepers', label: 'Floor Scrubbers & Sweepers' },
        ],
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TIER 1: PARTS, COMPONENTS & TOOLING (4 groups)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'parts_components',
    label: 'Parts, Components & Tooling',
    groups: [
      {
        id: 'automation_controls',
        label: 'Automation & Controls',
        subcategories: [
          { id: 'plcs', label: 'PLCs' },
          { id: 'sensors', label: 'Sensors' },
          { id: 'hmis', label: 'HMIs' },
          { id: 'motion_controllers', label: 'Motion Controllers' },
          { id: 'io_modules', label: 'I/O Modules' },
          { id: 'actuators', label: 'Actuators' },
          { id: 'feedback_devices', label: 'Feedback Devices' },
          { id: 'drives_vfd_servo', label: 'Drives (VFD/Servo)' },
          { id: 'electric_motors', label: 'Electric Motors' },
          { id: 'it_infrastructure_industrial', label: 'IT Infrastructure (Industrial)' },
        ],
      },
      {
        id: 'electrical_power_components',
        label: 'Electrical & Power Components',
        subcategories: [
          { id: 'electrical_electronic_components', label: 'Electrical & Electronic Components' },
          { id: 'power_supply_ac_dc', label: 'Power Supply (AC/DC)' },
          { id: 'circuit_breakers', label: 'Circuit Breakers' },
          { id: 'transformers', label: 'Transformers' },
          { id: 'batteries_chargers', label: 'Batteries & Chargers' },
        ],
      },
      {
        id: 'tooling_consumables',
        label: 'Tooling & Consumables',
        subcategories: [
          { id: 'carbide_inserts_indexable', label: 'Carbide Inserts & Indexable Tooling', crossListedIn: ['carbide_specialty_metals'] },
          { id: 'carbide_end_mills_drills', label: 'Carbide End Mills & Drills', crossListedIn: ['carbide_specialty_metals'] },
          { id: 'hss_tooling_taps', label: 'HSS Tooling & Taps', crossListedIn: ['carbide_specialty_metals'] },
          { id: 'abrasives_grinding_wheels', label: 'Abrasives & Grinding Wheels', crossListedIn: ['manufacturing_machine_tools'] },
          { id: 'welding_consumables_wire', label: 'Welding Consumables & Wire', crossListedIn: ['manufacturing_machine_tools'] },
          { id: 'saw_blades_cutting_tools', label: 'Saw Blades & Cutting Tools', crossListedIn: ['manufacturing_machine_tools'] },
        ],
      },
      {
        id: 'pumps_fluid_power',
        label: 'Pumps & Fluid Power',
        subcategories: [
          { id: 'centrifugal_pumps', label: 'Centrifugal Pumps', crossListedIn: ['processing_separation'] },
          { id: 'positive_displacement_pumps', label: 'Positive Displacement Pumps' },
          { id: 'vacuum_pumps', label: 'Vacuum Pumps' },
          { id: 'water_pumps', label: 'Water Pumps' },
          { id: 'pressure_washers', label: 'Pressure Washers' },
        ],
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TIER 1: MATERIALS & COMMODITIES (3 groups)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'materials',
    label: 'Materials & Commodities',
    groups: [
      {
        id: 'raw_materials_stock',
        label: 'Raw Materials & Stock',
        subcategories: [
          { id: 'steel', label: 'Steel (Sheet/Plate/Structural/Bar)' },
          { id: 'aluminum', label: 'Aluminum (Sheet/Plate/Extrusion/Bar)' },
          { id: 'copper_brass', label: 'Copper & Brass (Sheet/Bar/Tube)' },
          { id: 'stainless_steel', label: 'Stainless Steel (Sheet/Plate/Bar/Tube)' },
          { id: 'plastics_polymers', label: 'Plastics & Polymers', crossListedIn: ['processing_separation'] },
          { id: 'lumber_wood_products', label: 'Lumber & Wood Products', crossListedIn: ['woodworking'] },
          { id: 'pipe_tube_fittings_valves', label: 'Pipe / Tube / Fittings / Valves', crossListedIn: ['mining_oil_gas'] },
          { id: 'fasteners_hardware', label: 'Fasteners & Hardware (Bulk/Surplus)' },
          { id: 'chemicals_industrial_fluids', label: 'Chemicals & Industrial Fluids' },
        ],
      },
      {
        id: 'scrap_metal_recycling',
        label: 'Scrap Metal & Metal Recycling',
        subcategories: [
          { id: 'ferrous_scrap', label: 'Ferrous Scrap (Steel/Iron/Cast)' },
          { id: 'non_ferrous_scrap', label: 'Non-Ferrous Scrap (Aluminum/Copper/Brass)' },
          { id: 'stainless_steel_scrap', label: 'Stainless Steel Scrap' },
          { id: 'mixed_demolition_scrap', label: 'Mixed / Demolition Scrap', crossListedIn: ['recycling_equipment'] },
          { id: 'auto_truck_scrap', label: 'Auto & Truck Scrap', crossListedIn: ['trucks_commercial'] },
          { id: 'turnings_chips_swarf', label: 'Turnings / Chips / Swarf', crossListedIn: ['manufacturing_machine_tools'] },
          { id: 'wire_cable_scrap', label: 'Wire & Cable Scrap', crossListedIn: ['recycling_equipment'] },
          { id: 'escrap_electronics', label: 'E-Scrap (Circuit Boards/Electronics)', crossListedIn: ['recycling_equipment'] },
        ],
      },
      {
        id: 'carbide_specialty_metals',
        label: 'Carbide & Specialty Metals',
        subcategories: [
          { id: 'tungsten_carbide_scrap_inserts', label: 'Tungsten Carbide Scrap & Inserts', crossListedIn: ['tooling_consumables'] },
          { id: 'carbide_grades_blanks', label: 'Carbide Grades & Blanks' },
          { id: 'cobalt_alloys', label: 'Cobalt & Cobalt Alloys' },
          { id: 'titanium_scrap_alloys', label: 'Titanium Scrap & Alloys' },
          { id: 'nickel_alloys', label: 'Nickel Alloys (Inconel/Monel/Hastelloy)' },
          { id: 'molybdenum_tungsten', label: 'Molybdenum & Tungsten' },
          { id: 'tool_steel_hss_scrap', label: 'Tool Steel & HSS Scrap', crossListedIn: ['tooling_consumables'] },
          { id: 'precious_metals_catalysts', label: 'Precious Metals (Catalysts/Contacts)' },
          { id: 'carbide_recycling_processing', label: 'Carbide Recycling & Processing', crossListedIn: ['recycling_equipment'] },
        ],
      },
    ],
  },

  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  // TIER 1: TRANSPORTATION & LOGISTICS (4 groups)
  // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  {
    id: 'transportation',
    label: 'Transportation & Logistics',
    groups: [
      {
        id: 'trucks_commercial',
        label: 'Trucks & Commercial Vehicles',
        subcategories: [
          { id: 'conventional_trucks', label: 'Conventional Trucks' },
          { id: 'dump_trucks', label: 'Dump Trucks', crossListedIn: ['heavy_equipment_construction'] },
          { id: 'vans', label: 'Vans' },
          { id: 'bucket_boom_trucks', label: 'Bucket (Boom) Trucks', crossListedIn: ['heavy_equipment_construction'] },
          { id: 'cab_chassis_trucks', label: 'Cab Chassis Trucks' },
          { id: 'service_utility_trucks', label: 'Service & Utility Trucks' },
          { id: 'box_trucks', label: 'Box Trucks' },
          { id: 'flatbed_trucks', label: 'Flatbed Trucks' },
          { id: 'buses', label: 'Buses' },
        ],
      },
      {
        id: 'trailers_towables',
        label: 'Trailers & Towables',
        subcategories: [
          { id: 'trailers', label: 'Trailers (Flatbed/Enclosed/Lowboy)' },
          { id: 'concession_trailers', label: 'Concession Trailers' },
          { id: 'box_trailers', label: 'Box Trailers' },
          { id: 'rvs_campers', label: 'RVs / Campers / Motorhomes / Caravans' },
        ],
      },
      {
        id: 'offroad_specialty',
        label: 'Off-Road & Specialty Vehicles',
        subcategories: [
          { id: 'atv_utv', label: 'ATV & UTV' },
          { id: 'pickup_trucks', label: 'Pickup Trucks' },
        ],
      },
      {
        id: 'engines_drivetrain',
        label: 'Engines & Drivetrain',
        subcategories: [
          { id: 'truck_engines', label: 'Truck Engines' },
          { id: 'automotive_equipment', label: 'Automotive Equipment' },
        ],
      },
    ],
  },
]

// ─── Helper Functions ──────────────────────────────────────────────

/** Returns all Tier 2 group IDs where a subcategory appears (primary + cross-listed) */
export function getAllGroupsForSubcategory(subcategoryId: string): string[] {
  const groups: string[] = []
  for (const bucket of EQUIPMENT_TAXONOMY) {
    for (const group of bucket.groups) {
      for (const sub of group.subcategories) {
        if (sub.id === subcategoryId) {
          groups.push(group.id)
          if (sub.crossListedIn) {
            for (const xref of sub.crossListedIn) {
              if (!groups.includes(xref)) groups.push(xref)
            }
          }
        }
      }
    }
  }
  return groups
}

/** Returns all subcategories relevant to a Tier 2 group (own + cross-listed into it) */
export function getEffectiveSubcategories(tier2Id: string): Subcategory[] {
  const result: Subcategory[] = []
  const seen = new Set<string>()

  for (const bucket of EQUIPMENT_TAXONOMY) {
    for (const group of bucket.groups) {
      // Primary subcategories of this group
      if (group.id === tier2Id) {
        for (const sub of group.subcategories) {
          if (!seen.has(sub.id)) {
            seen.add(sub.id)
            result.push(sub)
          }
        }
      }
      // Cross-listed subcategories from other groups
      for (const sub of group.subcategories) {
        if (sub.crossListedIn?.includes(tier2Id) && !seen.has(sub.id)) {
          seen.add(sub.id)
          result.push(sub)
        }
      }
    }
  }
  return result
}

/** Flat search across all tiers — for search/autocomplete */
export function searchTaxonomy(
  query: string
): { tier1: string; tier2: string; subcategory: Subcategory }[] {
  if (!query.trim()) return []
  const q = query.toLowerCase()
  const results: { tier1: string; tier2: string; subcategory: Subcategory }[] = []

  for (const bucket of EQUIPMENT_TAXONOMY) {
    for (const group of bucket.groups) {
      // Match on tier2 group label → return all its subcategories
      if (group.label.toLowerCase().includes(q)) {
        for (const sub of group.subcategories) {
          results.push({ tier1: bucket.id, tier2: group.id, subcategory: sub })
        }
      } else {
        // Match on individual subcategory labels
        for (const sub of group.subcategories) {
          if (sub.label.toLowerCase().includes(q)) {
            results.push({ tier1: bucket.id, tier2: group.id, subcategory: sub })
          }
        }
      }
    }
  }
  return results
}

/** Lookup a Tier 2 group by ID */
export function getTier2ById(tier2Id: string): Tier2Group | undefined {
  for (const bucket of EQUIPMENT_TAXONOMY) {
    const found = bucket.groups.find((g) => g.id === tier2Id)
    if (found) return found
  }
  return undefined
}

/** Lookup a Tier 1 bucket by ID */
export function getTier1ById(tier1Id: string): Tier1Bucket | undefined {
  return EQUIPMENT_TAXONOMY.find((b) => b.id === tier1Id)
}

/** Get display label for a Tier 2 group ID */
export function getTier2Label(tier2Id: string): string {
  return getTier2ById(tier2Id)?.label || tier2Id
}

/** Get display label for a subcategory ID */
export function getSubcategoryLabel(subcategoryId: string): string {
  for (const bucket of EQUIPMENT_TAXONOMY) {
    for (const group of bucket.groups) {
      const found = group.subcategories.find((s) => s.id === subcategoryId)
      if (found) return found.label
    }
  }
  return subcategoryId
}

/** Get the Tier 1 bucket ID for a given Tier 2 group ID */
export function getTier1ForTier2(tier2Id: string): string {
  for (const bucket of EQUIPMENT_TAXONOMY) {
    if (bucket.groups.some((g) => g.id === tier2Id)) return bucket.id
  }
  return 'machines_equipment'
}

// ─── Supporting Constants ──────────────────────────────────────────

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
  'Automotive',
  'Aerospace',
  'Construction',
  'Forestry',
  'Textile',
  'Semiconductor',
  'Printing & Packaging',
  'Recycling & Waste',
  'Other',
] as const

export interface RoleOption {
  id: string
  label: string
  description: string
}

export const ROLES: RoleOption[] = [
  { id: 'end_user', label: 'End User / Plant', description: 'Plant manager, maintenance, engineering, procurement' },
  { id: 'dealer', label: 'Dealer / Broker', description: 'Buy and resell equipment' },
  { id: 'rebuilder', label: 'Rebuilder / Repair Shop', description: 'Rebuild, repair, refurbish equipment' },
  { id: 'scrap', label: 'Scrap / Investment Recovery', description: 'Buy/sell scrap, surplus, decommissioned' },
  { id: 'logistics', label: 'Logistics / Trucking', description: 'Heavy haul, rigging, transportation' },
  { id: 'services', label: 'Services', description: 'Hydraulic, valves, springs, specialized services' },
]

export const PAIN_POINTS = [
  'Unplanned downtime',
  'Hard-to-find spare parts',
  'Finding trusted rebuilders',
  'Reliable scrap buyers',
  'Logistics / shipping',
  'Equipment valuations',
  'Quality verification',
  'Other',
] as const

export const TRADING_INTENTS = [
  { id: 'find_equipment', label: 'Find equipment / parts' },
  { id: 'sell_surplus', label: 'Sell surplus equipment / scrap / byproducts' },
  { id: 'find_rebuilders', label: 'Find rebuilders / repair services' },
  { id: 'find_buyers', label: 'Find buyers for rebuilt gear' },
  { id: 'arrange_logistics', label: 'Arrange logistics / trucking' },
] as const

export const SOS_TIER_LIMITS = {
  free: { activeSos: 1, maxReachMiles: 100, maxResponders: 10 },
  // Modern tiers (Pricing Cycle: free / pro / business / enterprise)
  pro: { activeSos: 3, maxReachMiles: 500, maxResponders: Infinity },
  business: { activeSos: 10, maxReachMiles: Infinity, maxResponders: Infinity },
  enterprise: { activeSos: Infinity, maxReachMiles: Infinity, maxResponders: Infinity },
  // Legacy aliases — keep so DB rows from before the tier rename still resolve
  premium: { activeSos: 3, maxReachMiles: 500, maxResponders: Infinity },
  boost: { activeSos: Infinity, maxReachMiles: Infinity, maxResponders: Infinity },
} as const
