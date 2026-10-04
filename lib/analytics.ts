/**
 * lib/analytics.ts
 * ─────────────────
 * Fire-and-forget analytics event logger for Rookie.AI.
 *
 * Writes to public.analytics_events in Supabase.
 * All calls are non-blocking — a failure never breaks the UI.
 *
 * Usage:
 *   import { track } from '@/lib/analytics'
 *   track('question_answered', { question_id: q.question_id, feature: 'practice', subject: 'Physics' })
 */

import { supabase } from '../public/src/utils/supabase'

// ─── Types ────────────────────────────────────────────────────────────────────

export type EventName =
  | 'session_started'
  | 'session_ended'
  | 'question_opened'
  | 'question_attempted'
  | 'question_answered'
  | 'question_skipped'
  | 'question_correct'
  | 'question_incorrect'
  | 'solution_viewed'
  | 'solution_read'
  | 'similar_shown'
  | 'similar_attempted'
  | 'recommendation_shown'
  | 'recommendation_attempted'
  | 'test_created'
  | 'test_started'
  | 'test_completed'
  | 'test_abandoned'
  // catch-all for future events
  | (string & Record<never, never>)

export type Feature =
  | 'practice'
  | 'question_viewer'
  | 'custom_test'
  | 'recommendation'
  | 'similar'
  | 'home'

export interface TrackPayload {
  question_id?:  string
  test_id?:      string
  feature?:      Feature | string
  subject?:      string
  chapter?:      string
  difficulty?:   number
  /** Milliseconds — e.g. time spent reading a solution */
  duration_ms?:  number
  metadata?:     Record<string, unknown>
}

// ─── Session ID ───────────────────────────────────────────────────────────────
// One random ID per browser tab session, generated once and reused.

let _sessionId: string | null = null
function getSessionId(): string {
  if (_sessionId) return _sessionId
  try {
    const stored = sessionStorage.getItem('_rookie_session_id')
    if (stored) { _sessionId = stored; return stored }
    const id = crypto.randomUUID()
    sessionStorage.setItem('_rookie_session_id', id)
    _sessionId = id
    return id
  } catch {
    _sessionId = Math.random().toString(36).slice(2)
    return _sessionId
  }
}

// ─── User ID cache ────────────────────────────────────────────────────────────
let _userId: string | null = null
async function getUserId(): Promise<string | null> {
  if (_userId) return _userId
  try {
    const { data: { user } } = await supabase.auth.getUser()
    _userId = user?.id ?? null
    return _userId
  } catch {
    return null
  }
}

// Invalidate cache on auth state changes
supabase.auth.onAuthStateChange((_, session) => {
  _userId = session?.user?.id ?? null
})

// ─── Main track function ──────────────────────────────────────────────────────

export async function track(event: EventName, payload: TrackPayload = {}): Promise<void> {
  // Completely non-blocking — wrap everything and swallow errors
  try {
    const userId    = await getUserId()
    const sessionId = getSessionId()

    const { question_id, test_id, feature, subject, chapter, difficulty, duration_ms, metadata } = payload

    await supabase.from('analytics_events').insert({
      student_id:  userId,
      session_id:  sessionId,
      event_name:  event,
      question_id: question_id ?? null,
      test_id:     test_id     ?? null,
      feature:     feature     ?? null,
      subject:     subject     ?? null,
      chapter:     chapter     ?? null,
      difficulty:  difficulty  ?? null,
      duration_ms: duration_ms ?? null,
      metadata:    metadata    ?? null,
    })
  } catch {
    // Silently swallow — analytics must never break the product
  }
}

// ─── Solution read timer ──────────────────────────────────────────────────────
// Usage:
//   const timer = startSolutionTimer()
//   // when user navigates away / closes solution:
//   timer.stop({ question_id, feature, subject, chapter })

export function startSolutionTimer() {
  const openedAt = Date.now()
  return {
    stop(payload: Omit<TrackPayload, 'duration_ms'> = {}) {
      const duration_ms = Date.now() - openedAt
      // Only log if they spent at least 1 second (filters accidental opens)
      if (duration_ms >= 1000) {
        track('solution_read', { ...payload, duration_ms })
      }
    },
  }
}

// ─── Session lifecycle helpers ────────────────────────────────────────────────

/** Call once when the app mounts. */
export function trackSessionStart(feature?: Feature | string): void {
  track('session_started', { feature })
}

/** Wire to beforeunload or component unmount. */
export function trackSessionEnd(feature?: Feature | string): void {
  // Use sendBeacon when available so it fires even on tab close
  try {
    const payload = JSON.stringify({
      event_name: 'session_ended',
      session_id: getSessionId(),
      feature:    feature ?? null,
    })
    if (navigator.sendBeacon) {
      navigator.sendBeacon('/api/analytics/beacon', payload)
    } else {
      track('session_ended', { feature })
    }
  } catch {
    // swallow
  }
}
