'use client'
// ─── features/tests/SubmitDialog.tsx ─────────────────────────────────────────

import React from 'react'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Define } from '@/components/rookie/define'

interface Props {
  isDark?:     boolean
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

export function SubmitDialog({ open, submitting, onConfirm, onCancel, stats }: Props) {
  const cancelRef = React.useRef<HTMLButtonElement>(null)
  const cells = stats ? [
    { label: 'Answered', value: stats.answered,    text: 'Questions with an answer, including marked & answered.', cls: 'text-primary' },
    { label: 'Skipped',  value: stats.unattempted, text: 'Questions with no answer. They score 0.',                cls: 'text-muted-foreground' },
    { label: 'Total',    value: stats.total,       text: 'All questions in this test.',                            cls: 'text-foreground' },
  ] : []

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onCancel() }}>
      <DialogContent
        role="alertdialog"
        aria-label="Confirm test submission"
        showCloseButton={false}
        initialFocus={cancelRef}
        className="gap-0 rounded-card p-6 sm:max-w-[420px]"
      >
        <DialogTitle className="text-heading font-semibold tracking-[-0.02em]">Submit test?</DialogTitle>
        <DialogDescription className="mt-1.5 text-body-sm">
          Once you submit, you can&apos;t change any answer.
        </DialogDescription>

        {stats && (
          <div className="mt-5 grid grid-cols-3 gap-2">
            {cells.map(c => (
              <div key={c.label} className="rounded-control bg-muted px-3 py-3">
                <p className={`text-heading font-bold leading-none tracking-[-0.03em] tabular-nums ${c.cls}`}>{c.value}</p>
                <p className="mt-1.5 text-meta font-medium text-muted-foreground">
                  <Define text={c.text}>{c.label}</Define>
                </p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-6 flex gap-2">
          <Button ref={cancelRef} variant="ghost" onClick={onCancel} disabled={submitting} className="h-10 flex-1 rounded-control">
            Keep going
          </Button>
          <Button onClick={onConfirm} disabled={submitting} className="h-10 flex-1 rounded-control text-body-sm">
            {submitting ? <><Loader2 className="animate-spin" /> Submitting…</> : 'Submit'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
