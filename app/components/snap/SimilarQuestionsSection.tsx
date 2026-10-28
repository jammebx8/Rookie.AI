'use client';

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FiLayers,
  FiSmile,
  FiZoomIn,
  FiX,
  FiCheck,
  FiChevronDown,
  FiChevronUp,
  FiRefreshCw,
  FiCheckCircle,
} from 'react-icons/fi';
import toast from 'react-hot-toast';
import { supabase } from '@/public/src/utils/supabase';
import { cosineSimilarity } from '@/lib/recommendation';
import { renderContent } from '../renderContent';
import { track } from '@/lib/analytics';
import { AI_BUDDIES } from '../../QuestionViewer/QuestionViewerClient';
import type { Question } from '../../QuestionViewer/QuestionViewerClient';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://rookie-backend.vercel.app';
const DEFAULT_BUDDY_ID = '4'; // Ritu by default

function parseEmbedding(emb: any): number[] | null {
  if (Array.isArray(emb)) return emb;
  if (typeof emb === 'string') {
    try {
      const parsed = JSON.parse(emb);
      if (Array.isArray(parsed)) return parsed;
    } catch {
      try {
        return emb.replace(/^\[|\]$/g, '').split(',').map(Number);
      } catch {}
    }
  }
  return null;
}

function reconcileAnswerLine(text: string, confirmedAnswer: string | null): string {
  if (!text || !confirmedAnswer) return text;
  const letter = confirmedAnswer
    .replace(/option_?/gi, '')
    .replace(/[^a-dA-D]/g, '')
    .slice(0, 1)
    .toUpperCase();
  if (!letter) return text;
  const pattern = /Answer:\s*Option\s*[A-Da-d]?\.?/i;
  if (pattern.test(text)) {
    return text.replace(pattern, `Answer: Option ${letter}`);
  }
  return `${text.trim()}\n\nAnswer: Option ${letter}`;
}

interface SimilarQuestionsSectionProps {
  embedding?: number[];
  questionText?: string;
  subject?: string;
  topic?: string;
  isDark?: boolean;
}

