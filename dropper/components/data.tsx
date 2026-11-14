'use client';
/**
 * Dropper · Data display
 *  Tag      — small label: neutral | info | success | danger | warning | pass.
 *  Dot      — status dot (live = success, pulsing).
 *  Bar      — linear progress (blue). Ring / RingStat — circular progress with centred value.
 *  Metric   — metric card: bare icon + label (with hint) + big value + footer + optional action.
 *  ListRow  — list item on a gray 8px tile (instead of divider lines). Div, button or link (`render`).
 *  Kbd      — keyboard hint.
 */
import * as React from 'react';
import { motion } from 'framer-motion';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { Hint } from './feedback';

export const tagVariants = cva('inline-flex items-center gap-1 rounded-tag px-2 py-0.5 text-caption', {
  variants: {
    tone: {
      neutral: 'bg-sunken text-fg-muted',
      info: 'bg-action-secondary text-on-secondary',
      success: 'bg-success-surface text-success',
      danger: 'bg-danger-surface text-danger-text',
      warning: 'bg-warning-surface text-warning-text',
      pass: 'bg-white/12 text-white/85',
      sale: 'bg-[image:var(--dp-gradient-sale)] font-bold uppercase tracking-wide text-white shadow-sale',
    },
  },
  defaultVariants: { tone: 'neutral' },
});

export function Tag({ tone, className, ...rest }: React.ComponentProps<'span'> & VariantProps<typeof tagVariants>) {
  return <span className={cn(tagVariants({ tone }), className)} {...rest} />;
}

export function Dot({ tone = 'success', pulse = false, className }: { tone?: 'success' | 'danger' | 'warning' | 'info'; pulse?: boolean; className?: string }) {
  const c = { success: 'bg-success', danger: 'bg-danger', warning: 'bg-warning', info: 'bg-action-primary' }[tone];
  return (
    <span className={cn('relative inline-flex size-2 shrink-0', className)} aria-hidden>
      {pulse && <span className={cn('absolute inline-flex size-full animate-ping rounded-round opacity-60', c)} />}
      <span className={cn('relative inline-flex size-2 rounded-round', c)} />
    </span>
  );
}

export function Bar({ value, className, tone = 'primary' }: { value: number; className?: string; tone?: 'primary' | 'success' | 'danger' | 'warning' }) {
  const fill = { primary: 'bg-action-primary', success: 'bg-success', danger: 'bg-danger', warning: 'bg-warning' }[tone];
  return (
    <div role="progressbar" aria-valuenow={Math.round(value)} aria-valuemin={0} aria-valuemax={100} className={cn('h-1.5 overflow-hidden rounded-round bg-sunken', className)}>
      <motion.div className={cn('h-full rounded-round', fill)} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(100, value))}%` }}
        transition={{ duration: 0.9, ease: [0.2, 0.7, 0.2, 1] }} />
    </div>
  );
}

export function Ring({ value, size = 56, stroke = 6, className }: { value: number; size?: number; stroke?: number; className?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(100, value));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className={cn('-rotate-90', className)} aria-hidden>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-sunken" />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={c * (1 - v / 100)} className="stroke-action-primary transition-[stroke-dashoffset] duration-700 ease-standard" />
    </svg>
  );
}

export function RingStat({ value, size = 56, stroke = 6, label }: { value: number; size?: number; stroke?: number; label?: React.ReactNode }) {
  return (
    <span className="relative grid shrink-0 place-items-center" style={{ width: size, height: size }} role="img" aria-label={`${Math.round(value)}%`}>
      <Ring value={value} size={size} stroke={stroke} />
      <span className="absolute text-caption tabular-nums text-fg">{label ?? `${Math.round(value)}%`}</span>
    </span>
  );
}

export function Metric({ icon: Icon, label, hint, value, children, action, className }: {
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>; label: React.ReactNode; hint?: string;
  value: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('flex min-h-[164px] flex-col rounded-card bg-surface p-card ring-1 ring-line-subtle transition duration-300 ease-standard hover:-translate-y-0.5 hover:ring-line-strong hover:shadow-hover', className)}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-inline text-label text-fg-muted">
          <Icon className="size-[15px]" strokeWidth={2} /> {hint ? <Hint text={hint}>{label}</Hint> : label}
        </span>
        {action}
      </div>
      <div className="mt-3 text-value text-fg">{value}</div>
      <div className="mt-auto pt-4">{children}</div>
    </div>
  );
}

const listRowCls = 'flex items-center gap-3 rounded-control bg-sunken px-3 py-3 text-left transition duration-150 ease-standard';

export function ListRow({ className, interactive = false, ...rest }: React.ComponentProps<'div'> & { interactive?: boolean }) {
  return <div {...rest} className={cn(listRowCls, interactive && 'cursor-pointer hover:bg-action-secondary', className)} />;
}

export function ListButton({ className, ...rest }: React.ComponentProps<'button'>) {
  return <button type="button" {...rest} className={cn(listRowCls, 'w-full outline-none hover:bg-action-secondary focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50 disabled:hover:bg-sunken', className)} />;
}

export function Kbd({ className, ...rest }: React.ComponentProps<'kbd'>) {
  return <kbd className={cn('rounded-tag bg-sunken px-1.5 py-0.5 font-sans text-caption text-fg-muted', className)} {...rest} />;
}
