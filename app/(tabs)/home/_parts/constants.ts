// Home constants + helpers — moved verbatim from page.tsx (logic unchanged).

// ─── Motivational headlines ──────────────────────────────────────────────────
// hl: true → gradient highlight | br: true → line break | {exam} → user's exam
export type Part = { t: string; hl?: boolean } | { br: true };

export const MOTIVATIONS: Part[][] = [
  [{ t: 'Ready to crack' }, { br: true }, { t: '{exam}', hl: true }, { t: '?' }],
  [{ t: 'Small steps' }, { t: ' daily', hl: true }, { br: true }, { t: 'build a ' }, { t: 'big rank', hl: true }, { t: '.' }],
  [{ t: 'Discipline' , hl: true }, { t: ' beats' }, { br: true }, { t: 'motivation', hl: true }, { t: ', every time.' }],
  [{ t: 'One more question.' }, { br: true }, { t: 'One step closer to ' }, { t: '{exam}', hl: true }, { t: '.' }],
  [{ t: 'Your future self' }, { br: true }, { t: 'is ' }, { t: 'watching', hl: true }, { t: '. Make them proud.' }],
  [{ t: "Don't wait for" }, { br: true }, { t: 'the perfect day. ' }, { t: 'Start today', hl: true }, { t: '.' }],
  [{ t: 'Mistakes are' }, { br: true }, { t: 'proof', hl: true }, { t: ' you are ' }, { t: 'learning', hl: true }, { t: '.' }],
  [{ t: 'Consistency' , hl: true }, { t: ' turns' }, { br: true }, { t: 'average into ' }, { t: 'unstoppable', hl: true }, { t: '.' }],
  [{ t: 'Every topic you master' }, { br: true }, { t: 'is one less ' }, { t: 'fear', hl: true }, { t: ' on exam day.' }],
  [{ t: 'Study now.' }, { br: true }, { t: 'Celebrate ' }, { t: 'later', hl: true }, { t: '.' }],
  [{ t: 'PYQs' , hl: true }, { t: " don't lie." }, { br: true }, { t: 'Solve enough and the ' }, { t: 'patterns', hl: true }, { t: ' show up.' }],
  [{ t: 'Stuck on a question?' }, { br: true }, { t: "That's your brain " }, { t: 'growing', hl: true }, { t: '.' }],
  [{ t: "Don't just read the solution." }, { br: true }, { t: 'Fight for ' }, { t: '10 more minutes', hl: true }, { t: '.' }],
  [{ t: 'Integration feels hard' }, { br: true }, { t: 'until you have done it ' }, { t: '100 times', hl: true }, { t: '.' }],
  [{ t: 'Every numerical you solve' }, { br: true }, { t: 'makes the next one ' }, { t: 'easier', hl: true }, { t: '.' }],
  [{ t: 'Solve it once, you ' }, { t: 'know', hl: true }, { t: ' it.' }, { br: true }, { t: 'Solve it thrice, you ' }, { t: 'own', hl: true }, { t: ' it.' }],
  [{ t: 'Organic looks scary' }, { br: true }, { t: 'until you ' }, { t: 'practice', hl: true }, { t: ' the reactions.' }],

  // ── Mocks, accuracy & exam-day thinking ──
  [{ t: 'Bad mock score?' }, { br: true }, { t: 'Better it happens ' }, { t: 'here', hl: true }, { t: ', not on exam day.' }],
  [{ t: 'Mocks are where your' }, { br: true }, { t: 'rank', hl: true }, { t: ' is ' }, { t: 'rehearsed', hl: true }, { t: '.' }],
  [{ t: 'Accuracy', hl: true }, { t: ' wins papers.' }, { br: true }, { t: 'Speed can wait.' }],
  [{ t: 'Every silly mistake you fix now' }, { br: true }, { t: 'is ' }, { t: 'marks saved', hl: true }, { t: ' in the hall.' }],
  [{ t: 'Negative marking punishes' }, { br: true }, { t: 'guessing', hl: true }, { t: ' and rewards ' }, { t: 'clarity', hl: true }, { t: '.' }],
  [{ t: 'Focus on the ' }, { t: 'next question', hl: true }, { t: ',' }, { br: true }, { t: 'not the whole ' }, { t: 'syllabus', hl: true }, { t: '.' }],

  // ── Weak chapters & revision ──
  [{ t: 'Ranks are lost in' }, { br: true }, { t: 'chapters', hl: false }, { t: 'you ' }, { t: 'skipped', hl: true }, { t: '.' }],
  [{ t: 'Revise what you know.' }, { br: true }, { t: 'Attack what you ' }, { t: "don't", hl: true }, { t: '.' }],
  [{ t: 'Your weakest chapter today' }, { br: true }, { t: 'can be your ' }, { t: 'strongest', hl: true }, { t: ' by next month.' }],
  [{ t: 'Hard chapters' , hl: true }, { t: ' decide' }, { br: true }, { t: 'who gets the ' }, { t: 'top ranks', hl: true }, { t: '.' }],
  [{ t: 'One chapter closed today' }, { br: true }, { t: 'is one ' }, { t: 'worry', hl: true }, { t: ' gone for good.' }],

  // ── Focus & discipline ──
  [{ t: '3 hours of ' }, { t: 'focus', hl: true }, { br: true }, { t: 'beat 8 hours of ' }, { t: 'scrolling', hl: true }, { t: '.' }],
  [{ t: 'Your phone can wait.' }, { br: true }, { t: '{exam}', hl: true }, { t: " can't." }],
  [{ t: 'Tricks help.' }, { br: true }, { t: 'Practice', hl: true }, { t: ' decides.' }],
  [{ t: 'Missed yesterday?' }, { br: true }, { t: 'Fine. ' }, { t: 'Today', hl: true }, { t: ' still counts.' }],

  // ── Big-picture / mindset ──
  [{ t: 'The topper you admire' }, { br: true }, { t: 'once got the ' }, { t: 'same questions wrong', hl: true }, { t: '.' }],
  [{ t: 'Your seat in a top college' }, { br: true }, { t: 'is being ' }, { t: 'decided', hl: true }, { t: ' right now.' }],
  [{ t: 'Today\'s grind is the' }, { br: true }, { t: 'story you will ' }, { t: 'tell', hl: true }, { t: ' after results.' }],
  [{ t: 'Everyone is hoping.' }, { br: true }, { t: 'Be the one who ' }, { t: 'earns', hl: true }, { t: ' it.' }],
  [{ t: 'Somewhere, someone is solving' }, { br: true }, { t: 'one more ' }, { t: 'problem', hl: true }, { t: '. Be them.' }],
  [{ t: 'Physics rewards those' }, { br: true }, { t: 'who ' }, { t: 'stay', hl: true }, { t: ' with the problem.' }],
  [{ t: 'Beat your ' }, { t: 'yesterday', hl: true }, { t: ',' }, { br: true }, { t: 'not the whole batch.' }],
];

