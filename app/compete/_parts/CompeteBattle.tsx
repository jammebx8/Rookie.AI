'use client';

import React, { useEffect, useState, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Crown, Clock, Check, X } from 'lucide-react';
import { competeAudio } from '@/lib/competeAudio';
import { renderContent } from '@/app/components/renderContent';
import type { CompeteQuestion, CompeteOpponent, MatchRetentionPlan } from '@/lib/competeEngine';

interface CompeteBattleProps {
  questions: CompeteQuestion[];
  opponent: CompeteOpponent;
  matchPlan: MatchRetentionPlan;
  userName?: string;
  userAvatar?: string | null;
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
  onBattleFinished,
}: CompeteBattleProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userScore, setUserScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);

  // Track answers for all 5 questions
  const [userAnswers, setUserAnswers] = useState<(boolean | null)[]>([null, null, null, null, null]);
  const [opponentAnswers, setOpponentAnswers] = useState<(boolean | null)[]>([null, null, null, null, null]);
  const [userTimes, setUserTimes] = useState<number[]>([]);

  // Current question states
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isAnswerLocked, setIsAnswerLocked] = useState(false);
  const [showFeedbackReveal, setShowFeedbackReveal] = useState(false);
  const [opponentLocked, setOpponentLocked] = useState(false);
  const [opponentThinking, setOpponentThinking] = useState(true);

  // Timer: 45 seconds per question
  const [timer, setTimer] = useState(45);
  const questionStartTimeRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<any>(null);
  const opponentTimeoutRef = useRef<any>(null);

  const currentQ = questions[currentIdx] || questions[0];

  // Helper to determine if bot should get this question right based on match plan
  const willBotGetCorrect = useCallback(
    (qIdx: number) => !matchPlan.botMistakeIndices.includes(qIdx),
    [matchPlan]
  );

  // Start question timer & bot simulator
  useEffect(() => {
    questionStartTimeRef.current = Date.now();
    setTimer(45);
    setSelectedOption(null);
    setIsAnswerLocked(false);
    setShowFeedbackReveal(false);
    setOpponentLocked(false);
    setOpponentThinking(true);

    // Bot simulation: bot answers at botResponseTimesSec
    const botTimeSec = matchPlan.botResponseTimesSec[currentIdx] || 12;
    opponentTimeoutRef.current = setTimeout(() => {
      setOpponentThinking(false);
      setOpponentLocked(true);
    }, botTimeSec * 1000);

    // 45-second ticking timer
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
      clearTimeout(opponentTimeoutRef.current);
    };
  }, [currentIdx, matchPlan]);

  // Handle User selecting an option
  const handleSelectOption = useCallback(
    (optionKey: string) => {
      if (isAnswerLocked) return;

      const timeSpentSec = Math.max(1, Math.round((Date.now() - questionStartTimeRef.current) / 1000));
      competeAudio.playSelect();
      setSelectedOption(optionKey);
      setIsAnswerLocked(true);
      clearInterval(timerIntervalRef.current);

      const isCorrect = optionKey.toLowerCase() === currentQ.correct_option.toLowerCase();
      const botCorrect = willBotGetCorrect(currentIdx);

      // Play right/wrong sound
      if (isCorrect) {
        competeAudio.playCorrect();
      } else {
        competeAudio.playWrong();
      }

      // Update answers state
      setUserAnswers((prev) => {
        const next = [...prev];
        next[currentIdx] = isCorrect;
        return next;
      });

      setOpponentAnswers((prev) => {
        const next = [...prev];
        next[currentIdx] = botCorrect;
        return next;
      });

      if (isCorrect) setUserScore((s) => s + 1);
      if (botCorrect) setOpponentScore((s) => s + 1);

      setUserTimes((prev) => [...prev, timeSpentSec]);

      // Show Instant 3D Feedback (Image 9)
      setShowFeedbackReveal(true);

      // Dramatic reveal pause for 1.8s, then next question or battle finished
      setTimeout(() => {
        if (currentIdx + 1 < questions.length) {
          setCurrentIdx((i) => i + 1);
        } else {
          // Finished all 5 questions!
          const finalUserScore = userScore + (isCorrect ? 1 : 0);
          const finalOppScore = opponentScore + (botCorrect ? 1 : 0);
          const finalUserAnswers = [...userAnswers];
          finalUserAnswers[currentIdx] = isCorrect;
          const finalOppAnswers = [...opponentAnswers];
          finalOppAnswers[currentIdx] = botCorrect;

          const totalTime = [...userTimes, timeSpentSec].reduce((a, b) => a + b, 0);
          const avgTime = Math.round(totalTime / questions.length);

          onBattleFinished(
            finalUserScore,
            finalOppScore,
            finalUserAnswers.map((a) => !!a),
            finalOppAnswers.map((a) => !!a),
            avgTime
          );
        }
      }, 1900);
    },
    [
      isAnswerLocked,
      currentQ,
      currentIdx,
      willBotGetCorrect,
      userScore,
      opponentScore,
      userAnswers,
      opponentAnswers,
      userTimes,
      questions.length,
      onBattleFinished,
    ]
  );

  // Time expired without user choosing
  const handleTimeExpired = useCallback(() => {
    if (isAnswerLocked) return;
    setIsAnswerLocked(true);
    competeAudio.playWrong();

    const botCorrect = willBotGetCorrect(currentIdx);
    if (botCorrect) setOpponentScore((s) => s + 1);

    setUserAnswers((prev) => {
      const next = [...prev];
      next[currentIdx] = false;
      return next;
    });

    setOpponentAnswers((prev) => {
      const next = [...prev];
      next[currentIdx] = botCorrect;
      return next;
    });

    setShowFeedbackReveal(true);

    setTimeout(() => {
      if (currentIdx + 1 < questions.length) {
        setCurrentIdx((i) => i + 1);
      } else {
        const finalUserScore = userScore;
        const finalOppScore = opponentScore + (botCorrect ? 1 : 0);
        const finalUserAnswers = [...userAnswers];
        finalUserAnswers[currentIdx] = false;
        const finalOppAnswers = [...opponentAnswers];
        finalOppAnswers[currentIdx] = botCorrect;

        const totalTime = [...userTimes, 45].reduce((a, b) => a + b, 0);
        const avgTime = Math.round(totalTime / questions.length);

        onBattleFinished(
          finalUserScore,
          finalOppScore,
          finalUserAnswers.map((a) => !!a),
          finalOppAnswers.map((a) => !!a),
          avgTime
        );
      }
    }, 1900);
  }, [
    isAnswerLocked,
    currentIdx,
    willBotGetCorrect,
    userScore,
    opponentScore,
    userAnswers,
    opponentAnswers,
    userTimes,
    questions.length,
    onBattleFinished,
  ]);

  // Keyboard shortcut listener for 1, 2, 3, 4 or A, B, C, D
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (isAnswerLocked) return;
      const key = e.key.toLowerCase();
      if (key === '1' || key === 'a') handleSelectOption('a');
      else if (key === '2' || key === 'b') handleSelectOption('b');
      else if (key === '3' || key === 'c') handleSelectOption('c');
      else if (key === '4' || key === 'd') handleSelectOption('d');
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSelectOption, isAnswerLocked]);

  const userIsLeading = userScore > opponentScore;
  const oppIsLeading = opponentScore > userScore;

  return (
    <div className="relative flex flex-1 flex-col items-center w-full max-w-4xl px-4 py-2 select-none">
      {/* ── TOP BATTLE HUD (Images 5, 6, 7) ── */}
      <div className="w-full rounded-2xl bg-[#091024]/90 border border-white/10 p-3 sm:p-4 shadow-xl backdrop-blur-md mb-4 sm:mb-6">
        <div className="flex items-center justify-between">
          {/* Left Player: You */}
          <div className="flex items-center gap-3">
            <div className="relative">
              {/* Crown indicator if leading */}
              {userIsLeading && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-amber-400 drop-shadow-[0_0_8px_#fbbf24] z-10">
                  <Crown className="size-4 fill-amber-400" />
                </div>
              )}
              {/* Diamond badge on avatar */}
              <div className="absolute -top-1 -right-1 text-[11px] text-amber-400 font-bold z-10">
                ◆
              </div>
              <div className="size-11 sm:size-13 rounded-full border-2 border-amber-400 bg-slate-900 p-0.5 overflow-hidden shadow-md">
                {userAvatar ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={userAvatar} alt={userName} className="size-full rounded-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center rounded-full bg-sky-600 text-sm font-black text-white">
                    {userName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="text-sm sm:text-base font-bold text-white">{userName}</span>
                {userIsLeading && <Crown className="size-3.5 text-amber-400 fill-amber-400" />}
              </div>

              {/* 5 Round Capsules for You */}
              <div className="mt-1 flex items-center gap-1.5">
                {[0, 1, 2, 3, 4].map((idx) => {
                  const state = userAnswers[idx];
                  const isCurrent = idx === currentIdx;

                  let bgClass = 'bg-slate-700/50 border border-slate-600/40';
                  if (state === true) bgClass = 'bg-emerald-500 shadow-[0_0_8px_#10b981]';
                  else if (state === false) bgClass = 'bg-rose-500 shadow-[0_0_8px_#ef4444]';
                  else if (isCurrent) bgClass = 'bg-sky-400/30 border-2 border-sky-400 animate-pulse';

                  return (
                    <div
                      key={idx}
                      className={`h-2 sm:h-2.5 w-6 sm:w-8 rounded-full transition-all duration-300 ${bgClass}`}
                    />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Center Timer */}
          <div className="flex flex-col items-center justify-center px-2">
            <div
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs sm:text-sm font-black tabular-nums transition-colors ${
                timer <= 10
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/50 animate-pulse'
                  : 'bg-white/10 text-white border border-white/10'
              }`}
            >
              <Clock className="size-3.5" />
              <span>{timer}s</span>
            </div>
            <span className="text-[10px] text-slate-400 mt-0.5 uppercase tracking-wider font-semibold">
              Q{currentIdx + 1} of 5
            </span>
          </div>

          {/* Right Player: Opponent */}
          <div className="flex items-center gap-3 flex-row-reverse sm:flex-row text-right sm:text-left">
            <div className="flex flex-col items-end">
              <div className="flex items-center gap-1.5">
                {oppIsLeading && <Crown className="size-3.5 text-amber-400 fill-amber-400" />}
                <span className="text-sm sm:text-base font-bold text-white">{opponent.name}</span>
              </div>

              {/* 5 Round Capsules for Opponent */}
              <div className="mt-1 flex items-center gap-1.5 flex-row-reverse">
                {[0, 1, 2, 3, 4].map((idx) => {
                  const state = opponentAnswers[idx];
                  const isCurrent = idx === currentIdx;

                  let bgClass = 'bg-slate-700/50 border border-slate-600/40';
                  if (state === true) bgClass = 'bg-emerald-500 shadow-[0_0_8px_#10b981]';
                  else if (state === false) bgClass = 'bg-rose-500 shadow-[0_0_8px_#ef4444]';
                  else if (isCurrent) bgClass = 'bg-sky-400/30 border-2 border-sky-400 animate-pulse';

                  return (
                    <div
                      key={idx}
                      className={`h-2 sm:h-2.5 w-6 sm:w-8 rounded-full transition-all duration-300 ${bgClass}`}
                    />
                  );
                })}
              </div>
            </div>

            <div className="relative">
              {oppIsLeading && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 text-amber-400 drop-shadow-[0_0_8px_#fbbf24] z-10">
                  <Crown className="size-4 fill-amber-400" />
                </div>
              )}
              <div className="absolute -top-1 -right-1 text-[11px] text-amber-400 font-bold z-10">
                ◆
              </div>
              <div className="size-11 sm:size-13 rounded-full border-2 border-amber-400 bg-slate-900 p-0.5 overflow-hidden shadow-md">
                {opponent.avatar_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={opponent.avatar_url} alt={opponent.name} className="size-full rounded-full object-cover" />
                ) : (
                  <div className="flex size-full items-center justify-center rounded-full bg-amber-600 text-sm font-black text-white">
                    {opponent.name.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Real-time Bot status ticker */}
        <div className="mt-2 pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-400">Score:</span>
            <span className="font-bold text-white">{userScore} - {opponentScore}</span>
          </div>

          <div className="flex items-center gap-1.5">
            {opponentThinking ? (
              <span className="flex items-center gap-1 text-sky-400/90 italic">
                <span className="size-1.5 rounded-full bg-sky-400 animate-ping" />
                {opponent.name} is solving...
              </span>
            ) : (
              <span className="text-emerald-400 font-medium flex items-center gap-1">
                <Check className="size-3" />
                {opponent.name} locked in!
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ── QUESTION CARD (Images 5, 6) ── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentIdx}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.3 }}
          className="relative w-full rounded-3xl bg-white text-slate-900 shadow-2xl p-5 sm:p-8 border border-slate-100 dark:bg-[#12182b] dark:text-slate-100 dark:border-white/10"
        >
          {/* Question Meta tags */}
          <div className="flex items-center justify-between mb-3 text-xs">
            <span className="font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
              Question {currentIdx + 1}
            </span>
            <span className="rounded-full bg-slate-100 dark:bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              {currentQ.subject} · {currentQ.chapter}
            </span>
          </div>

          {/* Question Text with LaTeX rendering */}
          <div className="text-base sm:text-lg font-semibold leading-relaxed text-slate-800 dark:text-slate-100 mb-6">
            {renderContent(currentQ.question_text, false)}
          </div>

          {/* Optional Question Diagram Image */}
          {currentQ.question_img_url && (
            <div className="my-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={currentQ.question_img_url}
                alt="Question diagram"
                className="max-h-56 rounded-xl border border-slate-200 dark:border-white/10 object-contain shadow-sm"
              />
            </div>
          )}

          {/* Options Grid (A, B, C, D) (Images 5, 6) */}
          <div className="grid grid-cols-1 gap-3">
            {[
              { key: 'a', text: currentQ.option_a, img: currentQ.option_a_img },
              { key: 'b', text: currentQ.option_b, img: currentQ.option_b_img },
              { key: 'c', text: currentQ.option_c, img: currentQ.option_c_img },
              { key: 'd', text: currentQ.option_d, img: currentQ.option_d_img },
            ].map((opt, optIdx) => {
              const isSelected = selectedOption === opt.key;
              const isCorrectOpt = opt.key.toLowerCase() === currentQ.correct_option.toLowerCase();

              // Styling when answer is locked in reveal state
              let optStyle =
                'border-slate-200 dark:border-white/10 bg-slate-50/70 dark:bg-white/[0.04] text-slate-800 dark:text-slate-200 hover:border-sky-400 hover:bg-sky-50/40 dark:hover:bg-white/[0.08]';

              if (showFeedbackReveal) {
                if (isCorrectOpt) {
                  optStyle =
                    'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.2)]';
                } else if (isSelected && !isCorrectOpt) {
                  optStyle =
                    'border-rose-500 bg-rose-50 text-rose-900 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-500';
                }
              } else if (isSelected) {
                optStyle =
                  'border-sky-500 bg-sky-50 text-sky-900 dark:bg-sky-950/50 dark:text-sky-200 dark:border-sky-400';
              }

              return (
                <button
                  key={opt.key}
                  disabled={isAnswerLocked}
                  onClick={() => handleSelectOption(opt.key)}
                  className={`group relative flex w-full items-center gap-3.5 rounded-2xl border-2 px-4 py-3.5 text-left text-sm sm:text-base font-medium transition duration-200 active:scale-[0.99] ${optStyle}`}
                >
                  {/* Option Badge (A, B, C, D) */}
                  <span
                    className={`flex size-7 shrink-0 items-center justify-center rounded-lg text-xs font-bold uppercase transition ${
                      showFeedbackReveal && isCorrectOpt
                        ? 'bg-emerald-500 text-white'
                        : isSelected
                        ? 'bg-sky-500 text-white'
                        : 'bg-slate-200/80 text-slate-700 dark:bg-white/10 dark:text-slate-300'
                    }`}
                  >
                    {opt.key.toUpperCase()}
                  </span>

                  {/* Option Content */}
                  <div className="flex-1 overflow-x-auto">
                    {opt.img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={opt.img} alt={`Option ${opt.key}`} className="max-h-16 rounded object-contain" />
                    ) : (
                      renderContent(opt.text, false)
                    )}
                  </div>

                  {/* Key hint badge */}
                  <span className="hidden sm:inline-block text-[11px] font-mono text-slate-400 dark:text-slate-500 opacity-60 group-hover:opacity-100">
                    [{optIdx + 1}]
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      {/* ── INSTANT ANSWER FEEDBACK OVERLAY (Image 9) ── */}
      <AnimatePresence>
        {showFeedbackReveal && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 z-50 pointer-events-none flex items-center justify-between px-8 sm:px-24 max-w-4xl mx-auto"
          >
            {/* Left Result for You (Big Green Check or Red Cross) (Image 9) */}
            <div className="flex flex-col items-center">
              {userAnswers[currentIdx] ? (
                <motion.div
                  initial={{ scale: 0.2, rotate: -25 }}
                  animate={{ scale: 1.3, rotate: 0 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                  className="flex size-28 sm:size-36 items-center justify-center rounded-3xl bg-emerald-500 text-white shadow-[0_0_50px_rgba(16,185,129,0.8)]"
                >
                  <Check className="size-20 sm:size-24 stroke-[3.5]" />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0.2, rotate: 25 }}
                  animate={{ scale: 1.3, rotate: 0 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200 }}
                  className="flex size-28 sm:size-36 items-center justify-center rounded-3xl bg-rose-500 text-white shadow-[0_0_50px_rgba(239,68,68,0.8)]"
                >
                  <X className="size-20 sm:size-24 stroke-[3.5]" />
                </motion.div>
              )}
              <span className="mt-3 text-lg font-black text-white drop-shadow-md">
                {userAnswers[currentIdx] ? 'Correct!' : 'Incorrect'}
              </span>
            </div>

            {/* Right Result for Opponent (Big Green Check or Red Cross) (Image 9) */}
            <div className="flex flex-col items-center">
              {opponentAnswers[currentIdx] ? (
                <motion.div
                  initial={{ scale: 0.2, rotate: 25 }}
                  animate={{ scale: 1.3, rotate: 0 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                  className="flex size-28 sm:size-36 items-center justify-center rounded-3xl bg-emerald-500 text-white shadow-[0_0_50px_rgba(16,185,129,0.8)]"
                >
                  <Check className="size-20 sm:size-24 stroke-[3.5]" />
                </motion.div>
              ) : (
                <motion.div
                  initial={{ scale: 0.2, rotate: -25 }}
                  animate={{ scale: 1.3, rotate: 0 }}
                  transition={{ type: 'spring', damping: 12, stiffness: 200, delay: 0.1 }}
                  className="flex size-28 sm:size-36 items-center justify-center rounded-3xl bg-rose-500 text-white shadow-[0_0_50px_rgba(239,68,68,0.8)]"
                >
                  <X className="size-20 sm:size-24 stroke-[3.5]" />
                </motion.div>
              )}
              <span className="mt-3 text-lg font-black text-white drop-shadow-md">
                {opponent.name} {opponentAnswers[currentIdx] ? 'Correct' : 'Missed'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
