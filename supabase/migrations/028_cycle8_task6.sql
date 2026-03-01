-- Cycle 8, Task 6: Inventory Management & Stock Tracking

-- Add inventory columns to listings
ALTER TABLE listings ADD COLUMN IF NOT EXISTS quantity integer DEFAULT 1;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS sku text;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS warehouse_location text;

-- Index for SKU lookups
CREATE INDEX IF NOT EXISTS idx_listings_sku ON listings(sku) WHERE sku IS NOT NULL;
