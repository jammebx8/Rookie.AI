'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '../public/src/utils/supabase';

const CLASS_OPTIONS = ['11th', '12th', 'Dropper', 'Other'];
const EXAM_OPTIONS  = ['JEE Mains', 'JEE Advanced', 'NEET', 'Other'];

// ─── Icons ───────────────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
    <path d="M47.532 24.552c0-1.636-.132-3.2-.38-4.704H24.48v8.896h12.984c-.56 3.02-2.256 5.58-4.808 7.296v6.056h7.776c4.548-4.192 7.1-10.364 7.1-17.544z" fill="#4285F4"/>
    <path d="M24.48 48c6.516 0 11.984-2.164 15.976-5.9l-7.776-6.056c-2.16 1.448-4.916 2.308-8.2 2.308-6.312 0-11.656-4.264-13.564-9.996H2.888v6.252C6.864 42.556 15.08 48 24.48 48z" fill="#34A853"/>
    <path d="M10.916 28.356A14.5 14.5 0 0 1 10 24c0-1.504.26-2.964.716-4.356v-6.252H2.888A23.996 23.996 0 0 0 .48 24c0 3.868.924 7.52 2.408 10.608l8.028-6.252z" fill="#FBBC05"/>
    <path d="M24.48 9.648c3.556 0 6.752 1.224 9.272 3.624l6.944-6.944C36.46 2.392 30.992 0 24.48 0 15.08 0 6.864 5.444 2.888 13.392l8.028 6.252C12.824 13.912 18.168 9.648 24.48 9.648z" fill="#EA4335"/>
  </svg>
);

const InfoRedIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
    <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const SunIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);

const MoonIcon = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);

