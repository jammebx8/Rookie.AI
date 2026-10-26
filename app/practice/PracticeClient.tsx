'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiChevronLeft, FiBookmark, FiSmile,
  FiX, FiZoomIn, FiCheck, FiArrowRight,
} from 'react-icons/fi'
import { IoTimeOutline, IoBookmark } from 'react-icons/io5'
import { supabase } from '../../public/src/utils/supabase'
import 'katex/dist/katex.min.css'
import { renderContent } from '../components/renderContent'
import { updateStreak, readStreakFromLocal } from '../../public/src/utils/streakUtils'
import { AI_BUDDIES, type Question } from '../QuestionViewer/QuestionViewerClient'
import { getWeakTopics, abilityLabel, updateAbilityVector, type WeakChapter } from '../../lib/recommendation'
import { track, startSolutionTimer, trackSessionStart, trackSessionEnd } from '../../lib/analytics'
import {
  fetchAdaptive,
  targetDifficulty,
  questionDifficulty,
  computeXP,
  addXP,
  readXP,
  checkStreakGate,
  autoBookmarkWrong,
  loadSurvey,
  shouldShowSurvey,
  saveSurvey,
  ALL_SURVEY_CHAPTERS,
  type XPState,
} from '../../lib/adaptivePractice'

// ─── Constants ───────────────────────────────────────────────────────────────
const API_BASE      = 'https://rookie-backend.vercel.app'
const BOOKMARKS_KEY = 'bookmarkedQuestions'
const AI_SOL_CACHE  = 'aiSolutionCache_v1'
const DB_TABLE      = 'jee_mains'
const DEFAULT_BUDDY = '4'

// ─── Types ───────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info' | 'coin' | 'bookmark'
interface ToastItem { id: number; message: string; type: ToastType }

interface SessionResult {
  question_id: string
  correct: boolean
  chapter: string
  subject: string
}

// ─── useTheme ─────────────────────────────────────────────────────────────────
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

// ─── Toast ────────────────────────────────────────────────────────────────────
function Toast({ toast }: { toast: ToastItem }) {
  const icons: Record<ToastType, string> = { success:'✓', error:'✗', info:'ℹ', coin:'🪙', bookmark:'🔖' }
  const accent: Record<ToastType, string> = {
    success:'#1DC97A', error:'#f87171', info:'#94a3b8', coin:'#f59e0b', bookmark:'#818cf8',
  }
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 8, scale: 0.97 }}
      transition={{ duration: 0.22, ease: 'easeOut' }}
      className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl shadow-lg backdrop-blur-sm"
      style={{
        background: 'rgba(15,17,25,0.88)',
        border: `1px solid ${accent[toast.type]}33`,
        color: '#f1f5f9', minWidth: 180, maxWidth: 320,
      }}
    >
      <span style={{ color: accent[toast.type], fontSize: 13, fontWeight: 700 }}>{icons[toast.type]}</span>
      <span className="text-sm font-medium leading-tight">{toast.message}</span>
    </motion.div>
  )
}

// ─── ImageModal ───────────────────────────────────────────────────────────────
function ImageModal({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.86 }} animate={{ scale: 1 }} exit={{ scale: 0.86 }}
        onClick={e => e.stopPropagation()} className="relative max-w-xl w-full"
      >
        <button onClick={onClose} className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center shadow-lg">
          <FiX size={14} />
        </button>
        <img src={src} alt="Question" className="rounded-2xl object-contain max-h-[72vh] w-full shadow-2xl border border-white/10" />
      </motion.div>
    </motion.div>
  )
}

// ─── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ size = 20, cls = 'border-white' }: { size?: number; cls?: string }) {
  return (
    <motion.div
      animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      style={{ width: size, height: size }}
      className={`border-2 ${cls} border-t-transparent rounded-full flex-shrink-0`}
    />
  )
}

// ─── Content renderer (markdown tables + LaTeX + bold) ───────────────────────
const renderLatex = (text: string | null | undefined, isDark = true) => renderContent(text, isDark)

