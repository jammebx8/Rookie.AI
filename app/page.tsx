'use client';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { User } from '@supabase/supabase-js';
import {
  ArrowRight, BookOpenCheck, Check, CircleAlert, Flame, MessagesSquare, Moon, Plus, Sparkles, Sun, Timer,
} from 'lucide-react';
import { supabase } from '../public/src/utils/supabase';
import { sale, salePerMonth } from '@/lib/sale';

import '@fontsource/open-sauce-two/400.css';
import '@fontsource/open-sauce-two/500.css';
import '@fontsource/open-sauce-two/600.css';
import '@fontsource/open-sauce-two/700.css';
import './_landing/tokens.css';
import './landing.css';
import PaperBackdrop from './_landing/PaperBackdrop';
import { useLiveStudents } from './_landing/live';
import { CountUp, FaqItem, RollingNumber, useLandingMotion } from './_landing/motion';

// ─── Data ────────────────────────────────────────────────────────────────────
type Tone = 'sky' | 'clay' | 'marigold' | 'mint';
const CLASS_OPTIONS = ['11th', '12th', 'Dropper', 'Other'];
const EXAM_OPTIONS  = ['JEE Mains', 'JEE Advanced', 'NEET', 'Other'];

/** Class/exam picked before the Google redirect. The OAuth round-trip reloads
 *  the page, so React state is lost — we stash it here and read it back. */
const PENDING_KEY = 'rk_pending_profile';

type ExamMeta = { name: string; color: string; logo: string; abbr: string; tone: Tone; by: string; subj: string };
const EXAMS: ExamMeta[] = [
  { name: 'JEE Main',     color: '#3b82f6', logo: '/jm.png', abbr: 'JM', tone: 'sky',      by: 'Conducted by NTA',               subj: 'Physics · Chemistry · Maths' },
  { name: 'JEE Advanced', color: '#8b5cf6', logo: '/JA.png', abbr: 'JA', tone: 'clay',     by: 'Conducted by the IITs',          subj: 'Physics · Chemistry · Maths' },
  { name: 'NEET',         color: '#10b981', logo: '/nt.png', abbr: 'NT', tone: 'mint',     by: 'Conducted by NTA',               subj: 'Physics · Chemistry · Biology' },
  { name: 'MHT CET',      color: '#f59e0b', logo: '/MH.png', abbr: 'MH', tone: 'marigold', by: 'State CET Cell, Maharashtra',    subj: 'PCM · PCB' },
  { name: 'BITSAT',       color: '#6366f1', logo: '/BS.png', abbr: 'BS', tone: 'sky',      by: 'Conducted by BITS Pilani',       subj: 'PCM · English · Reasoning' },
];

/** Rookie Pass price — single source of truth shared with the dashboard (lib/sale.ts). */
const PASS_PRICE = sale.price;
const PASS_PER_MONTH = salePerMonth;

const PLAN_FREE = ['Daily free PYQs + AI solutions', '1 custom test a day', 'Streaks, coins & leaderboard'];
const PLAN_PASS = ['Every JEE Main & Advanced PYQ', 'Unlimited AI solutions', 'Unlimited custom & mock tests'];

type Testimonial = { q: string; n: string; m: string; t: string; photo?: string | null };

/** PLACEHOLDER: AI-written quotes with AI-generated portraits (public/testimonials/).
 *  Replaced automatically once 3+ real, approved quotes exist in `public_testimonials`
 *  (see testimonials_migration.sql). Delete these when real ones are live. */
const PLACEHOLDER_TESTIMONIALS: Testimonial[] = [
  { q: 'Hinglish explanations hit different. Rotation finally makes sense.', n: 'Aarav', m: 'Class 12 · Kota', t: 'JEE Main', photo: '/testimonials/aarav.jpg' },
  { q: '20 PYQs before school, every day. The streak keeps me honest.', n: 'Ishita', m: 'Class 11 · Pune', t: 'NEET', photo: '/testimonials/ishita.jpg' },
  { q: 'I sit a chapter test every Sunday, like the real paper.', n: 'Rohan', m: 'Dropper · Jaipur', t: 'JEE Adv', photo: '/testimonials/rohan.jpg' },
  { q: 'No reels, no noise. Just the question and a clean solution.', n: 'Sneha', m: 'Class 12 · Lucknow', t: 'JEE Main', photo: '/testimonials/sneha.jpg' },
  { q: 'Easiest way to spot which questions keep repeating.', n: 'Kabir', m: 'Class 12 · Delhi', t: 'JEE Main', photo: '/testimonials/kabir.jpg' },
  { q: 'Cheaper than one coaching notes booklet. Easily worth it.', n: 'Ananya', m: 'Dropper · Hyderabad', t: 'NEET', photo: '/testimonials/ananya.jpg' },
];
const MIN_REAL_TESTIMONIALS = 3;

