'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2 } from 'lucide-react'
import { SUBJECTS_FOR_EXAM } from '../types'
import type { TestConfig } from '../types'

interface Props {
  isDark:   boolean
  value:    string[]
  onChange: (subjects: string[]) => void
  config:   TestConfig
}

const SUBJECT_ICONS: Record<string, React.ReactNode> = {
  Physics:   (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
    </svg>
  ),
  Chemistry: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 3h6M9 3v6.5L5 20h14L15 9.5V3"/>
      <circle cx="9" cy="15" r="1.5" fill="currentColor"/>
      <circle cx="15" cy="17" r="1" fill="currentColor"/>
    </svg>
  ),
  Maths: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 7h16M4 12h16M4 17h10"/>
      <path d="M18 14l2 3-2 3"/>
    </svg>
  ),
  Biology: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 2a8 8 0 0 1 8 8c0 4-4 8-8 12C8 18 4 14 4 10a8 8 0 0 1 8-8z"/>
      <path d="M12 6v12M9 9l6 6M15 9l-6 6"/>
    </svg>
  ),
}

const SUBJECT_COLORS: Record<string, { active: string; icon: string }> = {
  Physics:   { active: 'bg-blue-950/60 border-blue-500 text-blue-300',    icon: 'text-blue-400'   },
  Chemistry: { active: 'bg-orange-950/40 border-orange-500 text-orange-300', icon: 'text-orange-400'},
  Maths:     { active: 'bg-purple-950/60 border-purple-500 text-purple-300', icon: 'text-purple-400'},
  Biology:   { active: 'bg-green-950/60 border-green-500 text-green-300',  icon: 'text-green-400'  },
}
const SUBJECT_COLORS_LIGHT: Record<string, { active: string; icon: string }> = {
  Physics:   { active: 'bg-blue-50 border-blue-500 text-blue-700',    icon: 'text-blue-500'    },
  Chemistry: { active: 'bg-orange-50 border-orange-500 text-orange-700', icon: 'text-orange-500' },
  Maths:     { active: 'bg-purple-50 border-purple-500 text-purple-700', icon: 'text-purple-500' },
  Biology:   { active: 'bg-green-50 border-green-500 text-green-700',  icon: 'text-green-500'   },
}

export function Step3Subjects({ isDark, value, onChange, config }: Props) {
  const subjects  = SUBJECTS_FOR_EXAM[config.examId ?? 'jee_main'] ?? ['Physics', 'Chemistry', 'Maths']
  const allSelected = value.length === subjects.length
  const toggleAll   = () => onChange(allSelected ? [] : [...subjects])
  const toggle      = (s: string) => onChange(value.includes(s) ? value.filter(v => v !== s) : [...value, s])

  const T = {
    label: isDark ? 'text-white' : 'text-[#0f172a]',
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
    idle:  isDark
      ? 'bg-[#0d1117] border-[#1e2538] text-slate-300 hover:border-[#2a3548]'
      : 'bg-white border-[#E5E7EB] text-gray-700 hover:border-gray-300',
  }

  return (
    <div className="px-5 py-5">
      <div className="flex items-center justify-between mb-4">
        <p className={`text-sm font-semibold ${T.label}`}>Select subject(s)</p>
        <button type="button" onClick={toggleAll} className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 transition-colors">
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {subjects.map(sub => {
          const active    = value.includes(sub)
          const colors    = isDark ? SUBJECT_COLORS[sub] : SUBJECT_COLORS_LIGHT[sub]
          const activeClass = colors?.active ?? (isDark ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300' : 'bg-indigo-50 border-indigo-500 text-indigo-700')
          const iconClass   = colors?.icon   ?? (isDark ? 'text-indigo-400' : 'text-indigo-500')

          return (
            <motion.button
              key={sub}
              whileTap={{ scale: 0.97 }}
              onClick={() => toggle(sub)}
              type="button"
              role="checkbox"
              aria-checked={active}
              className={`flex items-center gap-3 p-4 rounded-xl border transition-all duration-200 text-left ${
                active ? activeClass : T.idle
              }`}
            >
              <span className={`flex-shrink-0 ${active ? '' : (isDark ? 'text-slate-500' : 'text-gray-400')} ${active ? iconClass : ''}`}>
                {SUBJECT_ICONS[sub] ?? null}
              </span>
              <span className="text-sm font-semibold">{sub}</span>
              {active && <CheckCircle2 size={15} className={`ml-auto flex-shrink-0 ${iconClass}`} />}
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}
