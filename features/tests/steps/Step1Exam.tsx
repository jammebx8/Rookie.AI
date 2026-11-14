'use client'

import React from 'react'
import { Lock } from 'lucide-react'
import { OmrOption, Tag } from '@/components/rookie/ui'
import { EXAM_OPTIONS } from '../types'
import type { TestConfig } from '../types'

interface Props {
  isDark?: boolean
  value: TestConfig['examId']
  onChange: (id: TestConfig['examId']) => void
}

const LETTERS = ['A', 'B', 'C', 'D', 'E']

export function Step1Exam({ value, onChange }: Props) {
  return (
    <div>
      <p className="text-title font-semibold tracking-[-0.015em] text-foreground">Which exam?</p>
      <p className="mt-1 text-body-sm text-muted-foreground">Pick the paper you&apos;re preparing for.</p>

      <div role="radiogroup" aria-label="Exam" className="mt-5 flex flex-col gap-2">
        {EXAM_OPTIONS.map((exam, i) => {
          const active = value === exam.id
          return (
            <OmrOption
              key={exam.id}
              letter={LETTERS[i]}
              state={active ? 'selected' : 'idle'}
              disabled={!exam.available}
              onClick={() => exam.available && onChange(exam.id)}
              className={!exam.available ? 'opacity-60' : undefined}
            >
              <span className="flex items-center justify-between gap-3">
                <span className="min-w-0">
                  <span className="block font-semibold">{exam.label}</span>
                  <span className="block truncate text-meta font-normal text-muted-foreground">{exam.description}</span>
                </span>
                {!exam.available && (
                  <Tag className="shrink-0"><Lock className="size-3" /> Soon</Tag>
                )}
              </span>
            </OmrOption>
          )
        })}
      </div>

      <p className="mt-4 text-meta text-muted-foreground">
        JEE Main and JEE Advanced are live. NEET is coming soon.
      </p>
    </div>
  )
}
