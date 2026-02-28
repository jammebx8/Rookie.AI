'use client'

import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiChevronLeft, FiBookmark, FiSearch, FiSmile,
  FiX, FiArrowRight, FiArrowLeft, FiZoomIn, FiCheck
} from 'react-icons/fi';
import { IoTimeOutline, IoBookmark } from 'react-icons/io5';
import { supabase } from '../../public/src/utils/supabase';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

// ─── AI Buddy Definitions ────────────────────────────────────────────────────
// Each buddy has: id (matches localStorage "selectedBuddy"), name, emoji, columnKey (Supabase col), systemPrompt
export const AI_BUDDIES: Record<string, {
  name: string;  columnKey: string; systemPrompt: string; color: string;  image:string;
}> = {
  '1': {
    name: 'Jeetu Bhaiya',
    image: '/HD-wallpaper-kota-factory-lip-jeetu-bhaiya.jpg',
    columnKey: 'buddy_Jeetu',
    color: '#6366F1',
    systemPrompt: `
  You are Jeetu Bhaiya, an experienced Kota teacher who teaches JEE and NEET students.
  
  PERSONALITY:
  - Calm and intelligent
  - Slightly sarcastic but caring
  - Serious about studies
  - You call students "bhai" or "didi" sometimes
  - You want students to understand concepts, not memorize
  - You speak natural Hinglish like a real teacher
  
  TEACHING STYLE:
  - Always explain the concept first
  - Then solve step-by-step
  - Keep logic clear
  - Avoid unnecessary theory
  - Focus on understanding
  
  LANGUAGE:
  Speak in Hindi mixed with English naturally.
  Example tone:
  "Samajh bhai, yaha acceleration zero nahi hai."
  
  FORMAT RULES:
  - Maximum 15 lines
  - Step-by-step solution
  - Use LaTeX for equations using $
  - Keep equations clean
  - Each step on new line
  - Keep explanation simple
  
  GOAL:
  Student should feel the concept is clear.
  `
  },
  '2': {
    name: 'Riya',
    image: '/assets_task_01jstrf4hqff7r4gs3jwmbq5kd_1745728563_img_0.webp',
    columnKey: 'buddy_Riya',
    color: '#EF4444',
    systemPrompt: `
  You are Riya, a friendly senior student helping JEE and NEET aspirants.
  
  PERSONALITY:
  - Friendly and supportive
  - Encouraging tone
  - Patient explainer
  - Makes students comfortable
  - Speaks Hinglish naturally
  
  TEACHING STYLE:
  - Explain step-by-step
  - Break into small parts
  - Avoid big jumps
  - Make it easy to follow
  - Focus on clarity
  
  LANGUAGE:
  Use Hindi + English naturally.
  Example:
  "Chalo step by step solve karte hain."
  
  FORMAT RULES:
  - Maximum 15 lines
  - Step-by-step
  - Use LaTeX with $
  - Clear spacing
  - Simple explanation
  
  GOAL:
  Make weak students understand easily.
  `
  },
  '3': {
    name: 'Rei',
    image: '/download (17).jpeg',
    columnKey: 'buddy_Rei',
    color: '#10B981',
    systemPrompt: `
  You are Rei, a calm and intelligent topper who explains JEE and NEET problems efficiently.
  
  PERSONALITY:
  - Smart and confident
  - Calm tone
  - Speaks less but clearly
  - Sounds like a topper
  - Speaks Hinglish
  
  TEACHING STYLE:
  - Show smart methods
  - Use shortcuts when possible
  - Avoid long methods
  - Clear logic
  - Efficient solving
  
  LANGUAGE:
  Hindi + English mix.
  Example:
  "Isme direct formula lag sakta hai."
  
  FORMAT RULES:
  - Maximum 12 lines
  - Step format
  - Use LaTeX
  - Clean structure
  
  GOAL:
  Teach smart solving methods.
  `
  },
  '4': {
    name: 'Ritu',
    image: '/ritu.jpg',
    columnKey: 'buddy_Ritu',
    color: '#F59E0B',
    systemPrompt: `
  You are Ritu Ma'am, a strict JEE and NEET teacher.
  
  PERSONALITY:
  - Serious and strict
  - Professional
  - No nonsense
  - Focused on results
  - Speaks formal Hinglish
  
  TEACHING STYLE:
  - Focus on exam method
  - Show correct approach
  - Highlight formulas
  - Avoid unnecessary talk
  - Focus on accuracy
  
  LANGUAGE:
  Hindi + English mix.
  Example:
  "Exam mein isi method se solve karna chahiye."
  
  FORMAT RULES:
  - Maximum 12 lines
  - Step-by-step
  - Use LaTeX
  - Clean solution
  
  GOAL:
  Help students score marks.
  `
  },

  '5': {
    name: 'Shreya',
    image: '/shery11.jpeg',
    columnKey: 'buddy_Shreya',
    color: '#8B5CF6',
    systemPrompt: `
  You are Shreya, a quiet but brilliant JEE and NEET topper.
  
  PERSONALITY:
  - Calm and serious
  - Introverted
  - Speaks less
  - Very smart
  - Speaks simple Hinglish
  
  TEACHING STYLE:
  - Short explanations
  - Clear steps
  - No extra words
  - Focus on logic
  
  LANGUAGE:
  Hindi + English.
  Example:
  "Yaha energy conserve ho rahi hai."
  
  FORMAT RULES:
  - Maximum 10 lines
  - Steps only
  - Use LaTeX
  - Clean format
  
  GOAL:
  Quick and clear understanding.
  `
  },

  '6': {
    name: 'Neha',
    image: '/assets_task_01jttq36fkem8br965ak8qh0sp_1746800911_img_2.webp',
    columnKey: 'buddy_Neha',
    color: '#EC4899',
    systemPrompt: `
  You are Neha, a JEE and NEET aspirant who loves solving doubts.
  
  PERSONALITY:
  - Talkative but helpful
  - Relatable
  - Curious
  - Friendly
  - Speaks Hinglish
  
  TEACHING STYLE:
  - Explain confusion
  - Clarify steps
  - Explain why
  - Mention common mistakes
  
  LANGUAGE:
  Hindi + English.
  Example:
  "Yaha students usually galti karte hain."
  
  FORMAT RULES:
  - Maximum 15 lines
  - Step explanation
  - Use LaTeX
  - Clear format
  
  GOAL:
  Remove confusion.
  `
  },
};

