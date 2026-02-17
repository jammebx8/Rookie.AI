'use client';

import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiArrowLeft,
  FiTrash2,
  FiSmile,
  FiInbox,
  FiChevronDown,
  FiChevronUp,
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
  option_A: string;
  option_B: string;
  option_C: string;
  option_D: string;
  correct_option: string | null;
  exam_shift: string;
  source_url: string;
  solution: string;
  sol_ai?: string;
  year?: number | string;
  chapterTitle: string;
  subjectName: string;
  imageKey: string;
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
};

function defaultState(): QuestionState {
  return {
    selectedOption: null,
    isCorrect: null,
    solution: '',
    motivation: '',
    aiFollowup: null,
    solutionLoading: false,
    motivationLoading: false,
    aiFollowupLoading: false,
    determiningAnswer: false,
  };
}

// ── LaTeX renderer (same logic as QuestionViewerClient) ──────────────────────
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

// ── Typing effect hook ───────────────────────────────────────────────────────
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

// ── Subject accent colours ───────────────────────────────────────────────────
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

// ── Checkmark icon ───────────────────────────────────────────────────────────
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

// ── Spinner ──────────────────────────────────────────────────────────────────
function Spinner({ size = 5, color = 'white' }: { size?: number; color?: string }) {
  return (
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
      className={`rounded-full border-2 border-t-transparent flex-shrink-0`}
      style={{
        width: size * 4,
        height: size * 4,
        borderColor: color,
        borderTopColor: 'transparent',
      }}
    />
  );
}

