import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Dropper Design System · Rookie',
  description: 'Tokens, primitives and patterns for the Rookie platform.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function DesignSystemLayout({ children }: { children: React.ReactNode }) {
  return children;
}
