'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Trophy, Flame, Sparkles, ChevronRight } from 'lucide-react';
import type { CompeteUserStats } from '@/lib/competeEngine';
import { calculateIndiaRank, fetchOpponentsPool, REAL_USER_PROFILES } from '@/lib/competeEngine';

interface CompeteSplashProps {
  stats: CompeteUserStats;
  userName?: string;
  onStartMatch: () => void;
}

export function CompeteSplash({ stats, userName = 'Learner', onStartMatch }: CompeteSplashProps) {
  const currentRank = calculateIndiaRank(stats.rating);
  const [userPool, setUserPool] = useState<Array<{ name: string; avatar_url: string }>>(REAL_USER_PROFILES);
  const [displayAvatars, setDisplayAvatars] = useState<Array<{ id: number; name: string; avatar_url: string }>>([]);

  useEffect(() => {
    fetchOpponentsPool().then((pool) => {
      if (pool && pool.length > 0) {
        setUserPool(pool);
        // Initialize with first 5
        setDisplayAvatars(
          pool.slice(0, 5).map((u, i) => ({ id: i, name: u.name, avatar_url: u.avatar_url }))
        );
      }
    });
  }, []);

  // Constantly cycle active avatars: new image pops in and oldest leaves
  useEffect(() => {
    if (userPool.length === 0) return;

    let counter = 5;
    const interval = setInterval(() => {
      const nextUser = userPool[Math.floor(Math.random() * userPool.length)];
      counter++;
      setDisplayAvatars((prev) => {
        const next = [...prev.slice(1), { id: counter, name: nextUser.name, avatar_url: nextUser.avatar_url }];
        return next;
      });
    }, 2400);

    return () => clearInterval(interval);
  }, [userPool]);

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center w-full max-w-4xl px-4 py-6 sm:py-10 select-none text-center">
      {/* Sleek Dropper Gradient Background Glow (No atom animation) */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden">
        <div className="h-[400px] w-[650px] rounded-full bg-gradient-to-r from-blue-700/15 via-sky-500/10 to-indigo-700/15 blur-[100px]" />
      </div>

      {/* Main 3D Compete Title with Dropper Styling */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative my-4 sm:my-6"
      >
        <div className="inline-block rounded-full bg-sky-500/10 border border-sky-400/20 px-3.5 py-1 text-xs font-bold uppercase tracking-widest text-sky-400 mb-3 backdrop-blur-sm">
          1v1 Real-Time Academic Arena
        </div>

        <h1
          className="text-5xl sm:text-7xl md:text-8xl font-black tracking-widest text-white uppercase drop-shadow-2xl"
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            textShadow: `
              0 2px 0 #0284c7,
              0 4px 0 #075985,
              0 6px 1px rgba(0,0,0,0.4),
              0 0 35px rgba(56, 189, 248, 0.6)
            `,
            WebkitTextStroke: '1.5px rgba(56, 189, 248, 0.8)',
          }}
        >
          COMPETE
        </h1>

        <p className="mt-3 max-w-md mx-auto text-xs sm:text-sm md:text-base text-slate-300 px-2 leading-relaxed font-normal">
          Directly match against another student, solve under pressure, earn rating points, and climb national rankings.
        </p>
      </motion.div>

      {/* Live Learner Activity Indicator with dynamically cycling real user images (No green dot) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="mt-3 sm:mt-5 flex items-center gap-3 rounded-full bg-white/[0.06] border border-white/10 px-4 py-2 backdrop-blur-md shadow-lg"
      >
        {/* Animated Real User Avatars popping in and out */}
        <div className="flex -space-x-2 overflow-visible items-center">
          <AnimatePresence mode="popLayout">
            {displayAvatars.map((u) => (
              <motion.div
                key={u.id}
                layout
                initial={{ scale: 0, opacity: 0, x: 10 }}
                animate={{ scale: 1, opacity: 1, x: 0 }}
                exit={{ scale: 0.5, opacity: 0, x: -10 }}
                transition={{ duration: 0.45, ease: 'easeOut' }}
                className="relative size-6 sm:size-7 rounded-full border-2 border-slate-900 overflow-hidden shadow-sm shrink-0"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={u.avatar_url} alt={u.name} className="size-full object-cover" />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Counter text (Green dot removed as requested) */}
        <span className="text-xs sm:text-sm font-semibold text-sky-200 tracking-wide">
          634 learners competing online
        </span>
      </motion.div>

      {/* User Stats Card Strip (Dropper Design System) */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="mt-6 sm:mt-8 grid grid-cols-3 gap-2.5 sm:gap-4 w-full max-w-lg"
      >
        {/* Rating */}
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white/[0.05] border border-white/10 p-3 sm:p-4 backdrop-blur-sm transition hover:bg-white/[0.08]">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <Sparkles className="size-3.5 text-amber-400 shrink-0" />
            <span>Rating</span>
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-black text-amber-400 tabular-nums">
            {stats.rating}
          </div>
          <div className="text-[10px] text-slate-400 hidden sm:block">Competitive Tier</div>
        </div>

        {/* India Rank */}
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white/[0.05] border border-white/10 p-3 sm:p-4 backdrop-blur-sm transition hover:bg-white/[0.08]">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <Trophy className="size-3.5 text-sky-400 shrink-0" />
            <span>India Rank</span>
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-black text-sky-300 tabular-nums">
            #{currentRank.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400 hidden sm:block">National Standings</div>
        </div>

        {/* Streak */}
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white/[0.05] border border-white/10 p-3 sm:p-4 backdrop-blur-sm transition hover:bg-white/[0.08]">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            <Flame className="size-3.5 text-orange-400 shrink-0" />
            <span>Streak</span>
          </div>
          <div className="mt-1 text-xl sm:text-2xl font-black text-orange-400 tabular-nums">
            {stats.streak} {stats.streak === 1 ? 'Win' : 'Wins'}
          </div>
          <div className="text-[10px] text-slate-400 hidden sm:block">
            {stats.wins}W · {stats.losses}L
          </div>
        </div>
      </motion.div>

      {/* Big Action CTA */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.45, duration: 0.4 }}
        className="mt-6 sm:mt-8 w-full max-w-sm"
      >
        <button
          onClick={onStartMatch}
          className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 px-6 py-4 text-base sm:text-lg font-bold text-white shadow-[0_0_30px_rgba(14,165,233,0.45)] transition duration-300 hover:shadow-[0_0_45px_rgba(14,165,233,0.65)] hover:scale-[1.02] active:scale-[0.98] border border-white/20"
        >
          {/* Continuous subtle shine */}
          <span className="pointer-events-none absolute inset-0 -translate-x-full animate-comp-shine bg-gradient-to-r from-transparent via-white/30 to-transparent w-full h-full" />
          <Swords className="size-5 transition group-hover:rotate-12" />
          <span>Find an Opponent</span>
          <ChevronRight className="size-5 transition group-hover:translate-x-1" />
        </button>
      </motion.div>
    </div>
  );
}
