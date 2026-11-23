import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Explore Questions & Core Concepts',
  description:
    'Discover curated subject-wise question sets, core formulas, and topic collections for JEE Main, Advanced, and NEET on Rookie.AI.',
  alternates: {
    canonical: 'https://rookie.ai/explore',
  },
  openGraph: {
    title: 'Explore Questions & Core Concepts | Rookie.AI',
    description:
      'Discover curated subject-wise question sets, core formulas, and topic collections for JEE Main, Advanced, and NEET on Rookie.AI.',
    url: 'https://rookie.ai/explore',
  },
};

export default function ExploreLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