export function SimilarQuestionsSection({
  embedding,
  questionText = '',
  subject,
  topic,
  isDark = true,
}: SimilarQuestionsSectionProps) {
  const [questions, setQuestions] = useState<(Question & { similarityScore?: number })[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetched, setFetched] = useState(false);
  const [error, setError] = useState(false);
  const [showAll, setShowAll] = useState(false);

  // Buddy selection state
  const [buddyId, setBuddyId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem('selectedBuddy');
      return saved && AI_BUDDIES[saved] ? saved : DEFAULT_BUDDY_ID;
    } catch {
      return DEFAULT_BUDDY_ID;
    }
  });
  const [showBuddyPicker, setShowBuddyPicker] = useState(false);

  const selectedBuddy = AI_BUDDIES[buddyId] || AI_BUDDIES[DEFAULT_BUDDY_ID];

  const handleSelectBuddy = (id: string) => {
    setBuddyId(id);
    try {
      localStorage.setItem('selectedBuddy', id);
    } catch {}
    setShowBuddyPicker(false);
    toast.success(`Tutor changed to ${AI_BUDDIES[id]?.name}`);
  };

  const fetchSimilarQuestions = async () => {
    setLoading(true);
    setError(false);

    try {
      const selectFields =
        'id, question, question_id, question_text, option_a, option_b, option_c, option_d, ' +
        'correct_option, exam_shift, solution, question_img_url, solution_image_url, ' +
        'option_a_img, option_b_img, option_c_img, option_d_img, subject, chapter, embedding, ' +
        'buddy_jeetu, buddy_riya, buddy_rei, buddy_ritu, buddy_shreya, buddy_neha';

      let candidates: any[] = [];

      // 1. If subject provided, search within subject first
      if (subject && subject.trim()) {
        const subClean = subject.trim().toLowerCase();
        const { data: subCandidates } = await supabase
          .from('jee_mains')
          .select(selectFields)
          .ilike('subject', `%${subClean}%`)
          .not('embedding', 'is', null)
          .limit(80);

        if (subCandidates && subCandidates.length >= 4) {
          candidates = subCandidates;
        }
      }

      // 2. If not enough candidates or no subject, fetch broader candidate pool
      if (candidates.length < 4) {
        const { data: broadCandidates } = await supabase
          .from('jee_mains')
          .select(selectFields)
          .not('embedding', 'is', null)
          .limit(100);

        if (broadCandidates) {
          candidates = broadCandidates;
        }
      }

      // 3. Score candidates with cosine similarity if query embedding is available
      if (embedding && embedding.length === 384 && candidates.length > 0) {
        const scored = candidates
          .map((row) => {
            const parsedEmb = parseEmbedding(row.embedding);
            const sim = parsedEmb ? cosineSimilarity(embedding, parsedEmb) : 0;
            return {
              ...row,
              similarityScore: sim,
            };
          })
          // Filter out near-exact duplicate of the uploaded question if it exists in DB
          .filter((row) => {
            if (row.similarityScore > 0.998) return false;
            if (questionText && row.question_text) {
              const q1 = questionText.trim().toLowerCase().slice(0, 50);
              const q2 = row.question_text.trim().toLowerCase().slice(0, 50);
              if (q1 === q2) return false;
            }
            return true;
          })
          .sort((a, b) => (b.similarityScore || 0) - (a.similarityScore || 0))
          .slice(0, 6);

        setQuestions(scored);
      } else if (candidates.length > 0) {
        // Fallback: take first 6 from candidates
        setQuestions(candidates.slice(0, 6) as unknown as Question[]);
      } else {
        // Fallback query without embedding check
        const { data: fallbackRows } = await supabase
          .from('jee_mains')
          .select(selectFields)
          .limit(6);
        setQuestions((fallbackRows || []) as unknown as Question[]);
      }

      setFetched(true);

      track('similar_shown', {
        feature: 'similar',
        subject: subject || undefined,
        metadata: {
          count: candidates.length,
          hasEmbedding: !!embedding,
        },
      });
    } catch (err) {
      console.error('Error fetching similar questions:', err);
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSimilarQuestions();
  }, [embedding, subject, questionText]);

  const visibleQuestions = showAll ? questions : questions.slice(0, 3);

  return (
    <section className="space-y-4 pt-4 border-t border-neutral-200/60 dark:border-neutral-800/80">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-500 flex items-center justify-center font-bold">
            <FiLayers className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base sm:text-lg font-bold tracking-tight">
              Similar PYQs to Practice
            </h2>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              AI vector-matched questions from JEE database · Solve & verify below
            </p>
          </div>
        </div>

        {/* Selected Buddy pill (Click to choose buddy) */}
        <div className="relative">
          <button
            onClick={() => setShowBuddyPicker(!showBuddyPicker)}
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-all ${
              isDark
                ? 'bg-neutral-900 border-neutral-700/80 text-neutral-200 hover:border-neutral-600'
                : 'bg-white border-neutral-300 text-neutral-800 hover:border-neutral-400 shadow-xs'
            }`}
            title="Change AI Buddy for explanations"
          >
            <img
              src={selectedBuddy.image}
              alt={selectedBuddy.name}
              className="w-5 h-5 rounded-full object-cover border border-indigo-500"
            />
            <span>{selectedBuddy.name}</span>
            <FiChevronDown className="w-3.5 h-3.5 opacity-60" />
          </button>

          {/* Buddy Picker Dropdown */}
          {showBuddyPicker && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowBuddyPicker(false)}
              />
              <div
                className={`absolute right-0 mt-2 w-56 rounded-2xl p-2 z-50 border shadow-2xl space-y-1 ${
                  isDark
                    ? 'bg-[#14161d] border-neutral-700 text-white'
                    : 'bg-white border-neutral-200 text-neutral-900'
                }`}
              >
                <p className="text-[11px] font-bold uppercase tracking-wider px-2 py-1 text-neutral-400">
                  Select AI Buddy
                </p>
                {Object.entries(AI_BUDDIES).map(([id, b]) => (
                  <button
                    key={id}
                    onClick={() => handleSelectBuddy(id)}
                    className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-medium transition-colors text-left ${
                      buddyId === id
                        ? isDark
                          ? 'bg-indigo-950/60 text-indigo-300 border border-indigo-700/50'
                          : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        : isDark
                        ? 'hover:bg-neutral-800 text-neutral-300'
                        : 'hover:bg-neutral-100 text-neutral-700'
                    }`}
                  >
                    <img
                      src={b.image}
                      alt={b.name}
                      className="w-7 h-7 rounded-full object-cover border border-white/20"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{b.name}</p>
                    </div>
                    {buddyId === id && <FiCheck className="w-3.5 h-3.5 text-indigo-400" />}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className={`rounded-3xl p-5 border animate-pulse ${
                isDark ? 'bg-[#12141a] border-neutral-800' : 'bg-white border-neutral-200'
              }`}
            >
              <div
                className={`h-4 rounded-full mb-3 ${
                  isDark ? 'bg-neutral-800' : 'bg-neutral-200'
                }`}
                style={{ width: '35%' }}
              />
              <div
                className={`h-4 rounded-full mb-2 ${
                  isDark ? 'bg-neutral-800' : 'bg-neutral-200'
                }`}
                style={{ width: '90%' }}
              />
              <div
                className={`h-4 rounded-full mb-4 ${
                  isDark ? 'bg-neutral-800' : 'bg-neutral-200'
                }`}
                style={{ width: '65%' }}
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {[1, 2, 3, 4].map((j) => (
                  <div
                    key={j}
                    className={`h-11 rounded-xl ${
                      isDark ? 'bg-neutral-800/60' : 'bg-neutral-100'
                    }`}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {error && !loading && (
        <div
          className={`rounded-2xl p-4 border text-center text-sm ${
            isDark
              ? 'bg-neutral-900 border-neutral-800 text-neutral-400'
              : 'bg-neutral-50 border-neutral-200 text-neutral-600'
          }`}
        >
          <p>Could not load similar questions.</p>
          <button
            onClick={fetchSimilarQuestions}
            className="mt-2 text-xs font-semibold text-blue-500 hover:underline inline-flex items-center gap-1"
          >
            <FiRefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {/* No questions found */}
      {!loading && fetched && questions.length === 0 && (
        <div
          className={`rounded-2xl p-5 border text-center text-sm ${
            isDark
              ? 'bg-neutral-900/60 border-neutral-800 text-neutral-400'
              : 'bg-neutral-50 border-neutral-200 text-neutral-600'
          }`}
        >
          No similar PYQ questions found in database.
        </div>
      )}

      {/* Question Cards List */}
      {!loading && questions.length > 0 && (
        <div className="space-y-4">
          {visibleQuestions.map((q, idx) => (
            <SimilarPYQCard
              key={q.question_id || q.id || idx}
              q={q}
              buddyId={buddyId}
              isDark={isDark}
            />
          ))}

          {/* Expand / Collapse Button */}
          {questions.length > 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className={`w-full py-3 rounded-2xl border text-xs sm:text-sm font-semibold transition-all flex items-center justify-center gap-1.5 active:scale-99 ${
                isDark
                  ? 'bg-neutral-900 hover:bg-neutral-800 border-neutral-800 text-neutral-200'
                  : 'bg-white hover:bg-neutral-50 border-neutral-200 text-neutral-800 shadow-xs'
              }`}
            >
              {showAll ? (
                <>
                  <span>Show fewer questions</span>
                  <FiChevronUp className="w-4 h-4" />
                </>
              ) : (
                <>
                  <span>Show {questions.length - 3} more similar PYQ questions</span>
                  <FiChevronDown className="w-4 h-4" />
                </>
              )}
            </button>
          )}
        </div>
      )}
    </section>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Interactive Similar Question Card
// ─────────────────────────────────────────────────────────────────────────────

interface SimilarPYQCardProps {
  q: Question & { similarityScore?: number };
  buddyId: string;
  isDark?: boolean;
}

function SimilarPYQCard({ q, buddyId, isDark = true }: SimilarPYQCardProps) {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [pendingOption, setPendingOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [integerAnswer, setIntegerAnswer] = useState('');
  const [showSolution, setShowSolution] = useState(false);
  const [solutionText, setSolutionText] = useState<string>(q.solution || '');
  const [solutionLoading, setSolutionLoading] = useState(false);
  const [aiFollowup, setAiFollowup] = useState<string | null>(null);
  const [aiFollowupLoading, setAiFollowupLoading] = useState(false);
  const [imageModal, setImageModal] = useState<string | null>(null);

  const buddy = AI_BUDDIES[buddyId] || AI_BUDDIES[DEFAULT_BUDDY_ID];

  const isInteger =
    !q.option_a &&
    !q.option_b &&
    !q.option_c &&
    !q.option_d &&
    !q.option_a_img &&
    !q.option_b_img &&
    !q.option_c_img &&
    !q.option_d_img;

  const normalize = (v: string | null | undefined) =>
    (v || '')
      .replace(/option_?/gi, '')
      .replace(/[^a-dA-D]/g, '')
      .slice(0, 1)
      .toLowerCase();

  const parseShift = (s: string | null) => s?.split('_').join(' ') ?? null;

  // Generate buddy solution if needed
  const fetchBuddySolution = async () => {
    if (solutionText && solutionText !== q.solution) return;
    setSolutionLoading(true);

    try {
      // Check column in row first (e.g. buddy_jeetu, buddy_ritu, etc.)
      const col = buddy.columnKey;
      if (q[col] && typeof q[col] === 'string' && q[col].trim()) {
        setSolutionText(q[col]);
        setSolutionLoading(false);
        return;
      }

      // Check DB
      const { data: fresh } = await supabase
        .from('jee_mains')
        .select(col)
        .eq('question_id', q.question_id)
        .single();

      if ((fresh as any)?.[col]?.trim()) {
        setSolutionText((fresh as any)[col]);
        setSolutionLoading(false);
        return;
      }

      // Call backend generator
      const res = await axios.post(`${BACKEND_URL}/solution`, {
        action: 'generate_solution',
        question_text: q.question_text,
        option_A: q.option_a,
        option_B: q.option_b,
        option_C: q.option_c,
        option_D: q.option_d,
        solution: q.solution,
        correct_option: q.correct_option,
        buddy_id: buddyId,
        buddy_name: buddy.name,
        buddy_system_prompt: buddy.systemPrompt,
      });

      const aiSol = res.data.solution || q.solution || '';
      const finalSol = reconcileAnswerLine(aiSol, q.correct_option);
      setSolutionText(finalSol);

      // Async write-back to DB for future speed
      supabase
        .from('jee_mains')
        .update({ [col]: finalSol })
        .eq('question_id', q.question_id)
        .then(() => {});
    } catch {
      setSolutionText(q.solution || 'No detailed solution available.');
    } finally {
      setSolutionLoading(false);
    }
  };

  // Handle MCQ click
  const handleSelectOption = (opt: string) => {
    if (selectedOption !== null || pendingOption !== null) return;
    setPendingOption(opt);

    setTimeout(() => {
      const correctNorm = normalize(q.correct_option);
      const isRight = normalize(opt) === correctNorm;

      setIsCorrect(isRight);
      setSelectedOption(opt);
      setPendingOption(null);

      if (isRight) {
        toast.success('✓ Correct! Great job!', { id: `pyq-${q.question_id}` });
      } else {
        toast.error('✗ Not quite — see the solution below', { id: `pyq-${q.question_id}` });
      }

      // Track attempt
      track('similar_attempted', {
        feature: 'similar',
        question_id: q.question_id,
        subject: q.subject || undefined,
        chapter: q.chapter || undefined,
        metadata: { correct: isRight },
      });
      track('question_answered', {
        feature: 'similar',
        question_id: q.question_id,
        subject: q.subject || undefined,
        chapter: q.chapter || undefined,
        metadata: { correct: isRight },
      });

      // Automatically show solution
      setShowSolution(true);
      fetchBuddySolution();
    }, 250);
  };

  // Handle Integer submit
  const handleIntegerSubmit = () => {
    if (!integerAnswer.trim() || isCorrect !== null) return;
    setPendingOption('INTEGER');

    const u = parseFloat(integerAnswer.trim());
    const c = parseFloat(q.correct_option || '');
    const isRight =
      !isNaN(u) && !isNaN(c)
        ? u === c
        : integerAnswer.trim() === (q.correct_option || '').trim();

    setIsCorrect(isRight);
    setSelectedOption('INTEGER');
    setPendingOption(null);

    if (isRight) {
      toast.success('✓ Correct! Great job!', { id: `pyq-${q.question_id}` });
    } else {
      toast.error('✗ Not quite — see the solution below', { id: `pyq-${q.question_id}` });
    }

    track('similar_attempted', {
      feature: 'similar',
      question_id: q.question_id,
      subject: q.subject || undefined,
      chapter: q.chapter || undefined,
      metadata: { correct: isRight },
    });
    track('question_answered', {
      feature: 'similar',
      question_id: q.question_id,
      subject: q.subject || undefined,
      chapter: q.chapter || undefined,
      metadata: { correct: isRight },
    });

    setShowSolution(true);
    fetchBuddySolution();
  };

  // Handle simpler explanation
  const handleAIFollowup = async () => {
    setAiFollowupLoading(true);
    setAiFollowup(null);

    try {
      const res = await axios.post(`${BACKEND_URL}/solution`, {
        action: 'better_understanding',
        question_text: q.question_text,
        solution: solutionText || q.solution,
        buddy_id: buddyId,
        buddy_name: buddy.name,
        buddy_system_prompt: buddy.systemPrompt,
      });
      setAiFollowup(res.data.explanation || 'Could not generate explanation.');
    } catch {
      setAiFollowup('Could not generate simpler explanation. Please try again.');
    } finally {
      setAiFollowupLoading(false);
    }
  };

  const storedCorr = normalize(q.correct_option);

  return (
    <div
      className={`rounded-3xl p-5 sm:p-6 border transition-all ${
        isDark ? 'bg-[#12141a] border-neutral-800/80 text-white' : 'bg-white border-neutral-200 text-neutral-900 shadow-sm'
      }`}
    >
      {/* Badges row */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex flex-wrap items-center gap-1.5">
          {q.exam_shift && (
            <span
              className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full ${
                isDark
                  ? 'bg-blue-900/40 text-blue-300 border border-blue-800/50'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}
            >
              {parseShift(q.exam_shift)}
            </span>
          )}
          {q.subject && (
            <span
              className={`text-[11px] font-medium px-2 py-0.5 rounded-full capitalize ${
                isDark
                  ? 'bg-neutral-800 text-neutral-300'
                  : 'bg-neutral-100 text-neutral-600'
              }`}
            >
              {q.subject}
            </span>
          )}
          <span
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
              isDark
                ? 'bg-indigo-950/60 text-indigo-400 border border-indigo-800/40'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
            }`}
          >
            Similar PYQ
          </span>
        </div>

        {q.similarityScore !== undefined && q.similarityScore > 0 && (
          <span className="text-[11px] font-medium text-emerald-500 tabular-nums">
            {Math.round(q.similarityScore * 100)}% match
          </span>
        )}
      </div>

      {/* Question Text */}
      <div className="text-sm sm:text-base font-medium leading-relaxed mb-4">
        {renderContent(q.question_text)}
      </div>

      {/* Question Diagram / Image */}
      {q.question_img_url && (
        <div className="mb-4 relative group">
          <div
            className={`rounded-2xl border overflow-hidden flex items-center justify-center max-h-56 p-2 ${
              isDark ? 'bg-black/30 border-neutral-800' : 'bg-neutral-50 border-neutral-200'
            }`}
          >
            <img
              src={q.question_img_url}
              alt="Question illustration"
              className="max-h-48 max-w-full object-contain cursor-zoom-in"
              onClick={() => setImageModal(q.question_img_url!)}
            />
            <button
              onClick={() => setImageModal(q.question_img_url!)}
              className="absolute top-3 right-3 p-1.5 rounded-lg bg-black/70 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
            >
              <FiZoomIn className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Options or Integer Input */}
      {isInteger ? (
        /* Integer Input */
        <div className="space-y-3 mb-4">
          <p className="text-xs font-semibold text-neutral-400">Enter integer answer:</p>
          {isCorrect === null ? (
            <div className="flex gap-2">
              <input
                type="number"
                value={integerAnswer}
                onChange={(e) => setIntegerAnswer(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleIntegerSubmit();
                }}
                placeholder="Type integer..."
                className={`flex-1 border rounded-xl px-3.5 py-2.5 text-sm sm:text-base outline-none transition-all ${
                  isDark
                    ? 'bg-neutral-900 border-neutral-700 text-white placeholder-neutral-500 focus:border-blue-500'
                    : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400 focus:border-blue-500'
                }`}
              />
              <button
                onClick={handleIntegerSubmit}
                disabled={!integerAnswer.trim()}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-semibold text-xs sm:text-sm active:scale-95 transition-all"
              >
                Submit
              </button>
            </div>
          ) : (
            <div
              className={`rounded-2xl p-3.5 border-2 flex items-center justify-between ${
                isCorrect
                  ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300'
                  : 'bg-red-950/40 border-red-500 text-red-300'
              }`}
            >
              <div>
                <p className="font-bold text-sm">
                  {isCorrect ? '✓ Correct Answer!' : '✗ Incorrect Answer'}
                </p>
                {!isCorrect && q.correct_option && (
                  <p className="text-xs text-neutral-300 mt-0.5">
                    Correct answer is: <b className="text-emerald-400">{q.correct_option}</b>
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* MCQ Options */
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-4">
          {(['a', 'b', 'c', 'd'] as const).map((opt) => {
            const tv = q[`option_${opt}`] as string | null;
            const iv = q[`option_${opt}_img`] as string | null;
            if (!tv && !iv) return null;

            const isPending = pendingOption === opt;
            const isSelected = selectedOption === opt;
            const isCorr = normalize(opt) === storedCorr;
            const hasAnswered = selectedOption !== null;

            let cardStyles = isDark
              ? 'bg-[#181a24] border-neutral-800 hover:border-neutral-700 text-neutral-100'
              : 'bg-neutral-50 border-neutral-200 hover:border-neutral-300 text-neutral-900';
            let labelStyles = isDark
              ? 'bg-neutral-800 text-neutral-300'
              : 'bg-neutral-200 text-neutral-700';

            if (isPending) {
              cardStyles = isDark
                ? 'bg-neutral-800 border-blue-500 text-white'
                : 'bg-neutral-100 border-blue-500 text-neutral-900';
            } else if (hasAnswered) {
              if (isCorr) {
                cardStyles = 'bg-[#04271C] border-[#1DC97A] text-white';
                labelStyles = 'bg-[#1DC97A] text-black font-bold';
              } else if (isSelected) {
                cardStyles = 'bg-[#2D0A0A] border-[#DC2626] text-white';
                labelStyles = 'bg-[#DC2626] text-white font-bold';
              } else {
                cardStyles = isDark
                  ? 'bg-neutral-900/50 border-neutral-800/60 opacity-60'
                  : 'bg-neutral-50/50 border-neutral-200 opacity-60';
              }
            }

            return (
              <button
                key={opt}
                disabled={hasAnswered || pendingOption !== null}
                onClick={() => handleSelectOption(opt)}
                className={`w-full text-left rounded-2xl p-3 sm:p-3.5 border-2 flex items-center gap-3 transition-all ${cardStyles} ${
                  !hasAnswered ? 'active:scale-98 cursor-pointer' : 'cursor-default'
                }`}
              >
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-xl flex items-center justify-center font-bold text-xs uppercase shrink-0 transition-colors ${labelStyles}`}
                >
                  {opt}
                </div>
                <div className="flex-1 text-xs sm:text-sm leading-relaxed overflow-hidden">
                  {iv ? (
                    <img src={iv} alt={`Option ${opt}`} className="max-h-16 rounded-lg object-contain" />
                  ) : (
                    renderContent(tv || '')
                  )}
                </div>
                {hasAnswered && isCorr && (
                  <FiCheckCircle className="w-5 h-5 text-[#1DC97A] shrink-0" />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Solution Toggle & View */}
      <div className="pt-2">
        <button
          onClick={() => {
            const next = !showSolution;
            setShowSolution(next);
            if (next) fetchBuddySolution();
          }}
          className={`text-xs font-semibold inline-flex items-center gap-1.5 transition-colors ${
            showSolution
              ? 'text-neutral-400 hover:text-neutral-300'
              : 'text-blue-500 hover:text-blue-400'
          }`}
        >
          <span>{showSolution ? 'Hide Solution' : 'Show Solution'}</span>
          {showSolution ? (
            <FiChevronUp className="w-3.5 h-3.5" />
          ) : (
            <FiChevronDown className="w-3.5 h-3.5" />
          )}
        </button>

        {showSolution && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className={`mt-3 rounded-2xl p-4 sm:p-5 border transition-all ${
              isDark
                ? 'bg-[#151722] border-neutral-800/90 text-neutral-100'
                : 'bg-neutral-50/80 border-neutral-200 text-neutral-900'
            }`}
          >
            {/* Buddy Header */}
            <div className="flex items-center gap-2.5 pb-3 mb-3 border-b border-neutral-200/40 dark:border-neutral-800">
              <img
                src={buddy.image}
                alt={buddy.name}
                className="w-8 h-8 rounded-full object-cover border-2 border-indigo-500"
              />
              <div>
                <p className="font-bold text-xs sm:text-sm leading-tight">Step-by-Step Solution</p>
                <p className="text-[11px] text-neutral-400">Explained by {buddy.name}</p>
              </div>
            </div>

            {/* Solution Loading */}
            {solutionLoading ? (
              <div className="space-y-2 py-3 animate-pulse">
                <div
                  className={`h-3 rounded-full ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}
                  style={{ width: '85%' }}
                />
                <div
                  className={`h-3 rounded-full ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}
                  style={{ width: '95%' }}
                />
                <div
                  className={`h-3 rounded-full ${isDark ? 'bg-neutral-800' : 'bg-neutral-200'}`}
                  style={{ width: '70%' }}
                />
              </div>
            ) : (
              <>
                {/* Solution Text */}
                <div className="text-xs sm:text-sm leading-relaxed space-y-2 font-normal">
                  {renderContent(solutionText)}
                </div>

                {/* Solution Image if available */}
                {q.solution_image_url && (
                  <div className="mt-3 relative group">
                    <div
                      className={`rounded-xl border overflow-hidden flex items-center justify-center max-h-48 p-2 ${
                        isDark ? 'bg-black/30 border-neutral-800' : 'bg-white border-neutral-200'
                      }`}
                    >
                      <img
                        src={q.solution_image_url}
                        alt="Solution diagram"
                        className="max-h-40 max-w-full object-contain cursor-zoom-in"
                        onClick={() => setImageModal(q.solution_image_url!)}
                      />
                    </div>
                  </div>
                )}

                {/* Simpler Explanation Buddy Followup */}
                <div className="mt-4 pt-3 border-t border-neutral-200/40 dark:border-neutral-800">
                  {!aiFollowup && !aiFollowupLoading && (
                    <button
                      onClick={handleAIFollowup}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all active:scale-95 ${
                        isDark
                          ? 'bg-neutral-800/80 hover:bg-neutral-700 border-neutral-700 text-neutral-200'
                          : 'bg-white hover:bg-neutral-100 border-neutral-300 text-neutral-800 shadow-xs'
                      }`}
                    >
                      <FiSmile className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Simpler Explanation</span>
                    </button>
                  )}

                  {aiFollowupLoading && (
                    <div className="flex items-center gap-2 text-xs text-neutral-400">
                      <div className="w-3.5 h-3.5 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
                      <span>{buddy.name} is preparing a simpler explanation...</span>
                    </div>
                  )}

                  {aiFollowup && (
                    <div
                      className={`mt-3 p-3.5 rounded-xl border text-xs sm:text-sm leading-relaxed ${
                        isDark
                          ? 'bg-[#0f111a] border-indigo-900/40 text-neutral-200'
                          : 'bg-indigo-50/70 border-indigo-200 text-neutral-800'
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2 text-indigo-400 font-bold text-xs uppercase tracking-wide">
                        <FiSmile className="w-3.5 h-3.5" />
                        <span>Simpler Explanation by {buddy.name}</span>
                      </div>
                      {renderContent(aiFollowup)}
                    </div>
                  )}
                </div>
              </>
            )}
          </motion.div>
        )}
      </div>

      {/* Lightbox Image Modal */}
      {imageModal && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
          onClick={() => setImageModal(null)}
        >
          <button
            onClick={() => setImageModal(null)}
            className="absolute top-5 right-5 p-2 rounded-full bg-white/10 hover:bg-white/20 text-white"
          >
            <FiX className="w-5 h-5" />
          </button>
          <img
            src={imageModal}
            alt="Question detail"
            className="max-w-full max-h-[85vh] object-contain rounded-xl shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

export default SimilarQuestionsSection;
