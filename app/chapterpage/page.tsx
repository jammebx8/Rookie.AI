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
  'JEE Main': {
    Physics: [
      { title: 'Units and Measurements.', questions: 100 },
      { title: 'Vector Algebra.', questions: 100 },
      { title: 'Kinematics 1-D.', questions: 70 },
      { title: 'Kinematics 2-D.', questions: 70 },
      { title: 'Circular Motion.', questions: 70 },
      { title: 'Laws of Motion.', questions: 90 },
      { title: 'Work, Energy, and Power.', questions: 80 },
      { title: 'Center of Mass and Collision.', questions: 80 },
      { title: 'Rotational Motion.', questions: 110 },
      { title: 'Properties of Matter.', questions: 70 },
      { title: 'Heat and Thermodynamics.', questions: 80 },
      { title: 'Simple Harmonic Motion.', questions: 90 },
      { title: 'Waves.', questions: 90 },
      { title: 'Gravitation.', questions: 90 },
      { title: 'Electrostatics.', questions: 80 },
      { title: 'Current Electricity.', questions: 90 },
      { title: 'Capacitor.', questions: 80 },
      { title: 'Magnetic Effect of Current.', questions: 80 },
      { title: 'Magnetic Properties of Matter.', questions: 90 },
      { title: 'Electromagnetic Induction.', questions: 90 },
      { title: 'Alternating Current.', questions: 70 },
      { title: 'Electromagnetic Waves.', questions: 80 },
      { title: 'Wave Optics.', questions: 70 },
      { title: 'Geometrical Optics.', questions: 70 },
      { title: 'Atoms and Nuclei.', questions: 80 },
      { title: 'Dual Nature of Radiation.', questions: 70 },
      { title: 'Semiconductors.', questions: 70 },
    ],
    Chemistry: [
      { title: 'Some Basic Concepts of Chemistry.', questions: 90 },
      { title: 'Structure of Atom.', questions: 80 },
      { title: 'Redox Reactions.', questions: 80 },
      { title: 'Chemical Equilibrium.', questions: 90 },
      { title: 'Ionic Equilibrium.', questions: 100 },
      { title: 'Solutions.', questions: 80 },
      { title: 'Thermodynamics.', questions: 60 },
      { title: 'Electrochemistry.', questions: 80 },
      { title: 'Chemical Kinetics and Nuclear Chemistry.', questions: 80 },
      { title: 'Periodic Table & Periodicity.', questions: 70 },
      { title: 'Chemical Bonding & Molecular Structure.', questions: 80 },
      { title: 'p-Block Elements.', questions: 80 },
      { title: 'd and f Block Elements.', questions: 80 },
      { title: 'Coordination Compounds.', questions: 80 },
      { title: 'Salt Analysis.', questions: 80 },
      { title: 'Basics of Organic Chemistry.', questions: 80 },
      { title: 'Hydrocarbons.', questions: 80 },
      { title: 'Haloalkanes and Haloarenes.', questions: 80 },
      { title: 'Alcohols, Phenols and Ethers.', questions: 80 },
      { title: 'Aldehydes, Ketones and Carboxylic Acids.', questions: 80 },
      { title: 'Compounds Containing Nitrogen.', questions: 80 },
      { title: 'Biomolecules.', questions: 80 },
      { title: 'Practical Organic Chemistry.', questions: 80 },
    ],
    Maths: [
      { title: 'Sets and Relations.', questions: 80 },
      { title: 'Logarithm.', questions: 70 },
      { title: 'Quadratic Equation and Inequalities.', questions: 80 },
      { title: 'Sequences and Series.', questions: 80 },
      { title: 'Binomial Theorem.', questions: 80 },
      { title: 'Matrices and Determinants.', questions: 80 },
      { title: 'Permutations and Combinations.', questions: 80 },
      { title: 'Probability.', questions: 70 },
      { title: 'Vector Algebra.', questions: 80 },
      { title: '3D Geometry.', questions: 80 },
      { title: 'Complex Numbers.', questions: 80 },
      { title: 'Statistics.', questions: 80 },
      { title: 'Trigonometric Ratio and Identites.', questions: 80 },
      { title: 'Inverse Trigonometric Functions.', questions: 80 },
      { title: 'Straight Lines and Pair of Straight Lines.', questions: 80 },
      { title: 'Circle.', questions: 80 },
      { title: 'Parabola.', questions: 80 },
      { title: 'Ellipse.', questions: 70 },
      { title: 'Hyperbola.', questions: 80 },
      { title: 'Functions.', questions: 80 },
      { title: 'Limits, Continuity and Differentiability.', questions: 80 },
      { title: 'Differentiation.', questions: 80 },
      { title: 'Application of Derivatives.', questions: 80 },
      { title: 'Indefinite Integrals.', questions: 80 },
      { title: 'Definite Integration.', questions: 70 },
      { title: 'Area Under The Curves.', questions: 80 },
      { title: 'Differential Equations.', questions: 80 },
    ],
  },
  'JEE Advanced': {
    Physics: [
      { title: 'Units and Measurements.', questions: 60 },
      { title: 'Kinematics.', questions: 70 },
      { title: 'Laws of Motion.', questions: 70 },
      { title: 'Work, Energy, and Power.', questions: 70 },
      { title: 'Center of Mass and Collision.', questions: 70 },
      { title: 'Rotational Motion.', questions: 80 },
      { title: 'Gravitation.', questions: 60 },
      { title: 'Properties of Matter.', questions: 60 },
      { title: 'Heat and Thermodynamics.', questions: 70 },
      { title: 'Simple Harmonic Motion.', questions: 70 },
      { title: 'Waves.', questions: 70 },
      { title: 'Electrostatics.', questions: 80 },
      { title: 'Current Electricity.', questions: 70 },
      { title: 'Magnetic Effect of Current.', questions: 70 },
      { title: 'Electromagnetic Induction.', questions: 70 },
      { title: 'Wave Optics.', questions: 60 },
      { title: 'Geometrical Optics.', questions: 70 },
      { title: 'Modern Physics.', questions: 70 },
      { title: 'Nuclear Physics.', questions: 60 },
    ],
    Chemistry: [
      { title: 'Atomic Structure.', questions: 60 },
      { title: 'Chemical Bonding.', questions: 70 },
      { title: 'Thermodynamics.', questions: 70 },
      { title: 'Chemical Equilibrium.', questions: 70 },
      { title: 'Electrochemistry.', questions: 60 },
      { title: 'Chemical Kinetics.', questions: 60 },
      { title: 'Coordination Compounds.', questions: 70 },
      { title: 'p-Block Elements.', questions: 70 },
      { title: 'd-Block Elements.', questions: 60 },
      { title: 'Organic Chemistry Basics.', questions: 70 },
      { title: 'Hydrocarbons.', questions: 70 },
      { title: 'Haloalkanes.', questions: 60 },
      { title: 'Aldehydes and Ketones.', questions: 70 },
      { title: 'Biomolecules.', questions: 60 },
    ],
    Maths: [
      { title: 'Algebra.', questions: 80 },
      { title: 'Matrices.', questions: 70 },
      { title: 'Probability.', questions: 70 },
      { title: 'Trigonometry.', questions: 70 },
      { title: 'Analytical Geometry.', questions: 80 },
      { title: 'Differential Calculus.', questions: 80 },
      { title: 'Integral Calculus.', questions: 80 },
      { title: 'Vectors.', questions: 70 },
      { title: '3D Geometry.', questions: 70 },
      { title: 'Complex Numbers.', questions: 70 },
      { title: 'Sequences and Series.', questions: 70 },
      { title: 'Permutations and Combinations.', questions: 70 },
      { title: 'Binomial Theorem.', questions: 60 },
      { title: 'Differential Equations.', questions: 70 },
      { title: 'Functions.', questions: 70 },
      { title: 'Limits and Continuity.', questions: 70 },
    ],
  },
  NEET: {
    Physics: [
      { title: 'Physical World and Measurement.', questions: 60 },
      { title: 'Kinematics.', questions: 70 },
      { title: 'Laws of Motion.', questions: 70 },
      { title: 'Work, Energy, and Power.', questions: 70 },
      { title: 'Motion of System of Particles.', questions: 70 },
      { title: 'Gravitation.', questions: 60 },
      { title: 'Properties of Bulk Matter.', questions: 70 },
      { title: 'Thermodynamics.', questions: 70 },
      { title: 'Oscillations and Waves.', questions: 70 },
      { title: 'Electrostatics.', questions: 70 },
      { title: 'Current Electricity.', questions: 70 },
      { title: 'Magnetic Effects of Current.', questions: 70 },
      { title: 'Electromagnetic Induction.', questions: 60 },
      { title: 'Optics.', questions: 70 },
      { title: 'Dual Nature of Matter.', questions: 60 },
      { title: 'Atoms and Nuclei.', questions: 70 },
      { title: 'Electronic Devices.', questions: 60 },
      { title: 'Communication Systems.', questions: 50 },
      { title: 'Electromagnetic Waves.', questions: 50 },
    ],
    Chemistry: [
      { title: 'Some Basic Concepts of Chemistry.', questions: 70 },
      { title: 'Structure of Atom.', questions: 70 },
      { title: 'Classification of Elements.', questions: 60 },
      { title: 'Chemical Bonding.', questions: 70 },
      { title: 'States of Matter.', questions: 60 },
      { title: 'Thermodynamics.', questions: 70 },
      { title: 'Equilibrium.', questions: 70 },
      { title: 'Redox Reactions.', questions: 60 },
      { title: 'Hydrogen.', questions: 50 },
      { title: 'p-Block Elements.', questions: 70 },
      { title: 'Organic Chemistry Basics.', questions: 70 },
      { title: 'Hydrocarbons.', questions: 70 },
      { title: 'Biomolecules.', questions: 70 },
      { title: 'Polymers.', questions: 60 },
    ],
    Biology: [
      { title: 'Diversity of Living Organisms.', questions: 100 },
      { title: 'Structural Organisation.', questions: 90 },
      { title: 'Cell Structure and Function.', questions: 110 },
      { title: 'Plant Physiology.', questions: 100 },
      { title: 'Human Physiology.', questions: 110 },
      { title: 'Reproduction.', questions: 100 },
      { title: 'Genetics and Evolution.', questions: 110 },
      { title: 'Biology and Human Welfare.', questions: 90 },
      { title: 'Biotechnology.', questions: 90 },
      { title: 'Ecology and Environment.', questions: 100 },
    ],
  },
};

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.06 } },
};

