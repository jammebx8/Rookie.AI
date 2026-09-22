'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../public/src/utils/supabase';
import { syncStreakFromSupabase, readStreakFromLocal } from '../../../public/src/utils/streakUtils'; // adjust path
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import {
  fetchRecommended as fetchRecommendedQ,
  updateAbilityVector,
  getAbilitySnapshot,
  abilityLabel,
  type AbilitySnapshot,
} from '../../../lib/recommendation';



// ─── Types ───────────────────────────────────────────────────────────────────
type User = {
  id: string;
  email?: string;
  name?: string;
  exam?: string;
  cl?: string;
  [key: string]: any;
};








// ─── Motivational headlines ──────────────────────────────────────────────────
// hl: true → gradient highlight | br: true → line break | {exam} → user's exam
type Part = { t: string; hl?: boolean } | { br: true };

const MOTIVATIONS: Part[][] = [
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

const ROTATE_MS = 8000;

function MotivationHeadline({ exam }: { exam: string }) {
  const [index, setIndex] = useState(0); // 0 on server + first render → no hydration mismatch

  useEffect(() => {
    // Start on a different line each day, then rotate
    const dayOffset = Math.floor(Date.now() / 86_400_000) % MOTIVATIONS.length;
    setIndex(dayOffset);
    const id = setInterval(() => setIndex((i) => (i + 1) % MOTIVATIONS.length), ROTATE_MS);
    return () => clearInterval(id);
  }, []);

  const examLabel = exam || 'your exam';

  return (
    <div className="min-h-[7.5rem]"> {/* fixed height so the page doesn't jump between lines */}
      <AnimatePresence mode="wait">
        <motion.h1
          key={index}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.35 }}
          className="text-3xl font-bold leading-tight tracking-tight"
        >
          {MOTIVATIONS[index].map((p, i) => {
            if ('br' in p) return <br key={i} />;
            const text = p.t.replace('{exam}', examLabel);
            return p.hl ? (
              <span
                key={i}
                className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500"
              >
                {text}
              </span>
            ) : (
              <React.Fragment key={i}>{text}</React.Fragment>
            );
          })}
        </motion.h1>
      </AnimatePresence>
    </div>
  );
}






// ─── Constants ───────────────────────────────────────────────────────────────
const EXAM_OPTIONS = ['JEE Mains', 'NEET', 'JEE Advanced', 'Other'];
const CLASS_OPTIONS = ['11th', '12th', 'Dropper', 'Other'];
const SESSION_KEY = 'questionSessionResponses_v1';
const DAILY_GOAL_KEY = 'rookie_daily_goal';
const STREAK_KEY = 'rookie_streak_data';

const DAILY_GOAL_OPTIONS = [5, 10, 20, 30, 50];

const socialMediaLinks = [
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
function openExternal(url?: string) {
  if (!url || typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

function getTodayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function getYesterdayKey() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Count questions solved today from sessionResponses
function countSolvedToday(): number {
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

function computeStreak(): { current: number; longest: number; activeDays: string[] } {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (!raw) return { current: 0, longest: 0, activeDays: [] };
    return JSON.parse(raw);
  } catch {
    return { current: 0, longest: 0, activeDays: [] };
  }
}

// ─── useTheme hook ────────────────────────────────────────────────────────────
function useTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    try { setIsDark(localStorage.getItem('theme') !== 'light'); } catch {}
    const observer = new MutationObserver(() => {
      try { setIsDark(localStorage.getItem('theme') !== 'light'); } catch {}
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const onStorage = () => { try { setIsDark(localStorage.getItem('theme') !== 'light'); } catch {} };
    window.addEventListener('storage', onStorage);
    return () => { observer.disconnect(); window.removeEventListener('storage', onStorage); };
  }, []);
  return isDark;
}

function toggleTheme(isDark: boolean) {
  const next = isDark ? 'light' : 'dark';
  try {
    localStorage.setItem('theme', next);
    if (next === 'light') {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    }
    // Dispatch storage event so hook picks it up in same tab
    window.dispatchEvent(new StorageEvent('storage', { key: 'theme', newValue: next }));
  } catch {}
}

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, delay: i * 0.07 },
  }),
};

// ─── Day-of-week strip ────────────────────────────────────────────────────────
const DAYS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function getDayOfWeek() {
  // 0=Sun → map to index 6, 1=Mon → 0, etc.
  const d = new Date().getDay();
  return d === 0 ? 6 : d - 1;
}

