'use client';

import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Bookmark, BookmarkX, Check, ChevronDown, ExternalLink, Loader2, Smile, X, ZoomIn } from 'lucide-react';
import 'katex/dist/katex.min.css';
import { renderContent } from '@/app/components/renderContent';
import { clearWrongBadge } from '@/lib/adaptivePractice';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, Chip, EmptyState, Meta, OmrOption, Page, PageHeader, Tag } from '@/components/rookie/ui';
import { Define } from '@/components/rookie/define';
import { useIsDark } from '@/components/rookie/theme';
import { cn } from '@/lib/utils';

const BOOKMARKS_KEY = 'bookmarkedQuestions';
const API_BASE = 'https://rookie-backend.vercel.app';

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
    integerAnswer: '',
    hasTyped: false,
  };
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

// ── Spinner ───────────────────────────────────────────────────────────────
function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn('size-4 shrink-0 animate-spin text-muted-foreground', className)} />;
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
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-6 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.94 }}
        animate={{ scale: 1 }}
        exit={{ scale: 0.94 }}
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-xl"
      >
        <Button variant="secondary" size="icon" onClick={onClose} aria-label="Close"
          className="absolute -right-3 -top-3 z-10 rounded-control shadow-lg">
          <X />
        </Button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Question" className="max-h-[72vh] w-full rounded-card bg-card object-contain" />
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
}: {
  q: BookmarkedQuestion;
  onRemove: (q: BookmarkedQuestion) => void;
}) {
  const isDark = useIsDark();
  const renderLatex = (text: string | null | undefined) => renderContent(text, isDark);
  const [state, setState] = useState<QuestionState>(defaultState());
  const [expanded, setExpanded] = useState(true);
  const [imageModal, setImageModal] = useState<string | null>(null);
  const solutionRef = useRef<HTMLDivElement | null>(null);

  const typedSolution = useTypingEffect(state.solution, !!state.solution && state.hasTyped);

  const patch = (partial: Partial<QuestionState>) =>
    setState((prev) => ({ ...prev, ...partial }));

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

    // correct_option is always present in the DB
    const correctAnswer = q.correct_option;

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

    // AI solution — use cached solution from sessionStorage or generate fresh
    try {
      const cacheKey = `rookie_bookmark_sol_${q.question_id}`
      let aiSolution: string = ''
      try { aiSolution = sessionStorage.getItem(cacheKey) || '' } catch {}
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
        try { sessionStorage.setItem(cacheKey, aiSolution) } catch {}
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

    // correct_option is always present in the DB
    const correctAnswer = q.correct_option;

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

    // AI solution — use cached solution from sessionStorage or generate fresh
    try {
      const cacheKey = `rookie_bookmark_sol_${q.question_id}`
      let aiSolution: string = ''
      try { aiSolution = sessionStorage.getItem(cacheKey) || '' } catch {}
      if (!aiSolution) {
        const res = await axios.post(`${API_BASE}/solution`, {
          action: 'generate_solution',
          question_text: q.question_text,
          solution: q.solution,
          correct_option: q.correct_option,
        });
        aiSolution = res.data.solution ?? q.solution;
        try { sessionStorage.setItem(cacheKey, aiSolution) } catch {}
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

  const optionState = (opt: string): 'idle' | 'right' | 'wrong' => {
    if (state.selectedOption === null) return 'idle';
    if (opt === q.correct_option?.toLowerCase().trim()) return 'right';
    if (state.selectedOption === opt) return 'wrong';
    return 'idle';
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -40 }}
      transition={{ duration: 0.35 }}
    >
      <Card className="p-0">
        {/* ── Image modal ── */}
        <AnimatePresence>
          {imageModal && <ImageModal src={imageModal} onClose={() => setImageModal(null)} />}
        </AnimatePresence>

        {/* ── Header ── */}
        <div className="flex items-start justify-between gap-3 p-5 sm:px-6">
          <button type="button" onClick={() => setExpanded((v) => !v)}
            className="group flex min-w-0 flex-1 flex-wrap items-center gap-x-2 gap-y-1.5 text-left outline-none"
            aria-expanded={expanded}>
            <span className="text-body font-semibold text-foreground">{q.subjectName || 'Other'}</span>
            {q.chapterTitle && <span className="max-w-[220px] truncate text-label text-muted-foreground">{q.chapterTitle}</span>}
            {q.year && <Tag>{q.year}</Tag>}
            {q.exam_shift && <Tag>{parseShift(q.exam_shift)}</Tag>}
            {q._autoBookmark && <Tag tone="wrong">Got wrong</Tag>}
          </button>
          <div className="flex shrink-0 items-center gap-1">
            <Button variant="ghost" size="icon" className="rounded-control text-muted-foreground"
              onClick={() => onRemove(q)} aria-label="Remove bookmark" title="Remove bookmark">
              <BookmarkX />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-control text-muted-foreground"
              onClick={() => setExpanded((v) => !v)} aria-label={expanded ? 'Collapse' : 'Expand'}>
              <ChevronDown className={cn('transition-transform', expanded && 'rotate-180')} />
            </Button>
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
              <div className="flex flex-col gap-5 px-5 pb-6 sm:px-6">
                {/* ── Question text ── */}
                <div className="text-body font-medium leading-relaxed text-foreground">
                  {renderLatex(q.question_text)}
                </div>

                {/* ── Question image ── */}
                {q.question_img_url && (
                  <div className="group relative flex max-h-64 items-center justify-center overflow-hidden rounded-control bg-muted p-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={q.question_img_url}
                      alt="Question illustration"
                      className="max-h-56 max-w-full cursor-zoom-in select-none object-contain"
                      onClick={() => setImageModal(q.question_img_url!)}
                    />
                    <Button variant="secondary" size="icon-sm" onClick={() => setImageModal(q.question_img_url!)} title="Enlarge image"
                      className="absolute right-2 top-2 rounded-control opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100">
                      <ZoomIn />
                    </Button>
                  </div>
                )}

                {q.source_url && (
                  <a href={q.source_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex w-fit items-center gap-1 text-meta font-medium text-primary hover:underline">
                    View source <ExternalLink className="size-3" />
                  </a>
                )}

                {/* ── Integer type ── */}
                {isIntegerQ() ? (
                  <div className="flex flex-col gap-3">
                    <Meta>Enter your integer answer</Meta>
                    {state.isCorrect === null ? (
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          value={state.integerAnswer}
                          onChange={(e) => patch({ integerAnswer: e.target.value })}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleIntegerSubmit();
                          }}
                          placeholder="Type your answer…"
                          className="h-11 flex-1 rounded-control px-4 text-title"
                        />
                        <Button onClick={handleIntegerSubmit} disabled={!state.integerAnswer.trim()} className="h-11 rounded-control px-5">
                          Submit
                        </Button>
                      </div>
                    ) : (
                      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                        className={cn('rounded-control px-4 py-3 ring-1',
                          state.isCorrect
                            ? 'bg-[var(--rk-mint-100)] ring-[var(--rk-mint-400)] dark:bg-[rgba(134,219,174,.12)]'
                            : 'bg-[#fdecea] ring-[#e7a39b] dark:bg-[rgba(255,122,102,.12)]')}>
                        <Tag tone={state.isCorrect ? 'right' : 'wrong'}>{state.isCorrect ? 'Sahi jawab!' : 'Incorrect'}</Tag>
                        <p className="mt-2 text-body-sm text-foreground">
                          Your answer: <b>{state.integerAnswer}</b>
                        </p>
                        {!state.isCorrect && q.correct_option && (
                          <p className="mt-0.5 text-body-sm text-foreground">
                            Correct: <b>{q.correct_option}</b>
                          </p>
                        )}
                      </motion.div>
                    )}
                  </div>
                ) : (
                  /* ── MCQ (OMR) ── */
                  <div className="flex flex-col gap-2" role="radiogroup">
                    {(['a', 'b', 'c', 'd'] as const).map((opt) => {
                      const tv = q[`option_${opt}`] as string;
                      const iv = q[`option_${opt}_img`] as string | null;
                      if (!tv && !iv) return null;
                      const st = optionState(opt);
                      return (
                        <OmrOption key={opt} letter={opt.toUpperCase()} state={st}
                          disabled={state.selectedOption !== null}
                          onClick={() => handleOptionClick(opt)}>
                          <span className="flex items-center gap-3">
                            <span className="min-w-0 flex-1 leading-relaxed">
                              {iv ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={iv} alt={`opt-${opt}`} className="max-h-20 rounded-control" />
                              ) : (
                                renderLatex(tv)
                              )}
                            </span>
                            {st === 'right' && <Check className="size-4 shrink-0 text-[var(--rk-mint-600)]" strokeWidth={2.5} />}
                          </span>
                        </OmrOption>
                      );
                    })}
                  </div>
                )}

                {/* ── Post-answer section ── */}
                {state.selectedOption !== null && (
                  <>
                    {/* Motivation */}
                    {state.motivationLoading ? (
                      <div className="flex items-center gap-3 rounded-control bg-muted px-4 py-3">
                        <Spinner />
                        <span className="text-body-sm text-muted-foreground">Thinking…</span>
                      </div>
                    ) : state.motivation ? (
                      <motion.div key="motivation-card" initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                        className="flex items-start gap-2.5 rounded-control bg-secondary px-4 py-3 text-secondary-foreground">
                        <Smile className="mt-0.5 size-4 shrink-0" />
                        <p className="text-body-sm font-medium leading-relaxed">{state.motivation}</p>
                      </motion.div>
                    ) : null}

                    {state.solutionRequested && (
                      <div key="solution-card" className="rounded-control bg-muted p-4 sm:p-5">
                        <p className="mb-3 text-title font-semibold tracking-[-0.015em] text-foreground">Solution</p>

                        {state.solutionLoading ? (
                          <div className="flex items-center gap-3 py-4">
                            <Spinner />
                            <span className="text-body-sm text-muted-foreground">Generating solution…</span>
                          </div>
                        ) : (
                          <div className="whitespace-pre-wrap text-body-sm leading-relaxed text-foreground/90">
                            {renderLatex(state.hasTyped ? state.solution : typedSolution)}
                          </div>
                        )}

                        {/* AI Followup */}
                        {!state.solutionLoading && state.solution && (
                          <div className="mt-5">
                            {!state.aiFollowup && !state.aiFollowupLoading && (
                              <Button variant="secondary" className="h-9 rounded-control px-3" onClick={handleSimpler}>
                                <Smile /> Simpler explanation
                              </Button>
                            )}

                            {state.aiFollowupLoading && (
                              <div className="mt-3 flex items-center gap-3">
                                <Spinner />
                                <span className="text-body-sm text-muted-foreground">Generating…</span>
                              </div>
                            )}

                            {state.aiFollowup && (
                              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                                className="mt-4 whitespace-pre-wrap rounded-control bg-card p-4 text-body-sm leading-relaxed text-foreground">
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
      </Card>
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
    // Clear the red badge the moment the user opens this page
    clearWrongBadge();
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
    <Page className="max-w-focus">
      <PageHeader
        title={<Define term="bookmarks">Bookmarks</Define>}
        sub={`${bookmarks.length} saved question${bookmarks.length !== 1 ? 's' : ''}. Solve them again.`}
      />

      {/* ── Subject filter chips ── */}
      {bookmarks.length > 0 && (
        <div className="no-scrollbar -mx-4 mt-8 flex gap-2 overflow-x-auto px-4 md:mx-0 md:flex-wrap md:px-0">
          {subjects.map((subject) => {
            const isActive = activeSubject === subject;
            const count =
              subject === 'All'
                ? bookmarks.length
                : bookmarks.filter((q) => (q.subjectName || 'Other') === subject).length;
            return (
              <Chip key={subject} active={isActive} onClick={() => setActiveSubject(subject)} className="shrink-0">
                {subject}
                <span className="tabular-nums opacity-60">{count}</span>
              </Chip>
            );
          })}
        </div>
      )}

      {/* ── Question list ── */}
      <div className="mt-6 flex flex-col gap-4">
        {bookmarks.length === 0 ? (
          <EmptyState
            icon={Bookmark}
            title="No bookmarks yet"
            sub="Tap the bookmark icon while practising to save questions here."
            action={
              <Button className="h-10 rounded-control px-5" onClick={() => router.push('/explore')}>
                Start practising
              </Button>
            }
          />
        ) : filtered.length === 0 ? (
          <p className="py-16 text-center text-body-sm text-muted-foreground">No bookmarks in {activeSubject}</p>
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
    </Page>
  );
}
