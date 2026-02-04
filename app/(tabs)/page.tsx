'use client';
import React, { useState } from 'react';
import Link from 'next/link';

/**
 * Converted Home screen from your index.tsx (React Native) to Next.js client component (TypeScript).
 * This is a simplified, responsive web version using Tailwind classes.
 *
 * Replace playlist links, images, and data with your actual content/assets as needed.
 */

const socialMediaLinks = [
  { label: 'Instagram', icon: '/images/instagram 1.png', url: 'https://www.instagram.com/rookie_ai.2006' },
  { label: 'LinkedIn', icon: '/images/linkedin (2) 1.png', url: 'https://www.linkedin.com/in/dhruv-pathak-437a56365/' },
  { label: 'Reddit', icon: '/images/reddit 3.png', url: 'https://www.reddit.com' },
  { label: 'Discord', icon: '/images/discord 1.png', url: 'https://discord.gg/snh7kFPV' },
];

const quickChapters = [
  { title: 'Units and Measurements', questions: 90 },
  { title: 'Kinematics', questions: 70 },
  { title: 'Laws of Motion', questions: 90 },
  { title: 'Work, Energy, and Power', questions: 80 },
  { title: 'Rotational Motion', questions: 90 },
  { title: 'Gravitation', questions: 70 },
];

export default function HomePage() {
  const [selectedCardTab, setSelectedCardTab] = useState<'Physics' | 'Maths' | 'Chemistry'>('Physics');
  const [modalChapter, setModalChapter] = useState<{ title: string; questions: number } | null>(null);

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-white text-2xl font-semibold mb-3">Quick Formula Cards</h2>

        <div className="flex items-center gap-4">
          <div className="flex gap-2">
            {['Physics', 'Maths', 'Chemistry'].map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedCardTab(tab as any)}
                className={`px-4 py-2 rounded-full ${selectedCardTab === tab ? 'bg-white text-black' : 'bg-slate-800 text-white'}`}
              >
                {tab}
              </button>
            ))}
          </div>

          <div className="flex-1 overflow-x-auto">
            <div className="flex gap-3 py-2">
              {quickChapters.map((c) => (
                <button
                  key={c.title}
                  className="min-w-[160px] bg-gradient-to-br from-sky-600 to-indigo-600 rounded-lg p-4 flex flex-col justify-between text-white"
                  onClick={() => setModalChapter(c)}
                >
                  <div className="font-semibold">{c.title}</div>
                  <div className="mt-3 flex items-center justify-between">
                    <div className="text-sm">{c.questions} Qs</div>
                    <div className="bg-white text-black rounded-md px-2 py-1">Go</div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-white text-2xl font-semibold mb-3">Study Content</h2>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <a key={idx} href="#" className="block bg-slate-800 rounded-lg overflow-hidden">
              <div className="h-28 bg-cover bg-center" style={{ backgroundImage: `url('/images/featpicsss.png')` }} />
              <div className="p-3 text-white">
                <div className="font-medium">Chapter {idx + 1}</div>
                <div className="text-sm text-slate-300 mt-1">Playlist link</div>
              </div>
            </a>
          ))}
        </div>
      </section>

      <section className="rounded-xl p-4 bg-gradient-to-r from-teal-500 to-indigo-600 text-white">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold">Study with your friends!</h3>
            <p className="mt-1 text-sm opacity-90">Invite your friends to Rookie app to learn together.</p>
            <div className="mt-3">
              <button
                onClick={() => {
                  const text = encodeURIComponent('Hey! Join me on Rookie: https://rookie-ai.vercel.app');
                  // open whatsapp on web to share
                  window.open(`https://wa.me/?text=${text}`, '_blank');
                }}
                className="mt-2 bg-white text-black px-4 py-2 rounded-md font-medium"
              >
                Invite
              </button>
            </div>
          </div>

          <img src="/images/invite_friends.png" alt="invite" className="w-48 h-36 object-contain" />
        </div>
      </section>

      <section className="bg-orange-500 rounded-xl p-4 text-white">
        <h3 className="font-semibold text-lg">We're on social media</h3>
        <p className="mt-1 text-sm">Follow us and share with your friends.</p>

        <div className="mt-3 flex flex-wrap gap-3">
          {socialMediaLinks.map((s) => (
            <a key={s.label} href={s.url} target="_blank" rel="noreferrer" className="flex items-center gap-3 bg-white text-black px-3 py-2 rounded-md">
              <img src={s.icon} alt={s.label} className="w-6 h-6" />
              <span className="font-semibold">{s.label}</span>
            </a>
          ))}
        </div>
      </section>

      <footer className="mt-6">
        <img src="/images/featpicsss.png" alt="footer" className="w-full h-28 object-cover rounded-lg" />
        <div className="text-slate-400 text-sm mt-3">v1.0.1</div>
      </footer>

      {/* Modal */}
      {modalChapter && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
          <div className="bg-slate-900 w-full max-w-2xl p-6 rounded-lg">
            <div className="flex items-start justify-between">
              <h4 className="text-white text-lg font-semibold">{modalChapter.title}</h4>
              <button className="text-white text-2xl" onClick={() => setModalChapter(null)}>×</button>
            </div>
            <div className="mt-4 text-slate-700 bg-white rounded-md p-4 min-h-[220px]">
              {/* put formula explainer or content here */}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}