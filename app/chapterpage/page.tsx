'use client';

import React, { Suspense } from 'react';
import Image, { StaticImageData } from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { FiChevronLeft, FiInfo, FiFilter } from 'react-icons/fi';
import imagepath from '../../public/src/constants/imagepath';

// Types
interface Chapter {
  title: string;
  questions: number;
}

interface ChaptersData {
  [exam: string]: {
    [subject: string]: Chapter[];
  };
}

// Chapters Data
const chaptersData: ChaptersData = {
  'JEE Main': {
    Physics: [
      { title: 'Units and Measurements.', questions: 100 },
      { title: 'Kinematics.', questions: 70 },
      { title: 'Laws of Motion.', questions: 90 },
      { title: 'Work, Energy, and Power.', questions: 80 },
      { title: 'Rotational Motion.', questions: 110 },
      { title: 'Gravitation.', questions: 70 },
      { title: 'Properties of Solids and Liquids.', questions: 80 },
      { title: 'Thermodynamics.', questions: 90 },
      { title: 'Behaviour of Perfect Gas and Kinetic Theory.', questions: 90 },
      { title: 'Oscillations and Waves.', questions: 90 },
      { title: 'Electrostatics.', questions: 80 },
      { title: 'Current Electricity.', questions: 90 },
      { title: 'Magnetic Effects of Current and Magnetism.', questions: 80 },
      { title: 'Electromagnetic Induction and Alternating Currents.', questions: 80 },
      { title: 'Electromagnetic Waves.', questions: 90 },
      { title: 'Optics.', questions: 90 },
      { title: 'Dual Nature of Matter and Radiation.', questions: 70 },
      { title: 'Atoms and Nuclei.', questions: 80 },
      { title: 'Semiconductors', questions: 70 },
    ],
    Chemistry: [
      { title: 'Some Basic Concepts of Chemistry.', questions: 90 },
      { title: 'Structure of Atom.', questions: 80 },
      { title: 'Classification of Elements and Periodicity in Properties.', questions: 80 },
      { title: 'Chemical Bonding and Molecular Structure.', questions: 90 },
      { title: 'Thermodynamics..', questions: 100 },
      { title: 'Equilibrium.', questions: 80 },
      { title: 'Redox Reactions.', questions: 60 },
      { title: 'p-Block Elements.', questions: 80 },
      { title: 'Organic Chemistry – Some Basic Principles and Techniques.', questions: 80 },
      { title: 'Hydrocarbons.', questions: 70 },
      { title: 'Coordination Compounds.', questions: 80 },
      { title: 'Haloalkanes and Haloarenes.', questions: 80 },
      { title: 'Aldehydes, Ketones and Carboxylic Acids.', questions: 80 },
      { title: 'Biomolecules.', questions: 80 },
    ],
    Maths: [
      { title: 'Sets, Relations, and Functions.', questions: 80 },
      { title: 'Quadratic Equations.', questions: 70 },
      { title: 'Complex Numbers.', questions: 80 },
      { title: 'Matrices and Determinants.', questions: 80 },
      { title: 'Permutations and Combinations.', questions: 80 },
      { title: 'Binomial Theorem and its Simple Applications.', questions: 80 },
      { title: 'Sequences and Series.', questions: 80 },
      { title: 'Limit, Continuity, and Differentiability.', questions: 80 },
      { title: 'Integral Calculus.', questions: 80 },
      { title: 'Differential Equations.', questions: 80 },
      { title: 'Coordinate Geometry.', questions: 80 },
      { title: 'Three Dimensional Geometry.', questions: 80 },
      { title: 'Vector Algebra.', questions: 80 },
      { title: 'Trigonometry.', questions: 80 },
      { title: 'Probability.', questions: 80 },
      { title: 'Statistics.', questions: 80 },
    ],
  },
  'JEE Adv.': {
    Physics: [
      { title: 'Units and Measurements', questions: 80 },
      { title: 'Kinematics', questions: 80 },
      { title: 'Laws of Motion', questions: 80 },
      { title: 'Work, Energy, and Power', questions: 80 },
      { title: 'Rotational Motion', questions: 80 },
      { title: 'Gravitation', questions: 80 },
      { title: 'Properties of Solids and Liquids', questions: 80 },
      { title: 'Thermodynamics', questions: 80 },
      { title: 'Behaviour of Perfect Gas and Kinetic Theory', questions: 80 },
      { title: 'Oscillations and Waves', questions: 80 },
      { title: 'Electrostatics', questions: 80 },
      { title: 'Current Electricity', questions: 80 },
      { title: 'Magnetic Effects of Current and Magnetism', questions: 80 },
      { title: 'Electromagnetic Induction and Alternating Currents', questions: 80 },
      { title: 'Electromagnetic Waves', questions: 80 },
      { title: 'Optics', questions: 80 },
      { title: 'Dual Nature of Matter and Radiation', questions: 80 },
      { title: 'Atoms and Nuclei', questions: 80 },
      { title: 'Semiconductors', questions: 80 },
    ],
    Chemistry: [
      { title: 'Some Basic Concepts of Chemistry', questions: 80 },
      { title: 'Structure of Atom', questions: 80 },
      { title: 'Classification of Elements and Periodicity in Properties', questions: 80 },
      { title: 'Chemical Bonding and Molecular Structure', questions: 80 },
      { title: 'Thermodynamics', questions: 80 },
      { title: 'Equilibrium', questions: 80 },
      { title: 'Redox Reactions', questions: 80 },
      { title: 'p-Block Elements', questions: 80 },
      { title: 'Organic Chemistry – Some Basic Principles and Techniques', questions: 80 },
      { title: 'Hydrocarbons', questions: 80 },
      { title: 'Coordination Compounds', questions: 80 },
      { title: 'Haloalkanes and Haloarenes', questions: 80 },
      { title: 'Aldehydes, Ketones and Carboxylic Acids', questions: 80 },
      { title: 'Biomolecules', questions: 80 },
    ],
    Maths: [
      { title: 'Sets, Relations, and Functions', questions: 80 },
      { title: 'Quadratic Equations', questions: 80 },
      { title: 'Complex Numbers', questions: 80 },
      { title: 'Matrices and Determinants', questions: 80 },
      { title: 'Permutations and Combinations', questions: 80 },
      { title: 'Binomial Theorem and its Simple Applications', questions: 80 },
      { title: 'Sequences and Series', questions: 80 },
      { title: 'Limit, Continuity, and Differentiability', questions: 80 },
      { title: 'Integral Calculus', questions: 80 },
      { title: 'Differential Equations', questions: 80 },
      { title: 'Coordinate Geometry', questions: 80 },
      { title: 'Three Dimensional Geometry', questions: 80 },
      { title: 'Vector Algebra', questions: 80 },
      { title: 'Trigonometry', questions: 80 },
      { title: 'Probability', questions: 80 },
      { title: 'Statistics', questions: 80 },
    ],
  },
  NEET: {
    Physics: [
      { title: 'Units and Measurements', questions: 100 },
      { title: 'Kinematics', questions: 70 },
      { title: 'Laws of Motion', questions: 90 },
      { title: 'Work, Energy, and Power', questions: 80 },
      { title: 'Rotational Motion', questions: 110 },
      { title: 'Gravitation', questions: 70 },
      { title: 'Properties of Solids and Liquids', questions: 80 },
      { title: 'Thermodynamics', questions: 90 },
      { title: 'Behaviour of Perfect Gas and Kinetic Theory', questions: 90 },
      { title: 'Oscillations and Waves', questions: 90 },
      { title: 'Electrostatics', questions: 80 },
      { title: 'Current Electricity', questions: 90 },
      { title: 'Magnetic Effects of Current and Magnetism', questions: 80 },
      { title: 'Electromagnetic Induction and Alternating Currents', questions: 80 },
      { title: 'Electromagnetic Waves', questions: 90 },
      { title: 'Optics', questions: 90 },
      { title: 'Dual Nature of Matter and Radiation', questions: 70 },
      { title: 'Atoms and Nuclei', questions: 80 },
      { title: 'Semiconductors', questions: 70 },
    ],
    Chemistry: [
      { title: 'Some Basic Concepts of Chemistry', questions: 90 },
      { title: 'Structure of Atom', questions: 80 },
      { title: 'Classification of Elements and Periodicity in Properties', questions: 210 },
      { title: 'Chemical Bonding and Molecular Structure', questions: 220 },
      { title: 'Thermodynamics', questions: 200 },
      { title: 'Equilibrium', questions: 220 },
      { title: 'Redox Reactions', questions: 210 },
      { title: 'p-Block Elements', questions: 210 },
      { title: 'Organic Chemistry – Some Basic Principles and Techniques', questions: 200 },
      { title: 'Hydrocarbons', questions: 210 },
      { title: 'Coordination Compounds', questions: 210 },
      { title: 'Haloalkanes and Haloarenes', questions: 180 },
      { title: 'Aldehydes, Ketones and Carboxylic Acids', questions: 200 },
      { title: 'Biomolecules', questions: 190 },
    ],
    Biology: [
      { title: 'Diversity of Living Organisms', questions: 240 },
      { title: 'Structural Organisation in Animals and Plants', questions: 230 },
      { title: 'Cell Structure and Function', questions: 290 },
      { title: 'Plant Physiology', questions: 280 },
      { title: 'Human Physiology', questions: 310 },
      { title: 'Reproduction', questions: 290 },
      { title: 'Genetics and Evolution', questions: 310 },
      { title: 'Biology and Human Welfare', questions: 230 },
      { title: 'Biotechnology and Its Applications', questions: 250 },
      { title: 'Ecology and Environment', questions: 260 },
    ],
  },
};

// Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      
    },
  },
};

const chapterCardVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: {
      delay: i * 0.05,
      duration: 0.4,
      
    },
  }),
  hover: {
    scale: 1.02,
    x: 4,
    transition: {
      duration: 0.2,
     
    },
  },
  tap: { scale: 0.98 },
};

const buttonVariants = {
  rest: { scale: 1 },
  hover: {
    scale: 1.05,
    transition: {
      duration: 0.2,
      
    },
  },
  tap: { scale: 0.95 },
};

function ChapterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get URL parameters
  const examName = searchParams.get('examName') || 'JEE Main';
  const subjectName = searchParams.get('subjectName') || 'Physics';
  const subjectColor = searchParams.get('subjectColor') || '#1E90FF';
  const badge = searchParams.get('badge') || '#1';
  const badgeColor = searchParams.get('badgeColor') || '#00FFB0';
  const imageKey = searchParams.get('imageKey') || 'Physics1';

  // Helper to safely resolve image from imagepath
  const resolveImage = (key: string): StaticImageData | string | undefined => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return (imagepath as any)?.[key];
  };

  // Get the actual image for this subject
  const subjectImage = resolveImage(imageKey);

  // Get chapters for the selected exam and subject
  const chapterList = chaptersData[examName]?.[subjectName] || [];
  const totalQuestions = chapterList.reduce((sum, ch) => sum + ch.questions, 0);

  const handleBackPress = () => {
    router.push('/explore');
  };

  const handleChapterPress = (chapter: Chapter, index: number) => {
    // Navigate to QuestionViewer page and pass required params.
    // The QuestionViewer route should read these query params and load questionsData[chapterTitle]
    const params = new URLSearchParams({
      chapterTitle: chapter.title,
      subjectName,
      imageKey,
      examName,
      chapterIndex: String(index),
    }).toString();

    router.push(`/QuestionViewer?${params}`);
  };

  return (
    <div className="min-h-screen bg-[#181C29] text-white">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="pb-20"
      >
        {/* Header with Background Image */}
        <motion.div
          variants={headerVariants}
          className="relative w-full h-36 sm:h-44 md:h-52 bg-[#0B0B28] overflow-hidden"
        >
          {/* Background Image */}
          {subjectImage && (
            <div className="absolute inset-0">
              <Image
                src={subjectImage as StaticImageData | string}
                alt={subjectName}
                fill
                className="object-cover opacity-50"
                priority
                sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
              />
            </div>
          )}

          {/* Header Content */}
          <div className="relative h-full flex flex-col justify-between p-4 sm:p-6">
            {/* Top Row - Back and Info */}
            <div className="flex items-center justify-between ">
              <motion.button
                variants={buttonVariants}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                onClick={handleBackPress}
                className="flex items-center gap-1 text-white opacity-85 "
              >
                <FiChevronLeft size={58} />
                <span className="text-base sm:text-lg font-medium">Back</span>
              </motion.button>

              <motion.button
                variants={buttonVariants}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                className="flex items-center gap-1 text-white opacity-85"
              >
                <FiInfo size={18} />
                <span className="text-sm sm:text-base">Info</span>
              </motion.button>
            </div>

            {/* Center - Title and Badge */}
            <div className="flex items-center justify-center gap-2 sm:gap-3">
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-medium text-white">
                {subjectName}
              </h1>
              <motion.div
                whileHover={{ scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 300 }}
                className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-[#0B0B28]/70 border"
                style={{ borderColor: badgeColor }}
              >
                <span
                  className="text-xs sm:text-sm font-medium"
                  style={{ color: badgeColor }}
                >
                  {badge} Subject
                </span>
              </motion.div>
            </div>

            {/* Bottom - Stats */}
            <div className="flex items-center justify-center gap-2 sm:gap-3 text-white/70 text-xs sm:text-sm">
              <span>{chapterList.length} Chapters</span>
              <span className="opacity-50">•</span>
              <span>{totalQuestions.toLocaleString()} Questions</span>
              <span className="opacity-50">•</span>
              <span>{examName}</span>
            </div>
          </div>
        </motion.div>

        {/* Chapters Section */}
        <div className="px-4 sm:px-6 mt-6 sm:mt-8">
          {/* Chapters Header */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <h2 className="text-xl sm:text-2xl font-medium text-white">Chapters</h2>
            <motion.button
              variants={buttonVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              className="flex items-center gap-2 bg-black border border-[#262626] rounded-full px-4 py-1.5 sm:py-2 text-sm sm:text-base"
            >
              <FiFilter size={16} />
              <span>Filter</span>
            </motion.button>
          </div>

          {/* Chapter List */}
          <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto">
            {chapterList.map((chapter, index) => (
              <motion.button
                key={index}
                custom={index}
                variants={chapterCardVariants}
                initial="hidden"
                animate="visible"
                whileHover="hover"
                whileTap="tap"
                onClick={() => handleChapterPress(chapter, index)}
                className="relative w-full bg-black border border-[#262626] rounded-2xl p-4 sm:p-5 pl-16 sm:pl-20 text-left group"
              >
                {/* Chapter Number Circle */}
                <motion.div
                  whileHover={{ scale: 1.1, rotate: 5 }}
                  transition={{ type: 'spring', stiffness: 300 }}
                  className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 w-8 h-8 sm:w-10 sm:h-10 rounded-full border border-[#444] bg-black flex items-center justify-center"
                >
                  <span className="text-sm sm:text-base font-medium text-white">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                </motion.div>

                {/* Chapter Content */}
                <div className="flex flex-col gap-1.5">
                  <h3 className="text-base sm:text-lg font-medium text-white group-hover:text-white/90 transition-colors line-clamp-2">
                    {chapter.title}
                  </h3>
                  <div className="flex items-center gap-4 text-xs sm:text-sm text-gray-400">
                    <span>{chapter.questions} Questions</span>
                    <span className="opacity-50">•</span>
                    <span>Not started</span>
                  </div>
                </div>

                {/* Progress Indicator (if needed) */}
                <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <motion.div
                    initial={{ x: -10 }}
                    whileHover={{ x: 0 }}
                    className="text-white/50"
                  >
                    →
                  </motion.div>
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default function ChapterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[#181C29] flex items-center justify-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, }}
            className="w-8 h-8 border-4 border-white border-t-transparent rounded-full"
          />
        </div>
      }
    >
      <ChapterPageContent />
    </Suspense>
  );
}