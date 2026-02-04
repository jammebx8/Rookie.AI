'use client'

import { Suspense } from 'react'
import QuestionViewerClient from './QuestionViewerClient'

export default function QuestionViewerPage() {
  return (
    <Suspense fallback={<div className="p-6">Loading question…</div>}>
      <QuestionViewerClient />
    </Suspense>
  )
}
