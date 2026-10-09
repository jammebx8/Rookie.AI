'use client'
// ─── features/tests/QuestionPanel.tsx ────────────────────────────────────────

import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { BookmarkCheck, BookmarkX, RotateCcw, ZoomIn, X } from 'lucide-react'
import { renderContent } from '../../app/components/renderContent'
import type { TestQuestion, QuestionStatus, AnswerEntry } from './types'

interface Props {
  isDark:       boolean
  question:     TestQuestion
  index:        number
  total:        number
  entry:        AnswerEntry | undefined
  status:       QuestionStatus
  onSelect:     (option: string) => void
  onClear:      () => void
  onMark:       () => void
  onPrev:       () => void
  onNext:       () => void
}

const OPTION_KEYS = ['a', 'b', 'c', 'd'] as const
const OPTION_LABELS = ['A', 'B', 'C', 'D']

function ImageModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.86 }} animate={{ scale: 1 }}
        onClick={e => e.stopPropagation()}
        className="relative max-w-2xl w-full"
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center shadow-lg"
          aria-label="Close image"
        >
          <X size={14} />
        </button>
        <img src={src} alt="Question" className="rounded-2xl object-contain max-h-[72vh] w-full shadow-2xl border border-white/10" />
      </motion.div>
    </motion.div>
  )
}

