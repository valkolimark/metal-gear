-- Cycle 8, Task 4: Saved Search Enhancements & Price Drop Alerts

-- Add target price to price watches
ALTER TABLE price_watches ADD COLUMN IF NOT EXISTS target_price_cents integer;

-- Add frequency to saved searches (instant, daily, weekly)
ALTER TABLE saved_searches ADD COLUMN IF NOT EXISTS frequency text DEFAULT 'daily';
