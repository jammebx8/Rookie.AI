/**
 * lib/dailyPractice.ts
 * ────────────────────
 * Generates personalized Daily Practice questions based on student activity:
 * 1. 5 very easy questions similar to previous CORRECT attempts (confidence boost).
 * 2. 3 questions similar to previous INCORRECT attempts (concept revision).
 * 3. Cold-start (new user / no history): 5 very easy questions from high-frequency chapters.
 */

import { supabase } from '../public/src/utils/supabase'
import type { Question } from '../app/QuestionViewer/QuestionViewerClient'
import { sortByDifficulty } from './adaptivePractice'

export const HIGH_FREQUENCY_CHAPTERS = [
  // Physics
  { subject: 'physics', chapter: 'Current Electricity' },
  { subject: 'physics', chapter: 'Units & Measurements' },
  { subject: 'physics', chapter: 'Dual Nature of Radiation' },
  { subject: 'physics', chapter: 'Work Power & Energy' },
  { subject: 'physics', chapter: 'Electrostatics' },
  { subject: 'physics', chapter: 'Gravitation' },
  // Chemistry
  { subject: 'chemistry', chapter: 'Chemical Bonding & Molecular Structure' },
  { subject: 'chemistry', chapter: 'Structure of Atom' },
  { subject: 'chemistry', chapter: 'Periodic Table & Periodicity' },
  { subject: 'chemistry', chapter: 'Coordination Compounds' },
  { subject: 'chemistry', chapter: 'Solutions' },
  { subject: 'chemistry', chapter: 'Basics of Organic Chemistry' },
  // Maths
  { subject: 'maths', chapter: 'Matrices and Determinants' },
  { subject: 'maths', chapter: 'Vector Algebra' },
  { subject: 'maths', chapter: '3D Geometry' },
  { subject: 'maths', chapter: 'Sequences and Series' },
  { subject: 'maths', chapter: 'Statistics' },
  { subject: 'maths', chapter: 'Sets and Relations' },
]

const SELECT_FIELDS = [
  'id', 'question', 'question_id', 'question_text',
  'option_a', 'option_b', 'option_c', 'option_d', 'correct_option',
  'exam_shift', 'source_url', 'solution', 'question_img_url', 'solution_image_url',
  'option_a_img', 'option_b_img', 'option_c_img', 'option_d_img',
  'subject', 'chapter',
  'option_a_percent', 'option_b_percent', 'option_c_percent', 'option_d_percent',
  'buddy_jeetu', 'buddy_riya', 'buddy_rei', 'buddy_ritu', 'buddy_shreya', 'buddy_neha',
].join(',')

export interface DailyPracticeSet {
  questions: (Question & { daily_type?: 'confidence' | 'revision' | 'high_frequency' })[]
  isNewUser: boolean
  setIndex?: number
}

export interface DailyPracticeOptions {
  setIndex?: number
  excludeIds?: string[]
}

/**
 * Fetch daily practice questions personalized for the user.
 * Caches in sessionStorage per day so the daily set remains stable during practice.
 * When setIndex > 1 is requested, fetches a fresh 5-question revision/quick practice set.
 */
