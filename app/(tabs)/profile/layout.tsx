import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Student Profile & Account Settings',
  description:
    'Manage your exam target, monitor your Rookie Coins balance, check current learning streaks, and configure study preferences.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
