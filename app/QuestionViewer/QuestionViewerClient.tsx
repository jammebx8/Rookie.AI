'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Check, ChevronLeft, Clock, Coins,
  Layers, Loader2, Lock, RotateCcw, Smile, ZoomIn,
} from 'lucide-react'
import { toast } from 'sonner'
import { supabase } from '../../public/src/utils/supabase'
import 'katex/dist/katex.min.css'
import { updateStreak } from '../../public/src/utils/streakUtils'
import { updateAbilityVector } from '../../lib/recommendation'
import { sortByDifficulty, autoBookmarkWrong } from '../../lib/adaptivePractice'
import { renderContent } from '../components/renderContent'
import { track, startSolutionTimer } from '../../lib/analytics'
import { sale, saleMoney } from '@/lib/sale'
import { cn } from '@/lib/utils'
import { useIsDark } from '@/components/rookie/theme'
import { Define } from '@/components/rookie/define'
import { Card, EmptyState, OmrOption, Skeleton, Tag } from '@/components/rookie/ui'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import RookiePassModal from './RookiePassModal'

// ─── Constants ───────────────────────────────────────────────────────────────
const API_BASE       = 'https://rookie-backend.vercel.app'
const BOOKMARKS_KEY  = 'bookmarkedQuestions'
const SESSION_KEY    = 'questionSessionResponses_v1'
const AI_SOL_CACHE   = 'aiSolutionCache_v1'
const PAGE_SIZE      = 20   // questions fetched per window
const PREFETCH_AHEAD = 5    // start fetching next window when this many remain
const DB_TABLE_MAIN  = 'jee_mains'
const DB_TABLE_ADV   = 'jee_adv'

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

// ─── Answer-line reconciliation ───────────────────────────────────────────────
// The "determine correct option" call and the "generate full solution" call
// are two independent LLM requests fired in parallel (see handleOptionClick /
// handleOption below). Each is capable of naming a correct option on its own,
// so — rarely — they could disagree. This patches the solution text's final
// "Answer: Option X" line to always match the confirmed answer from the fast
// determine-answer call, so the visible text can never contradict the
// green/red highlight colors, regardless of what the slower solution-writing
// call guessed.
function reconcileAnswerLine(text: string, confirmedAnswer: string | null): string {
  if (!text) return text
  if (!confirmedAnswer) return text
  const letter = confirmedAnswer.replace(/option_?/gi, '').replace(/[^a-dA-D]/g, '').slice(0, 1).toUpperCase()
  if (!letter) return text
  const pattern = /Answer:\s*Option\s*[A-Da-d]?\.?/i
  if (pattern.test(text)) {
    return text.replace(pattern, `Answer: Option ${letter}`)
  }
  return `${text.trim()}\n\nAnswer: Option ${letter}`
}

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
  option_a_img?:      string | null
  option_b_img?:      string | null
  option_c_img?:      string | null
  option_d_img?:      string | null
  subject:            string | null
  chapter:            string | null
  [key: string]:      any
}

export type ToastType = 'success' | 'error' | 'info' | 'coin' | 'bookmark' | 'warning'

// ─── Image zoom (Dialog) ─────────────────────────────────────────────────────
function ImageZoom({ src, onClose }: { src: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!src} onOpenChange={open => { if (!open) onClose() }}>
      <DialogContent className="max-w-[calc(100%-2rem)] gap-0 rounded-card bg-card p-3 sm:max-w-3xl">
        <DialogTitle className="sr-only">Zoomed image</DialogTitle>
        {src && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={src} alt="Zoomed" className="max-h-[78vh] w-full rounded-control bg-white object-contain" />
        )}
      </DialogContent>
    </Dialog>
  )
}

