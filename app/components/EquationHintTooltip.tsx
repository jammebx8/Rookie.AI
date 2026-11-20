'use client';
/**
 * EquationHintTooltip
 * ───────────────────
 * Wraps a single rendered KaTeX equation so hovering shows a 2-line
 * step-explanation popup. Uses the same Tooltip primitive as streak/coins/marks.
 *
 * The popup renders plain text — no KaTeX inside the tooltip.
 * KaTeX inside a tooltip (inline-flex, 300 px wide) causes the column-layout
 * explosion visible in the screenshot: each .katex span becomes a flex child,
 * display-math equations overflow, and baseline alignment breaks.
 *
 * Instead we strip $…$ / $$…$$ delimiters from the AI response and show the
 * raw LaTeX source inline. E.g. "$v_0 = R\omega$" → "v_0 = Rω" reads fine at
 * tooltip size and has zero layout side-effects. For the rare symbol that
 * renders poorly we apply a small Unicode substitution table.
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
  children: React.ReactNode;
  latex: string;
  hint: HintState;
  onRequest: (latex: string) => void;
  display?: boolean;
}

// ── Unicode substitution table ────────────────────────────────────────────────
// Applied to LaTeX source strings that appear inside the tooltip so they read
// naturally without KaTeX. Only the most common symbols are covered; anything
// not in the table stays as-is (still readable as LaTeX source).
const LATEX_TO_UNICODE: [RegExp, string][] = [
  [/\\alpha/g,   'α'],  [/\\beta/g,    'β'],  [/\\gamma/g,   'γ'],
  [/\\delta/g,   'δ'],  [/\\epsilon/g, 'ε'],  [/\\theta/g,   'θ'],
  [/\\lambda/g,  'λ'],  [/\\mu/g,      'μ'],  [/\\pi/g,      'π'],
  [/\\sigma/g,   'σ'],  [/\\omega/g,   'ω'],  [/\\Omega/g,   'Ω'],
  [/\\phi/g,     'φ'],  [/\\psi/g,     'ψ'],  [/\\rho/g,     'ρ'],
  [/\\tau/g,     'τ'],  [/\\eta/g,     'η'],  [/\\nu/g,      'ν'],
  [/\\xi/g,      'ξ'],  [/\\zeta/g,    'ζ'],
  [/\\infty/g,   '∞'],  [/\\approx/g,  '≈'],  [/\\neq/g,     '≠'],
  [/\\leq/g,     '≤'],  [/\\geq/g,     '≥'],  [/\\pm/g,      '±'],
  [/\\times/g,   '×'],  [/\\div/g,     '÷'],  [/\\cdot/g,    '·'],
  [/\\sqrt\{([^}]+)\}/g, '√($1)'],
  [/\\frac\{([^}]+)\}\{([^}]+)\}/g, '($1)/($2)'],
  [/\\left[\(\[]/g, '('], [/\\right[\)\]]/g, ')'],
  [/\^2/g, '²'],  [/\^3/g, '³'],
  [/\^{([^}]*)}/g, '^$1'],
  [/_{([^}]*)}/g,  '_$1'],
  [/\\,|\\;|\\!/g, ' '],
  [/\{|\}/g, ''],
  [/\\\\/g, ' '],
  [/\\text\{([^}]+)\}/g, '$1'],
  [/\\mathrm\{([^}]+)\}/g, '$1'],
  [/\\mathbf\{([^}]+)\}/g, '$1'],
];

/**
 * Convert a LaTeX source string to a readable plain-text approximation
 * suitable for a tooltip. Strips $ delimiters, applies the unicode table,
 * and collapses excess whitespace.
 */
function latexToPlain(src: string): string {
  // 1. Strip $$…$$ and $…$ delimiters (keep the inner content)
  let out = src
    .replace(/\$\$([^$]+)\$\$/g, ' $1 ')
    .replace(/\$([^$\n]+)\$/g, ' $1 ');

  // 2. Apply unicode substitutions
  for (const [re, replacement] of LATEX_TO_UNICODE) {
    out = out.replace(re, replacement);
  }

  // 3. Collapse repeated spaces
  return out.replace(/\s{2,}/g, ' ').trim();
}

/**
 * Render the AI explanation as plain readable text.
 * LaTeX fragments inside the response are converted to unicode approximations —
 * never rendered with KaTeX, which breaks inside a flex tooltip container.
 */
function HintText({ text }: { text: string }) {
  return <>{latexToPlain(text)}</>;
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
        className="max-w-[320px] text-xs leading-relaxed whitespace-normal"
      >
        {hint.status === 'idle' && (
          <span className="opacity-60 text-xs">Hover to explain this step…</span>
        )}
        {hint.status === 'loading' && (
          <span className="flex items-center gap-1.5 text-xs">
            <Loader2 className="size-3 animate-spin shrink-0" />
            Explaining…
          </span>
        )}
        {hint.status === 'done' && <HintText text={hint.text} />}
        {hint.status === 'error' && (
          <span className="opacity-70 text-xs">Couldn't load — hover again to retry.</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
