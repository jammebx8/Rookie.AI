'use client'

import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronLeft, FiBookmark, FiSearch, FiSmile, FiX, FiArrowRight, FiArrowLeft, FiAward } from 'react-icons/fi';
import { IoTimeOutline, IoBookmark } from 'react-icons/io5';
import imagepath from '../../public/src/constants/imagepath';
import { supabase } from '../../public/src/utils/supabase';
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';
import Confetti from 'react-confetti';
import useWindowSize from 'react-use/lib/useWindowSize';

type Question = {
  question: string;
  question_id: string;
  question_text: string;
  option_A: string;
  option_B: string;
  option_C: string;
  option_D: string;
  correct_option: string | null;
  exam_shift: string;
  source_url: string;
  solution: string;
  sol_ai?: string;
  year?: number | string;
};

const API_BASE = 'https://rookie-backend.vercel.app/api';

const WEAK_CONCEPTS_KEY = 'userWeakConcepts';
const BOOKMARKS_KEY = 'bookmarkedQuestions';
const SESSION_RESPONSES_KEY = 'questionSessionResponses_v1';

export default function QuestionViewerPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chapterTitle = (searchParams.get('chapterTitle') || '') as string;
  const subjectName = (searchParams.get('subjectName') || 'Physics') as string;
  const imageKey = (searchParams.get('imageKey') || '') as string;

  const [loading, setLoading] = useState<boolean>(true);
  const [rookieCoins, setRookieCoins] = useState<number>(0);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [shownIndices, setShownIndices] = useState<Set<number>>(new Set([0]));
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [motivation, setMotivation] = useState<string>('');
  const timerRef = useRef<number | null>(null);
  const [timer, setTimer] = useState<number>(0);
  const [solution, setSolution] = useState<string>('');
  const [buddy, setBuddy] = useState<any>(null);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [aiFollowup, setAIFollowup] = useState<string | null>(null);
  const [aiFollowupLoading, setAIFollowupLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [bookmarked, setBookmarked] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);
  const [coinsEarned, setCoinsEarned] = useState<number>(0);
  const [showCoinReward, setShowCoinReward] = useState<boolean>(false);
  const [solutionLoading, setSolutionLoading] = useState<boolean>(false);
  const [motivationLoading, setMotivationLoading] = useState<boolean>(false);

  // Dig Deeper states
  const [isDigging, setIsDigging] = useState<boolean>(false);
  const [conceptMCQ, setConceptMCQ] = useState<any>(null);
  const [conceptHistory, setConceptHistory] = useState<any[]>([]);
  const [conceptLoading, setConceptLoading] = useState<boolean>(false);
  const [conceptFeedback, setConceptFeedback] = useState<string>('');
  const [conceptDone, setConceptDone] = useState<boolean>(false);
  const [digDeepSelected, setDigDeepSelected] = useState<string | null>(null);
  const [prevDigResult, setPrevDigResult] = useState<{ status: 'correct' | 'incorrect' | ''; explanation?: string; answer?: string } | null>(null);

  const [solutionRequested, setSolutionRequested] = useState<boolean>(false);
  const [determiningAnswer, setDeterminingAnswer] = useState<boolean>(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);
  const { width, height } = useWindowSize();
  const questionStartTime = useRef<number>(Date.now());

  // ---------- Fetch questions from Supabase ----------
  useEffect(() => {
    const fetchQuestionsFromSupabase = async () => {
      if (!chapterTitle) return;
      
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from(chapterTitle)
          .select('*')
          .order('question', { ascending: true });

        if (error) {
          console.error('Error fetching questions from Supabase:', error);
          setQuestions([]);
          return;
        }

        if (data && data.length > 0) {
          setQuestions(data as Question[]);
        } else {
          setQuestions([]);
        }
      } catch (err) {
        console.error('Error fetching questions:', err);
        setQuestions([]);
      } finally {
        setLoading(false);
      }
    };

    fetchQuestionsFromSupabase();
  }, [chapterTitle]);

  // ---------- Load user's rookie coins ----------
  useEffect(() => {
    const loadUserCoins = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('users')
            .select('rookieCoinsEarned')
            .eq('id', user.id)
            .single();

          if (!error && data) {
            setRookieCoins(data.rookieCoinsEarned || 0);
          }
        }
      } catch (err) {
        console.error('Error loading user coins:', err);
      }
    };

    loadUserCoins();
  }, []);

  // ---------- Helpers for local/session storage ----------
  const saveSessionForCurrent = async (partial: Record<string, any> = {}) => {
    try {
      const stored = localStorage.getItem(SESSION_RESPONSES_KEY);
      const obj = stored ? JSON.parse(stored) : {};
      if (!obj[chapterTitle]) obj[chapterTitle] = {};
      obj[chapterTitle][String(currentIndex)] = {
        ...(obj[chapterTitle][String(currentIndex)] || {}),
        selectedOption,
        isCorrect,
        motivation,
        solutionRequested,
        solution,
        aiFollowup,
        ...partial,
      };
      localStorage.setItem(SESSION_RESPONSES_KEY, JSON.stringify(obj));
    } catch (e) {
      // ignore
    }
  };

  const loadSessionForIndex = (index: number) => {
    try {
      const stored = localStorage.getItem(SESSION_RESPONSES_KEY);
      if (!stored) return null;
      const obj = JSON.parse(stored);
      const chapterObj = obj[chapterTitle];
      if (!chapterObj) return null;
      return chapterObj[String(index)] || null;
    } catch (e) {
      return null;
    }
  };

  const clearSession = () => {
    try {
      localStorage.removeItem(SESSION_RESPONSES_KEY);
    } catch (e) {
      // ignore
    }
  };

  // ---------- Bookmark handling ----------
  useEffect(() => {
    if (questions.length === 0) return;
    try {
      const stored = localStorage.getItem(BOOKMARKS_KEY);
      if (!stored) {
        setBookmarked(false);
        return;
      }
      const arr = JSON.parse(stored) as any[];
      const currentQuestion = questions[currentIndex];
      if (!currentQuestion) return;
      const isBookmarked = arr.some(
        (q) =>
          q.question_id === currentQuestion.question_id &&
          q.chapterTitle === chapterTitle &&
          q.subjectName === subjectName
      );
      setBookmarked(isBookmarked);
    } catch (e) {
      setBookmarked(false);
    }
  }, [currentIndex, questions, chapterTitle, subjectName]);

  const handleBookmark = () => {
    try {
      const currentQuestion = questions[currentIndex];
      if (!currentQuestion) return;
      const stored = localStorage.getItem(BOOKMARKS_KEY);
      let arr = stored ? JSON.parse(stored) : [];

      if (!bookmarked) {
        arr.push({
          ...currentQuestion,
          chapterTitle,
          subjectName,
          imageKey,
        });
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(arr));
        setBookmarked(true);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 2000);
      } else {
        arr = arr.filter(
          (q: any) =>
            !(q.question_id === currentQuestion.question_id &&
              q.chapterTitle === chapterTitle &&
              q.subjectName === subjectName)
        );
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(arr));
        setBookmarked(false);
      }
    } catch (e) {
      console.error('Error handling bookmark:', e);
    }
  };

  // ---------- Timer ----------
  useEffect(() => {
    if (timerRef.current !== null) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (selectedOption === null && questions[currentIndex]) {
      const start = Date.now();
      questionStartTime.current = start;
      timerRef.current = window.setInterval(() => {
        setTimer(Math.floor((Date.now() - start) / 1000));
      }, 1000);
    }

    return () => {
      if (timerRef.current !== null) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [selectedOption, currentIndex, questions]);

  // ---------- Load previous session ----------
  useEffect(() => {
    if (!questions.length) return;
    const prev = loadSessionForIndex(currentIndex);
    if (prev) {
      setSelectedOption(prev.selectedOption || null);
      setIsCorrect(prev.isCorrect ?? null);
      setMotivation(prev.motivation || '');
      setSolution(prev.solution || '');
      setAIFollowup(prev.aiFollowup || null);
      setSolutionRequested(prev.solutionRequested || false);
    } else {
      setSelectedOption(null);
      setIsCorrect(null);
      setMotivation('');
      setSolution('');
      setAIFollowup(null);
      setSolutionRequested(false);
      setIsDigging(false);
      setConceptMCQ(null);
      setPrevDigResult(null);
      setDigDeepSelected(null);
    }
  }, [currentIndex, questions, chapterTitle]);

  // ---------- Calculate coin reward ----------
  const calculateCoinReward = (timeSpent: number, correct: boolean): number => {
    if (!correct) return 0;

    // Time-based scoring (faster = more coins)
    let timeScore = 0;
    if (timeSpent <= 30) timeScore = 5;
    else if (timeSpent <= 60) timeScore = 4;
    else if (timeSpent <= 90) timeScore = 3;
    else if (timeSpent <= 120) timeScore = 2;
    else timeScore = 1;

    // Accuracy bonus
    const accuracyBonus = 5;

    return Math.min(timeScore + accuracyBonus, 10);
  };

  // ---------- Update rookie coins in Supabase ----------
  const updateRookieCoins = async (coinsToAdd: number) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const newTotal = rookieCoins + coinsToAdd;
        const { error } = await supabase
          .from('users')
          .update({ rookieCoinsEarned: newTotal })
          .eq('id', user.id);

        if (!error) {
          setRookieCoins(newTotal);
        }
      }
    } catch (err) {
      console.error('Error updating rookie coins:', err);
    }
  };

  // ---------- Generate AI Solution ----------
  const generateAISolution = async (questionData: Question): Promise<string> => {
    try {
      setSolutionLoading(true);
      
      // Check if AI solution already exists
      if (questionData.sol_ai) {
        return questionData.sol_ai;
      }

      const response = await axios.post(`${API_BASE}/solution`, {
        action: 'generate_solution',
        question_text: questionData.question_text,
        option_A: questionData.option_A,
        option_B: questionData.option_B,
        option_C: questionData.option_C,
        option_D: questionData.option_D,
        solution: questionData.solution,
        correct_option: questionData.correct_option,
      });

      const aiSolution = response.data.solution || questionData.solution;

      // Save AI solution to Supabase
      await supabase
        .from(chapterTitle)
        .update({ sol_ai: aiSolution })
        .eq('question_id', questionData.question_id);

      return aiSolution;
    } catch (err) {
      console.error('Error generating AI solution:', err);
      return questionData.solution;
    } finally {
      setSolutionLoading(false);
    }
  };

  // ---------- Generate motivation message ----------
  const generateMotivation = async (correct: boolean) => {
    try {
      setMotivationLoading(true);
      const message = correct
        ? 'Generate a short, encouraging message for getting a question right'
        : 'Generate a short, motivating message for getting a question wrong';

      const response = await axios.post(`${API_BASE}/motivation`, {
        message,
      });

      const motivationText = response.data.choices?.[0]?.message?.content || 
        (correct ? 'Great job! Keep it up!' : 'Don\'t worry, learn from this!');
      
      setMotivation(motivationText);
      return motivationText;
    } catch (err) {
      console.error('Error generating motivation:', err);
      const fallback = correct ? 'Excellent work!' : 'Keep practicing!';
      setMotivation(fallback);
      return fallback;
    } finally {
      setMotivationLoading(false);
    }
  };

  // ---------- Handle Option Selection ----------
  const handleOptionClick = async (option: string) => {
    if (selectedOption !== null) return;

    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    const timeSpent = Math.floor((Date.now() - questionStartTime.current) / 1000);
    setSelectedOption(option);

    // Determine correct answer if not already set
    let correctAnswer = currentQuestion.correct_option;
    if (!correctAnswer) {
      setDeterminingAnswer(true);
      try {
        const response = await axios.post(`${API_BASE}/solution`, {
          action: 'determine_answer',
          question_text: currentQuestion.question_text,
          option_A: currentQuestion.option_A,
          option_B: currentQuestion.option_B,
          option_C: currentQuestion.option_C,
          option_D: currentQuestion.option_D,
          solution: currentQuestion.solution,
        });

        correctAnswer = response.data.correct_answer;

        // Update Supabase with correct answer
        await supabase
          .from(chapterTitle)
          .update({ correct_option: correctAnswer })
          .eq('question_id', currentQuestion.question_id);

        currentQuestion.correct_option = correctAnswer;
      } catch (err) {
        console.error('Error determining answer:', err);
      } finally {
        setDeterminingAnswer(false);
      }
    }

    const correct = option === correctAnswer;
    setIsCorrect(correct);

    // Calculate and award coins
    const coins = calculateCoinReward(timeSpent, correct);
    setCoinsEarned(coins);

    if (correct && coins > 0) {
      setShowConfetti(true);
      setShowCoinReward(true);
      setTimeout(() => setShowConfetti(false), 5000);
      setTimeout(() => setShowCoinReward(false), 3000);
      await updateRookieCoins(coins);
    }

    // Generate motivation
    await generateMotivation(correct);

    // Generate AI solution
    const aiSolution = await generateAISolution(currentQuestion);
    setSolution(aiSolution);
    setSolutionRequested(true);

    // Scroll to solution
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 300);

    await saveSessionForCurrent({
      selectedOption: option,
      isCorrect: correct,
      solution: aiSolution,
      solutionRequested: true,
    });
  };

  // ---------- AI Followup (Explain like 5yr / Better Understanding) ----------
  const handleAIFollowup = async (type: '5yr' | 'better') => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    setAIFollowupLoading(true);
    setAIFollowup(null);

    try {
      const action = type === '5yr' ? 'explain_5yr' : 'better_understanding';
      const response = await axios.post(`${API_BASE}/solution`, {
        action,
        question_text: currentQuestion.question_text,
        solution: currentQuestion.solution,
      });

      const explanation = response.data.explanation || 'Could not generate explanation.';
      setAIFollowup(explanation);
    } catch (err) {
      console.error('Error generating AI followup:', err);
      setAIFollowup('Error generating explanation. Please try again.');
    } finally {
      setAIFollowupLoading(false);
    }
  };

  // ---------- Dig Deeper ----------
  const handleDigDeeper = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    setIsDigging(true);
    setConceptLoading(true);
    setConceptMCQ(null);
    setPrevDigResult(null);

    try {
      const response = await axios.post(`${API_BASE}/solution`, {
        action: 'dig_deeper',
        question_text: currentQuestion.question_text,
        solution: currentQuestion.solution,
      });

      setConceptMCQ(response.data);
    } catch (err) {
      console.error('Error digging deeper:', err);
      setConceptFeedback('Error generating concept question.');
    } finally {
      setConceptLoading(false);
    }
  };

  const handleConceptUserResponse = (userAnswer: string) => {
    if (!conceptMCQ || !conceptMCQ.mcq) return;
    setDigDeepSelected(userAnswer);

    if (userAnswer === 'I_am_not_sure') {
      setPrevDigResult({
        status: 'incorrect',
        explanation: conceptMCQ.mcq.explanation,
        answer: conceptMCQ.mcq.correctAnswer,
      });
      return;
    }

    const correct = userAnswer === conceptMCQ.mcq.correctAnswer;
    if (correct) {
      setPrevDigResult({ status: 'correct' });
      setConceptFeedback('Correct! Great understanding.');
    } else {
      setPrevDigResult({
        status: 'incorrect',
        explanation: conceptMCQ.mcq.explanation,
        answer: conceptMCQ.mcq.correctAnswer,
      });
    }
  };

  const handleExitDigDeeper = () => {
    setIsDigging(false);
    setConceptMCQ(null);
    setPrevDigResult(null);
    setDigDeepSelected(null);
    setConceptFeedback('');
  };

  // ---------- Navigation ----------
  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setShownIndices((prev) => new Set(prev).add(currentIndex + 1));
    }
  };

  const handleBack = () => {
    router.back();
  };

  // ---------- Render LaTeX ----------
  const renderLatex = (text: string) => {
    if (!text) return null;

    const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/);
    
    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        const latex = part.slice(2, -2);
        return <BlockMath key={index} math={latex} />;
      } else if (part.startsWith('$') && part.endsWith('$')) {
        const latex = part.slice(1, -1);
        return <InlineMath key={index} math={latex} />;
      }
      return <span key={index}>{part}</span>;
    });
  };

  // ---------- Typing effect for AI text ----------
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (solution && solutionRequested) {
      setIsTyping(true);
      setDisplayedText('');
      let index = 0;
      const interval = setInterval(() => {
        setDisplayedText(solution.slice(0, index));
        index++;
        if (index > solution.length) {
          clearInterval(interval);
          setIsTyping(false);
        }
      }, 10);

      return () => clearInterval(interval);
    }
  }, [solution, solutionRequested]);

  // ---------- Main Render ----------
  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-2 border-white/20 border-t-white animate-spin mx-auto mb-4" />
          <div>Loading questions...</div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-black text-white pb-24">
           {/* Confetti - full page with fade effect */}
      {showConfetti && (
        <motion.div
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 1.5, delay: 3 }}
          style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', pointerEvents: 'none', zIndex: 9999 }}
        >
          <Confetti
            width={width}
            height={typeof window !== 'undefined' ? document.documentElement.scrollHeight : height}
            recycle={false}
            numberOfPieces={500}
            style={{ position: 'fixed', top: 0, left: 0 }}
          />
        </motion.div>
        )}

      {/* Coin Reward Display */}
      <AnimatePresence>
        {showCoinReward && coinsEarned > 0 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: -50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.5, y: -50 }}
            className="fixed top-20 left-1/2 transform -translate-x-1/2 z-50 bg-gradient-to-r from-yellow-500 to-orange-500 px-8 py-4 rounded-2xl shadow-2xl"
          >
            <div className="flex items-center gap-3">
              <FiAward size={32} className="text-white" />
              <div>
                <div className="text-2xl font-bold text-white">+{coinsEarned} Rookie Coins!</div>
                <div className="text-sm text-white/90">Total: {rookieCoins + coinsEarned}</div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="sticky top-0 z-30 bg-black/95 backdrop-blur-sm border-b border-[#232B3B]">
        <div className="flex items-center justify-between px-6 py-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleBack}
            className="w-10 h-10 rounded-xl bg-[#151B27] border border-[#1D2939] flex items-center justify-center"
          >
            <FiChevronLeft size={20} />
          </motion.button>

          <div className="flex items-center gap-4 ">
          
          
            <div className="text-center ">
              <h1 className="text-lg font-bold">{chapterTitle}</h1>
              <p className="text-xs text-gray-400">{subjectName}</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-2 bg-[#151B27] border border-[#1D2939] rounded-xl">
              <FiAward className="text-yellow-500" />
              <span className="font-semibold">{rookieCoins}</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-2 bg-[#151B27] border border-[#1D2939] rounded-xl">
              <IoTimeOutline />
              <span>{Math.floor(timer / 60)}:{(timer % 60).toString().padStart(2, '0')}</span>
            </div>
          </div>
        </div>

        <div className="px-6 pb-3">
          <div className="text-xs text-gray-400">
            Question {currentIndex + 1} of {questions.length}
          </div>
          <div className="mt-2 h-1 bg-[#151B27] rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-[#fff]"
              initial={{ width: 0 }}
              animate={{ width: `${((currentIndex + 1) / questions.length) * 100}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 sm:px-8 md:px-16 lg:px-32 xl:px-60 pt-10 pb-10">
        {!currentQuestion ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No questions available</p>
          </div>
        ) : (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
                  <div className="mb-6">
              <div className="text-sm text-gray-400 mb-2">
                {currentQuestion.exam_shift && `${currentQuestion.exam_shift}`}
            
              </div>
              <div className="text-xl font-medium leading-relaxed">
                {renderLatex(currentQuestion.question_text)}
              </div>
              {currentQuestion.source_url && (
                <a 
                  href={currentQuestion.source_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-400 hover:underline mt-2 inline-block"
                >
                  View Source
                </a>
              )}
            </div>
       
      

            {/* Options */}
            {selectedOption === null ? (
              <div className="space-y-3">
                {['A', 'B', 'C', 'D'].map((option) => (
                  <motion.button
                    key={option}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleOptionClick(option)}
                    className="w-full text-left rounded-xl p-4 bg-[#0A0E17] border border-[#1D2939] hover:border-blue-500/50 transition-colors flex items-center gap-4"
                  >
                    <div className="w-10 h-10 rounded-lg bg-[#151B27] border border-[#262F4C] flex items-center justify-center font-semibold">
                      {option}
                    </div>
                    <div className="flex-1">
                      {renderLatex(currentQuestion[`option_${option}` as keyof Question] as string)}
                    </div>
                  </motion.button>
                ))}
              </div>
            ) : (
              <>
                {/* Answered Options */}
                <div className="space-y-3">
                  {['A', 'B', 'C', 'D'].map((option) => {
                    const isSelected = selectedOption === option;
                    const isCorrectOption = option === currentQuestion.correct_option;
                    const showCorrect = isCorrectOption;
                    const showIncorrect = isSelected && !isCorrectOption;

                    return (
                      <motion.div
                        key={option}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`w-full text-left rounded-xl p-4 flex items-center gap-4 ${
                          showCorrect
                            ? 'bg-[#04271C] border-2 border-[#1DC97A]'
                            : showIncorrect
                            ? 'bg-[#2D0A0A] border-2 border-[#DC2626]'
                            : 'bg-[#0A0E17] border border-[#1D2939]'
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold ${
                            showCorrect
                              ? 'bg-[#1DC97A] text-black'
                              : showIncorrect
                              ? 'bg-[#DC2626] text-white'
                              : 'bg-[#151B27] border border-[#262F4C]'
                          }`}
                        >
                          {option}
                        </div>
                        <div className="flex-1">
                          {renderLatex(currentQuestion[`option_${option}` as keyof Question] as string)}
                        </div>
                        {showCorrect && <FiCheckIcon />}
                      </motion.div>
                    );
                  })}
                </div>

                {/* Determining Answer Loader */}
                {determiningAnswer && (
                  <div className="flex items-center justify-center gap-3 py-4">
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                    />
                    <span className="text-gray-400">Determining correct answer...</span>
                  </div>
                )}

                {/* Motivation */}
                {!determiningAnswer && (
                  <>
                    {motivationLoading ? (
                      <div className="bg-gradient-to-r from-[#47006A] to-[#0031D0] rounded-2xl p-6">
                        <div className="flex items-center gap-3">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            className="w-6 h-6 border-2 border-white border-t-transparent rounded-full"
                          />
                          <span>Generating...</span>
                        </div>
                      </div>
                    ) : (
                      motivation && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="bg-gradient-to-r from-[#47006A] to-[#0031D0] rounded-2xl p-6"
                        >
                          <p className="text-lg font-medium">{motivation}</p>
                        </motion.div>
                      )
                    )}

                    {/* Solution */}
                    {solutionRequested && (
                      <div className="bg-[#0A0E17] border border-[#1D2939] rounded-2xl p-6">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="text-xl font-bold">Solution</h3>
                        </div>

                        {solutionLoading ? (
                          <div className="flex items-center gap-3 py-8">
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full"
                            />
                            <span className="text-gray-400">Generating solution...</span>
                          </div>
                        ) : (
                          <div className="prose prose-invert max-w-none">
                            <div className="text-gray-200 leading-relaxed whitespace-pre-wrap">
                              {renderLatex(solution)}
                            </div>
                          </div>
                        )}

                        {/* AI Followup buttons */}
                        {!solutionLoading && solution && (
                          <div className="mt-6">
                            {!aiFollowup && !aiFollowupLoading && (
                              <div className="flex flex-wrap gap-3 ">
                                <motion.button
                                  whileTap={{ scale: 0.98 }}
                                  onClick={handleDigDeeper}
                                  disabled={aiFollowupLoading}
                                  className="flex items-center align-item gap-2 px-4 py-2 rounded-full bg-[#fff] text-slate-900 disabled:opacity-50 "
                                >
                                  <FiSearch /> <span>Test Your Understanding</span>
                                </motion.button>
                                <motion.button
                                  whileTap={{ scale: 0.98 }}
                                  onClick={() => handleAIFollowup('better')}
                                  disabled={aiFollowupLoading}
                                  className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#fff] text-slate-900 disabled:opacity-50 "
                                >
                                  <FiSmile /> <span>Simpler Explanation</span>
                                </motion.button>
                              </div>
                            )}

                            {aiFollowupLoading && (
                              <div className="mt-3 flex items-center gap-3">
                                <motion.div
                                  animate={{ rotate: 360 }}
                                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                                  className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full"
                                />
                                <span className="text-gray-400">Generating explanation...</span>
                              </div>
                            )}

                            {aiFollowup && (
                              <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="mt-4 bg-[#151B27] border border-[#262F4C] rounded-xl p-4"
                              >
                                <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                                  {aiFollowup}
                                </div>
                              </motion.div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </motion.div>
        )}

        {/* Dig Deeper Overlay */}
        <AnimatePresence>
          {isDigging && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-6 rounded-xl overflow-hidden"
            >
              <div className="bg-gradient-to-r from-[#47006A] to-[#0031D0] p-6 rounded-xl min-h-[220px]">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-xl">Test Your Understanding</div>
                    <div className="text-sm mt-1 text-white/80">
                      {prevDigResult && prevDigResult.status && (
                        prevDigResult.status === 'correct'
                          ? 'Previous Answer: Correct ✓'
                          : `Previous Answer: Incorrect (Correct: ${prevDigResult.answer})`
                      )}
                    </div>
                    {prevDigResult && prevDigResult.status === 'incorrect' && prevDigResult.explanation && (
                      <div className="mt-3 text-sm font-medium bg-white/10 rounded-lg p-3">
                        {prevDigResult.explanation}
                      </div>
                    )}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleExitDigDeeper}
                    className="bg-white text-black px-4 py-2 rounded-full font-medium hover:bg-gray-100 transition-colors"
                  >
                    Close
                  </motion.button>
                </div>

                <div className="mt-6">
                  {conceptLoading ? (
                    <div className="flex items-center gap-3">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-8 h-8 border-4 border-white border-t-transparent rounded-full"
                      />
                      <div className="text-white">Generating concept question...</div>
                    </div>
                  ) : conceptMCQ && conceptMCQ.mcq ? (
                    <>
                      <div className="text-white font-semibold text-lg mb-4">
                        {conceptMCQ.mcq.question}
                      </div>
                      <div className="space-y-3">
                        {conceptMCQ.mcq.options.map((opt: string, i: number) => {
                          const letter = ['A', 'B', 'C', 'D'][i];
                          const isSelected = digDeepSelected === letter;
                          return (
                            <motion.button
                              key={i}
                              whileTap={{ scale: 0.995 }}
                              onClick={() => handleConceptUserResponse(letter)}
                              className={`w-full text-left rounded-lg p-4 flex items-center gap-3 transition-colors ${
                                isSelected
                                  ? 'bg-[#04271C] border-2 border-[#1DC97A]'
                                  : 'bg-[#000] border border-[#262F4C] hover:border-white/30'
                              }`}
                            >
                              <div
                                className={`w-10 h-10 rounded-lg flex items-center justify-center font-semibold ${
                                  isSelected
                                    ? 'bg-[#1DC97A] text-black'
                                    : 'bg-[#181C28] border border-[#262F4C]'
                                }`}
                              >
                                {letter}
                              </div>
                              <div className="text-white">{opt}</div>
                            </motion.button>
                          );
                        })}
                      </div>

                      <div className="mt-4">
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleConceptUserResponse('I_am_not_sure')}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black font-medium hover:bg-gray-100 transition-colors"
                        >
                          <FiX /> Not Sure
                        </motion.button>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-200">
                      {conceptFeedback || 'Click to generate a concept question.'}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Solution scroll anchor */}
        <div ref={scrollRef} />
      </div>

      {/* Footer navigation */}
      <div className="fixed left-0 right-0 bottom-0 h-20 bg-black/95 backdrop-blur-sm border-t border-[#232B3B] flex items-center justify-between px-6 py-4 z-40">
        <div className="flex-1 flex items-center gap-4">
          {showToast && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-[#0B7A44] rounded-lg px-4 py-2 text-white"
            >
              Bookmarked!
            </motion.div>
          )}
          {!isConnected && (
            <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 bg-[#D32F2F] rounded-lg px-4 py-2 text-white">
              No Internet Connection
            </div>
          )}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="w-14 h-12 rounded-xl bg-[#151B27] border border-[#1D2939] flex items-center justify-center disabled:opacity-50"
          >
            <FiArrowLeft size={20} />
          </motion.button>
        </div>

        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            disabled={currentIndex === questions.length - 1}
            className="flex items-center gap-3 bg-[#151B27] border border-[#1D2939] px-6 py-3 rounded-full disabled:opacity-50"
          >
            <span className="text-white font-semibold">Next</span>
            <FiArrowRight size={18} />
          </motion.button>

          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleBookmark}
            className="w-14 h-12 rounded-xl bg-[#151B27] border border-[#1D2939] flex items-center justify-center"
          >
            {bookmarked ? <IoBookmark size={20} /> : <FiBookmark size={20} />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// Check mark icon component
function FiCheckIcon() {
  return (
    <svg width="14" height="11" viewBox="0 0 14 11" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 5.5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}