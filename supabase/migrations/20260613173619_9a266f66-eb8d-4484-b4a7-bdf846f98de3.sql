
-- ============ user_credits ============
CREATE TABLE public.user_credits (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0 CHECK (balance >= 0),
  free_quota_remaining integer NOT NULL DEFAULT 100 CHECK (free_quota_remaining >= 0),
  free_quota_monthly integer NOT NULL DEFAULT 100,
  quota_reset_at timestamptz NOT NULL DEFAULT (now() + interval '30 days'),
  lifetime_purchased integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.user_credits TO authenticated;
GRANT ALL ON public.user_credits TO service_role;
ALTER TABLE public.user_credits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own credits" ON public.user_credits
  FOR SELECT USING (auth.uid() = user_id);

-- ============ credit_transactions ============
CREATE TABLE public.credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta integer NOT NULL,
  reason text NOT NULL,
  action_meta jsonb NOT NULL DEFAULT '{}'::jsonb,
  stripe_session_id text UNIQUE,
  balance_after integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_credit_tx_user ON public.credit_transactions(user_id, created_at DESC);
GRANT SELECT ON public.credit_transactions TO authenticated;
GRANT ALL ON public.credit_transactions TO service_role;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users view own transactions" ON public.credit_transactions
  FOR SELECT USING (auth.uid() = user_id);

-- ============ credit_packs ============
CREATE TABLE public.credit_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  credits integer NOT NULL CHECK (credits > 0),
  price_cents integer NOT NULL CHECK (price_cents > 0),
  currency text NOT NULL DEFAULT 'USD',
  stripe_price_id text,
  active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.credit_packs TO authenticated, anon;
GRANT ALL ON public.credit_packs TO service_role;
ALTER TABLE public.credit_packs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view active packs" ON public.credit_packs
  FOR SELECT USING (active = true);

INSERT INTO public.credit_packs (slug, name, credits, price_cents, sort_order) VALUES
  ('starter', 'Starter Pack',  500,   500, 1),
  ('growth',  'Growth Pack',  2000,  1500, 2),
  ('scale',   'Scale Pack',  10000,  5000, 3);

-- ============ updated_at trigger ============
CREATE OR REPLACE FUNCTION public.touch_user_credits()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;
CREATE TRIGGER trg_user_credits_touch
  BEFORE UPDATE ON public.user_credits
  FOR EACH ROW EXECUTE FUNCTION public.touch_user_credits();

-- ============ seed on new user ============
CREATE OR REPLACE FUNCTION public.handle_new_user_credits()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.user_credits (user_id) VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  INSERT INTO public.credit_transactions (user_id, delta, reason, balance_after)
  VALUES (NEW.id, 100, 'free_grant', 0);
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created_credits
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_credits();

-- backfill existing users
INSERT INTO public.user_credits (user_id)
SELECT id FROM auth.users
ON CONFLICT (user_id) DO NOTHING;

-- ============ spend_credits ============
CREATE OR REPLACE FUNCTION public.spend_credits(
  _user_id uuid,
  _amount integer,
  _reason text,
  _meta jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(new_balance integer, new_quota integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  row public.user_credits%ROWTYPE;
  use_quota integer := 0;
  use_balance integer := 0;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;

  SELECT * INTO row FROM public.user_credits WHERE user_id = _user_id FOR UPDATE;
  IF NOT FOUND THEN
    INSERT INTO public.user_credits (user_id) VALUES (_user_id) RETURNING * INTO row;
  END IF;

  -- lazy monthly reset
  IF row.quota_reset_at <= now() THEN
    UPDATE public.user_credits
      SET free_quota_remaining = free_quota_monthly,
          quota_reset_at = now() + interval '30 days'
      WHERE user_id = _user_id
      RETURNING * INTO row;
    INSERT INTO public.credit_transactions (user_id, delta, reason, balance_after)
      VALUES (_user_id, row.free_quota_monthly, 'monthly_reset', row.balance);
  END IF;

  IF row.free_quota_remaining + row.balance < _amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS' USING ERRCODE = 'P0001';
  END IF;

  use_quota := LEAST(row.free_quota_remaining, _amount);
  use_balance := _amount - use_quota;

  UPDATE public.user_credits
    SET free_quota_remaining = free_quota_remaining - use_quota,
        balance = balance - use_balance
    WHERE user_id = _user_id
    RETURNING * INTO row;

  INSERT INTO public.credit_transactions (user_id, delta, reason, action_meta, balance_after)
    VALUES (_user_id, -_amount, _reason, _meta, row.balance);

  new_balance := row.balance;
  new_quota := row.free_quota_remaining;
  RETURN NEXT;
END;
$$;
REVOKE ALL ON FUNCTION public.spend_credits(uuid, integer, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.spend_credits(uuid, integer, text, jsonb) TO service_role;

-- ============ grant_credits (purchases / refunds) ============
CREATE OR REPLACE FUNCTION public.grant_credits(
  _user_id uuid,
  _amount integer,
  _reason text,
  _stripe_session_id text DEFAULT NULL,
  _meta jsonb DEFAULT '{}'::jsonb
)
RETURNS integer
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  row public.user_credits%ROWTYPE;
BEGIN
  IF _amount <= 0 THEN RAISE EXCEPTION 'amount must be positive'; END IF;

  -- idempotency on stripe sessions
  IF _stripe_session_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.credit_transactions WHERE stripe_session_id = _stripe_session_id
  ) THEN
    SELECT balance INTO row.balance FROM public.user_credits WHERE user_id = _user_id;
    RETURN row.balance;
  END IF;

  INSERT INTO public.user_credits (user_id, balance, lifetime_purchased)
    VALUES (_user_id, _amount, CASE WHEN _reason = 'purchase' THEN _amount ELSE 0 END)
    ON CONFLICT (user_id) DO UPDATE
      SET balance = public.user_credits.balance + _amount,
          lifetime_purchased = public.user_credits.lifetime_purchased
            + CASE WHEN _reason = 'purchase' THEN _amount ELSE 0 END
    RETURNING * INTO row;

  INSERT INTO public.credit_transactions
    (user_id, delta, reason, action_meta, stripe_session_id, balance_after)
    VALUES (_user_id, _amount, _reason, _meta, _stripe_session_id, row.balance);

  RETURN row.balance;
END;
$$;
REVOKE ALL ON FUNCTION public.grant_credits(uuid, integer, text, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_credits(uuid, integer, text, text, jsonb) TO service_role;
