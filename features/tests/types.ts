// ─── features/tests/types.ts ─────────────────────────────────────────────────
// All shared TypeScript types for the Tests feature.
// No `any` — strict throughout.

// ─── Exam definitions ────────────────────────────────────────────────────────

export type ExamId = 'jee_main' | 'jee_advanced' | 'neet'

export interface ExamOption {
  id:          ExamId
  label:       string
  available:   boolean   // false → show "coming soon" chip
  description: string
}

export const EXAM_OPTIONS: ExamOption[] = [
  {
    id:          'jee_main',
    label:       'JEE Main',
    available:   true,
    description: 'Joint Entrance Examination — Main',
  },
  {
    id:          'jee_advanced',
    label:       'JEE Advanced',
    available:   true,
    description: 'Joint Entrance Examination — Advanced',
  },
  {
    id:          'neet',
    label:       'NEET',
    available:   false,
    description: 'National Eligibility cum Entrance Test',
  },
]

export const SUBJECTS_FOR_EXAM: Record<ExamId, string[]> = {
  jee_main:     ['Physics', 'Chemistry', 'Maths'],
  jee_advanced: ['Physics', 'Chemistry', 'Maths'],
  neet:         ['Physics', 'Chemistry', 'Biology'],
}

// ─── Duration options ────────────────────────────────────────────────────────

export interface DurationOption {
  seconds: number
  label:   string   // e.g. "30 mins"
  /** Approximate question count at 1 Q / 90 s */
  approxQuestions: number
}

export const DURATION_OPTIONS: DurationOption[] = [
  { seconds: 1800,  label: '30 mins',  approxQuestions: 20  },
  { seconds: 3600,  label: '60 mins',  approxQuestions: 40  },
  { seconds: 5400,  label: '90 mins',  approxQuestions: 60  },
  { seconds: 7200,  label: '120 mins', approxQuestions: 80  },
  { seconds: 10800, label: '180 mins', approxQuestions: 120 },
]

// ─── Wizard config (built up step by step) ───────────────────────────────────

export interface TestConfig {
  examId:          ExamId | null
  years:           string[]
  subjects:        string[]
  chapters:        string[]
  durationSeconds: number | null
}

export const EMPTY_CONFIG: TestConfig = {
  examId:          null,
  years:           [],
  subjects:        [],
  chapters:        [],
  durationSeconds: null,
}

// ─── Wizard UI state ─────────────────────────────────────────────────────────

export type WizardStep = 1 | 2 | 3 | 4 | 5

export interface YearRow {
  year:          string
  questionCount: number
}

export interface ChapterRow {
  subject:       string
  chapter:       string
  questionCount: number
}

// ─── DB row shapes ────────────────────────────────────────────────────────────

export interface TestAttemptRow {
  id:                uuid
  user_id:           uuid
  title:             string
  config:            TestConfig
  question_ids:      string[]
  duration_seconds:  number
  started_at:        string | null
  submitted_at:      string | null
  expires_at:        string | null
  status:            'created' | 'in_progress' | 'submitted' | 'expired'
  score:             number | null
  max_score:         number | null
  correct_count:     number | null
  incorrect_count:   number | null
  unattempted_count: number | null
  time_taken_seconds:number | null
  created_at:        string
}

export interface TestAnswerRow {
  id:                 number
  attempt_id:         uuid
  question_id:        string
  selected_option:    string | null
  q_status:           QuestionStatus
  time_spent_seconds: number
  updated_at:         string
}

// ─── Question status in palette ──────────────────────────────────────────────

export type QuestionStatus =
  | 'not_visited'
  | 'visited'
  | 'answered'
  | 'marked'
  | 'marked_answered'
  | 'unattempted'   // visited but cleared

/** Palette color tokens per status — used in both palette + legend */
export interface StatusStyle {
  bg:     string   // Tailwind bg class or hex for inline style
  text:   string
  border: string
  label:  string
}

// Status palette (Rookie revamp): answered = blue primary · marked = marigold ·
// visited but not answered = soft red · not visited = muted gray.
// Hex values so they work in both style= and className=.
export const STATUS_STYLES_DARK: Record<QuestionStatus, StatusStyle> = {
  not_visited:     { bg: '#303136', text: '#a1a1aa', border: '#303136', label: 'Not visited'        },
  visited:         { bg: '#3a2320', text: '#ff9c8c', border: '#3a2320', label: 'Not answered'       },
  answered:        { bg: '#3d8fe0', text: '#ffffff', border: '#3d8fe0', label: 'Answered'           },
  unattempted:     { bg: '#3a2320', text: '#ff9c8c', border: '#3a2320', label: 'Cleared'            },
  marked:          { bg: '#4a3a10', text: '#ffe68a', border: '#4a3a10', label: 'Marked for review'  },
  marked_answered: { bg: '#4a3a10', text: '#ffe68a', border: '#3d8fe0', label: 'Marked & answered'  },
}

export const STATUS_STYLES_LIGHT: Record<QuestionStatus, StatusStyle> = {
  not_visited:     { bg: '#e6e6e3', text: '#5c5c5c', border: '#e6e6e3', label: 'Not visited'        },
  visited:         { bg: '#fdecea', text: '#b2382d', border: '#fdecea', label: 'Not answered'       },
  answered:        { bg: '#2a6fb5', text: '#ffffff', border: '#2a6fb5', label: 'Answered'           },
  unattempted:     { bg: '#fdecea', text: '#b2382d', border: '#fdecea', label: 'Cleared'            },
  marked:          { bg: '#ffe68a', text: '#6b4a00', border: '#ffe68a', label: 'Marked for review'  },
  marked_answered: { bg: '#ffe68a', text: '#6b4a00', border: '#2a6fb5', label: 'Marked & answered'  },
}

// ─── Test engine question (client-safe — no correct_option until submit) ──────

export interface TestQuestion {
  question_id:        string
  question_text:      string
  option_a:           string | null
  option_b:           string | null
  option_c:           string | null
  option_d:           string | null
  option_a_img:       string | null
  option_b_img:       string | null
  option_c_img:       string | null
  option_d_img:       string | null
  question_img_url:   string | null
  subject:            string | null
  chapter:            string | null
  exam_shift:         string | null
  /** true when all option_x are null — numerical input question */
  is_numerical:       boolean
}

/** After submission the server adds correct_option + solution */
export interface TestQuestionReview extends TestQuestion {
  correct_option:     string | null
  solution:           string | null
  solution_image_url: string | null
}

// ─── In-engine answer map ─────────────────────────────────────────────────────

export interface AnswerEntry {
  selected_option:    string | null   // 'a'|'b'|'c'|'d' or numeric string
  q_status:           QuestionStatus
  time_spent_seconds: number
}

export type AnswerMap = Record<string, AnswerEntry>   // keyed by question_id

// ─── API payloads ────────────────────────────────────────────────────────────

export interface CreateTestPayload {
  config:  TestConfig
  title:   string
}

export interface CreateTestResponse {
  attemptId:   uuid
  questionIds: string[]
  expiresAt:   string | null
}

export interface SubmitTestPayload {
  attemptId: uuid
  answers:   AnswerMap
}

export interface SubmitTestResponse {
  score:            number
  maxScore:         number
  correctCount:     number
  incorrectCount:   number
  unattemptedCount: number
  timeTakenSeconds: number
  questions:        TestQuestionReview[]
}

// ─── Branded type alias ───────────────────────────────────────────────────────
type uuid = string