export const ROTATE_MS = 8000;

// ─── Constants ───────────────────────────────────────────────────────────────
export const EXAM_OPTIONS = ['JEE Mains', 'NEET', 'JEE Advanced', 'Other'];
export const CLASS_OPTIONS = ['11th', '12th', 'Dropper', 'Other'];
export const SESSION_KEY = 'questionSessionResponses_v1';
export const DAILY_GOAL_KEY = 'rookie_daily_goal';
export const STREAK_KEY = 'rookie_streak_data';

export const DAILY_GOAL_OPTIONS = [5, 10, 20, 30, 50];
export const DAILY_GOAL_CUSTOM_KEY = 'rookie_daily_goal_custom';

export const socialMediaLinks = [
  {
    label: 'Instagram',
    icon: '/instagram 1.png',
    url: 'https://www.instagram.com/rookie_ai.2006?igsh=ajB6YXRnNnJ4OGZ2',
  },
  {
    label: 'LinkedIn',
    icon: '/linkedin (2) 1.png',
    url: 'https://www.linkedin.com/in/dhruv-pathak-437a56365/',
  },
  {
    label: 'Reddit',
    icon: '/reddit 3.png',
    url: 'https://www.reddit.com/user/Last-Benefit2242/',
  },
  {
    label: 'Discord',
    icon: '/discord 1.png',
    url: 'https://discord.gg/snh7kFPV',
  },
];



// ─── Helpers ─────────────────────────────────────────────────────────────────
export function openExternal(url?: string) {
  if (!url || typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

export function getYesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Count questions solved today from sessionResponses
export function countSolvedToday(): number {
  try {
    // Primary: date-stamped key written by QuestionViewer
    const todayKey = `questionsToday_${new Date().toDateString()}`;
    const stamped = localStorage.getItem(todayKey);
    if (stamped) return parseInt(stamped, 10);
    // Fallback: generic key
    const generic = localStorage.getItem('questionsToday');
    return generic ? parseInt(generic, 10) : 0;
  } catch {
    return 0;
  }
}

export function computeStreak(): { current: number; longest: number; activeDays: string[] } {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { current: 0, longest: 0, activeDays: [] };
    return JSON.parse(raw);
  } catch {
    return { current: 0, longest: 0, activeDays: [] };
  }
}

// ─── Day-of-week strip ────────────────────────────────────────────────────────
export const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export function getDayOfWeek() {
  // 0=Sun → map to index 6, 1=Mon → 0, etc.
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}
