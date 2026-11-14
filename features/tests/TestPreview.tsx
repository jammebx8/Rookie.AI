'use client'
import React, { useEffect, useState } from 'react'
import { AlertTriangle, BookOpen, Calendar, ChevronLeft, Clock, Layers, ListChecks, Loader2, Play } from 'lucide-react'
import { ListRow, Tag } from '@/components/rookie/ui'
import { Button } from '@/components/ui/button'
import { supabase } from '../../public/src/utils/supabase'
import type { TestConfig } from './types'
import { EXAM_OPTIONS, DURATION_OPTIONS } from './types'

interface Props {
  isDark?:  boolean
  config:   TestConfig
  creating: boolean
  onStart:  () => void
  onEdit:   () => void
}

const MIN_QUESTIONS = 3

export function TestPreview({ config, creating, onStart, onEdit }: Props) {
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

  const summaryRows = [
    { icon: BookOpen,   label: 'Exam',      value: examLabel },
    { icon: Calendar,   label: 'Years',     value: config.years.join(', ') || '—' },
    { icon: Layers,     label: 'Subjects',  value: config.subjects.join(', ') || '—' },
    { icon: Layers,     label: 'Chapters',  value: `${config.chapters.length} selected` },
    { icon: Clock,      label: 'Duration',  value: durationLabel },
    {
      icon: ListChecks,
      label: 'Questions',
      value: loading
        ? 'Counting…'
        : tooFew
          ? `Only ${questionCount} available (need ${MIN_QUESTIONS}+)`
          : `~${actualQ} questions`,
    },
  ]

  return (
    <div>
      <p className="text-title font-semibold tracking-[-0.015em] text-foreground">Ready to go?</p>
      <p className="mt-1 text-body-sm text-muted-foreground">Answers stay hidden until you submit.</p>

      <div className="mt-5 flex flex-col gap-1.5">
        {summaryRows.map(r => (
          <ListRow key={r.label} className="hover:bg-muted">
            <r.icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="w-20 shrink-0 text-meta font-medium text-muted-foreground">{r.label}</span>
            <span className="min-w-0 flex-1 truncate text-body-sm font-semibold text-foreground">{r.value}</span>
          </ListRow>
        ))}
      </div>

      {config.chapters.length > 0 && config.chapters.length <= 10 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {config.chapters.map(ch => <Tag key={ch}>{ch}</Tag>)}
        </div>
      )}

      {tooFew && (
        <div className="mt-4 flex items-start gap-2.5 rounded-control bg-[#fdecea] p-3 text-[#b2382d] dark:bg-[rgba(255,122,102,.14)] dark:text-[#ff9c8c]">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <p className="text-label">
            Not enough questions match (found {questionCount}, need {MIN_QUESTIONS}+). Go back and add more chapters or years.
          </p>
        </div>
      )}

      {!tooFew && !loading && (
        <p className="mt-4 text-meta text-muted-foreground">
          Questions are picked at random and balanced across subjects.
        </p>
      )}

      <div className="mt-6 flex gap-2">
        <Button variant="ghost" onClick={onEdit} className="h-10 rounded-control px-4">
          <ChevronLeft /> Edit
        </Button>
        <Button onClick={onStart} disabled={!canStart} className="h-10 flex-1 rounded-control text-body-sm">
          {creating ? <><Loader2 className="animate-spin" /> Building test…</> : <><Play className="fill-current" /> Start test</>}
        </Button>
      </div>
    </div>
  )
}
