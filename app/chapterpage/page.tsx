'use client';

import React, { Suspense, useState } from 'react';
import Image, { StaticImageData } from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronLeft, FiInfo } from 'react-icons/fi';
import imagepath from '../../public/src/constants/imagepath';

interface Chapter {
  title: string;
  questions: number;
}

interface ChaptersData {
  [exam: string]: { [subject: string]: Chapter[] };
}

// ── Year-wise question counts for JEE Main chapters ────────────────────────
// Keys: subject (lowercase) → chapter title → year → count
type YearData = Record<string, Record<string, Record<string, number>>>;

const YEAR_DATA: YearData = {
  chemistry: {
    'Alcohols, Phenols and Ethers': { '2013':2,'2014':1,'2015':0,'2016':4,'2017':2,'2018':5,'2019':13,'2020':13,'2021':24,'2022':26,'2023':32,'2024':22,'2025':7,'2026':14 },
    'Aldehydes, Ketones and Carboxylic Acids': { '2013':0,'2014':2,'2015':2,'2016':1,'2017':3,'2018':7,'2019':28,'2020':23,'2021':43,'2022':30,'2023':30,'2024':31,'2025':26,'2026':35 },
    'Basics of Organic Chemistry': { '2013':1,'2014':1,'2015':2,'2016':3,'2017':7,'2018':4,'2019':21,'2020':15,'2021':32,'2022':31,'2023':19,'2024':62,'2025':32,'2026':27 },
    'Biomolecules': { '2013':1,'2014':1,'2015':1,'2016':3,'2017':3,'2018':5,'2019':18,'2020':14,'2021':28,'2022':24,'2023':24,'2024':22,'2025':20,'2026':19 },
    'Chemical Bonding & Molecular Structure': { '2013':3,'2014':0,'2015':1,'2016':3,'2017':4,'2018':10,'2019':15,'2020':18,'2021':29,'2022':29,'2023':32,'2024':49,'2025':20,'2026':23 },
    'Chemical Equilibrium': { '2013':0,'2014':1,'2015':1,'2016':2,'2017':1,'2018':3,'2019':10,'2020':9,'2021':19,'2022':11,'2023':13,'2024':10,'2025':11,'2026':14 },
    'Chemical Kinetics and Nuclear Chemistry': { '2013':1,'2014':1,'2015':1,'2016':3,'2017':3,'2018':4,'2019':16,'2020':15,'2021':26,'2022':24,'2023':23,'2024':20,'2025':26,'2026':27 },
    'Chemistry in Everyday Life': { '2013':0,'2014':0,'2015':1,'2016':3,'2017':1,'2018':1,'2019':3,'2020':9,'2021':13,'2022':25,'2023':17,'2024':2,'2025':0,'2026':0 },
    'Compounds Containing Nitrogen': { '2013':3,'2014':2,'2015':1,'2016':4,'2017':3,'2018':5,'2019':22,'2020':16,'2021':51,'2022':29,'2023':32,'2024':28,'2025':22,'2026':26 },
    'Coordination Compounds': { '2013':1,'2014':2,'2015':2,'2016':5,'2017':2,'2018':7,'2019':28,'2020':32,'2021':39,'2022':31,'2023':47,'2024':48,'2025':43,'2026':36 },
    'd and f Block Elements': { '2013':2,'2014':1,'2015':2,'2016':4,'2017':3,'2018':2,'2019':14,'2020':12,'2021':36,'2022':30,'2023':30,'2024':34,'2025':19,'2026':22 },
    'Electrochemistry': { '2013':1,'2014':3,'2015':1,'2016':4,'2017':4,'2018':3,'2019':15,'2020':16,'2021':22,'2022':23,'2023':27,'2024':31,'2025':22,'2026':21 },
    'Environmental Chemistry': { '2013':0,'2014':0,'2015':0,'2016':3,'2017':3,'2018':2,'2019':20,'2020':8,'2021':22,'2022':15,'2023':21,'2024':0,'2025':0,'2026':0 },
    'Gaseous State': { '2013':1,'2014':1,'2015':0,'2016':3,'2017':2,'2018':1,'2019':7,'2020':5,'2021':12,'2022':13,'2023':9,'2024':0,'2025':1,'2026':0 },
    'Haloalkanes and Haloarenes': { '2013':2,'2014':2,'2015':1,'2016':2,'2017':7,'2018':3,'2019':16,'2020':17,'2021':26,'2022':18,'2023':19,'2024':25,'2025':19,'2026':16 },
    'Hydrocarbons': { '2013':0,'2014':0,'2015':0,'2016':4,'2017':1,'2018':4,'2019':16,'2020':13,'2021':23,'2022':11,'2023':21,'2024':20,'2025':18,'2026':20 },
    'Hydrogen': { '2013':0,'2014':0,'2015':1,'2016':3,'2017':1,'2018':1,'2019':14,'2020':8,'2021':22,'2022':15,'2023':17,'2024':0,'2025':0,'2026':0 },
    'Ionic Equilibrium': { '2013':1,'2014':0,'2015':0,'2016':0,'2017':3,'2018':8,'2019':11,'2020':13,'2021':15,'2022':17,'2023':15,'2024':9,'2025':16,'2026':14 },
    'Isolation of Elements': { '2013':0,'2014':0,'2015':1,'2016':2,'2017':0,'2018':2,'2019':16,'2020':9,'2021':31,'2022':22,'2023':22,'2024':0,'2025':1,'2026':0 },
    'p-Block Elements': { '2013':1,'2014':3,'2015':3,'2016':7,'2017':6,'2018':11,'2019':21,'2020':15,'2021':37,'2022':46,'2023':32,'2024':31,'2025':10,'2026':20 },
    'Periodic Table & Periodicity': { '2013':2,'2014':0,'2015':1,'2016':1,'2017':3,'2018':2,'2019':13,'2020':17,'2021':19,'2022':15,'2023':15,'2024':26,'2025':28,'2026':18 },
    'Polymers': { '2013':0,'2014':1,'2015':1,'2016':3,'2017':2,'2018':2,'2019':12,'2020':5,'2021':14,'2022':19,'2023':12,'2024':0,'2025':0,'2026':0 },
    'Practical Organic Chemistry': { '2013':0,'2014':0,'2015':0,'2016':1,'2017':1,'2018':3,'2019':7,'2020':4,'2021':20,'2022':14,'2023':10,'2024':17,'2025':12,'2026':22 },
    'Redox Reactions': { '2013':1,'2014':1,'2015':0,'2016':1,'2017':1,'2018':0,'2019':6,'2020':7,'2021':7,'2022':8,'2023':10,'2024':15,'2025':7,'2026':8 },
    'Salt Analysis': { '2013':0,'2014':0,'2015':0,'2016':0,'2017':1,'2018':0,'2019':0,'2020':2,'2021':4,'2022':5,'2023':6,'2024':8,'2025':12,'2026':5 },
    's-Block Elements': { '2013':0,'2014':1,'2015':1,'2016':5,'2017':1,'2018':0,'2019':15,'2020':8,'2021':19,'2022':25,'2023':37,'2024':1,'2025':0,'2026':0 },
    'Solid State': { '2013':1,'2014':1,'2015':1,'2016':0,'2017':1,'2018':3,'2019':11,'2020':5,'2021':15,'2022':9,'2023':11,'2024':0,'2025':0,'2026':0 },
    'Solutions': { '2013':0,'2014':1,'2015':1,'2016':3,'2017':3,'2018':3,'2019':16,'2020':12,'2021':25,'2022':22,'2023':24,'2024':15,'2025':22,'2026':23 },
    'Some Basic Concepts of Chemistry': { '2013':3,'2014':1,'2015':1,'2016':2,'2017':4,'2018':4,'2019':16,'2020':19,'2021':36,'2022':35,'2023':35,'2024':27,'2025':29,'2026':17 },
    'Structure of Atom': { '2013':1,'2014':1,'2015':1,'2016':2,'2017':4,'2018':3,'2019':19,'2020':13,'2021':26,'2022':26,'2023':29,'2024':23,'2025':21,'2026':26 },
    'Surface Chemistry': { '2013':1,'2014':0,'2015':1,'2016':4,'2017':3,'2018':3,'2019':15,'2020':14,'2021':21,'2022':19,'2023':24,'2024':2,'2025':0,'2026':0 },
    'Thermodynamics': { '2013':1,'2014':1,'2015':1,'2016':5,'2017':6,'2018':8,'2019':22,'2020':14,'2021':24,'2022':23,'2023':25,'2024':22,'2025':31,'2026':22 },
  },
  maths: {
    '3D Geometry': { '2013':2,'2014':2,'2015':1,'2016':2,'2017':4,'2018':4,'2019':32,'2020':17,'2021':54,'2022':50,'2023':72,'2024':43,'2025':34,'2026':29 },
    'Application of Derivatives': { '2013':2,'2014':2,'2015':2,'2016':6,'2017':5,'2018':5,'2019':20,'2020':25,'2021':33,'2022':32,'2023':19,'2024':26,'2025':14,'2026':11 },
    'Area Under The Curves': { '2013':1,'2014':1,'2015':1,'2016':2,'2017':2,'2018':3,'2019':13,'2020':11,'2021':17,'2022':22,'2023':26,'2024':22,'2025':18,'2026':19 },
    'Binomial Theorem': { '2013':1,'2014':1,'2015':1,'2016':3,'2017':3,'2018':4,'2019':21,'2020':18,'2021':39,'2022':29,'2023':46,'2024':23,'2025':24,'2026':17 },
    'Circle': { '2013':0,'2014':0,'2015':1,'2016':0,'2017':1,'2018':0,'2019':1,'2020':2,'2021':6,'2022':3,'2023':4,'2024':5,'2025':2,'2026':3 },
    'Complex Numbers': { '2013':1,'2014':1,'2015':1,'2016':2,'2017':3,'2018':4,'2019':17,'2020':15,'2021':29,'2022':26,'2023':24,'2024':24,'2025':19,'2026':19 },
    'Definite Integration': { '2013':1,'2014':1,'2015':1,'2016':4,'2017':4,'2018':5,'2019':22,'2020':20,'2021':58,'2022':46,'2023':40,'2024':43,'2025':23,'2026':31 },
    'Differential Equations': { '2013':1,'2014':1,'2015':1,'2016':3,'2017':3,'2018':4,'2019':16,'2020':16,'2021':42,'2022':39,'2023':25,'2024':37,'2025':21,'2026':21 },
    'Differentiation': { '2013':1,'2014':1,'2015':0,'2016':0,'2017':3,'2018':4,'2019':9,'2020':10,'2021':4,'2022':9,'2023':13,'2024':15,'2025':4,'2026':2 },
    'Ellipse': { '2013':1,'2014':1,'2015':1,'2016':1,'2017':3,'2018':1,'2019':11,'2020':9,'2021':16,'2022':12,'2023':12,'2024':8,'2025':18,'2026':15 },
    'Functions': { '2013':0,'2014':0,'2015':0,'2016':2,'2017':4,'2018':1,'2019':15,'2020':9,'2021':21,'2022':21,'2023':27,'2024':22,'2025':16,'2026':18 },
    'Height and Distance': { '2013':1,'2014':1,'2015':1,'2016':2,'2017':1,'2018':4,'2019':6,'2020':4,'2021':9,'2022':7,'2023':2,'2024':0,'2025':0,'2026':0 },
    'Hyperbola': { '2013':0,'2014':0,'2015':0,'2016':3,'2017':2,'2018':4,'2019':11,'2020':8,'2021':9,'2022':15,'2023':9,'2024':11,'2025':9,'2026':13 },
    'Inverse Trigonometric Functions': { '2013':1,'2014':0,'2015':1,'2016':0,'2017':2,'2018':0,'2019':8,'2020':3,'2021':17,'2022':20,'2023':11,'2024':8,'2025':11,'2026':10 },
    'Limits, Continuity and Differentiability': { '2013':1,'2014':1,'2015':2,'2016':6,'2017':3,'2018':8,'2019':28,'2020':24,'2021':50,'2022':33,'2023':20,'2024':28,'2025':26,'2026':21 },
    'Logarithm': { '2013':0,'2014':0,'2015':0,'2016':0,'2017':0,'2018':0,'2019':0,'2020':1,'2021':2,'2022':0,'2023':4,'2024':0,'2025':1,'2026':3 },
    'Mathematical Induction': { '2013':0,'2014':0,'2015':0,'2016':0,'2017':0,'2018':0,'2019':0,'2020':0,'2021':0,'2022':0,'2023':0,'2024':0,'2025':0,'2026':0 },
    'Mathematical Reasoning': { '2013':1,'2014':1,'2015':1,'2016':3,'2017':3,'2018':4,'2019':16,'2020':16,'2021':24,'2022':23,'2023':24,'2024':0,'2025':0,'2026':0 },
    'Matrices and Determinants': { '2013':2,'2014':2,'2015':2,'2016':6,'2017':6,'2018':8,'2019':30,'2020':31,'2021':61,'2022':46,'2023':47,'2024':40,'2025':34,'2026':33 },
    'Parabola': { '2013':1,'2014':1,'2015':1,'2016':2,'2017':2,'2018':4,'2019':18,'2020':11,'2021':18,'2022':23,'2023':19,'2024':12,'2025':17,'2026':14 },
    'Permutations and Combinations': { '2013':2,'2014':0,'2015':1,'2016':5,'2017':3,'2018':4,'2019':13,'2020':16,'2021':25,'2022':21,'2023':47,'2024':21,'2025':21,'2026':22 },
    'Probability': { '2013':1,'2014':1,'2015':1,'2016':3,'2017':7,'2018':5,'2019':19,'2020':16,'2021':34,'2022':33,'2023':27,'2024':26,'2025':21,'2026':18 },
    'Properties of Triangle': { '2013':0,'2014':0,'2015':0,'2016':0,'2017':0,'2018':1,'2019':6,'2020':1,'2021':7,'2022':2,'2023':5,'2024':4,'2025':2,'2026':0 },
    'Quadratic Equation and Inequalities': { '2013':1,'2014':2,'2015':1,'2016':3,'2017':3,'2018':6,'2019':16,'2020':18,'2021':25,'2022':25,'2023':22,'2024':18,'2025':16,'2026':16 },
    'Sequences and Series': { '2013':1,'2014':2,'2015':2,'2016':6,'2017':5,'2018':8,'2019':30,'2020':27,'2021':37,'2022':35,'2023':39,'2024':36,'2025':27,'2026':33 },
    'Sets and Relations': { '2013':0,'2014':0,'2015':1,'2016':1,'2017':0,'2018':3,'2019':5,'2020':9,'2021':11,'2022':12,'2023':20,'2024':16,'2025':21,'2026':13 },
    'Statistics': { '2013':1,'2014':1,'2015':1,'2016':3,'2017':2,'2018':4,'2019':14,'2020':15,'2021':20,'2022':13,'2023':22,'2024':15,'2025':8,'2026':16 },
    'Straight Lines and Pair of Straight Lines': { '2013':2,'2014':2,'2015':1,'2016':5,'2017':2,'2018':4,'2019':19,'2020':11,'2021':21,'2022':18,'2023':12,'2024':24,'2025':17,'2026':14 },
    'Trigonometric Equations': { '2013':0,'2014':0,'2015':0,'2016':2,'2017':0,'2018':2,'2019':6,'2020':0,'2021':11,'2022':15,'2023':4,'2024':8,'2025':6,'2026':6 },
    'Trigonometric Ratio and Identites': { '2013':1,'2014':1,'2015':0,'2016':1,'2017':1,'2018':0,'2019':7,'2020':5,'2021':9,'2022':7,'2023':6,'2024':7,'2025':6,'2026':12 },
    'Vector Algebra': { '2013':1,'2014':1,'2015':1,'2016':3,'2017':3,'2018':4,'2019':16,'2020':16,'2021':38,'2022':28,'2023':48,'2024':35,'2025':23,'2026':27 },
  },
  physics: {
    'Alternating Current': { '2013':1,'2014':1,'2015':2,'2016':2,'2017':1,'2018':4,'2019':10,'2020':8,'2021':39,'2022':32,'2023':26,'2024':26,'2025':11,'2026':10 },
    'Atoms and Nuclei': { '2013':1,'2014':4,'2015':1,'2016':2,'2017':6,'2018':8,'2019':19,'2020':17,'2021':36,'2022':36,'2023':45,'2024':40,'2025':20,'2026':24 },
    'Capacitor': { '2013':1,'2014':1,'2015':1,'2016':3,'2017':4,'2018':5,'2019':19,'2020':13,'2021':24,'2022':25,'2023':19,'2024':14,'2025':16,'2026':13 },
    'Center of Mass and Collision': { '2013':1,'2014':0,'2015':2,'2016':2,'2017':1,'2018':3,'2019':19,'2020':17,'2021':22,'2022':16,'2023':11,'2024':10,'2025':7,'2026':8 },
    'Circular Motion': { '2013':0,'2014':0,'2015':0,'2016':0,'2017':1,'2018':1,'2019':3,'2020':3,'2021':9,'2022':13,'2023':14,'2024':11,'2025':8,'2026':7 },
    'Communication Systems': { '2013':0,'2014':0,'2015':1,'2016':3,'2017':3,'2018':4,'2019':14,'2020':1,'2021':25,'2022':23,'2023':24,'2024':0,'2025':0,'2026':0 },
    'Current Electricity': { '2013':2,'2014':1,'2015':2,'2016':5,'2017':8,'2018':10,'2019':44,'2020':22,'2021':50,'2022':49,'2023':49,'2024':48,'2025':19,'2026':28 },
    'Dual Nature of Radiation': { '2013':1,'2014':0,'2015':1,'2016':3,'2017':4,'2018':4,'2019':16,'2020':18,'2021':34,'2022':22,'2023':27,'2024':23,'2025':21,'2026':16 },
    'Electromagnetic Induction': { '2013':2,'2014':0,'2015':1,'2016':2,'2017':3,'2018':3,'2019':11,'2020':14,'2021':17,'2022':14,'2023':24,'2024':17,'2025':8,'2026':20 },
    'Electromagnetic Waves': { '2013':1,'2014':7,'2015':2,'2016':3,'2017':2,'2018':4,'2019':16,'2020':15,'2021':24,'2022':24,'2023':22,'2024':15,'2025':10,'2026':17 },
    'Electrostatics': { '2013':2,'2014':1,'2015':2,'2016':3,'2017':3,'2018':5,'2019':24,'2020':21,'2021':31,'2022':27,'2023':35,'2024':32,'2025':37,'2026':26 },
    'Geometrical Optics': { '2013':2,'2014':3,'2015':1,'2016':6,'2017':3,'2018':4,'2019':22,'2020':20,'2021':32,'2022':29,'2023':33,'2024':21,'2025':41,'2026':35 },
    'Gravitation': { '2013':1,'2014':1,'2015':1,'2016':3,'2017':3,'2018':4,'2019':14,'2020':17,'2021':34,'2022':25,'2023':40,'2024':24,'2025':13,'2026':10 },
    'Heat and Thermodynamics': { '2013':2,'2014':2,'2015':3,'2016':8,'2017':11,'2018':7,'2019':46,'2020':43,'2021':70,'2022':60,'2023':54,'2024':44,'2025':50,'2026':37 },
    'Laws of Motion': { '2013':0,'2014':1,'2015':1,'2016':2,'2017':0,'2018':3,'2019':9,'2020':5,'2021':25,'2022':25,'2023':16,'2024':24,'2025':8,'2026':12 },
    'Magnetic Effect of Current': { '2013':0,'2014':1,'2015':2,'2016':3,'2017':3,'2018':5,'2019':24,'2020':21,'2021':21,'2022':29,'2023':30,'2024':31,'2025':23,'2026':19 },
    'Magnetic Properties of Matter': { '2013':1,'2014':2,'2015':0,'2016':2,'2017':1,'2018':1,'2019':7,'2020':5,'2021':11,'2022':11,'2023':10,'2024':6,'2025':6,'2026':4 },
    'Motion in a Plane': { '2013':1,'2014':0,'2015':0,'2016':0,'2017':0,'2018':1,'2019':10,'2020':6,'2021':10,'2022':16,'2023':13,'2024':8,'2025':12,'2026':8 },
    'Motion in a Straight Line': { '2013':0,'2014':1,'2015':1,'2016':0,'2017':3,'2018':3,'2019':8,'2020':6,'2021':20,'2022':17,'2023':19,'2024':16,'2025':7,'2026':8 },
    'Properties of Matter': { '2013':2,'2014':4,'2015':0,'2016':5,'2017':2,'2018':6,'2019':22,'2020':20,'2021':33,'2022':44,'2023':48,'2024':42,'2025':31,'2026':36 },
    'Rotational Motion': { '2013':1,'2014':2,'2015':1,'2016':4,'2017':7,'2018':7,'2019':33,'2020':28,'2021':36,'2022':22,'2023':26,'2024':20,'2025':26,'2026':26 },
    'Semiconductor': { '2013':2,'2014':1,'2015':3,'2016':3,'2017':4,'2018':4,'2019':13,'2020':5,'2021':38,'2022':17,'2023':23,'2024':15,'2025':11,'2026':14 },
    'Simple Harmonic Motion': { '2013':2,'2014':1,'2015':1,'2016':3,'2017':3,'2018':4,'2019':16,'2020':17,'2021':31,'2022':28,'2023':20,'2024':33,'2025':26,'2026':30 },
    'Units & Measurements': { '2013':1,'2014':0,'2015':0,'2016':4,'2017':3,'2018':6,'2019':16,'2020':17,'2021':31,'2022':28,'2023':20,'2024':33,'2025':26,'2026':30 },
    'Vector Algebra': { '2013':0,'2014':0,'2015':0,'2016':0,'2017':0,'2018':1,'2019':3,'2020':1,'2021':13,'2022':5,'2023':6,'2024':7,'2025':1,'2026':1 },
    'Wave Optics': { '2013':2,'2014':3,'2015':2,'2016':3,'2017':3,'2018':5,'2019':15,'2020':14,'2021':18,'2022':18,'2023':17,'2024':23,'2025':21,'2026':23 },
    'Waves': { '2013':1,'2014':1,'2015':1,'2016':4,'2017':4,'2018':5,'2019':20,'2020':14,'2021':17,'2022':19,'2023':18,'2024':9,'2025':11,'2026':9 },
    'Work Power & Energy': { '2013':0,'2014':1,'2015':0,'2016':5,'2017':3,'2018':3,'2019':6,'2020':11,'2021':18,'2022':14,'2023':25,'2024':19,'2025':13,'2026':13 },
  },
};