export async function getDailyPracticeQuestions(
  userId: string | null,
  options: DailyPracticeOptions = {}
): Promise<DailyPracticeSet> {
  const setIndex = options.setIndex ?? 1
  const cacheKey = `rookie_daily_set_${new Date().toDateString()}_${userId ?? 'guest'}_s${setIndex}`
  try {
    const cached = sessionStorage.getItem(cacheKey)
    if (cached) {
      const parsed = JSON.parse(cached)
      if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
        return parsed
      }
    }
  } catch {}

  let questions: (Question & { daily_type?: 'confidence' | 'revision' | 'high_frequency' })[] = []
  let isNewUser = true

  try {
    const excludedSet = new Set(options.excludeIds ?? [])

    if (userId) {
      // 1. Fetch user's previous attempts (most recent 30)
      const { data: attempts } = await supabase
        .from('attempts')
        .select('question_id, correct, created_at')
        .eq('student_id', userId)
        .order('created_at', { ascending: false })
        .limit(30)

      if (attempts && attempts.length > 0) {
        isNewUser = false
        const attemptedIds = new Set(attempts.map((a: { question_id: string }) => a.question_id))
        excludedSet.forEach(id => attemptedIds.add(id))

        const correctQids = attempts.filter((a: { correct: boolean }) => a.correct).map((a: { question_id: string }) => a.question_id)
        const incorrectQids = attempts.filter((a: { correct: boolean }) => !a.correct).map((a: { question_id: string }) => a.question_id)

        // Find chapters for correct attempts
        let correctChapters: { subject: string; chapter: string }[] = []
        if (correctQids.length > 0) {
          const { data: cRows } = await supabase
            .from('jee_mains')
            .select('subject, chapter')
            .in('question_id', correctQids.slice(0, 10))
          if (cRows) {
            correctChapters = (cRows as any[]).filter((r: any) => r.subject && r.chapter)
          }
        }

        // Find chapters for incorrect attempts
        let incorrectChapters: { subject: string; chapter: string }[] = []
        if (incorrectQids.length > 0) {
          const { data: iRows } = await supabase
            .from('jee_mains')
            .select('subject, chapter')
            .in('question_id', incorrectQids.slice(0, 10))
          if (iRows) {
            incorrectChapters = (iRows as any[]).filter((r: any) => r.subject && r.chapter)
          }
        }

        const pickedQuestionIds = new Set<string>()
        excludedSet.forEach(id => pickedQuestionIds.add(id))
        let easyCount = 0

        // ── 2 Easy questions from previous CORRECT chapters (confidence booster) ──
        if (correctChapters.length > 0) {
          const uniqueChapters = Array.from(new Set(correctChapters.map(c => `${c.subject}::${c.chapter}`)))
            .map(str => {
              const [subject, chapter] = str.split('::')
              return { subject, chapter }
            })

          for (const ch of uniqueChapters) {
            if (easyCount >= 2 || questions.length >= 5) break
            const { data: cand } = await supabase
              .from('jee_mains')
              .select(SELECT_FIELDS)
              .eq('subject', ch.subject)
              .eq('chapter', ch.chapter)
              .limit(15)

            const candRows = (cand as unknown as Question[]) || []
            if (candRows.length > 0) {
              const unattempted = candRows.filter(
                (q) => !attemptedIds.has(q.question_id) && !pickedQuestionIds.has(q.question_id)
              )
              const sorted = sortByDifficulty(unattempted)
              for (const q of sorted) {
                if (easyCount >= 2 || questions.length >= 5) break
                questions.push({ ...q, daily_type: 'confidence' })
                pickedQuestionIds.add(q.question_id)
                easyCount++
              }
            }
          }
        }

        // ── 3 Questions from previous INCORRECT chapters (revision) ──
        let revisionCount = 0
        if (incorrectChapters.length > 0) {
          const uniqueIncChapters = Array.from(new Set(incorrectChapters.map(c => `${c.subject}::${c.chapter}`)))
            .map(str => {
              const [subject, chapter] = str.split('::')
              return { subject, chapter }
            })

          for (const ch of uniqueIncChapters) {
            if (revisionCount >= 3 || questions.length >= 5) break
            const { data: cand } = await supabase
              .from('jee_mains')
              .select(SELECT_FIELDS)
              .eq('subject', ch.subject)
              .eq('chapter', ch.chapter)
              .limit(15)

            const candRows = (cand as unknown as Question[]) || []
            if (candRows.length > 0) {
              const unattempted = candRows.filter(
                (q) => !attemptedIds.has(q.question_id) && !pickedQuestionIds.has(q.question_id)
              )
              const sorted = sortByDifficulty(unattempted)
              for (const q of sorted) {
                if (revisionCount >= 3 || questions.length >= 5) break
                questions.push({ ...q, daily_type: 'revision' })
                pickedQuestionIds.add(q.question_id)
                revisionCount++
              }
            }
          }
        }
      }
    }

    // ── Cold start / fallback if not enough questions found: High Frequency Chapters ──
    if (questions.length < 5) {
      isNewUser = questions.length === 0
      const shuffledHf = [...HIGH_FREQUENCY_CHAPTERS].sort(() => Math.random() - 0.5)

      for (const hf of shuffledHf) {
        if (questions.length >= 5) break
        const { data: cand } = await supabase
          .from('jee_mains')
          .select(SELECT_FIELDS)
          .eq('subject', hf.subject)
          .eq('chapter', hf.chapter)
          .limit(20)

        const candRows = (cand as unknown as Question[]) || []
        if (candRows.length > 0) {
          const sorted = sortByDifficulty(candRows)
          for (const q of sorted) {
            if (questions.length >= 5) break
            if (!questions.some(item => item.question_id === q.question_id) && !options.excludeIds?.includes(q.question_id)) {
              questions.push({ ...q, daily_type: 'high_frequency' })
            }
          }
        }
      }
    }
  } catch (err) {
    console.error('Error fetching daily practice questions:', err)
  }

  const finalQuestions = questions.slice(0, 5)
  const result: DailyPracticeSet = { questions: finalQuestions, isNewUser, setIndex }
  try {
    if (finalQuestions.length > 0) {
      sessionStorage.setItem(cacheKey, JSON.stringify(result))
    }
  } catch {}

  return result
}
