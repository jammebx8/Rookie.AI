'use client';
/**
 * Dropper · Feedback
 *  Hint       — hover/focus definition on any label (dotted underline). Every metric & data heading has one.
 *  EmptyState — icon + title + one line + action.
 *  Skeleton / Spinner — loading.
 *  Callout    — inline message: info | success | warning | danger.
 */
import * as React from 'react';
import { AlertTriangle, CheckCircle2, Info, Loader2, XCircle } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export function Hint({ text, children, className, side = 'top' }: { text: string; children: React.ReactNode; className?: string; side?: 'top' | 'bottom' | 'left' | 'right' }) {
  if (!text) return <>{children}</>;
  return (
    <Tooltip>
      <TooltipTrigger render={<span tabIndex={0} />}
        className={cn('cursor-help rounded-[4px] decoration-dotted decoration-1 underline-offset-[3px] outline-none transition hover:underline focus-visible:underline', className)}>
        {children}
      </TooltipTrigger>
      <TooltipContent side={side} className="max-w-[240px] text-meta leading-snug">{text}</TooltipContent>
    </Tooltip>
  );
}

export function EmptyState({ icon: Icon, title, sub, action, className }: { icon: React.ComponentType<{ className?: string }>; title: string; sub?: string; action?: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-card bg-surface px-6 py-14 text-center ring-1 ring-line-subtle', className)}>
      <Icon className="size-7 text-fg-muted" />
      <p className="mt-4 text-title text-fg">{title}</p>
      {sub && <p className="mt-1 max-w-sm text-body-sm text-fg-muted">{sub}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-control bg-sunken', className)} />;
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 aria-label="Loading" className={cn('size-4 animate-spin text-fg-muted', className)} />;
}

const CALLOUT = {
  info: { cls: 'bg-action-secondary text-on-secondary', Icon: Info },
  success: { cls: 'bg-success-surface text-success', Icon: CheckCircle2 },
  warning: { cls: 'bg-warning-surface text-warning-text', Icon: AlertTriangle },
  danger: { cls: 'bg-danger-surface text-danger-text', Icon: XCircle },
} as const;

export function Callout({ tone = 'info', title, children, action, className }: { tone?: keyof typeof CALLOUT; title?: React.ReactNode; children?: React.ReactNode; action?: React.ReactNode; className?: string }) {
  const { cls, Icon } = CALLOUT[tone];
  return (
    <div role={tone === 'danger' ? 'alert' : 'status'} className={cn('flex items-start gap-inline-lg rounded-control px-4 py-3', cls, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1 text-body-sm">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className={cn(title && 'mt-0.5', 'opacity-90')}>{children}</div>}
      </div>
      {action}
    </div>
  );
}
