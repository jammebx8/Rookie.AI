import { Suspense } from 'react'
import QuestionViewerClient from './QuestionViewerClient'
import type { Metadata } from 'next'

// Dynamic metadata for SEO — question text goes in the title
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}): Promise<Metadata> {
  const params = await searchParams
  const chapter = typeof params.chapter === 'string' ? params.chapter : ''
  const subject = typeof params.subject === 'string' ? params.subject : ''
  const qText   = typeof params.q === 'string' ? params.q : ''

  const title = qText
    ? `${qText.slice(0, 100)}${qText.length > 100 ? '…' : ''} | JEE Mains Question`
    : chapter
      ? `${chapter} Questions — JEE Mains | Rookie.AI`
      : 'Practice Questions | Rookie.AI'

  const description = qText
    ? `Solve and understand: "${qText.slice(0, 150)}" — JEE Mains ${subject} practice with AI-powered explanations on Rookie.AI`
    : `Practice JEE Mains ${subject} — ${chapter} questions with AI buddy explanations, step-by-step solutions, and streak tracking on Rookie.AI`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
    },
    // Canonical so each question gets a unique indexable URL
    alternates: {
      canonical: `/QuestionViewer?subject=${encodeURIComponent(subject)}&chapter=${encodeURIComponent(chapter)}${qText ? `&q=${encodeURIComponent(qText)}` : ''}`,
    },
  }
}

export default function QuestionViewerPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-[#07090f]">
          <div className="text-center">
            <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto mb-4" />
            <p className="text-slate-400 text-sm">Loading questions…</p>
          </div>
        </div>
      }
    >
      <QuestionViewerClient />
    </Suspense>
  )
}
