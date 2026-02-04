'use client';

import React, { useEffect, useRef, useState } from 'react';
import axios from 'axios';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { FiChevronLeft, FiBookmark, FiSearch, FiSmile, FiX, FiArrowRight, FiArrowLeft } from 'react-icons/fi';
import { IoTimeOutline, IoBookmark } from 'react-icons/io5';
import imagepath from '../../public/src/constants/imagepath';
import { supabase } from '../../public/src/utils/supabase'; // adjust path if needed

// NOTE: This file converts the original React-Native QuestionViewer -> Next.js + TypeScript + Tailwind CSS
// It preserves logic (session storage, bookmarking, motivation & solution fetch, dig-deeper flow, coin awarding).
// Make sure `questionsData` exists and the backend endpoints defined in API_BASE are reachable.

type Question = {
  question: string;
  options: string[];
  correctAnswer: string;
  year?: number | string;
  [k: string]: any;
};

// Replace with your actual questions import path. Adjust relative path based on your project layout.
import { questionsData } from '../../app/questions';

const API_BASE = 'https://rookie-backend.vercel.app/api';

const WEAK_CONCEPTS_KEY = 'userWeakConcepts';
const BOOKMARKS_KEY = 'bookmarkedQuestions';
const SESSION_RESPONSES_KEY = 'questionSessionResponses_v1';

