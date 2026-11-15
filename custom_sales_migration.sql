-- ═══════════════════════════════════════════════════════════════════════════
-- Rookie.AI — Custom Sales & Dynamic Pricing Migration
-- Run this in the Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- 1. Update the base price of the annual plan to ₹999 (99900 paise)
--    The 60% discount (₹399) is applied dynamically during the 48h welcome
--    window or via custom admin sales.
UPDATE public.plans
   SET price_paise = 99900,
       display_name = 'Rookie pass yearly'
 WHERE id = 'rookie_pass_yearly';

-- Ensure the row exists with ₹999 base price if not already present
INSERT INTO public.plans (id, display_name, price_paise, duration_days, currency, active)
VALUES ('rookie_pass_yearly', 'Rookie pass yearly', 99900, 365, 'INR', true)
ON CONFLICT (id) DO UPDATE SET price_paise = 99900, display_name = 'Rookie pass yearly';

-- 2. Create the user_custom_sales table for individual user discounts
CREATE TABLE IF NOT EXISTS public.user_custom_sales (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  plan_id             text NOT NULL DEFAULT 'rookie_pass_yearly' REFERENCES public.plans(id),
  custom_price_paise  integer NOT NULL,           -- e.g. 39900 = ₹399, 29900 = ₹299
  starts_at           timestamptz NOT NULL DEFAULT now(),
  expires_at          timestamptz NOT NULL,       -- e.g. now() + interval '24 hours'
  duration_hours      integer NOT NULL DEFAULT 24,
  reason              text,                       -- e.g. 'Abandoned checkout recovery offer'
  created_by          text DEFAULT 'admin',
  created_at          timestamptz NOT NULL DEFAULT now(),
  is_active           boolean NOT NULL DEFAULT true
);

-- Indexes for lightning-fast user price resolution
CREATE INDEX IF NOT EXISTS idx_user_custom_sales_user 
  ON public.user_custom_sales (user_id, expires_at) 
  WHERE is_active = true;

CREATE INDEX IF NOT EXISTS idx_user_custom_sales_created 
  ON public.user_custom_sales (created_at DESC);

-- Enable RLS
ALTER TABLE public.user_custom_sales ENABLE ROW LEVEL SECURITY;

-- Students can read their own active discounts
DROP POLICY IF EXISTS "user_custom_sales_read_own" ON public.user_custom_sales;
CREATE POLICY "user_custom_sales_read_own"
  ON public.user_custom_sales FOR SELECT
  USING (auth.uid() = user_id);

-- Service role (used by rookie-dash and backend payment proxy) has full access
GRANT SELECT ON public.user_custom_sales TO authenticated;
GRANT ALL    ON public.user_custom_sales TO service_role;
