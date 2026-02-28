-- Cycle 6 Task 4: Verified Seller Badge & Trust System

-- Seller verifications table
CREATE TABLE IF NOT EXISTS seller_verifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  business_name text NOT NULL,
  tax_id_hash text NOT NULL,
  document_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  admin_notes text,
  reviewed_by uuid REFERENCES profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_seller_verifications_user_id ON seller_verifications(user_id);
CREATE INDEX idx_seller_verifications_status ON seller_verifications(status);

ALTER TABLE seller_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own verifications"
  ON seller_verifications FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own verifications"
  ON seller_verifications FOR INSERT WITH CHECK (user_id = auth.uid());

-- Add trust_score to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS trust_score integer DEFAULT 0;
