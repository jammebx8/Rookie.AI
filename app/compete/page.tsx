'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CompeteHeader } from './_parts/CompeteHeader';
import { CompeteSplash } from './_parts/CompeteSplash';
import { CompeteMatchmaking } from './_parts/CompeteMatchmaking';
import { CompeteCountdown } from './_parts/CompeteCountdown';
import { CompeteBattle } from './_parts/CompeteBattle';
import { CompeteResult } from './_parts/CompeteResult';
import {
  getCompeteUserStats,
  computeMatchPlan,
  pickOpponent,
  fetchCompeteQuestions,
  recordMatchResult,
  type CompeteUserStats,
  type CompeteOpponent,
  type CompeteQuestion,
  type MatchRetentionPlan,
} from '@/lib/competeEngine';

type CompeteStage = 'splash' | 'matchmaking' | 'countdown' | 'battle' | 'result';

export default function CompetePage() {
  const router = useRouter();

  // User state
  const [userStats, setUserStats] = useState<CompeteUserStats>(() => getCompeteUserStats());
  const [userName, setUserName] = useState<string>('You');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userExam, setUserExam] = useState<string>('JEE Main and Advanced Preparation');

  // Match progression state
  const [stage, setStage] = useState<CompeteStage>('splash');
  const [opponent, setOpponent] = useState<CompeteOpponent | null>(null);
  const [questions, setQuestions] = useState<CompeteQuestion[]>([]);
  const [matchPlan, setMatchPlan] = useState<MatchRetentionPlan | null>(null);

  // Result state
  const [userScore, setUserScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<boolean[]>([]);
  const [opponentAnswers, setOpponentAnswers] = useState<boolean[]>([]);
  const [ratingDelta, setRatingDelta] = useState(0);
  const [newRating, setNewRating] = useState(450);
  const [newRank, setNewRank] = useState(1942);

  // Load user data on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem('@user');
      if (cached) {
        const u = JSON.parse(cached);
        if (u.name) setUserName(u.name.split(' ')[0]);
        if (u.avatar_url) setUserAvatar(u.avatar_url);
        if (u.exam) {
          setUserExam(
            u.exam.toLowerCase().includes('neet')
              ? 'NEET Preparation'
              : u.exam.toLowerCase().includes('foundation')
              ? 'Foundation & Olympiads'
              : 'JEE Main and Advanced Preparation'
          );
        }
      }
    } catch {}

    const freshStats = getCompeteUserStats();
    setUserStats(freshStats);
    setNewRating(freshStats.rating);
  }, []);

  // ── Step 0 -> Step 1: Start Matchmaking ──
  const handleStartMatchmaking = useCallback(async () => {
    const currentStats = getCompeteUserStats();
    setUserStats(currentStats);

    // Compute retention plan (determines win bias, bot mistakes, timing)
    const plan = computeMatchPlan(currentStats);
    setMatchPlan(plan);

    // Fetch questions in parallel so they are ready by countdown
    fetchCompeteQuestions().then((qs) => {
      setQuestions(qs);
    });

    setStage('matchmaking');
  }, []);

  // ── Step 1 -> Step 2: Match Found ──
  const handleMatchFound = useCallback((opp: CompeteOpponent) => {
    setOpponent(opp);
    setStage('countdown');
  }, []);

  // ── Step 2 -> Step 3: Countdown Complete -> Start Battle ──
  const handleCountdownComplete = useCallback(() => {
    setStage('battle');
  }, []);

  // ── Step 3 -> Step 4/5: Battle Finished -> Calculate Result ──
  const handleBattleFinished = useCallback(
    (
      uScore: number,
      oScore: number,
      uAnswers: boolean[],
      oAnswers: boolean[],
      avgTimeSec: number
    ) => {
      if (!opponent) return;

      const res = recordMatchResult(uScore, oScore, opponent, avgTimeSec);
      setUserScore(uScore);
      setOpponentScore(oScore);
      setUserAnswers(uAnswers);
      setOpponentAnswers(oAnswers);
      setUserStats(res.stats);
      setRatingDelta(res.ratingDelta);
      setNewRating(res.newRating);
      setNewRank(res.newRank);

      setStage('result');
    },
    [opponent]
  );

  // ── Rematch (Same opponent, round 2) ──
  const handleRematch = useCallback(async () => {
    if (!opponent) return;

    const currentStats = getCompeteUserStats();
    setUserStats(currentStats);
    const plan = computeMatchPlan(currentStats);
    setMatchPlan(plan);

    const freshQuestions = await fetchCompeteQuestions();
    setQuestions(freshQuestions);

    // Jump straight to 3-2-1 countdown for rematch!
    setStage('countdown');
  }, [opponent]);

  // ── Compete Again (New opponent) ──
  const handleCompeteAgain = useCallback(() => {
    handleStartMatchmaking();
  }, [handleStartMatchmaking]);

  const handleExit = useCallback(() => {
    router.push('/home');
  }, [router]);

  return (
    <div className="relative min-h-svh w-full flex flex-col bg-[#050914] text-white overflow-x-hidden">
      {/* Dynamic Compete Header */}
      <CompeteHeader
        examTitle={userExam}
        inBattle={stage === 'battle' || stage === 'countdown'}
        onExit={handleExit}
      />

      {/* Main Container */}
      <main className="relative flex flex-1 flex-col items-center justify-center w-full z-10 py-2 sm:py-6">
        {stage === 'splash' && (
          <CompeteSplash
            stats={userStats}
            userName={userName}
            onStartMatch={handleStartMatchmaking}
          />
        )}

        {stage === 'matchmaking' && (
          <CompeteMatchmaking
            userRating={userStats.rating}
            userName={userName}
            userAvatar={userAvatar}
            onMatchFound={handleMatchFound}
          />
        )}

        {stage === 'countdown' && opponent && (
          <CompeteCountdown
            userRating={userStats.rating}
            userName={userName}
            userAvatar={userAvatar}
            opponent={opponent}
            onCountdownComplete={handleCountdownComplete}
          />
        )}

        {stage === 'battle' && opponent && matchPlan && (
          <CompeteBattle
            questions={questions}
            opponent={opponent}
            matchPlan={matchPlan}
            userName={userName}
            userAvatar={userAvatar}
            onBattleFinished={handleBattleFinished}
          />
        )}

        {stage === 'result' && opponent && (
          <CompeteResult
            userScore={userScore}
            opponentScore={opponentScore}
            userAnswers={userAnswers}
            opponentAnswers={opponentAnswers}
            questions={questions}
            opponent={opponent}
            stats={userStats}
            ratingDelta={ratingDelta}
            newRating={newRating}
            newRank={newRank}
            userName={userName}
            userAvatar={userAvatar}
            onRematch={handleRematch}
            onCompeteAgain={handleCompeteAgain}
          />
        )}
      </main>
    </div>
  );
}
