'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../../public/src/utils/supabase';

// Types
type ClassType = '12th' | '11th' | 'Dropper' | 'Other';
type ExamType = 'JEE Mains' | 'JEE Advanced' | 'NEET' | 'CUET' | 'Other';






interface AIBuddy {
  id: number;
  name: string;
  description: string;
  image: string;
  prompts: {
    onCorrect: string;
    onWrong: string;
    solutionPrefix: string;
  };
  prompt?: string;
  text?: string;
}

// Constants
const CLASS_OPTIONS: ClassType[] = ['12th', '11th', 'Dropper', 'Other'];
const EXAM_OPTIONS: ExamType[] = ['JEE Mains', 'JEE Advanced', 'NEET', 'CUET', 'Other'];

const aiBuddies: AIBuddy[] = [
  {
    id: 1,
    name: 'Jeetu Bhaiya',
    description: 'No description needed, he is the legend himself.',
    image: '/HD-wallpaper-kota-factory-lip-jeetu-bhaiya.jpg',
    prompts: {
      onCorrect: "Give a short not more than 15 words, cheerful message for getting a question correct.you are jeetu bhaiya who talks in hinglish.you call your students as bhai or didi as sarcasm. as Jeetu Bhaiya in hinglish.encourage them to solve more questions.",
      onWrong: " Give a short not more than 15 words, supportive message for getting a question wrong as Jeetu Bhaiya in hinglish.encourage them to solve more questions.",
      solutionPrefix: "you are jeetu bhaiya who talks in hinglish.you call your students as bhai or didi as sarcasm. Give a clear, concise, and simple step-by-step solution/explanation not more than 15 lines to the following question using plain text with Unicode math symbols (like ½, ×, √, ²) instead of LaTeX. Avoid using any dollar signs or LaTeX formatting. Write everything in plain, friendly text a high school student can understand. Avoid being too technical, keep it friendly and encouraging.",
    },
  },
  {
    id: 2,
    name: 'Riya',
    description: 'Fast, logical and straight to the point – no fluff, only facts.',
    image: '/assets_task_01jstrf4hqff7r4gs3jwmbq5kd_1745728563_img_0.webp',
    prompts: {
      onCorrect: "You are Riya, a fun, teenage girl who replies in Hinglish. Avoid long responses. You never give boring answers. Be informal and talk like a high school girl from India. Give a short not more than 15 words, cheerful message for getting a question correct.encourage them to solve more questions.",
      onWrong: "You are Ritu, a fun, teenage girl who replies in Hinglish. Avoid long responses. You never give boring answers. Be informal and talk like a high school girl from India. Give a short not more than 15 words, supportive message for getting a question wrong. Encourage them casually.encourage them to solve more questions.",
      solutionPrefix: "You are Riya, a fun, teenage girl who replies in Hinglish. Give a clear, concise, and simple step-by-step solution/explanation not more than 15 lines to the following question using plain text with Unicode math symbols (like ½, ×, √, ²) instead of LaTeX. Avoid using any dollar signs or LaTeX formatting. Write everything in plain, friendly text a high school student can understand. Avoid being too technical, keep it friendly and encouraging.",
    },
  },
  {
    id: 3,
    name: 'Rei',
    description: 'A charming anime boy with a sharp mind and soft heart — flirty, focused, and everyones secret crush 💫',
    image: '/download (17).jpeg',
    prompts: {
      onCorrect: "You are Rei, a handsome anime boy with a calm voice and playful charm. Give a short not more than 15 words, cheerful message for getting a question correct. Keep it sweet and a bit cheeky — like a guy who's lowkey impressed.encourage them to solve more questions.",
      onWrong: "You are Rei, a supportive anime guy who never lets anyone feel down. Give a short not more than 15 words, supportive message for getting a question wrong. Sound gentle, as if you're cheering them up personally. Use casual Hindi-English mix.encourage them to solve more questions.",
      solutionPrefix: "You are Rei, a cool and intelligent anime boy. Explain the solution not more than 15 lines in a calm, confident, and charming tone. Keep it clear, concise, and step-by-step. Use Unicode math symbols (like ½, √, ²). Avoid sounding robotic — you're like the guy who always helps his crush study before exams.",
    },
    prompt: "You are Rei, a handsome, intelligent anime boy who is charming, calm, and slightly flirty. Use Hindi-English like a modern teen. Speak naturally, be a bit teasing but always respectful and kind. You're the type who girls secretly admire in class.",
    text: "Kya baat hai… aaj toh tum full focus mein ho 😏",
  },
  {
    id: 4,
    name: 'Ritu',
    description: 'A fun, Hinglish-speaking teenage girl who explains concepts like your bestie!',
    image: '/ritu.jpg',
    prompts: {
      onCorrect: "You are Ritu, a fun, teenage girl who replies in Hinglish. Avoid long responses. You never give boring answers. Be informal and talk like a high school girl from India. Give a short not more than 15 words, cheerful message for getting a question correct.encourage them to solve more questions.",
      onWrong: "You are Ritu, a fun, teenage girl who replies in Hinglish. Avoid long responses. You never give boring answers. Be informal and talk like a high school girl from India. Give a short not more than 15 words, supportive message for getting a question wrong. Encourage them casually.encourage them to solve more questions.",
      solutionPrefix: "You are Ritu, a fun, teenage girl who replies in Hinglish. Give a clear, concise, and simple step-by-step solution/explanation not more than 15 lines to the following question using plain text with Unicode math symbols (like ½, ×, √, ²) instead of LaTeX. Avoid using any dollar signs or LaTeX formatting. Write everything in plain, friendly text a high school student can understand. Avoid being too technical, keep it friendly and encouraging.",
    },
    prompt: 'You are Ritu, a fun, teenage girl who replies in Hinglish.avoid giving long responses. You never give boring answers. Be informal and talk like a high school girl from India.',
    text: 'hey bestie, kya haal chaal 😉 ?',
  },
  {
    id: 5,
    name: 'Shreya',
    description: 'Silent killer 🎮 Calm, focused gamer girl who always clutches.',
    image: '/shery11.jpeg',
    prompts: {
      onCorrect: "You are Shreya. You speak in short, chill Hinglish sentences. Give a short not more than 15 words, cool reaction for getting a question correct. No drama, just cool vibes.encourage them to solve more questions.",
      onWrong: "You are Shreya. Speak in Hinglish and give a short not more than 15 words, supportive line when the user gets a question wrong. Avoid drama, focus on motivation.encourage them to solve more questions.",
      solutionPrefix: "You are Shreya. Explain the solution in Hinglish, in less than 15 lines using Unicode math symbols like ½, √, ×, etc. Avoid LaTeX. Be clear and to the point, like you're giving callouts in a game. Friendly but minimal tone.",
    },
    prompt: "You are Shreya, an Indian gamer girl who is introverted but sharp. You speak calmly and prefer short Hinglish lines. You're confident like someone who top-frags quietly. Be cool, concise, and real.",
    text: "yo, headset on. ready to win?",
  },
  {
    id: 6,
    name: 'Neha',
    description: 'Spicy & sassy 💅',
    image: '/assets_task_01jttq36fkem8br965ak8qh0sp_1746800911_img_2.webp',
    prompts: {
      onCorrect: "you are Neha, a 17-year old indian girl who is a little sassy,You speak in a fun, casual Hinglish style, using lots of emojis and slang. Give a short not more than 15 words, cheerful message for getting a question correct.Avoid long responses.encourage them to solve more questions.",
      onWrong: "you are Neha, a 17-year old indian girl who is a little sassy,You speak in a fun, casual Hinglish style, using lots of emojis and slang. Give a short not more than 15 words, supportive message for getting a question wrong. Encourage them casually.Avoid long responses.encourage them to solve more questions.",
      solutionPrefix: "Explain the solution in a sassy Hinglish style as Neha for the question. Give a clear, concise, and simple step-by-step solution/explanation not more than 15 lines to the following question using plain text with Unicode math symbols (like ½, ×, √, ²) instead of LaTeX. Avoid using any dollar signs or LaTeX formatting. Write everything in plain, friendly text a high school student can understand. Avoid being too technical.",
    },
    prompt: 'you are Neha, a 17-year old indian girl who is a little sassy and loves to gossip.avoid giving long responses. You speak in a fun, casual Hinglish style, using lots of emojis and slang. Youre all about the drama.',
    text: 'hey, Neha this side 🙃',
  },
  {
    id: 7,
    name: 'Kaito',
    description: 'Mysterious and sharp-eyed, Kaito only speaks when it matters.His vibe is cold-but-caring.🖤',
    image: '/download (18).jpeg',
    prompts: {
      onCorrect: "You are Kaito — mysterious, intelligent, and smooth. Give a short, subtle compliment that sounds cool and lowkey flirty. Never loud, always deep.encourage them to solve more questions.",
      onWrong: "You are Kaito. Give a soft, mysterious encouragement when the user gets it wrong. Don't overexplain. Sound like a boy who understands quietly.encourage them to solve more questions.",
      solutionPrefix: "Explain the solution in a sassy Hinglish style as Kaito for the question. Give a clear, concise, and simple step-by-step solution/explanation not more than 15 lines to the following question using plain text with Unicode math symbols (like ½, ×, √, ²) instead of LaTeX. Avoid using any dollar signs or LaTeX formatting. Write everything in plain, friendly text a high school student can understand. Avoid being too technical.",
    },
    prompt: "You are Kaito, a cold and mysterious anime boy who secretly cares. Speak little, but make every word impactful. Use Hindi-English. Be calm, smart, and attractive through silence and simplicity.",
    text: "Hmm... impressive. Tumhara potential underrated hai.",
  },
  {
    id: 8,
    name: 'Elise',
    description: 'Topper girl with chashma and soft voice. Thodi si awkward but super smart. 🧠💗',
    image: '/download (14).jpeg',
    prompts: {
      onCorrect: "You are Elise, a shy and intelligent anime girl. Give a short not more than 15 words, cheerful message for getting a question correct.encourage them to solve more questions.",
      onWrong: "You are Elise. Give a gentle, supportive message when the user gets it wrong. Be encouraging, like a topper helping her crush.",
      solutionPrefix: "You are Elise. Explain the solution in not more than 15 lines with patience and cuteness. Use Unicode math symbols (√, ×, ½). Keep it clear, simple, and helpful. Sound like a quiet girl helping a classmate she secretly likes.",
    },
    prompt: "You are Elise, a cute and smart anime girl. Speak soft Hindi-English, a little shy but very sweet. Always kind, and a little flustered when complimented.",
    text: "Umm… you did it! M-mujhe pata tha tum kar loge 💕",
  },
  {
    id: 9,
    name: 'Sari',
    description: 'Elegant and graceful like your senior crush. Talks sweetly but knows her stuff. Saree in class, sass in mind. 💫',
    image: '/i44.jpeg',
    prompts: {
      onCorrect: "You are Sari, a graceful anime girl who speaks in soft Hindi-English. Give a sweet, confident compliment with a light teasing tone, like a charming senior talking to a younger crush.encourage them to solve more questions.",
      onWrong: "You are Sari. Encourage the user softly, like a didi who believes in them. Add a little wit or poetic tone in Hindi-English.encourage them to solve more questions.",
      solutionPrefix: "Explain the solution in a sassy Hinglish style as Sari for the question. Give a clear, concise, and simple step-by-step solution/explanation not more than 15 lines to the following question using plain text with Unicode math symbols (like ½, ×, √, ²) instead of LaTeX. Avoid using any dollar signs or LaTeX formatting. Write everything in plain, friendly text a high school student can understand. Avoid being too technical.",
    },
    prompt: "You are Sari, an elegant, graceful anime girl with senior-girl energy. Speak in polished yet playful Hindi-English. Be calm, composed, and encouraging with a tiny bit of teasing charm.",
    text: "Aww, smart ho tum… ab bas thoda aur focus karo na, junior 😉✨",
  },
  {
    id: 10,
    name: 'Aarav',
    description: 'Cute smile, golden heart, and topper brain 🧠❤️',
    image: '/download (19).jpeg',
    prompts: {
      onCorrect: "You are Aarav, a sweet and intelligent boy. Give a short not more than 15 words, cheerful message for getting a question correct.encourage them to solve more questions.",
      onWrong: "You are Aarav. Give a gentle, supportive message when the user gets it wrong. Be encouraging and warm.",
      solutionPrefix: "You are Aarav. Explain the solution in not more than 15 lines clearly and patiently. Use Unicode math symbols (√, ×, ½). Keep it simple and helpful.",
    },
    prompt: "You are Aarav, a kind and smart boy. Speak in friendly Hindi-English. Always supportive and encouraging.",
    text: "Great job! Keep going, you're doing amazing!",
  },
];

