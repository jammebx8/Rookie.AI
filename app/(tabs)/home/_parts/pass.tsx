'use client';
import React from 'react';
import { motion } from 'framer-motion';
import { BadgeCheck, CalendarClock, Hourglass } from 'lucide-react';
import { PassCard } from '@/components/rookie/sale';
import { Card, CardHead, ListRow, Skeleton } from '@/components/rookie/ui';
import { getPassExpiry } from '../../../../lib/rookiePass';

/**
 * Rookie Pass slot beside "Your next question".
 * Pass-status logic (sessionStorage cache, getPassExpiry, rookiePassUpdated) is unchanged.
 * Free users see the shared PassCard (same triggerCheckout flow); pass holders see a calm status card.
 */
export function RookiePassBanner() {
  // ── Synchronously hydrate from sessionStorage so repeat page views within
  //    5 minutes skip the skeleton entirely.  On a fresh load (no cache) we
  //    intentionally start with passChecked=false so the skeleton shows while
  //    the DB round-trip completes — preventing the free-banner flash.
  const [passExpiry, setPassExpiry] = React.useState<string | null>(() => {
    try {
      if (typeof window === 'undefined') return null;
      const rawUser = localStorage.getItem('@user');
      const uid = rawUser ? JSON.parse(rawUser)?.id : null;
      if (uid) {
        const rawCache = sessionStorage.getItem(`rookie_pass_cache_${uid}`);
        if (rawCache) {
          const c = JSON.parse(rawCache);
          // Cache must be fresh AND belong to this user
          if (c.user_id === uid && Date.now() - c.fetched_at < 5 * 60 * 1000) {
            // has_pass: true → return expiry; has_pass: false → return null (free)
            return c.has_pass ? (c.access_until ?? null) : null;
          }
        }
      }
    } catch {}
    return null;
  });

  const [passChecked, setPassChecked] = React.useState<boolean>(() => {
    try {
      if (typeof window === 'undefined') return false;
      const rawUser = localStorage.getItem('@user');
      const uid = rawUser ? JSON.parse(rawUser)?.id : null;
      if (uid) {
        const rawCache = sessionStorage.getItem(`rookie_pass_cache_${uid}`);
        if (rawCache) {
          const c = JSON.parse(rawCache);
          // Accept cache hit for BOTH paid and free users within TTL
          if (c.user_id === uid && Date.now() - c.fetched_at < 5 * 60 * 1000) {
            return true;
          }
        }
      }
    } catch {}
    // No valid cache → show skeleton until the async check completes
    return false;
  });

  // Check if user already has an active pass from DB
  React.useEffect(() => {
    let mounted = true;
    const checkPass = async (force = false) => {
      try {
        const expiry = await getPassExpiry(undefined, force);
        if (mounted) setPassExpiry(expiry);
      } catch { /* no-op */ } finally {
        if (mounted) setPassChecked(true);
      }
    };
    checkPass();
    const handleUpdate = () => { checkPass(true); };
    window.addEventListener('rookiePassUpdated', handleUpdate);
    return () => {
      mounted = false;
      window.removeEventListener('rookiePassUpdated', handleUpdate);
    };
  }, []);

  // ── Skeleton while determining paid vs free status ──
  if (!passChecked) {
    return (
      <Card className="flex min-h-[320px] flex-col gap-3">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-12 w-40" />
        <Skeleton className="h-3 w-3/4" />
        <div className="mt-auto space-y-2"><Skeleton className="h-4 w-2/3" /><Skeleton className="h-11 w-full" /></div>
      </Card>
    );
  }

  // ── Active pass: calm neutral status card ──
  if (passExpiry) {
    const expiryDate     = new Date(passExpiry);
    const formattedExpiry = expiryDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
    const daysLeft       = Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / 86400000));

    return (
      <motion.div key="pass-paid" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="flex">
        <Card className="flex w-full flex-col">
          <CardHead icon={BadgeCheck} label="Rookie Pass · Active" term="pass" title="Everything unlocked" />
          <p className="text-body-sm text-muted-foreground">JEE Advanced, all years. Plus unlimited tests and AI solutions.</p>
          <div className="mt-auto flex flex-col gap-2 pt-6">
            <ListRow className="justify-between">
              <span className="flex items-center gap-2 text-body-sm font-medium text-muted-foreground"><CalendarClock className="size-4" /> Valid until</span>
              <span className="text-body-sm font-semibold text-foreground">{formattedExpiry}</span>
            </ListRow>
            <ListRow className="justify-between">
              <span className="flex items-center gap-2 text-body-sm font-medium text-muted-foreground"><Hourglass className="size-4" /> Days left</span>
              <span className="text-body-sm font-semibold tabular-nums text-foreground">{daysLeft} days</span>
            </ListRow>
          </div>
        </Card>
      </motion.div>
    );
  }

  // ── Upsell (no pass) ──
  return (
    <motion.div key="pass-free" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.25 }} className="flex">
      <PassCard className="w-full" />
    </motion.div>
  );
}
