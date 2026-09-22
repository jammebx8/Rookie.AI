/**
 * lib/recommendation.ts
 *
 * Client-side helpers for the embedding-based recommendation system.
 *
 * Architecture overview
 * ─────────────────────
 * • Every question in jee_mains has a 384-dim embedding vector that encodes its
 *   topic (subject + chapter + question text).  These are generated server-side
 *   via the SQL migration (hash-based for instant cold-start, replaceable with
 *   real sentence-transformer embeddings for higher quality later).
 *
 * • After each attempt the Postgres function update_student_ability_vector()
 *   updates three running centroids for the student:
 *     ability_vector  — centroid of ALL attempted question embeddings
 *     wrong_vector    — centroid of WRONG-answer question embeddings  ← weak topics
 *     right_vector    — centroid of CORRECT-answer question embeddings
 *
 * • get_next_recommended_question() blends these as:
 *     query = 0.65 × wrong_vector + 0.35 × ability_vector
 *   and cosine-searches jee_mains for the closest unseen question, then
 *   randomly selects from the top-5 so the student doesn't see the same
 *   sequence every session.
 *
 * • This file provides:
 *   1. updateAbilityVector()   — call after every attempt (fire-and-forget)
 *   2. fetchRecommended()      — wraps the RPC with error handling + fallback
 *   3. getWeakTopics()         — returns the student's weakest chapters for UI
 *   4. cosineSimilarity()      — pure-JS similarity (used in tests / offline)
 *   5. AbilitySnapshot type    — the shape returned by getAbilitySnapshot()
 */

import { supabase } from '../public/src/utils/supabase'
import type { Question } from '../app/QuestionViewer/QuestionViewerClient'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AbilitySnapshot {
  totalAttempts:  number
  wrongAttempts:  number
  rightAttempts:  number
  accuracy:       number          // 0–1
  weakChapters:   WeakChapter[]   // ordered worst-first
  updatedAt:      string | null
}

export interface WeakChapter {
  chapter:  string
  subject:  string
  wrong:    number
  total:    number
  accuracy: number   // 0–1
}

// ─── 1. updateAbilityVector ───────────────────────────────────────────────────
/**
 * Fire-and-forget: tells Postgres to update the student's ability vector after
 * an attempt.  The heavy maths lives in the DB function so this is just one RPC.
 *
 * @param userId     Supabase auth UUID
 * @param questionId question_id string from jee_mains
 * @param correct    whether the student answered correctly
 */
export async function updateAbilityVector(
  userId:     string,
  questionId: string,
  correct:    boolean,
): Promise<void> {
  try {
    const { error } = await supabase.rpc('update_student_ability_vector', {
      p_user_id:     userId,
      p_question_id: questionId,
      p_correct:     correct,
    })
    if (error) {
      // Non-fatal: recommendation quality degrades gracefully if this fails
      console.warn('[recommendation] updateAbilityVector failed:', error.message)
    }
  } catch (err) {
    console.warn('[recommendation] updateAbilityVector exception:', err)
  }
}

// ─── 2. fetchRecommended ──────────────────────────────────────────────────────
/**
 * Fetch the next recommended question for a student.
 *
 * @param userId      Supabase auth UUID
 * @param excludeIds  question_ids to skip this session (already seen / answered)
 * @returns           A Question row or null if none available
 */
export async function fetchRecommended(
  userId:     string,
  excludeIds: string[] = [],
): Promise<Question | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_next_recommended_question', {
        p_user_id:              userId,
        p_exclude_question_ids: excludeIds,
      })
      .single()

    if (error) {
      console.warn('[recommendation] fetchRecommended RPC error:', error.message)
      return await fallbackRandom(userId, excludeIds)
    }

    return (data as Question) ?? null
  } catch (err) {
    console.warn('[recommendation] fetchRecommended exception:', err)
    return await fallbackRandom(userId, excludeIds)
  }
}

/**
 * Hard fallback: if the RPC fails entirely, just pull any unseen random question.
 * This keeps the practice session alive even if the recommendation system breaks.
 */
async function fallbackRandom(
  userId:     string,
  excludeIds: string[],
): Promise<Question | null> {
  try {
    // Get a list of already-attempted question ids
    const { data: attempted } = await supabase
      .from('attempts')
      .select('question_id')
      .eq('student_id', userId)

    const doneIds = [
      ...excludeIds,
      ...(attempted?.map((r: { question_id: string }) => r.question_id) ?? []),
    ]

    const { data } = await supabase
      .from('jee_mains')
      .select('id,question,question_id,question_text,option_a,option_b,option_c,option_d,correct_option,exam_shift,source_url,solution,question_img_url,solution_image_url,sol_ai,option_a_img,option_b_img,option_c_img,option_d_img,subject,chapter,buddy_jeetu,buddy_riya,buddy_rei,buddy_ritu,buddy_shreya,buddy_neha')
      .not('question_id', 'in', `(${doneIds.map(id => `"${id}"`).join(',')})`)
      .limit(50)

    if (!data || data.length === 0) return null

    // Pick a random one from the 50
    return data[Math.floor(Math.random() * data.length)] as Question
  } catch {
    return null
  }
}

