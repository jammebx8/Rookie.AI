'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { competeAudio } from '@/lib/competeAudio';
import type { CompeteOpponent } from '@/lib/competeEngine';
import { fetchOpponentsPool, pickOpponent } from '@/lib/competeEngine';

interface CompeteMatchmakingProps {
  userRating: number;
  userName?: string;
  userAvatar?: string | null;
  onMatchFound: (opponent: CompeteOpponent) => void;
}

export function CompeteMatchmaking({
  userRating,
  userName = 'You',
  userAvatar,
  onMatchFound,
}: CompeteMatchmakingProps) {
  const [candidates, setCandidates] = useState<Array<{ name: string; avatar_url: string; ratingOffset: number }>>([]);
  const [activeWheelIndex, setActiveWheelIndex] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Searching for active learners...');
  const [matchFoundOpponent, setMatchFoundOpponent] = useState<CompeteOpponent | null>(null);

  useEffect(() => {
    competeAudio.playTick();

    // Fetch pool of real users from users table
    fetchOpponentsPool().then((pool) => {
      setCandidates(pool);
    });

    // Animate revolving wheel of real avatars
    const interval = setInterval(() => {
      setActiveWheelIndex((prev) => prev + 1);
      competeAudio.playTick();
    }, 420);

    // Realistic multi-stage matchmaking (takes ~5.2s total so it feels genuine and real-time)
    const t1 = setTimeout(() => {
      setStatusMessage('Evaluating rating and syllabus match...');
    }, 1800);

    const t2 = setTimeout(() => {
      setStatusMessage('Opponent located! Establishing connection...');
    }, 3600);

    const t3 = setTimeout(async () => {
      clearInterval(interval);
      const chosenOpponent = await pickOpponent(userRating);
      setMatchFoundOpponent(chosenOpponent);
      setStatusMessage('Match Found!');
      competeAudio.playMatchFound();

      // Short pause on "Match Found!" before countdown starts
      setTimeout(() => {
        onMatchFound(chosenOpponent);
      }, 900);
    }, 5000);

    return () => {
      clearInterval(interval);
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [userRating, onMatchFound]);

  return (
    <div className="relative flex flex-1 w-full max-w-4xl flex-col md:flex-row items-center justify-between px-4 sm:px-8 md:px-12 py-4 select-none overflow-hidden gap-6 sm:gap-10">
      {/* Background glow */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[350px] w-[550px] rounded-full bg-blue-600/10 blur-[120px]" />
      </div>

      {/* Left: You (Player Avatar & Rating) */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="flex flex-col items-center justify-center z-10 shrink-0"
      >
        <div className="relative">
          <div className="absolute -inset-1 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 opacity-70 blur-sm animate-pulse" />
          <div className="relative size-20 sm:size-28 rounded-full border-3 sm:border-4 border-amber-400 bg-slate-900 p-0.5 overflow-hidden shadow-2xl">
            {userAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userAvatar} alt={userName} className="size-full rounded-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-2xl sm:text-3xl font-extrabold text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <span className="mt-3 text-sm sm:text-base font-bold text-white tracking-wide">
          {userName}
        </span>

        <div className="mt-0.5 flex items-center gap-1 font-bold text-amber-400 text-xs sm:text-sm">
          <span>◆</span>
          <span className="tabular-nums">{userRating}</span>
        </div>
      </motion.div>

      {/* Center: "Finding a match" with pulsing radar waves */}
      <div className="flex flex-col items-center justify-center z-10 px-2 text-center max-w-xs sm:max-w-md">
        {/* Radar wave pulse */}
        <div className="relative mb-3 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 2, 2.8], opacity: [0.6, 0.25, 0] }}
            transition={{ duration: 2, repeat: Infinity, ease: 'easeOut' }}
            className="absolute size-16 sm:size-20 rounded-full border-2 border-sky-400/50"
          />
          <motion.div
            animate={{ scale: [1, 1.8, 2.4], opacity: [0.8, 0.3, 0] }}
            transition={{ duration: 2, delay: 0.6, repeat: Infinity, ease: 'easeOut' }}
            className="absolute size-16 sm:size-20 rounded-full border border-sky-300/40"
          />
          <div className="size-3.5 sm:size-4 rounded-full bg-sky-400 shadow-[0_0_15px_#38bdf8]" />
        </div>

        <motion.h2
          key={matchFoundOpponent ? 'found' : 'finding'}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-2xl sm:text-4xl md:text-5xl font-black italic tracking-wide text-white"
        >
          {matchFoundOpponent ? (
            <span className="text-emerald-400 drop-shadow-[0_0_20px_rgba(52,211,153,0.6)]">
              Match Found!
            </span>
          ) : (
            <>
              Finding a match<span className="animate-pulse text-sky-400">...</span>
            </>
          )}
        </motion.h2>

        <p className="mt-2 text-xs sm:text-sm text-sky-300/90 font-medium tracking-wide">
          {statusMessage}
        </p>
      </div>

      {/* Right: Revolving Real User Avatars Wheel */}
      <motion.div
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5 }}
        className="relative flex items-center justify-center z-10 h-32 md:h-72 w-full md:w-36 overflow-hidden md:overflow-visible"
      >
        {matchFoundOpponent ? (
          // Locked in chosen opponent
          <motion.div
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center"
          >
            <div className="size-20 sm:size-28 rounded-full border-4 border-emerald-400 p-0.5 overflow-hidden shadow-[0_0_25px_rgba(52,211,153,0.5)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={matchFoundOpponent.avatar_url || ''}
                alt={matchFoundOpponent.name}
                className="size-full rounded-full object-cover"
              />
            </div>
            <span className="mt-2 text-sm sm:text-base font-bold text-white">
              {matchFoundOpponent.name}
            </span>
            <div className="flex items-center gap-1 font-bold text-amber-400 text-xs sm:text-sm">
              <span>◆</span>
              <span className="tabular-nums">{matchFoundOpponent.rating}</span>
            </div>
          </motion.div>
        ) : (
          // Rotating candidates wheel
          <div className="flex md:flex-col items-center justify-center gap-3">
            {[-1, 0, 1].map((offset) => {
              const index = Math.abs((activeWheelIndex + offset) % (candidates.length || 1));
              const candidate = candidates[index] || {
                name: 'Student',
                avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
              };

              const isCenter = offset === 0;

              return (
                <motion.div
                  key={offset}
                  layout
                  animate={{
                    scale: isCenter ? 1.15 : 0.85,
                    opacity: isCenter ? 1 : 0.5,
                  }}
                  transition={{ duration: 0.3 }}
                  className="relative flex flex-col items-center"
                >
                  <div
                    className={`relative rounded-full p-0.5 overflow-hidden transition-all ${
                      isCenter
                        ? 'size-16 sm:size-20 border-3 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)]'
                        : 'size-11 sm:size-14 border-2 border-sky-400/50'
                    }`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={candidate.avatar_url}
                      alt={candidate.name}
                      className="size-full rounded-full object-cover"
                    />
                  </div>
                  {isCenter && (
                    <span className="mt-1 text-xs font-semibold text-slate-300">
                      {candidate.name}
                    </span>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
}
