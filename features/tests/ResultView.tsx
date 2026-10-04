'use client'
// ─── features/tests/ResultView.tsx ───────────────────────────────────────────

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle2, XCircle, Minus, Clock, ChevronDown, ChevronUp, Home,
} from 'lucide-react'
import { renderContent } from '../../app/components/renderContent'
import type { SubmitTestResponse, TestQuestionReview, AnswerMap } from './types'

interface Props {
  isDark:    boolean
  result:    SubmitTestResponse
  answers:   AnswerMap
  title:     string
  onHome:    () => void
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function normOption(raw: string | null | undefined): string {
  if (!raw) return ''
  return raw.replace(/option_?/gi, '').replace(/[^a-dA-D]/g, '').slice(0, 1).toLowerCase()
}
function pad2(n: number) { return String(n).padStart(2, '0') }
function fmtTime(s: number) {
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60
  return h > 0 ? `${h}h ${pad2(m)}m ${pad2(sec)}s` : `${pad2(m)}m ${pad2(sec)}s`
}

// ─── Score ring ───────────────────────────────────────────────────────────────
function ScoreRing({ score, maxScore, isDark }: { score: number; maxScore: number; isDark: boolean }) {
  const pct     = maxScore > 0 ? Math.max(0, score / maxScore) : 0
  const r       = 52, cx = 60, cy = 60
  const circ    = 2 * Math.PI * r
  const dash    = circ * Math.min(pct, 1)
  const color   = pct >= 0.7 ? '#22c55e' : pct >= 0.4 ? '#f59e0b' : '#ef4444'

  return (
    <div className="relative flex items-center justify-center">
      <svg width={120} height={120} viewBox="0 0 120 120" aria-hidden="true">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={isDark ? '#1e2538' : '#e5e7eb'} strokeWidth={10} />
        <circle cx={cx} cy={cy} r={r} fill="none"
          stroke={color} strokeWidth={10}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray 1s ease' }}
        />
      </svg>
      <div className="absolute text-center pointer-events-none">
        <p className={`text-2xl font-extrabold tabular-nums ${isDark ? 'text-white' : 'text-[#0f172a]'}`} style={{ color }}>{score}</p>
        <p className={`text-[10px] ${isDark ? 'text-slate-500' : 'text-gray-400'}`}>/{maxScore}</p>
      </div>
    </div>
  )
}

// ─── Per-chapter breakdown ────────────────────────────────────────────────────
function ChapterBreakdown({ questions, answers, isDark }: {
  questions: TestQuestionReview[]; answers: AnswerMap; isDark: boolean
}) {
  const chapterMap: Record<string, { correct: number; incorrect: number; total: number; subject: string }> = {}

  for (const q of questions) {
    const ch  = q.chapter ?? 'Unknown'
    const sub = q.subject ?? ''
    if (!chapterMap[ch]) chapterMap[ch] = { correct: 0, incorrect: 0, total: 0, subject: sub }
    chapterMap[ch].total++

    const entry   = answers[q.question_id]
    const answered = entry && (entry.q_status === 'answered' || entry.q_status === 'marked_answered') && entry.selected_option
    if (!answered) continue

    if (q.is_numerical) {
      const u = parseFloat(entry.selected_option ?? ''), c = parseFloat(q.correct_option ?? '')
      if (!isNaN(u) && !isNaN(c) && u === c) chapterMap[ch].correct++
      else chapterMap[ch].incorrect++
    } else {
      const userOpt = normOption(entry.selected_option)
      const corrOpt = normOption(q.correct_option)
      if (userOpt === corrOpt) chapterMap[ch].correct++
      else chapterMap[ch].incorrect++
    }
  }

  const sorted = Object.entries(chapterMap).sort(([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total))

  const T = {
    card:  isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]',
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
    text:  isDark ? 'text-white' : 'text-[#0f172a]',
    track: isDark ? 'bg-[#1e2538]' : 'bg-gray-200',
  }

  return (
    <div className={`rounded-2xl border p-5 ${T.card}`}>
      <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${T.muted}`}>Chapter Breakdown</p>
      <div className="space-y-4">
        {sorted.map(([ch, s]) => {
          const pct = Math.round((s.correct / s.total) * 100)
          const barColor = pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444'
          return (
            <div key={ch}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs truncate max-w-[200px] ${T.muted}`}>{ch}</span>
                <span className="text-xs font-semibold">{s.correct}/{s.total}</span>
              </div>
              <div className={`h-1.5 rounded-full overflow-hidden ${T.track}`}>
                <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: barColor }} />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Question review item ─────────────────────────────────────────────────────
