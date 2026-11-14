'use client';
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, Meta, Ring, Section, Skeleton } from '@/components/rookie/ui';
import { Define } from '@/components/rookie/define';
import { MOTIVATIONS, ROTATE_MS } from './constants';
import { resumeHref, type RecentSession } from './hooks';

/* ── Rotating motivational line (logic unchanged; now a quiet one-liner under the header) ── */
export function MotivationHeadline({ exam }: { exam: string }) {
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
    <div className="mt-3 min-h-[2.8em] text-body-sm leading-snug text-muted-foreground sm:min-h-[1.5em]">
      <AnimatePresence mode="wait">
        <motion.p
          key={index}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -6 }}
          transition={{ duration: 0.35 }}
        >
          {MOTIVATIONS[index].map((p, i) => {
            if ('br' in p) return <React.Fragment key={i}> </React.Fragment>;
            const text = p.t.replace('{exam}', examLabel);
            return p.hl
              ? <span key={i} className="font-semibold text-foreground">{text}</span>
              : <React.Fragment key={i}>{text}</React.Fragment>;
          })}
        </motion.p>
      </AnimatePresence>
    </div>
  );
}

/* ── Continue where you left off ── */
export function ContinueSection({ session, loading }: { session: RecentSession | null; loading: boolean }) {
  const router = useRouter();

  if (loading) {
    return (
      <Section title="Continue">
        <Card className="flex items-center gap-6">
          <Skeleton className="size-[80px] rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-2/3" />
            <Skeleton className="h-3 w-32" />
          </div>
        </Card>
      </Section>
    );
  }

  if (!session) return null;

  const pct = Math.min(((session.question_index + 1) / 30) * 100, 100);
  const go = () => {
    const href = resumeHref(session);
    if (!href) return;
    router.push(href);
  };

  return (
    <Section title="Continue" action={<Meta className="hidden sm:inline">Pick up where you left off</Meta>}>
      <Card className="flex flex-col gap-6 sm:flex-row sm:items-center">
        <div className="relative grid size-[80px] shrink-0 place-items-center">
          <Ring value={pct} size={80} stroke={7} />
          <Define text="Where you are in this chapter’s question list." className="absolute text-body-sm font-bold tabular-nums text-foreground">
            Q{session.question_index + 1}
          </Define>
        </div>
        <div className="min-w-0 flex-1">
          <Meta className="uppercase tracking-[0.08em]">{session.subject_name}</Meta>
          <h3 className="mt-1 truncate text-heading font-semibold leading-tight tracking-[-0.02em] text-foreground">{session.chapter_title}</h3>
          <Meta className="mt-1 block">Question {session.question_index + 1}</Meta>
        </div>
        <Button className="h-10 rounded-control px-5" onClick={go}><Play className="fill-current" /> Resume</Button>
      </Card>
    </Section>
  );
}
