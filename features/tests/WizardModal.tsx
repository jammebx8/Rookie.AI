'use client'
// ─── features/tests/WizardModal.tsx ──────────────────────────────────────────

import React, { useCallback, useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, ChevronLeft, ChevronRight, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { useWizardStore } from './useTestStore'
import { TestPreview } from './TestPreview'
import type { WizardStep } from './types'
import { supabase } from '../../public/src/utils/supabase'

import { Step1Exam }     from './steps/Step1Exam'
import { Step2Years }    from './steps/Step2Years'
import { Step3Subjects } from './steps/Step3Subjects'
import { Step4Chapters } from './steps/Step4Chapters'
import { Step5Duration } from './steps/Step5Duration'

interface Props {
  isDark:         boolean
  onClose:        () => void
  onTestCreated?: () => void
}

// ─── Discard confirm ─────────────────────────────────────────────────────────
function DiscardDialog({
  isDark, onConfirm, onCancel,
}: { isDark: boolean; onConfirm: () => void; onCancel: () => void }) {
  const T = {
    bg:   isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]',
    text: isDark ? 'text-white' : 'text-[#0f172a]',
    muted:isDark ? 'text-slate-400' : 'text-slate-500',
  }
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4"
      onClick={onCancel}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        onClick={e => e.stopPropagation()}
        className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${T.bg}`}
      >
        <div className="flex items-center justify-center w-11 h-11 rounded-full bg-amber-500/15 mx-auto mb-4">
          <AlertTriangle size={22} className="text-amber-500" />
        </div>
        <h3 className={`text-base font-bold text-center mb-2 ${T.text}`}>Discard test?</h3>
        <p className={`text-sm text-center mb-6 ${T.muted}`}>
          Your selections will be lost. This cannot be undone.
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors ${
              isDark ? 'bg-[#111827] border-[#1D2939] text-white hover:bg-[#1a2235]' : 'bg-gray-100 border-gray-200 text-[#0f172a]'
            }`}
          >
            Keep editing
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors"
          >
            Discard
          </button>
        </div>
      </motion.div>
    </motion.div>
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

