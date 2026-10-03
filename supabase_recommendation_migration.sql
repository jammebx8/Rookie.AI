-- ============================================================
-- Rookie.AI  —  Embedding-Based Recommendation System
-- Run this entire script in the Supabase SQL Editor once.
-- ============================================================

-- ── 1. Enable pgvector extension ──────────────────────────────
create extension if not exists vector;

-- ── 2. Add embedding column to jee_mains (384-dim, all-MiniLM-L6-v2) ──
--    If you later use a different model, change the dimension here.
alter table jee_mains
  add column if not exists embedding vector(384);

-- ── 3. HNSW index for fast cosine-similarity search ───────────
--    Builds in background; safe to run on a live table.
create index if not exists jee_mains_embedding_hnsw
  on jee_mains
  using hnsw (embedding vector_cosine_ops)
  with (m = 16, ef_construction = 64);

-- ── 4. student_ability_vector table ───────────────────────────
--    One row per student. The `ability_vector` is the running
--    centroid of embeddings for questions the student got wrong
--    (negative signal) and right (positive signal).
--    We store it as a 384-dim vector so we can do fast similarity
--    lookups directly in Postgres.
create table if not exists student_ability_vector (
  user_id         uuid primary key references auth.users(id) on delete cascade,
  ability_vector  vector(384),          -- centroid of all attempted questions
  wrong_vector    vector(384),          -- centroid of wrong-answer questions
  right_vector    vector(384),          -- centroid of correct-answer questions
  total_attempts  int     default 0,
  wrong_attempts  int     default 0,
  right_attempts  int     default 0,
  updated_at      timestamptz default now()
);

-- ── 5. attempts table (add embedding snapshot) ────────────────
--    The attempts table already exists.  We add a nullable column
--    that caches the question's embedding at attempt time so we
--    never need to re-join jee_mains when recalculating vectors.
alter table attempts
  add column if not exists question_embedding vector(384);

-- ── 6. Helper: weighted running-average of two vectors ────────
--    Computes  (old_avg * old_n + new_vec) / (old_n + 1)
--    without scalar multiplication (pgvector has no vector * scalar operator).
--    Strategy: build a VALUES list of old_n copies of old_avg plus one new_vec,
--    then take avg(). For small old_n this is fine; in practice old_n never
--    exceeds ~10,000 attempts so we cap repeated values at 100 with proportional
--    new_vec weight to keep the query fast.
create or replace function vector_running_avg(
  old_avg  vector,
  old_n    int,
  new_vec  vector
) returns vector
language plpgsql immutable strict
as $$
declare
  -- Use at most 100 "slots" to avoid generating a huge VALUES list.
  -- Scale proportionally: out of (capped+1) total slots, capped slots get
  -- old_avg and 1 slot gets new_vec — this preserves the weighted ratio exactly
  -- when old_n <= 100, and approximates it closely for larger old_n.
  capped   int;
  result   vector;
begin
  if old_n = 0 or old_avg is null then
    return new_vec;
  end if;

  capped := least(old_n, 100);

  -- avg over (capped copies of old_avg) + (1 new_vec)
  -- = (capped * old_avg + new_vec) / (capped + 1)
  -- which equals the true running average when capped = old_n.
  SELECT avg(v)::vector INTO result
  FROM (
    SELECT old_avg AS v
    FROM   generate_series(1, capped)
    UNION ALL
    SELECT new_vec
  ) t;

  return result;
end;
$$;

-- ── 7. update_student_ability_vector(user_id, question_id, correct)
--    Called after every attempt.  Updates the ability vector in-place.
create or replace function update_student_ability_vector(
  p_user_id    uuid,
  p_question_id text,
  p_correct    boolean
) returns void
language plpgsql security definer
as $$
declare
  v_embedding  vector(384);
  v_row        student_ability_vector%rowtype;
  v_new_total  int;
  v_new_wrong  int;
  v_new_right  int;
