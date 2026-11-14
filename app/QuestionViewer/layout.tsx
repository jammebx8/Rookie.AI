'use client';
import { FocusShell } from '@/components/rookie/app-shell';

/** Focus screens (no sidebar): theme, design tokens and toasts. */
export default function FocusLayout({ children }: { children: React.ReactNode }) {
  return <FocusShell>{children}</FocusShell>;
}
