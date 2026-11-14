'use client';
import * as React from 'react';

/**
 * One theme for the whole platform: `html.dark` ("Night owl") + `html.rk-app` (pastel roles for portals).
 * Same `theme` localStorage key the landing page and the old dashboard used.
 */
export function useNightOwl() {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    let initial = false;
    try {
      const t = localStorage.getItem('theme');
      initial = t ? t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {}
    const root = document.documentElement;
    root.classList.add('rk-app');
    root.classList.remove('light-mode'); // legacy class from the old layout
    root.classList.toggle('dark', initial);
    const id = setTimeout(() => setDark(initial), 0);
    return () => { clearTimeout(id); root.classList.remove('dark', 'rk-app'); };
  }, []);
  const toggle = React.useCallback(() => {
    setDark(d => {
      const n = !d;
      document.documentElement.classList.toggle('dark', n);
      try { localStorage.setItem('theme', n ? 'dark' : 'light'); } catch {}
      window.dispatchEvent(new Event('rk-theme'));
      return n;
    });
  }, []);
  return { dark, toggle };
}

/** Read-only: true when Night owl is on. Use it only where a function needs a boolean (e.g. renderContent). */
export function useIsDark() {
  const [dark, setDark] = React.useState(false);
  React.useEffect(() => {
    const root = document.documentElement;
    const read = () => setDark(root.classList.contains('dark'));
    const id = setTimeout(read, 0);
    const mo = new MutationObserver(read);
    mo.observe(root, { attributes: true, attributeFilter: ['class'] });
    return () => { clearTimeout(id); mo.disconnect(); };
  }, []);
  return dark;
}
