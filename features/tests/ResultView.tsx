'use client'
// ─── features/tests/ResultView.tsx ───────────────────────────────────────────
// Styling follows /design.md (monochrome, tokens shared with the profile modal).

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, X, Minus, ChevronDown, Home } from 'lucide-react'
import { renderContent } from '../../app/components/renderContent'
import type { SubmitTestResponse, TestQuestionReview, AnswerMap } from './types'

interface Props {
  isDark:    boolean
  result:    SubmitTestResponse
  answers:   AnswerMap
  title:     string
  onHome:    () => void
}

// ─── Design tokens (see design.md) ────────────────────────────────────────────
function useTokens(isDark: boolean) {
  return {
    page:        isDark ? 'bg-[#05070C] text-white'            : 'bg-gray-50 text-gray-900',
    surface:     isDark ? 'bg-[#0A0E17] border-[#1D2939]'      : 'bg-white border-gray-200',
    inset:       isDark ? 'bg-[#111827] border-[#1D2939]'      : 'bg-gray-50 border-gray-200',
    text:        isDark ? 'text-white'                         : 'text-gray-900',
    subtext:     isDark ? 'text-gray-400'                      : 'text-gray-500',
    divider:     isDark ? 'border-[#1D2939]'                   : 'border-gray-200',
    track:       isDark ? 'bg-[#1D2939]'                       : 'bg-gray-200',
    fill:        isDark ? 'bg-white'                           : 'bg-gray-900',
    ringTrack:   isDark ? '#1D2939'                            : '#E5E7EB',
    ringFill:    isDark ? '#FFFFFF'                            : '#111827',
    btnPrimary:  isDark ? 'bg-white text-black hover:bg-gray-100'
                        : 'bg-gray-900 text-white hover:bg-gray-800',
    hoverBorder: isDark ? 'hover:border-gray-500'              : 'hover:border-gray-400',
    optIdle:     isDark ? 'border-[#1D2939] text-gray-300'     : 'border-gray-200 text-gray-700',
    badgeIdle:   isDark ? 'bg-[#111827] text-gray-400 border-[#1D2939]'
                        : 'bg-gray-100 text-gray-500 border-gray-200',
  }
}

// Semantic colours are used only for answer correctness, and only as small accents.
const GOOD = { text: 'text-emerald-500', soft: 'bg-emerald-500/10 border-emerald-500/30' }
const BAD  = { text: 'text-rose-500',    soft: 'bg-rose-500/10 border-rose-500/30' }

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

type Verdict = 'correct' | 'incorrect' | 'unattempted'

function getVerdict(q: TestQuestionReview, entry: AnswerMap[string] | undefined): Verdict {
  const answered =
    entry &&
    (entry.q_status === 'answered' || entry.q_status === 'marked_answered') &&
    entry.selected_option
  if (!answered) return 'unattempted'

  if (q.is_numerical) {
    const u = parseFloat(entry!.selected_option ?? '')
    const c = parseFloat(q.correct_option ?? '')
    return !isNaN(u) && !isNaN(c) && u === c ? 'correct' : 'incorrect'
  }
  return normOption(entry!.selected_option) === normOption(q.correct_option) ? 'correct' : 'incorrect'
}

