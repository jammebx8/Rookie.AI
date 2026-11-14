'use client';
/**
 * Dropper · Controls
 *  Chip              — filter/selection pill (8px). `active` = pastel blue.
 *  SegmentedControl  — 2–5 mutually exclusive options (Top 3 / Top 10, JEE Main / Advanced).
 *  Input / Field     — text input (44px, 8px) with label, hint and error.
 *  OmrOption         — single-choice answer tile with an OMR bubble: idle | selected | right | wrong.
 *  OmrCheck          — multi-select tile with an OMR bubble (survey, chapter pickers).
 */
import * as React from 'react';
import { Check, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Chip({ active, className, children, ...rest }: React.ComponentProps<'button'> & { active?: boolean }) {
  return (
    <button type="button" aria-pressed={active} {...rest}
      className={cn(
        'inline-flex h-8 items-center gap-inline rounded-control px-3 text-label transition duration-150 ease-standard outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50',
        active ? 'bg-action-secondary text-on-secondary ring-1 ring-dp-sky-300 dark:ring-transparent' : 'bg-sunken text-fg-muted hover:bg-action-secondary hover:text-on-secondary',
        className,
      )}>
      {children}
    </button>
  );
}

export function SegmentedControl<T extends string>({ value, onChange, options, className, size = 'sm', label }: {
  value: T; onChange: (v: T) => void; options: { value: T; label: React.ReactNode }[]; className?: string; size?: 'sm' | 'md'; label?: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn('inline-flex rounded-control bg-sunken p-0.5', className)}>
      {options.map(o => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}
          className={cn('rounded-tag font-semibold transition duration-150 ease-standard outline-none focus-visible:ring-2 focus-visible:ring-focus',
            size === 'sm' ? 'px-3 py-1.5 text-caption' : 'px-4 py-2 text-label',
            value === o.value ? 'bg-surface text-fg shadow-sm' : 'text-fg-muted hover:text-fg')}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Input({ className, invalid, ...rest }: React.ComponentProps<'input'> & { invalid?: boolean }) {
  return (
    <input {...rest} aria-invalid={invalid || undefined}
      className={cn(
        'h-11 w-full min-w-0 rounded-control bg-surface px-control text-body text-fg ring-1 ring-inset ring-line-strong outline-none transition duration-150 ease-standard placeholder:text-fg-muted',
        'hover:ring-dp-sky-300 focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50',
        invalid && 'ring-danger-border focus-visible:ring-danger',
        className,
      )} />
  );
}

export function Field({ label, hint, error, children, htmlFor, className }: { label: React.ReactNode; hint?: React.ReactNode; error?: React.ReactNode; children: React.ReactNode; htmlFor?: string; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={htmlFor} className="text-label text-fg-secondary">{label}</label>
      {children}
      {error ? <p className="text-meta text-danger">{error}</p> : hint ? <p className="text-meta text-fg-muted">{hint}</p> : null}
    </div>
  );
}

type OmrState = 'idle' | 'selected' | 'right' | 'wrong';

export function OmrOption({ letter, state = 'idle', disabled, onClick, children, trailing, className }: {
  letter: React.ReactNode; state?: OmrState; disabled?: boolean; onClick?: () => void; children: React.ReactNode; trailing?: React.ReactNode; className?: string;
}) {
  return (
    <button type="button" role="radio" aria-checked={state === 'selected'} disabled={disabled} onClick={onClick}
      className={cn(
        'group flex w-full items-center gap-3 rounded-control bg-sunken px-4 py-3 text-left text-body font-medium text-fg ring-1 ring-transparent transition duration-150 ease-standard outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:cursor-default',
        state === 'idle' && !disabled && 'hover:bg-action-secondary hover:ring-dp-sky-300',
        state === 'selected' && 'bg-action-secondary ring-dp-sky-500',
        state === 'right' && 'bg-success-surface ring-success-border',
        state === 'wrong' && 'bg-danger-surface ring-danger-border',
        className,
      )}>
      <span className={cn(
        'grid size-6 shrink-0 place-items-center rounded-round border-[1.5px] border-fg-muted/50 text-caption text-fg-muted transition duration-150',
        state === 'idle' && !disabled && 'group-hover:border-action-primary group-hover:text-action-primary',
        state === 'selected' && 'border-action-primary bg-action-primary text-on-primary',
        state === 'right' && 'border-success bg-success text-white dark:text-dp-night-900',
        state === 'wrong' && 'border-danger text-danger',
      )}>
        {state === 'right' ? <Check className="size-3" strokeWidth={3} /> : state === 'wrong' ? <X className="size-3" strokeWidth={3} /> : letter}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
      {trailing}
    </button>
  );
}

export function OmrCheck({ checked, onChange, children, disabled, className }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode; disabled?: boolean; className?: string }) {
  return (
    <button type="button" role="checkbox" aria-checked={checked} disabled={disabled} onClick={() => onChange(!checked)}
      className={cn(
        'flex items-center gap-2.5 rounded-control px-3 py-2.5 text-left text-body-sm transition duration-150 ease-standard outline-none focus-visible:ring-2 focus-visible:ring-focus disabled:opacity-50',
        checked ? 'bg-action-secondary text-on-secondary' : 'bg-sunken text-fg hover:bg-action-secondary/60',
        className,
      )}>
      <span className={cn('grid size-4 shrink-0 place-items-center rounded-round border-[1.5px] transition',
        checked ? 'border-action-primary bg-action-primary text-on-primary' : 'border-fg-muted/60')}>
        {checked && <Check className="size-2.5" strokeWidth={3.5} />}
      </span>
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}
