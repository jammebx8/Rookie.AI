'use client'
// ─── features/tests/TestHeader.tsx ───────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { ClipboardList } from 'lucide-react'

interface Props {
  title:          string
  expiresAt:      string | null   // ISO string — server deadline
  durationSeconds:number
  isDark:         boolean
  onSubmit:       () => void
}

function pad(n: number) { return String(n).padStart(2, '0') }

export function TestHeader({ title, expiresAt, durationSeconds, isDark, onSubmit }: Props) {
  const [remaining, setRemaining] = useState<number>(durationSeconds)
  const announcedRef              = useRef<Set<number>>(new Set())
  const autoSubmittedRef          = useRef(false)

  // Compute remaining from server deadline so a page refresh doesn't reset it
  useEffect(() => {
    const tick = () => {
      if (expiresAt) {
        const diff = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000))
        setRemaining(diff)
        if (diff === 0 && !autoSubmittedRef.current) {
          autoSubmittedRef.current = true
          onSubmit()
        }
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt, onSubmit])

  // ARIA live announcements at 5 min and 1 min (once each)
  useEffect(() => {
    if (remaining === 300 && !announcedRef.current.has(300)) {
      announcedRef.current.add(300)
    }
    if (remaining === 60 && !announcedRef.current.has(60)) {
      announcedRef.current.add(60)
    }
  }, [remaining])

  const h   = Math.floor(remaining / 3600)
  const m   = Math.floor((remaining % 3600) / 60)
  const s   = remaining % 60
  const isLow = remaining <= 300   // last 5 minutes

  const T = {
    bg:    isDark ? 'bg-[#07090f] border-[#1e2538]' : 'bg-white border-[#E5E7EB]',
    text:  isDark ? 'text-white' : 'text-[#0f172a]',
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
    timer: isLow
      ? 'border-rose-500 text-rose-500'
      : (isDark ? 'border-[#1e2538] text-white' : 'border-gray-300 text-[#0f172a]'),
  }

  return (
    <header className={`sticky top-0 z-30 border-b px-4 sm:px-6 h-14 flex items-center justify-between gap-4 ${T.bg} transition-colors`}>
      {/* Title */}
      <div className="flex items-center gap-2.5 min-w-0">
        <ClipboardList size={18} className={isDark ? 'text-indigo-400 flex-shrink-0' : 'text-indigo-600 flex-shrink-0'} />
        <span className={`text-sm font-bold truncate ${T.text}`}>{title}</span>
      </div>

      {/* Timer + Submit */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Timer */}
        <motion.div
          role="timer"
          aria-label={`Time remaining: ${h > 0 ? `${h} hours ` : ''}${m} minutes ${s} seconds`}
          aria-live="off"
          className={`flex items-center gap-0.5 px-3 py-1.5 rounded-xl border text-sm font-mono font-bold tabular-nums transition-colors ${T.timer}`}
          animate={isLow && remaining % 2 === 0 ? { opacity: 0.7 } : { opacity: 1 }}
          transition={{ duration: 0.3 }}
        >
          {h > 0 && <><span>{pad(h)}</span><span className="opacity-40 mx-0.5">:</span></>}
          <span>{pad(m)}</span>
          <span className="opacity-40 mx-0.5">:</span>
          <span>{pad(s)}</span>
        </motion.div>

        {/* Hidden aria-live region for 5min/1min announcements */}
        <span aria-live="assertive" className="sr-only">
          {remaining === 300 ? 'Five minutes remaining' : remaining === 60 ? 'One minute remaining' : ''}
        </span>

        {/* Submit */}
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={onSubmit}
          className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold transition-colors"
          aria-label="Submit test"
        >
          Submit Test
        </motion.button>
      </div>
    </header>
  )
}
