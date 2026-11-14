'use client'
// ─── features/tests/WizardModal.tsx ──────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { useRouter } from 'next/navigation'
import { useWizardStore } from './useTestStore'
import { TestPreview } from './TestPreview'
import type { WizardStep } from './types'
import { supabase } from '../../public/src/utils/supabase'
import { track } from '../../lib/analytics'

import { Step1Exam }     from './steps/Step1Exam'
import { Step2Years }    from './steps/Step2Years'
import { Step3Subjects } from './steps/Step3Subjects'
import { Step4Chapters } from './steps/Step4Chapters'
import { Step5Duration } from './steps/Step5Duration'

interface Props {
  isDark?:        boolean
  onClose:        () => void
  onTestCreated?: () => void
}

// ─── Discard confirm ─────────────────────────────────────────────────────────
function DiscardDialog({
  open, onConfirm, onCancel,
}: { open: boolean; onConfirm: () => void; onCancel: () => void }) {
  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onCancel() }}>
      <DialogContent showCloseButton={false} className="gap-0 rounded-card p-6 sm:max-w-[380px]">
        <DialogTitle className="text-title font-semibold tracking-[-0.015em]">Discard this test?</DialogTitle>
        <DialogDescription className="mt-1.5 text-body-sm">Your selections will be lost.</DialogDescription>
        <div className="mt-6 flex gap-2">
          <Button variant="secondary" onClick={onCancel} className="h-10 flex-1 rounded-control">Keep editing</Button>
          <Button variant="destructive" onClick={onConfirm} className="h-10 flex-1 rounded-control">Discard</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ─── Step validity check ──────────────────────────────────────────────────────
function stepValid(step: WizardStep, config: ReturnType<typeof useWizardStore>['state']['config']): boolean {
  switch (step) {
    case 1: return !!config.examId
    case 2: return config.years.length > 0
    case 3: return config.subjects.length > 0
    case 4: return config.chapters.length > 0
    case 5: return config.durationSeconds !== null
    default: return false
  }
}

// ─── Stepper ──────────────────────────────────────────────────────────────────
const STEP_LABELS: Record<WizardStep, string> = { 1: 'Exam', 2: 'Years', 3: 'Subjects', 4: 'Chapters', 5: 'Duration' }

function Stepper({ step, done }: { step: WizardStep; done: boolean }) {
  return (
    <ol className="flex items-center gap-1.5" aria-label={`Step ${step} of 5`}>
      {([1, 2, 3, 4, 5] as WizardStep[]).map(s => {
        const complete = done || s < step
        const current  = !done && s === step
        return (
          <li key={s} className="flex min-w-0 flex-1 items-center gap-1.5" aria-current={current ? 'step' : undefined}>
            <span className={cn(
              'grid size-6 shrink-0 place-items-center rounded-full text-caption font-semibold tabular-nums transition',
              current ? 'bg-primary text-primary-foreground' : complete ? 'bg-secondary text-secondary-foreground' : 'bg-muted text-muted-foreground',
            )}>
              {complete ? <Check className="size-3.5" strokeWidth={2.5} /> : s}
            </span>
            <span className={cn(
              'truncate text-meta font-medium',
              current ? 'shrink-0 text-foreground' : 'hidden text-muted-foreground sm:inline',
            )}>{STEP_LABELS[s]}</span>
            {s < 5 && <span aria-hidden className={cn('h-[2px] min-w-2 flex-1 rounded-full', complete ? 'bg-primary/40' : 'bg-muted')} />}
          </li>
        )
      })}
    </ol>
  )
}

