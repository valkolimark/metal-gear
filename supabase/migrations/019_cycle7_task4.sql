-- Cycle 7, Task 4: Equipment Condition Reports

CREATE TABLE IF NOT EXISTS condition_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  created_by uuid NOT NULL REFERENCES profiles(id),
  overall_grade text NOT NULL CHECK (overall_grade IN ('A', 'B', 'C', 'D', 'F')),
  mechanical_score integer NOT NULL CHECK (mechanical_score BETWEEN 1 AND 10),
  cosmetic_score integer NOT NULL CHECK (cosmetic_score BETWEEN 1 AND 10),
  electrical_score integer NOT NULL CHECK (electrical_score BETWEEN 1 AND 10),
  hours_of_use integer,
  last_service_date date,
  notes text,
  photo_urls text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

-- One condition report per listing
CREATE UNIQUE INDEX IF NOT EXISTS idx_condition_reports_listing ON condition_reports(listing_id);

-- Storage bucket: condition-reports (public)
