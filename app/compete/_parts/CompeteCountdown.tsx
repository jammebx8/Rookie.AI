'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { competeAudio } from '@/lib/competeAudio';
import type { CompeteOpponent } from '@/lib/competeEngine';

interface CompeteCountdownProps {
  userRating: number;
  userName?: string;
  userAvatar?: string | null;
  opponent: CompeteOpponent;
  onCountdownComplete: () => void;
}

export function CompeteCountdown({
  userRating,
  userName = 'You',
  userAvatar,
  opponent,
  onCountdownComplete,
}: CompeteCountdownProps) {
  const [count, setCount] = useState<number>(3);

  useEffect(() => {
    // Play tick on mount for 3
    competeAudio.playTick();

    const interval = setInterval(() => {
      setCount((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          competeAudio.playGo();
          setTimeout(() => {
            onCountdownComplete();
          }, 600);
          return 0; // "GO!"
        }
        competeAudio.playTick();
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [onCountdownComplete]);

  return (
    <div className="relative flex flex-1 w-full flex-col items-center justify-center px-4 select-none">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[360px] w-[500px] rounded-full bg-blue-600/15 blur-[120px]" />
      </div>

      {/* Main Vs Section (Image 4) */}
      <div className="flex w-full max-w-2xl items-center justify-between px-4 sm:px-12 z-10">
        {/* Left: You */}
        <motion.div
          initial={{ opacity: 0, x: -50, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col items-center"
        >
          <div className="relative size-24 sm:size-28 md:size-32 rounded-full border-4 border-amber-400 bg-slate-900 p-1 shadow-[0_0_25px_rgba(251,191,36,0.4)]">
            {userAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userAvatar} alt={userName} className="size-full rounded-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-700 text-3xl font-black text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span className="mt-3 text-base sm:text-lg font-bold text-white tracking-wide">
            {userName}
          </span>
          <div className="mt-1 flex items-center gap-1.5 font-bold text-amber-400 text-sm sm:text-base">
            <span>◆</span>
            <span className="tabular-nums">{userRating}</span>
          </div>
        </motion.div>

        {/* Center: Countdown Number (Image 4) */}
        <div className="flex flex-col items-center justify-center min-w-[120px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={count}
              initial={{ scale: 0.4, opacity: 0, y: 15 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 1.6, opacity: 0, y: -15 }}
              transition={{ duration: 0.4, ease: [0.175, 0.885, 0.32, 1.275] }}
              className="flex items-center justify-center"
            >
              <span
                className={`text-6xl sm:text-8xl md:text-9xl font-black italic tracking-tighter ${
                  count === 0 ? 'text-emerald-400' : 'text-white'
                }`}
                style={{
                  textShadow:
                    count === 0
                      ? '0 0 35px rgba(52, 211, 153, 0.8)'
                      : '0 0 30px rgba(255, 255, 255, 0.5)',
                }}
              >
                {count === 0 ? 'GO!' : count}
              </span>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right: Opponent */}
        <motion.div
          initial={{ opacity: 0, x: 50, scale: 0.9 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
          className="flex flex-col items-center"
        >
          <div className="relative size-24 sm:size-28 md:size-32 rounded-full border-4 border-amber-400 bg-slate-900 p-1 shadow-[0_0_25px_rgba(251,191,36,0.4)]">
            {opponent.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={opponent.avatar_url} alt={opponent.name} className="size-full rounded-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-700 text-3xl font-black text-white">
                {opponent.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          <span className="mt-3 text-base sm:text-lg font-bold text-white tracking-wide">
            {opponent.name}
          </span>
          <div className="mt-1 flex items-center gap-1.5 font-bold text-amber-400 text-sm sm:text-base">
            <span>◆</span>
            <span className="tabular-nums">{opponent.rating}</span>
          </div>
        </motion.div>
      </div>

      {/* Battle info hint */}
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-10 text-xs sm:text-sm text-slate-400 text-center tracking-wide"
      >
        5 Questions · 45s per Question · Accuracy & Speed decide the winner!
      </motion.p>
    </div>
  );
}
