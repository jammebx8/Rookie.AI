-- ═══════════════════════════════════════════════════════════════════════════
-- Rookie.AI — Real student testimonials
-- Run this once in the Supabase SQL editor.
--
-- Flow: a student writes a quote and ticks consent → row lands with
-- approved = false → you approve it in the Supabase table editor → it shows
-- on the landing page with the student's Google profile photo (users.avatar_url).
-- ═══════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS public.testimonials (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  quote       text NOT NULL CHECK (char_length(quote) BETWEEN 10 AND 160),
  class_label text,                         -- '11th' | '12th' | 'Dropper'
  city        text,                         -- optional, shown as "Class 12 · Kota"
  exam_label  text,                         -- 'JEE Main' | 'NEET' | …
  consent     boolean NOT NULL DEFAULT false, -- student agreed to name + photo on the site
  approved    boolean NOT NULL DEFAULT false, -- set by the team, never by the client
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)                          -- one quote per student
);

ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;

-- Students can submit (and read/edit) only their own quote, and can never self-approve.
DROP POLICY IF EXISTS testimonials_insert_own ON public.testimonials;
CREATE POLICY testimonials_insert_own ON public.testimonials
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND approved = false);

DROP POLICY IF EXISTS testimonials_select_own ON public.testimonials;
CREATE POLICY testimonials_select_own ON public.testimonials
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS testimonials_update_own ON public.testimonials;
CREATE POLICY testimonials_update_own ON public.testimonials
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND approved = false); -- editing resets to review

-- Public read goes through this view only: approved + consented rows,
-- first name + photo, nothing else from `users` (no email, no coins).
CREATE OR REPLACE VIEW public.public_testimonials AS
SELECT
  t.id,
  t.quote,
  split_part(trim(u.name), ' ', 1) AS first_name,
  u.avatar_url,
  t.class_label,
  t.city,
  t.exam_label,
  t.created_at
FROM public.testimonials t
JOIN public.users u ON u.id = t.user_id
WHERE t.approved AND t.consent;

REVOKE ALL ON public.public_testimonials FROM anon, authenticated;
GRANT SELECT ON public.public_testimonials TO anon, authenticated;
