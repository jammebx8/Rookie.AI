'use client';
import * as React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowRight, Check, Loader2, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { saleMoney as money, saleOff as off, salePerMonth as perMonth, useUserPricing } from '@/lib/sale';
import { bustPassCache, checkUserPaidDirectFromDB, hasRookiePass, triggerCheckout } from '@/lib/rookiePass';
import { supabase } from '@/public/src/utils/supabase';
import { Define } from './define';
import { notify } from './toast';

export { money, off, perMonth };

/** The one gradient for everything Rookie Pass. */
export const PASS_BG = [
  'radial-gradient(90% 70% at 100% 0%, rgba(253,186,18,.38) 0%, transparent 55%)',
  'radial-gradient(70% 60% at 0% 100%, rgba(163,212,255,.32) 0%, transparent 60%)',
  'linear-gradient(155deg, #0d1736 0%, #1b3a8a 48%, #2f6fe0 100%)',
].join(',');
export const STARS = [
  'radial-gradient(1.2px 1.2px at 20% 30%, #fff 50%, transparent 51%)',
  'radial-gradient(1px 1px at 70% 20%, #fff 50%, transparent 51%)',
  'radial-gradient(1.4px 1.4px at 85% 65%, #fff 50%, transparent 51%)',
  'radial-gradient(1px 1px at 35% 80%, #fff 50%, transparent 51%)',
  'radial-gradient(1px 1px at 55% 50%, #fff 50%, transparent 51%)',
].join(',');
export const OFF_BG = 'linear-gradient(100deg, #ff4f7b 0%, #ff7a3d 100%)';

export function OffTag({ className, pct }: { className?: string; pct?: number }) {
  const pricing = useUserPricing();
  const displayPct = pct ?? pricing.discountPct;
  if (displayPct <= 0) return null;
  return (
    <span className={cn('inline-flex items-center rounded-tag px-2 py-0.5 text-caption font-bold uppercase tracking-wide text-white shadow-[0_4px_14px_-4px_rgba(255,79,123,.7)]', className)}
      style={{ background: OFF_BG }}>{displayPct}% off</span>
  );
}

/* ── Pass status (existing lib/rookiePass; listens to its update event) ── */
export function useHasPass() {
  const [has, setHas] = React.useState<boolean | null>(() => {
    try {
      if (typeof window === 'undefined') return null;
      const rawUser = localStorage.getItem('@user');
      const uid = rawUser ? JSON.parse(rawUser)?.id : null;
      if (uid) {
        const rawCache = sessionStorage.getItem(`rookie_pass_cache_${uid}`);
        if (rawCache) {
          const c = JSON.parse(rawCache);
          if (c && c.user_id === uid && Date.now() - c.fetched_at < 5 * 60 * 1000) {
            return c.has_pass;
          }
        }
      }
    } catch {}
    return null;
  });

  React.useEffect(() => {
    let alive = true;
    const check = () => {
      hasRookiePass().then(v => {
        if (alive) setHas(prev => (prev === v ? prev : v));
      }).catch(() => {});
    };
    check();
    window.addEventListener('rookiePassUpdated', check);
    return () => { alive = false; window.removeEventListener('rookiePassUpdated', check); };
  }, []);
  return has;
}

/* ── Countdown with flip digits (numbers only) ── */
function useCountdown(iso?: string | null) {
  const end = React.useMemo(() => (iso ? new Date(iso).getTime() : 0), [iso]);
  const [left, setLeft] = React.useState<number | null>(() => {
    if (!iso) return 0;
    const t = new Date(iso).getTime();
    return Math.max(0, t - Date.now());
  });

  React.useEffect(() => {
    if (!end) { setLeft(0); return; }
    const tick = () => setLeft(Math.max(0, end - Date.now()));
    tick();
    const id = setInterval(tick, 1000);
    const onFocus = () => tick();
    const onVis = () => { if (document.visibilityState === 'visible') tick(); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVis);
    return () => {
      clearInterval(id);
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVis);
    };
  }, [end]);

  const s = Math.floor((left ?? 0) / 1000);
  const isOver = end > 0 && left === 0;
  return {
    ready: left !== null,
    over: isOver,
    groups: [
      Math.floor(s / 86400),
      Math.floor((s % 86400) / 3600),
      Math.floor((s % 3600) / 60),
      s % 60,
    ],
  };
}

export function useSaleLive() {
  const pricing = useUserPricing();
  const { ready, over } = useCountdown(pricing.endsAt);
  if (!pricing.isSaleLive) return false;
  if (!pricing.endsAt) return true;
  return ready && !over;
}

