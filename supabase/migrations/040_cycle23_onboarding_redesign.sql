-- Cycle 23: Role-aware onboarding redesign
-- Adds archetype-specific columns to user_business_profiles

ALTER TABLE user_business_profiles
  ADD COLUMN IF NOT EXISTS archetype TEXT CHECK (archetype IN ('operator', 'trader', 'service_provider')),
  ADD COLUMN IF NOT EXISTS sub_role TEXT,
  ADD COLUMN IF NOT EXISTS trading_activities TEXT[],   -- ['buy', 'sell', 'rebuild', 'rent']
  ADD COLUMN IF NOT EXISTS service_types TEXT[],        -- for service providers
  ADD COLUMN IF NOT EXISTS service_area TEXT,           -- 'local' | 'regional' | 'national' | 'international'
  ADD COLUMN IF NOT EXISTS sourcing_methods TEXT[],     -- for operators
  ADD COLUMN IF NOT EXISTS monthly_volume TEXT,         -- for traders
  ADD COLUMN IF NOT EXISTS sos_opted_in BOOLEAN DEFAULT true;
