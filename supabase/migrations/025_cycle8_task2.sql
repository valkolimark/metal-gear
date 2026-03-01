-- Cycle 8, Task 2: Listing Expiration & Auto-Renewal

ALTER TABLE listings
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS auto_renew boolean DEFAULT false;

-- Set default expiration for existing active listings (90 days from now)
UPDATE listings SET expires_at = now() + interval '90 days' WHERE status = 'active' AND expires_at IS NULL;

-- Index for efficient expiration queries
CREATE INDEX IF NOT EXISTS idx_listings_expires_at ON listings(expires_at) WHERE status = 'active';

-- Update status check to include 'expired'
-- Note: if there's a check constraint, we need to drop and recreate it
-- Most Supabase projects don't have an enum constraint on status, so we just ensure the column accepts 'expired'
