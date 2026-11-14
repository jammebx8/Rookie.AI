'use client'

import { Suspense } from 'react'
import { Loader2 } from 'lucide-react'
import PracticeClient from '../practice/PracticeClient'

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-svh items-center justify-center bg-muted">
          <p className="flex items-center gap-2 text-body-sm text-muted-foreground">
            <Loader2 className="size-4 animate-spin" /> Loading practice session…
          </p>
        </div>
      }
    >
      <PracticeClient />
    </Suspense>
  )
}