const headerVariants = {
  hidden: { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const chapterCardVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1, x: 0,
    transition: { delay: i * 0.04, duration: 0.35 },
  }),
  hover: { scale: 1.02, x: 4, transition: { duration: 0.15 } },
  tap: { scale: 0.98 },
};

const buttonVariants = {
  rest: { scale: 1 },
  hover: { scale: 1.05, transition: { duration: 0.15 } },
  tap: { scale: 0.95 },
};

function ChapterPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const examName    = searchParams.get('examName')    || 'JEE Main';
  const subjectName = searchParams.get('subjectName') || 'Physics';
  const badge       = searchParams.get('badge')       || '#1';
  const badgeColor  = searchParams.get('badgeColor')  || '#00FFB0';
  const imageKey    = searchParams.get('imageKey')    || 'Physics1';

  const resolveImage = (key: string): StaticImageData | string | undefined =>
    (imagepath as any)?.[key];

  const subjectImage = resolveImage(imageKey);
  const chapterList  = chaptersData[examName]?.[subjectName] || [];
  const totalQuestions = chapterList.reduce((sum, ch) => sum + ch.questions, 0);

  const handleChapterPress = (chapter: Chapter, index: number) => {
    const params = new URLSearchParams({
      subject:      subjectName,
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
                alt={subjectName} fill
                className="object-cover opacity-50"
                priority sizes="100vw"
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
                      <span>Not started</span>
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