// ─── WizardModal ─────────────────────────────────────────────────────────────
export function WizardModal({ onClose, onTestCreated }: Props) {
  const router  = useRouter()
  const { state, open: _open, close, reset, setStep,
          setExam, setYears, setSubjects, setChapters, setDuration } = useWizardStore()
  const [showDiscard, setShowDiscard] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const [creating, setCreating]       = useState(false)

  // Mount: open the wizard store
  useEffect(() => { _open() }, [_open])

  const tryClose = () => {
    if (state.dirty) { setShowDiscard(true) } else { handleConfirmDiscard() }
  }

  const handleConfirmDiscard = () => {
    reset()
    setShowPreview(false)
    setShowDiscard(false)
    onClose()
  }

  const canGoNext  = stepValid(state.step, state.config)
  const isLastStep = state.step === 5

  const handleNext = () => {
    if (!canGoNext) return
    if (isLastStep) {
      setShowPreview(true)
    } else {
      setStep((state.step + 1) as WizardStep)
    }
  }

  const handleBack = () => {
    if (showPreview) { setShowPreview(false); return }
    if (state.step > 1) setStep((state.step - 1) as WizardStep)
  }

  const handleStart = useCallback(async () => {
    setCreating(true)
    const { config } = state
    const subjects = config.subjects
    const title = `${config.examId === 'jee_main' ? 'JEE Main' : 'Custom'} — ${subjects.join(', ')}`

    try {
      // Attach the user's JWT so the API route can verify identity
      const { data: { session } } = await supabase.auth.getSession()
      const token = session?.access_token ?? ''

      const res = await fetch('/api/tests/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ config, title }),
      })
      if (!res.ok) throw new Error('Failed to create test')
      const data = await res.json()
      // Track test created
      track('test_created', {
        feature:  'custom_test',
        test_id:  data.attemptId,
        metadata: {
          exam:              config.examId,
          years:             config.years,
          subjects:          config.subjects,
          chapter_count:     config.chapters.length,
          duration_seconds:  config.durationSeconds,
          question_count:    (data.questionIds ?? []).length,
        },
      })
      reset()
      onClose()
      onTestCreated?.()
      router.push(`/tests/${data.attemptId}`)
    } catch {
      setCreating(false)
    }
  }, [state, reset, onClose, onTestCreated, router])

  return (
    <>
      <Dialog open onOpenChange={o => { if (!o && !showDiscard) tryClose() }}>
        <DialogContent
          aria-label={showPreview ? 'Test Preview' : `Create Your Own Test — Step ${state.step} of 5`}
          className="flex max-h-[90vh] flex-col gap-0 overflow-hidden rounded-card p-0 sm:max-w-[600px]"
        >
          {/* Header */}
          <div className="shrink-0 px-6 pt-6 pb-5">
            <DialogTitle className="pr-8 text-heading font-semibold tracking-[-0.02em]">
              {showPreview ? 'Test preview' : 'Create a test'}
            </DialogTitle>
            <DialogDescription className="sr-only">Build a custom test from JEE PYQs in five steps.</DialogDescription>
            <div className="mt-4">
              <Stepper step={state.step} done={showPreview} />
            </div>
          </div>

          {/* Body */}
          <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-6 pb-6">
            <AnimatePresence mode="wait">
              {showPreview ? (
                <motion.div key="preview" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
                  <TestPreview
                    config={state.config}
                    creating={creating}
                    onStart={handleStart}
                    onEdit={() => setShowPreview(false)}
                  />
                </motion.div>
              ) : (
                <motion.div key={state.step} initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }} transition={{ duration: 0.18 }}>
                  {state.step === 1 && <Step1Exam     value={state.config.examId}     onChange={setExam}     />}
                  {state.step === 2 && <Step2Years    value={state.config.years}      onChange={setYears}    />}
                  {state.step === 3 && <Step3Subjects value={state.config.subjects}   onChange={setSubjects} config={state.config} />}
                  {state.step === 4 && <Step4Chapters value={state.config.chapters}   onChange={setChapters} config={state.config} />}
                  {state.step === 5 && <Step5Duration value={state.config.durationSeconds} onChange={setDuration} />}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {!showPreview && (
            <div className="flex shrink-0 gap-2 bg-muted/60 px-6 py-4">
              <Button
                variant="ghost"
                onClick={handleBack}
                disabled={state.step === 1}
                className="h-10 rounded-control px-4"
              >
                <ChevronLeft /> Back
              </Button>
              <Button
                onClick={handleNext}
                disabled={!canGoNext}
                className="ml-auto h-10 min-w-[140px] rounded-control px-5 text-body-sm"
              >
                {isLastStep ? 'Preview test' : 'Next'}
                {!isLastStep && <ChevronRight />}
              </Button>
            </div>
          )}

          {/* Discard confirmation (nested so the parent dialog doesn't make it inert) */}
          <DiscardDialog open={showDiscard} onConfirm={handleConfirmDiscard} onCancel={() => setShowDiscard(false)} />
        </DialogContent>
      </Dialog>
    </>
  )
}