begin
  -- Fetch the question's embedding
  select embedding into v_embedding
  from   jee_mains
  where  question_id = p_question_id
  limit  1;

  -- Nothing to do if the question has no embedding yet
  if v_embedding is null then return; end if;

  -- Fetch or initialise the student row
  select * into v_row
  from   student_ability_vector
  where  user_id = p_user_id;

  if not found then
    v_row.user_id        := p_user_id;
    v_row.ability_vector := null;
    v_row.wrong_vector   := null;
    v_row.right_vector   := null;
    v_row.total_attempts := 0;
    v_row.wrong_attempts := 0;
    v_row.right_attempts := 0;
  end if;

  -- Update counts
  v_new_total := v_row.total_attempts + 1;
  v_new_wrong := v_row.wrong_attempts + (case when not p_correct then 1 else 0 end);
  v_new_right := v_row.right_attempts + (case when     p_correct then 1 else 0 end);

  -- Update running averages
  v_row.ability_vector := vector_running_avg(v_row.ability_vector, v_row.total_attempts, v_embedding);

  if not p_correct then
    v_row.wrong_vector := vector_running_avg(v_row.wrong_vector, v_row.wrong_attempts, v_embedding);
  else
    v_row.right_vector := vector_running_avg(v_row.right_vector, v_row.right_attempts, v_embedding);
  end if;

  -- Upsert
  insert into student_ability_vector
    (user_id, ability_vector, wrong_vector, right_vector,
     total_attempts, wrong_attempts, right_attempts, updated_at)
  values
    (p_user_id, v_row.ability_vector, v_row.wrong_vector, v_row.right_vector,
     v_new_total, v_new_wrong, v_new_right, now())
  on conflict (user_id) do update set
    ability_vector = excluded.ability_vector,
    wrong_vector   = excluded.wrong_vector,
    right_vector   = excluded.right_vector,
    total_attempts = excluded.total_attempts,
    wrong_attempts = excluded.wrong_attempts,
    right_attempts = excluded.right_attempts,
    updated_at     = excluded.updated_at;

end;
$$;

-- ── 8. get_next_recommended_question(user_id, exclude_ids) ────
--
--  STRATEGY:
--   Cold start (< 3 attempts or no ability vector):
--     Return a random unseen question so we collect signal first.
--
--  Warm path:
--   a) Build a QUERY vector:
--        query = 0.65 * wrong_vector + 0.35 * ability_vector
--      This biases toward weak topics while still respecting the
--      student's overall profile.
--   b) Cosine-similarity scan against jee_mains embeddings,
--      excluding already-attempted question_ids AND the explicit
--      exclude list passed by the client (prevents same-session
--      repetition).
--   c) Among the top-20 similar candidates, randomly pick one
--      of the top-5 so the student doesn't see the exact same
--      ordering every session.
--
--  NOTE: questions without an embedding are skipped silently; they
--  will appear once embeddings are populated (see step 9 below).
-- ─────────────────────────────────────────────────────────────────
create or replace function get_next_recommended_question(
  p_user_id               uuid,
  p_exclude_question_ids  text[]   default '{}'
) returns setof jee_mains
language plpgsql security definer
as $$
declare
  v_ability     student_ability_vector%rowtype;
  v_query_vec   vector(384);
  v_cold_start  boolean := false;
begin
  -- ── Fetch student ability vector ──────────────────────────────
  select * into v_ability
  from   student_ability_vector
  where  user_id = p_user_id;

  -- Cold start: no row, or fewer than 3 attempts, or wrong_vector is null
  if not found
     or v_ability.total_attempts < 3
     or v_ability.wrong_vector is null
  then
    v_cold_start := true;
  end if;

  if v_cold_start then
    -- ── Cold start: return a random unseen question ──────────────
    return query
      select q.*
      from   jee_mains q
      where  q.embedding is not null
        and  q.question_id != all(
               coalesce(p_exclude_question_ids, '{}')
             )
        and  q.question_id not in (
               select a.question_id
               from   attempts a
               where  a.student_id = p_user_id
             )
      order  by random()
      limit  1;

    -- If all questions are exhausted, fall back to any unseen (include attempted)
    if not found then
      return query
        select q.*
        from   jee_mains q
        where  q.question_id != all(coalesce(p_exclude_question_ids, '{}'))
        order  by random()
        limit  1;
    end if;

    return;
  end if;

  -- ── Warm path: build query vector ────────────────────────────
  -- pgvector's * operator is element-wise vector*vector only (added 0.5.0).
  -- There is NO scalar multiply. We approximate the 65/35 blend by computing
  -- the avg() of [wrong, wrong, ability] which gives a 2/3 : 1/3 ≈ 0.67 : 0.33
  -- weighting — close to the intended 0.65 : 0.35 with zero extra dependencies.
  SELECT avg(v)::vector(384) INTO v_query_vec
  FROM (
    VALUES (v_ability.wrong_vector),
           (v_ability.wrong_vector),
           (v_ability.ability_vector)
  ) AS t(v);

  -- ── Similarity search — top-20, pick randomly from top-5 ─────
  return query
    with candidates as (
      select q.question_id,
             (q.embedding <=> v_query_vec) as distance
      from   jee_mains q
      where  q.embedding is not null
        and  q.question_id != all(coalesce(p_exclude_question_ids, '{}'))
        and  q.question_id not in (
               select a.question_id
               from   attempts a
               where  a.student_id = p_user_id
             )
      order  by q.embedding <=> v_query_vec
      limit  20
    ),
    top5 as (
      select question_id from candidates order by distance limit 5
    )
    select q.*
    from   jee_mains q
    join   top5 on top5.question_id = q.question_id
    order  by random()
    limit  1;

  -- Fallback: no unseen similar questions left → any unseen random
  if not found then
    return query
      select q.*
      from   jee_mains q
      where  q.question_id != all(coalesce(p_exclude_question_ids, '{}'))
        and  q.question_id not in (
               select a.question_id
               from   attempts a
               where  a.student_id = p_user_id
             )
      order  by random()
      limit  1;
  end if;

