'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, Zap, Flame, Gem, Trophy } from 'lucide-react';
import { supabase } from '../../../public/src/utils/supabase';
import { syncStreakFromSupabase, readStreakFromLocal } from '../../../public/src/utils/streakUtils'; // adjust path
import { hasRookiePass, getPassExpiry, triggerCheckout, bustPassCache } from '../../../lib/rookiePass';
import 'katex/dist/katex.min.css';
import { renderContent } from '../../components/renderContent';
import {
  fetchRecommended as fetchRecommendedQ,
  updateAbilityVector,
} from '../../../lib/recommendation';
import {
  shouldShowSurvey,
  saveSurvey,
  ALL_SURVEY_CHAPTERS,
} from '../../../lib/adaptivePractice';



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
const DAILY_GOAL_CUSTOM_KEY = 'rookie_daily_goal_custom';

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
  const [customInput, setCustomInput] = useState('');
  const [customError, setCustomError] = useState('');

  useEffect(() => {
    const refresh = () => {
      try {
        const savedGoal = localStorage.getItem(DAILY_GOAL_KEY);
        if (savedGoal) setGoal(parseInt(savedGoal, 10));
        setSolved(countSolvedToday());
      } catch {}
    };
    refresh();
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVisible);
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
    try { localStorage.setItem(DAILY_GOAL_KEY, String(g)); } catch {}
    setGoal(g);
    setShowGoalPicker(false);
    setCustomInput('');
    setCustomError('');
  };

  const handleCustomSubmit = () => {
    const val = parseInt(customInput, 10);
    if (isNaN(val) || val < 1) { setCustomError('Enter a number ≥ 1'); return; }
    if (val > 500) { setCustomError('Max 500 questions'); return; }
    saveGoal(val);
  };

  const progress = goal ? Math.min(solved / goal, 1) : 0;
  const pct = Math.round(progress * 100);

  // Derive a single fill color that smoothly transitions red → orange → yellow → green
  // as pct goes 0 → 100. We interpolate between color stops.
  const getFillColor = (p: number): string => {
    // stops: 0%=#ef4444, 33%=#f97316, 66%=#eab308, 100%=#22c55e
    const stops: [number, [number,number,number]][] = [
      [0,   [239, 68,  68]],   // red
      [33,  [249, 115, 22]],   // orange
      [66,  [234, 179,  8]],   // yellow
      [100, [34,  197, 94]],   // green
    ];
    for (let i = 0; i < stops.length - 1; i++) {
      const [s1, c1] = stops[i];
      const [s2, c2] = stops[i + 1];
      if (p <= s2) {
        const t = (p - s1) / (s2 - s1);
        const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
        const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
        const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
        return `rgb(${r},${g},${b})`;
      }
    }
    return 'rgb(34,197,94)';
  };

  const fillColor = getFillColor(pct);

  const card     = isDark ? 'bg-[#0A0E17] border-[#1D2939]' : 'bg-white border-gray-200';
  const text     = isDark ? 'text-white' : 'text-gray-900';
  const subtext  = isDark ? 'text-gray-400' : 'text-gray-500';
  const trackBg  = isDark ? 'bg-[#1D2939]' : 'bg-gray-200';
  const toggleBg = isDark ? 'bg-[#111827] border-[#1D2939]' : 'bg-gray-50 border-gray-200';

  // Milestone 5 SVG icons — fully inline, no PNG/Image dependency
  const MILESTONE_ICONS = [Sparkles, Zap, Flame, Gem, Trophy] as const;

  const MilestoneIcon = ({ index, reached }: { index: number; reached: boolean }) => {
    const milestoneColor = getFillColor(milestones[index] * 100);
    const col    = reached ? milestoneColor : (isDark ? '#334155' : '#94a3b8');
    const Icon   = MILESTONE_ICONS[index];
    return (
      <Icon
        size={14}
        color={col}
        fill={reached ? col : 'none'}
        fillOpacity={reached ? 0.25 : 0}
        strokeWidth={1.8}
      />
    );
  };

  const milestones = [0, 0.25, 0.5, 0.75, 1];
  const isCustomGoal = goal !== null && !DAILY_GOAL_OPTIONS.includes(goal);

  return (
    <div className={`rounded-2xl border ${card} p-5`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#f97316' : '#ea580c'} strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>
          </svg>
          <span className={`text-sm font-semibold ${text}`}>Daily Goal</span>
          {goal && (
            <span className="text-sm font-bold tabular-nums" style={{ color: fillColor }}>
              {solved}/{goal}
            </span>
          )}
        </div>
        <motion.button
          whileTap={{ scale: 0.95 }}
          onClick={() => { setShowGoalPicker((p) => !p); setCustomError(''); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition-all ${toggleBg} ${text}`}
        >
          {goal ? 'Change' : 'Set goal'}
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <path d={showGoalPicker ? 'M1 7l4-4 4 4' : 'M1 3l4 4 4-4'} stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </motion.button>
      </div>

      {/* Goal picker */}
      <AnimatePresence>
        {showGoalPicker && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden mb-4"
          >
            <div className={`p-3 rounded-xl border ${toggleBg}`}>
              <p className={`text-xs font-medium mb-2.5 ${subtext}`}>Questions per day</p>
              <div className="flex gap-2 flex-wrap mb-3">
                {DAILY_GOAL_OPTIONS.map((g) => (
                  <motion.button
                    key={g} whileTap={{ scale: 0.95 }}
                    onClick={() => saveGoal(g)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                      goal === g
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

              {/* Custom input */}
              <div className={`pt-2.5 border-t ${isDark ? 'border-[#1D2939]' : 'border-gray-200'}`}>
                <p className={`text-xs font-medium mb-2 ${subtext}`}>Custom goal</p>
                <div className="flex gap-2 items-center">
                  <input
                    type="number"
                    min={1}
                    max={500}
                    placeholder="e.g. 15"
                    value={customInput}
                    onChange={(e) => { setCustomInput(e.target.value); setCustomError(''); }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleCustomSubmit(); }}
                    className={`flex-1 px-3 py-1.5 rounded-lg text-xs font-semibold border outline-none transition-all
                      ${isCustomGoal && customInput === '' ? 'border-orange-500' : ''}
                      ${isDark
                        ? 'bg-[#0A0E17] border-[#1D2939] text-white placeholder-gray-600 focus:border-orange-500/60'
                        : 'bg-white border-gray-200 text-gray-800 placeholder-gray-400 focus:border-orange-400'
                      }`}
                  />
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleCustomSubmit}
                    className="px-3 py-1.5 rounded-lg text-xs font-bold bg-orange-500 text-white hover:bg-orange-600 transition-colors"
                  >
                    Set
                  </motion.button>
                </div>
                {customError && (
                  <p className="text-[10px] text-red-400 mt-1.5">{customError}</p>
                )}
                {isCustomGoal && (
                  <p className={`text-[10px] mt-1.5 ${isDark ? 'text-orange-400' : 'text-orange-500'}`}>
                    Current custom goal: {goal} Qs
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {goal ? (
        <div className="relative">
          {/* Track — plain neutral color; fill transitions red→green */}
          <div className={`relative h-2.5 rounded-full overflow-hidden ${trackBg}`}>
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.7, ease: 'easeOut' }}
              className="absolute inset-y-0 left-0 rounded-full"
              style={{ backgroundColor: fillColor }}
            />
          </div>

          {/* Milestone icons */}
          <div className="relative flex items-center mt-4">
            {milestones.map((m, i) => {
              const reached = progress >= m - 0.01;
              const isLast = i === milestones.length - 1;
              // bubble color tracks the fill color interpolation at each milestone's position
              const milestoneColor = getFillColor(m * 100);
              return (
                <div
                  key={i}
                  className="absolute flex flex-col items-center"
                  style={{ left: `${m * 100}%`, transform: 'translateX(-50%)' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                    style={reached ? {
                      backgroundColor: `${milestoneColor}22`,
                      boxShadow: isLast ? `0 0 0 2px ${milestoneColor}55` : 'none',
                    } : {
                      backgroundColor: isDark ? '#1D2939' : '#f3f4f6',
                    }}
                  >
                    <MilestoneIcon index={i} reached={reached} />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Spacer for milestone icons */}
          <div className="h-10" />

          {pct >= 100 && (
            <motion.div
              initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-center gap-1.5 mt-1"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4L12 14.01l-3-3"/>
              </svg>
              <span className="text-xs font-semibold text-green-500">Daily goal complete</span>
            </motion.div>
          )}
        </div>
      ) : (
        <div className={`flex flex-col items-center justify-center py-5 rounded-xl border border-dashed text-center gap-1.5 ${isDark ? 'border-[#1D2939]' : 'border-gray-200'}`}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={isDark ? '#334155' : '#94a3b8'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2" fill={isDark ? '#334155' : '#94a3b8'}/>
          </svg>
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
        className={`w-full rounded-xl p-3.5 transition-colors border ${
          isDark
            ? "bg-[#111827] border-[#1F2937] hover:border-[#2A3441]"
            : "bg-white border-[#E5E7EB] hover:border-[#D1D5DB]"
        }`}
      >
        <div className="flex items-center gap-3">
          {/* Icon */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={`flex-shrink-0 ${isDark ? "text-slate-500" : "text-slate-400"}`}
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M10 8l6 4-6 4V8z" fill="currentColor" stroke="none" />
          </svg>
  
          {/* Content */}
          <div className="flex-1 min-w-0 text-left">
            <p className={`text-xs mb-0.5 ${isDark ? "text-slate-500" : "text-slate-500"}`}>
              {session.subject_name}
            </p>
  
            <h3 className={`text-sm font-medium truncate ${isDark ? "text-slate-100" : "text-slate-900"}`}>
              {session.chapter_title}
            </h3>
  
            <div className="flex items-center gap-2 mt-1.5">
              <div className={`h-1 flex-1 rounded-full ${isDark ? "bg-slate-800" : "bg-slate-100"}`}>
                <div
                  className={`h-full rounded-full ${isDark ? "bg-slate-500" : "bg-slate-400"}`}
                  style={{
                    width: `${Math.min(((session.question_index + 1) / 30) * 100, 100)}%`,
                  }}
                />
              </div>
  
              <span className={`text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
                Q{session.question_index + 1}
              </span>
            </div>
          </div>
  
          {/* Chevron */}
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={isDark ? "text-slate-600" : "text-slate-300"}
          >
            <path d="M9 18l6-6-6-6" />
          </svg>
        </div>
      </button>
    </div>
  );
}

function renderLatex(text: string | null | undefined, isDark = true) {
  return renderContent(text, isDark)
}

function CheckIconSmall() {
  return (
    <svg width="13" height="10" viewBox="0 0 14 11" fill="none" style={{ flexShrink: 0 }}>
      <path d="M1 5.5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ── Avatar colour palette (same as landing page random avatars) ──────────────
const AVATAR_COLORS = [
  '#6366F1','#8B5CF6','#EC4899','#F59E0B','#10B981',
  '#3B82F6','#EF4444','#14B8A6','#F97316','#84CC16',
];
function getAvatarColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}
function initials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

function RecommendedQuestionCard({ isDark }: { isDark: boolean }) {
  const [question, setQuestion]                   = useState<any | null>(null);
  const [loading, setLoading]                     = useState(true);
  const [errored, setErrored]                     = useState(false);
  const [selectedOption, setSelectedOption]       = useState<string | null>(null);
  const [isCorrect, setIsCorrect]                 = useState<boolean | null>(null);
  const [bookmarked, setBookmarked]               = useState(false);
  // random users who have attempted this question
  const [attemptUsers, setAttemptUsers]           = useState<{ id: string; name: string; avatar_url: string | null }[]>([]);
  const [attemptCount, setAttemptCount]           = useState<number>(0);
  const router = useRouter();

  // ── Load question + random attempters ───────────────────────────────────
  useEffect(() => {
    const load = async () => {
      setLoading(true); setErrored(false);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { setLoading(false); return; }

        const q = await fetchRecommendedQ(user.id, []);
        if (!q) { setErrored(true); setLoading(false); return; }
        setQuestion(q);

        // Check bookmark state
        try {
          const raw = localStorage.getItem('bookmarkedQuestions');
          const arr = raw ? JSON.parse(raw) : [];
          setBookmarked(arr.some((b: any) => b.question_id === q.question_id));
        } catch {}

        // Fetch random users from the users table for the "have attempted" row
        const { data: randomUsers } = await supabase
          .from('users')
          .select('id, name, avatar_url')
          .neq('id', user.id)
          .limit(50);

        if (randomUsers && randomUsers.length > 0) {
          // Shuffle and take 3
          const shuffled = [...randomUsers].sort(() => Math.random() - 0.5).slice(0, 3);
          setAttemptUsers(shuffled);
          // Simulated attempt count: random between 18-120 for visual appeal
          setAttemptCount(Math.floor(Math.random() * 103) + 18);
        }
      } catch (err) {
        console.error('Recommended question error:', err);
        setErrored(true);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  // ── Handle answer ────────────────────────────────────────────────────────
  const handleOptionClick = async (optKey: string) => {
    if (selectedOption !== null || !question) return;
    setSelectedOption(optKey);

    // correct_option is always present in the DB
    const correctOpt: string | null = question.correct_option ?? null;

    const normalize = (v: string | null) =>
      v?.replace(/option_?/gi, '').replace(/[^a-dA-D]/g, '').slice(0, 1).toLowerCase() ?? '';
    const correct = normalize(optKey) === normalize(correctOpt);
    setIsCorrect(correct);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        supabase.from('attempts').insert({
          student_id: user.id, question_id: question.question_id,
          correct, time_taken_sec: 0,
        }).then(() => {});
        updateAbilityVector(user.id, question.question_id, correct);
      }
    } catch {}
  };

  // ── Bookmark toggle ──────────────────────────────────────────────────────
  const handleBookmark = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!question) return;
    try {
      const raw = localStorage.getItem('bookmarkedQuestions');
      let arr = raw ? JSON.parse(raw) : [];
      if (!bookmarked) {
        arr.push({ ...question, chapterTitle: question.chapter, subjectName: question.subject });
        localStorage.setItem('bookmarkedQuestions', JSON.stringify(arr));
        setBookmarked(true);
      } else {
        arr = arr.filter((b: any) => b.question_id !== question.question_id);
        localStorage.setItem('bookmarkedQuestions', JSON.stringify(arr));
        setBookmarked(false);
      }
    } catch {}
  };

  const goToPractice = () => {
    if (!question) return;
    router.push(`/practice?qid=${question.question_id}`);
  };

  // ── Parse exam_shift into a readable label ───────────────────────────────
  const parseShift = (s: string | null) => s?.split('_').join(' ') ?? null;

  // ── Theme shortcuts ──────────────────────────────────────────────────────
  const skelBg  = isDark ? 'bg-[#1e2538]' : 'bg-gray-200';
  const optIdle = isDark
    ? 'bg-[#0d1117] border-[#1e2538] hover:border-white/70 text-white cursor-pointer'
    : 'bg-white border-[#E5E7EB] hover:border-black text-[#0f172a] cursor-pointer';
  const optLabel = isDark
    ? 'bg-[#151B27] border-[#262F4C] text-slate-200'
    : 'bg-[#F3F4F6] border-[#D1D5DB] text-[#374151]';
  const mutedCls = isDark ? 'text-slate-500' : 'text-slate-400';

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mb-6">
        <div className={`h-6 w-44 rounded-lg animate-pulse mb-4 ${skelBg}`} />
        {/* gradient wrapper skeleton */}
        <div className={`rounded-3xl p-[2px] animate-pulse ${isDark ? 'bg-[#1e2538]' : 'bg-gray-200'}`}>
          <div className={`rounded-3xl p-5 ${isDark ? 'bg-[#0d1117]' : 'bg-white'}`}>
            <div className="flex items-center gap-2 mb-3">
              <div className={`h-5 w-28 rounded-full ${skelBg}`} />
              <div className={`h-5 w-16 rounded-full ${skelBg}`} />
            </div>
            <div className={`h-4 rounded-lg mb-2 ${skelBg}`} style={{ width: '90%' }} />
            <div className={`h-4 rounded-lg mb-4 ${skelBg}`} style={{ width: '68%' }} />
            <div className="space-y-2">
              {[0,1,2,3].map(i => <div key={i} className={`h-11 rounded-xl ${skelBg}`} />)}
            </div>
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

  const shiftLabel = parseShift(question.exam_shift);

  return (
    <div className="mb-6">

      {/* ── Section title ──────────────────────────────────────────────────── */}
      <h2 className={`text-xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
        Recommended for you
      </h2>

      {/* ── Gradient-border wrapper ─────────────────────────────────────────
           A 2px gradient ring wraps the card to give it the subtle glow from
           the reference image. We use a background-gradient on the outer div
           and a solid inner div to simulate a gradient border.            */}
      <div
        className="rounded-3xl p-[2px]"
        style={{
          background: isDark
            ? 'linear-gradient(135deg, rgba(99,102,241,0.55) 0%, rgba(139,92,246,0.35) 50%, rgba(236,72,153,0.25) 100%)'
            : 'linear-gradient(135deg, rgba(99,102,241,0.40) 0%, rgba(139,92,246,0.25) 50%, rgba(236,72,153,0.18) 100%)',
        }}
      >
        {/* Faint gradient tint behind the card content */}
        <div
          className={`rounded-[22px] ${isDark ? 'bg-[#0d1117]' : 'bg-white'}`}
          style={{
            backgroundImage: isDark
              ? 'radial-gradient(ellipse at top left, rgba(99,102,241,0.07) 0%, transparent 60%)'
              : 'radial-gradient(ellipse at top left, rgba(99,102,241,0.06) 0%, transparent 60%)',
          }}
        >
          <div className="p-5">

            {/* ── Top row: shift + subject tags + bookmark ───────────────── */}
            <div className="flex items-start justify-between gap-2 mb-4">
              <div className="flex flex-wrap items-center gap-2">
                {/* Shift tag — styled like the blue JEE Main 2021 August tag */}
                {shiftLabel && (
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${
                    isDark
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                      : 'bg-blue-100 text-blue-700 border border-blue-200'
                  }`}>
                    {shiftLabel}
                  </span>
                )}
                {/* Subject tag — grey pill */}
                {question.subject && (
                  <span className={`text-xs font-medium px-3 py-1 rounded-full ${
                    isDark
                      ? 'bg-[#1e2538] text-slate-300 border border-[#2a3548]'
                      : 'bg-gray-100 text-gray-600 border border-gray-200'
                  }`}>
                    {question.subject}
                  </span>
                )}
              </div>

              {/* Bookmark button — top right */}
              <motion.button
  whileTap={{ scale: 0.9 }}
  onClick={handleBookmark}
  className={`w-9 h-9 flex-shrink-0 rounded-xl flex items-center justify-center border transition-all ${
    bookmarked
      ? isDark
        ? 'bg-white border-white text-indigo-600'
        : 'bg-indigo-600 border-indigo-600 text-white'
      : isDark
        ? 'bg-[#111827] border-[#1e2538] text-slate-400 hover:border-indigo-500/50 hover:text-indigo-400'
        : 'bg-white border-gray-200 text-gray-400 hover:border-indigo-400 hover:text-indigo-500'
  }`}
  title={bookmarked ? 'Remove bookmark' : 'Bookmark'}
>
                <svg width="15" height="15" viewBox="0 0 24 24" fill={bookmarked ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" />
                </svg>
              </motion.button>
            </div>

            {/* ── Question text ───────────────────────────────────────────── */}
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

            {/* ── MCQ options ─────────────────────────────────────────────── */}
            {selectedOption === null ? (
              <div className="grid grid-cols-1 gap-2 mb-4">
                {opts.map(opt => (
                  <motion.button
                    key={opt.key} whileTap={{ scale: 0.99 }}
                    onClick={() => handleOptionClick(opt.key)}
                    className={`w-full text-left rounded-xl p-3.5 border flex items-start gap-3 transition-all ${optIdle}`}
                  >
                    <div className={`w-8 h-8 rounded-lg border flex items-center justify-center font-semibold text-sm uppercase flex-shrink-0 ${optLabel}`}>
                      {opt.key.toUpperCase()}
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
              <div className="grid grid-cols-1 gap-2 mb-4">
                {opts.map(opt => {
                  const sel      = selectedOption === opt.key;
                  const corrLetter = (question.correct_option ?? '')
                    .replace(/option_?/gi, '').replace(/[^a-dA-D]/g, '').slice(0, 1).toLowerCase();
                  const corr = opt.key === corrLetter;
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
                        {opt.key.toUpperCase()}
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

            {/* Verdict */}
            {isCorrect !== null && (
              <motion.p
                initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className={`text-xs font-semibold mb-3 ${isCorrect ? 'text-[#1DC97A]' : 'text-[#f87171]'}`}
              >
                {isCorrect ? '✓ Correct!' : '✗ Not quite — keep going'}
              </motion.p>
            )}

            {/* ── Bottom row: attempters + CTA ────────────────────────────── */}
            <div className="flex items-center justify-between gap-3 mt-1">

              {/* Attempter avatars + count */}
              {attemptUsers.length > 0 ? (
                <div className="flex items-center gap-2">
                  {/* Overlapping avatar stack */}
                  <div className="flex items-center" style={{ marginRight: 4 }}>
                    {attemptUsers.map((u, i) => {
                      const bg  = getAvatarColor(u.name || u.id);
                      const ini = initials(u.name || 'U');
                      return (
                        <div
                          key={u.id}
                          className="w-8 h-8 rounded-full border-2 flex items-center justify-center flex-shrink-0 overflow-hidden text-white text-[11px] font-bold"
                          style={{
                            backgroundColor: u.avatar_url ? undefined : bg,
                            borderColor: isDark ? '#0d1117' : '#ffffff',
                            marginLeft: i === 0 ? 0 : -10,
                            zIndex: attemptUsers.length - i,
                            position: 'relative',
                          }}
                        >
                          {u.avatar_url
                            ? <img src={u.avatar_url} alt={u.name} className="w-full h-full object-cover" />
                            : ini}
                        </div>
                      );
                    })}
                  </div>
                  <span className={`text-xs font-medium ${mutedCls}`}>
                    <span className={`font-semibold ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>{attemptCount}</span> People have attempted
                  </span>
                </div>
              ) : (
                <div /> /* spacer */
              )}

              {/* CTA */}
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={goToPractice}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all flex-shrink-0 ${
                  isDark
                    ? 'bg-white text-black hover:bg-gray-100'
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                {selectedOption ? 'See solution' : 'Solve now'}
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </motion.button>

            </div>

          </div>
        </div>
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

// ─── Chapter Survey Modal (home page version, same logic as PracticeClient) ──
function HomeSurveyModal({ isDark, userId, onDone }: {
  isDark: boolean; userId: string | null; onDone: () => void
}) {
  const subjects = ['physics', 'chemistry', 'maths'] as const
  const [activeSubject, setActiveSubject] = useState<string>('physics')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)

  // Exact same tokens as the profile modal
  const modalBg    = isDark ? 'bg-[#0A0E17] border-[#1D2939]' : 'bg-white border-gray-200'
  const text       = isDark ? 'text-white' : 'text-gray-900'
  const subtext    = isDark ? 'text-gray-400' : 'text-gray-500'
  const border     = isDark ? 'border-[#1D2939]' : 'border-gray-200'
  const pillActive = isDark ? 'bg-white text-black border-white' : 'bg-gray-900 text-white border-gray-900'
  const pillInactive = isDark
    ? 'bg-transparent border-[#1D2939] text-gray-400 hover:border-gray-500'
    : 'bg-transparent border-gray-200 text-gray-500 hover:border-gray-400'
  const chipIdle   = isDark ? 'bg-[#111827] border-[#1D2939] text-gray-400 hover:border-gray-500'
                            : 'bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-400'

  const subjectLabel: Record<string, string> = { physics: 'Physics', chemistry: 'Chemistry', maths: 'Maths' }
  const chaptersForSubject = ALL_SURVEY_CHAPTERS.filter(c => c.subject === activeSubject)

  const toggle = (ch: string) => {
    setSelected(prev => { const n = new Set(prev); n.has(ch) ? n.delete(ch) : n.add(ch); return n })
  }

  const handleSave = async () => {
    setSaving(true)
    await saveSurvey(userId, [...selected])
    setSaving(false)
    onDone()
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/70 backdrop-blur-sm p-4"
    >
      <motion.div
        initial={{ scale: 0.96, opacity: 0, y: 12 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.96, opacity: 0 }}
        className={`w-full max-w-md ${modalBg} border rounded-2xl overflow-hidden flex flex-col`}
        style={{ maxHeight: '88vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header — same structure as profile modal */}
        <div className="p-6 pb-4">
          <div className="flex items-center gap-2 mb-1">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={subtext}>
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
            </svg>
            <h3 className={`${text} text-lg font-bold`}>Chapters you've studied</h3>
          </div>
          <p className={`text-sm ${subtext}`}>
            Pick what you've covered — we'll focus your practice there.
          </p>
        </div>

        {/* Subject tabs — pill style matching profile modal's class/exam selectors */}
        <div className={`px-6 pb-4 border-b ${border}`}>
          <p className={`text-xs font-semibold ${subtext} uppercase tracking-wider mb-2`}>Subject</p>
          <div className="flex flex-wrap gap-2">
            {subjects.map(s => (
              <motion.button key={s} whileTap={{ scale: 0.96 }}
                onClick={() => setActiveSubject(s)}
                className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                  activeSubject === s ? pillActive : pillInactive
                }`}
              >
                {subjectLabel[s]}
              </motion.button>
            ))}
          </div>
        </div>

        {/* Chapter grid — compact, two columns */}
        <div className="flex-1 overflow-y-auto px-6 py-4" style={{ scrollbarWidth: 'none' }}>
          <p className={`text-xs font-semibold ${subtext} uppercase tracking-wider mb-3`}>Chapters</p>
          <div className="grid grid-cols-2 gap-2">
            {chaptersForSubject.map(c => {
              const active = selected.has(c.chapter)
              return (
                <motion.button key={c.chapter} whileTap={{ scale: 0.97 }}
                  onClick={() => toggle(c.chapter)}
                  className={`px-3 py-2 rounded-xl border text-left text-xs font-medium leading-tight transition-all flex items-center gap-2 ${
                    active ? pillActive : chipIdle
                  }`}
                >
                  {/* SVG checkbox */}
                  <span className={`flex-shrink-0 w-3.5 h-3.5 rounded-sm border flex items-center justify-center transition-all ${
                    active ? 'border-current bg-current/20' : isDark ? 'border-[#334155]' : 'border-gray-300'
                  }`}>
                    {active && (
                      <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                        <path d="M1 3l2 2 4-4" stroke={isDark ? '#000' : '#fff'} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </span>
                  <span className="flex-1 leading-tight">{c.chapter}</span>
                </motion.button>
              )
            })}
          </div>
        </div>

        {/* Footer — same button layout as profile modal */}
        <div className={`px-6 py-4 border-t ${border}`}>
          <div className="flex items-center justify-between mb-0">
            <span className={`text-xs ${subtext}`}>
              {selected.size} chapter{selected.size !== 1 ? 's' : ''} selected
            </span>
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <button
              onClick={onDone}
              className={`px-4 py-2 rounded-xl text-sm ${subtext} border ${border} hover:border-gray-500 transition-colors`}
            >
              Skip
            </button>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={handleSave}
              disabled={saving || selected.size === 0}
              className={`flex items-center gap-1.5 px-5 py-2 rounded-xl text-sm font-bold disabled:opacity-40 transition-all ${
                isDark ? 'bg-white text-black hover:bg-gray-100' : 'bg-gray-900 text-white hover:bg-gray-800'
              }`}
            >
              {saving ? 'Saving' : 'Save'}
              {!saving && (
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Rookie Pass Banner ───────────────────────────────────────────────────────
// ─── Rookie Pass Banner ───────────────────────────────────────────────────────
function RookiePassBanner() {
  const ref = React.useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = React.useState({ x: 0.5, y: 0.5 });
  const [hovered, setHovered] = React.useState(false);
  const [shinePos, setShinePos] = React.useState(-100);
  const shineRef = React.useRef<ReturnType<typeof setInterval> | null>(null);
  const [passExpiry, setPassExpiry] = React.useState<string | null>(null);
  const [passChecked, setPassChecked] = React.useState(false);

  // Check if user already has an active pass
  React.useEffect(() => {
    (async () => {
      try {
        const raw = localStorage.getItem('@user');
        if (!raw) { setPassChecked(true); return; }
        const { id } = JSON.parse(raw);
        const expiry = await getPassExpiry(id);
        setPassExpiry(expiry);
      } catch { /* no-op */ } finally {
        setPassChecked(true);
      }
    })();
  }, []);

  const handleMouseMove = React.useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setMouse({ x: (e.clientX - rect.left) / rect.width, y: (e.clientY - rect.top) / rect.height });
  }, []);

  React.useEffect(() => {
    if (hovered) { if (shineRef.current) clearInterval(shineRef.current); return; }
    let pos = -100;
    shineRef.current = setInterval(() => { pos += 2; if (pos > 220) pos = -100; setShinePos(pos); }, 16);
    return () => { if (shineRef.current) clearInterval(shineRef.current); };
  }, [hovered]);

  const spotX = `${mouse.x * 100}%`;
  const spotY = `${mouse.y * 100}%`;

  const handleCheckout = React.useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { alert('Please sign in to purchase.'); return; }
      const raw = localStorage.getItem('@user');
      const user = raw ? JSON.parse(raw) : null;
      await triggerCheckout({
        token:   session.access_token,
        userId:  session.user.id,
        email:   session.user.email,
        name:    user?.name ?? null,
        onSuccess: (expiry: string) => { bustPassCache(); setPassExpiry(expiry); },
        onError:   (msg: string)   => { alert(msg); },
      });
    } catch (e) { console.error(e); }
  }, []);

  // ── Active pass view ────────────────────────────────────────────────────────
  if (passChecked && passExpiry) {
    const expiryDate     = new Date(passExpiry);
    const formattedExpiry = expiryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const daysLeft       = Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / 86400000));

    return (
      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="relative rounded-2xl overflow-hidden select-none"
        style={{
          background: 'linear-gradient(125deg, #09091f 0%, #0e0b2e 35%, #041a10 100%)',
          border: '1px solid rgba(74,222,128,0.3)',
          boxShadow: hovered
            ? '0 0 0 1px rgba(74,222,128,0.45), 0 8px 32px rgba(16,185,129,0.18)'
            : '0 4px 20px rgba(0,0,0,0.5)',
          transition: 'box-shadow 0.4s ease',
        }}
      >
        {/* Cursor glow */}
        <div className="absolute inset-0 pointer-events-none" style={{
          background: `radial-gradient(circle 200px at ${spotX} ${spotY}, rgba(74,222,128,0.12) 0%, transparent 70%)`,
          transition: hovered ? 'background 0.05s' : 'background 0.3s',
        }} />
       
        {/* Dot base layer */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.14) 1px, transparent 1px)',
          backgroundSize: '14px 14px', opacity: 0.18,
        }} />
        {/* Dot cursor-lit layer */}
        <div className="absolute inset-0 pointer-events-none" style={{
          backgroundImage: 'radial-gradient(circle, rgba(74,222,128,1) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
          WebkitMaskImage: `radial-gradient(circle 140px at ${spotX} ${spotY}, black 0%, transparent 100%)`,
          maskImage:       `radial-gradient(circle 140px at ${spotX} ${spotY}, black 0%, transparent 100%)`,
          opacity: hovered ? 0.45 : 0, transition: hovered ? 'opacity 0.15s' : 'opacity 0.5s',
        }} />

        <div className="relative z-10 px-5 pt-5 pb-5">
          <div className="flex items-start justify-between mb-3">
            <div>
              <p className="text-[10px] font-bold tracking-[0.22em] uppercase mb-1" style={{ color: 'rgba(74,222,128,0.7)' }}>✦ Rookie Pass · Active</p>
              <h2 className="text-lg font-extrabold text-white leading-tight">
                JEE Advanced<br/>
                <span style={{ background: 'linear-gradient(90deg, #4ade80, #34d399)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  All Years Unlocked
                </span>
              </h2>
            </div>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0"
              style={{ background: 'rgba(74,222,128,0.15)', border: '1px solid rgba(74,222,128,0.4)' }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6L9 17l-5-5"/>
              </svg>
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            {[{ label: 'Valid Until', value: formattedExpiry }, { label: 'Days Left', value: `${daysLeft} days` }].map(({ label, value }) => (
              <div key={label} className="flex-1 rounded-xl px-3 py-2.5"
                style={{ background: 'rgba(74,222,128,0.08)', border: '1px solid rgba(74,222,128,0.2)' }}>
                <p className="text-[9px] font-bold uppercase tracking-widest mb-0.5" style={{ color: 'rgba(74,222,128,0.6)' }}>{label}</p>
                <p className="text-sm font-bold text-white">{value}</p>
              </div>
            ))}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none"
          style={{ background: 'linear-gradient(90deg, transparent, rgba(74,222,128,0.6) 40%, rgba(52,211,153,0.6) 60%, transparent)' }} />
      </div>
    );
  }

  // ── Upsell (no pass / loading) view ────────────────────────────────────────
  return (
    <div
      ref={ref}
      role="button"
      tabIndex={0}
      onClick={handleCheckout}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleCheckout(); }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className="relative rounded-2xl overflow-hidden select-none cursor-pointer"
      style={{
        background: 'linear-gradient(135deg, #0d0221 0%, #0a0a2e 40%, #0d1a3a 70%, #0a1628 100%)',
        border: '1px solid rgba(99,102,241,0.35)',
        boxShadow: hovered
          ? '0 0 0 1px rgba(129,140,248,0.5), 0 8px 40px rgba(99,102,241,0.25)'
          : '0 4px 24px rgba(0,0,0,0.5)',
        transition: 'box-shadow 0.4s ease',
      }}
    >
      {/* Cursor glow */}
      <div className="absolute inset-0 pointer-events-none" style={{
        background: `radial-gradient(circle 220px at ${spotX} ${spotY}, rgba(129,140,248,0.18) 0%, rgba(99,102,241,0.08) 40%, transparent 70%)`,
        transition: hovered ? 'background 0.05s' : 'background 0.3s',
      }} />
      {/* Ambient glows */}
      {/* Dot base layer */}
      <div className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.18) 1px, transparent 1px)', backgroundSize: '14px 14px', opacity: 0.22 }} />
      {/* Dot cursor-lit layer */}
      <div className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: 'radial-gradient(circle, rgba(196,181,253,1) 1px, transparent 1px)',
          backgroundSize: '14px 14px',
          WebkitMaskImage: `radial-gradient(circle 140px at ${spotX} ${spotY}, black 0%, transparent 100%)`,
          maskImage:       `radial-gradient(circle 140px at ${spotX} ${spotY}, black 0%, transparent 100%)`,
          opacity: hovered ? 0.55 : 0, transition: hovered ? 'opacity 0.15s' : 'opacity 0.5s',
        }} />
      {/* Star-dust */}
      {[
        { top: '18%', left: '8%',  size: 2,   opacity: 0.6  },
        { top: '72%', left: '14%', size: 1.5, opacity: 0.4  },
        { top: '35%', left: '88%', size: 2,   opacity: 0.55 },
        { top: '62%', left: '78%', size: 1.5, opacity: 0.35 },
        { top: '12%', left: '55%', size: 1.5, opacity: 0.45 },
        { top: '80%', left: '48%', size: 2,   opacity: 0.3  },
        { top: '25%', left: '72%', size: 1,   opacity: 0.5  },
        { top: '55%', left: '32%', size: 1,   opacity: 0.4  },
      ].map((s, i) => (
        <div key={i} className="absolute rounded-full pointer-events-none animate-pulse"
          style={{ top: s.top, left: s.left, width: s.size, height: s.size, backgroundColor: `rgba(196,181,253,${s.opacity})`, animationDelay: `${i * 0.4}s`, animationDuration: `${2.5 + i * 0.3}s` }} />
      ))}

      {/* Content */}
      <div className="relative z-10 px-5 pt-5 pb-5">
        <p className="text-[10px] font-bold tracking-[0.22em] uppercase mb-3" style={{ color: 'rgba(165,180,252,0.6)' }}>
           Rookie Pass 
        </p>
        <h2 className="text-xl font-extrabold leading-tight tracking-tight text-white mb-1">
          JEE Advanced PYQs —{' '}
          <span style={{ background: 'linear-gradient(90deg, #a78bfa, #818cf8, #c084fc)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            All Years Unlocked
          </span>
        </h2>
        <p className="text-sm leading-relaxed mb-5" style={{ color: 'rgba(203,213,225,0.65)' }}>
          Every JEE Advanced question ever asked. AI solutions, buddy explanations, and performance tracking — one pass.
        </p>

        <div className="flex items-end justify-between gap-3">
          {/* Price */}
          <div>
            <div className="flex items-baseline gap-1">
              <span className="text-[28px] font-black leading-none text-white">₹299</span>
              <span className="text-[24px] font-semibold leading-none" style={{ color: 'rgb(247, 249, 252)' }}>/ year</span>
            </div>
            <div className="flex items-center gap-1.5 mt-4">
              <span className="text-xs font-semibold line-through leading-none" style={{ color: 'rgba(148,163,184,0.45)' }}>₹999</span>
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#4ade80' }}>70% OFF</span>
            </div>
          
          </div>

          {/* Shine CTA button */}
          <motion.button
            whileTap={{ scale: 0.96 }}
            whileHover={{ scale: 1.04 }}
            onClick={(e) => { e.stopPropagation(); handleCheckout(); }}
            className="relative overflow-hidden flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white flex-shrink-0"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #6d28d9 100%)',
              boxShadow: hovered
                ? '0 0 0 1.5px rgba(196,181,253,0.7), 0 0 20px rgba(139,92,246,0.55), inset 0 1px 0 rgba(255,255,255,0.15)'
                : '0 0 0 1px rgba(129,140,248,0.45), 0 4px 16px rgba(99,102,241,0.4), inset 0 1px 0 rgba(255,255,255,0.1)',
              transition: 'box-shadow 0.3s',
            }}
          >
            <span className="absolute inset-0 pointer-events-none" style={{
              background: `linear-gradient(105deg, transparent ${shinePos - 40}%, rgba(255,255,255,0.28) ${shinePos}%, rgba(255,255,255,0.08) ${shinePos + 15}%, transparent ${shinePos + 55}%)`,
            }} />
            <span className="absolute top-0 left-4 right-4 h-px pointer-events-none" style={{ background: 'rgba(255,255,255,0.2)' }} />
            <span className="relative z-10">Get Rookie Pass</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="relative z-10">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </motion.button>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 h-[2px] pointer-events-none"
        style={{ background: 'linear-gradient(90deg, transparent, rgba(129,140,248,0.6) 40%, rgba(168,85,247,0.6) 60%, transparent)' }} />
    </div>
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
  // Weekly chapter survey
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyUserId, setSurveyUserId] = useState<string | null>(null);

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
      setSurveyUserId(parsed.id ?? null);
      if (!parsed.cl || !parsed.exam) {
        setShowProfileModal(true);
      } else {
        setcl(parsed.cl || '');
        setExam(parsed.exam || '');
      }
    } catch {}
    // Show chapter survey if due (first time or expired every 7 days)
    if (shouldShowSurvey()) {
      // Small delay so profile modal (if needed) appears first
      setTimeout(() => setShowSurvey(true), 800);
    }
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

      {/* ─── Chapter Survey Modal (weekly) ─────────────────────────────────── */}
      <AnimatePresence>
        {showSurvey && !showProfileModal && (
          <HomeSurveyModal
            isDark={isDark}
            userId={surveyUserId}
            onDone={() => setShowSurvey(false)}
          />
        )}
      </AnimatePresence>

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
          <p className={`${subtext} text-sm mb-4`}>
            {getGreeting()}{firstName ? `, ${firstName}` : ', learner'} 👋
          </p>

          <RookiePassBanner />
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
