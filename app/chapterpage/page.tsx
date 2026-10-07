'use client';

import React, { Suspense } from 'react';
import Image, { StaticImageData } from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiChevronLeft, FiInfo } from 'react-icons/fi';
import imagepath from '../../public/src/constants/imagepath';

interface Chapter {
  title: string;
  questions: number;
}

interface ChaptersData {
  [exam: string]: { [subject: string]: Chapter[] };
}

const chaptersData: ChaptersData = {
  // ──────────────────────────────────────────────────────────────
  // JEE MAIN  (chapters match `chapter` column in jee_mains table)
  // ──────────────────────────────────────────────────────────────
  'JEE Main': {
    Physics: [
      { title: 'Units & Measurements',           questions: 230 },
      { title: 'Vector Algebra',                  questions: 39  },
      { title: 'Motion in a Straight Line',       questions: 123 },
      { title: 'Motion in a Plane',               questions: 93  },
      { title: 'Circular Motion',                 questions: 75  },
      { title: 'Laws of Motion',                  questions: 153 },
      { title: 'Work Power & Energy',             questions: 155 },
      { title: 'Center of Mass and Collision',    questions: 134 },
      { title: 'Rotational Motion',               questions: 262 },
      { title: 'Properties of Matter',            questions: 313 },
      { title: 'Heat and Thermodynamics',         questions: 486 },
      { title: 'Simple Harmonic Motion',          questions: 181 },
      { title: 'Waves',                           questions: 154 },
      { title: 'Gravitation',                     questions: 210 },
      { title: 'Electrostatics',                  questions: 280 },
      { title: 'Current Electricity',             questions: 379 },
      { title: 'Capacitor',                       questions: 169 },
      { title: 'Magnetic Effect of Current',      questions: 241 },
      { title: 'Magnetic Properties of Matter',   questions: 76  },
      { title: 'Electromagnetic Induction',       questions: 153 },
      { title: 'Alternating Current',             questions: 191 },
      { title: 'Electromagnetic Waves',           questions: 168 },
      { title: 'Wave Optics',                     questions: 179 },
      { title: 'Geometrical Optics',              questions: 272 },
      { title: 'Atoms and Nuclei',                questions: 300 },
      { title: 'Dual Nature of Radiation',        questions: 209 },
      { title: 'Semiconductor',                   questions: 246 },
      { title: 'Communication Systems',           questions: 101 },
    ],
    Chemistry: [
      { title: 'Some Basic Concepts of Chemistry',           questions: 245 },
      { title: 'Structure of Atom',                          questions: 220 },
      { title: 'Redox Reactions',                            questions: 74  },
      { title: 'Chemical Equilibrium',                       questions: 122 },
      { title: 'Ionic Equilibrium',                          questions: 143 },
      { title: 'Solutions',                                  questions: 195 },
      { title: 'Thermodynamics',                             questions: 233 },
      { title: 'Electrochemistry',                           questions: 226 },
      { title: 'Chemical Kinetics and Nuclear Chemistry',    questions: 224 },
      { title: 'Gaseous State',                              questions: 66  },
      { title: 'Solid State',                                questions: 69  },
      { title: 'Surface Chemistry',                          questions: 116 },
      { title: 'Periodic Table & Periodicity',               questions: 179 },
      { title: 'Chemical Bonding & Molecular Structure',     questions: 266 },
      { title: 'p-Block Elements',                           questions: 275 },
      { title: 'd and f Block Elements',                     questions: 243 },
      { title: 'Coordination Compounds',                     questions: 354 },
      { title: 'Isolation of Elements',                      questions: 112 },
      { title: 'Salt Analysis',                              questions: 43  },
      { title: 's-Block Elements',                           questions: 123 },
      { title: 'Hydrogen',                                   questions: 87  },
      { title: 'Basics of Organic Chemistry',                questions: 295 },
      { title: 'Hydrocarbons',                               questions: 172 },
      { title: 'Haloalkanes and Haloarenes',                 questions: 189 },
      { title: 'Alcohols, Phenols and Ethers',               questions: 182 },
      { title: 'Aldehydes, Ketones and Carboxylic Acids',    questions: 282 },
      { title: 'Compounds Containing Nitrogen',              questions: 253 },
      { title: 'Biomolecules',                               questions: 200 },
      { title: 'Polymers',                                   questions: 79  },
      { title: 'Chemistry in Everyday Life',                 questions: 78  },
      { title: 'Environmental Chemistry',                    questions: 96  },
      { title: 'Practical Organic Chemistry',                questions: 114 },
    ],
    Maths: [
      { title: 'Sets and Relations',                         questions: 120 },
      { title: 'Logarithm',                                  questions: 11  },
      { title: 'Quadratic Equation and Inequalities',        questions: 198 },
      { title: 'Sequences and Series',                       questions: 309 },
      { title: 'Binomial Theorem',                           questions: 252 },
      { title: 'Matrices and Determinants',                  questions: 375 },
      { title: 'Permutations and Combinations',              questions: 220 },
      { title: 'Probability',                                questions: 235 },
      { title: 'Vector Algebra',                             questions: 282 },
      { title: '3D Geometry',                                questions: 390 },
      { title: 'Complex Numbers',                            questions: 206 },
      { title: 'Statistics',                                 questions: 150 },
      { title: 'Trigonometric Ratio and Identites',          questions: 69  },
      { title: 'Trigonometric Equations',                    questions: 62  },
      { title: 'Inverse Trigonometric Functions',            questions: 97  },
      { title: 'Straight Lines and Pair of Straight Lines',  questions: 179 },
      { title: 'Circle',                                     questions: 31  },
      { title: 'Parabola',                                   questions: 151 },
      { title: 'Ellipse',                                    questions: 117 },
      { title: 'Hyperbola',                                  questions: 98  },
      { title: 'Functions',                                  questions: 174 },
      { title: 'Limits, Continuity and Differentiability',   questions: 278 },
      { title: 'Differentiation',                            questions: 83  },
      { title: 'Application of Derivatives',                 questions: 234 },
      { title: 'Definite Integration',                       questions: 331 },
      { title: 'Area Under The Curves',                      questions: 170 },
      { title: 'Differential Equations',                     questions: 246 },
      { title: 'Mathematical Reasoning',                     questions: 122 },
      { title: 'Height and Distance',                        questions: 41  },
      { title: 'Properties of Triangle',                     questions: 38  },
    ],
  },

  // ──────────────────────────────────────────────────────────────
  // JEE ADVANCED  (chapters match `chapter` column in jee_adv)
  // ──────────────────────────────────────────────────────────────
  'JEE Advanced': {
    Physics: [
      { title: 'Alternating Current',        questions: 17  },
      { title: 'Atoms and Nuclei',           questions: 50  },
      { title: 'Capacitor',                  questions: 21  },
      { title: 'Current Electricity',        questions: 35  },
      { title: 'Dual Nature of Radiation',   questions: 28  },
      { title: 'Electromagnetic Induction',  questions: 22  },
      { title: 'Electromagnetic Waves',      questions: 7   },
      { title: 'Electrostatics',             questions: 67  },
      { title: 'Geometrical Optics',         questions: 67  },
      { title: 'Gravitation',                questions: 24  },
      { title: 'Heat and Thermodynamics',    questions: 73  },
      { title: 'Impulse & Momentum',         questions: 16  },
      { title: 'Laws of Motion',             questions: 37  },
      { title: 'Magnetism',                  questions: 46  },
      { title: 'Motion',                     questions: 29  },
      { title: 'Motion in a Plane',          questions: 1   },
      { title: 'Practical Physics',          questions: 1   },
      { title: 'Properties of Matter',       questions: 48  },
      { title: 'Rotational Motion',          questions: 66  },
      { title: 'Simple Harmonic Motion',     questions: 27  },
      { title: 'Units & Measurements',       questions: 63  },
      { title: 'Wave Optics',                questions: 20  },
      { title: 'Waves',                      questions: 38  },
      { title: 'Work Power & Energy',        questions: 37  },
    ],
    Chemistry: [
      { title: 'Alcohols, Phenols and Ethers',                questions: 27  },
      { title: 'Aldehydes, Ketones and Carboxylic Acids',     questions: 67  },
      { title: 'Basics of Organic Chemistry',                 questions: 50  },
      { title: 'Biomolecules',                                questions: 24  },
      { title: 'Chemical Bonding & Molecular Structure',      questions: 106 },
      { title: 'Chemical Equilibrium',                        questions: 12  },
      { title: 'Chemical Kinetics and Nuclear Chemistry',     questions: 50  },
      { title: 'Chemistry in Everyday Life',                  questions: 1   },
      { title: 'Compounds Containing Nitrogen',               questions: 36  },
      { title: 'Coordination Compounds',                      questions: 57  },
      { title: 'd and f Block Elements',                      questions: 25  },
      { title: 'Electrochemistry',                            questions: 58  },
      { title: 'Gaseous State',                               questions: 43  },
      { title: 'Haloalkanes and Haloarenes',                  questions: 8   },
      { title: 'Hydrocarbons',                                questions: 33  },
      { title: 'Hydrogen',                                    questions: 5   },
      { title: 'Ionic Equilibrium',                           questions: 19  },
      { title: 'Isolation of Elements',                       questions: 24  },
      { title: 'p-Block Elements',                            questions: 68  },
      { title: 'Periodic Table & Periodicity',                questions: 36  },
      { title: 'Polymers',                                    questions: 10  },
      { title: 'Practical Organic Chemistry',                 questions: 6   },
      { title: 'Redox Reactions',                             questions: 37  },
      { title: 'Salt Analysis',                               questions: 18  },
      { title: 's-Block Elements',                            questions: 44  },
      { title: 'Solid State',                                 questions: 21  },
      { title: 'Solutions',                                   questions: 41  },
      { title: 'Some Basic Concepts of Chemistry',            questions: 81  },
      { title: 'Structure of Atom',                           questions: 102 },
      { title: 'Surface Chemistry',                           questions: 17  },
      { title: 'Thermodynamics',                              questions: 44  },
    ],
    Maths: [
      { title: '3D Geometry',                                    questions: 63  },
      { title: 'Application of Derivatives',                     questions: 124 },
      { title: 'Application of Integration',                     questions: 63  },
      { title: 'Circle',                                         questions: 98  },
      { title: 'Complex Numbers',                                questions: 105 },
      { title: 'Definite Integration',                           questions: 110 },
      { title: 'Differential Equations',                         questions: 45  },
      { title: 'Differentiation',                                questions: 38  },
      { title: 'Ellipse',                                        questions: 45  },
      { title: 'Functions',                                      questions: 33  },
      { title: 'Hyperbola',                                      questions: 29  },
      { title: 'Indefinite Integrals',                           questions: 22  },
      { title: 'Inverse Trigonometric Functions',                questions: 30  },
      { title: 'Limits, Continuity and Differentiability',       questions: 61  },
      { title: 'Mathematical Induction and Binomial Theorem',    questions: 54  },
      { title: 'Matrices and Determinants',                      questions: 58  },
      { title: 'Parabola',                                       questions: 62  },
      { title: 'Permutations and Combinations',                  questions: 55  },
      { title: 'Probability',                                    questions: 135 },
      { title: 'Properties of Triangle',                        questions: 78  },
      { title: 'Quadratic Equation and Inequalities',            questions: 105 },
      { title: 'Sequences and Series',                           questions: 73  },
      { title: 'Statistics',                                     questions: 3   },
      { title: 'Straight Lines and Pair of Straight Lines',      questions: 87  },
      { title: 'Trigonometric Functions & Equations',            questions: 100 },
      { title: 'Vector Algebra',                                 questions: 115 },
    ],
  },
};

