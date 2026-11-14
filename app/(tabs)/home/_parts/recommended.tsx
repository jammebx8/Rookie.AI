'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Bookmark, Check, Compass, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, Meta, OmrOption, Skeleton, Tag } from '@/components/rookie/ui';
import { useIsDark } from '@/components/rookie/theme';
import { cn } from '@/lib/utils';
import { supabase } from '../../../../public/src/utils/supabase';
import 'katex/dist/katex.min.css';
import { renderContent } from '../../../components/renderContent';
import { fetchRecommended as fetchRecommendedQ, updateAbilityVector } from '../../../../lib/recommendation';

function renderLatex(text: string | null | undefined, isDark = true) {
  return renderContent(text, isDark);
}

function initials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').toUpperCase().slice(0, 2);
}

export function RecommendedQuestionCard() {
  const isDark = useIsDark();
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

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (loading) {
    return (
      <Card className="md:p-8">
        <div className="flex gap-2"><Skeleton className="h-6 w-28" /><Skeleton className="h-6 w-16" /></div>
        <Skeleton className="mt-5 h-4 w-[90%]" />
        <Skeleton className="mt-2 h-4 w-[68%]" />
        <div className="mt-6 grid gap-2.5 sm:grid-cols-2">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}
        </div>
      </Card>
    );
  }

  if (errored || !question) {
    return (
      <Card className="flex flex-col items-start justify-center md:p-8">
        <Compass className="size-6 text-muted-foreground" />
        <p className="mt-4 text-title font-semibold text-foreground">No question picked yet</p>
        <p className="mt-1 max-w-sm text-body-sm text-muted-foreground">Solve a few PYQs and Rookie will pick your next one from your weak spots.</p>
        <Button variant="secondary" className="mt-5 h-10 rounded-control px-4" onClick={() => router.push('/explore')}>
          Browse chapters <ArrowRight />
        </Button>
      </Card>
    );
  }

  const opts = (['a','b','c','d'] as const).map(k => ({
    key: k,
    text: question[`option_${k}`]     ?? null,
    img:  question[`option_${k}_img`] ?? null,
  })).filter(o => o.text || o.img);

  const shiftLabel = parseShift(question.exam_shift);
  const corrLetter = (question.correct_option ?? '')
    .replace(/option_?/gi, '').replace(/[^a-dA-D]/g, '').slice(0, 1).toLowerCase();
  const answered = selectedOption !== null;

  return (
    <Card className="md:p-8">
      {/* Tags + bookmark */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {shiftLabel && <Tag>{shiftLabel}</Tag>}
          {question.subject && <Tag>{question.subject}</Tag>}
        </div>
        <Button variant="ghost" size="icon-sm" onClick={handleBookmark}
          className={cn('-mr-1.5 -mt-1 rounded-control', bookmarked ? 'text-primary' : 'text-muted-foreground')}
          aria-pressed={bookmarked} aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark'} title={bookmarked ? 'Remove bookmark' : 'Bookmark'}>
          <Bookmark className={cn(bookmarked && 'fill-current')} />
        </Button>
      </div>

      {/* Question */}
      <div className="mt-4 max-w-2xl text-title font-medium leading-relaxed text-foreground">
        {renderLatex(question.question_text, isDark)}
      </div>

      {question.question_img_url && (
        <div className="mt-4 flex max-h-52 items-center justify-center overflow-hidden rounded-control bg-muted p-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={question.question_img_url} alt="Question" className="max-h-44 max-w-full object-contain" />
        </div>
      )}

      {/* OMR options */}
      <div className="mt-6 grid gap-2.5 sm:grid-cols-2" role="radiogroup" aria-label="Options">
        {opts.map(opt => {
          const sel = selectedOption === opt.key;
          const corr = opt.key === corrLetter;
          const state = !answered ? 'idle' : corr ? 'right' : sel ? 'wrong' : 'idle';
          return (
            <OmrOption key={opt.key} disabled={answered} state={state} onClick={() => handleOptionClick(opt.key)}
              letter={state === 'right' ? <Check className="size-3" strokeWidth={3} /> : state === 'wrong' ? <X className="size-3" strokeWidth={3} /> : opt.key.toUpperCase()}>
              {opt.img
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={opt.img} alt={`opt-${opt.key}`} className="max-h-16 rounded-control" />
                : <span className="text-body-sm leading-relaxed">{renderLatex(opt.text, isDark)}</span>}
            </OmrOption>
          );
        })}
      </div>

      {/* Verdict + actions */}
      <div className="mt-6 flex flex-wrap items-center gap-3">
        <AnimatePresence>
          {isCorrect !== null && (
            <motion.span initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className={cn('text-body font-semibold', isCorrect ? 'text-[var(--rk-mint-700)] dark:text-[var(--rk-mint-300)]' : 'text-[#d9473a]')}>
              {isCorrect ? 'Sahi jawab!' : 'Not quite. Keep going.'}
            </motion.span>
          )}
        </AnimatePresence>

        {/* NOTE: the attempt count below is simulated (random 18–120) in the existing logic. */}
        {attemptUsers.length > 0 && (
          <span className="flex items-center gap-2">
            <span className="flex items-center">
              {attemptUsers.map((u, i) => (
                <span key={u.id}
                  className="relative grid size-7 shrink-0 place-items-center overflow-hidden rounded-full bg-muted text-caption font-semibold text-muted-foreground ring-2 ring-card"
                  style={{ marginLeft: i === 0 ? 0 : -8, zIndex: attemptUsers.length - i }}>
                  {u.avatar_url
                    // eslint-disable-next-line @next/next/no-img-element
                    ? <img src={u.avatar_url} alt={u.name} className="size-full object-cover" />
                    : initials(u.name || 'U')}
                </span>
              ))}
            </span>
            <Meta><span className="font-semibold text-foreground">{attemptCount}</span> attempted</Meta>
          </span>
        )}

        <Button variant={answered ? 'secondary' : 'ghost'} className="ml-auto h-10 rounded-control px-4" onClick={goToPractice}>
          {answered && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src="/brand/rookie-owl.png" alt="" className="size-5 rounded-full" />
          )}
          {selectedOption ? 'See solution' : 'Solve now'} <ArrowRight />
        </Button>
      </div>
    </Card>
  );
}
