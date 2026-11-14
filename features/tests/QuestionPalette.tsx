'use client'
// ─── features/tests/QuestionPalette.tsx ──────────────────────────────────────

import React, { useMemo } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Define } from '@/components/rookie/define'
import { useIsDark } from '@/components/rookie/theme'
import { cn } from '@/lib/utils'
import type { TestQuestion, AnswerMap, QuestionStatus } from './types'
import { STATUS_STYLES_DARK, STATUS_STYLES_LIGHT } from './types'

interface Props {
  isDark?:       boolean
  questions:     TestQuestion[]
  answers:       AnswerMap
  currentIndex:  number
  onGoto:        (i: number) => void
  onClose?:      () => void   // mobile: close bottom sheet
}

function getStatus(qid: string, answers: AnswerMap): QuestionStatus {
  return answers[qid]?.q_status ?? 'not_visited'
}

/** Legend order. `visited` and `unattempted` share a colour (seen, no answer). */
const LEGEND: { status: QuestionStatus; label: string }[] = [
  { status: 'answered',        label: 'Answered' },
  { status: 'visited',         label: 'Not answered' },
  { status: 'marked',          label: 'Marked' },
  { status: 'marked_answered', label: 'Marked & answered' },
  { status: 'not_visited',     label: 'Not visited' },
]

function Swatch({ status, isDark, className, children }: { status: QuestionStatus; isDark: boolean; className?: string; children?: React.ReactNode }) {
  const st = (isDark ? STATUS_STYLES_DARK : STATUS_STYLES_LIGHT)[status]
  return (
    <span
      className={cn('relative grid place-items-center rounded-control font-semibold tabular-nums', className)}
      style={{ backgroundColor: st.bg, color: st.text }}
    >
      {children}
      {status === 'marked_answered' && (
        <span aria-hidden className="absolute -top-0.5 -right-0.5 size-2.5 rounded-full bg-primary ring-2 ring-card" />
      )}
    </span>
  )
}

function PaletteCell({
  num, status, isCurrent, isDark, onClick,
}: { num: number; status: QuestionStatus; isCurrent: boolean; isDark: boolean; onClick: () => void }) {
  const styles = isDark ? STATUS_STYLES_DARK[status] : STATUS_STYLES_LIGHT[status]
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Question ${num}, status ${styles.label}${isCurrent ? ', current' : ''}`}
      aria-current={isCurrent ? 'true' : undefined}
      className={cn(
        'rounded-control outline-none transition hover:-translate-y-0.5 hover:brightness-[.97] focus-visible:ring-2 focus-visible:ring-ring active:translate-y-0',
        isCurrent && 'ring-2 ring-foreground ring-offset-2 ring-offset-card',
      )}
    >
      <Swatch status={status} isDark={isDark} className="size-9 text-meta">{num}</Swatch>
    </button>
  )
}

export function QuestionPalette({ questions, answers, currentIndex, onGoto, onClose }: Props) {
  const isDark = useIsDark()

  // Group by subject
  const grouped = useMemo(() => {
    const map: Record<string, TestQuestion[]> = {}
    for (const q of questions) {
      const sub = q.subject ?? 'General'
      if (!map[sub]) map[sub] = []
      map[sub].push(q)
    }
    return map
  }, [questions])

  // Count per subject
  const countBySubject = (subj: string) => {
    const qs = grouped[subj] ?? []
    return qs.filter(q => {
      const s = getStatus(q.question_id, answers)
      return s === 'answered' || s === 'marked_answered'
    }).length
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Header (close button first in DOM so it, not the definition, gets initial focus in the sheet) */}
      <div className="flex shrink-0 flex-row-reverse items-center justify-between px-5 pt-5 pb-3">
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Close palette" className="rounded-control">
            <X />
          </Button>
        )}
        <p className="text-title font-semibold tracking-[-0.015em] text-foreground">
          <Define text="Tap a number to jump to that question. Colours show where each one stands.">Questions</Define>
        </p>
      </div>

      {/* Legend */}
      <div className="shrink-0 px-5 pb-4">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2">
          {LEGEND.map(({ status, label }) => (
            <span key={status} className="flex items-center gap-2 text-caption font-medium text-muted-foreground">
              <Swatch status={status} isDark={isDark} className="size-4 shrink-0 rounded-tag" />
              {label}
            </span>
          ))}
        </div>
        <p className="mt-2.5 text-caption text-muted-foreground">
          <Define text="If you answered a question and also marked it for review, the answer still counts.">Marked &amp; answered counts</Define> for evaluation.
        </p>
      </div>

      {/* Palette grid per subject */}
      <div className="no-scrollbar flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 pb-5">
        {Object.entries(grouped).map(([subj, qs]) => {
          const attempted = countBySubject(subj)
          const total     = qs.length
          return (
            <div key={subj} className="rounded-control bg-muted p-3">
              <div className="mb-2.5 flex items-center justify-between">
                <span className="text-label font-semibold text-foreground">{subj}</span>
                <span className="text-caption font-medium tabular-nums text-muted-foreground">
                  <Define text="Questions answered in this subject, out of the total.">{attempted}/{total} answered</Define>
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {qs.map(q => {
                  const globalIdx = questions.findIndex(gq => gq.question_id === q.question_id)
                  return (
                    <PaletteCell
                      key={q.question_id}
                      num={globalIdx + 1}
                      status={getStatus(q.question_id, answers)}
                      isCurrent={globalIdx === currentIndex}
                      isDark={isDark}
                      onClick={() => onGoto(globalIdx)}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
