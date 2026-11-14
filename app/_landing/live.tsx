'use client';
import { useEffect, useState } from 'react';

const reduced = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Slowly-rising student count.
 * ⚠️ BASE is the marketing floor ("2,000+"). Before launch, replace it with a real
 * count served from a server route (never by reading `users` with the anon key).
 */
export const LIVE_STUDENTS_BASE = 2000;
const LIVE_KEY = 'rk_live_students';

export function useLiveStudents() {
  const [n, setN] = useState(LIVE_STUDENTS_BASE);
  useEffect(() => {
    let start = LIVE_STUDENTS_BASE + 18 + Math.floor(Math.random() * 64);
    try {
      const s = Number(sessionStorage.getItem(LIVE_KEY));
      if (s > start) start = s;
    } catch {}
    let cur = start;
    const first = setTimeout(() => setN(start), 0);
    if (reduced()) return () => clearTimeout(first);
    let id: ReturnType<typeof setTimeout>;
    const tick = () => {
      cur += 1;
      setN(cur);
      try { sessionStorage.setItem(LIVE_KEY, String(cur)); } catch {}
      id = setTimeout(tick, 9000 + Math.random() * 21000); // every 9–30s
    };
    id = setTimeout(tick, 6000 + Math.random() * 6000);
    return () => { clearTimeout(first); clearTimeout(id); };
  }, []);
  return n;
}