export default function QuestionViewerPage(): JSX.Element {
  const router = useRouter();
  const searchParams = useSearchParams();
  const chapterTitle = (searchParams.get('chapterTitle') || '') as string;
  const subjectName = (searchParams.get('subjectName') || 'Physics') as string;
  const imageKey = (searchParams.get('imageKey') || '') as string;

  const [loading, setLoading] = useState<boolean>(false);
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

  const scrollRef = useRef<HTMLDivElement | null>(null);

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
          q.question === currentQuestion.question &&
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
              q.question === currentQuestion.question &&
              q.chapterTitle === chapterTitle &&
              q.subjectName === subjectName
            )
        );
        localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(arr));
        setBookmarked(false);
      }
    } catch (e) {
      // ignore
    }
  };

  // ---------- Load questions ----------
  useEffect(() => {
    const chapterQuestions = (questionsData as any)[chapterTitle] || [];
    const sortedQuestions = Array.isArray(chapterQuestions) ? chapterQuestions.slice() : [];
    setQuestions(sortedQuestions);
    setShownIndices(new Set([0]));
    setCurrentIndex(0);
    setSelectedOption(null);
    setIsCorrect(null);
    setMotivation('');
    setSolution('');
    setSolutionRequested(false);
  }, [chapterTitle]);

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

  // ---------- Timer ----------
  useEffect(() => {
    setTimer(0);
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    timerRef.current = window.setInterval(() => {
      setTimer((t) => t + 1);
    }, 1000);
    return () => {
      if (timerRef.current) {
        window.clearInterval(timerRef.current);
      }
    };
  }, [currentIndex]);

  // ---------- Progress effect handled by framer-motion in UI ----------

  // ---------- Load session / restore previous answer when index changes ----------
  useEffect(() => {
    let mounted = true;
    const restoreState = () => {
      const session = loadSessionForIndex(currentIndex);
      if (!session || !mounted) {
        setSelectedOption(null);
        setIsCorrect(null);
        setMotivation('');
        setSolution('');
        setSolutionRequested(false);
        setAIFollowup(null);
        return;
      }
      setSelectedOption(session.selectedOption ?? null);
      setIsCorrect(typeof session.isCorrect === 'boolean' ? session.isCorrect : null);
      setMotivation(session.motivation ?? '');
      setSolution(session.solution ?? '');
      setSolutionRequested(!!session.solutionRequested);
      setAIFollowup(session.aiFollowup ?? null);

      setShownIndices((prev) => new Set([...Array.from(prev), currentIndex]));
    };
    if (questions.length > 0) restoreState();
    return () => {
      mounted = false;
    };
  }, [currentIndex, questions.length]);

  // ---------- Save session whenever relevant states change ----------
  useEffect(() => {
    const timeout = setTimeout(() => {
      saveSessionForCurrent().catch(() => {});
    }, 200);
    return () => clearTimeout(timeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentIndex, selectedOption, isCorrect, motivation, solutionRequested, solution, aiFollowup]);

  // ---------- Load user rookie coins on mount ----------
  useEffect(() => {
    try {
      const userStr = localStorage.getItem('@user');
      const user = userStr ? JSON.parse(userStr) : null;
      if (user) {
        setRookieCoins(user.rookieCoinsEarned || 0);
      }
    } catch (e) {}
  }, []);

  // ---------- Network connectivity ----------
  useEffect(() => {
    const updateOnline = () => setIsConnected(navigator.onLine);
    window.addEventListener('online', updateOnline);
    window.addEventListener('offline', updateOnline);
    setIsConnected(navigator.onLine);
    return () => {
      window.removeEventListener('online', updateOnline);
      window.removeEventListener('offline', updateOnline);
    };
  }, []);

  // ---------- Option selection ----------
  const handleOptionPress = (option: string) => {
    setSelectedOption(option);
    setIsCorrect(null);
    setMotivation('');
  };

  // ---------- Navigation ----------
  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const next = currentIndex + 1;
      setCurrentIndex(next);
      setShownIndices(new Set([...Array.from(shownIndices), next]));
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      const prev = currentIndex - 1;
      setCurrentIndex(prev);
    }
  };

  // ---------- Award coins ----------
  const awardCoinsIfNeeded = async (questionIndex: number) => {
    try {
      const stored = localStorage.getItem(SESSION_RESPONSES_KEY);
      const obj = stored ? JSON.parse(stored) : {};
      const chapterObj = obj[chapterTitle] || {};
      const qSession = chapterObj[String(questionIndex)] || {};
      if (qSession.awarded) return;

      const userStr = localStorage.getItem('@user');
      if (!userStr) return;
      const user = JSON.parse(userStr);
      const userId = user.id;
      if (!userId) return;

      const currentCoins = user.rookieCoinsEarned || 0;
      const newCoins = currentCoins + 10;

      try {
        await supabase.from('users').update({ rookieCoinsEarned: newCoins }).eq('id', userId);
      } catch (err) {
        // ignore supabase failure
      }

      const newUser = { ...user, rookieCoinsEarned: newCoins };
      localStorage.setItem('@user', JSON.stringify(newUser));
      setRookieCoins(newCoins);

      if (!obj[chapterTitle]) obj[chapterTitle] = {};
      if (!obj[chapterTitle][String(questionIndex)]) obj[chapterTitle][String(questionIndex)] = {};
      obj[chapterTitle][String(questionIndex)].awarded = true;
      localStorage.setItem(SESSION_RESPONSES_KEY, JSON.stringify(obj));
    } catch (e) {
      // ignore
    }
  };

  // ---------- Backend calls ----------
  const getMotivation = async (isCorrectFlag: boolean) => {
    if (!buddy || !buddy.prompts) return '';
    try {
      const userStr = localStorage.getItem('@user');
      const user = userStr ? JSON.parse(userStr) : {};
      const userContext = `You are talking to an 18-year-old ${user.gender || 'student'} named ${user.name || ''}. `;
      const message = isCorrectFlag ? `${userContext}${buddy.prompts.onCorrect}` : `${userContext}${buddy.prompts.onWrong}`;

      const res = await axios.post(`${API_BASE}/motivation`, {
        message,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 50,
      });
      return res.data.choices?.[0]?.message?.content || '';
    } catch (error) {
      return '';
    }
  };

  const getSolution = async (questionObj: Question, followupType?: 'dig' | '5yr') => {
    if (!buddy || !buddy.prompts) return '';
    try {
      const userStr = localStorage.getItem('@user');
      const user = userStr ? JSON.parse(userStr) : {};
      const userContext = `You are talking to an 18-year-old ${user.gender || 'student'} named ${user.name || ''}. `;

      const optionsList = questionObj.options.map((opt, idx) => `${String.fromCharCode(65 + idx)}. ${opt}`).join('\n');

      let message = `${userContext}${buddy.prompts.solutionPrefix}
Question: "${questionObj.question}"
Options:
${optionsList}
Correct Answer: ${questionObj.correctAnswer}
Please provide a detailed solution to the question above in not more than 15 lines`;

      if (followupType === 'dig') {
        message += '\nNow, dig deeper and provide more advanced insights, connections, or extra detailed solution.';
      }
      if (followupType === '5yr') {
        message += '\nNow, explain the same solution in simplest way possible.';
      }

      const res = await axios.post(`${API_BASE}/solution`, {
        message,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 400,
      });

      return res.data?.choices?.[0]?.message?.content || '';
    } catch (error) {
      console.error('getSolution error:', error);
      return '';
    }
  };

  const handleAIFollowup = async (type: 'dig' | '5yr') => {
    setAIFollowupLoading(true);
    const result = await getSolution(questions[currentIndex], type);
    setAIFollowup(result.trim());
    setAIFollowupLoading(false);
    setTimeout(() => {
      scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }, 200);
  };

  // ---------- Check Answer ----------
  const handleCheckAnswer = async () => {
    if (!selectedOption) return;
    if (timerRef.current) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setLoading(true);
    const currentQuestion = questions[currentIndex];
    const correct = selectedOption === currentQuestion.correctAnswer;
    setIsCorrect(correct);

    if (correct) {
      setShowCorrectGif(true);
      setTimeout(() => setShowCorrectGif(false), 4000);

      try {
        const msg = await getMotivation(true);
        setMotivation(` ${msg.trim()}`);
        await awardCoinsIfNeeded(currentIndex);
      } catch (e) {
        setMotivation('');
      } finally {
        setLoading(false);
        setSolution('');
        setSolutionRequested(false);
      }
    } else {
      try {
        const msg = await getMotivation(false);
        setMotivation(` ${msg.trim()}`);
      } catch (e) {
        setMotivation('');
      }

      try {
        const sol = await getSolution(currentQuestion);
        setSolution(sol.trim());
        setSolutionRequested(true);
        setTimeout(() => {
          scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
        }, 250);
      } catch (e) {
        setSolution('');
      } finally {
        setLoading(false);
      }
    }
  };

  // ---------- Show solution after correct (when user requests) ----------
  const handleShowSolutionAfterCorrect = async () => {
    if (solutionRequested) return;
    setLoading(true);
    try {
      const sol = await getSolution(questions[currentIndex]);
      setSolution(sol.trim());
      setSolutionRequested(true);
      setTimeout(() => {
        scrollRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 250);
    } catch (e) {
      setSolution('');
    } finally {
      setLoading(false);
    }
  };

  // ---------- Dig Deeper flow ----------
  const getConceptDiagnosticPrompt = (questionObj: Question, history: any[], lastConcept: string | null, lastLevel: number, lastWasCorrect: boolean, lastExplanation: string) => {
    if (history.length === 0) {
      return `
You are an expert teacher. Analyze the following question and its options to detect all the main concepts and sub-concepts required to solve it.
Then, pick the most important concept first, and generate a simple, fundamental MCQ (with 4 options and the correct answer) to test the user's root clarity. Make it focused on first principles. Output should be:
Concept: <concept>
Level: 1
Question: <mcq question>
A. <option1>
B. <option2>
C. <option3>
D. <option4>
Answer: <A/B/C/D>
No explanations yet. Only output as instructed.

Here is the question:
"${questionObj.question}"
Options:
${questionObj.options.map((opt, idx) => String.fromCharCode(65 + idx) + ". " + opt).join('\n')}
`;
    }
    if (lastWasCorrect) {
      return `
The user answered correctly to a fundamental MCQ on concept "${lastConcept}" (level ${lastLevel}).
Ask another MCQ on this concept, making it a bit more advanced or covering another important angle, but still focused on first principles. If the user has answered enough on this concept (3+ correct), pick the next most important concept from the original question and start at level 1 for that concept.
Output should be:
Concept: <concept>
Level: <level>
Question: <mcq question>
A. <option1>
B. <option2>
C. <option3>
D. <option4>
Answer: <A/B/C/D>
No explanations yet. Only output as instructed.

Original question:
"${questionObj.question}"
`;
    }
    return `
The user answered incorrectly to an MCQ about "${lastConcept}" (level ${lastLevel}).
First, give a 2 sentence explanation for the correct answer.
Then, break down "${lastConcept}" into a simpler or more fundamental sub-concept and generate a very basic MCQ (with 4 options and the correct answer) about this sub-concept to check user's root clarity.
Output should be:
Explanation: <your explanation>
Concept: <sub-concept>
Level: <level>
Question: <mcq question>
A. <option1>
B. <option2>
C. <option3>
D. <option4>
Answer: <A/B/C/D>

Only output as instructed.
Previous question: "${history[history.length-1].mcq.question}"
Previous MCQ correct answer: ${history[history.length-1].mcq.answer}
User's answer: ${history[history.length-1].userAnswer}
`;
  };

  const parseConceptMCQ = (llmText: string | undefined) => {
    if (!llmText) return null;
    let explanation = '';
    let concept = '';
    let level = 1;
    let text = llmText.trim();

    const explMatch = text.match(/^Explanation:\s*([\s\S]*?)\nConcept:/i);
    if (explMatch) {
      explanation = explMatch[1].trim();
      text = text.replace(/^Explanation:[\s\S]*?\nConcept:/i, 'Concept:');
    }
    const conceptMatch = text.match(/Concept:\s*(.*)\nLevel:\s*(\d+)/);
    if (conceptMatch) {
      concept = conceptMatch[1].trim();
      level = parseInt(conceptMatch[2].trim(), 10) || 1;
    }
    const questionMatch = text.match(/Question:\s*([\s\S]*?)\nA\.\s*(.*)\nB\.\s*(.*)\nC\.\s*(.*)\nD\.\s*(.*)\nAnswer:\s*([ABCD])/i);
    if (!questionMatch) return null;
    return {
      explanation,
      concept,
      level,
      question: questionMatch[1].trim(),
      options: [
        questionMatch[2].trim(),
        questionMatch[3].trim(),
        questionMatch[4].trim(),
        questionMatch[5].trim(),
      ],
      answer: questionMatch[6].trim(),
    };
  };

  const handleStartDigDeeper = async () => {
    setIsDigging(true);
    setConceptLoading(true);
    setConceptMCQ(null);
    setConceptHistory([]);
    setConceptFeedback('');
    setConceptDone(false);
    setDigDeepSelected(null);
    setPrevDigResult(null);

    try {
      const prompt = getConceptDiagnosticPrompt(questions[currentIndex], [], null, 1, false, '');
      const res = await axios.post(`${API_BASE}/solution`, {
        message: prompt,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.5,
        max_tokens: 500,
      });
      const mcq = parseConceptMCQ(res.data.choices?.[0]?.message?.content || res.data?.choices?.[0]?.text || '');
      setConceptMCQ({ mcq, numCorrect: 0 });
      setConceptLoading(false);
    } catch (err) {
      setConceptFeedback('Could not generate concept diagnostic question. Please try again.');
      setConceptLoading(false);
    }
  };

  const storeWeakConcept = async ({ concept, question }: { concept: string; question: string }) => {
    try {
      const prev = localStorage.getItem(WEAK_CONCEPTS_KEY);
      let arr: any[] = [];
      if (prev) arr = JSON.parse(prev);
      arr.push({
        concept,
        question,
        date: new Date().toISOString(),
      });
      localStorage.setItem(WEAK_CONCEPTS_KEY, JSON.stringify(arr));
    } catch (err) {
      // ignore
    }
  };

  const handleConceptUserResponse = async (typeOrKey: string) => {
    if (!conceptMCQ || conceptDone) return;
    const mcq = conceptMCQ.mcq;
    let history = [...conceptHistory];

    if (['A', 'B', 'C', 'D'].includes(typeOrKey)) {
      setDigDeepSelected(typeOrKey);
    }

    if (typeOrKey === 'I_understood') {
      history.push({
        mcq,
        userAnswer: 'I_understood',
        correct: true,
        concept: mcq.concept,
        level: mcq.level,
      });
      setConceptHistory(history);
      setConceptFeedback('Super! You marked this as understood. Want to keep building your mastery or return to solution?');
      setConceptDone(true);
      setPrevDigResult({ status: '', explanation: '', answer: '' });
      return;
    }

    if (typeOrKey === 'I_am_not_sure') {
      await storeWeakConcept({ concept: mcq.concept, question: mcq.question });
      history.push({
        mcq,
        userAnswer: 'I_am_not_sure',
        correct: false,
        concept: mcq.concept,
        level: mcq.level,
      });
      setConceptHistory(history);
      setConceptFeedback("Thanks! We have saved this as your weak spot. Let's break it down further...");
      setConceptLoading(true);
      setDigDeepSelected(null);
      try {
        const prompt = getConceptDiagnosticPrompt(questions[currentIndex], history, mcq.concept, mcq.level, false, '');
        const res = await axios.post(`${API_BASE}/solution`, {
          message: prompt,
          model: 'llama-3.3-70b-versatile',
          temperature: 0.5,
          max_tokens: 500,
        });
        const newMcq = parseConceptMCQ(res.data.choices?.[0]?.message?.content || res.data?.choices?.[0]?.text || '');
        setConceptMCQ({ mcq: newMcq, numCorrect: 0 });
        setConceptLoading(false);
        setPrevDigResult({
          status: 'incorrect',
          explanation: newMcq?.explanation || '',
          answer: history[history.length - 1]?.userAnswer || '',
        });
      } catch (err) {
        setConceptFeedback('Could not generate breakdown question. Please try again.');
        setConceptLoading(false);
      }
      return;
    }

    const correct = typeOrKey === mcq.answer;
    let numCorrect = conceptMCQ.numCorrect || 0;
    history.push({
      mcq,
      userAnswer: typeOrKey,
      correct,
      concept: mcq.concept,
      level: mcq.level,
    });
    setConceptHistory(history);

    if (correct) {
      numCorrect += 1;
      setConceptFeedback('Nice! You got it right. Building up your mastery...');
      setPrevDigResult({ status: 'correct', explanation: '', answer: typeOrKey });
      if (numCorrect >= 3) {
        setConceptDone(true);
        setConceptFeedback('Awesome! You have built a strong foundation for this concept. You can return to the main solution or keep digging for other concepts.');
        return;
      }
      setConceptLoading(true);
      setDigDeepSelected(null);
      try {
        const prompt = getConceptDiagnosticPrompt(questions[currentIndex], history, mcq.concept, mcq.level + 1, true, '');
        const res = await axios.post(`${API_BASE}/solution`, {
          message: prompt,
          model: 'llama-3.3-70b-versatile',
          temperature: 0.5,
          max_tokens: 500,
        });
        const newMcq = parseConceptMCQ(res.data.choices?.[0]?.message?.content || res.data?.choices?.[0]?.text || '');
        setConceptMCQ({ mcq: newMcq, numCorrect });
        setConceptLoading(false);
      } catch (err) {
        setConceptFeedback('Could not generate next concept question. Please try again.');
        setConceptLoading(false);
      }
    } else {
      setConceptLoading(true);
      setConceptFeedback('');
      setDigDeepSelected(null);
      try {
        const prompt = getConceptDiagnosticPrompt(questions[currentIndex], history, mcq.concept, mcq.level, false, '');
        const res = await axios.post(`${API_BASE}/solution`, {
          message: prompt,
          model: 'llama-3.3-70b-versatile',
          temperature: 0.5,
          max_tokens: 500,
        });
        const newMcq = parseConceptMCQ(res.data.choices?.[0]?.message?.content || res.data?.choices?.[0]?.text || '');
        setConceptMCQ({ mcq: newMcq, numCorrect: 0 });
        setConceptLoading(false);
        setPrevDigResult({
          status: 'incorrect',
          explanation: newMcq?.explanation || '',
          answer: typeOrKey,
        });
      } catch (err) {
        setConceptFeedback('Could not generate breakdown question. Please try again.');
        setConceptLoading(false);
      }
    }
  };

  const handleExitDigDeeper = () => {
    setIsDigging(false);
    setConceptMCQ(null);
    setConceptHistory([]);
    setConceptFeedback('');
    setConceptDone(false);
    setDigDeepSelected(null);
    setPrevDigResult(null);
  };

  const handleBackPress = async () => {
    clearSession();
    router.back();
  };

  // ---------- UI helpers ----------
  const currentQuestion = questions[currentIndex] || null;
  const minutes = Math.floor(timer / 60);
  const seconds = timer % 60;
  const formattedTime = `${minutes}:${String(seconds).padStart(2, '0')}`;
  const subjectImage = (imageKey && (imagepath as any)[imageKey]) ? (imagepath as any)[imageKey] : (getSubjectImage(subjectName));

  function getSubjectImage(subjectNameLocal: string) {
    if (subjectNameLocal === 'Physics') return (imagepath as any)?.Physics || '';
    if (subjectNameLocal === 'Chemistry') return (imagepath as any)?.Chemistry || '';
    if (subjectNameLocal === 'Maths') return (imagepath as any)?.Maths || '';
    if (subjectNameLocal === 'Biology') return (imagepath as any)?.Biology || '';
    return (imagepath as any)?.Maths || '';
  }

  // small motion variants
  const fadeUp = { hidden: { opacity: 0, y: 8 }, visible: { opacity: 1, y: 0, transition: { duration: 0.32 } } };

  return (
    <div className="min-h-screen bg-[#0C111D] text-white">
      {/* Header */}
      <div className="relative w-full">
        {/* background image */}
        <div className="relative h-28 sm:h-36 md:h-44 bg-[#111B2A] overflow-hidden">
          {subjectImage && (
            // Next/Image accepts many sources - if subjectImage is a string path, pass it directly
            <Image
              src={subjectImage as any}
              alt={subjectName}
              fill
              className="object-cover opacity-50"
              sizes="(max-width: 640px) 100vw, 50vw"
            />
          )}

          <div className="relative h-full flex flex-col justify-between p-4 sm:p-6">
            <div className="flex items-center justify-between">
              <motion.button
                whileTap={{ scale: 0.96 }}
                onClick={handleBackPress}
                className="flex items-center gap-2 text-white opacity-95" 
              >
                <FiChevronLeft size={28} />
                <span className="text-sm sm:text-base">Back</span>
              </motion.button>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-transparent">
                  <IoTimeOutline size={18} />
                  <span className="text-sm">{formattedTime}</span>
                </div>
                <div className="text-sm">
                  Q{currentIndex + 1}/{questions.length || 0}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-medium">{subjectName}</h1>
              <div className="px-2 py-0.5 rounded-full bg-black/40 border" style={{ borderColor: '#10B981' }}>
                <span className="text-xs sm:text-sm font-medium" style={{ color: '#10B981' }}>
                  Subject
                </span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 text-white/70 text-xs">
              <span>{(questions || []).length} Questions</span>
            </div>
          </div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="">
        <motion.div
          initial={{ width: '0%' }}
          animate={{ width: `${questions.length ? ((currentIndex + 1) / questions.length) * 100 : 0}%` }}
          transition={{ duration: 0.3 }}
          className="h-2 bg-white rounded-full"
        />
      </div>

      <div className="px-4 md:px-8 lg:px-12 pt-6 pb-28">
        <div className="flex flex-wrap items-center gap-2 mb-4 text-sm text-gray-400">
          <span>{subjectName}</span>
          <span className="opacity-50">/</span>
          <span>{chapterTitle}</span>
          <span className="opacity-50">/</span>
          <span>Q{currentIndex + 1}</span>
        </div>

        {!currentQuestion ? (
          <div className="py-20">
            <p className="text-lg">No questions found for {chapterTitle}</p>
          </div>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={fadeUp}>
            <h2 className="text-lg sm:text-xl md:text-2xl font-semibold text-white leading-7">{currentQuestion.question}</h2>

            {/* Options */}
            <div className="mt-6 space-y-4">
              {currentQuestion.options.map((option, idx) => {
                const isSelected = selectedOption === option;
                const isCorrectOption = option === currentQuestion.correctAnswer;
                let bg = 'bg-[#000000] border border-[#232323]';
                let textColor = 'text-white';
                if (isCorrect === null) {
                  if (isSelected) {
                    bg = 'bg-[#0D162A] border border-[#3270FF]';
                  }
                } else {
                  if (isSelected && isCorrect) {
                    bg = 'bg-[#04271C] border border-[#1DC97A]';
                  } else if (isSelected && !isCorrect) {
                    bg = 'bg-[#411818] border border-[#B42323]';
                  } else if (!isSelected && isCorrectOption && !isCorrect) {
                    bg = 'bg-transparent border border-[#1DC97A]';
                    textColor = 'text-[#E6FFEF]';
                  } else {
                    bg = 'bg-[#000] border border-[#232323]';
                  }
                }

                return (
                  <motion.button
                    key={idx}
                    whileTap={{ scale: 0.995 }}
                    onClick={() => handleOptionPress(option)}
                    disabled={isCorrect !== null}
                    className={`w-full text-left rounded-xl p-4 flex items-center gap-4 ${bg} ${textColor}`}
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center ${isSelected ? 'bg-[#3270FF] text-white' : 'bg-[#181C28] border'}`}>
                      {isSelected ? <FiCheckIcon /> : String.fromCharCode(65 + idx)}
                    </div>
                    <div className="flex-1">{option}</div>
                    {isCorrect !== null && isCorrectOption && !isSelected && (
                      <div className="px-3 py-1 border border-[#1DC97A] rounded-full text-sm text-[#1DC97A]">Correct</div>
                    )}
                  </motion.button>
                );
              })}
            </div>

            {/* Check / Solution / Feedback */}
            <div className="mt-6">
              {isCorrect === null ? (
                
                <motion.button
                  whileTap={{ scale: selectedOption ? 0.98 : 1 }}
                  onClick={handleCheckAnswer}
                  disabled={!selectedOption}
                  className={`items-center gap-3 px-6 py-3 rounded-full text-black font-semibold ${selectedOption ? 'bg-white' : 'bg-gray-500/60'}`}
                >
                  Check
                </motion.button>
              ) : (
                <>
                  {loading ? (
                    <div className="flex flex-col items-center mt-4">
                      <Image src="/loadsol.gif" alt="loading" width={80} height={80} />
                      <p className="text-gray-400 mt-3">Generating feedback...</p>
                    </div>
                  ) : (
                    <>
                      {motivation && (
                        <div className="mt-6 rounded-xl overflow-hidden">
                          <div className="bg-gradient-to-r from-[#47006A] to-[#0031D0] p-4 rounded-xl flex items-start gap-4">
                            {buddy?.image && (
                              <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-[#475467]">
                                <Image src={buddy.image} alt={buddy.name} width={48} height={48} />
                              </div>
                            )}
                            <div className="flex-1">
                              <div className="font-semibold">{buddy?.name}</div>
                              <div className="mt-1 text-lg">{motivation.replace(new RegExp(`^${buddy?.name}:\\s*`), '')}</div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* If correct & solution not requested show solution button */}
                      {isCorrect === true && !solutionRequested && (
                        <div className="mt-4">
                          <motion.button whileTap={{ scale: 0.98 }} onClick={handleShowSolutionAfterCorrect} className="inline-flex items-center gap-3 px-5 py-3 rounded-full bg-white text-black font-semibold">
                            Solution
                          </motion.button>
                        </div>
                      )}

                      {/* Solution block */}
                      {solutionRequested && solution && (
                        <div className="mt-6 rounded-xl overflow-hidden">
                          <div className="bg-gradient-to-r from-[#47006A] to-[#0031D0] p-4 rounded-xl">
                            <div className="font-bold text-lg mb-2">Solution:</div>
                            <div className="whitespace-pre-line text-xl leading-6">{solution}</div>

                            {aiFollowup ? (
                              <div className="mt-4 text-sm">{aiFollowup}</div>
                            ) : (
                              <div className="mt-4 flex gap-3 items-center justify-center pt-4">
                                <motion.button whileTap={{ scale: 0.98 }} onClick={handleStartDigDeeper} disabled={aiFollowupLoading || isDigging} className="flex items-center gap-2 px-3 py-2 rounded-full bg-white text-black">
                                  <FiSearch /> <span>Dig deeper</span>
                                </motion.button>
                                <motion.button whileTap={{ scale: 0.98 }} onClick={() => handleAIFollowup('5yr')} disabled={aiFollowupLoading} className="flex items-center gap-2 px-3 py-2 rounded-full bg-white text-black">
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
            </div>

            {/* Dig deeper overlay */}
            <AnimatePresence>
              {isDigging && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6 rounded-xl overflow-hidden">
                  <div className="bg-gradient-to-r from-[#47006A] to-[#0031D0] p-4 rounded-xl min-h-[220px]">
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-semibold text-lg">Let's build your concept clarity...</div>
                        <div className="text-sm mt-1">{prevDigResult && prevDigResult.status && (prevDigResult.status === 'correct' ? 'Previous Answer: Correct' : `Previous Answer: Incorrect (${prevDigResult.answer})`)}</div>
                        {prevDigResult && prevDigResult.status === 'incorrect' && prevDigResult.explanation && (
                          <div className="mt-3 text-sm font-medium">{prevDigResult.explanation}</div>
                        )}
                      </div>
                      <motion.button whileTap={{ scale: 0.95 }} onClick={handleExitDigDeeper} className="bg-white text-black px-3 py-1 rounded-full">
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
                                  className={`w-full text-left rounded-lg p-3 flex items-center gap-3 ${isSelected ? 'bg-[#04271C] border border-[#1DC97A]' : 'bg-[#000] border border-[#262F4C]'}`}
                                >
                                  <div className={`w-8 h-8 rounded-md flex items-center justify-center ${isSelected ? 'bg-[#1DC97A] text-black' : 'bg-[#181C28] border'}`}>{letter}</div>
                                  <div>{opt}</div>
                                </motion.button>
                              );
                            })}
                          </div>

                          <div className="mt-4">
                            <motion.button whileTap={{ scale: 0.98 }} onClick={() => handleConceptUserResponse('I_am_not_sure')} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white text-black">
                              <FiX /> Not Sure
                            </motion.button>
                          </div>
                        </>
                      ) : (
                        <div className="text-sm text-gray-200">{conceptFeedback || 'Start the diagnostic to generate a focused MCQ.'}</div>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* solution scroll anchor */}
            <div ref={scrollRef} />
          </motion.div>
        )}
      </div>

      {/* Gif overlay */}
      <AnimatePresence>
        {showCorrectGif && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
            <div className="w-full max-w-3xl px-6">
              <Image src="/c007.gif" alt="celebrate" width={900} height={300} className="w-full object-cover" />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer navigation */}
      <div className="fixed left-0 right-0 bottom-0 h-28 bg-black border-t border-[#232B3B] flex items-center justify-between px-6 py-4 z-40">
        <div className="flex-1 flex items-center gap-4">
          {showToast && (
            <div className="absolute -top-12 left-1/2 transform -translate-x-1/2 bg-[#0B7A44] rounded-md px-4 py-2 text-white">Bookmarked!</div>
          )}
          {!isConnected && (
            <div className="absolute -top-14 left-1/2 transform -translate-x-1/2 bg-[#D32F2F] rounded-md px-4 py-2 text-white">No Internet Connection. Try connecting your internet</div>
          )}
          <motion.button whileTap={{ scale: 0.98 }} onClick={handlePrev} className="w-14 h-12 rounded-xl bg-[#151B27] border border-[#1D2939] flex items-center justify-center">
            <FiArrowLeft size={20} />
          </motion.button>
        </div>

        <div className="flex items-center gap-4">
          <motion.button whileTap={{ scale: 0.98 }} onClick={handleNext} className="flex items-center gap-3 bg-[#151B27] border border-[#1D2939] px-6 py-3 rounded-full">
            <span className="text-white font-semibold">Next</span>
            <FiArrowRight size={18} />
          </motion.button>

          <motion.button whileTap={{ scale: 0.98 }} onClick={handleBookmark} className="w-14 h-12 rounded-xl bg-[#151B27] border border-[#1D2939] flex items-center justify-center">
            {bookmarked ? <IoBookmark size={20} /> : <FiBookmark size={20} />}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

// small icon component for check mark inside option (keeps icons local to this file)
function FiCheckIcon() {
  return (
    <svg width="14" height="11" viewBox="0 0 14 11" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M1 5.5L5 9L13 1" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}