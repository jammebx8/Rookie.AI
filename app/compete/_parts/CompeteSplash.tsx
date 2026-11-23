'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { Swords, Trophy, Flame, Users, Sparkles, ChevronRight } from 'lucide-react';
import type { CompeteUserStats } from '@/lib/competeEngine';
import { calculateIndiaRank } from '@/lib/competeEngine';

interface CompeteSplashProps {
  stats: CompeteUserStats;
  userName?: string;
  onStartMatch: () => void;
}

export function CompeteSplash({ stats, userName = 'Learner', onStartMatch }: CompeteSplashProps) {
  const currentRank = calculateIndiaRank(stats.rating);

  return (
    <div className="relative flex flex-1 flex-col items-center justify-center px-4 py-8 select-none text-center">
      {/* Background radial spotlight */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <div className="h-[460px] w-[540px] rounded-full bg-blue-600/15 blur-[120px]" />
        <div className="absolute h-[320px] w-[320px] rounded-full bg-sky-400/10 blur-[80px]" />
      </div>

      {/* Main 3D Compete Emblem (Image 1) */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        className="relative my-6 flex items-center justify-center"
      >
        {/* Orbital Ellipse Rings (Atom model like Image 1) */}
        <div className="relative flex items-center justify-center">
          {/* Outer ring 1 */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
            className="absolute h-[160px] w-[380px] sm:h-[190px] sm:w-[480px] rounded-[50%] border border-sky-400/40 shadow-[0_0_15px_rgba(56,189,248,0.25)] pointer-events-none"
            style={{ transform: 'rotate(-20deg)' }}
          >
            {/* Orbiting electron 1 */}
            <div className="absolute -top-1.5 left-1/4 size-3.5 rounded-full bg-sky-300 shadow-[0_0_10px_#38bdf8]" />
          </motion.div>

          {/* Outer ring 2 */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 24, repeat: Infinity, ease: 'linear' }}
            className="absolute h-[160px] w-[380px] sm:h-[190px] sm:w-[480px] rounded-[50%] border border-sky-500/30 shadow-[0_0_20px_rgba(14,165,233,0.2)] pointer-events-none"
            style={{ transform: 'rotate(20deg)' }}
          >
            {/* Orbiting electron 2 */}
            <div className="absolute -bottom-1.5 right-1/4 size-3 rounded-full bg-blue-300 shadow-[0_0_10px_#60a5fa]" />
          </motion.div>

          {/* 3D Extruded COMPETE Typography */}
          <div className="relative z-10 px-6 py-4">
            <h1
              className="text-5xl sm:text-7xl md:text-8xl font-black tracking-widest text-[#e0f2fe] uppercase"
              style={{
                fontFamily: 'system-ui, -apple-system, sans-serif',
                textShadow: `
                  0 1px 0 #0284c7,
                  0 2px 0 #0369a1,
                  0 3px 0 #075985,
                  0 4px 0 #0c4a6e,
                  0 5px 0 #082f49,
                  0 6px 1px rgba(0,0,0,0.5),
                  0 0 25px rgba(56, 189, 248, 0.7),
                  0 0 50px rgba(14, 165, 233, 0.4)
                `,
                WebkitTextStroke: '2px #38bdf8',
              }}
            >
              COMPETE
            </h1>
          </div>
        </div>
      </motion.div>

      {/* Subtitle / Battle Pitch */}
      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.5 }}
        className="mt-3 max-w-md text-sm sm:text-base text-slate-300"
      >
        Real-time 1-vs-1 academic battle. Solve 5 rapid questions, outspeed your opponent, earn rating points, and climb national ranks!
      </motion.p>

      {/* Live Learner Activity Indicator */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="mt-6 flex items-center gap-2.5 rounded-full bg-white/5 border border-white/10 px-4 py-1.5 backdrop-blur-md"
      >
        <div className="flex -space-x-1.5 overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="inline-block size-5 rounded-full ring-1 ring-black object-cover" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&auto=format&fit=crop&q=80" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="inline-block size-5 rounded-full ring-1 ring-black object-cover" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&auto=format&fit=crop&q=80" alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="inline-block size-5 rounded-full ring-1 ring-black object-cover" src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=50&auto=format&fit=crop&q=80" alt="" />
        </div>
        <span className="flex items-center gap-1.5 text-xs font-semibold text-sky-300">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
          </span>
          634 learners competing right now
        </span>
      </motion.div>

      {/* User Stats Card Strip */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.45, duration: 0.5 }}
        className="mt-8 grid grid-cols-3 gap-3 w-full max-w-lg"
      >
        {/* Rating */}
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white/[0.06] border border-white/10 p-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            <Sparkles className="size-3.5 text-amber-400" />
            Rating
          </div>
          <div className="mt-1 text-2xl font-black text-amber-400 tabular-nums">
            {stats.rating}
          </div>
          <div className="text-[10px] text-slate-400">Competitive Tier</div>
        </div>

        {/* India Rank */}
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white/[0.06] border border-white/10 p-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            <Trophy className="size-3.5 text-sky-400" />
            India Rank
          </div>
          <div className="mt-1 text-2xl font-black text-sky-300 tabular-nums">
            #{currentRank.toLocaleString('en-IN')}
          </div>
          <div className="text-[10px] text-slate-400">National Standings</div>
        </div>

        {/* Win Streak */}
        <div className="flex flex-col items-center justify-center rounded-2xl bg-white/[0.06] border border-white/10 p-3.5 backdrop-blur-sm">
          <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            <Flame className="size-3.5 text-orange-400" />
            Streak
          </div>
          <div className="mt-1 text-2xl font-black text-orange-400 tabular-nums">
            {stats.streak} {stats.streak === 1 ? 'Win' : 'Wins'}
          </div>
          <div className="text-[10px] text-slate-400">
            {stats.wins}W / {stats.losses}L
          </div>
        </div>
      </motion.div>

      {/* Main Big CTA Button */}
      <motion.div
        initial={{ opacity: 0, scale: 0.92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.55, duration: 0.4 }}
        className="mt-8 w-full max-w-sm"
      >
        <button
          onClick={onStartMatch}
          className="group relative flex w-full items-center justify-center gap-3 overflow-hidden rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 px-8 py-4 text-base sm:text-lg font-bold text-white shadow-[0_0_35px_rgba(14,165,233,0.5)] transition duration-300 hover:shadow-[0_0_50px_rgba(14,165,233,0.7)] hover:scale-[1.02] active:scale-[0.98]"
        >
          {/* Shimmer sweep */}
          <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-1000 group-hover:translate-x-full" />
          <Swords className="size-5 transition group-hover:rotate-12" />
          <span>Find an Opponent</span>
          <ChevronRight className="size-5 transition group-hover:translate-x-1" />
        </button>
      </motion.div>
    </div>
  );
}
