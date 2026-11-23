'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Clock, Check, X, Loader2, Coins } from 'lucide-react';
import { competeAudio } from '@/lib/competeAudio';
import { track } from '@/lib/analytics';
import { renderContent } from '@/app/components/renderContent';
import type { CompeteQuestion, CompeteOpponent, MatchRetentionPlan } from '@/lib/competeEngine';
import { CURATED_COMPETE_QUESTIONS } from '@/lib/competeEngine';

interface CompeteBattleProps {
  questions: CompeteQuestion[];
  opponent: CompeteOpponent;
  matchPlan: MatchRetentionPlan;
  userName?: string;
  userAvatar?: string | null;
  userCoins?: number;
  onBattleFinished: (
    userScore: number,
    opponentScore: number,
    userAnswers: boolean[],
    opponentAnswers: boolean[],
    avgTimeSec: number
  ) => void;
}

export function CompeteBattle({
  questions,
  opponent,
  matchPlan,
  userName = 'You',
  userAvatar,
  userCoins = 0,
  onBattleFinished,
}: CompeteBattleProps) {
  const safeQuestions = questions && questions.length > 0 ? questions : CURATED_COMPETE_QUESTIONS;

  const [currentIdx, setCurrentIdx] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);

  // 5 question tracking
  const [userAnswers, setUserAnswers] = useState<(boolean | null)[]>([null, null, null, null, null]);
  const [opponentAnswers, setOpponentAnswers] = useState<(boolean | null)[]>([null, null, null, null, null]);
  const [userTimes, setUserTimes] = useState<number[]>([]);

  // Current question states
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [userLocked, setUserLocked] = useState(false);
  const [opponentLocked, setOpponentLocked] = useState(false);
  const [opponentTimeSec, setOpponentTimeSec] = useState<number | null>(null);
  const [isRevealing, setIsRevealing] = useState(false);

  // Timer
  const [timer, setTimer] = useState(45);
  const questionStartRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<any>(null);
  const botTimeoutRef = useRef<any>(null);
  const userLockedRef = useRef(false);
  const opponentLockedRef = useRef(false);
  const selectedOptRef = useRef<string | null>(null);

  const currentQ = safeQuestions[currentIdx] || CURATED_COMPETE_QUESTIONS[currentIdx % CURATED_COMPETE_QUESTIONS.length];
  const questionText = currentQ?.question_text || (currentQ as any)?.question || 'Identify the correct option';

  // Check if bot should be correct
  const willBotGetCorrect = useCallback(
    (qIdx: number) => !matchPlan.botMistakeIndices.includes(qIdx),
    [matchPlan]
  );

  // Transition to reveal state
  const startReveal = useCallback(
    (uOpt: string | null, uTime: number) => {
      clearInterval(timerIntervalRef.current);
      clearTimeout(botTimeoutRef.current);

      const isUserCorrect = !!uOpt && uOpt.toLowerCase() === currentQ.correct_option.toLowerCase();
      const botCorrect = willBotGetCorrect(currentIdx);

      // Track analytics
      track('compete_question_answered', {
        feature: 'compete',
        question_id: currentQ.id || currentQ.question_id,
        difficulty: currentIdx + 1,
        duration_ms: uTime * 1000,
        metadata: {
          correct: isUserCorrect,
          botCorrect,
          questionIndex: currentIdx + 1,
        },
      });

      // Audio
      if (isUserCorrect) {
        competeAudio.playCorrect();
      } else {
        competeAudio.playWrong();
      }

      // Update round records
      setUserAnswers((prev) => {
        const next = [...prev];
        next[currentIdx] = isUserCorrect;
        return next;
      });

      setOpponentAnswers((prev) => {
        const next = [...prev];
        next[currentIdx] = botCorrect;
        return next;
      });

      if (isUserCorrect) setUserScore((s) => s + 1);
      if (botCorrect) setOpponentScore((s) => s + 1);

      setUserTimes((prev) => [...prev, uTime]);
      setIsRevealing(true);

      // 2.2 second reveal, then advance to next question or finish
      setTimeout(() => {
        if (currentIdx + 1 < safeQuestions.length) {
          // Reset all question states simultaneously
          userLockedRef.current = false;
          opponentLockedRef.current = false;
          selectedOptRef.current = null;

          setSelectedOption(null);
          setUserLocked(false);
          setOpponentLocked(false);
          setOpponentTimeSec(null);
          setIsRevealing(false);
          setTimer(45);

          setCurrentIdx((i) => i + 1);
        } else {
          // All 5 questions completed
          const finalU = userScore + (isUserCorrect ? 1 : 0);
          const finalO = opponentScore + (botCorrect ? 1 : 0);
          const finalUAnswers = [...userAnswers];
          finalUAnswers[currentIdx] = isUserCorrect;
          const finalOAnswers = [...opponentAnswers];
          finalOAnswers[currentIdx] = botCorrect;

          const totalTime = [...userTimes, uTime].reduce((a, b) => a + b, 0);
          const avgTime = Math.round(totalTime / safeQuestions.length);

          onBattleFinished(
            finalU,
            finalO,
            finalUAnswers.map((a) => !!a),
            finalOAnswers.map((a) => !!a),
            avgTime
          );
        }
      }, 2200);
    },
    [currentIdx, currentQ, safeQuestions.length, userScore, opponentScore, userAnswers, opponentAnswers, userTimes, willBotGetCorrect, onBattleFinished]
  );

  // Initialize timers when question changes
  useEffect(() => {
    questionStartRef.current = Date.now();
    userLockedRef.current = false;
    opponentLockedRef.current = false;
    selectedOptRef.current = null;

    setSelectedOption(null);
    setUserLocked(false);
    setOpponentLocked(false);
    setOpponentTimeSec(null);
    setIsRevealing(false);
    setTimer(45);

    const plannedBotTime = matchPlan.botResponseTimesSec[currentIdx] || 11;

    // Bot solve timer
    botTimeoutRef.current = setTimeout(() => {
      opponentLockedRef.current = true;
      setOpponentLocked(true);
      setOpponentTimeSec(plannedBotTime);

      // If user has already answered, trigger reveal!
      if (userLockedRef.current) {
        const uTime = Math.max(1, Math.round((Date.now() - questionStartRef.current) / 1000));
        startReveal(selectedOptRef.current, uTime);
      }
    }, plannedBotTime * 1000);

    // 45s countdown timer
    timerIntervalRef.current = setInterval(() => {
      setTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timerIntervalRef.current);
          handleTimeExpired();
          return 0;
        }
        if (prev <= 10) {
          competeAudio.playTick();
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      clearInterval(timerIntervalRef.current);
      clearTimeout(botTimeoutRef.current);
    };
  }, [currentIdx, matchPlan]);

  // User selects an option
  const handleSelectOption = (optKey: string) => {
    if (userLockedRef.current || isRevealing) return;

    userLockedRef.current = true;
    selectedOptRef.current = optKey;
    setSelectedOption(optKey);
    setUserLocked(true);
    competeAudio.playSelect();

    const timeSpentSec = Math.max(1, Math.round((Date.now() - questionStartRef.current) / 1000));

    // If opponent already locked in earlier: trigger reveal immediately!
    if (opponentLockedRef.current) {
      startReveal(optKey, timeSpentSec);
    } else {
      // User answered BEFORE opponent!
      // Schedule opponent to lock in after a short suspenseful delay (1.8s - 3s)
      clearTimeout(botTimeoutRef.current);
      const remainingDelay = Math.max(1800, Math.min(3200, 2000 + Math.random() * 1000));
      botTimeoutRef.current = setTimeout(() => {
        opponentLockedRef.current = true;
        setOpponentLocked(true);
        setOpponentTimeSec(timeSpentSec + Math.round(remainingDelay / 1000));
        startReveal(optKey, timeSpentSec);
      }, remainingDelay);
    }
  };

  // Time expired
  const handleTimeExpired = () => {
    if (userLockedRef.current || isRevealing) return;
    userLockedRef.current = true;
    opponentLockedRef.current = true;
    startReveal(null, 45);
  };

  // Keyboard shortcut listener for 1, 2, 3, 4
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (userLocked || isRevealing) return;
      const key = e.key.toLowerCase();
      if (key === '1' || key === 'a') handleSelectOption('a');
      else if (key === '2' || key === 'b') handleSelectOption('b');
      else if (key === '3' || key === 'c') handleSelectOption('c');
      else if (key === '4' || key === 'd') handleSelectOption('d');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [userLocked, isRevealing]);

  const userIsLeading = userScore > opponentScore;
  const oppIsLeading = opponentScore > userScore;

  return (
    <div className="relative flex flex-1 flex-col items-center justify-between w-full max-w-4xl px-3 sm:px-6 py-2 select-none min-h-[580px]">
      {/* ── TOP BATTLE HUD (Dropper Design System + SVG Icons, strictly no text emojis) ── */}
      <div className="w-full rounded-2xl bg-[#091024]/90 border border-white/10 p-3 sm:p-4 shadow-xl backdrop-blur-md z-30">
        <div className="flex items-center justify-between">
          {/* Left Player: You */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="relative">
              {userIsLeading && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <Crown className="size-4 fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_#fbbf24]" />
                </div>
              )}
              <div className="size-10 sm:size-12 rounded-full border-2 border-amber-400 bg-slate-900 p-0.5 overflow-hidden shadow-md">
                {userAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userAvatar} alt={userName} className="size-full rounded-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center rounded-full bg-sky-600 text-xs sm:text-sm font-black text-white">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-xs sm:text-base font-bold text-white">{userName}</span>
                {userIsLeading && <Crown className="size-3 text-amber-400 fill-amber-400" />}
              </div>

              {/* 5 Capsules for You */}
              <div className="mt-1 flex items-center gap-1 sm:gap-1.5">
                {[0, 1, 2, 3, 4].map((idx) => {
                  const state = userAnswers[idx];
                  const isCurrent = idx === currentIdx;

                  let bgClass = 'bg-slate-700/60 border border-slate-600/40';
                  if (state === true) bgClass = 'bg-emerald-500 shadow-[0_0_8px_#10b981]';
                  else if (state === false) bgClass = 'bg-rose-500 shadow-[0_0_8px_#ef4444]';
                  else if (isCurrent && userLocked) bgClass = 'bg-sky-400 border-2 border-sky-300 animate-pulse';
                  else if (isCurrent) bgClass = 'bg-sky-400/30 border-2 border-sky-400 animate-pulse';

                  return (
                    <div
                      key={idx}
                      className={`h-2 sm:h-2.5 w-4 sm:w-7 rounded-full transition-all duration-300 ${bgClass}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center Timer */}
          <div className="flex flex-col items-center justify-center px-1">
            <div
              className={`flex items-center gap-1 sm:gap-1.5 rounded-full px-2.5 sm:px-3 py-1 text-xs sm:text-sm font-black tabular-nums transition-colors ${
                timer <= 10
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 animate-pulse'
                  : 'bg-white/10 text-white border border-white/10'
              }`}
            >
              <Clock className="size-3 sm:size-3.5" />
              <span>{timer}s</span>
            </div>
            <span className="text-[9px] sm:text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
              Question {currentIdx + 1} of 5
            </span>
          </div>

          {/* Right Player: Opponent */}
          <div className="flex items-center gap-2.5 sm:gap-3 flex-row-reverse sm:flex-row text-right sm:text-left">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                {oppIsLeading && <Crown className="size-3 text-amber-400 fill-amber-400" />}
                <span className="text-xs sm:text-base font-bold text-white">{opponent.name}</span>
              </div>

              {/* 5 Capsules for Opponent */}
              <div className="mt-1 flex items-center gap-1 sm:gap-1.5 flex-row-reverse">
                {[0, 1, 2, 3, 4].map((idx) => {
                  const state = opponentAnswers[idx];
                  const isCurrent = idx === currentIdx;

                  let bgClass = 'bg-slate-700/60 border border-slate-600/40';
                  if (state === true) bgClass = 'bg-emerald-500 shadow-[0_0_8px_#10b981]';
                  else if (state === false) bgClass = 'bg-rose-500 shadow-[0_0_8px_#ef4444]';
                  else if (isCurrent && opponentLocked) bgClass = 'bg-amber-400 border-2 border-amber-300 animate-pulse';
                  else if (isCurrent) bgClass = 'bg-sky-400/30 border-2 border-sky-400 animate-pulse';

                  return (
                    <div
                      key={idx}
                      className={`h-2 sm:h-2.5 w-4 sm:w-7 rounded-full transition-all duration-300 ${bgClass}`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="relative">
              {oppIsLeading && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 z-10">
                  <Crown className="size-4 fill-amber-400 text-amber-400 drop-shadow-[0_0_8px_#fbbf24]" />
                </div>
              )}
              <div className="size-10 sm:size-12 rounded-full border-2 border-amber-400 bg-slate-900 p-0.5 overflow-hidden shadow-md">
                {opponent.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={opponent.avatar_url} alt={opponent.name} className="size-full rounded-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center rounded-full bg-amber-600 text-xs sm:text-sm font-black text-white">
                    {opponent.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Live Solve Status Footer */}
        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-300 px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Score:</span>
            <span className="font-bold text-white">{userScore} - {opponentScore}</span>
          </div>

          <div className="flex items-center gap-1.5 font-medium">
            {userLocked && !opponentLocked && (
              <span className="text-sky-300 italic flex items-center gap-1">
                <Loader2 className="size-3 animate-spin" /> You answered! Waiting for {opponent.name}...
              </span>
            )}
            {opponentLocked && !userLocked && (
              <span className="text-amber-300 font-semibold flex items-center gap-1">
                <Check className="size-3" /> {opponent.name} locked in ({opponentTimeSec}s)! Pick your answer!
              </span>
            )}
            {!userLocked && !opponentLocked && (
              <span className="text-slate-400 italic">
                {opponent.name} is solving...
              </span>
            )}
            {userLocked && opponentLocked && (
              <span className="text-emerald-400 font-bold">Both answered! Revealing...</span>
            )}
          </div>
        </div>
      </div>

      {/* ── QUESTION CARD WITH SMOOTH SLIDE-DOWN ANIMATION ── */}
      <motion.div
        animate={{
          y: isRevealing ? 600 : 0,
          opacity: isRevealing ? 0 : 1,
          scale: isRevealing ? 0.92 : 1,
        }}
        transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
        className="relative w-full my-auto rounded-3xl bg-white text-slate-900 shadow-2xl p-5 sm:p-7 md:p-8 border border-slate-100 dark:bg-[#12182b] dark:text-slate-100 dark:border-white/10 z-20"
      >
        {/* Header tags */}
        <div className="flex items-center justify-between mb-3 text-xs">
          <span className="font-extrabold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
            Question {currentIdx + 1}
          </span>
          <span className="rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-700 dark:text-slate-300">
            {currentQ.subject || 'Science'} · {currentQ.chapter || 'Core Concepts'}
          </span>
        </div>

        {/* Question Text */}
        <div className="text-base sm:text-lg md:text-xl font-bold leading-relaxed text-slate-900 dark:text-white mb-6">
          {renderContent(questionText, false) || questionText}
        </div>

        {/* Optional Question Diagram Image */}
        {currentQ.question_img_url && (
          <div className="my-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={currentQ.question_img_url}
              alt="Question diagram"
              className="max-h-52 rounded-xl border border-slate-200 dark:border-white/10 object-contain shadow-sm"
            />
          </div>
        )}

        {/* Options Grid (A, B, C, D) */}
        <div className="grid grid-cols-1 gap-2.5 sm:gap-3">
          {[
            { key: 'a', text: currentQ.option_a, img: currentQ.option_a_img },
            { key: 'b', text: currentQ.option_b, img: currentQ.option_b_img },
            { key: 'c', text: currentQ.option_c, img: currentQ.option_c_img },
            { key: 'd', text: currentQ.option_d, img: currentQ.option_d_img },
          ].map((opt, optIdx) => {
            const isSelected = selectedOption === opt.key;

            let optStyle =
              'border-slate-200 dark:border-white/10 bg-slate-50/80 dark:bg-white/[0.04] text-slate-900 dark:text-slate-100 hover:border-sky-400 hover:bg-sky-50/50 dark:hover:bg-white/[0.08]';

            if (isSelected) {
              optStyle =
                'border-sky-500 bg-sky-50 text-sky-950 dark:bg-sky-950/60 dark:text-sky-100 dark:border-sky-400 shadow-md ring-2 ring-sky-400/40';
            }

            return (
              <button
                key={opt.key}
                disabled={userLocked || isRevealing}
                onClick={() => handleSelectOption(opt.key)}
                className={`group relative flex w-full items-center gap-3 rounded-2xl border-2 px-4 py-3 sm:py-3.5 text-left text-sm sm:text-base font-semibold transition duration-200 active:scale-[0.99] ${optStyle}`}
              >
                {/* Badge A, B, C, D */}
                <span
                  className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-black uppercase transition ${
                    isSelected
                      ? 'bg-sky-500 text-white'
                      : 'bg-slate-200 text-slate-800 dark:bg-white/15 dark:text-slate-200'
                  }`}
                >
                  {opt.key.toUpperCase()}
                </span>

                {/* Option Content */}
                <div className="flex-1 overflow-x-auto text-slate-900 dark:text-white">
                  {opt.img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={opt.img} alt={`Option ${opt.key}`} className="max-h-14 rounded object-contain" />
                  ) : (
                    renderContent(opt.text, false) || opt.text
                  )}
                </div>

                {isSelected && (
                  <span className="text-xs font-bold text-sky-600 dark:text-sky-400 flex items-center gap-1">
                    <Check className="size-3.5" /> Locked
                  </span>
                )}
                {!isSelected && (
                  <span className="hidden sm:inline-block text-[11px] font-mono text-slate-400 opacity-50 group-hover:opacity-100">
                    [{optIdx + 1}]
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </motion.div>

      {/* ── BIG 3D REVEAL OVERLAY ── */}
      <AnimatePresence>
        {isRevealing && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0 flex items-center justify-between px-8 sm:px-20 md:px-28 z-10 pointer-events-none"
          >
            {/* Left Result for You */}
            <div className="flex flex-col items-center">
              {userAnswers[currentIdx] ? (
                <motion.div
                  initial={{ scale: 0.2, rotate: -20 }}
                  animate={{ scale: 1.4, rotate: 0 }}
                  transition={{ type: 'spring', damping: 11, stiffness: 220 }}
                  className="flex size-24 sm:size-36 items-center justify-center rounded-3xl bg-emerald-500 text-white shadow-[0_0_50px_rgba(16,185,129,0.85)]"
                >
                  <Check className="size-16 sm:size-24 stroke-[4]" />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0.2, rotate: 20 }}
                  animate={{ scale: 1.4, rotate: 0 }}
                  transition={{ type: 'spring', damping: 11, stiffness: 220 }}
                  className="flex size-24 sm:size-36 items-center justify-center rounded-3xl bg-rose-500 text-white shadow-[0_0_50px_rgba(239,68,68,0.85)]"
                >
                  <X className="size-16 sm:size-24 stroke-[4]" />
                </motion.div>
              )}
              <span className="mt-4 text-base sm:text-xl font-black text-white drop-shadow-md">
                {userAnswers[currentIdx] ? 'Correct!' : 'Incorrect'}
              </span>
            </div>

            {/* Right Result for Opponent */}
            <div className="flex flex-col items-center">
              {opponentAnswers[currentIdx] ? (
                <motion.div
                  initial={{ scale: 0.2, rotate: 20 }}
                  animate={{ scale: 1.4, rotate: 0 }}
                  transition={{ type: 'spring', damping: 11, stiffness: 220, delay: 0.1 }}
                  className="flex size-24 sm:size-36 items-center justify-center rounded-3xl bg-emerald-500 text-white shadow-[0_0_50px_rgba(16,185,129,0.85)]"
                >
                  <Check className="size-16 sm:size-24 stroke-[4]" />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0.2, rotate: -20 }}
                  animate={{ scale: 1.4, rotate: 0 }}
                  transition={{ type: 'spring', damping: 11, stiffness: 220, delay: 0.1 }}
                  className="flex size-24 sm:size-36 items-center justify-center rounded-3xl bg-rose-500 text-white shadow-[0_0_50px_rgba(239,68,68,0.85)]"
                >
                  <X className="size-16 sm:size-24 stroke-[4]" />
                </motion.div>
              )}
              <span className="mt-4 text-base sm:text-xl font-black text-white drop-shadow-md">
                {opponent.name} {opponentAnswers[currentIdx] ? 'Correct' : 'Missed'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
