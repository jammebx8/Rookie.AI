import type { Metadata, Viewport } from 'next';
import './globals.css';
import React from 'react';
import Script from 'next/script';
import { AnalyticsTracker } from '@/components/AnalyticsTracker';
import { FirebaseClientInit } from '@/components/FirebaseClientInit';

export const metadata: Metadata = {
  metadataBase: new URL('https://rookie.ai'),
  title: {
    default: 'Rookie.AI — Real-Time 1v1 Battles & Adaptive Exam Preparation',
    template: '%s | Rookie.AI',
  },
  description:
    'Master JEE Main, JEE Advanced & NEET with Rookie.AI. Compete in 1v1 academic battles, solve AI-assisted practice questions, and climb the platform leaderboard.',
  keywords: [
    'JEE Main',
    'JEE Advanced',
    'NEET',
    'Rookie.AI',
    'Compete',
    '1v1 academic battle',
    'quiz battle',
    'exam preparation',
    'AI solutions',
    'previous year questions',
    'mock tests',
    'Rookie Coins',
    'leaderboard',
  ],
  authors: [{ name: 'Rookie.AI' }],
  creator: 'Rookie.AI',
  publisher: 'Rookie.AI',
  category: 'Education',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://rookie.ai',
    siteName: 'Rookie.AI',
    title: 'Rookie.AI — Real-Time 1v1 Battles & Adaptive Exam Preparation',
    description:
      'Master JEE Main, JEE Advanced & NEET with Rookie.AI. Compete in 1v1 academic battles, solve AI-assisted practice questions, and climb the platform leaderboard.',
    images: [
      {
        url: '/brand/rookie-owl.png',
        width: 512,
        height: 512,
        alt: 'Rookie.AI Owl Brand Logo',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Rookie.AI — Real-Time 1v1 Battles & Adaptive Exam Preparation',
    description:
      'Master JEE Main, JEE Advanced & NEET with Rookie.AI. Compete in 1v1 academic battles, solve AI-assisted practice questions, and climb the platform leaderboard.',
    images: ['/brand/rookie-owl.png'],
  },
  icons: {
    icon: '/brand/rookie-owl.png',
    shortcut: '/brand/rookie-owl.png',
    apple: '/brand/rookie-owl.png',
  },
};

export const viewport: Viewport = {
  themeColor: '#050914',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head />
      <body className="antialiased bg-[var(--background)] text-[var(--foreground)]">
        <FirebaseClientInit />
        <AnalyticsTracker />
        {children}
        {/* Razorpay checkout SDK — loaded once for the whole app */}
        <Script
          src="https://checkout.razorpay.com/v1/checkout.js"
          strategy="lazyOnload"
        />
      </body>
    </html>
  );
}
