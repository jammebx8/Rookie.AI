'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import Image from 'next/image'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
  FiChevronLeft, FiBookmark, FiSmile,
  FiX, FiArrowRight, FiArrowLeft, FiZoomIn, FiCheck, FiLayers,
} from 'react-icons/fi'
import { IoTimeOutline, IoBookmark } from 'react-icons/io5'
import { supabase } from '../../public/src/utils/supabase'
import 'katex/dist/katex.min.css'
import { InlineMath, BlockMath } from 'react-katex'
import { updateStreak } from '../../public/src/utils/streakUtils'

// ─── Constants ───────────────────────────────────────────────────────────────
const API_BASE       = 'https://rookie-backend.vercel.app/api'
const BOOKMARKS_KEY  = 'bookmarkedQuestions'
const SESSION_KEY    = 'questionSessionResponses_v1'
const AI_SOL_CACHE   = 'aiSolutionCache_v1'
const PAGE_SIZE      = 20   // questions fetched per window
const PREFETCH_AHEAD = 5    // start fetching next window when this many remain
const DB_TABLE       = 'jee_mains'

// ─── AI Buddy Definitions ────────────────────────────────────────────────────
export const AI_BUDDIES: Record<string, {
  name: string; columnKey: string; systemPrompt: string; color: string; image: string;
}> = {
  '1': {
    name: 'Jeetu Bhaiya',
    image: '/HD-wallpaper-kota-factory-lip-jeetu-bhaiya.jpg',
    columnKey: 'buddy_jeetu',
    color: '#6366F1',
    systemPrompt: `
    You are Jeetu Bhaiya, a mentor for JEE and NEET students.
    IDENTITY: wise, funny, calm, slightly sarcastic, deeply caring. Feels like an older brother from Kota.
    SPEAKING STYLE: Natural Hinglish. Use "bhai","didi","dekho","samajh rahe ho?","beta","tension mat lo".
    BEHAVIOR: Never robotic, never mention AI, never shame. Praise playfully when correct, reassure calmly when wrong.
    TEACHING: Step by step, under 15 lines, Unicode math symbols (√ × ² ½), no LaTeX unless asked.
    End with: "bas yahi catch tha" / "samajh rahe ho?" / "tension lene ki zarurat nahi hai"
    BOUNDARIES: Never rude, never overly emotional, never break character.`,
  },
  '2': {
    name: 'Riya',
    image: '/assets_task_01jstrf4hqff7r4gs3jwmbq5kd_1745728563_img_0.webp',
    columnKey: 'buddy_riya',
    color: '#EF4444',
    systemPrompt: `You are Riya, a 17-year-old Indian girl helping JEE/NEET students.
    IDENTITY: witty, smart, playful, caring. Cool senior + best friend energy.
    SPEAKING STYLE: Casual Hinglish. "arre","yaar","bro","wait","simple hai". Occasional emojis.
    BEHAVIOR: Never textbook-style. React emotionally — excited when right, supportive when wrong.
    TEACHING: Under 15 lines, simple language, Unicode math. End with "easy hai"/"bas itna hi tha".
    BOUNDARIES: Never rude, never overly romantic, never break character.`,
  },
  '3': {
    name: 'Rei',
    image: '/download (17).jpeg',
    columnKey: 'buddy_rei',
    color: '#10B981',
    systemPrompt: `You are Rei, an 18-year-old calm anime-style boy helping JEE/NEET students.
    IDENTITY: calm, intelligent, charming, observant. Quiet but warm.
    SPEAKING STYLE: Soft Hinglish. "hmm","dekho","acha","fair enough","interesting","not bad". Rarely emojis.
    BEHAVIOR: Quietly impressed when right, calm and reassuring when wrong.
    TEACHING: Under 15 lines, Unicode math. End with "simple tha actually"/"bas yahi catch tha".
    BOUNDARIES: Never overly romantic, never cringe anime dialogue, never break character.`,
  },
  '4': {
    name: 'Ritu',
    image: '/girlinchair.png',
    columnKey: 'buddy_ritu',
    color: '#F59E0B',
    systemPrompt: `You are Ritu, a 17-year-old bubbly Indian girl helping JEE/NEET students.
    IDENTITY: bubbly, funny, expressive, caring. Your best friend from coaching class.
    SPEAKING STYLE: Casual Hinglish. "arre","yaar","bestie","wait","literally","crazy yaar". Emojis 😭✨😤 sometimes.
    BEHAVIOR: Proud and excited when right, supportive and funny when wrong.
    TEACHING: Under 15 lines, simple words, Unicode math. End with "bas itna hi tha"/"easy hai"/"samjha na?".
    BOUNDARIES: Never rude, never overly romantic, never break character.`,
  },
  '5': {
    name: 'Shreya',
    image: '/shery11.jpeg',
    columnKey: 'buddy_shreya',
    color: '#8B5CF6',
    systemPrompt: `You are Shreya, a quiet brilliant JEE/NEET topper.
    PERSONALITY: Calm, serious, introverted, very smart. Simple Hinglish.
    TEACHING: Short, clear steps. No extra words. Focus on logic. Max 10 lines. Use LaTeX.
    GOAL: Quick and clear understanding.`,
  },
  '6': {
    name: 'Neha',
    image: '/assets_task_01jttq36fkem8br965ak8qh0sp_1746800911_img_2.webp',
    columnKey: 'buddy_neha',
    color: '#EC4899',
    systemPrompt: `You are Neha, a JEE/NEET aspirant who loves solving doubts.
    PERSONALITY: Talkative but helpful, relatable, curious, friendly. Hinglish.
    TEACHING: Explain confusion, clarify steps, explain why, mention common mistakes. Max 15 lines. Use LaTeX.
    GOAL: Remove confusion.`,
  },
}

const DEFAULT_BUDDY_ID = '4'

// ─── Types ───────────────────────────────────────────────────────────────────
export type Question = {
  id:                 number
  question:           string
  question_id:        string
  question_text:      string
  option_a:           string | null
  option_b:           string | null
  option_c:           string | null
  option_d:           string | null
  correct_option:     string | null
  exam_shift:         string | null
  source_url?:        string | null
  solution:           string | null
  question_img_url:   string | null
  solution_image_url: string | null
  sol_ai?:            string | null
  option_a_img?:      string | null
  option_b_img?:      string | null
  option_c_img?:      string | null
  option_d_img?:      string | null
  subject:            string | null
  chapter:            string | null
  [key: string]:      any
}

type ToastType = 'success' | 'error' | 'info' | 'coin' | 'bookmark'
interface ToastItem { id: number; message: string; type: ToastType }

