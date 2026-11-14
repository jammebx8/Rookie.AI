'use client';
import React, { useEffect, useLayoutEffect, useRef } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

if (typeof window !== 'undefined') gsap.registerPlugin(ScrollTrigger);

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;
const MOTION_OK = '(prefers-reduced-motion: no-preference)';
const MOTION_REDUCED = '(prefers-reduced-motion: reduce)';

/**
 * All page-level motion, scoped to `root` and reverted on unmount.
 *  - hero intro timeline + red-pen underline draw
 *  - [data-reveal] batches fade/slide in on scroll
 *  - testimonial marquee that eases to a stop on hover
 */
export function useLandingMotion(root: React.RefObject<HTMLElement | null>, key: unknown) {
  useIsoLayoutEffect(() => {
    const el = root.current;
    if (!el) return;
    const mm = gsap.matchMedia();

    mm.add(MOTION_REDUCED, () => {
      gsap.set(el.querySelectorAll('.rk-rise, [data-reveal]'), { autoAlpha: 1 });
    });

    mm.add(MOTION_OK, () => {
      const q = gsap.utils.selector(el);

      /* Hero intro */
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' } });
      tl.fromTo(q('.rk-rise'), { autoAlpha: 0, y: 26 }, { autoAlpha: 1, y: 0, duration: 1, stagger: 0.09 });
      const pen = el.querySelector<SVGPathElement>('.rk-h1 .mark path');
      if (pen) {
        const len = pen.getTotalLength();
        gsap.set(pen, { strokeDasharray: len, strokeDashoffset: len });
        tl.to(pen, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' }, 0.45);
      }

      /* Scroll reveals */
      gsap.set(q('[data-reveal]'), { autoAlpha: 0, y: 28 });
      ScrollTrigger.batch(q('[data-reveal]'), {
        start: 'top 88%',
        once: true,
        onEnter: batch => gsap.to(batch, {
          autoAlpha: 1, y: 0, duration: 1, ease: 'power3.out', stagger: 0.09, overwrite: true,
        }),
      });

      /* Paper sheets stay static by design (no float / parallax). */
      const cleanups: (() => void)[] = [];

      /* Testimonial marquee — GSAP loop, eases to a halt on hover */
      q('.rk-tm-rail').forEach((rail, i) => {
        const track = rail.querySelector('.rk-tm-track');
        if (!track) return;
        const loop = gsap.fromTo(track,
          { xPercent: i % 2 ? -50 : 0 },
          { xPercent: i % 2 ? 0 : -50, duration: i % 2 ? 80 : 70, ease: 'none', repeat: -1 });
        const slow = () => gsap.to(loop, { timeScale: 0, duration: 0.8, ease: 'power2.out', overwrite: true });
        const go   = () => gsap.to(loop, { timeScale: 1, duration: 0.8, ease: 'power2.in', overwrite: true });
        rail.addEventListener('pointerenter', slow);
        rail.addEventListener('pointerleave', go);
        cleanups.push(() => { rail.removeEventListener('pointerenter', slow); rail.removeEventListener('pointerleave', go); });
      });

      return () => cleanups.forEach(c => c());
    });

    // Fonts/images can shift layout after first paint.
    const refresh = () => ScrollTrigger.refresh();
    window.addEventListener('load', refresh);
    document.fonts?.ready.then(refresh).catch(() => {});

    return () => { window.removeEventListener('load', refresh); mm.revert(); };
  }, [key]);
}

/** Counts up once on scroll-in. Renders the final value on the server (SEO / no-JS). */
export function CountUp({ to, from = 0, prefix = '', suffix = '', pad = 0, duration = 1.8 }: {
  to: number; from?: number; prefix?: string; suffix?: string; pad?: number; duration?: number;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const fmt = (v: number) => `${prefix}${pad ? String(Math.round(v)).padStart(pad, '0') : Math.round(v).toLocaleString('en-IN')}${suffix}`;

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const mm = gsap.matchMedia();
    mm.add(MOTION_OK, () => {
      const obj = { v: from };
      el.textContent = fmt(from);
      gsap.to(obj, {
        v: to, duration, ease: 'power3.out',
        onUpdate: () => { el.textContent = fmt(obj.v); },
        scrollTrigger: { trigger: el, start: 'top 90%', once: true },
      });
      return () => { el.textContent = fmt(to); };
    });
    return () => mm.revert();
  }, [to, from]);

  return <span ref={ref}>{fmt(to)}</span>;
}

/** Odometer-style number: digits that change slide up into place. */
export function RollingNumber({ value }: { value: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const prev = useRef<string>('');
  const str = value.toLocaleString('en-IN');

  useIsoLayoutEffect(() => {
    const el = ref.current;
    const before = prev.current;
    prev.current = str;
    if (!el || !before || before === str) return;
    if (window.matchMedia(MOTION_REDUCED).matches) return;
    const changed = Array.from(el.children).filter((_, i) => before[i] !== str[i]);
    gsap.fromTo(changed, { yPercent: 90, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, duration: 0.9, ease: 'expo.out', stagger: 0.06 });
  }, [str]);

  return (
    <span ref={ref} className="rk-roll" aria-label={str}>
      {str.split('').map((ch, i) => <span key={`${i}-${ch}`} className="rk-roll-d" aria-hidden="true">{ch}</span>)}
    </span>
  );
}

/** FAQ row with GSAP height animation on open/close (falls back to native <details>). */
export function FaqItem({ q, a, icon, defaultOpen = false }: { q: string; a: string; icon: React.ReactNode; defaultOpen?: boolean }) {
  const det = useRef<HTMLDetailsElement>(null);
  const body = useRef<HTMLDivElement>(null);
  const busy = useRef(false);

  const toggle = (e: React.MouseEvent) => {
    const d = det.current, b = body.current;
    if (!d || !b || window.matchMedia(MOTION_REDUCED).matches) return; // native behaviour
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    const icn = d.querySelector('summary > span');
    if (d.open) {
      gsap.to(icn, { rotation: 0, duration: 0.4, ease: 'power3.out' });
      gsap.to(b, { height: 0, autoAlpha: 0, duration: 0.45, ease: 'power3.inOut',
        onComplete: () => { d.open = false; gsap.set(b, { clearProps: 'all' }); busy.current = false; } });
    } else {
      d.open = true;
      gsap.to(icn, { rotation: 45, duration: 0.4, ease: 'power3.out' });
      gsap.fromTo(b, { height: 0, autoAlpha: 0 }, { height: 'auto', autoAlpha: 1, duration: 0.55, ease: 'power3.out',
        onComplete: () => { gsap.set(b, { clearProps: 'height' }); busy.current = false; } });
    }
  };

  return (
    <details ref={det} open={defaultOpen}>
      <summary onClick={toggle}>{q}<span aria-hidden="true">{icon}</span></summary>
      <div ref={body} className="rk-faq-body"><p>{a}</p></div>
    </details>
  );
}
