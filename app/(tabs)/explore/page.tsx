'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import Image, { StaticImageData } from 'next/image';
import { useRouter } from 'next/navigation';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { motion, AnimatePresence } from 'framer-motion';
import imagepath from '../../../public/src/constants/imagepath';
import { supabase } from '../../../public/src/utils/supabase';
import { hasRookiePass, getPassExpiry, triggerCheckout, bustPassCache } from '../../../lib/rookiePass';

type Subject = {
  name: string;
  chapters: number;
  questions: number;
  weightage: string;
  badge: string;
  badgeColor: string;
  imageKey: string;
  color: string;
};

const EXAMS = [
  { name: 'JEE Main' },
  { name: 'JEE Advanced' },
];

const SUBJECTS: Record<string, Subject[]> = {
  'JEE Main': [
    { name: 'Physics',   chapters: 19, questions: 1600, weightage: '33%', badge: '#1 Subject', badgeColor: '#00C48C', imageKey: 'Physics1',    color: '#1E90FF' },
    { name: 'Chemistry', chapters: 14, questions: 1130, weightage: '31%', badge: '#3 Subject', badgeColor: '#FF4D00', imageKey: 'Chemistry1',  color: '#FFA500' },
    { name: 'Maths',     chapters: 16, questions: 1270, weightage: '37%', badge: '#2 Subject', badgeColor: '#F59E0B', imageKey: 'Maths1',      color: '#D32F8D' },
  ],
  'JEE Advanced': [
    { name: 'Physics',   chapters: 24, questions: 893,  weightage: '33%', badge: '#1 Subject', badgeColor: '#00C48C', imageKey: 'AdvPhysics',   color: '#1E90FF' },
    { name: 'Chemistry', chapters: 31, questions: 1054, weightage: '33%', badge: '#3 Subject', badgeColor: '#FF4D00', imageKey: 'AdvChemistry', color: '#FFA500' },
    { name: 'Maths',     chapters: 26, questions: 1775, weightage: '34%', badge: '#2 Subject', badgeColor: '#F59E0B', imageKey: 'AdvMaths',     color: '#D32F8D' },
  ],
};

// ─── Skeleton card ─────────────────────────────────────────────────────────────
function SubjectSkeleton({ isDark }: { isDark: boolean }) {
  const sh   = isDark ? 'bg-[#1a1a1a]' : 'bg-[#e5e7eb]';
  const card = isDark ? 'bg-black border-[#262626]' : 'bg-white border-[#E5E7EB]';
  return (
    <div className={`border rounded-2xl overflow-hidden ${card}`}>
      <div className={`w-full h-24 sm:h-32 ${sh}`} />
      <div className="px-4 py-3.5 sm:px-5 sm:py-4 space-y-3">
        <div className="flex items-center justify-between">
          <div className={`h-4 w-24 rounded-full ${sh}`} />
          <div className={`h-6 w-16 rounded-lg ${sh}`} />
        </div>
        <div className="flex items-center gap-3">
          <div className={`h-3 w-20 rounded-full ${sh}`} />
          <div className={`h-3 w-20 rounded-full ${sh}`} />
          <div className={`h-3 w-20 rounded-full ${sh}`} />
        </div>
      </div>
    </div>
  );
}

