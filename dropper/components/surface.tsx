'use client';
/**
 * Dropper · Surfaces
 *  Card      — default (white, subtle ring) · interactive (lifts on hover) · sunken (gray inside a card)
 *              · pass (Rookie Pass gradient, white text) · stage (leaderboard navy). Padding: none | card | card-lg.
 *  CardHead  — small label (icon + text + optional hint) over a title, with an action slot.
 *  Modal     — dialog recipe: 16px corners, title, description, body, footer.
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Hint } from './feedback';

export const cardVariants = cva('relative rounded-card', {
  variants: {
    variant: {
      default: 'bg-surface ring-1 ring-line-subtle transition duration-300 ease-standard hover:ring-line-strong hover:shadow-hover',
      static: 'bg-surface ring-1 ring-line-subtle',
      interactive: 'cursor-pointer bg-surface text-left ring-1 ring-line-subtle outline-none transition duration-500 ease-standard hover:-translate-y-1 hover:shadow-hover hover:ring-line-strong focus-visible:ring-2 focus-visible:ring-focus',
      sunken: 'bg-sunken',
      pass: 'overflow-hidden bg-[image:var(--dp-gradient-pass)] text-white',
      stage: 'isolate overflow-hidden bg-[image:var(--dp-gradient-stage)] text-white',
    },
    padding: { none: '', card: 'p-card', 'card-lg': 'p-card-lg' },
  },
  defaultVariants: { variant: 'default', padding: 'card' },
});

/** Back-compat string for code that composes classes directly. */
export const cardCls = cardVariants();

export function Card({ variant, padding, className, ...rest }: React.ComponentProps<'div'> & VariantProps<typeof cardVariants>) {
  return <div className={cn(cardVariants({ variant, padding }), className)} {...rest} />;
}

export function CardHead({ icon: Icon, label, title, hint, action, className }: {
  icon?: React.ComponentType<{ className?: string }>; label: React.ReactNode; title?: React.ReactNode; hint?: string; action?: React.ReactNode; className?: string;
}) {
  return (
    <div className={cn('mb-stack flex items-start justify-between gap-3', className)}>
      <div className="min-w-0">
        <span className="flex items-center gap-inline text-label text-fg-muted">
          {Icon && <Icon className="size-[15px]" />}
          {hint ? <Hint text={hint}>{label}</Hint> : label}
        </span>
        {title && <p className="mt-1 text-title text-fg">{title}</p>}
      </div>
      {action}
    </div>
  );
}

export function Modal({ open, onOpenChange, title, description, children, footer, size = 'md', className }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: React.ReactNode; description?: React.ReactNode;
  children?: React.ReactNode; footer?: React.ReactNode; size?: 'sm' | 'md' | 'lg'; className?: string;
}) {
  const w = { sm: 'sm:max-w-[380px]', md: 'sm:max-w-[460px]', lg: 'sm:max-w-[640px]' }[size];
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className={cn('gap-0 rounded-card p-card', w, className)}>
        <DialogTitle className="text-heading text-fg">{title}</DialogTitle>
        {description ? <DialogDescription className="mt-1 text-body-sm text-fg-muted">{description}</DialogDescription> : <DialogDescription className="sr-only">{String(title)}</DialogDescription>}
        {children && <div className="mt-stack-lg">{children}</div>}
        {footer && <div className="mt-stack-lg flex flex-wrap justify-end gap-stack-xs">{footer}</div>}
      </DialogContent>
    </Dialog>
  );
}
