'use client';
import * as React from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

/**
 * Hover (or focus) any heading / metric label to see what it means.
 * Rule for new features: every metric or data heading ships with a <Define>.
 */
export const DEFS = {
  streak: 'Days in a row you’ve solved at least one question. Miss a day and it starts again.',
  today: 'Questions solved today against your daily target. You can change the target in Profile.',
  accuracy: 'Share of your answers that were correct over the last 7 days.',
  coins: 'Earned for every correct answer. Faster answers earn more. Coins decide your leaderboard rank.',
  rank: 'Your position on the leaderboard, ranked by coins.',
  week: 'Questions you solved on each day this week. Today is highlighted.',
  progress: 'How far you are through this chapter’s questions.',
  next: 'Picked from your weak spots, at a level that stretches you a little.',
  marks: 'Marking scheme for this question: +4 if right, −1 if wrong.',
  weak: 'Chapters where your accuracy is lowest. The ring shows your accuracy there.',
  leaderboard: 'Students ranked by coins earned. Rookie Pass holders have a ✦ next to their name.',
  toTen: 'Coins you need to overtake the student in 10th place.',
  bookmarks: 'Questions you saved, plus ones you got wrong. Solving them again is the fastest way to improve.',
  pass: 'Rookie Pass unlocks every PYQ, unlimited AI solutions and unlimited tests.',
  yearly: 'One payment, valid for 12 months (365 days) from the day you buy.',
  timer: 'When this hits zero, the festive price ends and the Pass goes back to ₹999 a year.',
  xp: 'Experience points from practice. Harder questions and quicker answers earn more.',
  level: 'Goes up as you earn XP in practice.',
  difficulty: 'How hard this question is, based on how students have done on it.',
  score: 'Marks scored using the exam’s marking scheme (correct, wrong and unattempted).',
  attempted: 'Questions you answered, right or wrong.',
  dailyGoal: 'How many questions you plan to solve each day. Hitting it keeps your streak going.',
  solutionsLeft: 'Free AI solutions left today. Rookie Pass makes them unlimited.',
  weightage: 'Roughly how much of the exam comes from this subject or chapter.',
  mentor: 'The AI study buddy who explains your solutions. Pick the voice you like.',
} as const;

export type DefTerm = keyof typeof DEFS;

/** Pass a known `term` or a one-off `text`. */
export function Define({ term, text, children, className, side = 'top' }: {
  term?: DefTerm; text?: string; children: React.ReactNode; className?: string; side?: 'top' | 'bottom' | 'left' | 'right';
}) {
  const body = text ?? (term ? DEFS[term] : '');
  if (!body) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger
        render={<span tabIndex={0} />}
        className={cn(
          'cursor-help rounded-tag decoration-dotted decoration-1 underline-offset-[3px] outline-none transition hover:underline focus-visible:underline',
          className,
        )}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-[240px] text-meta leading-snug">{body}</TooltipContent>
    </Tooltip>
  );
}
