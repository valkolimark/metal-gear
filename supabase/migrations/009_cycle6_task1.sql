-- Cycle 6 Task 1: Saved Search Alerts & Smart Recommendations

-- Add alert columns to saved_searches
ALTER TABLE saved_searches
  ADD COLUMN IF NOT EXISTS notify_email boolean DEFAULT false NOT NULL,
  ADD COLUMN IF NOT EXISTS last_notified_at timestamptz;

-- User activity tracking table for recommendations
CREATE TABLE IF NOT EXISTS user_activity (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('view', 'search', 'favorite')),
  listing_id uuid REFERENCES listings(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_user_activity_user_id ON user_activity(user_id);
CREATE INDEX idx_user_activity_action ON user_activity(action);
CREATE INDEX idx_user_activity_created_at ON user_activity(created_at);
CREATE INDEX idx_user_activity_listing ON user_activity(listing_id) WHERE listing_id IS NOT NULL;

ALTER TABLE user_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own activity"
  ON user_activity FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own activity"
  ON user_activity FOR INSERT WITH CHECK (user_id = auth.uid());