// ─── 3. getWeakTopics ─────────────────────────────────────────────────────────
/**
 * Returns the student's weakest chapters derived from the attempts table.
 * Ordered by ascending accuracy (most wrong first).
 * Minimum 3 attempts per chapter to appear in the list.
 *
 * This is purely a read — no vector maths needed — so it's fast.
 */
export async function getWeakTopics(
  userId:   string,
  topN:     number = 3,
): Promise<WeakChapter[]> {
  try {
    // Fetch all attempts for this user with subject/chapter info
    const { data: attempts, error } = await supabase
      .from('attempts')
      .select('question_id, correct')
      .eq('student_id', userId)

    if (error || !attempts || attempts.length === 0) return []

    // Get the subject/chapter for each unique question_id
    const questionIds = [...new Set(attempts.map((a: { question_id: string }) => a.question_id))]

    const { data: questions } = await supabase
      .from('jee_mains')
      .select('question_id, subject, chapter')
      .in('question_id', questionIds)

    if (!questions) return []

    // Build a lookup: question_id → {subject, chapter}
    const qMap: Record<string, { subject: string; chapter: string }> = {}
    for (const q of questions as { question_id: string; subject: string; chapter: string }[]) {
      qMap[q.question_id] = { subject: q.subject ?? '', chapter: q.chapter ?? '' }
    }

    // Aggregate per (subject, chapter)
    const chapterStats: Record<string, { wrong: number; total: number; subject: string }> = {}

    for (const attempt of attempts as { question_id: string; correct: boolean }[]) {
      const info = qMap[attempt.question_id]
      if (!info || !info.chapter) continue

      const key = `${info.subject}::${info.chapter}`
      if (!chapterStats[key]) {
        chapterStats[key] = { wrong: 0, total: 0, subject: info.subject }
      }
      chapterStats[key].total += 1
      if (!attempt.correct) chapterStats[key].wrong += 1
    }

    // Convert to array, require minimum 3 attempts, sort by ascending accuracy
    const result: WeakChapter[] = Object.entries(chapterStats)
      .filter(([, s]) => s.total >= 3)
      .map(([key, s]) => {
        const chapter = key.split('::')[1]
        return {
          chapter,
          subject:  s.subject,
          wrong:    s.wrong,
          total:    s.total,
          accuracy: s.total > 0 ? (s.total - s.wrong) / s.total : 0,
        }
      })
      .sort((a, b) => a.accuracy - b.accuracy)   // worst first
      .slice(0, topN)

    return result
  } catch (err) {
    console.warn('[recommendation] getWeakTopics failed:', err)
    return []
  }
}

// ─── 4. getAbilitySnapshot ────────────────────────────────────────────────────
/**
 * Returns a summary of the student's current ability state.
 * Used by the home page to show personalised context alongside the recommended
 * question card.
 */
export async function getAbilitySnapshot(userId: string): Promise<AbilitySnapshot | null> {
  try {
    const [vectorResult, weakChapters] = await Promise.all([
      supabase
        .from('student_ability_vector')
        .select('total_attempts, wrong_attempts, right_attempts, updated_at')
        .eq('user_id', userId)
        .single(),
      getWeakTopics(userId, 3),
    ])

    const v = vectorResult.data
    if (!v) {
      return {
        totalAttempts: 0,
        wrongAttempts: 0,
        rightAttempts: 0,
        accuracy:      0,
        weakChapters:  [],
        updatedAt:     null,
      }
    }

    return {
      totalAttempts: v.total_attempts,
      wrongAttempts: v.wrong_attempts,
      rightAttempts: v.right_attempts,
      accuracy:
        v.total_attempts > 0
          ? v.right_attempts / v.total_attempts
          : 0,
      weakChapters,
      updatedAt: v.updated_at,
    }
  } catch (err) {
    console.warn('[recommendation] getAbilitySnapshot failed:', err)
    return null
  }
}

// ─── 5. cosineSimilarity ─────────────────────────────────────────────────────
/**
 * Pure-JS cosine similarity between two equal-length numeric arrays.
 * Returned value is in [-1, 1]; higher = more similar.
 * (The DB uses the <=> operator which is cosine *distance* = 1 - similarity.)
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0

  let dot = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dot   += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denom = Math.sqrt(normA) * Math.sqrt(normB)
  return denom === 0 ? 0 : dot / denom
}

// ─── 6. abilityLabel ─────────────────────────────────────────────────────────
/**
 * Returns a human-readable label for the student's accuracy level.
 * Used in UI chips and toast messages.
 */
export function abilityLabel(accuracy: number): {
  label: string
  color: string
  emoji: string
} {
  if (accuracy >= 0.8) return { label: 'Strong',    color: '#1DC97A', emoji: '🔥' }
  if (accuracy >= 0.6) return { label: 'Good',      color: '#F59E0B', emoji: '📈' }
  if (accuracy >= 0.4) return { label: 'Building',  color: '#6366F1', emoji: '💪' }
  return                      { label: 'Needs work', color: '#EF4444', emoji: '🎯' }
}