const OPTION_KEYS = ['a', 'b', 'c', 'd'] as const
const OPTION_LABELS = ['A', 'B', 'C', 'D']

function ReviewItem({ q, entry, index, isDark }: {
  q: TestQuestionReview; entry: AnswerMap[string] | undefined; index: number; isDark: boolean
}) {
  const [open, setOpen] = useState(false)

  const userOpt  = normOption(entry?.selected_option)
  const corrOpt  = normOption(q.correct_option)
  const answered = entry && (entry.q_status === 'answered' || entry.q_status === 'marked_answered') && entry.selected_option

  let verdict: 'correct' | 'incorrect' | 'unattempted'
  if (!answered) {
    verdict = 'unattempted'
  } else if (q.is_numerical) {
    const u = parseFloat(entry?.selected_option ?? ''), c = parseFloat(q.correct_option ?? '')
    verdict = (!isNaN(u) && !isNaN(c) && u === c) ? 'correct' : 'incorrect'
  } else {
    verdict = userOpt === corrOpt ? 'correct' : 'incorrect'
  }

  const verdictConfig = {
    correct:     { icon: <CheckCircle2 size={15} />, color: '#22c55e', label: 'Correct',     score: '+4' },
    incorrect:   { icon: <XCircle      size={15} />, color: '#ef4444', label: 'Incorrect',   score: '-1' },
    unattempted: { icon: <Minus        size={15} />, color: isDark ? '#475569' : '#94a3b8', label: 'Skipped', score: '0' },
  }[verdict]

  const T = {
    card:    isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]',
    text:    isDark ? 'text-white' : 'text-[#0f172a]',
    muted:   isDark ? 'text-slate-400' : 'text-slate-500',
    optBase: isDark ? 'border-[#1e2538] text-slate-300' : 'border-gray-200 text-gray-700',
    solCard: isDark ? 'bg-[#070e0e] border-[#0a2020]' : 'bg-emerald-50 border-emerald-200',
  }

  return (
    <div className={`rounded-2xl border overflow-hidden ${T.card}`}>
      {/* Header row */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3.5 text-left hover:opacity-90 transition-opacity"
        aria-expanded={open}
      >
        <span className={`text-xs font-bold flex-shrink-0 ${T.muted}`}>Q{index + 1}</span>
        <span className={`flex-1 text-sm line-clamp-2 ${T.text}`}>
          {q.question_text?.slice(0, 120)}{q.question_text?.length > 120 ? '…' : ''}
        </span>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-xs font-bold" style={{ color: verdictConfig.color }}>{verdictConfig.score}</span>
          <span style={{ color: verdictConfig.color }}>{verdictConfig.icon}</span>
          {open ? <ChevronUp size={14} className={T.muted} /> : <ChevronDown size={14} className={T.muted} />}
        </div>
      </button>

      {/* Expanded review */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className={`px-4 pb-4 pt-2 border-t ${isDark ? 'border-[#1e2538]' : 'border-gray-100'} space-y-3`}>
              {/* Full question */}
              <div className={`text-sm leading-relaxed ${T.text}`}>
                {renderContent(q.question_text, isDark)}
              </div>

              {/* Options */}
              {!q.is_numerical && (
                <div className="space-y-2">
                  {OPTION_KEYS.map((key, i) => {
                    const text = q[`option_${key}` as keyof TestQuestionReview] as string | null
                    const img  = q[`option_${key}_img` as keyof TestQuestionReview] as string | null
                    if (!text && !img) return null
                    const isUser    = userOpt === key
                    const isCorrect = corrOpt === key

                    return (
                      <div
                        key={key}
                        className={`flex items-start gap-2.5 px-3 py-2.5 rounded-xl border text-sm ${
                          isCorrect
                            ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                            : isUser && !isCorrect
                              ? 'bg-rose-500/10 border-rose-500/40 text-rose-400'
                              : `${T.optBase} bg-transparent`
                        }`}
                      >
                        <span className={`flex-shrink-0 w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${
                          isCorrect ? 'bg-emerald-600 text-white' : isUser ? 'bg-rose-600 text-white' : (isDark ? 'bg-[#1e2538] text-slate-400' : 'bg-gray-100 text-gray-500')
                        }`}>
                          {OPTION_LABELS[i]}
                        </span>
                        {img && <img src={img} alt={`Option ${OPTION_LABELS[i]}`} className="max-h-16 rounded object-contain" />}
                        {text && <span className="flex-1 text-xs">{renderContent(text, isDark)}</span>}
                        {isCorrect && <CheckCircle2 size={13} className="text-emerald-500 flex-shrink-0 mt-0.5" />}
                        {isUser && !isCorrect && <XCircle size={13} className="text-rose-500 flex-shrink-0 mt-0.5" />}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Numerical answer */}
              {q.is_numerical && (
                <div className="flex items-center gap-3">
                  {entry?.selected_option && (
                    <span className={`text-xs px-2 py-1 rounded-lg ${verdict === 'correct' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-rose-500/15 text-rose-400'}`}>
                      Your answer: {entry.selected_option}
                    </span>
                  )}
                  <span className="text-xs px-2 py-1 rounded-lg bg-emerald-500/15 text-emerald-400">
                    Correct: {q.correct_option}
                  </span>
                </div>
              )}

              {/* Solution */}
              {q.solution && (
                <div className={`rounded-xl border p-3 text-xs leading-relaxed ${T.solCard}`}>
                  <p className={`font-bold mb-1.5 ${isDark ? 'text-emerald-400' : 'text-emerald-700'}`}>Solution</p>
                  <div className={isDark ? 'text-slate-300' : 'text-gray-700'}>
                    {renderContent(q.solution, isDark)}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Main ResultView ──────────────────────────────────────────────────────────
export function ResultView({ isDark, result, answers, title, onHome }: Props) {
  const { score, maxScore, correctCount, incorrectCount, unattemptedCount, timeTakenSeconds, questions } = result
  const pct = maxScore > 0 ? Math.round(Math.max(0, score) / maxScore * 100) : 0

  const T = {
    page:  isDark ? 'bg-[#07090f] text-white' : 'bg-[#F0F2FA] text-[#0f172a]',
    card:  isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]',
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
    text:  isDark ? 'text-white' : 'text-[#0f172a]',
  }

  const summaryStats = [
    { label: 'Correct',     value: correctCount,    icon: <CheckCircle2 size={15} />, color: '#22c55e' },
    { label: 'Incorrect',   value: incorrectCount,   icon: <XCircle      size={15} />, color: '#ef4444' },
    { label: 'Not answered',value: unattemptedCount, icon: <Minus        size={15} />, color: isDark ? '#475569' : '#94a3b8' },
    { label: 'Time taken',  value: fmtTime(timeTakenSeconds ?? 0), icon: <Clock size={15} />, color: isDark ? '#818cf8' : '#4f46e5' },
  ]

  return (
    <div className={`min-h-screen ${T.page}`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-20 space-y-6">

        {/* Score hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border p-6 text-center ${T.card}`}
        >
          <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${T.muted}`}>{title}</p>
          <ScoreRing score={score} maxScore={maxScore} isDark={isDark} />
          <h1 className={`text-2xl font-extrabold mt-3 ${T.text}`}>
            {pct >= 70 ? 'Great work' : pct >= 40 ? 'Good effort' : 'Keep going'}
          </h1>
          <p className={`text-sm mt-1 ${T.muted}`}>
            {pct >= 70 ? 'Strong performance. Review the solutions to perfect your approach.'
              : pct >= 40 ? 'Solid attempt. Focus on the chapters where you struggled.'
              : 'Tough test. Go through each solution carefully and try again.'}
          </p>
        </motion.div>

        {/* Stats grid */}
        <motion.div
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }}
          className={`rounded-2xl border p-5 grid grid-cols-2 sm:grid-cols-4 gap-4 ${T.card}`}
        >
          {summaryStats.map(s => (
            <div key={s.label} className="flex flex-col items-center text-center gap-1">
              <span style={{ color: s.color }}>{s.icon}</span>
              <span className={`text-xl font-extrabold tabular-nums ${T.text}`}>{s.value}</span>
              <span className={`text-[10px] ${T.muted}`}>{s.label}</span>
            </div>
          ))}
        </motion.div>

        {/* Chapter breakdown */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.12 }}>
          <ChapterBreakdown questions={questions} answers={answers} isDark={isDark} />
        </motion.div>

        {/* Question-by-question review */}
        <div>
          <p className={`text-sm font-bold mb-3 ${T.text}`}>Question Review</p>
          <div className="space-y-2">
            {questions.map((q, i) => (
              <motion.div
                key={q.question_id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.05 + i * 0.02 }}
              >
                <ReviewItem q={q} entry={answers[q.question_id]} index={i} isDark={isDark} />
              </motion.div>
            ))}
          </div>
        </div>

        {/* Home button */}
        <div className="flex justify-center pt-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onHome}
            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-colors"
          >
            <Home size={15} />
            Back to Tests
          </motion.button>
        </div>
      </div>
    </div>
  )
}
