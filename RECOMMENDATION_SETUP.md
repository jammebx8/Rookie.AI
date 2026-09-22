# Embedding-Based Recommendation System — Setup Guide

Everything needed to go from zero to a working adaptive recommendation engine in Supabase.

---

## How it works

Each question in `jee_mains` carries a **384-dimensional embedding vector** that encodes its topic (subject + chapter). When a student answers a question the system maintains three running centroids in the `student_ability_vector` table:

| Vector | What it tracks |
|---|---|
| `ability_vector` | Centroid of **all** attempted question embeddings |
| `wrong_vector` | Centroid of **wrong-answer** question embeddings ← weak topics |
| `right_vector` | Centroid of **correct-answer** question embeddings |

The next recommended question is found by cosine-similarity search using:

```
query = 0.65 × wrong_vector + 0.35 × ability_vector
```

This keeps the system consistently focused on the student's weak chapters while still considering their overall profile. From the top-20 similar unseen questions it picks randomly from the best 5 so sessions feel fresh but stay on-topic.

**Cold start** (fewer than 3 attempts, or no wrong answers yet): returns a random unseen question to gather signal first.

---

## Step 1 — Run the SQL migration

1. Open your project at [supabase.com](https://supabase.com) → **SQL Editor** → **New query**.
2. Open `supabase_recommendation_migration.sql` from the project root and paste the full contents into the editor.
3. Click **Run** (or press `Ctrl+Enter`).

The script is safe to run on a live database. It uses `CREATE … IF NOT EXISTS` and `ALTER TABLE … ADD COLUMN IF NOT EXISTS` everywhere so re-running it is a no-op.

### What the script does

| Step | Action |
|---|---|
| 1 | Enables the `pgvector` Postgres extension |
| 2 | Adds `embedding vector(384)` column to `jee_mains` |
| 3 | Creates an HNSW index on the embedding column for fast cosine search |
| 4 | Creates the `student_ability_vector` table |
| 5 | Adds `question_embedding` snapshot column to `attempts` |
| 6 | Creates `vector_running_avg()` helper function |
| 7 | Creates `update_student_ability_vector()` RPC |
| 8 | Creates `get_next_recommended_question()` RPC |
| 9 | Grants execute permissions to `authenticated` role |
| 10 | Enables RLS on `student_ability_vector` with per-user policies |
| 11 | Backfills embeddings for all existing questions using a deterministic hash of `(subject \| chapter)` so every chapter gets a unique direction in vector space |

### Verify it worked

Run these three checks in the SQL Editor after the migration:

```sql
-- 1. All questions should have embeddings now
SELECT count(*) FROM jee_mains WHERE embedding IS NOT NULL;

-- 2. The RPCs should exist
SELECT routine_name
FROM information_schema.routines
WHERE routine_name IN (
  'get_next_recommended_question',
  'update_student_ability_vector',
  'vector_running_avg'
);

-- 3. Test the recommendation RPC with your own user UUID
-- (find your UUID in Authentication → Users)
SELECT question_id, subject, chapter
FROM get_next_recommended_question('<your-user-uuid>', '{}');
```

---

## Step 2 — Check the `attempts` table exists

The recommendation system reads from and writes to the `attempts` table. It must have at least these columns:

```sql
CREATE TABLE IF NOT EXISTS attempts (
  id              bigserial primary key,
  student_id      uuid        not null references auth.users(id),
  question_id     text        not null,
  correct         boolean     not null,
  time_taken_sec  int         default 0,
  created_at      timestamptz default now()
);
```

If the table already exists (it does in this project) the migration's `ALTER TABLE` just adds the nullable `question_embedding` column and nothing else changes.

---

## Step 3 — RLS on `attempts`

Make sure the `attempts` table has row-level security that lets authenticated users insert their own rows:

```sql
ALTER TABLE attempts ENABLE ROW LEVEL SECURITY;

-- Students can insert their own attempts
CREATE POLICY "Students insert own attempts"
  ON attempts FOR INSERT
  WITH CHECK (auth.uid() = student_id);

-- Students can read their own attempts (needed for recommendation exclusion)
CREATE POLICY "Students read own attempts"
  ON attempts FOR SELECT
  USING (auth.uid() = student_id);
```

Run this in the SQL Editor if the policies aren't already there. Existing policies won't be duplicated because `CREATE POLICY` fails silently if the name already exists — use `DROP POLICY IF EXISTS` first if you need to re-create one.

---

## Step 4 — (Optional) Replace hash embeddings with real ones

The migration backfills every question with a **deterministic hash-based embedding** derived from its subject and chapter name. This works immediately and correctly clusters questions by topic — every chapter gets its own unique direction in the 384-dimensional space.

For higher quality recommendations (distinguishing questions *within* the same chapter), you can replace these with real sentence-transformer embeddings later:

1. Generate embeddings with [all-MiniLM-L6-v2](https://huggingface.co/sentence-transformers/all-MiniLM-L6-v2) (384 dims, free, fast):

```python
from sentence_transformers import SentenceTransformer
import supabase, os

model  = SentenceTransformer('all-MiniLM-L6-v2')
client = supabase.create_client(os.environ['SUPABASE_URL'], os.environ['SUPABASE_SERVICE_KEY'])

# Fetch questions in batches
page, size = 0, 200
while True:
    rows = client.table('jee_mains') \
        .select('question_id, question_text, subject, chapter') \
        .range(page * size, page * size + size - 1) \
        .execute().data
    if not rows: break

    texts = [
        f"{r['subject']} {r['chapter']} {r['question_text'] or ''}"
        for r in rows
    ]
    vecs = model.encode(texts, normalize_embeddings=True).tolist()

    for row, vec in zip(rows, vecs):
        client.table('jee_mains') \
            .update({'embedding': vec}) \
            .eq('question_id', row['question_id']) \
            .execute()
    page += 1
    print(f'Done page {page}')
```

2. Run `pip install sentence-transformers supabase` and execute the script.
3. No code changes needed — the RPC automatically uses whatever embedding is stored.

---

## Files changed by this feature

```
supabase_recommendation_migration.sql   ← run once in Supabase SQL Editor
lib/recommendation.ts                   ← client-side helpers (new file)
app/practice/PracticeClient.tsx         ← uses fetchRecommended + updateAbilityVector
app/(tabs)/home/page.tsx                ← RecommendedQuestionCard uses new helpers
```

---

## How the UI changes

### Practice page (`/practice`)

- Questions are served by `get_next_recommended_question()` instead of a plain random query.
- After every answer `update_student_ability_vector()` runs in the background (fire-and-forget, never blocks UX).
- The header shows a small **🎯 Chapter name** chip indicating which weak topic the current question targets.
- The session summary breakdown is now sorted worst-first so the student sees their weakest chapters at the top.

### Home page (`/home`) — Recommended for you card

| Condition | What the student sees |
|---|---|
| First visit / < 3 attempts | Random question + "Warming up…" chip |
| 3–4 attempts | Question from weak topic + accuracy chip in title |
| ≥ 5 attempts | Weak-chapter hint banner with chapter name + error rate |
| Question is from weakest chapter | Chapter badge turns rose with 🎯 prefix |
| After answering | "Algorithm updated · next question stays close to your weak areas" |

---

## Troubleshooting

**`get_next_recommended_question` returns nothing**

The function excludes questions already in `attempts` for the user. If the student has answered everything, it falls back to a random unseen question (ignoring attempts). If that also returns nothing, all questions are in the exclude list — add more questions to `jee_mains`.

**`vector` type not found error**

Run `CREATE EXTENSION IF NOT EXISTS vector;` in the SQL Editor first, then re-run the migration. pgvector is available on all Supabase plans.

**Ability vector not updating**

Check the browser console for `[recommendation] updateAbilityVector failed:` messages. The most common cause is an RLS policy blocking the upsert on `student_ability_vector`. The migration creates the correct policy but if you have a conflicting policy, drop it and re-run step 10 of the migration.

**Home card shows the same chapter every time**

This is correct and intentional — the algorithm is designed to be *consistent* on weak topics. Once the student's accuracy for that chapter improves above ~60% it will naturally blend toward other chapters. You can verify the vector is updating by querying:

```sql
SELECT wrong_attempts, right_attempts, total_attempts, updated_at
FROM student_ability_vector
WHERE user_id = '<your-user-uuid>';
```
