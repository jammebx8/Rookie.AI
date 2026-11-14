'use client'
/**
 * Presentational pieces for /practice (no data calls here — logic lives in PracticeClient).
 */
import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Check, Flame, Loader2, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Define } from '@/components/rookie/define'
import { Bar, ListRow, Meta, RingStat, Tag } from '@/components/rookie/ui'
import { cn } from '@/lib/utils'
import { AI_BUDDIES } from '../QuestionViewer/QuestionViewerClient'

export interface SessionResult {
  question_id: string
  correct: boolean
  chapter: string
  subject: string
}

export const dialogCls = 'rounded-card bg-card p-6 text-body ring-1 ring-black/[.06] dark:ring-white/[.08] sm:max-w-md'

// ─── Spinner ─────────────────────────────────────────────────────────────────
export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-4 shrink-0 animate-spin text-muted-foreground', className)} />
}

// ─── Image zoom ──────────────────────────────────────────────────────────────
export function ImageModal({ src, onClose }: { src: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!src} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="rounded-card bg-card p-3 sm:max-w-2xl">
        <DialogTitle className="sr-only">Image</DialogTitle>
        {src && <img src={src} alt="Question" className="max-h-[72vh] w-full rounded-control bg-white object-contain" />}
      </DialogContent>
    </Dialog>
  )
}

