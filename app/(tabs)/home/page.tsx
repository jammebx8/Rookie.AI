'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../public/src/utils/supabase';

// ─── Types ───────────────────────────────────────────────────────────────────
type User = {
  id: string;
  email?: string;
  name?: string;
  exam?: string;
  cl?: string;
  [key: string]: any;
};

// ─── Constants ───────────────────────────────────────────────────────────────
const EXAM_OPTIONS = ['JEE Mains', 'NEET', 'JEE Advanced', 'Other'];
const CLASS_OPTIONS = ['11th', '12th', 'Dropper', 'Other'];

const socialMediaLinks = [
  {
    label: 'Instagram',
    icon: '/instagram 1.png',
    url: 'https://www.instagram.com/rookie_ai.2006?igsh=ajB6YXRnNnJ4OGZ2',
  },
  {
    label: 'LinkedIn',
    icon: '/linkedin (2) 1.png',
    url: 'https://www.linkedin.com/in/dhruv-pathak-437a56365/',
  },
  {
    label: 'Reddit',
    icon: '/reddit 3.png',
    url: 'https://www.reddit.com/u/Possible_Loss4995/s/pcBd7G86Ic',
  },
  {
    label: 'Discord',
    icon: '/discord 1.png',
    url: 'https://discord.gg/snh7kFPV',
  },
];

const STATS = [
  { value: '5,000+', label: 'Questions' },
  { value: '3', label: 'Subjects' },
  { value: '10K+', label: 'Students' },
];

