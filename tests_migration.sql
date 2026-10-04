-- ═══════════════════════════════════════════════════════════════════════════
-- Rookie.AI — Tests Feature Migration
-- Run this in the Supabase SQL editor once.
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. test_attempts ──────────────────────────────────────────────────────────
-- One row per test a user creates/takes.
CREATE TABLE IF NOT EXISTS public.test_attempts (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title            text NOT NULL DEFAULT 'Custom Test',
  config           jsonb NOT NULL DEFAULT '{}',
  -- config shape: { exam: string, years: string[], subjects: string[], chapters: string[], duration_seconds: number }
  question_ids     text[] NOT NULL DEFAULT '{}',
  duration_seconds integer NOT NULL DEFAULT 3600,
  started_at       timestamptz,
  submitted_at     timestamptz,
  expires_at       timestamptz,   -- started_at + duration_seconds; enforced server-side
  status           text NOT NULL DEFAULT 'created'
                     CHECK (status IN ('created','in_progress','submitted','expired')),
  score            integer,       -- set on submission
  max_score        integer,       -- 4 * total questions
  correct_count    integer,
  incorrect_count  integer,
  unattempted_count integer,
  time_taken_seconds integer,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS test_attempts_user_idx ON public.test_attempts (user_id);
CREATE INDEX IF NOT EXISTS test_attempts_status_idx ON public.test_attempts (status);

-- ── 2. test_answers ───────────────────────────────────────────────────────────
-- One row per (attempt, question). Upserted as the student answers.
CREATE TABLE IF NOT EXISTS public.test_answers (
  id               bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  attempt_id       uuid NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  question_id      text NOT NULL REFERENCES public.jee_mains(question_id),
  -- For MCQ: 'a','b','c','d' | For numerical: stored as text representation of the number
  selected_option  text,
  -- visited / answered / marked / marked_answered / unattempted
  q_status         text NOT NULL DEFAULT 'not_visited'
                     CHECK (q_status IN ('not_visited','visited','answered','marked','marked_answered','unattempted')),
  time_spent_seconds integer NOT NULL DEFAULT 0,
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (attempt_id, question_id)
);

CREATE INDEX IF NOT EXISTS test_answers_attempt_idx ON public.test_answers (attempt_id);

-- ── 3. RLS ────────────────────────────────────────────────────────────────────
ALTER TABLE public.test_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.test_answers  ENABLE ROW LEVEL SECURITY;

-- test_attempts: users see/write only their own rows
DROP POLICY IF EXISTS "test_attempts_own" ON public.test_attempts;
CREATE POLICY "test_attempts_own"
  ON public.test_attempts FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- test_answers: users see/write only answers for their own attempts
DROP POLICY IF EXISTS "test_answers_own" ON public.test_answers;
CREATE POLICY "test_answers_own"
  ON public.test_answers FOR ALL
  USING  (attempt_id IN (
    SELECT id FROM public.test_attempts WHERE user_id = auth.uid()
  ))
  WITH CHECK (attempt_id IN (
    SELECT id FROM public.test_attempts WHERE user_id = auth.uid()
  ));

-- ── 4. Grants ─────────────────────────────────────────────────────────────────
GRANT SELECT, INSERT, UPDATE ON public.test_attempts TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.test_answers  TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.test_answers_id_seq TO authenticated;

-- ── 5. get_test_years() — returns distinct years from exam_shift ──────────────
-- exam_shift format: "JEE Main 2026 (Online) 28th January Evening Shift"
-- We extract the first 4-digit number as the year.
CREATE OR REPLACE FUNCTION public.get_test_years()
RETURNS TABLE(year text, question_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    (regexp_match(exam_shift, '(\d{4})'))[1] AS year,
    COUNT(*)                                  AS question_count
  FROM public.jee_mains
  WHERE exam_shift IS NOT NULL
    AND (regexp_match(exam_shift, '(\d{4})'))[1] IS NOT NULL
  GROUP BY 1
  ORDER BY 1 DESC;
$$;
GRANT EXECUTE ON FUNCTION public.get_test_years() TO authenticated;

-- ── 6. get_test_chapters() — chapters for given years+subjects with counts ─────
CREATE OR REPLACE FUNCTION public.get_test_chapters(
  p_years    text[],
  p_subjects text[]
)
RETURNS TABLE(subject text, chapter text, question_count bigint)
LANGUAGE sql STABLE SECURITY DEFINER
AS $$
  SELECT
    q.subject,
    q.chapter,
    COUNT(*) AS question_count
  FROM public.jee_mains q
  WHERE (regexp_match(q.exam_shift, '(\d{4})'))[1] = ANY(p_years)
    AND lower(q.subject) = ANY(
          SELECT lower(s) FROM unnest(p_subjects) AS s
        )
    AND q.chapter IS NOT NULL
    AND q.subject IS NOT NULL
  GROUP BY q.subject, q.chapter
  ORDER BY q.subject, q.chapter;
$$;
GRANT EXECUTE ON FUNCTION public.get_test_chapters(text[], text[]) TO authenticated;

-- ── 7. build_test_question_ids() — server-side balanced question selection ─────
-- Called by the API route (service role). Returns randomised, balanced question IDs.
-- Cap: floor(duration_seconds / 90) questions, balanced across subjects.
CREATE OR REPLACE FUNCTION public.build_test_question_ids(
  p_years            text[],
  p_subjects         text[],
  p_chapters         text[],
  p_duration_seconds integer
)
RETURNS text[]
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_cap_total   integer;
  v_per_subject integer;
  v_n_subjects  integer;
  v_ids         text[] := '{}';
  v_subject     text;
BEGIN
  -- 1 question per 90 seconds, minimum 5, maximum 120
  v_cap_total   := GREATEST(5, LEAST(120, p_duration_seconds / 90));
  v_n_subjects  := array_length(p_subjects, 1);

  IF v_n_subjects IS NULL OR v_n_subjects = 0 THEN
    RETURN v_ids;
  END IF;

  v_per_subject := GREATEST(1, v_cap_total / v_n_subjects);

  FOREACH v_subject IN ARRAY p_subjects LOOP
    SELECT array_agg(q.question_id) INTO v_ids
    FROM (
      SELECT v_ids || array_agg(sub.question_id) AS question_id
      FROM (
        SELECT question_id
        FROM   public.jee_mains
        WHERE  (regexp_match(exam_shift, '(\d{4})'))[1] = ANY(p_years)
          AND  lower(subject) = lower(v_subject)
          AND  chapter        = ANY(p_chapters)
          AND  question_id   IS NOT NULL
        ORDER BY random()
        LIMIT  v_per_subject
      ) sub
    ) agg;
  END LOOP;

  -- Flatten: v_ids was being rebuilt each iteration; redo cleanly
  SELECT array_agg(question_id ORDER BY random()) INTO v_ids
  FROM (
    SELECT DISTINCT question_id
    FROM   public.jee_mains
    WHERE  (regexp_match(exam_shift, '(\d{4})'))[1] = ANY(p_years)
      AND  lower(subject)  = ANY(
             SELECT lower(s) FROM unnest(p_subjects) AS s
           )
      AND  chapter         = ANY(p_chapters)
      AND  question_id    IS NOT NULL
    ORDER BY random()
    LIMIT v_cap_total
  ) pool;

  RETURN COALESCE(v_ids, '{}');
END;
$$;
GRANT EXECUTE ON FUNCTION public.build_test_question_ids(text[], text[], text[], integer) TO service_role;

-- ── 8. score_test() — server-side scoring, called by submit API route ──────────
-- Returns score, correct, incorrect, unattempted counts.
CREATE OR REPLACE FUNCTION public.score_test(p_attempt_id uuid)
RETURNS TABLE(
  total_score      integer,
  max_score        integer,
  correct_count    integer,
  incorrect_count  integer,
  unattempted_count integer
)
LANGUAGE plpgsql SECURITY DEFINER
AS $$
DECLARE
  v_total     integer := 0;
  v_correct   integer := 0;
  v_incorrect integer := 0;
  v_unatt     integer := 0;
  v_max       integer := 0;
BEGIN
  SELECT
    COUNT(*)                                        INTO v_max
  FROM public.test_answers ta
  WHERE ta.attempt_id = p_attempt_id;

  -- MCQ: correct_option is 'a','b','c','d' or 'option_a' style
  -- We normalise both sides to single letter for comparison
  SELECT
    COALESCE(SUM(CASE
      WHEN ta.q_status IN ('answered','marked_answered')
       AND ta.selected_option IS NOT NULL
       AND (
         -- direct single letter match
         lower(substring(ta.selected_option, '[a-d]')) =
         lower(substring(
           regexp_replace(q.correct_option, 'option_?', '', 'i'),
           '[a-d]'
         ))
       )
      THEN 1 ELSE 0
    END), 0),
    COALESCE(SUM(CASE
      WHEN ta.q_status IN ('answered','marked_answered')
       AND ta.selected_option IS NOT NULL
       AND (
         lower(substring(ta.selected_option, '[a-d]')) <>
         lower(substring(
           regexp_replace(q.correct_option, 'option_?', '', 'i'),
           '[a-d]'
         ))
       )
      THEN 1 ELSE 0
    END), 0),
    COALESCE(SUM(CASE
      WHEN ta.q_status NOT IN ('answered','marked_answered')
        OR ta.selected_option IS NULL
      THEN 1 ELSE 0
    END), 0)
  INTO v_correct, v_incorrect, v_unatt
  FROM public.test_answers ta
  JOIN public.jee_mains    q  ON q.question_id = ta.question_id
  WHERE ta.attempt_id = p_attempt_id;

  -- +4 correct, -1 incorrect (MCQ); numerical is +4/0
  -- For numerical questions (no options): compare as numeric
  -- Simple approach: use single-letter check; numeric answers stored as option text
  v_total := (v_correct * 4) - (v_incorrect * 1);

  RETURN QUERY SELECT v_total, v_max * 4, v_correct, v_incorrect, v_unatt;
END;
$$;
GRANT EXECUTE ON FUNCTION public.score_test(uuid) TO service_role;

-- ── Done ──────────────────────────────────────────────────────────────────────
