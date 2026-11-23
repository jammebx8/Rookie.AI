'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Swords, Trophy, Flame, Coins, Sparkles, ChevronRight, UserRound } from 'lucide-react';
import type { CompeteUserStats } from '@/lib/competeEngine';
import { fetchRealOpponentsPool, generateSvgAvatar } from '@/lib/competeEngine';

interface CompeteSplashProps {
  stats: CompeteUserStats;
  userName?: string;
  userCoins?: number;
  onStartMatch: () => void;
}

export function CompeteSplash({ stats, userName = 'Learner', userCoins = 0, onStartMatch }: CompeteSplashProps) {
  const [displayAvatars, setDisplayAvatars] = useState<Array<{ id: number; name: string; avatar_url: string }>>([]);

  useEffect(() => {
    fetchRealOpponentsPool().then((pool) => {
      if (pool && pool.length > 0) {
        setDisplayAvatars(
          pool.slice(0, 5).map((u, i) => ({
            id: i,
            name: u.name,
            avatar_url: u.avatar_url || generateSvgAvatar(u.name),
          }))
        );
      }
    });
  }, []);

  // Constantly cycle active avatars: new image pops in and oldest leaves
  useEffect(() => {
    let counter = 5;
    const interval = setInterval(() => {
      fetchRealOpponentsPool().then((pool) => {
        if (!pool || pool.length === 0) return;
        const nextUser = pool[Math.floor(Math.random() * pool.length)];
        counter++;
        setDisplayAvatars((prev) => [
          ...prev.slice(1),
          { id: counter, name: nextUser.name, avatar_url: nextUser.avatar_url || generateSvgAvatar(nextUser.name) },
        ]);
      });
    }, 2500);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center w-full max-w-4xl px-4 py-6 sm:py-10 select-none text-center">
      {/* Sleek Dropper Gradient Background Glow */}
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
          Real-Time 1-vs-1 Academic Battle
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
          Battle 1-on-1 with live learners. Solve 5 timed questions, earn Rookie Coins, climb the platform leaderboard, and test your speed.
        </p>
      </motion.div>

      {/* Live Learner Activity Indicator with real user images & SVG (No green dot) */}
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

        {/* Counter text (Green dot removed) */}
        <span className="text-xs sm:text-sm font-semibold text-sky-200 tracking-wide">
          634 learners competing online
        </span>
      </motion.div>

   
      {/* Action Button without 1v1 tag and with slow shine */}
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
          {/* Slow Continuous Shine */}
          <span className="pointer-events-none absolute inset-0 -translate-x-full animate-comp-shine bg-gradient-to-r from-transparent via-white/30 to-transparent w-full h-full" />
          <Swords className="size-5" />
          <span>Find an Opponent</span>
          <ChevronRight className="size-5 transition group-hover:translate-x-1" />
        </button>
      </motion.div>
    </div>
  );
}
