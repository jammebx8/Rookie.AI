/**
 * lib/adaptivePractice.ts
 * ───────────────────────
 * Adaptive difficulty system for Rookie.AI
 *
 * ARCHITECTURE
 * ────────────
 * Difficulty is computed in real-time from two signals, weighted equally:
 *
 *   1. CROWD difficulty (60 %)
 *      Derived from option_a_percent … option_d_percent in jee_mains.
 *      If the majority chose the WRONG option, the question is hard.
 *      Formula:  crowd_difficulty = 1 − correct_option_percent / 100
 *
 *   2. USER-HISTORY difficulty (40 %)
 *      Derived from the student's own past attempts at questions in the
 *      same chapter.  Low chapter accuracy → boost difficulty ceiling.
 *
 * TARGET DIFFICULTY rises as the session progresses (0.35 easy → 0.75 hard)
 * and is softened if the student is struggling (< 50 % accuracy last 5 Qs).
 *
 * CHAPTER SURVEY
 * ──────────────
 * A lightweight "Pick chapters you've studied recently" survey is shown:
 *   • On first launch (no survey data at all)
 *   • Every 7 days thereafter
 * Survey answers are stored in the `survey_responses` Supabase table and also
 * locally (`rookie_survey_v1`).  The survey result biases which chapters
 * the adaptive fetcher picks from.
 *
 * ENDLESS MODE
 * ────────────
 * fetchAdaptive() never returns null — on exhausting unseen questions it
 * resets the seen-set and starts a new "lap", signalling via the
 * `newLap` boolean in the result.
 */

import { supabase } from '../public/src/utils/supabase'
import type { Question } from '../app/QuestionViewer/QuestionViewerClient'

// ─────────────────────────────────────────────────────────────────────────────
// Public constants
// ─────────────────────────────────────────────────────────────────────────────

export const SURVEY_KEY         = 'rookie_survey_v1'       // localStorage
export const WRONG_BOOKMARK_KEY = 'rookie_wrong_bookmarks' // badge count
const SURVEY_INTERVAL_DAYS      = 7
const DB_TABLE                  = 'jee_mains'

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface SurveyData {
  chapters: string[]        // chapter titles the user has studied
  subjects: string[]        // derived from chapters
  savedAt:  string          // ISO timestamp
}

export interface AdaptiveResult {
  question: Question
  difficulty: number        // 0–1 score of this question
  newLap: boolean           // true if we had to reset the seen-set
}

export interface SessionStats {
  total:    number
  correct:  number
  accuracy: number          // 0–1  (correct / total, or 0 if total=0)
}

