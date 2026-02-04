'use client';

import React, { useState } from 'react';
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
  imageKey: string; // key into imagepath
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
      badgeColor: '#00FFB0',
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
      badgeColor: '#FFD700',
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
      badgeColor: '#00FFB0',
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
      badgeColor: '#FFD700',
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
      badgeColor: '#00FFB0',
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
      badgeColor: '#FFD700',
      imageKey: 'Biology',
      color: '#32CD32',
    },
  ],
};

const containerVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } },
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
    transition: { delay: i * 0.06, duration: 0.36, ease: 'easeOut' },
  }),
  hover: { scale: 1.02, boxShadow: '0 10px 30px rgba(0,0,0,0.35)' },
  tap: { scale: 0.995 },
};

export default function ExplorePage() {
  const [selectedExam, setSelectedExam] = useState<string>(EXAMS[0].name);
  const [showDropdown, setShowDropdown] = useState<boolean>(false);
  const router = useRouter();

  const handleSubjectPress = (subject: Subject) => {
    const params = new URLSearchParams({
      examName: selectedExam,
      subjectName: subject.name,
      subjectColor: subject.color,
      badge: subject.badge.split(' ')[0], // '#1', '#2', ...
      badgeColor: subject.badgeColor,
      imageKey: subject.imageKey,
    });

    router.push(`/chapterpage?${params.toString()}`);
  };

  // helper to safely resolve image import (imagepath might contain URLs or StaticImageData)
  const resolveImage = (key: string): StaticImageData | string | undefined => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (imagepath as any)?.[key];
  };

  return (
    <motion.main
      className="min-h-screen bg-[#000] text-white pb-10 px-4 sm:px-6"
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      layout
    >
      <div className="max-w-4xl mx-auto pt-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-3 relative">
          <h1
            className="text-white text-3xl sm:text-4xl font-medium tracking-wide"
            style={{ fontFamily: 'Geist, sans-serif' }}
          >
            Practice
          </h1>

          <div className="relative">
            <motion.button
              onClick={() => setShowDropdown((s) => !s)}
              className="flex items-center bg-black border border-[#262626] rounded-full px-4 py-2 text-sm sm:text-base"
              whileTap={{ scale: 0.98 }}
              aria-expanded={showDropdown}
              aria-haspopup="listbox"
              type="button"
            >
              <span
                className="text-white font-medium"
                style={{ fontFamily: 'Geist, sans-serif' }}
              >
                {selectedExam}
              </span>
              <span className="ml-2 text-white">
                {showDropdown ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
              </span>
            </motion.button>

            {showDropdown && (
              <motion.ul
                className="absolute right-0 mt-2 w-40 bg-black border border-[#22223A] rounded-lg shadow-lg z-50 overflow-hidden"
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
                      className="w-full text-left px-4 py-3 text-sm text-white hover:bg-[#0f1724]"
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

        {/* Subject Cards */}
        <div className="space-y-5 mt-2">
          {SUBJECTS[selectedExam]?.map((subject, idx) => (
            <motion.article
              key={subject.name}
              className="bg-black border border-[#262626] rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow cursor-pointer"
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
                if (e.key === 'Enter' || e.key === ' ') {
                  handleSubjectPress(subject);
                }
              }}
            >
              <div className="relative w-full h-20 sm:h-28 md:h-32 bg-[#222]">
                {resolveImage(subject.imageKey) ? (
                  <Image
                    src={resolveImage(subject.imageKey) as StaticImageData | string}
                    alt={subject.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
                  />
                ) : null}
              </div>

              <div className="p-4 sm:p-5">
                <div className="flex items-center justify-between mb-2">
                  <h2
                    className="text-white text-lg sm:text-xl font-medium"
                    style={{ fontFamily: 'Geist, sans-serif' }}
                  >
                    {subject.name}
                  </h2>

                  <motion.div
                    className="rounded-lg px-3 py-1 bg-[#18183A] border inline-flex items-center"
                    style={{ borderColor: subject.badgeColor }}
                    whileHover={{ scale: 1.03 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 18 }}
                  >
                    <span
                      className="text-sm font-medium"
                      style={{ color: subject.badgeColor, fontFamily: 'Geist, sans-serif' }}
                    >
                      {subject.badge}
                    </span>
                  </motion.div>
                </div>

                <div className="flex items-center justify-between text-gray-300 text-xs sm:text-sm">
                  <span>{subject.chapters} Chapters</span>
                  <span>{subject.questions.toLocaleString()} Questions</span>
                  <span>{subject.weightage} Weightage</span>
                </div>
              </div>
            </motion.article>
          ))}
        </div>
      </div>
    </motion.main>
  );
}