'use client';
/** Celebration kit for the leaderboard: dark stage, spotlight beams, medal rings, confetti. */
import * as React from 'react';
import { motion } from 'framer-motion';
import confetti from 'canvas-confetti';
import { cn } from '@/lib/utils';

export const STAGE_BG = 'radial-gradient(70% 55% at 50% 0%, rgba(163,212,255,.18), transparent 70%), linear-gradient(180deg, #0b1430 0%, #122556 100%)';

export const MEDAL: Record<number, { ring: string; text: string; glow: string }> = {
  1: { ring: 'linear-gradient(135deg,#fff1a8,#f5b301 55%,#c98a00)', text: '#ffd84d', glow: 'rgba(255,206,0,.55)' },
  2: { ring: 'linear-gradient(135deg,#ffffff,#c6ceda 55%,#8e98a6)', text: '#dfe5ee', glow: 'rgba(210,220,235,.35)' },
  3: { ring: 'linear-gradient(135deg,#ffd9b8,#d08a57 55%,#9c5a2e)', text: '#f1b07e', glow: 'rgba(208,138,87,.4)' },
};

export function initialsOf(name: string) {
  return (name || '?').trim().split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

export function useConfetti() {
  const canvas = React.useRef<HTMLCanvasElement>(null);
  const shoot = React.useRef<confetti.CreateTypes | null>(null);
  React.useEffect(() => {
    if (!canvas.current) return;
    shoot.current = confetti.create(canvas.current, { resize: true, useWorker: true, disableForReducedMotion: true });
    return () => { shoot.current?.reset(); shoot.current = null; };
  }, []);
  const burst = React.useCallback(() => {
    const fire = shoot.current;
    if (!fire) return;
    const colors = ['#ffce00', '#fdba12', '#a3d4ff', '#ffffff', '#e0b3a2', '#86dbae'];
    fire({ particleCount: 70, spread: 75, startVelocity: 38, origin: { x: 0.5, y: 0.35 }, colors, scalar: 0.9, ticks: 220 });
    setTimeout(() => fire({ particleCount: 40, angle: 60, spread: 55, origin: { x: 0, y: 0.6 }, colors, scalar: 0.8 }), 180);
    setTimeout(() => fire({ particleCount: 40, angle: 120, spread: 55, origin: { x: 1, y: 0.6 }, colors, scalar: 0.8 }), 180);
  }, []);
  /** Fire once when `el` scrolls into view. */
  const burstOnView = React.useCallback((el: HTMLElement | null) => {
    if (!el) return () => {};
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setTimeout(burst, 350); io.disconnect(); } }, { threshold: 0.5 });
    io.observe(el);
    return () => io.disconnect();
  }, [burst]);
  return { canvas, burst, burstOnView };
}

export function Spotlight() {
  const beam = (from: string, delay: number, sway: number) => (
    <motion.span aria-hidden className="pointer-events-none absolute -top-10 h-[130%] w-[60%] origin-top"
      style={{ left: from, background: 'conic-gradient(from 180deg at 50% 0%, transparent 162deg, rgba(255,255,255,.20) 176deg, rgba(255,255,255,.30) 180deg, rgba(255,255,255,.20) 184deg, transparent 198deg)', filter: 'blur(6px)' }}
      animate={{ rotate: [-sway, sway, -sway] }} transition={{ duration: 7, repeat: Infinity, ease: 'easeInOut', delay }} />
  );
  return <>{beam('20%', 0, 7)}{beam('-8%', 1.2, 5)}{beam('48%', 0.6, 5)}</>;
}

export function MedalAvatar({ rank, name, src, size = 'md' }: { rank: 1 | 2 | 3; name: string; src?: string | null; size?: 'md' | 'lg' }) {
  const s = size === 'lg' ? 'size-16 text-body-lg' : 'size-12';
  const [broken, setBroken] = React.useState(false);
  const showImg = !!src && !broken;
  return (
    <span className="block rounded-full p-[3px]" style={{ background: MEDAL[rank].ring, boxShadow: `0 0 28px ${MEDAL[rank].glow}` }}>
      <span className="block rounded-full bg-[#0f1d45] p-[2px]">
        {showImg
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={src!} alt="" referrerPolicy="no-referrer" onError={() => setBroken(true)} className={cn('rounded-full object-cover', s)} />
          : <span className={cn('grid place-items-center rounded-full bg-white/10 font-semibold text-white', s)}>{initialsOf(name)}</span>}
      </span>
    </span>
  );
}
