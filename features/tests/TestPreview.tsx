'use client'
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { BookOpen, Calendar, Clock, Layers, AlertTriangle, ChevronLeft, Play } from 'lucide-react'
import { supabase } from '../../public/src/utils/supabase'
import type { TestConfig } from './types'
import { EXAM_OPTIONS, DURATION_OPTIONS } from './types'

interface Props {
  isDark:   boolean
  config:   TestConfig
  creating: boolean
  onStart:  () => void
  onEdit:   () => void
}

const MIN_QUESTIONS = 3

export function TestPreview({ isDark, config, creating, onStart, onEdit }: Props) {
  const [questionCount, setQuestionCount] = useState<number | null>(null)
  const [loading, setLoading]             = useState(true)

  const examLabel    = EXAM_OPTIONS.find(e => e.id === config.examId)?.label ?? config.examId
  const durationOpt  = DURATION_OPTIONS.find(d => d.seconds === config.durationSeconds)
  const durationLabel= durationOpt?.label ?? `${Math.round((config.durationSeconds ?? 0) / 60)} mins`
  const approxQ      = durationOpt?.approxQuestions ?? Math.floor((config.durationSeconds ?? 0) / 90)

  useEffect(() => {
    if (!config.years.length || !config.subjects.length || !config.chapters.length) {
      setQuestionCount(0); setLoading(false); return
    }
    supabase
      .from('jee_mains')
      .select('question_id', { count: 'exact', head: true })
      .in('chapter', config.chapters)
      .then(({ count }) => {
        setQuestionCount(count ?? 0)
        setLoading(false)
      })
  }, [config.chapters, config.years, config.subjects])

  const actualQ   = Math.min(questionCount ?? 0, approxQ)
  const tooFew    = !loading && questionCount !== null && questionCount < MIN_QUESTIONS
  const canStart  = !tooFew && !loading && !creating

  const T = {
    label:  isDark ? 'text-white' : 'text-[#0f172a]',
    muted:  isDark ? 'text-slate-400' : 'text-slate-500',
    row:    isDark ? 'border-[#1e2538]' : 'border-gray-100',
    card:   isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-gray-50 border-gray-200',
    edit:   isDark ? 'bg-[#111827] border-[#1D2939] text-white hover:bg-[#1a2235]' : 'bg-white border-gray-200 text-[#0f172a]',
    start:  canStart
      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
      : (isDark ? 'bg-[#1e2538] text-slate-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'),
  }

  const summaryRows = [
    { icon: <BookOpen size={14} />,  label: 'Exam',      value: examLabel },
    { icon: <Calendar size={14} />,  label: 'Years',     value: config.years.join(', ') || '—' },
    { icon: <Layers size={14} />,    label: 'Subjects',  value: config.subjects.join(', ') || '—' },
    { icon: <Layers size={14} />,    label: 'Chapters',  value: `${config.chapters.length} selected` },
    { icon: <Clock size={14} />,     label: 'Duration',  value: durationLabel },
    {
      icon: <BookOpen size={14} />,
      label: 'Questions',
      value: loading
        ? 'Counting…'
        : tooFew
          ? `Only ${questionCount} available (need ${MIN_QUESTIONS}+)`
          : `~${actualQ} questions`,
    },
  ]

  return (
    <div className="px-5 py-5">
      {/* Summary card */}
      <div className={`rounded-xl border overflow-hidden ${T.card}`}>
        {summaryRows.map((r, i) => (
          <div
            key={r.label}
            className={`flex items-center gap-3 px-4 py-3 ${i < summaryRows.length - 1 ? `border-b ${T.row}` : ''}`}
          >
            <span className={T.muted}>{r.icon}</span>
            <span className={`text-xs w-20 flex-shrink-0 ${T.muted}`}>{r.label}</span>
            <span className={`text-sm font-semibold flex-1 min-w-0 truncate ${T.label}`}>{r.value}</span>
          </div>
        ))}
      </div>

      {/* Chapter list */}
      {config.chapters.length > 0 && config.chapters.length <= 10 && (
        <div className="mt-3">
          <p className={`text-xs mb-2 ${T.muted}`}>Selected chapters</p>
          <div className="flex flex-wrap gap-1.5">
            {config.chapters.map(ch => (
              <span
                key={ch}
                className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${
                  isDark ? 'bg-[#111827] border-[#1D2939] text-slate-400' : 'bg-gray-100 border-gray-200 text-gray-500'
                }`}
              >
                {ch}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Warning */}
      {tooFew && (
        <motion.div
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className={`mt-4 flex items-start gap-2.5 p-3 rounded-xl border ${
            isDark ? 'bg-rose-950/20 border-rose-900/50' : 'bg-rose-50 border-rose-200'
          }`}
        >
          <AlertTriangle size={15} className="text-rose-500 flex-shrink-0 mt-0.5" />
          <p className={`text-xs ${isDark ? 'text-rose-300' : 'text-rose-700'}`}>
            Not enough questions match your selection (found {questionCount}, need {MIN_QUESTIONS}+).
            Go back and add more chapters or years.
          </p>
        </motion.div>
      )}

      {/* Rule note */}
      {!tooFew && !loading && (
        <p className={`text-[10px] mt-3 ${T.muted}`}>
          Questions are randomly selected and balanced across subjects. Correct answers are hidden until you submit.
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-3 mt-5">
        <button
          onClick={onEdit}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${T.edit}`}
        >
          <ChevronLeft size={15} />
          Edit
        </button>
        <button
          onClick={onStart}
          disabled={!canStart}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-colors ${T.start}`}
        >
          {creating ? (
            <>
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
              />
              Building test…
            </>
          ) : (
            <>
              <Play size={15} fill="white" />
              Start Test
            </>
          )}
        </button>
      </div>
    </div>
  )
}
