'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/public/src/utils/supabase';
import { initPassAutoSync } from '@/lib/rookiePass';
import { readStreakFromLocal } from '@/public/src/utils/streakUtils';
import { AppShell, type ShellUser } from '@/components/rookie/app-shell';

/**
 * Tabs layout — visual revamp only. Logic is unchanged from the previous layout:
 *  - loads the signed-in user's `users` row → coins + `@user` / `@user_onboarded` cache
 *  - starts Rookie Pass auto-sync
 *  - mirrors the `rookie_wrong_bookmarks` badge (event + cross-tab storage)
 * New, read-only: streak count for the top bar (from the existing local streak cache).
 */
export default function TabLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [rookieCoins, setRookieCoins] = useState(0);
  const [wrongBadge, setWrongBadge] = useState(0);
  const [user, setUser] = useState<ShellUser>(null);
  const [streak, setStreak] = useState(0);

  // Badge on bookmark tab — count of unseen wrong-answer auto-bookmarks
  useEffect(() => {
    const readBadge = () => {
      try { setWrongBadge(parseInt(localStorage.getItem('rookie_wrong_bookmarks') || '0', 10)); } catch {}
    };
    readBadge();
    const onStorage = (e: StorageEvent) => { if (e.key === 'rookie_wrong_bookmarks') readBadge(); };
    window.addEventListener('wrongBadgeUpdated', readBadge);
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('wrongBadgeUpdated', readBadge);
      window.removeEventListener('storage', onStorage);
    };
  }, []);

  // Streak (read-only, from the same local cache Home writes)
  useEffect(() => {
    const read = () => { try { setStreak(readStreakFromLocal().current || 0); } catch {} };
    read();
    const onStorage = (e: StorageEvent) => { if (e.key === 'rookie_streak_data') read(); };
    window.addEventListener('storage', onStorage);
    window.addEventListener('focus', read);
    return () => { window.removeEventListener('storage', onStorage); window.removeEventListener('focus', read); };
  }, []);

  useEffect(() => {
    const loadUserData = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single();
          if (!error && data) {
            setRookieCoins(data.rookieCoinsEarned || 0);
            setUser({ name: data.name, email: data.email ?? user.email, avatar_url: data.avatar_url, cl: data.cl, exam: data.exam });
            try {
              localStorage.setItem('@user', JSON.stringify({ ...data, rookieCoinsEarned: data.rookieCoinsEarned ?? 0 }));
              localStorage.setItem('@user_onboarded', 'true');
            } catch {}
          }
        }
      } catch (err) {
        console.error('Error loading user profile:', err);
      }
    };

    loadUserData();
    const cleanupPassSync = initPassAutoSync();
    return () => {
      cleanupPassSync();
    };
  }, []);

  // Same steps as the Profile page's Logout button.
  const handleLogout = useCallback(async () => {
    try { await supabase.auth.signOut(); } catch {}
    try {
      const { bustPassCache } = await import('@/lib/rookiePass');
      bustPassCache();
    } catch {}
    localStorage.clear();
    sessionStorage.clear();
    router.push('/');
  }, [router]);

  return (
    <AppShell user={user} coins={rookieCoins} streak={streak} wrongBadge={wrongBadge} onLogout={handleLogout}>
      {children}
    </AppShell>
  );
}
