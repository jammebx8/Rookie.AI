'use client'
import React, { useEffect, useState } from 'react'
import { Check } from 'lucide-react'
import { Chip, Skeleton } from '@/components/rookie/ui'
import { supabase } from '../../../public/src/utils/supabase'
import type { YearRow } from '../types'

interface Props {
  isDark?:  boolean
  value:    string[]
  onChange: (years: string[]) => void
}

export function Step2Years({ value, onChange }: Props) {
  const [years, setYears]   = useState<YearRow[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.rpc('get_test_years').then(({ data }) => {
      setYears((data ?? []) as YearRow[])
      setLoading(false)
    })
  }, [])

  const toggle = (y: string) => {
    onChange(value.includes(y) ? value.filter(v => v !== y) : [...value, y])
  }
  const allSelected = years.length > 0 && value.length === years.length
  const toggleAll   = () => onChange(allSelected ? [] : years.map(y => y.year))

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className="text-title font-semibold tracking-[-0.015em] text-foreground">Which years?</p>
          <p className="mt-1 text-body-sm text-muted-foreground">Pick one or more.</p>
        </div>
        <Chip onClick={toggleAll} disabled={years.length === 0}>
          {allSelected ? 'Clear all' : 'Select all'}
        </Chip>
      </div>

      {loading ? (
        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-14" />)}
        </div>
      ) : years.length === 0 ? (
        <p className="mt-5 text-body-sm text-muted-foreground">No year data available.</p>
      ) : (
        <div className="mt-5 grid grid-cols-3 gap-2 sm:grid-cols-4">
          {years.map(y => {
            const active = value.includes(y.year)
            return (
              <Chip
                key={y.year}
                active={active}
                role="checkbox"
                aria-checked={active}
                onClick={() => toggle(y.year)}
                className="h-auto flex-col items-start gap-0 px-3 py-2.5 text-left"
              >
                <span className="flex w-full items-center justify-between text-body font-semibold">
                  {y.year}
                  {active && <Check className="size-3.5" strokeWidth={2.5} />}
                </span>
                <span className="text-caption font-normal opacity-80">{y.questionCount} Qs</span>
              </Chip>
            )
          })}
        </div>
      )}

      {value.length > 0 && (
        <p className="mt-4 text-meta text-muted-foreground">
          {value.length} year{value.length > 1 ? 's' : ''} selected
        </p>
      )}
    </div>
  )
}