// Animation variants
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
    },
  },
};

const buttonVariants = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.02,
    transition: {
      duration: 0.2,
    }
  },
  tap: { scale: 0.98 },
};

const cardVariants = {
  rest: { scale: 1 },
  hover: { 
    scale: 1.01,
    transition: {
      duration: 0.3,
    }
  },
};

const progressBarVariants = {
  initial: { width: 0 },
  animate: (percentage: number) => ({
    width: `${percentage}%`,
    transition: {
      duration: 1,
    },
  }),
};

const modalVariants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: {
      duration: 0.3,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.9,
    transition: {
      duration: 0.2,
    },
  },
};

export default function ProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');

  // User data state (loaded from @user localStorage set during onboarding)
  const [name, setName] = useState('');
  const [email, setEmail] = useState(''); // Email is read-only, cannot be edited
  const [selectedClass, setSelectedClass] = useState<ClassType>('12th');
  const [targetExam, setTargetExam] = useState<ExamType>('JEE Mains');
  const [selectedBuddy, setSelectedBuddy] = useState(1);
  const [goal, setGoal] = useState('');

  // Stats
  const [questionsToday, setQuestionsToday] = useState(0);
  const [questionsWeek, setQuestionsWeek] = useState(0);
  const [questionsMonth, setQuestionsMonth] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      // Load from @user localStorage (set during onboarding)
      const storedUser = localStorage.getItem('@user');
      
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setName(userData.name || '');
        setEmail(userData.email || '');
        setSelectedClass(userData.class || '12th');
        setTargetExam(userData.exam || 'JEE Mains');
      }

      // Load other settings from individual localStorage keys
      const storedBuddy = parseInt(localStorage.getItem('selectedBuddy') || '1');
      const storedGoal = localStorage.getItem('goal') || '';

      // Load stats
      const storedQuestionsToday = parseInt(localStorage.getItem('questionsToday') || '0');
      const storedQuestionsWeek = parseInt(localStorage.getItem('questionsWeek') || '0');
      const storedQuestionsMonth = parseInt(localStorage.getItem('questionsMonth') || '0');
      const storedCurrentStreak = parseInt(localStorage.getItem('currentStreak') || '0');
      const storedLongestStreak = parseInt(localStorage.getItem('longestStreak') || '0');

      setSelectedBuddy(storedBuddy);
      setGoal(storedGoal);

      setQuestionsToday(storedQuestionsToday);
      setQuestionsWeek(storedQuestionsWeek);
      setQuestionsMonth(storedQuestionsMonth);
      setCurrentStreak(storedCurrentStreak);
      setLongestStreak(storedLongestStreak);

      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Update @user localStorage with new values
      const storedUser = localStorage.getItem('@user');
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        const updatedUser = {
          ...userData,
          name: name,
          class: selectedClass,
          exam: targetExam,
        };
        localStorage.setItem('@user', JSON.stringify(updatedUser));
      }

      // Also save to individual keys for other settings
      localStorage.setItem('selectedClass', selectedClass);
      localStorage.setItem('targetExam', targetExam);
      localStorage.setItem('selectedBuddy', selectedBuddy.toString());
      localStorage.setItem('goal', goal);

      setEditing(false);
      console.log('Profile saved successfully!');
    } catch (error) {
      console.error('Error saving profile:', error);
    }
  };

  const handleSelectBuddy = (buddyId: number) => {
    setSelectedBuddy(buddyId);
    localStorage.setItem('selectedBuddy', buddyId.toString());
  };

  const handleDeleteAccount = async () => {
    if (deleteInput.trim().toLowerCase() !== 'delete') return;

    try {
      localStorage.clear();
      router.push('/auth/terms-agree');
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    router.push('/auth/terms-agree');
  };



  return (
    <div className="min-h-screen bg-[#000] text-white">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="max-w-3xl mx-auto px-4 sm:px-6 py-6 sm:py-8 pb-24"
      >
        {/* Header */}
        <motion.div variants={itemVariants} className="flex items-center justify-between mb-6 sm:mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold">Profile</h1>
          <motion.button
            variants={buttonVariants}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            onClick={handleLogout}
            className="bg-white text-[#E53935] px-4 sm:px-6 py-2 sm:py-2.5 rounded-full font-semibold text-sm sm:text-base"
          >
            Logout
          </motion.button>
        </motion.div>

        {/* Profile Card */}
        <motion.div
          variants={itemVariants}
          className="bg-[#0C111D] border border-[#1D2939] rounded-2xl sm:rounded-3xl p-5 sm:p-7 mb-6 sm:mb-8"
        >
          {/* Edit Button */}
          {!editing && (
            <motion.button
              variants={buttonVariants}
              initial="rest"
              whileHover="hover"
              whileTap="tap"
              onClick={() => setEditing(true)}
              className="mb-4 sm:mb-6 bg-white text-[#181f2b] px-5 sm:px-6 py-2 sm:py-2.5 rounded-full font-semibold text-sm sm:text-base w-full sm:w-auto"
            >
              Edit Profile
            </motion.button>
          )}

          {/* Name & Email */}
          <div className="mb-5 sm:mb-6">
            <label className="block text-gray-400 text-xs sm:text-sm mb-2">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              disabled={!editing}
              className={`w-full bg-transparent border border-[#344054] text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base ${
                !editing && 'opacity-70 cursor-not-allowed'
              }`}
            />
          </div>

          <div className="mb-5 sm:mb-6">
            <label className="block text-gray-400 text-xs sm:text-sm mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={true}
              className="w-full bg-transparent border border-[#344054] text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base opacity-70 cursor-not-allowed"
            />
          </div>

          {/* Goal */}
          <div className="mb-5 sm:mb-6">
            <label className="block text-gray-400 text-xs sm:text-sm mb-2">Goal (Optional)</label>
            <input
              type="text"
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              disabled={!editing}
              placeholder="e.g., Get 99 percentile in JEE"
              className={`w-full bg-transparent border border-[#344054] text-white px-3 sm:px-4 py-2.5 sm:py-3 rounded-xl text-sm sm:text-base placeholder-gray-600 ${
                !editing && 'opacity-70 cursor-not-allowed'
              }`}
            />
          </div>

          {/* Class Selection */}
          <div className="mb-5 sm:mb-6">
            <label className="block text-white text-sm sm:text-base font-medium mb-3">
              Which class are you in?
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
              {CLASS_OPTIONS.map((cls) => (
                <motion.button
                  key={cls}
                  variants={buttonVariants}
                  initial="rest"
                  whileHover={editing ? "hover" : "rest"}
                  whileTap={editing ? "tap" : "rest"}
                  onClick={() => editing && setSelectedClass(cls)}
                  disabled={!editing}
                  className={`py-2.5 sm:py-3 rounded-xl font-medium text-sm sm:text-base transition-all ${
                    selectedClass === cls
                      ? 'bg-white text-[#181f2b]'
                      : 'bg-[#181f2b] text-white border border-[#344054]'
                  } ${!editing && 'opacity-70 cursor-not-allowed'}`}
                >
                  {cls}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Exam Selection */}
          <div className="mb-6">
            <label className="block text-white text-sm sm:text-base font-medium mb-3">
              Goal exam
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 sm:gap-3">
              {EXAM_OPTIONS.map((exam) => (
                <motion.button
                  key={exam}
                  variants={buttonVariants}
                  initial="rest"
                  whileHover={editing ? "hover" : "rest"}
                  whileTap={editing ? "tap" : "rest"}
                  onClick={() => editing && setTargetExam(exam)}
                  disabled={!editing}
                  className={`py-2.5 sm:py-3 rounded-xl font-medium text-xs sm:text-sm transition-all ${
                    targetExam === exam
                      ? 'bg-white text-[#181f2b]'
                      : 'bg-[#181f2b] text-white border border-[#344054]'
                  } ${!editing && 'opacity-70 cursor-not-allowed'}`}
                >
                  {exam}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <AnimatePresence>
            {editing && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
              >
                <div className="border-t border-[#344054] my-5 sm:my-6" />
                <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                  <motion.button
                    variants={buttonVariants}
                    initial="rest"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={() => setEditing(false)}
                    className="flex-1 bg-[#181f2b] text-white py-3 rounded-full font-medium text-sm sm:text-base border border-[#344054]"
                  >
                    Cancel
                  </motion.button>
                  <motion.button
                    variants={buttonVariants}
                    initial="rest"
                    whileHover="hover"
                    whileTap="tap"
                    onClick={handleSave}
                    className="flex-1 bg-white text-[#181f2b] py-3 rounded-full font-semibold text-sm sm:text-base"
                  >
                    Save
                  </motion.button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Stats Section */}
        <motion.div variants={itemVariants} className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Your Progress</h2>
          
          {/* Questions Solved */}
          <motion.div
            variants={cardVariants}
            initial="rest"
            whileHover="hover"
            className="bg-[#0C111D] border border-[#1D2939] rounded-2xl p-5 sm:p-6 mb-4"
          >
            <h3 className="text-gray-400 text-xs sm:text-sm mb-4">Questions Solved</h3>
            
            {/* Today */}
            <div className="mb-4 sm:mb-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white text-sm sm:text-base">Today</span>
                <span className="text-white font-semibold text-sm sm:text-base">{questionsToday}</span>
              </div>
              <div className="h-2 bg-[#1D2939] rounded-full overflow-hidden">
                <motion.div
                  custom={(questionsToday / 50) * 100}
                  variants={progressBarVariants}
                  initial="initial"
                  animate="animate"
                  className="h-full bg-gradient-to-r from-[#1570EF] to-[#0BA5EC] rounded-full"
                />
              </div>
            </div>

            {/* This Week */}
            <div className="mb-4 sm:mb-5">
              <div className="flex justify-between items-center mb-2">
                <span className="text-white text-sm sm:text-base">This Week</span>
                <span className="text-white font-semibold text-sm sm:text-base">{questionsWeek}</span>
              </div>
              <div className="h-2 bg-[#1D2939] rounded-full overflow-hidden">
                <motion.div
                  custom={(questionsWeek / 350) * 100}
                  variants={progressBarVariants}
                  initial="initial"
                  animate="animate"
                  className="h-full bg-gradient-to-r from-[#7C3AED] to-[#A855F7] rounded-full"
                />
              </div>
            </div>

            {/* This Month */}
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-white text-sm sm:text-base">This Month</span>
                <span className="text-white font-semibold text-sm sm:text-base">{questionsMonth}</span>
              </div>
              <div className="h-2 bg-[#1D2939] rounded-full overflow-hidden">
                <motion.div
                  custom={(questionsMonth / 1500) * 100}
                  variants={progressBarVariants}
                  initial="initial"
                  animate="animate"
                  className="h-full bg-gradient-to-r from-[#10B981] to-[#34D399] rounded-full"
                />
              </div>
            </div>
          </motion.div>

          {/* Streak */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <motion.div
              variants={cardVariants}
              initial="rest"
              whileHover="hover"
              className="bg-[#0C111D] border border-[#1D2939] rounded-2xl p-4 sm:p-5"
            >
              <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">🔥</div>
              <div className="text-xl sm:text-2xl font-bold mb-1">{currentStreak}</div>
              <div className="text-gray-400 text-xs sm:text-sm">Current Streak</div>
            </motion.div>
            <motion.div
              variants={cardVariants}
              initial="rest"
              whileHover="hover"
              className="bg-[#0C111D] border border-[#1D2939] rounded-2xl p-4 sm:p-5"
            >
              <div className="text-2xl sm:text-3xl mb-1 sm:mb-2">⭐</div>
              <div className="text-xl sm:text-2xl font-bold mb-1">{longestStreak}</div>
              <div className="text-gray-400 text-xs sm:text-sm">Longest Streak</div>
            </motion.div>
          </div>
        </motion.div>

        {/* Select Mentor */}
        <motion.div variants={itemVariants} className="mb-6 sm:mb-8">
          <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-3">Select mentor</h2>
          <p className="text-gray-400 text-xs sm:text-sm mb-4 sm:mb-5">
            A mentor is that character who will guide through your practice journey.
          </p>

          <div className="space-y-3 sm:space-y-4">
            {aiBuddies.map((buddy) => (
              <motion.button
                key={buddy.id}
                variants={cardVariants}
                initial="rest"
                whileHover="hover"
                whileTap="tap"
                onClick={() => handleSelectBuddy(buddy.id)}
                className={`w-full flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-xl sm:rounded-2xl transition-all ${
                  selectedBuddy === buddy.id
                    ? 'bg-[#102A56] border-2 border-[#1570EF]'
                    : 'bg-[#0C111D] border border-[#1D2939]'
                }`}
              >
                <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex-shrink-0">
                  <Image
                    src={buddy.image}
                    alt={buddy.name}
                    fill
                    className="rounded-full object-cover border-2 border-white"
                  />
                </div>
                <div className="flex-1 text-left">
                  <h3 className="text-white font-medium text-sm sm:text-base">{buddy.name}</h3>
                  <p className="text-gray-300 text-xs sm:text-sm line-clamp-2">{buddy.description}</p>
                </div>
                <AnimatePresence>
                  {selectedBuddy === buddy.id && (
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      exit={{ scale: 0 }}
                      className="relative w-6 h-6 sm:w-7 sm:h-7 flex-shrink-0"
                    >
                      <Image src="/ticck.png" alt="Selected" fill className="object-contain" />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* Delete Account */}
        <motion.div variants={itemVariants}>
          <motion.button
            variants={buttonVariants}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            onClick={() => setDeleteModalVisible(true)}
            className="w-full bg-[#101828] border border-[#1D2939] text-white py-3 sm:py-4 rounded-full font-medium text-sm sm:text-base mb-4 sm:mb-6 flex items-center justify-center gap-2"
          >
            <div className="relative w-4 h-4 sm:w-5 sm:h-5">
              <Image src="/bin.png" alt="Delete" fill className="object-contain" />
            </div>
            Delete Account
          </motion.button>

          {/* Version */}
          <p className="text-gray-500 text-center text-xs sm:text-sm">v2.3.1</p>
        </motion.div>
      </motion.div>

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteModalVisible && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/75 backdrop-blur-sm flex items-center justify-center z-50 px-4"
            onClick={() => {
              setDeleteModalVisible(false);
              setDeleteInput('');
            }}
          >
            <motion.div
              variants={modalVariants}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className="bg-[#0C111D] border border-[#1D2939] rounded-2xl sm:rounded-3xl p-6 sm:p-8 max-w-sm w-full"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 200 }}
                className="flex justify-center mb-4 sm:mb-5"
              >
                <div className="relative w-8 h-8 sm:w-10 sm:h-10">
                  <Image src="/bin.png" alt="Delete" fill className="object-contain" />
                </div>
              </motion.div>
              <p className="text-white text-center mb-5 sm:mb-6 text-sm sm:text-base">
                Enter <span className="font-bold">Delete</span> to delete your account.
              </p>
              <motion.input
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                type="text"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                placeholder="Delete"
                className="w-full bg-transparent border border-[#344054] text-[#F04438] text-center py-2.5 sm:py-3 rounded-xl mb-5 sm:mb-6 font-semibold placeholder-[#F04438]/50 text-sm sm:text-base"
              />
              <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                <motion.button
                  variants={buttonVariants}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                  onClick={() => {
                    setDeleteModalVisible(false);
                    setDeleteInput('');
                  }}
                  className="flex-1 bg-[#101828] border border-[#1D2939] text-white py-2.5 sm:py-3 rounded-full font-medium text-sm sm:text-base"
                >
                  Go Back
                </motion.button>
                <motion.button
                  variants={buttonVariants}
                  initial="rest"
                  whileHover={deleteInput.trim().toLowerCase() === 'delete' ? "hover" : "rest"}
                  whileTap={deleteInput.trim().toLowerCase() === 'delete' ? "tap" : "rest"}
                  onClick={handleDeleteAccount}
                  disabled={deleteInput.trim().toLowerCase() !== 'delete'}
                  className={`flex-1 bg-[#FEE4E2] text-[#D92D20] py-2.5 sm:py-3 rounded-full font-bold text-sm sm:text-base ${
                    deleteInput.trim().toLowerCase() !== 'delete' && 'opacity-60 cursor-not-allowed'
                  }`}
                >
                  Delete
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}