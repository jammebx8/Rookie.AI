'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import axios from 'axios'
import { useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  ArrowRight, Bookmark, BookmarkCheck, BookOpen, Check, ChevronLeft, CircleCheck, CircleX,
  Coins, Smile, Target, Timer, X, ZoomIn,
} from 'lucide-react'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Bar, Card, Chip, EmptyState, Meta, OmrOption, Skeleton, Tag } from '@/components/rookie/ui'
import { Define } from '@/components/rookie/define'
import { useIsDark } from '@/components/rookie/theme'
import { useConfetti } from '@/components/rookie/stage'
import { cn } from '@/lib/utils'
import {
  BuddySelectorModal, DifficultyTag, ImageModal, LevelUpBadge, OmrChip, SessionSummary, Spinner, StreakModal,
  dialogCls, type SessionResult,
} from './_parts'

// ─── Constants ───────────────────────────────────────────────────────────────
const API_BASE      = 'https://rookie-backend.vercel.app'
const BOOKMARKS_KEY = 'bookmarkedQuestions'
const AI_SOL_CACHE  = 'aiSolutionCache_v1'
const DB_TABLE      = 'jee_mains'
const DEFAULT_BUDDY = '4'

// ─── Types ───────────────────────────────────────────────────────────────────
type ToastType = 'success' | 'error' | 'info' | 'coin' | 'bookmark'

// ─── Content renderer (markdown tables + LaTeX + bold) ───────────────────────
const renderLatex = (text: string | null | undefined, isDark = true) => renderContent(text, isDark)

/** Split a solution into step blocks on blank lines — only when that can't break a $$…$$ block. */
const solutionSteps = (text: string): string[] => {
  if (!text.trim()) return []
  const parts = text.split(/\n\s*\n/).map(s => s.trim()).filter(Boolean)
  if (parts.length < 2) return [text]
  const safe = parts.every(p => ((p.match(/\$\$/g) || []).length % 2) === 0)
  return safe ? parts : [text]
}