/** Photo with an initial as fallback (missing file, expired Google URL). */
function QuoteAvatar({ name, photo }: { name: string; photo?: string | null }) {
  const [failed, setFailed] = useState(false);
  if (!photo || failed) return <span className="rk-quote-av">{name[0]}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="rk-quote-av rk-quote-photo" src={photo} alt="" width={34} height={34}
    loading="lazy" referrerPolicy="no-referrer" onError={() => setFailed(true)} />;
}

const FAQS = [
  { q: 'Is Rookie free?', a: `Yes. Start free. The Rookie Pass (₹${PASS_PRICE}/year) unlocks everything.` },
  { q: 'Where do the questions come from?', a: 'Official past papers, 2013 to 2026, every shift.' },
  { q: 'Do I need to install anything?', a: 'No. It runs in your browser. Sign in with Google and start.' },
  { q: 'How do I pay?', a: 'Inside the app via Razorpay. The pass activates instantly.' },
];

// ─── Icons ───────────────────────────────────────────────────────────────────
/* Icons: Lucide throughout (one stroke weight, one size scale). Google mark is brand art. */
const STROKE = 1.75;
const I = {
  google: (
    <svg viewBox="0 0 48 48" aria-hidden="true">
      <path d="M47.532 24.552c0-1.636-.132-3.2-.38-4.704H24.48v8.896h12.984c-.56 3.02-2.256 5.58-4.808 7.296v6.056h7.776c4.548-4.192 7.1-10.364 7.1-17.544z" fill="#4285F4"/>
      <path d="M24.48 48c6.516 0 11.984-2.164 15.976-5.9l-7.776-6.056c-2.16 1.448-4.916 2.308-8.2 2.308-6.312 0-11.656-4.264-13.564-9.996H2.888v6.252C6.864 42.556 15.08 48 24.48 48z" fill="#34A853"/>
      <path d="M10.916 28.356A14.5 14.5 0 0 1 10 24c0-1.504.26-2.964.716-4.356v-6.252H2.888A23.996 23.996 0 0 0 .48 24c0 3.868.924 7.52 2.408 10.608l8.028-6.252z" fill="#FBBC05"/>
      <path d="M24.48 9.648c3.556 0 6.752 1.224 9.272 3.624l6.944-6.944C36.46 2.392 30.992 0 24.48 0 15.08 0 6.864 5.444 2.888 13.392l8.028 6.252C12.824 13.912 18.168 9.648 24.48 9.648z" fill="#EA4335"/>
    </svg>
  ),
  sun:   <Sun size={16} strokeWidth={STROKE} aria-hidden="true" />,
  moon:  <Moon size={16} strokeWidth={STROKE} aria-hidden="true" />,
  info:  <CircleAlert size={15} strokeWidth={2} aria-hidden="true" />,
  tick:  <Check size={18} strokeWidth={2.5} aria-hidden="true" />,
  check: <Check size={16} strokeWidth={2.25} aria-hidden="true" />,
  arrow: <ArrowRight size={16} strokeWidth={2} aria-hidden="true" />,
  plus:  <Plus size={14} strokeWidth={2} aria-hidden="true" />,
  paper: <BookOpenCheck size={22} strokeWidth={STROKE} aria-hidden="true" />,
  chat:  <MessagesSquare size={22} strokeWidth={STROKE} aria-hidden="true" />,
  clock: <Timer size={22} strokeWidth={STROKE} aria-hidden="true" />,
  flame: <Flame size={22} strokeWidth={STROKE} aria-hidden="true" />,
  spark: <Sparkles size={14} strokeWidth={2} aria-hidden="true" />,
};