export default function OnboardingPage() {
  const router = useRouter();

  // ── form state ──────────────────────────────────────────────────────────
  const [cl, setcl]                         = useState('');
  const [exam, setExam]                     = useState('');
  const [authLoading, setAuthLoading]       = useState(false);
  const [loadingSave, setLoadingSave]       = useState(false);
  const [currentUserId, setCurrentUserId]   = useState<string | null>(null);
  const [fullName, setFullName]             = useState('');
  const [step, setStep]                     = useState<'landing' | 'profile'>('landing');
  const [selectedClass, setSelectedClass]   = useState('');
  const [selectedExam, setSelectedExam]     = useState('');
  const [selectionError, setSelectionError] = useState(false);
  const [isDark, setIsDark]                 = useState(true);

  // ── real avatars from DB ────────────────────────────────────────────────
  const [dbAvatars, setDbAvatars] = useState<{ name: string; avatar_url: string | null }[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme');
      setIsDark(stored !== 'light');
    } catch {}

    // Fetch random 4 users with avatar_url
    const loadAvatars = async () => {
      try {
        const { data } = await supabase
          .from('users')
          .select('name, avatar_url')
          .not('avatar_url', 'is', null)
          .limit(40);
        if (data && data.length > 0) {
          // shuffle and take 4
          const shuffled = [...data].sort(() => Math.random() - 0.5).slice(0, 4);
          setDbAvatars(shuffled);
        }
      } catch {}
    };
    loadAvatars();
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    try { localStorage.setItem('theme', next ? 'dark' : 'light'); } catch {}
  };

  // ── Auth ─────────────────────────────────────────────────────────────────
  useEffect(() => {
    try {
      if (localStorage.getItem('@user_onboarded') === 'true') {
        router.replace('https://rookieai.vercel.app/home');
        return;
      }
    } catch {}
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.user) await handleGoogleSignIn(session.user);
      if (event === 'SIGNED_OUT') {
        localStorage.removeItem('@user');
        localStorage.removeItem('@user_onboarded');
      }
    });
    return () => subscription.unsubscribe();
  }, [router]);

  async function handleGoogleSignIn(user: any) {
    try {
      setAuthLoading(true);
      const { data: existingUser, error: fetchError } = await supabase.from('users').select('*').eq('id', user.id).single();
      if (existingUser && !fetchError) {
        localStorage.setItem('@user', JSON.stringify({ ...existingUser, rookieCoinsEarned: existingUser.rookieCoinsEarned ?? 0 }));
        localStorage.setItem('@user_onboarded', 'true');
        router.replace('https://rookieai.vercel.app/home');
      } else {
        const newUserData = {
          id: user.id, email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
          cl: selectedClass || null, exam: selectedExam || null,
          created_at: new Date().toISOString(),
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          rookieCoinsEarned: 0,
        };
        const { data: insertedUser, error: insertError } = await supabase.from('users').insert([newUserData]).select().single();
        if (insertError) { alert('Failed to create user account. Please try again.'); setAuthLoading(false); return; }
        localStorage.setItem('@user', JSON.stringify({ ...insertedUser, rookieCoinsEarned: insertedUser.rookieCoinsEarned ?? 0 }));
        if (!insertedUser.cl || !insertedUser.exam) {
          setCurrentUserId(insertedUser.id); setFullName(insertedUser.name || '');
          setcl(insertedUser.cl || selectedClass || ''); setExam(insertedUser.exam || selectedExam || '');
          setStep('profile');
        } else {
          localStorage.setItem('@user_onboarded', 'true');
          router.replace('https://rookieai.vercel.app/home');
        }
      }
    } catch { alert('Failed to complete sign-in. Please try again.'); }
    finally { setAuthLoading(false); }
  }

  async function signInWithGoogle() {
    if (!selectedClass || !selectedExam) { setSelectionError(true); return; }
    setSelectionError(false);
    try {
      setAuthLoading(true);
      const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}${window.location.pathname}` : 'https://rookieai.vercel.app';
      const { data, error } = await supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl } });
      if (error) throw error;
      if (!data?.url) throw new Error('No OAuth URL');
      window.location.href = data.url;
    } catch (e: any) { alert(e?.message || 'Google auth failed.'); setAuthLoading(false); }
  }

  async function saveProfileCompletion() {
    if (!cl || !exam) { alert('Please select your class and exam.'); return; }
    setLoadingSave(true);
    try {
      await supabase.from('users').update({ name: fullName.trim(), cl, exam }).eq('id', currentUserId);
      const { data: updatedUser } = await supabase.from('users').select('*').eq('id', currentUserId).single();
      if (updatedUser) {
        localStorage.setItem('@user', JSON.stringify({ ...updatedUser, rookieCoinsEarned: updatedUser.rookieCoinsEarned ?? 0 }));
        localStorage.setItem('@user_onboarded', 'true');
        router.replace('https://rookieai.vercel.app/home');
      }
    } catch (err) { alert((err as any)?.message || 'Something went wrong.'); setLoadingSave(false); }
  }

  // ── theme vars ───────────────────────────────────────────────────────────
  const d = isDark;
  const C = {
    bg:        d ? '#080b12' : '#f5f6fa',
    bg2:       d ? '#0d1017' : '#eef0f8',
    surface:   d ? '#111520' : '#ffffff',
    border:    d ? '#1c2030' : '#e0e3ef',
    text:      d ? '#f0f2f8' : '#0d1117',
    text2:     d ? '#8892a4' : '#4a5568',
    text3:     d ? '#3d4557' : '#a0aab8',
    navBg:     d ? 'rgba(8,11,18,0.94)' : 'rgba(245,246,250,0.94)',
    primary:   '#4f46e5',
    accent:    '#7c3aed',
    red:       '#ef4444',
  };

  // ── paper content ─────────────────────────────────────────────────────────
  const PAPERS = [
    {
      id: 'p1', w: 230, top: '-15px', right: '4%', rotate: '1.4deg', opacity: d ? 0.58 : 0.62,
      header: 'JEE Advanced 2023 — Paper 2',
      section: 'Section 2 (Multiple Correct)',
      questions: [
        { n: '1.', marks: '[4, –2]', text: 'If α, β (α < β) are roots of x⁴ – (k+3)x + 8 = 0 such that (1/α) + (1/β) = 3/2, admissible values of k:', math: 'x⁴ – (k+3)x + 8 = 0', opts: ['(A) 2', '(B) 6 ✓', '(C) 5', '(D) 4'] },
        { n: '2.', marks: '[4]', text: 'For isothermal expansion from P to 1 atm in n steps:', math: '-nRT Σᵢ(1/(P+1-i))' },
      ]
    },
    {
      id: 'p2', w: 205, top: '30px', right: '26%', rotate: '-1.9deg', opacity: d ? 0.44 : 0.48,
      header: 'JEE Advanced 2022 — Chemistry',
      section: 'Section A',
      questions: [
        { n: '3.', marks: '[3]', text: 'Fermi level in N-type semiconductor with concentration and temperature', math: 'Ef = Ec – kT ln(Nc/Nd)' },
        { n: '4.', marks: '[3]', text: 'P-N junction diode V-I characteristics explain working', opts: ['(a) Forward bias', '(b) Reverse bias', '(c) Zener breakdown', '(d) Avalanche'] },
      ]
    },
    {
      id: 'p3', w: 218, bottom: '10px', right: '3%', rotate: '0.9deg', opacity: d ? 0.42 : 0.46,
      header: 'JEE Mains 2024 — Mathematics',
      section: 'Section B — Integer Type',
      questions: [
        { n: '5.', marks: '[4]', text: 'Area bounded by y = |sin x| and x-axis on [0, 2π] equals', math: 'A = ∫₀²π |sin x| dx = 4' },
        { n: '6.', marks: '[4]', text: 'If ∇²ψ = 0 everywhere in region, flux through closed surface:', math: '∮ ψ·dS = 0', opts: ['(a) 0 ✓', '(b) 1', '(c) ∞', '(d) –1'] },
      ]
    },
    {
      id: 'p4', w: 196, bottom: '-8px', right: '21%', rotate: '-1.3deg', opacity: d ? 0.36 : 0.40,
      header: 'JEE Advanced 2021 — Physics',
      section: 'Paragraph Questions',
      questions: [
        { n: '7.', marks: '[3]', text: 'Newton rings — diameter of dark and bright fringes expression:', math: 'D²ₙ = 4nλR' },
        { n: '8.', marks: '[3]', text: 'Acceptance angle of optical fiber (n₁=1.75, n₂=1.70):', math: 'θₐ = sin⁻¹(√(n₁²–n₂²))' },
      ]
    },
    {
      id: 'p5', w: 188, top: '55%', right: '0%', rotate: '2.2deg', opacity: d ? 0.30 : 0.34,
      header: 'NEET 2024 — Biology',
      section: 'Section A',
      questions: [
        { n: '9.', marks: '[4]', text: 'Continuity equation for current densities in conducting medium:', math: '∂ρ/∂t + ∇·J = 0' },
        { n: '10.', marks: '[4]', text: 'Hall coefficient and Hall voltage for semiconductor:', math: 'Rₕ = 1/(nq)' },
      ]
    },
    {
      id: 'p6', w: 200, top: '10%', right: '15%', rotate: '-0.7deg', opacity: d ? 0.28 : 0.32,
      header: 'JEE Mains 2023 — Chemistry',
      section: 'Section A',
      questions: [
        { n: '11.', marks: '[4]', text: 'Thermodynamics — work done in reversible isothermal process:', math: 'W = -nRT ln(V₂/V₁)' },
        { n: '12.', marks: '[4]', text: 'Equilibrium constant Kp for N₂ + 3H₂ ⇌ 2NH₃:', math: 'Kp = Kc(RT)⁻²' },
      ]
    },
  ];

  const renderPaperSheet = (p: typeof PAPERS[0]) => (
    <div key={p.id} style={{
      position: 'absolute',
      width: p.w,
      top: (p as any).top, right: (p as any).right, bottom: (p as any).bottom,
      transform: `rotate(${p.rotate})`,
      opacity: p.opacity,
      background: d ? 'rgba(11,14,22,0.88)' : 'rgba(255,255,255,0.9)',
      border: `1px solid ${d ? 'rgba(80,90,140,0.18)' : 'rgba(79,70,229,0.12)'}`,
      borderRadius: 3,
      boxShadow: d ? '0 4px 20px rgba(0,0,0,0.6)' : '0 4px 20px rgba(0,0,0,0.1)',
      fontFamily: '"Times New Roman", Times, serif',
      color: d ? 'rgba(230,235,255,0.78)' : 'rgba(10,20,50,0.72)',
      fontSize: 8.5,
      lineHeight: 1.65,
      padding: '12px 14px',
      overflow: 'hidden',
      pointerEvents: 'none',
    }}>
      {/* ruled lines */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 15.7px, ${d ? 'rgba(99,102,241,0.07)' : 'rgba(79,70,229,0.055)'} 15.7px, ${d ? 'rgba(99,102,241,0.07)' : 'rgba(79,70,229,0.055)'} 16.3px)`,
      }} />
      {/* margin line */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 22, width: 1, background: d ? 'rgba(220,50,50,0.18)' : 'rgba(220,50,50,0.2)' }} />
      <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', opacity: 0.5, marginBottom: 5, borderBottom: `1px solid ${d ? 'rgba(255,255,255,0.07)' : 'rgba(0,0,0,0.07)'}`, paddingBottom: 4 }}>
        {p.header}
      </div>
      <div style={{ fontSize: 7.5, fontWeight: 700, textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.09em', opacity: 0.55, margin: '4px 0 6px', borderTop: `1px solid ${d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, borderBottom: `1px solid ${d ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'}`, padding: '2px 0' }}>
        {p.section}
      </div>
      {p.questions.map((q, qi) => (
        <div key={qi} style={{ marginBottom: 7 }}>
          <div style={{ fontWeight: 600, fontSize: 8, opacity: 0.88, display: 'flex', justifyContent: 'space-between' }}>
            <span>{q.n} {q.text}</span>
            <span style={{ opacity: 0.4, fontSize: 7, marginLeft: 4, whiteSpace: 'nowrap' }}>{q.marks}</span>
          </div>
          {(q as any).math && <div style={{ fontStyle: 'italic', opacity: 0.72, fontSize: 9, margin: '2px 0 2px 8px' }}>{(q as any).math}</div>}
          {(q as any).opts?.map((o: string, oi: number) => (
            <div key={oi} style={{ paddingLeft: 10, opacity: 0.65, fontSize: 8 }}>{o}</div>
          ))}
        </div>
      ))}
    </div>
  );

  const MATH_FLOATS = [
    { expr: 'F = ma', top: '14%', right: '52%', sz: 13, rot: '-3deg' },
    { expr: 'E = mc²', top: '38%', right: '49%', sz: 11, rot: '2.5deg' },
    { expr: 'PV = nRT', bottom: '32%', right: '51%', sz: 12, rot: '-1.8deg' },
    { expr: '∇²ψ + k²ψ = 0', top: '62%', right: '44%', sz: 10, rot: '3deg' },
    { expr: 'v² = u² + 2as', top: '7%', right: '43%', sz: 11, rot: '-2.2deg' },
    { expr: 'dQ = TdS', bottom: '12%', right: '47%', sz: 10, rot: '1.4deg' },
    { expr: 'F = q(E + v×B)', top: '80%', right: '40%', sz: 9, rot: '-2deg' },
  ];

  // ─── CSS ──────────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Fraunces:ital,wght@0,700;0,800;1,700&display=swap');

    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    :root {
      --bg:       ${C.bg};
      --bg2:      ${C.bg2};
      --surface:  ${C.surface};
      --border:   ${C.border};
      --text:     ${C.text};
      --text2:    ${C.text2};
      --text3:    ${C.text3};
      --primary:  ${C.primary};
      --accent:   ${C.accent};
      --r:        12px;
      --rp:       999px;
      --t:        0.17s ease;
      --f:        'Inter', system-ui, sans-serif;
      --fd:       'Fraunces', Georgia, serif;
    }

    body { font-family: var(--f); background: var(--bg); color: var(--text); transition: background 0.22s, color 0.22s; }

    /* ── Page ── */
    .pg { min-height: 100vh; display: flex; flex-direction: column; }

    /* ── Nav ── */
    .nav {
      position: sticky; top: 0; z-index: 50;
      display: flex; align-items: center; justify-content: space-between;
      padding: 0 5vw; height: 56px;
      background: ${C.navBg};
      backdrop-filter: blur(16px); -webkit-backdrop-filter: blur(16px);
      border-bottom: 1px solid ${C.border};
    }
    .nav-brand {
      display: flex; align-items: center; gap: 9px;
      font-size: 0.95rem; font-weight: 700; color: var(--text);
      text-decoration: none; letter-spacing: -0.01em;
    }
    .nav-tag {
      font-size: 0.65rem; font-weight: 600; letter-spacing: 0.08em;
      text-transform: uppercase; color: var(--text3);
      padding: 2px 7px; border: 1px solid var(--border); border-radius: 4px;
      line-height: 1.6;
    }
    .nav-right { display: flex; align-items: center; gap: 10px; }
    .theme-btn {
      width: 32px; height: 32px; border-radius: 8px;
      border: 1px solid var(--border); background: var(--surface);
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; color: var(--text2); transition: all var(--t);
    }
    .theme-btn:hover { border-color: var(--primary); color: var(--primary); }

    /* ── Hero wrapper ── */
    .hero-wrap {
      position: relative; overflow: hidden;
      background: var(--bg);
    }
    /* full-page ruled lines watermark */
    .hero-wrap::before {
      content: '';
      position: absolute; inset: 0;
      background-image: repeating-linear-gradient(
        0deg, transparent, transparent 27px,
        ${d ? 'rgba(80,90,180,0.045)' : 'rgba(79,70,229,0.04)'} 27px,
        ${d ? 'rgba(80,90,180,0.045)' : 'rgba(79,70,229,0.04)'} 28px
      );
      pointer-events: none; z-index: 0;
    }
    /* big left margin red line */
    .hero-wrap::after {
      content: ''; position: absolute; top: 0; bottom: 0; left: 12%;
      width: 1px; background: ${d ? 'rgba(239,68,68,0.10)' : 'rgba(239,68,68,0.12)'};
      pointer-events: none; z-index: 0;
    }

    .papers-layer { position: absolute; inset: 0; pointer-events: none; z-index: 0; }

    /* ── Hero grid ── */
    .hero {
      position: relative; z-index: 1;
      display: grid; grid-template-columns: 1fr 400px; gap: 64px;
      align-items: center; max-width: 1180px; margin: 0 auto; width: 100%;
      padding: 88px 5vw 72px;
    }

    /* ── Left copy ── */
    .eyebrow {
      display: inline-flex; align-items: center; gap: 6px;
      font-size: 0.72rem; font-weight: 600; letter-spacing: 0.1em;
      text-transform: uppercase; color: var(--text3);
      border: 1px solid var(--border); border-radius: 4px;
      padding: 4px 10px; margin-bottom: 22px;
    }
    .eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; flex-shrink: 0; }

    .hero-h1 {
      font-family: var(--fd);
      font-size: clamp(2.4rem, 4.5vw, 3.6rem);
      font-weight: 800; line-height: 1.08; letter-spacing: -0.03em;
      color: var(--text); margin-bottom: 20px;
    }
    .hero-h1 em { font-style: italic; color: var(--primary); }

    .hero-sub {
      font-size: 1rem; color: var(--text2); line-height: 1.7;
      max-width: 460px; margin-bottom: 32px; font-weight: 400;
    }
    .hero-sub strong { color: var(--text); font-weight: 600; }

    /* stat row */
    .stat-row { display: flex; gap: 32px; margin-bottom: 32px; }
    .stat { }
    .stat-num { font-size: 1.5rem; font-weight: 700; color: var(--text); letter-spacing: -0.03em; line-height: 1; }
    .stat-label { font-size: 0.75rem; color: var(--text3); margin-top: 3px; font-weight: 500; letter-spacing: 0.02em; }

    /* avatars + social proof */
    .proof { display: flex; align-items: center; gap: 12px; }
    .av-stack { display: flex; }
    .av {
      width: 30px; height: 30px; border-radius: 50%;
      border: 2px solid var(--bg); margin-left: -7px; overflow: hidden;
      flex-shrink: 0; background: linear-gradient(135deg, #6366f1, #8b5cf6);
      display: flex; align-items: center; justify-content: center;
      font-size: 0.6rem; font-weight: 700; color: white;
    }
    .av:first-child { margin-left: 0; }
    .av img { width: 100%; height: 100%; object-fit: cover; border-radius: 50%; }
    .proof-text { font-size: 0.82rem; color: var(--text2); line-height: 1.4; }
    .proof-text strong { color: var(--text); }

    /* ── Signup card ── */
    .card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 18px; padding: 32px 28px;
      box-shadow: ${d ? '0 24px 64px rgba(0,0,0,0.5)' : '0 24px 64px rgba(79,70,229,0.1)'};
      position: relative;
    }
    .card::before {
      content: ''; position: absolute; top: 0; left: 28px; right: 28px; height: 1px;
      background: linear-gradient(90deg, transparent, var(--primary), var(--accent), transparent);
    }
    .card-label {
      font-size: 0.7rem; font-weight: 600; letter-spacing: 0.1em;
      text-transform: uppercase; color: var(--text3); margin-bottom: 6px;
    }
    .card-title { font-size: 1.25rem; font-weight: 700; color: var(--text); margin-bottom: 22px; letter-spacing: -0.02em; }

    .fg { margin-bottom: 16px; }
    .fl { display: block; font-size: 0.75rem; font-weight: 600; color: var(--text3); margin-bottom: 7px; letter-spacing: 0.04em; text-transform: uppercase; }
    .pills { display: flex; flex-wrap: wrap; gap: 6px; }
    .pill {
      padding: 6px 13px; border: 1px solid var(--border);
      border-radius: var(--rp); background: transparent;
      font-size: 0.82rem; font-weight: 500; color: var(--text2);
      cursor: pointer; transition: all var(--t); font-family: var(--f);
    }
    .pill:hover { border-color: var(--primary); color: var(--primary); }
    .pill.on { border-color: var(--primary); background: ${d ? 'rgba(79,70,229,0.15)' : 'rgba(79,70,229,0.07)'}; color: var(--primary); font-weight: 600; }

    .err {
      display: flex; align-items: center; gap: 7px;
      background: ${d ? 'rgba(239,68,68,0.08)' : '#fff5f5'};
      border: 1px solid ${d ? 'rgba(239,68,68,0.25)' : '#fecaca'};
      border-radius: 8px; padding: 9px 12px; margin-bottom: 12px;
      font-size: 0.8rem; color: #ef4444; animation: shake 0.28s ease;
    }
    @keyframes shake { 0%,100%{transform:translateX(0)} 30%{transform:translateX(-5px)} 70%{transform:translateX(5px)} }

    .or { display: flex; align-items: center; gap: 10px; font-size: 0.75rem; color: var(--text3); font-weight: 500; margin: 16px 0; }
    .or::before, .or::after { content: ''; flex: 1; height: 1px; background: var(--border); }

    .btn-g {
      width: 100%; padding: 12px; display: flex; align-items: center; justify-content: center; gap: 9px;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--r); font-size: 0.9rem; font-weight: 600;
      color: var(--text); cursor: pointer; transition: all var(--t); font-family: var(--f);
    }
    .btn-g:hover { border-color: var(--primary); box-shadow: 0 2px 12px rgba(79,70,229,0.15); }
    .btn-g:disabled { opacity: 0.55; cursor: not-allowed; }

    .tos { font-size: 0.72rem; color: var(--text3); text-align: center; margin-top: 12px; line-height: 1.5; }
    .tos a { color: var(--primary); text-decoration: none; }

    @keyframes spin { to { transform: rotate(360deg); } }
    .sp { width: 15px; height: 15px; border-radius: 50%; border: 2px solid rgba(99,102,241,0.25); border-top-color: var(--primary); animation: spin 0.7s linear infinite; }

    /* ── Sections ── */
    .sec { padding: 64px 5vw; }
    .sec-inner { max-width: 1180px; margin: 0 auto; }
    .sec2 { background: var(--bg2); }
    .sec-eyebrow { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text3); margin-bottom: 6px; }
    .sec-title { font-family: var(--fd); font-size: clamp(1.5rem, 2.8vw, 2.2rem); font-weight: 800; color: var(--text); margin-bottom: 36px; letter-spacing: -0.03em; }
    .sec-title em { font-style: italic; color: var(--primary); }

    .exam-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 12px; }
    .exam-item {
      display: flex; align-items: center; gap: 11px;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 10px; padding: 13px 15px;
      transition: all var(--t);
    }
    .exam-item:hover { border-color: var(--primary); transform: translateY(-2px); }
    .exam-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
    .exam-item-name { font-size: 0.85rem; font-weight: 600; color: var(--text); }

    .feat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .feat {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 14px; padding: 26px 22px; transition: all var(--t);
    }
    .feat:hover { border-color: ${d ? 'rgba(99,102,241,0.4)' : '#c4b5fd'}; transform: translateY(-3px); }
    .feat-num { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; color: var(--text3); margin-bottom: 14px; }
    .feat-title { font-size: 1rem; font-weight: 700; color: var(--text); margin-bottom: 8px; letter-spacing: -0.01em; }
    .feat-desc { font-size: 0.85rem; color: var(--text2); line-height: 1.6; }

    /* ── Profile step ── */
    .prof-pg { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 40px 5vw; background: var(--bg); }
    .prof-card {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 18px; padding: 40px 36px;
      box-shadow: ${d ? '0 24px 64px rgba(0,0,0,0.5)' : '0 24px 64px rgba(79,70,229,0.1)'};
      max-width: 460px; width: 100%; position: relative;
    }
    .prof-card::before {
      content: ''; position: absolute; top: 0; left: 36px; right: 36px; height: 1px;
      background: linear-gradient(90deg, transparent, var(--primary), var(--accent), transparent);
    }
    .prof-step { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--primary); margin-bottom: 6px; }
    .prof-title { font-family: var(--fd); font-size: 1.7rem; font-weight: 800; color: var(--text); margin-bottom: 6px; letter-spacing: -0.03em; }
    .prof-sub { font-size: 0.88rem; color: var(--text2); margin-bottom: 28px; line-height: 1.6; }
    .inp {
      width: 100%; padding: 11px 14px; border: 1px solid var(--border);
      border-radius: 10px; font-size: 0.92rem; font-family: var(--f); color: var(--text);
      background: var(--bg); outline: none; transition: border-color var(--t);
    }
    .inp:focus { border-color: var(--primary); box-shadow: 0 0 0 3px rgba(79,70,229,0.1); }
    .btn-p {
      width: 100%; padding: 12px; display: flex; align-items: center; justify-content: center; gap: 8px;
      background: var(--primary); border: none; border-radius: var(--r);
      font-size: 0.92rem; font-weight: 700; color: white; cursor: pointer;
      transition: all var(--t); font-family: var(--f); margin-top: 8px;
    }
    .btn-p:hover { background: #4338ca; }
    .btn-p:disabled { opacity: 0.6; cursor: not-allowed; }

    /* ── Footer ── */
    .foot {
      border-top: 1px solid var(--border); padding: 28px 5vw;
      display: flex; align-items: center; justify-content: space-between;
      flex-wrap: wrap; gap: 12px; background: var(--bg);
    }
    .foot-brand { font-size: 0.85rem; font-weight: 600; color: var(--text2); }
    .foot-links { display: flex; gap: 18px; }
    .foot-link { font-size: 0.78rem; color: var(--text3); text-decoration: none; }
    .foot-link:hover { color: var(--primary); }
    .foot-copy { font-size: 0.75rem; color: var(--text3); }

    /* ── Mobile ── */
    @media (max-width: 900px) {
      .hero { grid-template-columns: 1fr; gap: 36px; padding: 56px 5vw 44px; }
      .feat-grid { grid-template-columns: 1fr; }
    }
    @media (max-width: 640px) {
      .nav { padding: 0 4vw; }
      .hero { padding: 40px 4vw 32px; }
      .sec { padding: 44px 4vw; }
      .exam-grid { grid-template-columns: repeat(2, 1fr); }
      .card { padding: 24px 18px; }
      .stat-row { gap: 20px; }
      .prof-card { padding: 32px 20px; }
      .foot { flex-direction: column; align-items: flex-start; }
    }
    /* mobile paper: show smaller versions overlapping top-right */
    @media (max-width: 900px) {
      .papers-layer { opacity: 0.5; }
    }
  `;

  const EXAMS = [
    { name: 'JEE Mains', color: '#3b82f6' },
    { name: 'JEE Advanced', color: '#8b5cf6' },
    { name: 'NEET', color: '#10b981' },
    { name: 'MHT CET', color: '#f59e0b' },
    { name: 'BITSAT', color: '#6366f1' },
  ];

  const FEATS = [
    { n: '01', title: '10,000+  PYQs', desc: 'Sourced directly from official JEE & NEET exam papers across every year and shift.' },
    { n: '02', title: 'AI buddy solutions', desc: 'Each question explained by an AI study buddy you actually vibe with — Hinglish, casual, clear.' },
    { n: '03', title: 'Daily streak & coins', desc: 'Stay consistent with streaks, earn coins for speed, and see yourself climb the leaderboard.' },
  ];

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <>
      <style>{css}</style>

      {/* Profile completion */}
      {step === 'profile' ? (
        <div className="prof-pg">
          <div className="prof-card">
            <p className="prof-step">Almost there</p>
            <h1 className="prof-title">Quick setup.</h1>
            <p className="prof-sub">Tell us who you are so we can show the right questions.</p>
            <div className="fg">
              <label className="fl">Name</label>
              <input className="inp" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="What should we call you?" />
            </div>
            <div className="fg">
              <label className="fl">Currently in</label>
              <div className="pills">{CLASS_OPTIONS.map(c => <button key={c} className={`pill ${cl === c ? 'on' : ''}`} onClick={() => setcl(c)}>{c}</button>)}</div>
            </div>
            <div className="fg">
              <label className="fl">Preparing for</label>
              <div className="pills">{EXAM_OPTIONS.map(e => <button key={e} className={`pill ${exam === e ? 'on' : ''}`} onClick={() => setExam(e)}>{e}</button>)}</div>
            </div>
            <button className="btn-p" onClick={saveProfileCompletion} disabled={loadingSave}>
              {loadingSave ? <><div className="sp" style={{ borderTopColor: 'white' }} /><span>Saving…</span></> : 'Start practicing →'}
            </button>
          </div>
        </div>
      ) : (

      <div className="pg">

        {/* ── Nav ─────────────────────────────────────────────────── */}
        <nav className="nav">
          <a href="#" className="nav-brand">
            <Image src="/icon.svg" alt="Rookie" width={28} height={28} />
            <span>RookieAI</span>
            <span className="nav-tag">Beta</span>
          </a>
          <div className="nav-right">
            <button className="theme-btn" onClick={toggleTheme} aria-label="Toggle theme">
              {isDark ? <SunIcon /> : <MoonIcon />}
            </button>
          </div>
        </nav>

        {/* ── Hero ─────────────────────────────────────────────────── */}
        <div className="hero-wrap">

          {/* Paper sheets layer */}
          <div className="papers-layer">
            {PAPERS.map(renderPaperSheet)}
            {/* Floating math */}
            {MATH_FLOATS.map((m, i) => (
              <span key={i} style={{
                position: 'absolute', top: (m as any).top, bottom: (m as any).bottom,
                right: m.right, fontSize: m.sz, fontFamily: '"Times New Roman", serif',
                fontStyle: 'italic', transform: `rotate(${m.rot})`,
                color: d ? 'rgba(140,150,200,0.14)' : 'rgba(79,70,229,0.10)',
                pointerEvents: 'none', userSelect: 'none', whiteSpace: 'nowrap',
              }}>{m.expr}</span>
            ))}
          </div>

          <div className="hero">

            {/* Left: copy */}
            <div>
              <div className="eyebrow">
            
                For JEE & NEET aspirants
              </div>

              <h1 className="hero-h1">
                Past papers,<br/>
                <em>intuitively</em> decoded.
              </h1>

              <p className="hero-sub">
                <strong>10,000+  PYQs</strong> from <strong>JEE Mains, JEE Advanced & NEET </strong> — with AI explanations that actually make sense. Zero distraction, instant conceptual clarity.
              </p>

              <div className="stat-row">
                <div className="stat">
                  <div className="stat-num">10K+</div>
                  <div className="stat-label">PYQs</div>
                </div>
                <div className="stat">
                  <div className="stat-num">2013–2026</div>
                  <div className="stat-label">Shift-tagged</div>
                </div>
                <div className="stat">
               
                </div>
              </div>

              <div className="proof">
                <div className="av-stack">
                  {dbAvatars.length > 0
                    ? dbAvatars.map((av, i) => (
                        <div key={i} className="av">
                          <img
                            src={av.avatar_url!}
                            alt={av.name || ''}
                            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                          />
                        </div>
                      ))
                    : [220, 260, 290, 310].map((h, i) => (
                        <div key={i} className="av" style={{ background: `linear-gradient(135deg, hsl(${h},60%,60%), hsl(${h + 30},60%,48%))` }} />
                      ))
                  }
                  <div className="av" style={{ background: 'linear-gradient(135deg,#4f46e5,#7c3aed)', fontSize: '0.55rem' }}>+2K</div>
                </div>
                <div className="proof-text">
                  <strong>2,000+ students</strong> practicing right now
                </div>
              </div>
            </div>

            {/* Right: signup card */}
            <div className="card">
              <p className="card-label">Start free</p>
              <p className="card-title">Start practicing now</p>

              <div className="fg">
                <label className="fl">I'm in</label>
                <div className="pills">
                  {CLASS_OPTIONS.map(c => (
                    <button key={c} className={`pill ${selectedClass === c ? 'on' : ''}`}
                      onClick={() => { setSelectedClass(c); setSelectionError(false); }}>{c}</button>
                  ))}
                </div>
              </div>

              <div className="fg">
                <label className="fl">Preparing for</label>
                <div className="pills">
                  {EXAM_OPTIONS.map(e => (
                    <button key={e} className={`pill ${selectedExam === e ? 'on' : ''}`}
                      onClick={() => { setSelectedExam(e); setSelectionError(false); }}>{e}</button>
                  ))}
                </div>
              </div>

              {selectionError && (
                <div className="err">
                  <InfoRedIcon />
                  <span>
                    {!selectedClass && !selectedExam ? 'Pick your class and exam first.'
                     : !selectedClass ? 'Which class are you in?'
                     : 'Which exam are you targeting?'}
                  </span>
                </div>
              )}

              <div className="or">continue with</div>

              <button className="btn-g" onClick={signInWithGoogle} disabled={authLoading}>
                {authLoading
                  ? <><div className="sp" /><span>Please wait…</span></>
                  : <><GoogleIcon /><span>Continue with Google</span></>
                }
              </button>

              <p className="tos">By signing up you agree to our <a href="#">Terms</a> &amp; <a href="#">Privacy Policy</a>.</p>
            </div>

          </div>
        </div>

        {/* ── Exam coverage ───────────────────────────────────────── */}
        <section className="sec sec2">
          <div className="sec-inner">
            <p className="sec-eyebrow">Coverage</p>
            <h2 className="sec-title">Every major <em>entrance exam</em></h2>
            <div className="exam-grid">
              {EXAMS.map(ex => (
                <div key={ex.name} className="exam-item">
                  <div className="exam-dot" style={{ background: ex.color }} />
                  <span className="exam-item-name">{ex.name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ────────────────────────────────────────────── */}
        <section className="sec">
          <div className="sec-inner">
            <p className="sec-eyebrow">Why RookieAI</p>
            <h2 className="sec-title">Engineered for <em>depth, not noise</em></h2>
            <div className="feat-grid">
              {FEATS.map(f => (
                <div key={f.n} className="feat">
                  <p className="feat-num">{f.n}</p>
                  <h3 className="feat-title">{f.title}</h3>
                  <p className="feat-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────── */}
        <footer className="foot">
          <span className="foot-brand">RookieAI — quiet focus for competitive excellence.</span>
          <div className="foot-links">
            <a href="#" className="foot-link">Support</a>
            <a href="#" className="foot-link">Privacy</a>
            <a href="#" className="foot-link">Terms</a>
          </div>
          <span className="foot-copy">© 2026 RookieAI</span>
        </footer>

      </div>
      )}
    </>
  );
}
