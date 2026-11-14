'use client'
// ─── features/tests/TestHeader.tsx ───────────────────────────────────────────

import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Clock, Send } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Define } from '@/components/rookie/define'
import { cn } from '@/lib/utils'

interface Props {
  title:          string
  expiresAt:      string | null   // ISO string — server deadline
  durationSeconds:number
  isDark?:        boolean
  /** Optional slot shown before the timer (e.g. mobile palette button). */
  left?:          React.ReactNode
  onSubmit:       () => void
}

function pad(n: number) { return String(n).padStart(2, '0') }

export function TestHeader({ title, expiresAt, durationSeconds, onSubmit, left }: Props) {
  const [remaining, setRemaining] = useState<number>(durationSeconds)
  const announcedRef              = useRef<Set<number>>(new Set())
  const autoSubmittedRef          = useRef(false)

  // Compute remaining from server deadline so a page refresh doesn't reset it
  useEffect(() => {
    const tick = () => {
      if (expiresAt) {
        const diff = Math.max(0, Math.round((new Date(expiresAt).getTime() - Date.now()) / 1000))
        setRemaining(diff)
        if (diff === 0 && !autoSubmittedRef.current) {
          autoSubmittedRef.current = true
          onSubmit()
        }
      }
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [expiresAt, onSubmit])

  // ARIA live announcements at 5 min and 1 min (once each)
  useEffect(() => {
    if (remaining === 300 && !announcedRef.current.has(300)) {
      announcedRef.current.add(300)
    }
    if (remaining === 60 && !announcedRef.current.has(60)) {
      announcedRef.current.add(60)
    }
  }, [remaining])

  const h   = Math.floor(remaining / 3600)
  const m   = Math.floor((remaining % 3600) / 60)
  const s   = remaining % 60
  const isLow = remaining <= 300   // last 5 minutes

  return (
    <header className="sticky top-0 z-30 shrink-0 bg-background/90 px-4 backdrop-blur-md md:px-6">
      <div className="mx-auto flex h-14 w-full max-w-content items-center justify-between gap-3">
        {/* Title */}
        <div className="flex min-w-0 items-center gap-2">
          {left}
          <span className="truncate text-body font-semibold tracking-[-0.01em] text-foreground">{title}</span>
        </div>

        {/* Timer + Submit */}
        <div className="flex shrink-0 items-center gap-2">
          <motion.div
            role="timer"
            aria-label={`Time remaining: ${h > 0 ? `${h} hours ` : ''}${m} minutes ${s} seconds`}
            aria-live="off"
            className={cn(
              'flex h-9 items-center gap-1.5 rounded-control px-3 text-body font-semibold tabular-nums transition-colors',
              isLow
                ? 'bg-[#fdecea] text-[#b2382d] dark:bg-[rgba(255,122,102,.14)] dark:text-[#ff9c8c]'
                : 'bg-muted text-foreground',
            )}
            animate={isLow && remaining % 2 === 0 ? { opacity: 0.7 } : { opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <Define text="Time left. The test submits when this reaches zero. Turns red in the last 5 minutes." side="bottom">
              <Clock className="size-4 opacity-70" aria-hidden />
            </Define>
            <span>
              {h > 0 && <>{pad(h)}<span className="opacity-40">:</span></>}
              {pad(m)}<span className="opacity-40">:</span>{pad(s)}
            </span>
          </motion.div>

          {/* Hidden aria-live region for 5min/1min announcements */}
          <span aria-live="assertive" className="sr-only">
            {remaining === 300 ? 'Five minutes remaining' : remaining === 60 ? 'One minute remaining' : ''}
          </span>

          <Button onClick={onSubmit} aria-label="Submit test" className="h-9 rounded-control px-4 text-body-sm">
            <Send className="hidden sm:block" /> Submit
          </Button>
        </div>
      </div>
    </header>
  )
}