// ────────────────────────────────────────────────────────────────────────────
// Single Question Card — full interactive experience matching QuestionViewer
// ────────────────────────────────────────────────────────────────────────────
function QuestionCard({
  q,
  onRemove,
}: {
  q: BookmarkedQuestion;
  onRemove: (q: BookmarkedQuestion) => void;
}) {
  const [state, setState] = useState<QuestionState>(defaultState());
  const [expanded, setExpanded] = useState(true);
  const solutionRef = useRef<HTMLDivElement | null>(null);
  const color = subjectColor(q.subjectName);

  // Typing effect fires when solution is set
  const typedSolution = useTypingEffect(state.solution, !!state.solution);

  const patch = (partial: Partial<QuestionState>) =>
    setState((prev) => ({ ...prev, ...partial }));

  // ── Handle option selection ──────────────────────────────────────────────
  const handleOptionClick = async (option: string) => {
    if (state.selectedOption !== null) return;

    // Immediately lock in the selection
    patch({ selectedOption: option });

    let correctAnswer = q.correct_option;

    // Determine correct answer via API if unknown
    if (!correctAnswer) {
      patch({ determiningAnswer: true });
      try {
        const res = await axios.post(`${API_BASE}/solution`, {
          action: 'determine_answer',
          question_text: q.question_text,
          option_A: q.option_A,
          option_B: q.option_B,
          option_C: q.option_C,
          option_D: q.option_D,
          solution: q.solution,
        });
        correctAnswer = res.data.correct_answer ?? null;
        q.correct_option = correctAnswer; // cache on object
      } catch {
        // best-effort
      }
      patch({ determiningAnswer: false });
    }

    const isCorrect = option === correctAnswer;
    patch({ isCorrect, motivationLoading: true, solutionLoading: true });

    // Motivation message
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
          option_A: q.option_A,
          option_B: q.option_B,
          option_C: q.option_C,
          option_D: q.option_D,
          solution: q.solution,
          correct_option: q.correct_option,
        });
        aiSolution = res.data.solution ?? q.solution;
        q.sol_ai = aiSolution; // cache on object
      }
      patch({ solution: aiSolution, solutionLoading: false });
    } catch {
      patch({ solution: q.solution, solutionLoading: false });
    }

    // Scroll to solution
    setTimeout(
      () => solutionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
      350,
    );
  };

  // ── Simpler Explanation ──────────────────────────────────────────────────
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
      patch({ aiFollowup: 'Error generating explanation. Please try again.', aiFollowupLoading: false });
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
      className="rounded-2xl bg-[#0A0E17] border border-[#1D2939] overflow-hidden"
    >
      {/* ── Card header bar ── */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-[#1D2939]">
        <div className="flex items-center gap-2 flex-wrap min-w-0">
          <span
            className="text-xs font-semibold px-2.5 py-1 rounded-full flex-shrink-0"
            style={{ backgroundColor: `${color}22`, color }}
          >
            {q.subjectName}
          </span>
          <span className="text-xs text-gray-500 truncate max-w-[160px]">{q.chapterTitle}</span>
          {q.year && <span className="text-xs text-gray-600 flex-shrink-0">{q.year}</span>}
          {q.exam_shift && (
            <span className="text-xs text-gray-600 flex-shrink-0">{q.exam_shift}</span>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => setExpanded((v) => !v)}
            className="w-8 h-8 rounded-lg bg-[#151B27] border border-[#1D2939] flex items-center justify-center text-gray-400"
            aria-label={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? <FiChevronUp size={15} /> : <FiChevronDown size={15} />}
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.9 }}
            onClick={() => onRemove(q)}
            className="w-8 h-8 rounded-lg bg-[#1a0a0a] border border-[#3a1414] flex items-center justify-center text-red-500"
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
              <div className="text-base font-medium leading-relaxed text-white">
                {renderLatex(q.question_text)}
              </div>

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

              {/* ── Options ── */}
              {state.selectedOption === null ? (
                /* Unanswered — interactive buttons */
                <div className="space-y-3">
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => (
                    <motion.button
                      key={opt}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleOptionClick(opt)}
                      className="w-full text-left rounded-xl p-4 bg-[#0A0E17] border border-[#1D2939] hover:border-blue-500/50 transition-colors flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#151B27] border border-[#262F4C] flex items-center justify-center font-semibold flex-shrink-0">
                        {opt}
                      </div>
                      <div className="flex-1 text-sm leading-relaxed">
                        {renderLatex(q[`option_${opt}` as keyof BookmarkedQuestion] as string)}
                      </div>
                    </motion.button>
                  ))}
                </div>
              ) : (
                /* Answered — colour-coded results */
                <div className="space-y-3">
                  {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                    const isSelected = state.selectedOption === opt;
                    const isCorrectOpt = opt === q.correct_option;
                    const showCorrect = isCorrectOpt;
                    const showWrong = isSelected && !isCorrectOpt;

                    return (
                      <motion.div
                        key={opt}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`w-full rounded-xl p-4 flex items-center gap-4 ${
                          showCorrect
                            ? 'bg-[#04271C] border-2 border-[#1DC97A]'
                            : showWrong
                            ? 'bg-[#2D0A0A] border-2 border-[#DC2626]'
                            : 'bg-[#0A0E17] border border-[#1D2939]'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold flex-shrink-0 ${
                            showCorrect
                              ? 'bg-[#1DC97A] text-black'
                              : showWrong
                              ? 'bg-[#DC2626] text-white'
                              : 'bg-[#151B27] border border-[#262F4C]'
                          }`}
                        >
                          {opt}
                        </div>
                        <div className="flex-1 text-sm leading-relaxed">
                          {renderLatex(q[`option_${opt}` as keyof BookmarkedQuestion] as string)}
                        </div>
                        {showCorrect && <CheckIcon />}
                      </motion.div>
                    );
                  })}
                </div>
              )}

              {/* ── Determining answer loader ── */}
              {state.determiningAnswer && (
                <div className="flex items-center gap-3 py-2">
                  <Spinner size={5} color="white" />
                  <span className="text-sm text-gray-400">Determining correct answer…</span>
                </div>
              )}

              {/* ── Post-answer: motivation + solution ── */}
              {!state.determiningAnswer && state.selectedOption !== null && (
                <>
                  {/* Motivation */}
                  {state.motivationLoading ? (
                    <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-5 flex items-center gap-3">
                      <Spinner size={5} color="white" />
                      <span className="text-sm">Generating…</span>
                    </div>
                  ) : state.motivation ? (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl p-5"
                    >
                      <p className="text-base font-medium">{state.motivation}</p>
                    </motion.div>
                  ) : null}

                  {/* Solution box */}
                  <div className="bg-[#0A0E17] border border-[#1D2939] rounded-2xl p-5">
                    <h3 className="text-lg font-bold mb-4">Solution</h3>

                    {state.solutionLoading ? (
                      <div className="flex items-center gap-3 py-6">
                        <Spinner size={7} color="#3B82F6" />
                        <span className="text-sm text-gray-400">Generating solution…</span>
                      </div>
                    ) : (
                      <div className="prose prose-invert max-w-none text-gray-200 text-sm leading-relaxed whitespace-pre-wrap">
                        {renderLatex(typedSolution)}
                      </div>
                    )}

                    {/* AI followup */}
                    {!state.solutionLoading && state.solution && (
                      <div className="mt-5">
                        {!state.aiFollowup && !state.aiFollowupLoading && (
                          <motion.button
                            whileTap={{ scale: 0.97 }}
                            onClick={handleSimpler}
                            className="flex items-center gap-2 px-4 py-2 rounded-full bg-white text-slate-900 text-sm font-medium"
                          >
                            <FiSmile size={14} />
                            <span>Simpler Explanation</span>
                          </motion.button>
                        )}

                        {state.aiFollowupLoading && (
                          <div className="flex items-center gap-3">
                            <Spinner size={5} color="#3B82F6" />
                            <span className="text-sm text-gray-400">Generating explanation…</span>
                          </div>
                        )}

                        {state.aiFollowup && (
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="mt-3 bg-[#151B27] border border-[#262F4C] rounded-xl p-4"
                          >
                            <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                              {state.aiFollowup}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    )}
                  </div>
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

  return (
    <div className="min-h-screen bg-black text-white pb-28">

      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="sticky top-0 z-30 bg-black/95 backdrop-blur-sm border-b border-[#232B3B] px-5 py-4 flex items-center gap-3"
      >
        <motion.button
          whileTap={{ scale: 0.9 }}
          onClick={() => router.back()}
          className="w-10 h-10 rounded-xl bg-[#151B27] border border-[#1D2939] flex items-center justify-center flex-shrink-0"
        >
          <FiArrowLeft size={18} />
        </motion.button>

        <div className="flex-1">
          <h1 className="text-lg font-bold leading-none">Bookmarks</h1>
          <p className="text-xs text-gray-500 mt-0.5">
            {bookmarks.length} saved question{bookmarks.length !== 1 ? 's' : ''}
          </p>
        </div>

        <div className="flex items-center gap-1.5 bg-[#151B27] border border-[#1D2939] rounded-full px-3 py-1.5">
          <IoBookmark size={14} className="text-yellow-400" />
          <span className="text-sm font-bold text-yellow-400 tabular-nums">
            {bookmarks.length}
          </span>
        </div>
      </motion.div>

      {/* ── Subject filter tabs ── */}
      {bookmarks.length > 0 && (
        <div
          className="px-4 pt-4 pb-2 flex gap-2 overflow-x-auto"
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
                  isActive
                    ? 'text-black border-transparent'
                    : 'bg-transparent border-[#1D2939] text-gray-400 hover:border-gray-500'
                }`}
                style={isActive ? { backgroundColor: color, borderColor: color } : {}}
              >
                {subject}
                <span
                  className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${
                    isActive ? 'bg-black/20 text-white' : 'bg-[#151B27] text-gray-500'
                  }`}
                >
                  {count}
                </span>
              </motion.button>
            );
          })}
        </div>
      )}

      {/* ── Question list ── */}
      <div className="px-4 sm:px-8 md:px-16 lg:px-32 xl:px-60 pt-4 space-y-4">
        {bookmarks.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2 }}
            className="flex flex-col items-center justify-center py-28 text-center"
          >
            <div className="w-20 h-20 rounded-2xl bg-[#111] border border-[#1D2939] flex items-center justify-center mb-5">
              <FiInbox size={32} className="text-gray-600" />
            </div>
            <h2 className="text-xl font-bold mb-2">No bookmarks yet</h2>
            <p className="text-gray-500 text-sm max-w-[240px] leading-relaxed">
              Tap the bookmark icon while practicing to save questions here.
            </p>
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/explore')}
              className="mt-8 bg-white text-black font-semibold px-6 py-3 rounded-full text-sm"
            >
              Start Practicing
            </motion.button>
          </motion.div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center text-gray-500 text-sm">
            No bookmarks in {activeSubject}
          </div>
        ) : (
          <AnimatePresence>
            {filtered.map((q) => (
              <QuestionCard
                key={`${q.question_id}-${q.chapterTitle}`}
                q={q}
                onRemove={handleRemove}
              />
            ))}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}