'use client'
import React from 'react'
import { motion } from 'framer-motion'
import { CheckCircle2, Lock } from 'lucide-react'
import { EXAM_OPTIONS } from '../types'
import type { TestConfig } from '../types'

interface Props {
  isDark:   boolean
  value:    TestConfig['examId']
  onChange: (id: TestConfig['examId']) => void
}

export function Step1Exam({ isDark, value, onChange }: Props) {
  const T = {
    label: isDark ? 'text-white' : 'text-[#0f172a]',
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
    card:  (active: boolean, available: boolean) => {
      if (!available)
        return isDark
          ? 'bg-[#0a0e18] border-[#1e2538] opacity-50 cursor-not-allowed'
          : 'bg-gray-50 border-gray-200 opacity-50 cursor-not-allowed'
      if (active)
        return isDark
          ? 'bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500/50'
          : 'bg-indigo-50 border-indigo-500'
      return isDark
        ? 'bg-[#0d1117] border-[#1e2538] hover:border-[#2a3548] cursor-pointer'
        : 'bg-white border-[#E5E7EB] hover:border-gray-300 cursor-pointer'
    },
  }

  return (
    <div className="px-5 py-5">
      <p className={`text-sm font-semibold mb-4 ${T.label}`}>Select exam type</p>
      <div className="space-y-3">
        {EXAM_OPTIONS.map(exam => {
          const active = value === exam.id
          return (
            <motion.div
              key={exam.id}
              whileTap={exam.available ? { scale: 0.98 } : {}}
              onClick={() => exam.available && onChange(exam.id)}
              role="radio"
              aria-checked={active}
              aria-disabled={!exam.available}
              tabIndex={exam.available ? 0 : -1}
              onKeyDown={e => { if (exam.available && (e.key === 'Enter' || e.key === ' ')) onChange(exam.id) }}
              className={`flex items-center justify-between p-4 rounded-xl border transition-all duration-200 ${T.card(active, exam.available)}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-xs font-bold ${
                  active
                    ? 'bg-indigo-600 text-white'
                    : isDark ? 'bg-[#1e2538] text-slate-400' : 'bg-gray-100 text-gray-500'
                }`}>
                  {exam.label.split(' ').map(w => w[0]).join('').slice(0, 3)}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${T.label}`}>{exam.label}</p>
                  <p className={`text-xs ${T.muted}`}>{exam.description}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {!exam.available && (
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                    isDark ? 'bg-[#1e2538] text-slate-500' : 'bg-gray-100 text-gray-400'
                  }`}>
                    Coming soon
                  </span>
                )}
                {!exam.available
                  ? <Lock size={14} className={isDark ? 'text-slate-600' : 'text-gray-300'} />
                  : active
                    ? <CheckCircle2 size={18} className="text-indigo-500" />
                    : <div className={`w-4 h-4 rounded-full border-2 ${isDark ? 'border-[#2a3548]' : 'border-gray-300'}`} />
                }
              </div>
            </motion.div>
          )
        })}
      </div>

      <div className={`mt-5 p-3 rounded-xl border ${isDark ? 'bg-amber-950/20 border-amber-900/40' : 'bg-amber-50 border-amber-200'}`}>
        <p className={`text-xs ${isDark ? 'text-amber-400' : 'text-amber-700'}`}>
          Currently only JEE Main questions are available. JEE Advanced and NEET will be added soon.
        </p>
      </div>
    </div>
  )
}