const FEATS = [
  { tone: 'sky' as Tone,      ic: I.paper, t: '10,000+ PYQs',        d: 'Every year, every shift since 2013. Sorted by chapter.' },
  { tone: 'clay' as Tone,     ic: I.chat,  t: 'An owl that explains', d: 'Step-by-step solutions in Hinglish, like a senior would.' },
  { tone: 'mint' as Tone,     ic: I.clock, t: 'Custom tests',         d: 'Pick years, chapters and time. Sit it like the real paper.' },
  { tone: 'marigold' as Tone, ic: I.flame, t: 'Streaks & coins',      d: 'Show up daily, earn coins, climb the leaderboard.' },
];

// ─── Small pieces ────────────────────────────────────────────────────────────
function ExamLogo({ ex }: { ex: ExamMeta }) {
  const [failed, setFailed] = useState(false);
  if (failed) return <span className="rk-exam-fb" style={{ background: ex.color }}>{ex.abbr}</span>;
  // eslint-disable-next-line @next/next/no-img-element
  return <img className="rk-exam-logo" src={ex.logo} alt="" loading="lazy" onError={() => setFailed(true)} />;
}

/** Tall pastel card: icon + title at rest; detail slides in on hover / focus / tap. */
function Tile({ tone, icon, title, index, variant, children }: {
  tone: Tone; icon: React.ReactNode; title: string; index?: number; variant?: 'exam'; children: React.ReactNode;
}) {
  return (
    <article className={`rk-tile${variant ? ` rk-tile-${variant}` : ''}`} data-tone={tone} tabIndex={0} data-reveal>
      <div className="rk-tile-top">
        <span className="rk-tile-ic">{icon}</span>
        {index != null && <span className="rk-tile-n">0{index}</span>}
      </div>
      <div className="rk-tile-body">
        <h3>{title}</h3>
        <div className="rk-tile-more"><div>{children}</div></div>
      </div>
    </article>
  );
}

