'use client';
/**
 * EquationHintTooltip
 * ───────────────────
 * Wraps a single rendered KaTeX equation (inline or block) so that hovering
 * it shows a 2-line "how did this step happen?" popup, using the same
 * dropper Tooltip primitive that powers streak / coins / marks hints.
 *
 * The first time the user hovers, it fires a lazy AI request (passed in via
 * onRequest). The result is cached in the parent so re-hovering is instant.
 *
 * Visual pattern:  dotted underline · cursor-help · bg-foreground popup with arrow
 * — identical to the Define / Hint components in the design system.
 */
import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type HintState =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'done'; text: string }
  | { status: 'error' };

interface EquationHintTooltipProps {
  /** The rendered KaTeX node (InlineMath or BlockMath output). */
  children: React.ReactNode;
  /** Raw LaTeX string, e.g. "T_1 = mg \cos 30^\circ". Used as the cache key. */
  latex: string;
  /** Current state for this equation. */
  hint: HintState;
  /** Called the first time the user hovers — parent fires the AI request. */
  onRequest: (latex: string) => void;
  /** Whether this is a block (display) or inline equation. */
  display?: boolean;
}

export function EquationHintTooltip({
  children,
  latex,
  hint,
  onRequest,
  display = false,
}: EquationHintTooltipProps) {
  const requested = React.useRef(false);

  const handleHover = () => {
    // Allow retry after error
    if (hint.status === 'error') requested.current = false;
    if (!requested.current && (hint.status === 'idle' || hint.status === 'error')) {
      requested.current = true;
      onRequest(latex);
    }
  };

  const triggerClass = cn(
    // Match the dropper Hint / Define trigger style exactly
    'outline-none transition',
    'decoration-dotted decoration-1 underline-offset-[3px]',
    'hover:underline focus-visible:underline',
    // Equation-specific: show pointer with question mark
    'cursor-help',
    // For block math: make the wrapper sit inline-block so it doesn't
    // stretch to full width and the trigger box hugs the equation.
    display ? 'inline-block' : 'inline',
  );

  return (
    <Tooltip>
      <TooltipTrigger
        render={<span tabIndex={0} />}
        className={triggerClass}
        onMouseEnter={handleHover}
        onFocus={handleHover}
      >
        {children}
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={6}
        // Wider than the default hint (240px) since step explanations can be a sentence
        className="max-w-[300px] text-meta leading-snug whitespace-normal"
      >
        {hint.status === 'idle' && (
          <span className="opacity-60">Hover to explain this step…</span>
        )}
        {hint.status === 'loading' && (
          <span className="flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin shrink-0" />
            <span>Explaining…</span>
          </span>
        )}
        {hint.status === 'done' && (
          <span>{hint.text}</span>
        )}
        {hint.status === 'error' && (
          <span className="opacity-70">Couldn't load — hover again to retry.</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