// ─── Monthly Calendar ─────────────────────────────────────────────────────────
function MonthlyCalendar({ activeDays, isDark }: { activeDays: string[]; isDark: boolean }) {
  const [viewDate, setViewDate] = useState(new Date());
  const today = new Date();
  const todayKey = getTodayKey();

  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const monthName = viewDate.toLocaleString('default', { month: 'long' });

  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: { day: number; current: boolean }[] = [];
  for (let i = firstDay - 1; i >= 0; i--) {
    cells.push({ day: daysInPrevMonth - i, current: false });
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, current: true });
  }
  while (cells.length % 7 !== 0) {
    cells.push({ day: cells.length - daysInMonth - firstDay + 1, current: false });
  }

  const isActive = (day: number) => {
    const key = `${year}-${month + 1}-${day}`;
    return activeDays.includes(key);
  };

  const isToday = (day: number) => {
    return day === today.getDate() && month === today.getMonth() && year === today.getFullYear();
  };

  const card = isDark ? 'bg-[#0A0E17]' : 'bg-white';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const subtext = isDark ? 'text-gray-400' : 'text-gray-500';
  const border = isDark ? 'border-[#1D2939]' : 'border-gray-200';

  return (
    <div className={`mt-4 rounded-2xl ${card} border ${border} p-4`}>
      {/* Month nav */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={() => setViewDate(new Date(year, month - 1, 1))}
          className={`w-7 h-7 flex items-center justify-center rounded-full transition-all hover:bg-orange-500/10 ${subtext} hover:text-orange-500`}
        >
          ‹
        </button>
        <span className={`text-sm font-semibold ${text}`}>{monthName} {year}</span>
        <button
          onClick={() => setViewDate(new Date(year, month + 1, 1))}
          className={`w-7 h-7 flex items-center justify-center rounded-full transition-all hover:bg-orange-500/10 ${subtext} hover:text-orange-500`}
        >
          ›
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-2">
        {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((d, i) => (
          <div key={i} className={`text-center text-xs font-medium ${subtext}`}>{d}</div>
        ))}
      </div>

      {/* Date grid */}
      <div className="grid grid-cols-7 gap-y-1">
        {cells.map((cell, i) => {
          const active = cell.current && isActive(cell.day);
          const tod = cell.current && isToday(cell.day);
          return (
            <div key={i} className="flex items-center justify-center">
              <div
                className={`w-8 h-8 flex items-center justify-center rounded-xl text-xs font-medium transition-all
                  ${!cell.current ? subtext + ' opacity-30' : ''}
                  ${cell.current && !active && !tod ? text : ''}
                  ${active ? 'border-2 border-orange-500 text-orange-500 bg-orange-500/10' : ''}
                  ${tod && !active ? 'underline decoration-blue-400 decoration-2 underline-offset-2' : ''}
                  ${tod && active ? 'border-2 border-orange-500 text-orange-500 bg-orange-500/10 underline decoration-blue-400 decoration-2 underline-offset-2' : ''}
                `}
              >
                {cell.day}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Streak Card ──────────────────────────────────────────────────────────────
function StreakCard({ isDark }: { isDark: boolean }) {
  const [streakData, setStreakData] = useState({ current: 0, longest: 0, activeDays: [] as string[] });
  const [showCalendar, setShowCalendar] = useState(false);
  const [copied, setCopied] = useState(false);

  const todayIndex = getDayOfWeek();

  const reloadStreak = () => {
    setStreakData(readStreakFromLocal());
  };
  
  useEffect(() => {
    // Instant load from localStorage
    reloadStreak();
    
    // Background sync from Supabase (doesn't block UI)
    syncStreakFromSupabase();
  
    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'rookie_streak_data') reloadStreak();
    };
    window.addEventListener('storage', handleStorageChange);
  
    // Listen for visibility changes (refresh when tab becomes active)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        reloadStreak();
        syncStreakFromSupabase();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for custom streak update event from background sync
    const handleStreakUpdated = (e: Event) => {
      reloadStreak();
    };
    window.addEventListener('streakUpdated', handleStreakUpdated);
  
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('streakUpdated', handleStreakUpdated);
    };
  }, []);


  const handleShare = async () => {
    const text = `🔥 I'm on a ${streakData.current}-day streak on Rookie! Join me at https://rookie-ai.vercel.app`;
    try {
      if (navigator.share) {
        await navigator.share({ text });
      } else {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch {}
  };

  const card = isDark ? 'bg-[#0A0E17] border-[#1D2939]' : 'bg-white border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const subtext = isDark ? 'text-gray-400' : 'text-gray-500';
  const divider = isDark ? 'border-[#1D2939]' : 'border-gray-100';
  const toggleBg = isDark ? 'bg-[#111827] border-[#1D2939] hover:border-gray-600' : 'bg-gray-50 border-gray-200 hover:border-gray-300';

  return (
    <div className={`rounded-2xl border ${card} p-5 mt-4`}>
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-orange-500 leading-none">
            {streakData.current} day{streakData.current !== 1 ? 's' : ''} streak
          </h2>
        </div>
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={handleShare}
          className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all ${toggleBg}`}
          title={copied ? 'Copied!' : 'Share streak'}
        >
          {copied ? (
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M3 8l3.5 3.5L13 4" stroke="#10B981" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={subtext}>
              <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
            </svg>
          )}
        </motion.button>
      </div>

      {/* Day dots */}
      <div className="flex items-center gap-2 mb-4">
      {DAYS.map((day, i) => {
  // Calculate actual calendar date for this dot (Mon=0 ... Sun=6)
  const today = new Date();
  const todayDow = today.getDay() === 0 ? 6 : today.getDay() - 1; // Mon=0
  const diff = i - todayDow;
  const dotDate = new Date(today);
  dotDate.setDate(today.getDate() + diff);
  const dotKey = `${dotDate.getFullYear()}-${dotDate.getMonth() + 1}-${dotDate.getDate()}`;
  const isActive = streakData.activeDays.includes(dotKey);
  const isCurrent = i === todayIndex;
          return (
            <div key={i} className="flex flex-col items-center gap-1.5 flex-1">
              <div
                className={`w-full aspect-square max-w-[36px] rounded-full border-2 flex items-center justify-center transition-all
                  ${isCurrent
                    ? 'border-orange-500 bg-orange-500/10'
                    : isActive
                      ? 'border-orange-400 bg-orange-400/20'
                      : isDark ? 'border-[#1D2939] bg-transparent' : 'border-gray-200 bg-transparent'
                  }`}
              >
                {isCurrent && (
                  <div className="w-2.5 h-2.5 rounded-full border-2 border-orange-500" />
                )}
                {isActive && !isCurrent && (
                  <div className="w-2 h-2 rounded-full bg-orange-400" />
                )}
              </div>
              <span className={`text-[10px] font-medium ${isCurrent ? 'text-orange-500' : subtext}`}>{day}</span>
            </div>
          );
        })}
      </div>

      {/* Toggle calendar */}
      <motion.button
        whileTap={{ scale: 0.98 }}
        onClick={() => setShowCalendar((p) => !p)}
        className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border text-sm font-medium transition-all ${toggleBg} ${text}`}
      >
        {showCalendar ? 'Hide monthly streak' : 'View monthly streak'}
        <motion.svg
          animate={{ rotate: showCalendar ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          width="14" height="14" viewBox="0 0 14 14" fill="none"
          className={subtext}
        >
          <path d="M2 5l5 5 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </motion.svg>
      </motion.button>

      <AnimatePresence>
        {showCalendar && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden"
          >
            <MonthlyCalendar activeDays={streakData.activeDays} isDark={isDark} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Divider + Longest streak */}
      <div className={`mt-4 pt-4 border-t ${divider} flex items-end justify-between`}>
        <div>
          <p className={`text-[10px] font-bold uppercase tracking-widest ${subtext} mb-0.5`}>Longest Streak</p>
          <p className={`text-2xl font-extrabold ${text}`}>{streakData.longest} day{streakData.longest !== 1 ? 's' : ''}</p>
        </div>
        {/* Flame icon */}
        <div className="relative">
          <Image src="flame.svg" alt="Coins" width={33} height={33} />
        </div>
      </div>
    </div>
  );
}

// ─── Daily Goal Progress Bar ──────────────────────────────────────────────────
function DailyGoalBar({ isDark }: { isDark: boolean }) {
  const [goal, setGoal] = useState<number | null>(null);
  const [solved, setSolved] = useState(0);
  const [showGoalPicker, setShowGoalPicker] = useState(false);
  const [tempGoal, setTempGoal] = useState(20);

  useEffect(() => {
    const refresh = () => {
      try {
        const savedGoal = localStorage.getItem(DAILY_GOAL_KEY);
        if (savedGoal) setGoal(parseInt(savedGoal, 10));
        setSolved(countSolvedToday());
      } catch {}
    };
    refresh();
    // Re-read when the tab becomes visible again (user returns from QuestionViewer)
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    // Also re-read if another tab writes to localStorage
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('questionsToday')) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  const saveGoal = (g: number) => {
    try {
      localStorage.setItem(DAILY_GOAL_KEY, String(g));
    } catch {}
    setGoal(g);
    setShowGoalPicker(false);
  };


  const progress = goal ? Math.min(solved / goal, 1) : 0;
  const pct = Math.round(progress * 100);

  // 5 milestone icons at 0%, 25%, 50%, 75%, 100%
  const milestones = [0, 0.25, 0.5, 0.75, 1];

  const card = isDark ? 'bg-[#0A0E17] border-[#1D2939]' : 'bg-white border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const subtext = isDark ? 'text-gray-400' : 'text-gray-500';
  const trackBg = isDark ? 'bg-[#1D2939]' : 'bg-gray-100';
  const toggleBg = isDark ? 'bg-[#111827] border-[#1D2939]' : 'bg-gray-50 border-gray-200';

  return (
    <div className={`rounded-2xl border ${card} p-5`}>
      <div className="flex items-center justify-between mb-3">
        <div>
          <span className={`text-sm font-semibold ${text}`}>Daily Goal</span>
          {goal && (
            <span className={`ml-2 text-sm font-bold text-orange-500`}>
              ({solved}/{goal} Qs)
            </span>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowGoalPicker((p) => !p)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${toggleBg} ${text}`}
        >
          {goal ? 'Change' : 'Set goal'}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d="M1 3l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </motion.button>
      </div>

      <AnimatePresence>
        {showGoalPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-4 "
          >
            <div className={`p-3 rounded-xl border ${toggleBg} border-opacity-50`}>
              <p className={`text-xs font-medium mb-2.5 ${subtext}`}>Questions per day</p>
              <div className="flex gap-2 flex-wrap">
                {DAILY_GOAL_OPTIONS.map((g) => (
                  <motion.button
                    key={g}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => saveGoal(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all
                      ${goal === g
                        ? 'bg-orange-500 text-white border-orange-500'
                        : isDark
                          ? 'border-[#1D2939] text-gray-400 hover:border-orange-500/40 hover:text-orange-400'
                          : 'border-gray-200 text-gray-600 hover:border-orange-400 hover:text-orange-500'
                      }`}
                  >
                    {g} Qs
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {goal ? (
        <div className="relative">
          {/* Track */}
          <div className={`relative h-2 rounded-full ${trackBg} overflow-visible`}>
            {/* Fill */}
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
            />
          </div>

          {/* Milestone icons */}
          <div className="relative flex items-center mt-3">
            {milestones.map((m, i) => {
              const reached = progress >= m;
              const isLast = i === milestones.length - 1;
              return (
                <div
                  key={i}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${m * 100}%`, transform: 'translateX(-50%)' }}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300
                      ${reached
                        ? isLast ? 'bg-orange-500/20 border-2 border-orange-500' : 'bg-orange-500/10'
                        : isDark ? 'bg-[#1D2939]' : 'bg-gray-100'
                      }`}
                  >
                    {/* SVG icons – placeholders, user will replace from /public */}
                    {i === 0 && (
                    <Image src= "standing-man.svg" alt="Coins" width={13} height={13}  className={reached ? 'text-orange-500' : subtext }  />
                    )}
                    {i === 1 && (
                   <Image src= "athletics.svg" alt="Coins" width={16} height={16}  className={reached ? 'text-orange-500' : subtext} />
                    )}
                    {i === 2 && (
                     <Image src= "sprinter.svg" alt="Coins" width={16} height={16}  className={reached ? 'text-orange-500' : subtext} />
                    )}
                    {i === 3 && (
                     <Image src= "sprint.svg" alt="Coins" width={16} height={16}  className={reached ? 'text-orange-500' : subtext} />
                    )}
                    {i === 4 && (
                     <Image src= "checkered-flag.svg" alt="Coins" width={18} height={18}  className={reached ? 'text-orange-500' : subtext} />
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <div className="h-10" />

          {pct >= 100 && (
            <motion.p
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-xs text-center font-semibold text-orange-500 mt-1"
            >
              🎉 Daily goal complete!
            </motion.p>
          )}
        </div>
      ) : (
        <div
          className={`flex flex-col items-center justify-center py-4 rounded-xl border border-dashed text-center gap-1
            ${isDark ? 'border-[#1D2939]' : 'border-gray-200'}`}
        >
          <p className={`text-sm font-medium ${subtext}`}>Set a daily goal to track progress</p>
          <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>Stay consistent, crack your exam.</p>
        </div>
      )}
    </div>
  );
}


// ─── ContinueSection component (add to your home page file) ─────────────
// ─── ContinueSection component (updated) ─────────────────────────────
function ContinueSection({ isDark }: { isDark: boolean }) {
  const [session, setSession] = useState<{
    chapter_title: string; subject_name: string; image_key: string; question_index: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }
        
        const { data, error } = await supabase
          .from('user_recent_session')
          .select('*')
          .eq('user_id', user.id)
          .single();
        
        if (data && !error) {
          setSession(data);
        }
      } catch (err) {
        console.error('Error fetching session:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  if (loading) {
    return (
      <div className="mb-6">
        <h2 className={`text-base font-semibold mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Continue where you left off
        </h2>
        {/* Skeleton loader */}
        <div className={`w-full p-4 rounded-2xl border animate-pulse ${isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]'}`}>
          <div className="flex items-center gap-4">
            <div className={`w-10 h-10 rounded-xl flex-shrink-0 ${isDark ? 'bg-[#1e2538]' : 'bg-gray-200'}`} />
            <div className="flex-1 space-y-2">
              <div className={`h-4 rounded-lg ${isDark ? 'bg-[#1e2538]' : 'bg-gray-200'}`} style={{ width: '70%' }} />
              <div className={`h-3 rounded-lg ${isDark ? 'bg-[#1e2538]' : 'bg-gray-200'}`} style={{ width: '50%' }} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <div className="mb-6">
    <h2 className={`text-sm font-medium mb-3 ${isDark ? "text-slate-400" : "text-slate-600"}`}>
      Continue learning
    </h2>
  
    <button
      onClick={() => {
        if (!session.chapter_title) return;
  
        const params = new URLSearchParams({
          subject: session.subject_name || "",
          chapter: session.chapter_title,
          imageKey: session.image_key || "",
          index: String(session.question_index || 0),
          startIndex: String(session.question_index || 0),
        });
  
        router.push(`/QuestionViewer?${params.toString()}`);
      }}
      className={`w-full rounded-2xl p-4 transition-all duration-200 border ${
        isDark
          ? "bg-[#111827] border-[#1F2937] hover:border-[#374151] hover:bg-[#151F32]"
          : "bg-white border-[#E5E7EB] hover:border-[#CBD5E1] hover:shadow-sm"
      }`}
    >
      <div className="flex items-center gap-4">
        {/* Play icon */}
        <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center shadow-md shadow-indigo-600/20 flex-shrink-0">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="text-white ml-0.5"
          >
            <path d="M8 5v14l11-7z" />
          </svg>
        </div>
  
        {/* Content */}
        <div className="flex-1 min-w-0 text-left">
          <p className={`text-xs font-medium mb-1 ${isDark ? "text-slate-400" : "text-slate-500"}`}>
            {session.subject_name}
          </p>
  
          <h3 className={`font-semibold truncate ${isDark ? "text-white" : "text-slate-900"}`}>
            {session.chapter_title}
          </h3>
  
          <div className="flex items-center gap-2 mt-2">
            <div
              className={`h-1.5 flex-1 rounded-full ${
                isDark ? "bg-slate-700" : "bg-slate-200"
              }`}
            >
              <div
                className="h-full rounded-full bg-indigo-600"
                style={{
                  width: `${Math.min(((session.question_index + 1) / 30) * 100, 100)}%`,
                }}
              />
            </div>
  
            <span
              className={`text-[11px] font-medium ${
                isDark ? "text-slate-400" : "text-slate-500"
              }`}
            >
              Q{session.question_index + 1}
            </span>
          </div>
        </div>
  
        {/* Chevron */}
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={isDark ? "text-slate-500" : "text-slate-400"}
        >
          <path d="M9 18l6-6-6-6" />
        </svg>
      </div>
    </button>
  </div>
  );
}

function renderLatex(text: string | null | undefined): React.ReactNode {
  if (!text) return null;
  return text.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/).map((part, i) => {
    if (part.startsWith('$$') && part.endsWith('$$')) return <BlockMath key={i} math={part.slice(2, -2)} />;
    if (part.startsWith('$') && part.endsWith('$'))   return <InlineMath key={i} math={part.slice(1, -1)} />;
    return <span key={i}>{part}</span>;
  });
}

function CheckIconSmall() {
  return (
    <svg width="13" height="10" viewBox="0 0 14 11" fill="none" style={{ flexShrink: 0 }}>
      <path d="M1 5.5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RecommendedQuestionCard({ isDark }: { isDark: boolean }) {
  const [question, setQuestion]                   = useState<any | null>(null);
  const [loading, setLoading]                     = useState(true);
  const [errored, setErrored]                     = useState(false);
  const [selectedOption, setSelectedOption]       = useState<string | null>(null);
  const [isCorrect, setIsCorrect]                 = useState<boolean | null>(null);
  const [determiningAnswer, setDeterminingAnswer] = useState(false);
  // ability snapshot drives the context row beneath the card title
  const [snapshot, setSnapshot]                   = useState<AbilitySnapshot | null>(null);
  const router = useRouter();

  useEffect(() => {
    const load = async () => {
      setLoading(true); setErrored(false);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        // Fetch question + ability snapshot in parallel
        const [q, snap] = await Promise.all([
          fetchRecommendedQ(user.id, []),
          getAbilitySnapshot(user.id),
        ]);

        if (q) setQuestion(q);
        else setErrored(true);
        setSnapshot(snap);
      } catch (err) {
        console.error('Recommended question error:', err);
        setErrored(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleOptionClick = async (optKey: string) => {
    if (selectedOption !== null || !question) return;
    setSelectedOption(optKey);

    let correctOpt: string | null = question.correct_option ?? null;

    if (!correctOpt) {
      setDeterminingAnswer(true);
      try {
        const axiosLib = await import('axios');
        const res = await axiosLib.default.post('https://rookie-backend.vercel.app/api/solution', {
          action: 'determine_answer',
          question_text: question.question_text,
          option_A: question.option_a, option_B: question.option_b,
          option_C: question.option_c, option_D: question.option_d,
          solution: question.solution,
        });
        const raw: string = res.data.correct_answer || '';
        const normalised = raw.replace(/option_?/gi, '').replace(/[^a-dA-D]/g, '').slice(0, 1).toLowerCase();
        correctOpt = normalised || raw.trim();
        await supabase.from('jee_mains').update({ correct_option: correctOpt }).eq('question_id', question.question_id);
        setQuestion((prev: any) => ({ ...prev, correct_option: correctOpt }));
      } catch {}
      finally { setDeterminingAnswer(false); }
    }

    const normalize = (v: string | null) =>
      v?.replace(/option_?/gi, '').replace(/[^a-dA-D]/g, '').slice(0, 1).toLowerCase() ?? '';
    const correct = normalize(optKey) === normalize(correctOpt);
    setIsCorrect(correct);

    // Record attempt + update ability vector (both fire-and-forget)
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        supabase.from('attempts').insert({
          student_id:    user.id,
          question_id:   question.question_id,
          correct,
          time_taken_sec: 0,
        }).then(() => {});
        // Update the embedding-based ability vector so next recommendation improves
        updateAbilityVector(user.id, question.question_id, correct);
      }
    } catch {}
  };

  const goToPractice = () => {
    if (!question) return;
    const params = new URLSearchParams({
      mode:    'recommended',
      qid:     question.question_id,
      subject: question.subject || '',
      chapter: question.chapter  || '',
    });
    router.push(`/practice?${params.toString()}`);
  };

  // ── Theme shortcuts ───────────────────────────────────────────────────────
  const cardBg   = isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]';
  const skelBg   = isDark ? 'bg-[#1e2538]' : 'bg-gray-200';
  const optIdle  = isDark
    ? 'bg-[#0d1117] border-[#1e2538] hover:border-white text-white cursor-pointer'
    : 'bg-white border-[#E5E7EB] hover:border-black text-[#0f172a] cursor-pointer';
  const optLabel = isDark
    ? 'bg-[#151B27] border-[#262F4C] text-slate-200'
    : 'bg-[#F3F4F6] border-[#D1D5DB] text-[#374151]';
  const mutedCls = isDark ? 'text-slate-500' : 'text-slate-400';

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mb-6">
        {/* Title row skeleton */}
        <div className="flex items-center justify-between mb-3">
          <div className={`h-5 w-36 rounded-lg animate-pulse ${skelBg}`} />
          <div className={`h-4 w-20 rounded-full animate-pulse ${skelBg}`} />
        </div>
        <div className={`w-full p-5 rounded-2xl border animate-pulse ${cardBg}`}>
          <div className="flex items-center gap-2 mb-3">
            <div className={`h-5 w-24 rounded-full ${skelBg}`} />
            <div className={`h-5 w-16 rounded-full ${skelBg}`} />
          </div>
          <div className={`h-4 rounded-lg mb-2 ${skelBg}`} style={{ width: '90%' }} />
          <div className={`h-4 rounded-lg mb-4 ${skelBg}`} style={{ width: '70%' }} />
          <div className="space-y-2">
            {[0, 1, 2, 3].map(i => <div key={i} className={`h-11 rounded-xl ${skelBg}`} />)}
          </div>
        </div>
      </div>
    );
  }

  if (errored || !question) return null;

  const opts = (['a','b','c','d'] as const).map(k => ({
    key: k,
    text: question[`option_${k}`]     ?? null,
    img:  question[`option_${k}_img`] ?? null,
  })).filter(o => o.text || o.img);

  // Ability label for the small accuracy chip in the title row
  const accLabel = snapshot && snapshot.totalAttempts >= 3
    ? abilityLabel(snapshot.accuracy)
    : null;

  // Top weak chapter (if any) for the "why this question" hint
  const topWeak = snapshot?.weakChapters?.[0] ?? null;

  // Is this question from a weak chapter?
  const isWeakChapter = topWeak
    && question.chapter
    && topWeak.chapter.replace(/\.$/, '').toLowerCase() === question.chapter.replace(/\.$/, '').toLowerCase();

  return (
    <div className="mb-6">

      {/* ── Title row ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className={`text-base font-semibold ${isDark ? 'text-white' : 'text-gray-900'}`}>
          Recommended for you
        </h2>
        {accLabel && (
          <span
            className="text-[10px] font-bold px-2.5 py-1 rounded-full border"
            style={{
              color:            accLabel.color,
              borderColor:      accLabel.color + '44',
              backgroundColor:  accLabel.color + '18',
            }}
          >
            {accLabel.emoji} {accLabel.label}
          </span>
        )}
      </div>

      {/* ── Weak-chapter hint ─────────────────────────────────────────────── */}
      {topWeak && snapshot && snapshot.totalAttempts >= 5 && (
        <motion.div
          initial={{ opacity: 0, y: -4 }}
          animate={{ opacity: 1, y: 0 }}
          className={`flex items-center gap-2 px-3 py-2 rounded-xl mb-3 text-xs font-medium border ${
            isDark
              ? 'bg-rose-500/10 border-rose-500/20 text-rose-300'
              : 'bg-rose-50 border-rose-200 text-rose-700'
          }`}
        >
          {/* Target icon */}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/>
          </svg>
          <span>
            Targeting your weak area:{' '}
            <strong>{topWeak.chapter.replace(/\.$/, '')}</strong>
            {' '}—{' '}
            {Math.round((1 - topWeak.accuracy) * 100)}% wrong in {topWeak.total} attempts
          </span>
        </motion.div>
      )}

      {/* ── Question card ─────────────────────────────────────────────────── */}
      <div className={`w-full p-5 rounded-2xl border ${cardBg}`}>

        {/* Chapter + subject badges */}
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {question.chapter && (
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
              isWeakChapter
                ? isDark
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                  : 'bg-rose-50 text-rose-600 border border-rose-200'
                : isDark
                  ? 'bg-indigo-500/15 text-indigo-400'
                  : 'bg-indigo-50 text-indigo-600'
            }`}>
              {isWeakChapter && '🎯 '}{question.chapter}
            </span>
          )}
          {question.subject && (
            <span className={`text-xs ${mutedCls}`}>
              {question.subject}
            </span>
          )}
          {/* Cold-start chip when not enough data yet */}
          {snapshot && snapshot.totalAttempts < 5 && (
            <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
              isDark
                ? 'bg-indigo-500/10 border-indigo-500/20 text-indigo-400'
                : 'bg-indigo-50 border-indigo-200 text-indigo-600'
            }`}>
              Warming up…
            </span>
          )}
        </div>

        {/* Question text */}
        <div className={`text-sm leading-relaxed mb-4 ${isDark ? 'text-gray-100' : 'text-gray-900'}`}>
          {renderLatex(question.question_text)}
        </div>

        {/* Question image */}
        {question.question_img_url && (
          <div className={`rounded-xl border overflow-hidden flex items-center justify-center mb-4 max-h-52 ${
            isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-gray-50 border-gray-200'
          }`}>
            <img src={question.question_img_url} alt="Question" className="max-h-44 max-w-full object-contain" />
          </div>
        )}

        {/* ── MCQ options ─────────────────────────────────────────────────── */}
        {selectedOption === null ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {opts.map(opt => (
              <motion.button
                key={opt.key} whileTap={{ scale: 0.98 }}
                onClick={() => handleOptionClick(opt.key)}
                className={`w-full text-left rounded-xl p-3.5 border flex items-start gap-3 transition-all ${optIdle}`}
              >
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-semibold text-sm uppercase flex-shrink-0 ${optLabel}`}>
                  {opt.key}
                </div>
                <div className="flex-1 min-w-0 text-sm leading-relaxed pt-0.5">
                  {opt.img
                    ? <img src={opt.img} alt={`opt-${opt.key}`} className="max-h-16 rounded-lg" />
                    : renderLatex(opt.text)}
                </div>
              </motion.button>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-4">
            {opts.map(opt => {
              const sel        = selectedOption === opt.key;
              const storedCorr = (question.correct_option ?? '')
                .replace(/option_?/gi, '').replace(/[^a-dA-D]/g, '').slice(0, 1).toLowerCase();
              const corr = opt.key === storedCorr;
              return (
                <motion.div
                  key={opt.key}
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                  className={`rounded-xl p-3.5 flex items-start gap-3 border-2 transition-colors ${
                    corr ? 'bg-[#04271C] border-[#1DC97A]'
                         : sel ? 'bg-[#2D0A0A] border-[#DC2626]'
                         : isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm uppercase flex-shrink-0 ${
                    corr ? 'bg-[#1DC97A] text-black'
                         : sel ? 'bg-[#DC2626] text-white'
                         : optLabel
                  }`}>
                    {opt.key}
                  </div>
                  <div className={`flex-1 min-w-0 text-sm leading-relaxed pt-0.5 ${corr || sel ? 'text-white' : ''}`}>
                    {opt.img
                      ? <img src={opt.img} alt={`opt-${opt.key}`} className="max-h-16 rounded-lg" />
                      : renderLatex(opt.text)}
                  </div>
                  {corr && <CheckIconSmall />}
                </motion.div>
              );
            })}
          </div>
        )}

        {/* Determining answer spinner */}
        {determiningAnswer && (
          <div className={`flex items-center gap-2 mb-3 text-xs ${mutedCls}`}>
            <div className="w-3.5 h-3.5 rounded-full border-2 border-current border-t-transparent animate-spin" />
            Checking answer…
          </div>
        )}

        {/* Verdict */}
        {isCorrect !== null && !determiningAnswer && (
          <motion.div
            initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
            className="mb-3"
          >
            <p className={`text-xs font-semibold ${isCorrect ? 'text-[#1DC97A]' : 'text-[#f87171]'}`}>
              {isCorrect ? '✓ Correct!' : '✗ Not quite — keep going'}
            </p>
            {/* After answering, show the adaptation hint */}
            {topWeak && snapshot && snapshot.totalAttempts >= 3 && (
              <p className={`text-[10px] mt-1 ${mutedCls}`}>
                Algorithm updated · next question stays close to your weak areas
              </p>
            )}
          </motion.div>
        )}

        {/* CTA button */}
        <motion.button
          whileTap={{ scale: 0.98 }}
          onClick={goToPractice}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all ${
            isDark
              ? 'bg-white text-black hover:bg-gray-100'
              : 'bg-gray-900 text-white hover:bg-gray-800'
          }`}
        >
          {selectedOption ? 'See full solution' : 'Start solving'}
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </motion.button>

      </div>
    </div>
  );
}

// ─── Theme Toggle Button ──────────────────────────────────────────────────────
function ThemeToggle({ isDark }: { isDark: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.92 }}
      onClick={() => toggleTheme(isDark)}
      className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all
        ${isDark
          ? 'bg-[#0A0E17] border-[#1D2939] hover:border-gray-600'
          : 'bg-white border-gray-200 hover:border-gray-300 shadow-sm'
        }`}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      <AnimatePresence mode="wait">
        {isDark ? (
          <motion.svg key="sun" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.2 }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="5" />
            <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
            <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
            <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
            <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
          </motion.svg>
        ) : (
          <motion.svg key="moon" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.2 }}
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#374151" strokeWidth="2" strokeLinecap="round">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </motion.svg>
        )}
      </AnimatePresence>
    </motion.button>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();
  const isDark = useTheme();

  const [user, setUser] = useState<User | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [cl, setcl] = useState('');
  const [exam, setExam] = useState('');
  const [saving, setSaving] = useState(false);

  // Apply body background on theme change
  useEffect(() => {
    if (typeof document === 'undefined') return;
    document.body.style.backgroundColor = isDark ? '#000000' : '#F9FAFB';
  }, [isDark]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const cached = localStorage.getItem('@user');
      if (!cached) return;
      const parsed: User = JSON.parse(cached);
      setUser(parsed);
      if (!parsed.cl || !parsed.exam) {
        setShowProfileModal(true);
      } else {
        setcl(parsed.cl || '');
        setExam(parsed.exam || '');
      }
    } catch {}
  }, []);

  const saveProfile = async () => {
    if (!cl || !exam) { alert('Please select your class and exam'); return; }
    if (!user) { alert('No user loaded'); return; }
    try {
      setSaving(true);
      const { error } = await supabase.from('users').update({ cl, exam }).eq('id', user.id);
      if (error) throw error;
      const updated = { ...user, cl, exam };
      localStorage.setItem('@user', JSON.stringify(updated));
      setUser(updated);
      setShowProfileModal(false);
    } catch (err: any) {
      alert(err?.message ?? 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const inviteFriends = async () => {
    const link = 'https://rookie-ai.vercel.app';
    const text = `Hey! 👋 Join me on Rookie to study smarter together 🚀\n${link}`;
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try { await (navigator as any).share({ title: 'Rookie', text, url: link }); return; } catch {}
    }
    const encoded = encodeURIComponent(text);
    if (typeof window !== 'undefined') {
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = `whatsapp://send?text=${encoded}`;
        setTimeout(() => window.open(`https://wa.me/?text=${encoded}`, '_blank'), 800);
        return;
      }
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  };

  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || null;

  // ── Theme-aware class shortcuts ──
  const bg = isDark ? 'bg-[#000000]' : 'bg-[#F9FAFB]';
  const card = isDark ? 'bg-[#0A0E17] border-[#1D2939]' : 'bg-white border-gray-200';
  const text = isDark ? 'text-white' : 'text-gray-900';
  const subtext = isDark ? 'text-gray-400' : 'text-gray-500';
  const border = isDark ? 'border-[#1D2939]' : 'border-gray-200';
  const modalBg = isDark ? 'bg-[#0A0E17] border-[#1D2939]' : 'bg-white border-gray-200';
  const pillInactive = isDark
    ? 'bg-transparent border-[#1D2939] text-gray-400 hover:border-gray-500'
    : 'bg-transparent border-gray-200 text-gray-500 hover:border-gray-400';
  const pillActive = isDark ? 'bg-white text-black border-white' : 'bg-gray-900 text-white border-gray-900';

  return (
    <main className={`min-h-screen ${bg} ${text} transition-colors duration-300`}>

      {/* ─── Profile Completion Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className={`w-full max-w-md ${modalBg} border rounded-2xl p-6`}
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
            >
              <h3 className={`${text} text-lg font-bold mb-1`}>Complete your profile</h3>
              <p className={`text-sm ${subtext} mb-5`}>
                A couple of details to personalise your experience.
              </p>

              <label className={`block text-xs font-semibold ${subtext} uppercase tracking-wider mb-2`}>
                Class
              </label>
              <div className="flex flex-wrap gap-2 mb-5">
                {CLASS_OPTIONS.map((g) => (
                  <motion.button
                    key={g}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setcl(g)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      cl === g ? pillActive : pillInactive
                    }`}
                  >
                    {g}
                  </motion.button>
                ))}
              </div>

              <label className={`block text-xs font-semibold ${subtext} uppercase tracking-wider mb-2`}>
                Target Exam
              </label>
              <div className="flex flex-wrap gap-2 mb-7">
                {EXAM_OPTIONS.map((e) => (
                  <motion.button
                    key={e}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setExam(e)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      exam === e ? pillActive : pillInactive
                    }`}
                  >
                    {e}
                  </motion.button>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className={`px-4 py-2 rounded-xl text-sm ${subtext} border ${border} hover:border-gray-500 transition-colors`}
                >
                  Skip
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={saveProfile}
                  disabled={saving}
                  className={`px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-60 transition-all
                    ${isDark ? 'bg-white text-black' : 'bg-gray-900 text-white'}`}
                >
                  {saving ? 'Saving…' : 'Continue'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Page Body ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="px-4 sm:px-6 pb-10 lg:px-8 lg:ml-12"
      >
        {/* Desktop: center column scrolls, right rail (streak/rank) stays sticky.
            Mobile: falls back to the original single stacked column. */}
        <div className="lg:flex lg:gap-8 lg:items-start lg:max-w-6xl lg:mx-auto">
        <div className="flex-1 min-w-0 max-w-2xl mx-auto lg:mx-0">

        {/* ── Greeting Hero ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="pt-6"
        >
    <div className="flex items-start justify-between">
  <div>
    <p className={`${subtext} text-sm mb-1`}>
      {getGreeting()}{firstName ? `, ${firstName}` : ', learner'} 👋
    </p>

    <MotivationHeadline exam={exam} />
  </div>
</div>

          {(cl || exam) && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {cl && (
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${card} ${text}`}>
                  {cl}
                </span>
              )}
              {exam && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-500">
                  {exam}
                </span>
              )}
              <button
                onClick={() => setShowProfileModal(true)}
                className={`text-xs ${isDark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'} transition-colors underline underline-offset-2`}
              >
                Edit
              </button>
            </div>
          )}
        </motion.section>

        {/* ── Streak & Daily Goal ── */}
        {/* Mobile only — same cards are shown in the sticky right rail on desktop */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="mt-6 space-y-3 lg:hidden"
        >
          <StreakCard isDark={isDark} />
          <DailyGoalBar isDark={isDark} />
        </motion.section>

        {/* ── Continue Where You Left Off ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="mt-6"
        >
          <ContinueSection isDark={isDark} />
        </motion.section>

        {/* ── Recommended For You ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="mt-2"
        >
          <RecommendedQuestionCard isDark={isDark} />
        </motion.section>

        {/* ── Invite Friends ── */}

        {/* ── Invite Friends ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={6}
          className="mt-8"
        >
          <div className="rounded-2xl relative overflow-hidden bg-gradient-to-r from-[#0F7E6B] to-[#2E5BFF] p-5 flex items-center gap-4">
          <div className="flex-1 min-w-0 z-10 pb-14">
              <h3 className="text-white font-bold text-base leading-snug">
                Study with your friends!
              </h3>
              <p className="text-white/75 text-sm mt-1 leading-relaxed">
                Invite friends to Rookie and learn together.
              </p>
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />

            
            <div className="absolute right-12 -bottom-8 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

        
              <motion.button
  whileTap={{ scale: 0.97 }}
  onClick={inviteFriends}
  className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-full text-sm font-bold shadow-md"
>
 
  Invite Now 
  <img src="/arrow.png" alt="invite" className="w-4 h-4" />
</motion.button>
            </div>

            <div className="w-58 h-40 relative hidden sm:block flex-shrink-0 z-10">
              <Image
                src="/invite_friends.png"
                alt="Invite friends"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
        </motion.section>

        <motion.section
  variants={fadeUp}
  initial="hidden"
  animate="visible"
  custom={7}
  className="mt-5"
>
  <div className="rounded-2xl p-5 bg-[#F05A24] relative overflow-hidden">

    {/* Background circles */}
    <div className="absolute -left-8 -bottom-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
    <div className="absolute right-2 -top-8 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />


    <h3 className="text-white font-bold text-base text-center relative z-10">
      We're on social media
    </h3>

    <p className="text-white/75 text-sm text-center mt-1 relative z-10">
      Follow us and share with your friends.
    </p>

    {/* 🆕 Image BEFORE buttons */}
    <div className="flex justify-center mt-6 relative z-10">
      <Image
        src="/social_illustration.png"   // your image path
        alt="Social media"
        width={240}
        height={240}
        className="object-contain"
      />
    </div>

    {/* Buttons */}
    <div className="flex flex-wrap justify-center gap-3 mt-4 relative z-10">
      {socialMediaLinks.map((item) => (
        <motion.button
          key={item.label}
          whileTap={{ scale: 0.96 }}
          onClick={() => openExternal(item.url)}
          className="flex items-center gap-2.5 bg-white rounded-xl px-4 py-2.5 w-[148px] justify-start shadow-sm hover:shadow-md transition-shadow"
          aria-label={`Open ${item.label}`}
        >
          <div className="w-5 h-5 relative flex-shrink-0">
            <Image
              src={item.icon}
              alt={item.label}
              fill
              style={{ objectFit: 'contain' }}
            />
          </div>
          <span className="text-sm font-semibold text-black">
            {item.label}
          </span>
        </motion.button>
      ))}
    </div>

  </div>
</motion.section>

        {/* ── Footer ── */}
        <motion.footer
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={8}
          className={`mt-10 border-t pt-8 pb-4 ${isDark ? 'border-[#1D2939]' : 'border-gray-200'}`}
        >
          {/* Top row: logo + tagline + social icons */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-3">
              <div className="relative w-9 h-9 flex-shrink-0">
                <Image src="/lg.png" alt="Rookie" fill style={{ objectFit: 'contain' }} />
              </div>
              <div>
               
                <p className={`font-bold text-sm leading-none ${text}`}>Rookie</p>
                <p className={`text-xs mt-0.5 ${subtext}`}>AI-powered exam prep</p>
              </div>
            </div>

          
          </div>

          {/* Nav links */}
          <div className="flex flex-wrap gap-x-5 gap-y-2 mb-6">
            {[
              { label: 'Practice', path: '/explore' },
              { label: 'Leaderboard', path: '/leaderboard' },
              { label: 'Bookmarks', path: '/bookmark' },
              { label: 'Settings', path: '/profile' },
            ].map((link) => (
              <button
                key={link.label}
                onClick={() => router.push(link.path)}
                className={`text-xs font-medium transition-colors
                  ${isDark ? 'text-gray-500 hover:text-gray-300' : 'text-gray-500 hover:text-gray-800'}`}
              >
                {link.label}
              </button>
            ))}
          </div>

          {/* Bottom bar */}
          <div className={`pt-4 border-t ${isDark ? 'border-[#1D2939]' : 'border-gray-100'} flex items-center justify-between flex-wrap gap-2`}>
            <p className={`text-xs ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
              © {new Date().getFullYear()} Rookie. All rights reserved.
            </p>
            <div className="flex items-center gap-4">
              <button className={`text-xs transition-colors ${isDark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}>
                Privacy
              </button>
              <button className={`text-xs transition-colors ${isDark ? 'text-gray-600 hover:text-gray-400' : 'text-gray-400 hover:text-gray-600'}`}>
                Terms
              </button>
            </div>
          </div>
        </motion.footer>

        {/* bottom nav spacer */}
        <div className="h-4" />
        </div>
        {/* ── Desktop right rail: streak + daily goal, sticky while center scrolls ── */}
        <aside className="hidden lg:block w-[280px]">
          <div className="fixed top-16 w-[300px] space-y-5">
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={0}>
              <StreakCard isDark={isDark} />
            </motion.div>
            <motion.div variants={fadeUp} initial="hidden" animate="visible" custom={1}>
              <DailyGoalBar isDark={isDark} />
            </motion.div>
          </div>
        </aside>
        </div>
      </motion.div>
    </main>
  );
}