function ChipGroup({ label, options, value, onChange }: {
  label: string; options: string[]; value: string; onChange: (v: string) => void;
}) {
  const id = `rk-${label.replace(/\W+/g, '-').toLowerCase()}`;
  return (
    <div className="rk-field">
      <span className="rk-label" id={id}>{label}</span>
      <div className="rk-chips" role="radiogroup" aria-labelledby={id}>
        {options.map(o => (
          <button key={o} type="button" role="radio" aria-checked={value === o}
            className="rk-chip" onClick={() => onChange(o)}>{o}</button>
        ))}
      </div>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────
export default function OnboardingPage() {
  const router = useRouter();

  const [step, setStep]                     = useState<'landing' | 'profile'>('landing');
  const [selectedClass, setSelectedClass]   = useState('');
  const [selectedExam, setSelectedExam]     = useState('');
  const [selectionError, setSelectionError] = useState(false);
  const [formError, setFormError]           = useState('');
  const [authLoading, setAuthLoading]       = useState(false);

  // profile-completion step
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [fullName, setFullName]           = useState('');
  const [cl, setcl]                       = useState('');
  const [exam, setExam]                   = useState('');
  const [loadingSave, setLoadingSave]     = useState(false);

  const [theme, setTheme]         = useState<'light' | 'dark'>('light');
  const [avatars, setAvatars]     = useState<string[]>([]);
  const [testimonials, setTestimonials] = useState<Testimonial[]>(PLACEHOLDER_TESTIMONIALS);

  // Refs so the auth listener (registered once) sees the latest selection.
  const pick = useRef({ cl: '', exam: '' });
  useEffect(() => { pick.current = { cl: selectedClass, exam: selectedExam }; }, [selectedClass, selectedExam]);

  // ── Live page: reveals, student counter, sticky mobile CTA ──────────────
  const rootRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const heroRef = useRef<HTMLElement>(null);
  useLandingMotion(rootRef, step);
  const students = useLiveStudents();
  const [stickyOn, setStickyOn] = useState(false);

  // Mobile sticky sign-up: hidden on the hero, shown once you scroll past it.
  useEffect(() => {
    const hero = heroRef.current;
    if (!hero || step !== 'landing') return;
    const io = new IntersectionObserver(([e]) => setStickyOn(!e.isIntersecting && e.boundingClientRect.top < 0), { threshold: 0 });
    io.observe(hero);
    return () => io.disconnect();
  }, [step]);

  /** Every CTA lands on the sign-up card and nudges it. */
  const goToSignup = (e?: React.MouseEvent) => {
    e?.preventDefault();
    const card = cardRef.current;
    if (!card) return;
    const smooth = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    card.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'center' });
    card.classList.remove('is-ping');
    window.setTimeout(() => {
      card.classList.add('is-ping');
      card.querySelector<HTMLButtonElement>('.rk-chip')?.focus({ preventScroll: true });
    }, smooth ? 450 : 0);
  };

  // ── Theme + restore pending selection + avatars ─────────────────────────
  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme');
      if (stored === 'dark' || stored === 'light') setTheme(stored);
      else if (window.matchMedia('(prefers-color-scheme: dark)').matches) setTheme('dark');
    } catch {}

    try {
      const raw = sessionStorage.getItem(PENDING_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { cl?: string; exam?: string };
        if (p.cl && CLASS_OPTIONS.includes(p.cl))  { setSelectedClass(p.cl); pick.current.cl = p.cl; }
        if (p.exam && EXAM_OPTIONS.includes(p.exam)) { setSelectedExam(p.exam); pick.current.exam = p.exam; }
      }
    } catch {}

    // Real testimonials (approved + consented) with the student's profile photo.
    (async () => {
      try {
        const { data, error } = await supabase.from('public_testimonials')
          .select('quote, first_name, avatar_url, class_label, city, exam_label')
          .order('created_at', { ascending: false }).limit(12);
        if (error || !data || data.length < MIN_REAL_TESTIMONIALS) return;
        setTestimonials(data.map((r: { quote: string; first_name: string; avatar_url: string | null;
          class_label: string | null; city: string | null; exam_label: string | null }) => ({
          q: r.quote,
          n: r.first_name || 'Student',
          m: [r.class_label && (/^\d/.test(r.class_label) ? `Class ${r.class_label.replace(/th$/, '')}` : r.class_label), r.city]
            .filter(Boolean).join(' · '),
          t: r.exam_label ?? '',
          photo: r.avatar_url?.startsWith('https://') ? r.avatar_url : null,
        })));
      } catch {}
    })();

    // Social-proof avatars. Only the image URL is requested — never names/emails.
    // NOTE: this still relies on `users` being readable by anon; see SECURITY.md.
    (async () => {
      try {
        const { data } = await supabase.from('users').select('avatar_url').not('avatar_url', 'is', null).limit(40);
        const urls = (data ?? [])
          .map((r: { avatar_url: string | null }) => r.avatar_url)
          .filter((u): u is string => !!u && u.startsWith('https://'));
        setAvatars(urls.sort(() => Math.random() - 0.5).slice(0, 4));
      } catch {}
    })();
  }, []);

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    try { localStorage.setItem('theme', next); } catch {}
  };

  // ── Auth ────────────────────────────────────────────────────────────────
  const finish = useCallback((user: Record<string, unknown>) => {
    localStorage.setItem('@user', JSON.stringify({ ...user, rookieCoinsEarned: (user.rookieCoinsEarned as number) ?? 0 }));
    localStorage.setItem('@user_onboarded', 'true');
    try { sessionStorage.removeItem(PENDING_KEY); } catch {}
    router.replace('/home');
  }, [router]);

  const handleGoogleSignIn = useCallback(async (user: User) => {
    setAuthLoading(true);
    setFormError('');
    try {
      const { data: existing, error: fetchError } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (existing && !fetchError) { finish(existing); return; }

      const { cl: pc, exam: pe } = pick.current;
      const newUser = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
        cl: pc || null,
        exam: pe || null,
        created_at: new Date().toISOString(),
        avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
        rookieCoinsEarned: 0,
      };
      const { data: inserted, error: insertError } = await supabase.from('users').insert([newUser]).select().single();
      if (insertError || !inserted) { setFormError('We couldn’t create your account. Please try again.'); return; }

      if (!inserted.cl || !inserted.exam) {
        localStorage.setItem('@user', JSON.stringify({ ...inserted, rookieCoinsEarned: inserted.rookieCoinsEarned ?? 0 }));
        setCurrentUserId(inserted.id);
        setFullName(inserted.name || '');
        setcl(inserted.cl || pc || '');
        setExam(inserted.exam || pe || '');
        setStep('profile');
      } else {
        finish(inserted);
      }
    } catch {
      setFormError('Sign-in didn’t complete. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  }, [finish]);

  useEffect(() => {
    try {
      if (localStorage.getItem('@user_onboarded') === 'true') { router.replace('/home'); return; }
    } catch {}
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) await handleGoogleSignIn(session.user);
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('@user');
        localStorage.removeItem('@user_onboarded');
      }
    });
    return () => subscription.unsubscribe();
  }, [router, handleGoogleSignIn]);

  async function signInWithGoogle() {
    if (!selectedClass || !selectedExam) { setSelectionError(true); return; }
    setSelectionError(false);
    setFormError('');
    setAuthLoading(true);
    try {
      sessionStorage.setItem(PENDING_KEY, JSON.stringify({ cl: selectedClass, exam: selectedExam }));
    } catch {}
    try {
      // Same-origin redirect only — never derived from a query param.
      const redirectTo = `${window.location.origin}${window.location.pathname}`;
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } });
      if (error) throw error;
      if (!data?.url) throw new Error('No OAuth URL');
      window.location.href = data.url;
    } catch {
      setFormError('Google sign-in failed. Please try again.');
      setAuthLoading(false);
    }
  }

  async function saveProfileCompletion() {
    if (!cl || !exam || !currentUserId) { setFormError('Pick your class and exam to continue.'); return; }
    setLoadingSave(true);
    setFormError('');
    try {
      const { error } = await supabase.from('users')
        .update({ name: fullName.trim().slice(0, 80), cl, exam })
        .eq('id', currentUserId);
      if (error) throw error;
      const { data: updated, error: readErr } = await supabase.from('users').select('*').eq('id', currentUserId).single();
      if (readErr || !updated) throw readErr ?? new Error('missing');
      finish(updated);
    } catch {
      setFormError('Couldn’t save that. Check your connection and try again.');
      setLoadingSave(false);
    }
  }

  const selectionMsg = !selectedClass && !selectedExam ? 'Pick your class and exam first.'
    : !selectedClass ? 'Which class are you in?' : 'Which exam are you targeting?';

  // ── Profile completion ──────────────────────────────────────────────────
  if (step === 'profile') {
    return (
      <div className="rk" data-theme={theme} ref={rootRef}>
        <main className="rk-profile">
          <div className="rk-card rk-rise">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="rk-profile-logo rk-logo-light" src="/brand/rookie-lockup-on-light.svg" alt="Rookie" width={114} height={30} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="rk-profile-logo rk-logo-dark" src="/brand/rookie-lockup-on-dark.svg" alt="Rookie" width={114} height={30} />
            <span className="rk-eyebrow" data-tone="marigold">Almost there</span>
            <h1 className="rk-card-h" style={{ marginTop: 14, fontSize: '1.75rem' }}>Quick setup.</h1>
            <p className="rk-card-p">Tell us who you are so we show you the right questions.</p>

            <div className="rk-field">
              <label className="rk-label" htmlFor="rk-name">Name</label>
              <input id="rk-name" className="rk-input" value={fullName} maxLength={80}
                autoComplete="name" onChange={e => setFullName(e.target.value)} placeholder="What should we call you?" />
            </div>
            <ChipGroup label="Currently in" options={CLASS_OPTIONS} value={cl} onChange={setcl} />
            <ChipGroup label="Preparing for" options={EXAM_OPTIONS} value={exam} onChange={setExam} />

            {formError && <p className="rk-err" role="alert">{I.info}{formError}</p>}

            <button type="button" className="rk-btn rk-btn-primary rk-btn-block" onClick={saveProfileCompletion} disabled={loadingSave}>
              {loadingSave ? <><span className="rk-spin" />Saving…</> : <>Start practicing {I.arrow}</>}
            </button>
          </div>
        </main>
      </div>
    );
  }

  // ── Landing ─────────────────────────────────────────────────────────────
  return (
    <div className="rk" data-theme={theme} ref={rootRef}>
      <noscript><style>{'.rk .rk-rise, .rk [data-reveal] { visibility: visible !important; }'}</style></noscript>
      <header className="rk-nav">
        <div className="rk-wrap rk-nav-in">
          <a href="#top" className="rk-brand" aria-label="Rookie home">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="rk-logo-light" src="/brand/rookie-lockup-on-light.svg" alt="Rookie" width={121} height={32} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="rk-logo-dark" src="/brand/rookie-lockup-on-dark.svg" alt="Rookie" width={121} height={32} />
            <span className="rk-tag">Beta</span>
          </a>
          <nav className="rk-links" aria-label="Sections">
            <a href="#how">How it works</a>
            <a href="#reviews">Students</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="rk-nav-r">
            <button type="button" className="rk-icon-btn" onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Switch to day mode' : 'Switch to night owl mode'}
              title={theme === 'dark' ? 'Day mode' : 'Night owl mode'}>
              {theme === 'dark' ? I.sun : I.moon}
            </button>
            <a href="#start" onClick={goToSignup} className="rk-btn rk-btn-primary rk-btn-sm rk-nav-cta">Start free</a>
          </div>
        </div>
      </header>

      <main id="top">
        {/* ── Hero ── */}
        <section className="rk-hero" ref={heroRef}>
          <PaperBackdrop set="hero" />
          <div className="rk-wrap rk-hero-in">
            <div>
              <span className="rk-eyebrow rk-rise" data-tone="sky">For JEE &amp; NEET aspirants across India</span>
              <h1 className="rk-h1 rk-rise d1">
                Past papers,<br />finally{' '}
                <span className="mark">
                  explained.
                  <svg viewBox="0 0 300 20" preserveAspectRatio="none" aria-hidden="true">
                    <path d="M3 14 C 60 4, 120 4, 170 10 S 260 16, 297 6" />
                  </svg>
                </span>
              </h1>
              <p className="rk-hero-sub rk-rise d2">
                <strong>10,000+ PYQs</strong> from JEE &amp; NEET, explained step by step in{' '}
                <span className="rk-hl">Hinglish</span>.
              </p>
              <div className="rk-proof rk-rise d3">
                <div className="rk-avs" aria-hidden="true">
                  {avatars.length > 0
                    ? avatars.map((src, i) => (
                        // eslint-disable-next-line @next/next/no-img-element
                        <span key={i} className="rk-av"><img src={src} alt="" referrerPolicy="no-referrer"
                          onError={e => { (e.currentTarget.parentElement as HTMLElement).style.display = 'none'; }} /></span>
                      ))
                    : [222, 262, 292, 322].map(h => (
                        <span key={h} className="rk-av" style={{ background: `hsl(${h} 45% 62%)` }} />
                      ))}
                  <span className="rk-av rk-av-more">+2K</span>
                </div>
                <p>
                  <span className="rk-proof-live"><strong><RollingNumber value={students} /> students</strong>
                    <span className="rk-live" aria-hidden="true" /></span>
                  <br />practicing with Rookie
                </p>
              </div>
            </div>

            <div id="start" ref={cardRef} className="rk-card rk-rise d4">
              <h2 className="rk-card-h">Start practicing free</h2>
              <p className="rk-card-p">Pick two things. Takes about ten seconds.</p>

              <ChipGroup label="I’m in" options={CLASS_OPTIONS} value={selectedClass}
                onChange={v => { setSelectedClass(v); setSelectionError(false); }} />
              <ChipGroup label="Preparing for" options={EXAM_OPTIONS} value={selectedExam}
                onChange={v => { setSelectedExam(v); setSelectionError(false); }} />

              {selectionError && <p className="rk-err" role="alert">{I.info}{selectionMsg}</p>}
              {formError && <p className="rk-err" role="alert">{I.info}{formError}</p>}

              <div className="rk-sep" />

              <button type="button" className="rk-btn rk-google rk-btn-block" onClick={signInWithGoogle} disabled={authLoading}>
                {authLoading ? <><span className="rk-spin" />Please wait…</> : <>{I.google}Continue with Google</>}
              </button>
              <p className="rk-tos">
                By continuing you agree to our <a href="#">Terms</a> &amp; <a href="#">Privacy Policy</a>.
              </p>
            </div>
          </div>
        </section>

        {/* ── Stats ── */}
        <div className="rk-wrap">
          <dl className="rk-stats rk-row">
            <div className="rk-stat" data-tone="sky" data-reveal>
              <dt className="rk-stat-l" style={{ order: 2 }}>PYQs</dt>
              <dd className="rk-stat-n"><CountUp to={10} suffix="K+" /></dd>
            </div>
            <div className="rk-stat" data-tone="clay" data-reveal>
              <dt className="rk-stat-l" style={{ order: 2 }}>Every shift</dt>
              <dd className="rk-stat-n"><CountUp from={13} to={26} prefix="2013–" pad={2} duration={2} /></dd>
            </div>
            <div className="rk-stat" data-tone="marigold" data-reveal>
              <dt className="rk-stat-l" style={{ order: 2 }}>Exams</dt>
              <dd className="rk-stat-n"><CountUp to={EXAMS.length} duration={1.2} /></dd>
            </div>
            <div className="rk-stat" data-tone="mint" data-reveal>
              <dt className="rk-stat-l" style={{ order: 2 }}>
                <span className="rk-proof-live">Students<span className="rk-live" aria-hidden="true" /></span>
              </dt>
              <dd className="rk-stat-n"><RollingNumber value={students} /></dd>
            </div>
          </dl>
        </div>

        {/* ── How it works ── */}
        <section className="rk-sec" id="how">
          <div className="rk-wrap">
            <div className="rk-sec-head" data-reveal>
              <div>
                <span className="rk-eyebrow" data-tone="sky">How it works</span>
                <h2 className="rk-h2">Solve it. <span>Then get it explained.</span></h2>
              </div>
            </div>

            <div className="rk-spec">
              <article className="rk-sheet" aria-label="Sample question" data-reveal>
                <div className="rk-sheet-meta"><span>JEE Main · Mathematics</span><span>[4]</span></div>
                <p className="rk-q">
                  <span className="rk-q-num">Q5.</span>
                  Area bounded by <span className="rk-math">y = |sin x|</span> and the x-axis on <span className="rk-math">[0, 2π]</span>
                </p>
                <ul className="rk-opts">
                  <li className="rk-opt"><b>A</b>2</li>
                  <li className="rk-opt is-right"><b>B</b>4<span className="rk-tick">{I.tick}</span></li>
                  <li className="rk-opt"><b>C</b>π</li>
                  <li className="rk-opt"><b>D</b>2π</li>
                </ul>
                <span className="rk-score" aria-label="Plus four marks">+4</span>
              </article>

              <article className="rk-explain" aria-label="Sample explanation" data-reveal>
                <div className="rk-buddy">
                  <span className="rk-buddy-dot">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/brand/rookie-owl.png" alt="" width={32} height={32} />
                  </span>
                  Rookie
                </div>
                <p className="rk-bubble">
                  Dekho, <strong>|sin x| kabhi negative nahi hota.</strong> Neeche wala hump upar flip ho jaata hai.
                </p>
                <ol className="rk-steps-mini">
                  <li><span>One hump: <span className="rk-math">∫₀^π sin x dx = 2</span></span></li>
                  <li><span>Two humps: 2 + 2 = <strong>4</strong> → B</span></li>
                </ol>
              </article>
            </div>
          </div>
        </section>

        {/* ── Testimonials ── */}
        <section className="rk-sec rk-alt" id="reviews">
          <div className="rk-wrap">
            <div className="rk-sec-head" data-reveal>
              <div>
                <span className="rk-eyebrow" data-tone="clay">Students</span>
                <h2 className="rk-h2">Less scrolling. <span>More solving.</span></h2>
              </div>
            </div>
          </div>
          <div className="rk-tm" data-reveal>
            <div className="rk-tm-rail">
              <div className="rk-tm-track">
                {[...testimonials, ...testimonials].map((t, i) => (
                  <figure key={i} className="rk-quote" data-dup={i >= testimonials.length ? '' : undefined}
                    aria-hidden={i >= testimonials.length || undefined}>
                    <blockquote>{t.q}</blockquote>
                    <figcaption>
                      <QuoteAvatar name={t.n} photo={t.photo} />
                      <span><b>{t.n}</b>{t.m}</span>
                      {t.t && <span className="rk-quote-tag">{t.t}</span>}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Why Rookie ── */}
        <section className="rk-sec" id="features">
          <div className="rk-wrap">
            <div className="rk-sec-head" data-reveal>
              <div>
                <span className="rk-eyebrow" data-tone="marigold">Why Rookie</span>
                <h2 className="rk-h2">Built for 2 a.m. revision.</h2>
              </div>
            </div>
            <div className="rk-row rk-tiles">
              {FEATS.map((f, i) => (
                <Tile key={f.t} tone={f.tone} icon={f.ic} title={f.t} index={i + 1}>
                  <p>{f.d}</p>
                </Tile>
              ))}
            </div>
          </div>
        </section>

        {/* ── Exams ── */}
        <section className="rk-sec rk-alt" id="exams">
          <div className="rk-wrap">
            <div className="rk-sec-head" data-reveal>
              <div>
                <span className="rk-eyebrow" data-tone="mint">Exams</span>
                <h2 className="rk-h2">Every big entrance exam.</h2>
              </div>
            </div>
            <div className="rk-row rk-tiles rk-tiles-exam">
              {EXAMS.map(ex => (
                <Tile key={ex.name} tone={ex.tone} icon={<ExamLogo ex={ex} />} title={ex.name} variant="exam">
                  <p>{ex.subj}</p>
                  <small>{ex.by}</small>
                </Tile>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section className="rk-sec" id="pricing">
          <div className="rk-wrap">
            <div className="rk-sec-head" data-reveal>
              <div>
                <span className="rk-eyebrow" data-tone="sky">Pricing</span>
                <h2 className="rk-h2">Start free. <span>Go all in for ₹{PASS_PRICE}.</span></h2>
              </div>
              <p className="rk-lede" style={{ maxWidth: '30ch' }}>About ₹{PASS_PER_MONTH} a month. Less than a samosa and chai.</p>
            </div>
            <div className="rk-row rk-prices">
              <article className="rk-price" data-reveal>
                <p className="rk-price-name">Free</p>
                <p className="rk-price-amt"><strong>₹0</strong><span className="rk-price-per">forever</span></p>
                <ul>{PLAN_FREE.map(x => <li key={x}>{I.check}{x}</li>)}</ul>
                <a href="#start" onClick={goToSignup} className="rk-btn rk-btn-ghost rk-btn-block">Start free</a>
              </article>
              <article className="rk-price is-pass" data-reveal>
                <p className="rk-price-name">Rookie Pass <span className="rk-price-badge">Best value</span></p>
                <p className="rk-price-amt"><strong>₹{PASS_PRICE}</strong><s className="rk-price-per">₹{sale.original}</s><span className="rk-price-per">/ year</span></p>
                <ul>{PLAN_PASS.map(x => <li key={x}>{I.check}{x}</li>)}</ul>
                <a href="#start" onClick={goToSignup} className="rk-btn rk-btn-primary rk-btn-block">Start free, upgrade anytime</a>
              </article>
            </div>
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="rk-sec rk-alt" id="faq">
          <div className="rk-wrap rk-faq-grid">
            <div data-reveal>
              <span className="rk-eyebrow" data-tone="clay">FAQ</span>
              <h2 className="rk-h2">Quick answers.</h2>
            </div>
            <div className="rk-faq" data-reveal>
              {FAQS.map((f, i) => (
                <FaqItem key={f.q} q={f.q} a={f.a} icon={I.plus} defaultOpen={i === 0} />
              ))}
            </div>
          </div>
        </section>

        {/* ── Closing ── */}
        <section className="rk-close">
          <PaperBackdrop set="close" />
          <div className="rk-wrap" data-reveal>
            <h2>At the end,<br /><span>it’s all hard work.</span></h2>
            <p className="rk-close-hi">Mehnat aapki, samjhaana humara.</p>
            <a href="#start" onClick={goToSignup} className="rk-btn rk-btn-primary">Start practicing free {I.arrow}</a>
          </div>
        </section>
      </main>

      <footer className="rk-foot">
        <div className="rk-wrap rk-foot-in">
          <div className="rk-foot-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="rk-logo-light" src="/brand/rookie-lockup-on-light.svg" alt="Rookie" width={136} height={36} />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="rk-logo-dark" src="/brand/rookie-lockup-on-dark.svg" alt="Rookie" width={136} height={36} />
            <p>Ratto mat, samjho.</p>
          </div>
          <nav className="rk-foot-nav" aria-label="Footer">
            <a href="#how">How it works</a>
            <a href="#exams">Exams</a>
            <a href="#pricing">Pricing</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="rk-foot-base">
            <span>© {new Date().getFullYear()} Rookie · Made in India</span>
            <span><a href="#">Terms</a> · <a href="#">Privacy</a></span>
          </div>
        </div>
      </footer>

      {/* Mobile: sticky sign-up once you scroll past the hero */}
      <div className={`rk-sticky${stickyOn ? ' is-on' : ''}`} aria-hidden={!stickyOn}>
        <a href="#start" onClick={goToSignup} className="rk-btn rk-google rk-btn-block" tabIndex={stickyOn ? 0 : -1}>
          {I.google}Continue with Google
        </a>
      </div>
    </div>
  );
}