/** Question / solution figure with a zoom affordance. */
function Figure({ src, alt, onZoom, className }: { src: string; alt: string; onZoom: (src: string) => void; className?: string }) {
  return (
    <button type="button" onClick={() => onZoom(src)}
      className={cn('group relative flex w-full cursor-zoom-in items-center justify-center overflow-hidden rounded-control bg-white p-3 ring-1 ring-border transition hover:ring-[var(--rk-sky-300)]', className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="max-h-56 max-w-full select-none object-contain" />
      <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-tag bg-black/60 px-1.5 py-1 text-caption font-medium text-white opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100">
        <ZoomIn className="size-3.5" /> Zoom
      </span>
    </button>
  )
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-4 shrink-0 animate-spin text-muted-foreground', className)} />
}

/** Skeleton lines while a solution is being written. */
function SolutionLines({ widths }: { widths: number[] }) {
  return (
    <div className="space-y-2.5 rounded-control bg-muted p-4">
      {widths.map((w, i) => (
        <div key={i} className="h-3 animate-pulse rounded-full bg-foreground/[.07]" style={{ width: `${w}%` }} />
      ))}
    </div>
  )
}

/** Option body: image or KaTeX text. */
function OptionBody({ text, img, opt, isDark }: { text: string | null; img: string | null; opt: string; isDark: boolean }) {
  return (
    <span className="block leading-relaxed">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {img ? <img src={img} alt={`opt-${opt}`} className="max-h-20 rounded-control bg-white" /> : renderLatex(text, isDark)}
    </span>
  )
}

// ─── LaTeX / content renderer (markdown tables + LaTeX + bold) ───────────────
// Imported from shared utility — kept as a local alias so no call sites change.
const renderLatex = (text: string | null | undefined, isDark = true) => renderContent(text, isDark)

// ─── Buddy Selector (Dialog) ──────────────────────────────────────────────────
function BuddySelectorModal({ open, currentBuddyId, onSelect, onClose }: {
  open: boolean; currentBuddyId: string; onSelect: (id: string) => void; onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="gap-0 rounded-card bg-card p-0 sm:max-w-md">
        <div className="px-6 pt-6 pb-4">
          <DialogTitle className="text-title font-semibold tracking-[-0.015em] text-foreground">
            <Define term="mentor">Choose your buddy</Define>
          </DialogTitle>
          <p className="mt-1 text-body-sm text-muted-foreground">Who should explain your solutions?</p>
        </div>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto px-6 pb-6">
          {Object.entries(AI_BUDDIES).map(([id, b]) => {
            const active = currentBuddyId === id
            return (
              <button key={id} type="button"
                onClick={() => { onSelect(id); onClose() }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left ring-1 transition',
                  active ? 'bg-secondary text-secondary-foreground ring-[var(--rk-sky-300)] dark:ring-transparent' : 'bg-muted ring-transparent hover:bg-secondary',
                )}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={b.image} alt={b.name} className="size-10 shrink-0 rounded-full object-cover" />
                <span className="flex-1 text-body font-medium">{b.name}</span>
                {active && <Check className="size-4 text-primary" strokeWidth={2.5} />}
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/** Normalise an answer to a single lowercase option letter. */
const optLetter = (v: string | null | undefined) =>
  (v ?? '').replace(/option_?/gi, '').replace(/[^a-dA-D]/g, '').slice(0, 1).toLowerCase()

// ─── Similar Question Card (self-contained interactive mini question) ─────────
function SimilarQuestionCard({
  q, chapterTitle, subjectName, imageKey, isDark, addToast, dbTable,
}: {
  q: Question; chapterTitle: string; subjectName: string; imageKey: string
  isDark: boolean; addToast: (msg: string, type: ToastType, ms?: number) => void
  dbTable: string
}) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null)
  const [pendingOption, setPendingOption]   = useState<string | null>(null) // clicked, not yet resolved
  const [isCorrect, setIsCorrect]           = useState<boolean | null>(null)
  const [solution, setSolution]             = useState('')
  const [solutionLoading, setSolutionLoading] = useState(false)
  const [solutionRequested, setSolutionRequested] = useState(false)
  const [aiFollowup, setAIFollowup]         = useState<string | null>(null)
  const [aiFollowupLoading, setAIFollowupLoading] = useState(false)
  const [imageModal, setImageModal]         = useState<string | null>(null)
  const [integerAnswer, setIntegerAnswer]   = useState('')
  // The question object for this card lives in local state so we can update
  // correct_option immutably (mutating the `q` prop in place doesn't
  // reliably re-render, and — more importantly — it doesn't respect the
  // order colors should appear in: grey while resolving, THEN green/red).
  const [localQ, setLocalQ] = useState<Question>(q)
  const questionStartTime = useRef(Date.now())

  const buddyId = (() => { try { const s = localStorage.getItem('selectedBuddy'); return (s && AI_BUDDIES[s]) ? s : DEFAULT_BUDDY_ID } catch { return DEFAULT_BUDDY_ID } })()
  const buddy = AI_BUDDIES[buddyId] ?? AI_BUDDIES[DEFAULT_BUDDY_ID]

  const isIntegerQ = !q.option_a && !q.option_b && !q.option_c && !q.option_d && !q.option_a_img && !q.option_b_img && !q.option_c_img && !q.option_d_img

  const getAISolCacheKey = (qid: string, bid: string) => `${AI_SOL_CACHE}:similar:${qid}:${bid}`

  const generateSolution = async (): Promise<string> => {
    try {
      const cacheKey = getAISolCacheKey(q.question_id, buddyId)
      const cached = sessionStorage.getItem(cacheKey)
      if (cached) return cached

      const col = buddy.columnKey
      if (q[col]?.trim()) { sessionStorage.setItem(cacheKey, q[col]); return q[col] }

      const { data: fresh } = await supabase.from(dbTable).select(col).eq('question_id', q.question_id).single()
      if ((fresh as any)?.[col]?.trim()) {
        sessionStorage.setItem(cacheKey, (fresh as any)[col])
        return (fresh as any)[col]
      }

      const res = await axios.post(`${API_BASE}/solution`, {
        action: 'generate_solution',
        question_text: q.question_text, option_A: q.option_a, option_B: q.option_b,
        option_C: q.option_c, option_D: q.option_d, solution: q.solution,
        correct_option: localQ.correct_option, buddy_id: buddyId,
        buddy_name: buddy.name, buddy_system_prompt: buddy.systemPrompt,
      })
      const aiSol = res.data.solution || q.solution || ''
      sessionStorage.setItem(cacheKey, aiSol)
      supabase.from(dbTable).update({ [col]: aiSol }).eq('question_id', q.question_id).then(() => {})
      return aiSol
    } catch { return q.solution || '' }
  }

  // NOTE: solution generation is fired in parallel with the answer check
  // (see handleOption / handleIntegerSubmit below), so by the time we get
  // here the solution is either already done or already in flight — we
  // just report the result and let the caller plug the solution in.
  const postAnswerMeta = (correct: boolean) => {
    addToast(correct ? `✓ Correct! Keep going!` : '✗ Not quite — check the solution', correct ? 'coin' : 'error', 3000)
  }

  // Order of operations, deliberately:
  //   1. setPendingOption(opt)         → renders the clicked option grey.
  //   2. Fire generateSolution() immediately — correct_option is already in
  //      the DB row, so no answer-determination call is needed.
  //   3. As soon as the fast answer comparison resolves, reveal
  //      selectedOption/isCorrect — the user gets green/red feedback.
  //   4. When the solution promise resolves, plug it in and reconcile the
  //      final "Answer: Option X" line against the correct answer.
  const handleOption = async (opt: string) => {
    if (selectedOption !== null || pendingOption !== null) return
    questionStartTime.current = Date.now()
    setPendingOption(opt)

    // correct_option is always present in the DB — use it directly
    const answerPromise: Promise<string | null> = Promise.resolve(localQ.correct_option ?? q.correct_option ?? null)

    setSolutionRequested(true); setSolutionLoading(true)
    const solutionPromise = generateSolution()

    const normalize = (v: string | null) =>
      v?.replace(/option_?/gi, '').replace(/[^a-dA-D]/g, '').slice(0, 1).toLowerCase() ?? ''

    const ans = await answerPromise
    const correct = normalize(opt) === normalize(ans)
    setIsCorrect(correct)
    setSelectedOption(opt)
    setPendingOption(null)
    postAnswerMeta(correct)

    // ── Track similar question attempt ──────────────────────────────────────
    track('similar_attempted', {
      feature:     'similar',
      question_id: q.question_id,
      subject:     q.subject  ?? undefined,
      chapter:     q.chapter  ?? undefined,
      metadata:    { correct },
    })
    // question_answered with feature='similar' is what the dashboard counts
    track('question_answered', {
      feature:     'similar',
      question_id: q.question_id,
      subject:     q.subject  ?? undefined,
      chapter:     q.chapter  ?? undefined,
      metadata:    { correct },
    })

    const sol = await solutionPromise
    setSolution(reconcileAnswerLine(sol, ans))
    setSolutionLoading(false)
  }

  const handleIntegerSubmit = async () => {
    if (isCorrect !== null || !integerAnswer.trim()) return
    setPendingOption('INTEGER')

    // correct_option is always present in the DB — use it directly
    const answerPromise: Promise<string | null> = Promise.resolve(localQ.correct_option ?? q.correct_option ?? null)

    setSolutionRequested(true); setSolutionLoading(true)
    const solutionPromise = generateSolution()

    const ans = await answerPromise
    const u = parseFloat(integerAnswer.trim()), c = parseFloat(ans || '')
    const correct = !isNaN(u) && !isNaN(c) ? u === c : integerAnswer.trim() === (ans || '').trim()
    setIsCorrect(correct)
    setSelectedOption('INTEGER')
    setPendingOption(null)
    postAnswerMeta(correct)

    // ── Track similar integer attempt ─────────────────────────────────────
    track('similar_attempted', {
      feature:     'similar',
      question_id: q.question_id,
      subject:     q.subject  ?? undefined,
      chapter:     q.chapter  ?? undefined,
      metadata:    { correct },
    })
    track('question_answered', {
      feature:     'similar',
      question_id: q.question_id,
      subject:     q.subject  ?? undefined,
      chapter:     q.chapter  ?? undefined,
      metadata:    { correct },
    })

    const sol = await solutionPromise
    setSolution(reconcileAnswerLine(sol, ans))
    setSolutionLoading(false)
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

  const options = (['a', 'b', 'c', 'd'] as const).filter(opt => q[`option_${opt}`] || q[`option_${opt}_img`])
  const corrLetter = optLetter(localQ.correct_option)

  return (
    <Card className="space-y-4 hover:shadow-none">
      {/* Header badges */}
      <div className="flex flex-wrap items-center gap-2">
        {q.exam_shift && <Tag>{parseShift(q.exam_shift)}</Tag>}
        <Tag tone="blue">Similar</Tag>
      </div>

      {/* Question text */}
      <div className="text-body font-medium leading-relaxed text-foreground">{renderLatex(q.question_text, isDark)}</div>

      {/* Question image */}
      {q.question_img_url && <Figure src={q.question_img_url} alt="Q" onZoom={setImageModal} />}

      {/* Integer input */}
      {isIntegerQ ? (
        <div className="space-y-2">
          <p className="text-meta font-medium text-muted-foreground">Your answer (integer)</p>
          {isCorrect === null ? (
            <div className="flex gap-2">
              <Input type="number" value={integerAnswer} onChange={e => setIntegerAnswer(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleIntegerSubmit() }}
                placeholder="Type answer…" className="h-10 flex-1 rounded-control bg-background text-body" />
              <Button onClick={handleIntegerSubmit} disabled={!integerAnswer.trim()} className="h-10 rounded-control px-4">
                Check
              </Button>
            </div>
          ) : (
            <div className={cn('rounded-control px-4 py-3', isCorrect ? 'bg-[var(--rk-mint-100)] dark:bg-[rgba(134,219,174,.12)]' : 'bg-[#fdecea] dark:bg-[rgba(255,122,102,.12)]')}>
              <Tag tone={isCorrect ? 'right' : 'wrong'}>{isCorrect ? 'Sahi jawab!' : 'Not quite'}</Tag>
              {!isCorrect && localQ.correct_option && <p className="mt-1.5 text-body-sm text-foreground">Correct: <b>{localQ.correct_option}</b></p>}
            </div>
          )}
        </div>
      ) : (
        <div role="radiogroup" className="grid grid-cols-1 md:grid-cols-2 gap-3">

          {options.map(opt => {
            const tv = q[`option_${opt}`] as string | null
            const iv = q[`option_${opt}_img`] as string | null
            const unanswered = selectedOption === null && pendingOption === null
            const pending = selectedOption === null && pendingOption !== null
            const state: 'idle' | 'selected' | 'right' | 'wrong' = unanswered ? 'idle'
              : pending ? (pendingOption === opt ? 'selected' : 'idle')
              : opt === corrLetter ? 'right' : selectedOption === opt ? 'wrong' : 'idle'
            return (
              <OmrOption key={opt} letter={opt.toUpperCase()} state={state} disabled={!unanswered}
                onClick={unanswered ? () => handleOption(opt) : undefined}>
                <span className="flex items-center gap-3">
                  <span className="min-w-0 flex-1"><OptionBody text={tv} img={iv} opt={opt} isDark={isDark} /></span>
                  {pending && pendingOption === opt && <Spinner />}
                  {state === 'right' && <Check className="size-4 text-[var(--rk-mint-600)]" strokeWidth={2.5} />}
                </span>
              </OmrOption>
            )
          })}
        </div>
      )}

      {/* Solution */}
      {solutionRequested && (
        <div className="space-y-3">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={buddy.image} alt={buddy.name} className="size-8 rounded-full object-cover" />
            <div>
              <p className="text-body-sm font-semibold text-foreground">Solution</p>
              <p className="text-caption text-muted-foreground">by {buddy.name}</p>
            </div>
          </div>
          {solutionLoading ? (
            <SolutionLines widths={[100, 85, 92, 70, 80]} />
          ) : (
            <>
              <div className="whitespace-pre-wrap rounded-control bg-muted p-4 text-body-sm leading-relaxed text-foreground">
                {renderLatex(solution, isDark)}
              </div>
              {q.solution_image_url && <Figure src={q.solution_image_url} alt="Solution" onZoom={setImageModal} />}
              {!aiFollowup && !aiFollowupLoading && (
                <Button variant="secondary" onClick={handleFollowup} className="h-8 rounded-control px-3">
                  <Smile /> Simpler explanation
                </Button>
              )}
              {aiFollowupLoading && <div className="flex items-center gap-2"><Spinner /><span className="text-meta text-muted-foreground">Generating…</span></div>}
              {aiFollowup && (
                <div className="whitespace-pre-wrap rounded-control bg-secondary p-4 text-body-sm leading-relaxed text-secondary-foreground">{aiFollowup}</div>
              )}
            </>
          )}
        </div>
      )}

      {/* Image modal */}
      <ImageZoom src={imageModal} onClose={() => setImageModal(null)} />
    </Card>
  )
}

// ─── Similar Questions Panel ──────────────────────────────────────────────────
function SimilarQuestionsPanel({ mainQuestion, chapterTitle, subjectName, imageKey, isDark, addToast, dbTable }: {
  mainQuestion: Question; chapterTitle: string; subjectName: string; imageKey: string
  isDark: boolean; addToast: (msg: string, type: ToastType, ms?: number) => void
  dbTable: string
}) {
  const [loading, setLoading]         = useState(false)
  const [questions, setQuestions]     = useState<Question[]>([])
  const [showAll, setShowAll]         = useState(false)
  const [fetched, setFetched]         = useState(false)
  const [error, setError]             = useState(false)

  // Auto-fetch on mount
  useEffect(() => {
    fetchSimilar()
  }, [mainQuestion.question_id])

  const fetchSimilar = async () => {
    if (fetched) return
    setLoading(true); setError(false)
    try {
      // Use the embedding of the current question for vector similarity search
      // We call a Supabase RPC or use match_documents pattern
      // First get the embedding for this question
      const { data: sourceRow, error: embErr } = await supabase
        .from(dbTable)
        .select('embedding')
        .eq('question_id', mainQuestion.question_id)
        .single()

      if (embErr || !sourceRow?.embedding) {
        // Fallback: text search on same chapter, exclude current
        const { data: fallback } = await supabase
          .from(dbTable)
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
          .from(dbTable)
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
          .from(dbTable)
          .select('id,question,question_id,question_text,option_a,option_b,option_c,option_d,correct_option,exam_shift,solution,question_img_url,solution_image_url,option_a_img,option_b_img,option_c_img,option_d_img,subject,chapter,buddy_jeetu,buddy_riya,buddy_rei,buddy_ritu,buddy_shreya,buddy_neha')
          .in('question_id', ids)
        setQuestions((fullRows || []) as Question[])
      }
      setFetched(true)
      // Track that similar questions were shown
      track('similar_shown', {
        feature:     'similar',
        question_id: mainQuestion.question_id,
        subject:     mainQuestion.subject  ?? subjectName ?? undefined,
        chapter:     mainQuestion.chapter  ?? chapterTitle ?? undefined,
        metadata:    { count: questions.length },
      })
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  const visible = showAll ? questions : questions.slice(0, 3)

  return (
    <section className="mt-section">
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <Layers className="size-[18px] text-muted-foreground" />
        <h2 className="text-heading font-semibold tracking-[-0.02em] text-foreground">
          <Define text="Questions close to this one from the same chapter. Solve them to lock the concept in.">Similar questions</Define>
        </h2>
        {loading && <Spinner />}
      </div>

      {/* Error */}
      {error && <p className="text-body-sm text-muted-foreground">Could not load similar questions. Try again.</p>}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2].map(i => (
            <Card key={i} className="space-y-3 hover:shadow-none">
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
              <div className="space-y-2 pt-2">
                {[1, 2, 3, 4].map(j => <Skeleton key={j} className="h-11" />)}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Questions */}
      {!loading && fetched && questions.length === 0 && (
        <p className="text-body-sm text-muted-foreground">No similar questions found in this chapter.</p>
      )}

      {!loading && fetched && questions.length > 0 && (
        <div className="space-y-4">
          {visible.map((q, i) => (
            <motion.div key={q.question_id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
              <SimilarQuestionCard
                q={q} chapterTitle={chapterTitle} subjectName={subjectName}
                imageKey={imageKey} isDark={isDark} addToast={addToast}
                dbTable={dbTable}
              />
            </motion.div>
          ))}

          {/* Show more / less */}
          {questions.length > 3 && (
            <Button variant="ghost" onClick={() => setShowAll(p => !p)} className="h-10 w-full rounded-control bg-card text-muted-foreground ring-1 ring-border hover:text-foreground">
              {showAll ? `Show less` : `Show ${questions.length - 3} more similar question${questions.length - 3 !== 1 ? 's' : ''}`}
            </Button>
          )}
        </div>
      )}
    </section>
  )
}

// ─── Main QuestionViewer Component ───────────────────────────────────────────
export default function QuestionViewerClient() {
  const isDark = useIsDark()
  const router = useRouter()
  const sp     = useSearchParams()

  // URL params — new unified schema
  const subject      = sp.get('subject')      || sp.get('subjectName') || ''
  const chapterTitle = sp.get('chapter')      || sp.get('chapterTitle') || ''
  const imageKey     = sp.get('imageKey')     || ''
  const examName     = sp.get('examName')     || 'JEE Main'
  const startQId     = sp.get('qid')          || ''   // SEO: specific question_id
  const startIndex   = parseInt(sp.get('startIndex') || sp.get('index') || '0', 10)
  const yearFilter   = sp.get('year')         || ''   // e.g. '2024'; empty = all years

  // Pick the right Supabase table based on exam
  const DB_TABLE = examName === 'JEE Advanced' ? DB_TABLE_ADV : DB_TABLE_MAIN

  // ── Rookie Pass guard for JEE Advanced ────────────────────────────────────
  useEffect(() => {
    if (examName !== 'JEE Advanced') return
    let active = true
    const verify = async () => {
      try {
        const { checkUserPaidDirectFromDB } = await import('../../lib/rookiePass')
        const ok = await checkUserPaidDirectFromDB()
        if (active && !ok) router.replace('/explore')
      } catch {
        if (active) router.replace('/explore')
      }
    }
    verify()
    const handleUpdate = () => { verify() }
    window.addEventListener('rookiePassUpdated', handleUpdate)
    return () => {
      active = false
      window.removeEventListener('rookiePassUpdated', handleUpdate)
    }
  }, [examName, router])

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
  const [pendingOption, setPendingOption]       = useState<string | null>(null) // clicked, not yet resolved
  const [resolvedCorrectOption, setResolvedCorrectOption] = useState<string | null>(null) // confirmed correct answer for current Q
  const [isCorrect, setIsCorrect]               = useState<boolean | null>(null)
  const [motivation, setMotivation]             = useState('')
  const [timer, setTimer]                       = useState(0)
  const [solution, setSolution]                 = useState('')
  const [aiFollowup, setAIFollowup]             = useState<string | null>(null)
  const [aiFollowupLoading, setAIFollowupLoading] = useState(false)
  const [bookmarked, setBookmarked]             = useState(false)
  const [solutionLoading, setSolutionLoading]   = useState(false)
  const [solutionRequested, setSolutionRequested] = useState(false)
  const [integerAnswer, setIntegerAnswer]       = useState('')
  const [imageModal, setImageModal]             = useState<string | null>(null)
  const [buddyId, setBuddyId]                   = useState(DEFAULT_BUDDY_ID)
  const [solutionBuddyId, setSolutionBuddyId]   = useState(DEFAULT_BUDDY_ID)
  const [buddyModalOpen, setBuddyModalOpen]     = useState(false)
  const [showPassModal, setShowPassModal]       = useState(false)
  const [userId, setUserId]                     = useState<string | null>(null)

  // ── Free-tier daily solution/similar view limit ───────────────────────────
  // 3 per day for free users; unlimited for Rookie Pass holders.
  const SOL_LIMIT     = 3
  const SOL_KEY       = `rookie_sol_views_${new Date().toDateString()}`
  const [hasPass,     setHasPass]     = useState<boolean | null>(null) // null = checking directly from DB
  const [solViewsToday, setSolViewsToday] = useState<number>(() => {
    try { return parseInt(localStorage.getItem(SOL_KEY) ?? '0', 10) || 0 } catch { return 0 }
  })

  // Check Rookie Pass directly from DB on mount + listen for updates + start auto-sync
  useEffect(() => {
    let mounted = true
    let cleanupSync: (() => void) | undefined
    const checkPass = async () => {
      try {
        const { checkUserPaidDirectFromDB, initPassAutoSync } = await import('../../lib/rookiePass')
        const pass = await checkUserPaidDirectFromDB(userId ?? undefined)
        if (mounted) setHasPass(pass)
        cleanupSync = initPassAutoSync(userId ?? undefined)
      } catch { if (mounted) setHasPass(false) }
    }
    checkPass()
    const handleUpdate = () => { checkPass() }
    window.addEventListener('rookiePassUpdated', handleUpdate)
    return () => {
      mounted = false
      window.removeEventListener('rookiePassUpdated', handleUpdate)
      if (cleanupSync) cleanupSync()
    }
  }, [userId])

  const ensurePassFresh = useCallback(async (): Promise<boolean> => {
    try {
      const { checkUserPaidDirectFromDB } = await import('../../lib/rookiePass')
      const paid = await checkUserPaidDirectFromDB(userId ?? undefined)
      setHasPass(paid)
      return paid
    } catch {
      return false
    }
  }, [userId])

  // Sync daily questions solved count with DB for authenticated users
  useEffect(() => {
    if (!userId) return
    const todayMidnight = new Date()
    todayMidnight.setHours(0, 0, 0, 0)
    supabase
      .from('user_activity')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('answered_at', todayMidnight.toISOString())
      .then(({ count, error }) => {
        if (!error && typeof count === 'number') {
          setSolViewsToday(prev => {
            const m = Math.max(prev, count)
            try { localStorage.setItem(SOL_KEY, String(m)) } catch {}
            return m
          })
        }
      })
  }, [userId, SOL_KEY])

  // Increment daily counter when a solution is first viewed
  const recordSolView = useCallback(() => {
    setSolViewsToday(prev => {
      const next = prev + 1
      try { localStorage.setItem(SOL_KEY, String(next)) } catch { /* no-op */ }
      return next
    })
  }, [SOL_KEY])

  // Whether the user can see the solution/similar panel
  const canViewSolution = hasPass === true || solViewsToday < SOL_LIMIT
  const isLimitReached  = hasPass === false && solViewsToday >= SOL_LIMIT

  const timerRef          = useRef<number | null>(null)
  const scrollRef         = useRef<HTMLDivElement | null>(null)
  const questionStartTime = useRef(Date.now())
  const answeredThisSession = useRef<Set<string>>(new Set())

  const buddy        = AI_BUDDIES[buddyId]        ?? AI_BUDDIES[DEFAULT_BUDDY_ID]
  const solutionBuddy= AI_BUDDIES[solutionBuddyId]?? AI_BUDDIES[DEFAULT_BUDDY_ID]

  // ── Toasts ────────────────────────────────────────────────────────────────
  // Rendered by the shared Sonner toaster (FocusShell). `id: type` keeps the old
  // "one toast per type, newest replaces" behaviour; `ms` is still the duration.
  const addToast = useCallback((message: string, type: ToastType = 'info', ms = 2200) => {
    const opts = { id: `qv-${type}`, duration: ms }
    if (type === 'success') toast.success(message, opts)
    else if (type === 'error') toast.error(message, opts)
    else if (type === 'warning') toast.warning(message, opts)
    else if (type === 'coin') toast(message, { ...opts, icon: <Coins className="size-4 text-muted-foreground" /> })
    else if (type === 'bookmark') toast(message, { ...opts, icon: <BookmarkCheck className="size-4 text-primary" /> })
    else toast(message, opts)
  }, [])

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
    const on  = () => {} // no-op, just to keep connection
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
        let countQuery = supabase
          .from(DB_TABLE)
          .select('*', { count: 'exact', head: true })
          .eq('subject', subject)
          .eq('chapter', chapterTitle)
        if (yearFilter) countQuery = (countQuery as any).ilike('exam_shift', `%${yearFilter}%`)
        const { count } = await countQuery
        setTotalCount(count ?? 0)

        // If a specific question_id is in the URL, find its offset first
        let windowStart = Math.max(0, startIndex - Math.floor(PAGE_SIZE / 2))

        if (startQId) {
          // Find position of this question_id by fetching just IDs in order
          let idQuery = supabase
            .from(DB_TABLE)
            .select('question_id')
            .eq('subject', subject)
            .eq('chapter', chapterTitle)
            .order('question', { ascending: true })
          if (yearFilter) idQuery = (idQuery as any).ilike('exam_shift', `%${yearFilter}%`)
          const { data: idRows } = await idQuery
          if (idRows) {
            const pos = idRows.findIndex((r: { question_id: string }) => r.question_id === startQId)
            if (pos >= 0) {
              windowStart = Math.max(0, pos - Math.floor(PAGE_SIZE / 2))
              setGlobalIndex(pos)
            }
          }
        }

        let dataQuery = supabase
          .from(DB_TABLE)
          .select('id,question,question_id,question_text,option_a,option_b,option_c,option_d,correct_option,exam_shift,source_url,solution,question_img_url,solution_image_url,option_a_img,option_b_img,option_c_img,option_d_img,subject,chapter,option_a_percent,option_b_percent,option_c_percent,option_d_percent,buddy_jeetu,buddy_riya,buddy_rei,buddy_ritu,buddy_shreya,buddy_neha')
          .eq('subject', subject)
          .eq('chapter', chapterTitle)
          .order('question', { ascending: true })
          .range(windowStart, windowStart + PAGE_SIZE - 1)
        if (yearFilter) dataQuery = (dataQuery as any).ilike('exam_shift', `%${yearFilter}%`)
        const { data, error } = await dataQuery

        if (error || !data) { setQuestions([]); return }

        // Sort easy-first within the window using crowd difficulty score
        setQuestions(sortByDifficulty(data as Question[]))
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
  }, [chapterTitle, subject, yearFilter])

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
        let nextQuery = supabase
          .from(DB_TABLE)
          .select('id,question,question_id,question_text,option_a,option_b,option_c,option_d,correct_option,exam_shift,source_url,solution,question_img_url,solution_image_url,option_a_img,option_b_img,option_c_img,option_d_img,subject,chapter,option_a_percent,option_b_percent,option_c_percent,option_d_percent,buddy_jeetu,buddy_riya,buddy_rei,buddy_ritu,buddy_shreya,buddy_neha')
          .eq('subject', subject)
          .eq('chapter', chapterTitle)
          .order('question', { ascending: true })
          .range(nextStart, nextStart + PAGE_SIZE - 1)
        if (yearFilter) nextQuery = (nextQuery as any).ilike('exam_shift', `%${yearFilter}%`)
        const { data } = await nextQuery

        if (data && data.length > 0) {
          // Sort new window easy-first before appending
          setQuestions(prev => [...prev, ...sortByDifficulty(data as Question[])])
        }
      } catch { /* silent */ } finally {
        setLoadingMore(false)
      }
    }
    loadNext()
  }, [currentIndex, questions.length, pageOffset, totalCount, loadingMore, loading, chapterTitle, subject, yearFilter])

  // ── Update URL with current question for SEO + session continuity ─────────
  useEffect(() => {
    if (!questions.length) return
    const q = questions[currentIndex]
    if (!q) return
    const params = new URLSearchParams({
      subject: subject,
      chapter: chapterTitle,
      imageKey: imageKey,
      examName: examName,
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

    // Reset state when navigating to a new question
    setAIFollowup(null)

    if (prev) {
      setSelectedOption(prev.selectedOption || null)
      setIsCorrect(prev.isCorrect ?? null)
      // Restore resolved correct option — use saved value or fall back to what's in the question
      setResolvedCorrectOption(q?.correct_option || null)
      setMotivation(prev.motivation || '')
      setSolutionRequested(prev.solutionRequested || false)
      setSolutionBuddyId(prev.solutionBuddyId || buddyId)
      if (prev.integerAnswer !== undefined) setIntegerAnswer(prev.integerAnswer)
      setAIFollowup(prev.aiFollowup || null)

      const savedBuddyId = prev.solutionBuddyId || buddyId
      const cachedSol = prev.solution || (q ? loadAISolFromCache(q.question_id, savedBuddyId) : null)

      if (cachedSol) {
        setSolution(cachedSol); setSolutionLoading(false)
      } else if (prev.solutionRequested && q) {
        setSolution(''); setSolutionLoading(true)
        generateAISolution(q, buddyId, AI_BUDDIES[buddyId] ?? AI_BUDDIES[DEFAULT_BUDDY_ID], q.correct_option || '').then(aiSol => {
          setSolution(aiSol); setSolutionLoading(false)
          saveSession({ solution: aiSol, solutionRequested: true, solutionBuddyId: savedBuddyId })
        })
      } else {
        setSolution('')
      }
    } else {
      setSelectedOption(null); setIsCorrect(null); setMotivation('')
      setSolution(''); setAIFollowup(null); setSolutionRequested(false)
      setIntegerAnswer(''); setAIFollowup(null); setSolutionRequested(false)
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

      // Write to user_activity (existing — streak/daily goal tracking)
      await supabase.from('user_activity').upsert({
        user_id: user.id, chapter_title: chapterTitle, subject_name: subject,
        image_key: imageKey, question_id: q.question_id, question_index: globalIndex,
        is_correct: correct, time_spent_seconds: timeSpent, buddy_id: buddyId,
        answered_at: new Date().toISOString(),
      }, { onConflict: 'user_id,chapter_title,question_id' })

      // Also write to attempts (raw history — NOT what drives recommendations
      // on its own; see updateAbilityVector call below)
      // Fire-and-forget — don't await so it never blocks the UI
      supabase.from('attempts').insert({
        student_id: user.id,
        question_id: q.question_id,
        correct,
        time_taken_sec: timeSpent,
      }).then(({ error }) => {
        if (error) console.warn('attempts insert:', error.message)
      })

      // Update the embedding-based ability vector (fire-and-forget) — this is
      // what actually drives the recommendation algorithm for future sessions.
      // Mirrors PracticeClient's writeAttempt so questions solved here count
      // toward recommendations too, not just Practice-page questions.
      updateAbilityVector(user.id, q.question_id, correct)

      // ── Analytics tracking ──────────────────────────────────────────────
      track(correct ? 'question_correct' : 'question_incorrect', {
        feature:     'question_viewer',
        question_id: q.question_id,
        subject:     subject || undefined,
        chapter:     chapterTitle || undefined,
        duration_ms: timeSpent * 1000,
      })
      track('question_answered', {
        feature:     'question_viewer',
        question_id: q.question_id,
        subject:     subject || undefined,
        chapter:     chapterTitle || undefined,
        duration_ms: timeSpent * 1000,
        metadata:    { correct },
      })

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

  // ── Generate AI solution ──────────────────────────────────────────────────
  const generateAISolution = async (
    q: Question, activeBuddyId: string, activeBuddy: typeof AI_BUDDIES[string],
    confirmedAnswer: string   // ← always the resolved correct answer, never null
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

      // Always use confirmedAnswer — never q.correct_option which may be null
      const res = await axios.post(`${API_BASE}/solution`, {
        action: 'generate_solution', question_text: q.question_text,
        option_A: q.option_a, option_B: q.option_b, option_C: q.option_c, option_D: q.option_d,
        solution: q.solution, correct_option: confirmedAnswer,
        buddy_id: activeBuddyId, buddy_name: activeBuddy.name,
        buddy_system_prompt: activeBuddy.systemPrompt,
      })
      const aiSol = res.data.solution || q.solution || ''
      saveAISolToCache(q.question_id, activeBuddyId, aiSol)
      supabase.from(DB_TABLE).update({ [col]: aiSol }).eq('question_id', q.question_id).then(() => {
        setQuestions(prev => prev.map((item, i) => i === currentIndex ? { ...item, [col]: aiSol } : item))
      })
      return aiSol
    } catch { return questions[currentIndex]?.solution || '' }
  }

  // ── Post-answer bookkeeping (coins / streak / toast) ─────────────────────
  // Solution generation is fired in parallel elsewhere (see handleOptionClick
  // / handleIntegerSubmit below) — this only handles the side effects that
  // depend on knowing whether the user was right, not the solution text.
  const handlePostAnswerMeta = (correct: boolean, timeSpent: number, q: Question) => {
    const coins = calcCoins(timeSpent, correct)
    addToast(correct ? `✓ Correct! +${coins} Coins earned` : '✗ Not quite — keep going!', correct ? 'coin' : 'error', 3500)

    if (correct && coins > 0) {
      const prev = loadSession(globalIndex)
      if (prev?.isCorrect !== true) updateRookieCoins(coins)
    }

    // Auto-bookmark wrong answers so the red badge appears on the Bookmarks tab
    if (!correct) autoBookmarkWrong(q)

    updateStreak()

    const prev = loadSession(globalIndex)
    if (!prev?.selectedOption) {
      const todayKey = `questionsToday_${new Date().toDateString()}`
      localStorage.setItem(todayKey, String((parseInt(localStorage.getItem(todayKey) || '0') + 1)))
      localStorage.setItem('questionsWeek', String((parseInt(localStorage.getItem('questionsWeek') || '0') + 1)))
      localStorage.setItem('questionsMonth', String((parseInt(localStorage.getItem('questionsMonth') || '0') + 1)))
      saveUserActivity(q, correct, timeSpent)
    }
  }

  // ── Regenerate solution ───────────────────────────────────────────────────
  const handleRegenerateSolution = async () => {
    const q = questions[currentIndex]; if (!q) return
    // correct_option is always in DB — no need to fall back to AI determination
    try { sessionStorage.removeItem(getAISolCacheKey(q.question_id, solutionBuddyId)) } catch {}
    setSolution(''); setAIFollowup(null); setSolutionLoading(true)
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
      saveSession({ solution: aiSol, solutionBuddyId })
    } catch { addToast('Failed to regenerate. Try again.', 'error') } finally { setSolutionLoading(false) }
  }

  // ── MCQ click ─────────────────────────────────────────────────────────────
  // Order of operations, deliberately:
  //   1. setPendingOption(opt)          → grey state, no verdict yet.
  //   2. correct_option is read directly from the DB row — no AI call needed.
  //   3. setIsCorrect / setSelectedOption → colored (green/red) view renders.
  //   4. handlePostAnswer → solution generation starts.
  const handleOptionClick = async (opt: string) => {
    if (selectedOption !== null || pendingOption !== null) return
    const q = questions[currentIndex]; if (!q) return

    if (examName === 'JEE Advanced') {
      const isPaid = await ensurePassFresh()
      if (!isPaid) {
        router.replace('/explore')
        return
      }
    }

    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000)
    setPendingOption(opt)

    const activeBuddyId = buddyId
    const activeBuddy = AI_BUDDIES[activeBuddyId] ?? AI_BUDDIES[DEFAULT_BUDDY_ID]

    // correct_option is always present in the DB — use it directly
    const answerPromise: Promise<string | null> = Promise.resolve(q.correct_option ?? null)

    setSolutionBuddyId(activeBuddyId)
    // Record daily solution view the first time (not when navigating back to an already-seen Q)
    if (!solutionRequested) {
      if (canViewSolution) {
        recordSolView()
      }
      if (hasPass === false && (solViewsToday >= SOL_LIMIT || solViewsToday + 1 >= SOL_LIMIT)) {
        setTimeout(() => setShowPassModal(true), 1200)
      }
    }
    setSolutionRequested(true); setSolutionLoading(true)
    const solutionPromise = generateAISolution(q, activeBuddyId, activeBuddy, q.correct_option || '')

    // ── Track solution viewed ───────────────────────────────────────────────
    track('solution_viewed', {
      feature:     'question_viewer',
      question_id: q.question_id,
      subject:     q.subject   ?? undefined,
      chapter:     q.chapter   ?? undefined,
    })

    // Normalise both sides to a single lowercase letter for comparison
    const normalize = (v: string | null): string => {
      if (!v) return ''
      return v.replace(/option_?/gi, '').replace(/[^a-dA-D]/g, '').slice(0, 1).toLowerCase()
    }

    answerPromise.then(ans => {
      const correct = normalize(opt) === normalize(ans)
      setIsCorrect(correct)
      setSelectedOption(opt)
      setResolvedCorrectOption(ans)
      setPendingOption(null)
      handlePostAnswerMeta(correct, timeSpent, q)

      solutionPromise.then(aiSol => {
        const reconciled = reconcileAnswerLine(aiSol, ans)
        setSolution(reconciled); setSolutionLoading(false)
        saveSession({
          selectedOption: opt, isCorrect: correct, solution: reconciled,
          solutionRequested: true, solutionBuddyId: activeBuddyId,
        })
        setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 150)
      })
    })
  }

  // ── Integer submit ────────────────────────────────────────────────────────
  const handleIntegerSubmit = async () => {
    if (isCorrect !== null) return
    const q = questions[currentIndex]; if (!q || !integerAnswer.trim()) return

    if (examName === 'JEE Advanced') {
      const isPaid = await ensurePassFresh()
      if (!isPaid) {
        router.replace('/explore')
        return
      }
    }

    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000)

    const activeBuddyId = buddyId
    const activeBuddy = AI_BUDDIES[activeBuddyId] ?? AI_BUDDIES[DEFAULT_BUDDY_ID]

    // correct_option is always present in the DB — use it directly
    const answerPromise: Promise<string | null> = Promise.resolve(q.correct_option ?? null)

    setSolutionBuddyId(activeBuddyId)
    // Record daily solution view the first time (not when navigating back to an already-seen Q)
    if (!solutionRequested) {
      if (canViewSolution) {
        recordSolView()
      }
      if (hasPass === false && (solViewsToday >= SOL_LIMIT || solViewsToday + 1 >= SOL_LIMIT)) {
        setTimeout(() => setShowPassModal(true), 1200)
      }
    }
    setSolutionRequested(true); setSolutionLoading(true)
    const solutionPromise = generateAISolution(q, activeBuddyId, activeBuddy, q.correct_option || '')

    answerPromise.then(ans => {
      const u = parseFloat(integerAnswer.trim()), c = parseFloat(ans || '')
      const correct = !isNaN(u) && !isNaN(c) ? u === c : integerAnswer.trim() === (ans || '').trim()
      setIsCorrect(correct); setSelectedOption('INTEGER')
      setResolvedCorrectOption(ans || q.correct_option || null)
      handlePostAnswerMeta(correct, timeSpent, q)

      solutionPromise.then(aiSol => {
        const reconciled = reconcileAnswerLine(aiSol, ans)
        setSolution(reconciled); setSolutionLoading(false)
        saveSession({
          selectedOption: 'INTEGER', isCorrect: correct, solution: reconciled,
          solutionRequested: true, solutionBuddyId: activeBuddyId,
        })
      })
    })
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
  const goTo = async (delta: number) => {
    if (delta > 0 && examName === 'JEE Advanced') {
      const isPaid = await ensurePassFresh()
      if (!isPaid) {
        router.replace('/explore')
        return
      }
    }
    const newLocal  = currentIndex + delta
    const newGlobal = globalIndex + delta
    if (newLocal < 0 || newGlobal < 0) return
    if (newLocal >= questions.length && newGlobal >= totalCount) return
    setCurrentIndex(newLocal)
    setGlobalIndex(newGlobal)
    setTimer(0); setSelectedOption(null); setPendingOption(null); setIsCorrect(null)
    setResolvedCorrectOption(null)
    setSolution(''); setSolutionRequested(false); setAIFollowup(null)
    setIntegerAnswer('')
  }

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="min-h-svh text-foreground">
        <div className="sticky top-0 z-30 bg-muted/85 px-4 backdrop-blur-md">
          <div className="mx-auto flex h-14 w-full max-w-focus items-center gap-3">
            <Skeleton className="size-8" />
            <div className="flex-1 space-y-1.5"><Skeleton className="h-3.5 w-40" /><Skeleton className="h-3 w-24" /></div>
            <Skeleton className="h-8 w-16" />
          </div>
        </div>
        <div className="mx-auto w-full max-w-focus px-4 pt-8">
          <Card className="space-y-4 hover:shadow-none sm:p-8">
            <div className="flex gap-2"><Skeleton className="h-5 w-28" /><Skeleton className="h-5 w-16" /></div>
            <Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-11/12" /><Skeleton className="h-4 w-3/5" />
            <div className="space-y-2 pt-4">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12" />)}</div>
          </Card>
          <p className="mt-6 flex items-center justify-center gap-2 text-label text-muted-foreground"><Spinner /> Loading questions…</p>
        </div>
      </div>
    )
  }

  const Q = questions[currentIndex]
  const parseShift = (s: string | null) => s?.split('_').join(' ') ?? null
  const progressPct = totalCount > 0 ? ((globalIndex + 1) / totalCount) * 100 : 0
  const solLeft = Math.max(0, SOL_LIMIT - solViewsToday)
  const atLast = globalIndex >= (totalCount ? totalCount - 1 : questions.length - 1)

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-svh pb-28 text-foreground">

      {/* Image modal */}
      <ImageZoom src={imageModal} onClose={() => setImageModal(null)} />

      {/* Buddy selector modal */}
      <BuddySelectorModal
        open={buddyModalOpen}
        currentBuddyId={buddyId}
        onClose={() => setBuddyModalOpen(false)}
        onSelect={id => {
          setBuddyId(id)
          try { localStorage.setItem('selectedBuddy', id) } catch {}
          addToast(`Buddy changed to ${AI_BUDDIES[id]?.name}`, 'info', 2000)
        }}
      />

      {/* Rookie Pass Modal */}
      <RookiePassModal
        isOpen={showPassModal}
        onClose={() => setShowPassModal(false)}
        isDark={isDark}
        limit={SOL_LIMIT}
        addToast={addToast}
        onSuccess={async () => {
          if (userId) {
            const { checkUserPaidDirectFromDB } = await import('../../lib/rookiePass')
            const ok = await checkUserPaidDirectFromDB(userId)
            setHasPass(ok)
          } else {
            setHasPass(true)
          }
        }}
      />

      {/* ── Focus header ───────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-muted/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-focus items-center gap-2 px-4 sm:gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.back()} aria-label="Back" className="rounded-control">
            <ChevronLeft className="size-5" />
          </Button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-body font-semibold tracking-[-0.01em] text-foreground">{chapterTitle}</h1>
            <p className="flex items-center gap-1.5 truncate text-meta font-medium text-muted-foreground tabular-nums">
              {subject && <span className="hidden truncate sm:inline">{subject} ·</span>}
              <Define term="progress" side="bottom">Q {globalIndex + 1} / {totalCount || questions.length}</Define>
              <span aria-hidden>·</span>
              <span className="inline-flex items-center gap-1"><Clock className="size-3.5" />{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</span>
            </p>
          </div>

          <Define term="coins" side="bottom" className="hover:no-underline">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-control bg-background px-2.5 text-label font-semibold tabular-nums text-foreground ring-1 ring-border transition hover:ring-[var(--rk-sky-300)]">
              <Coins className="size-4 text-muted-foreground" /> {rookieCoins}
            </span>
          </Define>

          <Button variant="ghost" size="icon" onClick={handleBookmark} aria-pressed={bookmarked}
            aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark question'} className="rounded-control">
            {bookmarked ? <BookmarkCheck className="size-[18px] text-primary" /> : <Bookmark className="size-[18px] text-muted-foreground" />}
          </Button>

          <button type="button" onClick={() => setBuddyModalOpen(true)} aria-label={`Study buddy: ${buddy.name}. Change`} title={`Buddy: ${buddy.name}`}
            className="flex shrink-0 items-center gap-2 rounded-control p-1 transition hover:bg-background">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={buddy.image} alt={buddy.name} className="size-7 rounded-full object-cover ring-1 ring-border" />
            <span className="hidden pr-1 text-meta font-medium text-muted-foreground md:inline">{buddy.name}</span>
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-[3px] bg-foreground/[.06]">
          <motion.div
            className="h-full bg-primary"
            initial={{ width: 0 }}
            animate={{ width: `${progressPct}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </header>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-focus px-4 pt-8">
        {!Q ? (
          <EmptyState icon={Layers} title="No questions here yet" sub="No questions available for this chapter." />
        ) : (
          <motion.div key={`${chapterTitle}-${globalIndex}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }}>

            {/* ── Question card ─────────────────────────────────────────── */}
            <Card className="hover:shadow-none sm:p-8">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                <Tag>{examName}</Tag>
                {Q.exam_shift && (
                  <Tag><Define text="The exam year and shift this question appeared in.">{parseShift(Q.exam_shift)}</Define></Tag>
                )}
                {examName !== 'JEE Advanced' && (
                  <Tag><Define term="marks">+4 / −1</Define></Tag>
                )}
                {isIntegerQ(Q) && (
                  <Tag><Define text="No options here. Type the numerical answer.">Integer</Define></Tag>
                )}
              </div>

              <div className="question-body__text text-body-lg font-medium leading-relaxed text-foreground">{renderLatex(Q.question_text, isDark)}</div>

              {Q.question_img_url && (
                <Figure src={Q.question_img_url} alt="Question illustration" onZoom={setImageModal} className="mt-5" />
              )}

              <div className="mt-7">
                {/* ── Integer input ─────────────────────────────────────── */}
                {isIntegerQ(Q) ? (
                  isCorrect === null ? (
                    <div>
                      <label htmlFor="qv-integer" className="mb-2 block text-meta font-medium text-muted-foreground">Your answer</label>
                      <div className="flex gap-2">
                        <Input id="qv-integer" type="number" value={integerAnswer} onChange={e => setIntegerAnswer(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') handleIntegerSubmit() }}
                          placeholder="Type a number…"
                          className="h-11 flex-1 rounded-control bg-background px-3 text-title md:text-title" />
                        <Button onClick={handleIntegerSubmit} disabled={!integerAnswer.trim()} className="h-11 rounded-control px-5 text-body-sm">
                          <Check /> Check
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className={cn('rounded-control px-4 py-3.5', isCorrect ? 'bg-[var(--rk-mint-100)] dark:bg-[rgba(134,219,174,.12)]' : 'bg-[#fdecea] dark:bg-[rgba(255,122,102,.12)]')}>
                      <Tag tone={isCorrect ? 'right' : 'wrong'}>{isCorrect ? 'Sahi jawab!' : 'Not quite'}</Tag>
                      <p className="mt-2 text-body-sm text-foreground">Your answer: <b>{integerAnswer}</b></p>
                      {!isCorrect && (resolvedCorrectOption || Q.correct_option) && (
                        <p className="mt-0.5 text-body-sm text-foreground">Correct: <b>{resolvedCorrectOption || Q.correct_option}</b></p>
                      )}
                    </motion.div>
                  )
                ) : (
                  /* ── MCQ: idle → pending (grey, no verdict) → right/wrong ── */
                  <div>
                    <div
  role="radiogroup"
  aria-label="Options"
  className="grid grid-cols-1 md:grid-cols-2 gap-3"
>
                      {(['a','b','c','d'] as const).map(opt => {
                        const tv = Q[`option_${opt}`] as string | null
                        const iv = Q[`option_${opt}_img`] as string | null
                        if (!tv && !iv) return null
                        const unanswered = selectedOption === null && pendingOption === null
                        const pending = selectedOption === null && pendingOption !== null
                        // Use resolvedCorrectOption — set by handleOptionClick before the answered view renders.
                        const corr = opt === optLetter(resolvedCorrectOption ?? Q.correct_option ?? '')
                        const state: 'idle' | 'selected' | 'right' | 'wrong' = unanswered ? 'idle'
                          : pending ? (pendingOption === opt ? 'selected' : 'idle')
                          : corr ? 'right' : selectedOption === opt ? 'wrong' : 'idle'
                        return (
                          <OmrOption key={opt} letter={opt.toUpperCase()} state={state} disabled={!unanswered}
                            onClick={unanswered ? () => handleOptionClick(opt) : undefined}
                            className="px-4 py-3.5">
                            <span className="flex items-center gap-3">
                              <span className="min-w-0 flex-1"><OptionBody text={tv} img={iv} opt={opt} isDark={isDark} /></span>
                              {pending && pendingOption === opt && <Spinner />}
                              {state === 'right' && <Tag tone="right"><Check className="size-3" strokeWidth={3} /> Correct</Tag>}
                              {state === 'wrong' && <Tag tone="wrong">Your pick</Tag>}
                            </span>
                          </OmrOption>
                        )
                      })}
                    </div>
                  </div>
                )}
              </div>
            </Card>

            {/* ── Post-answer section ───────────────────────────────────── */}
            {selectedOption !== null && (
              <>
                {/* Motivation */}
                {motivation ? (
                  <motion.div key="motivation-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className="mt-4 flex items-start gap-3 hover:shadow-none">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={buddy.image} alt={buddy.name} className="size-10 rounded-full object-cover" />
                      <div>
                        <p className="text-meta font-medium text-muted-foreground">{buddy.name}</p>
                        <p className="mt-0.5 text-body leading-relaxed text-foreground">{motivation}</p>
                      </div>
                    </Card>
                  </motion.div>
                ) : null}

                {/* Solution card + Similar Questions — gated for free users */}
                {solutionRequested && (
                  canViewSolution ? (
                    <>
                      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                        <Card ref={scrollRef} key="solution-card" className="mt-4 hover:shadow-none sm:p-8">
                          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex items-center gap-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={solutionBuddy.image} alt={solutionBuddy.name} className="size-10 rounded-full object-cover" />
                              <div>
                                <h3 className="text-title font-semibold tracking-[-0.015em] text-foreground">Solution</h3>
                                <p className="text-meta text-muted-foreground"><Define term="mentor">Explained by {solutionBuddy.name}</Define></p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {hasPass === false && (
                                <Tag><Define term="solutionsLeft">{solLeft} free left today</Define></Tag>
                              )}
                              {!solutionLoading && (
                                <Button variant="ghost" onClick={handleRegenerateSolution} className="h-8 rounded-control px-2.5 text-muted-foreground">
                                  <RotateCcw /> Redo
                                </Button>
                              )}
                            </div>
                          </div>

                          {solutionLoading ? (
                            <SolutionLines widths={[100, 88, 94, 72, 83, 90, 65]} />
                          ) : (
                            <>
                              <div className="whitespace-pre-wrap rounded-control bg-muted p-4 text-body leading-relaxed text-foreground sm:p-5">
                                {renderLatex(solution, isDark)}
                              </div>
                              {Q?.solution_image_url && (
                                <Figure src={Q.solution_image_url} alt="Solution illustration" onZoom={setImageModal} className="mt-3" />
                              )}
                            </>
                          )}

                          {/* AI Followup */}
                          {!solutionLoading && solution && (
                            <div className="mt-4">
                              {!aiFollowup && !aiFollowupLoading && (
                                <Button variant="secondary" onClick={handleAIFollowup} className="h-9 rounded-control px-3.5">
                                  <Smile /> Simpler explanation
                                </Button>
                              )}
                              {aiFollowupLoading && (
                                <div className="flex items-center gap-2"><Spinner /><span className="text-label text-muted-foreground">Generating…</span></div>
                              )}
                              {aiFollowup && (
                                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                  className="whitespace-pre-wrap rounded-control bg-secondary p-4 text-body leading-relaxed text-secondary-foreground sm:p-5">
                                  {aiFollowup}
                                </motion.div>
                              )}
                            </div>
                          )}
                        </Card>
                      </motion.div>

                      {/* ── Similar Questions ── */}
                      {Q && (
                        <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }}>
                          <SimilarQuestionsPanel
                            mainQuestion={Q}
                            chapterTitle={chapterTitle}
                            subjectName={subject}
                            imageKey={imageKey}
                            isDark={isDark}
                            addToast={addToast}
                            dbTable={DB_TABLE}
                          />
                        </motion.div>
                      )}
                    </>
                  ) : (
                    /* ── Free limit reached — upgrade wall ── */
                    <motion.div key="upgrade-wall" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                      <Card className="mt-4 flex flex-col items-center px-6 py-10 text-center hover:shadow-none">
                        <Lock className="size-6 text-muted-foreground" />
                        <p className="mt-4 text-meta font-medium text-muted-foreground">Daily limit reached</p>
                        <h3 className="mt-1 text-title font-semibold tracking-[-0.015em] text-foreground">
                          You&apos;ve used {SOL_LIMIT} free solutions today
                        </h3>
                        <p className="mt-2 max-w-md text-body-sm text-muted-foreground">
                          Rookie Pass unlocks unlimited AI solutions, similar questions and every JEE Main &amp; Advanced PYQ.
                        </p>
                        <Button onClick={() => setShowPassModal(true)} className="mt-6 h-10 rounded-control px-5 text-body-sm">
                          Get Rookie Pass · {saleMoney(sale.price)} / {sale.per}
                        </Button>
                        <p className="mt-3 text-meta text-muted-foreground">
                          Resets tomorrow · <Define term="solutionsLeft">{solLeft} free left today</Define>
                        </p>
                      </Card>
                    </motion.div>
                  )
                )}
              </>
            )}

            {/* Loading more indicator */}
            {loadingMore && (
              <p className="mt-6 flex items-center justify-center gap-2 text-meta text-muted-foreground">
                <Spinner /> Loading more questions…
              </p>
            )}
          </motion.div>
        )}
      </main>

      {/* ── Footer navigation ─────────────────────────────────────────────── */}
      <footer className="fixed inset-x-0 bottom-0 z-40 bg-background/90 shadow-[0_-10px_30px_-18px_rgba(46,46,46,.3)] ring-1 ring-border backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-focus items-center justify-between gap-3 px-4">
          <Button variant="ghost" onClick={() => goTo(-1)} disabled={globalIndex === 0}
            className="h-10 rounded-control px-3.5 text-body-sm">
            <ArrowLeft /> <span className="hidden sm:inline">Previous</span>
          </Button>

          <span className="text-meta font-medium tabular-nums text-muted-foreground sm:hidden">
            {globalIndex + 1} / {totalCount || questions.length}
          </span>

          <Button
            onClick={() => goTo(1)}
            disabled={atLast}
            className="h-10 rounded-control px-5 text-body-sm"
          >
            Next <ArrowRight />
          </Button>
        </div>
      </footer>
    </div>
  )
}