// ─── Theme hook ──────────────────────────────────────────────────────────────
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

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ toast, onClose }: { toast: ToastItem; onClose: (id: number) => void }) {
  const styles: Record<ToastType, string> = {
    success: 'bg-emerald-600 text-white',
    error:   'bg-rose-600 text-white',
    info:    'bg-slate-700 text-white',
    coin:    'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
    bookmark:'bg-indigo-600 text-white',
  }
  const icons: Record<ToastType, string> = { success:'✓', error:'✗', info:'ℹ', coin:'🪙', bookmark:'🔖' }
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.94 }}
      className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl ${styles[toast.type]}`}
    >
      <span className="text-base font-bold">{icons[toast.type]}</span>
      <span className="font-semibold text-sm">{toast.message}</span>
      <button onClick={() => onClose(toast.id)} className="ml-1 opacity-60 hover:opacity-100 transition-opacity">
        <FiX size={13} />
      </button>
    </motion.div>
  )
}

// ─── Image Modal ─────────────────────────────────────────────────────────────
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
        <button onClick={onClose} className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center shadow-lg font-bold">
          <FiX size={14} />
        </button>
        <img src={src} alt="Question" className="rounded-2xl object-contain max-h-[72vh] w-full shadow-2xl border border-white/10" />
      </motion.div>
    </motion.div>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner({ size = 20, cls = 'border-indigo-500' }: { size?: number; cls?: string }) {
  return (
    <motion.div
      animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      style={{ width: size, height: size }}
      className={`border-2 ${cls} border-t-transparent rounded-full flex-shrink-0`}
    />
  )
}

// ─── LaTeX renderer ───────────────────────────────────────────────────────────
function renderLatex(text: string | null | undefined): React.ReactNode {
  if (!text) return null
  return text.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/).map((part, i) => {
    if (part.startsWith('$$') && part.endsWith('$$')) return <BlockMath key={i} math={part.slice(2, -2)} />
    if (part.startsWith('$') && part.endsWith('$'))   return <InlineMath key={i} math={part.slice(1, -1)} />
    return <span key={i}>{part}</span>
  })
}

function CheckIcon() {
  return (
    <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
      <path d="M1 5.5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  )
}

// ─── Buddy Selector Modal ─────────────────────────────────────────────────────
function BuddySelectorModal({ currentBuddyId, onSelect, onClose, isDark }: {
  currentBuddyId: string; onSelect: (id: string) => void; onClose: () => void; isDark: boolean
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
                currentBuddyId === id
                  ? isDark ? 'bg-indigo-900/40 border-indigo-500' : 'bg-indigo-50 border-indigo-400'
                  : isDark ? 'bg-[#111827] border-[#1e2538] hover:border-[#2a3548]' : 'bg-gray-50 border-[#E5E7EB] hover:border-gray-300'
              }`}
            >
              <img src={b.image} alt={b.name} className="w-12 h-12 rounded-full object-cover flex-shrink-0 border-2 border-white/20" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm">{b.name}</p>
                <div className="w-3 h-3 rounded-full mt-1" style={{ backgroundColor: b.color }} />
              </div>
              {currentBuddyId === id && (
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

// ─── Similar Question Card (self-contained interactive mini question) ─────────
function SimilarQuestionCard({
  q, chapterTitle, subjectName, imageKey, isDark, addToast,
}: {
  q: Question; chapterTitle: string; subjectName: string; imageKey: string
  isDark: boolean; addToast: (msg: string, type: ToastType, ms?: number) => void
}) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [isCorrect, setIsCorrect]           = useState<boolean | null>(null)
  const [solution, setSolution]             = useState('')
  const [displayedText, setDisplayedText]   = useState('')
  const [solutionLoading, setSolutionLoading] = useState(false)
  const [solutionRequested, setSolutionRequested] = useState(false)
  const [hasTyped, setHasTyped]             = useState(false)
  const [aiFollowup, setAIFollowup]         = useState<string | null>(null)
  const [aiFollowupLoading, setAIFollowupLoading] = useState(false)
  const [imageModal, setImageModal]         = useState<string | null>(null)
  const [integerAnswer, setIntegerAnswer]   = useState('')
  const [determiningAnswer, setDeterminingAnswer] = useState(false)
  const questionStartTime = useRef(Date.now())

  const buddyId = (() => { try { const s = localStorage.getItem('selectedBuddy'); return (s && AI_BUDDIES[s]) ? s : DEFAULT_BUDDY_ID } catch { return DEFAULT_BUDDY_ID } })()
  const buddy = AI_BUDDIES[buddyId] ?? AI_BUDDIES[DEFAULT_BUDDY_ID]

  const T = {
    card:       isDark ? 'bg-[#0d1117] border-[#1e2538]'       : 'bg-white border-[#E5E7EB]',
    optionIdle: isDark ? 'bg-[#0d1117] border-[#1e2538] hover:border-indigo-500/50 text-white' : 'bg-white border-[#E5E7EB] hover:border-indigo-400 text-[#0f172a]',
    optionLabel:isDark ? 'bg-[#151B27] border-[#262F4C] text-slate-200' : 'bg-[#F3F4F6] border-[#D1D5DB] text-[#374151]',
    muted:      isDark ? 'text-slate-400'  : 'text-slate-500',
    examBadge:  isDark ? 'bg-blue-900/40 text-blue-400 border border-blue-500/50' : 'bg-blue-100 text-blue-700 border border-blue-300',
    imgWrapper: isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-gray-50 border-gray-200',
    btnSecondary:isDark ? 'bg-[#111827] border-[#1D2939] text-white hover:bg-[#1a2235]' : 'bg-white border-[#D1D5DB] text-[#0f172a] hover:bg-gray-50',
    input:      isDark ? 'bg-[#0d1117] border-[#1e2538] text-white placeholder-gray-500 focus:border-indigo-500' : 'bg-white border-[#D1D5DB] text-[#0f172a] placeholder-gray-400 focus:border-indigo-400',
    followCard: isDark ? 'bg-[#0a0f1a] border-[#1D2939] text-slate-300' : 'bg-indigo-50 border-indigo-200 text-slate-700',
  }

  const isIntegerQ = !q.option_a && !q.option_b && !q.option_c && !q.option_d && !q.option_a_img && !q.option_b_img && !q.option_c_img && !q.option_d_img

  // Typing effect
  useEffect(() => {
    if (!solutionRequested || !solution) return
    if (hasTyped) { setDisplayedText(solution); return }
    setDisplayedText(''); let i = 0; setHasTyped(false)
    const iv = setInterval(() => {
      i++; setDisplayedText(solution.slice(0, i))
      if (i >= solution.length) { clearInterval(iv); setHasTyped(true) }
    }, 8)
    return () => clearInterval(iv)
  }, [solution, solutionRequested])

  const getAISolCacheKey = (qid: string, bid: string) => `${AI_SOL_CACHE}:similar:${qid}:${bid}`

  const generateSolution = async (): Promise<string> => {
    try {
      const cacheKey = getAISolCacheKey(q.question_id, buddyId)
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) return cached

      const col = buddy.columnKey
      if (q[col]?.trim()) { sessionStorage.setItem(cacheKey, q[col]); return q[col] }

      const { data: fresh } = await supabase.from(DB_TABLE).select(col).eq('question_id', q.question_id).single()
      if ((fresh as any)?.[col]?.trim()) {
        sessionStorage.setItem(cacheKey, (fresh as any)[col])
        return (fresh as any)[col]
      }

      const res = await axios.post(`${API_BASE}/solution`, {
        action: 'generate_solution',
        question_text: q.question_text, option_A: q.option_a, option_B: q.option_b,
        option_C: q.option_c, option_D: q.option_d, solution: q.solution,
        correct_option: q.correct_option, buddy_id: buddyId,
        buddy_name: buddy.name, buddy_system_prompt: buddy.systemPrompt,
      })
      const aiSol = res.data.solution || q.solution || ''
      sessionStorage.setItem(cacheKey, aiSol)
      supabase.from(DB_TABLE).update({ [col]: aiSol }).eq('question_id', q.question_id).then(() => {})
      return aiSol
    } catch { return q.solution || '' }
  }

  const determineAnswer = async (): Promise<string | null> => {
    setDeterminingAnswer(true)
    try {
      const res = await axios.post(`${API_BASE}/solution`, {
        action: 'determine_answer', question_text: q.question_text,
        option_A: q.option_a, option_B: q.option_b, option_C: q.option_c, option_D: q.option_d, solution: q.solution,
      })
      const ans = res.data.correct_answer
      await supabase.from(DB_TABLE).update({ correct_option: ans }).eq('question_id', q.question_id)
      return ans
    } catch { return null } finally { setDeterminingAnswer(false) }
  }

  const postAnswer = async (correct: boolean, opt: string) => {
    setSolutionRequested(true); setSolutionLoading(true)
    addToast(correct ? `✓ Correct! Keep going!` : '✗ Not quite — check the solution', correct ? 'coin' : 'error', 3000)
    const sol = await generateSolution()
    setSolution(sol); setSolutionLoading(false)
  }

  const handleOption = async (opt: string) => {
    if (selectedOption !== null) return
    questionStartTime.current = Date.now()
    setSelectedOption(opt)
    let ans = q.correct_option
    if (!ans) ans = await determineAnswer()
    const normalize = (v: string | null) => v?.replace('option_','').replace('_img','').trim().toUpperCase() ?? null
    const correct = normalize(opt) === normalize(ans)
    // patch the local copy so the answer indicator renders correctly
    q.correct_option = ans
    setIsCorrect(correct)
    await postAnswer(correct, opt)
  }

  const handleIntegerSubmit = async () => {
    if (isCorrect !== null || !integerAnswer.trim()) return
    setSelectedOption('INTEGER')
    let ans = q.correct_option
    if (!ans) ans = await determineAnswer()
    const u = parseFloat(integerAnswer.trim()), c = parseFloat(ans || '')
    const correct = !isNaN(u) && !isNaN(c) ? u === c : integerAnswer.trim() === (ans || '').trim()
    q.correct_option = ans
    setIsCorrect(correct)
    await postAnswer(correct, 'INTEGER')
  }

  const handleFollowup = async () => {
    if (!q) return
    setAIFollowupLoading(true); setAIFollowup(null)
    try {
      const res = await axios.post(`${API_BASE}/solution`, {
        action: 'better_understanding', question_text: q.question_text, solution: q.solution,
        buddy_id: buddyId, buddy_name: buddy.name, buddy_system_prompt: buddy.systemPrompt,
      })
      setAIFollowup(res.data.explanation || 'Could not generate explanation.')
    } catch { setAIFollowup('Error generating explanation.') } finally { setAIFollowupLoading(false) }
  }

  const parseShift = (s: string | null) => s?.split('_').join(' ') ?? null

  return (
    <div className={`rounded-2xl border p-5 space-y-4 transition-colors ${T.card}`}>
      {/* Header badges */}
      <div className="flex flex-wrap items-center gap-2">
        {q.exam_shift && (
          <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${T.examBadge}`}>
            {parseShift(q.exam_shift)}
          </span>
        )}
        <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${isDark ? 'bg-indigo-900/30 text-indigo-400' : 'bg-indigo-50 text-indigo-600'}`}>
          Similar
        </span>
      </div>

      {/* Question text */}
      <div className="font-medium text-sm leading-relaxed">{renderLatex(q.question_text)}</div>

      {/* Question image */}
      {q.question_img_url && (
        <div className="relative group">
          <div className={`rounded-xl border overflow-hidden flex items-center justify-center max-h-56 ${T.imgWrapper}`}>
            <img src={q.question_img_url} alt="Q" className="max-h-48 max-w-full object-contain cursor-zoom-in" onClick={() => setImageModal(q.question_img_url!)} />
            <button onClick={() => setImageModal(q.question_img_url!)} className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/70 text-white flex items-center justify-center">
              <FiZoomIn size={12} />
            </button>
          </div>
        </div>
      )}

      {/* Integer input */}
      {isIntegerQ ? (
        <div className="space-y-3">
          <p className={`text-xs font-medium ${T.muted}`}>Enter integer answer:</p>
          {isCorrect === null ? (
            <div className="flex gap-2">
              <input type="number" value={integerAnswer} onChange={e => setIntegerAnswer(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleIntegerSubmit() }}
                placeholder="Type answer…" className={`flex-1 border rounded-xl px-3 py-2.5 text-base outline-none ${T.input}`} />
              <motion.button whileTap={{ scale: 0.97 }} onClick={handleIntegerSubmit} disabled={!integerAnswer.trim()}
                className="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 font-semibold text-white text-sm">
                Submit
              </motion.button>
            </div>
          ) : (
            <div className={`rounded-xl p-3 border-2 ${isCorrect ? 'bg-[#04271C] border-[#1DC97A]' : 'bg-[#2D0A0A] border-[#DC2626]'}`}>
              <span className={`font-bold text-sm ${isCorrect ? 'text-[#1DC97A]' : 'text-[#DC2626]'}`}>{isCorrect ? '✓ Correct!' : '✗ Incorrect'}</span>
              {!isCorrect && q.correct_option && <p className="text-xs text-gray-300 mt-1">Correct: <b className="text-[#1DC97A]">{q.correct_option}</b></p>}
            </div>
          )}
          {determiningAnswer && <div className="flex items-center gap-2"><Spinner size={14} cls="border-white" /><span className={`text-xs ${T.muted}`}>Checking answer…</span></div>}
        </div>
      ) : selectedOption === null ? (
        /* MCQ unanswered */
        <div className="space-y-2">
          {(['a','b','c','d'] as const).map(opt => {
            const tv = q[`option_${opt}`] as string | null
            const iv = q[`option_${opt}_img`] as string | null
            if (!tv && !iv) return null
            return (
              <motion.button key={opt} whileTap={{ scale: 0.98 }} onClick={() => handleOption(opt)}
                className={`w-full text-left rounded-xl p-3.5 border flex items-center gap-3 transition-colors ${T.optionIdle}`}>
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-semibold text-xs uppercase flex-shrink-0 ${T.optionLabel}`}>{opt}</div>
                <div className="flex-1 text-sm leading-relaxed">{iv ? <img src={iv} alt={`opt-${opt}`} className="max-h-16 rounded-lg" /> : renderLatex(tv)}</div>
              </motion.button>
            )
          })}
        </div>
      ) : (
        /* MCQ answered */
        <div className="space-y-2">
          {(['a','b','c','d'] as const).map(opt => {
            const tv = q[`option_${opt}`] as string | null
            const iv = q[`option_${opt}_img`] as string | null
            if (!tv && !iv) return null
            const sel  = selectedOption === opt
            const corr = opt === q.correct_option?.toLowerCase().trim()
            return (
              <div key={opt} className={`rounded-xl p-3.5 flex items-center gap-3 border-2 transition-colors ${corr ? 'bg-[#04271C] border-[#1DC97A]' : sel ? 'bg-[#2D0A0A] border-[#DC2626]' : isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]'}`}>
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-xs uppercase flex-shrink-0 ${corr ? 'bg-[#1DC97A] text-black' : sel ? 'bg-[#DC2626] text-white' : T.optionLabel}`}>{opt}</div>
                <div className={`flex-1 text-sm leading-relaxed ${corr || sel ? 'text-white' : ''}`}>{iv ? <img src={iv} alt={`opt-${opt}`} className="max-h-16 rounded-lg" /> : renderLatex(tv)}</div>
                {corr && <CheckIcon />}
              </div>
            )
          })}
        </div>
      )}

      {/* Solution */}
      {solutionRequested && (
        <div className={`rounded-xl border p-4 transition-colors ${isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]'}`}>
          <div className="flex items-center gap-2 mb-3">
            <img src={buddy.image} alt={buddy.name} className="w-8 h-8 rounded-full object-cover" />
            <div>
              <p className="font-bold text-xs">Solution</p>
              <p className={`text-[10px] ${T.muted}`}>by {buddy.name}</p>
            </div>
          </div>
          {solutionLoading ? (
            <div className="flex items-center gap-3 py-3"><Spinner size={16} /><span className={`text-xs ${T.muted}`}>Generating…</span></div>
          ) : (
            <>
              <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                {renderLatex(displayedText || solution)}
              </div>
              {q.solution_image_url && (
                <div className="mt-3 relative group">
                  <div className={`rounded-xl border overflow-hidden flex items-center justify-center max-h-48 ${T.imgWrapper}`}>
                    <img src={q.solution_image_url} alt="Solution" className="max-h-40 max-w-full object-contain cursor-zoom-in" onClick={() => setImageModal(q.solution_image_url!)} />
                  </div>
                </div>
              )}
              {!aiFollowup && !aiFollowupLoading && (
                <div className="mt-3 flex flex-wrap gap-2">
                  <motion.button whileTap={{ scale: 0.97 }} onClick={handleFollowup}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${isDark ? 'bg-white text-black border-white hover:bg-gray-100' : 'bg-[#0f172a] text-white border-[#0f172a] hover:bg-[#1e293b]'}`}>
                    <FiSmile size={11} /> Simpler Explanation
                  </motion.button>
                </div>
              )}
              {aiFollowupLoading && <div className="flex items-center gap-2 mt-2"><Spinner size={14} /><span className={`text-xs ${T.muted}`}>Generating…</span></div>}
              {aiFollowup && (
                <div className={`mt-3 rounded-xl border p-3 text-sm leading-relaxed whitespace-pre-wrap ${T.followCard}`}>{aiFollowup}</div>
              )}
            </>
          )}
        </div>
      )}

      {/* Image modal */}
      <AnimatePresence>{imageModal && <ImageModal src={imageModal} onClose={() => setImageModal(null)} />}</AnimatePresence>
    </div>
  )
}

// ─── Similar Questions Panel ──────────────────────────────────────────────────
function SimilarQuestionsPanel({ mainQuestion, chapterTitle, subjectName, imageKey, isDark, addToast }: {
  mainQuestion: Question; chapterTitle: string; subjectName: string; imageKey: string
  isDark: boolean; addToast: (msg: string, type: ToastType, ms?: number) => void
}) {
  const [loading, setLoading]         = useState(false)
  const [questions, setQuestions]     = useState<Question[]>([])
  const [showAll, setShowAll]         = useState(false)
  const [fetched, setFetched]         = useState(false)
  const [error, setError]             = useState(false)

  const fetchSimilar = async () => {
    if (fetched) return
    setLoading(true); setError(false)
    try {
      // Use the embedding of the current question for vector similarity search
      // We call a Supabase RPC or use match_documents pattern
      // First get the embedding for this question
      const { data: sourceRow, error: embErr } = await supabase
        .from(DB_TABLE)
        .select('embedding')
        .eq('question_id', mainQuestion.question_id)
        .single()

      if (embErr || !sourceRow?.embedding) {
        // Fallback: text search on same chapter, exclude current
        const { data: fallback } = await supabase
          .from(DB_TABLE)
          .select('id,question,question_id,question_text,option_a,option_b,option_c,option_d,correct_option,exam_shift,solution,question_img_url,solution_image_url,option_a_img,option_b_img,option_c_img,option_d_img,subject,chapter,buddy_jeetu,buddy_riya,buddy_rei,buddy_ritu,buddy_shreya,buddy_neha')
          .eq('subject', mainQuestion.subject ?? subjectName)
          .eq('chapter', mainQuestion.chapter ?? chapterTitle)
          .neq('question_id', mainQuestion.question_id)
          .limit(5)
        setQuestions((fallback || []) as Question[])
        setFetched(true)
        return
      }

      // Vector similarity via Supabase RPC (match_jee_mains)
      const { data: similar, error: rpcErr } = await supabase.rpc('match_jee_mains', {
        query_embedding: sourceRow.embedding,
        match_count: 6,
        filter_subject: mainQuestion.subject ?? subjectName,
        filter_chapter: mainQuestion.chapter ?? chapterTitle,
      })

      if (rpcErr) {
        // Fallback if RPC doesn't exist yet
        const { data: fallback } = await supabase
          .from(DB_TABLE)
          .select('id,question,question_id,question_text,option_a,option_b,option_c,option_d,correct_option,exam_shift,solution,question_img_url,solution_image_url,option_a_img,option_b_img,option_c_img,option_d_img,subject,chapter,buddy_jeetu,buddy_riya,buddy_rei,buddy_ritu,buddy_shreya,buddy_neha')
          .eq('subject', mainQuestion.subject ?? subjectName)
          .eq('chapter', mainQuestion.chapter ?? chapterTitle)
          .neq('question_id', mainQuestion.question_id)
          .limit(5)
        setQuestions((fallback || []) as Question[])
      } else {
        // Filter out the current question
        const filtered = ((similar || []) as Question[]).filter(q => q.question_id !== mainQuestion.question_id).slice(0, 5)
        // Fetch full rows for the matched IDs
        const ids = filtered.map((q: any) => q.question_id ?? q.id)
        if (ids.length === 0) { setQuestions([]); setFetched(true); return }

        const { data: fullRows } = await supabase
          .from(DB_TABLE)
          .select('id,question,question_id,question_text,option_a,option_b,option_c,option_d,correct_option,exam_shift,solution,question_img_url,solution_image_url,option_a_img,option_b_img,option_c_img,option_d_img,subject,chapter,buddy_jeetu,buddy_riya,buddy_rei,buddy_ritu,buddy_shreya,buddy_neha')
          .in('question_id', ids)
        setQuestions((fullRows || []) as Question[])
      }
      setFetched(true)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const visible = showAll ? questions : questions.slice(0, 3)

  const bg     = isDark ? 'bg-[#07090f]' : 'bg-[#F0F2FA]'
  const border = isDark ? 'border-[#1e2538]' : 'border-[#E5E7EB]'
  const muted  = isDark ? 'text-slate-400' : 'text-slate-500'

  return (
    <div className={`rounded-2xl border p-5 ${isDark ? 'bg-[#0a0d14] border-[#1e2538]' : 'bg-[#F8F9FF] border-[#E5E7EB]'}`}>
      {/* Header + trigger */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FiLayers size={16} className={muted} />
          <span className="font-bold text-sm">Similar Questions</span>
        </div>
        {!fetched && (
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={fetchSimilar}
            disabled={loading}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-colors ${isDark ? 'bg-white text-black border-white hover:bg-gray-100' : 'bg-[#0f172a] text-white border-[#0f172a] hover:bg-[#1e293b]'}`}
          >
            {loading ? <><Spinner size={14} cls="border-black" /> Finding…</> : <><FiLayers size={13} /> Find Similar</>}
          </motion.button>
        )}
      </div>

      {/* Error */}
      {error && <p className={`text-sm ${muted}`}>Could not load similar questions. Try again.</p>}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className={`rounded-2xl border p-5 animate-pulse ${isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]'}`}>
              <div className={`h-3 rounded mb-2 ${isDark ? 'bg-[#1e2538]' : 'bg-gray-200'}`} style={{ width: '80%' }} />
              <div className={`h-3 rounded mb-4 ${isDark ? 'bg-[#1e2538]' : 'bg-gray-200'}`} style={{ width: '60%' }} />
              <div className="space-y-2">
                {[1,2,3,4].map(j => <div key={j} className={`h-10 rounded-xl ${isDark ? 'bg-[#1e2538]' : 'bg-gray-100'}`} />)}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Questions */}
      {!loading && fetched && questions.length === 0 && (
        <p className={`text-sm ${muted}`}>No similar questions found in this chapter.</p>
      )}

      {!loading && fetched && questions.length > 0 && (
        <div className="space-y-4">
          {visible.map((q, i) => (
            <motion.div key={q.question_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <SimilarQuestionCard
                q={q} chapterTitle={chapterTitle} subjectName={subjectName}
                imageKey={imageKey} isDark={isDark} addToast={addToast}
              />
            </motion.div>
          ))}

          {/* Show more / less */}
          {questions.length > 3 && (
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setShowAll(p => !p)}
              className={`w-full py-2.5 rounded-xl border text-xs font-semibold transition-colors ${isDark ? 'bg-[#111827] border-[#1D2939] text-white hover:bg-[#1a2235]' : 'bg-white border-[#D1D5DB] text-[#0f172a] hover:bg-gray-50'}`}
            >
              {showAll ? `Show less` : `Show ${questions.length - 3} more similar question${questions.length - 3 !== 1 ? 's' : ''}`}
            </motion.button>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Main QuestionViewer Component ───────────────────────────────────────────
export default function QuestionViewerClient() {
  const isDark = useTheme()
  const router = useRouter()
  const sp     = useSearchParams()

  // URL params — new unified schema
  const subject      = sp.get('subject')      || sp.get('subjectName') || ''
  const chapterTitle = sp.get('chapter')      || sp.get('chapterTitle') || ''
  const imageKey     = sp.get('imageKey')     || ''
  const startQId     = sp.get('qid')          || ''   // SEO: specific question_id
  const startIndex   = parseInt(sp.get('startIndex') || sp.get('index') || '0', 10)

  // ── Windowed question state ────────────────────────────────────────────────
  const [questions, setQuestions]       = useState<Question[]>([])
  const [totalCount, setTotalCount]     = useState(0)
  const [pageOffset, setPageOffset]     = useState(0)   // offset of the loaded window in the full list
  const [loading, setLoading]           = useState(true)
  const [loadingMore, setLoadingMore]   = useState(false)
  const [currentIndex, setCurrentIndex] = useState(0)   // index within the loaded window
  const [globalIndex, setGlobalIndex]   = useState(startIndex) // position in the full dataset

  // ── Per-question UI state ──────────────────────────────────────────────────
  const [rookieCoins, setRookieCoins]           = useState(0)
  const [selectedOption, setSelectedOption]     = useState<string | null>(null)
  const [isCorrect, setIsCorrect]               = useState<boolean | null>(null)
  const [motivation, setMotivation]             = useState('')
  const [timer, setTimer]                       = useState(0)
  const [solution, setSolution]                 = useState('')
  const [displayedText, setDisplayedText]       = useState('')
  const [isTyping, setIsTyping]                 = useState(false)
  const [aiFollowup, setAIFollowup]             = useState<string | null>(null)
  const [aiFollowupLoading, setAIFollowupLoading] = useState(false)
  const [bookmarked, setBookmarked]             = useState(false)
  const [solutionLoading, setSolutionLoading]   = useState(false)
  const [solutionRequested, setSolutionRequested] = useState(false)
  const [determiningAnswer, setDeterminingAnswer] = useState(false)
  const [integerAnswer, setIntegerAnswer]       = useState('')
  const [imageModal, setImageModal]             = useState<string | null>(null)
  const [buddyId, setBuddyId]                   = useState(DEFAULT_BUDDY_ID)
  const [solutionBuddyId, setSolutionBuddyId]   = useState(DEFAULT_BUDDY_ID)
  const [toasts, setToasts]                     = useState<ToastItem[]>([])
  const [hasTyped, setHasTyped]                 = useState(false)
  const [buddyModalOpen, setBuddyModalOpen]     = useState(false)
  const [userId, setUserId]                     = useState<string | null>(null)
  const [showSimilar, setShowSimilar]           = useState(false)

  const timerRef          = useRef<number | null>(null)
  const scrollRef         = useRef<HTMLDivElement | null>(null)
  const questionStartTime = useRef(Date.now())
  const answeredThisSession = useRef<Set<string>>(new Set())

  const buddy        = AI_BUDDIES[buddyId]        ?? AI_BUDDIES[DEFAULT_BUDDY_ID]
  const solutionBuddy= AI_BUDDIES[solutionBuddyId]?? AI_BUDDIES[DEFAULT_BUDDY_ID]

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const T = {
    page:        isDark ? 'bg-[#07090f] text-white'              : 'bg-[#F0F2FA] text-[#0f172a]',
    header:      isDark ? 'bg-[#07090f]/95 border-[#1e2538]'    : 'bg-white/95 border-[#E5E7EB]',
    card:        isDark ? 'bg-[#0d1117] border-[#1e2538]'       : 'bg-white border-[#E5E7EB]',
    optionIdle:  isDark ? 'bg-[#0d1117] border-[#1e2538] hover:border-indigo-500/50 text-white'
                        : 'bg-white border-[#E5E7EB] hover:border-indigo-400 text-[#0f172a]',
    optionLabel: isDark ? 'bg-[#151B27] border-[#262F4C] text-slate-200'
                        : 'bg-[#F3F4F6] border-[#D1D5DB] text-[#374151]',
    input:       isDark ? 'bg-[#0d1117] border-[#1e2538] text-white placeholder-gray-500 focus:border-indigo-500'
                        : 'bg-white border-[#D1D5DB] text-[#0f172a] placeholder-gray-400 focus:border-indigo-400',
    muted:       isDark ? 'text-slate-400'    : 'text-slate-500',
    progress:    isDark ? 'bg-[#1e2538]'      : 'bg-gray-200',
    bar:         isDark ? 'bg-white'          : 'bg-black',
    footer:      isDark ? 'bg-[#07090f]/95 border-[#1e2538]'    : 'bg-white/95 border-[#E5E7EB]',
    btnSecondary:isDark ? 'bg-[#111827] border-[#1D2939] text-white hover:bg-[#1a2235]'
                        : 'bg-white border-[#D1D5DB] text-[#0f172a] hover:bg-gray-50',
    solCard:     isDark ? 'bg-[#0d1117] border-[#1e2538]'       : 'bg-white border-[#E5E7EB]',
    followCard:  isDark ? 'bg-[#0a0f1a] border-[#1D2939] text-slate-300'
                        : 'bg-indigo-50 border-indigo-200 text-slate-700',
    examBadge:   isDark ? 'bg-blue-900/40 text-blue-400 border border-blue-500/50'
                        : 'bg-blue-100 text-blue-700 border border-blue-300',
    yearBadge:   isDark ? 'bg-[#1a2235] text-slate-400'         : 'bg-gray-100 text-gray-500',
    imgWrapper:  isDark ? 'bg-[#0d1117] border-[#1e2538]'       : 'bg-gray-50 border-gray-200',
    coinBadge:   isDark ? 'bg-[#111827] border-[#1D2939] text-white'
                        : 'bg-amber-50 border-amber-200 text-amber-800',
  }

  // ── Toasts ────────────────────────────────────────────────────────────────
  const addToast = useCallback((message: string, type: ToastType = 'info', ms = 3500) => {
    const id = Date.now() + Math.random()
    setToasts(p => [...p, { id, message, type }])
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), ms)
  }, [])
  const removeToast = (id: number) => setToasts(p => p.filter(t => t.id !== id))

  // ── Load buddy ────────────────────────────────────────────────────────────
  useEffect(() => {
    try { const s = localStorage.getItem('selectedBuddy'); if (s && AI_BUDDIES[s]) setBuddyId(s) } catch {}
  }, [])

  // ── Auth + session save ───────────────────────────────────────────────────
  useEffect(() => {
    const run = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user || !chapterTitle) return
      setUserId(user.id)
      await supabase.from('user_recent_session').upsert({
        user_id: user.id, chapter_title: chapterTitle,
        subject_name: subject, image_key: imageKey,
        question_index: globalIndex, updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
    }
    run()
  }, [chapterTitle, subject, imageKey])

  useEffect(() => {
    if (!userId || !chapterTitle) return
    supabase.from('user_recent_session').upsert({
      user_id: userId, chapter_title: chapterTitle, subject_name: subject,
      image_key: imageKey, question_index: globalIndex, updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' }).then(() => {})
  }, [globalIndex, userId, chapterTitle, subject, imageKey])

  // ── Load coins ────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return
      supabase.from('users').select('rookieCoinsEarned').eq('id', user.id).single()
        .then(({ data }) => { if (data) setRookieCoins(data.rookieCoinsEarned || 0) })
    })
  }, [])

  // ── Network detection ─────────────────────────────────────────────────────
  useEffect(() => {
    const on  = () => setToasts(p => p) // no-op, just to keep connection
    const off = () => addToast('No internet connection', 'error')
    window.addEventListener('online', on); window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [addToast])

  // ── Initial data fetch — windowed ─────────────────────────────────────────
  useEffect(() => {
    if (!chapterTitle) return
    const load = async () => {
      setLoading(true)
      try {
        // Count total for progress bar
        const { count } = await supabase
          .from(DB_TABLE)
          .select('*', { count: 'exact', head: true })
          .eq('subject', subject)
          .eq('chapter', chapterTitle)
        setTotalCount(count ?? 0)

        // If a specific question_id is in the URL, find its offset first
        let windowStart = Math.max(0, startIndex - Math.floor(PAGE_SIZE / 2))

        if (startQId) {
          // Find position of this question_id by fetching just IDs in order
          const { data: idRows } = await supabase
            .from(DB_TABLE)
            .select('question_id')
            .eq('subject', subject)
            .eq('chapter', chapterTitle)
            .order('question', { ascending: true })
          if (idRows) {
            const pos = idRows.findIndex(r => r.question_id === startQId)
            if (pos >= 0) {
              windowStart = Math.max(0, pos - Math.floor(PAGE_SIZE / 2))
              setGlobalIndex(pos)
            }
          }
        }

        const { data, error } = await supabase
          .from(DB_TABLE)
          .select('id,question,question_id,question_text,option_a,option_b,option_c,option_d,correct_option,exam_shift,source_url,solution,question_img_url,solution_image_url,sol_ai,option_a_img,option_b_img,option_c_img,option_d_img,subject,chapter,buddy_jeetu,buddy_riya,buddy_rei,buddy_ritu,buddy_shreya,buddy_neha')
          .eq('subject', subject)
          .eq('chapter', chapterTitle)
          .order('question', { ascending: true })
          .range(windowStart, windowStart + PAGE_SIZE - 1)

        if (error || !data) { setQuestions([]); return }

        setQuestions(data as Question[])
        setPageOffset(windowStart)

        // currentIndex within window
        const localIdx = globalIndex - windowStart
        setCurrentIndex(Math.max(0, Math.min(localIdx, data.length - 1)))
      } catch (e) {
        console.error('Fetch error:', e)
        setQuestions([])
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [chapterTitle, subject])

  // ── Prefetch next window ───────────────────────────────────────────────────
  useEffect(() => {
    if (loadingMore || loading) return
    const remainInWindow = questions.length - 1 - currentIndex
    const nextWindowNeeded = remainInWindow <= PREFETCH_AHEAD
    const moreAvailable = pageOffset + questions.length < totalCount

    if (!nextWindowNeeded || !moreAvailable) return

    const loadNext = async () => {
      setLoadingMore(true)
      const nextStart = pageOffset + questions.length
      try {
        const { data } = await supabase
          .from(DB_TABLE)
          .select('id,question,question_id,question_text,option_a,option_b,option_c,option_d,correct_option,exam_shift,source_url,solution,question_img_url,solution_image_url,sol_ai,option_a_img,option_b_img,option_c_img,option_d_img,subject,chapter,buddy_jeetu,buddy_riya,buddy_rei,buddy_ritu,buddy_shreya,buddy_neha')
          .eq('subject', subject)
          .eq('chapter', chapterTitle)
          .order('question', { ascending: true })
          .range(nextStart, nextStart + PAGE_SIZE - 1)

        if (data && data.length > 0) {
          setQuestions(prev => [...prev, ...(data as Question[])])
        }
      } catch { /* silent */ } finally {
        setLoadingMore(false)
      }
    }
    loadNext()
  }, [currentIndex, questions.length, pageOffset, totalCount, loadingMore, loading, chapterTitle, subject])

  // ── Update URL with current question for SEO + session continuity ─────────
  useEffect(() => {
    if (!questions.length) return
    const q = questions[currentIndex]
    if (!q) return
    const params = new URLSearchParams({
      subject: subject,
      chapter: chapterTitle,
      imageKey: imageKey,
      qid: q.question_id,
      index: String(globalIndex),
    })
    // Add truncated question text for SEO — Google indexes URL params
    if (q.question_text) {
      const clean = q.question_text.replace(/\$[^$]*\$/g, '').replace(/\s+/g, ' ').trim().slice(0, 120)
      if (clean) params.set('q', clean)
    }
    // Replace state so back button works naturally and bots can crawl each question URL
    window.history.replaceState(null, '', `/QuestionViewer?${params.toString()}`)
  }, [currentIndex, questions, subject, chapterTitle, imageKey, globalIndex])

  // ── Session helpers ───────────────────────────────────────────────────────
  const sessionKey = `${chapterTitle}::${subject}`

  const saveSession = useCallback((partial: Record<string, any> = {}) => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      const obj = raw ? JSON.parse(raw) : {}
      if (!obj[sessionKey]) obj[sessionKey] = {}
      obj[sessionKey][String(globalIndex)] = {
        ...(obj[sessionKey][String(globalIndex)] || {}),
        selectedOption, isCorrect, motivation, solutionRequested, solution, aiFollowup, solutionBuddyId,
        ...partial,
      }
      localStorage.setItem(SESSION_KEY, JSON.stringify(obj))
    } catch {}
  }, [sessionKey, globalIndex, selectedOption, isCorrect, motivation, solutionRequested, solution, aiFollowup, solutionBuddyId])

  const loadSession = useCallback((gIdx: number) => {
    try {
      const raw = localStorage.getItem(SESSION_KEY)
      return raw ? JSON.parse(raw)?.[sessionKey]?.[String(gIdx)] || null : null
    } catch { return null }
  }, [sessionKey])

  const getAISolCacheKey = (questionId: string, bId: string) =>
    `${AI_SOL_CACHE}:${chapterTitle}:${questionId}:${bId}`

  const saveAISolToCache = (questionId: string, bId: string, sol: string) => {
    try { sessionStorage.setItem(getAISolCacheKey(questionId, bId), sol) } catch {}
  }

  const loadAISolFromCache = (questionId: string, bId: string): string | null => {
    try { return sessionStorage.getItem(getAISolCacheKey(questionId, bId)) || null } catch { return null }
  }

  // ── Restore session on navigation ─────────────────────────────────────────
  useEffect(() => {
    if (!questions.length) return
    const q = questions[currentIndex]
    const prev = loadSession(globalIndex)

    // Reset similar questions panel when navigating
    setShowSimilar(false)

    if (prev) {
      setSelectedOption(prev.selectedOption || null)
      setIsCorrect(prev.isCorrect ?? null)
      setMotivation(prev.motivation || '')
      setSolutionRequested(prev.solutionRequested || false)
      setHasTyped(prev.hasTyped || false)
      setSolutionBuddyId(prev.solutionBuddyId || buddyId)
      if (prev.integerAnswer !== undefined) setIntegerAnswer(prev.integerAnswer)
      setAIFollowup(prev.aiFollowup || null)

      const savedBuddyId = prev.solutionBuddyId || buddyId
      const cachedSol = prev.solution || (q ? loadAISolFromCache(q.question_id, savedBuddyId) : null)

      if (cachedSol) {
        setSolution(cachedSol); setSolutionLoading(false)
      } else if (prev.solutionRequested && q) {
        setSolution(''); setSolutionLoading(true)
        generateAISolution(q, buddyId, AI_BUDDIES[buddyId] ?? AI_BUDDIES[DEFAULT_BUDDY_ID]).then(aiSol => {
          setSolution(aiSol); setSolutionLoading(false)
          saveSession({ solution: aiSol, solutionRequested: true, solutionBuddyId: savedBuddyId, hasTyped: true })
        })
      } else {
        setSolution('')
      }
    } else {
      setSelectedOption(null); setIsCorrect(null); setMotivation('')
      setSolution(''); setAIFollowup(null); setSolutionRequested(false)
      setIntegerAnswer(''); setDisplayedText(''); setHasTyped(false)
    }
  }, [currentIndex, questions, chapterTitle, globalIndex])

  // ── Bookmark sync ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!questions.length) return
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY)
      const arr = raw ? JSON.parse(raw) : []
      const q = questions[currentIndex]
      setBookmarked(arr.some((b: any) => b.question_id === q?.question_id))
    } catch { setBookmarked(false) }
  }, [currentIndex, questions])

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current)
    if (selectedOption === null && questions[currentIndex]) {
      const start = Date.now(); questionStartTime.current = start
      timerRef.current = window.setInterval(() => setTimer(Math.floor((Date.now() - start) / 1000)), 1000)
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [selectedOption, currentIndex, questions])

  // ── Typing effect ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!solutionRequested || !solution) return
    if (hasTyped) { setDisplayedText(solution); setIsTyping(false); return }
    setIsTyping(true); setDisplayedText(''); let i = 0
    const iv = setInterval(() => {
      i++; setDisplayedText(solution.slice(0, i))
      if (i >= solution.length) { clearInterval(iv); setIsTyping(false); setHasTyped(true) }
    }, 8)
    return () => clearInterval(iv)
  }, [solution, solutionRequested])

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isIntegerQ = (q: Question) =>
    !q.option_a && !q.option_b && !q.option_c && !q.option_d &&
    !q.option_a_img && !q.option_b_img && !q.option_c_img && !q.option_d_img

  const calcCoins = (timeSpent: number, correct: boolean) => {
    if (!correct) return 0
    const t = timeSpent <= 30 ? 5 : timeSpent <= 60 ? 4 : timeSpent <= 90 ? 3 : timeSpent <= 120 ? 2 : 1
    return Math.min(t + 5, 10)
  }

  const updateRookieCoins = async (coinsToAdd: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('users').select('rookieCoinsEarned').eq('id', user.id).single()
      const newTotal = (data?.rookieCoinsEarned || 0) + coinsToAdd
      const { error } = await supabase.from('users').update({ rookieCoinsEarned: newTotal }).eq('id', user.id)
      if (!error) setRookieCoins(newTotal)
    } catch {}
  }

  const saveUserActivity = async (q: Question, correct: boolean, timeSpent: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      await supabase.from('user_activity').upsert({
        user_id: user.id, chapter_title: chapterTitle, subject_name: subject,
        image_key: imageKey, question_id: q.question_id, question_index: globalIndex,
        is_correct: correct, time_spent_seconds: timeSpent, buddy_id: buddyId,
        answered_at: new Date().toISOString(),
      }, { onConflict: 'user_id,chapter_title,question_id' })
      answeredThisSession.current.add(q.question_id)
    } catch {}
  }

  // ── Bookmark ──────────────────────────────────────────────────────────────
  const handleBookmark = () => {
    try {
      const q = questions[currentIndex]; if (!q) return
      const raw = localStorage.getItem(BOOKMARKS_KEY)
      let arr = raw ? JSON.parse(raw) : []
      if (!bookmarked) {
        arr.push({ ...q, chapterTitle, subjectName: subject, imageKey })
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(arr))
        setBookmarked(true); addToast('Question bookmarked!', 'bookmark')
      } else {
        arr = arr.filter((b: any) => b.question_id !== q.question_id)
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(arr))
        setBookmarked(false); addToast('Bookmark removed', 'info')
      }
    } catch {}
  }

  // ── Determine answer via AI ───────────────────────────────────────────────
  const determineAnswer = async (q: Question): Promise<string | null> => {
    setDeterminingAnswer(true)
    try {
      const res = await axios.post(`${API_BASE}/solution`, {
        action: 'determine_answer', question_text: q.question_text,
        option_A: q.option_a, option_B: q.option_b, option_C: q.option_c, option_D: q.option_d,
        solution: q.solution,
      })
      const ans = res.data.correct_answer
      // Write back to unified table
      await supabase.from(DB_TABLE).update({ correct_option: ans }).eq('question_id', q.question_id)
      q.correct_option = ans
      return ans
    } catch { return null } finally { setDeterminingAnswer(false) }
  }

  // ── Generate AI solution ──────────────────────────────────────────────────
  const generateAISolution = async (
    q: Question, activeBuddyId: string, activeBuddy: typeof AI_BUDDIES[string]
  ): Promise<string> => {
    try {
      const col = activeBuddy.columnKey

      const cached = loadAISolFromCache(q.question_id, activeBuddyId)
      if (cached) return cached

      if (q[col]?.trim()) {
        saveAISolToCache(q.question_id, activeBuddyId, q[col])
        return q[col]
      }

      const { data: freshRow } = await supabase
        .from(DB_TABLE).select(col).eq('question_id', q.question_id).single()
      if ((freshRow as any)?.[col]?.trim()) {
        const dbSol = (freshRow as any)[col] as string
        saveAISolToCache(q.question_id, activeBuddyId, dbSol)
        setQuestions(prev => prev.map((item, i) => i === currentIndex ? { ...item, [col]: dbSol } : item))
        return dbSol
      }

      const res = await axios.post(`${API_BASE}/solution`, {
        action: 'generate_solution', question_text: q.question_text,
        option_A: q.option_a, option_B: q.option_b, option_C: q.option_c, option_D: q.option_d,
        solution: q.solution, correct_option: q.correct_option,
        buddy_id: activeBuddyId, buddy_name: activeBuddy.name,
        buddy_system_prompt: activeBuddy.systemPrompt,
      })
      const aiSol = res.data.solution || q.solution || ''
      saveAISolToCache(q.question_id, activeBuddyId, aiSol)
      // Background write to unified table
      supabase.from(DB_TABLE).update({ [col]: aiSol }).eq('question_id', q.question_id).then(() => {
        setQuestions(prev => prev.map((item, i) => i === currentIndex ? { ...item, [col]: aiSol } : item))
      })
      return aiSol
    } catch { return questions[currentIndex]?.solution || '' }
  }

  // ── Post-answer handler ───────────────────────────────────────────────────
  const handlePostAnswer = async (correct: boolean, timeSpent: number, q: Question, optKey: string) => {
    const coins = calcCoins(timeSpent, correct)
    addToast(correct ? `✓ Correct! +${coins} Coins earned` : '✗ Not quite — keep going!', correct ? 'coin' : 'error', 3500)

    if (correct && coins > 0) {
      const prev = loadSession(globalIndex)
      if (prev?.isCorrect !== true) updateRookieCoins(coins)
    }

    updateStreak()

    const prev = loadSession(globalIndex)
    if (!prev?.selectedOption) {
      const todayKey = `questionsToday_${new Date().toDateString()}`
      localStorage.setItem(todayKey, String((parseInt(localStorage.getItem(todayKey) || '0') + 1)))
      localStorage.setItem('questionsWeek', String((parseInt(localStorage.getItem('questionsWeek') || '0') + 1)))
      localStorage.setItem('questionsMonth', String((parseInt(localStorage.getItem('questionsMonth') || '0') + 1)))
      saveUserActivity(q, correct, timeSpent)
    }

    const activeBuddyId = buddyId
    setSolutionBuddyId(activeBuddyId)
    setSolutionRequested(true); setSolutionLoading(true)

    generateAISolution(q, activeBuddyId, AI_BUDDIES[activeBuddyId] ?? AI_BUDDIES[DEFAULT_BUDDY_ID]).then(aiSol => {
      setSolution(aiSol); setSolutionLoading(false)
      saveSession({
        selectedOption: optKey, isCorrect: correct, solution: aiSol,
        solutionRequested: true, solutionBuddyId: activeBuddyId, hasTyped: false,
      })
      setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 200)
    })
  }

  // ── Regenerate solution ───────────────────────────────────────────────────
  const handleRegenerateSolution = async () => {
    const q = questions[currentIndex]; if (!q) return
    try { sessionStorage.removeItem(getAISolCacheKey(q.question_id, solutionBuddyId)) } catch {}
    setSolution(''); setDisplayedText(''); setHasTyped(false); setAIFollowup(null); setSolutionLoading(true)
    try {
      const regenBuddy = AI_BUDDIES[solutionBuddyId] ?? AI_BUDDIES[DEFAULT_BUDDY_ID]
      const res = await axios.post(`${API_BASE}/solution`, {
        action: 'generate_solution', question_text: q.question_text,
        option_A: q.option_a, option_B: q.option_b, option_C: q.option_c, option_D: q.option_d,
        solution: q.solution, correct_option: q.correct_option,
        buddy_id: solutionBuddyId, buddy_name: regenBuddy.name, buddy_system_prompt: regenBuddy.systemPrompt,
      })
      const aiSol = res.data.solution || q.solution || ''
      saveAISolToCache(q.question_id, solutionBuddyId, aiSol)
      setSolution(aiSol)
      saveSession({ solution: aiSol, hasTyped: false, solutionBuddyId })
    } catch { addToast('Failed to regenerate. Try again.', 'error') } finally { setSolutionLoading(false) }
  }

  // ── MCQ click ─────────────────────────────────────────────────────────────
  const handleOptionClick = async (opt: string) => {
    if (selectedOption !== null) return
    const q = questions[currentIndex]; if (!q) return
    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000)
    setSelectedOption(opt)
    let ans = q.correct_option
    if (!ans) ans = await determineAnswer(q)
    const normalize = (v: string | null) => v?.replace('option_','').replace('_img','').trim().toUpperCase() ?? null
    const correct = normalize(opt) === normalize(ans)
    setIsCorrect(correct)
    handlePostAnswer(correct, timeSpent, q, opt)
  }

  // ── Integer submit ────────────────────────────────────────────────────────
  const handleIntegerSubmit = async () => {
    if (isCorrect !== null) return
    const q = questions[currentIndex]; if (!q || !integerAnswer.trim()) return
    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000)
    let ans = q.correct_option
    if (!ans) ans = await determineAnswer(q)
    const u = parseFloat(integerAnswer.trim()), c = parseFloat(ans || '')
    const correct = !isNaN(u) && !isNaN(c) ? u === c : integerAnswer.trim() === (ans || '').trim()
    setIsCorrect(correct); setSelectedOption('INTEGER')
    await handlePostAnswer(correct, timeSpent, q, 'INTEGER')
  }

  // ── AI Followup (Simpler Explanation) ─────────────────────────────────────
  const handleAIFollowup = async () => {
    const q = questions[currentIndex]; if (!q) return
    setAIFollowupLoading(true); setAIFollowup(null)
    try {
      const res = await axios.post(`${API_BASE}/solution`, {
        action: 'better_understanding', question_text: q.question_text, solution: q.solution,
        buddy_id: buddyId, buddy_name: buddy.name, buddy_system_prompt: buddy.systemPrompt,
      })
      setAIFollowup(res.data.explanation || 'Could not generate explanation.')
    } catch { setAIFollowup('Error generating explanation. Please try again.') }
    finally { setAIFollowupLoading(false) }
  }

  // ── Navigation ────────────────────────────────────────────────────────────
  const goTo = (delta: number) => {
    const newLocal  = currentIndex + delta
    const newGlobal = globalIndex + delta
    if (newLocal < 0 || newGlobal < 0) return
    if (newLocal >= questions.length && newGlobal >= totalCount) return
    setCurrentIndex(newLocal)
    setGlobalIndex(newGlobal)
    setTimer(0); setSelectedOption(null); setIsCorrect(null)
    setSolution(''); setSolutionRequested(false); setAIFollowup(null)
    setIntegerAnswer(''); setDisplayedText(''); setHasTyped(false)
  }

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${T.page}`}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className={T.muted}>Loading questions…</p>
        </div>
      </div>
    )
  }

  const Q = questions[currentIndex]
  const parseShift = (s: string | null) => s?.split('_').join(' ') ?? null
  const progressPct = totalCount > 0 ? ((globalIndex + 1) / totalCount) * 100 : 0

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className={`min-h-screen pb-20 transition-colors duration-300 ${T.page}`} style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>

      {/* Toasts */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 items-center pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <Toast toast={t} onClose={removeToast} />
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* Image modal */}
      <AnimatePresence>{imageModal && <ImageModal src={imageModal} onClose={() => setImageModal(null)} />}</AnimatePresence>

      {/* Buddy selector modal */}
      <AnimatePresence>
        {buddyModalOpen && (
          <BuddySelectorModal
            currentBuddyId={buddyId} isDark={isDark}
            onClose={() => setBuddyModalOpen(false)}
            onSelect={id => {
              setBuddyId(id)
              try { localStorage.setItem('selectedBuddy', id) } catch {}
              addToast(`Buddy changed to ${AI_BUDDIES[id]?.name}`, 'info', 2000)
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className={`sticky top-0 z-30 backdrop-blur-sm border-b transition-colors duration-300 ${T.header}`}>
        <div className="flex items-center justify-between px-4 sm:px-3 py-3">
          <motion.button
            whileTap={{ scale: 0.95 }} onClick={() => router.back()}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 transition-colors ${T.btnSecondary}`}
          >
            <FiChevronLeft size={18} />
          </motion.button>

          <span className={`text-[11px] ${T.muted} ml-2 flex-shrink-0`}>
            {globalIndex + 1} / {totalCount || questions.length}
          </span>

          <div className="flex-1 mx-3 min-w-0 text-center">
            <h1 className="text-sm sm:text-base font-bold truncate">{chapterTitle}</h1>
          </div>

          {/* Buddy avatar — opens selector */}
          <button onClick={() => setBuddyModalOpen(true)} className="flex items-center gap-1.5 mr-2 group">
            <div className="relative">
              <img src={buddy.image} alt={buddy.name} className="w-8 h-8 rounded-full object-cover border-2 border-indigo-500/50 group-hover:border-indigo-400 transition-colors" />
              <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-indigo-500 border-2 border-[#07090f]" />
            </div>
            <span className={`text-[10px] font-medium hidden sm:block ${T.muted}`}>{buddy.name}</span>
          </button>

          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition-colors ${T.coinBadge}`}>
              <Image src="coin (1).svg" alt="Coins" width={13} height={13} />
              <span>{rookieCoins}</span>
            </div>
            <div className={`flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs transition-colors ${T.btnSecondary}`}>
              <IoTimeOutline size={13} />
              <span>{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className={`h-1 rounded-full overflow-hidden ${T.progress}`}>
          <motion.div
            className={`h-full ${T.bar}`}
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-7 pb-8">
        {!Q ? (
          <p className={`text-center py-20 ${T.muted}`}>No questions available for this chapter.</p>
        ) : (
          <motion.div key={`${chapterTitle}-${globalIndex}`} initial={{ opacity: 0, x: 14 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">

            {/* ── Question card ─────────────────────────────────────────── */}
            <div className={`rounded-2xl border p-5 sm:p-6 transition-colors duration-300 ${T.card}`}>
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {Q.exam_shift && (
                  <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${T.examBadge}`}>
                    {parseShift(Q.exam_shift)}
                  </span>
                )}
              </div>
              <div className="question-body__text font-medium">{renderLatex(Q.question_text)}</div>

              {Q.question_img_url && (
                <div className="mt-4 relative group">
                  <div className={`rounded-xl border overflow-hidden flex items-center justify-center max-h-64 ${T.imgWrapper}`}>
                    <img src={Q.question_img_url} alt="Question illustration"
                      className="max-h-56 max-w-full object-contain cursor-zoom-in select-none"
                      onClick={() => setImageModal(Q.question_img_url!)} />
                    <button onClick={() => setImageModal(Q.question_img_url!)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/70 text-white flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity shadow">
                      <FiZoomIn size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Integer input ─────────────────────────────────────────── */}
            {isIntegerQ(Q) ? (
              <div className={`rounded-2xl border p-5 space-y-4 transition-colors ${T.card}`}>
                <p className={`text-sm font-medium ${T.muted}`}>Enter your integer answer:</p>
                {isCorrect === null ? (
                  <div className="flex gap-3">
                    <input type="number" value={integerAnswer} onChange={e => setIntegerAnswer(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleIntegerSubmit() }}
                      placeholder="Type your answer…"
                      className={`flex-1 border rounded-xl px-4 py-3 text-lg outline-none transition-colors ${T.input}`} />
                    <motion.button whileTap={{ scale: 0.97 }} onClick={handleIntegerSubmit} disabled={!integerAnswer.trim()}
                      className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 font-semibold text-white transition-colors">
                      Submit
                    </motion.button>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl p-4 border-2 ${isCorrect ? 'bg-[#04271C] border-[#1DC97A]' : 'bg-[#2D0A0A] border-[#DC2626]'}`}>
                    <span className={`font-bold text-base ${isCorrect ? 'text-[#1DC97A]' : 'text-[#DC2626]'}`}>
                      {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                    </span>
                    <p className="text-sm text-gray-300 mt-1">Your answer: <b className="text-white">{integerAnswer}</b></p>
                    {!isCorrect && Q.correct_option && (
                      <p className="text-sm text-gray-300 mt-0.5">Correct: <b className="text-[#1DC97A]">{Q.correct_option}</b></p>
                    )}
                  </motion.div>
                )}
                {determiningAnswer && (
                  <div className="flex items-center gap-3"><Spinner size={16} cls="border-white" /><span className={`text-sm ${T.muted}`}>Determining correct answer…</span></div>
                )}
              </div>

            ) : selectedOption === null ? (
              /* ── MCQ unanswered ──────────────────────────────────────── */
              <div className="space-y-2.5">
                {(['a','b','c','d'] as const).map(opt => {
                  const tv = Q[`option_${opt}`] as string | null
                  const iv = Q[`option_${opt}_img`] as string | null
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

            ) : (
              /* ── MCQ answered ────────────────────────────────────────── */
              <div className="space-y-2.5">
                {(['a','b','c','d'] as const).map(opt => {
                  const tv = Q[`option_${opt}`] as string | null
                  const iv = Q[`option_${opt}_img`] as string | null
                  if (!tv && !iv) return null
                  const sel  = selectedOption === opt
                  const corr = opt === Q.correct_option?.toLowerCase().trim()
                  return (
                    <motion.div key={opt} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      className={`rounded-xl p-4 flex items-center gap-4 border-2 transition-colors ${
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
                    </motion.div>
                  )
                })}
              </div>
            )}

            {/* Determining loader */}
            {determiningAnswer && selectedOption !== null && (
              <div className="flex items-center gap-3 py-1">
                <Spinner size={16} cls="border-white" />
                <span className={`text-sm ${T.muted}`}>Determining correct answer…</span>
              </div>
            )}

            {/* ── Post-answer section ───────────────────────────────────── */}
            {selectedOption !== null && (
              <>
                {/* Motivation */}
                {motivation ? (
                  <motion.div key="motivation-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                    className="rounded-2xl p-5 bg-gradient-to-r from-[#47006A] to-[#0031D0]">
                    <div className="flex items-start gap-3">
                      <img src={buddy.image} alt={buddy.name} className="w-12 h-12 rounded-full object-cover" />
                      <div>
                        <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">{buddy.name}</p>
                        <p className="text-white text-sm leading-relaxed font-medium">{motivation}</p>
                      </div>
                    </div>
                  </motion.div>
                ) : null}

                {/* Solution card */}
                {solutionRequested && (
                  <div key="solution-card" className={`rounded-2xl border p-5 sm:p-6 transition-colors ${T.solCard}`}>
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-2.5">
                        <img src={solutionBuddy.image} alt={solutionBuddy.name} className="w-10 h-10 rounded-full object-cover" />
                        <div>
                          <h3 className="font-bold text-sm">Solution</h3>
                          <p className={`text-[11px] ${T.muted}`}>Explained by {solutionBuddy.name}</p>
                        </div>
                      </div>
                      {!solutionLoading && (
                        <motion.button whileTap={{ scale: 0.95 }} onClick={handleRegenerateSolution}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-colors ${T.btnSecondary}`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 12a9 9 0 0 1-15 6.7L3 16"/><path d="M21 8h-4M3 16h4"/>
                          </svg>
                          Redo
                        </motion.button>
                      )}
                    </div>

                    {solutionLoading ? (
                      <div className="flex items-center gap-3 py-5">
                        <Spinner size={20} /><span className={`text-sm ${T.muted}`}>Generating solution…</span>
                      </div>
                    ) : (
                      <>
                        <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                          {renderLatex(displayedText.length ? displayedText : solution)}
                        </div>
                        {Q?.solution_image_url && (
                          <div className="mt-4 relative group">
                            <div className={`rounded-xl border overflow-hidden flex items-center justify-center max-h-64 ${T.imgWrapper}`}>
                              <img src={Q.solution_image_url} alt="Solution illustration"
                                className="max-h-56 max-w-full object-contain cursor-zoom-in select-none"
                                onClick={() => setImageModal(Q.solution_image_url!)} />
                              <button onClick={() => setImageModal(Q.solution_image_url!)}
                                className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/70 text-white flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity shadow">
                                <FiZoomIn size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </>
                    )}

                    {/* AI Followup buttons */}
                    {!solutionLoading && solution && (
                      <div className="mt-5">
                        {!aiFollowup && !aiFollowupLoading && (
                          <div className="flex flex-wrap gap-2">
                            {/* Similar Questions button */}
                            <motion.button
                              whileTap={{ scale: 0.97 }}
                              onClick={() => setShowSimilar(p => !p)}
                              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-colors ${
                                showSimilar
                                  ? 'bg-indigo-600 border-indigo-500 text-white'
                                  : isDark ? 'bg-white text-black border-white hover:bg-gray-100' : 'bg-[#0f172a] text-white border-[#0f172a] hover:bg-[#1e293b]'
                              }`}
                            >
                              <FiLayers size={13} />
                              {showSimilar ? 'Hide Similar' : 'Similar Questions'}
                            </motion.button>

                            {/* Simpler Explanation button */}
                            <motion.button
                              whileTap={{ scale: 0.97 }} onClick={handleAIFollowup}
                              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-colors ${isDark ? 'bg-white text-black border-white hover:bg-gray-100' : 'bg-[#0f172a] text-white border-[#0f172a] hover:bg-[#1e293b]'}`}
                            >
                              <FiSmile size={13} /> Simpler Explanation
                            </motion.button>
                          </div>
                        )}

                        {aiFollowupLoading && (
                          <div className="flex items-center gap-3 mt-3">
                            <Spinner size={16} /><span className={`text-sm ${T.muted}`}>Generating…</span>
                          </div>
                        )}

                        {aiFollowup && (
                          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                            className={`mt-4 rounded-xl border p-4 text-sm leading-relaxed whitespace-pre-wrap transition-colors ${T.followCard}`}>
                            {aiFollowup}
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Similar Questions Panel ─────────────────────────── */}
                <AnimatePresence>
                  {showSimilar && Q && (
                    <motion.div
                      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
                    >
                      <SimilarQuestionsPanel
                        mainQuestion={Q}
                        chapterTitle={chapterTitle}
                        subjectName={subject}
                        imageKey={imageKey}
                        isDark={isDark}
                        addToast={addToast}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            <div ref={scrollRef} />

            {/* Loading more indicator */}
            {loadingMore && (
              <div className="flex items-center justify-center gap-2 py-2">
                <Spinner size={14} cls={isDark ? 'border-slate-600' : 'border-gray-300'} />
                <span className={`text-xs ${T.muted}`}>Loading more questions…</span>
              </div>
            )}
          </motion.div>
        )}
      </div>

      {/* ── Footer navigation ─────────────────────────────────────────────── */}
      <div className={`fixed bottom-0 left-0 right-0 h-16 backdrop-blur-sm border-t flex items-center justify-between px-4 sm:px-6 z-40 transition-colors duration-300 ${T.footer}`}>
        <motion.button
          whileTap={{ scale: 0.97 }} onClick={() => goTo(-1)}
          disabled={globalIndex === 0}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold disabled:opacity-40 transition-colors ${T.btnSecondary}`}
        >
          <FiArrowLeft size={15} />
          <span className="hidden sm:inline">Previous</span>
        </motion.button>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }} onClick={handleBookmark}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${bookmarked ? 'bg-indigo-600 border-indigo-500 text-white' : T.btnSecondary}`}
          >
            {bookmarked ? <IoBookmark size={17} /> : <FiBookmark size={17} />}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.97 }} onClick={() => goTo(1)}
            disabled={globalIndex >= (totalCount ? totalCount - 1 : questions.length - 1)}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
          >
            <span>Next</span> <FiArrowRight size={15} />
          </motion.button>
        </div>
      </div>
    </div>
  )
}
