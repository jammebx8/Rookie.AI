'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import confetti from 'canvas-confetti';
import {
  Trophy, RotateCcw, Swords, ChevronDown, ChevronUp, Check, X,
  TrendingUp, Users, ArrowRight, ShieldCheck, Sparkles, BookOpen
} from 'lucide-react';
import { competeAudio } from '@/lib/competeAudio';
import { renderContent } from '@/app/components/renderContent';
import type {
  CompeteQuestion, CompeteOpponent, CompeteUserStats, LeaderboardRival
} from '@/lib/competeEngine';
import { generateLeaderboardSlice } from '@/lib/competeEngine';

interface CompeteResultProps {
  userScore: number;
  opponentScore: number;
  userAnswers: boolean[];
  opponentAnswers: boolean[];
  questions: CompeteQuestion[];
  opponent: CompeteOpponent;
  stats: CompeteUserStats;
  ratingDelta: number;
  newRating: number;
  newRank: number;
  userName?: string;
  userAvatar?: string | null;
  onRematch: () => void;
  onCompeteAgain: () => void;
}

export function CompeteResult({
  userScore,
  opponentScore,
  userAnswers,
  opponentAnswers,
  questions,
  opponent,
  stats,
  ratingDelta,
  newRating,
  newRank,
  userName = 'You',
  userAvatar,
  onRematch,
  onCompeteAgain,
}: CompeteResultProps) {
  const [viewTab, setViewTab] = useState<'summary' | 'leaderboard'>('summary');
  const [showReview, setShowReview] = useState(false);
  const [expandedQIdx, setExpandedQIdx] = useState<number | null>(null);

  const won = userScore > opponentScore;
  const tied = userScore === opponentScore;

  // Fire confetti if won!
  useEffect(() => {
    if (won) {
      competeAudio.playVictory();
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#38bdf8', '#3b82f6', '#fbbf24', '#10b981', '#f43f5e'],
      });
    }
  }, [won]);

  const rivals: LeaderboardRival[] = generateLeaderboardSlice(
    newRank,
    newRating,
    userName,
    userAvatar
  );

  return (
    <div className="relative flex flex-1 flex-col items-center w-full max-w-4xl px-4 py-4 select-none">
      {/* ── TOP RESULT BANNER (Image 2 & 3) ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
          {won ? "You've won!" : tied ? 'Good Game! Tied match' : 'Tough Match! Well played'}
        </h1>
        <p className="mt-1 text-xs sm:text-sm text-slate-300">
          {won
            ? `Outstanding accuracy and speed! You defeated ${opponent.name}.`
            : tied
            ? `Both answered equally well. Rematch to settle the tie!`
            : `${opponent.name} edged ahead this round. Challenge them to a rematch!`}
        </p>
      </motion.div>

      {/* ── WINNER & OPPONENT AVATARS + BLUE AURA BEAM (Image 2) ── */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative my-6 sm:my-8 flex items-center justify-center gap-8 sm:gap-20"
      >
        {/* Left: You */}
        <div className="relative flex flex-col items-center">
          {/* Winner Glowing Blue Aura (Image 2) */}
          {won && (
            <div className="pointer-events-none absolute -inset-8 flex items-center justify-center">
              <div className="h-44 w-44 rounded-full bg-sky-500/35 blur-2xl animate-pulse" />
              <div className="absolute h-56 w-56 rounded-full bg-blue-600/20 blur-3xl" />
            </div>
          )}

          <div
            className={`relative size-24 sm:size-32 rounded-full p-1 bg-slate-900 shadow-2xl transition-all ${
              won
                ? 'border-4 border-sky-400 ring-4 ring-sky-400/40 shadow-[0_0_35px_rgba(56,189,248,0.6)]'
                : 'border-3 border-amber-400'
            }`}
          >
            {userAvatar ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={userAvatar} alt={userName} className="size-full rounded-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center rounded-full bg-sky-600 text-3xl font-black text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <span className="mt-3 text-base sm:text-lg font-bold text-white">{userName}</span>
          <div className="flex items-center gap-1.5 text-amber-400 font-extrabold text-sm sm:text-base">
            <span>◆</span>
            <span className="tabular-nums">{newRating}</span>
            <span className="text-xs text-emerald-400 font-semibold ml-0.5">
              (+{ratingDelta})
            </span>
          </div>
          <span className="text-xs font-semibold text-slate-400 mt-0.5">
            Score: {userScore}/5
          </span>
        </div>

        {/* VS / Middle indicator */}
        <div className="flex flex-col items-center justify-center z-10">
          <span className="text-2xl sm:text-3xl font-black italic text-slate-500">VS</span>
        </div>

        {/* Right: Opponent */}
        <div className="relative flex flex-col items-center">
          {!won && !tied && (
            <div className="pointer-events-none absolute -inset-8 flex items-center justify-center">
              <div className="h-44 w-44 rounded-full bg-amber-500/30 blur-2xl animate-pulse" />
            </div>
          )}

          <div
            className={`relative size-24 sm:size-32 rounded-full p-1 bg-slate-900 shadow-2xl ${
              !won && !tied
                ? 'border-4 border-amber-400 ring-4 ring-amber-400/40'
                : 'border-3 border-amber-400/80'
            }`}
          >
            {opponent.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={opponent.avatar_url} alt={opponent.name} className="size-full rounded-full object-cover" />
            ) : (
              <div className="flex size-full items-center justify-center rounded-full bg-amber-600 text-3xl font-black text-white">
                {opponent.name.charAt(0).toUpperCase()}
              </div>
            )}
          </div>

          <span className="mt-3 text-base sm:text-lg font-bold text-white">{opponent.name}</span>
          <div className="flex items-center gap-1.5 text-amber-400 font-extrabold text-sm sm:text-base">
            <span>◆</span>
            <span className="tabular-nums">{opponent.rating}</span>
          </div>
          <span className="text-xs font-semibold text-slate-400 mt-0.5">
            Score: {opponentScore}/5
          </span>
        </div>
      </motion.div>

      {/* ── ACTION BUTTONS: REMATCH & COMPETE AGAIN (Image 2 & 3) ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35, duration: 0.4 }}
        className="flex flex-col items-center gap-3 w-full max-w-sm mt-2"
      >
        {/* Main CTA */}
        <button
          onClick={onRematch}
          className="group relative flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-6 py-3.5 text-base font-bold text-slate-950 shadow-xl transition hover:bg-slate-100 hover:scale-[1.02] active:scale-[0.98]"
        >
          <RotateCcw className="size-4 transition group-hover:-rotate-90" />
          <span>Rematch</span>
        </button>
        <span className="text-[11px] text-slate-400 -mt-1">
          Challenge {opponent.name} for an immediate rematch
        </span>

        {/* Compete Again */}
        <button
          onClick={onCompeteAgain}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white/10 hover:bg-white/15 border border-white/10 px-6 py-3 text-sm font-semibold text-white transition active:scale-[0.98]"
        >
          <Swords className="size-4 text-sky-400" />
          <span>Compete against next player</span>
        </button>

        {/* Live Active Learners Badge (Image 3) */}
        <div className="flex items-center gap-2 text-xs text-sky-300/90 font-medium mt-1">
          <div className="flex -space-x-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="size-4 rounded-full ring-1 ring-black" src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=50&auto=format&fit=crop&q=80" alt="" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="size-4 rounded-full ring-1 ring-black" src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=50&auto=format&fit=crop&q=80" alt="" />
          </div>
          <span>634 learners competing</span>
        </div>
      </motion.div>

      {/* ── TWO CARDS: RATING & INDIA RANK (Image 3) ── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-4 w-full"
      >
        {/* Card 1: RATING (Image 3) */}
        <div className="flex flex-col rounded-3xl bg-[#091024]/80 border border-white/10 p-5 sm:p-6 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              RATING
            </span>
            <span className="flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 px-2.5 py-0.5 text-xs font-bold text-emerald-400">
              <TrendingUp className="size-3" /> +{ratingDelta} pts
            </span>
          </div>

          <div className="mt-2 text-4xl sm:text-5xl font-black text-amber-400 tabular-nums">
            {newRating}
          </div>

          {/* Sparkline / Rating history display */}
          <div className="mt-4 flex-1 flex flex-col justify-center items-center rounded-2xl bg-white/[0.03] border border-white/5 p-6 text-center">
            {stats.history.length >= 2 ? (
              <div className="w-full">
                <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2">
                  <span>Past Matches</span>
                  <span className="text-emerald-400 font-semibold">{stats.streak} Streak 🔥</span>
                </div>
                {/* Visual SVG Sparkline */}
                <svg className="w-full h-16 overflow-visible" viewBox="0 0 200 40">
                  <defs>
                    <linearGradient id="ratingGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.4" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const recent = stats.history.slice(-6);
                    const minR = Math.min(...recent.map(h => h.newRating)) - 20;
                    const maxR = Math.max(...recent.map(h => h.newRating)) + 20;
                    const range = Math.max(1, maxR - minR);

                    const points = recent.map((h, i) => {
                      const x = (i / Math.max(1, recent.length - 1)) * 190 + 5;
                      const y = 35 - ((h.newRating - minR) / range) * 30;
                      return `${x},${y}`;
                    }).join(' ');

                    return (
                      <>
                        <polyline
                          fill="none"
                          stroke="#38bdf8"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          points={points}
                        />
                        {recent.map((h, i) => {
                          const x = (i / Math.max(1, recent.length - 1)) * 190 + 5;
                          const y = 35 - ((h.newRating - minR) / range) * 30;
                          return (
                            <circle
                              key={i}
                              cx={x}
                              cy={y}
                              r={i === recent.length - 1 ? 4 : 2.5}
                              className={i === recent.length - 1 ? 'fill-sky-400' : 'fill-slate-400'}
                            />
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1.5 py-2">
                <Sparkles className="size-6 text-sky-400/80 mb-1" />
                <span className="text-xs sm:text-sm font-semibold text-slate-300">
                  Play more Compete matches to view detailed trend graph
                </span>
                <span className="text-[11px] text-slate-500">
                  Rating dynamically recalibrates after every 1v1 battle
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Card 2: INDIA RANK (Image 3) */}
        <div className="flex flex-col rounded-3xl bg-[#091024]/80 border border-white/10 p-5 sm:p-6 backdrop-blur-md shadow-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              INDIA RANK
            </span>
            <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
              <Trophy className="size-4" /> National Rank
            </div>
          </div>

          <div className="mt-2 text-4xl sm:text-5xl font-black text-white tabular-nums">
            #{newRank.toLocaleString('en-IN')}
          </div>

          {/* Leaderboard slice list (Image 3) */}
          <div className="mt-4 flex flex-col gap-1.5">
            {rivals.map((rival) => {
              return (
                <div
                  key={rival.rank}
                  className={`flex items-center justify-between rounded-xl px-3.5 py-2 transition-all ${
                    rival.isUser
                      ? 'bg-blue-600/30 border border-blue-400/40 text-white font-bold shadow-md'
                      : 'bg-white/[0.03] text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="w-10 text-xs font-mono text-slate-400 tabular-nums">
                      {rival.rank}
                    </span>
                    <div className="size-6 rounded-full bg-slate-800 border border-white/10 overflow-hidden flex items-center justify-center text-[10px] font-bold">
                      {rival.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={rival.avatar_url} alt={rival.name} className="size-full object-cover" />
                      ) : (
                        rival.name.charAt(0)
                      )}
                    </div>
                    <span className="text-xs sm:text-sm">
                      {rival.isUser ? 'You' : rival.name}
                    </span>
                  </div>

                  <span className="text-xs sm:text-sm font-semibold tabular-nums text-amber-400">
                    {rival.rating}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </motion.div>

      {/* ── QUESTION REVIEW ACCORDION ── */}
      <div className="mt-6 w-full">
        <button
          onClick={() => setShowReview(!showReview)}
          className="flex w-full items-center justify-between rounded-2xl bg-white/[0.04] border border-white/10 px-5 py-3 text-xs sm:text-sm font-semibold text-slate-300 hover:bg-white/[0.08] transition"
        >
          <span className="flex items-center gap-2">
            <BookOpen className="size-4 text-sky-400" />
            Review Questions & Step-by-Step Solutions ({userScore}/5 Correct)
          </span>
          {showReview ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>

        <AnimatePresence>
          {showReview && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3 space-y-3 overflow-hidden"
            >
              {questions.map((q, idx) => {
                const userGot = userAnswers[idx];
                const oppGot = opponentAnswers[idx];
                const isExpanded = expandedQIdx === idx;

                return (
                  <div
                    key={q.id}
                    className="rounded-2xl bg-white/[0.04] border border-white/10 p-4 text-white text-xs sm:text-sm"
                  >
                    <div
                      onClick={() => setExpandedQIdx(isExpanded ? null : idx)}
                      className="flex items-center justify-between cursor-pointer select-none"
                    >
                      <div className="flex items-center gap-2.5">
                        <span
                          className={`flex size-6 items-center justify-center rounded-md font-bold text-xs ${
                            userGot ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          Q{idx + 1}
                        </span>
                        <span className="font-semibold text-slate-200 line-clamp-1">
                          {q.chapter}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400 hidden sm:inline">
                          You: {userGot ? '✓' : '✗'} · {opponent.name}: {oppGot ? '✓' : '✗'}
                        </span>
                        {isExpanded ? <ChevronUp className="size-3.5" /> : <ChevronDown className="size-3.5" />}
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 pt-3 border-t border-white/5 space-y-2 text-slate-300">
                        <div className="font-medium text-white">
                          {renderContent(q.question_text, false)}
                        </div>
                        <div className="text-xs text-emerald-400 font-semibold mt-2">
                          Correct Option: {q.correct_option.toUpperCase()}
                        </div>
                        {q.solution && (
                          <div className="mt-2 rounded-xl bg-white/[0.03] p-3 text-xs leading-relaxed text-slate-300 border border-white/5">
                            <span className="font-bold text-sky-400 block mb-1">Solution:</span>
                            {renderContent(q.solution, false)}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
