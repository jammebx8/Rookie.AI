import type { Metadata } from 'next';
import { FocusShell } from '@/components/rookie/app-shell';

export const metadata: Metadata = {
  title: 'Test Hall — Live Exam Simulation',
  description: 'Active test examination hall on Rookie.AI. Solve questions in authentic timed exam conditions.',
  robots: {
    index: false,
    follow: false,
  },
};

/** Focus screens (no sidebar): theme, design tokens and toasts. */
export default function TestHallLayout({ children }: { children: React.ReactNode }) {
  return <FocusShell>{children}</FocusShell>;
}