// Only years that have at least one question across any chapter of that subject
const ALL_YEARS = ['2026','2025','2024','2023','2022','2021','2020','2019','2018','2017','2016','2015','2014','2013'];

function getYearCount(subjectName: string, chapterTitle: string, year: string): number {
  const subKey = subjectName.toLowerCase();
  return YEAR_DATA[subKey]?.[chapterTitle]?.[year] ?? 0;
}

const chaptersData: ChaptersData = {
  // ──────────────────────────────────────────────────────────────
  // JEE MAIN
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
  // JEE ADVANCED
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

  // Year filter — only applies to JEE Main (we have the data for it)
  const showYearFilter = examName === 'JEE Main';
  const [selectedYear, setSelectedYear] = useState<string>('All');

  const resolveImage = (key: string): StaticImageData | string | undefined =>
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (imagepath as any)?.[key];

  const subjectImage = resolveImage(imageKey);
  const chapterList  = chaptersData[examName]?.[subjectName] ?? [];

  // Derive display question count per chapter based on selected year
  const getDisplayCount = (chapter: Chapter): number => {
    if (!showYearFilter || selectedYear === 'All') return chapter.questions;
    return getYearCount(subjectName, chapter.title, selectedYear);
  };

  // Total for the header strip (respects year filter)
  const totalQuestions = chapterList.reduce((sum, ch) => sum + getDisplayCount(ch), 0);

  const handleChapterPress = (chapter: Chapter, index: number) => {
    const params = new URLSearchParams({
      subject:      subjectName.toLowerCase(),
      chapter:      chapter.title,
      imageKey,
      examName,
      chapterIndex: String(index),
      index:        '0',
    });
    // Pass year filter so QuestionViewer can filter by exam_shift
    if (showYearFilter && selectedYear !== 'All') {
      params.set('year', selectedYear);
    }
    router.push(`/QuestionViewer?${params.toString()}`);
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
              <AnimatePresence mode="wait">
                <motion.span
                  key={`${selectedYear}-${totalQuestions}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.2 }}
                >
                  {totalQuestions.toLocaleString()} Questions
                  {showYearFilter && selectedYear !== 'All' && (
                    <span className="ml-1 opacity-60">in {selectedYear}</span>
                  )}
                </motion.span>
              </AnimatePresence>
              <span className="opacity-50">•</span>
              <span>{examName}</span>
            </div>
          </div>
        </motion.div>

        {/* Chapter list */}
        <div className="px-4 sm:px-6 mt-6 sm:mt-8">

          {/* ── Section header + year filter chips ── */}
          <div className="flex items-start justify-between gap-3 mb-4 sm:mb-5">
            <h2 className="text-xl sm:text-2xl font-medium text-white shrink-0 pt-1">Chapters</h2>

            {showYearFilter && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.18, duration: 0.35 }}
                className="flex gap-1.5 overflow-x-auto pb-1 min-w-0"
                style={{ scrollbarWidth: 'none' }}
              >
                {['All', ...ALL_YEARS].map((yr) => {
                  const active = yr === selectedYear;
                  return (
                    <motion.button
                      key={yr}
                      onClick={() => setSelectedYear(yr)}
                    
                      className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all duration-200 ${
                        active
                          ? 'bg-white text-black border-white'
                          : 'bg-transparent text-white/60 border-white/20 hover:border-white/50 hover:text-white/90'
                      }`}
                    >
                      {yr}
                    </motion.button>
                  );
                })}
              </motion.div>
            )}
          </div>

          {chapterList.length === 0 ? (
            <p className="text-center text-gray-500 py-16 text-sm">
              No chapters found for {subjectName} — {examName}.
            </p>
          ) : (
            <div className="space-y-3 sm:space-y-4 max-w-4xl mx-auto">
              {chapterList.map((chapter, index) => {
                const displayCount = getDisplayCount(chapter);
                const isZero = showYearFilter && selectedYear !== 'All' && displayCount === 0;

                return (
                  <motion.button
                    key={chapter.title}
                    custom={index}
                    variants={chapterCardVariants}
                    initial="hidden"
                    animate="visible"
                    whileHover={isZero ? {} : 'hover'}
                    whileTap={isZero ? {} : 'tap'}
                    onClick={() => !isZero && handleChapterPress(chapter, index)}
                    disabled={isZero}
                    className={`relative w-full border rounded-2xl p-4 sm:p-5 pl-16 sm:pl-20 text-left group transition-colors ${
                      isZero
                        ? 'bg-[#0f1018] border-[#1a1a2a] opacity-40 cursor-not-allowed'
                        : 'bg-black border-[#262626]'
                    }`}
                  >
                    <motion.div
                      whileHover={isZero ? {} : { scale: 1.1, rotate: 5 }}
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
                        <AnimatePresence mode="wait">
                          <motion.span
                            key={`${chapter.title}-${selectedYear}`}
                            initial={{ opacity: 0, y: 3 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -3 }}
                            transition={{ duration: 0.15 }}
                          >
                            {displayCount} Question{displayCount !== 1 ? 's' : ''}
                          </motion.span>
                        </AnimatePresence>
                        <span className="opacity-50">•</span>
                        <span>{examName}</span>
                      </div>
                    </div>

                    {!isZero && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
                          <path d="M9 18l6-6-6-6" />
                        </svg>
                      </div>
                    )}
                  </motion.button>
                );
              })}
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
        <div className="w-10 h-10 rounded-full border-2 border-white border-t-transparent animate-spin" />
      </div>
    }>
      <ChapterPageContent />
    </Suspense>
  );
}
