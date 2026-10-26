// app/api/tests/create-pyq/route.ts
// Creates a PYQ mock test for a specific exam_shift.
// Fetches all question_ids for that shift from the correct table,
// persists a test_attempt row with config.dbTable so the engine
// and submit route know which table to hit.

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

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

export async function POST(req: NextRequest) {
  try {
    const userId = await getUserId(req)
    if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await req.json() as { examShift: string; dbTable: string; title: string; durationSeconds: number }
    const { examShift, dbTable, title, durationSeconds } = body

    if (!examShift || !dbTable || !durationSeconds) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Validate table name — only two allowed values to prevent injection
    if (dbTable !== 'jee_mains' && dbTable !== 'jee_adv') {
      return NextResponse.json({ error: 'Invalid table' }, { status: 400 })
    }

    // Fetch all question_ids for this exam_shift, ordered
    const { data: qRows, error: qErr } = await supabaseAdmin
      .from(dbTable)
      .select('question_id')
      .eq('exam_shift', examShift)
      .order('question', { ascending: true })

    if (qErr || !qRows?.length) {
      return NextResponse.json({ error: 'No questions found for this shift' }, { status: 422 })
    }

    const questionIds: string[] = qRows.map((r: { question_id: string }) => r.question_id)

    // Build config — dbTable stored so engine + submit route can pick the right table
    const config = {
      examId:          dbTable === 'jee_adv' ? 'jee_advanced' : 'jee_main',
      examShift,
      dbTable,
      years:           [],
      subjects:        ['Physics', 'Chemistry', 'Maths'],
      chapters:        [],
      durationSeconds,
      isPyq:           true,
    }

    const { data: attempt, error: insertErr } = await supabaseAdmin
      .from('test_attempts')
      .insert({
        user_id:          userId,
        title,
        config,
        question_ids:     questionIds,
        duration_seconds: durationSeconds,
        status:           'created',
      })
      .select('id')
      .single()

    if (insertErr || !attempt) {
      console.error('[create-pyq] insert error:', insertErr)
      return NextResponse.json({ error: 'Failed to save attempt' }, { status: 500 })
    }

    // Pre-populate answer rows
    const answerRows = questionIds.map((qid: string) => ({
      attempt_id:          attempt.id,
      question_id:         qid,
      selected_option:     null,
      q_status:            'not_visited',
      time_spent_seconds:  0,
    }))
    await supabaseAdmin.from('test_answers').insert(answerRows)

    return NextResponse.json({ attemptId: attempt.id, questionIds }, { status: 200 })
  } catch (err) {
    console.error('[create-pyq] unexpected error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
