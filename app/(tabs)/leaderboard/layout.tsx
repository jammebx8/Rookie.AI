import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Platform Leaderboard & Rankings',
  description:
    'Track student rankings across Rookie.AI. See who is leading in Rookie Coins earned, benchmark your consistency against aspirants nationwide, and climb to the top tier.',
  alternates: {
    canonical: 'https://rookie.ai/leaderboard',
  },
  openGraph: {
    title: 'Platform Leaderboard & Rankings | Rookie.AI',
    description:
      'Track student rankings across Rookie.AI. See who is leading in Rookie Coins earned, benchmark your consistency against aspirants nationwide, and climb to the top tier.',
    url: 'https://rookie.ai/leaderboard',
  },
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
