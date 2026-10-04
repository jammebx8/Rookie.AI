-- ═══════════════════════════════════════════════════════════════════════════
-- Rookie.AI — Analytics Events Migration
-- Run once in Supabase SQL editor.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. analytics_events — one row per user action ────────────────────────────
CREATE TABLE IF NOT EXISTS public.analytics_events (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id   uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id   text,                          -- client-generated UUID per tab session
  event_name   text        NOT NULL,          -- e.g. 'question_answered'
  ts           timestamptz NOT NULL DEFAULT now(),

  -- optional context — all nullable
  question_id  text,
  test_id      uuid        REFERENCES public.test_attempts(id) ON DELETE SET NULL,
  feature      text,                          -- 'practice' | 'question_viewer' | 'custom_test' | 'recommendation' | 'similar'
  subject      text,
  chapter      text,
  difficulty   numeric,                       -- 0-1 score

  -- numeric measurements
  duration_ms  integer,                       -- time on this event (ms)

  -- catch-all for anything else
  metadata     jsonb
);

-- ── 2. Indexes ────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS ae_student_idx   ON public.analytics_events (student_id);
CREATE INDEX IF NOT EXISTS ae_event_idx     ON public.analytics_events (event_name);
CREATE INDEX IF NOT EXISTS ae_ts_idx        ON public.analytics_events (ts DESC);
CREATE INDEX IF NOT EXISTS ae_feature_idx   ON public.analytics_events (feature);
CREATE INDEX IF NOT EXISTS ae_session_idx   ON public.analytics_events (session_id);
CREATE INDEX IF NOT EXISTS ae_test_idx      ON public.analytics_events (test_id)
  WHERE test_id IS NOT NULL;

-- ── 3. RLS — students insert their own events; admins read all ────────────────
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Students can only insert rows for themselves
DROP POLICY IF EXISTS "ae_insert_own"   ON public.analytics_events;
CREATE POLICY "ae_insert_own"
  ON public.analytics_events FOR INSERT
  WITH CHECK (auth.uid() = student_id OR student_id IS NULL);

-- Students cannot read analytics (admin-only via service role)
-- No SELECT policy = no client reads unless service role

-- ── 4. Grant INSERT to authenticated users ────────────────────────────────────
GRANT INSERT ON public.analytics_events TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.analytics_events_id_seq TO authenticated;

-- ── 5. Helper view: feature_daily_summary ─────────────────────────────────────
-- Pre-aggregated view used by /api/features
CREATE OR REPLACE VIEW public.feature_daily_summary AS
SELECT
  date_trunc('day', ts)::date  AS day,
  feature,
  event_name,
  COUNT(*)                     AS event_count,
  COUNT(DISTINCT student_id)   AS unique_students,
  AVG(duration_ms)             AS avg_duration_ms
FROM public.analytics_events
WHERE feature IS NOT NULL
GROUP BY 1, 2, 3;

GRANT SELECT ON public.feature_daily_summary TO service_role;

-- ── Done ──────────────────────────────────────────────────────────────────────
-- Canonical event names (reference):
--
--   session_started         session_ended
--   question_opened         question_attempted    question_answered
--   question_skipped        question_correct      question_incorrect
--   solution_viewed         solution_read         (duration_ms = time on solution)
--   similar_shown           similar_attempted
--   recommendation_shown    recommendation_attempted
--   test_created            test_started          test_completed    test_abandoned
