-- ============================================================
-- Migration 032: Metal Gear 3-Tier Equipment Taxonomy
-- Migrates from flat category system to tier1/tier2/subcategories
-- ============================================================

-- ─── A. user_equipment_interests ────────────────────────────────

-- Add new columns
ALTER TABLE user_equipment_interests ADD COLUMN IF NOT EXISTS tier1 TEXT;
ALTER TABLE user_equipment_interests ADD COLUMN IF NOT EXISTS tier2 TEXT;
ALTER TABLE user_equipment_interests ADD COLUMN IF NOT EXISTS subcategories TEXT[] DEFAULT '{}';

-- Migrate existing data: map old category → tier2, derive tier1, copy sub_types → subcategories
UPDATE user_equipment_interests SET
  tier2 = category,
  tier1 = CASE
    WHEN category IN ('centrifuges', 'valves', 'gearboxes', 'mixers_blenders',
                       'hydraulic_equipment', 'heat_exchangers', 'compressors',
                       'cnc_machine_tools', 'pumps') THEN 'machines_equipment'
    WHEN category IN ('bearings_seals') THEN 'parts_components'
    WHEN category IN ('scrap_byproducts') THEN 'materials'
    WHEN category IN ('trucks_heavy_equipment') THEN 'transportation'
    ELSE 'machines_equipment'
  END,
  subcategories = COALESCE(sub_types, '{}')
WHERE tier1 IS NULL;

-- Make tier1/tier2 NOT NULL (default for any future rows)
ALTER TABLE user_equipment_interests ALTER COLUMN tier1 SET NOT NULL;
ALTER TABLE user_equipment_interests ALTER COLUMN tier2 SET NOT NULL;

-- Drop old unique constraint and add new one
ALTER TABLE user_equipment_interests DROP CONSTRAINT IF EXISTS user_equipment_interests_user_id_category_key;
ALTER TABLE user_equipment_interests ADD CONSTRAINT user_equipment_interests_user_id_tier2_key UNIQUE(user_id, tier2);

-- Drop old columns
ALTER TABLE user_equipment_interests DROP COLUMN IF EXISTS category;
ALTER TABLE user_equipment_interests DROP COLUMN IF EXISTS sub_types;

-- Indexes (drop old, add new)
DROP INDEX IF EXISTS idx_uei_tier2;
DROP INDEX IF EXISTS idx_uei_tier1;
CREATE INDEX idx_uei_tier2 ON user_equipment_interests(tier2);
CREATE INDEX idx_uei_tier1 ON user_equipment_interests(tier1);

-- ─── B. sos_requests ────────────────────────────────────────────

-- Add new column
ALTER TABLE sos_requests ADD COLUMN IF NOT EXISTS equipment_subcategory TEXT;

-- Migrate existing data
UPDATE sos_requests SET equipment_subcategory = equipment_sub_type WHERE equipment_subcategory IS NULL AND equipment_sub_type IS NOT NULL;

-- Drop old column
ALTER TABLE sos_requests DROP COLUMN IF EXISTS equipment_sub_type;

-- ─── C. Update find_sos_responders function ─────────────────────

CREATE OR REPLACE FUNCTION find_sos_responders(
  p_tier2 TEXT,
  p_subcategory TEXT DEFAULT NULL
)
RETURNS TABLE(user_id UUID, notify_methods TEXT[]) AS $$
BEGIN
  RETURN QUERY
  SELECT
    ubp.user_id,
    ubp.sos_notify_methods
  FROM user_business_profiles ubp
  JOIN user_equipment_interests uei ON uei.user_id = ubp.user_id
  WHERE ubp.sos_responder = true
    AND uei.tier2 = p_tier2
    AND (p_subcategory IS NULL OR p_subcategory = ANY(uei.subcategories))
    AND ubp.onboarding_completed = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
