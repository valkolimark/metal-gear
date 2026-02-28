-- Reviews table for seller ratings
CREATE TABLE IF NOT EXISTS reviews (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reviewer_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  seller_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  rating integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(reviewer_id, conversation_id)
);

CREATE INDEX idx_reviews_seller_id ON reviews(seller_id);
CREATE INDEX idx_reviews_reviewer_id ON reviews(reviewer_id);

ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own reviews"
  ON reviews FOR INSERT WITH CHECK (reviewer_id = auth.uid());

CREATE POLICY "Anyone can read reviews"
  ON reviews FOR SELECT USING (true);

-- Reports table for flagging listings/users
CREATE TABLE IF NOT EXISTS reports (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  reporter_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  target_type text NOT NULL, -- 'listing' or 'user'
  target_id uuid NOT NULL,
  reason text NOT NULL,
  details text,
  status text NOT NULL DEFAULT 'pending', -- pending, reviewed, resolved, dismissed
  admin_notes text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_reports_status ON reports(status);
CREATE INDEX idx_reports_reporter_id ON reports(reporter_id);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can create reports"
  ON reports FOR INSERT WITH CHECK (reporter_id = auth.uid());

CREATE POLICY "Users can read their own reports"
  ON reports FOR SELECT USING (reporter_id = auth.uid());
