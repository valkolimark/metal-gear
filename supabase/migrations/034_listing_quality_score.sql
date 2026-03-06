-- Cycle 13-2: Add listing quality score column
ALTER TABLE listings ADD COLUMN IF NOT EXISTS listing_quality_score integer;
