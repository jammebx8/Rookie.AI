'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { CompeteHeader } from './_parts/CompeteHeader';
import { CompeteSplash } from './_parts/CompeteSplash';
import { CompeteMatchmaking } from './_parts/CompeteMatchmaking';
import { CompeteCountdown } from './_parts/CompeteCountdown';
import { CompeteBattle } from './_parts/CompeteBattle';
import { CompeteResult } from './_parts/CompeteResult';
import { track } from '@/lib/analytics';
import {
  getCompeteUserStats,
  computeMatchPlan,
  fetchCompeteQuestions,
  processMatchEloAndCoins,
  CURATED_COMPETE_QUESTIONS,
  type CompeteUserStats,
  type CompeteOpponent,
  type CompeteQuestion,
  type MatchRetentionPlan,
} from '@/lib/competeEngine';

type CompeteStage = 'splash' | 'matchmaking' | 'countdown' | 'battle' | 'result';

export default function CompetePage() {
  const router = useRouter();

  // User identity & economy state
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('You');
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [userCoins, setUserCoins] = useState<number>(0);
  const [userExam, setUserExam] = useState<string>('JEE Main and Advanced Preparation');
  const [userStats, setUserStats] = useState<CompeteUserStats>(() => getCompeteUserStats());

  // Match progression state
  const [stage, setStage] = useState<CompeteStage>('splash');
  const [opponent, setOpponent] = useState<CompeteOpponent | null>(null);
  const [questions, setQuestions] = useState<CompeteQuestion[]>(() => [...CURATED_COMPETE_QUESTIONS]);
  const [matchPlan, setMatchPlan] = useState<MatchRetentionPlan | null>(null);

  // Result & Elo / Coins outcome state
  const [userScore, setUserScore] = useState(0);
  const [opponentScore, setOpponentScore] = useState(0);
  const [userAnswers, setUserAnswers] = useState<boolean[]>([]);
  const [opponentAnswers, setOpponentAnswers] = useState<boolean[]>([]);
  const [eloDelta, setEloDelta] = useState(0);
  const [newElo, setNewElo] = useState(1200);
  const [coinsDelta, setCoinsDelta] = useState(0);
  const [newCoins, setNewCoins] = useState(0);

  // Load user data & coins from cache on mount
  useEffect(() => {
    try {
      const cached = localStorage.getItem('@user');
      if (cached) {
        const u = JSON.parse(cached);
        if (u.id) setUserId(u.id);
        if (u.name) setUserName(u.name.split(' ')[0]);
        if (u.avatar_url) setUserAvatar(u.avatar_url);
        if (typeof u.rookieCoinsEarned === 'number') {
          setUserCoins(u.rookieCoinsEarned);
          setNewCoins(u.rookieCoinsEarned);
        } else if (localStorage.getItem('rookie_coins')) {
          const stored = parseInt(localStorage.getItem('rookie_coins') || '0', 10);
          setUserCoins(stored);
          setNewCoins(stored);
        }
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
    setNewElo(freshStats.elo);
  }, []);

  // Dynamic browser title per match stage
  useEffect(() => {
    if (typeof document === 'undefined') return;
    if (stage === 'battle') {
      document.title = 'Compete — Battle in Progress | Rookie.AI';
    } else if (stage === 'countdown') {
      document.title = 'Compete — Get Ready! | Rookie.AI';
    } else if (stage === 'result') {
      document.title = 'Compete — Battle Result | Rookie.AI';
    } else if (stage === 'matchmaking') {
      document.title = 'Compete — Finding Match... | Rookie.AI';
    } else {
      document.title = 'Compete — 1v1 Academic Battle | Rookie.AI';
    }
  }, [stage]);

  // ── Step 0 -> Step 1: Start Matchmaking ──
  const handleStartMatchmaking = useCallback(async () => {
    const currentStats = getCompeteUserStats();
    setUserStats(currentStats);

    // Compute retention plan (determines win bias, bot mistakes, realistic timing)
    const plan = computeMatchPlan(currentStats);
    setMatchPlan(plan);

    // Fetch questions in parallel so they are instantly ready by countdown
    fetchCompeteQuestions().then((qs) => {
      if (qs && qs.length >= 5) setQuestions(qs);
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
    async (
      uScore: number,
      oScore: number,
      uAnswers: boolean[],
      oAnswers: boolean[],
      avgTimeSec: number
    ) => {
      if (!opponent) return;

      const res = await processMatchEloAndCoins(
        uScore,
        oScore,
        opponent,
        userCoins,
        userId,
        avgTimeSec
      );

      setUserScore(uScore);
      setOpponentScore(oScore);
      setUserAnswers(uAnswers);
      setOpponentAnswers(oAnswers);
      setUserStats(res.stats);
      setEloDelta(res.eloDelta);
      setNewElo(res.newElo);
      setCoinsDelta(res.coinsDelta);
      setNewCoins(res.newCoins);
      setUserCoins(res.newCoins);

      track('compete_match_completed', {
        feature: 'compete',
        metadata: {
          won: uScore > oScore,
          tied: uScore === oScore,
          userScore: uScore,
          opponentScore: oScore,
          eloDelta: res.eloDelta,
          coinsDelta: res.coinsDelta,
        },
      });

      setStage('result');
    },
    [opponent, userCoins, userId]
  );

  // ── Rematch (Same opponent, round 2) ──
  const handleRematch = useCallback(async () => {
    if (!opponent) return;

    track('compete_rematch_clicked', {
      feature: 'compete',
      metadata: {
        opponentId: opponent.id,
        opponentName: opponent.name,
      },
    });

    const currentStats = getCompeteUserStats();
    setUserStats(currentStats);
    const plan = computeMatchPlan(currentStats);
    setMatchPlan(plan);

    const freshQuestions = await fetchCompeteQuestions();
    if (freshQuestions && freshQuestions.length >= 5) {
      setQuestions(freshQuestions);
    }

    // Jump straight to 3-2-1 countdown for rematch
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
            userCoins={userCoins}
            onStartMatch={handleStartMatchmaking}
          />
        )}

        {stage === 'matchmaking' && (
          <CompeteMatchmaking
            userCoins={userCoins}
            userElo={userStats.elo}
            userName={userName}
            userAvatar={userAvatar}
            onMatchFound={handleMatchFound}
          />
        )}

        {stage === 'countdown' && opponent && (
          <CompeteCountdown
            userCoins={userCoins}
            userElo={userStats.elo}
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
            userCoins={userCoins}
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
            eloDelta={eloDelta}
            newElo={newElo}
            coinsDelta={coinsDelta}
            newCoins={newCoins}
            userId={userId}
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
