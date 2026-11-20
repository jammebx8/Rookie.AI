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
import { InlineMath } from 'react-katex';
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

/**
 * Render the AI explanation text, which may itself contain LaTeX fragments
 * like $T_1 = mg\cos30°$. Split on $...$ delimiters and render each piece.
 */
function HintText({ text }: { text: string }) {
  const parts = text.split(/(\$[^\n$]+?\$)/g);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
          const latex = part.slice(1, -1);
          return (
            <span key={i} className="inline-block align-middle">
              <InlineMath math={latex} />
            </span>
          );
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
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
    'outline-none transition',
    'decoration-dotted decoration-1 underline-offset-[3px]',
    'hover:underline focus-visible:underline',
    'cursor-help',
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
          <HintText text={hint.text} />
        )}
        {hint.status === 'error' && (
          <span className="opacity-70">Couldn't load — hover again to retry.</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