function CheckIcon() {
  return (
    <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
      <path d="M1 5.5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── BuddySelectorModal ───────────────────────────────────────────────────────
function BuddySelectorModal({ currentId, onSelect, onClose, isDark }: {
  currentId: string; onSelect: (id: string) => void; onClose: () => void; isDark: boolean
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 60, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className={`w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border overflow-hidden ${isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]'}`}
        style={{ maxHeight: '80vh' }}
      >
        <div className={`flex items-center justify-between px-5 py-4 border-b ${isDark ? 'border-[#1e2538]' : 'border-[#E5E7EB]'}`}>
          <h3 className="font-bold text-base">Choose Your Buddy</h3>
          <button onClick={onClose} className={`w-8 h-8 rounded-full flex items-center justify-center ${isDark ? 'bg-[#1e2538] text-white' : 'bg-gray-100 text-gray-700'}`}>
            <FiX size={15} />
          </button>
        </div>
        <div className="overflow-y-auto p-4 space-y-2" style={{ maxHeight: 'calc(80vh - 64px)' }}>
          {Object.entries(AI_BUDDIES).map(([id, b]) => (
            <motion.button
              key={id} whileTap={{ scale: 0.98 }}
              onClick={() => { onSelect(id); onClose() }}
              className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left ${
                currentId === id
                  ? isDark ? 'bg-indigo-900/40 border-indigo-500' : 'bg-indigo-50 border-indigo-400'
                  : isDark ? 'bg-[#111827] border-[#1e2538] hover:border-[#2a3548]' : 'bg-gray-50 border-[#E5E7EB] hover:border-gray-300'
              }`}
            >
              <img src={b.image} alt={b.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-white/20" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{b.name}</p>
                <div className="w-3 h-3 rounded-full mt-1" style={{ backgroundColor: b.color }} />
              </div>
              {currentId === id && (
                <div className="w-6 h-6 rounded-full bg-indigo-500 flex items-center justify-center flex-shrink-0">
                  <FiCheck size={13} className="text-white" />
                </div>
              )}
            </motion.button>
          ))}
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Session Summary Screen ────────────────────────────────────────────────────
function SessionSummary({ results, isDark, onContinue, onHome }: {
  results: SessionResult[]; isDark: boolean; onContinue: () => void; onHome: () => void
}) {
  const correct = results.filter(r => r.correct).length
  const total   = results.length
  const pct     = total > 0 ? Math.round((correct / total) * 100) : 0

  // group by chapter
  const byChapter: Record<string, { correct: number; total: number }> = {}
  for (const r of results) {
    if (!byChapter[r.chapter]) byChapter[r.chapter] = { correct: 0, total: 0 }
    byChapter[r.chapter].total++
    if (r.correct) byChapter[r.chapter].correct++
  }

  const T = {
    page:  isDark ? 'bg-[#07090f] text-white'     : 'bg-[#F0F2FA] text-[#0f172a]',
    card:  isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]',
    muted: isDark ? 'text-slate-400'               : 'text-slate-500',
  }

  return (
    <div className={`min-h-screen ${T.page} flex flex-col items-center justify-center px-4 py-12`}>
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        {/* Score circle */}
        <div className="flex flex-col items-center mb-8">
          <div className={`w-28 h-28 rounded-full border-4 flex items-center justify-center mb-4 ${
            pct >= 70 ? 'border-emerald-500' : pct >= 40 ? 'border-amber-500' : 'border-rose-500'
          }`}>
            <div className="text-center">
              <span className="text-3xl font-extrabold">{pct}%</span>
              <p className={`text-xs ${T.muted}`}>{correct}/{total}</p>
            </div>
          </div>
          <h1 className="text-2xl font-bold mb-1">
            {pct >= 70 ? 'Great session! 🎉' : pct >= 40 ? 'Good effort 👍' : 'Keep going 💪'}
          </h1>
          <p className={`text-sm ${T.muted} text-center`}>
            {pct >= 70
              ? 'Strong session. Next questions will push into harder territory.'
              : pct < 40
              ? 'Tough questions — the system will stay close to your weak chapters until they improve.'
              : 'Solid practice. The algorithm is tracking your gaps and will focus there next.'}
          </p>
        </div>

        {/* Chapter breakdown */}
        {Object.keys(byChapter).length > 0 && (
          <div className={`rounded-2xl border p-5 mb-6 ${T.card}`}>
            <p className="text-sm font-bold mb-4">Chapter breakdown</p>
            <div className="space-y-3">
              {Object.entries(byChapter)
                .sort(([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total)) // worst first
                .map(([ch, s]) => {
                const chPct = Math.round((s.correct / s.total) * 100)
                return (
                  <div key={ch}>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs truncate max-w-[200px] ${T.muted}`}>{ch}</span>
                      <span className="text-xs font-semibold">{s.correct}/{s.total}</span>
                    </div>
                    <div className={`h-1.5 rounded-full overflow-hidden ${isDark ? 'bg-[#1e2538]' : 'bg-gray-200'}`}>
                      <div
                        className={`h-full rounded-full transition-all ${chPct >= 70 ? 'bg-emerald-500' : chPct >= 40 ? 'bg-amber-500' : 'bg-rose-500'}`}
                        style={{ width: `${chPct}%` }}
                      />
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <motion.button
            whileTap={{ scale: 0.97 }} onClick={onContinue}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold ${isDark ? 'bg-white text-black' : 'bg-[#0f172a] text-white'}`}
          >
            Keep practicing <FiArrowRight size={15} />
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }} onClick={onHome}
            className={`w-full py-3 rounded-xl text-sm font-semibold border transition-colors ${isDark ? 'bg-[#111827] border-[#1D2939] text-white' : 'bg-white border-[#D1D5DB] text-[#0f172a]'}`}
          >
            Back to home
          </motion.button>
        </div>
      </motion.div>
    </div>
  )
}

// ─── Confetti particle ───────────────────────────────────────────────────────
function Confetti() {
  const colors = ['#f59e0b','#10b981','#6366f1','#ef4444','#ec4899','#ffffff']
  const particles = Array.from({ length: 36 }, (_, i) => ({
    id: i,
    color: colors[i % colors.length],
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    size: 5 + Math.random() * 6,
    rotation: Math.random() * 360,
  }))
  return (
    <div className="fixed inset-0 pointer-events-none z-[500] overflow-hidden">
      {particles.map(p => (
        <motion.div
          key={p.id}
          initial={{ y: -20, x: `${p.x}vw`, opacity: 1, rotate: 0, scale: 1 }}
          animate={{ y: '110vh', opacity: 0, rotate: p.rotation + 360, scale: 0.6 }}
          transition={{ duration: 2.2 + p.delay, ease: 'easeIn', delay: p.delay }}
          style={{
            position: 'absolute', top: 0, width: p.size, height: p.size,
            backgroundColor: p.color, borderRadius: p.id % 3 === 0 ? '50%' : 2,
          }}
        />
      ))}
    </div>
  )
}

// ─── Streak Modal ─────────────────────────────────────────────────────────────
function StreakModal({ streak, isDark, onClose }: {
  streak: number; isDark: boolean; onClose: () => void
}) {
  return (
    <>
      <Confetti />
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[400] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 80, opacity: 0, scale: 0.9 }}
          animate={{ y: 0, opacity: 1, scale: 1 }}
          exit={{ y: 80, opacity: 0, scale: 0.9 }}
          transition={{ type: 'spring', stiffness: 340, damping: 26 }}
          onClick={e => e.stopPropagation()}
          className={`w-full max-w-sm rounded-3xl p-8 text-center shadow-2xl border ${
            isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]'
          }`}
        >
          {/* Flame SVG icon */}
          <div className="flex items-center justify-center gap-3 mb-3">
            <svg width="44" height="44" viewBox="0 0 24 24" fill="none" className="text-orange-500">
              <path d="M12 2C12 2 7 7 7 12a5 5 0 0 0 10 0c0-2.5-1.5-5-3-7 0 0-1 3-2 3s-1-2-1-3l1 5z" fill="currentColor" opacity="0.3"/>
              <path d="M12 2c0 0-5 5-5 10a5 5 0 0 0 10 0c0-2.5-1.5-5-3-7 0 0-1 3-2 3s-1-2-1-3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="14" r="2" fill="currentColor"/>
            </svg>
            <motion.span
              key={streak}
              initial={{ y: 30, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.15 }}
              className="text-6xl font-black text-orange-500 leading-none tabular-nums"
            >
              {streak}
            </motion.span>
          </div>
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <p className="text-xl font-bold mb-1">
              {streak === 1 ? 'Streak started!' : `${streak}-day streak!`}
            </p>
            <p className={`text-sm mb-6 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
              {streak === 1
                ? "You've solved 3+ questions today. Come back tomorrow to keep it going."
                : `${streak} days in a row — consistency is your superpower.`}
            </p>
          </motion.div>
          <motion.button
            whileTap={{ scale: 0.97 }} onClick={onClose}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.45 }}
            className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl text-sm font-bold ${
              isDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-[#0f172a] text-white hover:bg-[#1e293b]'
            }`}
          >
            Keep going
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </motion.button>
        </motion.div>
      </motion.div>
    </>
  )
}

// ─── XP Progress Bar ─────────────────────────────────────────────────────────
function XPBar({ xpState, isDark }: { xpState: ReturnType<typeof readXP>; isDark: boolean }) {
  const pct = Math.min(100, Math.round((xpState.xpInLevel / xpState.xpForNextLevel) * 100))
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={`text-[10px] font-bold flex-shrink-0 ${isDark ? 'text-indigo-400' : 'text-indigo-600'}`}>
        Lv {xpState.level}
      </span>
      <div className={`flex-1 h-1.5 rounded-full overflow-hidden min-w-[48px] ${isDark ? 'bg-[#1e2538]' : 'bg-gray-200'}`}>
        <motion.div
          className="h-full rounded-full bg-indigo-500"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
      <span className={`text-[10px] tabular-nums flex-shrink-0 ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
        {xpState.xpInLevel}/{xpState.xpForNextLevel}
      </span>
    </div>
  )
}

// ─── Level-up badge ───────────────────────────────────────────────────────────
function LevelUpBadge({ level, isDark, onDone }: { level: number; isDark: boolean; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return (
    <motion.div
      initial={{ scale: 0.7, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.8, opacity: 0, y: -10 }}
      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl shadow-lg border ${
        isDark ? 'bg-[#0d1117] border-[#1e2538] text-white' : 'bg-white border-[#E5E7EB] text-[#0f172a]'
      }`}
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-indigo-400 flex-shrink-0">
        <path d="M12 19V5M5 12l7-7 7 7" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <span className="font-bold text-sm">Level {level} reached</span>
    </motion.div>
  )
}

// ─── Difficulty Pill ──────────────────────────────────────────────────────────
function DifficultyPill({ difficulty, isDark }: { difficulty: number; isDark: boolean }) {
  const label = difficulty < 0.35 ? 'Easy' : difficulty < 0.6 ? 'Medium' : difficulty < 0.8 ? 'Hard' : 'Expert'
  const color = difficulty < 0.35 ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10'
              : difficulty < 0.6  ? 'text-amber-400 border-amber-500/40 bg-amber-500/10'
              : difficulty < 0.8  ? 'text-orange-400 border-orange-500/40 bg-orange-500/10'
              :                     'text-red-400 border-red-500/40 bg-red-500/10'
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${color}`}>
      {label}
    </span>
  )
}

// ─── Chapter Survey Modal ─────────────────────────────────────────────────────
function ChapterSurveyModal({ isDark, userId, onDone }: {
  isDark: boolean; userId: string | null; onDone: () => void
}) {
  const subjects = ['physics', 'chemistry', 'maths'] as const
  const [activeSubject, setActiveSubject] = useState<string>('physics')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // Leaderboard-style filter chip tokens — white/black, no random colors
  const chipActive = isDark ? 'bg-white text-[#0f172a] border-white' : 'bg-[#0f172a] text-white border-[#0f172a]'
  const chipIdle   = isDark ? 'bg-[#111827] text-slate-300 border-[#1D2939] hover:border-slate-500'
                            : 'bg-white text-slate-600 border-[#E5E7EB] hover:border-slate-400'

  const subjectLabel: Record<string, string> = { physics: 'Physics', chemistry: 'Chemistry', maths: 'Maths' }
  const chaptersForSubject = ALL_SURVEY_CHAPTERS.filter(c => c.subject === activeSubject)

  const toggle = (ch: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(ch) ? n.delete(ch) : n.add(ch); return n })
  }

  const handleSave = async () => {
    setSaving(true)
    await saveSurvey(userId, [...selected])
    setSaving(false)
    onDone()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm px-2 sm:px-4"
    >
      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        className={`w-full max-w-lg rounded-t-3xl sm:rounded-3xl border overflow-hidden flex flex-col ${
          isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]'
        }`}
        style={{ maxHeight: '88vh' }}
      >
        {/* Header */}
        <div className={`px-5 pt-5 pb-4 border-b flex-shrink-0 ${isDark ? 'border-[#1e2538]' : 'border-[#E5E7EB]'}`}>
          <div className="flex items-center gap-2 mb-0.5">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" className={isDark ? 'text-slate-400' : 'text-slate-500'} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <h2 className="font-bold text-lg">Chapters you've studied</h2>
          </div>
          <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            Pick what you've covered — we'll focus your practice there.
          </p>
        </div>

        {/* Subject filter chips */}
        <div className={`flex gap-2 px-4 pt-3 pb-3 flex-shrink-0 border-b ${isDark ? 'border-[#1e2538]' : 'border-[#E5E7EB]'}`}>
          {subjects.map(s => (
            <motion.button key={s} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
              onClick={() => setActiveSubject(s)}
              className={`flex-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                activeSubject === s ? chipActive : chipIdle
              }`}
            >
              {subjectLabel[s]}
            </motion.button>
          ))}
        </div>

        {/* Chapter grid */}
        <div className="flex-1 overflow-y-auto px-4 py-3 grid grid-cols-2 gap-2 content-start" style={{ scrollbarWidth: 'none' }}>
          {chaptersForSubject.map(c => {
            const active = selected.has(c.chapter)
            return (
              <motion.button key={c.chapter} whileTap={{ scale: 0.97 }} onClick={() => toggle(c.chapter)}
                className={`p-3 rounded-xl border text-left text-xs font-medium leading-tight transition-all flex items-start gap-2 ${
                  active
                    ? isDark ? 'bg-[#111827] border-white text-white' : 'bg-[#0f172a] border-[#0f172a] text-white'
                    : isDark ? 'bg-[#111827] border-[#1e2538] text-slate-300 hover:border-slate-500' : 'bg-gray-50 border-[#E5E7EB] text-gray-700 hover:border-gray-400'
                }`}
              >
                {/* SVG checkbox */}
                <span className={`mt-0.5 flex-shrink-0 w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all ${
                  active
                    ? isDark ? 'border-white bg-white/20' : 'border-[#0f172a] bg-white/10'
                    : isDark ? 'border-[#2a3548]' : 'border-gray-300'
                }`}>
                  {active && (
                    <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                      <path d="M1 3l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                </span>
                <span className="flex-1">{c.chapter}</span>
              </motion.button>
            )
          })}
        </div>

        {/* Footer */}
        <div className={`px-4 py-4 border-t flex items-center gap-3 flex-shrink-0 ${isDark ? 'border-[#1e2538]' : 'border-[#E5E7EB]'}`}>
          <span className={`text-xs flex-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {selected.size} selected
          </span>
          <motion.button whileTap={{ scale: 0.97 }} onClick={onDone}
            className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all duration-200 ${chipIdle}`}
          >
            Skip
          </motion.button>
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleSave} disabled={saving || selected.size === 0}
            className={`px-5 py-2 rounded-full text-xs font-bold transition-all duration-200 disabled:opacity-30 flex items-center gap-1.5 border ${chipActive}`}
          >
            {saving ? 'Saving' : 'Save'}
            {!saving && (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            )}
          </motion.button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Main Practice Component ──────────────────────────────────────────────────
export default function PracticeClient() {
  const isDark = useTheme()
  const router = useRouter()
  const sp     = useSearchParams()
  const seedQid = sp.get('qid') || ''

  // ── State ─────────────────────────────────────────────────────────────────
  const [question, setQuestion]             = useState<Question | null>(null)
  const [nextQuestion, setNextQuestion]     = useState<Question | null>(null)  // prefetch
  const [loadingQ, setLoadingQ]             = useState(true)
  const [loadingNext, setLoadingNext]       = useState(false)

  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [pendingOption, setPendingOption]   = useState<string | null>(null)
  const [isCorrect, setIsCorrect]           = useState<boolean | null>(null)
  const [resolvedCorrectOption, setResolvedCorrectOption] = useState<string | null>(null)
  const [solution, setSolution]             = useState('')
  const [solutionLoading, setSolutionLoading] = useState(false)
  const [solutionRequested, setSolutionRequested] = useState(false)
  const [integerAnswer, setIntegerAnswer]   = useState('')

  const [buddyId, setBuddyId]               = useState(DEFAULT_BUDDY)
  const [solutionBuddyId, setSolutionBuddyId] = useState(DEFAULT_BUDDY)
  const [buddyModalOpen, setBuddyModalOpen] = useState(false)

  const [aiFollowup, setAIFollowup]         = useState<string | null>(null)
  const [aiFollowupLoading, setAIFollowupLoading] = useState(false)

  const [bookmarked, setBookmarked]         = useState(false)
  const [imageModal, setImageModal]         = useState<string | null>(null)
  const [toasts, setToasts]                 = useState<ToastItem[]>([])
  const [rookieCoins, setRookieCoins]       = useState(0)
  const [timer, setTimer]                   = useState(0)

  // session tracking
  const [sessionCount, setSessionCount]     = useState(0)
  const [sessionResults, setSessionResults] = useState<SessionResult[]>([])
  const [excludeIds, setExcludeIds]         = useState<string[]>(seedQid ? [seedQid] : [])
  const [userId, setUserId]                 = useState<string | null>(null)
  const [showSummary, setShowSummary]       = useState(false)

  // adaptive difficulty — session-level correct/incorrect results for targetDifficulty()
  const [recentCorrect, setRecentCorrect]   = useState<boolean[]>([])
  const [currentDifficulty, setCurrentDifficulty] = useState(0.4)
  const surveyChaptersRef                   = useRef<string[]>([])

  // gamification
  const [xpState, setXpState]               = useState(() => readXP())
  const [showStreakModal, setShowStreakModal] = useState(false)
  const [streakCount, setStreakCount]        = useState(0)
  const [showLevelUp, setShowLevelUp]        = useState(false)
  const [levelUpLevel, setLevelUpLevel]      = useState(1)
  const [showSurvey, setShowSurvey]          = useState(false)

  // recommendation context
  const [weakTopics, setWeakTopics]         = useState<WeakChapter[]>([])
  const userIdRef = useRef<string | null>(null)

  // ── Back-navigation history ───────────────────────────────────────────────
  // Stores the full answered state for each past question so the student can
  // swipe back and review their previous answer + solution.
  interface HistoryEntry {
    question:        Question
    selectedOption:  string
    resolvedCorrect: string | null
    isCorrect:       boolean
    solution:        string
    aiFollowup:      string | null
    solutionBuddyId: string
  }
  const [history, setHistory]           = useState<HistoryEntry[]>([])
  const [historyIndex, setHistoryIndex] = useState<number>(-1)
  // -1 means "showing current live question"; ≥0 means reviewing history[historyIndex]
  const isReviewing = historyIndex >= 0

  const timerRef          = useRef<number | null>(null)
  const questionStartTime = useRef(Date.now())
  const scrollRef         = useRef<HTMLDivElement | null>(null)

  const buddy        = AI_BUDDIES[buddyId]        ?? AI_BUDDIES[DEFAULT_BUDDY]
  const solutionBuddy= AI_BUDDIES[solutionBuddyId]?? AI_BUDDIES[DEFAULT_BUDDY]

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const T = {
    page:        isDark ? 'bg-[#07090f] text-white'              : 'bg-[#F0F2FA] text-[#0f172a]',
    header:      isDark ? 'bg-[#07090f]/95 border-[#1e2538]'    : 'bg-white/95 border-[#E5E7EB]',
    card:        isDark ? 'bg-[#0d1117] border-[#1e2538]'       : 'bg-white border-[#E5E7EB]',
    optionIdle:  isDark ? 'bg-[#0d1117] border-[#1e2538] hover:border-white text-white'
                        : 'bg-white border-[#E5E7EB] hover:border-black text-[#0f172a]',
    optionLabel: isDark ? 'bg-[#151B27] border-[#262F4C] text-slate-200'
                        : 'bg-[#F3F4F6] border-[#D1D5DB] text-[#374151]',
    input:       isDark ? 'bg-[#0d1117] border-[#1e2538] text-white placeholder-gray-500 focus:border-indigo-500'
                        : 'bg-white border-[#D1D5DB] text-[#0f172a] placeholder-gray-400 focus:border-indigo-400',
    muted:       isDark ? 'text-slate-400'    : 'text-slate-500',
    progress:    isDark ? 'bg-[#1e2538]'      : 'bg-gray-200',
    footer:      isDark ? 'bg-[#07090f]/95 border-[#1e2538]'    : 'bg-white/95 border-[#E5E7EB]',
    btnSecondary:isDark ? 'bg-[#111827] border-[#1D2939] text-white hover:bg-[#1a2235]'
                        : 'bg-white border-[#D1D5DB] text-[#0f172a] hover:bg-gray-50',
    solCard:     isDark ? 'bg-[#0d1117] border-[#1e2538]'       : 'bg-white border-[#E5E7EB]',
    followCard:  isDark ? 'bg-[#0a0f1a] border-[#1D2939] text-slate-300'
                        : 'bg-indigo-50 border-indigo-200 text-slate-700',
    examBadge:   isDark ? 'bg-blue-900/40 text-blue-400 border border-blue-500/50'
                        : 'bg-blue-100 text-blue-700 border border-blue-300',
    imgWrapper:  isDark ? 'bg-[#0d1117] border-[#1e2538]'       : 'bg-gray-50 border-gray-200',
    coinBadge:   isDark ? 'bg-[#111827] border-[#1D2939] text-white'
                        : 'bg-amber-50 border-amber-200 text-amber-800',
  }

  // ── Toasts ────────────────────────────────────────────────────────────────
  const addToast = useCallback((message: string, type: ToastType = 'info', ms = 2200) => {
    const id = Date.now() + Math.random()
    setToasts(p => { const f = p.filter(t => t.type !== type); return [...f, { id, message, type }] })
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), ms)
  }, [])

  // ── Init: load buddy, coins, userId ───────────────────────────────────────
  useEffect(() => {
    trackSessionStart('practice')
    return () => { trackSessionEnd('practice') }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    try { const s = localStorage.getItem('selectedBuddy'); if (s && AI_BUDDIES[s]) setBuddyId(s) } catch {}

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      setUserId(user.id)
      userIdRef.current = user.id
      supabase.from('users').select('rookieCoinsEarned').eq('id', user.id).single()
        .then(({ data }) => { if (data) setRookieCoins(data.rookieCoinsEarned || 0) })
      // Load weak topics for header context chip (non-blocking)
      getWeakTopics(user.id, 2).then(topics => setWeakTopics(topics))
    })
  }, [])

  // ── Fetch recommended question ────────────────────────────────────────────
  // Uses adaptive difficulty system from lib/adaptivePractice.ts.
  // Falls back gracefully — session never gets stuck.
  const fetchNext = useCallback(async (excludes: string[]): Promise<Question | null> => {
    const uid = userIdRef.current
    const target = targetDifficulty(sessionCount, recentCorrect)
    try {
      const result = await fetchAdaptive(uid, excludes, target, surveyChaptersRef.current)
      setCurrentDifficulty(result.difficulty)
      if (result.newLap) addToast('🔄 Starting a new lap — all questions unlocked!', 'info', 3500)
      // Track that a recommendation was shown
      if (result.question) {
        track('recommendation_shown', {
          feature:     'recommendation',
          question_id: result.question.question_id,
          subject:     result.question.subject   ?? undefined,
          chapter:     result.question.chapter   ?? undefined,
          difficulty:  result.difficulty,
        })
      }
      return result.question
    } catch {
      return null
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionCount, recentCorrect])
  const fetchRecommended = fetchNext  // alias so advanceToNext/other callers stay unchanged

  // ── Load first question + show survey if needed ───────────────────────────
  useEffect(() => {
    const init = async () => {
      setLoadingQ(true)

      // Load survey chapters into ref so fetchNext can filter
      const survey = loadSurvey()
      if (survey) surveyChaptersRef.current = survey.chapters

      // Show survey if due (first time or expired)
      if (shouldShowSurvey()) setShowSurvey(true)

      // If a seed question_id was passed (from home preview card), fetch directly
      if (seedQid) {
        const { data, error } = await supabase
          .from(DB_TABLE)
          .select('*')
          .eq('question_id', seedQid)
          .single()
        if (!error && data) {
          setQuestion(data as Question)
          setCurrentDifficulty(questionDifficulty(data as Question))
          setLoadingQ(false)
          setLoadingNext(true)
          fetchNext([seedQid]).then(next => { setNextQuestion(next); setLoadingNext(false) })
          return
        }
      }

      // No seed — adaptive fetch
      const q = await fetchNext([])
      setQuestion(q)
      setLoadingQ(false)

      if (q) {
        setLoadingNext(true)
        fetchNext([q.question_id]).then(next => { setNextQuestion(next); setLoadingNext(false) })
      }
    }
    init()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seedQid])

  // ── Bookmark sync ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!question) return
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY)
      const arr = raw ? JSON.parse(raw) : []
      setBookmarked(arr.some((b: any) => b.question_id === question.question_id))
    } catch { setBookmarked(false) }
  }, [question])

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (selectedOption === null && question) {
      const start = Date.now(); questionStartTime.current = start
      timerRef.current = window.setInterval(() => setTimer(Math.floor((Date.now() - start) / 1000)), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [selectedOption, question])

  // ── Cache helpers ─────────────────────────────────────────────────────────
  const cacheKey = (qid: string, bid: string) => `${AI_SOL_CACHE}:practice:${qid}:${bid}`
  const cacheSave = (qid: string, bid: string, sol: string) => {
    try { sessionStorage.setItem(cacheKey(qid, bid), sol) } catch {}
  }
  const cacheLoad = (qid: string, bid: string) => {
    try { return sessionStorage.getItem(cacheKey(qid, bid)) } catch { return null }
  }

  // ── Generate AI solution ──────────────────────────────────────────────────
  const generateAISolution = useCallback(async (
    q: Question, bId: string, confirmedAnswer: string  // ← never null
  ): Promise<string> => {
    const b = AI_BUDDIES[bId] ?? AI_BUDDIES[DEFAULT_BUDDY]
    const col = b.columnKey
    try {
      const cached = cacheLoad(q.question_id, bId)
      if (cached) return cached

      if (q[col]?.trim()) { cacheSave(q.question_id, bId, q[col]); return q[col] }

      const { data: fresh } = await supabase.from(DB_TABLE).select(col).eq('question_id', q.question_id).single()
      if ((fresh as any)?.[col]?.trim()) {
        cacheSave(q.question_id, bId, (fresh as any)[col])
        return (fresh as any)[col]
      }

      const res = await axios.post(`${API_BASE}/solution`, {
        action: 'generate_solution',
        question_text: q.question_text, option_A: q.option_a, option_B: q.option_b,
        option_C: q.option_c, option_D: q.option_d, solution: q.solution,
        correct_option: confirmedAnswer,   // always the resolved answer
        buddy_id: bId, buddy_name: b.name,
        buddy_system_prompt: b.systemPrompt,
      })
      const aiSol = res.data.solution || q.solution || ''
      cacheSave(q.question_id, bId, aiSol)
      supabase.from(DB_TABLE).update({ [col]: aiSol }).eq('question_id', q.question_id).then(() => {})
      return aiSol
    } catch { return q.solution || '' }
  }, [])

  // ── Write attempt to DB + update ability vector ──────────────────────────
  const writeAttempt = async (q: Question, correct: boolean, timeSec: number) => {
    try {
      // Always resolve from auth directly — never rely on userId state which
      // may still be null if the user answers before the init useEffect resolves.
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      // Keep refs in sync
      if (!userId) setUserId(user.id)
      userIdRef.current = user.id

      await supabase.from('attempts').insert({
        student_id: user.id,
        question_id: q.question_id,
        correct,
        time_taken_sec: timeSec,
      })

      // ── Update the embedding-based ability vector (fire-and-forget) ──────
      // This is what drives the recommendation algorithm for future sessions.
      // We call this AFTER the attempts insert so it never blocks returning
      // the answer feedback to the student.
      updateAbilityVector(user.id, q.question_id, correct)

    } catch (e) {
      console.error('Failed to write attempt:', e)
    }
  }

  // ── Coin update ───────────────────────────────────────────────────────────
  const updateCoins = async (add: number) => {
    if (add <= 0) return
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('users').select('rookieCoinsEarned').eq('id', user.id).single()
      const newTotal = (data?.rookieCoinsEarned || 0) + add
      await supabase.from('users').update({ rookieCoinsEarned: newTotal }).eq('id', user.id)
      setRookieCoins(newTotal)
    } catch {}
  }

  // ── Post-answer handler ───────────────────────────────────────────────────
  const handlePostAnswer = async (
    correct: boolean, timeSpent: number, q: Question, optKey: string,
    confirmedAnswer: string
  ) => {
    const diff  = currentDifficulty
    const coins = correct ? Math.min((timeSpent <= 30 ? 5 : timeSpent <= 60 ? 4 : timeSpent <= 90 ? 3 : timeSpent <= 120 ? 2 : 1) + 5, 10) : 0
    const xp    = computeXP(correct, diff, timeSpent)

    // ── XP ────────────────────────────────────────────────────────────────
    const newXp = addXP(xp)
    setXpState(newXp)
    if (newXp.levelledUp) {
      setLevelUpLevel(newXp.level)
      setShowLevelUp(true)
    }

    // ── Toast ─────────────────────────────────────────────────────────────
    const xpMsg = correct ? `✓ Correct! +${coins} Coins · +${xp} XP` : `✗ Not quite — check the solution`
    addToast(xpMsg, correct ? 'coin' : 'error', 3000)
    if (correct && coins > 0) updateCoins(coins)

    // ── Streak (fires updateStreak, dispatches 'streakUpdated') ──────────
    await updateStreak()

    // ── Daily count + streak gate ─────────────────────────────────────────
    const todayKey = `questionsToday_${new Date().toDateString()}`
    const todayCount = parseInt(localStorage.getItem(todayKey) || '0', 10) + 1
    localStorage.setItem(todayKey, String(todayCount))

    // Show streak modal the first time the student crosses 3 questions today
    if (checkStreakGate(todayCount)) {
      const sd = readStreakFromLocal()
      setStreakCount(sd.current)
      setShowStreakModal(true)
    }

    // ── Auto-bookmark wrong answers ───────────────────────────────────────
    if (!correct) autoBookmarkWrong(q)

    // ── Adaptive: update recentCorrect for next targetDifficulty() call ──
    setRecentCorrect(prev => [...prev, correct])

    // ── Write attempt to DB ───────────────────────────────────────────────
    await writeAttempt(q, correct, timeSpent)

    // ── Analytics tracking ────────────────────────────────────────────────
    track(correct ? 'question_correct' : 'question_incorrect', {
      feature:     'practice',
      question_id: q.question_id,
      subject:     q.subject   ?? undefined,
      chapter:     q.chapter   ?? undefined,
      difficulty:  currentDifficulty,
      duration_ms: timeSpent * 1000,
    })
    track('question_answered', {
      feature:     'practice',
      question_id: q.question_id,
      subject:     q.subject   ?? undefined,
      chapter:     q.chapter   ?? undefined,
      difficulty:  currentDifficulty,
      duration_ms: timeSpent * 1000,
      metadata:    { correct },
    })

    // ── Session state ─────────────────────────────────────────────────────
    const newResults: SessionResult[] = [
      ...sessionResults,
      { question_id: q.question_id, correct, chapter: q.chapter || '', subject: q.subject || '' },
    ]
    setSessionResults(newResults)
    setSessionCount(c => c + 1)

    setHistory(prev => [...prev, {
      question:        q,
      selectedOption:  optKey,
      resolvedCorrect: confirmedAnswer || null,
      isCorrect:       correct,
      solution:        '',
      aiFollowup:      null,
      solutionBuddyId: buddyId,
    }])

    const uid = userIdRef.current
    if (uid) getWeakTopics(uid, 2).then(topics => setWeakTopics(topics))

    const newExcludes = [...excludeIds, q.question_id]
    setExcludeIds(newExcludes)

    const activeBuddy = buddyId
    setSolutionBuddyId(activeBuddy)
    setSolutionRequested(true)
    setSolutionLoading(true)

    // ── Track solution view + start read timer ────────────────────────────
    track('solution_viewed', {
      feature:     'practice',
      question_id: q.question_id,
      subject:     q.subject ?? undefined,
      chapter:     q.chapter ?? undefined,
    })

    generateAISolution(q, activeBuddy, confirmedAnswer).then(aiSol => {
      setSolution(aiSol)
      setSolutionLoading(false)
      setHistory(prev => {
        if (prev.length === 0) return prev
        const updated = [...prev]
        updated[updated.length - 1] = { ...updated[updated.length - 1], solution: aiSol }
        return updated
      })
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150)
    })

    if (nextQuestion) {
      const beyondExcludes = [...newExcludes, nextQuestion.question_id]
      fetchNext(beyondExcludes).then(beyond => { beyondRef.current = beyond })
    }
  }

  const beyondRef = useRef<Question | null>(null)

  // ── Go back to previous question (read-only review) ───────────────────────
  const goBack = () => {
    if (isReviewing) {
      // Already in history — go one further back, or exit review if at start
      if (historyIndex === 0) {
        setHistoryIndex(-1)  // shouldn't happen via UI but guard anyway
      } else {
        setHistoryIndex(historyIndex - 1)
      }
    } else {
      // Viewing live question — enter review at the last history entry
      if (history.length > 0) setHistoryIndex(history.length - 1)
    }
  }

  const goForward = () => {
    if (!isReviewing) return
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
    } else {
      // Reached the most recent → return to live question
      setHistoryIndex(-1)
    }
  }

  // ── Advance to next question ───────────────────────────────────────────────
  const advanceToNext = async () => {
    // If reviewing a past question, "Next" returns to live question first
    if (isReviewing) { setHistoryIndex(-1); return }

    // After 10 questions offer a summary (but let user continue)
    if (sessionCount > 0 && sessionCount % 10 === 0) {
      setShowSummary(true)
      return
    }

    if (nextQuestion) {
      // Swap in the prefetched question
      setQuestion(nextQuestion)
      setNextQuestion(beyondRef.current)
      beyondRef.current = null
      resetAnswerState()

      // Prefetch beyond
      const newExcludes = [...excludeIds, nextQuestion.question_id]
      setLoadingNext(true)
      fetchNext(newExcludes).then(q => {
        beyondRef.current = q
        setLoadingNext(false)
      })
    } else {
      // Fallback: fetch on demand
      resetAnswerState()
      setLoadingQ(true)
      const q = await fetchNext(excludeIds)
      setQuestion(q)
      setLoadingQ(false)
      if (q) {
        const next = await fetchNext([...excludeIds, q.question_id])
        setNextQuestion(next)
      }
    }
  }

  const resetAnswerState = () => {
    setSelectedOption(null); setPendingOption(null); setIsCorrect(null)
    setResolvedCorrectOption(null)
    setSolution(''); setSolutionRequested(false); setAIFollowup(null)
    setIntegerAnswer(''); setTimer(0)
  }

  // ── MCQ click ─────────────────────────────────────────────────────────────
  // Order of operations:
  //   1. setPendingOption(opt) → grey state, no verdict yet.
  //   2. await determineAnswer → resolves + persists correct_option, lands
  //      it in `question` state via setQuestion.
  //   3. setIsCorrect / setSelectedOption → only now do we render the
  // Order of operations, deliberately:
  //   1. setPendingOption(opt) → grey state, no verdict yet.
  //   2. correct_option is read directly from the DB row — no AI call needed.
  //   3. setIsCorrect / setSelectedOption → colored (green/red) view renders.
  //   4. handlePostAnswer → solution generation starts.
  const handleOptionClick = async (opt: string) => {
    if (selectedOption !== null || pendingOption !== null || !question) return
    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000)
    setPendingOption(opt)
    // correct_option is always present in the DB
    const ans = question.correct_option
    const normalize = (v: string | null) =>
      v?.replace(/option_?/gi, '').replace(/[^a-dA-D]/g, '').slice(0, 1).toLowerCase() ?? ''
    const correct = normalize(opt) === normalize(ans)
    setResolvedCorrectOption(ans || null)
    setIsCorrect(correct)
    setSelectedOption(opt)
    setPendingOption(null)
    handlePostAnswer(correct, timeSpent, question, opt, ans || '')
  }

  // ── Integer submit ─────────────────────────────────────────────────────────
  const handleIntegerSubmit = async () => {
    if (isCorrect !== null || !question || !integerAnswer.trim()) return
    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000)
    // correct_option is always present in the DB
    const ans = question.correct_option
    const u = parseFloat(integerAnswer.trim()), c = parseFloat(ans || '')
    const correct = !isNaN(u) && !isNaN(c) ? u === c : integerAnswer.trim() === (ans || '').trim()
    setResolvedCorrectOption(ans || null)
    setIsCorrect(correct); setSelectedOption('INTEGER')
    handlePostAnswer(correct, timeSpent, question, 'INTEGER', ans || '')
  }

  // ── Simpler explanation ────────────────────────────────────────────────────
  const handleFollowup = async () => {
    if (!question) return
    setAIFollowupLoading(true); setAIFollowup(null)
    try {
      const res = await axios.post(`${API_BASE}/solution`, {
        action: 'better_understanding', question_text: question.question_text,
        solution: question.solution, buddy_id: buddyId, buddy_name: buddy.name,
        buddy_system_prompt: buddy.systemPrompt,
      })
      setAIFollowup(res.data.explanation || 'Could not generate explanation.')
    } catch { setAIFollowup('Error generating explanation.') }
    finally { setAIFollowupLoading(false) }
  }

  // ── Bookmark ──────────────────────────────────────────────────────────────
  const handleBookmark = () => {
    if (!question) return
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY)
      let arr = raw ? JSON.parse(raw) : []
      if (!bookmarked) {
        arr.push({ ...question, chapterTitle: question.chapter, subjectName: question.subject })
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(arr))
        setBookmarked(true); addToast('Bookmarked!', 'bookmark')
      } else {
        arr = arr.filter((b: any) => b.question_id !== question.question_id)
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(arr))
        setBookmarked(false); addToast('Bookmark removed', 'info')
      }
    } catch {}
  }

  const isIntegerQ = (q: Question) =>
    !q.option_a && !q.option_b && !q.option_c && !q.option_d &&
    !q.option_a_img && !q.option_b_img && !q.option_c_img && !q.option_d_img

  const parseShift = (s: string | null) => s?.split('_').join(' ') ?? null

  // ── Summary screen ─────────────────────────────────────────────────────────
  if (showSummary) {
    return (
      <SessionSummary
        results={sessionResults}
        isDark={isDark}
        onHome={() => router.push('/home')}
        onContinue={() => {
          setShowSummary(false)
          advanceToNext()
        }}
      />
    )
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadingQ && !question) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${T.page}`}>
        <div className="text-center">
          <div className={`w-12 h-12 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-4 ${isDark ? 'border-white' : 'border-[#0f172a]'}`} />
          <p className={T.muted}>Finding your next question…</p>
        </div>
      </div>
    )
  }

  // No question returned (all exhausted or error)
  if (!question) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${T.page}`}>
        <div className="text-center px-6">
          <p className="text-4xl mb-4">🎯</p>
          <h2 className="text-lg font-bold mb-2">You've practiced everything!</h2>
          <p className={`text-sm mb-6 ${T.muted}`}>Come back as more questions are added.</p>
          <motion.button whileTap={{ scale: 0.97 }} onClick={() => router.push('/home')}
            className={`px-6 py-3 rounded-xl text-sm font-semibold ${isDark ? 'bg-white text-black' : 'bg-[#0f172a] text-white'}`}>
            Back to home
          </motion.button>
        </div>
      </div>
    )
  }

  const Q = question

  // ── Resolve what to show: live question or a history entry ────────────────
  const reviewEntry = isReviewing ? history[historyIndex] : null
  const displayQ    = reviewEntry ? reviewEntry.question : Q

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen pb-24 transition-colors duration-300 ${T.page}`}>

      {/* Toasts */}
      <div className="fixed bottom-20 right-4 z-[300] flex flex-col gap-2 items-end pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => <Toast key={t.id} toast={t} />)}
        </AnimatePresence>
      </div>

      {/* Image modal */}
      <AnimatePresence>{imageModal && <ImageModal src={imageModal} onClose={() => setImageModal(null)} />}</AnimatePresence>

      {/* Streak modal */}
      <AnimatePresence>
        {showStreakModal && (
          <StreakModal streak={streakCount} isDark={isDark} onClose={() => setShowStreakModal(false)} />
        )}
      </AnimatePresence>

      {/* Level-up badge */}
      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[350] pointer-events-none">
        <AnimatePresence>
          {showLevelUp && (
            <LevelUpBadge level={levelUpLevel} isDark={isDark} onDone={() => setShowLevelUp(false)} />
          )}
        </AnimatePresence>
      </div>

      {/* Chapter survey modal */}
      <AnimatePresence>
        {showSurvey && (
          <ChapterSurveyModal
            isDark={isDark} userId={userId}
            onDone={() => {
              setShowSurvey(false)
              const survey = loadSurvey()
              if (survey) surveyChaptersRef.current = survey.chapters
            }}
          />
        )}
      </AnimatePresence>

      {/* Buddy modal */}
      <AnimatePresence>
        {buddyModalOpen && (
          <BuddySelectorModal currentId={buddyId} isDark={isDark}
            onClose={() => setBuddyModalOpen(false)}
            onSelect={id => {
              setBuddyId(id)
              try { localStorage.setItem('selectedBuddy', id) } catch {}
              addToast(`Buddy: ${AI_BUDDIES[id]?.name}`, 'info', 1800)
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={`sticky top-0 z-30 backdrop-blur-sm border-b transition-colors duration-300 ${T.header}`}>
        <div className="flex items-center justify-between px-4 py-3">
          {/* Back */}
          <motion.button whileTap={{ scale: 0.95 }} onClick={() => router.push('/home')}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 ${T.btnSecondary}`}>
            <FiChevronLeft size={18} />
          </motion.button>

          {/* Title + session count */}
          <div className="flex-1 mx-3 min-w-0 text-center">
            <h1 className="text-sm font-bold">
              {isReviewing ? `Review · Q${historyIndex + 1} of ${history.length}` : 'Adaptive Practice'}
            </h1>
            {/* XP bar */}
            {!isReviewing && (
              <div className="mt-1 px-2">
                <XPBar xpState={xpState} isDark={isDark} />
              </div>
            )}
          </div>

          {/* Buddy avatar */}
          <button onClick={() => setBuddyModalOpen(true)} className="flex items-center gap-1.5 mr-2 group">
            <div className="relative">
              <img src={buddy.image} alt={buddy.name}
                className="w-8 h-8 rounded-full object-cover border-2 border-indigo-500/50 group-hover:border-indigo-400 transition-colors" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-[#07090f]" />
            </div>
          </button>

          {/* Coins + timer */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-semibold ${T.coinBadge}`}>
              <Image src="coin (1).svg" alt="Coins" width={13} height={13} />
              <span>{rookieCoins}</span>
            </div>
            <div className={`flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs ${T.btnSecondary}`}>
              <IoTimeOutline size={13} />
              <span>{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</span>
            </div>
          </div>
        </div>

        {/* Session progress bar — fills as questions answered (caps at 10 for a visual "lap") */}
        <div className={`h-0.5 ${T.progress}`}>
          <motion.div
            className={`h-full ${isDark ? 'bg-white' : 'bg-black'}`}
            initial={{ width: 0 }}
            animate={{ width: `${Math.min((sessionCount % 10) * 10, 100)}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-7 pb-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={isReviewing ? `history-${historyIndex}` : (Q?.question_id ?? 'empty')}
            initial={{ opacity: 0, x: isReviewing ? -14 : 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isReviewing ? 14 : -14 }}
            className="space-y-4"
          >
           

            {/* ── Question card ───────────────────────────────────────────── */}
            <div className={`rounded-2xl border p-5 sm:p-6 transition-colors duration-300 ${T.card}`}>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {(displayQ ?? Q)?.exam_shift && (
                  <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${T.examBadge}`}>
                    {parseShift((displayQ ?? Q)!.exam_shift)}
                  </span>
                )}
                {(displayQ ?? Q)?.chapter && (
                  <span className={`text-[11px] px-2.5 py-1 rounded-full font-medium ${isDark ? 'bg-indigo-500/15 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
                    {(displayQ ?? Q)!.chapter}
                  </span>
                )}
                {!isReviewing && <DifficultyPill difficulty={currentDifficulty} isDark={isDark} />}
              </div>

              <div className="font-medium leading-relaxed">{renderLatex((displayQ ?? Q)!.question_text)}</div>

              {(displayQ ?? Q)!.question_img_url && (
                <div className="mt-4 relative group">
                  <div className={`rounded-xl border overflow-hidden flex items-center justify-center max-h-64 ${T.imgWrapper}`}>
                    <img src={(displayQ ?? Q)!.question_img_url!} alt="Q"
                      className="max-h-56 max-w-full object-contain cursor-zoom-in select-none"
                      onClick={() => setImageModal((displayQ ?? Q)!.question_img_url!)} />
                    <button onClick={() => setImageModal((displayQ ?? Q)!.question_img_url!)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/70 text-white flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity">
                      <FiZoomIn size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Integer input ───────────────────────────────────────────── */}
            {isIntegerQ(displayQ ?? Q!) ? (
              <div className={`rounded-2xl border p-5 space-y-4 ${T.card}`}>
                <p className={`text-sm font-medium ${T.muted}`}>Enter your integer answer:</p>
                {/* In review mode, show the past result read-only */}
                {isReviewing && reviewEntry ? (
                  <div className={`rounded-xl p-4 border-2 ${reviewEntry.isCorrect ? 'bg-[#04271C] border-[#1DC97A]' : 'bg-[#2D0A0A] border-[#DC2626]'}`}>
                    <span className={`font-bold text-base ${reviewEntry.isCorrect ? 'text-[#1DC97A]' : 'text-[#DC2626]'}`}>
                      {reviewEntry.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                    </span>
                    {!reviewEntry.isCorrect && reviewEntry.resolvedCorrect && (
                      <p className="text-sm text-gray-300 mt-1">Correct: <b className="text-[#1DC97A]">{reviewEntry.resolvedCorrect}</b></p>
                    )}
                  </div>
                ) : isCorrect === null ? (
                  <div className="flex gap-3">
                    <input type="number" value={integerAnswer} onChange={e => setIntegerAnswer(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleIntegerSubmit() }}
                      placeholder="Type answer…"
                      className={`flex-1 border rounded-xl px-4 py-3 text-lg outline-none ${T.input}`} />
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleIntegerSubmit}
                      disabled={!integerAnswer.trim()}
                      className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 font-semibold text-white">
                      Submit
                    </motion.button>
                  </div>
                ) : (
                  <div className={`rounded-xl p-4 border-2 ${isCorrect ? 'bg-[#04271C] border-[#1DC97A]' : 'bg-[#2D0A0A] border-[#DC2626]'}`}>
                    <span className={`font-bold text-base ${isCorrect ? 'text-[#1DC97A]' : 'text-[#DC2626]'}`}>
                      {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                    </span>
                    {!isCorrect && (resolvedCorrectOption || (displayQ ?? Q)!.correct_option) && (
                      <p className="text-sm text-gray-300 mt-1">Correct: <b className="text-[#1DC97A]">{resolvedCorrectOption || (displayQ ?? Q)!.correct_option}</b></p>
                    )}
                  </div>
                )}
              </div>

            ) : isReviewing && reviewEntry ? (
              /* ── Review mode: show answered state from history ─────────── */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(['a', 'b', 'c', 'd'] as const).map(opt => {
                  const dq = reviewEntry.question
                  const tv = dq[`option_${opt}`] as string | null
                  const iv = dq[`option_${opt}_img`] as string | null
                  if (!tv && !iv) return null
                  const sel  = reviewEntry.selectedOption === opt
                  const corrLetter = (reviewEntry.resolvedCorrect ?? dq.correct_option ?? '')
                    .replace(/option_?/gi, '').replace(/[^a-dA-D]/g, '').slice(0, 1).toLowerCase()
                  const corr = opt === corrLetter
                  return (
                    <div key={opt} className={`rounded-xl p-4 flex items-center gap-4 border-2 transition-colors ${
                      corr ? 'bg-[#04271C] border-[#1DC97A]' : sel ? 'bg-[#2D0A0A] border-[#DC2626]'
                           : isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]'
                    }`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-sm uppercase flex-shrink-0 ${
                        corr ? 'bg-[#1DC97A] text-black' : sel ? 'bg-[#DC2626] text-white' : T.optionLabel
                      }`}>{opt}</div>
                      <div className={`flex-1 text-sm leading-relaxed ${corr || sel ? 'text-white' : ''}`}>
                        {iv ? <img src={iv} alt={`opt-${opt}`} className="max-h-20 rounded-lg" /> : renderLatex(tv)}
                      </div>
                      {corr && <CheckIcon />}
                    </div>
                  )
                })}
              </div>

            ) : selectedOption === null && pendingOption === null ? (
              /* ── MCQ unanswered ────────────────────────────────────────── */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(['a', 'b', 'c', 'd'] as const).map(opt => {
                  const tv = Q![`option_${opt}`] as string | null
                  const iv = Q![`option_${opt}_img`] as string | null
                  if (!tv && !iv) return null
                  return (
                    <motion.button key={opt} whileTap={{ scale: 0.98 }} onClick={() => handleOptionClick(opt)}
                      className={`w-full text-left rounded-xl p-4 border flex items-center gap-4 transition-colors ${T.optionIdle}`}>
                      <div className={`w-9 h-9 rounded-lg border flex items-center justify-center font-semibold text-sm uppercase flex-shrink-0 ${T.optionLabel}`}>{opt}</div>
                      <div className="flex-1 text-sm leading-relaxed">
                        {iv ? <img src={iv} alt={`opt-${opt}`} className="max-h-20 rounded-lg" /> : renderLatex(tv)}
                      </div>
                    </motion.button>
                  )
                })}
              </div>

            ) : selectedOption === null && pendingOption !== null ? (
              /* ── MCQ pending ───────────────────────────────────────────── */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(['a', 'b', 'c', 'd'] as const).map(opt => {
                  const tv = Q![`option_${opt}`] as string | null
                  const iv = Q![`option_${opt}_img`] as string | null
                  if (!tv && !iv) return null
                  const sel = pendingOption === opt
                  return (
                    <div key={opt} className={`rounded-xl p-4 flex items-center gap-4 border-2 transition-colors ${
                      sel ? (isDark ? 'bg-[#1e2538] border-slate-500' : 'bg-gray-100 border-gray-400')
                          : isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]'
                    }`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-sm uppercase flex-shrink-0 ${T.optionLabel}`}>{opt}</div>
                      <div className="flex-1 text-sm leading-relaxed">
                        {iv ? <img src={iv} alt={`opt-${opt}`} className="max-h-20 rounded-lg" /> : renderLatex(tv)}
                      </div>
                      {sel && <Spinner size={16} />}
                    </div>
                  )
                })}
              </div>

            ) : (
              /* ── MCQ answered ──────────────────────────────────────────── */
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {(['a', 'b', 'c', 'd'] as const).map(opt => {
                  const tv = Q![`option_${opt}`] as string | null
                  const iv = Q![`option_${opt}_img`] as string | null
                  if (!tv && !iv) return null
                  const sel  = selectedOption === opt
                  const storedCorr = (resolvedCorrectOption ?? Q!.correct_option ?? '')
                    .replace(/option_?/gi, '').replace(/[^a-dA-D]/g, '').slice(0, 1).toLowerCase()
                  const corr = opt === storedCorr
                  return (
                    <div key={opt} className={`rounded-xl p-4 flex items-center gap-4 border-2 transition-colors ${
                      corr ? 'bg-[#04271C] border-[#1DC97A]' : sel ? 'bg-[#2D0A0A] border-[#DC2626]'
                           : isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]'
                    }`}>
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-sm uppercase flex-shrink-0 ${
                        corr ? 'bg-[#1DC97A] text-black' : sel ? 'bg-[#DC2626] text-white' : T.optionLabel
                      }`}>{opt}</div>
                      <div className={`flex-1 text-sm leading-relaxed ${corr || sel ? 'text-white' : ''}`}>
                        {iv ? <img src={iv} alt={`opt-${opt}`} className="max-h-20 rounded-lg" /> : renderLatex(tv)}
                      </div>
                      {corr && <CheckIcon />}
                    </div>
                  )
                })}
              </div>
            )}

            {/* ── Post-answer section ─────────────────────────────────────── */}
            {(selectedOption !== null || isReviewing) && (
              <>
                {/* Solution card — show live solution or review history solution */}
                {(solutionRequested || isReviewing) && (
                  <div ref={scrollRef} className={`rounded-2xl border p-5 sm:p-6 transition-colors ${T.solCard}`}>
                    <div className="flex items-center gap-2.5 mb-4">
                      <img
                        src={AI_BUDDIES[isReviewing ? (reviewEntry?.solutionBuddyId ?? solutionBuddyId) : solutionBuddyId]?.image ?? solutionBuddy.image}
                        alt="buddy"
                        className="w-10 h-10 rounded-full object-cover"
                      />
                      <div>
                        <h3 className="font-bold text-sm">Solution</h3>
                        <p className={`text-[11px] ${T.muted}`}>
                          Explained by {AI_BUDDIES[isReviewing ? (reviewEntry?.solutionBuddyId ?? solutionBuddyId) : solutionBuddyId]?.name ?? solutionBuddy.name}
                        </p>
                      </div>
                    </div>

                    {solutionLoading && !isReviewing ? (
                      <div className="space-y-2.5 py-2">
                        {[100, 88, 94, 72, 83, 90, 65].map((w, i) => (
                          <div key={i} className={`h-3 rounded-full animate-pulse ${isDark ? 'bg-[#1e2538]' : 'bg-gray-200'}`} style={{ width: `${w}%` }} />
                        ))}
                      </div>
                    ) : (
                      <>
                        <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                          {renderLatex(isReviewing ? (reviewEntry?.solution || 'Solution not available.') : solution)}
                        </div>
                        {(displayQ ?? Q)!.solution_image_url && (
                          <div className="mt-4 relative group">
                            <div className={`rounded-xl border overflow-hidden flex items-center justify-center max-h-64 ${T.imgWrapper}`}>
                              <img src={(displayQ ?? Q)!.solution_image_url!} alt="Solution"
                                className="max-h-56 max-w-full object-contain cursor-zoom-in select-none"
                                onClick={() => setImageModal((displayQ ?? Q)!.solution_image_url!)} />
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* Simpler explanation */}
                    {!solutionLoading && solution && !aiFollowup && !aiFollowupLoading && (
                      <div className="mt-5">
                        <motion.button whileTap={{ scale: 0.97 }} onClick={handleFollowup}
                          className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-colors ${isDark ? 'bg-white text-black border-white hover:bg-gray-100' : 'bg-[#0f172a] text-white border-[#0f172a] hover:bg-[#1e293b]'}`}>
                          <FiSmile size={13} /> Simpler Explanation
                        </motion.button>
                      </div>
                    )}
                    {aiFollowupLoading && (
                      <div className="flex items-center gap-2 mt-4"><Spinner size={16} /><span className={`text-sm ${T.muted}`}>Generating…</span></div>
                    )}
                    {aiFollowup && (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        className={`mt-4 rounded-xl border p-4 text-sm leading-relaxed whitespace-pre-wrap ${T.followCard}`}>
                        {aiFollowup}
                      </motion.div>
                    )}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className={`fixed bottom-0 left-0 right-0 h-16 backdrop-blur-sm border-t flex items-center justify-between px-4 sm:px-6 z-40 transition-colors ${T.footer}`}>
        {/* Back — goes to previous answered question for review */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={isReviewing && historyIndex === 0 ? () => setHistoryIndex(-1) : goBack}
          disabled={history.length === 0 && !isReviewing}
          className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${
            history.length === 0 && !isReviewing
              ? `opacity-25 ${T.btnSecondary}`
              : T.btnSecondary
          }`}
          title="Previous question"
        >
          <FiChevronLeft size={18} />
        </motion.button>

        {/* Centre: bookmark + summary */}
        <div className="flex items-center gap-2">
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleBookmark}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${
              bookmarked
                ? isDark ? 'bg-white text-black border-white' : 'bg-[#0f172a] text-white border-[#0f172a]'
                : T.btnSecondary
            }`}>
            {bookmarked ? <IoBookmark size={17} /> : <FiBookmark size={17} />}
          </motion.button>

          <motion.button whileTap={{ scale: 0.97 }} onClick={() => setShowSummary(true)}
            className={`text-xs font-medium px-3 py-2 rounded-xl border transition-colors ${T.btnSecondary}`}>
            {sessionCount} done
          </motion.button>
        </div>

        {/* Next / Forward */}
        {isReviewing ? (
          /* In review — forward arrow goes toward present */
          <motion.button
            whileTap={{ scale: 0.97 }} onClick={goForward}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${isDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-[#0f172a] text-white hover:bg-[#1e293b]'}`}
          >
            {historyIndex < history.length - 1 ? 'Next' : 'Next'}
            <FiArrowRight size={15} />
          </motion.button>
        ) : selectedOption !== null ? (
          <motion.button whileTap={{ scale: 0.97 }} onClick={advanceToNext}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-colors ${isDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-[#0f172a] text-white hover:bg-[#1e293b]'}`}>
            Next <FiArrowRight size={15} />
          </motion.button>
        ) : (
          <div className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold opacity-30 ${isDark ? 'bg-white text-black' : 'bg-[#0f172a] text-white'}`}>
            Next <FiArrowRight size={15} />
          </div>
        )}
      </div>
    </div>
  )
}