function FlipDigit({ d, tile }: { d: string; tile: string }) {
  return (
    <span className={cn('relative inline-grid h-[1.9em] w-[1.25em] place-items-center overflow-hidden rounded-tag [perspective:240px]', tile)}>
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span key={d} initial={{ rotateX: -95, opacity: 0, y: '-30%' }} animate={{ rotateX: 0, opacity: 1, y: '0%' }}
          exit={{ rotateX: 95, opacity: 0, y: '30%' }} transition={{ duration: 0.45, ease: [0.3, 0.7, 0.2, 1] }}
          className="block origin-center font-bold tabular-nums [backface-visibility:hidden]">{d}</motion.span>
      </AnimatePresence>
      <span aria-hidden className="pointer-events-none absolute inset-x-0 top-1/2 h-px bg-black/25" />
    </span>
  );
}

export function FlipCountdown({ className, tile = 'bg-white/15 text-white', endsAt }: { className?: string; tile?: string; endsAt?: string | null }) {
  const pricing = useUserPricing();
  const targetIso = endsAt !== undefined ? endsAt : pricing.endsAt;
  const { ready, groups } = useCountdown(targetIso);
  const label = groups.map(g => String(g).padStart(2, '0')).join(':');
  return (
    <span className={cn('inline-flex items-center gap-[3px] text-body-sm', className)} role="timer" aria-label={`Offer ends in ${label}`}>
      {groups.map((g, i) => {
        const str = ready ? String(g).padStart(2, '0') : '--';
        return (
          <React.Fragment key={i}>
            {i > 0 && <span aria-hidden className="px-[1px] font-bold opacity-60">:</span>}
            <FlipDigit d={str[0]} tile={tile} />
            <FlipDigit d={str[1]} tile={tile} />
          </React.Fragment>
        );
      })}
    </span>
  );
}

/* ── One-click buy: the same flow RookiePassModal uses (lib/rookiePass.triggerCheckout) ── */
export const CHECKOUT_START = 'rk-checkout-start';

/** Close a dialog when Razorpay opens (its iframe can't take focus inside a modal focus trap). */
export function useCloseOnCheckout(close: () => void) {
  React.useEffect(() => {
    window.addEventListener(CHECKOUT_START, close);
    return () => window.removeEventListener(CHECKOUT_START, close);
  }, [close]);
}

export function useBuyPass(onSuccess?: () => void) {
  const [loading, setLoading] = React.useState(false);
  const buy = React.useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setLoading(false); notify.error('Please sign in to purchase.'); return; }
      let name: string | null = null;
      let phone: string | null = null;
      try {
        const raw = localStorage.getItem('@user');
        if (raw) {
          const parsed = JSON.parse(raw);
          name = parsed?.name ?? null;
          phone = parsed?.phone ?? null;
        }
      } catch {}
      // Razorpay renders its own overlay; any open (focus-trapping) dialog must close first.
      window.dispatchEvent(new Event(CHECKOUT_START));
      await triggerCheckout({
        token: session.access_token,
        userId: session.user.id,
        email: session.user.email,
        name,
        phone,
        onSuccess: async () => {
          bustPassCache(session.user.id);
          await checkUserPaidDirectFromDB(session.user.id);
          setLoading(false);
          notify.success('Rookie Pass activated. Everything is unlocked.');
          onSuccess?.();
        },
        onError: (msg: string) => { setLoading(false); notify.error(msg); },
        onDismiss: () => setLoading(false),
      });
    } catch (e) {
      setLoading(false);
      notify.error(e instanceof Error ? e.message : 'Checkout could not start. Please try again.');
    }
  }, [loading, onSuccess]);
  return { buy, loading };
}

export function BuyPassButton({ className, children, onSuccess }: { className?: string; children?: React.ReactNode; onSuccess?: () => void }) {
  const { buy, loading } = useBuyPass(onSuccess);
  const pricing = useUserPricing();
  return (
    <button type="button" onClick={buy} disabled={loading}
      className={cn('inline-flex items-center justify-center gap-2 rounded-control font-semibold transition active:translate-y-px disabled:opacity-80', className)}>
      {loading ? <><Loader2 className="size-4 animate-spin" /> Opening checkout…</> : <>{children ?? <>Get 1 year · {money(pricing.price)}</>} <ArrowRight className="size-4" /></>}
    </button>
  );
}

