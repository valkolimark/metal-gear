-- ============================================================
-- Monetization tables: subscriptions & payments
-- ============================================================

-- Stripe customer mapping
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_customer_id text UNIQUE;

-- ─── Subscriptions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_subscription_id text UNIQUE NOT NULL,
  stripe_price_id text NOT NULL,
  tier text NOT NULL CHECK (tier IN ('premium', 'boost')),
  status text NOT NULL DEFAULT 'active'
    CHECK (status IN ('active', 'past_due', 'canceled', 'incomplete', 'trialing', 'unpaid')),
  current_period_start timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean DEFAULT false,
  canceled_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_subscriptions_user ON public.subscriptions(user_id);
CREATE INDEX idx_subscriptions_stripe_id ON public.subscriptions(stripe_subscription_id);
CREATE INDEX idx_subscriptions_status ON public.subscriptions(status);

-- RLS
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscriptions"
  ON public.subscriptions FOR SELECT
  USING (auth.uid() = user_id);

-- ─── Payments ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.payments (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subscription_id uuid REFERENCES public.subscriptions(id) ON DELETE SET NULL,
  stripe_payment_intent_id text UNIQUE,
  stripe_invoice_id text,
  amount_cents integer NOT NULL,
  currency text DEFAULT 'usd' NOT NULL,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'succeeded', 'failed', 'refunded')),
  description text,
  created_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_payments_user ON public.payments(user_id);
CREATE INDEX idx_payments_subscription ON public.payments(subscription_id);

-- RLS
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own payments"
  ON public.payments FOR SELECT
  USING (auth.uid() = user_id);

-- ─── Triggers ────────────────────────────────────────────────
CREATE TRIGGER handle_subscriptions_updated_at
  BEFORE UPDATE ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
