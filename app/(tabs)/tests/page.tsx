'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, Plus, Clock, CheckCircle2, XCircle, Minus, ChevronRight, RotateCcw } from 'lucide-react'
import { supabase } from '../../../public/src/utils/supabase'
import type { TestAttemptRow } from '../../../features/tests/types'
import { WizardModal } from '../../../features/tests/WizardModal'

// ─── Theme hook (matches rest of app) ────────────────────────────────────────
function useTheme() {
  const [isDark, setIsDark] = useState(true)
  useEffect(() => {
    try { setIsDark(localStorage.getItem('theme') !== 'light') } catch {}
    const ob = new MutationObserver(() => {
      try { setIsDark(localStorage.getItem('theme') !== 'light') } catch {}
    })
    ob.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    const fn = () => { try { setIsDark(localStorage.getItem('theme') !== 'light') } catch {} }
    window.addEventListener('storage', fn)
    return () => { ob.disconnect(); window.removeEventListener('storage', fn) }
  }, [])
  return isDark
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDur(seconds: number | null) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────
function Skeleton({ isDark }: { isDark: boolean }) {
  const base = isDark ? 'bg-[#1e2538]' : 'bg-gray-200'
  return (
    <div className="space-y-3 animate-pulse">
      {[1, 2, 3].map(i => (
        <div key={i} className={`h-20 rounded-2xl ${base}`} />
      ))}
    </div>
  )
}

// ─── Score donut ──────────────────────────────────────────────────────────────
function ScoreDonut({
  correct, incorrect, unattempted, isDark,
}: { correct: number; incorrect: number; unattempted: number; isDark: boolean }) {
  const total = correct + incorrect + unattempted || 1
  const r = 36, cx = 44, cy = 44
  const circ = 2 * Math.PI * r

  const correctPct    = correct    / total
  const incorrectPct  = incorrect  / total

  const correctDash   = circ * correctPct
  const incorrectDash = circ * incorrectPct

  const correctOffset   = 0
  const incorrectOffset = -(circ * correctPct)
  const unattemptedOffset = -(circ * (correctPct + incorrectPct))

  return (
    <svg width={88} height={88} viewBox="0 0 88 88" aria-hidden="true">
      {/* track */}
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={isDark ? '#1e2538' : '#e5e7eb'} strokeWidth={10} />
      {/* un-attempted */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke={isDark ? '#334155' : '#cbd5e1'} strokeWidth={10}
        strokeDasharray={`${circ} ${circ}`}
        strokeDashoffset={unattemptedOffset}
        strokeLinecap="butt"
        style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
      />
      {/* incorrect */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="#ef4444" strokeWidth={10}
        strokeDasharray={`${incorrectDash} ${circ}`}
        strokeDashoffset={incorrectOffset}
        strokeLinecap="butt"
        style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
      />
      {/* correct */}
      <circle cx={cx} cy={cy} r={r} fill="none"
        stroke="#22c55e" strokeWidth={10}
        strokeDasharray={`${correctDash} ${circ}`}
        strokeDashoffset={correctOffset}
        strokeLinecap="butt"
        style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }}
      />
      <text x={cx} y={cy - 5} textAnchor="middle" fill={isDark ? '#f1f5f9' : '#0f172a'} fontSize={13} fontWeight={700}>
        {correct}
      </text>
      <text x={cx} y={cy + 11} textAnchor="middle" fill={isDark ? '#94a3b8' : '#64748b'} fontSize={9}>
        correct
      </text>
    </svg>
  )
}

// ─── Overall analytics card ───────────────────────────────────────────────────
function OverallCard({
  attempts, isDark,
}: { attempts: TestAttemptRow[]; isDark: boolean }) {
  const submitted = attempts.filter(a => a.status === 'submitted')
  const totalCorrect    = submitted.reduce((s, a) => s + (a.correct_count    ?? 0), 0)
  const totalIncorrect  = submitted.reduce((s, a) => s + (a.incorrect_count  ?? 0), 0)
  const totalUnattempted= submitted.reduce((s, a) => s + (a.unattempted_count ?? 0), 0)
  const totalScore      = submitted.reduce((s, a) => s + (a.score            ?? 0), 0)
  const maxScore        = submitted.reduce((s, a) => s + (a.max_score        ?? 0), 0)

  const T = {
    card:  isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]',
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
    text:  isDark ? 'text-white' : 'text-[#0f172a]',
  }

  const stats = [
    { label: 'Tests taken',   value: submitted.length,   icon: <ClipboardList size={14} />, color: isDark ? '#818cf8' : '#4f46e5' },
    { label: 'Correct',       value: totalCorrect,       icon: <CheckCircle2  size={14} />, color: '#22c55e' },
    { label: 'Incorrect',     value: totalIncorrect,     icon: <XCircle       size={14} />, color: '#ef4444' },
    { label: 'Not answered',  value: totalUnattempted,   icon: <Minus         size={14} />, color: isDark ? '#475569' : '#94a3b8' },
  ]

  return (
    <div className={`rounded-2xl border p-5 ${T.card}`}>
      <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${T.muted}`}>Overall Analysis</p>
      <div className="flex items-center gap-5">
        {submitted.length > 0 && (
          <ScoreDonut correct={totalCorrect} incorrect={totalIncorrect} unattempted={totalUnattempted} isDark={isDark} />
        )}
        <div className="flex-1 grid grid-cols-2 gap-3">
          {stats.map(s => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5" style={{ color: s.color }}>
                {s.icon}
                <span className="text-xs font-medium" style={{ color: s.color }}>{s.label}</span>
              </div>
              <span className={`text-xl font-extrabold tabular-nums ${T.text}`}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
      {maxScore > 0 && (
        <div className={`mt-4 pt-4 border-t flex items-center justify-between ${isDark ? 'border-[#1e2538]' : 'border-gray-100'}`}>
          <span className={`text-xs ${T.muted}`}>Cumulative score</span>
          <span className={`text-sm font-bold tabular-nums ${T.text}`}>
            {totalScore} / {maxScore}
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Past attempt row ─────────────────────────────────────────────────────────
function AttemptRow({
  attempt, isDark, onView,
}: { attempt: TestAttemptRow; isDark: boolean; onView: () => void }) {
  const T = {
    card:    isDark ? 'bg-[#0d1117] border-[#1e2538] hover:border-[#2a3548]' : 'bg-white border-[#E5E7EB] hover:border-gray-300',
    muted:   isDark ? 'text-slate-400' : 'text-slate-500',
    text:    isDark ? 'text-white' : 'text-[#0f172a]',
    badge:   isDark ? 'bg-[#111827] text-slate-300' : 'bg-gray-100 text-slate-600',
  }

  const pct = attempt.max_score && attempt.max_score > 0
    ? Math.round(((attempt.score ?? 0) / attempt.max_score) * 100)
    : null

  const scoreColor = pct === null ? T.muted
    : pct >= 70 ? 'text-emerald-500'
    : pct >= 40 ? 'text-amber-500'
    : 'text-rose-500'

  return (
    <motion.div
      whileHover={{ scale: 1.005 }}
      whileTap={{ scale: 0.998 }}
      onClick={onView}
      role="button"
      tabIndex={0}
      onKeyDown={e => { if (e.key === 'Enter') onView() }}
      aria-label={`View result for ${attempt.title}`}
      className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${T.card}`}
    >
      {/* Score circle */}
      <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0"
        style={{ borderColor: pct === null ? (isDark ? '#1e2538' : '#e5e7eb') : pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444' }}
      >
        {pct !== null
          ? <span className={`text-sm font-bold tabular-nums ${scoreColor}`}>{pct}%</span>
          : <span className={`text-xs ${T.muted}`}>—</span>
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${T.text}`}>{attempt.title}</p>
        <div className={`flex items-center gap-2 mt-1 text-xs ${T.muted} flex-wrap`}>
          <span>{fmt(attempt.created_at)}</span>
          <span>·</span>
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {fmtDur(attempt.time_taken_seconds ?? attempt.duration_seconds)}
          </span>
          {attempt.correct_count !== null && (
            <>
              <span>·</span>
              <span className="text-emerald-500 font-medium">{attempt.correct_count} correct</span>
            </>
          )}
        </div>
      </div>

      {/* Config pills */}
      <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
        {(attempt.config?.subjects ?? []).slice(0, 2).map((s: string) => (
          <span key={s} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${T.badge}`}>{s}</span>
        ))}
      </div>

      <ChevronRight size={16} className={T.muted} />
    </motion.div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────
