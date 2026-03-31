-- Cycle 34: Bulk Import Upgrade — add columns to listing_imports

ALTER TABLE listing_imports
  ADD COLUMN IF NOT EXISTS company_id uuid REFERENCES company_profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS file_format text CHECK (file_format IN ('csv', 'xlsx', 'google_sheets')),
  ADD COLUMN IF NOT EXISTS processed_rows integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS successful_rows integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS failed_rows integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_fetch_attempted integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_fetch_succeeded integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS image_fetch_failed integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'parsing', 'importing', 'fetching_images', 'complete', 'failed')),
  ADD COLUMN IF NOT EXISTS error_log jsonb DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS created_listing_ids uuid[] DEFAULT '{}';

-- Make filename nullable (Google Sheets imports may use URL instead)
ALTER TABLE listing_imports ALTER COLUMN filename DROP NOT NULL;

CREATE INDEX IF NOT EXISTS idx_listing_imports_company ON listing_imports(company_id);
CREATE INDEX IF NOT EXISTS idx_listing_imports_status ON listing_imports(status);
