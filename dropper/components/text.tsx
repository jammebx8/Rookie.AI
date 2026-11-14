'use client';
/**
 * Dropper · Text
 * One component for every piece of type. `variant` = size/leading/tracking/weight from the scale,
 * `tone` = semantic colour. Default element per variant (h1 for display, h2 heading, h3 title, p, span).
 */
import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const textVariants = cva('', {
  variants: {
    variant: {
      price: 'text-price', display: 'text-display', value: 'text-value tabular-nums', heading: 'text-heading', title: 'text-title',
      'body-lg': 'text-body-lg', body: 'text-body', 'body-sm': 'text-body-sm', label: 'text-label', meta: 'text-meta', caption: 'text-caption',
    },
    tone: {
      default: 'text-fg', secondary: 'text-fg-secondary', muted: 'text-fg-muted', link: 'text-link',
      success: 'text-success', danger: 'text-danger', warning: 'text-warning', inverse: 'text-fg-inverse', inherit: '',
    },
    uppercase: { true: 'uppercase tracking-[0.08em]', false: '' },
  },
  defaultVariants: { variant: 'body', tone: 'default', uppercase: false },
});

const TAG: Record<string, React.ElementType> = {
  price: 'span', display: 'h1', value: 'span', heading: 'h2', title: 'h3', 'body-lg': 'p', body: 'p', 'body-sm': 'p', label: 'span', meta: 'span', caption: 'span',
};

export type TextProps = React.HTMLAttributes<HTMLElement> & VariantProps<typeof textVariants> & { as?: React.ElementType };

export function Text({ as, variant = 'body', tone, uppercase, className, ...rest }: TextProps) {
  const Comp = as ?? TAG[variant ?? 'body'] ?? 'p';
  return <Comp className={cn(textVariants({ variant, tone, uppercase }), className)} {...rest} />;
}

/* Shorthands */
export const Display = (p: Omit<TextProps, 'variant'>) => <Text variant="display" {...p} />;
export const Heading = (p: Omit<TextProps, 'variant'>) => <Text variant="heading" {...p} />;
export const Title = (p: Omit<TextProps, 'variant'>) => <Text variant="title" {...p} />;
export const Meta = ({ tone = 'muted', ...p }: Omit<TextProps, 'variant'>) => <Text variant="meta" tone={tone} {...p} />;
export const Caption = ({ tone = 'muted', ...p }: Omit<TextProps, 'variant'>) => <Text variant="caption" tone={tone} {...p} />;
