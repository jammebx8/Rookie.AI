'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Atom, FlaskConical, Lock, Sigma, type LucideIcon } from 'lucide-react';
import { hasRookiePass, bustPassCache } from '@/lib/rookiePass';
import { Page, PageHeader, Row, Chip, Tag, Meta, Skeleton, cardCls } from '@/components/rookie/ui';
import { Define } from '@/components/rookie/define';
import { PassPitch, useCloseOnCheckout } from '@/components/rookie/sale';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type Subject = {
  name: string;
  chapters: number;
  questions: number;
  weightage: string;
  badge: string;
  badgeColor: string;
  imageKey: string;
  color: string;
};

const EXAMS = [
  { name: 'JEE Main' },
  { name: 'JEE Advanced' },
];

const SUBJECTS: Record<string, Subject[]> = {
  'JEE Main': [
    { name: 'Physics',   chapters: 19, questions: 1600, weightage: '33%', badge: '#1 Subject', badgeColor: '#00C48C', imageKey: 'Physics1',    color: '#1E90FF' },
    { name: 'Chemistry', chapters: 14, questions: 1130, weightage: '31%', badge: '#3 Subject', badgeColor: '#FF4D00', imageKey: 'Chemistry1',  color: '#FFA500' },
    { name: 'Maths',     chapters: 16, questions: 1270, weightage: '37%', badge: '#2 Subject', badgeColor: '#F59E0B', imageKey: 'Maths1',      color: '#D32F8D' },
  ],
  'JEE Advanced': [
    { name: 'Physics',   chapters: 24, questions: 893,  weightage: '33%', badge: '#1 Subject', badgeColor: '#00C48C', imageKey: 'AdvPhysics',   color: '#1E90FF' },
    { name: 'Chemistry', chapters: 31, questions: 1054, weightage: '33%', badge: '#3 Subject', badgeColor: '#FF4D00', imageKey: 'AdvChemistry', color: '#FFA500' },
    { name: 'Maths',     chapters: 26, questions: 1775, weightage: '34%', badge: '#2 Subject', badgeColor: '#F59E0B', imageKey: 'AdvMaths',     color: '#D32F8D' },
  ],
};


const SUBJECT_ICON: Record<string, LucideIcon> = {
  Physics: Atom,
  Chemistry: FlaskConical,
  Maths: Sigma,
};