// ─── Paywall modal ─────────────────────────────────────────────────────────────
function PaywallModal({
  isDark,
  onClose,
  onCheckout,
  paying,
}: {
  isDark: boolean;
  onClose: () => void;
  onCheckout: () => void;
  paying: boolean;
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center bg-black/75 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm rounded-3xl overflow-hidden"
        style={{
          background: 'linear-gradient(145deg, #0d0221 0%, #0a0a2e 50%, #0d1a3a 100%)',
          border: '1px solid rgba(139,92,246,0.4)',
          boxShadow: '0 24px 64px rgba(99,102,241,0.25)',
        }}
      >
        {/* Holographic foil strip */}
        <div className="h-1 w-full" style={{
          background: 'linear-gradient(90deg, #c084fc, #818cf8, #38bdf8, #34d399, #fbbf24, #f472b6, #a78bfa)',
        }} />

        <div className="p-6">
          {/* Icon */}
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center mb-4"
            style={{ background: 'rgba(139,92,246,0.2)', border: '1px solid rgba(139,92,246,0.4)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
            </svg>
          </div>

          <p className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: 'rgba(165,180,252,0.6)' }}>
            Rookie Pass Required
          </p>
          <h3 className="text-xl font-extrabold text-white mb-2 leading-tight">
            JEE Advanced PYQs<br/>
            <span style={{ background: 'linear-gradient(90deg,#a78bfa,#818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              are gated
            </span>
          </h3>
          <p className="text-sm mb-5" style={{ color: 'rgba(203,213,225,0.6)' }}>
            Unlock all JEE Advanced PYQs across every year, subject, and chapter — including AI buddy solutions and custom tests.
          </p>

          {/* Features */}
          {['All years of JEE Advanced PYQs', 'AI buddy explanations', 'Custom JEE Advanced tests', 'Performance tracking'].map(f => (
            <div key={f} className="flex items-center gap-2 mb-2">
              <div className="w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.5)' }}>
                <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                  <path d="M1 3l2 2 4-4" stroke="#4ade80" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              <span className="text-xs font-medium" style={{ color: 'rgba(226,232,240,0.75)' }}>{f}</span>
            </div>
          ))}

          {/* Price */}
          <div className="flex items-baseline gap-1.5 mt-5 mb-4">
            <span className="text-3xl font-black text-white">₹299</span>
            <span className="text-sm font-medium" style={{ color: 'rgba(148,163,184,0.5)' }}>/year</span>
            <span className="text-xs font-semibold line-through ml-1" style={{ color: 'rgba(148,163,184,0.4)' }}>₹999</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full ml-1"
              style={{ background: 'rgba(16,185,129,0.2)', border: '1px solid rgba(16,185,129,0.4)', color: '#4ade80' }}>
              70% OFF
            </span>
          </div>

          {/* CTA */}
          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={onCheckout}
            disabled={paying}
            className="relative w-full overflow-hidden py-3 rounded-2xl text-sm font-bold text-white disabled:opacity-60"
            style={{
              background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 55%, #6d28d9 100%)',
              boxShadow: '0 4px 20px rgba(99,102,241,0.4)',
            }}
          >
            {paying ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
                </svg>
                Processing…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="1" y="4" width="22" height="16" rx="2"/><line x1="1" y1="10" x2="23" y2="10"/>
                </svg>
                Get Rookie Pass — ₹299/year
              </span>
            )}
          </motion.button>

          <button onClick={onClose} className="w-full mt-3 text-xs py-2 rounded-xl transition-colors"
            style={{ color: 'rgba(148,163,184,0.5)' }}>
            Maybe later
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Card animation variants ───────────────────────────────────────────────────
const containerVariants = {
  hidden:  { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const dropdownVariants = {
  hidden:  { opacity: 0, y: -6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
};

const cardVariants = {
  initial: { opacity: 0, y: 8 },
  enter:   (i: number) => ({
    opacity: 1, y: 0,
    transition: { delay: i * 0.07, duration: 0.35 },
  }),
  hover: { scale: 1.015, boxShadow: '0 8px 28px rgba(0,0,0,0.12)' },
  tap:   { scale: 0.995 },
};

// ─── Main page ─────────────────────────────────────────────────────────────────
export default function ExplorePage() {
  const [selectedExam, setSelectedExam] = useState<string>(EXAMS[0].name);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [isDark,       setIsDark]       = useState(true);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const [hasPass,      setHasPass]      = useState<boolean | null>(null); // null = checking
  const [showPaywall,  setShowPaywall]  = useState(false);
  const [paying,       setPaying]       = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const router   = useRouter();

  // Theme sync
  useEffect(() => {
    const update = () => setIsDark(localStorage.getItem('theme') !== 'light');
    update();
    window.addEventListener('storage', update);
    const ob = new MutationObserver(update);
    ob.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => { window.removeEventListener('storage', update); ob.disconnect(); };
  }, []);

  // Check pass from DB on mount + listen for updates
  useEffect(() => {
    const checkPass = async () => {
      try {
        const pass = await hasRookiePass();
        setHasPass(pass);
      } catch { setHasPass(false); }
    };
    checkPass();
    const handleUpdate = () => { checkPass(); };
    window.addEventListener('rookiePassUpdated', handleUpdate);
    return () => window.removeEventListener('rookiePassUpdated', handleUpdate);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleExamSelect = (name: string) => {
    setShowDropdown(false);
    if (name === selectedExam) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowSkeleton(true);
    timerRef.current = setTimeout(() => {
      setSelectedExam(name);
      setShowSkeleton(false);
    }, 350);
  };

  const handleSubjectPress = useCallback((subject: Subject) => {
    // Gate: JEE Advanced requires a pass
    if (selectedExam === 'JEE Advanced' && !hasPass) {
      setShowPaywall(true);
      return;
    }
    const params = new URLSearchParams({
      examName:     selectedExam,
      subjectName:  subject.name,
      subjectColor: subject.color,
      badge:        subject.badge.split(' ')[0],
      badgeColor:   subject.badgeColor,
      imageKey:     subject.imageKey,
    });
    router.push(`/chapterpage?${params.toString()}`);
  }, [selectedExam, hasPass, router]);

  const handleCheckout = useCallback(async () => {
    setPaying(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { alert('Please sign in to purchase.'); setPaying(false); return; }
      const raw = localStorage.getItem('@user');
      const user = raw ? JSON.parse(raw) : null;

      await triggerCheckout({
        token:   session.access_token,
        userId:  session.user.id,
        email:   session.user.email,
        name:    user?.name ?? null,
        onDismiss: () => setPaying(false),
        onSuccess: async () => {
          bustPassCache();
          setHasPass(true);
          setShowPaywall(false);
          setPaying(false);
        },
        onError: (msg) => {
          alert(msg);
          setPaying(false);
        },
      });
    } catch (e) {
      console.error(e);
      setPaying(false);
    }
  }, []);

  const resolveImage = (key: string): StaticImageData | string | undefined =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (imagepath as any)?.[key];

  // Theme tokens
  const pageBg           = isDark ? 'bg-[#000]'                : 'bg-[#F8F9FF]';
  const textPrimary      = isDark ? 'text-white'                : 'text-[#111827]';
  const textMuted        = isDark ? 'text-gray-400'             : 'text-gray-500';
  const cardBg           = isDark ? 'bg-black border-[#262626]' : 'bg-white border-[#E5E7EB]';
  const dropdownBg       = isDark ? 'bg-black border-[#262626]' : 'bg-white border-[#E5E7EB]';
  const dropdownHover    = isDark ? 'hover:bg-[#0f1724]'        : 'hover:bg-gray-50';
  const btnBg            = isDark
    ? 'bg-black border-[#262626] text-white'
    : 'bg-white border-[#D1D5DB] text-[#111827]';
  const badgeBg          = isDark ? 'bg-[#18183A]'              : 'bg-[#F5F3FF]';
  const statsText        = isDark ? 'text-gray-300'             : 'text-gray-500';
  const dividerColor     = isDark ? 'divide-[#262626]'          : 'divide-[#F3F4F6]';
  const imagePlaceholder = isDark ? 'bg-[#111]'                 : 'bg-[#F0F0F5]';

  const subjects        = SUBJECTS[selectedExam] ?? [];
  const isAdvanced      = selectedExam === 'JEE Advanced';
  const advLocked       = isAdvanced && hasPass === false;

  return (
    <>
      {/* Paywall modal */}
      <AnimatePresence>
        {showPaywall && (
          <PaywallModal
            isDark={isDark}
            onClose={() => { if (!paying) setShowPaywall(false); }}
            onCheckout={handleCheckout}
            paying={paying}
          />
        )}
      </AnimatePresence>

      <motion.main
        className={`min-h-screen ${pageBg} ${textPrimary} pb-10 px-4 sm:px-6 transition-colors duration-300`}
        initial="hidden"
        animate="visible"
        variants={containerVariants}
      >
        <div className="max-w-2xl mx-auto pt-6">

          {/* Header */}
          <div className="flex items-center justify-between mb-5 relative">
            <h1
              className={`text-2xl sm:text-3xl font-semibold tracking-tight ${textPrimary}`}
              style={{ fontFamily: 'Geist, sans-serif' }}
            >
              Practice
            </h1>

            <div className="relative">
              <motion.button
                onClick={() => setShowDropdown(s => !s)}
                className={`flex items-center gap-2 border rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${btnBg}`}
                whileTap={{ scale: 0.97 }}
                aria-expanded={showDropdown}
                aria-haspopup="listbox"
                type="button"
              >
                <span style={{ fontFamily: 'Geist, sans-serif' }}>{selectedExam}</span>
                <span className={textMuted}>
                  {showDropdown ? <FaChevronUp size={11} /> : <FaChevronDown size={11} />}
                </span>
              </motion.button>

              {showDropdown && (
                <motion.ul
                  className={`absolute right-0 mt-2 w-44 border rounded-xl shadow-xl z-50 overflow-hidden ${dropdownBg}`}
                  initial="hidden"
                  animate="visible"
                  variants={dropdownVariants}
                  role="listbox"
                >
                  {EXAMS.map((exam) => (
                    <li key={exam.name} role="option" aria-selected={selectedExam === exam.name}>
                      <button
                        onClick={() => handleExamSelect(exam.name)}
                        className={`w-full text-left px-4 py-2.5 text-sm ${textPrimary} ${dropdownHover} transition-colors flex items-center justify-between`}
                        style={{ fontFamily: 'Geist, sans-serif' }}
                        type="button"
                      >
                        {exam.name}
                        {selectedExam === exam.name && !showSkeleton && (
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 6L9 17l-5-5" />
                          </svg>
                        )}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </div>
          </div>

          {/* ── Locked banner for JEE Advanced (no pass) ── */}
          <AnimatePresence>
            {advLocked && (
              <motion.div
                initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-4 rounded-2xl px-4 py-3 flex items-center justify-between gap-3 cursor-pointer"
                style={{
                  background: 'linear-gradient(135deg, rgba(99,102,241,0.12) 0%, rgba(139,92,246,0.08) 100%)',
                  border: '1px solid rgba(139,92,246,0.3)',
                }}
                onClick={() => setShowPaywall(true)}
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: 'rgba(139,92,246,0.2)' }}>
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-white leading-none mb-0.5">Rookie Pass required</p>
                    <p className="text-[10px]" style={{ color: 'rgba(148,163,184,0.6)' }}>₹299/year · Unlock all JEE Advanced PYQs</p>
                  </div>
                </div>
                <span className="text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', color: 'white' }}>
                  Unlock
                </span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Cards area */}
          <div className="relative">

            {/* Skeleton */}
            <div
              className="space-y-4"
              style={{
                opacity:       showSkeleton ? 1 : 0,
                transition:    'opacity 200ms ease',
                pointerEvents: showSkeleton ? 'auto' : 'none',
                position:      showSkeleton ? 'relative' : 'absolute',
                top: 0, left: 0, right: 0,
              }}
              aria-hidden={!showSkeleton}
            >
              <SubjectSkeleton isDark={isDark} />
              <SubjectSkeleton isDark={isDark} />
              <SubjectSkeleton isDark={isDark} />
            </div>

            {/* Real cards */}
            <div
              className="space-y-4"
              style={{ opacity: showSkeleton ? 0 : 1, transition: 'opacity 250ms ease' }}
            >
              {subjects.map((subject, idx) => {
                const locked = advLocked;
                return (
                  <motion.article
                    key={`${selectedExam}-${subject.name}`}
                    className={`border rounded-2xl overflow-hidden transition-colors duration-300 relative ${cardBg} ${locked ? 'cursor-pointer' : 'cursor-pointer'}`}
                    onClick={() => handleSubjectPress(subject)}
                    initial="initial"
                    animate="enter"
                    whileHover={locked ? {} : 'hover'}
                    whileTap={locked ? {} : 'tap'}
                    variants={cardVariants}
                    custom={idx}
                    layout
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleSubjectPress(subject); }}
                  >
                    {/* Image banner */}
                    <div className={`relative w-full h-24 sm:h-32 ${imagePlaceholder}`}>
                      {resolveImage(subject.imageKey) && (
                        <Image
                          src={resolveImage(subject.imageKey) as StaticImageData | string}
                          alt={subject.name}
                          fill
                          className={`object-cover transition-all ${locked ? 'grayscale opacity-40' : ''}`}
                          sizes="(max-width: 640px) 100vw, 50vw"
                        />
                      )}
                      {/* Lock overlay on the image */}
                      {locked && (
                        <div className="absolute inset-0 flex items-center justify-center"
                          style={{ background: 'rgba(0,0,0,0.35)' }}>
                          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                            style={{ background: 'rgba(139,92,246,0.3)', border: '1px solid rgba(139,92,246,0.5)', backdropFilter: 'blur(8px)' }}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                              <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Body */}
                    <div className={`px-4 py-3.5 sm:px-5 sm:py-4 ${locked ? 'opacity-50' : ''}`}>
                      <div className="flex items-center justify-between mb-2.5">
                        <h2
                          className={`text-base sm:text-lg font-semibold ${textPrimary}`}
                          style={{ fontFamily: 'Geist, sans-serif' }}
                        >
                          {subject.name}
                        </h2>
                        <motion.div
                          className={`rounded-lg px-3 py-1 border inline-flex items-center ${badgeBg}`}
                          style={{ borderColor: `${subject.badgeColor}40` }}
                          whileHover={locked ? {} : { scale: 1.04 }}
                          transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                        >
                          <span
                            className="text-xs font-semibold"
                            style={{ color: subject.badgeColor, fontFamily: 'Geist, sans-serif' }}
                          >
                            {subject.badge}
                          </span>
                        </motion.div>
                      </div>

                      <div className={`flex items-center justify-between text-xs sm:text-sm ${statsText} divide-x ${dividerColor}`}>
                        <span className="pr-3">{subject.chapters} Chapters</span>
                        <span className="px-3">{subject.questions.toLocaleString()} Questions</span>
                        <span className="pl-3">{subject.weightage} Weightage</span>
                      </div>

                      {/* Rookie Pass badge on locked cards */}
                      {locked && (
                        <div className="mt-3 flex items-center gap-1.5">
                          <div className="w-3.5 h-3.5 rounded flex items-center justify-center"
                            style={{ background: 'rgba(139,92,246,0.2)' }}>
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                              <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                            </svg>
                          </div>
                          <span className="text-[10px] font-semibold" style={{ color: '#a78bfa' }}>
                            Rookie Pass · ₹299/year
                          </span>
                        </div>
                      )}
                    </div>
                  </motion.article>
                );
              })}
            </div>

          </div>
        </div>
      </motion.main>
    </>
  );
}