/* ── Slim sticky offer bar (top of the content column) ── */
export function SaleBar() {
  const pricing = useUserPricing();
  if (!pricing.isSaleLive) return null;
  return (
    <div className="relative overflow-hidden px-4 text-white md:px-6" style={{ background: PASS_BG }}>
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: STARS }} />
      <div className="relative mx-auto flex h-12 w-full max-w-content items-center gap-3">
        <p className="min-w-0 truncate text-body-sm">
          <span className="font-semibold">Rookie Pass</span>
          {pricing.original > pricing.price && (
            <span className="mx-1.5 text-white/50 line-through">{money(pricing.original)}</span>
          )}
          <span className="ml-1.5 font-bold">{money(pricing.price)}</span>
          <span className="text-white/70">/{pricing.per}</span>
        </p>
        <OffTag className="hidden sm:inline-flex" pct={pricing.discountPct} />
        <Define term="timer" className="ml-auto hidden text-meta text-white/70 md:inline" side="bottom">Price goes up in</Define>
        <FlipCountdown endsAt={pricing.endsAt} className="ml-auto text-label md:ml-0" />
        <BuyPassButton className="hidden h-8 bg-white px-3 text-label text-[#14295f] hover:bg-white/90 sm:inline-flex">Grab it</BuyPassButton>
      </div>
    </div>
  );
}

/* ── Main Pass card ── */
export function PassCard({ className, onSuccess }: { className?: string; onSuccess?: () => void }) {
  const pricing = useUserPricing();
  return (
    <div className={cn('relative flex flex-col overflow-hidden rounded-card p-7 text-white', className)} style={{ background: PASS_BG }}>
      <span className="pointer-events-none absolute inset-0 opacity-50" aria-hidden style={{ backgroundImage: STARS }} />
      <div className="relative flex items-center justify-between">
        <span className="flex items-center gap-2 text-body-sm font-semibold">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/rookie-owl.png" alt="" className="size-6 rounded-full" /> Rookie Pass
          <Define term="yearly" className="rounded-tag bg-white/12 px-1.5 py-0.5 text-caption font-semibold text-white/85">Yearly</Define>
        </span>
        {pricing.isSaleLive && <OffTag pct={pricing.discountPct} />}
      </div>
      <div className="relative mt-7 flex items-baseline gap-2">
        <span className="text-price font-bold leading-none tracking-[-0.05em]">{money(pricing.price)}</span>
        {pricing.isSaleLive && pricing.original > pricing.price && (
          <span className="text-body font-medium text-white/50 line-through decoration-2">{money(pricing.original)}</span>
        )}
        <span className="text-label text-white/60">/ {pricing.per}</span>
      </div>
      <p className="relative mt-2 text-body-sm text-white/75">One payment for 12 months. Just ₹{pricing.perMonth} a month.</p>
      <ul className="relative mt-6 flex flex-col gap-2.5">
        {pricing.perks.map(p => (
          <li key={p} className="flex items-center gap-2 text-body-sm text-white/90"><Check className="size-4 text-[#ffd84d]" strokeWidth={2.5} />{p}</li>
        ))}
      </ul>
      <div className="relative mt-auto pt-7">
        {pricing.isSaleLive && (
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <Define term="timer" className="text-meta font-medium text-white/70">Price goes up in</Define>
            <FlipCountdown endsAt={pricing.endsAt} tile="bg-white/12 text-white" />
          </div>
        )}
        <BuyPassButton onSuccess={onSuccess} className="h-11 w-full bg-white text-body text-[#14295f] hover:bg-white/90">
          Get 1 year · {money(pricing.price)}
        </BuyPassButton>
      </div>
    </div>
  );
}

/* ── Compact Pass card (sidebar) ── */
export function PassMini({ className }: { className?: string }) {
  const pricing = useUserPricing();
  return (
    <div className={cn('relative overflow-hidden rounded-card p-4 text-white', className)} style={{ background: PASS_BG }}>
      <span aria-hidden className="pointer-events-none absolute inset-0 opacity-40" style={{ backgroundImage: STARS }} />
      <div className="relative flex items-center justify-between text-label font-semibold">
        <span className="flex items-center gap-1.5"><Sparkles className="size-3.5 text-[#ffd84d]" /> Rookie Pass</span>
        {pricing.isSaleLive && <OffTag pct={pricing.discountPct} />}
      </div>
      <p className="relative mt-2 flex items-baseline gap-1.5">
        <span className="text-heading font-bold leading-none tracking-tight">{money(pricing.price)}</span>
        {pricing.isSaleLive && pricing.original > pricing.price && (
          <span className="text-meta text-white/55 line-through">{money(pricing.original)}</span>
        )}
      </p>
      <p className="relative mt-1 text-caption text-white/65">per year · one payment</p>
      <BuyPassButton className="relative mt-3 h-8 w-full bg-white text-label text-[#14295f] hover:bg-white/90">
        Get yearly Pass
      </BuyPassButton>
    </div>
  );
}

/**
 * Drop-in upsell dialog body for paywalls (replaces the look of RookiePassModal / PaywallModal).
 * Callers keep their own open/close + onSuccess logic.
 */
export function PassPitch({ reason, onSuccess }: { reason?: string; onSuccess?: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      {reason && <p className="text-body-sm text-muted-foreground">{reason}</p>}
      <PassCard onSuccess={onSuccess} />
    </div>
  );
}