function EmptyState({ isDark, onNew }: { isDark: boolean; onNew: () => void }) {
  const T = {
    muted: isDark ? 'text-slate-500' : 'text-slate-400',
    text:  isDark ? 'text-white' : 'text-[#0f172a]',
    border:isDark ? 'border-[#1e2538]' : 'border-gray-200',
  }
  return (
    <div className={`flex flex-col items-center justify-center py-14 rounded-2xl border border-dashed text-center gap-3 ${T.border}`}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none" aria-hidden="true">
        <rect x="8" y="6" width="32" height="36" rx="4" stroke={isDark ? '#334155' : '#cbd5e1'} strokeWidth="2"/>
        <rect x="16" y="3" width="16" height="6" rx="2" stroke={isDark ? '#334155' : '#cbd5e1'} strokeWidth="2"/>
        <path d="M16 22l4 4 8-8" stroke={isDark ? '#475569' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <p className={`text-base font-semibold ${T.text}`}>No tests yet</p>
      <p className={`text-sm ${T.muted} max-w-xs`}>
        Build your first custom test from JEE PYQs and track your progress over time.
      </p>
      <motion.button
  whileTap={{ scale: 0.97 }}
  onClick={onNew}
  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex-shrink-0 ${
    isDark
      ? 'bg-white text-black hover:bg-gray-100'
      : 'bg-gray-900 text-white hover:bg-gray-800'
  }`}
>
  <Plus size={16} />
  Create your first test
</motion.button>
    </div>
  )
}

// ─── Hero card ────────────────────────────────────────────────────────────────
function HeroCard({ isDark, onNew }: { isDark: boolean; onNew: () => void }) {
  const T = {
    card: isDark
      ? 'bg-gradient-to-br from-indigo-950 via-[#0d1117] to-[#0d1117] border-indigo-900/50'
      : 'bg-gradient-to-br from-indigo-50 to-white border-indigo-200',
  }
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className={`rounded-2xl border p-5 sm:p-6 relative overflow-hidden ${T.card}`}
    >
      {/* Decorative glow */}
      <div className="absolute -top-10 -right-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
          
            <h2 className={`text-xl sm:text-2xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
              Create Your Own Test
            </h2>
            <p className={`text-sm mb-5 max-w-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Pick any year, subject and chapter from 10,000+ PYQs. Set your duration and go.
            </p>
            <motion.button
  whileTap={{ scale: 0.97 }}
  onClick={onNew}
  className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex-shrink-0 ${
    isDark
      ? 'bg-white text-black hover:bg-gray-100'
      : 'bg-gray-900 text-white hover:bg-gray-800'
  }`}
>
  <Plus size={16} />
  Build a Test
</motion.button>
          </div>

          {/* Clipboard illustration */}
          <div className={`hidden sm:flex w-20 h-20 rounded-2xl items-center justify-center flex-shrink-0 ${isDark ? 'bg-indigo-900/40' : 'bg-indigo-100'}`}>
            <ClipboardList size={40} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function TestsPage() {
  const isDark  = useTheme()
  const router  = useRouter()
  const [wizardOpen, setWizardOpen]     = useState(false)
  const [attempts, setAttempts]         = useState<TestAttemptRow[]>([])
  const [loading, setLoading]           = useState(true)
  const [userId, setUserId]             = useState<string | null>(null)

  const T = {
    page:  isDark ? 'bg-[#07090f] text-white' : 'bg-[#F0F2FA] text-[#0f172a]',
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
  }

  const loadAttempts = useCallback(async (uid: string) => {
    setLoading(true)
    const { data } = await supabase
      .from('test_attempts')
      .select('*')
      .eq('user_id', uid)
      .order('created_at', { ascending: false })
      .limit(50)
    setAttempts((data ?? []) as TestAttemptRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id)
        loadAttempts(user.id)
      } else {
        setLoading(false)
      }
    })
  }, [loadAttempts])

  const handleTestCreated = useCallback(() => {
    if (userId) loadAttempts(userId)
  }, [userId, loadAttempts])

  const handleView = (attempt: TestAttemptRow) => {
    if (attempt.status === 'in_progress') {
      router.push(`/tests/${attempt.id}`)
    } else {
      router.push(`/tests/${attempt.id}/result`)
    }
  }

  const inProgress = attempts.filter(a => a.status === 'in_progress')
  const submitted  = attempts.filter(a => a.status === 'submitted')

  return (
    <main className={`min-h-screen ${T.page} transition-colors duration-300`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-40">

        {/* Page heading */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mb-5">
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-[#0f172a]'}`}
            style={{ fontFamily: "'Sora', sans-serif" }}>
            Tests
          </h1>
          <p className={`text-sm mt-1 ${T.muted}`}>Build and take custom tests from JEE PYQs</p>
        </motion.div>

        {/* Hero */}
        <HeroCard isDark={isDark} onNew={() => setWizardOpen(true)} />

        {/* Resume in-progress */}
        <AnimatePresence>
          {inProgress.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mt-6"
            >
              <div className="flex items-center gap-2 mb-3">
                <RotateCcw size={14} className="text-amber-500" />
                <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
                  Resume in progress
                </p>
              </div>
              <div className="space-y-2">
                {inProgress.map(a => (
                  <AttemptRow key={a.id} attempt={a} isDark={isDark} onView={() => handleView(a)} />
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overall analytics */}
        {submitted.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}
            className="mt-6"
          >
            <OverallCard attempts={attempts} isDark={isDark} />
          </motion.div>
        )}

        {/* Past tests list */}
        <div className="mt-6">
          <p className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
            Past tests
            {submitted.length > 0 && <span className={`ml-2 text-xs font-normal ${T.muted}`}>({submitted.length})</span>}
          </p>

          {loading ? (
            <Skeleton isDark={isDark} />
          ) : submitted.length === 0 ? (
            <EmptyState isDark={isDark} onNew={() => setWizardOpen(true)} />
          ) : (
            <div className="space-y-2">
              {submitted.map((a, i) => (
                <motion.div
                  key={a.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                >
                  <AttemptRow attempt={a} isDark={isDark} onView={() => handleView(a)} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Wizard */}
      <AnimatePresence>
        {wizardOpen && (
          <WizardModal
            isDark={isDark}
            onClose={() => setWizardOpen(false)}
            onTestCreated={handleTestCreated}
          />
        )}
      </AnimatePresence>
    </main>
  )
}
