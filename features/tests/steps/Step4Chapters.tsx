'use client'
import React, { useEffect, useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import { Search } from 'lucide-react'
import { supabase } from '../../../public/src/utils/supabase'
import type { ChapterRow, TestConfig } from '../types'

interface Props {
  isDark:   boolean
  value:    string[]
  onChange: (chapters: string[]) => void
  config:   TestConfig
}

export function Step4Chapters({ isDark, value, onChange, config }: Props) {
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

  const T = {
    label:  isDark ? 'text-white' : 'text-[#0f172a]',
    muted:  isDark ? 'text-slate-400' : 'text-slate-500',
    tab:    (active: boolean) => active
      ? (isDark ? 'border-b-2 border-indigo-500 text-indigo-400 font-semibold' : 'border-b-2 border-indigo-600 text-indigo-600 font-semibold')
      : (isDark ? 'text-slate-400 hover:text-slate-200' : 'text-gray-500 hover:text-gray-700'),
    input:  isDark
      ? 'bg-[#0d1117] border-[#1e2538] text-white placeholder-slate-500 focus:border-indigo-500'
      : 'bg-gray-50 border-gray-200 text-gray-800 placeholder-gray-400 focus:border-indigo-400',
    row:    (active: boolean) => active
      ? (isDark ? 'bg-indigo-950/30 border-indigo-500/40' : 'bg-indigo-50 border-indigo-300')
      : (isDark ? 'border-transparent hover:bg-white/5' : 'border-transparent hover:bg-gray-50'),
    skel:   isDark ? 'bg-[#1e2538]' : 'bg-gray-200',
  }

  return (
    <div className="flex flex-col" style={{ minHeight: 340 }}>
      {/* Section title */}
      <div className="px-5 pt-5 pb-2">
        <p className={`text-sm font-semibold ${T.label}`}>Select chapter(s)</p>
      </div>

      {/* Subject tabs */}
      <div className={`flex border-b ${isDark ? 'border-[#1e2538]' : 'border-gray-200'} px-5 gap-5`}>
        {config.subjects.map(sub => (
          <button
            key={sub}
            type="button"
            onClick={() => { setActiveSubject(sub); setSearch('') }}
            className={`pb-2.5 text-sm transition-all duration-150 ${T.tab(activeSubject === sub)}`}
          >
            {sub}
          </button>
        ))}
      </div>

      {/* Search + select all */}
      <div className="flex items-center gap-2 px-5 pt-3 pb-2">
        <div className="relative flex-1">
          <Search size={13} className={`absolute left-3 top-1/2 -translate-y-1/2 ${T.muted}`} />
          <input
            type="text"
            placeholder="Search chapters"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className={`w-full pl-8 pr-3 py-2 text-xs rounded-lg border outline-none transition-colors ${T.input}`}
          />
        </div>
        <button
          type="button"
          onClick={toggleSubjectAll}
          className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 whitespace-nowrap transition-colors"
        >
          {allInSubjectSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {/* Chapter list */}
      <div className="flex-1 overflow-y-auto px-5 pb-4 space-y-1" style={{ maxHeight: 300, scrollbarWidth: 'none' }}>
        {loading ? (
          <div className="space-y-2 animate-pulse pt-2">
            {[1,2,3,4,5].map(i => <div key={i} className={`h-10 rounded-xl ${T.skel}`} />)}
          </div>
        ) : filtered.length === 0 ? (
          <p className={`text-sm py-6 text-center ${T.muted}`}>
            {search ? 'No matching chapters.' : 'No chapters found for selected years.'}
          </p>
        ) : (
          filtered.map(r => {
            const active = value.includes(r.chapter)
            return (
              <motion.div
                key={r.chapter}
                whileTap={{ scale: 0.99 }}
                onClick={() => toggle(r.chapter)}
                role="checkbox"
                aria-checked={active}
                tabIndex={0}
                onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') toggle(r.chapter) }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-all ${T.row(active)}`}
              >
                {/* Custom checkbox */}
                <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${
                  active
                    ? 'bg-indigo-600 border-indigo-600'
                    : (isDark ? 'border-[#2a3548]' : 'border-gray-300')
                }`}>
                  {active && (
                    <svg width="9" height="7" viewBox="0 0 9 7" fill="none">
                      <path d="M1 3.5L3.5 6L8 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </div>
                <span className={`flex-1 text-sm ${active ? (isDark ? 'text-white' : 'text-[#0f172a]') : (isDark ? 'text-slate-300' : 'text-gray-700')}`}>
                  {r.chapter}
                </span>
                <span className={`text-[10px] flex-shrink-0 ${T.muted}`}>{r.questionCount} Qs</span>
              </motion.div>
            )
          })
        )}
      </div>

      {/* Selection count */}
      <div className={`px-5 py-2 border-t text-xs ${isDark ? 'border-[#1e2538] text-slate-500' : 'border-gray-100 text-gray-400'}`}>
        {value.length} chapter{value.length !== 1 ? 's' : ''} selected across all subjects
      </div>
    </div>
  )
}
