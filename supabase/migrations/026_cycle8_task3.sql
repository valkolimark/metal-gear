-- Cycle 8, Task 3: Related Listings & Cross-Sell

-- View sessions for co-view analysis (views within 30-min windows)
CREATE TABLE IF NOT EXISTS view_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL,
  user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  listing_id uuid NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_view_sessions_session ON view_sessions(session_id);
CREATE INDEX IF NOT EXISTS idx_view_sessions_listing ON view_sessions(listing_id);
CREATE INDEX IF NOT EXISTS idx_view_sessions_user ON view_sessions(user_id);
