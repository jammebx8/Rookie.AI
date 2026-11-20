'use client';
/**
 * SolutionWithEquationHints
 * ─────────────────────────
 * Drop-in replacement for the solution <div> in QuestionViewerClient and
 * PracticeClient. Renders the solution text exactly as before, but wraps
 * every KaTeX equation in a hover tooltip that lazily fetches a 2-line
 * step explanation from the AI backend.
 *
 * Usage:
 *   <SolutionWithEquationHints
 *     solution={solution}
 *     isDark={isDark}
 *     apiBase={API_BASE}
 *     buddyName={buddy.name}
 *     buddySystemPrompt={buddy.systemPrompt}
 *     questionText={q.question_text}
 *   />
 *
 * The hint for each equation is fetched once on first hover and then cached
 * for the lifetime of the component (i.e. the current question). Navigating
 * to a new question unmounts this component, clearing the cache automatically.
 */
import React, { useCallback, useRef, useState } from 'react';
import axios from 'axios';
import { renderContentWithHints } from './renderContent';
import type { HintState } from './EquationHintTooltip';

interface SolutionWithEquationHintsProps {
  solution: string;
  isDark?: boolean;
  apiBase: string;
  buddyName: string;
  buddySystemPrompt: string;
  questionText: string;
  className?: string;
}

export function SolutionWithEquationHints({
  solution,
  isDark = true,
  apiBase,
  buddyName,
  buddySystemPrompt,
  questionText,
  className,
}: SolutionWithEquationHintsProps) {
  // Map from latex string → HintState. Object identity changes trigger re-render.
  const [hints, setHints] = useState<Record<string, HintState>>({});

  // Prevent double-firing if the user moves mouse quickly
  const inFlight = useRef<Set<string>>(new Set());

  const getHint = useCallback(
    (latex: string): HintState => hints[latex] ?? { status: 'idle' },
    [hints],
  );

  const onRequest = useCallback(
    async (latex: string) => {
      if (inFlight.current.has(latex)) return;
      inFlight.current.add(latex);

      setHints(prev => ({ ...prev, [latex]: { status: 'loading' } }));

      try {
        const res = await axios.post(`${apiBase}/solution`, {
          action: 'step_hint',
          equation: latex,
          solution,
          question_text: questionText,
          buddy_name: buddyName,
          buddy_system_prompt: buddySystemPrompt,
        });

        const text: string =
          res.data?.hint ??
          res.data?.explanation ??
          'No explanation available.';

        setHints(prev => ({
          ...prev,
          [latex]: { status: 'done', text },
        }));
      } catch {
        setHints(prev => ({ ...prev, [latex]: { status: 'error' } }));
      } finally {
        inFlight.current.delete(latex);
      }
    },
    [apiBase, buddyName, buddySystemPrompt, questionText, solution],
  );

  return (
    <div
      className={
        className ??
        'whitespace-pre-wrap rounded-control bg-muted p-4 text-body leading-relaxed text-foreground sm:p-5'
      }
    >
      {renderContentWithHints(solution, isDark, getHint, onRequest)}
    </div>
  );
}
