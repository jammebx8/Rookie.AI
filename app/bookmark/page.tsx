'use client';

import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiArrowLeft,
  FiTrash2,
  FiSmile,
  FiInbox,
  FiChevronDown,
  FiChevronUp,
  FiZoomIn,
  FiX,
  FiSearch,
} from 'react-icons/fi';
import { IoBookmark } from 'react-icons/io5';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

const BOOKMARKS_KEY = 'bookmarkedQuestions';
const API_BASE = 'https://rookie-backend.vercel.app/api';

type BookmarkedQuestion = {
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
  subjectName?: string;
  chapterTitle?: string;
  imageKey?: string;
  [key: string]: any;
};

type QuestionState = {
  selectedOption: string | null;
  isCorrect: boolean | null;
  solution: string;
  motivation: string;
  aiFollowup: string | null;
  solutionLoading: boolean;
  motivationLoading: boolean;
  aiFollowupLoading: boolean;
  determiningAnswer: boolean;
  integerAnswer: string;
  hasTyped: boolean;
  solutionRequested: boolean 
};

function defaultState(): QuestionState {
  return {
    selectedOption: null,
    isCorrect: null,
    solution: '',
    motivation: '',
    aiFollowup: null,
    solutionLoading: false,
    solutionRequested: false,
    motivationLoading: false,
    aiFollowupLoading: false,
    determiningAnswer: false,
    integerAnswer: '',
    hasTyped: false,
  };
}

// ── Theme hook ────────────────────────────────────────────────────────────
function useTheme() {
  const [isDark, setIsDark] = useState(true);
  useEffect(() => {
    try {
      setIsDark(localStorage.getItem('theme') !== 'light');
    } catch {}
    const observer = new MutationObserver(() => {
      try {
        setIsDark(localStorage.getItem('theme') !== 'light');
      } catch {}
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    const onStorage = () => {
      try {
        setIsDark(localStorage.getItem('theme') !== 'light');
      } catch {}
    };
    window.addEventListener('storage', onStorage);
    return () => {
      observer.disconnect();
      window.removeEventListener('storage', onStorage);
    };
  }, []);
  return isDark;
}

// ── LaTeX renderer ───────────��─────────────────────────────────────────────
function renderLatex(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/);
  return parts.map((part, i) => {
    if (part.startsWith('$$') && part.endsWith('$$'))
      return <BlockMath key={i} math={part.slice(2, -2)} />;
    if (part.startsWith('$') && part.endsWith('$'))
      return <InlineMath key={i} math={part.slice(1, -1)} />;
    return <span key={i}>{part}</span>;
  });
}

// ── Typing effect hook ─────────────────────────────────────────────────────
function useTypingEffect(text: string, active: boolean) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (!active || !text) {
      setDisplayed(text);
      return;
    }
    setDisplayed('');
    let i = 0;
    const interval = setInterval(() => {
      setDisplayed(text.slice(0, i));
      i++;
      if (i > text.length) clearInterval(interval);
    }, 8);
    return () => clearInterval(interval);
  }, [text, active]);
  return displayed;
}

// ── Subject accent colours ─────────────────────────────────────────────────
const SUBJECT_COLORS: Record<string, string> = {
  Physics: '#3B82F6',
  Chemistry: '#10B981',
  Biology: '#F59E0B',
  Mathematics: '#8B5CF6',
  Math: '#8B5CF6',
};
function subjectColor(name: string) {
  return SUBJECT_COLORS[name] ?? '#6B7280';
}

