import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Chapter Navigator & Syllabus Breakdown',
  description:
    'Explore complete exam chapters, question weightage, and curated question banks for JEE Main, JEE Advanced, and NEET on Rookie.AI.',
  alternates: {
    canonical: 'https://rookie.ai/chapterpage',
  },
  openGraph: {
    title: 'Chapter Navigator & Syllabus Breakdown | Rookie.AI',
    description:
      'Explore complete exam chapters, question weightage, and curated question banks for JEE Main, JEE Advanced, and NEET on Rookie.AI.',
    url: 'https://rookie.ai/chapterpage',
  },
};

export default function ChapterPageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
