'use client'

import React, { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { EmptyState } from '@/components/rookie/ui'
import { supabase } from '../../../../public/src/utils/supabase'
import { ResultView } from '../../../../features/tests/ResultView'
import type { SubmitTestResponse, AnswerMap, TestAttemptRow } from '../../../../features/tests/types'
import 'katex/dist/katex.min.css'

export default function ResultPage() {
  const router    = useRouter()
  const params    = useParams()
  const attemptId = params.attemptId as string

  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState<string | null>(null)
  const [result,   setResult]   = useState<SubmitTestResponse | null>(null)
  const [answers,  setAnswers]  = useState<AnswerMap>({})
  const [attempt,  setAttempt]  = useState<TestAttemptRow | null>(null)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        // Fetch attempt
        const { data: att, error: attErr } = await supabase
          .from('test_attempts')
          .select('*')
          .eq('id', attemptId)
          .single()

        if (attErr || !att) { setError('Result not found.'); setLoading(false); return }
        if (att.status === 'in_progress' || att.status === 'created') {
          router.replace(`/tests/${attemptId}`); return
        }

        setAttempt(att as TestAttemptRow)

        // Fetch answers
        const { data: savedAnswers } = await supabase
          .from('test_answers')
          .select('question_id,selected_option,q_status,time_spent_seconds')
          .eq('attempt_id', attemptId)

        const answerMap: AnswerMap = {}
        for (const a of ((savedAnswers ?? []) as unknown as Array<Record<string, unknown>>)) {
          answerMap[a.question_id as string] = {
            selected_option:    a.selected_option    as string | null,
            q_status:           (a.q_status as string) as import('../../../../features/tests/types').QuestionStatus,
            time_spent_seconds: (a.time_spent_seconds as number) ?? 0,
          }
        }
        setAnswers(answerMap)

        // Fetch questions WITH correct answers (safe here — test already submitted)
        const qids: string[] = att.question_ids ?? []
        const dbTable = (att.config as Record<string, unknown>)?.dbTable === 'jee_adv' ? 'jee_adv' : 'jee_mains'
        const { data: qRows } = await supabase
          .from(dbTable)
          .select('question_id,question_text,option_a,option_b,option_c,option_d,option_a_img,option_b_img,option_c_img,option_d_img,question_img_url,correct_option,solution,solution_image_url,subject,chapter,exam_shift')
          .in('question_id', qids)

        const qRowsSafe = (qRows ?? []) as unknown as Array<Record<string, unknown>>

        const ordered = qids.map(qid => {
          const q = qRowsSafe.find(r => r.question_id === qid)
          if (!q) return null
          return {
            question_id:        qid,
            question_text:      (q.question_text      as string)       ?? '',
            option_a:           (q.option_a           as string | null) ?? null,
            option_b:           (q.option_b           as string | null) ?? null,
            option_c:           (q.option_c           as string | null) ?? null,
            option_d:           (q.option_d           as string | null) ?? null,
            option_a_img:       (q.option_a_img       as string | null) ?? null,
            option_b_img:       (q.option_b_img       as string | null) ?? null,
            option_c_img:       (q.option_c_img       as string | null) ?? null,
            option_d_img:       (q.option_d_img       as string | null) ?? null,
            question_img_url:   (q.question_img_url   as string | null) ?? null,
            subject:            (q.subject            as string | null) ?? null,
            chapter:            (q.chapter            as string | null) ?? null,
            exam_shift:         (q.exam_shift         as string | null) ?? null,
            is_numerical:       !q.option_a && !q.option_b && !q.option_c && !q.option_d,
            correct_option:     (q.correct_option     as string | null) ?? null,
            solution:           (q.solution           as string | null) ?? null,
            solution_image_url: (q.solution_image_url as string | null) ?? null,
          }
        }).filter((q): q is import('../../../../features/tests/types').TestQuestionReview => q !== null)

        const res: SubmitTestResponse = {
          score:            att.score            ?? 0,
          maxScore:         att.max_score        ?? ordered.length * 4,
          correctCount:     att.correct_count    ?? 0,
          incorrectCount:   att.incorrect_count  ?? 0,
          unattemptedCount: att.unattempted_count ?? 0,
          timeTakenSeconds: att.time_taken_seconds ?? att.duration_seconds,
          questions:        ordered,
        }
        setResult(res)
      } catch {
        setError('Failed to load results.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [attemptId, router])

  if (loading) {
    return (
      <div className="grid min-h-svh place-items-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-6 animate-spin text-primary" />
          <p className="text-body-sm text-muted-foreground">Loading results…</p>
        </div>
      </div>
    )
  }

  if (error || !result) {
    return (
      <div className="grid min-h-svh place-items-center px-4">
        <div className="w-full max-w-md">
          <EmptyState
            icon={AlertCircle}
            title={error ?? 'No result found.'}
            sub="Head back and open it again from Tests."
            action={<Button onClick={() => router.push('/tests')} className="h-10 rounded-control px-5">Back to Tests</Button>}
          />
        </div>
      </div>
    )
  }

  return (
    <ResultView
      result={result}
      answers={answers}
      title={attempt?.title ?? 'Custom Test'}
      onHome={() => router.push('/tests')}
    />
  )
}