// ─── Chapter Survey Modal ─────────────────────────────────────────────────────
function ChapterSurveyModal({ userId, onDone }: {
  userId: string | null; onDone: () => void
}) {
  const subjects = ['physics', 'chemistry', 'maths'] as const
  const [activeSubject, setActiveSubject] = useState<string>('physics')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

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
    // Like the original: no backdrop / Esc dismiss — "Skip" or "Save" closes it.
    <Dialog open disablePointerDismissal onOpenChange={() => {}}>
      <DialogContent showCloseButton={false}
        className={cn(dialogCls, 'flex max-h-[88vh] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg')}>
        <DialogHeader className="px-6 pt-6">
          <DialogTitle className="flex items-center gap-2 text-title font-semibold tracking-[-0.015em]">
            <BookOpen className="size-[18px] text-muted-foreground" /> Chapters you&apos;ve studied
          </DialogTitle>
          <DialogDescription className="text-body-sm">
            Pick what you&apos;ve covered. We&apos;ll focus your practice there.
          </DialogDescription>
        </DialogHeader>

        {/* Subject filter chips */}
        <div className="flex gap-2 px-6 pt-4 pb-3">
          {subjects.map(s => (
            <Chip key={s} active={activeSubject === s} onClick={() => setActiveSubject(s)} className="flex-1 justify-center">
              {subjectLabel[s]}
            </Chip>
          ))}
        </div>

        {/* Chapter list */}
        <div className="no-scrollbar grid flex-1 grid-cols-1 content-start gap-2 overflow-y-auto px-6 pb-4 sm:grid-cols-2">
          {chaptersForSubject.map(c => (
            <OmrChip key={c.chapter} active={selected.has(c.chapter)} onClick={() => toggle(c.chapter)}>
              {c.chapter}
            </OmrChip>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center gap-2 bg-muted/60 px-6 py-4">
          <Meta className="flex-1">{selected.size} selected</Meta>
          <Button variant="ghost" onClick={onDone} className="h-9 rounded-control px-4">Skip</Button>
          <Button onClick={handleSave} disabled={saving || selected.size === 0} className="h-9 rounded-control px-4">
            {saving ? 'Saving' : 'Save'}
            {!saving && <ArrowRight />}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Main Practice Component ──────────────────────────────────────────────────
export default function PracticeClient() {
  const isDark = useIsDark()
  const { canvas: confettiCanvas, burst } = useConfetti()
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
  const [lastReward, setLastReward]          = useState<{ coins: number; xp: number } | null>(null)  // display-only

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

  // ── Toasts ────────────────────────────────────────────────────────────────
  // Same messages and timings as before; one toast per type at a time (sonner `id` replaces it).
  const addToast = useCallback((message: string, type: ToastType = 'info', ms = 2200) => {
    const opts = { id: `practice-${type}`, duration: ms }
    if (type === 'success') toast.success(message, opts)
    else if (type === 'error') toast.error(message, opts)
    else if (type === 'coin') toast(message, { ...opts, icon: <Coins className="size-4" /> })
    else if (type === 'bookmark') toast(message, { ...opts, icon: <BookmarkCheck className="size-4" /> })
    else toast(message, opts)
  }, [])

  // Level-up moment: small badge (below) + a confetti burst.
  useEffect(() => { if (showLevelUp) burst() }, [showLevelUp, burst])

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
    setLastReward({ coins, xp })  // display-only: shown in the result line

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

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loadingQ && !question) {
    return (
      <div className="mx-auto w-full max-w-focus px-4 pt-20 pb-28">
        <div className="flex gap-2"><Skeleton className="h-6 w-24" /><Skeleton className="h-6 w-32" /></div>
        <div className="mt-4 rounded-card bg-card p-6 ring-1 ring-black/[.05] dark:ring-white/[.06] sm:p-8">
          <Skeleton className="h-5 w-full" />
          <Skeleton className="mt-3 h-5 w-4/5" />
          <div className="mt-8 space-y-2.5">
            {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
          </div>
        </div>
        <p className="mt-6 flex items-center justify-center gap-2 text-body-sm text-muted-foreground">
          <Spinner /> Finding your next question…
        </p>
      </div>
    )
  }

  // No question returned (all exhausted or error)
  if (!question) {
    return (
      <div className="mx-auto flex min-h-svh w-full max-w-focus items-center px-4">
        <div className="w-full">
          <EmptyState icon={Target} title="You've practiced everything!" sub="Come back as more questions are added."
            action={<Button onClick={() => router.push('/home')} className="h-10 rounded-control px-5">Back to home</Button>} />
        </div>
      </div>
    )
  }

  const Q = question

  // ── Resolve what to show: live question or a history entry ────────────────
  const reviewEntry = isReviewing ? history[historyIndex] : null
  const displayQ    = reviewEntry ? reviewEntry.question : Q

  const xpPct = Math.min(100, Math.round((xpState.xpInLevel / xpState.xpForNextLevel) * 100))
  const normLetter = (v: string | null | undefined) =>
    (v ?? '').replace(/option_?/gi, '').replace(/[^a-dA-D]/g, '').slice(0, 1).toLowerCase()
  const shownBuddyId = isReviewing ? (reviewEntry?.solutionBuddyId ?? solutionBuddyId) : solutionBuddyId
  const verdict = isReviewing ? (reviewEntry?.isCorrect ?? null) : isCorrect
  const correctValue = isReviewing ? reviewEntry?.resolvedCorrect : (resolvedCorrectOption || (displayQ ?? Q)!.correct_option)
  const solutionText = isReviewing ? (reviewEntry?.solution || 'Solution not available.') : solution

  /** OMR option list. `stateOf` decides idle/selected/right/wrong per letter. */
  const renderOptions = (
    q: Question,
    stateOf: (opt: string) => 'idle' | 'selected' | 'right' | 'wrong',
    opts: { onPick?: (opt: string) => void; pending?: string | null } = {},
  ) => (
    <div className="mt-7 grid grid-cols-1 gap-2.5" role="radiogroup">
      {(['a', 'b', 'c', 'd'] as const).map(opt => {
        const tv = q[`option_${opt}`] as string | null
        const iv = q[`option_${opt}_img`] as string | null
        if (!tv && !iv) return null
        const st = stateOf(opt)
        return (
          <OmrOption key={opt} letter={opt.toUpperCase()} state={st}
            disabled={!opts.onPick} onClick={opts.onPick ? () => opts.onPick!(opt) : undefined}>
            <span className="flex items-center gap-3">
              <span className="min-w-0 flex-1 leading-relaxed">
                {iv ? <img src={iv} alt={`opt-${opt}`} className="max-h-20 rounded-control bg-white" /> : renderLatex(tv, isDark)}
              </span>
              {opts.pending === opt && <Spinner />}
              {st === 'right' && <Check className="size-4 shrink-0 text-[var(--rk-mint-600)]" strokeWidth={2.5} />}
              {st === 'wrong' && <X className="size-4 shrink-0 text-[#d9473a]" strokeWidth={2.5} />}
            </span>
          </OmrOption>
        )
      })}
    </div>
  )

  // ─── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-svh pb-28">
      {/* Confetti layer (level-up + streak) */}
      <canvas ref={confettiCanvas} aria-hidden className="pointer-events-none fixed inset-0 z-[70] h-full w-full" />

      {/* Image modal */}
      <ImageModal src={imageModal} onClose={() => setImageModal(null)} />

      {/* Streak modal */}
      <StreakModal open={showStreakModal} streak={streakCount} onShow={burst} onClose={() => setShowStreakModal(false)} />

      {/* Level-up badge */}
      <div className="pointer-events-none fixed top-20 left-1/2 z-[60] -translate-x-1/2">
        <AnimatePresence>
          {showLevelUp && (
            <LevelUpBadge level={levelUpLevel} onDone={() => setShowLevelUp(false)} />
          )}
        </AnimatePresence>
      </div>

      {/* Chapter survey modal */}
      {showSurvey && (
        <ChapterSurveyModal
          userId={userId}
          onDone={() => {
            setShowSurvey(false)
            const survey = loadSurvey()
            if (survey) surveyChaptersRef.current = survey.chapters
          }}
        />
      )}

      {/* Buddy modal */}
      <BuddySelectorModal open={buddyModalOpen} currentId={buddyId}
        onClose={() => setBuddyModalOpen(false)}
        onSelect={id => {
          setBuddyId(id)
          try { localStorage.setItem('selectedBuddy', id) } catch {}
          addToast(`Buddy: ${AI_BUDDIES[id]?.name}`, 'info', 1800)
        }}
      />

      {/* Session summary */}
      <SessionSummary
        open={showSummary}
        results={sessionResults}
        onHome={() => router.push('/home')}
        onContinue={() => {
          setShowSummary(false)
          advanceToNext()
        }}
      />

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-30 bg-muted/85 backdrop-blur-md">
        <div className="mx-auto flex h-14 w-full max-w-focus items-center gap-2 px-4 sm:gap-3">
          <Button variant="ghost" size="icon" onClick={() => router.push('/home')} aria-label="Back to home"
            className="size-9 shrink-0 rounded-control text-muted-foreground hover:text-foreground">
            <ChevronLeft className="size-5" />
          </Button>

          <div className="min-w-0 flex-1">
            <h1 className="truncate text-body font-semibold leading-tight tracking-[-0.01em] text-foreground">
              {isReviewing ? `Review · Q${historyIndex + 1} of ${history.length}` : 'Practice'}
            </h1>
            {(displayQ ?? Q)?.chapter && (
              <p className="truncate text-meta text-muted-foreground">
                {(displayQ ?? Q)!.chapter}{(displayQ ?? Q)!.subject ? ` · ${(displayQ ?? Q)!.subject}` : ''}
              </p>
            )}
          </div>

          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <span className="inline-flex h-8 items-center gap-1.5 rounded-control bg-card px-2.5 text-label font-semibold tabular-nums text-foreground ring-1 ring-border">
              <Define term="level" side="bottom">Lv {xpState.level}</Define>
              <span className="hidden font-medium text-muted-foreground sm:inline">
                <Define term="xp" side="bottom">{xpState.xpInLevel}/{xpState.xpForNextLevel} XP</Define>
              </span>
            </span>
            <span className="hidden h-8 items-center gap-1.5 rounded-control px-2 text-label font-medium tabular-nums text-muted-foreground sm:inline-flex">
              <Timer className="size-4" />
              <Define text="Time on this question." side="bottom">{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</Define>
            </span>
            <span className="inline-flex h-8 items-center gap-1.5 rounded-control bg-card px-2.5 text-label font-semibold tabular-nums text-foreground ring-1 ring-border">
              <Coins className="size-4 text-muted-foreground" />
              <Define term="coins" side="bottom">{rookieCoins.toLocaleString('en-IN')}</Define>
            </span>
            <button type="button" onClick={() => setBuddyModalOpen(true)} aria-label={`Study buddy: ${buddy.name}`}
              className="ml-0.5 shrink-0 rounded-full ring-2 ring-transparent transition hover:ring-[var(--rk-sky-300)] focus-visible:ring-ring outline-none">
              <img src={buddy.image} alt={buddy.name} className="size-8 rounded-full object-cover" />
            </button>
          </div>
        </div>
        {/* XP progress */}
        {!isReviewing && <Bar value={xpPct} className="h-[3px] rounded-none bg-border/60" />}
      </header>

      {/* ── Main content ─────────────────────────────────────────────────────── */}
      <main className="mx-auto w-full max-w-focus px-4 pt-6 sm:pt-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={isReviewing ? `history-${historyIndex}` : (Q?.question_id ?? 'empty')}
            initial={{ opacity: 0, x: isReviewing ? -14 : 14 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: isReviewing ? 14 : -14 }}
            className="space-y-4"
          >
            {/* ── Question card ───────────────────────────────────────────── */}
            <Card className="sm:p-8">
              <div className="mb-5 flex flex-wrap items-center gap-2">
                {(displayQ ?? Q)?.exam_shift && <Tag>{parseShift((displayQ ?? Q)!.exam_shift)}</Tag>}
                {(displayQ ?? Q)?.chapter && <Tag>{(displayQ ?? Q)!.chapter}</Tag>}
                {!isReviewing && <DifficultyTag difficulty={currentDifficulty} />}
              </div>

              <div className="text-body-lg font-medium leading-relaxed text-foreground">
                {renderLatex((displayQ ?? Q)!.question_text, isDark)}
              </div>

              {(displayQ ?? Q)!.question_img_url && (
                <div className="group relative mt-5 flex max-h-64 items-center justify-center overflow-hidden rounded-control bg-white ring-1 ring-border">
                  <img src={(displayQ ?? Q)!.question_img_url!} alt="Q"
                    className="max-h-56 max-w-full cursor-zoom-in object-contain select-none"
                    onClick={() => setImageModal((displayQ ?? Q)!.question_img_url!)} />
                  <Button variant="secondary" size="icon-sm" aria-label="Zoom image"
                    onClick={() => setImageModal((displayQ ?? Q)!.question_img_url!)}
                    className="absolute top-2 right-2 rounded-control opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                    <ZoomIn />
                  </Button>
                </div>
              )}

              {/* ── Answer area ─────────────────────────────────────────── */}
              {isIntegerQ(displayQ ?? Q!) ? (
                !isReviewing && isCorrect === null ? (
                  <div className="mt-7">
                    <label htmlFor="int-answer" className="text-label font-medium text-muted-foreground">Your answer (integer)</label>
                    <div className="mt-2 flex gap-2">
                      <Input id="int-answer" type="number" value={integerAnswer} onChange={e => setIntegerAnswer(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleIntegerSubmit() }}
                        placeholder="Type answer…"
                        className="h-11 flex-1 rounded-control bg-background px-3.5 text-body md:text-body" />
                      <Button onClick={handleIntegerSubmit} disabled={!integerAnswer.trim()} className="h-11 rounded-control px-5 text-body font-semibold">
                        <Check /> Check
                      </Button>
                    </div>
                  </div>
                ) : null
              ) : isReviewing && reviewEntry ? (
                /* Review mode: answered state from history */
                renderOptions(reviewEntry.question, opt => {
                  const corr = opt === normLetter(reviewEntry.resolvedCorrect ?? reviewEntry.question.correct_option)
                  return corr ? 'right' : reviewEntry.selectedOption === opt ? 'wrong' : 'idle'
                })
              ) : selectedOption === null && pendingOption === null ? (
                /* MCQ unanswered */
                renderOptions(Q!, () => 'idle', { onPick: handleOptionClick })
              ) : selectedOption === null && pendingOption !== null ? (
                /* MCQ pending */
                renderOptions(Q!, opt => (pendingOption === opt ? 'selected' : 'idle'), { pending: pendingOption })
              ) : (
                /* MCQ answered */
                renderOptions(Q!, opt => {
                  const corr = opt === normLetter(resolvedCorrectOption ?? Q!.correct_option)
                  return corr ? 'right' : selectedOption === opt ? 'wrong' : 'idle'
                })
              )}
            </Card>

            {/* ── Post-answer section ─────────────────────────────────────── */}
            {(selectedOption !== null || isReviewing) && (
              <>
                {/* Result line */}
                {verdict !== null && (
                  <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className="flex flex-wrap items-center gap-x-3 gap-y-2 px-1 pt-2">
                    {verdict ? (
                      <>
                        <span className="flex items-center gap-2 text-title font-semibold text-foreground">
                          <CircleCheck className="size-5 text-[var(--rk-mint-600)]" /> Sahi jawab!
                        </span>
                        {!isReviewing && lastReward && lastReward.coins > 0 && (
                          <Tag tone="right"><Define term="coins">+{lastReward.coins} coins</Define></Tag>
                        )}
                        {!isReviewing && lastReward && (
                          <Meta><Define term="xp">+{lastReward.xp} XP</Define></Meta>
                        )}
                      </>
                    ) : (
                      <>
                        <span className="flex items-center gap-2 text-title font-semibold text-foreground">
                          <CircleX className="size-5 text-[#d9473a]" /> Not quite.
                        </span>
                        {isIntegerQ(displayQ ?? Q!) && correctValue && (
                          <Tag tone="right">Answer: {correctValue}</Tag>
                        )}
                        {!isReviewing && lastReward && lastReward.xp > 0 && (
                          <Meta><Define term="xp">+{lastReward.xp} XP</Define></Meta>
                        )}
                      </>
                    )}
                  </motion.div>
                )}

                {/* Solution card — live solution or review history solution */}
                {(solutionRequested || isReviewing) && (
                  <div ref={scrollRef}>
                    <Card>
                      <div className="mb-4 flex items-center gap-3">
                        <img
                          src={AI_BUDDIES[shownBuddyId]?.image ?? solutionBuddy.image}
                          alt="buddy"
                          className="size-10 rounded-full object-cover"
                        />
                        <div className="min-w-0">
                          <h3 className="text-title font-semibold leading-tight tracking-[-0.015em] text-foreground">Solution</h3>
                          <Meta>
                            <Define term="mentor">Explained by {AI_BUDDIES[shownBuddyId]?.name ?? solutionBuddy.name}</Define>
                          </Meta>
                        </div>
                      </div>

                      {solutionLoading && !isReviewing ? (
                        <div className="space-y-2 py-1">
                          {[100, 88, 94, 72, 83].map((w, i) => (
                            <div key={i} style={{ width: `${w}%` }}><Skeleton className="h-3.5" /></div>
                          ))}
                        </div>
                      ) : (
                        <>
                          <div className="space-y-2">
                            {solutionSteps(solutionText).map((step, i) => (
                              <div key={i} className="rounded-control bg-muted px-4 py-3 text-body leading-relaxed whitespace-pre-wrap text-foreground">
                                {renderLatex(step, isDark)}
                              </div>
                            ))}
                          </div>
                          {(displayQ ?? Q)!.solution_image_url && (
                            <div className="mt-3 flex max-h-64 items-center justify-center overflow-hidden rounded-control bg-white ring-1 ring-border">
                              <img src={(displayQ ?? Q)!.solution_image_url!} alt="Solution"
                                className="max-h-56 max-w-full cursor-zoom-in object-contain select-none"
                                onClick={() => setImageModal((displayQ ?? Q)!.solution_image_url!)} />
                            </div>
                          )}
                        </>
                      )}

                      {/* Simpler explanation */}
                      {!solutionLoading && solution && !aiFollowup && !aiFollowupLoading && (
                        <Button variant="secondary" onClick={handleFollowup} className="mt-5 h-9 rounded-control px-3.5 text-body-sm">
                          <Smile /> Simpler explanation
                        </Button>
                      )}
                      {aiFollowupLoading && (
                        <div className="mt-5 flex items-center gap-2"><Spinner /><Meta>Generating…</Meta></div>
                      )}
                      {aiFollowup && (
                        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                          className="mt-4 rounded-control bg-secondary px-4 py-3 text-body leading-relaxed whitespace-pre-wrap text-secondary-foreground">
                          {aiFollowup}
                        </motion.div>
                      )}
                    </Card>
                  </div>
                )}

                {/* Weak topics */}
                {weakTopics.length > 0 && (
                  <div className="flex flex-wrap items-center gap-2 px-1 pt-1">
                    <Meta className="mr-1">
                      <Define text="Chapters where your accuracy is lowest. Practice leans on these until they improve.">Focus areas</Define>
                    </Meta>
                    {weakTopics.map(w => (
                      <Tag key={`${w.subject}-${w.chapter}`}>
                        {w.chapter} · {Math.round(w.accuracy * 100)}%
                      </Tag>
                    ))}
                  </div>
                )}
              </>
            )}
          </motion.div>
        </AnimatePresence>
      </main>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-40 bg-card/90 shadow-[0_-10px_30px_-20px_rgba(46,46,46,.35)] backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-focus items-center justify-between gap-2 px-4">
          {/* Back — goes to previous answered question for review */}
          <Button variant="outline" size="icon"
            onClick={isReviewing && historyIndex === 0 ? () => setHistoryIndex(-1) : goBack}
            disabled={history.length === 0 && !isReviewing}
            title="Previous question" aria-label="Previous question"
            className="size-10 rounded-control">
            <ChevronLeft className="size-5" />
          </Button>

          {/* Centre: bookmark + summary */}
          <div className="flex items-center gap-1.5">
            <Button variant={bookmarked ? 'secondary' : 'ghost'} size="icon" onClick={handleBookmark}
              aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'} aria-pressed={bookmarked}
              className="size-10 rounded-control">
              {bookmarked ? <BookmarkCheck className="size-[18px]" /> : <Bookmark className="size-[18px]" />}
            </Button>
            <Button variant="ghost" onClick={() => setShowSummary(true)} className="h-10 rounded-control px-3 text-body-sm tabular-nums text-muted-foreground">
              <Define text="Questions answered this session. Tap for your summary.">{sessionCount} done</Define>
            </Button>
          </div>

          {/* Next / Forward */}
          {isReviewing ? (
            /* In review — forward arrow goes toward present */
            <Button onClick={goForward} className="h-10 rounded-control px-5 text-body font-semibold">
              Next <ArrowRight />
            </Button>
          ) : (
            <Button onClick={advanceToNext} disabled={selectedOption === null} className="h-10 rounded-control px-5 text-body font-semibold">
              Next <ArrowRight />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
