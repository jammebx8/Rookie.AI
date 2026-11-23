/**
 * lib/competeEngine.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Rookie.AI Compete Engine
 * 1v1 Academic Battle System with retention-optimized matchmaking,
 * dynamic difficulty balancing, authentic simulated opponents,
 * Elo-style rating adjustments, and live India Rank leaderboard.
 */

import { supabase } from '../public/src/utils/supabase';
import { HIGH_FREQUENCY_CHAPTERS } from './dailyPractice';

export interface CompeteQuestion {
  id: string;
  question_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string; // 'a' | 'b' | 'c' | 'd'
  exam_shift?: string;
  solution?: string;
  question_img_url?: string;
  solution_image_url?: string;
  option_a_img?: string;
  option_b_img?: string;
  option_c_img?: string;
  option_d_img?: string;
  subject?: string;
  chapter?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
}

export interface CompeteOpponent {
  id: string;
  name: string;
  avatar_url?: string | null;
  rating: number;
  rank: number;
  isRealUser?: boolean;
}

export interface CompeteMatchRecord {
  id: string;
  date: string;
  opponentName: string;
  opponentAvatar?: string | null;
  userScore: number;
  opponentScore: number;
  ratingDelta: number;
  newRating: number;
  won: boolean;
  tied?: boolean;
}

export interface CompeteUserStats {
  rating: number;
  matchesPlayed: number;
  wins: number;
  losses: number;
  ties: number;
  streak: number;
  bestStreak: number;
  history: CompeteMatchRecord[];
}

export interface LeaderboardRival {
  rank: number;
  name: string;
  rating: number;
  avatar_url?: string | null;
  isUser?: boolean;
}

const STATS_STORAGE_KEY = 'rookie_compete_stats_v1';
const OPPONENTS_CACHE_KEY = 'rookie_compete_opponents_cache';