const FEATURES = [
  {
    icon: '⚡',
    title: 'AI-Powered Solutions',
    desc: 'Get step-by-step explanations generated instantly for every question.',
    color: '#3B82F6',
  },
  {
    icon: '🎯',
    title: 'Smart Practice',
    desc: 'Questions curated from JEE & NEET papers with year-wise filters.',
    color: '#10B981',
  },
  {
    icon: '🏆',
    title: 'Compete & Grow',
    desc: 'Earn Rookie Coins for correct answers and climb the leaderboard.',
    color: '#F59E0B',
  },
  {
    icon: '🔖',
    title: 'Bookmark & Revisit',
    desc: 'Save tricky questions and come back to them any time.',
    color: '#8B5CF6',
  },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function openExternal(url?: string) {
  if (!url || typeof window === 'undefined') return;
  window.open(url, '_blank', 'noopener,noreferrer');
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

// ─── Animation variants ───────────────────────────────────────────────────────
const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.38, delay: i * 0.07 },
  }),
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [cl, setcl] = useState('');
  const [exam, setExam] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const cached = localStorage.getItem('@user');
      if (!cached) return;
      const parsed: User = JSON.parse(cached);
      setUser(parsed);
      if (!parsed.cl || !parsed.exam) {
        setShowProfileModal(true);
      } else {
        setcl(parsed.cl || '');
        setExam(parsed.exam || '');
      }
    } catch {
      // ignore
    }
  }, []);

  const saveProfile = async () => {
    if (!cl || !exam) { alert('Please select your class and exam'); return; }
    if (!user) { alert('No user loaded'); return; }
    try {
      setSaving(true);
      const { error } = await supabase.from('users').update({ cl, exam }).eq('id', user.id);
      if (error) throw error;
      const updated = { ...user, cl, exam };
      localStorage.setItem('@user', JSON.stringify(updated));
      setUser(updated);
      setShowProfileModal(false);
    } catch (err: any) {
      alert(err?.message ?? 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const inviteFriends = async () => {
    const link = 'https://rookie-ai.vercel.app';
    const text = `Hey! 👋 Join me on Rookie to study smarter together 🚀\n${link}`;
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try { await (navigator as any).share({ title: 'Rookie', text, url: link }); return; } catch {}
    }
    const encoded = encodeURIComponent(text);
    if (typeof window !== 'undefined') {
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = `whatsapp://send?text=${encoded}`;
        setTimeout(() => window.open(`https://wa.me/?text=${encoded}`, '_blank'), 800);
        return;
      }
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  };

  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || null;

  return (
    <main className="min-h-screen bg-[#000000] text-white">

      {/* ─── Profile Completion Modal ─────────────────────────────────────── */}
      <AnimatePresence>
        {showProfileModal && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="w-full max-w-md bg-[#0A0E17] border border-[#1D2939] rounded-2xl p-6"
              initial={{ scale: 0.96, opacity: 0, y: 12 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.96, opacity: 0 }}
            >
              <h3 className="text-white text-lg font-bold mb-1">Complete your profile</h3>
              <p className="text-sm text-gray-400 mb-5">
                A couple of details to personalise your experience.
              </p>

              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Class
              </label>
              <div className="flex flex-wrap gap-2 mb-5">
                {CLASS_OPTIONS.map((g) => (
                  <motion.button
                    key={g}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setcl(g)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      cl === g
                        ? 'bg-white text-black border-white'
                        : 'bg-transparent border-[#1D2939] text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {g}
                  </motion.button>
                ))}
              </div>

              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                Target Exam
              </label>
              <div className="flex flex-wrap gap-2 mb-7">
                {EXAM_OPTIONS.map((e) => (
                  <motion.button
                    key={e}
                    whileTap={{ scale: 0.96 }}
                    onClick={() => setExam(e)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition-all ${
                      exam === e
                        ? 'bg-white text-black border-white'
                        : 'bg-transparent border-[#1D2939] text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    {e}
                  </motion.button>
                ))}
              </div>

              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowProfileModal(false)}
                  className="px-4 py-2 rounded-xl text-sm text-gray-400 border border-[#1D2939] hover:border-gray-500 transition-colors"
                >
                  Skip
                </button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  onClick={saveProfile}
                  disabled={saving}
                  className="px-5 py-2 rounded-xl bg-white text-black text-sm font-bold disabled:opacity-60"
                >
                  {saving ? 'Saving…' : 'Continue'}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Page Body ────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="max-w-2xl mx-auto px-4 sm:px-6 pb-10"
      >

        {/* ── Greeting Hero ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={0}
          className="pt-6"
        >
          <p className="text-gray-400 text-sm mb-1">
            {getGreeting()}{firstName ? `, ${firstName}` : ''} 👋
          </p>
          <h1 className="text-3xl font-bold leading-tight tracking-tight">
            Ready to crack
            <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
              {exam || 'your exam'}?
            </span>
          </h1>

          {(cl || exam) && (
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              {cl && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#0A0E17] border border-[#1D2939] text-gray-300">
                  {cl}
                </span>
              )}
              {exam && (
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-[#0A0E17] border border-[#1D2939] text-blue-400">
                  {exam}
                </span>
              )}
              <button
                onClick={() => setShowProfileModal(true)}
                className="text-xs text-gray-600 hover:text-gray-400 transition-colors underline underline-offset-2"
              >
                Edit
              </button>
            </div>
          )}
        </motion.section>

        {/* ── Stats Strip ── */}
        <motion.div
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={1}
          className="mt-5 grid grid-cols-3 gap-3"
        >
          {STATS.map((s) => (
            <div
              key={s.label}
              className="rounded-2xl bg-[#0A0E17] border border-[#1D2939] py-4 px-3 text-center"
            >
              <p className="text-xl font-bold text-white leading-none">{s.value}</p>
              <p className="text-xs text-gray-500 mt-1">{s.label}</p>
            </div>
          ))}
        </motion.div>

        {/* ── Quick Actions ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={2}
          className="mt-7"
        >
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Quick Actions
          </h2>
          <div className="grid grid-cols-2 gap-3">

            {/* Practice */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/explore')}
              className="relative rounded-2xl bg-gradient-to-br from-blue-600 to-blue-800 p-5 text-left overflow-hidden"
            >
              <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute right-2 -bottom-5 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
              <p className="text-2xl mb-3">📚</p>
              <p className="font-bold text-white text-sm">Practice</p>
              <p className="text-blue-200/80 text-xs mt-0.5">Questions by chapter</p>
            </motion.button>

            {/* Leaderboard */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/leaderboard')}
              className="relative rounded-2xl bg-gradient-to-br from-yellow-600 to-orange-700 p-5 text-left overflow-hidden"
            >
              <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white/5 pointer-events-none" />
              <div className="absolute right-2 -bottom-5 w-20 h-20 rounded-full bg-white/5 pointer-events-none" />
              <p className="text-2xl mb-3">🏆</p>
              <p className="font-bold text-white text-sm">Leaderboard</p>
              <p className="text-orange-200/80 text-xs mt-0.5">See top rankers</p>
            </motion.button>

            {/* Bookmarks */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/bookmark')}
              className="relative rounded-2xl bg-[#0A0E17] border border-[#1D2939] p-5 text-left overflow-hidden"
            >
              <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white/3 pointer-events-none" />
              <p className="text-2xl mb-3">🔖</p>
              <p className="font-bold text-white text-sm">Bookmarks</p>
              <p className="text-gray-500 text-xs mt-0.5">Saved questions</p>
            </motion.button>

            {/* Settings */}
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => router.push('/profile')}
              className="relative rounded-2xl bg-[#0A0E17] border border-[#1D2939] p-5 text-left overflow-hidden"
            >
              <div className="absolute -right-3 -top-3 w-16 h-16 rounded-full bg-white/3 pointer-events-none" />
              <p className="text-2xl mb-3">⚙️</p>
              <p className="font-bold text-white text-sm">Settings</p>
              <p className="text-gray-500 text-xs mt-0.5">Profile & preferences</p>
            </motion.button>
          </div>
        </motion.section>

        {/* ── Why Rookie ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={3}
          className="mt-8"
        >
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Why Rookie?
          </h2>
          <div className="space-y-3">
            {FEATURES.map((f, i) => (
              <motion.div
                key={f.title}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={3.5 + i * 0.4}
                className="flex items-start gap-4 rounded-2xl bg-[#0A0E17] border border-[#1D2939] p-4"
              >
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ backgroundColor: `${f.color}18`, border: `1px solid ${f.color}30` }}
                >
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.title}</p>
                  <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{f.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ── Invite Friends ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={6}
          className="mt-8"
        >
          <div className="rounded-2xl relative overflow-hidden bg-gradient-to-r from-[#0F7E6B] to-[#2E5BFF] p-5 flex items-center gap-4">
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute right-12 -bottom-8 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />

            <div className="flex-1 min-w-0 z-10">
              <h3 className="text-white font-bold text-base leading-snug">
                Study with your friends!
              </h3>
              <p className="text-white/75 text-sm mt-1 leading-relaxed">
                Invite friends to Rookie and learn together.
              </p>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={inviteFriends}
                className="mt-4 inline-flex items-center gap-2 px-5 py-2.5 bg-white text-black rounded-full text-sm font-bold shadow-md"
              >
                Invite Now →
              </motion.button>
            </div>

            <div className="w-28 h-20 relative hidden sm:block flex-shrink-0 z-10">
              <Image
                src="/invite_friends.png"
                alt="Invite friends"
                fill
                style={{ objectFit: 'contain' }}
              />
            </div>
          </div>
        </motion.section>

        {/* ── Social Media ── */}
        <motion.section
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={7}
          className="mt-5"
        >
          <div className="rounded-2xl p-5 bg-[#F05A24] relative overflow-hidden">
            <div className="absolute -left-8 -bottom-8 w-36 h-36 rounded-full bg-white/5 pointer-events-none" />
            <div className="absolute right-2 -top-8 w-28 h-28 rounded-full bg-white/5 pointer-events-none" />

            <h3 className="text-white font-bold text-base text-center relative z-10">
              We're on social media
            </h3>
            <p className="text-white/75 text-sm text-center mt-1 relative z-10">
              Follow us and share with your friends.
            </p>

            <div className="flex flex-wrap justify-center gap-3 mt-4 relative z-10">
              {socialMediaLinks.map((item) => (
                <motion.button
                  key={item.label}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => openExternal(item.url)}
                  className="flex items-center gap-2.5 bg-white rounded-xl px-4 py-2.5 w-[148px] justify-start shadow-sm"
                  aria-label={`Open ${item.label}`}
                >
                  <div className="w-5 h-5 relative flex-shrink-0">
                    <Image src={item.icon} alt={item.label} fill style={{ objectFit: 'contain' }} />
                  </div>
                  <span className="text-sm font-semibold text-black">{item.label}</span>
                </motion.button>
              ))}
            </div>
          </div>
        </motion.section>

        {/* ── Footer ── */}
        <motion.footer
          variants={fadeUp}
          initial="hidden"
          animate="visible"
          custom={8}
          className="mt-8 rounded-2xl bg-[#0A0E17] border border-[#1D2939] overflow-hidden"
        >
          {/* Hero image strip with gradient fade */}
          <div className="w-full h-28 relative">
            <Image
              src="/featpicsss.png"
              alt="Rookie footer"
              fill
              style={{ objectFit: 'cover' }}
              priority={false}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0A0E17] via-[#0A0E17]/50 to-transparent" />
          </div>

          <div className="px-5 pb-6">
            {/* Logo row */}
            <div className="flex items-center gap-3 mb-5">
              <div className="relative w-10 h-10 flex-shrink-0">
                <Image src="/lg.png" alt="Rookie" fill style={{ objectFit: 'contain' }} />
              </div>
              <div>
                <p className="text-white font-bold text-sm leading-none">Rookie</p>
                <p className="text-gray-500 text-xs mt-0.5">AI-powered exam prep</p>
              </div>
            </div>

            {/* Nav links */}
            <div className="flex flex-wrap gap-x-6 gap-y-2 mb-5">
              {[
                { label: 'Practice', path: '/explore' },
                { label: 'Leaderboard', path: '/leaderboard' },
                { label: 'Bookmarks', path: '/bookmark' },
                { label: 'Settings', path: '/profile' },
              ].map((link) => (
                <button
                  key={link.label}
                  onClick={() => router.push(link.path)}
                  className="text-xs text-gray-400 hover:text-white transition-colors"
                >
                  {link.label}
                </button>
              ))}
            </div>

            {/* Bottom bar */}
            <div className="border-t border-[#1D2939] pt-4 flex items-center justify-between flex-wrap gap-3">
              <p className="text-xs text-gray-600">
                © {new Date().getFullYear()} Rookie. All rights reserved.
              </p>
              {/* Social icons in footer */}
              <div className="flex items-center gap-3">
                {socialMediaLinks.map((item) => (
                  <motion.button
                    key={item.label}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => openExternal(item.url)}
                    aria-label={item.label}
                    className="w-7 h-7 relative opacity-50 hover:opacity-100 transition-opacity"
                  >
                    <Image
                      src={item.icon}
                      alt={item.label}
                      fill
                      style={{ objectFit: 'contain' }}
                      className="brightness-0 invert"
                    />
                  </motion.button>
                ))}
              </div>
            </div>
          </div>
        </motion.footer>

        {/* bottom nav spacer */}
        <div className="h-4" />
      </motion.div>
    </main>
  );
}