'use client'

import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronLeft, FiBookmark, FiSearch, FiSmile, FiX, FiArrowRight, FiArrowLeft } from 'react-icons/fi';
import { IoTimeOutline, IoBookmark } from 'react-icons/io5';
import imagepath from '../../public/src/constants/imagepath';
import { supabase } from '../../public/src/utils/supabase';
// For LaTeX rendering, install: npm install react-katex katex
import 'katex/dist/katex.min.css';
import { InlineMath, BlockMath } from 'react-katex';

// NOTE: This file fetches questions from Supabase, uses AI to determine correct answers,
// and preserves all existing features (dig deeper, explain like 5yr, bookmarking, etc.)

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
  const [showCorrectGif, setShowCorrectGif] = useState<boolean>(false);
  const [aiFollowup, setAIFollowup] = useState<string | null>(null);
  const [aiFollowupLoading, setAIFollowupLoading] = useState<boolean>(false);
  const [isConnected, setIsConnected] = useState<boolean>(true);
  const [bookmarked, setBookmarked] = useState<boolean>(false);
  const [showToast, setShowToast] = useState<boolean>(false);

  // Dig Deeper states
  const [isDigging, setIsDigging] = useState<boolean>(false);
  const [conceptMCQ, setConceptMCQ] = useState<any>(null);
  const [conceptHistory, setConceptHistory] = useState<any[]>([]);
  const [conceptLoading, setConceptLoading] = useState<boolean>(false);
  const [conceptFeedback, setConceptFeedback] = useState<string>('');
  const [conceptDone, setConceptDone] = useState<boolean>(false);
  const [digDeepSelected, setDigDeepSelected] = useState<string | null>(null);
  const [prevDigResult, setPrevDigResult] = useState<{ status: 'correct' | 'incorrect' | ''; explanation?: string; answer?: string } | null>(null);

  // Solution requested (for correct-answer flow)
  const [solutionRequested, setSolutionRequested] = useState<boolean>(false);

  // AI determining correct answer
  const [determiningAnswer, setDeterminingAnswer] = useState<boolean>(false);

  const scrollRef = useRef<HTMLDivElement | null>(null);

  // ---------- Fetch questions from Supabase ----------
  useEffect(() => {
    const fetchQuestionsFromSupabase = async () => {
      if (!chapterTitle) return;
      
      setLoading(true);
      try {
        // Fetch from table with name = chapterTitle, ordered by question column (which should be like "Q0001", "Q0002", etc.)
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
          index: currentIndex,
        });
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(arr));
        setBookmarked(true);
        setShowToast(true);
        setTimeout(() => setShowToast(false), 1800);
      } else {
        arr = arr.filter(
          (q: any) =>
            !(
              q.question_id === currentQuestion.question_id &&
              q.chapterTitle === chapterTitle &&
              q.subjectName === subjectName
            )
        );
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(arr));
        setBookmarked(false);
      }
    } catch (e) {
      console.error('Error toggling bookmark:', e);
    }
  };

  // ---------- Timer ----------
  useEffect(() => {
    if (selectedOption === null) {
      const interval = setInterval(() => {
        setTimer((prev) => prev + 1);
      }, 1000);
      timerRef.current = interval as unknown as number;
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [selectedOption]);

  

  // ---------- Buddy load ----------
  useEffect(() => {
    const loadBuddy = async () => {
      try {
        const stored = localStorage.getItem('selectedBuddy');
        if (stored) {
          setBuddy(JSON.parse(stored));
        } else {
          const defaultBuddy = {
            id: 4,
            name: 'Ritu',
            description: 'A fun, Hinglish-speaking teenage girl who explains concepts like your bestie!',
            image: imagepath.Ritu,
            prompts: {
              onCorrect:
                "You are Ritu, a fun, teenage girl who replies in Hinglish. Avoid long responses. You never give boring answers. Be informal and talk like a high school girl from India. Give a short not more than 15 words, cheerful message for getting a question correct.encourage them to solve more questions.",
              onWrong:
                "You are Ritu, a fun, teenage girl who replies in Hinglish. Avoid long responses. You never give boring answers. Be informal and talk like a high school girl who is supportive. Give a short not more than 15 words, supportive message for getting a question wrong. Encourage them casually.encourage them to solve more questions.",
              solutionPrefix:
                "You are Ritu, a fun, teenage girl who replies in Hinglish. Give a clear, concise, and simple step-by-step solution/explanation not more than 15 lines to the following question using plain text with Unicode math symbols (like ½, ×, √, ²) instead of LaTeX. Avoid using any dollar signs or LaTeX formatting. Write everything in plain, friendly text a high school student can understand. Avoid being too technical, keep it friendly and encouraging.",
            },
          };
          setBuddy(defaultBuddy);
          localStorage.setItem('selectedBuddy', JSON.stringify(defaultBuddy));
        }
      } catch (e) {
        // ignore
      }
    };
    loadBuddy();
  }, []);

  // ---------- Load session when index changes ----------
  useEffect(() => {
    const session = loadSessionForIndex(currentIndex);
    if (session) {
      setSelectedOption(session.selectedOption ?? null);
      setIsCorrect(session.isCorrect ?? null);
      setMotivation(session.motivation ?? '');
      setSolutionRequested(session.solutionRequested ?? false);
      setSolution(session.solution ?? '');
      setAIFollowup(session.aiFollowup ?? null);
    } else {
      setSelectedOption(null);
      setIsCorrect(null);
      setMotivation('');
      setSolutionRequested(false);
      setSolution('');
      setAIFollowup(null);
      setTimer(0);
    }
  }, [currentIndex, chapterTitle]);

  // ---------- Navigation ----------
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setShownIndices((prev) => new Set([...prev, currentIndex + 1]));
      setCurrentIndex(currentIndex + 1);
      setIsDigging(false);
      setConceptMCQ(null);
      setConceptHistory([]);
      setPrevDigResult(null);
      setDigDeepSelected(null);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setIsDigging(false);
      setConceptMCQ(null);
      setConceptHistory([]);
      setPrevDigResult(null);
      setDigDeepSelected(null);
    }
  };

  const handleGoBack = () => {
    clearSession();
    router.back();
  };

  // ---------- Option selection ----------
  const handleSelectOption = (opt: string) => {
    if (selectedOption === null) {
      setSelectedOption(opt);
    }
  };

  // ---------- AI determines correct answer and saves to Supabase ----------
  const determineCorrectAnswerWithAI = async (question: Question): Promise<string | null> => {
    try {
      setDeterminingAnswer(true);
      
      const response = await axios.post(`${API_BASE}/solution`, {
        action: 'determine_answer',
        question_text: question.question_text,
        option_A: question.option_A,
        option_B: question.option_B,
        option_C: question.option_C,
        option_D: question.option_D,
        solution: question.solution,
      });

      const correctOption = response.data?.correct_answer || null;
      
      if (correctOption) {
        // Save to Supabase
        const { error } = await supabase
          .from(chapterTitle)
          .update({ correct_option: correctOption })
          .eq('question_id', question.question_id);

        if (error) {
          console.error('Error saving correct answer to Supabase:', error);
        } else {
          // Update local state
          setQuestions(prevQuestions => 
            prevQuestions.map(q => 
              q.question_id === question.question_id 
                ? { ...q, correct_option: correctOption }
                : q
            )
          );
        }
      }
      
      return correctOption;
    } catch (err) {
      console.error('Error determining correct answer with AI:', err);
      return null;
    } finally {
      setDeterminingAnswer(false);
    }
  };

  // ---------- Check answer (with AI determination if needed) ----------
  const handleCheckAnswer = async () => {
    if (selectedOption === null) return;
    
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    let correctAnswer = currentQuestion.correct_option;

    // If correct_option is not set in Supabase, use AI to determine it
    if (!correctAnswer) {
      correctAnswer = await determineCorrectAnswerWithAI(currentQuestion);
      if (!correctAnswer) {
        alert('Could not determine the correct answer. Please try again.');
        return;
      }
    }

    const correct = selectedOption === correctAnswer;
    setIsCorrect(correct);

    // Show celebration gif for correct answers
    if (correct) {
      setShowCorrectGif(true);
      setTimeout(() => setShowCorrectGif(false), 2000);
    }

    // Fetch motivation
    try {
      const motivationRes = await axios.post(`${API_BASE}/motivation`, {
        isCorrect: correct,
        subjectName,
        chapterTitle,
        timeTaken: timer,
      });
      if (motivationRes.data?.motivation) {
        setMotivation(motivationRes.data.motivation);
      }
    } catch (err) {
      console.error('Error fetching motivation:', err);
    }

    // If incorrect, show solution from Supabase
    if (!correct) {
      setSolution(currentQuestion.solution || 'Solution not available.');
      setSolutionRequested(true);
    }

    // Save weak concept if incorrect
    if (!correct) {
      try {
        const stored = localStorage.getItem(WEAK_CONCEPTS_KEY);
        const arr = stored ? JSON.parse(stored) : [];
        arr.push({
          chapter: chapterTitle,
          subject: subjectName,
          question: currentQuestion.question_text,
          timestamp: Date.now(),
        });
        localStorage.setItem(WEAK_CONCEPTS_KEY, JSON.stringify(arr));
      } catch (e) {
        console.error('Error saving weak concept:', e);
      }
    }

    // Award coins for first attempt on this question
    if (shownIndices.has(currentIndex)) {
      // already shown, no coins
    } else {
      setShownIndices((prev) => new Set([...prev, currentIndex]));
      if (correct) {
        setRookieCoins((prev) => prev + 10);
        try {
          await axios.post(`${API_BASE}/questions/award-coins`, {
            userId: 'temp-user-id',
            coins: 10,
          });
        } catch (e) {
          console.error('Error awarding coins:', e);
        }
      }
    }

    saveSessionForCurrent({ selectedOption, isCorrect: correct, motivation });
  };

  // ---------- Show solution after correct answer ----------
  const handleShowSolutionAfterCorrect = async () => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    setSolution(currentQuestion.solution || 'Solution not available.');
    setSolutionRequested(true);
    saveSessionForCurrent({ solutionRequested: true, solution: currentQuestion.solution });

    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  // ---------- AI Followup (Dig Deeper / Explain like 5yr) ----------
  const handleAIFollowup = async (mode: '5yr' | 'dig') => {
    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    setAIFollowupLoading(true);
    try {
      if (mode === '5yr') {
        const response = await axios.post(`${API_BASE}/solution`, {
          action: 'explain_5yr',
          question_text: currentQuestion.question_text,
          solution: currentQuestion.solution,
        });

        const explanation = response.data?.explanation || 'Could not generate explanation.';
        setAIFollowup(explanation);
        saveSessionForCurrent({ aiFollowup: explanation });
      }
    } catch (err) {
      console.error('Error fetching AI followup:', err);
      setAIFollowup('Error generating explanation. Please try again.');
    } finally {
      setAIFollowupLoading(false);
    }
  };

  // ---------- Dig Deeper Flow ----------
  const handleStartDigDeeper = async () => {
    setIsDigging(true);
    setConceptMCQ(null);
    setConceptHistory([]);
    setPrevDigResult(null);
    setDigDeepSelected(null);
    setConceptLoading(true);

    const currentQuestion = questions[currentIndex];
    if (!currentQuestion) return;

    try {
      const response = await axios.post(`${API_BASE}/solution`, {
        action: 'dig_deeper',
        question_text: currentQuestion.question_text,
        solution: currentQuestion.solution,
      });

      const mcqData = response.data?.mcq;
      if (mcqData) {
        setConceptMCQ({ mcq: mcqData });
      } else {
        setConceptFeedback('Could not generate concept question. Please try again.');
      }
    } catch (err) {
      console.error('Error generating concept MCQ:', err);
      setConceptFeedback('Error generating question. Please try again.');
    } finally {
      setConceptLoading(false);
    }
  };

  const handleConceptUserResponse = async (userAnswer: string) => {
    if (!conceptMCQ?.mcq) return;

    setDigDeepSelected(userAnswer);

    const correctAnswer = conceptMCQ.mcq.correctAnswer;
    const isConceptCorrect = userAnswer === correctAnswer;

    if (userAnswer === 'I_am_not_sure') {
      setPrevDigResult({
        status: 'incorrect',
        explanation: conceptMCQ.mcq.explanation || 'Here is the explanation of the concept.',
        answer: correctAnswer,
      });
      setConceptFeedback('No worries! Here is the explanation.');
      setTimeout(() => {
        setDigDeepSelected(null);
        setConceptMCQ(null);
        setConceptLoading(true);
        handleStartDigDeeper();
      }, 3000);
      return;
    }

    if (isConceptCorrect) {
      setPrevDigResult({ status: 'correct', explanation: 'Great job! You got it right!' });
      setConceptFeedback('Correct! Generating next question...');
      setConceptHistory((prev) => [...prev, { ...conceptMCQ.mcq, userAnswer, isCorrect: true }]);
      
      setTimeout(() => {
        setDigDeepSelected(null);
        setConceptMCQ(null);
        setConceptLoading(true);
        handleStartDigDeeper();
      }, 2000);
    } else {
      setPrevDigResult({
        status: 'incorrect',
        explanation: conceptMCQ.mcq.explanation || `The correct answer is ${correctAnswer}`,
        answer: correctAnswer,
      });
      setConceptFeedback(`Incorrect. The correct answer is ${correctAnswer}. Let's try another question.`);
      setConceptHistory((prev) => [...prev, { ...conceptMCQ.mcq, userAnswer, isCorrect: false }]);
      
      setTimeout(() => {
        setDigDeepSelected(null);
        setConceptMCQ(null);
        setConceptLoading(true);
        handleStartDigDeeper();
      }, 3000);
    }
  };

  const handleExitDigDeeper = () => {
    setIsDigging(false);
    setConceptMCQ(null);
    setConceptHistory([]);
    setPrevDigResult(null);
    setDigDeepSelected(null);
  };

  // ---------- Format time ----------
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // ---------- Render LaTeX in text ----------
  const renderTextWithLatex = (text: string) => {
    if (!text) return null;

    // Split text by LaTeX delimiters
    const parts = text.split(/(\$\$[\s\S]+?\$\$|\$[\s\S]+?\$)/g);
    
    return parts.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$')) {
        // Block math
        const latex = part.slice(2, -2);
        return <BlockMath key={index} math={latex} />;
      } else if (part.startsWith('$') && part.endsWith('$')) {
        // Inline math
        const latex = part.slice(1, -1);
        return <InlineMath key={index} math={latex} />;
      } else {
        // Regular text
        return <span key={index}>{part}</span>;
      }
    });
  };

  // ---------- Render ----------
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

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-4">No questions found</div>
          <div className="text-gray-400">The table "{chapterTitle}" is empty or does not exist.</div>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen bg-black text-white pb-32">
      {/* Header */}
      <div className="fixed top-0 left-0 right-0 bg-black border-b border-[#232B3B] z-50">
        <div className="flex items-center justify-between px-6 py-4">
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={handleGoBack}
            className="w-12 h-12 rounded-xl bg-[#151B27] border border-[#1D2939] flex items-center justify-center"
          >
            <FiChevronLeft size={20} />
          </motion.button>

          <div className="flex-1 mx-4">
            <div className="text-sm text-gray-400">{subjectName}</div>
            <div className="font-semibold">{chapterTitle}</div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#151B27] border border-[#1D2939]">
              <IoTimeOutline size={18} />
              <span className="text-sm">{formatTime(timer)}</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-[#151B27] border border-[#1D2939]">
              <Image src={imagepath.RC} alt="coins" width={20} height={20} />
              <span className="text-sm">{rookieCoins}</span>
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
      <div className="pt-40 px-6 max-w-4xl mx-auto">
        {currentQuestion && (
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* Question */}
            <div className="mb-6">
              <div className="text-sm text-gray-400 mb-2">
                {currentQuestion.exam_shift && `${currentQuestion.exam_shift}`}
            
              </div>
              <div className="text-xl font-medium leading-relaxed">
                {renderTextWithLatex(currentQuestion.question_text)}
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
                {['A', 'B', 'C', 'D'].map((letter) => {
                  const optionKey = `option_${letter}` as keyof Question;
                  const optionText = currentQuestion[optionKey] as string;
                  
                  return (
                    <motion.button
                      key={letter}
                      whileTap={{ scale: 0.995 }}
                      onClick={() => handleSelectOption(letter)}
                      className="w-full text-left rounded-xl p-4 bg-[#0B0F19] border border-[#262F4C] hover:border-[#60A5FA] transition-colors flex items-center gap-4"
                    >
                      <div className="w-10 h-10 rounded-lg bg-[#181C28] border border-[#262F4C] flex items-center justify-center font-semibold">
                        {letter}
                      </div>
                      <div className="flex-1">{renderTextWithLatex(optionText)}</div>
                    </motion.button>
                  );
                })}
              </div>
            ) : (
              <>
                {/* Selected options display */}
                <div className="space-y-3">
                  {['A', 'B', 'C', 'D'].map((letter) => {
                    const optionKey = `option_${letter}` as keyof Question;
                    const optionText = currentQuestion[optionKey] as string;
                    const isSelected = selectedOption === letter;
                    const isCorrectOption = currentQuestion.correct_option === letter;
                    
                    let bgColor = 'bg-[#0B0F19]';
                    let borderColor = 'border-[#262F4C]';
                    let iconBg = 'bg-[#181C28]';
                    
                    if (isCorrect === null && isSelected) {
                      // 🔵 Selected but not yet checked
                      bgColor = 'bg-[#0A1F44]';        // dark blue background
                      borderColor = 'border-[#2979FF]'; 
                      iconBg = 'bg-[#2979FF]';         // blue icon background
                    }
                    
                    if (isCorrect !== null) {
                      if (isCorrectOption) {
                        bgColor = 'bg-[#04271C]';
                        borderColor = 'border-[#1DC97A]';
                        iconBg = 'bg-[#1DC97A]';
                      } else if (isSelected && !isCorrectOption) {
                        bgColor = 'bg-[#2A0F0F]';
                        borderColor = 'border-[#D32F2F]';
                        iconBg = 'bg-[#D32F2F]';
                      }
                    }

                    
                    return (
                      <div
                        key={letter}
                        className={`w-full rounded-xl p-4 border ${bgColor} ${borderColor} flex items-center gap-4`}
                      >
                        <div className={`w-10 h-10 rounded-lg ${iconBg} flex items-center justify-center font-semibold`}>
                          {isCorrect !== null && isCorrectOption ? (
                            <FiCheckIcon />
                          ) : (
                            letter
                          )}
                        </div>
                        <div className="flex-1">{renderTextWithLatex(optionText)}</div>
                      </div>
                    );
                  })}
                </div>

                {/* Check Answer Button */}
                {isCorrect === null && (
                  <div className="mt-6">
                    <motion.button
                      whileTap={{ scale: 0.98 }}
                      onClick={handleCheckAnswer}
                      disabled={determiningAnswer}
                      className="w-full py-4 rounded-full bg-[#fff] text-slate-900 font-semibold text-lg disabled:opacity-50"
                    >
                      {determiningAnswer ? 'Checking...' : 'Check Answer'}
                    </motion.button>
                  </div>
                )}

                {/* Feedback */}
                {isCorrect !== null && (
                  <>
                    {/* Motivation */}
                    {motivation && (
                      <div className="mt-6 rounded-xl overflow-hidden">
                        <div className={`p-4 ${isCorrect ? 'bg-gradient-to-r from-[#0B7A44] to-[#1DC97A]' : 'bg-gradient-to-r from-[#47006A] to-[#0031D0]'}`}>
                          <div className="flex items-start gap-3">
                            {buddy?.image && (
                              <Image
                                src={buddy.image}
                                alt={buddy.name}
                                width={48}
                                height={48}
                                className="rounded-full"
                              />
                            )}
                            <div className="flex-1">
                              <div className="font-semibold text-sm">{buddy?.name || 'Study Buddy'}</div>
                              <div className="mt-1 text-lg">{motivation.replace(new RegExp(`^${buddy?.name}:\\s*`), '')}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Solution Button (for correct answers) */}
                    {isCorrect === true && !solutionRequested && (
                      <div className="mt-4">
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={handleShowSolutionAfterCorrect}
                          className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white text-black font-semibold"
                        >
                          Solution
                        </motion.button>
                      </div>
                    )}

                    {/* Solution Block */}
                    {solutionRequested && solution && (
                      <div className="mt-6 rounded-xl overflow-hidden">
                        <div className="bg-gradient-to-b from-[#47006A] to-[#0031D0] p-4 rounded-xl">
                          <div className="font-bold text-lg mb-2">Solution:</div>
                          <div className="whitespace-pre-line text-base leading-relaxed">
                            {renderTextWithLatex(solution)}
                          </div>

                          {aiFollowup ? (
                            <div className="mt-4 text-sm bg-black/20 p-3 rounded-lg">
                              {renderTextWithLatex(aiFollowup)}
                            </div>
                          ) : (
                            <div className="mt-4 flex gap-3 items-center justify-center pt-4">
                              <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={handleStartDigDeeper}
                                disabled={aiFollowupLoading || isDigging}
                                className="flex items-center gap-2 px-3 py-2 rounded-full bg-white text-black disabled:opacity-50"
                              >
                                <FiSearch /> <span>Dig deeper</span>
                              </motion.button>
                              <motion.button
                                whileTap={{ scale: 0.98 }}
                                onClick={() => handleAIFollowup('5yr')}
                                disabled={aiFollowupLoading}
                                className="flex items-center gap-2 px-3 py-2 rounded-full bg-white text-black disabled:opacity-50"
                              >
                                <FiSmile /> <span>Explain like 5yr</span>
                              </motion.button>
                            </div>
                          )}

                          {aiFollowupLoading && (
                            <div className="mt-3">
                              <div className="text-sm text-gray-200">Generating...</div>
                            </div>
                          )}
                        </div>
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
              <div className="bg-gradient-to-r from-[#47006A] to-[#0031D0] p-4 rounded-xl min-h-[220px]">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-lg">Let's build your concept clarity...</div>
                    <div className="text-sm mt-1">
                      {prevDigResult && prevDigResult.status && (
                        prevDigResult.status === 'correct'
                          ? 'Previous Answer: Correct'
                          : `Previous Answer: Incorrect (${prevDigResult.answer})`
                      )}
                    </div>
                    {prevDigResult && prevDigResult.status === 'incorrect' && prevDigResult.explanation && (
                      <div className="mt-3 text-sm font-medium">{prevDigResult.explanation}</div>
                    )}
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={handleExitDigDeeper}
                    className="bg-white text-black px-3 py-1 rounded-full"
                  >
                    Close
                  </motion.button>
                </div>

                <div className="mt-4">
                  <div className="text-sm text-white/90 mb-3">Acha ye bata:</div>
                  {conceptLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full border border-white/20 animate-spin" />
                      <div className="text-gray-200">Loading a targeted question...</div>
                    </div>
                  ) : conceptMCQ && conceptMCQ.mcq ? (
                    <>
                      <div className="text-white font-semibold">{conceptMCQ.mcq.question}</div>
                      <div className="mt-3 space-y-2">
                        {conceptMCQ.mcq.options.map((opt: string, i: number) => {
                          const letter = ['A', 'B', 'C', 'D'][i];
                          const isSelected = digDeepSelected === letter;
                          return (
                            <motion.button
                              key={i}
                              whileTap={{ scale: 0.995 }}
                              onClick={() => handleConceptUserResponse(letter)}
                              className={`w-full text-left rounded-lg p-3 flex items-center gap-3 ${
                                isSelected
                                  ? 'bg-[#04271C] border border-[#1DC97A]'
                                  : 'bg-[#000] border border-[#262F4C]'
                              }`}
                            >
                              <div
                                className={`w-8 h-8 rounded-md flex items-center justify-center ${
                                  isSelected
                                    ? 'bg-[#1DC97A] text-black'
                                    : 'bg-[#181C28] border'
                                }`}
                              >
                                {letter}
                              </div>
                              <div>{opt}</div>
                            </motion.button>
                          );
                        })}
                      </div>

                      <div className="mt-4">
                        <motion.button
                          whileTap={{ scale: 0.98 }}
                          onClick={() => handleConceptUserResponse('I_am_not_sure')}
                          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black"
                        >
                          <FiX /> Not Sure
                        </motion.button>
                      </div>
                    </>
                  ) : (
                    <div className="text-sm text-gray-200">
                      {conceptFeedback || 'Start the diagnostic to generate a focused MCQ.'}
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

      {/* Gif overlay */}
      <AnimatePresence>
        {showCorrectGif && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center"
          >
            <div className="w-full max-w-3xl px-6">
              <Image src="/c007.gif" alt="celebrate" width={900} height={300} className="w-full object-cover" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer navigation */}
      <div className="fixed left-0 right-0 bottom-0 h-20 bg-black border-t border-[#232B3B] flex items-center justify-between px-6 py-4 z-40">
        <div className="flex-1 flex items-center gap-4">
          {showToast && (
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-[#0B7A44] rounded-md px-4 py-2 text-white">
              Bookmarked!
            </div>
          )}
          {!isConnected && (
            <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 bg-[#D32F2F] rounded-md px-4 py-2 text-white">
              No Internet Connection. Try connecting your internet
            </div>
          )}
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handlePrev}
            className="w-14 h-12 rounded-xl bg-[#151B27] border border-[#1D2939] flex items-center justify-center"
          >
            <FiArrowLeft size={20} />
          </motion.button>
        </div>

        <div className="flex items-center gap-4">
          <motion.button
            whileTap={{ scale: 0.98 }}
            onClick={handleNext}
            className="flex items-center gap-3 bg-[#151B27] border border-[#1D2939] px-6 py-3 rounded-full"
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

// Small icon component for check mark inside option
function FiCheckIcon() {
  return (
    <svg width="14" height="11" viewBox="0 0 14 11" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 5.5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}