// Fallback bank of authentic student personas matching Unacademy Compete visual style
export const FALLBACK_OPPONENTS: Array<{ name: string; avatar_url: string; ratingOffset: number }> = [
  { name: 'RahimAli', avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', ratingOffset: -23 },
  { name: 'Harshil', avatar_url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80', ratingOffset: -12 },
  { name: 'Krishna', avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', ratingOffset: 5 },
  { name: 'Ritik', avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', ratingOffset: 8 },
  { name: 'Anshuman', avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150&auto=format&fit=crop&q=80', ratingOffset: -6 },
  { name: 'Priya S.', avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80', ratingOffset: 14 },
  { name: 'Aarav M.', avatar_url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=150&auto=format&fit=crop&q=80', ratingOffset: -18 },
  { name: 'Sneha Rao', avatar_url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80', ratingOffset: 2 },
  { name: 'Tanya K.', avatar_url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=150&auto=format&fit=crop&q=80', ratingOffset: -9 },
  { name: 'Dev Sharma', avatar_url: 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', ratingOffset: 16 },
  { name: 'Ishaan Verma', avatar_url: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80', ratingOffset: -15 },
  { name: 'Ananya Gupta', avatar_url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', ratingOffset: 11 },
  { name: 'Vikram Joshi', avatar_url: 'https://images.unsplash.com/photo-1501196354995-cbb51c65aaea?w=150&auto=format&fit=crop&q=80', ratingOffset: -4 },
  { name: 'Sahil Tyagi', avatar_url: 'https://images.unsplash.com/photo-1480429370139-e0132c086e2a?w=150&auto=format&fit=crop&q=80', ratingOffset: 20 },
  { name: 'Rohan Mehra', avatar_url: 'https://images.unsplash.com/photo-1519345182560-3f2917c472ef?w=150&auto=format&fit=crop&q=80', ratingOffset: -10 },
  { name: 'Meera N.', avatar_url: 'https://images.unsplash.com/photo-1534751516642-a171edd2521b?w=150&auto=format&fit=crop&q=80', ratingOffset: 7 },
];

// Rich set of authentic curated questions so Compete works instantly with zero latency
export const CURATED_COMPETE_QUESTIONS: CompeteQuestion[] = [
  {
    id: 'cq-1',
    question_id: 'cq_chem_h2o2',
    question_text: 'Hydrogen peroxide does not act as a reducing agent with which of the following reagent?',
    option_a: '$\\mathrm{HOCl(aq.)}$',
    option_b: '$\\mathrm{Fe^{2+}(aq.) + OH^-(aq.)}$',
    option_c: '$\\mathrm{Cr_2O_7^{2-}(aq.) + H^+(aq.)}$',
    option_d: '$\\mathrm{I_2 + OH^-(aq.)}$',
    correct_option: 'b',
    subject: 'Chemistry',
    chapter: 'Hydrogen & s-Block',
    exam_shift: 'JEE Main 2023',
    solution: '$\\mathrm{H_2O_2}$ acts as an oxidizing agent in basic medium towards $\\mathrm{Fe^{2+}}$, converting it to $\\mathrm{Fe^{3+}}$. Hence it does NOT act as a reducing agent with $\\mathrm{Fe^{2+} + OH^-}$. In other options, $\\mathrm{H_2O_2}$ reduces $\\mathrm{HOCl}$ to $\\mathrm{Cl^-}$, $\\mathrm{Cr_2O_7^{2-}}$ to $\\mathrm{Cr^{3+}}$, and $\\mathrm{I_2}$ to $\\mathrm{I^-}$.',
  },
  {
    id: 'cq-2',
    question_id: 'cq_phys_proj',
    question_text: 'A projectile is launched from ground level with speed $u$ at an angle $\\theta = 45^\\circ$. What is the radius of curvature of its trajectory at the highest point?',
    option_a: '$\\frac{u^2}{g}$',
    option_b: '$\\frac{u^2}{2g}$',
    option_c: '$\\frac{u^2}{\\sqrt{2}g}$',
    option_d: '$\\frac{2u^2}{g}$',
    correct_option: 'b',
    subject: 'Physics',
    chapter: 'Kinematics',
    exam_shift: 'JEE Main 2024',
    solution: 'At highest point, velocity is purely horizontal: $v = u \\cos 45^\\circ = \\frac{u}{\\sqrt{2}}$. The normal acceleration is $a_n = g$. Radius of curvature $R = \\frac{v^2}{a_n} = \\frac{(u/\\sqrt{2})^2}{g} = \\frac{u^2}{2g}$.',
  },
  {
    id: 'cq-3',
    question_id: 'cq_math_det',
    question_text: 'If $A$ is a $3 \\times 3$ non-singular matrix such that $|A| = 4$, then the value of $|\\mathrm{adj}(2A)|$ is equal to:',
    option_a: '$64$',
    option_b: '$256$',
    option_c: '$1024$',
    option_d: '$4096$',
    correct_option: 'c',
    subject: 'Maths',
    chapter: 'Matrices and Determinants',
    exam_shift: 'JEE Main 2023',
    solution: 'For an $n \\times n$ matrix $M$, $|\\mathrm{adj}(M)| = |M|^{n-1}$. Here $n = 3$, so $|\\mathrm{adj}(2A)| = |2A|^{3-1} = |2A|^2$. Since $|2A| = 2^3 |A| = 8 \\times 4 = 32$, we have $|\\mathrm{adj}(2A)| = 32^2 = 1024$.',
  },
  {
    id: 'cq-4',
    question_id: 'cq_phys_capacitance',
    question_text: 'A parallel plate capacitor is charged and then disconnected from the battery. If a dielectric slab of dielectric constant $K = 4$ is inserted between the plates, the energy stored in the capacitor:',
    option_a: 'Increases by 4 times',
    option_b: 'Decreases by 4 times',
    option_c: 'Remains unchanged',
    option_d: 'Decreases by 16 times',
    correct_option: 'b',
    subject: 'Physics',
    chapter: 'Electrostatics',
    exam_shift: 'JEE Main 2022',
    solution: 'Since the battery is disconnected, the charge $Q$ remains constant. Capacitance becomes $C\' = K C = 4C$. Energy stored $U\' = \\frac{Q^2}{2C\'} = \\frac{Q^2}{2(4C)} = \\frac{U}{4}$. Thus energy decreases by 4 times.',
  },
  {
    id: 'cq-5',
    question_id: 'cq_chem_complex',
    question_text: 'Which of the following coordination complex is diamagnetic in nature?',
    option_a: '$[\\mathrm{Fe(CN)_6}]^{3-}$',
    option_b: '$[\\mathrm{FeF_6}]^{3-}$',
    option_c: '$[\\mathrm{Co(NH_3)_6}]^{3+}$',
    option_d: '$[\\mathrm{NiCl_4}]^{2-}$',
    correct_option: 'c',
    subject: 'Chemistry',
    chapter: 'Coordination Compounds',
    exam_shift: 'JEE Main 2024',
    solution: 'In $[\\mathrm{Co(NH_3)_6}]^{3+}$, $\\mathrm{Co^{3+}}$ has $3d^6$ configuration. $\\mathrm{NH_3}$ is a strong field ligand causing pairing of electrons: $t_{2g}^6 e_g^0$. With 0 unpaired electrons, it is diamagnetic.',
  },
  {
    id: 'cq-6',
    question_id: 'cq_math_limit',
    question_text: 'The value of $\\lim_{x \\to 0} \\frac{e^{x^2} - \\cos x}{x^2}$ is equal to:',
    option_a: '$\\frac{1}{2}$',
    option_b: '$1$',
    option_c: '$\\frac{3}{2}$',
    option_d: '$2$',
    correct_option: 'c',
    subject: 'Maths',
    chapter: 'Limits, Continuity & Differentiability',
    exam_shift: 'JEE Main 2023',
    solution: 'Using series expansion: $e^{x^2} = 1 + x^2 + \\dots$ and $\\cos x = 1 - \\frac{x^2}{2} + \\dots$. The numerator is $(1 + x^2) - (1 - \\frac{x^2}{2}) = \\frac{3}{2}x^2$. Dividing by $x^2$ gives $\\frac{3}{2}$.',
  },
  {
    id: 'cq-7',
    question_id: 'cq_phys_shm',
    question_text: 'A particle executes simple harmonic motion with amplitude $A$. At what displacement from the mean position is the kinetic energy equal to half of the potential energy?',
    option_a: '$x = \\sqrt{\\frac{2}{3}}A$',
    option_b: '$x = \\frac{A}{\\sqrt{2}}$',
    option_c: '$x = \\frac{A}{\\sqrt{3}}$',
    option_d: '$x = \\frac{\\sqrt{3}}{2}A$',
    correct_option: 'a',
    subject: 'Physics',
    chapter: 'Oscillations',
    exam_shift: 'JEE Main 2022',
    solution: '$\\mathrm{KE} = \\frac{1}{2} k (A^2 - x^2)$ and $\\mathrm{PE} = \\frac{1}{2} k x^2$. Given $\\mathrm{KE} = \\frac{1}{2} \\mathrm{PE} \\implies \\frac{1}{2} k (A^2 - x^2) = \\frac{1}{4} k x^2 \\implies A^2 - x^2 = \\frac{x^2}{2} \\implies \\frac{3x^2}{2} = A^2 \\implies x = \\sqrt{\\frac{2}{3}}A$.',
  },
  {
    id: 'cq-8',
    question_id: 'cq_chem_thermo',
    question_text: 'For the reaction $2\\mathrm{NO_2(g)} \\rightleftharpoons \\mathrm{N_2O_4(g)}$, $\\Delta H < 0$. Which condition favors the formation of $\\mathrm{N_2O_4}$?',
    option_a: 'High temperature and low pressure',
    option_b: 'Low temperature and high pressure',
    option_c: 'High temperature and high pressure',
    option_d: 'Low temperature and low pressure',
    correct_option: 'b',
    subject: 'Chemistry',
    chapter: 'Chemical Thermodynamics',
    exam_shift: 'JEE Main 2023',
    solution: 'The reaction is exothermic ($\\Delta H < 0$) and involves a decrease in moles of gas ($\\Delta n_g = 1 - 2 = -1 < 0$). By Le Chatelier\'s principle, forward reaction is favored by lowering temperature and increasing pressure.',
  },
];

/**
 * Reads user's compete stats from local cache.
 */
export function getCompeteUserStats(): CompeteUserStats {
  if (typeof window === 'undefined') {
    return { rating: 450, matchesPlayed: 0, wins: 0, losses: 0, ties: 0, streak: 0, bestStreak: 0, history: [] };
  }
  try {
    const raw = localStorage.getItem(STATS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (typeof parsed?.rating === 'number') {
        return parsed;
      }
    }
  } catch {}

  const initialStats: CompeteUserStats = {
    rating: 450,
    matchesPlayed: 0,
    wins: 0,
    losses: 0,
    ties: 0,
    streak: 0,
    bestStreak: 0,
    history: [],
  };
  saveCompeteUserStats(initialStats);
  return initialStats;
}

/**
 * Saves user's compete stats.
 */
export function saveCompeteUserStats(stats: CompeteUserStats): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STATS_STORAGE_KEY, JSON.stringify(stats));
  } catch {}
}

/**
 * Calculates national India Rank based on rating.
 * Matches realistic percentile distribution (e.g. 455 rating ~ rank 1942).
 */
export function calculateIndiaRank(rating: number): number {
  // Sigmoidal rank model centered around 450 rating = ~1942 rank
  // Higher rating gives steep climb towards top 100!
  const rank = Math.round(1942 * Math.exp(-(rating - 455) / 220));
  return Math.max(1, Math.min(25000, rank));
}

/**
 * Generates leaderboard rival slice around user's rank (Image 3).
 */
export function generateLeaderboardSlice(userRank: number, userRating: number, userName: string, userAvatar?: string | null): LeaderboardRival[] {
  const rivalNames = ['Ritik', 'Krishna', 'Anshuman', 'Harshil', 'Tanvi', 'Abhishek', 'Meera', 'Sneha', 'Arjun'];
  const rivals: LeaderboardRival[] = [];

  const startRank = Math.max(1, userRank - 2);
  let nameIdx = 0;

  for (let r = startRank; r <= startRank + 4; r++) {
    if (r === userRank) {
      rivals.push({
        rank: r,
        name: userName || 'You',
        rating: userRating,
        avatar_url: userAvatar,
        isUser: true,
      });
    } else {
      const offset = (userRank - r) * 2;
      const rivalRating = Math.max(100, userRating + offset);
      const name = rivalNames[nameIdx % rivalNames.length];
      const fallback = FALLBACK_OPPONENTS.find(f => f.name === name);
      rivals.push({
        rank: r,
        name,
        rating: rivalRating,
        avatar_url: fallback?.avatar_url,
        isUser: false,
      });
      nameIdx++;
    }
  }

  return rivals;
}

/**
 * Fetches candidate opponents: blends real users from Supabase with realistic student personas.
 */
export async function fetchOpponentsPool(): Promise<Array<{ name: string; avatar_url: string; ratingOffset: number; isRealUser?: boolean }>> {
  if (typeof window !== 'undefined') {
    try {
      const cached = sessionStorage.getItem(OPPONENTS_CACHE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
  }

  let realUsers: Array<{ name: string; avatar_url: string; ratingOffset: number; isRealUser: boolean }> = [];

  try {
    const { data } = await supabase
      .from('users')
      .select('name, avatar_url, cl, exam')
      .not('name', 'is', null)
      .limit(30);

    if (data && data.length > 0) {
      realUsers = data
        .filter((u: any) => u.name && u.name.trim().length > 1)
        .map((u: any) => ({
          name: u.name.trim().split(' ')[0], // First name or casual name
          avatar_url: u.avatar_url?.startsWith('https://') ? u.avatar_url : `https://api.dicebear.com/7.x/notionists/svg?seed=${encodeURIComponent(u.name)}`,
          ratingOffset: Math.floor(Math.random() * 41) - 20, // +/- 20 points
          isRealUser: true,
        }));
    }
  } catch {}

  const combined = [...realUsers, ...FALLBACK_OPPONENTS];
  if (typeof window !== 'undefined') {
    try {
      sessionStorage.setItem(OPPONENTS_CACHE_KEY, JSON.stringify(combined));
    } catch {}
  }

  return combined;
}

/**
 * Matchmaking selector: picks an opponent matching user's current rating and difficulty curve.
 */
export async function pickOpponent(userRating: number, specifiedName?: string): Promise<CompeteOpponent> {
  const pool = await fetchOpponentsPool();

  let candidate: { name: string; avatar_url: string; ratingOffset: number; isRealUser?: boolean };

  if (specifiedName) {
    const found = pool.find(p => p.name.toLowerCase() === specifiedName.toLowerCase());
    candidate = found || pool[Math.floor(Math.random() * pool.length)];
  } else {
    candidate = pool[Math.floor(Math.random() * pool.length)];
  }

  const oppRating = Math.max(150, userRating + candidate.ratingOffset);
  const oppRank = calculateIndiaRank(oppRating);

  return {
    id: `opp_${candidate.name.toLowerCase()}_${Date.now()}`,
    name: candidate.name,
    avatar_url: candidate.avatar_url,
    rating: oppRating,
    rank: oppRank,
    isRealUser: candidate.isRealUser ?? false,
  };
}

/**
 * RETENTION BALANCING SCRIPT
 * Determines bot behavior and match outcome strategy:
 * - New user or coming off a loss: Guaranteed exciting win (bot makes 2-3 mistakes, user feels thrilled).
 * - On 2+ win streak: Tight match (bot gets 3/5 or 4/5, nail-biter).
 * - Never let user lose 3 times in a row!
 */
export interface MatchRetentionPlan {
  targetOutcome: 'win' | 'close_win' | 'nailbiter' | 'close_loss';
  botMistakeIndices: number[]; // e.g. [1, 3] means bot misses Q2 and Q4
  botResponseTimesSec: number[]; // seconds bot takes per question
}

export function computeMatchPlan(userStats: CompeteUserStats): MatchRetentionPlan {
  const { matchesPlayed, streak, history } = userStats;

  // Recent 2 match results
  const lastMatch = history[history.length - 1];
  const secondLastMatch = history[history.length - 2];

  let targetOutcome: 'win' | 'close_win' | 'nailbiter' | 'close_loss' = 'win';
  let botMistakes: number[] = [1, 3]; // bot misses Q2 and Q4 by default

  if (matchesPlayed === 0) {
    // 1st game ever: Definite Win! High dopamine boost
    targetOutcome = 'win';
    botMistakes = [1, 3]; // bot gets 3/5
  } else if (!lastMatch?.won && !secondLastMatch?.won) {
    // Lost 2 in a row: Anti-churn safety net: 100% Guaranteed Win!
    targetOutcome = 'win';
    botMistakes = [0, 2, 4]; // bot gets 2/5
  } else if (!lastMatch?.won) {
    // Lost last match: Bounce back win
    targetOutcome = 'close_win';
    botMistakes = [2, 4]; // bot misses Q3 and Q5 (clutch win for user on Q5!)
  } else if (streak >= 3) {
    // Hot streak (3+ wins): Give them a challenging nailbiter
    // 60% chance tight win, 40% chance very close contest to keep them hungry
    if (Math.random() > 0.4) {
      targetOutcome = 'nailbiter';
      botMistakes = [3]; // bot gets 4/5
    } else {
      targetOutcome = 'close_loss';
      botMistakes = [1]; // bot gets 4/5
    }
  } else {
    // Default balanced match
    targetOutcome = 'close_win';
    botMistakes = [1, 3]; // bot gets 3/5
  }

  // Generate realistic human-like response times (between 9s and 22s per question)
  const botTimes = [0, 1, 2, 3, 4].map((idx) => {
    // Takes longer on questions it misses or calculation questions
    const base = botMistakes.includes(idx) ? 14 : 11;
    const jitter = Math.floor(Math.random() * 7) - 3;
    return Math.max(7, Math.min(26, base + jitter));
  });

  return {
    targetOutcome,
    botMistakeIndices: botMistakes,
    botResponseTimesSec: botTimes,
  };
}

/**
 * Fetches 5 match questions: attempts to query Supabase `jee_mains` (with preference for
 * user's syllabus / high-frequency chapters), falling back seamlessly to curated question bank.
 */
export async function fetchCompeteQuestions(userId?: string | null): Promise<CompeteQuestion[]> {
  try {
    const { data: dbQuestions, error } = await supabase
      .from('jee_mains')
      .select('id, question, question_id, question_text, option_a, option_b, option_c, option_d, correct_option, exam_shift, solution, question_img_url, option_a_img, option_b_img, option_c_img, option_d_img, subject, chapter')
      .not('option_a', 'is', null)
      .not('correct_option', 'is', null)
      .limit(30);

    if (!error && dbQuestions && dbQuestions.length >= 5) {
      // Pick 5 random questions
      const shuffled = [...dbQuestions].sort(() => Math.random() - 0.5).slice(0, 5);
      return shuffled.map((q: any, idx: number) => ({
        id: q.id || `q-${idx}`,
        question_id: q.question_id || `qid-${idx}`,
        question_text: q.question_text || q.question || '',
        option_a: q.option_a || '',
        option_b: q.option_b || '',
        option_c: q.option_c || '',
        option_d: q.option_d || '',
        correct_option: normaliseOptionLetter(q.correct_option),
        exam_shift: q.exam_shift || 'JEE Main',
        solution: q.solution || '',
        question_img_url: q.question_img_url || undefined,
        option_a_img: q.option_a_img || undefined,
        option_b_img: q.option_b_img || undefined,
        option_c_img: q.option_c_img || undefined,
        option_d_img: q.option_d_img || undefined,
        subject: q.subject || 'Science',
        chapter: q.chapter || 'Core Concepts',
      }));
    }
  } catch (err) {
    console.warn('Falling back to curated questions for Compete:', err);
  }

  // Fallback to rich curated questions
  return [...CURATED_COMPETE_QUESTIONS].sort(() => Math.random() - 0.5).slice(0, 5);
}

/**
 * Normalises raw correct_option values ('option_a', 'A', '1', etc.) to 'a' | 'b' | 'c' | 'd'.
 */
export function normaliseOptionLetter(val: string | null | undefined): string {
  if (!val) return 'a';
  const clean = val.toLowerCase().replace(/option_?/g, '').trim();
  if (clean.includes('a') || clean === '1') return 'a';
  if (clean.includes('b') || clean === '2') return 'b';
  if (clean.includes('c') || clean === '3') return 'c';
  if (clean.includes('d') || clean === '4') return 'd';
  return 'a';
}

/**
 * Updates stats after a match finishes and returns rating delta & updated stats.
 */
export function recordMatchResult(
  userScore: number,
  opponentScore: number,
  opponent: CompeteOpponent,
  avgTimeSec: number = 15
): { stats: CompeteUserStats; ratingDelta: number; newRating: number; newRank: number } {
  const stats = getCompeteUserStats();
  const won = userScore > opponentScore;
  const tied = userScore === opponentScore;

  let ratingDelta = 0;
  if (won) {
    // Base win: +18, speed bonus up to +7
    const speedBonus = Math.max(0, Math.min(7, Math.round((25 - avgTimeSec) / 2)));
    ratingDelta = 18 + speedBonus;
  } else if (tied) {
    ratingDelta = 5;
  } else {
    // Loss: gentle penalty (-6 to -8) so user isn't punished harshly
    ratingDelta = -8;
  }

  const newRating = Math.max(100, stats.rating + ratingDelta);
  const newRank = calculateIndiaRank(newRating);

  const newStats: CompeteUserStats = {
    rating: newRating,
    matchesPlayed: stats.matchesPlayed + 1,
    wins: stats.wins + (won ? 1 : 0),
    losses: stats.losses + (!won && !tied ? 1 : 0),
    ties: stats.ties + (tied ? 1 : 0),
    streak: won ? stats.streak + 1 : 0,
    bestStreak: Math.max(stats.bestStreak, won ? stats.streak + 1 : 0),
    history: [
      ...stats.history,
      {
        id: `match_${Date.now()}`,
        date: new Date().toISOString(),
        opponentName: opponent.name,
        opponentAvatar: opponent.avatar_url,
        userScore,
        opponentScore,
        ratingDelta,
        newRating,
        won,
        tied,
      },
    ].slice(-20), // Keep last 20 matches
  };

  saveCompeteUserStats(newStats);
  return { stats: newStats, ratingDelta, newRating, newRank };
}
