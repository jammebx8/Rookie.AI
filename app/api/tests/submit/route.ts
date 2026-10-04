// app/api/tests/submit/route.ts
// Server-side: verify deadline, write answers, score the test, return results.
// Correct answers are ONLY sent here — never before submission.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { SubmitTestPayload, SubmitTestResponse, TestQuestionReview, AnswerEntry } from '../../../../features/tests/types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

async function getUserId(req: NextRequest): Promise<string | null> {
  const token = (req.headers.get('authorization') ?? '').replace('Bearer ', '').trim()
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user?.id ?? null
}

// ─── Normalise a correct_option value to single letter ───────────────────────
function normOption(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw.replace(/option_?/gi, '').replace(/[^a-dA-D]/g, '').slice(0, 1).toLowerCase()
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = (await req.json()) as SubmitTestPayload
    const { attemptId, answers } = body
    if (!attemptId) return NextResponse.json({ error: 'Missing attemptId' }, { status: 400 })

    // ── Fetch attempt (verify ownership + status) ─────────────────────────────
    const { data: attempt, error: fetchErr } = await supabaseAdmin
      .from('test_attempts')
      .select('*')
      .eq('id', attemptId)
      .eq('user_id', userId)
      .single()

    if (fetchErr || !attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    if (attempt.status === 'submitted') return NextResponse.json({ error: 'Already submitted' }, { status: 409 })

    // ── Enforce deadline ──────────────────────────────────────────────────────
    // If started_at + duration has passed, we still accept but mark as expired
    const now        = new Date()
    const startedAt  = attempt.started_at ? new Date(attempt.started_at) : now
    const deadline   = new Date(startedAt.getTime() + attempt.duration_seconds * 1000)
    const isExpired  = now > deadline

    // ── Fetch question data (with correct answers) ────────────────────────────
    const questionIds: string[] = attempt.question_ids ?? []
    const { data: questions, error: qErr } = await supabaseAdmin
      .from('jee_mains')
      .select('question_id,question_text,option_a,option_b,option_c,option_d,option_a_img,option_b_img,option_c_img,option_d_img,question_img_url,solution,solution_image_url,correct_option,subject,chapter,exam_shift')
      .in('question_id', questionIds)

    if (qErr || !questions) return NextResponse.json({ error: 'Failed to fetch questions' }, { status: 500 })

    // ── Upsert all answers ────────────────────────────────────────────────────
    const answerRows = questionIds.map(qid => {
      const entry: AnswerEntry = answers[qid] ?? {
        selected_option:    null,
        q_status:           'not_visited',
        time_spent_seconds: 0,
      }
      return {
        attempt_id:          attemptId,
        question_id:         qid,
        selected_option:     entry.selected_option,
        q_status:            entry.q_status,
        time_spent_seconds:  entry.time_spent_seconds,
        updated_at:          now.toISOString(),
      }
    })

    await supabaseAdmin
      .from('test_answers')
      .upsert(answerRows, { onConflict: 'attempt_id,question_id' })

    // ── Score server-side ─────────────────────────────────────────────────────
    let correct    = 0
    let incorrect  = 0
    let unattempted= 0

    const questionMap = new Map(questions.map((q: Record<string, unknown>) => [q.question_id as string, q]))

    for (const qid of questionIds) {
      const entry = answers[qid]
      const q     = questionMap.get(qid)
      if (!q) { unattempted++; continue }

      const isAnswered = entry && (entry.q_status === 'answered' || entry.q_status === 'marked_answered')
                         && entry.selected_option

      if (!isAnswered) { unattempted++; continue }

      const isNumerical = !q.option_a && !q.option_b && !q.option_c && !q.option_d

      if (isNumerical) {
        // Numerical: compare as floats, no negative marking
        const userNum    = parseFloat(entry!.selected_option ?? '')
        const correctNum = parseFloat((q.correct_option as string) ?? '')
        if (!isNaN(userNum) && !isNaN(correctNum) && userNum === correctNum) correct++
        else incorrect++ // No penalty but count as incorrect for stats
      } else {
        const userOpt    = normOption(entry!.selected_option)
        const correctOpt = normOption(q.correct_option as string)
        if (userOpt && userOpt === correctOpt) correct++
        else incorrect++
      }
    }

    // +4 correct, -1 incorrect MCQ, +4/0 numerical (server handles distinction above)
    const score    = correct * 4 - incorrect * 1
    const maxScore = questionIds.length * 4

    // Calculate time taken
    const timeTaken = attempt.started_at
      ? Math.round((now.getTime() - new Date(attempt.started_at).getTime()) / 1000)
      : attempt.duration_seconds

    // ── Update attempt row ────────────────────────────────────────────────────
    await supabaseAdmin
      .from('test_attempts')
      .update({
        status:             isExpired ? 'expired' : 'submitted',
        submitted_at:       now.toISOString(),
        score,
        max_score:          maxScore,
        correct_count:      correct,
        incorrect_count:    incorrect,
        unattempted_count:  unattempted,
        time_taken_seconds: timeTaken,
      })
      .eq('id', attemptId)

    // ── Build review payload ──────────────────────────────────────────────────
    const reviewQuestions: TestQuestionReview[] = questionIds.map(qid => {
      const q = questionMap.get(qid)
      if (!q) return null
      return {
        question_id:        qid,
        question_text:      (q.question_text as string)  ?? '',
        option_a:           (q.option_a     as string | null) ?? null,
        option_b:           (q.option_b     as string | null) ?? null,
        option_c:           (q.option_c     as string | null) ?? null,
        option_d:           (q.option_d     as string | null) ?? null,
        option_a_img:       (q.option_a_img as string | null) ?? null,
        option_b_img:       (q.option_b_img as string | null) ?? null,
        option_c_img:       (q.option_c_img as string | null) ?? null,
        option_d_img:       (q.option_d_img as string | null) ?? null,
        question_img_url:   (q.question_img_url as string | null) ?? null,
        subject:            (q.subject     as string | null) ?? null,
        chapter:            (q.chapter     as string | null) ?? null,
        exam_shift:         (q.exam_shift  as string | null) ?? null,
        is_numerical:       !q.option_a && !q.option_b && !q.option_c && !q.option_d,
        correct_option:     (q.correct_option     as string | null) ?? null,
        solution:           (q.solution           as string | null) ?? null,
        solution_image_url: (q.solution_image_url as string | null) ?? null,
      }
    }).filter((q): q is TestQuestionReview => q !== null)

    const response: SubmitTestResponse = {
      score,
      maxScore,
      correctCount:      correct,
      incorrectCount:    incorrect,
      unattemptedCount:  unattempted,
      timeTakenSeconds:  timeTaken,
      questions:         reviewQuestions,
    }

    return NextResponse.json(response, { status: 200 })

  } catch (err) {
    console.error('[tests/submit] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
