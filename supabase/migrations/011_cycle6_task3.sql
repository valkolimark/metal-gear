-- Cycle 6 Task 3: Bulk Listing Import via CSV

CREATE TABLE IF NOT EXISTS listing_imports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  filename text NOT NULL,
  total_rows integer NOT NULL DEFAULT 0,
  success_count integer NOT NULL DEFAULT 0,
  error_count integer NOT NULL DEFAULT 0,
  errors jsonb DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_listing_imports_user_id ON listing_imports(user_id);

ALTER TABLE listing_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own imports"
  ON listing_imports FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own imports"
  ON listing_imports FOR INSERT WITH CHECK (user_id = auth.uid());
