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
import { track } from '@/lib/analytics';

interface SolutionWithEquationHintsProps {
  solution: string;
  isDark?: boolean;
  apiBase: string;
  buddyId: string;
  buddyName: string;
  buddySystemPrompt: string;
  questionText: string;
  /** analytics context — passed through to track() so the dashboard can segment by feature */
  feature?: string;
  questionId?: string;
  subject?: string;
  chapter?: string;
  className?: string;
}

export function SolutionWithEquationHints({
  solution,
  isDark = true,
  apiBase,
  buddyId,
  buddyName,
  buddySystemPrompt,
  questionText,
  feature,
  questionId,
  subject,
  chapter,
  className,
}: SolutionWithEquationHintsProps) {
  const [hints, setHints] = useState<Record<string, HintState>>({});
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
        const stepQuestion = `In the solution to this question: "${questionText}"
The solution contains this step: ${latex}
Explain ONLY how this one step was derived, in exactly 2 short lines. No other steps.`;

        const res = await axios.post(`${apiBase}/solution`, {
          action: 'better_understanding',
          question_text: stepQuestion,
          solution,
          buddy_id: buddyId,
          buddy_name: buddyName,
          buddy_system_prompt: buddySystemPrompt,
        });

        const text: string =
          res.data?.explanation ||
          res.data?.hint ||
          'No explanation available.';

        setHints(prev => ({
          ...prev,
          [latex]: { status: 'done', text },
        }));

        // Track usage — one event per equation per session
        track('equation_hint_used', {
          feature:     feature ?? 'question_viewer',
          question_id: questionId,
          subject,
          chapter,
          metadata:    { latex_len: latex.length },
        });
      } catch {
        setHints(prev => ({ ...prev, [latex]: { status: 'error' } }));
      } finally {
        inFlight.current.delete(latex);
      }
    },
    [apiBase, buddyId, buddyName, buddySystemPrompt, questionText, solution, feature, questionId, subject, chapter],
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
