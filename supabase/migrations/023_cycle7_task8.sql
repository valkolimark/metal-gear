-- Cycle 7, Task 8: Onboarding Flow & User Engagement

CREATE TABLE IF NOT EXISTS onboarding_progress (
  user_id uuid PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  steps_completed text[] DEFAULT '{}',
  completed_at timestamptz,
  dismissed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Add last_login_at to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS last_login_at timestamptz;
