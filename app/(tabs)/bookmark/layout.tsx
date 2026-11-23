import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Saved Bookmarks & Error Notebook',
  description:
    'Review your personal question bookmarks, marked concepts, and auto-saved incorrect attempts on Rookie.AI.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function BookmarkLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
