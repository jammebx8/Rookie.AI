-- ═══════════════════════════════════════════════════════════════════════════
-- Rookie.AI — Rookie Pass Payment Migration
-- Run this once in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. plans ─────────────────────────────────────────────────────────────────
-- Static plan catalogue. Seed with one row for the ₹299/year pass.
CREATE TABLE IF NOT EXISTS public.plans (
  id              text PRIMARY KEY,          -- e.g. 'rookie_pass_yearly'
  display_name    text NOT NULL,
  price_paise     integer NOT NULL,          -- 29900 = ₹299
  duration_days   integer NOT NULL,          -- 365
  currency        text NOT NULL DEFAULT 'INR',
  active          boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Seed the only plan
INSERT INTO public.plans (id, display_name, price_paise, duration_days)
VALUES ('rookie_pass_yearly', 'Rookie Pass — 1 Year', 29900, 365)
ON CONFLICT (id) DO NOTHING;

-- ── 2. orders ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.orders (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id              uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id              text NOT NULL REFERENCES public.plans(id),
  razorpay_order_id    text UNIQUE,
  razorpay_payment_id  text,
  amount               integer NOT NULL,      -- in paise
  currency             text NOT NULL DEFAULT 'INR',
  status               text NOT NULL DEFAULT 'created'
                         CHECK (status IN ('created','paid','failed')),
  paid_at              timestamptz,
  created_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS orders_user_idx    ON public.orders (user_id);
CREATE INDEX IF NOT EXISTS orders_rp_ord_idx  ON public.orders (razorpay_order_id);

ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "orders_own" ON public.orders;
CREATE POLICY "orders_own"
  ON public.orders FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- ── 3. entitlements ──────────────────────────────────────────────────────────
-- One row per (user, plan). access_until is extended on renewal.
CREATE TABLE IF NOT EXISTS public.entitlements (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id      text NOT NULL REFERENCES public.plans(id),
  access_until timestamptz NOT NULL,
  granted_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, plan_id)
);

CREATE INDEX IF NOT EXISTS entitlements_user_idx ON public.entitlements (user_id);

ALTER TABLE public.entitlements ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "entitlements_own_read" ON public.entitlements;
CREATE POLICY "entitlements_own_read"
  ON public.entitlements FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (used by webhook) needs unrestricted write; anon/authenticated
-- can only read their own row (RLS above).
GRANT SELECT ON public.entitlements TO authenticated;
GRANT ALL    ON public.entitlements TO service_role;
GRANT ALL    ON public.orders        TO service_role;
GRANT SELECT ON public.plans         TO authenticated, service_role;

-- ── 4. grant_access() — atomic + idempotent Postgres function ─────────────────
-- Called by the webhook after payment.captured / order.paid.
-- Safe to retry: the UPDATE only fires once (status <> 'paid' guard).
CREATE OR REPLACE FUNCTION public.grant_access(
  p_rp_order   text,   -- razorpay_order_id
  p_rp_payment text    -- razorpay_payment_id
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER   -- runs as superuser so it bypasses RLS on write
AS $$
DECLARE
  o public.orders%ROWTYPE;
  dur integer;
BEGIN
  -- 1. Mark the order paid (only the first call succeeds due to status guard)
  UPDATE public.orders
     SET status              = 'paid',
         razorpay_payment_id = p_rp_payment,
         paid_at             = now()
   WHERE razorpay_order_id = p_rp_order
     AND status <> 'paid'
  RETURNING * INTO o;

  IF NOT FOUND THEN
    RETURN;  -- idempotent: already processed
  END IF;

  -- 2. Look up duration
  SELECT duration_days INTO dur
    FROM public.plans
   WHERE id = o.plan_id;

  -- 3. Upsert entitlement — extend access_until if already exists
  INSERT INTO public.entitlements (user_id, plan_id, access_until)
  VALUES (o.user_id, o.plan_id, now() + (dur || ' days')::interval)
  ON CONFLICT (user_id, plan_id) DO UPDATE
    SET access_until = GREATEST(
          public.entitlements.access_until,
          now()
        ) + (dur || ' days')::interval;
END;
$$;

GRANT EXECUTE ON FUNCTION public.grant_access(text, text) TO service_role;

-- ── 5. Verify ────────────────────────────────────────────────────────────────
SELECT table_name
FROM   information_schema.tables
WHERE  table_schema = 'public'
  AND  table_name IN ('plans', 'orders', 'entitlements');
