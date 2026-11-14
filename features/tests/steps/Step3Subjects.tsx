'use client'
import React from 'react'
import { Atom, Check, FlaskConical, Leaf, Sigma } from 'lucide-react'
import { Chip } from '@/components/rookie/ui'
import { SUBJECTS_FOR_EXAM } from '../types'
import type { TestConfig } from '../types'

interface Props {
  isDark?:  boolean
  value:    string[]
  onChange: (subjects: string[]) => void
  config:   TestConfig
}

const SUBJECT_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Physics:   Atom,
  Chemistry: FlaskConical,
  Maths:     Sigma,
  Biology:   Leaf,
}

export function Step3Subjects({ value, onChange, config }: Props) {
  const subjects  = SUBJECTS_FOR_EXAM[config.examId ?? 'jee_main'] ?? ['Physics', 'Chemistry', 'Maths']
  const allSelected = value.length === subjects.length
  const toggleAll   = () => onChange(allSelected ? [] : [...subjects])
  const toggle      = (s: string) => onChange(value.includes(s) ? value.filter(v => v !== s) : [...value, s])

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-title font-semibold tracking-[-0.015em] text-foreground">Which subjects?</p>
          <p className="mt-1 text-body-sm text-muted-foreground">Questions are balanced across them.</p>
        </div>
        <Chip onClick={toggleAll}>{allSelected ? 'Clear all' : 'Select all'}</Chip>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3">
        {subjects.map(sub => {
          const active = value.includes(sub)
          const Icon = SUBJECT_ICONS[sub]
          return (
            <Chip
              key={sub}
              active={active}
              role="checkbox"
              aria-checked={active}
              onClick={() => toggle(sub)}
              className="h-12 justify-start gap-2.5 px-4 text-body"
            >
              {Icon && <Icon className="size-4" />}
              <span className="font-semibold">{sub}</span>
              {active && <Check className="ml-auto size-4" strokeWidth={2.5} />}
            </Chip>
          )
        })}
      </div>
    </div>
  )
}
