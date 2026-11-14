'use client'
// ─── features/tests/ResultView.tsx ───────────────────────────────────────────

import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, Check, ChevronDown, Clock, Minus, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Bar, Card, Meta, Metric, OmrOption, Row, RingStat, Section, Tag } from '@/components/rookie/ui'
import { Define } from '@/components/rookie/define'
import { useIsDark } from '@/components/rookie/theme'
import { cn } from '@/lib/utils'
import { renderContent } from '../../app/components/renderContent'
import type { SubmitTestResponse, TestQuestionReview, AnswerMap } from './types'

interface Props {
  isDark?:   boolean
  result:    SubmitTestResponse
  answers:   AnswerMap
  title:     string
  onHome:    () => void
}

const RIGHT_TEXT = 'text-[var(--rk-mint-600)] dark:text-[var(--rk-mint-300)]'
const WRONG_TEXT = 'text-[#c2412f] dark:text-[#ff9c8c]'

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

// ─── Per-chapter breakdown ────────────────────────────────────────────────────
function ChapterBreakdown({ questions, answers }: {
  questions: TestQuestionReview[]; answers: AnswerMap
}) {
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
    <Section title="Chapter breakdown" text="Correct answers out of questions asked, per chapter. Weakest chapters come first.">
      <Card className="flex flex-col gap-1.5 p-4 md:p-5">
        {sorted.map(([ch, s]) => {
          const pct = Math.round((s.correct / s.total) * 100)
          return (
            <div key={ch} className="rounded-control bg-muted px-3 py-3 transition hover:bg-secondary">
              <div className="flex items-center justify-between gap-3">
                <span className="truncate text-body-sm font-medium text-foreground">{ch}</span>
                <span className="shrink-0 text-meta font-semibold tabular-nums text-muted-foreground">
                  {s.correct}/{s.total}
                </span>
              </div>
              <Bar value={pct} className="mt-2 bg-background" />
            </div>
          )
        })}
      </Card>
    </Section>
  )
}

// ─── Question review item ─────────────────────────────────────────────────────
const OPTION_KEYS   = ['a', 'b', 'c', 'd'] as const
const OPTION_LABELS = ['A', 'B', 'C', 'D']

