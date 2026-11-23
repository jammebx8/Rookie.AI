import type { Metadata } from 'next';
import { FocusShell } from '@/components/rookie/app-shell';

export const metadata: Metadata = {
  title: 'Adaptive Practice & Ability Vector',
  description:
    'Target your exact weak areas with AI-adaptive practice tailored to your ability level across Physics, Chemistry, and Mathematics on Rookie.AI.',
  alternates: {
    canonical: 'https://rookie.ai/practice',
  },
  openGraph: {
    title: 'Adaptive Practice & Ability Vector | Rookie.AI',
    description:
      'Target your exact weak areas with AI-adaptive practice tailored to your ability level across Physics, Chemistry, and Mathematics on Rookie.AI.',
    url: 'https://rookie.ai/practice',
  },
};

/** Focus screens (no sidebar): theme, design tokens and toasts. */
export default function PracticeLayout({ children }: { children: React.ReactNode }) {
  return <FocusShell>{children}</FocusShell>;
}
