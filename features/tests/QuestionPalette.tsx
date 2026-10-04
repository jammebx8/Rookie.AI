'use client'
// ─── features/tests/QuestionPalette.tsx ──────────────────────────────────────

import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import type { TestQuestion, AnswerMap, QuestionStatus } from './types'
import { STATUS_STYLES_DARK, STATUS_STYLES_LIGHT } from './types'

interface Props {
  isDark:        boolean
  questions:     TestQuestion[]
  answers:       AnswerMap
  currentIndex:  number
  onGoto:        (i: number) => void
  onClose?:      () => void   // mobile: close bottom sheet
}

function getStatus(qid: string, answers: AnswerMap): QuestionStatus {
  return answers[qid]?.q_status ?? 'not_visited'
}

function PaletteCell({
  num, status, isCurrent, isDark, onClick,
}: { num: number; status: QuestionStatus; isCurrent: boolean; isDark: boolean; onClick: () => void }) {
  const styles = isDark ? STATUS_STYLES_DARK[status] : STATUS_STYLES_LIGHT[status]
  const isMarkedAnswered = status === 'marked_answered'

  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      aria-label={`Question ${num}, status ${styles.label}${isCurrent ? ', current' : ''}`}
      aria-current={isCurrent ? 'true' : undefined}
      className="relative w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold transition-all"
      style={{
        backgroundColor: styles.bg,
        color:           styles.text,
        border:          isCurrent
          ? '2px solid #6366f1'
          : `1.5px solid ${styles.border}`,
        boxShadow: isCurrent ? '0 0 0 2px #6366f133' : undefined,
      }}
    >
      {num}
      {/* Green dot for marked_answered */}
      {isMarkedAnswered && (
        <span
          className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2"
          style={{ borderColor: isDark ? '#07090f' : '#F0F2FA' }}
          aria-hidden="true"
        />
      )}
    </motion.button>
  )
}

export function QuestionPalette({ isDark, questions, answers, currentIndex, onGoto, onClose }: Props) {
  const styles  = isDark ? STATUS_STYLES_DARK : STATUS_STYLES_LIGHT

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

  const T = {
    bg:     isDark ? 'bg-[#0d1117]' : 'bg-white',
    border: isDark ? 'border-[#1e2538]' : 'border-[#E5E7EB]',
    text:   isDark ? 'text-white' : 'text-[#0f172a]',
    muted:  isDark ? 'text-slate-400' : 'text-slate-500',
    subj:   isDark ? 'text-slate-300' : 'text-slate-600',
  }

  return (
    <div className={`flex flex-col h-full ${T.bg}`}>
      {/* Header */}
      <div className={`flex items-center justify-between px-4 py-3 border-b flex-shrink-0 ${T.border}`}>
        <p className={`text-sm font-bold ${T.text}`}>Question Palette</p>
        {onClose && (
          <button
            onClick={onClose}
            aria-label="Close palette"
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              isDark ? 'bg-[#1e2538] text-slate-300 hover:bg-[#2a3548]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <X size={15} />
          </button>
        )}
      </div>

      {/* Legend */}
      <div className="px-4 py-3 border-b flex-shrink-0" style={{ borderColor: isDark ? '#1e2538' : '#E5E7EB' }}>
        <div className="grid grid-cols-2 gap-1.5">
          {(Object.keys(styles) as QuestionStatus[]).map(st => (
            <div key={st} className="flex items-center gap-2">
              <div
                className="w-5 h-5 rounded flex-shrink-0 flex items-center justify-center text-[9px] font-bold"
                style={{ backgroundColor: styles[st].bg, border: `1.5px solid ${styles[st].border}`, color: styles[st].text }}
              >
                {st === 'marked_answered' ? (
                  <span className="relative">
                    1
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  </span>
                ) : '1'}
              </div>
              <span className={`text-[10px] leading-tight ${T.muted}`}>{styles[st].label}</span>
            </div>
          ))}
        </div>
        <p className={`text-[9px] mt-2 ${T.muted} italic`}>
          Marked &amp; Answered counts for evaluation
        </p>
      </div>

      {/* Palette grid per subject */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5" style={{ scrollbarWidth: 'none' }}>
        {Object.entries(grouped).map(([subj, qs]) => {
          const attempted = countBySubject(subj)
          const total     = qs.length
          return (
            <div key={subj}>
              <div className="flex items-center justify-between mb-2">
                <span className={`text-xs font-bold ${T.subj}`}>{subj}</span>
                <span className={`text-[10px] ${T.muted}`}>{attempted}/{total} Attempted</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {qs.map((q, idx) => {
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
