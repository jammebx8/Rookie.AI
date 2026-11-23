import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Home — Daily Practice & Academic Dashboard',
  description:
    'Personalized daily practice and AI-assisted exam preparation for JEE Main, JEE Advanced, and NEET. Solve daily revision sets, battle learners in Compete, and track learning streaks.',
  alternates: {
    canonical: 'https://rookie.ai/home',
  },
  openGraph: {
    title: 'Home — Daily Practice & Academic Dashboard | Rookie.AI',
    description:
      'Personalized daily practice and AI-assisted exam preparation for JEE Main, JEE Advanced, and NEET. Solve daily revision sets, battle learners in Compete, and track learning streaks.',
    url: 'https://rookie.ai/home',
  },
};

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