// ─── Skeleton card ─────────────────────────────────────────────────────────────
function SubjectSkeleton() {
  return (
    <div className={cn(cardCls, 'flex min-h-[300px] flex-col')}>
      <Skeleton className="size-7" />
      <Skeleton className="mt-6 h-6 w-28" />
      <div className="mt-6 flex flex-col gap-3">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="h-4 w-24" />
      </div>
      <Skeleton className="mt-auto h-9 w-full" />
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ExplorePage() {
  const [selectedExam, setSelectedExam] = useState<string>(EXAMS[0].name);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [hasPass,      setHasPass]      = useState<boolean | null>(null); // null = checking
  const [showPaywall,  setShowPaywall]  = useState(false);
  // Razorpay can't take focus inside a modal dialog — close the paywall when checkout opens.
  useCloseOnCheckout(useCallback(() => setShowPaywall(false), []));
  // Exam highlighted in the switch (moves at once; the cards follow after the skeleton)
  const [pendingExam,  setPendingExam]  = useState<string>(EXAMS[0].name);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router   = useRouter();

  // Check pass from DB on mount + listen for updates
  useEffect(() => {
    let mounted = true;
    const checkPass = async (force = false) => {
      try {
        const pass = await hasRookiePass(undefined, force);
        if (mounted) setHasPass(pass);
      } catch { if (mounted) setHasPass(false); }
    };
    checkPass();
    const handleUpdate = () => { checkPass(true); };
    window.addEventListener('rookiePassUpdated', handleUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('rookiePassUpdated', handleUpdate);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleExamSelect = (name: string) => {
    if (name === selectedExam) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowSkeleton(true);
    timerRef.current = setTimeout(() => {
      setSelectedExam(name);
      setShowSkeleton(false);
    }, 350);
  };

  const handleSubjectPress = useCallback(async (subject: Subject) => {
    // Gate: JEE Advanced requires a pass
    if (selectedExam === 'JEE Advanced') {
      const pass = await hasRookiePass(undefined, true);
      setHasPass(pass);
      if (!pass) {
        setShowPaywall(true);
        return;
      }
    }
    const params = new URLSearchParams({
      examName:     selectedExam,
      subjectName:  subject.name,
      subjectColor: subject.color,
      badge:        subject.badge.split(' ')[0],
      badgeColor:   subject.badgeColor,
      imageKey:     subject.imageKey,
    });
    router.push(`/chapterpage?${params.toString()}`);
  }, [selectedExam, router]);

  // Checkout runs through the shared useBuyPass flow (triggerCheckout) inside PassPitch.
  const handlePassSuccess = useCallback(() => {
    bustPassCache();
    setHasPass(true);
    setShowPaywall(false);
  }, []);

  const subjects   = SUBJECTS[selectedExam] ?? [];
  const isAdvanced = selectedExam === 'JEE Advanced';
  const advLocked  = isAdvanced && hasPass === false;

  return (
    <Page>
      <PageHeader
        title="Practice"
        sub="Pick a subject and start solving past JEE questions, chapter by chapter."
        action={
          <div role="radiogroup" aria-label="Exam" className="flex gap-1 rounded-control bg-card p-1 ring-1 ring-black/[.05] dark:ring-white/[.06]">
            {EXAMS.map(exam => (
              <Chip
                key={exam.name}
                role="radio"
                aria-checked={pendingExam === exam.name}
                active={pendingExam === exam.name}
                onClick={() => { setPendingExam(exam.name); handleExamSelect(exam.name); }}
                className={cn('h-9 px-4', pendingExam !== exam.name && 'bg-transparent')}
              >
                {exam.name}
                {exam.name === 'JEE Advanced' && hasPass === false && <Lock className="size-3.5" />}
              </Chip>
            ))}
          </div>
        }
      />

      {/* ── Locked notice for JEE Advanced (no pass) ── */}
      {advLocked && !showSkeleton && (
        <motion.div
          initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }}
          className={cn(cardCls, 'mt-10 flex flex-wrap items-center justify-between gap-4 py-4')}
        >
          <div className="flex items-center gap-3">
            <Lock className="size-5 text-muted-foreground" />
            <div>
              <p className="text-body font-semibold text-foreground">JEE Advanced needs a <Define term="pass">Rookie Pass</Define></p>
              <Meta>Every Advanced PYQ, all years and chapters. Paid yearly.</Meta>
            </div>
          </div>
          <Button variant="secondary" className="h-9 rounded-control px-4" onClick={() => setShowPaywall(true)}>
            Unlock with Rookie Pass
          </Button>
        </motion.div>
      )}

      {/* ── Subjects ── */}
      <div className={advLocked && !showSkeleton ? 'mt-6' : 'mt-10'}>
        {showSkeleton ? (
          <Row className="md:grid-cols-3">
            <SubjectSkeleton />
            <SubjectSkeleton />
            <SubjectSkeleton />
          </Row>
        ) : (
          <Row className="md:grid-cols-3">
            {subjects.map((subject, idx) => {
              const locked = advLocked;
              const Icon = SUBJECT_ICON[subject.name] ?? Atom;
              return (
                <motion.div
                  key={`${selectedExam}-${subject.name}`}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.06, duration: 0.3 }}
                  role="button"
                  tabIndex={0}
                  aria-label={`${subject.name}, ${selectedExam}${locked ? ' (locked)' : ''}`}
                  onClick={() => handleSubjectPress(subject)}
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSubjectPress(subject); }}
                  className={cn(
                    cardCls,
                    'group flex min-h-[300px] cursor-pointer flex-col text-left outline-none hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-ring',
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <Icon className={cn('size-7', locked ? 'text-muted-foreground/60' : 'text-muted-foreground')} strokeWidth={1.75} />
                    {locked
                      ? <Lock className="size-4 text-muted-foreground" aria-label="Locked" />
                      : <Tag>{subject.badge}</Tag>}
                  </div>

                  <h2 className="mt-6 text-heading font-semibold tracking-[-0.02em] text-foreground">{subject.name}</h2>
                  <Meta className="mt-0.5">{selectedExam}</Meta>

                  <dl className={cn('mt-6 flex flex-col gap-2.5 text-body', locked && 'opacity-60')}>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-muted-foreground"><Define text="Chapters in this subject that have past-paper questions.">Chapters</Define></dt>
                      <dd className="font-semibold tabular-nums text-foreground">{subject.chapters}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-muted-foreground"><Define text="Past-paper questions (PYQs) you can practise in this subject.">Questions</Define></dt>
                      <dd className="font-semibold tabular-nums text-foreground">{subject.questions.toLocaleString()}</dd>
                    </div>
                    <div className="flex items-baseline justify-between gap-3">
                      <dt className="text-muted-foreground"><Define term="weightage">Weightage</Define></dt>
                      <dd className="font-semibold tabular-nums text-foreground">{subject.weightage}</dd>
                    </div>
                  </dl>

                  <div className="mt-auto pt-6">
                    {locked ? (
                      <Button
                        variant="secondary"
                        className="h-9 w-full rounded-control"
                        onClick={(e) => { e.stopPropagation(); setShowPaywall(true); }}
                      >
                        <Lock className="size-4" /> Unlock with Rookie Pass
                      </Button>
                    ) : (
                      <span className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-control bg-primary text-body-sm font-semibold text-primary-foreground transition group-hover:bg-primary/85">
                        Start <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                      </span>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </Row>
        )}
      </div>

      {/* ── Paywall ── */}
      <Dialog open={showPaywall} onOpenChange={(open) => { if (!open) setShowPaywall(false); }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] gap-5 overflow-y-auto rounded-card bg-card p-6 sm:max-w-[420px]">
          <div>
            <DialogTitle className="text-title font-semibold tracking-[-0.015em] text-foreground">
              Unlock JEE Advanced
            </DialogTitle>
            <DialogDescription className="mt-1.5 text-body-sm">
              Every Advanced PYQ across all years, subjects and chapters, plus AI solutions and custom tests.
            </DialogDescription>
          </div>
          <PassPitch onSuccess={handlePassSuccess} />
        </DialogContent>
      </Dialog>
    </Page>
  );
}
