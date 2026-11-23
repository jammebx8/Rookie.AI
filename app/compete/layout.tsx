import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Compete — Real-Time 1v1 Academic Battle',
  description:
    'Challenge learners in live 1-on-1 academic battles on Rookie.AI. Solve 5 timed questions under pressure, earn Rookie Coins, climb the platform leaderboard, and test your speed.',
  keywords: [
    'Compete',
    '1v1 academic battle',
    'quiz battle',
    'JEE Main Compete',
    'NEET battle',
    'Rookie Coins',
    'Elo rating system',
    'timed questions',
  ],
  alternates: {
    canonical: 'https://rookie.ai/compete',
  },
  openGraph: {
    title: 'Compete — Real-Time 1v1 Academic Battles | Rookie.AI',
    description:
      'Challenge other students in live 1v1 battles. 5 questions, real-time matchmaking, Rookie Coins rewards, and dynamic Elo ratings.',
    url: 'https://rookie.ai/compete',
    images: [
      {
        url: '/brand/rookie-owl.png',
        width: 512,
        height: 512,
        alt: 'Rookie.AI Compete 1v1 Battles',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Compete — Real-Time 1v1 Academic Battles | Rookie.AI',
    description:
      'Challenge other students in live 1v1 battles. 5 questions, real-time matchmaking, Rookie Coins rewards, and dynamic Elo ratings.',
    images: ['/brand/rookie-owl.png'],
  },
};

export default function CompeteLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