// ── Animation variants ────────────────────────────────────────────────────────

const containerVariants = {
  hidden:  { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const headerVariants = {
  hidden:  { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const chapterCardVariants = {
  hidden:  { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.04, duration: 0.35 },
  }),
  hover:   { scale: 1.02, x: 4, transition: { duration: 0.15 } },
  tap:     { scale: 0.98 },
};

const buttonVariants = {
  rest:  { scale: 1 },
  hover: { scale: 1.05, transition: { duration: 0.15 } },
  tap:   { scale: 0.95 },
};

// ── Page content ──────────────────────────────────────────────────────────────

function ChapterPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const examName    = searchParams.get('examName')    || 'JEE Main';
  const subjectName = searchParams.get('subjectName') || 'Physics';
  const badge       = searchParams.get('badge')       || '#1';
  const badgeColor  = searchParams.get('badgeColor')  || '#00FFB0';
  const imageKey    = searchParams.get('imageKey')    || 'Physics1';

  const resolveImage = (key: string): StaticImageData | string | undefined =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (imagepath as any)?.[key];

  const subjectImage   = resolveImage(imageKey);
  const chapterList    = chaptersData[examName]?.[subjectName] ?? [];
  const totalQuestions = chapterList.reduce((sum, ch) => sum + ch.questions, 0);

  const handleChapterPress = (chapter: Chapter, index: number) => {
    // Pass examName so QuestionViewerClient can pick the right DB table
    const params = new URLSearchParams({
      subject:      subjectName.toLowerCase(),
      chapter:      chapter.title,
      imageKey,
      examName,
      chapterIndex: String(index),
      index:        '0',
    }).toString();
    router.push(`/QuestionViewer?${params}`);
  };

  return (
    <div className="min-h-screen bg-[#181C29] text-white">
      <motion.div initial="hidden" animate="visible" variants={containerVariants} className="pb-20">

        {/* Header */}
        <motion.div
          variants={headerVariants}
          className="relative w-full h-36 sm:h-44 md:h-52 bg-[#0B0B28] overflow-hidden"
        >
          {subjectImage && (
            <div className="absolute inset-0">
              <Image
                src={subjectImage as StaticImageData | string}
                alt={subjectName}
                fill
                className="object-cover opacity-50"
                priority
                sizes="100vw"
              />
            </div>
          )}

          <div className="relative h-full flex flex-col justify-between p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <motion.button
                variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
                onClick={() => router.push('/explore')}
                className="flex items-center gap-1 text-white opacity-85"
              >
                <FiChevronLeft size={28} />
                <span className="text-base sm:text-lg font-medium">Back</span>
              </motion.button>
              <motion.button
                variants={buttonVariants} initial="rest" whileHover="hover" whileTap="tap"
                className="flex items-center gap-1 text-white opacity-85"
              >
                <FiInfo size={18} />
                <span className="text-sm sm:text-base">Info</span>
              </motion.button>
            </div>

            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium text-white">{subjectName}</h1>
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#0B0B28]/70 border"
                style={{ borderColor: badgeColor }}
              >
                <span className="text-xs sm:text-sm font-medium" style={{ color: badgeColor }}>
                  {badge} Subject
                </span>
              </motion.div>
            </div>

            <div className="flex items-center justify-center gap-2 sm:gap-3 text-white/70 text-xs sm:text-sm">
              <span>{chapterList.length} Chapters</span>
              <span className="opacity-50">•</span>
              <span>{totalQuestions.toLocaleString()} Questions</span>
              <span className="opacity-50">•</span>
              <span>{examName}</span>
            </div>
          </div>
        </motion.div>

        {/* Chapter list */}
        <div className="px-4 sm:px-6 mt-6 sm:mt-8">
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-medium text-white">Chapters</h2>
          </div>

          {chapterList.length === 0 ? (
            <p className="text-center text-gray-500 py-16 text-sm">
              No chapters found for {subjectName} — {examName}.
            </p>
          ) : (
            <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto">
              {chapterList.map((chapter, index) => (
                <motion.button
                  key={chapter.title}
                  custom={index}
                  variants={chapterCardVariants}
                  initial="hidden"
                  animate="visible"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => handleChapterPress(chapter, index)}
                  className="relative w-full bg-black border border-[#262626] rounded-2xl p-4 sm:p-5 pl-16 sm:pl-20 text-left group"
                >
                  <motion.div
                    whileHover={{ scale: 1.1, rotate: 5 }}
                    transition={{ type: 'spring', stiffness: 300 }}
                    className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-[#444] bg-black flex items-center justify-center"
                  >
                    <span className="text-sm sm:text-base font-medium text-white">
                      {String(index + 1).padStart(2, '0')}
                    </span>
                  </motion.div>

                  <div className="flex flex-col gap-1.5">
                    <h3 className="text-base sm:text-lg font-medium text-white group-hover:text-white/90 transition-colors line-clamp-2">
                      {chapter.title}
                    </h3>
                    <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-400">
                      <span>{chapter.questions} Questions</span>
                      <span className="opacity-50">•</span>
                      <span>{examName}</span>
                    </div>
                  </div>

                  <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                      <path d="M9 18l6-6-6-6" />
                    </svg>
                  </div>
                </motion.button>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}

export default function ChapterPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#181C29] flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
      </div>
    }>
      <ChapterPageContent />
    </Suspense>
  );
}
