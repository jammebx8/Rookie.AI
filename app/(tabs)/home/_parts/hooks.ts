'use client';
/**
 * Home data hooks. The logic is moved verbatim from the old StreakCard, DailyGoalBar
 * and ContinueSection components so the page header, metric row and resume card can share it.
 */
import { useEffect, useState } from 'react';
import { supabase } from '../../../../public/src/utils/supabase';
import { syncStreakFromSupabase, readStreakFromLocal } from '../../../../public/src/utils/streakUtils';
import { DAILY_GOAL_KEY, countSolvedToday } from './constants';

export type StreakData = { current: number; longest: number; activeDays: string[] };

/* ── Streak (was StreakCard) ── */
export function useStreak() {
  const [streakData, setStreakData] = useState<StreakData>({ current: 0, longest: 0, activeDays: [] as string[] });

  const reloadStreak = () => {
    setStreakData(readStreakFromLocal());
  };

  useEffect(() => {
    // Instant load from localStorage
    reloadStreak();

    // Background sync from Supabase (doesn't block UI)
    syncStreakFromSupabase();

    // Listen for storage changes from other tabs
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'rookie_streak_data') reloadStreak();
    };
    window.addEventListener('storage', handleStorageChange);

    // Listen for visibility changes (refresh when tab becomes active)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        reloadStreak();
        syncStreakFromSupabase();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Listen for custom streak update event from background sync
    const handleStreakUpdated = () => {
      reloadStreak();
    };
    window.addEventListener('streakUpdated', handleStreakUpdated);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('streakUpdated', handleStreakUpdated);
    };
  }, []);

  return streakData;
}

/* ── Daily goal (was DailyGoalBar) ── */
export function useDailyGoal() {
  const [goal, setGoal] = useState<number | null>(null);
  const [solved, setSolved] = useState(0);

  useEffect(() => {
    const refresh = () => {
      try {
        const savedGoal = localStorage.getItem(DAILY_GOAL_KEY);
        if (savedGoal) setGoal(parseInt(savedGoal, 10));
        setSolved(countSolvedToday());
      } catch {}
    };
    refresh();
    const onVisible = () => { if (!document.hidden) refresh(); };
    document.addEventListener('visibilitychange', onVisible);
    const onStorage = (e: StorageEvent) => {
      if (e.key?.startsWith('questionsToday')) refresh();
    };
    window.addEventListener('storage', onStorage);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  /** Same write as the old saveGoal (the picker UI resets its own state). */
  const persistGoal = (g: number) => {
    try { localStorage.setItem(DAILY_GOAL_KEY, String(g)); } catch {}
    setGoal(g);
  };

  const progress = goal ? Math.min(solved / goal, 1) : 0;
  const pct = Math.round(progress * 100);

  return { goal, solved, progress, pct, persistGoal };
}

/* ── Recent session (was ContinueSection) ── */
export type RecentSession = {
  chapter_title: string; subject_name: string; image_key: string; question_index: number;
};

export function useRecentSession() {
  const [session, setSession] = useState<RecentSession | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      setLoading(true);
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('user_recent_session')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (data && !error) {
          setSession(data);
        }
      } catch (err) {
        console.error('Error fetching session:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSession();
  }, []);

  return { session, loading };
}

/** Same URL the old Continue button built. Returns null when there is no chapter to resume. */
export function resumeHref(session: RecentSession | null): string | null {
  if (!session || !session.chapter_title) return null;
  const params = new URLSearchParams({
    subject: session.subject_name || '',
    chapter: session.chapter_title,
    imageKey: session.image_key || '',
    index: String(session.question_index || 0),
    startIndex: String(session.question_index || 0),
  });
  return `/QuestionViewer?${params.toString()}`;
}