/** One chapter in the survey chapter-picker */
export interface SurveyChapter {
  subject: string
  chapter: string
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. Difficulty scoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute a 0–1 difficulty score for a question.
 *
 * Uses the option percentage crowd data.
 * • If correct_option percent is high  → easy  (low score)
 * • If correct_option percent is low   → hard  (high score)
 * Falls back to 0.5 (medium) when data is missing.
 */
export function questionDifficulty(q: Question): number {
  const correctLetter = (q.correct_option ?? '')
    .replace(/option_?/gi, '')
    .replace(/[^a-dA-D]/g, '')
    .slice(0, 1)
    .toLowerCase()

  if (!correctLetter) return 0.5

  const pctKey = `option_${correctLetter}_percent` as keyof Question
  const pct    = q[pctKey] as number | null | undefined

  if (pct == null || isNaN(pct as number)) return 0.5

  // crowd_difficulty = 1 − (correct_pct / 100)
  // Clamp to [0.05, 0.95] to avoid extreme edge cases
  return Math.min(0.95, Math.max(0.05, 1 - pct / 100))
}

/**
 * Sort a list of questions by ascending difficulty (easiest first).
 * Used by QuestionViewer to reorder the chapter window.
 */
export function sortByDifficulty(questions: Question[]): Question[] {
  return [...questions].sort((a, b) => questionDifficulty(a) - questionDifficulty(b))
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Target difficulty from session progress + recent accuracy
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute the target difficulty for the NEXT question.
 *
 * Logic:
 *   • Session ramps from 0.35 (easy) to 0.70 (hard) over the first 20 Qs
 *   • If last-5 accuracy < 50 % → reduce target by 0.15 (cut the student slack)
 *   • If last-5 accuracy ≥ 80 % → raise target by 0.10 (challenge them)
 *
 * @param sessionCount   How many questions answered so far
 * @param recentResults  Last N isCorrect booleans (newest last)
 */
export function targetDifficulty(
  sessionCount:  number,
  recentResults: boolean[],
): number {
  // Ramp: starts at 0.35, hits 0.70 by question 20
  const ramp = Math.min(1, sessionCount / 20)
  let target = 0.35 + ramp * 0.35   // 0.35 → 0.70

  // Adjust for recent accuracy
  const last5 = recentResults.slice(-5)
  if (last5.length >= 3) {
    const acc = last5.filter(Boolean).length / last5.length
    if (acc < 0.5)  target -= 0.15   // struggling → easier
    if (acc >= 0.8) target += 0.10   // crushing it → harder
  }

  return Math.min(0.90, Math.max(0.15, target))
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. Chapter accuracy from attempt history (real-time)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Fetch the user's accuracy per chapter from the attempts table.
 * Returned as a map: `"subject::chapter" → accuracy (0–1)`.
 * Requires at least `minAttempts` per chapter to include it.
 */
export async function chapterAccuracyMap(
  userId:      string,
  minAttempts: number = 3,
): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  try {
    const { data: attempts } = await supabase
      .from('attempts')
      .select('question_id, correct')
      .eq('student_id', userId)

    if (!attempts?.length) return map

    const qids = [...new Set(attempts.map((a: any) => a.question_id))]
    const { data: qs } = await supabase
      .from(DB_TABLE)
      .select('question_id, subject, chapter')
      .in('question_id', qids)

    if (!qs) return map

    const qMap: Record<string, { subject: string; chapter: string }> = {}
    for (const q of qs as any[]) qMap[q.question_id] = { subject: q.subject, chapter: q.chapter }

    const stats: Record<string, { correct: number; total: number }> = {}
    for (const a of attempts as any[]) {
      const info = qMap[a.question_id]
      if (!info?.chapter) continue
      const key = `${info.subject}::${info.chapter}`
      if (!stats[key]) stats[key] = { correct: 0, total: 0 }
      stats[key].total++
      if (a.correct) stats[key].correct++
    }

    for (const [key, s] of Object.entries(stats)) {
      if (s.total >= minAttempts) map.set(key, s.correct / s.total)
    }
  } catch {}
  return map
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Survey helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Return the survey data saved locally, or null if never taken / expired. */
export function loadSurvey(): SurveyData | null {
  try {
    const raw = localStorage.getItem(SURVEY_KEY)
    if (!raw) return null
    const data: SurveyData = JSON.parse(raw)
    const ageDays = (Date.now() - new Date(data.savedAt).getTime()) / 86_400_000
    if (ageDays > SURVEY_INTERVAL_DAYS) return null   // expired
    return data
  } catch {
    return null
  }
}

/** Persist survey data locally and to Supabase (fire-and-forget). */
export async function saveSurvey(userId: string | null, chapters: string[]): Promise<void> {
  const subjects = [...new Set(
    chapters.map(ch => ALL_SURVEY_CHAPTERS.find(c => c.chapter === ch)?.subject ?? '')
      .filter(Boolean)
  )]
  const data: SurveyData = { chapters, subjects, savedAt: new Date().toISOString() }

  try { localStorage.setItem(SURVEY_KEY, JSON.stringify(data)) } catch {}

  if (!userId) return
  try {
    await supabase.from('survey_responses').upsert(
      { user_id: userId, chapters, subjects, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    )
  } catch {}
}

/** True when the survey should be shown (first launch or expired). */
export function shouldShowSurvey(): boolean {
  return loadSurvey() === null
}

// ─────────────────────────────────────────────────────────────────────────────
// 5. Wrong-answer bookmark badge helpers (localStorage)
// ─────────────────────────────────────────────────────────────────────────────

/** Increment the unseen wrong-bookmark count by 1. */
export function incrementWrongBadge(): void {
  try {
    const n = parseInt(localStorage.getItem(WRONG_BOOKMARK_KEY) || '0', 10)
    localStorage.setItem(WRONG_BOOKMARK_KEY, String(n + 1))
    window.dispatchEvent(new CustomEvent('wrongBadgeUpdated'))
  } catch {}
}

/** Read current badge count. */
export function readWrongBadge(): number {
  try { return parseInt(localStorage.getItem(WRONG_BOOKMARK_KEY) || '0', 10) } catch { return 0 }
}

/** Clear badge (called when user opens bookmark page). */
export function clearWrongBadge(): void {
  try {
    localStorage.setItem(WRONG_BOOKMARK_KEY, '0')
    window.dispatchEvent(new CustomEvent('wrongBadgeUpdated'))
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// 6. Auto-bookmark wrong answers
// ─────────────────────────────────────────────────────────────────────────────

const BOOKMARKS_KEY = 'bookmarkedQuestions'

/**
 * Automatically save a wrongly-answered question to the bookmarks list.
 * Skips silently if already bookmarked.
 * Also increments the bookmark badge counter.
 */
export function autoBookmarkWrong(q: Question): void {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY)
    const arr: any[] = raw ? JSON.parse(raw) : []
    const alreadyIn = arr.some((b: any) => b.question_id === q.question_id)
    if (alreadyIn) return

    arr.push({
      ...q,
      chapterTitle:  q.chapter,
      subjectName:   q.subject,
      _autoBookmark: true,   // flag so UI can show "auto-added" chip
    })
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(arr))
    incrementWrongBadge()
  } catch {}
}

// ─────────────────────────────────────────────────────────────────────────────
// 7. Main adaptive question fetcher
// ─────────────────────────────────────────────────────────────────────────────

/** Columns to select from jee_mains (no vector — not needed client-side) */
const Q_SELECT = [
  'id','question','question_id','question_text',
  'option_a','option_b','option_c','option_d','correct_option',
  'exam_shift','source_url','solution','question_img_url','solution_image_url',
  'option_a_img','option_b_img','option_c_img','option_d_img',
  'subject','chapter',
  'option_a_percent','option_b_percent','option_c_percent','option_d_percent',
  'buddy_jeetu','buddy_riya','buddy_rei','buddy_ritu','buddy_shreya','buddy_neha',
].join(',')

/**
 * Fetch the next adaptive question for the student.
 *
 * Selection logic (in priority order):
 *   1. Honours the chapter survey — only picks from surveyed chapters
 *      (falls back to all chapters if survey is empty / not taken).
 *   2. Filters out already-seen question IDs in this session (`excludeIds`).
 *   3. Fetches a batch of candidates (up to 60) matching the target difficulty
 *      window (±0.25 around target).
 *   4. Sorts candidates by |difficulty − target| and picks the closest,
 *      adding some randomness so the student never sees the same sequence.
 *   5. If no candidates found in the tight window, retries with a looser filter.
 *   6. If still nothing, resets `excludeIds` (new lap) and tries again once.
 *
 * @param userId          Supabase auth UUID (can be null for anonymous mode)
 * @param excludeIds      Question IDs seen this session (mutated on new lap)
 * @param target          Target difficulty 0–1 (from `targetDifficulty()`)
 * @param surveyChapters  Chapter titles from the survey (empty = no filter)
 * @returns AdaptiveResult with question, its difficulty score, and newLap flag
 */
export async function fetchAdaptive(
  userId:          string | null,
  excludeIds:      string[],
  target:          number,
  surveyChapters:  string[] = [],
): Promise<AdaptiveResult> {
  let newLap = false

  const tryFetch = async (
    excludes:  string[],
    window:    number,     // ±window around target
    maxRows:   number = 60,
  ): Promise<Question | null> => {
    const lo = Math.max(0,    target - window)
    const hi = Math.min(1,    target + window)

    let q = supabase
      .from(DB_TABLE)
      .select(Q_SELECT)
      .gte('option_a_percent', 0)  // ensures percent data exists

    // Chapter filter from survey
    if (surveyChapters.length > 0) {
      q = q.in('chapter', surveyChapters)
    }

    // Difficulty window — approximated via the correct-option percent range:
    //   difficulty ≈ 1 − correct_pct/100
    //   correct_pct range: [(1-hi)*100, (1-lo)*100]
    // We can't filter by computed value, so we'll filter after fetch.
    // Instead, just grab a manageable batch ordered randomly.

    const { data } = await q.limit(maxRows)

    if (!data?.length) return null

    // Filter excludes + difficulty window in JS (fast, small array)
    const excludeSet = new Set(excludes)
    const candidates = (data as unknown as Question[]).filter(item => {
      if (excludeSet.has(item.question_id)) return false
      const d = questionDifficulty(item)
      return d >= lo && d <= hi
    })

    if (!candidates.length) return null

    // Sort by proximity to target, pick from top-5 randomly for variety
    candidates.sort((a, b) => {
      const da = Math.abs(questionDifficulty(a) - target)
      const db = Math.abs(questionDifficulty(b) - target)
      return da - db
    })
    const pool = candidates.slice(0, Math.min(5, candidates.length))
    return pool[Math.floor(Math.random() * pool.length)]
  }

  // --- Attempt 1: tight window ---
  let q = await tryFetch(excludeIds, 0.25)

  // --- Attempt 2: loose window (no difficulty filter at all) ---
  if (!q) {
    q = await tryFetch(excludeIds, 0.50, 100)
  }

  // --- Attempt 3: new lap — reset excludes, try tight window ---
  if (!q) {
    newLap = true
    excludeIds.splice(0)  // mutate in-place so caller's array is reset too
    q = await tryFetch(excludeIds, 0.30, 60)
  }

  // --- Absolute fallback: anything at all ---
  if (!q) {
    const { data } = await supabase
      .from(DB_TABLE)
      .select(Q_SELECT)
      .limit(10)
    q = (data as unknown as Question[])?.[0] ?? null
  }

  // This should never happen with a populated DB, but TypeScript requires it
  if (!q) throw new Error('adaptivePractice: DB appears to be empty')

  return { question: q, difficulty: questionDifficulty(q), newLap }
}

// ─────────────────────────────────────────────────────────────────────────────
// 8. XP / level gamification helpers
// ─────────────────────────────────────────────────────────────────────────────

export const XP_KEY = 'rookie_xp_v1'

/** XP awarded per question based on difficulty and correctness. */
export function computeXP(correct: boolean, difficulty: number, timeSec: number): number {
  if (!correct) return 2   // small consolation XP for attempting

  // Base XP scales with difficulty: easy=8, hard=20
  const base = Math.round(8 + difficulty * 12)

  // Speed bonus (only on correct): ≤30s → +5, ≤60s → +3, ≤90s → +1
  const speed = timeSec <= 30 ? 5 : timeSec <= 60 ? 3 : timeSec <= 90 ? 1 : 0

  return base + speed
}

/** XP needed to reach a given level (exponential curve). */
export function xpForLevel(level: number): number {
  return Math.round(100 * Math.pow(1.35, level - 1))
}

export interface XPState {
  totalXP:       number
  level:         number
  xpInLevel:     number    // XP within the current level
  xpForNextLevel:number    // XP needed to complete current level
  levelledUp:    boolean   // true if this update crossed a level boundary
  previousLevel: number
}

/**
 * Add XP to the stored total, compute new level, persist.
 * Returns the full XP state including whether a level-up occurred.
 */
export function addXP(earned: number): XPState {
  try {
    const stored   = JSON.parse(localStorage.getItem(XP_KEY) || '{"totalXP":0}')
    const prevTotal: number = stored.totalXP ?? 0
    const newTotal  = prevTotal + earned

    const prevLevel = computeLevel(prevTotal)
    const newLevel  = computeLevel(newTotal)

    const state: XPState = {
      totalXP:       newTotal,
      level:         newLevel,
      xpInLevel:     xpInCurrentLevel(newTotal),
      xpForNextLevel:xpForLevel(newLevel),
      levelledUp:    newLevel > prevLevel,
      previousLevel: prevLevel,
    }

    localStorage.setItem(XP_KEY, JSON.stringify({ totalXP: newTotal }))
    return state
  } catch {
    return { totalXP: earned, level: 1, xpInLevel: earned, xpForNextLevel: 100, levelledUp: false, previousLevel: 1 }
  }
}

export function readXP(): { totalXP: number; level: number; xpInLevel: number; xpForNextLevel: number } {
  try {
    const stored = JSON.parse(localStorage.getItem(XP_KEY) || '{"totalXP":0}')
    const total  = stored.totalXP ?? 0
    const level  = computeLevel(total)
    return { totalXP: total, level, xpInLevel: xpInCurrentLevel(total), xpForNextLevel: xpForLevel(level) }
  } catch {
    return { totalXP: 0, level: 1, xpInLevel: 0, xpForNextLevel: 100 }
  }
}

function computeLevel(totalXP: number): number {
  let level = 1
  let cumulative = 0
  while (cumulative + xpForLevel(level) <= totalXP) {
    cumulative += xpForLevel(level)
    level++
  }
  return level
}

function xpInCurrentLevel(totalXP: number): number {
  let level = 1
  let cumulative = 0
  while (cumulative + xpForLevel(level) <= totalXP) {
    cumulative += xpForLevel(level)
    level++
  }
  return totalXP - cumulative
}

// ─────────────────────────────────────────────────────────────────────────────
// 9. Streak gate — "3 questions today = 1 streak day"
// ─────────────────────────────────────────────────────────────────────────────

const STREAK_GATE_KEY = 'rookie_streak_gate'   // localStorage: gate count today

/**
 * Check whether the student has hit the daily streak gate (3 questions).
 * Returns true the FIRST time the gate is crossed today (so the caller can
 * show the streak modal exactly once per day).
 */
export function checkStreakGate(todayCount: number): boolean {
  try {
    const raw   = JSON.parse(localStorage.getItem(STREAK_GATE_KEY) || '{}')
    const today = new Date().toDateString()
    if (raw.date === today && raw.fired) return false   // already fired today
    if (todayCount >= 3) {
      localStorage.setItem(STREAK_GATE_KEY, JSON.stringify({ date: today, fired: true }))
      return true
    }
    return false
  } catch {
    return false
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// 10. Master chapter list for the survey
// ─────────────────────────────────────────────────────────────────────────────

/** All JEE Main chapters exactly as stored in jee_mains.chapter */
export const ALL_SURVEY_CHAPTERS: SurveyChapter[] = [
  // Physics
  { subject: 'physics', chapter: 'Units & Measurements' },
  { subject: 'physics', chapter: 'Vector Algebra' },
  { subject: 'physics', chapter: 'Motion in a Straight Line' },
  { subject: 'physics', chapter: 'Motion in a Plane' },
  { subject: 'physics', chapter: 'Circular Motion' },
  { subject: 'physics', chapter: 'Laws of Motion' },
  { subject: 'physics', chapter: 'Work Power & Energy' },
  { subject: 'physics', chapter: 'Center of Mass and Collision' },
  { subject: 'physics', chapter: 'Rotational Motion' },
  { subject: 'physics', chapter: 'Properties of Matter' },
  { subject: 'physics', chapter: 'Heat and Thermodynamics' },
  { subject: 'physics', chapter: 'Simple Harmonic Motion' },
  { subject: 'physics', chapter: 'Waves' },
  { subject: 'physics', chapter: 'Gravitation' },
  { subject: 'physics', chapter: 'Electrostatics' },
  { subject: 'physics', chapter: 'Current Electricity' },
  { subject: 'physics', chapter: 'Capacitor' },
  { subject: 'physics', chapter: 'Magnetic Effect of Current' },
  { subject: 'physics', chapter: 'Magnetic Properties of Matter' },
  { subject: 'physics', chapter: 'Electromagnetic Induction' },
  { subject: 'physics', chapter: 'Alternating Current' },
  { subject: 'physics', chapter: 'Electromagnetic Waves' },
  { subject: 'physics', chapter: 'Wave Optics' },
  { subject: 'physics', chapter: 'Geometrical Optics' },
  { subject: 'physics', chapter: 'Atoms and Nuclei' },
  { subject: 'physics', chapter: 'Dual Nature of Radiation' },
  { subject: 'physics', chapter: 'Semiconductor' },
  { subject: 'physics', chapter: 'Communication Systems' },
  // Chemistry
  { subject: 'chemistry', chapter: 'Some Basic Concepts of Chemistry' },
  { subject: 'chemistry', chapter: 'Structure of Atom' },
  { subject: 'chemistry', chapter: 'Redox Reactions' },
  { subject: 'chemistry', chapter: 'Chemical Equilibrium' },
  { subject: 'chemistry', chapter: 'Ionic Equilibrium' },
  { subject: 'chemistry', chapter: 'Solutions' },
  { subject: 'chemistry', chapter: 'Thermodynamics' },
  { subject: 'chemistry', chapter: 'Electrochemistry' },
  { subject: 'chemistry', chapter: 'Chemical Kinetics and Nuclear Chemistry' },
  { subject: 'chemistry', chapter: 'Gaseous State' },
  { subject: 'chemistry', chapter: 'Solid State' },
  { subject: 'chemistry', chapter: 'Surface Chemistry' },
  { subject: 'chemistry', chapter: 'Periodic Table & Periodicity' },
  { subject: 'chemistry', chapter: 'Chemical Bonding & Molecular Structure' },
  { subject: 'chemistry', chapter: 'p-Block Elements' },
  { subject: 'chemistry', chapter: 'd and f Block Elements' },
  { subject: 'chemistry', chapter: 'Coordination Compounds' },
  { subject: 'chemistry', chapter: 'Isolation of Elements' },
  { subject: 'chemistry', chapter: 'Salt Analysis' },
  { subject: 'chemistry', chapter: 's-Block Elements' },
  { subject: 'chemistry', chapter: 'Hydrogen' },
  { subject: 'chemistry', chapter: 'Basics of Organic Chemistry' },
  { subject: 'chemistry', chapter: 'Hydrocarbons' },
  { subject: 'chemistry', chapter: 'Haloalkanes and Haloarenes' },
  { subject: 'chemistry', chapter: 'Alcohols, Phenols and Ethers' },
  { subject: 'chemistry', chapter: 'Aldehydes, Ketones and Carboxylic Acids' },
  { subject: 'chemistry', chapter: 'Compounds Containing Nitrogen' },
  { subject: 'chemistry', chapter: 'Biomolecules' },
  { subject: 'chemistry', chapter: 'Polymers' },
  { subject: 'chemistry', chapter: 'Chemistry in Everyday Life' },
  { subject: 'chemistry', chapter: 'Environmental Chemistry' },
  { subject: 'chemistry', chapter: 'Practical Organic Chemistry' },
  // Maths
  { subject: 'maths', chapter: 'Sets and Relations' },
  { subject: 'maths', chapter: 'Logarithm' },
  { subject: 'maths', chapter: 'Quadratic Equation and Inequalities' },
  { subject: 'maths', chapter: 'Sequences and Series' },
  { subject: 'maths', chapter: 'Binomial Theorem' },
  { subject: 'maths', chapter: 'Matrices and Determinants' },
  { subject: 'maths', chapter: 'Permutations and Combinations' },
  { subject: 'maths', chapter: 'Probability' },
  { subject: 'maths', chapter: 'Vector Algebra' },
  { subject: 'maths', chapter: '3D Geometry' },
  { subject: 'maths', chapter: 'Complex Numbers' },
  { subject: 'maths', chapter: 'Statistics' },
  { subject: 'maths', chapter: 'Trigonometric Ratio and Identites' },
  { subject: 'maths', chapter: 'Trigonometric Equations' },
  { subject: 'maths', chapter: 'Inverse Trigonometric Functions' },
  { subject: 'maths', chapter: 'Straight Lines and Pair of Straight Lines' },
  { subject: 'maths', chapter: 'Circle' },
  { subject: 'maths', chapter: 'Parabola' },
  { subject: 'maths', chapter: 'Ellipse' },
  { subject: 'maths', chapter: 'Hyperbola' },
  { subject: 'maths', chapter: 'Functions' },
  { subject: 'maths', chapter: 'Limits, Continuity and Differentiability' },
  { subject: 'maths', chapter: 'Differentiation' },
  { subject: 'maths', chapter: 'Application of Derivatives' },
  { subject: 'maths', chapter: 'Definite Integration' },
  { subject: 'maths', chapter: 'Area Under The Curves' },
  { subject: 'maths', chapter: 'Differential Equations' },
  { subject: 'maths', chapter: 'Mathematical Reasoning' },
  { subject: 'maths', chapter: 'Height and Distance' },
  { subject: 'maths', chapter: 'Properties of Triangle' },
]
