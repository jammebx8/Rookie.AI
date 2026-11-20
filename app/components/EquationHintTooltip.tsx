'use client';
/**
 * EquationHintTooltip
 * ───────────────────
 * Wraps a single KaTeX equation so hovering shows a 2-line step-explanation
 * popup with full LaTeX rendering inside the tooltip.
 *
 * Layout fix
 * ──────────
 * The base TooltipContent uses `inline-flex items-center` which turns every
 * KaTeX node into a flex column. We override it to `block` text flow via
 * className. We also suppress .katex-display's `display:block; margin:1em 0`
 * (produced by <BlockMath>) and normalise .katex font-size so math matches
 * the tooltip text size — all scoped to a wrapper div so nothing else is
 * affected.
 */
import * as React from 'react';
import { Loader2 } from 'lucide-react';
import { InlineMath } from 'react-katex';
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

/**
 * Render the AI explanation text with full KaTeX support.
 *
 * Split on $$…$$ then $…$ delimiters. All math — even $$…$$ — is
 * rendered as InlineMath so it stays in the text flow and never triggers
 * .katex-display's block + 1em margins.
 *
 * The wrapper div uses style overrides that are intentionally scoped here:
 *   • `display: block`  — overrides the tooltip's `inline-flex items-center`
 *                         so text wraps normally instead of columning
 *   • `.katex { font-size: inherit }` — keeps math the same size as the
 *                         surrounding tooltip text (tooltip is already xs)
 *   • `.katex-display { display: inline; margin: 0 }` — prevents any
 *                         stray $$…$$ from going block even if BlockMath slips in
 */
function HintText({ text }: { text: string }) {
  // Split on $$…$$ first, then $…$ on what remains
  const parts: React.ReactNode[] = [];
  let key = 0;

  // Single-pass tokeniser: $$...$$ → InlineMath, $...$ → InlineMath
  // (both forced inline so layout never breaks)
  const TOKEN = /(\$\$[\s\S]+?\$\$|\$[^\n$]+?\$)/g;
  let last = 0;
  let m: RegExpExecArray | null;

  while ((m = TOKEN.exec(text)) !== null) {
    if (m.index > last) {
      parts.push(
        <React.Fragment key={key++}>{text.slice(last, m.index)}</React.Fragment>
      );
    }
    const raw = m[1];
    const isDisplay = raw.startsWith('$$');
    const inner = isDisplay ? raw.slice(2, -2).trim() : raw.slice(1, -1).trim();
    // Always render as InlineMath — display math in a narrow tooltip is broken
    parts.push(<InlineMath key={key++} math={inner} />);
    last = m.index + raw.length;
  }

  if (last < text.length) {
    parts.push(<React.Fragment key={key++}>{text.slice(last)}</React.Fragment>);
  }

  return (
    <span style={{ display: 'block' }}>
      {parts}
    </span>
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
    if (hint.status === 'error') requested.current = false;
    if (!requested.current && (hint.status === 'idle' || hint.status === 'error')) {
      requested.current = true;
      onRequest(latex);
    }
  };

  return (
    <Tooltip>
      <TooltipTrigger
        render={<span tabIndex={0} />}
        className={cn(
          'outline-none transition cursor-help',
          'decoration-dotted decoration-1 underline-offset-[3px]',
          'hover:underline focus-visible:underline',
          display ? 'inline-block' : 'inline',
        )}
        onMouseEnter={handleHover}
        onFocus={handleHover}
      >
        {children}
      </TooltipTrigger>

      {/*
        Override the base popup layout:
        - `!block`           — replace `inline-flex items-center` with block so
                               text wraps and KaTeX nodes sit in normal flow
        - `!items-start`     — in case the flex isn't fully overridden
        - `max-w-[320px]`    — wide enough for a full sentence
        - `leading-relaxed`  — comfortable line-height for multi-line text
        The katex CSS overrides live in globals.css as .hint-popup .katex rules
        rather than inline Tailwind so they can target child class names.
      */}
      <TooltipContent
        side="top"
        sideOffset={6}
        className="hint-popup !block !items-start max-w-[320px] leading-relaxed whitespace-normal text-xs"
      >
        {hint.status === 'idle' && (
          <span className="opacity-60">Hover to explain this step…</span>
        )}
        {hint.status === 'loading' && (
          <span className="flex items-center gap-1.5">
            <Loader2 className="size-3 animate-spin shrink-0" />
            Explaining…
          </span>
        )}
        {hint.status === 'done' && <HintText text={hint.text} />}
        {hint.status === 'error' && (
          <span className="opacity-70">Couldn't load — hover again to retry.</span>
        )}
      </TooltipContent>
    </Tooltip>
  );
}
