'use client';
/**
 * Dropper · Button
 *
 * Types (variant)          When to use
 *  primary   (blue)         The ONE main action on a screen / card. "Continue practice", "Create test".
 *  secondary (pastel blue)  Supporting action next to a primary. "Explain it", "Unlock with Pass".
 *  neutral   (gray)         Quiet, frequent actions. Filters' "Reset", "Show all".
 *  outline                  Secondary action on white where pastel blue would be too loud. "Start free".
 *  ghost                    Toolbar/icon actions, "Back", "See all".
 *  link                     Inline text action.
 *  danger                   Destructive. "Delete account", "Remove bookmark".
 *  inverse  (white)         On dark/gradient surfaces (Rookie Pass card, leaderboard stage).
 *  sale     (coral)         Sale-only CTA. Never more than one on screen.
 *
 * Sizes: xs 28 · sm 32 · md 40 · lg 44 · xl 52 (px @16 root) + icon-xs/sm/md/lg squares.
 * States: hover, active (1px press), focus-visible ring, disabled, loading (spinner + aria-busy).
 * Compose as a link with `render={<Link href="…" />}`.
 */
import * as React from 'react';
import { Button as ButtonPrimitive } from '@base-ui/react/button';
import { cva, type VariantProps } from 'class-variance-authority';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  [
    'group/button relative inline-flex shrink-0 items-center justify-center gap-inline whitespace-nowrap rounded-control font-semibold',
    'transition duration-150 ease-standard outline-none select-none',
    'focus-visible:ring-2 focus-visible:ring-focus focus-visible:ring-offset-2 focus-visible:ring-offset-canvas',
    'active:not-aria-[haspopup]:translate-y-px disabled:pointer-events-none disabled:opacity-50 aria-busy:cursor-progress',
    "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
  ].join(' '),
  {
    variants: {
      variant: {
        primary: 'bg-action-primary text-on-primary hover:bg-action-primary-hover',
        secondary: 'bg-action-secondary text-on-secondary hover:bg-action-secondary-hover',
        neutral: 'bg-action-neutral text-fg hover:bg-action-neutral-hover',
        outline: 'bg-surface text-fg ring-1 ring-inset ring-line-strong hover:bg-sunken hover:ring-dp-sky-300',
        ghost: 'text-fg-secondary hover:bg-sunken hover:text-fg aria-expanded:bg-sunken',
        link: 'h-auto px-0 text-link underline-offset-4 hover:underline',
        danger: 'bg-danger-surface text-danger-text ring-1 ring-inset ring-transparent hover:ring-danger-border',
        inverse: 'bg-white text-dp-navy-800 hover:bg-white/90',
        sale: 'bg-[image:var(--dp-gradient-sale)] text-white shadow-sale hover:brightness-105',
        /* aliases kept for shadcn compatibility */
        default: 'bg-action-primary text-on-primary hover:bg-action-primary-hover',
        destructive: 'bg-danger-surface text-danger-text ring-1 ring-inset ring-transparent hover:ring-danger-border',
      },
      size: {
        xs: 'h-7 px-2.5 text-caption',
        sm: 'h-8 px-3 text-label',
        md: 'h-10 px-control text-body',
        lg: 'h-11 px-5 text-body',
        xl: 'h-13 px-6 text-body-lg',
        'icon-xs': 'size-7 [&_svg:not([class*=\'size-\'])]:size-3.5',
        'icon-sm': 'size-8',
        'icon-md': 'size-10',
        'icon-lg': 'size-11 [&_svg:not([class*=\'size-\'])]:size-5',
        /* aliases */
        default: 'h-8 px-3 text-label',
        icon: 'size-8',
      },
      block: { true: 'w-full', false: '' },
    },
    compoundVariants: [{ variant: 'link', className: 'px-0' }],
    defaultVariants: { variant: 'primary', size: 'md', block: false },
  },
);

export type ButtonProps = ButtonPrimitive.Props & VariantProps<typeof buttonVariants> & {
  /** Shows a spinner, sets aria-busy and disables the button. */
  loading?: boolean;
  /** Icon before / after the label. */
  iconStart?: React.ReactNode;
  iconEnd?: React.ReactNode;
};

export function Button({ className, variant, size, block, loading = false, iconStart, iconEnd, children, disabled, nativeButton, ...props }: ButtonProps) {
  // Rendering as a link (<Link/>, <a/>) → not a native <button>.
  const native = nativeButton ?? (props.render ? false : undefined);
  return (
    <ButtonPrimitive
      data-slot="button"
      nativeButton={native}
      aria-busy={loading || undefined}
      disabled={disabled || loading}
      className={cn(buttonVariants({ variant, size, block, className }))}
      {...props}
    >
      {loading ? <Loader2 className="animate-spin" aria-hidden /> : iconStart}
      {children}
      {!loading && iconEnd}
    </ButtonPrimitive>
  );
}