// ── Checkmark icon ────────────────────────────────────────────────────────
function CheckIcon() {
  return (
    <svg width="14" height="11" viewBox="0 0 14 11" fill="none">
      <path
        d="M1 5.5L5 9L13 1"
        stroke="white"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── Spinner ───────────────────────────────────────────────────────────────
function Spinner({ size = 5, color = 'white' }: { size?: number; color?: string }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className="rounded-full border-2 border-t-transparent flex-shrink-0"
      style={{
        width: size * 4,
        height: size * 4,
        borderColor: color,
        borderTopColor: 'transparent',
      }}
    />
  );
}

// ── Image Modal ───────────────────────────────────────────────────────────
function ImageModal({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/85 backdrop-blur-sm p-6"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.86 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.86 }}
        onClick={(e) => e.stopPropagation()}
        className="relative max-w-xl w-full"
      >
        <button
          onClick={onClose}
          className="absolute -top-3 -right-3 z-10 w-8 h-8 bg-white text-black rounded-full flex items-center justify-center shadow-lg font-bold"
        >
          <FiX size={14} />
        </button>
        <img
          src={src}
          alt="Question"
          className="rounded-2xl object-contain max-h-[72vh] w-full shadow-2xl border border-white/10"
        />
      </motion.div>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Single Question Card — full interactive experience
// ────────────────────────────────────────────────────────────────────────────
function QuestionCard({
  q,
  onRemove,
  isDark,
}: {
  q: BookmarkedQuestion;
  onRemove: (q: BookmarkedQuestion) => void;
  isDark: boolean;
}) {
  const [state, setState] = useState<QuestionState>(defaultState());
  const [expanded, setExpanded] = useState(true);
  const [imageModal, setImageModal] = useState<string | null>(null);
  const solutionRef = useRef<HTMLDivElement | null>(null);
  const color = subjectColor(q.subjectName || 'Other');

  const typedSolution = useTypingEffect(state.solution, !!state.solution && state.hasTyped);

  const patch = (partial: Partial<QuestionState>) =>
    setState((prev) => ({ ...prev, ...partial }));

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const T = {
    card: isDark
      ? 'bg-[#0d1117] border-[#1e2538]'
      : 'bg-white border-[#E5E7EB]',
    optionIdle: isDark
      ? 'bg-[#0d1117] border-[#1e2538] hover:border-indigo-500/50 text-white'
      : 'bg-white border-[#E5E7EB] hover:border-indigo-400 text-[#0f172a]',
    optionLabel: isDark
      ? 'bg-[#151B27] border-[#262F4C] text-slate-200'
      : 'bg-[#F3F4F6] border-[#D1D5DB] text-[#374151]',
    input: isDark
      ? 'bg-[#0d1117] border-[#1e2538] text-white placeholder-gray-500 focus:border-indigo-500'
      : 'bg-white border-[#D1D5DB] text-[#0f172a] placeholder-gray-400 focus:border-indigo-400',
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
    text: isDark ? 'text-white' : 'text-[#0f172a]',
    imgWrapper: isDark
      ? 'bg-[#0d1117] border-[#1e2538]'
      : 'bg-gray-50 border-gray-200',
    examBadge: isDark
      ? 'bg-blue-900/40 text-blue-400 border border-blue-500/50'
      : 'bg-blue-100 text-blue-700 border border-blue-300',
    yearBadge: isDark
      ? 'bg-[#1a2235] text-slate-400'
      : 'bg-gray-100 text-gray-500',
    solCard: isDark
      ? 'bg-[#0d1117] border-[#1e2538]'
      : 'bg-white border-[#E5E7EB]',
    followCard: isDark
      ? 'bg-[#0a0f1a] border-[#1D2939] text-slate-300'
      : 'bg-indigo-50 border-indigo-200 text-slate-700',
    headerBar: isDark
      ? 'bg-[#0A0E17] border-[#1D2939]'
      : 'bg-white border-[#E5E7EB]',
    headerText: isDark ? 'text-white' : 'text-[#0f172a]',
  };

  // ── Check if integer question ────────────────────────────────────────────
  const isIntegerQ = () =>
    !q.option_a &&
    !q.option_b &&
    !q.option_c &&
    !q.option_d &&
    !q.option_a_img &&
    !q.option_b_img &&
    !q.option_c_img &&
    !q.option_d_img;

  // ── Handle option selection ───────────────────────────────────────────────
  const handleOptionClick = async (option: string) => {
    if (state.selectedOption !== null) return;

    patch({ selectedOption: option });

    let correctAnswer = q.correct_option;

    if (!correctAnswer) {
      patch({ determiningAnswer: true });
      try {
        const res = await axios.post(`${API_BASE}/solution`, {
          action: 'determine_answer',
          question_text: q.question_text,
          option_A: q.option_a,
          option_B: q.option_b,
          option_C: q.option_c,
          option_D: q.option_d,
          solution: q.solution,
        });
        correctAnswer = res.data.correct_answer ?? null;
        q.correct_option = correctAnswer;
      } catch {
        //
      }
      patch({ determiningAnswer: false });
    }

    const isCorrect = option === correctAnswer;
    patch({ isCorrect, motivationLoading: true, solutionLoading: true });

    // Motivation
    try {
      const msg = isCorrect
        ? 'Generate a short, encouraging message for getting a question right'
        : 'Generate a short, motivating message for getting a question wrong';
      const res = await axios.post(`${API_BASE}/motivation`, { message: msg });
      const text =
        res.data.choices?.[0]?.message?.content ??
        (isCorrect ? 'Great job! Keep it up!' : "Don't worry, learn from this!");
      patch({ motivation: text, motivationLoading: false });
    } catch {
      patch({
        motivation: isCorrect ? 'Excellent work!' : 'Keep practicing!',
        motivationLoading: false,
      });
    }

    // AI solution
    try {
      let aiSolution = q.sol_ai ?? '';
      if (!aiSolution) {
        const res = await axios.post(`${API_BASE}/solution`, {
          action: 'generate_solution',
          question_text: q.question_text,
          option_A: q.option_a,
          option_B: q.option_b,
          option_C: q.option_c,
          option_D: q.option_d,
          solution: q.solution,
          correct_option: q.correct_option,
        });
        aiSolution = res.data.solution ?? q.solution;
        q.sol_ai = aiSolution;
      }
      patch({ solution: aiSolution, solutionLoading: false, hasTyped: false });
    } catch {
      patch({ solution: q.solution, solutionLoading: false, hasTyped: false });
    }

    setTimeout(
      () => solutionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      350,
    );
  };

  // ── Handle integer submit ─────────────────────────────────────────────────
  const handleIntegerSubmit = async () => {
    if (state.isCorrect !== null) return;
    if (!state.integerAnswer.trim()) return;

    patch({ selectedOption: 'INTEGER' });

    let correctAnswer = q.correct_option;

    if (!correctAnswer) {
      patch({ determiningAnswer: true });
      try {
        const res = await axios.post(`${API_BASE}/solution`, {
          action: 'determine_answer',
          question_text: q.question_text,
          solution: q.solution,
        });
        correctAnswer = res.data.correct_answer ?? null;
        q.correct_option = correctAnswer;
      } catch {
        //
      }
      patch({ determiningAnswer: false });
    }

    const u = parseFloat(state.integerAnswer.trim());
    const c = parseFloat(correctAnswer || '');
    const isCorrect =
      !isNaN(u) && !isNaN(c) ? u === c : state.integerAnswer.trim() === (correctAnswer || '').trim();

    patch({ isCorrect, motivationLoading: true, solutionLoading: true });

    // Motivation
    try {
      const msg = isCorrect
        ? 'Generate a short, encouraging message for getting a question right'
        : 'Generate a short, motivating message for getting a question wrong';
      const res = await axios.post(`${API_BASE}/motivation`, { message: msg });
      const text =
        res.data.choices?.[0]?.message?.content ??
        (isCorrect ? 'Great job! Keep it up!' : "Don't worry, learn from this!");
      patch({ motivation: text, motivationLoading: false });
    } catch {
      patch({
        motivation: isCorrect ? 'Excellent work!' : 'Keep practicing!',
        motivationLoading: false,
      });
    }

    // AI solution
    try {
      let aiSolution = q.sol_ai ?? '';
      if (!aiSolution) {
        const res = await axios.post(`${API_BASE}/solution`, {
          action: 'generate_solution',
          question_text: q.question_text,
          solution: q.solution,
          correct_option: q.correct_option,
        });
        aiSolution = res.data.solution ?? q.solution;
        q.sol_ai = aiSolution;
      }
      patch({ solution: aiSolution, solutionLoading: false, hasTyped: false });
    } catch {
      patch({ solution: q.solution, solutionLoading: false, hasTyped: false });
    }

    setTimeout(
      () => solutionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      350,
    );
  };

  // ── Simpler Explanation ───────────────────────────────────────────────────
  const handleSimpler = async () => {
    patch({ aiFollowupLoading: true, aiFollowup: null });
    try {
      const res = await axios.post(`${API_BASE}/solution`, {
        action: 'better_understanding',
        question_text: q.question_text,
        solution: q.solution,
      });
      patch({
        aiFollowup: res.data.explanation ?? 'Could not generate explanation.',
        aiFollowupLoading: false,
      });
    } catch {
      patch({
        aiFollowup: 'Error generating explanation. Please try again.',
        aiFollowupLoading: false,
      });
    }
  };

  const parseShift = (s: string) => s?.split('_').join(' ') || null;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
      className={`rounded-2xl border overflow-hidden transition-colors duration-300 ${T.card}`}
    >
      {/* ── Image modal ───────────────────────────────────────────────────────── */}
      <AnimatePresence>
        {imageModal && <ImageModal src={imageModal} onClose={() => setImageModal(null)} />}
      </AnimatePresence>

      {/* ── Card header bar ── */}
      <div className={`flex items-center justify-between px-5 py-3 border-b transition-colors duration-300 ${T.headerBar}`}>
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ backgroundColor: `${color}22`, color }}
          >
            {q.subjectName || 'Other'}
          </span>
          <span className={`text-xs truncate max-w-[160px] ${T.muted}`}>
            {q.chapterTitle}
          </span>
          {q.year && (
            <span className={`text-xs flex-shrink-0 ${T.yearBadge} px-2 py-1 rounded-full`}>
              {q.year}
            </span>
          )}
          {q.exam_shift && (
            <span className={`text-xs flex-shrink-0 ${T.examBadge} px-2 py-1 rounded-full`}>
              {parseShift(q.exam_shift)}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setExpanded((v) => !v)}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
              isDark
                ? 'bg-[#151B27] border-[#1D2939] text-gray-400'
                : 'bg-gray-100 border-gray-200 text-gray-600'
            }`}
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <FiChevronUp size={15} /> : <FiChevronDown size={15} />}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onRemove(q)}
            className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
              isDark
                ? 'bg-[#1a0a0a] border-[#3a1414] text-red-500'
                : 'bg-red-50 border-red-200 text-red-600'
            }`}
            aria-label="Remove bookmark"
          >
            <FiTrash2 size={14} />
          </motion.button>
        </div>
      </div>

      {/* ── Collapsible body ── */}
      <AnimatePresence initial={false}>
        {expanded && (
          <motion.div
            key="body"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="px-5 pt-5 pb-6 space-y-5">
              {/* ── Question text ── */}
              <div className={`text-base font-medium leading-relaxed ${T.text}`}>
                {renderLatex(q.question_text)}
              </div>

              {/* ── Question image ── */}
              {q.question_img_url && (
                <div className="relative group">
                  <div
                    className={`rounded-xl border overflow-hidden flex items-center justify-center max-h-64 transition-colors ${T.imgWrapper}`}
                  >
                    <img
                      src={q.question_img_url}
                      alt="Question illustration"
                      className="max-h-56 max-w-full object-contain cursor-zoom-in select-none"
                      onClick={() => setImageModal(q.question_img_url!)}
                    />
                    <button
                      onClick={() => setImageModal(q.question_img_url!)}
                      className="absolute top-2 right-2 w-8 h-8 rounded-lg bg-black/70 text-white flex items-center justify-center sm:opacity-0 sm:group-hover:opacity-100 opacity-100 transition-opacity shadow"
                      title="Enlarge image"
                    >
                      <FiZoomIn size={14} />
                    </button>
                  </div>
                </div>
              )}

              {q.source_url && (
                <a
                  href={q.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:underline"
                >
                  View Source
                </a>
              )}

              {/* ── Integer type ── */}
              {isIntegerQ() ? (
                <div className={`rounded-xl border p-4 space-y-4 transition-colors ${T.card}`}>
                  <p className={`text-sm font-medium ${T.muted}`}>Enter your integer answer:</p>

                  {state.isCorrect === null ? (
                    <div className="flex gap-3">
                      <input
                        type="number"
                        value={state.integerAnswer}
                        onChange={(e) => patch({ integerAnswer: e.target.value })}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleIntegerSubmit();
                        }}
                        placeholder="Type your answer…"
                        className={`flex-1 border rounded-xl px-4 py-3 text-lg outline-none transition-colors ${T.input}`}
                      />
                      <motion.button
                        whileTap={{ scale: 0.97 }}
                        onClick={handleIntegerSubmit}
                        disabled={!state.integerAnswer.trim()}
                        className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 font-semibold text-white transition-colors"
                      >
                        Submit
                      </motion.button>
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`rounded-xl p-4 border-2 ${
                        state.isCorrect
                          ? 'bg-[#04271C] border-[#1DC97A]'
                          : 'bg-[#2D0A0A] border-[#DC2626]'
                      }`}
                    >
                      <span
                        className={`font-bold text-base ${
                          state.isCorrect ? 'text-[#1DC97A]' : 'text-[#DC2626]'
                        }`}
                      >
                        {state.isCorrect ? '✓ Correct!' : '✗ Incorrect'}
                      </span>
                      <p className="text-sm text-gray-300 mt-1">
                        Your answer: <b className="text-white">{state.integerAnswer}</b>
                      </p>
                      {!state.isCorrect && q.correct_option && (
                        <p className="text-sm text-gray-300 mt-0.5">
                          Correct: <b className="text-[#1DC97A]">{q.correct_option}</b>
                        </p>
                      )}
                    </motion.div>
                  )}

                  {state.determiningAnswer && (
                    <div className="flex items-center gap-3">
                      <Spinner size={4} color={isDark ? 'white' : '#0f172a'} />
                      <span className={`text-sm ${T.muted}`}>Determining correct answer…</span>
                    </div>
                  )}
                </div>
              ) : state.selectedOption === null ? (
                /* ── MCQ unanswered ── */
                <div className="space-y-3">
                  {(['a', 'b', 'c', 'd'] as const).map((opt) => {
                    const tv = q[`option_${opt}`] as string;
                    const iv = q[`option_${opt}_img`] as string | null;
                    if (!tv && !iv) return null;
                    return (
                      <motion.button
                        key={opt}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleOptionClick(opt)}
                        className={`w-full text-left rounded-xl p-4 border flex items-center gap-4 transition-colors ${T.optionIdle}`}
                      >
                        <div
                          className={`w-9 h-9 rounded-lg border flex items-center justify-center font-semibold text-sm uppercase flex-shrink-0 transition-colors ${T.optionLabel}`}
                        >
                          {opt}
                        </div>
                        <div className="flex-1 text-sm leading-relaxed">
                          {iv ? (
                            <img src={iv} alt={`opt-${opt}`} className="max-h-20 rounded-lg" />
                          ) : (
                            renderLatex(tv)
                          )}
                        </div>
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                /* ── MCQ answered ── */
                <div className="space-y-3">
                  {(['a', 'b', 'c', 'd'] as const).map((opt) => {
                    const tv = q[`option_${opt}`] as string;
                    const iv = q[`option_${opt}_img`] as string | null;
                    if (!tv && !iv) return null;
                    const sel = state.selectedOption === opt;
                    const corr = opt === q.correct_option?.toLowerCase().trim();
                    return (
                      <motion.div
                        key={opt}
                        initial={{ opacity: 0, y: 5 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`rounded-xl p-4 flex items-center gap-4 border-2 transition-colors ${
                          corr
                            ? 'bg-[#04271C] border-[#1DC97A]'
                            : sel
                            ? 'bg-[#2D0A0A] border-[#DC2626]'
                            : T.card
                        }`}
                      >
                        <div
                          className={`w-9 h-9 rounded-lg flex items-center justify-center font-semibold text-sm uppercase flex-shrink-0 transition-colors ${
                            corr
                              ? 'bg-[#1DC97A] text-black'
                              : sel
                              ? 'bg-[#DC2626] text-white'
                              : T.optionLabel
                          }`}
                        >
                          {opt}
                        </div>
                        <div className={`flex-1 text-sm leading-relaxed ${corr || sel ? 'text-white' : T.text}`}>
                          {iv ? (
                            <img src={iv} alt={`opt-${opt}`} className="max-h-20 rounded-lg" />
                          ) : (
                            renderLatex(tv)
                          )}
                        </div>
                        {corr && <CheckIcon />}
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* Determining loader */}
              {state.determiningAnswer && state.selectedOption !== null && (
                <div className="flex items-center gap-3 py-1">
                  <Spinner size={4} color={isDark ? 'white' : '#0f172a'} />
                  <span className={`text-sm ${T.muted}`}>Determining correct answer…</span>
                </div>
              )}

              {/* ── Post-answer section ── */}
              {state.selectedOption !== null && (
                <>
                  {/* Motivation card */}
                  {state.motivationLoading ? (
                    <div className="rounded-2xl p-5 bg-gradient-to-r from-[#47006A] to-[#0031D0] flex items-center gap-3">
                      <Spinner size={5} color="white" />
                      <span className="text-white text-sm">Thinking…</span>
                    </div>
                  ) : state.motivation ? (
                    <motion.div
                      key="motivation-card"
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl p-5 bg-gradient-to-r from-[#47006A] to-[#0031D0]"
                    >
                      <p className="text-white text-sm leading-relaxed font-medium">
                        {state.motivation}
                      </p>
                    </motion.div>
                  ) : null}

                  {state.solutionRequested && (
                    <div
                      key="solution-card"
                      className={`rounded-2xl border p-5 transition-colors ${T.solCard}`}
                    >
                      <h3 className={`font-bold text-base mb-4 ${T.text}`}>Solution</h3>

                      {state.solutionLoading ? (
                        <div className="flex items-center gap-3 py-5">
                          <Spinner size={5} color={isDark ? 'white' : '#0f172a'} />
                          <span className={`text-sm ${T.muted}`}>Generating solution…</span>
                        </div>
                      ) : (
                        <div
                          className={`text-sm leading-relaxed whitespace-pre-wrap ${
                            isDark ? 'text-gray-200' : 'text-gray-700'
                          }`}
                        >
                          {renderLatex(state.hasTyped ? state.solution : typedSolution)}
                        </div>
                      )}

                      {/* AI Followup buttons */}
                      {!state.solutionLoading && state.solution && (
                        <div className="mt-5">
                          {!state.aiFollowup && !state.aiFollowupLoading && (
                            <div className="flex flex-wrap gap-2">
                              <motion.button
                                whileTap={{ scale: 0.97 }}
                                onClick={handleSimpler}
                                className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold border transition-colors ${
                                  isDark
                                    ? 'bg-white text-black border-white hover:bg-gray-100'
                                    : 'bg-[#0f172a] text-white border-[#0f172a] hover:bg-[#1e293b]'
                                }`}
                              >
                                <FiSmile size={13} /> Simpler Explanation
                              </motion.button>
                            </div>
                          )}

                          {state.aiFollowupLoading && (
                            <div className="flex items-center gap-3 mt-3">
                              <Spinner size={4} color={isDark ? 'white' : '#0f172a'} />
                              <span className={`text-sm ${T.muted}`}>Generating…</span>
                            </div>
                          )}

                          {state.aiFollowup && (
                            <motion.div
                              initial={{ opacity: 0, y: 6 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`mt-4 rounded-xl border p-4 text-sm leading-relaxed whitespace-pre-wrap transition-colors ${T.followCard}`}
                            >
                              {state.aiFollowup}
                            </motion.div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Scroll anchor */}
              <div ref={solutionRef} />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Main Bookmark Page
// ────────────────────────────────────────────────────────────────────────────
export default function BookmarkPage() {
  const isDark = useTheme();
  const router = useRouter();
  const [bookmarks, setBookmarks] = useState<BookmarkedQuestion[]>([]);
  const [activeSubject, setActiveSubject] = useState<string>('All');

  useEffect(() => {
    try {
      const stored = localStorage.getItem(BOOKMARKS_KEY);
      if (stored) setBookmarks(JSON.parse(stored));
    } catch {
      setBookmarks([]);
    }
  }, []);

  const subjects = [
    'All',
    ...Array.from(new Set(bookmarks.map((q) => q.subjectName || 'Other'))),
  ];

  const filtered =
    activeSubject === 'All'
      ? bookmarks
      : bookmarks.filter((q) => (q.subjectName || 'Other') === activeSubject);

  const handleRemove = (q: BookmarkedQuestion) => {
    const updated = bookmarks.filter(
      (b) =>
        !(
          b.question_id === q.question_id &&
          b.chapterTitle === q.chapterTitle &&
          b.subjectName === q.subjectName
        ),
    );
    setBookmarks(updated);
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(updated));
  };

  // ── Theme tokens ──────────────────────────────────────────────────────────
  const T = {
    page: isDark
      ? 'bg-[#07090f] text-white'
      : 'bg-[#F0F2FA] text-[#0f172a]',
    header: isDark
      ? 'bg-[#07090f]/95 border-[#1e2538]'
      : 'bg-white/95 border-[#E5E7EB]',
    headerText: isDark ? 'text-white' : 'text-[#0f172a]',
    muted: isDark ? 'text-slate-400' : 'text-slate-500',
    badge: isDark
      ? 'bg-[#111827] border-[#1D2939] text-white'
      : 'bg-amber-50 border-amber-200 text-amber-800',
    btnSecondary: isDark
      ? 'bg-[#111827] border-[#1D2939] text-white hover:bg-[#1a2235]'
      : 'bg-white border-[#D1D5DB] text-[#0f172a] hover:bg-gray-50',
    tabActive: (color: string) => ({
      backgroundColor: color,
      borderColor: color,
    }),
    tabInactive: isDark
      ? 'bg-transparent border-[#1D2939] text-gray-400 hover:border-gray-500'
      : 'bg-transparent border-[#D1D5DB] text-gray-600 hover:border-gray-400',
    emptyState: isDark
      ? 'bg-[#111] border-[#1D2939] text-gray-600'
      : 'bg-gray-50 border-gray-200 text-gray-400',
  };

  return (
    <div
      className={`min-h-screen pb-12 transition-colors duration-300 ${T.page}`}
      style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}
    >
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className={`sticky top-0 z-30 backdrop-blur-sm border-b transition-colors duration-300 ${T.header}`}
      >
        <div className={`px-5 py-4 flex items-center gap-3 transition-colors ${T.headerText}`}>
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => router.back()}
            className={`w-10 h-10 rounded-xl border flex items-center justify-center flex-shrink-0 transition-colors ${T.btnSecondary}`}
          >
            <FiArrowLeft size={18} />
          </motion.button>

          <div className="flex-1">
            <h1 className="text-lg font-bold leading-none">Bookmarks</h1>
            <p className={`text-xs ${T.muted} mt-0.5`}>
              {bookmarks.length} saved question{bookmarks.length !== 1 ? 's' : ''}
            </p>
          </div>

          <div className={`flex items-center gap-1.5 border rounded-full px-3 py-1.5 transition-colors ${T.badge}`}>
            <IoBookmark size={14} />
            <span className="text-sm font-bold tabular-nums">{bookmarks.length}</span>
          </div>
        </div>

        {/* ── Subject filter tabs ── */}
        {bookmarks.length > 0 && (
          <div
            className="px-4 pb-3 flex gap-2 overflow-x-auto"
            style={{ scrollbarWidth: 'none' }}
          >
            {subjects.map((subject) => {
              const isActive = activeSubject === subject;
              const color = subjectColor(subject);
              const count =
                subject === 'All'
                  ? bookmarks.length
                  : bookmarks.filter((q) => (q.subjectName || 'Other') === subject).length;

              return (
                <motion.button
                  key={subject}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setActiveSubject(subject)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium border transition-all duration-200 ${
                    isActive ? 'text-black' : T.tabInactive
                  }`}
                  style={isActive ? T.tabActive(color) : {}}
                >
                  {subject}
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                      isActive
                        ? 'bg-black/20 text-white'
                        : isDark
                        ? 'bg-[#151B27] text-gray-500'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {count}
                  </span>
                </motion.button>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* ── Question list ── */}
      <div className="px-4 sm:px-8 md:px-16 lg:px-32 xl:px-60 pt-6 space-y-4">
        {bookmarks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center py-28 text-center"
          >
            <div
              className={`w-20 h-20 rounded-2xl border flex items-center justify-center mb-5 transition-colors ${T.emptyState}`}
            >
              <FiInbox size={32} />
            </div>
            <h2 className={`text-xl font-bold mb-2 ${T.headerText}`}>No bookmarks yet</h2>
            <p className={`${T.muted} text-sm max-w-[240px] leading-relaxed`}>
              Tap the bookmark icon while practicing to save questions here.
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/explore')}
              className="mt-8 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-6 py-3 rounded-full text-sm transition-colors"
            >
              Start Practicing
            </motion.button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <div className={`py-20 text-center ${T.muted} text-sm`}>
            No bookmarks in {activeSubject}
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((q) => (
              <QuestionCard
                key={`${q.question_id}-${q.chapterTitle}`}
                q={q}
                onRemove={handleRemove}
                isDark={isDark}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}