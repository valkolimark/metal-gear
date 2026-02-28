-- Cycle 7, Task 2: Dispute Resolution System

CREATE TABLE IF NOT EXISTS disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  transaction_id uuid NOT NULL REFERENCES transactions(id),
  opened_by uuid NOT NULL REFERENCES profiles(id),
  reason text NOT NULL CHECK (reason IN ('item_not_received', 'item_not_as_described', 'damaged_in_shipping', 'wrong_item', 'other')),
  description text NOT NULL,
  evidence_urls text[] DEFAULT '{}',
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'under_review', 'resolved_buyer', 'resolved_seller', 'escalated')),
  seller_response text,
  seller_evidence_urls text[] DEFAULT '{}',
  resolution_notes text,
  resolved_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_disputes_transaction ON disputes(transaction_id);
CREATE INDEX IF NOT EXISTS idx_disputes_status ON disputes(status);

-- Storage bucket for dispute evidence photos
-- Created via Supabase API: dispute-evidence (public)
