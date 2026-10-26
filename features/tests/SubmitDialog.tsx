'use client'
// ─── features/tests/SubmitDialog.tsx ─────────────────────────────────────────

import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertCircle } from 'lucide-react'

interface Props {
  isDark:      boolean
  open:        boolean
  submitting:  boolean
  onConfirm:   () => void
  onCancel:    () => void
  stats?: {
    answered:   number
    total:      number
    unattempted:number
  }
}

export function SubmitDialog({ isDark, open, submitting, onConfirm, onCancel, stats }: Props) {
  const T = {
    overlay: 'fixed inset-0 z-[400] flex items-center justify-center bg-black/70 backdrop-blur-sm px-4',
    card:    isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]',
    text:    isDark ? 'text-white' : 'text-[#0f172a]',
    muted:   isDark ? 'text-slate-400' : 'text-slate-500',
    cancel:  isDark
      ? 'bg-[#111827] border-[#1D2939] text-white hover:bg-[#1a2235]'
      : 'bg-gray-100 border-gray-200 text-[#0f172a] hover:bg-gray-200',
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className={T.overlay}
          onClick={onCancel}
        >
          <motion.div
            initial={{ scale: 0.88, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.88, opacity: 0 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            onClick={e => e.stopPropagation()}
            role="alertdialog"
            aria-modal="true"
            aria-label="Confirm test submission"
            className={`w-full max-w-sm rounded-2xl border p-6 shadow-2xl ${T.card}`}
          >
            {/* Icon */}
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-orange-500/15 mx-auto mb-4">
              <AlertCircle size={24} className="text-orange-500" />
            </div>

            {/* Copy */}
            <h2 className={`text-base font-bold text-center mb-2 ${T.text}`}>Submit Test</h2>
            <p className={`text-sm text-center mb-4 ${T.muted}`}>
              Are you sure you want to submit the test? Once submitted, you won&apos;t be able to make any changes.
            </p>

            {/* Stats summary */}
            {stats && (
              <div className={`rounded-xl p-3 mb-5 grid grid-cols-3 gap-2 text-center ${isDark ? 'bg-[#111827]' : 'bg-gray-50'}`}>
                <div>
                  <p className="text-lg font-extrabold text-emerald-500 tabular-nums">{stats.answered}</p>
                  <p className={`text-[10px] ${T.muted}`}>Answered</p>
                </div>
                <div>
                  <p className={`text-lg font-extrabold tabular-nums ${isDark ? 'text-slate-400' : 'text-gray-400'}`}>{stats.unattempted}</p>
                  <p className={`text-[10px] ${T.muted}`}>Skipped</p>
                </div>
                <div>
                  <p className={`text-lg font-extrabold tabular-nums ${T.text}`}>{stats.total}</p>
                  <p className={`text-[10px] ${T.muted}`}>Total</p>
                </div>
              </div>
            )}

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={onCancel}
                disabled={submitting}
                className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-colors disabled:opacity-50 ${T.cancel}`}
              >
                Cancel
              </button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onConfirm}
                disabled={submitting}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-rose-600 hover:bg-rose-700 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 0.7, repeat: Infinity, ease: 'linear' }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                    Submitting…
                  </>
                ) : 'Submit'}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
