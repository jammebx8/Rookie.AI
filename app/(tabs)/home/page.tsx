
'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../public/src/utils/supabase'; // adjust to your project path
import { toast } from 'react-hot-toast'; // optional: remove if you don't use it

type Chapter = {
  title: string;
  questions: number;
  playlist?: string;
};

type ChaptersMap = Record<string, Chapter[]>;

type User = {
  id: string;
  email?: string;
  exam?: string;
  class?: string;
  [key: string]: any;
};

const EXAM_OPTIONS = ['JEE Mains', 'NEET', 'JEE Advanced', 'Other'];
const Class_OPTIONS = ['11th', '12th', 'Dropper', 'Other'];

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

/**
 * Chapters data (kept same as original but converted to TS object)
 * For brevity I keep playlists and question counts identical to original.
 * Make sure the images referenced in /public/assets/... exist in your Next.js public folder.
 */
const chaptersData: ChaptersMap = {
  Physics: [
    { title: 'Units and Measurements.', questions: 90, playlist: 'https://www.youtube.com/watch?v=D_rUfEM4dTE&list=PLxb0SzPSaqZ4zV2ftv64MaL7ObQCG6a-6' },
    { title: 'Kinematics.', questions: 70, playlist: 'https://www.youtube.com/watch?v=yhFzjaUAdeo&list=PLxb0SzPSaqZ6LMU4Rztz3yA8yBbd2UUt4' },
    { title: 'Laws of Motion.', questions: 90, playlist: 'https://www.youtube.com/watch?v=INZqSEouxCY&list=PLxb0SzPSaqZ7x5iGKofjH8BGnsgXP65RT' },
    { title: 'Work, Energy, and Power.', questions: 80, playlist: 'https://www.youtube.com/watch?v=4pld8yj68vs&list=PLxb0SzPSaqZ5tSjiht1Lz5-QzERPGi1KI' },
    { title: 'Rotational Motion.', questions: 90, playlist: 'https://www.youtube.com/watch?v=R3-6NlNnaMs&list=PLxb0SzPSaqZ4RJbNiRcBafYSf_QOVQ6FD' },
    { title: 'Gravitation.', questions: 70, playlist: 'https://www.youtube.com/watch?v=X7rNZWs7zjk&list=PLxb0SzPSaqZ66IFag0KJ2z7ZfSE1nnErI' },
    { title: 'Properties of Solids and Liquids.', questions: 80, playlist: 'https://www.youtube.com/watch?v=GacgTcykZjY&list=PLxb0SzPSaqZ42kmbKPGQ4koK88Z7ht_EP&index=8' },
    { title: 'Thermodynamics.', questions: 90, playlist: 'https://www.youtube.com/watch?v=GacgTcykZjY&list=PLxb0SzPSaqZ42kmbKPGQ4koK88Z7ht_EP&index=8' },
    { title: 'Behaviour of Perfect Gas and Kinetic Theory.', questions: 90, playlist: 'https://www.youtube.com/watch?v=GacgTcykZjY&list=PLxb0SzPSaqZ42kmbKPGQ4koK88Z7ht_EP&index=8' },
    { title: 'Oscillations and Waves.', questions: 90, playlist: 'https://www.youtube.com/watch?v=2QeOSndOGVM&list=PLxb0SzPSaqZ5dBN_ul6VREQ_tp2EaEMH_' },
    { title: 'Electrostatics.', questions: 80, playlist: 'https://www.youtube.com/watch?v=yw1Ng3G1cnw&list=PLxb0SzPSaqZ582pW_hNhCv-pf9tObGnkl' },
    { title: 'Current Electricity.', questions: 90, playlist: 'https://www.youtube.com/watch?v=urajWFI7fxg&list=PLxb0SzPSaqZ6-QbUMrNn_M9YfcDJts6cX' },
    { title: 'Magnetic Effects of Current and Magnetism.', questions: 80, playlist: 'https://www.youtube.com/watch?v=DHeOgUHMe34&list=PLxb0SzPSaqZ5TdbhPLtTxuUISwr97ivIx' },
    { title: 'Electromagnetic Induction and Alternating Currents.', questions: 80, playlist: 'https://www.youtube.com/watch?v=HDN2Wcj61pU&list=PLxb0SzPSaqZ72yyiW7WWCjF8uvTsVxsH9' },
    { title: 'Electromagnetic Waves.', questions: 90, playlist: 'https://www.youtube.com/watch?v=GoEix5kiLzI&list=PLxb0SzPSaqZ5dbymq7QUsbNI3w4xalQfe' },
    { title: 'Optics.', questions: 90, playlist: 'https://www.youtube.com/watch?v=NivVrWO60g8&list=PLxb0SzPSaqZ7EqCrN8lcEhA-PK8Kaaz_B' },
    { title: 'Dual Nature of Matter and Radiation.', questions: 70, playlist: 'https://www.youtube.com/watch?v=nKKvdMluLW8&list=PLxb0SzPSaqZ5tyBaUrbHDwAarvxf0TVns&index=3' },
    { title: 'Atoms and Nuclei.', questions: 80, playlist: 'https://www.youtube.com/watch?v=nKKvdMluLW8&list=PLxb0SzPSaqZ5tyBaUrbHDwAarvxf0TVns&index=3' },
    { title: 'Semiconductors', questions: 70, playlist: 'https://www.youtube.com/watch?v=aV2NU2mz6-E' },
  ],
  Chemistry: [
    { title: 'Some Basic Concepts of Chemistry.', questions: 90, playlist: 'https://www.youtube.com/watch?v=2e7RwbYbBQI&list=PLnG6YW15b0oSDTkPf9xR4gjQTPcOyLBfS' },
    { title: 'Structure of Atom.', questions: 80, playlist: 'https://www.youtube.com/watch?v=iN0QXOaxDE0&list=PLnG6YW15b0oSDTkPf9xR4gjQTPcOyLBfS&index=2' },
    { title: 'Classification of Elements and Periodicity in Properties.', questions: 80, playlist: 'https://www.youtube.com/watch?v=HMlidkHBaTA&list=PLnG6YW15b0oSDTkPf9xR4gjQTPcOyLBfS&index=3' },
    { title: 'Chemical Bonding and Molecular Structure.', questions: 90, playlist: 'https://www.youtube.com/watch?v=u1qLcKEfZvg&list=PLnG6YW15b0oSDTkPf9xR4gjQTPcOyLBfS&index=4' },
    { title: 'Thermodynamics..', questions: 100, playlist: 'https://www.youtube.com/watch?v=0Pts58MQHsg&list=PLnG6YW15b0oSDTkPf9xR4gjQTPcOyLBfS&index=6' },
    { title: 'Equilibrium.', questions: 80, playlist: 'https://www.youtube.com/watch?v=sKGqkXkjfac&list=PLnG6YW15b0oSDTkPf9xR4gjQTPcOyLBfS&index=7' },
    { title: 'Redox Reactions.', questions: 60, playlist: 'https://www.youtube.com/watch?v=JO1pJyeok24&list=PLnG6YW15b0oSDTkPf9xR4gjQTPcOyLBfS&index=10' },
    { title: 'p-Block Elements.', questions: 80, playlist: 'https://www.youtube.com/watch?v=rwU3Ep8bMqI&list=PLnG6YW15b0oSDTkPf9xR4gjQTPcOyLBfS&index=11' },
    { title: 'Organic Chemistry – Some Basic Principles and Techniques.', questions: 80, playlist: 'https://www.youtube.com/watch?v=7saHqV3ApaU&list=PLnG6YW15b0oSDTkPf9xR4gjQTPcOyLBfS&index=8' },
    { title: 'Hydrocarbons.', questions: 70, playlist: 'https://www.youtube.com/watch?v=8NoCq125BVo&list=PLnG6YW15b0oSDTkPf9xR4gjQTPcOyLBfS&index=9' },
    { title: 'Coordination Compounds.', questions: 80, playlist: 'https://www.youtube.com/watch?v=Bgs30qj1CIE' },
    { title: 'Haloalkanes and Haloarenes.', questions: 80, playlist: 'https://www.youtube.com/watch?v=_pJfRgnDwKQ' },
    { title: 'Aldehydes, Ketones and Carboxylic Acids.', questions: 80, playlist: 'https://www.youtube.com/watch?v=lWc9t2BA68g' },
    { title: 'Biomolecules.', questions: 80, playlist: 'https://www.youtube.com/watch?v=X-4tRJlzqOU' },
  ],
  Maths: [
    { title: 'Sets, Relations, and Functions.', questions: 80, playlist: 'https://www.youtube.com/watch?v=oZ1_FrxiXao&list=PLnG6YW15b0oROKNSFhi6GIzGaRtIe0yFD&index=8' },
    { title: 'Quadratic Equations.', questions: 70, playlist: 'https://www.youtube.com/watch?v=xfljVBVyjfs&list=PLnG6YW15b0oROKNSFhi6GIzGaRtIe0yFD&index=3' },
    { title: 'Complex Numbers.', questions: 80, playlist: 'https://www.youtube.com/watch?v=IVfPtU6siow&list=PLnG6YW15b0oROKNSFhi6GIzGaRtIe0yFD&index=27' },
    { title: 'Matrices and Determinants.', questions: 80, playlist: 'https://www.youtube.com/watch?v=XL63EGKUyA4&list=PLnG6YW15b0oROKNSFhi6GIzGaRtIe0yFD&index=5' },
    { title: 'Permutations and Combinations.', questions: 80, playlist: 'https://www.youtube.com/watch?v=I8UUAC5gXU8&list=PLnG6YW15b0oROKNSFhi6GIzGaRtIe0yFD&index=21' },
    { title: 'Binomial Theorem and its Simple Applications.', questions: 80, playlist: 'https://www.youtube.com/watch?v=ERz6HqgeWVg&list=PLnG6YW15b0oROKNSFhi6GIzGaRtIe0yFD&index=4' },
    { title: 'Sequences and Series.', questions: 80, playlist: 'https://www.youtube.com/watch?v=dRNJY4ZElLg&list=PLnG6YW15b0oROKNSFhi6GIzGaRtIe0yFD&index=3' },
    { title: 'Limit, Continuity, and Differentiability.', questions: 80, playlist: 'https://www.youtube.com/watch?v=Fj6dvUj13GE&list=PLnG6YW15b0oROKNSFhi6GIzGaRtIe0yFD&index=9' },
    { title: 'Integral Calculus.', questions: 80, playlist: 'https://www.youtube.com/watch?v=6An_ozEdE6w&list=PLnG6YW15b0oROKNSFhi6GIzGaRtIe0yFD&index=14' },
    { title: 'Differential Equations.', questions: 80, playlist: 'https://www.youtube.com/watch?v=L-cUGsQnuvU&list=PLnG6YW15b0oROKNSFhi6GIzGaRtIe0yFD&index=17' },
    { title: 'Coordinate Geometry.', questions: 80, playlist: 'https://www.youtube.com/watch?v=6VjZMGdWkGw&list=PLnG6YW15b0oROKNSFhi6GIzGaRtIe0yFD&index=24' },
    { title: 'Three Dimensional Geometry.', questions: 80, playlist: 'https://www.youtube.com/watch?v=y_AS39Mz5Ho&list=PLnG6YW15b0oROKNSFhi6GIzGaRtIe0yFD&index=19' },
    { title: 'Vector Algebra.', questions: 80, playlist: 'https://www.youtube.com/watch?v=mDPvJbb9gn4&list=PLnG6YW15b0oROKNSFhi6GIzGaRtIe0yFD&index=18' },
    { title: 'Trigonometry.', questions: 80, playlist: 'https://www.youtube.com/watch?v=uyjwlKRcrCI&list=PLnG6YW15b0oROKNSFhi6GIzGaRtIe0yFD&index=13' },
    { title: 'Probability.', questions: 80, playlist: 'https://www.youtube.com/watch?v=sYTW-mvxcOk&list=PLnG6YW15b0oROKNSFhi6GIzGaRtIe0yFD&index=22' },
    { title: 'Statistics.', questions: 80, playlist: 'https://www.youtube.com/watch?v=njcdN_-XPqc&list=PLnG6YW15b0oROKNSFhi6GIzGaRtIe0yFD&index=20' },
  ],
};

