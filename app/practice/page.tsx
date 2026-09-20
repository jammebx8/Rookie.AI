'use client'

import { Suspense } from 'react'
import PracticeClient from './PracticeClient'

export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#07090f]">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-2 border-white border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-sm">Loading practice session…</p>
          </div>
        </div>
      }
    >
      <PracticeClient />
    </Suspense>
  )
}