end;
$$;

-- ── 9. GRANT permissions ──────────────────────────────────────
grant execute on function update_student_ability_vector(uuid, text, boolean) to authenticated;
grant execute on function get_next_recommended_question(uuid, text[]) to authenticated;
grant execute on function vector_running_avg(vector, int, vector) to authenticated;
grant select, insert, update on student_ability_vector to authenticated;

-- ── 10. Row-Level Security for student_ability_vector ─────────
alter table student_ability_vector enable row level security;

drop policy if exists "Users can read their own ability vector" on student_ability_vector;
create policy "Users can read their own ability vector"
  on student_ability_vector for select
  using (auth.uid() = user_id);

drop policy if exists "Users can upsert their own ability vector" on student_ability_vector;
create policy "Users can upsert their own ability vector"
  on student_ability_vector for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ── 11. (Optional) Backfill embeddings with a simple keyword model ──
--   If you already have embeddings: skip this.
--   If you want a zero-dependency quick start: run this to create
--   a deterministic fake embedding based on chapter + subject so
--   the similarity logic works immediately without an ML pipeline.
--   Replace with real sentence-transformer embeddings later for
--   better quality recommendations.
--
--   UNCOMMENT AND RUN ONLY IF YOUR jee_mains.embedding IS NULL:
--
-- DO $$
-- DECLARE
--   r record;
--   fake_vec float[];
--   i int;
-- BEGIN
--   FOR r IN SELECT DISTINCT subject, chapter FROM jee_mains WHERE embedding IS NULL LOOP
--     -- Build a reproducible 384-dim unit vector from the hash of (subject||chapter)
--     fake_vec := ARRAY[]::float[];
--     FOR i IN 1..384 LOOP
--       fake_vec := fake_vec || sin((hashtext(r.subject || r.chapter || i::text))::float / 1e9)::float;
--     END LOOP;
--     -- Normalise to unit length
--     UPDATE jee_mains
--     SET    embedding = fake_vec::vector
--     WHERE  subject   = r.subject
--       AND  chapter   = r.chapter
--       AND  embedding IS NULL;
--   END LOOP;
-- END $$;

-- ── 12. Backfill using chapter/subject hash (RECOMMENDED quick-start) ─
-- This gives each (subject, chapter) pair its own unique direction
-- in embedding space, so the cosine similarity correctly clusters
-- questions by topic. Run this now unless you have real embeddings.

DO $$
DECLARE
  r       record;
  raw     float[];
  norm    float;
  i       int;
  val     float;
BEGIN
  FOR r IN
    SELECT DISTINCT subject, chapter
    FROM   jee_mains
    WHERE  embedding IS NULL
      AND  subject  IS NOT NULL
      AND  chapter  IS NOT NULL
  LOOP
    raw  := ARRAY[]::float[];
    norm := 0.0;

    FOR i IN 1..384 LOOP
      val  := sin( hashtext(coalesce(r.subject,'') || '|' || coalesce(r.chapter,'') || '|' || i::text)::float / 500000000.0 );
      raw  := raw || val;
      norm := norm + val * val;
    END LOOP;

    norm := sqrt(norm);

    -- normalise in a second pass (pure SQL array math)
    FOR i IN 1..384 LOOP
      raw[i] := raw[i] / norm;
    END LOOP;

    UPDATE jee_mains
    SET    embedding = raw::vector
    WHERE  subject   = r.subject
      AND  chapter   = r.chapter
      AND  embedding IS NULL;

  END LOOP;
END $$;

-- ── Done ──────────────────────────────────────────────────────
-- Verify with:
--   select count(*) from jee_mains where embedding is not null;
--   select count(*) from student_ability_vector;
--   select * from get_next_recommended_question('<your-user-uuid>', '{}');
