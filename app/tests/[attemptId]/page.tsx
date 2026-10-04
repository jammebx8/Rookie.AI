'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { LayoutGrid } from 'lucide-react'
import { supabase } from '../../../public/src/utils/supabase'
import { TestHeader }      from '../../../features/tests/TestHeader'
import { QuestionPanel }   from '../../../features/tests/QuestionPanel'
import { QuestionPalette } from '../../../features/tests/QuestionPalette'
import { SubmitDialog }    from '../../../features/tests/SubmitDialog'
import { useEngineStore }  from '../../../features/tests/useTestStore'
import type { TestQuestion, AnswerMap, TestAttemptRow } from '../../../features/tests/types'
import 'katex/dist/katex.min.css'

// ─── Theme hook ────────────────────────────────────────────────────────────────
function useTheme() {
  const [isDark, setIsDark] = useState(true)
  useEffect(() => {
    try { setIsDark(localStorage.getItem('theme') !== 'light') } catch {}
    const ob = new MutationObserver(() => { try { setIsDark(localStorage.getItem('theme') !== 'light') } catch {} })
    ob.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    const fn = () => { try { setIsDark(localStorage.getItem('theme') !== 'light') } catch {} }
    window.addEventListener('storage', fn)
    return () => { ob.disconnect(); window.removeEventListener('storage', fn) }
  }, [])
  return isDark
}

// ─── Q_SELECT (no correct_option / solution — hidden until submit) ─────────────
const Q_SELECT = [
  'question_id','question_text',
  'option_a','option_b','option_c','option_d',
  'option_a_img','option_b_img','option_c_img','option_d_img',
  'question_img_url','subject','chapter','exam_shift',
].join(',')

// ─── Autosave debounce (ms) ────────────────────────────────────────────────────
const AUTOSAVE_MS = 1500

