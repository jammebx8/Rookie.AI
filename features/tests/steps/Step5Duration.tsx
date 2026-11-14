'use client'
import React from 'react'
import { Clock } from 'lucide-react'
import { Chip } from '@/components/rookie/ui'
import { DURATION_OPTIONS } from '../types'

interface Props {
  isDark?:  boolean
  value:    number | null
  onChange: (seconds: number) => void
}

export function Step5Duration({ value, onChange }: Props) {
  return (
    <div>
      <p className="text-title font-semibold tracking-[-0.015em] text-foreground">How long?</p>
      <p className="mt-1 text-body-sm text-muted-foreground">About one question every 90 seconds.</p>

      <div role="radiogroup" aria-label="Duration" className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-3">
        {DURATION_OPTIONS.map(opt => {
          const active = value === opt.seconds
          return (
            <Chip
              key={opt.seconds}
              active={active}
              role="radio"
              aria-checked={active}
              onClick={() => onChange(opt.seconds)}
              className="h-auto flex-col items-start gap-0.5 px-4 py-3 text-left"
            >
              <span className="flex items-center gap-1.5 text-body font-semibold">
                <Clock className="size-3.5" /> {opt.label}
              </span>
              <span className="text-caption font-normal opacity-80">~{opt.approxQuestions} Qs</span>
            </Chip>
          )
        })}
      </div>

      {value && (
        <p className="mt-4 text-meta text-muted-foreground">
          1 question per 90 seconds, balanced across your subjects. Max 120 questions per test.
        </p>
      )}
    </div>
  )
}
