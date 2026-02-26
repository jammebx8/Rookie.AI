'use client';

import React, { useState, useEffect } from 'react';
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

const EXAMS = [{ name: 'JEE Main' }, { name: 'JEE Adv.' }, { name: 'NEET' }];

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
  'JEE Adv.': [
    {
      name: 'Physics',
      chapters: 19,
      questions: 1520,
      weightage: '33%',
      badge: '#1 Subject',
      badgeColor: '#00C48C',
      imageKey: 'Physics',
      color: '#1E90FF',
    },
    {
      name: 'Chemistry',
      chapters: 14,
      questions: 1120,
      weightage: '34%',
      badge: '#3 Subject',
      badgeColor: '#FF4D00',
      imageKey: 'Chemistry',
      color: '#FFA500',
    },
    {
      name: 'Maths',
      chapters: 16,
      questions: 1270,
      weightage: '33%',
      badge: '#2 Subject',
      badgeColor: '#F59E0B',
      imageKey: 'Maths',
      color: '#D32F8D',
    },
  ],
  NEET: [
    {
      name: 'Physics',
      chapters: 28,
      questions: 4100,
      weightage: '34%',
      badge: '#1 Subject',
      badgeColor: '#00C48C',
      imageKey: 'Physics3',
      color: '#1E90FF',
    },
    {
      name: 'Chemistry',
      chapters: 30,
      questions: 3900,
      weightage: '34%',
      badge: '#3 Subject',
      badgeColor: '#FF4D00',
      imageKey: 'Chemistry3',
      color: '#FFA500',
    },
    {
      name: 'Biology',
      chapters: 45,
      questions: 7300,
      weightage: '34%',
      badge: '#2 Subject',
      badgeColor: '#F59E0B',
      imageKey: 'Biology',
      color: '#32CD32',
    },
  ],
};

const containerVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const dropdownVariants = {
  hidden: { opacity: 0, y: -6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.18 } },
};

const cardVariants = {
  initial: { opacity: 0, y: 8 },
  enter: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.36 },
  }),
  hover: { scale: 1.015, boxShadow: '0 8px 28px rgba(0,0,0,0.12)' },
  tap: { scale: 0.995 },
};

export default function ExplorePage() {
  const [selectedExam, setSelectedExam] = useState<string>(EXAMS[0].name);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const [isDark, setIsDark] = useState(true);
  const router = useRouter();

  // Read theme from localStorage (set by layout)
  useEffect(() => {
    const updateTheme = () => {
      const stored = localStorage.getItem('theme');
      setIsDark(stored !== 'light');
    };
    updateTheme();

    // Listen for storage events from other tabs / layout toggle
    window.addEventListener('storage', updateTheme);

    // Also watch for DOM class changes (when layout toggles on same page)
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });

    return () => {
      window.removeEventListener('storage', updateTheme);
      observer.disconnect();
    };
  }, []);

  const handleSubjectPress = (subject: Subject) => {
    const params = new URLSearchParams({
      examName: selectedExam,
      subjectName: subject.name,
      subjectColor: subject.color,
      badge: subject.badge.split(' ')[0],
      badgeColor: subject.badgeColor,
      imageKey: subject.imageKey,
    });
    router.push(`/chapterpage?${params.toString()}`);
  };

  const resolveImage = (key: string): StaticImageData | string | undefined => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (imagepath as any)?.[key];
  };

  // Theme-derived classes
  const pageBg = isDark ? 'bg-[#000]' : 'bg-[#F8F9FF]';
  const textPrimary = isDark ? 'text-white' : 'text-[#111827]';
  const textMuted = isDark ? 'text-gray-400' : 'text-gray-500';
  const cardBg = isDark ? 'bg-black border-[#262626]' : 'bg-white border-[#E5E7EB]';
  const dropdownBg = isDark ? 'bg-black border-[#262626]' : 'bg-white border-[#E5E7EB]';
  const dropdownItemHover = isDark ? 'hover:bg-[#0f1724]' : 'hover:bg-gray-50';
  const btnBg = isDark
    ? 'bg-black border-[#262626] text-white'
    : 'bg-white border-[#D1D5DB] text-[#111827]';
  const badgeBg = isDark ? 'bg-[#18183A]' : 'bg-[#F5F3FF]';
  const statsText = isDark ? 'text-gray-300' : 'text-gray-500';
  const dividerColor = isDark ? 'divide-[#262626]' : 'divide-[#F3F4F6]';
  const imagePlaceholder = isDark ? 'bg-[#111]' : 'bg-[#F0F0F5]';

  return (
    <motion.main
      className={`min-h-screen ${pageBg} ${textPrimary} pb-10 px-4 sm:px-6 transition-colors duration-300`}
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      layout
    >
      <div className="max-w-2xl mx-auto pt-6">

        {/* ─── Header ──────────────────────────────── */}
        <div className="flex items-center justify-between mb-5 relative">
          <h1
            className={`text-2xl sm:text-3xl font-semibold tracking-tight ${textPrimary}`}
            style={{ fontFamily: 'Geist, sans-serif' }}
          >
            Practice
          </h1>

          {/* Exam Selector Dropdown */}
          <div className="relative">
            <motion.button
              onClick={() => setShowDropdown((s) => !s)}
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
                className={`absolute right-0 mt-2 w-40 border rounded-xl shadow-xl z-50 overflow-hidden ${dropdownBg}`}
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={dropdownVariants}
                role="listbox"
              >
                {EXAMS.map((exam) => (
                  <li key={exam.name} role="option">
                    <button
                      onClick={() => {
                        setSelectedExam(exam.name);
                        setShowDropdown(false);
                      }}
                      className={`w-full text-left px-4 py-2.5 text-sm ${textPrimary} ${dropdownItemHover} transition-colors`}
                      style={{ fontFamily: 'Geist, sans-serif' }}
                      type="button"
                    >
                      {exam.name}
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </div>
        </div>

        {/* ─── Subject Cards ────────────────────────── */}
        <div className="space-y-4">
          {SUBJECTS[selectedExam]?.map((subject, idx) => (
            <motion.article
              key={subject.name}
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
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') handleSubjectPress(subject);
              }}
            >
              {/* Image banner */}
              <div className={`relative w-full h-24 sm:h-32 ${imagePlaceholder}`}>
                {resolveImage(subject.imageKey) ? (
                  <Image
                    src={resolveImage(subject.imageKey) as StaticImageData | string}
                    alt={subject.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, 50vw"
                  />
                ) : null}
           
              </div>

              {/* Card body */}
              <div className="px-4 py-3.5 sm:px-5 sm:py-4">
                <div className="flex items-center justify-between mb-2.5">
                  <h2
                    className={`text-base sm:text-lg font-semibold ${textPrimary}`}
                    style={{ fontFamily: 'Geist, sans-serif' }}
                  >
                    {subject.name}
                  </h2>

                  {/* Badge */}
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

                {/* Stats row */}
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
    </motion.main>
  );
}