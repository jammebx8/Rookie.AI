'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ClipboardList, Plus, Clock, CheckCircle2, XCircle, Minus, ChevronRight, RotateCcw, BookOpen, ChevronDown, Loader2, FlaskConical, Lock, UnlockIcon } from 'lucide-react'
import { supabase } from '../../../public/src/utils/supabase'
import type { TestAttemptRow } from '../../../features/tests/types'
import { WizardModal } from '../../../features/tests/WizardModal'
import { hasRookiePass, triggerCheckout } from '../../../lib/rookiePass'

// ─── PYQ mock test data ───────────────────────────────────────────────────────
interface PYQShift {
  exam_shift: string
  physics:    number
  chemistry:  number
  maths:      number
  total:      number
  dbTable:    'jee_mains' | 'jee_adv'
  durationSeconds: number
}

// The single free shift for non-pass users
const FREE_SHIFT = 'JEE Main 2024 (Online) 9th April Evening Shift'

const JEE_MAIN_SHIFTS: PYQShift[] = [
  { exam_shift: 'JEE Main 2024 (Online) 9th April Evening Shift',    physics: 30, chemistry: 30, maths: 30, total: 90, dbTable: 'jee_mains', durationSeconds: 10800 },
  { exam_shift: 'JEE Main 2024 (Online) 6th April Morning Shift',    physics: 30, chemistry: 30, maths: 30, total: 90, dbTable: 'jee_mains', durationSeconds: 10800 },
  { exam_shift: 'JEE Main 2024 (Online) 4th April Morning Shift',    physics: 30, chemistry: 30, maths: 30, total: 90, dbTable: 'jee_mains', durationSeconds: 10800 },
  { exam_shift: 'JEE Main 2023 (Online) 24th January Morning Shift', physics: 30, chemistry: 30, maths: 30, total: 90, dbTable: 'jee_mains', durationSeconds: 10800 },
  { exam_shift: 'JEE Main 2023 (Online) 1st February Morning Shift', physics: 30, chemistry: 30, maths: 30, total: 90, dbTable: 'jee_mains', durationSeconds: 10800 },
  { exam_shift: 'JEE Main 2023 (Online) 1st February Evening Shift', physics: 30, chemistry: 30, maths: 30, total: 90, dbTable: 'jee_mains', durationSeconds: 10800 },
  { exam_shift: 'JEE Main 2023 (Online) 11th April Morning Shift',   physics: 30, chemistry: 30, maths: 30, total: 90, dbTable: 'jee_mains', durationSeconds: 10800 },
  { exam_shift: 'JEE Main 2023 (Online) 11th April Evening Shift',   physics: 30, chemistry: 30, maths: 30, total: 90, dbTable: 'jee_mains', durationSeconds: 10800 },
  { exam_shift: 'JEE Main 2023 (Online) 13th April Morning Shift',   physics: 30, chemistry: 30, maths: 30, total: 90, dbTable: 'jee_mains', durationSeconds: 10800 },
  { exam_shift: 'JEE Main 2022 (Online) 24th June Morning Shift',    physics: 30, chemistry: 30, maths: 30, total: 90, dbTable: 'jee_mains', durationSeconds: 10800 },
  { exam_shift: 'JEE Main 2022 (Online) 29th June Evening Shift',    physics: 30, chemistry: 30, maths: 30, total: 90, dbTable: 'jee_mains', durationSeconds: 10800 },
  { exam_shift: 'JEE Main 2022 (Online) 25th July Morning Shift',    physics: 30, chemistry: 30, maths: 30, total: 90, dbTable: 'jee_mains', durationSeconds: 10800 },
  { exam_shift: 'JEE Main 2022 (Online) 26th July Morning Shift',    physics: 30, chemistry: 30, maths: 30, total: 90, dbTable: 'jee_mains', durationSeconds: 10800 },
  { exam_shift: 'JEE Main 2021 (Online) 26th February Morning Shift',physics: 30, chemistry: 30, maths: 30, total: 90, dbTable: 'jee_mains', durationSeconds: 10800 },
  { exam_shift: 'JEE Main 2021 (Online) 16th March Morning Shift',   physics: 30, chemistry: 30, maths: 30, total: 90, dbTable: 'jee_mains', durationSeconds: 10800 },
  { exam_shift: 'JEE Main 2021 (Online) 20th July Morning Shift',    physics: 30, chemistry: 30, maths: 30, total: 90, dbTable: 'jee_mains', durationSeconds: 10800 },
  { exam_shift: 'JEE Main 2021 (Online) 25th July Morning Shift',    physics: 30, chemistry: 30, maths: 30, total: 90, dbTable: 'jee_mains', durationSeconds: 10800 },
  { exam_shift: 'JEE Main 2021 (Online) 25th July Evening Shift',    physics: 30, chemistry: 30, maths: 30, total: 90, dbTable: 'jee_mains', durationSeconds: 10800 },
  { exam_shift: 'JEE Main 2021 (Online) 1st September Evening Shift',physics: 30, chemistry: 30, maths: 30, total: 90, dbTable: 'jee_mains', durationSeconds: 10800 },
]

