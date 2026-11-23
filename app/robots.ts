import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = 'https://rookie.ai';

  return {
    rules: [
      {
        userAgent: '*',
        allow: [
          '/',
          '/home',
          '/compete',
          '/leaderboard',
          '/tests',
          '/practice',
          '/QuestionViewer',
          '/chapterpage',
          '/explore',
        ],
        disallow: [
          '/api/',
          '/bookmark',
          '/profile',
          '/design-system',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
