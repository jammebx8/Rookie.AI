'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/public/src/utils/supabase';
import { notify } from '@/components/rookie/toast';
import { PhoneRequiredModal } from '@/components/rookie/PhoneRequiredModal';

const ATTEMPT_EVENT = 'rookie:attempt-recorded';
const PHONE_SAVED_EVENT = 'rookie:phone-saved';

/** Notify the global phone gate that a new question attempt was recorded. */
export function notifyAttemptRecorded() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new Event(ATTEMPT_EVENT));
  }
}

function shouldSkipPath(pathname: string | null): boolean {
  if (!pathname) return true;
  if (pathname === '/') return true;
  if (pathname.startsWith('/design-system')) return true;
  return false;
}

/**
 * Global phone collection gate mounted in RootLayout.
 * Always verifies against Supabase `users.phone` and checks whether the
 * authenticated user has > 3 total solved questions (`attempts` / `user_activity`).
 */
export function GlobalPhoneGate() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [userId, setUserId] = useState('');
  const checkSeqRef = useRef(0);

  const checkPhoneRequirement = useCallback(async () => {
    const seq = ++checkSeqRef.current;

    if (shouldSkipPath(pathname)) {
      setOpen(false);
      return;
    }

    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      if (seq !== checkSeqRef.current) return;

      if (authError || !authUser) {
        setOpen(false);
        setUserId('');
        return;
      }

      setUserId(authUser.id);

      // Always check directly from Supabase users table (never trust local cache alone)
      const { data: dbUser, error: userError } = await supabase
        .from('users')
        .select('phone')
        .eq('id', authUser.id)
        .maybeSingle();

      if (seq !== checkSeqRef.current) return;

      if (userError) {
        console.warn('[GlobalPhoneGate] Failed to check users.phone:', userError.message);
        return;
      }

      const dbPhone = typeof dbUser?.phone === 'string' ? dbUser.phone.trim() : '';
      const dbDigits = dbPhone.replace(/\D/g, '');

      if (dbDigits.length >= 10) {
        // Keep localStorage @user aligned with Supabase
        try {
          const raw = localStorage.getItem('@user');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed?.phone !== dbPhone) {
              localStorage.setItem('@user', JSON.stringify({ ...parsed, phone: dbPhone }));
            }
          }
        } catch {}
        setOpen(false);
        return;
      }

      // Keep localStorage aligned if DB has no phone yet
      try {
        const raw = localStorage.getItem('@user');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed?.phone) {
            localStorage.setItem('@user', JSON.stringify({ ...parsed, phone: null }));
          }
        }
      } catch {}

      // Check Total solved questions > 3 from Supabase
      const [{ count: attemptsCount, error: attemptsErr }, { count: activityCount, error: activityErr }] =
        await Promise.all([
          supabase
            .from('attempts')
            .select('*', { count: 'exact', head: true })
            .eq('student_id', authUser.id),
          supabase
            .from('user_activity')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', authUser.id),
        ]);

      if (seq !== checkSeqRef.current) return;

      if (attemptsErr && activityErr) {
        console.warn('[GlobalPhoneGate] Failed to count solved questions:', attemptsErr.message);
        return;
      }

      const totalSolved = Math.max(
        attemptsErr ? 0 : (attemptsCount ?? 0),
        activityErr ? 0 : (activityCount ?? 0),
      );

      setOpen(totalSolved > 3);
    } catch (err) {
      console.warn('[GlobalPhoneGate] Unexpected error:', err);
    }
  }, [pathname]);

  useEffect(() => {
    checkPhoneRequirement();
  }, [checkPhoneRequirement]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_OUT') {
        setOpen(false);
        setUserId('');
        return;
      }
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        checkPhoneRequirement();
      }
    });

    const onAttempt = () => {
      // Short delay so fire-and-forget attempts inserts settle in Supabase
      setTimeout(() => {
        checkPhoneRequirement();
      }, 600);
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        checkPhoneRequirement();
      }
    };

    window.addEventListener(ATTEMPT_EVENT, onAttempt);
    window.addEventListener('focus', checkPhoneRequirement);
    document.addEventListener('visibilitychange', onVisibility);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener(ATTEMPT_EVENT, onAttempt);
      window.removeEventListener('focus', checkPhoneRequirement);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [checkPhoneRequirement]);

  if (!open || !userId) return null;

  return (
    <PhoneRequiredModal
      open={open}
      userId={userId}
      onSuccess={(savedPhone) => {
        setOpen(false);
        window.dispatchEvent(new CustomEvent(PHONE_SAVED_EVENT, { detail: { phone: savedPhone } }));
        notify.success('Phone number saved successfully!');
      }}
    />
  );
}
