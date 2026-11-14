'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, BookOpen, ChevronRight } from 'lucide-react';
import { Page, PageHeader, Section, Chip, Tag, Skeleton, EmptyState, cardCls } from '@/components/rookie/ui';
import { Define } from '@/components/rookie/define';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

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

// ── Page content ──────────────────────────────────────────────────────────────

function ChapterPageContent() {
  const router       = useRouter();
  const searchParams = useSearchParams();

  const examName    = searchParams.get('examName')    || 'JEE Main';
  const subjectName = searchParams.get('subjectName') || 'Physics';
  const badge       = searchParams.get('badge')       || '#1';
  // Kept for param parity; the subject colour is no longer used in the neutral UI.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const badgeColor  = searchParams.get('badgeColor')  || '#00FFB0';
  const imageKey    = searchParams.get('imageKey')    || 'Physics1';

  // Year filter — only applies to JEE Main (we have the data for it)
  const showYearFilter = examName === 'JEE Main';
  const [selectedYear, setSelectedYear] = useState<string>('All');

  const chapterList  = chaptersData[examName]?.[subjectName] ?? [];

  // ── Rookie Pass Guard for JEE Advanced ────────────────────────────────────
  React.useEffect(() => {
    if (examName !== 'JEE Advanced') return;
    let active = true;
    const verify = async () => {
      try {
        const { checkUserPaidDirectFromDB } = await import('@/lib/rookiePass');
        const ok = await checkUserPaidDirectFromDB();
        if (active && !ok) router.replace('/explore');
      } catch {
        if (active) router.replace('/explore');
      }
    };
    verify();
    const handleUpdate = () => { verify(); };
    window.addEventListener('rookiePassUpdated', handleUpdate);
    return () => {
      active = false;
      window.removeEventListener('rookiePassUpdated', handleUpdate);
    };
  }, [examName, router]);

  // Derive display question count per chapter based on selected year
  const getDisplayCount = (chapter: Chapter): number => {
    if (!showYearFilter || selectedYear === 'All') return chapter.questions;
    return getYearCount(subjectName, chapter.title, selectedYear);
  };

  // Total for the header strip (respects year filter)
  const totalQuestions = chapterList.reduce((sum, ch) => sum + getDisplayCount(ch), 0);

  const handleChapterPress = async (chapter: Chapter, index: number) => {
    if (examName === 'JEE Advanced') {
      try {
        const { checkUserPaidDirectFromDB } = await import('@/lib/rookiePass');
        const ok = await checkUserPaidDirectFromDB();
        if (!ok) {
          router.replace('/explore');
          return;
        }
      } catch {
        router.replace('/explore');
        return;
      }
    }
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

  const yearSuffix = showYearFilter && selectedYear !== 'All' ? ` in ${selectedYear}` : '';

  return (
    <Page>
      <Button
        variant="ghost"
        className="-ml-2.5 mt-8 h-9 rounded-control px-2.5 text-muted-foreground hover:text-foreground"
        onClick={() => router.push('/explore')}
      >
        <ArrowLeft className="size-4" /> Practice
      </Button>

      <PageHeader
        className="mt-4"
        title={subjectName}
        sub={
          <>
            <Define text="Chapters in this subject that have past-paper questions.">{chapterList.length} chapters</Define>
            <span className="mx-2 opacity-50">·</span>
            <Define text={`Past-paper questions across these chapters${yearSuffix || ', all years'}.`}>
              <span className="tabular-nums">{totalQuestions.toLocaleString()}</span> questions{yearSuffix}
            </Define>
            <span className="mx-2 opacity-50">·</span>
            {examName}
          </>
        }
        action={<Tag className="text-meta">{badge} Subject</Tag>}
      />

      <Section
        title="Chapters"
        text={showYearFilter ? 'Pick a year to see only the questions asked that year.' : 'Every chapter with past-paper questions for this subject.'}
      >
        {showYearFilter && (
          <div
            role="radiogroup"
            aria-label="Year"
            className="no-scrollbar -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 pb-1 md:mx-0 md:flex-wrap md:px-0"
          >
            {['All', ...ALL_YEARS].map((yr) => (
              <Chip
                key={yr}
                role="radio"
                aria-checked={yr === selectedYear}
                active={yr === selectedYear}
                onClick={() => setSelectedYear(yr)}
                className={cn('shrink-0 tabular-nums', yr !== selectedYear && 'bg-card ring-1 ring-black/[.05] dark:ring-white/[.06]')}
              >
                {yr === 'All' ? 'All years' : yr}
              </Chip>
            ))}
          </div>
        )}

        {chapterList.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No chapters yet"
            sub={`We couldn't find chapters for ${subjectName} in ${examName}.`}
          />
        ) : (
          <div className={cn(cardCls, 'grid gap-2 p-3 sm:p-4 lg:grid-cols-2')}>
            {chapterList.map((chapter, index) => {
              const displayCount = getDisplayCount(chapter);
              const isZero = showYearFilter && selectedYear !== 'All' && displayCount === 0;

              return (
                <motion.button
                  key={chapter.title}
                  type="button"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.015, 0.3), duration: 0.25 }}
                  onClick={() => !isZero && handleChapterPress(chapter, index)}
                  disabled={isZero}
                  className={cn(
                    'group flex w-full items-center gap-3 rounded-control bg-muted px-3 py-3 text-left outline-none transition focus-visible:ring-2 focus-visible:ring-ring',
                    isZero ? 'cursor-not-allowed opacity-45' : 'hover:bg-secondary',
                  )}
                >
                  <span className="w-6 shrink-0 text-meta font-medium tabular-nums text-muted-foreground">
                    {String(index + 1).padStart(2, '0')}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-body font-medium text-foreground group-hover:text-secondary-foreground" title={chapter.title}>
                    {chapter.title}
                  </span>
                  <span className="shrink-0 text-meta font-medium tabular-nums text-muted-foreground">
                    {displayCount} Q{displayCount !== 1 ? 's' : ''}
                  </span>
                  <ChevronRight
                    className={cn('size-4 shrink-0 text-muted-foreground transition-transform', !isZero && 'group-hover:translate-x-0.5 group-hover:text-secondary-foreground', isZero && 'invisible')}
                  />
                </motion.button>
              );
            })}
          </div>
        )}
      </Section>
    </Page>
  );
}

export default function ChapterPage() {
  return (
    <Suspense fallback={
      <Page>
        <Skeleton className="mt-8 h-9 w-28" />
        <Skeleton className="mt-6 h-11 w-56" />
        <Skeleton className="mt-3 h-5 w-72" />
        <Skeleton className="mt-section h-[420px] w-full rounded-card" />
      </Page>
    }>
      <ChapterPageContent />
    </Suspense>
  );
}
