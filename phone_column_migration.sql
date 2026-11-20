-- ═══════════════════════════════════════════════════════════════════════════
-- Rookie.AI — Phone Column Migration
-- Adds phone column to public.users to support phone onboarding modal
-- ═══════════════════════════════════════════════════════════════════════════

ALTER TABLE IF EXISTS public.users
ADD COLUMN IF NOT EXISTS phone text;

CREATE INDEX IF NOT EXISTS users_phone_idx ON public.users (phone) WHERE phone IS NOT NULL;