export function QuestionPanel({
  isDark, question, index, total, entry, status,
  onSelect, onClear, onMark, onPrev, onNext,
}: Props) {
  const [imgModal, setImgModal] = useState<string | null>(null)

  const selected   = entry?.selected_option ?? null
  const isMarked   = status === 'marked' || status === 'marked_answered'

  const T = {
    page:      isDark ? 'bg-[#07090f]' : 'bg-[#F0F2FA]',
    card:      isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]',
    text:      isDark ? 'text-white' : 'text-[#0f172a]',
    muted:     isDark ? 'text-slate-400' : 'text-slate-500',
    label:     isDark ? 'bg-[#151B27] border-[#262F4C] text-slate-200' : 'bg-[#F3F4F6] border-[#D1D5DB] text-[#374151]',
    optIdle:   isDark ? 'bg-[#0d1117] border-[#1e2538] hover:border-white text-white' : 'bg-white border-[#E5E7EB] hover:border-black text-[#0f172a]',
    optActive: 'bg-indigo-950/60 border-indigo-500 ring-1 ring-indigo-500/40 text-white',
    optActiveLight: 'bg-indigo-50 border-indigo-500 text-indigo-900',
    markBtn:   isMarked
      ? 'bg-violet-600 hover:bg-violet-700 text-white'
      : (isDark ? 'bg-[#0d1117] border-[#1e2538] text-slate-300 hover:border-violet-500 hover:text-violet-400' : 'bg-white border-[#E5E7EB] text-gray-600 hover:border-violet-400 hover:text-violet-600'),
    clearBtn:  isDark ? 'bg-[#0d1117] border-[#1e2538] text-slate-400 hover:text-white' : 'bg-white border-[#E5E7EB] text-gray-500 hover:text-gray-800',
    footer:    isDark ? 'bg-[#07090f]/95 border-[#1e2538]' : 'bg-white/95 border-[#E5E7EB]',
    navBtn:    isDark ? 'bg-[#0d1117] border-[#1e2538] text-white hover:bg-[#151e2e]' : 'bg-white border-[#E5E7EB] text-[#0f172a] hover:bg-gray-50',
    nextBtn:    isDark
                ? 'bg-white text-black hover:bg-gray-100'
                : 'bg-[#0f172a] text-white hover:bg-[#1e293b]',
  }

  const optionText = (key: typeof OPTION_KEYS[number]): string | null =>
    question[`option_${key}` as keyof TestQuestion] as string | null
  const optionImg = (key: typeof OPTION_KEYS[number]): string | null =>
    question[`option_${key}_img` as keyof TestQuestion] as string | null

  const hasOptions = OPTION_KEYS.some(k => optionText(k) || optionImg(k))

  return (
    <div className={`flex flex-col h-[calc(100vh-56px)] ${T.page}`}>
      {/* Subject chip row */}
      <div className="px-4 sm:px-6 pt-4 pb-0">
        {question.subject && (
          <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full border ${
            isDark ? 'bg-indigo-950/40 border-indigo-800 text-indigo-300' : 'bg-indigo-50 border-indigo-200 text-indigo-700'
          }`}>
            {question.subject}
          </span>
        )}
      </div>

      {/* Main scrollable area — flex-1 + min-h-0 so it never pushes the footer */}
      <div className="flex-1 min-h-0 overflow-y-auto px-4 sm:px-6 pt-4 pb-6" style={{ scrollbarWidth: 'none' }}>

        {/* Question label + controls */}
        <div className="flex items-start justify-between gap-3 mb-4">
          <span className={`text-xs font-bold uppercase tracking-widest ${T.muted}`}>
            Question {index + 1}/{total}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onMark}
              aria-label={isMarked ? 'Unmark question' : 'Mark for review'}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all ${T.markBtn}`}
            >
              {isMarked ? <BookmarkCheck size={13} /> : <BookmarkX size={13} />}
              {isMarked ? 'Unmark' : 'Mark for Review'}
            </button>
            <button
              onClick={onClear}
              disabled={!selected}
              aria-label="Clear selection"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition-all disabled:opacity-30 ${T.clearBtn}`}
            >
              <RotateCcw size={12} />
              Clear
            </button>
          </div>
        </div>

        {/* Question body */}
        <div className={`rounded-2xl border p-4 sm:p-5 mb-5 ${T.card}`}>
          {/* Question image */}
          {question.question_img_url && (
            <div className="relative mb-4 group cursor-zoom-in" onClick={() => setImgModal(question.question_img_url!)}>
              <img
                src={question.question_img_url}
                alt="Question"
                className="w-full rounded-xl object-contain max-h-56 border border-white/10"
              />
              <div className="absolute inset-0 rounded-xl flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/30 transition-opacity">
                <ZoomIn size={22} className="text-white" />
              </div>
            </div>
          )}
          <div className={`text-sm leading-relaxed ${T.text}`}>
            {renderContent(question.question_text, isDark)}
          </div>
        </div>

        {/* Options — MCQ */}
        {hasOptions && (
          <div role="radiogroup" aria-label="Answer options" className="space-y-2.5">
            {OPTION_KEYS.map((key, i) => {
              const text = optionText(key)
              const img  = optionImg(key)
              if (!text && !img) return null
              const isSelected = selected === key
              const activeClass = isDark ? T.optActive : T.optActiveLight
              return (
                <motion.div
                  key={key}
                  whileTap={{ scale: 0.995 }}
                  onClick={() => onSelect(key)}
                  role="radio"
                  aria-checked={isSelected}
                  tabIndex={0}
                  onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') onSelect(key) }}
                  className={`flex items-start gap-3 px-4 py-3.5 rounded-xl border cursor-pointer transition-all duration-150 ${
                    isSelected ? activeClass : T.optIdle
                  }`}
                >
                  {/* Option label bubble */}
                  <span className={`flex-shrink-0 w-6 h-6 rounded-md border flex items-center justify-center text-xs font-bold transition-all ${
                    isSelected
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : T.label
                  }`}>
                    {OPTION_LABELS[i]}
                  </span>
                  <div className="flex-1 min-w-0">
                    {img && (
                      <img
                        src={img} alt={`Option ${OPTION_LABELS[i]}`}
                        className="mb-1.5 rounded-lg object-contain max-h-28 cursor-zoom-in"
                        onClick={e => { e.stopPropagation(); setImgModal(img) }}
                      />
                    )}
                    {text && (
                      <span className="text-sm leading-relaxed">
                        {renderContent(text, isDark)}
                      </span>
                    )}
                  </div>
                </motion.div>
              )
            })}
          </div>
        )}

        {/* Numerical input */}
        {question.is_numerical && (
          <div className={`rounded-2xl border p-4 space-y-3 ${T.card}`}>
            <p className={`text-xs font-medium ${T.muted}`}>Enter your integer / numeric answer:</p>
            <input
              type="number"
              value={selected ?? ''}
              onChange={e => onSelect(e.target.value)}
              placeholder="Type your answer…"
              className={`w-full border rounded-xl px-4 py-3 text-base outline-none transition-colors ${
                isDark
                  ? 'bg-[#07090f] border-[#1e2538] text-white placeholder-gray-600 focus:border-indigo-500'
                  : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400 focus:border-indigo-400'
              }`}
            />
          </div>
        )}
      </div>

      {/* Footer nav — always pinned at bottom of the fixed-height column */}
      <div className={`flex-shrink-0 border-t px-4 sm:px-6 py-3 flex items-center justify-between gap-3 ${T.footer}`}
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <button
          onClick={onPrev}
          disabled={index === 0}
          aria-label="Previous question"
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl border text-sm font-semibold transition-all disabled:opacity-30 ${T.navBtn}`}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M19 12H5M12 5l-7 7 7 7"/>
          </svg>
          Previous
        </button>
        <button
          onClick={onNext}
          disabled={index === total - 1}
          aria-label="Next question"
          className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-sm font-bold transition-all disabled:opacity-30 ${T.nextBtn}`}
        >
          Next
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7"/>
          </svg>
        </button>
      </div>

      {/* Image modal */}
      {imgModal && <ImageModal src={imgModal} onClose={() => setImgModal(null)} />}
    </div>
  )
}
