'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '../public/src/utils/supabase';

export default function AuthSplashPage() {
  const router = useRouter();
  const [isLoadingGif, setIsLoadingGif] = useState(false);
  const gifDisplayTime = 2000; // ms

  useEffect(() => {
    let subscription: any;
    let mounted = true;

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // If there's already an authenticated user, send to onboarding which finishes routing
          router.replace('/auth/onboarding');
          return;
        }
      } catch (err) {
        // non-fatal
        // eslint-disable-next-line no-console
        console.warn('Error checking supabase session on splash:', err);
      }

      try {
        const onboarded = typeof window !== 'undefined' ? window.localStorage.getItem('@user_onboarded') : null;
        if (onboarded === 'true') {
          // Already onboarded -> go to tabs
          router.replace('/(tabs)');
          return;
        }
      } catch (err) {
        // eslint-disable-next-line no-console
        console.warn('Error reading @user_onboarded in splash:', err);
      }

      // No session and not onboarded: show GIF then push to terms agree page
      setIsLoadingGif(true);
      setTimeout(() => {
        if (!mounted) return;
        router.push('/auth/terms-agree');
      }, gifDisplayTime);
    };

    init();

    // Listen for auth state changes while splash is visible (catch sign-in via redirect)
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        router.replace('/auth/onboarding');
      }
    });
    subscription = data?.subscription ?? data?.subscription;

    return () => {
      mounted = false;
      subscription?.unsubscribe?.();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="min-h-screen flex flex-col items-center justify-between p-6">
      <div className="mt-8" />
      <div className="flex-1 flex items-center justify-center">
        <Image src="/logo.png" alt="Logo" width={200} height={200} />
      </div>

      <footer className="h-24 flex items-center justify-center">
        {isLoadingGif ? (
          <div className="flex items-center justify-center">
            <Image src="/667.gif" alt="loading" width={60} height={60} />
          </div>
        ) : (
          <div className="text-center">
            <div className="text-sm text-white/80">From</div>
            <div className="mt-2 font-bold">Dhruv Pathak</div>
          </div>
        )}
      </footer>
    </main>
  );
}