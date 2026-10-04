'use client'
import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { supabase } from '../../../public/src/utils/supabase'
import type { YearRow } from '../types'

interface Props {
  isDark:   boolean
  value:    string[]
  onChange: (years: string[]) => void
}

function Chip({
  label, sub, active, isDark, onClick,
}: { label: string; sub?: string; active: boolean; isDark: boolean; onClick: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      type="button"
      role="checkbox"
      aria-checked={active}
      className={`flex flex-col items-center justify-center p-3 rounded-xl border text-sm font-semibold transition-all duration-200 ${
        active
          ? isDark
            ? 'bg-indigo-950/60 border-indigo-500 text-indigo-300 ring-1 ring-indigo-500/40'
            : 'bg-indigo-50 border-indigo-500 text-indigo-700'
          : isDark
            ? 'bg-[#0d1117] border-[#1e2538] text-slate-300 hover:border-[#2a3548]'
            : 'bg-white border-[#E5E7EB] text-gray-700 hover:border-gray-300'
      }`}
    >
      <span>{label}</span>
      {sub && <span className={`text-[10px] mt-0.5 font-normal ${active ? '' : (isDark ? 'text-slate-500' : 'text-gray-400')}`}>{sub}</span>}
    </motion.button>
  )
}

export function Step2Years({ isDark, value, onChange }: Props) {
  const [years, setYears]   = useState<YearRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.rpc('get_test_years').then(({ data }) => {
      setYears((data ?? []) as YearRow[])
      setLoading(false)
    })
  }, [])

  const toggle = (y: string) => {
    onChange(value.includes(y) ? value.filter(v => v !== y) : [...value, y])
  }
  const allSelected = years.length > 0 && value.length === years.length
  const toggleAll   = () => onChange(allSelected ? [] : years.map(y => y.year))

  const T = {
    label: isDark ? 'text-white' : 'text-[#0f172a]',
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
    skel:  isDark ? 'bg-[#1e2538]' : 'bg-gray-200',
  }

  return (
    <div className="px-5 py-5">
      <div className="flex items-center justify-between mb-4">
        <p className={`text-sm font-semibold ${T.label}`}>Select year(s)</p>
        <button
          type="button"
          onClick={toggleAll}
          className="text-xs font-semibold text-indigo-500 hover:text-indigo-400 transition-colors"
        >
          {allSelected ? 'Deselect All' : 'Select All'}
        </button>
      </div>

      {loading ? (
        <div className="grid grid-cols-3 gap-2 animate-pulse">
          {[1,2,3,4,5,6].map(i => <div key={i} className={`h-14 rounded-xl ${T.skel}`} />)}
        </div>
      ) : years.length === 0 ? (
        <p className={`text-sm ${T.muted}`}>No year data available.</p>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {years.map(y => (
            <Chip
              key={y.year}
              label={y.year}
              sub={`${y.questionCount} Qs`}
              active={value.includes(y.year)}
              isDark={isDark}
              onClick={() => toggle(y.year)}
            />
          ))}
        </div>
      )}

      {value.length > 0 && (
        <p className={`text-xs mt-3 ${T.muted}`}>
          {value.length} year{value.length > 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  )
}
