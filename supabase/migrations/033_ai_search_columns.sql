-- Cycle 13-1: Add AI search tracking columns to saved_searches
ALTER TABLE saved_searches
  ADD COLUMN IF NOT EXISTS ai_query text,
  ADD COLUMN IF NOT EXISTS ai_filters jsonb,
  ADD COLUMN IF NOT EXISTS is_ai_search boolean DEFAULT false;