// ─── Score ring (monochrome) ──────────────────────────────────────────────────
function ScoreRing({ score, maxScore, isDark }: { score: number; maxScore: number; isDark: boolean }) {
  const t    = useTokens(isDark)
  const pct  = maxScore > 0 ? Math.max(0, score / maxScore) : 0
  const r = 52, cx = 60, cy = 60
  const circ = 2 * Math.PI * r
  const dash = circ * Math.min(pct, 1)

  return (
    <div className="relative flex items-center justify-center">
      <svg width={120} height={120} viewBox="0 0 120 120" aria-hidden="true">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={t.ringTrack} strokeWidth={6} />
        <circle
          cx={cx} cy={cy} r={r} fill="none"
          stroke={t.ringFill} strokeWidth={6}
          strokeDasharray={`${dash} ${circ}`}
          strokeLinecap="round"
          style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px`, transition: 'stroke-dasharray 0.8s ease' }}
        />
      </svg>
      <div className="absolute text-center pointer-events-none">
        <p className={`text-3xl font-bold tabular-nums leading-none ${t.text}`}>{score}</p>
        <p className={`text-xs mt-1 ${t.subtext}`}>out of {maxScore}</p>
      </div>
    </div>
  )
}

// ─── Per-chapter breakdown ────────────────────────────────────────────────────
function ChapterBreakdown({ questions, answers, isDark }: {
  questions: TestQuestionReview[]; answers: AnswerMap; isDark: boolean
}) {
  const t = useTokens(isDark)
  const chapterMap: Record<string, { correct: number; total: number }> = {}

  for (const q of questions) {
    const ch = q.chapter ?? 'Unknown'
    if (!chapterMap[ch]) chapterMap[ch] = { correct: 0, total: 0 }
    chapterMap[ch].total++
    if (getVerdict(q, answers[q.question_id]) === 'correct') chapterMap[ch].correct++
  }

  // Weakest chapters first
  const sorted = Object.entries(chapterMap).sort(
    ([, a], [, b]) => a.correct / a.total - b.correct / b.total
  )

  return (
    <section className={`rounded-2xl border ${t.surface}`}>
      <div className="p-6 pb-4">
        <h2 className={`text-lg font-bold ${t.text}`}>Chapter breakdown</h2>
        <p className={`text-sm mt-1 ${t.subtext}`}>Sorted from weakest to strongest.</p>
      </div>
      <div className="px-6 pb-6 space-y-4">
        {sorted.map(([ch, s]) => {
          const pct = Math.round((s.correct / s.total) * 100)
          return (
            <div key={ch}>
              <div className="flex items-center justify-between gap-3 mb-1.5">
                <span className={`text-sm truncate ${t.text}`}>{ch}</span>
                <span className={`text-xs tabular-nums flex-shrink-0 ${t.subtext}`}>
                  {s.correct}/{s.total}
                </span>
              </div>
              <div className={`h-1 rounded-full overflow-hidden ${t.track}`}>
                <div className={`h-full rounded-full transition-all duration-700 ${t.fill}`} style={{ width: `${pct}%` }} />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

// ─── Question review item ─────────────────────────────────────────────────────
const OPTION_KEYS   = ['a', 'b', 'c', 'd'] as const
const OPTION_LABELS = ['A', 'B', 'C', 'D']

function ReviewItem({ q, entry, index, isDark }: {
  q: TestQuestionReview; entry: AnswerMap[string] | undefined; index: number; isDark: boolean
}) {
  const t = useTokens(isDark)
  const [open, setOpen] = useState(false)

  const userOpt = normOption(entry?.selected_option)
  const corrOpt = normOption(q.correct_option)
  const verdict = getVerdict(q, entry)

  const verdictUI = {
    correct:     { icon: <Check size={14} strokeWidth={2.5} />, cls: GOOD.text, label: 'Correct', pts: '+4' },
    incorrect:   { icon: <X     size={14} strokeWidth={2.5} />, cls: BAD.text,  label: 'Incorrect', pts: '-1' },
    unattempted: { icon: <Minus size={14} strokeWidth={2.5} />, cls: t.subtext, label: 'Skipped', pts: '0' },
  }[verdict]

  return (
    <div className={`rounded-2xl border overflow-hidden transition-colors ${t.surface} ${t.hoverBorder}`}>
      {/* Header row — question is rendered through renderContent so LaTeX works here too */}
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 px-4 py-4 text-left"
        aria-expanded={open}
      >
        <span className={`text-xs font-semibold tabular-nums w-7 flex-shrink-0 pt-0.5 ${t.subtext}`}>
          Q{index + 1}
        </span>

        <div
          className={`flex-1 min-w-0 text-sm leading-relaxed ${t.text} ${open ? '' : 'line-clamp-2'}`}
        >
          {renderContent(q.question_text, isDark)}
        </div>

        <div className="flex items-center gap-2.5 flex-shrink-0 pt-0.5">
          <span className={`flex items-center gap-1 text-xs font-semibold ${verdictUI.cls}`}>
            {verdictUI.icon}
            <span className="tabular-nums">{verdictUI.pts}</span>
          </span>
          <ChevronDown
            size={15}
            className={`${t.subtext} transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
          />
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className={`px-4 pb-4 pt-4 border-t space-y-4 ${t.divider}`}>
              {/* Options */}
              {!q.is_numerical && (
                <div className="space-y-2">
                  {OPTION_KEYS.map((key, i) => {
                    const text = q[`option_${key}` as keyof TestQuestionReview] as string | null
                    const img  = q[`option_${key}_img` as keyof TestQuestionReview] as string | null
                    if (!text && !img) return null

                    const isCorrect = corrOpt === key
                    const isWrong   = userOpt === key && !isCorrect

                    const rowCls = isCorrect
                      ? `${GOOD.soft} ${t.text}`
                      : isWrong
                        ? `${BAD.soft} ${t.text}`
                        : `${t.optIdle} bg-transparent`

                    const badgeCls = isCorrect
                      ? 'bg-emerald-500 text-white border-emerald-500'
                      : isWrong
                        ? 'bg-rose-500 text-white border-rose-500'
                        : t.badgeIdle

                    return (
                      <div key={key} className={`flex items-start gap-3 px-3 py-2.5 rounded-xl border text-sm ${rowCls}`}>
                        <span className={`flex-shrink-0 w-5 h-5 rounded-md border flex items-center justify-center text-[11px] font-semibold ${badgeCls}`}>
                          {OPTION_LABELS[i]}
                        </span>
                        {img && <img src={img} alt={`Option ${OPTION_LABELS[i]}`} className="max-h-16 rounded object-contain" />}
                        {text && <div className="flex-1 min-w-0 leading-relaxed">{renderContent(text, isDark)}</div>}
                        {isCorrect && <Check size={14} strokeWidth={2.5} className={`${GOOD.text} flex-shrink-0 mt-0.5`} />}
                        {isWrong   && <X     size={14} strokeWidth={2.5} className={`${BAD.text} flex-shrink-0 mt-0.5`} />}
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Numerical answer */}
              {q.is_numerical && (
                <div className="flex flex-wrap items-center gap-2">
                  {entry?.selected_option && (
                    <span className={`text-xs px-3 py-1.5 rounded-lg border ${verdict === 'correct' ? GOOD.soft : BAD.soft} ${t.text}`}>
                      Your answer: <span className="font-semibold">{entry.selected_option}</span>
                    </span>
                  )}
                  <span className={`text-xs px-3 py-1.5 rounded-lg border ${GOOD.soft} ${t.text}`}>
                    Correct answer: <span className="font-semibold">{q.correct_option}</span>
                  </span>
                </div>
              )}

              {/* Solution */}
              {q.solution && (
                <div className={`rounded-xl border p-4 ${t.inset}`}>
                  <p className={`text-sm font-semibold mb-2 ${t.text}`}>Solution</p>
                  <div className={`text-sm leading-relaxed ${t.subtext}`}>
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
  const t = useTokens(isDark)
  const { score, maxScore, correctCount, incorrectCount, unattemptedCount, timeTakenSeconds, questions } = result
  const pct = maxScore > 0 ? Math.round((Math.max(0, score) / maxScore) * 100) : 0

  const headline = pct >= 70 ? 'Strong performance' : pct >= 40 ? 'Solid attempt' : 'Room to improve'
  const summary  =
    pct >= 70 ? 'Review the solutions to tighten your approach.'
    : pct >= 40 ? 'Focus on the chapters where you lost marks.'
    : 'Go through each solution carefully, then retry.'

  const stats = [
    { label: 'Correct',      value: String(correctCount),    cls: GOOD.text },
    { label: 'Incorrect',    value: String(incorrectCount),  cls: BAD.text },
    { label: 'Not answered', value: String(unattemptedCount), cls: t.text },
    { label: 'Time taken',   value: fmtTime(timeTakenSeconds ?? 0), cls: t.text },
  ]

  return (
    <div className={`min-h-screen ${t.page}`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-20 space-y-4">

        {/* Score summary */}
        <motion.section
          initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className={`rounded-2xl border p-8 text-center ${t.surface}`}
        >
          <p className={`text-sm mb-6 ${t.subtext}`}>{title}</p>
          <div className="flex justify-center">
            <ScoreRing score={score} maxScore={maxScore} isDark={isDark} />
          </div>
          <h1 className={`text-xl font-bold mt-6 ${t.text}`}>{headline}</h1>
          <p className={`text-sm mt-1 ${t.subtext}`}>{summary}</p>
        </motion.section>

        {/* Stats */}
        <section className={`rounded-2xl border grid grid-cols-2 sm:grid-cols-4 ${t.surface}`}>
          {stats.map((s, i) => (
            <div
              key={s.label}
              className={`p-5 text-center ${i > 0 ? `sm:border-l ${t.divider}` : ''} ${i % 2 === 1 ? `border-l sm:border-l ${t.divider}` : ''} ${i >= 2 ? `border-t sm:border-t-0 ${t.divider}` : ''}`}
            >
              <p className={`text-xl font-bold tabular-nums ${s.cls}`}>{s.value}</p>
              <p className={`text-xs mt-1 ${t.subtext}`}>{s.label}</p>
            </div>
          ))}
        </section>

        {/* Chapter breakdown */}
        <ChapterBreakdown questions={questions} answers={answers} isDark={isDark} />

        {/* Question review */}
        <div className="pt-4">
          <div className="mb-3 px-1">
            <h2 className={`text-lg font-bold ${t.text}`}>Question review</h2>
            <p className={`text-sm mt-1 ${t.subtext}`}>Tap a question to see options and the solution.</p>
          </div>
          <div className="space-y-2">
            {questions.map((q, i) => (
              <ReviewItem key={q.question_id} q={q} entry={answers[q.question_id]} index={i} isDark={isDark} />
            ))}
          </div>
        </div>

        {/* Footer action */}
        <div className="flex justify-center pt-6">
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onHome}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${t.btnPrimary}`}
          >
            <Home size={14} />
            Back to tests
          </motion.button>
        </div>
      </div>
    </div>
  )
}