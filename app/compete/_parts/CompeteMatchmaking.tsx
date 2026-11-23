'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { competeAudio } from '@/lib/competeAudio';
import type { CompeteOpponent } from '@/lib/competeEngine';
import { fetchOpponentsPool } from '@/lib/competeEngine';

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

  useEffect(() => {
    competeAudio.playTick();

    // Fetch pool of opponents (real users + realistic students)
    fetchOpponentsPool().then(pool => {
      setCandidates(pool);
    });

    // Animate the revolving wheel
    const interval = setInterval(() => {
      setActiveWheelIndex(prev => prev + 1);
      competeAudio.playTick();
    }, 400);

    // After 3.2 seconds, lock in an opponent and trigger Match Found!
    const timer = setTimeout(() => {
      clearInterval(interval);
      competeAudio.playMatchFound();

      // Pick chosen candidate
      fetchOpponentsPool().then(pool => {
        const chosen = pool[Math.floor(Math.random() * pool.length)];
        const oppRating = Math.max(150, userRating + chosen.ratingOffset);
        onMatchFound({
          id: `opp_${chosen.name.toLowerCase()}_${Date.now()}`,
          name: chosen.name,
          avatar_url: chosen.avatar_url,
          rating: oppRating,
          rank: Math.max(1, Math.round(1942 * Math.exp(-(oppRating - 455) / 220))),
        });
      });
    }, 3200);

    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, [userRating, onMatchFound]);

  return (
    <div className="relative flex flex-1 w-full items-center justify-between px-6 sm:px-16 md:px-24 select-none overflow-hidden">
      {/* Background radial atmosphere */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[400px] w-[600px] rounded-full bg-blue-600/10 blur-[130px]" />
      </div>

      {/* Left: You (Player Avatar & Rating) (Image 8) */}
      <motion.div
        initial={{ opacity: 0, x: -40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="flex flex-col items-center justify-center z-10"
      >
        <div className="relative">
          {/* Glowing ring around user */}
          <div className="absolute -inset-1.5 rounded-full bg-gradient-to-r from-amber-400 to-yellow-500 opacity-75 blur-sm animate-pulse" />
          <div className="relative size-24 sm:size-28 md:size-32 rounded-full border-4 border-amber-400 bg-slate-900 p-1 overflow-hidden shadow-2xl">
            {userAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userAvatar} alt={userName} className="size-full rounded-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-indigo-600 text-3xl font-extrabold text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
        </div>

        <span className="mt-4 text-base sm:text-lg font-bold text-white tracking-wide">
          {userName}
        </span>

        {/* Diamond rating tag */}
        <div className="mt-1 flex items-center gap-1.5 font-bold text-amber-400 text-sm sm:text-base">
          <span>◆</span>
          <span className="tabular-nums">{userRating}</span>
        </div>
      </motion.div>

      {/* Center: "Finding a match" with pulsing radar effect (Image 8) */}
      <div className="flex flex-col items-center justify-center z-10 px-4 text-center">
        {/* Radar wave pulse */}
        <div className="relative mb-4 flex items-center justify-center">
          <motion.div
            animate={{ scale: [1, 2, 2.8], opacity: [0.6, 0.25, 0] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
            className="absolute size-20 rounded-full border-2 border-sky-400/50"
          />
          <motion.div
            animate={{ scale: [1, 1.8, 2.4], opacity: [0.8, 0.3, 0] }}
            transition={{ duration: 1.8, delay: 0.6, repeat: Infinity, ease: 'easeOut' }}
            className="absolute size-20 rounded-full border border-sky-300/40"
          />
          <div className="size-4 rounded-full bg-sky-400 shadow-[0_0_15px_#38bdf8]" />
        </div>

        <motion.h2
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-2xl sm:text-4xl md:text-5xl font-black italic tracking-wide text-white"
        >
          Finding a match<span className="animate-pulse text-sky-400">...</span>
        </motion.h2>

        <p className="mt-2 text-xs sm:text-sm text-slate-400 max-w-xs">
          Matching with learners of similar skill and preparation level
        </p>
      </div>

      {/* Right: Revolving Arc of Candidate Profiles (Image 8) */}
      <motion.div
        initial={{ opacity: 0, x: 40 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
        className="relative flex flex-col items-center justify-center z-10 h-72 w-28 sm:w-36"
      >
        <div className="relative flex flex-col items-center gap-3">
          {[-2, -1, 0, 1, 2].map((offset) => {
            const index = Math.abs((activeWheelIndex + offset) % (candidates.length || 1));
            const candidate = candidates[index] || {
              name: offset === 0 ? 'Harshil' : 'Student',
              avatar_url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
            };

            const isCenter = offset === 0;
            const isNear = Math.abs(offset) === 1;

            return (
              <motion.div
                key={offset}
                layout
                animate={{
                  scale: isCenter ? 1.2 : isNear ? 0.9 : 0.65,
                  opacity: isCenter ? 1 : isNear ? 0.7 : 0.35,
                  x: isCenter ? -10 : Math.abs(offset) * 12,
                }}
                transition={{ duration: 0.3 }}
                className="relative flex items-center gap-2"
              >
                <div
                  className={`relative rounded-full p-0.5 overflow-hidden transition-all ${
                    isCenter
                      ? 'size-16 sm:size-20 border-3 border-amber-400 shadow-[0_0_20px_rgba(251,191,36,0.5)]'
                      : 'size-12 border-2 border-sky-400/50'
                  }`}
                >
                  {candidate.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={candidate.avatar_url}
                      alt={candidate.name}
                      className="size-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center rounded-full bg-blue-700 text-white font-bold text-sm">
                      {candidate.name.slice(0, 2)}
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </div>
  );
}
