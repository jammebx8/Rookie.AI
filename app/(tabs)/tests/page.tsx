'use client'

import React, { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import {
  CalendarRange, ChevronDown, ChevronRight, ClipboardList, Clock, FileText, Gauge, ListChecks, Loader2, Lock, Play, Plus, Sparkles, Target, Trophy,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Card, CardHead, Chip, EmptyState, ListRow, Meta, Metric, Page, PageHeader, Row, Section, Skeleton, Tag } from '@/components/rookie/ui'
import { Define } from '@/components/rookie/define'
import { PassPitch, useCloseOnCheckout } from '@/components/rookie/sale'
import { sale, saleMoney } from '@/lib/sale'
import { cn } from '@/lib/utils'
import { supabase } from '../../../public/src/utils/supabase'
import type { TestAttemptRow } from '../../../features/tests/types'
import { WizardModal } from '../../../features/tests/WizardModal'
import { bustPassCache, hasRookiePass } from '../../../lib/rookiePass'
import { notify } from '@/components/rookie/toast'

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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fmt(date: string) {
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDur(seconds: number | null) {
  if (!seconds) return '—'
  const m = Math.floor(seconds / 60)
  return m < 60 ? `${m} min` : `${Math.floor(m / 60)}h ${m % 60}m`
}

/** Short label for a shift: "2024 · 9 Apr · Evening" style. */
function shiftParts(name: string) {
  const year = name.match(/20\d\d/)?.[0] ?? ''
  const rest = name.replace(/JEE (Main|Advanced)\s*/, '').replace(year, '').replace('(Online)', '').replace(/\s+/g, ' ').trim()
  return { year, rest }
}

// ─── Pass upsell dialog ───────────────────────────────────────────────────────
function PassDialog({ open, onOpenChange, reason, onSuccess }: {
  open: boolean; onOpenChange: (o: boolean) => void; reason: string; onSuccess: () => void
}) {
  // Razorpay can't take focus inside a modal dialog — close this when checkout opens.
  useCloseOnCheckout(useCallback(() => onOpenChange(false), [onOpenChange]))
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 rounded-card p-6 sm:max-w-[440px]">
        <DialogTitle className="text-heading font-semibold tracking-[-0.02em]">Unlock with Rookie Pass</DialogTitle>
        <DialogDescription className="sr-only">{reason}</DialogDescription>
        <div className="mt-3">
          <PassPitch reason={reason} onSuccess={onSuccess} />
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Overall stats ─────────────────────────────────────────────────────────────
function OverallStats({ attempts }: { attempts: TestAttemptRow[] }) {
  const submitted = attempts.filter(a => a.status === 'submitted')
  const tC = submitted.reduce((s, a) => s + (a.correct_count    ?? 0), 0)
  const tI = submitted.reduce((s, a) => s + (a.incorrect_count  ?? 0), 0)
  const tU = submitted.reduce((s, a) => s + (a.unattempted_count ?? 0), 0)
  const tS = submitted.reduce((s, a) => s + (a.score            ?? 0), 0)
  const mS = submitted.reduce((s, a) => s + (a.max_score        ?? 0), 0)
  const attempted = tC + tI
  const accuracy  = attempted > 0 ? Math.round((tC / attempted) * 100) : 0

  return (
    <Section title="Overall" text="Totals across every test you've submitted.">
      <Row className="md:grid-cols-4">
        <Metric icon={ClipboardList} label="Tests taken" text="Tests you've submitted." value={submitted.length}>
          <Meta>Custom and PYQ mocks</Meta>
        </Metric>
        <Metric icon={Trophy} label="Score" term="score"
          value={<>{tS}<span className="text-title font-semibold text-muted-foreground"> / {mS}</span></>}>
          <Meta>Across all tests</Meta>
        </Metric>
        <Metric icon={Target} label="Accuracy" text="Share of your answered questions that were right, across all tests." value={`${accuracy}%`}>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary" style={{ width: `${accuracy}%` }} />
          </div>
        </Metric>
        <Metric icon={ListChecks} label="Attempted" term="attempted" value={attempted}>
          <div className="flex flex-wrap gap-1.5">
            <Tag tone="right">{tC} right</Tag>
            <Tag tone="wrong">{tI} wrong</Tag>
            <Tag>{tU} skipped</Tag>
          </div>
        </Metric>
      </Row>
    </Section>
  )
}

// ─── Attempt row ───────────────────────────────────────────────────────────────
function AttemptRow({ attempt, onView, resume }: { attempt: TestAttemptRow; onView: () => void; resume?: boolean }) {
  const pct = attempt.max_score && attempt.max_score > 0 ? Math.round(((attempt.score ?? 0) / attempt.max_score) * 100) : null
  const tone = pct === null ? 'neutral' : pct >= 70 ? 'right' : pct < 40 ? 'wrong' : 'neutral'
  return (
    <ListRow
      onClick={onView}
      role="button" tabIndex={0} onKeyDown={e => { if (e.key === 'Enter') onView() }}
      className="cursor-pointer gap-4 px-4 py-3.5 outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-body font-semibold text-foreground">{attempt.title}</p>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-meta text-muted-foreground">
          <span>{fmt(attempt.created_at)}</span>
          <span aria-hidden>·</span>
          <span className="flex items-center gap-1"><Clock className="size-3" />{fmtDur(attempt.time_taken_seconds ?? attempt.duration_seconds)}</span>
          {(attempt.config?.subjects ?? []).slice(0, 2).map((s: string) => (
            <span key={s} className="hidden sm:inline">· {s}</span>
          ))}
        </div>
      </div>
      {resume ? (
        <Button size="sm" className="h-8 rounded-control px-3" tabIndex={-1}><Play className="fill-current" /> Resume</Button>
      ) : (
        <div className="flex shrink-0 items-center gap-2">
          {attempt.score !== null && attempt.max_score !== null && (
            <span className="hidden text-body-sm font-semibold tabular-nums text-foreground sm:inline">
              {attempt.score}<span className="text-muted-foreground">/{attempt.max_score}</span>
            </span>
          )}
          {pct !== null && <Tag tone={tone} className="tabular-nums">{pct}%</Tag>}
        </div>
      )}
      <ChevronRight className="size-4 shrink-0 text-muted-foreground" />
    </ListRow>
  )
}

// ─── PYQ Mock card ─────────────────────────────────────────────────────────────
const SHIFTS_PREVIEW = 6

function PYQMockSection({ attempts, onStarted }: { attempts: TestAttemptRow[]; onStarted: () => void }) {
  void attempts
  const router = useRouter()
  const [expanded,    setExpanded]    = useState(false)
  const [filterExam,  setFilterExam]  = useState<ExamFilter>('JEE Main')
  const [starting,    setStarting]    = useState<string | null>(null)
  const [hasPass,     setHasPass]     = useState<boolean | null>(null)
  const [payOpen,     setPayOpen]     = useState(false)

  // Check Rookie Pass on mount + listen for updates
  useEffect(() => {
    let mounted = true
    const checkPass = async (force = false) => {
      try {
        const pass = await hasRookiePass(undefined, force)
        if (mounted) setHasPass(pass)
      } catch { if (mounted) setHasPass(false) }
    }
    checkPass()
    const handleUpdate = () => { checkPass(true) }
    window.addEventListener('rookiePassUpdated', handleUpdate)
    return () => {
      mounted = false
      window.removeEventListener('rookiePassUpdated', handleUpdate)
    }
  }, [])

  const shifts = filterExam === 'JEE Main' ? JEE_MAIN_SHIFTS : JEE_ADV_SHIFTS
  const visible = expanded ? shifts : shifts.slice(0, SHIFTS_PREVIEW)

  const isUnlocked = (shift: PYQShift) => hasPass || shift.exam_shift === FREE_SHIFT

  const handleStart = async (shift: PYQShift) => {
    const isFree = shift.exam_shift === FREE_SHIFT
    let unlocked = isFree || hasPass === true

    // Direct real-time DB verification before start or pay
    if (!isFree) {
      try {
        const { checkUserPaidDirectFromDB } = await import('../../../lib/rookiePass')
        const directPass = await checkUserPaidDirectFromDB()
        setHasPass(directPass)
        unlocked = directPass
      } catch {
        unlocked = false
      }
    }

    // If locked, show the Rookie Pass upsell (checkout runs from PassPitch → triggerCheckout)
    if (!unlocked) {
      setPayOpen(true)
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
      notify.error('Could not start test. Please try again.')
    } finally {
      setStarting(null)
    }
  }

  return (
    <Card className="flex flex-col">
      <CardHead icon={FileText} label="PYQ mock papers" title="Real JEE shifts, full length"
        text="Actual past papers, shift by shift, with the real duration and marking." />

      <div className="flex flex-wrap gap-2">
        {EXAM_OPTIONS.map(ex => (
          <Chip key={ex} active={ex === filterExam} onClick={() => { setFilterExam(ex); setExpanded(false) }}>{ex}</Chip>
        ))}
      </div>

      {!hasPass && filterExam === 'JEE Advanced' && (
        <p className="mt-3 flex items-center gap-1.5 text-meta text-muted-foreground">
          <Lock className="size-3.5" /> Advanced mocks need Rookie Pass · {saleMoney(sale.price)}/year
        </p>
      )}

      <div className="mt-4 flex flex-col gap-1.5">
        {visible.map(shift => {
          const isLoadingThis = starting === shift.exam_shift
          const unlocked = isUnlocked(shift)
          const { year, rest } = shiftParts(shift.exam_shift)
          return (
            <ListRow
              key={shift.exam_shift}
              role="button"
              tabIndex={0}
              aria-disabled={isLoadingThis || undefined}
              aria-label={`${shift.exam_shift}${unlocked ? '' : ', needs Rookie Pass'}`}
              onClick={() => { if (!isLoadingThis) handleStart(shift) }}
              onKeyDown={e => { if ((e.key === 'Enter' || e.key === ' ') && !isLoadingThis) { e.preventDefault(); handleStart(shift) } }}
              className={cn(
                'cursor-pointer gap-3 px-4 outline-none focus-visible:ring-2 focus-visible:ring-ring',
                starting && !isLoadingThis && 'opacity-50',
              )}
            >
              <span className="w-10 shrink-0 text-body-sm font-semibold tabular-nums text-foreground">{year}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-body-sm font-medium text-foreground">{rest}</p>
                <p className="text-caption text-muted-foreground">{shift.total} Qs · 3 hrs</p>
              </div>
              {isLoadingThis ? (
                <Loader2 className="size-4 shrink-0 animate-spin text-primary" />
              ) : unlocked ? (
                <span className="flex shrink-0 items-center gap-1 text-label font-semibold text-primary">
                  {shift.exam_shift === FREE_SHIFT && !hasPass && <Tag tone="blue" className="mr-1">Free</Tag>}
                  Start <ChevronRight className="size-4" />
                </span>
              ) : (
                <span className="flex shrink-0 items-center gap-1.5 text-muted-foreground">
                  <Tag>Pass</Tag>
                  <Lock className="size-4" />
                </span>
              )}
            </ListRow>
          )
        })}
      </div>

      {shifts.length > SHIFTS_PREVIEW && (
        <Button variant="ghost" onClick={() => setExpanded(p => !p)} aria-expanded={expanded}
          className="mt-3 h-9 self-start rounded-control px-3 text-muted-foreground">
          {expanded ? 'Show fewer' : `Show all ${shifts.length} shifts`}
          <ChevronDown className={cn('transition-transform', expanded && 'rotate-180')} />
        </Button>
      )}

      <PassDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        reason="This shift is part of Rookie Pass. Your free mock is the 9 April 2024 evening shift."
        onSuccess={() => { bustPassCache(); setHasPass(true); setPayOpen(false) }}
      />
    </Card>
  )
}

// ─── Custom test card ──────────────────────────────────────────────────────────
const CUSTOM_STEPS = [
  { icon: CalendarRange, label: 'Pick years & chapters', meta: 'Main · Advanced' },
  { icon: Clock,         label: 'Set the clock',         meta: '30 to 180 min' },
  { icon: ListChecks,    label: 'Real marking, full review', meta: '+4 / −1' },
]

function HeroCard({ onNew, attempts }: { onNew: () => void; attempts: TestAttemptRow[] }) {
  const [hasPass,    setHasPass]    = useState<boolean | null>(null)
  const [payOpen,    setPayOpen]    = useState(false)
  const customToday = countCustomTestsToday(attempts)
  const FREE_LIMIT  = 1

  useEffect(() => {
    let mounted = true
    const checkPass = async (force = false) => {
      try {
        const pass = await hasRookiePass(undefined, force)
        if (mounted) setHasPass(pass)
      } catch { if (mounted) setHasPass(false) }
    }
    checkPass()
    const handleUpdate = () => { checkPass(true) }
    window.addEventListener('rookiePassUpdated', handleUpdate)
    return () => {
      mounted = false
      window.removeEventListener('rookiePassUpdated', handleUpdate)
    }
  }, [])

  const limitReached = !hasPass && customToday >= FREE_LIMIT

  const handleBuildClick = async () => {
    if (customToday >= FREE_LIMIT) {
      try {
        const { checkUserPaidDirectFromDB } = await import('../../../lib/rookiePass')
        const directPass = await checkUserPaidDirectFromDB()
        setHasPass(directPass)
        if (!directPass) return
      } catch {
        return
      }
    }
    onNew()
  }

  const freeLeft = Math.max(0, FREE_LIMIT - customToday)

  return (
    <Card className="flex flex-col">
      <CardHead icon={ClipboardList} label="Custom test" title="Build your own paper"
        text="Pick exam, years, subjects, chapters and duration. Questions come from real JEE PYQs." />
      <p className="text-body-sm text-muted-foreground">
        Any year, subject and chapter. Set the clock and go.
      </p>

      <div className="mt-5 flex flex-col gap-1.5">
        {CUSTOM_STEPS.map(st => (
          <ListRow key={st.label} className="gap-3 px-4 hover:bg-muted">
            <st.icon className="size-4 shrink-0 text-muted-foreground" />
            <span className="min-w-0 truncate text-body-sm text-foreground">{st.label}</span>
            <Meta className="ml-auto shrink-0 whitespace-nowrap">{st.meta}</Meta>
          </ListRow>
        ))}
      </div>

      <div className="mt-4 flex items-center gap-3 rounded-control px-1">
        <Gauge className="size-4 shrink-0 text-muted-foreground" />
        {hasPass ? (
          <span className="text-body-sm text-foreground">
            <Define text="Rookie Pass gives you unlimited custom tests.">Unlimited</Define> with Rookie Pass
          </span>
        ) : (
          <span className="text-body-sm text-foreground">
            <Define text={`Without Rookie Pass you can create ${FREE_LIMIT} custom test a day. It resets at midnight.`}>Free today</Define>
            <span className="ml-2 font-semibold tabular-nums">{freeLeft}/{FREE_LIMIT}</span>
            <span className="ml-1 text-muted-foreground">left</span>
          </span>
        )}
      </div>

      <div className="mt-auto flex flex-wrap items-center gap-2 pt-6">
        {limitReached ? (
          <>
            <Button disabled className="h-11 rounded-control px-5 text-body">
              <Plus /> Create test
            </Button>
            <Button variant="secondary" onClick={() => setPayOpen(true)} className="h-11 rounded-control px-4">
              <Sparkles /> Go unlimited
            </Button>
            <Meta className="basis-full pt-1">You&apos;ve used today&apos;s free test. Come back tomorrow, or get Rookie Pass.</Meta>
          </>
        ) : (
          <Button onClick={handleBuildClick} className="h-11 rounded-control px-5 text-body">
            <Plus /> Create test
          </Button>
        )}
      </div>

      <PassDialog
        open={payOpen}
        onOpenChange={setPayOpen}
        reason="Free plan: 1 custom test a day. Rookie Pass makes them unlimited."
        onSuccess={() => { bustPassCache(); setHasPass(true); setPayOpen(false) }}
      />
    </Card>
  )
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function TestsPage() {
  const router  = useRouter()
  const [wizardOpen, setWizardOpen] = useState(false)
  const [attempts,   setAttempts]   = useState<TestAttemptRow[]>([])
  const [loading,    setLoading]    = useState(true)
  const [userId,     setUserId]     = useState<string | null>(null)

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
    <Page className="pb-28">
      <PageHeader title="Tests" sub="Full PYQ mocks or your own custom paper." />

      <AnimatePresence>
        {inProgress.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-10">
            <Card>
              <CardHead icon={Play} label="Resume" title="Pick up where you left off"
                text="Tests you started but haven't submitted. The timer keeps running." />
              <div className="flex flex-col gap-1.5">
                {inProgress.map(a => <AttemptRow key={a.id} attempt={a} resume onView={() => handleView(a)} />)}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <Row className="mt-10 md:grid-cols-2">
        <HeroCard onNew={() => setWizardOpen(true)} attempts={attempts} />
        <PYQMockSection attempts={attempts} onStarted={handleTestCreated} />
      </Row>

      {submitted.length > 0 && <OverallStats attempts={attempts} />}

      <Section
        title={<>Previous tests{submitted.length > 0 && <span className="ml-2 text-body-sm font-medium text-muted-foreground">{submitted.length}</span>}</>}
        text="Tests you've submitted, newest first. Open one to see the full review."
      >
        {loading ? (
          <Card className="flex flex-col gap-1.5 p-4 md:p-5">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-[60px]" />)}
          </Card>
        ) : submitted.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No tests yet"
            sub="Build your first custom test from JEE PYQs and track how you improve."
            action={<Button onClick={() => setWizardOpen(true)} className="h-10 rounded-control px-5"><Plus /> Create your first test</Button>}
          />
        ) : (
          <Card className="flex flex-col gap-1.5 p-4 md:p-5">
            {submitted.map((a, i) => (
              <motion.div key={a.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 10) * 0.03 }}>
                <AttemptRow attempt={a} onView={() => handleView(a)} />
              </motion.div>
            ))}
          </Card>
        )}
      </Section>

      <AnimatePresence>
        {wizardOpen && <WizardModal onClose={() => setWizardOpen(false)} onTestCreated={handleTestCreated} />}
      </AnimatePresence>
    </Page>
  )
}
