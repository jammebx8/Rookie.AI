'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { Chip, Skeleton } from '@/components/rookie/ui'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { supabase } from '../../../public/src/utils/supabase'
import type { ChapterRow, TestConfig } from '../types'

interface Props {
  isDark?:  boolean
  value:    string[]
  onChange: (chapters: string[]) => void
  config:   TestConfig
}

export function Step4Chapters({ value, onChange, config }: Props) {
  const [rows, setRows]         = useState<ChapterRow[]>([])
  const [loading, setLoading]   = useState(true)
  const [activeSubject, setActiveSubject] = useState(config.subjects[0] ?? '')
  const [search, setSearch]     = useState('')

  useEffect(() => {
    setLoading(true)
    supabase
      .rpc('get_test_chapters', {
        p_years:    config.years,
        p_subjects: config.subjects,
      })
      .then(({ data }) => {
        setRows((data ?? []) as ChapterRow[])
        setLoading(false)
      })
  }, [config.years, config.subjects])

  // Keep activeSubject in sync if subjects change
  useEffect(() => {
    if (!config.subjects.includes(activeSubject) && config.subjects.length > 0) {
      setActiveSubject(config.subjects[0])
    }
  }, [config.subjects, activeSubject])

  const filtered = useMemo(() => {
    return rows
      .filter(r => r.subject.toLowerCase() === activeSubject.toLowerCase())
      .filter(r => !search || r.chapter.toLowerCase().includes(search.toLowerCase()))
  }, [rows, activeSubject, search])

  const chaptersForSubject = rows
    .filter(r => r.subject.toLowerCase() === activeSubject.toLowerCase())
    .map(r => r.chapter)

  const allInSubjectSelected = chaptersForSubject.length > 0
    && chaptersForSubject.every(c => value.includes(c))

  const toggleSubjectAll = () => {
    if (allInSubjectSelected) {
      onChange(value.filter(v => !chaptersForSubject.includes(v)))
    } else {
      const newSet = new Set([...value, ...chaptersForSubject])
      onChange(Array.from(newSet))
    }
  }

  const toggle = (ch: string) => {
    onChange(value.includes(ch) ? value.filter(v => v !== ch) : [...value, ch])
  }

  return (
    <div className="flex flex-col">
      <p className="text-title font-semibold tracking-[-0.015em] text-foreground">Which chapters?</p>
      <p className="mt-1 text-body-sm text-muted-foreground">
        {value.length} chapter{value.length !== 1 ? 's' : ''} selected across all subjects
      </p>

      {/* Subject switch */}
      <div className="mt-5 flex flex-wrap gap-2">
        {config.subjects.map(sub => (
          <Chip
            key={sub}
            active={activeSubject === sub}
            onClick={() => { setActiveSubject(sub); setSearch('') }}
          >
            {sub}
          </Chip>
        ))}
      </div>

      {/* Search + select all */}
      <div className="mt-3 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search chapters"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="h-10 rounded-control pl-9 text-body-sm md:text-body-sm"
          />
        </div>
        <Chip onClick={toggleSubjectAll} className="h-10" disabled={chaptersForSubject.length === 0}>
          {allInSubjectSelected ? 'Clear all' : 'Select all'}
        </Chip>
      </div>

      {/* Chapter list */}
      <div className="no-scrollbar mt-3 flex max-h-[300px] flex-col gap-1.5 overflow-y-auto">
        {loading ? (
          [1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-11" />)
        ) : filtered.length === 0 ? (
          <p className="py-8 text-center text-body-sm text-muted-foreground">
            {search ? 'No matching chapters.' : 'No chapters found for selected years.'}
          </p>
        ) : (
          filtered.map(r => {
            const active = value.includes(r.chapter)
            return (
              <button
                type="button"
                key={r.chapter}
                onClick={() => toggle(r.chapter)}
                role="checkbox"
                aria-checked={active}
                className={cn(
                  'flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left ring-1 ring-transparent transition outline-none focus-visible:ring-ring',
                  active ? 'bg-secondary ring-[var(--rk-sky-300)] dark:ring-transparent' : 'bg-muted hover:bg-secondary',
                )}
              >
                <span className={cn(
                  'grid size-[18px] shrink-0 place-items-center rounded-tag border-[1.5px] transition',
                  active ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/50',
                )}>
                  {active && <Check className="size-3" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1 text-body-sm text-foreground">{r.chapter}</span>
                <span className="shrink-0 text-caption font-medium tabular-nums text-muted-foreground">{r.questionCount} Qs</span>
              </button>
            )
          })
        )}
      </div>
    </div>
  )
}