const DEFAULT_BUDDY_ID = '4';

// ─── Types ───────────────────────────────────────────────────────────────────
type Question = {
  question: string;
  question_id: string;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: string | null;
  exam_shift: string;
  source_url: string;
  solution: string;
  sol_ai?: string;
  year?: number | string;
  question_img_url?: string | null;
  option_a_img?: string | null;
  option_b_img?: string | null;
  option_c_img?: string | null;
  option_d_img?: string | null;
  [key: string]: any;
};





type ToastType = 'success' | 'error' | 'info' | 'coin' | 'bookmark';

interface ToastItem {
  id: number;
  message: string;
  type: ToastType;
}

const API_BASE = 'https://rookie-backend.vercel.app/api';
const BOOKMARKS_KEY = 'bookmarkedQuestions';
const SESSION_KEY = 'questionSessionResponses_v1';

// ─── Theme hook ──────────────────────────────────────────────────────────────
function useTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    try { setIsDark(localStorage.getItem('theme') === 'dark'); } catch {}
    const ob = new MutationObserver(() => {
      try {setIsDark(localStorage.getItem('theme') === 'dark');} catch {}
    });
    ob.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    const fn = () => { try {setIsDark(localStorage.getItem('theme') === 'dark'); } catch {} };
    window.addEventListener('storage', fn);
    return () => { ob.disconnect(); window.removeEventListener('storage', fn); };
  }, []);
  return isDark;
}

// ─── Toast component ─────────────────────────────────────────────────────────
function Toast({ toast, onClose }: { toast: ToastItem; onClose: (id: number) => void }) {
  const styles: Record<ToastType, string> = {
    success:  'bg-emerald-600 text-white',
    error:    'bg-rose-600 text-white',
    info:     'bg-slate-700 text-white',
    coin:     'bg-gradient-to-r from-amber-500 to-orange-500 text-white',
    bookmark: 'bg-indigo-600 text-white',
  };
  const icons: Record<ToastType, string> = {
    success: '✓', error: '✗', info: 'ℹ', coin: '🪙', bookmark: '🔖',
  };
  return (
    <motion.div
      initial={{ opacity: 0, y: -20, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -16, scale: 0.94 }}
      className={`flex items-center gap-3 px-5 py-3 rounded-2xl shadow-xl ${styles[toast.type]}`}
    >
      <span className="text-base font-bold">{icons[toast.type]}</span>
      <span className="font-semibold text-sm">{toast.message}</span>
      <button onClick={() => onClose(toast.id)} className="ml-1 opacity-60 hover:opacity-100 transition-opacity">
        <FiX size={13} />
      </button>
    </motion.div>
  );
}

// ─── Image Modal ─────────────────────────────────────────────────────────────
function ImageModal({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.86 }} animate={{ scale: 1 }} exit={{ scale: 0.86 }}
        onClick={e => e.stopPropagation()}
        className="relative max-w-xl w-full"
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center shadow-lg font-bold"
        >
          <FiX size={14} />
        </button>
        <img
          src={src} alt="Question"
          className="rounded-2xl object-contain max-h-[72vh] w-full shadow-2xl border border-white/10"
        />
      </motion.div>
    </motion.div>
  );
}

// ─── Spinner ─────────────────────────────────────────────────────────────────
function Spinner({ size = 20, cls = 'border-indigo-500' }: { size?: number; cls?: string }) {
  return (
    <motion.div
      animate={{ rotate: 360 }} transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
      style={{ width: size, height: size }}
      className={`border-2 ${cls} border-t-transparent rounded-full flex-shrink-0`}
    />
  );
}

// ─── Render LaTeX ─────────────────────────────────────────────────────────────
function renderLatex(text: string): React.ReactNode {
  if (!text) return null;
  return text.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/).map((part, i) => {
    if (part.startsWith('$$') && part.endsWith('$$')) return <BlockMath key={i} math={part.slice(2, -2)} />;
    if (part.startsWith('$')  && part.endsWith('$'))  return <InlineMath key={i} math={part.slice(1, -1)} />;
    return <span key={i}>{part}</span>;
  });
}

// ─── CheckIcon ───────────────────────────────────────────────────────────────
function CheckIcon() {
  return (
    <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
      <path d="M1 5.5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function QuestionViewerPage() {
  const isDark = useTheme();
  const router = useRouter();
  const sp = useSearchParams();
  const chapterTitle = sp.get('chapterTitle') || '';
  const subjectName  = sp.get('subjectName')  || 'Physics';
  const imageKey     = sp.get('imageKey')     || '';

  // ── Core state ────────────────────────────────────────────────────────────
  const [loading, setLoading]               = useState(true);
  const [questions, setQuestions]           = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex]     = useState(0);
  const [rookieCoins, setRookieCoins]       = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect]           = useState<boolean | null>(null);
  const [motivation, setMotivation]         = useState('');
  const [timer, setTimer]                   = useState(0);
  const [solution, setSolution]             = useState('');
  const [displayedText, setDisplayedText]   = useState('');
  const [isTyping, setIsTyping]             = useState(false);
  const [aiFollowup, setAIFollowup]         = useState<string | null>(null);
  const [aiFollowupLoading, setAIFollowupLoading] = useState(false);
  const [bookmarked, setBookmarked]         = useState(false);
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [motivationLoading, setMotivationLoading] = useState(false);
  const [solutionRequested, setSolutionRequested] = useState(false);
  const [determiningAnswer, setDeterminingAnswer] = useState(false);
  const [integerAnswer, setIntegerAnswer]   = useState('');
  const [imageModal, setImageModal]         = useState<string | null>(null);
  const [buddyId, setBuddyId]               = useState(DEFAULT_BUDDY_ID);
  const [toasts, setToasts]                 = useState<ToastItem[]>([]);
  const [isConnected, setIsConnected]       = useState(true);
  const [hasTyped, setHasTyped] = useState(false);

  // Dig Deeper
  const [isDigging, setIsDigging]           = useState(false);
  const [conceptMCQ, setConceptMCQ]         = useState<any>(null);
  const [conceptLoading, setConceptLoading] = useState(false);
  const [conceptFeedback, setConceptFeedback] = useState('');
  const [digDeepSelected, setDigDeepSelected] = useState<string | null>(null);
  const [prevDigResult, setPrevDigResult]   = useState<{
    status: 'correct' | 'incorrect' | ''; explanation?: string; answer?: string;
  } | null>(null);

  const timerRef          = useRef<number | null>(null);
  const scrollRef         = useRef<HTMLDivElement | null>(null);
  const questionStartTime = useRef(Date.now());

  const buddy = AI_BUDDIES[buddyId] ?? AI_BUDDIES[DEFAULT_BUDDY_ID];
  const [solutionBuddyId, setSolutionBuddyId] = useState(DEFAULT_BUDDY_ID);
  // Add this derived value just before your return statement (near where buddy is derived):
