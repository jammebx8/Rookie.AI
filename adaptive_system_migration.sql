-- ═══════════════════════════════════════════════════════════════════════════
-- Rookie.AI — Adaptive System Migration
-- Run this in the Supabase SQL editor (dashboard → SQL Editor → New Query)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1. survey_responses ────────────────────────────────────────────────────
-- Stores the lightweight weekly "chapters I've studied" survey answer per user.
-- One row per user; overwritten each time they answer.

CREATE TABLE IF NOT EXISTS public.survey_responses (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id      uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapters     text[] NOT NULL DEFAULT '{}',
  subjects     text[] NOT NULL DEFAULT '{}',
  updated_at   timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT survey_responses_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS survey_responses_user_idx
  ON public.survey_responses USING btree (user_id);

-- RLS: users can only read/write their own row
ALTER TABLE public.survey_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "survey own row" ON public.survey_responses;
CREATE POLICY "survey own row"
  ON public.survey_responses
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 2. Index on option percents (for adaptive difficulty queries) ───────────
-- The adaptive fetcher reads option_a_percent…option_d_percent to score
-- difficulty.  A partial index on non-null rows speeds up candidate fetching.

CREATE INDEX IF NOT EXISTS jee_mains_option_pct_idx
  ON public.jee_mains USING btree (option_a_percent)
  WHERE option_a_percent IS NOT NULL;


-- ── 3. Composite index for adaptive chapter + percent queries ──────────────
CREATE INDEX IF NOT EXISTS jee_mains_chapter_pct_idx
  ON public.jee_mains USING btree (chapter, option_a_percent)
  WHERE option_a_percent IS NOT NULL;


-- ── 4. bookmark_wrong_attempts — optional server-side tracking ─────────────
-- The frontend already persists wrong-answer bookmarks in localStorage.
-- This table provides an optional server-side mirror so data persists across
-- devices and sessions.  It is written to fire-and-forget; no RLS blocking
-- reads from the practice flow.

CREATE TABLE IF NOT EXISTS public.bookmark_wrong_attempts (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  student_id   uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_id  character varying(40) NOT NULL REFERENCES public.jee_mains(question_id),
  bookmarked_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT bookmark_wrong_unique UNIQUE (student_id, question_id)
);

CREATE INDEX IF NOT EXISTS bookmark_wrong_student_idx
  ON public.bookmark_wrong_attempts USING btree (student_id);

ALTER TABLE public.bookmark_wrong_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "bookmark wrong own row" ON public.bookmark_wrong_attempts;
CREATE POLICY "bookmark wrong own row"
  ON public.bookmark_wrong_attempts
  FOR ALL
  USING  (auth.uid() = student_id)
  WITH CHECK (auth.uid() = student_id);


-- ── 5. user_xp — persistent XP / level store ──────────────────────────────
-- XP is also stored in localStorage (XP_KEY = 'rookie_xp_v1') for instant
-- reads.  This table is the source of truth across devices.

CREATE TABLE IF NOT EXISTS public.user_xp (
  id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id    uuid   NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  total_xp   integer NOT NULL DEFAULT 0,
  updated_at timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT user_xp_user_id_key UNIQUE (user_id)
);

CREATE INDEX IF NOT EXISTS user_xp_user_idx
  ON public.user_xp USING btree (user_id);

ALTER TABLE public.user_xp ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "xp own row" ON public.user_xp;
CREATE POLICY "xp own row"
  ON public.user_xp
  FOR ALL
  USING  (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- ── 6. Verify ──────────────────────────────────────────────────────────────
SELECT table_name
FROM   information_schema.tables
WHERE  table_schema = 'public'
  AND  table_name IN (
         'survey_responses',
         'bookmark_wrong_attempts',
         'user_xp'
       );