function ReviewItem({ q, entry, index, isDark }: {
  q: TestQuestionReview; entry: AnswerMap[string] | undefined; index: number; isDark: boolean
}) {
  const [open, setOpen] = useState(false)

  const userOpt = normOption(entry?.selected_option)
  const corrOpt = normOption(q.correct_option)
  const verdict = getVerdict(q, entry)

  const verdictUI = {
    correct:     { icon: <Check className="size-3" strokeWidth={3} />, tone: 'right'   as const, pts: '+4' },
    incorrect:   { icon: <X     className="size-3" strokeWidth={3} />, tone: 'wrong'   as const, pts: '−1' },
    unattempted: { icon: <Minus className="size-3" strokeWidth={3} />, tone: 'neutral' as const, pts: '0' },
  }[verdict]

  return (
    <div className={cn('overflow-hidden rounded-control bg-muted transition', !open && 'hover:bg-secondary')}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex w-full items-start gap-3 px-3 py-3 text-left outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-expanded={open}
      >
        <span className="w-8 shrink-0 pt-0.5 text-meta font-semibold tabular-nums text-muted-foreground">
          Q{index + 1}
        </span>
        <div className={cn('min-w-0 flex-1 text-body-sm leading-relaxed text-foreground', !open && 'line-clamp-2')}>
          {renderContent(q.question_text, isDark)}
        </div>
        <span className="flex shrink-0 items-center gap-2 pt-0.5">
          <Tag tone={verdictUI.tone} className="tabular-nums">{verdictUI.icon}{verdictUI.pts}</Tag>
          <ChevronDown className={cn('size-4 text-muted-foreground transition-transform duration-200', open && 'rotate-180')} />
        </span>
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
            <div className="flex flex-col gap-4 px-3 pt-1 pb-4 md:pl-14">
              {/* Options */}
              {!q.is_numerical && (
                <div className="flex flex-col gap-1.5">
                  {OPTION_KEYS.map((key, i) => {
                    const text = q[`option_${key}` as keyof TestQuestionReview] as string | null
                    const img  = q[`option_${key}_img` as keyof TestQuestionReview] as string | null
                    if (!text && !img) return null

                    const isCorrect = corrOpt === key
                    const isWrong   = userOpt === key && !isCorrect

                    return (
                      <OmrOption
                        key={key}
                        letter={OPTION_LABELS[i]}
                        state={isCorrect ? 'right' : isWrong ? 'wrong' : 'idle'}
                        disabled
                        className={cn('items-start py-2.5 text-body-sm font-normal [&>span:first-child]:mt-0.5', !isCorrect && !isWrong && 'bg-card')}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {img && <img src={img} alt={`Option ${OPTION_LABELS[i]}`} className="mb-1 max-h-16 rounded-tag object-contain" />}
                        {text && <span className="block leading-relaxed">{renderContent(text, isDark)}</span>}
                      </OmrOption>
                    )
                  })}
                  {userOpt && corrOpt && verdict === 'incorrect' && (
                    <Meta className="mt-1">You picked {userOpt.toUpperCase()}. Correct answer is {corrOpt.toUpperCase()}.</Meta>
                  )}
                </div>
              )}

              {/* Numerical answer */}
              {q.is_numerical && (
                <div className="flex flex-wrap items-center gap-2">
                  {entry?.selected_option && (
                    <Tag tone={verdict === 'correct' ? 'right' : 'wrong'} className="px-2.5 py-1 text-meta">
                      Your answer: {entry.selected_option}
                    </Tag>
                  )}
                  <Tag tone="right" className="px-2.5 py-1 text-meta">
                    Correct answer: {q.correct_option}
                  </Tag>
                </div>
              )}

              {/* Solution */}
              {q.solution && (
                <div className="rounded-control bg-card p-4">
                  <p className="mb-2 text-label font-semibold text-foreground">Solution</p>
                  <div className="text-body-sm leading-relaxed text-muted-foreground">
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
export function ResultView({ result, answers, title, onHome }: Props) {
  const isDark = useIsDark()
  const { score, maxScore, correctCount, incorrectCount, unattemptedCount, timeTakenSeconds, questions } = result
  const pct = maxScore > 0 ? Math.round((Math.max(0, score) / maxScore) * 100) : 0

  const headline = pct >= 70 ? 'Strong performance' : pct >= 40 ? 'Solid attempt' : 'Room to improve'
  const summary  =
    pct >= 70 ? 'Review the solutions to tighten your approach.'
    : pct >= 40 ? 'Focus on the chapters where you lost marks.'
    : 'Go through each solution carefully, then retry.'

  return (
    <div className="min-h-svh bg-muted">
      {/* Focus header */}
      <header className="sticky top-0 z-30 bg-background/90 px-4 backdrop-blur-md md:px-6">
        <div className="mx-auto flex h-14 w-full max-w-focus items-center gap-2">
          <Button variant="ghost" onClick={onHome} className="h-9 rounded-control px-2.5" aria-label="Back to tests">
            <ArrowLeft /> <span className="hidden sm:inline">Tests</span>
          </Button>
          <span className="min-w-0 truncate text-body font-semibold text-foreground">{title}</span>
          <Meta className="ml-auto shrink-0">Result</Meta>
        </div>
      </header>

      <main className="mx-auto w-full max-w-focus px-4 pt-8 pb-28 md:px-6">
        {/* Score summary */}
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}>
          <Card className="flex flex-col-reverse items-start gap-6 p-7 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <span className="text-label font-medium text-muted-foreground"><Define term="score">Your score</Define></span>
              <p className="mt-2 flex items-baseline gap-2">
                <span className="text-price font-bold leading-none tracking-[-0.05em] tabular-nums text-foreground">{score}</span>
                <span className="text-title font-medium tabular-nums text-muted-foreground">/ {maxScore}</span>
              </p>
              <p className="mt-4 text-title font-semibold tracking-[-0.015em] text-foreground">{headline}</p>
              <p className="mt-1 text-body-sm text-muted-foreground">{summary}</p>
            </div>
            <Define text="Your score as a share of the maximum marks." className="shrink-0">
              <RingStat value={pct} size={112} stroke={10} label={<span className="text-title">{pct}%</span>} />
            </Define>
          </Card>
        </motion.div>

        {/* Stats */}
        <Row className="mt-4 md:grid-cols-4">
          <Metric icon={Check} label="Correct" text="Questions you got right. +4 each." value={<span className={RIGHT_TEXT}>{correctCount}</span>} />
          <Metric icon={X} label="Wrong" text="Questions you got wrong. −1 each." value={<span className={WRONG_TEXT}>{incorrectCount}</span>} />
          <Metric icon={Minus} label="Unattempted" text="Questions left blank. They score 0." value={unattemptedCount} />
          <Metric icon={Clock} label="Time taken" text="Time from starting the test to submitting it." value={<span className="text-heading tracking-[-0.03em]">{fmtTime(timeTakenSeconds ?? 0)}</span>} />
        </Row>

        {/* Chapter breakdown */}
        <ChapterBreakdown questions={questions} answers={answers} />

        {/* Question review */}
        <Section title="Question review" text="Every question with your answer, the right answer and the solution. Tap one to open it.">
          <Card className="flex flex-col gap-1.5 p-4 md:p-5">
            {questions.map((q, i) => (
              <ReviewItem key={q.question_id} q={q} entry={answers[q.question_id]} index={i} isDark={isDark} />
            ))}
          </Card>
        </Section>

        <div className="mt-10 flex justify-center">
          <Button variant="secondary" onClick={onHome} className="h-10 rounded-control px-5">
            <ArrowLeft /> Back to tests
          </Button>
        </div>
      </main>
    </div>
  )
}
