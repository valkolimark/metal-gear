-- Cycle 6 Task 5: Transaction & Order Management

CREATE TABLE IF NOT EXISTS transactions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id uuid NOT NULL REFERENCES profiles(id),
  seller_id uuid NOT NULL REFERENCES profiles(id),
  listing_id uuid NOT NULL REFERENCES listings(id),
  offer_id uuid REFERENCES offers(id),
  amount_cents integer NOT NULL,
  status text NOT NULL DEFAULT 'initiated' CHECK (status IN ('initiated', 'payment_pending', 'paid', 'shipped', 'delivered', 'completed', 'disputed', 'refunded')),
  stripe_payment_intent_id text,
  tracking_number text,
  carrier text,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_transactions_buyer ON transactions(buyer_id);
CREATE INDEX idx_transactions_seller ON transactions(seller_id);
CREATE INDEX idx_transactions_listing ON transactions(listing_id);
CREATE INDEX idx_transactions_status ON transactions(status);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Buyers and sellers can view their transactions"
  ON transactions FOR SELECT USING (buyer_id = auth.uid() OR seller_id = auth.uid());
