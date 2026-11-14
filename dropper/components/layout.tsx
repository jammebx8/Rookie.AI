'use client';
/**
 * Dropper · Layout
 *  Container — centred column: `content` (1180) or `focus` (880).
 *  PageHeader — the one display title per page + one support line + optional action.
 *  Section   — page section: heading (optional hint) + action, `mt-section` rhythm.
 *  Row       — THE card group: one row. Side by side ≥ md (`cols`), swipe strip on mobile. No 2×2, no stacks.
 *  Stack / Inline — flex column / row with token gaps.
 */
import * as React from 'react';
import { cn } from '@/lib/utils';
import { Hint } from './feedback';

export function Container({ size = 'content', className, ...rest }: React.ComponentProps<'div'> & { size?: 'content' | 'focus' }) {
  return <div className={cn('mx-auto w-full', size === 'focus' ? 'max-w-focus' : 'max-w-content', className)} {...rest} />;
}

export function PageHeader({ title, sub, action, className }: { title: React.ReactNode; sub?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('mt-section-sm flex flex-wrap items-end justify-between gap-5', className)}>
      <div className="min-w-0">
        <h1 className="text-display text-fg">{title}</h1>
        {sub && <p className="mt-2 text-body text-fg-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Section({ title, hint, action, children, id, className }: {
  title: React.ReactNode; hint?: string; action?: React.ReactNode; children: React.ReactNode; id?: string; className?: string;
}) {
  return (
    <section id={id} className={cn('mt-section scroll-mt-28', className)}>
      <div className="mb-stack flex items-end justify-between gap-4">
        <h2 className="text-heading text-fg">{hint ? <Hint text={hint}>{title}</Hint> : title}</h2>
        {action}
      </div>
      {children}
    </section>
  );
}

const COLS: Record<number, string> = { 1: 'md:grid-cols-1', 2: 'md:grid-cols-2', 3: 'md:grid-cols-3', 4: 'md:grid-cols-4', 5: 'md:grid-cols-5', 6: 'md:grid-cols-6' };

/** One row of cards. Pass `cols` (equal) or a custom `className` like `md:grid-cols-[1.4fr_1fr]`. */
export function Row({ cols, className, children, ...rest }: React.ComponentProps<'div'> & { cols?: 1 | 2 | 3 | 4 | 5 | 6 }) {
  return (
    <div {...rest} className={cn(
      'no-scrollbar -mx-gutter flex snap-x snap-mandatory scroll-px-gutter gap-stack overflow-x-auto px-gutter pb-1',
      '*:min-w-[84%] *:snap-start sm:*:min-w-[46%]',
      'md:mx-0 md:grid md:overflow-visible md:px-0 md:*:min-w-0',
      cols && COLS[cols], className,
    )}>
      {children}
    </div>
  );
}

const GAP = { hair: 'gap-hair', inline: 'gap-inline', 'inline-lg': 'gap-inline-lg', 'stack-xs': 'gap-stack-xs', stack: 'gap-stack', 'stack-lg': 'gap-stack-lg' } as const;
type Gap = keyof typeof GAP;

export function Stack({ gap = 'stack', className, ...rest }: React.ComponentProps<'div'> & { gap?: Gap }) {
  return <div className={cn('flex flex-col', GAP[gap], className)} {...rest} />;
}
export function Inline({ gap = 'inline-lg', wrap = false, className, ...rest }: React.ComponentProps<'div'> & { gap?: Gap; wrap?: boolean }) {
  return <div className={cn('flex items-center', GAP[gap], wrap && 'flex-wrap', className)} {...rest} />;
}
