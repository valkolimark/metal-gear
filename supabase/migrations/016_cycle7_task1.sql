-- Cycle 7, Task 1: Stripe Escrow Payments
-- Add platform fee and payment intent status columns to transactions

ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS platform_fee_cents integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_status text DEFAULT 'none';

-- Add index for querying by payment intent status
CREATE INDEX IF NOT EXISTS idx_transactions_pi_status ON transactions(stripe_payment_intent_status);

COMMENT ON COLUMN transactions.platform_fee_cents IS '5% platform service fee in cents';
COMMENT ON COLUMN transactions.stripe_payment_intent_status IS 'Stripe PaymentIntent status: none, requires_payment_method, requires_confirmation, requires_action, processing, requires_capture, canceled, succeeded';