const JEE_ADV_SHIFTS: PYQShift[] = [
  { exam_shift: 'JEE Advanced 2024 Paper 1 Online', physics: 17, chemistry: 17, maths: 17, total: 51, dbTable: 'jee_adv', durationSeconds: 10800 },
  { exam_shift: 'JEE Advanced 2023 Paper 1 Online', physics: 17, chemistry: 17, maths: 17, total: 51, dbTable: 'jee_adv', durationSeconds: 10800 },
]

type ExamFilter = 'JEE Main' | 'JEE Advanced'
const EXAM_OPTIONS: ExamFilter[] = ['JEE Main', 'JEE Advanced']

// Count custom tests created today (not PYQ)
function countCustomTestsToday(attempts: TestAttemptRow[]): number {
  const today = new Date().toDateString()
  return attempts.filter(a => {
    const config = a.config as unknown as Record<string, unknown>
    if (config?.isPyq) return false
    return new Date(a.created_at).toDateString() === today
  }).length
}

// ─── Theme hook ────────────────────────────────────────────────────────────────
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDur(seconds: number | null) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`
}

// ─── Skeleton ──────────────────────────────────────────────────────────────────
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

// ─── Score donut ───────────────────────────────────────────────────────────────
function ScoreDonut({ correct, incorrect, unattempted, isDark }: { correct: number; incorrect: number; unattempted: number; isDark: boolean }) {
  const total = correct + incorrect + unattempted || 1
  const r = 36, cx = 44, cy = 44, circ = 2 * Math.PI * r
  const cPct = correct / total, iPct = incorrect / total
  const cDash = circ * cPct, iDash = circ * iPct
  return (
    <svg width={88} height={88} viewBox="0 0 88 88" aria-hidden="true">
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={isDark ? '#1e2538' : '#e5e7eb'} strokeWidth={10} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={isDark ? '#334155' : '#cbd5e1'} strokeWidth={10}
        strokeDasharray={`${circ} ${circ}`} strokeDashoffset={-(circ * (cPct + iPct))} strokeLinecap="butt"
        style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#ef4444" strokeWidth={10}
        strokeDasharray={`${iDash} ${circ}`} strokeDashoffset={-(circ * cPct)} strokeLinecap="butt"
        style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#22c55e" strokeWidth={10}
        strokeDasharray={`${cDash} ${circ}`} strokeDashoffset={0} strokeLinecap="butt"
        style={{ transform: 'rotate(-90deg)', transformOrigin: `${cx}px ${cy}px` }} />
      <text x={cx} y={cy - 5} textAnchor="middle" fill={isDark ? '#f1f5f9' : '#0f172a'} fontSize={13} fontWeight={700}>{correct}</text>
      <text x={cx} y={cy + 11} textAnchor="middle" fill={isDark ? '#94a3b8' : '#64748b'} fontSize={9}>correct</text>
    </svg>
  )
}

// ─── Overall card ──────────────────────────────────────────────────────────────
function OverallCard({ attempts, isDark }: { attempts: TestAttemptRow[]; isDark: boolean }) {
  const submitted = attempts.filter(a => a.status === 'submitted')
  const tC = submitted.reduce((s, a) => s + (a.correct_count    ?? 0), 0)
  const tI = submitted.reduce((s, a) => s + (a.incorrect_count  ?? 0), 0)
  const tU = submitted.reduce((s, a) => s + (a.unattempted_count ?? 0), 0)
  const tS = submitted.reduce((s, a) => s + (a.score            ?? 0), 0)
  const mS = submitted.reduce((s, a) => s + (a.max_score        ?? 0), 0)
  const T = { card: isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]', muted: isDark ? 'text-slate-400' : 'text-slate-500', text: isDark ? 'text-white' : 'text-[#0f172a]' }
  const stats = [
    { label: 'Tests taken',  value: submitted.length, icon: <ClipboardList size={14} />, color: isDark ? '#818cf8' : '#4f46e5' },
    { label: 'Correct',      value: tC,               icon: <CheckCircle2  size={14} />, color: '#22c55e' },
    { label: 'Incorrect',    value: tI,               icon: <XCircle       size={14} />, color: '#ef4444' },
    { label: 'Not answered', value: tU,               icon: <Minus         size={14} />, color: isDark ? '#475569' : '#94a3b8' },
  ]
  return (
    <div className={`rounded-2xl border p-5 ${T.card}`}>
      <p className={`text-xs font-bold uppercase tracking-widest mb-4 ${T.muted}`}>Overall Analysis</p>
      <div className="flex items-center gap-5">
        {submitted.length > 0 && <ScoreDonut correct={tC} incorrect={tI} unattempted={tU} isDark={isDark} />}
        <div className="flex-1 grid grid-cols-2 gap-3">
          {stats.map(s => (
            <div key={s.label} className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1.5" style={{ color: s.color }}>{s.icon}<span className="text-xs font-medium" style={{ color: s.color }}>{s.label}</span></div>
              <span className={`text-xl font-extrabold tabular-nums ${T.text}`}>{s.value}</span>
            </div>
          ))}
        </div>
      </div>
      {mS > 0 && (
        <div className={`mt-4 pt-4 border-t flex items-center justify-between ${isDark ? 'border-[#1e2538]' : 'border-gray-100'}`}>
          <span className={`text-xs ${T.muted}`}>Cumulative score</span>
          <span className={`text-sm font-bold tabular-nums ${T.text}`}>{tS} / {mS}</span>
        </div>
      )}
    </div>
  )
}

// ─── Attempt row ───────────────────────────────────────────────────────────────
function AttemptRow({ attempt, isDark, onView }: { attempt: TestAttemptRow; isDark: boolean; onView: () => void }) {
  const T = {
    card:  isDark ? 'bg-[#0d1117] border-[#1e2538] hover:border-[#2a3548]' : 'bg-white border-[#E5E7EB] hover:border-gray-300',
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
    text:  isDark ? 'text-white' : 'text-[#0f172a]',
    badge: isDark ? 'bg-[#111827] text-slate-300' : 'bg-gray-100 text-slate-600',
  }
  const pct = attempt.max_score && attempt.max_score > 0 ? Math.round(((attempt.score ?? 0) / attempt.max_score) * 100) : null
  const scoreColor = pct === null ? T.muted : pct >= 70 ? 'text-emerald-500' : pct >= 40 ? 'text-amber-500' : 'text-rose-500'
  return (
    <motion.div whileHover={{ scale: 1.005 }} whileTap={{ scale: 0.998 }} onClick={onView}
      role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') onView() }}
      className={`flex items-center gap-4 p-4 rounded-2xl border cursor-pointer transition-all duration-200 ${T.card}`}
    >
      <div className="w-12 h-12 rounded-full border-2 flex items-center justify-center flex-shrink-0"
        style={{ borderColor: pct === null ? (isDark ? '#1e2538' : '#e5e7eb') : pct >= 70 ? '#22c55e' : pct >= 40 ? '#f59e0b' : '#ef4444' }}>
        {pct !== null ? <span className={`text-sm font-bold tabular-nums ${scoreColor}`}>{pct}%</span> : <span className={`text-xs ${T.muted}`}>—</span>}
      </div>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-semibold truncate ${T.text}`}>{attempt.title}</p>
        <div className={`flex items-center gap-2 mt-1 text-xs ${T.muted} flex-wrap`}>
          <span>{fmt(attempt.created_at)}</span>
          <span>·</span>
          <span className="flex items-center gap-1"><Clock size={11} />{fmtDur(attempt.time_taken_seconds ?? attempt.duration_seconds)}</span>
          {attempt.correct_count !== null && (<><span>·</span><span className="text-emerald-500 font-medium">{attempt.correct_count} correct</span></>)}
        </div>
      </div>
      <div className="hidden sm:flex items-center gap-1.5 flex-shrink-0">
        {(attempt.config?.subjects ?? []).slice(0, 2).map((s: string) => (
          <span key={s} className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${T.badge}`}>{s}</span>
        ))}
      </div>
      <ChevronRight size={16} className={T.muted} />
    </motion.div>
  )
}

// ─── Empty state ───────────────────────────────────────────────────────────────
function EmptyState({ isDark, onNew }: { isDark: boolean; onNew: () => void }) {
  const T = { muted: isDark ? 'text-slate-500' : 'text-slate-400', text: isDark ? 'text-white' : 'text-[#0f172a]', border: isDark ? 'border-[#1e2538]' : 'border-gray-200' }
  return (
    <div className={`flex flex-col items-center justify-center py-14 rounded-2xl border border-dashed text-center gap-3 ${T.border}`}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <rect x="8" y="6" width="32" height="36" rx="4" stroke={isDark ? '#334155' : '#cbd5e1'} strokeWidth="2"/>
        <rect x="16" y="3" width="16" height="6" rx="2" stroke={isDark ? '#334155' : '#cbd5e1'} strokeWidth="2"/>
        <path d="M16 22l4 4 8-8" stroke={isDark ? '#475569' : '#94a3b8'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <p className={`text-base font-semibold ${T.text}`}>No tests yet</p>
      <p className={`text-sm ${T.muted} max-w-xs`}>Build your first custom test from JEE PYQs and track your progress over time.</p>
      <motion.button whileTap={{ scale: 0.97 }} onClick={onNew}
        className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${isDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
        <Plus size={16} />Create your first test
      </motion.button>
    </div>
  )
}

// ─── PYQ Mock Section ──────────────────────────────────────────────────────────
function PYQMockSection({ isDark, attempts, onStarted }: { isDark: boolean; attempts: TestAttemptRow[]; onStarted: () => void }) {
  const router = useRouter()
  const [expanded,    setExpanded]    = useState(false)
  const [filterExam,  setFilterExam]  = useState<ExamFilter>('JEE Main')
  const [starting,    setStarting]    = useState<string | null>(null)
  const [hasPass,     setHasPass]     = useState<boolean | null>(null)
  const [payingFor,   setPayingFor]   = useState(false)

  // Check Rookie Pass on mount
  useEffect(() => {
    ;(async () => {
      try {
        const raw = localStorage.getItem('@user')
        if (!raw) { setHasPass(false); return }
        const { id } = JSON.parse(raw)
        const pass = await hasRookiePass(id)
        setHasPass(pass)
      } catch { setHasPass(false) }
    })()
  }, [])

  const T = {
    card:         isDark ? 'bg-[#0d1117] border-[#1e2538]'  : 'bg-white border-[#E5E7EB]',
    cardHover:    isDark ? 'hover:border-[#2a3548]'          : 'hover:border-gray-300',
    muted:        isDark ? 'text-slate-400'                  : 'text-slate-500',
    text:         isDark ? 'text-white'                      : 'text-[#0f172a]',
    shiftCard:    isDark ? 'bg-[#0a0f1a] border-[#1e2538] hover:border-white/70' : 'bg-gray-50 border-[#E5E7EB] hover:border-indigo-400',
    shiftLocked:  isDark ? 'bg-[#0a0f1a] border-[#1e2538] opacity-60'           : 'bg-gray-50 border-[#E5E7EB] opacity-60',
    badge:        isDark ? 'bg-[#111827] text-slate-400'     : 'bg-gray-100 text-slate-500',
    filterActive: isDark ? 'bg-white text-black border-white' : 'bg-[#0f172a] text-white border-[#0f172a]',
    filterIdle:   isDark ? 'bg-transparent text-slate-400 border-[#1e2538] hover:border-slate-500 hover:text-slate-200'
                         : 'bg-transparent text-slate-500 border-gray-200 hover:border-gray-400 hover:text-slate-700',
  }

  const shifts = filterExam === 'JEE Main' ? JEE_MAIN_SHIFTS : JEE_ADV_SHIFTS

  const isUnlocked = (shift: PYQShift) => hasPass || shift.exam_shift === FREE_SHIFT

  const handleStart = async (shift: PYQShift) => {
    // If locked, trigger Rookie Pass checkout
    if (!isUnlocked(shift)) {
      setPayingFor(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (!session) { alert('Please sign in to purchase.'); setPayingFor(false); return }
        const raw = localStorage.getItem('@user')
        const user = raw ? JSON.parse(raw) : null
        const { bustPassCache } = await import('../../../lib/rookiePass')
        await triggerCheckout({
          token:   session.access_token,
          userId:  session.user.id,
          email:   session.user.email,
          name:    user?.name ?? null,
          onSuccess: () => { bustPassCache(); setHasPass(true); setPayingFor(false) },
          onDismiss: () => setPayingFor(false),
          onError:   (msg) => { alert(msg); setPayingFor(false) },
        })
      } catch { setPayingFor(false) }
      return
    }

    setStarting(shift.exam_shift)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''
      const res = await fetch('/api/tests/create-pyq', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ examShift: shift.exam_shift, dbTable: shift.dbTable, title: shift.exam_shift, durationSeconds: shift.durationSeconds }),
      })
      if (!res.ok) { const e = await res.json(); throw new Error(e.error ?? 'Failed') }
      const { attemptId } = await res.json()
      onStarted()
      router.push(`/tests/${attemptId}`)
    } catch (err) {
      console.error('[PYQMock] start error:', err)
      alert('Could not start test. Please try again.')
    } finally {
      setStarting(null)
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38 }}
      className={`rounded-2xl border overflow-hidden transition-colors ${T.card}`}
    >
      {/* Collapsed header */}
      <button className="w-full text-left" onClick={() => setExpanded(p => !p)} aria-expanded={expanded}>
        <div className={`flex items-center justify-between gap-4 p-5 sm:p-6 transition-colors ${expanded ? '' : T.cardHover}`}>
          <div className="flex items-start gap-4">
            <div className={`hidden sm:flex w-14 h-14 rounded-2xl items-center justify-center flex-shrink-0 ${isDark ? 'bg-indigo-900/40' : 'bg-indigo-50'}`}>
              <FlaskConical size={28} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
            </div>
            <div>
              <p className={`text-[11px] font-bold uppercase tracking-widest mb-1 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>PYQ Mock Tests</p>
              <h2 className={`text-xl sm:text-2xl font-extrabold leading-tight ${T.text}`}>Practice Full Paper Mocks</h2>
              <p className={`text-sm mt-1 max-w-sm ${T.muted}`}>Attempt real JEE question papers — exact shifts, full duration.</p>
            </div>
          </div>
          <motion.div animate={{ rotate: expanded ? 180 : 0 }} transition={{ duration: 0.22 }} className="flex-shrink-0">
            <ChevronDown size={20} className={T.muted} />
          </motion.div>
        </div>
      </button>

      {/* Expanded */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.28, ease: 'easeInOut' }} className="overflow-hidden"
          >
            <div className={`border-t px-5 sm:px-6 pt-4 pb-6 ${isDark ? 'border-[#1e2538]' : 'border-gray-100'}`}>
              {/* Filter chips */}
              <motion.div 
                className="flex gap-2 overflow-x-auto pb-1 mb-5" style={{ scrollbarWidth: 'none' }}>
                {EXAM_OPTIONS.map(ex => (
                  <motion.button key={ex} onClick={() => setFilterExam(ex)} 
                    className={`flex-shrink-0 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-all duration-200 ${ex === filterExam ? T.filterActive : T.filterIdle}`}>
                    {ex}
                  </motion.button>
                ))}
              </motion.div>

              {/* Pass required hint (when no pass + viewing Advanced) */}
              {!hasPass && filterExam === 'JEE Advanced' && (
                <div className="mb-4 flex items-center gap-2.5 px-4 py-3 rounded-xl"
                  style={{ background: 'rgba(99,102,241,0.1)', border: '1px solid rgba(139,92,246,0.3)' }}>
                  <Lock size={14} className="text-indigo-400 flex-shrink-0" />
                  <p className="text-xs font-medium" style={{ color: 'rgba(196,181,253,0.8)' }}>
                    Rookie Pass required to unlock JEE Advanced mocks — ₹299/year
                  </p>
                </div>
              )}

              {/* Shift list */}
              <div className="space-y-2.5">
                {shifts.map((shift, i) => {
                  const isLoadingThis = starting === shift.exam_shift
                  const unlocked = isUnlocked(shift)
                  return (
                    <motion.button
                      key={shift.exam_shift}
                     
                    
                      disabled={isLoadingThis || payingFor}
                      onClick={() => handleStart(shift)}
                      className={`w-full text-left flex items-center gap-4 p-4 rounded-2xl border transition-all duration-200 ${unlocked ? T.shiftCard : T.shiftLocked} ${(starting || payingFor) && !isLoadingThis ? 'opacity-50' : ''}`}
                    >
                      {/* Green unlock / grey lock icon */}
                      <div className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center ${
                        unlocked
                          ? 'bg-emerald-500/15 border border-emerald-500/40'
                          : isDark ? 'bg-[#1e2538] border border-[#2a3548]' : 'bg-gray-100 border border-gray-200'
                      }`}>
                        {unlocked
                          ? <UnlockIcon size={16} className="text-emerald-400" />
                          : <Lock size={16} className={isDark ? 'text-slate-500' : 'text-gray-400'} />
                        }
                      </div>

                      {/* Full shift name + meta */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm font-semibold ${T.text} leading-snug`}>{shift.exam_shift}</p>
                        <div className={`flex items-center gap-3 mt-1 text-xs ${T.muted}`}>
                          <span className="flex items-center gap-1"><BookOpen size={11} />{shift.total} Questions</span>
                          <span>·</span>
                          <span className="flex items-center gap-1"><Clock size={11} />3 hrs</span>
                          {!unlocked && (
                            <span className="hidden sm:inline font-semibold" style={{ color: '#a78bfa' }}>· Rookie Pass</span>
                          )}
                        </div>
                      </div>

                      {/* CTA */}
                      <div className="flex-shrink-0">
                        {isLoadingThis || (payingFor && !unlocked) ? (
                          <Loader2 size={18} className="animate-spin text-indigo-400" />
                        ) : unlocked ? (
                          <div className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl ${isDark ? 'bg-emerald-500/15 text-emerald-400' : 'bg-emerald-50 text-emerald-700'}`}>
                            Start <ChevronRight size={13} />
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl"
                            style={{ background: 'rgba(99,102,241,0.15)', color: '#a78bfa' }}>
                            Unlock
                          </div>
                        )}
                      </div>
                    </motion.button>
                  )
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

// ─── Hero card (custom test) ───────────────────────────────────────────────────
function HeroCard({ isDark, onNew, attempts }: { isDark: boolean; onNew: () => void; attempts: TestAttemptRow[] }) {
  const [hasPass,    setHasPass]    = useState<boolean | null>(null)
  const customToday = countCustomTestsToday(attempts)
  const FREE_LIMIT  = 1

  useEffect(() => {
    ;(async () => {
      try {
        const raw = localStorage.getItem('@user')
        if (!raw) { setHasPass(false); return }
        const { id } = JSON.parse(raw)
        const pass = await hasRookiePass(id)
        setHasPass(pass)
      } catch { setHasPass(false) }
    })()
  }, [])

  const canCreate = hasPass || customToday < FREE_LIMIT
  const limitReached = !hasPass && customToday >= FREE_LIMIT

  const T = {
    card: isDark
      ? 'bg-gradient-to-br from-indigo-950 via-[#0d1117] to-[#0d1117] border-indigo-900/50'
      : 'bg-gradient-to-br from-indigo-50 to-white border-indigo-200',
  }

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
      className={`rounded-2xl border p-5 sm:p-6 relative overflow-hidden ${T.card}`}
    >
      <div className="absolute -top-10 -right-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <h2 className={`text-xl sm:text-2xl font-extrabold mb-2 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
              Create Your Own Test
            </h2>
            <p className={`text-sm mb-4 max-w-sm ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              Pick any year, subject and chapter from JEE PYQs. Set your duration and go.
            </p>

            {limitReached ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'rgba(251,191,36,0.1)', border: '1px solid rgba(251,191,36,0.3)' }}>
                  <Lock size={13} className="text-amber-400 flex-shrink-0" />
                  <p className="text-xs font-medium text-amber-300">Free limit: 1 custom test per day. Upgrade to create unlimited.</p>
                </div>
                <motion.button whileTap={{ scale: 0.97 }} onClick={onNew}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all opacity-40 cursor-not-allowed bg-white text-black"
                  disabled>
                  <Plus size={16} />Build a Test
                </motion.button>
              </div>
            ) : (
              <motion.button whileTap={{ scale: 0.97 }} onClick={canCreate ? onNew : undefined}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${isDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-gray-800'}`}>
                <Plus size={16} />Build a Test
               
              </motion.button>
            )}
          </div>
          <div className={`hidden sm:flex w-20 h-20 rounded-2xl items-center justify-center flex-shrink-0 ${isDark ? 'bg-indigo-900/40' : 'bg-indigo-100'}`}>
            <ClipboardList size={40} className={isDark ? 'text-indigo-400' : 'text-indigo-600'} />
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function TestsPage() {
  const isDark  = useTheme()
  const router  = useRouter()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [attempts,   setAttempts]   = useState<TestAttemptRow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [userId,     setUserId]     = useState<string | null>(null)

  const T = { page: isDark ? 'bg-[#07090f] text-white' : 'bg-[#F0F2FA] text-[#0f172a]', muted: isDark ? 'text-slate-400' : 'text-slate-500' }

  const loadAttempts = useCallback(async (uid: string) => {
    setLoading(true)
    const { data } = await supabase.from('test_attempts').select('*').eq('user_id', uid).order('created_at', { ascending: false }).limit(50)
    setAttempts((data ?? []) as TestAttemptRow[])
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) { setUserId(user.id); loadAttempts(user.id) }
      else setLoading(false)
    })
  }, [loadAttempts])

  const handleTestCreated = useCallback(() => { if (userId) loadAttempts(userId) }, [userId, loadAttempts])

  const handleView = (attempt: TestAttemptRow) => {
    if (attempt.status === 'in_progress') router.push(`/tests/${attempt.id}`)
    else router.push(`/tests/${attempt.id}/result`)
  }

  const inProgress = attempts.filter(a => a.status === 'in_progress')
  const submitted  = attempts.filter(a => a.status === 'submitted')

  return (
    <main className={`min-h-screen ${T.page} transition-colors duration-300`}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-40">
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mb-5">
          <h1 className={`text-2xl sm:text-3xl font-bold tracking-tight ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>Tests</h1>
          <p className={`text-sm mt-1 ${T.muted}`}>Build and take custom tests from JEE PYQs</p>
        </motion.div>

        <PYQMockSection isDark={isDark} attempts={attempts} onStarted={handleTestCreated} />

        <div className="mt-4">
          <HeroCard isDark={isDark} onNew={() => setWizardOpen(true)} attempts={attempts} />
        </div>

        <AnimatePresence>
          {inProgress.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <RotateCcw size={14} className="text-amber-500" />
                <p className={`text-sm font-bold ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>Resume in progress</p>
              </div>
              <div className="space-y-2">
                {inProgress.map(a => <AttemptRow key={a.id} attempt={a} isDark={isDark} onView={() => handleView(a)} />)}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {submitted.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }} className="mt-6">
            <OverallCard attempts={attempts} isDark={isDark} />
          </motion.div>
        )}

        <div className="mt-6">
          <p className={`text-sm font-bold mb-3 ${isDark ? 'text-white' : 'text-[#0f172a]'}`}>
            Previous tests
            {submitted.length > 0 && <span className={`ml-2 text-xs font-normal ${T.muted}`}>({submitted.length})</span>}
          </p>
          {loading ? <Skeleton isDark={isDark} /> : submitted.length === 0 ? (
            <EmptyState isDark={isDark} onNew={() => setWizardOpen(true)} />
          ) : (
            <div className="space-y-2">
              {submitted.map((a, i) => (
                <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}>
                  <AttemptRow attempt={a} isDark={isDark} onView={() => handleView(a)} />
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {wizardOpen && <WizardModal isDark={isDark} onClose={() => setWizardOpen(false)} onTestCreated={handleTestCreated} />}
      </AnimatePresence>
    </main>
  )
}