// ─── Progress bar ─────────────────────────────────────────────────────────────
function ProgressBar({ step, isDark }: { step: WizardStep; isDark: boolean }) {
  return (
    <div className="flex items-center gap-1.5">
      {([1, 2, 3, 4, 5] as WizardStep[]).map(s => (
        <div
          key={s}
          className="flex-1 h-1.5 rounded-full overflow-hidden"
          style={{ background: isDark ? '#1e2538' : '#e5e7eb' }}
        >
          <motion.div
            className="h-full rounded-full"
            style={{ background: '#4f46e5' }}
            initial={{ width: 0 }}
            animate={{ width: s <= step ? '100%' : '0%' }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      ))}
    </div>
  )
}

// ─── WizardModal ─────────────────────────────────────────────────────────────
export function WizardModal({ isDark, onClose, onTestCreated }: Props) {
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
      reset()
      onClose()
      onTestCreated?.()
      router.push(`/tests/${data.attemptId}`)
    } catch {
      setCreating(false)
    }
  }, [state, reset, onClose, onTestCreated, router])

  const T = {
    overlay: 'fixed inset-0 z-[500] flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm px-0 sm:px-4',
    sheet:   isDark
      ? 'bg-[#0d1117] border-[#1e2538]'
      : 'bg-white border-[#E5E7EB]',
    header:  isDark ? 'border-[#1e2538]' : 'border-[#E5E7EB]',
    title:   isDark ? 'text-white' : 'text-[#0f172a]',
    muted:   isDark ? 'text-slate-400' : 'text-slate-500',
    footer:  isDark ? 'border-[#1e2538]' : 'border-[#E5E7EB]',
    back:    isDark ? 'bg-[#111827] border-[#1D2939] text-white hover:bg-[#1a2235]' : 'bg-gray-100 border-gray-200 text-[#0f172a]',
    next:    canGoNext
      ? 'bg-indigo-600 hover:bg-indigo-700 text-white'
      : (isDark ? 'bg-[#1e2538] text-slate-500 cursor-not-allowed' : 'bg-gray-200 text-gray-400 cursor-not-allowed'),
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className={T.overlay}
        onClick={tryClose}
      >
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 340, damping: 30 }}
          onClick={e => e.stopPropagation()}
          role="dialog"
          aria-modal="true"
          aria-label={showPreview ? 'Test Preview' : `Create Your Own Test — Step ${state.step} of 5`}
          className={`w-full sm:max-w-lg rounded-t-3xl sm:rounded-3xl border shadow-2xl flex flex-col ${T.sheet}`}
          style={{ maxHeight: '90vh' }}
        >
          {/* Header */}
          <div className={`flex items-center justify-between px-5 pt-5 pb-4 border-b flex-shrink-0 ${T.header}`}>
            <div className="flex-1 min-w-0 mr-4">
              <h2 className={`text-base font-bold ${T.title}`}>
                {showPreview ? 'Test Preview' : 'Create Your Own Test'}
              </h2>
              {!showPreview && (
                <div className="mt-2.5">
                  <div className="flex items-center justify-between mb-1.5">
                    <ProgressBar step={state.step} isDark={isDark} />
                    <span className={`text-xs ml-3 flex-shrink-0 ${T.muted}`}>
                      Step {state.step}/5
                    </span>
                  </div>
                </div>
              )}
            </div>
            <button
              onClick={tryClose}
              aria-label="Close wizard"
              className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 transition-colors ${
                isDark ? 'bg-[#1e2538] text-slate-300 hover:bg-[#2a3548]' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              <X size={15} />
            </button>
          </div>

          {/* Body */}
          <div className="flex-1 overflow-y-auto" style={{ scrollbarWidth: 'none' }}>
            <AnimatePresence mode="wait">
              {showPreview ? (
                <motion.div key="preview" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                  <TestPreview
                    isDark={isDark}
                    config={state.config}
                    creating={creating}
                    onStart={handleStart}
                    onEdit={() => setShowPreview(false)}
                  />
                </motion.div>
              ) : (
                <motion.div key={state.step} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}>
                  {state.step === 1 && <Step1Exam  isDark={isDark} value={state.config.examId}     onChange={setExam}     />}
                  {state.step === 2 && <Step2Years  isDark={isDark} value={state.config.years}      onChange={setYears}    />}
                  {state.step === 3 && <Step3Subjects isDark={isDark} value={state.config.subjects} onChange={setSubjects} config={state.config} />}
                  {state.step === 4 && <Step4Chapters isDark={isDark} value={state.config.chapters} onChange={setChapters} config={state.config} />}
                  {state.step === 5 && <Step5Duration isDark={isDark} value={state.config.durationSeconds} onChange={setDuration} />}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Footer */}
          {!showPreview && (
            <div className={`flex gap-3 px-5 py-4 border-t flex-shrink-0 ${T.footer}`}>
              <button
                onClick={handleBack}
                disabled={state.step === 1}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-30 ${T.back}`}
              >
                <ChevronLeft size={15} />
                Back
              </button>
              <button
                onClick={handleNext}
                disabled={!canGoNext}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-sm font-bold transition-colors ${T.next}`}
              >
                {isLastStep ? 'See Test Preview' : 'Next'}
                {!isLastStep && <ChevronRight size={15} />}
              </button>
            </div>
          )}
        </motion.div>
      </motion.div>

      {/* Discard confirmation */}
      <AnimatePresence>
        {showDiscard && (
          <DiscardDialog isDark={isDark} onConfirm={handleConfirmDiscard} onCancel={() => setShowDiscard(false)} />
        )}
      </AnimatePresence>
    </>
  )
}