// ─── Buddy selector ──────────────────────────────────────────────────────────
export function BuddySelectorModal({ open, currentId, onSelect, onClose }: {
  open: boolean; currentId: string; onSelect: (id: string) => void; onClose: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className={cn(dialogCls, 'max-h-[80vh] grid-rows-[auto_1fr] overflow-hidden')}>
        <DialogHeader>
          <DialogTitle className="text-title font-semibold tracking-[-0.015em]">
            <Define term="mentor">Choose your buddy</Define>
          </DialogTitle>
          <DialogDescription className="text-body-sm">They explain every solution in their own voice.</DialogDescription>
        </DialogHeader>
        <div className="-mx-1 space-y-2 overflow-y-auto px-1 pb-1">
          {Object.entries(AI_BUDDIES).map(([id, b]) => {
            const active = currentId === id
            return (
              <button key={id} type="button"
                onClick={() => { onSelect(id); onClose() }}
                className={cn(
                  'flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left ring-1 transition',
                  active ? 'bg-secondary text-secondary-foreground ring-[var(--rk-sky-300)] dark:ring-transparent'
                         : 'bg-muted ring-transparent hover:bg-secondary hover:text-secondary-foreground',
                )}>
                <img src={b.image} alt={b.name} className="size-10 shrink-0 rounded-full object-cover" />
                <span className="min-w-0 flex-1 text-body font-medium">{b.name}</span>
                {active && <Check className="size-4 shrink-0 text-primary" />}
              </button>
            )
          })}
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Session summary ─────────────────────────────────────────────────────────
export function SessionSummary({ open, results, onContinue, onHome }: {
  open: boolean; results: SessionResult[]; onContinue: () => void; onHome: () => void
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

  return (
    // No dismiss on backdrop / Esc: the original screen only had "Keep practicing" and "Back to home".
    <Dialog open={open} disablePointerDismissal onOpenChange={() => {}}>
      <DialogContent showCloseButton={false} className={cn(dialogCls, 'max-h-[88vh] overflow-y-auto')}>
        <div className="flex items-center gap-4">
          <RingStat value={pct} size={72} stroke={7} />
          <div className="min-w-0">
            <DialogTitle className="text-heading font-semibold tracking-[-0.02em]">
              {pct >= 70 ? 'Great session!' : pct >= 40 ? 'Good effort' : 'Keep going'}
            </DialogTitle>
            <Meta><Define text="Share of this session’s answers that were correct.">{correct}/{total} correct</Define></Meta>
          </div>
        </div>
        <DialogDescription className="text-body-sm leading-relaxed">
          {pct >= 70
            ? 'Strong session. Next questions will push into harder territory.'
            : pct < 40
            ? 'Tough set. We’ll stay close to your weak chapters until they improve.'
            : 'Solid practice. We’re tracking your gaps and will focus there next.'}
        </DialogDescription>

        {Object.keys(byChapter).length > 0 && (
          <div className="mt-1">
            <p className="mb-2 text-label font-medium text-muted-foreground">
              <Define text="Your score in each chapter this session, weakest first.">Chapter breakdown</Define>
            </p>
            <div className="space-y-2">
              {Object.entries(byChapter)
                .sort(([, a], [, b]) => (a.correct / a.total) - (b.correct / b.total)) // worst first
                .map(([ch, s]) => {
                  const chPct = Math.round((s.correct / s.total) * 100)
                  return (
                    <ListRow key={ch} className="flex-col items-stretch gap-2 hover:bg-muted">
                      <div className="flex items-center justify-between gap-3">
                        <span className="truncate text-body-sm text-foreground">{ch || 'Other'}</span>
                        <span className="text-label font-semibold tabular-nums text-muted-foreground">{s.correct}/{s.total}</span>
                      </div>
                      <Bar value={chPct} className="bg-background" />
                    </ListRow>
                  )
                })}
            </div>
          </div>
        )}

        <div className="mt-2 flex flex-col gap-2">
          <Button onClick={onContinue} className="h-11 rounded-control text-body font-semibold">
            Keep practicing <ArrowRight />
          </Button>
          <Button variant="ghost" onClick={onHome} className="h-10 rounded-control text-body-sm">
            Back to home
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Streak modal ────────────────────────────────────────────────────────────
export function StreakModal({ open, streak, onClose, onShow }: {
  open: boolean; streak: number; onClose: () => void; onShow?: () => void
}) {
  useEffect(() => { if (open) onShow?.() }, [open, onShow])
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent showCloseButton={false} className={cn(dialogCls, 'text-center sm:max-w-sm')}>
        <div className="flex items-center justify-center gap-2 pt-2">
          <Flame className="size-8 text-muted-foreground" strokeWidth={1.8} />
          <motion.span key={streak}
            initial={{ y: 16, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 22, delay: 0.1 }}
            className="text-display font-bold leading-none tracking-[-0.045em] tabular-nums text-foreground">
            {streak}
          </motion.span>
        </div>
        <div>
          <DialogTitle className="text-title font-semibold">
            <Define term="streak">{streak === 1 ? 'Streak started!' : `${streak}-day streak!`}</Define>
          </DialogTitle>
          <DialogDescription className="mt-1.5 text-body-sm">
            {streak === 1
              ? '3+ questions done today. Come back tomorrow to keep it going.'
              : `${streak} days in a row. Consistency is your superpower.`}
          </DialogDescription>
        </div>
        <Button onClick={onClose} className="mt-1 h-11 rounded-control text-body font-semibold">
          Keep going <ArrowRight />
        </Button>
      </DialogContent>
    </Dialog>
  )
}

// ─── Level-up badge ──────────────────────────────────────────────────────────
export function LevelUpBadge({ level, onDone }: { level: number; onDone: () => void }) {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t) }, [onDone])
  return (
    <motion.div
      initial={{ scale: 0.85, opacity: 0, y: -8 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      exit={{ scale: 0.9, opacity: 0, y: -6 }}
      transition={{ type: 'spring', stiffness: 380, damping: 24 }}
      className="flex items-center gap-2 rounded-control bg-popover px-4 py-2.5 text-popover-foreground shadow-[0_10px_30px_-12px_rgba(46,46,46,.35)] ring-1 ring-border"
    >
      <TrendingUp className="size-4 text-primary" />
      <span className="text-body-sm font-semibold"><Define term="level">Level {level}</Define> reached</span>
    </motion.div>
  )
}

// ─── Difficulty ──────────────────────────────────────────────────────────────
export function DifficultyTag({ difficulty }: { difficulty: number }) {
  const label = difficulty < 0.35 ? 'Easy' : difficulty < 0.6 ? 'Medium' : difficulty < 0.8 ? 'Hard' : 'Expert'
  return <Tag><Define term="difficulty">{label}</Define></Tag>
}

// ─── Survey chip (OMR bubble) ────────────────────────────────────────────────
export function OmrChip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" role="checkbox" aria-checked={active} onClick={onClick}
      className={cn(
        'group flex items-start gap-2.5 rounded-control px-3 py-2.5 text-left text-body-sm font-medium leading-snug ring-1 transition',
        active ? 'bg-secondary text-secondary-foreground ring-[var(--rk-sky-500)]'
               : 'bg-muted text-foreground ring-transparent hover:bg-secondary hover:ring-[var(--rk-sky-300)]',
      )}>
      <span className={cn(
        'mt-px grid size-[18px] shrink-0 place-items-center rounded-full border-[1.5px] transition',
        active ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/50 group-hover:border-primary',
      )}>
        {active && <Check className="size-3" strokeWidth={3} />}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  )
}
