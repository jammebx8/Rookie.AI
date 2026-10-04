// app/api/tests/create/route.ts
// Server-side: build question list, persist attempt row, return safe response.
// Uses service-role key — correct answers are never sent to the client here.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import type { CreateTestPayload, CreateTestResponse, TestConfig } from '../../../../features/tests/types'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } },
)

// ─── Auth helper ──────────────────────────────────────────────────────────────
async function getUserId(req: NextRequest): Promise<string | null> {
  const authHeader = req.headers.get('authorization') ?? ''
  const token      = authHeader.replace('Bearer ', '').trim()
  if (!token) return null
  const { data: { user } } = await supabaseAdmin.auth.getUser(token)
  return user?.id ?? null
}

// ─── Handler ──────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    // ── Auth ──────────────────────────────────────────────────────────────────
    const userId = await getUserId(req)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // ── Parse body ────────────────────────────────────────────────────────────
    const body = (await req.json()) as CreateTestPayload
    const { config, title } = body

    if (!config?.examId || !config.years?.length || !config.subjects?.length ||
        !config.chapters?.length || !config.durationSeconds) {
      return NextResponse.json({ error: 'Incomplete config' }, { status: 400 })
    }

    // ── Build question IDs server-side ────────────────────────────────────────
    const { data: qIds, error: rpcErr } = await supabaseAdmin.rpc('build_test_question_ids', {
      p_years:             config.years,
      p_subjects:          config.subjects,
      p_chapters:          config.chapters,
      p_duration_seconds:  config.durationSeconds,
    })

    if (rpcErr) {
      console.error('[tests/create] build_test_question_ids error:', rpcErr)
      return NextResponse.json({ error: 'Failed to build question set' }, { status: 500 })
    }

    const questionIds: string[] = qIds ?? []
    if (questionIds.length < 1) {
      return NextResponse.json({ error: 'No questions match your selection' }, { status: 422 })
    }

    // ── Persist attempt ───────────────────────────────────────────────────────
    const now       = new Date()
    const expiresAt = new Date(now.getTime() + config.durationSeconds * 1000)

    const { data: attempt, error: insertErr } = await supabaseAdmin
      .from('test_attempts')
      .insert({
        user_id:          userId,
        title:            title ?? 'Custom Test',
        config:           config as unknown as Record<string, unknown>,
        question_ids:     questionIds,
        duration_seconds: config.durationSeconds,
        status:           'created',
      })
      .select('id')
      .single()

    if (insertErr || !attempt) {
      console.error('[tests/create] insert error:', insertErr)
      return NextResponse.json({ error: 'Failed to save attempt' }, { status: 500 })
    }

    // ── Pre-populate test_answers rows (not_visited) ──────────────────────────
    // This lets the engine query answers without checking for missing rows.
    const answerRows = questionIds.map(qid => ({
      attempt_id:          attempt.id,
      question_id:         qid,
      selected_option:     null,
      q_status:            'not_visited',
      time_spent_seconds:  0,
    }))

    await supabaseAdmin.from('test_answers').insert(answerRows)

    const response: CreateTestResponse = {
      attemptId:   attempt.id,
      questionIds,
      expiresAt:   null,  // started_at is set when the student opens the engine
    }

    return NextResponse.json(response, { status: 200 })

  } catch (err) {
    console.error('[tests/create] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
