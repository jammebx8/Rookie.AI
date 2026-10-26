'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { Clock } from 'lucide-react'
import { DURATION_OPTIONS } from '../types'

interface Props {
  isDark:   boolean
  value:    number | null
  onChange: (seconds: number) => void
}

export function Step5Duration({ isDark, value, onChange }: Props) {
  const T = {
    label: isDark ? 'text-white' : 'text-[#0f172a]',
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
    card: (active: boolean) => active
      ? (isDark
          ? 'bg-indigo-950/60 border-indigo-500 text-white ring-1 ring-indigo-500/40'
          : 'bg-indigo-50 border-indigo-500 text-indigo-700')
      : (isDark
          ? 'bg-[#0d1117] border-[#1e2538] text-slate-300 hover:border-[#2a3548]'
          : 'bg-white border-[#E5E7EB] text-gray-700 hover:border-gray-300'),
  }

  return (
    <div className="px-5 py-5">
      <p className={`text-sm font-semibold mb-4 ${T.label}`}>Select duration</p>

      <div className="grid grid-cols-3 gap-3">
        {DURATION_OPTIONS.map(opt => {
          const active = value === opt.seconds
          return (
            <motion.button
              key={opt.seconds}
              whileTap={{ scale: 0.96 }}
              onClick={() => onChange(opt.seconds)}
              type="button"
              role="radio"
              aria-checked={active}
              className={`flex flex-col items-center justify-center p-4 rounded-xl border transition-all duration-200 gap-1 ${T.card(active)}`}
            >
              <Clock size={16} className={active ? (isDark ? 'text-indigo-400' : 'text-indigo-600') : (isDark ? 'text-slate-500' : 'text-gray-400')} />
              <span className="text-sm font-semibold">{opt.label}</span>
              <span className={`text-[10px] ${active ? (isDark ? 'text-indigo-400' : 'text-indigo-500') : T.muted}`}>
                ~{opt.approxQuestions} Qs
              </span>
            </motion.button>
          )
        })}
      </div>

      {value && (
        <motion.div
          initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
          className={`mt-4 p-3 rounded-xl border ${isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-gray-50 border-gray-200'}`}
        >
          <p className={`text-xs ${T.muted}`}>
            Question count rule: 1 question per 90 seconds of duration, balanced across selected subjects.
            Max 120 questions per test.
          </p>
        </motion.div>
      )}
    </div>
  )
}
