-- Cycle 6 Task 8: Internationalization & Accessibility
-- Add preferred_locale column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS preferred_locale text DEFAULT 'en' NOT NULL;