const solutionBuddy = AI_BUDDIES[solutionBuddyId] ?? AI_BUDDIES[DEFAULT_BUDDY_ID];


  // ── Theme tokens ──────────────────────────────────────────────────────────
  const T = {
    page:        isDark ? 'bg-[#07090f] text-white'              : 'bg-[#F0F2FA] text-[#0f172a]',
    header:      isDark ? 'bg-[#07090f]/95 border-[#1e2538]'    : 'bg-white/95 border-[#E5E7EB]',
    card:        isDark ? 'bg-[#0d1117] border-[#1e2538]'       : 'bg-white border-[#E5E7EB]',
    optionIdle:  isDark ? 'bg-[#0d1117] border-[#1e2538] hover:border-indigo-500/50 text-white'
                        : 'bg-white border-[#E5E7EB] hover:border-indigo-400 text-[#0f172a]',
    optionLabel: isDark ? 'bg-[#151B27] border-[#262F4C] text-slate-200'
                        : 'bg-[#F3F4F6] border-[#D1D5DB] text-[#374151]',
    input:       isDark ? 'bg-[#0d1117] border-[#1e2538] text-white placeholder-gray-500 focus:border-indigo-500'
                        : 'bg-white border-[#D1D5DB] text-[#0f172a] placeholder-gray-400 focus:border-indigo-400',
    muted:       isDark ? 'text-slate-400'                       : 'text-slate-500',
    progress:    isDark ? 'bg-[#1e2538]'                         : 'bg-gray-200',
    bar: isDark ? 'bg-white'                         : 'bg-black', 
    footer:      isDark ? 'bg-[#07090f]/95 border-[#1e2538]'    : 'bg-white/95 border-[#E5E7EB]',
    btnSecondary:isDark ? 'bg-[#111827] border-[#1D2939] text-white hover:bg-[#1a2235]'
                        : 'bg-white border-[#D1D5DB] text-[#0f172a] hover:bg-gray-50',
    solCard:     isDark ? 'bg-[#0d1117] border-[#1e2538]'       : 'bg-white border-[#E5E7EB]',
    followCard:  isDark ? 'bg-[#0a0f1a] border-[#1D2939] text-slate-300'
                        : 'bg-indigo-50 border-indigo-200 text-slate-700',
    // Exam shift badge - highlighted like screenshot
    examBadge: isDark
    ? 'bg-blue-900/40 text-blue-400 border border-blue-500/50'
                        : 'bg-blue-100 text-blue-700 border border-blue-300',
    subjectBadge:isDark ? 'bg-[#1e2538] text-slate-300 border border-[#2a3548]'
                        : 'bg-slate-100 text-slate-600 border border-slate-200',
    yearBadge:   isDark ? 'bg-[#1a2235] text-slate-400'         : 'bg-gray-100 text-gray-500',
    imgWrapper:  isDark ? 'bg-[#0d1117] border-[#1e2538]'       : 'bg-gray-50 border-gray-200',
    coinBadge:   isDark ? 'bg-[#111827] border-[#1D2939] text-white'
                        : 'bg-amber-50 border-amber-200 text-amber-800',
    buddyPanel:  isDark ? 'bg-[#0d1117] border-[#1e2538]'       : 'bg-indigo-50 border-indigo-200',
  };

  // ── Toast helpers ─────────────────────────────────────────────────────────
  const addToast = (message: string, type: ToastType = 'info', ms = 3500) => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, message, type }]);
    setTimeout(() => setToasts(p => p.filter(t => t.id !== id)), ms);
  };
  const removeToast = (id: number) => setToasts(p => p.filter(t => t.id !== id));

  // ── Load buddy from localStorage ──────────────────────────────────────────
  useEffect(() => {
    try {
      const s = localStorage.getItem('selectedBuddy');
      if (s && AI_BUDDIES[s]) setBuddyId(s);
    } catch {}
  }, []);

  // ── Network detection ─────────────────────────────────────────────────────
  useEffect(() => {
    const online  = () => setIsConnected(true);
    const offline = () => { setIsConnected(false); addToast('No internet connection', 'error'); };
    window.addEventListener('online', online);
    window.addEventListener('offline', offline);
    return () => { window.removeEventListener('online', online); window.removeEventListener('offline', offline); };
  }, []);

  // ---------- Fetch questions from Supabase ----------
  useEffect(() => {
    const fetchQuestionsFromSupabase = async () => {
      if (!chapterTitle) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from(chapterTitle)
          .select('*')
          .order('question', { ascending: true });

        if (error) {
          console.error('Error fetching questions from Supabase:', error);
          setQuestions([]);
          return;
        }

        if (data && data.length > 0) {
          setQuestions(data as Question[]);
        } else {
          setQuestions([]);
        }
      } catch (err) {
        console.error('Error fetching questions:', err);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionsFromSupabase();
  }, [chapterTitle]);

  // ── Load coins ────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('users').select('rookieCoinsEarned').eq('id', user.id).single()
        .then(({ data, error }) => { if (!error && data) setRookieCoins(data.rookieCoinsEarned || 0); });
    });
  }, []);

  // ── Session helpers ───────────────────────────────────────────────────────
  const saveSession = (partial: Record<string, any> = {}) => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      const obj = raw ? JSON.parse(raw) : {};
      obj[chapterTitle][String(currentIndex)] = {
        ...(obj[chapterTitle][String(currentIndex)] || {}),
        selectedOption, isCorrect, motivation, solutionRequested, solution, aiFollowup,
        solutionBuddyId,
        ...partial,
      };
      localStorage.setItem(SESSION_KEY, JSON.stringify(obj));
    } catch {}
  };

  const loadSession = (i: number) => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      return raw ? JSON.parse(raw)?.[chapterTitle]?.[String(i)] || null : null;
    } catch { return null; }
  };

  // ── Restore session on question change ────────────────────────────────────
  useEffect(() => {
    if (!questions.length) return;
    const prev = loadSession(currentIndex);
    if (prev) {
      setSelectedOption(prev.selectedOption || null);
      setIsCorrect(prev.isCorrect ?? null);
      setMotivation(prev.motivation || '');
      setSolution(prev.solution || '');
      setAIFollowup(prev.aiFollowup || null);
      setSolutionRequested(prev.solutionRequested || false);
      setHasTyped(prev.hasTyped || false);
      setSolutionBuddyId(prev.solutionBuddyId || buddyId);
      if (prev.integerAnswer !== undefined)
        setIntegerAnswer(prev.integerAnswer);
    } else {
      setSelectedOption(null); setIsCorrect(null); setMotivation('');
      setSolution(''); setAIFollowup(null); setSolutionRequested(false);
      setIsDigging(false); setConceptMCQ(null); setPrevDigResult(null);
      setDigDeepSelected(null); setIntegerAnswer(''); setDisplayedText('');
      setHasTyped(false);
    }
  }, [currentIndex, questions, chapterTitle]);

  // ── Bookmark sync ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!questions.length) return;
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      const q = questions[currentIndex];
      setBookmarked(arr.some((b: any) => b.question_id === q?.question_id && b.chapterTitle === chapterTitle));
    } catch { setBookmarked(false); }
  }, [currentIndex, questions, chapterTitle]);

  // ── Timer ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (selectedOption === null && questions[currentIndex]) {
      const start = Date.now();
      questionStartTime.current = start;
      timerRef.current = window.setInterval(() => setTimer(Math.floor((Date.now() - start) / 1000)), 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [selectedOption, currentIndex, questions]);

  // ── Typing effect ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!solution || !solutionRequested) return;
  
    // Already typed before → don't animate
    if (hasTyped) {
      setDisplayedText(solution);
      setIsTyping(false);
      return;
    }
  
    setIsTyping(true);
    setDisplayedText('');
  
    let i = 0;
    const iv = setInterval(() => {
      setDisplayedText(solution.slice(0, i));
      i++;
  
      if (i > solution.length) {
        clearInterval(iv);
        setIsTyping(false);
        setHasTyped(true);
      }
    }, 8);
  
    return () => clearInterval(iv);
  }, [solution]);

  // ── Helpers ───────────────────────────────────────────────────────────────
  const isIntegerQ = (q: Question) =>
    !q.option_a && !q.option_b && !q.option_c && !q.option_d &&
    !q.option_a_img && !q.option_b_img && !q.option_c_img && !q.option_d_img;

  const calcCoins = (timeSpent: number, correct: boolean): number => {
    if (!correct) return 0;
    const t = timeSpent <= 30 ? 5 : timeSpent <= 60 ? 4 : timeSpent <= 90 ? 3 : timeSpent <= 120 ? 2 : 1;
    return Math.min(t + 5, 10);
  };

  // ---------- Update rookie coins in Supabase ----------
  const updateRookieCoins = async (coinsToAdd: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      const { data } = await supabase
        .from('users')
        .select('rookieCoinsEarned')
        .eq('id', user.id)
        .single();
  
      const currentCoins = data?.rookieCoinsEarned || 0;
      const newTotal = currentCoins + coinsToAdd;
  
      const { error } = await supabase
        .from('users')
        .update({ rookieCoinsEarned: newTotal })
        .eq('id', user.id);
  
      if (!error) {
        setRookieCoins(newTotal);
      }
    } catch (err) {
      console.error('Error updating rookie coins:', err);
    }
  };

  // ── Bookmark handler ──────────────────────────────────────────────────────
  const handleBookmark = () => {
    try {
      const q = questions[currentIndex];
      if (!q) return;
      const raw = localStorage.getItem(BOOKMARKS_KEY);
      let arr = raw ? JSON.parse(raw) : [];
      if (!bookmarked) {
        arr.push({ ...q, chapterTitle, subjectName, imageKey });
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(arr));
        setBookmarked(true);
        addToast('Question bookmarked!', 'bookmark');
      } else {
        arr = arr.filter((b: any) => !(b.question_id === q.question_id && b.chapterTitle === chapterTitle));
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(arr));
        setBookmarked(false);
        addToast('Bookmark removed', 'info');
      }
    } catch {}
  };

  // ── Determine answer via AI ────────────────────────────────────────────────
  const determineAnswer = async (q: Question): Promise<string | null> => {
    setDeterminingAnswer(true);
    try {
      const res = await axios.post(`${API_BASE}/solution`, {
        action: 'determine_answer',
        question_text: q.question_text,
        option_A: q.option_a, option_B: q.option_b,
        option_C: q.option_c, option_D: q.option_d,
        solution: q.solution,
      });
      const ans = res.data.correct_answer;
      await supabase.from(chapterTitle).update({ correct_option: ans }).eq('question_id', q.question_id);
      q.correct_option = ans;
      return ans;
    } catch { return null; }
    finally { setDeterminingAnswer(false); }
  };


  // ── Generate buddy-flavoured AI solution ───────────────────────────────────
  const generateAISolution = async (q: Question): Promise<string> => {
    try {
      setSolutionLoading(true);
      const col = buddy.columnKey;
  
      // 1. Check in-memory question object first (fastest)
      if (q[col] && typeof q[col] === 'string' && q[col].trim().length > 0) {
        return q[col] as string;
      }
  
      // 2. Re-fetch from Supabase to catch solutions saved by other users
    
      const { data: freshRow } = await supabase
        .from(chapterTitle)
        .select(col)
        .eq('question_id', q.question_id)
        .single();
  
      if ((freshRow as any)?.[col] && typeof (freshRow as any)?.[col] === 'string' && (freshRow as any)?.[col].trim().length > 0) {
        // Update local state so future calls hit the in-memory cache
        setQuestions(prev => prev.map((item, i) => i === currentIndex ? { ...item, [col]: (freshRow as any)?.[col] } : item));
        return (freshRow as any)?.[col] as string;
      }
  
      // 3. Only generate if truly not found
      const res = await axios.post(`${API_BASE}/solution`, {
        action: 'generate_solution',
        question_text: q.question_text,
        option_A: q.option_a, option_B: q.option_b,
        option_C: q.option_c, option_D: q.option_d,
        solution: q.solution,
        correct_option: q.correct_option,
        buddy_id: buddyId,
        buddy_name: buddy.name,
        buddy_system_prompt: buddy.systemPrompt,
      });
  
      const aiSol = res.data.solution || q.solution;
  
      // 4. Save to Supabase and update local state
      await supabase.from(chapterTitle).update({ [col]: aiSol }).eq('question_id', q.question_id);
      setQuestions(prev => prev.map((item, i) => i === currentIndex ? { ...item, [col]: aiSol } : item));
      return aiSol;
    } catch { return q.solution; }
    finally { setSolutionLoading(false); }
  };

  // ── Generate buddy motivation ──────────────────────────────────────────────
  const generateMotivation = async (correct: boolean) => {
    try {
      setMotivationLoading(true);
      const res = await axios.post(`${API_BASE}/motivation`, {
        message: correct
          ? `In the voice of ${buddy.name} (personality: ${buddy.systemPrompt}), give a very short 1-2 sentence encouraging message to a student who just got a JEE question CORRECT.`
          : `In the voice of ${buddy.name} (personality: ${buddy.systemPrompt}), give a very short 1-2 sentence motivating message to a student who just got a JEE question WRONG. Encourage them to keep going.`,
        buddy_id: buddyId,
        buddy_name: buddy.name,
      });
      const text = res.data.choices?.[0]?.message?.content || (correct ? 'Great job!' : 'Keep going!');
      setMotivation(text);
      return text;
    } catch {
      const fb = correct ? 'Excellent!' : 'Keep practicing!';
      setMotivation(fb); return fb;
    } finally { setMotivationLoading(false); }
  };

  // ── Post-answer: award coins + motivation + solution ───────────────────────
  const handlePostAnswer = async (
    correct: boolean, timeSpent: number, q: Question, optKey: string
  ) => {
    const coins = calcCoins(timeSpent, correct);
    if (correct) {
      addToast(coins > 0 ? `✓ Correct! +${coins} Coins earned` : '✓ Correct!', 'coin', 3500);
    } else {
      addToast(`✗ Not quite — keep going!`, 'error', 3000);
    }
  
    // Fire coins update in background — do NOT await it before motivation
    if (correct && coins > 0) updateRookieCoins(coins);
  
    const currentBuddyId = buddyId;
    setSolutionBuddyId(currentBuddyId);
  
    const [, aiSol] = await Promise.all([generateMotivation(correct), generateAISolution(q)]);
    setSolution(aiSol);
    setSolutionRequested(true);
    setTimeout(() => scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350);
    saveSession({
      selectedOption: optKey,
      isCorrect: correct,
      solution: aiSol,
      solutionRequested: true,
      solutionBuddyId: currentBuddyId,
      hasTyped: true,
    });
  };

  // ── MCQ selection ─────────────────────────────────────────────────────────
  const handleOptionClick = async (opt: string) => {
    if (selectedOption !== null) return;
    const q = questions[currentIndex];
    if (!q) return;
  
    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000);
    setSelectedOption(opt);
  
    let ans = q.correct_option;
    if (!ans) ans = await determineAnswer(q);
  
    const normalize = (val: string | null) => {
      if (!val) return null;
      return val
        .replace("option_", "")
        .replace("_img", "")
        .trim()
        .toUpperCase();
    };
  
    const correct = normalize(opt) === normalize(ans);
  
    console.log("Selected:", normalize(opt));
    console.log("Correct:", normalize(ans));
    console.log("Result:", correct);
  
    setIsCorrect(correct);
    await handlePostAnswer(correct, timeSpent, q, opt);
  };

  // ── Integer submit ─────────────────────────────────────────────────────────
  const handleIntegerSubmit = async () => {
    if (isCorrect !== null) return;
    const q = questions[currentIndex];
    if (!q || !integerAnswer.trim()) return;
    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000);
    let ans = q.correct_option;
    if (!ans) ans = await determineAnswer(q);
    const u = parseFloat(integerAnswer.trim()), c = parseFloat(ans || '');
    const correct = !isNaN(u) && !isNaN(c) ? u === c : integerAnswer.trim() === (ans || '').trim();
    setIsCorrect(correct);
    setSelectedOption('INTEGER');
    await handlePostAnswer(correct, timeSpent, q, 'INTEGER');
  };

  // ── AI Followup ───────────────────────────────────────────────────────────
  const handleAIFollowup = async (type: '5yr' | 'better') => {
    const q = questions[currentIndex];
    if (!q) return;
    setAIFollowupLoading(true); setAIFollowup(null);
    try {
      const res = await axios.post(`${API_BASE}/solution`, {
        action: type === '5yr' ? 'explain_5yr' : 'better_understanding',
        question_text: q.question_text,
        solution: q.solution,
        buddy_id: buddyId,
        buddy_name: buddy.name,
        buddy_system_prompt: buddy.systemPrompt,
      });
      setAIFollowup(res.data.explanation || 'Could not generate explanation.');
    } catch { setAIFollowup('Error generating explanation. Please try again.'); }
    finally { setAIFollowupLoading(false); }
  };

  // ── Dig Deeper ────────────────────────────────────────────────────────────
  const handleDigDeeper = async () => {
    const q = questions[currentIndex];
    if (!q) return;
    setIsDigging(true); setConceptLoading(true); setConceptMCQ(null); setPrevDigResult(null);
    try {
      const res = await axios.post(`${API_BASE}/solution`, {
        action: 'dig_deeper',
        question_text: q.question_text,
        solution: q.solution,
        buddy_id: buddyId,
        buddy_name: buddy.name,
        buddy_system_prompt: buddy.systemPrompt,
      });
      setConceptMCQ(res.data);
    } catch { setConceptFeedback('Error generating concept question.'); }
    finally { setConceptLoading(false); }
  };

  const handleConceptResponse = (ans: string) => {
    if (!conceptMCQ?.mcq) return;
    setDigDeepSelected(ans);
    if (ans === 'I_am_not_sure') {
      setPrevDigResult({ status: 'incorrect', explanation: conceptMCQ.mcq.explanation, answer: conceptMCQ.mcq.correctAnswer });
      return;
    }
    const correct = ans === conceptMCQ.mcq.correctAnswer;
    setPrevDigResult(correct
      ? { status: 'correct' }
      : { status: 'incorrect', explanation: conceptMCQ.mcq.explanation, answer: conceptMCQ.mcq.correctAnswer });
  };

  // ── Loading screen ────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? 'bg-[#07090f] text-white' : 'bg-[#F0F2FA] text-[#0f172a]'}`}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin mx-auto mb-4" />
          <p className={T.muted}>Loading questions…</p>
        </div>
      </div>
    );
  }

  const Q = questions[currentIndex];

  // Helper: parse exam_shift into readable label
  const parseShift = (s: string) => s?.split('_').join(' ') || null;

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    
    <div
      className={`min-h-screen pb-20 transition-colors duration-300 ${T.page}`}
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      {/* ── Toast stack ─────────────────────────────────────────────────────── */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[300] flex flex-col gap-2 items-center pointer-events-none">
        <AnimatePresence mode="popLayout">
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <Toast toast={t} onClose={removeToast} />
            </div>
          ))}
        </AnimatePresence>
      </div>

      {/* ── Image modal ──────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {imageModal && <ImageModal src={imageModal} onClose={() => setImageModal(null)} />}
      </AnimatePresence>

      {/* ── Header ───────────────────────────────────────────────────────────── */}
      <div className={`sticky top-0 z-30 backdrop-blur-sm border-b transition-colors duration-300 ${T.header}`}>
        <div className="flex items-center justify-between px-4 sm:px-6 py-3">
          {/* Back button */}
          <motion.button
            whileTap={{ scale: 0.95 }} onClick={() => router.back()}
            className={`w-9 h-9 rounded-xl border flex items-center justify-center flex-shrink-0 transition-colors ${T.btnSecondary}`}
          >
            <FiChevronLeft size={18} />
          </motion.button>

          {/* Chapter title */}
          <div className="flex-1 mx-3 min-w-0 text-center">
            <h1 className="text-sm sm:text-base font-bold truncate">{chapterTitle}</h1>
        
          </div>

          {/* Right: coins + timer */}
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`flex items-center gap-1.5 px-2.5 py-1.5 border rounded-lg text-xs font-semibold transition-colors ${T.coinBadge}`}>
              <Image src="coin (1).svg" alt="Coins" width={13} height={13} />
              <span>{rookieCoins}</span>
            </div>
            <div className={`flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs transition-colors ${T.btnSecondary}`}>
              <IoTimeOutline size={13} />
              <span>{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</span>
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="px-4 sm:px-6 pb-3">
          <div className="flex items-center justify-between mb-1.5">
            <span className={`text-[11px] ${T.muted}`}>
              Q {currentIndex + 1} / {questions.length}
            </span>
            {/* Buddy indicator */}
            <span className={`text-[11px] font-medium flex items-center gap-1 ${T.muted}`}>
            <img
  src={buddy.image}
  alt={buddy.name}
  width={32}
  height={32}
  className="w-8 h-8 rounded-full object-cover"
/>
              <span>{buddy.name}</span>
            </span>
          </div>
          <div className={`h-1 rounded-full overflow-hidden ${T.progress}`}>
          <motion.div
  className={`h-full ${T.bar}`}
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* ── Main content ──────────────────────────────────────────────────────── */}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-7 pb-8">
        {!Q ? (
          <p className={`text-center py-20 ${T.muted}`}>No questions available.</p>
        ) : (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 14 }}
            animate={{ opacity: 1, x: 0 }}
            className="space-y-4"
          >

            {/* ── Question card ─────────────────────────────────────────────── */}
            <div className={`rounded-2xl border p-5 sm:p-6 transition-colors duration-300 ${T.card}`}>
              {/* Badge row */}
              <div className="flex flex-wrap items-center gap-2 mb-4">
                {/* Exam shift – highlighted like screenshot */}
                {Q.exam_shift && (
                  <span className={`inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-full ${T.examBadge}`}>
                    {parseShift(Q.exam_shift)}
                  </span>
                )}
                {Q.year && (
                  <span className={`inline-flex items-center text-[11px] font-medium px-2.5 py-1 rounded-full ${T.yearBadge}`}>
                    {Q.year}
                  </span>
                )}
             
              </div>

              {/* Question text */}
              <div className="text-base sm:text-[17px] font-medium leading-relaxed">
                {renderLatex(Q.question_text)}
              </div>

              {/* Question image – fitted, click to enlarge */}
              {Q.question_img_url && (
                <div className="mt-4 relative group">
                  <div className={`rounded-xl border overflow-hidden flex items-center justify-center max-h-64 ${T.imgWrapper}`}>
                    <img
                      src={Q.question_img_url}
                      alt="Question illustration"
                      className="max-h-56 max-w-full object-contain cursor-zoom-in select-none"
                      onClick={() => setImageModal(Q.question_img_url!)}
                    />
                    {/* Enlarge button (always visible on mobile, hover on desktop) */}
                    <button
                      onClick={() => setImageModal(Q.question_img_url!)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/70 text-white flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity shadow"
                      title="Enlarge image"
                    >
                      <FiZoomIn size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* ── Integer type ──────────────────────────────────────────────── */}
            {isIntegerQ(Q) ? (
              <div className={`rounded-2xl border p-5 space-y-4 transition-colors ${T.card}`}>
                <p className={`text-sm font-medium ${T.muted}`}>Enter your integer answer:</p>

                {isCorrect === null ? (
                  <div className="flex gap-3">
                    <input
                      type="number"
                      value={integerAnswer}
                      onChange={e => setIntegerAnswer(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') handleIntegerSubmit(); }}
                      placeholder="Type your answer…"
                      className={`flex-1 border rounded-xl px-4 py-3 text-lg outline-none transition-colors ${T.input}`}
                    />
                    <motion.button
                      whileTap={{ scale: 0.97 }} onClick={handleIntegerSubmit}
                      disabled={!integerAnswer.trim()}
                      className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 font-semibold text-white transition-colors"
                    >
                      Submit
                    </motion.button>
                  </div>
                ) : (
                  <motion.div
                    initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                    className={`rounded-xl p-4 border-2 ${isCorrect ? 'bg-[#04271C] border-[#1DC97A]' : 'bg-[#2D0A0A] border-[#DC2626]'}`}
                  >
                    <span className={`font-bold text-base ${isCorrect ? 'text-[#1DC97A]' : 'text-[#DC2626]'}`}>
                      {isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                    </span>
                    <p className="text-sm text-gray-300 mt-1">
                      Your answer: <b className="text-white">{integerAnswer}</b>
                    </p>
                    {!isCorrect && Q.correct_option && (
                      <p className="text-sm text-gray-300 mt-0.5">
                        Correct: <b className="text-[#1DC97A]">{Q.correct_option}</b>
                      </p>
                    )}
                  </motion.div>
                )}

                {determiningAnswer && (
                  <div className="flex items-center gap-3">
                    <Spinner size={16} cls="border-white" />
                    <span className={`text-sm ${T.muted}`}>Determining correct answer…</span>
                  </div>
                )}
              </div>

            ) : selectedOption === null ? (
              /* ── MCQ unanswered ────────────────────────────────────────────── */
              <div className="space-y-2.5">
                {(['a', 'b', 'c', 'd'] as const).map(opt => {
                  const tv = Q[`option_${opt}`] as string;
                  const iv = Q[`option_${opt}_img`] as string | null;
                  if (!tv && !iv) return null;
                  return (
                    <motion.button
                      key={opt} whileTap={{ scale: 0.98 }} onClick={() => handleOptionClick(opt)}
                      className={`w-full text-left rounded-xl p-4 border flex items-center gap-4 transition-colors ${T.optionIdle}`}
                    >
                      <div className={`w-9 h-9 rounded-lg border flex items-center justify-center font-semibold text-sm uppercase flex-shrink-0 ${T.optionLabel}`}>
                        {opt}
                      </div>
                      <div className="flex-1 text-sm leading-relaxed">
                        {iv ? <img src={iv} alt={`opt-${opt}`} className="max-h-20 rounded-lg" /> : renderLatex(tv)}
                      </div>
                    </motion.button>
                  );
                })}
              </div>

            ) : (
              /* ── MCQ answered ──────────────────────────────────────────────── */
              <div className="space-y-2.5">
                {(['a', 'b', 'c', 'd'] as const).map(opt => {
                  const tv = Q[`option_${opt}`] as string;
                  const iv = Q[`option_${opt}_img`] as string | null;
                  if (!tv && !iv) return null;
                  const sel   = selectedOption === opt;
                  const corr  = opt === Q.correct_option?.toLowerCase().trim();
                  return (
                    
                    <motion.div
                      key={opt} initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                      className={`rounded-xl p-4 flex items-center gap-4 border-2 transition-colors ${
                        corr ? 'bg-[#04271C] border-[#1DC97A]' :
                        sel  ? 'bg-[#2D0A0A] border-[#DC2626]' :
                        isDark ? 'bg-[#0d1117] border-[#1e2538]' : 'bg-white border-[#E5E7EB]'
                      }`}
                    >
                      <div className={`w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-sm uppercase flex-shrink-0 ${
                        corr ? 'bg-[#1DC97A] text-black' :
                        sel  ? 'bg-[#DC2626] text-white' : T.optionLabel
                      }`}>
                        {opt}
                      </div>
                      <div className="flex-1 text-sm leading-relaxed">
                        {iv ? <img src={iv} alt={`opt-${opt}`} className="max-h-20 rounded-lg" /> : renderLatex(tv)}
                      </div>
                      {corr && <CheckIcon />}
                    </motion.div>
                  );
                })}
              </div>
            )}

            {/* Determining loader */}
            {determiningAnswer && selectedOption !== null && (
              <div className="flex items-center gap-3 py-1">
                <Spinner size={16} cls="border-white" />
                <span className={`text-sm ${T.muted}`}>Determining correct answer…</span>
              </div>
            )}

            {/* ── Post-answer section ───────────────────────────────────────── */}
            {selectedOption !== null && (
              <>
                {/* Buddy motivation card */}
                {motivationLoading ? (
                  <div className="rounded-2xl p-5 bg-gradient-to-r from-[#47006A] to-[#0031D0] flex items-center gap-3">
                    <Spinner size={18} cls="border-white" />
                    <span className="text-white text-sm">{buddy.name} is thinking…</span>
                  </div>
             ) : motivation ? (
              <motion.div
                key="motivation-card"  
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className="rounded-2xl p-5 bg-gradient-to-r from-[#47006A] to-[#0031D0]"
              >
                    <div className="flex items-start gap-3">
                    <img
  src={buddy.image}
  alt={buddy.name}
  width={32}
  height={32}
  className="w-12 h-12 rounded-full object-cover"
/>

                      <div>
                        <p className="text-[11px] font-bold text-white/50 uppercase tracking-widest mb-1">
                          {buddy.name}
                        </p>
                        <p className="text-white text-sm leading-relaxed font-medium">{motivation}</p>
                      </div>
                    </div>
                  </motion.div>
                ) : null}

{(solutionRequested || solution) && (


  <div key="solution-card" className={`rounded-2xl border p-5 sm:p-6 transition-colors ${T.solCard}`}>
                    <div className="flex items-center gap-2.5 mb-4">
                    <img
  src={solutionBuddy.image}
  alt={solutionBuddy.name}
  width={32}
  height={32}
  className="w-10 h-10 rounded-full object-cover"
/>
<div>
  <h3 className="font-bold text-sm">Solution</h3>
  <p className={`text-[11px] ${T.muted}`}>Explained by {solutionBuddy.name}</p>
</div>
                    </div>

                    {solutionLoading ? (
                      <div className="flex items-center gap-3 py-5">
                        <Spinner size={20} />
                        <span className={`text-sm ${T.muted}`}>Generating solution…</span>
                      </div>
                    ) : (
                      <div className={`text-sm leading-relaxed whitespace-pre-wrap ${isDark ? 'text-gray-200' : 'text-gray-700'}`}>
                        {renderLatex(displayedText || solution)}
                        {isTyping && (
                          <span className="inline-block w-0.5 h-4 bg-indigo-400 animate-pulse ml-0.5 align-middle" />
                        )}
                      </div>
                    )}

                    {/* AI Followup buttons */}
                    {!solutionLoading && solution && (
                      <div className="mt-5">
                        {!aiFollowup && !aiFollowupLoading && (
                          <div className="flex flex-wrap gap-2">
                            <motion.button
                              whileTap={{ scale: 0.97 }} onClick={handleDigDeeper}
                              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-colors ${isDark ? 'bg-white text-black border-white hover:bg-gray-100' : 'bg-[#0f172a] text-white border-[#0f172a] hover:bg-[#1e293b]'}`}
                            >
                              <FiSearch size={13} /> Test Your Understanding
                            </motion.button>
                            <motion.button
                              whileTap={{ scale: 0.97 }} onClick={() => handleAIFollowup('better')}
                              className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs sm:text-sm font-semibold border transition-colors ${isDark ? 'bg-white text-black border-white hover:bg-gray-100' : 'bg-[#0f172a] text-white border-[#0f172a] hover:bg-[#1e293b]'}`}
                            >
                              <FiSmile size={13} /> Simpler Explanation
                            </motion.button>
                          </div>
                        )}

                        {aiFollowupLoading && (
                          <div className="flex items-center gap-3 mt-3">
                            <Spinner size={16} />
                            <span className={`text-sm ${T.muted}`}>Generating…</span>
                          </div>
                        )}

                        {aiFollowup && (
                          <motion.div
                            initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                            className={`mt-4 rounded-xl border p-4 text-sm leading-relaxed whitespace-pre-wrap transition-colors ${T.followCard}`}
                          >
                            {aiFollowup}
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {/* ── Dig Deeper ──────────────────────────────────────────────── */}
                <AnimatePresence>
                  {isDigging && (
                    <motion.div
                      initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                      className="rounded-2xl overflow-hidden"
                    >
                      <div className="bg-gradient-to-r from-[#47006A] to-[#0031D0] p-5 sm:p-6 rounded-2xl">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex-1 min-w-0">
                            <div className="font-bold text-white text-base">Test Your Understanding</div>
                            {prevDigResult?.status && (
                              <div className="text-xs text-white/70 mt-1">
                                {prevDigResult.status === 'correct'
                                  ? '✓ Previous: Correct!'
                                  : `✗ Correct was: ${prevDigResult.answer}`}
                              </div>
                            )}
                            {prevDigResult?.status === 'incorrect' && prevDigResult.explanation && (
                              <div className="mt-2 text-sm bg-white/10 rounded-xl p-3 text-white/90">
                                {prevDigResult.explanation}
                              </div>
                            )}
                          </div>
                          <button
                            onClick={() => { setIsDigging(false); setConceptMCQ(null); setPrevDigResult(null); setDigDeepSelected(null); }}
                            className="ml-3 flex-shrink-0 bg-white/20 hover:bg-white/30 text-white text-xs px-3 py-1.5 rounded-full font-medium transition-colors"
                          >
                            Close
                          </button>
                        </div>

                        {conceptLoading ? (
                          <div className="flex items-center gap-3">
                            <Spinner size={22} cls="border-white" />
                            <span className="text-white text-sm">Generating question…</span>
                          </div>
                        ) : conceptMCQ?.mcq ? (
                          <>
                            <div className="text-white font-semibold text-sm sm:text-base mb-4">
                              {conceptMCQ.mcq.question}
                            </div>
                            <div className="space-y-2.5">
                              {conceptMCQ.mcq.options.map((opt: string, i: number) => {
                                const l = ['a', 'b', 'c', 'd'][i];
                                const sel = digDeepSelected === l;
                                return (
                                  <motion.button
                                    key={i} whileTap={{ scale: 0.99 }}
                                    onClick={() => handleConceptResponse(l)}
                                    className={`w-full text-left rounded-xl p-3.5 flex items-center gap-3 transition-colors ${
                                      sel ? 'bg-[#04271C] border-2 border-[#1DC97A]' : 'bg-black/30 border border-white/10 hover:border-white/30'
                                    }`}
                                  >
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-semibold text-sm flex-shrink-0 ${sel ? 'bg-[#1DC97A] text-black' : 'bg-white/10 text-white'}`}>
                                      {l}
                                    </div>
                                    <span className="text-white text-sm">{opt}</span>
                                  </motion.button>
                                );
                              })}
                            </div>
                            <button
                              onClick={() => handleConceptResponse('I_am_not_sure')}
                              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 text-white text-xs font-medium hover:bg-white/30 transition-colors"
                            >
                              <FiX size={12} /> Not Sure
                            </button>
                          </>
                        ) : (
                          <div className="text-sm text-white/60">{conceptFeedback || 'Loading…'}</div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </>
            )}

            <div ref={scrollRef} />
          </motion.div>
        )}
      </div>

      {/* ── Footer navigation ────────────────────────────────────────────────── */}
      <div className={`fixed bottom-0 left-0 right-0 h-16 backdrop-blur-sm border-t flex items-center justify-between px-4 sm:px-6 z-40 transition-colors duration-300 ${T.footer}`}>
        {/* Previous */}
        <motion.button
          whileTap={{ scale: 0.97 }}
          onClick={() => { if (currentIndex > 0) setCurrentIndex(currentIndex - 1); }}
          disabled={currentIndex === 0}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-sm font-semibold disabled:opacity-40 transition-colors ${T.btnSecondary}`}
        >
          <FiArrowLeft size={15} />
          <span className="hidden sm:inline">Previous</span>
        </motion.button>

      

        <div className="flex items-center gap-2">
          {/* Bookmark */}
          <motion.button
            whileTap={{ scale: 0.97 }} onClick={handleBookmark}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${bookmarked ? 'bg-indigo-600 border-indigo-500 text-white' : T.btnSecondary}`}
          >
            {bookmarked ? <IoBookmark size={17} /> : <FiBookmark size={17} />}
          </motion.button>

          {/* Next */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => { if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1); }}
            disabled={currentIndex === questions.length - 1}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-40 transition-colors"
          >
            <span>Next</span> <FiArrowRight size={15} />
          </motion.button>
        </div>
      </div>
    </div>
  );
}