const formulaCardColors = [
  'bg-[#2374FF]',
  'bg-[#6523FF]',
  'bg-[#F2005D]',
  'bg-[#E9A506]',
  'bg-[#008E40]',
  'bg-[#008D7F]',
  'bg-[#A100EC]',
  'bg-[#F26B83]',
];

// Thumbnails arrays (point to public folder)
const videoThumbs = {
  Physics: Array.from({ length: 19 }).map((_, i) => `/physics${i + 1}.jpg`),
  Chemistry: Array.from({ length: 14 }).map((_, i) => `/chem${i + 1}.jpg`),
  Maths: Array.from({ length: 16 }).map((_, i) => `/maths${i + 1}.jpg`),
};

const VIDEOS_PER_ROW = 2;
const ROWS_TO_SHOW = 3;
const INITIAL_COUNT = VIDEOS_PER_ROW * ROWS_TO_SHOW;

export default function Page() {
  const [selectedCardTab, setSelectedCardTab] = useState<'Physics' | 'Maths' | 'Chemistry'>('Physics');
  const [selectedStudyTab, setSelectedStudyTab] = useState<'Physics' | 'Maths' | 'Chemistry'>('Physics');

  const [modalVisible, setModalVisible] = useState(false);
  const [modalChapter, setModalChapter] = useState<Chapter | null>(null);

  const [showAllVideos, setShowAllVideos] = useState(false);

  const [user, setUser] = useState<User | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [cl, setcl] = useState<string>('');
  const [exam, setExam] = useState<string>('');
  const [saving, setSaving] = useState(false);

  const cardsRowRef = useRef<HTMLDivElement | null>(null);

  // derived arrays
  const formulaChapters = chaptersData[selectedCardTab] ?? [];
  const studyChapters = chaptersData[selectedStudyTab] ?? [];
  const studyThumbs = videoThumbs[selectedStudyTab] ?? [];

  const displayStudyChapters = showAllVideos ? studyChapters : studyChapters.slice(0, INITIAL_COUNT);

  useEffect(() => {
    // load cached user from localStorage (web equivalent of AsyncStorage)
    if (typeof window === 'undefined') return;
    try {
      const cached = localStorage.getItem('@user');
      if (!cached) return;
      const parsed: User = JSON.parse(cached);
      setUser(parsed);
      // prompt to complete profile if missing
      if (!parsed.cl || !parsed.exam) {
        setShowProfileModal(true);
      } else {
        setcl(parsed.cl || '');
        setExam(parsed.exam || '');
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('Failed to load cached user', err);
    }
  }, []);

  const saveProfile = async () => {
    if (!cl || !exam) {
      alert('Please select your class and exam');
      return;
    }
    if (!user) {
      alert('No user loaded');
      return;
    }
    try {
      setSaving(true);
      const { error } = await supabase.from('users').update({ cl, exam }).eq('id', user.id);

      if (error) {
        throw error;
      }

      const updatedUser = { ...user, cl, exam };
      localStorage.setItem('@user', JSON.stringify(updatedUser));
      setUser(updatedUser);
      setShowProfileModal(false);
      // optional toast
      if (typeof toast !== 'undefined') toast.success('Profile saved');
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.error('Profile update error:', err);
      alert(err?.message ?? 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  // Invite / share logic: try Web Share API -> whatsapp fallback -> copy link
  const inviteFriends = async () => {
    const link = 'https://rookie-ai.vercel.app';
    const text = `Hey! 👋 Join me on Rookie to study smarter together 🚀\n${link}`;

    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try {
        await (navigator as any).share({ title: 'Rookie', text, url: link });
        return;
      } catch {
        // share cancelled or failed - fallback below
      }
    }

    // WhatsApp web
    const encoded = encodeURIComponent(text);
    if (typeof window !== 'undefined') {
      // on mobile try whatsapp protocol first
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      if (isMobile) {
        // This will open WhatsApp app on mobile if available
        window.location.href = `whatsapp://send?text=${encoded}`;
        // fallthrough if the app isn't present will do nothing on some devices - user can use web fallback
        setTimeout(() => {
          // open web whatsapp as fallback
          window.open(`https://wa.me/?text=${encoded}`, '_blank');
        }, 800);
        return;
      }
      // desktop -> open whatsapp web
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  };

  // small helper to open external links safely
  const openExternal = (url?: string) => {
    if (!url) return;
    if (typeof window !== 'undefined') {
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const cardEnter = { opacity: 0, y: 8 };
  const cardAnimate = { opacity: 1, y: 0, transition: {  stiffness: 200, damping: 20 } };

  return (
    <main className="min-h-screen bg-[#0F1724] text-white">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key="home"
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.45 }}
          className="max-w-5xl mx-auto px-4 sm:px-6 md:px-8 pb-10"
        >
          {/* PROFILE COMPLETION MODAL */}
          <AnimatePresence>
            {showProfileModal && (
              <motion.div
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="w-full max-w-md bg-white rounded-lg p-6"
                  initial={{ scale: 0.98, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.98, opacity: 0 }}
                >
                  <h3 className="text-slate-900 text-lg font-semibold mb-2">Complete your profile</h3>
                  <p className="text-sm text-slate-600 mb-4">A couple of details to personalize your experience.</p>

                  <label className="block text-sm font-medium text-slate-700 mb-2">Class</label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {Class_OPTIONS.map(g => (
                      <motion.button
                        key={g}
                        onClick={() => setcl(g)}
                        whileTap={{ scale: 0.98 }}
                        className={`px-4 py-2 rounded-full text-sm font-medium ${
                          cl === g ? 'bg-cyan-400 text-slate-900' : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {g}
                      </motion.button>
                    ))}
                  </div>

                  <label className="block text-sm font-medium text-slate-700 mb-2">Select Exam</label>
                  <div className="flex flex-wrap gap-2 mb-6">
                    {EXAM_OPTIONS.map(e => (
                      <motion.button
                        key={e}
                        onClick={() => setExam(e)}
                        whileTap={{ scale: 0.98 }}
                        className={`px-4 py-2 rounded-full text-sm font-medium ${
                          exam === e ? 'bg-cyan-400 text-slate-900' : 'bg-slate-200 text-slate-800'
                        }`}
                      >
                        {e}
                      </motion.button>
                    ))}
                  </div>

                  <div className="flex justify-end gap-3">
                    <button
                      className="px-4 py-2 rounded-md text-sm bg-slate-200 text-slate-800"
                      onClick={() => {
                        setShowProfileModal(false);
                      }}
                    >
                      Skip
                    </button>
                    <motion.button
                      onClick={saveProfile}
                      whileTap={{ scale: 0.98 }}
                      className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm font-medium disabled:opacity-70"
                      disabled={saving}
                    >
                      {saving ? 'Saving...' : 'Continue'}
                    </motion.button>
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Quick Formula Cards */}
          <section className="mt-6">
            <h2 className="text-xl font-semibold mb-3">Quick Formula Cards</h2>

            <div className="bg-[#111827] rounded-2xl p-4">
              <div className="flex gap-2 mb-4">
                {(['Physics', 'Maths', 'Chemistry'] as const).map(tab => (
                  <motion.button
                    key={tab}
                    onClick={() => setSelectedCardTab(tab)}
                    whileTap={{ scale: 0.98 }}
                    className={`px-4 py-2 rounded-full text-sm font-semibold ${
                      selectedCardTab === tab ? 'bg-white text-black' : 'bg-[#0B1220] text-white'
                    }`}
                  >
                    {tab}
                  </motion.button>
                ))}
              </div>

              <div className="relative">
                <div
                  ref={cardsRowRef}
                  className="flex gap-4 overflow-x-auto pb-2 scroll-smooth"
                  role="list"
                >
                  {formulaChapters.map((chapter, index) => {
                    const colorClass = formulaCardColors[index % formulaCardColors.length];
                    return (
                      <motion.article
                        key={chapter.title}
                        role="listitem"
                        initial={cardEnter}
                        animate={cardAnimate}
                        whileHover={{ scale: 1.02 }}
                        className={`min-w-[14rem] max-w-[14rem] rounded-xl p-4 relative ${colorClass} shadow-lg`}
                      >
                        {/* decorative dotted overlay image */}
                        <div className="absolute inset-0 opacity-20 pointer-events-none">
                          <Image src="/Dotted.png" alt="" fill style={{ objectFit: 'cover' }} />
                        </div>

                        <h3 className="text-white font-semibold text-sm truncate z-10">
                          {chapter.title.replace(/\.$/, '')}
                        </h3>

                        <div className="flex items-center mt-6 z-10">
                          <div className="w-4 h-4 mr-2 opacity-90">
                            <Image src="/copy.png" alt="copy" width={16} height={16} />
                          </div>
                          <span className="text-white text-sm mr-3">{chapter.questions}</span>

                          <button
                            onClick={() => {
                              setModalChapter(chapter);
                              setModalVisible(true);
                            }}
                            className="ml-auto bg-white rounded-full w-10 h-8 flex items-center justify-center shadow"
                          >
                            <Image src="/arrow.png" alt="open" width={16} height={16} />
                          </button>
                        </div>
                      </motion.article>
                    );
                  })}
                </div>

                {/* fade overlay on right */}
                <div className="absolute right-0 top-0 bottom-0 w-12 pointer-events-none flex items-center justify-end">
                  <div className="w-full h-full bg-gradient-to-l from-[#0B1220] via-transparent to-transparent" />
                </div>
              </div>
            </div>
          </section>

          {/* Formula Card Modal (full screen card detail) */}
          <AnimatePresence>
            {modalVisible && modalChapter && (
              <motion.div
                className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <motion.div
                  className="w-full max-w-4xl bg-[#071126] rounded-xl overflow-hidden"
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  exit={{ y: 20, opacity: 0 }}
                >
                  <div className="flex items-center justify-between px-6 py-4 border-b border-slate-700">
                    <h3 className="text-white text-lg font-semibold">{modalChapter.title.replace(/\.$/, '')}</h3>
                    <button
                      onClick={() => {
                        setModalVisible(false);
                        setModalChapter(null);
                      }}
                      className="text-white text-2xl leading-none"
                    >
                      ×
                    </button>
                  </div>

                  <div className="p-6 bg-white rounded-b-xl min-h-[300px]">
                    {/* Example: place chapter details here. Currently kept empty like original. */}
                    <p className="text-slate-700">
                      Explore formulas, quick notes and practice questions for{' '}
                      <strong>{modalChapter.title.replace(/\.$/, '')}</strong>.
                    </p>
                    {/* If there's a playlist link, show CTA */}
                    {modalChapter.playlist && (
                      <div className="mt-4">
                        <button
                          onClick={() => openExternal(modalChapter.playlist)}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md"
                        >
                          Open Playlist
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Study Content */}
          <section className="mt-8">
            <h2 className="text-xl font-semibold mb-3">Study Content</h2>
            <div className="bg-[#111827] rounded-2xl p-4">
              <div className="flex gap-2 mb-4">
                {(['Physics', 'Maths', 'Chemistry'] as const).map(tab => (
                  <motion.button
                    key={tab}
                    onClick={() => {
                      setSelectedStudyTab(tab);
                      setShowAllVideos(false);
                    }}
                    whileTap={{ scale: 0.98 }}
                    className={`px-4 py-2 rounded-full text-sm font-semibold ${
                      selectedStudyTab === tab ? 'bg-white text-black' : 'bg-[#0B1220] text-white'
                    }`}
                  >
                    {tab}
                  </motion.button>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-3">
                {displayStudyChapters.map((chapter, idx) => {
                  const thumb = studyThumbs[idx % studyThumbs.length] ?? studyThumbs[0];
                  return (
                    <motion.div
                      key={chapter.title}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      whileHover={{ scale: 1.02 }}
                      className="relative bg-transparent rounded-lg overflow-hidden cursor-pointer"
                      onClick={() => chapter.playlist && openExternal(chapter.playlist)}
                    >
                      <div className="w-full h-24 sm:h-28 relative">
                        <Image src={thumb} alt={chapter.title} fill style={{ objectFit: 'cover' }} />
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <Image src="/youtube_play.png" alt="play" width={48} height={48} />
                        </div>
                      </div>
                      <div className="mt-2 px-1">
                        <h4 className="text-sm font-medium text-white line-clamp-2">{chapter.title.replace(/\.$/, '')}</h4>
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {studyChapters.length > INITIAL_COUNT && (
                <div className="mt-4 flex justify-center">
                  <motion.button
                    onClick={() => setShowAllVideos(prev => !prev)}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-2 bg-white text-black rounded-full"
                  >
                    {showAllVideos ? 'Show Less' : 'Show More'}
                  </motion.button>
                </div>
              )}
            </div>
          </section>

          {/* Invite Friends */}
          <section className="mt-8">
            <div className="rounded-2xl overflow-hidden relative bg-gradient-to-r from-[#0F7E6B] to-[#2E5BFF] p-4 flex flex-col md:flex-row items-center gap-4">
              <div className="flex-1 min-w-0">
                <h3 className="text-white text-lg font-semibold">Study with your friends!</h3>
                <p className="text-white/90 mt-1">Invite your friends to Rookie app to learn together.</p>
              </div>

              <div className="w-40 h-24 relative hidden sm:block">
                <Image src="/invite_friends.png" alt="invite" fill style={{ objectFit: 'contain' }} />
              </div>

              <motion.button
                onClick={inviteFriends}
                whileTap={{ scale: 0.98 }}
                className="px-6 py-2 bg-white text-black rounded-md"
              >
                Invite
              </motion.button>
            </div>
          </section>

          {/* Social Media */}
          <section className="mt-8">
            <div className="rounded-2xl p-4 bg-[#F05A24]">
              <h3 className="text-white text-lg font-semibold text-center">We're on social media</h3>
              <p className="text-white/90 text-center mt-1">Follow us and share with your friends.</p>

              <div className="flex flex-wrap justify-center gap-3 mt-4">
                {socialMediaLinks.map(item => (
                  <motion.button
                    key={item.label}
                    onClick={() => openExternal(item.url)}
                    whileTap={{ scale: 0.98 }}
                    className="flex items-center gap-3 bg-white rounded-md px-4 py-2 w-[150px] justify-start"
                    aria-label={`Open ${item.label}`}
                  >
                    <div className="w-6 h-6 relative">
                      <Image src={item.icon} alt={item.label} fill style={{ objectFit: 'contain' }} />
                    </div>
                    <span className="text-sm font-semibold text-black">{item.label}</span>
                  </motion.button>
                ))}
              </div>
            </div>
          </section>

          {/* Footer / feature image (edge-to-edge) */}
          <section className="mt-8">
            <div className="w-full overflow-hidden rounded-t-xl">
              <div className="w-full h-24 relative">
                <Image src="/featpicsss.png" alt="footer" fill style={{ objectFit: 'cover' }} />
              </div>
            </div>
          </section>
        </motion.div>
      </AnimatePresence>
    </main>
  );
}