export default function TestEnginePage() {
  const isDark  = useTheme()
  const router  = useRouter()
  const params  = useParams()
  const attemptId = params.attemptId as string

  // ── Remote state ─────────────────────────────────────────────────────────────
  const [attempt,   setAttempt]   = useState<TestAttemptRow | null>(null)
  const [questions, setQuestions] = useState<TestQuestion[]>([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [token, setToken]         = useState<string | null>(null)

  // ── Engine store ──────────────────────────────────────────────────────────────
  const {
    state, goTo, tickTime, markVisited, selectOpt, clearSel,
    toggleMark, togglePalette, openSubmit, closeSubmit, hydrate,
  } = useEngineStore()

  const { currentIndex, answers, paletteOpen, submitOpen } = state

  // ── Autosave ref ──────────────────────────────────────────────────────────────
  const autosaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const answersRef    = useRef<AnswerMap>(answers)
  answersRef.current  = answers

  // ── Load attempt + questions ──────────────────────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const tok = session?.access_token ?? null
        setToken(tok)

        const { data: att, error: attErr } = await supabase
          .from('test_attempts')
          .select('*')
          .eq('id', attemptId)
          .single()

        if (attErr || !att) { setError('Test not found.'); setLoading(false); return }

        // Already submitted → redirect to result
        if (att.status === 'submitted' || att.status === 'expired') {
          router.replace(`/tests/${attemptId}/result`); return
        }

        setAttempt(att as TestAttemptRow)

        // Mark as in_progress + set started_at (only on first open)
        const updates: Record<string, string> = { status: 'in_progress' }
        if (!att.started_at) {
          const now       = new Date().toISOString()
          const expiresAt = new Date(Date.now() + att.duration_seconds * 1000).toISOString()
          updates.started_at = now
          updates.expires_at = expiresAt
        }
        await supabase.from('test_attempts').update(updates).eq('id', attemptId)

        // Re-fetch with updated times
        const { data: fresh } = await supabase.from('test_attempts').select('*').eq('id', attemptId).single()
        if (fresh) setAttempt(fresh as TestAttemptRow)

        // Fetch questions (no correct_option)
        const qids: string[] = att.question_ids ?? []
        const { data: qRows } = await supabase
          .from('jee_mains')
          .select(Q_SELECT)
          .in('question_id', qids)

        const qRowsSafe = (qRows ?? []) as unknown as Array<Record<string, unknown>>

        const ordered: TestQuestion[] = qids.map(qid => {
          const q = qRowsSafe.find(r => r.question_id === qid)
          if (!q) return null
          return {
            question_id:      q.question_id      as string,
            question_text:    (q.question_text    as string)       ?? '',
            option_a:         (q.option_a         as string | null) ?? null,
            option_b:         (q.option_b         as string | null) ?? null,
            option_c:         (q.option_c         as string | null) ?? null,
            option_d:         (q.option_d         as string | null) ?? null,
            option_a_img:     (q.option_a_img     as string | null) ?? null,
            option_b_img:     (q.option_b_img     as string | null) ?? null,
            option_c_img:     (q.option_c_img     as string | null) ?? null,
            option_d_img:     (q.option_d_img     as string | null) ?? null,
            question_img_url: (q.question_img_url as string | null) ?? null,
            subject:          (q.subject          as string | null) ?? null,
            chapter:          (q.chapter          as string | null) ?? null,
            exam_shift:       (q.exam_shift        as string | null) ?? null,
            is_numerical:     !q.option_a && !q.option_b && !q.option_c && !q.option_d,
          } as TestQuestion
        }).filter((q): q is TestQuestion => q !== null)

        setQuestions(ordered)

        // Hydrate saved answers from DB
        const { data: savedAnswers } = await supabase
          .from('test_answers')
          .select('question_id,selected_option,q_status,time_spent_seconds')
          .eq('attempt_id', attemptId)

        if (savedAnswers?.length) {
          const map: AnswerMap = {}
          for (const a of (savedAnswers as unknown as Array<Record<string, unknown>>)) {
            map[a.question_id as string] = {
              selected_option:    a.selected_option    as string | null,
              q_status:           (a.q_status as string) as import('../../../features/tests/types').QuestionStatus,
              time_spent_seconds: (a.time_spent_seconds as number) ?? 0,
            }
          }
          hydrate(map)
        }
      } catch {
        setError('Failed to load test.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [attemptId, router, hydrate])

  // ── Autosave to Supabase ──────────────────────────────────────────────────────
  const autosave = useCallback(async (qid: string) => {
    const entry = answersRef.current[qid]
    if (!entry) return
    await supabase.from('test_answers').upsert(
      {
        attempt_id:         attemptId,
        question_id:        qid,
        selected_option:    entry.selected_option,
        q_status:           entry.q_status,
        time_spent_seconds: entry.time_spent_seconds,
        updated_at:         new Date().toISOString(),
      },
      { onConflict: 'attempt_id,question_id' },
    )
  }, [attemptId])

  const scheduleAutosave = useCallback((qid: string) => {
    if (autosaveTimer.current) clearTimeout(autosaveTimer.current)
    autosaveTimer.current = setTimeout(() => autosave(qid), AUTOSAVE_MS)
  }, [autosave])

  // ── Navigation helpers ────────────────────────────────────────────────────────
  const currentQid = questions[currentIndex]?.question_id

  const handleGoto = useCallback((index: number) => {
    if (currentQid) { tickTime(currentQid); autosave(currentQid) }
    goTo(index)
    if (questions[index]) markVisited(questions[index].question_id)
  }, [currentQid, tickTime, autosave, goTo, questions, markVisited])

  const handlePrev = useCallback(() => { if (currentIndex > 0) handleGoto(currentIndex - 1) }, [currentIndex, handleGoto])
  const handleNext = useCallback(() => { if (currentIndex < questions.length - 1) handleGoto(currentIndex + 1) }, [currentIndex, questions.length, handleGoto])

  // ── Answer actions ────────────────────────────────────────────────────────────
  const handleSelect = useCallback((option: string) => {
    if (!currentQid) return
    selectOpt(currentQid, option)
    scheduleAutosave(currentQid)
  }, [currentQid, selectOpt, scheduleAutosave])

  const handleClear = useCallback(() => {
    if (!currentQid) return
    clearSel(currentQid)
    scheduleAutosave(currentQid)
  }, [currentQid, clearSel, scheduleAutosave])

  const handleMark = useCallback(() => {
    if (!currentQid) return
    toggleMark(currentQid)
    scheduleAutosave(currentQid)
  }, [currentQid, toggleMark, scheduleAutosave])

  // Mark current as visited on mount / index change
  useEffect(() => {
    if (currentQid) markVisited(currentQid)
  }, [currentIndex, currentQid, markVisited])

  // ── Keyboard shortcuts ────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName
      if (tag === 'INPUT' || tag === 'TEXTAREA') return
      if (e.key === 'ArrowLeft')  { handlePrev(); return }
      if (e.key === 'ArrowRight') { handleNext(); return }
      const optMap: Record<string, string> = { '1': 'a', '2': 'b', '3': 'c', '4': 'd', a: 'a', b: 'b', c: 'c', d: 'd' }
      if (optMap[e.key.toLowerCase()]) handleSelect(optMap[e.key.toLowerCase()])
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handlePrev, handleNext, handleSelect])

  // ── Warn on tab close ─────────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [])

  // ── Submit ────────────────────────────────────────────────────────────────────
  const handleSubmitConfirm = useCallback(async () => {
    setSubmitting(true)
    // Flush time for current question
    if (currentQid) { tickTime(currentQid); await autosave(currentQid) }
    try {
      const res = await fetch('/api/tests/submit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ attemptId, answers: answersRef.current }),
      })
      if (!res.ok) throw new Error('Submit failed')
      router.push(`/tests/${attemptId}/result`)
    } catch {
      setSubmitting(false)
      closeSubmit()
    }
  }, [attemptId, answers, token, currentQid, tickTime, autosave, router, closeSubmit])

  // ─── Computed palette stats ────────────────────────────────────────────────────
  const paletteStats = React.useMemo(() => {
    const answered = Object.values(answers).filter(a =>
      a.q_status === 'answered' || a.q_status === 'marked_answered'
    ).length
    return { answered, total: questions.length, unattempted: questions.length - answered }
  }, [answers, questions.length])

  // ─── Theme tokens ──────────────────────────────────────────────────────────────
  const T = {
    page:    isDark ? 'bg-[#07090f] text-white' : 'bg-[#F0F2FA] text-[#0f172a]',
    palette: isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]',
  }

  // ─── Loading / error states ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${T.page}`}>
        <div className="text-center space-y-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto"
          />
          <p className={isDark ? 'text-slate-400 text-sm' : 'text-slate-500 text-sm'}>Loading test…</p>
        </div>
      </div>
    )
  }

  if (error || !attempt || questions.length === 0) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${T.page}`}>
        <div className="text-center space-y-3 px-4">
          <p className={`text-sm ${isDark ? 'text-rose-400' : 'text-rose-600'}`}>{error ?? 'No questions found.'}</p>
          <button onClick={() => router.push('/tests')} className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-sm font-semibold">
            Back to Tests
          </button>
        </div>
      </div>
    )
  }

  const currentQ = questions[currentIndex]
  const currentEntry = answers[currentQ?.question_id]
  const currentStatus = currentEntry?.q_status ?? 'not_visited'

  const expiresAt = attempt.expires_at ?? (
    attempt.started_at
      ? new Date(new Date(attempt.started_at).getTime() + attempt.duration_seconds * 1000).toISOString()
      : null
  )

  return (
    <div className={`flex flex-col min-h-screen ${T.page}`}>
      {/* Header */}
      <TestHeader
        title={attempt.title}
        expiresAt={expiresAt}
        durationSeconds={attempt.duration_seconds}
        isDark={isDark}
        onSubmit={openSubmit}
      />

      {/* Body — question + palette side by side on desktop */}
      <div className="flex flex-1 min-h-0">

        {/* Question panel */}
        <div className="flex-1 min-w-0 overflow-y-auto">
          {currentQ && (
            <QuestionPanel
              isDark={isDark}
              question={currentQ}
              index={currentIndex}
              total={questions.length}
              entry={currentEntry}
              status={currentStatus}
              onSelect={handleSelect}
              onClear={handleClear}
              onMark={handleMark}
              onPrev={handlePrev}
              onNext={handleNext}
            />
          )}
        </div>

        {/* Desktop palette — fixed right rail */}
        <aside className={`hidden lg:flex flex-col w-72 border-l overflow-hidden ${T.palette}`}>
          <QuestionPalette
            isDark={isDark}
            questions={questions}
            answers={answers}
            currentIndex={currentIndex}
            onGoto={handleGoto}
          />
        </aside>
      </div>

      {/* Mobile palette toggle button */}
      <div className="lg:hidden fixed bottom-20 right-4 z-40">
        <motion.button
          whileTap={{ scale: 0.94 }}
          onClick={togglePalette}
          aria-label="Open question palette"
          className="w-12 h-12 rounded-2xl shadow-xl flex items-center justify-center bg-indigo-600 text-white"
        >
          <LayoutGrid size={20} />
        </motion.button>
      </div>

      {/* Mobile palette bottom sheet */}
      <AnimatePresence>
        {paletteOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
              onClick={togglePalette}
            />
            <motion.div
              initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className={`lg:hidden fixed bottom-0 left-0 right-0 z-50 rounded-t-3xl border-t overflow-hidden ${T.palette}`}
              style={{ maxHeight: '75vh' }}
            >
              <QuestionPalette
                isDark={isDark}
                questions={questions}
                answers={answers}
                currentIndex={currentIndex}
                onGoto={idx => { handleGoto(idx); togglePalette() }}
                onClose={togglePalette}
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* Submit dialog */}
      <SubmitDialog
        isDark={isDark}
        open={submitOpen}
        submitting={submitting}
        onConfirm={handleSubmitConfirm}
        onCancel={closeSubmit}
        stats={paletteStats}
      />
    </div>
  )
}
