'use client';

import React, { useState, useEffect, useRef } from 'react';
import Image, { StaticImageData } from 'next/image';
import { useRouter } from 'next/navigation';
import { FaChevronDown, FaChevronUp } from 'react-icons/fa';
import { motion } from 'framer-motion';
import imagepath from '../../../public/src/constants/imagepath';

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
    {
      name: 'Physics',
      chapters: 19,
      questions: 1600,
      weightage: '33%',
      badge: '#1 Subject',
      badgeColor: '#00C48C',
      imageKey: 'Physics1',
      color: '#1E90FF',
    },
    {
      name: 'Chemistry',
      chapters: 14,
      questions: 1130,
      weightage: '31%',
      badge: '#3 Subject',
      badgeColor: '#FF4D00',
      imageKey: 'Chemistry1',
      color: '#FFA500',
    },
    {
      name: 'Maths',
      chapters: 16,
      questions: 1270,
      weightage: '37%',
      badge: '#2 Subject',
      badgeColor: '#F59E0B',
      imageKey: 'Maths1',
      color: '#D32F8D',
    },
  ],
  'JEE Advanced': [
    {
      name: 'Physics',
      chapters: 24,
      questions: 893,
      weightage: '33%',
      badge: '#1 Subject',
      badgeColor: '#00C48C',
      imageKey: 'AdvPhysics',
      color: '#1E90FF',
    },
    {
      name: 'Chemistry',
      chapters: 31,
      questions: 1054,
      weightage: '33%',
      badge: '#3 Subject',
      badgeColor: '#FF4D00',
      imageKey: 'AdvChemistry',
      color: '#FFA500',
    },
    {
      name: 'Maths',
      chapters: 26,
      questions: 1775,
      weightage: '34%',
      badge: '#2 Subject',
      badgeColor: '#F59E0B',
      imageKey: 'AdvMaths',
      color: '#D32F8D',
    },
  ],
};

// ─── Skeleton card ─────────────────────────────────────────────────────────────
function SubjectSkeleton({ isDark }: { isDark: boolean }) {
  const sh = isDark ? 'bg-[#1a1a1a]' : 'bg-[#e5e7eb]';
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
  // showSkeleton is only ever set via a single timeout — never toggled twice
  const [showSkeleton, setShowSkeleton] = useState(false);
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

  // Cleanup on unmount
  useEffect(() => () => { if (timerRef.current) clearTimeout(timerRef.current); }, []);

  const handleExamSelect = (name: string) => {
    setShowDropdown(false);
    if (name === selectedExam) return;

    // Show skeleton, then after one smooth 350 ms window swap the exam and hide skeleton
    if (timerRef.current) clearTimeout(timerRef.current);
    setShowSkeleton(true);
    timerRef.current = setTimeout(() => {
      setSelectedExam(name);
      setShowSkeleton(false);
    }, 350);
  };

  const handleSubjectPress = (subject: Subject) => {
    const params = new URLSearchParams({
      examName:     selectedExam,
      subjectName:  subject.name,
      subjectColor: subject.color,
      badge:        subject.badge.split(' ')[0],
      badgeColor:   subject.badgeColor,
      imageKey:     subject.imageKey,
    });
    router.push(`/chapterpage?${params.toString()}`);
  };

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

  const subjects = SUBJECTS[selectedExam] ?? [];

  return (
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

        {/* ── Cards area ─────────────────────────────────────────────────────
            The skeleton and real cards live in the same block.
            We cross-fade purely via CSS opacity (no AnimatePresence toggle,
            no key-remounting, no layout shift) — this eliminates the flicker.
        ────────────────────────────────────────────────────────────────────── */}
        <div className="relative">

          {/* Skeleton — sits on top while showSkeleton is true */}
          <div
            className="space-y-4"
            style={{
              opacity:       showSkeleton ? 1 : 0,
              transition:    'opacity 200ms ease',
              pointerEvents: showSkeleton ? 'auto' : 'none',
              // When hidden, take it out of flow so cards below are clickable
              position:      showSkeleton ? 'relative' : 'absolute',
              top: 0, left: 0, right: 0,
            }}
            aria-hidden={!showSkeleton}
          >
            <SubjectSkeleton isDark={isDark} />
            <SubjectSkeleton isDark={isDark} />
            <SubjectSkeleton isDark={isDark} />
          </div>

          {/* Real cards — fade in when skeleton hides */}
          <div
            className="space-y-4"
            style={{
              opacity:    showSkeleton ? 0 : 1,
              transition: 'opacity 250ms ease',
            }}
          >
            {subjects.map((subject, idx) => (
              <motion.article
                key={`${selectedExam}-${subject.name}`}
                className={`border rounded-2xl overflow-hidden cursor-pointer transition-colors duration-300 ${cardBg}`}
                onClick={() => handleSubjectPress(subject)}
                initial="initial"
                animate="enter"
                whileHover="hover"
                whileTap="tap"
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
                      className="object-cover"
                      sizes="(max-width: 640px) 100vw, 50vw"
                    />
                  )}
                </div>

                {/* Body */}
                <div className="px-4 py-3.5 sm:px-5 sm:py-4">
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
                      whileHover={{ scale: 1.04 }}
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
                </div>
              </motion.article>
            ))}
          </div>

        </div>
      </div>
    </motion.main>
  );
}
