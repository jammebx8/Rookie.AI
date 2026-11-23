import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Custom Mock Tests & Exam Simulation',
  description:
    'Generate customized timed mock tests for JEE Main, JEE Advanced, and NEET. Choose specific chapters, set difficulty, and practice in authentic exam conditions on Rookie.AI.',
  alternates: {
    canonical: 'https://rookie.ai/tests',
  },
  openGraph: {
    title: 'Custom Mock Tests & Exam Simulation | Rookie.AI',
    description:
      'Generate customized timed mock tests for JEE Main, JEE Advanced, and NEET. Choose specific chapters, set difficulty, and practice in authentic exam conditions on Rookie.AI.',
    url: 'https://rookie.ai/tests',
  },
};

export default function TestsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
