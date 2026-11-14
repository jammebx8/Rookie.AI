'use client'
// ─── features/tests/QuestionPanel.tsx ────────────────────────────────────────

import React, { useState } from 'react'
import { ArrowLeft, ArrowRight, Bookmark, BookmarkCheck, Eraser, ZoomIn } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Card, Meta, OmrOption, Tag } from '@/components/rookie/ui'
import { useIsDark } from '@/components/rookie/theme'
import { cn } from '@/lib/utils'
import { renderContent } from '../../app/components/renderContent'
import type { TestQuestion, QuestionStatus, AnswerEntry } from './types'

interface Props {
  isDark?:      boolean
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
  /** Rendered in the middle of the footer (e.g. mobile palette button). */
  footerSlot?:  React.ReactNode
}

const OPTION_KEYS = ['a', 'b', 'c', 'd'] as const
const OPTION_LABELS = ['A', 'B', 'C', 'D']

function ImageModal({ src, onClose }: { src: string | null; onClose: () => void }) {
  return (
    <Dialog open={!!src} onOpenChange={o => { if (!o) onClose() }}>
      <DialogContent className="rounded-card p-3 sm:max-w-3xl">
        <DialogTitle className="sr-only">Image</DialogTitle>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {src && <img src={src} alt="Question" className="max-h-[78vh] w-full rounded-control object-contain" />}
      </DialogContent>
    </Dialog>
  )
}

export function QuestionPanel({
  question, index, total, entry, status,
  onSelect, onClear, onMark, onPrev, onNext, footerSlot,
}: Props) {
  const isDark = useIsDark()
  const [imgModal, setImgModal] = useState<string | null>(null)

  const selected   = entry?.selected_option ?? null
  const isMarked   = status === 'marked' || status === 'marked_answered'

  const optionText = (key: typeof OPTION_KEYS[number]): string | null =>
    question[`option_${key}` as keyof TestQuestion] as string | null
  const optionImg = (key: typeof OPTION_KEYS[number]): string | null =>
    question[`option_${key}_img` as keyof TestQuestion] as string | null

  const hasOptions = OPTION_KEYS.some(k => optionText(k) || optionImg(k))

  return (
    <div className="flex h-full min-h-0 flex-col">
      {/* Scrollable question area */}
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-6 pb-8 md:px-6">
        <div className="mx-auto w-full max-w-focus">
          {/* Meta row */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-title font-semibold tracking-[-0.015em] text-foreground tabular-nums">
                Question {index + 1}<span className="text-muted-foreground">/{total}</span>
              </span>
              {question.subject && <Tag>{question.subject}</Tag>}
              {isMarked && (
                <Tag className="bg-[var(--rk-marigold-100)] text-[var(--rk-marigold-800)] dark:bg-[rgba(253,186,18,.16)] dark:text-[var(--rk-marigold-200)]">
                  Marked
                </Tag>
              )}
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="ghost"
                onClick={onMark}
                aria-label={isMarked ? 'Unmark question' : 'Mark for review'}
                className={cn('h-9 rounded-control px-3', isMarked && 'text-[var(--rk-marigold-700)] dark:text-[var(--rk-marigold-300)]')}
              >
                {isMarked ? <BookmarkCheck /> : <Bookmark />}
                {isMarked ? 'Unmark' : 'Mark for review'}
              </Button>
              <Button
                variant="ghost"
                onClick={onClear}
                disabled={!selected}
                aria-label="Clear selection"
                className="h-9 rounded-control px-3"
              >
                <Eraser /> Clear
              </Button>
            </div>
          </div>

          {/* Question body */}
          <Card className="mt-4 hover:shadow-none">
            {question.question_img_url && (
              <button
                type="button"
                className="group relative mb-4 block w-full cursor-zoom-in"
                onClick={() => setImgModal(question.question_img_url!)}
                aria-label="Zoom question image"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={question.question_img_url}
                  alt="Question"
                  className="max-h-60 w-full rounded-control object-contain"
                />
                <span className="absolute inset-0 grid place-items-center rounded-control bg-black/25 opacity-0 transition-opacity group-hover:opacity-100">
                  <ZoomIn className="size-6 text-white" />
                </span>
              </button>
            )}
            <div className="text-body leading-relaxed text-foreground">
              {renderContent(question.question_text, isDark)}
            </div>
          </Card>

          {/* Options — MCQ */}
          {hasOptions && (
            <div role="radiogroup" aria-label="Answer options" className="mt-4 flex flex-col gap-2">
              {OPTION_KEYS.map((key, i) => {
                const text = optionText(key)
                const img  = optionImg(key)
                if (!text && !img) return null
                const isSelected = selected === key
                return (
                  <OmrOption
                    key={key}
                    letter={OPTION_LABELS[i]}
                    state={isSelected ? 'selected' : 'idle'}
                    onClick={() => onSelect(key)}
                    className={cn('items-start py-3.5 [&>span:first-child]:mt-0.5', !isSelected && 'bg-card ring-black/[.05] dark:ring-white/[.06]')}
                  >
                    {img && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img} alt={`Option ${OPTION_LABELS[i]}`}
                        className="mb-1.5 max-h-28 cursor-zoom-in rounded-control object-contain"
                        onClick={e => { e.stopPropagation(); setImgModal(img) }}
                      />
                    )}
                    {text && (
                      <span className="block text-body leading-relaxed font-normal">
                        {renderContent(text, isDark)}
                      </span>
                    )}
                  </OmrOption>
                )
              })}
            </div>
          )}

          {/* Numerical input */}
          {question.is_numerical && (
            <Card className="mt-4 hover:shadow-none">
              <Meta>Type your integer / numeric answer</Meta>
              <Input
                type="number"
                value={selected ?? ''}
                onChange={e => onSelect(e.target.value)}
                placeholder="Your answer"
                className="mt-3 h-12 rounded-control px-4 text-title tabular-nums md:text-title"
              />
            </Card>
          )}

          <p className="mt-6 hidden text-center text-caption text-muted-foreground md:block">
            Tip: press 1–4 or A–D to answer, ← → to move.
          </p>
        </div>
      </div>

      {/* Footer nav — pinned at the bottom of the column */}
      <div
        className="shrink-0 bg-background/90 px-4 py-3 backdrop-blur-md md:px-6"
        style={{ paddingBottom: 'calc(0.75rem + env(safe-area-inset-bottom))' }}
      >
        <div className="mx-auto flex w-full max-w-focus items-center justify-between gap-3">
          <Button
            variant="ghost"
            onClick={onPrev}
            disabled={index === 0}
            aria-label="Previous question"
            className="h-10 rounded-control px-4"
          >
            <ArrowLeft /> <span className="hidden sm:inline">Previous</span>
          </Button>
          {footerSlot}
          <Button
            variant="secondary"
            onClick={onNext}
            disabled={index === total - 1}
            aria-label="Next question"
            className="h-10 rounded-control px-5"
          >
            Next <ArrowRight />
          </Button>
        </div>
      </div>

      <ImageModal src={imgModal} onClose={() => setImgModal(null)} />
    </div>
  )
}
