import type { Metadata } from 'next';
import { FocusShell } from '@/components/rookie/app-shell';

export const metadata: Metadata = {
  title: 'Question Viewer — Unlimited Practice & AI Solutions',
  description:
    'Browse thousands of JEE Main, JEE Advanced and NEET questions with verified step-by-step AI solutions, instant concept explanations, and vector-matched similar questions.',
  alternates: {
    canonical: 'https://rookie.ai/QuestionViewer',
  },
  openGraph: {
    title: 'Question Viewer — Unlimited Practice & AI Solutions | Rookie.AI',
    description:
      'Browse thousands of JEE Main, JEE Advanced and NEET questions with verified step-by-step AI solutions, instant concept explanations, and vector-matched similar questions.',
    url: 'https://rookie.ai/QuestionViewer',
  },
};

/** Focus screens (no sidebar): theme, design tokens and toasts. */
export default function QuestionViewerLayout({ children }: { children: React.ReactNode }) {
  return <FocusShell>{children}</FocusShell>;
}
