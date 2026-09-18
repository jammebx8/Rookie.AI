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

// ─── Exam logo (falls back to a lettered badge if the image is missing) ──────
type ExamMeta = { name: string; color: string; logo: string; abbr: string };

const ExamLogo = ({ ex }: { ex: ExamMeta }) => {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <span className="exam-logo exam-logo-fb" style={{ background: ex.color }}>{ex.abbr}</span>
    );
  }
  return (
    <img
      className="exam-logo"
      src={ex.logo}
      alt=""
      aria-hidden="true"
      loading="lazy"
      onError={() => setFailed(true)}
    />
  );
};

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
  const [isDark, setIsDark]                 = useState(false);

  // ── real avatars from DB ────────────────────────────────────────────────
  const [dbAvatars, setDbAvatars] = useState<{ name: string; avatar_url: string | null }[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('theme');
      setIsDark(stored === 'dark');
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
    bg:        d ? '#080b12' : '#f7f6f1',
    bg2:       d ? 'rgba(13,16,23,0.72)' : 'rgba(238,240,248,0.66)',
    surface:   d ? '#111520' : '#ffffff',
    border:    d ? '#1c2030' : '#e0e3ef',
    text:      d ? '#f0f2f8' : '#0d1117',
    text2:     d ? '#8892a4' : '#4a5568',
    text3:     d ? '#3d4557' : '#a0aab8',
    navBg:     d ? 'rgba(8,11,18,0.92)' : 'rgba(247,246,241,0.92)',
    primary:   '#4f46e5',
    accent:    '#7c3aed',
    red:       '#ef4444',
  };

  // paper-theme tints
  const RULE   = d ? 'rgba(96,110,190,0.075)' : 'rgba(40,70,160,0.075)';
  const MARGIN = d ? 'rgba(239,68,68,0.20)'   : 'rgba(214,52,52,0.26)';
  const INK    = d ? 'rgba(214,224,255,0.80)' : 'rgba(16,26,62,0.78)';
  const SHEET  = d ? 'rgba(12,16,26,0.86)'    : 'rgba(255,255,254,0.92)';

  // ── paper content ─────────────────────────────────────────────────────────
  const PAPERS = [
    {
      id: 'p1', w: 300, top: '-10px', right: '2%', rotate: '1.2deg', opacity: d ? 0.72 : 0.78, keep: true,
      header: 'JEE Advanced 2023 — Paper 2',
      section: 'Section 2 (One or more correct)',
      questions: [
        { n: '1.', marks: '[4, –2]', text: 'Let α, β (α < β) be roots of x⁴ – (k+3)x + 8 = 0 with 1/α + 1/β = 3/2. The admissible values of k are', math: 'x⁴ – (k + 3)x + 8 = 0', opts: ['(A) 2', '(B) 6', '(C) 5', '(D) 4'] },
        { n: '2.', marks: '[4]', text: 'An ideal gas expands isothermally from P to 1 atm in n discrete steps. Work done is', math: 'W = –nRT Σᵢ 1/(P + 1 – i)' },
      ]
    },
    {
      id: 'p2', w: 272, top: '34px', right: '25%', rotate: '-1.8deg', opacity: d ? 0.58 : 0.64, keep: false,
      header: 'JEE Advanced 2022 — Physics',
      section: 'Section A',
      questions: [
        { n: '3.', marks: '[3]', text: 'Fermi level of an n-type semiconductor at temperature T is given by', math: 'E_f = E_c – kT ln(N_c / N_d)' },
        { n: '4.', marks: '[3]', text: 'The V–I characteristic of a p–n junction diode is best explained by', opts: ['(a) Forward bias', '(b) Reverse bias', '(c) Zener breakdown', '(d) Avalanche'] },
      ]
    },
    {
      id: 'p3', w: 288, bottom: '8px', right: '2%', rotate: '0.8deg', opacity: d ? 0.56 : 0.62, keep: true,
      header: 'JEE Main 2024 — Mathematics',
      section: 'Section B — Integer type',
      questions: [
        { n: '5.', marks: '[4]', text: 'The area bounded by y = |sin x| and the x-axis on [0, 2π] equals', math: 'A = ∫₀^{2π} |sin x| dx = 4' },
        { n: '6.', marks: '[4]', text: 'If ∇²ψ = 0 everywhere inside a region, the flux through any closed surface in it is', math: '∮ ∇ψ · dS = 0', opts: ['(a) 0', '(b) 1', '(c) ∞', '(d) –1'] },
      ]
    },
    {
      id: 'p4', w: 258, bottom: '-6px', right: '22%', rotate: '-1.2deg', opacity: d ? 0.46 : 0.52, keep: false,
      header: 'JEE Advanced 2021 — Physics',
      section: 'Paragraph type',
      questions: [
        { n: '7.', marks: '[3]', text: 'For Newton\u2019s rings, the diameter of the n-th dark ring satisfies', math: 'D²ₙ = 4nλR' },
        { n: '8.', marks: '[3]', text: 'Acceptance angle of an optical fibre with n₁ = 1.75, n₂ = 1.70 is', math: 'θₐ = sin⁻¹ √(n₁² – n₂²)' },
      ]
    },
    {
      id: 'p5', w: 248, top: '54%', right: '0%', rotate: '2deg', opacity: d ? 0.40 : 0.46, keep: false,
      header: 'JEE Main 2025 — Physics',
      section: 'Section A',
      questions: [
        { n: '9.', marks: '[4]', text: 'The continuity equation for current density in a conducting medium reads', math: '∂ρ/∂t + ∇·J = 0' },
        { n: '10.', marks: '[4]', text: 'The Hall coefficient of a semiconductor of carrier density n is', math: 'R_H = 1/(nq)' },
      ]
    },
    {
      id: 'p6', w: 262, top: '9%', right: '14%', rotate: '-0.6deg', opacity: d ? 0.38 : 0.44, keep: false,
      header: 'JEE Main 2023 — Chemistry',
      section: 'Section A',
      questions: [
        { n: '11.', marks: '[4]', text: 'Work done in a reversible isothermal expansion of an ideal gas is', math: 'W = –nRT ln(V₂ / V₁)' },
        { n: '12.', marks: '[4]', text: 'For N₂ + 3H₂ ⇌ 2NH₃, the relation between K_p and K_c is', math: 'K_p = K_c (RT)⁻²' },
      ]
    },
  ];

  const renderPaperSheet = (p: typeof PAPERS[0]) => (
    <div
      key={p.id}
      className={`sheet${p.keep ? '' : ' sheet-sm-hide'}`}
      style={{
        width: p.w,
        top: (p as any).top, right: (p as any).right, bottom: (p as any).bottom,
        transform: `rotate(${p.rotate})`,
        opacity: p.opacity,
        background: SHEET,
        borderColor: d ? 'rgba(90,100,150,0.22)' : 'rgba(30,50,120,0.14)',
        color: INK,
      }}
    >
      {/* ruled lines */}
      <div style={{
        position: 'absolute', inset: 0, pointerEvents: 'none',
        backgroundImage: `repeating-linear-gradient(0deg, transparent, transparent 17.4px, ${RULE} 17.4px, ${RULE} 18px)`,
      }} />
      {/* margin line */}
      <div style={{ position: 'absolute', top: 0, bottom: 0, left: 26, width: 1, background: MARGIN }} />

      <div className="sheet-head">{p.header}</div>
      <div className="sheet-sec">{p.section}</div>

      {p.questions.map((q, qi) => (
        <div key={qi} style={{ marginBottom: 9 }}>
          <div className="sheet-q">
            <span>{q.n} {q.text}</span>
            <span className="sheet-marks">{q.marks}</span>
          </div>
          {(q as any).math && <div className="sheet-math">{(q as any).math}</div>}
          {(q as any).opts && (
            <div className="sheet-opts">
              {(q as any).opts.map((o: string, oi: number) => <span key={oi}>{o}</span>)}
            </div>
          )}
        </div>
      ))}
    </div>
  );

  // heavier physics / maths formulas floating behind the copy
  const MATH_FLOATS = [
    { expr: 'iħ ∂ψ/∂t = Ĥψ',              top: '11%',    right: '50%', sz: 15, rot: '-3deg',   keep: true  },
    { expr: '∮ B·dl = μ₀I + μ₀ε₀ dΦ_E/dt', top: '32%',    right: '46%', sz: 12, rot: '2.2deg',  keep: false },
    { expr: '∫ e^{–x²} dx = √π',            bottom: '30%', right: '49%', sz: 13, rot: '-1.6deg', keep: true  },
    { expr: '∇²ψ + k²ψ = 0',                top: '61%',    right: '42%', sz: 12, rot: '2.6deg',  keep: false },
    { expr: 'd/dt (∂L/∂q̇) – ∂L/∂q = 0',    top: '6%',     right: '40%', sz: 12, rot: '-2deg',   keep: false },
    { expr: 'dS ≥ δQ/T',                    bottom: '11%', right: '46%', sz: 12, rot: '1.4deg',  keep: true  },
    { expr: 'F = q(E + v × B)',             top: '79%',    right: '38%', sz: 11, rot: '-2deg',   keep: false },
    { expr: 'ζ(s) = Σ n⁻ˢ',                 top: '45%',    right: '55%', sz: 12, rot: '1.8deg',  keep: false },
    { expr: 'lim_{x→0} (sin x)/x = 1',      bottom: '46%', right: '36%', sz: 11, rot: '-1.2deg', keep: false },
  ];

  // ─── CSS ──────────────────────────────────────────────────────────────────
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700;800;900&family=Inter:wght@400;500;600;700&display=swap');

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
      --rule:     ${RULE};
      --margin:   ${MARGIN};
      --r:        12px;
      --rp:       999px;
      --t:        0.17s ease;
      --f:        'Inter', system-ui, sans-serif;
      --fd:       'Archivo', 'Inter', system-ui, sans-serif;
    }

    body { font-family: var(--f); background: var(--bg); color: var(--text); transition: background 0.22s, color 0.22s; }

    /* ── Page: answer-sheet base (ruled lines + margin rules, both themes) ── */
    .pg { position: relative; min-height: 100vh; display: flex; flex-direction: column; }

    .pg::before {
      content: ''; position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background-image: repeating-linear-gradient(
        0deg, transparent, transparent 27px, var(--rule) 27px, var(--rule) 28px
      );
    }
    /* left double margin rule + faint right rule, like a real answer sheet */
    .pg::after {
      content: ''; position: fixed; top: 0; bottom: 0; left: clamp(16px, 7vw, 116px);
      width: 5px; z-index: 0; pointer-events: none;
      background:
        linear-gradient(90deg, var(--margin) 0 1px, transparent 1px 4px, var(--margin) 4px 5px);
    }

    .hero-wrap, .sec, .foot { position: relative; z-index: 1; }

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
      font-family: var(--fd); font-size: 1rem; font-weight: 800; color: var(--text);
      text-decoration: none; letter-spacing: -0.02em;
    }
    .nav-tag {
      font-family: var(--f);
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
    .hero-wrap { position: relative; overflow: hidden; background: transparent; }

    .papers-layer { position: absolute; inset: 0; pointer-events: none; z-index: 0; overflow: hidden; }

    /* ── Background question sheets (readable, not decorative noise) ── */
    .sheet {
      position: absolute;
      border: 1px solid;
      border-radius: 3px;
      box-shadow: ${d ? '0 6px 26px rgba(0,0,0,0.55)' : '0 6px 22px rgba(20,30,80,0.10)'};
      font-family: 'Times New Roman', Times, serif;
      font-size: 10.5px; line-height: 1.72;
      padding: 14px 16px 14px 18px;
      overflow: hidden; pointer-events: none; user-select: none;
      transform-origin: top right;
    }
    .sheet-head {
      position: relative; font-size: 8.5px; font-weight: 700; letter-spacing: 0.06em;
      text-transform: uppercase; opacity: 0.62; margin-bottom: 6px;
      border-bottom: 1px solid currentColor; padding-bottom: 4px;
    }
    .sheet-sec {
      position: relative; font-size: 9px; font-weight: 700; text-align: center;
      text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.6;
      margin: 5px 0 8px; padding: 3px 0;
      border-top: 1px solid currentColor; border-bottom: 1px solid currentColor;
    }
    .sheet-head, .sheet-sec { border-color: currentColor; }
    .sheet-q {
      position: relative; display: flex; gap: 6px; justify-content: space-between;
      font-size: 10.5px; font-weight: 600; opacity: 0.94;
    }
    .sheet-marks { opacity: 0.5; font-size: 9px; white-space: nowrap; }
    .sheet-math {
      position: relative; font-style: italic; opacity: 0.88;
      font-size: 11.5px; margin: 3px 0 3px 12px;
    }
    .sheet-opts {
      position: relative; display: flex; flex-wrap: wrap; gap: 2px 14px;
      padding-left: 12px; opacity: 0.74; font-size: 10px;
    }

    /* floating formulas */
    .mf {
      position: absolute; font-family: 'Times New Roman', Times, serif; font-style: italic;
      color: ${d ? 'rgba(150,162,215,0.20)' : 'rgba(46,62,130,0.16)'};
      pointer-events: none; user-select: none; white-space: nowrap;
    }

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
      background: ${d ? 'rgba(8,11,18,0.6)' : 'rgba(255,255,255,0.7)'};
    }
    .eyebrow-dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; flex-shrink: 0; }

    .hero-h1 {
      font-family: var(--fd);
      font-size: clamp(2.3rem, 4.6vw, 3.7rem);
      font-weight: 800; line-height: 1.04; letter-spacing: -0.035em;
      color: var(--text); margin-bottom: 20px;
    }
    .hero-h1 em { font-style: normal; font-weight: 900; color: var(--primary); }

    .hero-sub {
      font-size: 1rem; color: var(--text2); line-height: 1.7;
      max-width: 460px; margin-bottom: 32px; font-weight: 400;
    }
    .hero-sub strong { color: var(--text); font-weight: 600; }

    /* stat row */
    .stat-row { display: flex; gap: 32px; margin-bottom: 32px; }
    .stat { }
    .stat-num { font-family: var(--fd); font-size: 1.55rem; font-weight: 800; color: var(--text); letter-spacing: -0.035em; line-height: 1; }
    .stat-label { font-size: 0.75rem; color: var(--text3); margin-top: 4px; font-weight: 500; letter-spacing: 0.02em; }

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
      box-shadow: ${d ? '0 24px 64px rgba(0,0,0,0.55)' : '0 24px 64px rgba(30,40,100,0.12)'};
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
    .card-title { font-family: var(--fd); font-size: 1.3rem; font-weight: 800; color: var(--text); margin-bottom: 22px; letter-spacing: -0.025em; }

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
    .sec { position: relative; padding: 64px 5vw; }
    .sec-inner { max-width: 1180px; margin: 0 auto; }
    .sec2 { background: var(--bg2); border-top: 1px solid var(--border); border-bottom: 1px solid var(--border); }
    .sec-eyebrow { font-size: 0.72rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--text3); margin-bottom: 6px; }
    .sec-title { font-family: var(--fd); font-size: clamp(1.5rem, 2.9vw, 2.25rem); font-weight: 800; color: var(--text); margin-bottom: 32px; letter-spacing: -0.035em; }
    .sec-title em { font-style: normal; font-weight: 900; color: var(--primary); }

    /* ── Exam coverage: sliding logo rail ── */
    .exam-rail {
      position: relative; overflow: hidden; padding: 4px 0;
      -webkit-mask-image: linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent);
              mask-image: linear-gradient(90deg, transparent, #000 5%, #000 95%, transparent);
    }
    .exam-track {
      display: flex; width: max-content; gap: 14px;
      animation: rail 30s linear infinite;
    }
    .exam-rail:hover .exam-track,
    .exam-rail:focus-within .exam-track { animation-play-state: paused; }
    @keyframes rail { from { transform: translateX(0); } to { transform: translateX(-50%); } }

    .exam-item {
      display: flex; align-items: center; gap: 12px; flex-shrink: 0;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: var(--rp); padding: 11px 24px 11px 14px;
      box-shadow: ${d ? '0 2px 10px rgba(0,0,0,0.35)' : '0 2px 10px rgba(30,40,100,0.06)'};
    }
    .exam-logo {
      width: 30px; height: 30px; border-radius: 50%; object-fit: contain;
      flex-shrink: 0; background: ${d ? 'rgba(255,255,255,0.9)' : '#fff'};
      padding: 2px;
    }
    .exam-logo-fb {
      display: flex; align-items: center; justify-content: center;
      color: #fff; font-family: var(--fd); font-size: 0.66rem; font-weight: 800;
      letter-spacing: 0.02em; padding: 0;
    }
    .exam-item-name { font-family: var(--fd); font-size: 1.02rem; font-weight: 700; color: var(--text); letter-spacing: -0.015em; white-space: nowrap; }

    .feat-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
    .feat {
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 14px; padding: 26px 22px; transition: all var(--t);
    }
    .feat:hover { border-color: ${d ? 'rgba(99,102,241,0.4)' : '#c4b5fd'}; }
    .feat-num { font-size: 0.72rem; font-weight: 700; letter-spacing: 0.08em; color: var(--text3); margin-bottom: 14px; }
    .feat-title { font-family: var(--fd); font-size: 1.05rem; font-weight: 700; color: var(--text); margin-bottom: 8px; letter-spacing: -0.02em; }
    .feat-desc { font-size: 0.85rem; color: var(--text2); line-height: 1.6; }

    /* ── Profile step ── */
    .prof-pg {
      position: relative; min-height: 100vh; display: flex; align-items: center; justify-content: center;
      padding: 40px 5vw; background: var(--bg);
    }
    .prof-pg::before {
      content: ''; position: fixed; inset: 0; z-index: 0; pointer-events: none;
      background-image: repeating-linear-gradient(0deg, transparent, transparent 27px, var(--rule) 27px, var(--rule) 28px);
    }
    .prof-pg::after {
      content: ''; position: fixed; top: 0; bottom: 0; left: clamp(16px, 7vw, 116px);
      width: 5px; z-index: 0; pointer-events: none;
      background: linear-gradient(90deg, var(--margin) 0 1px, transparent 1px 4px, var(--margin) 4px 5px);
    }
    .prof-card {
      position: relative; z-index: 1;
      background: var(--surface); border: 1px solid var(--border);
      border-radius: 18px; padding: 40px 36px;
      box-shadow: ${d ? '0 24px 64px rgba(0,0,0,0.5)' : '0 24px 64px rgba(30,40,100,0.12)'};
      max-width: 460px; width: 100%;
    }
    .prof-card::before {
      content: ''; position: absolute; top: 0; left: 36px; right: 36px; height: 1px;
      background: linear-gradient(90deg, transparent, var(--primary), var(--accent), transparent);
    }
    .prof-step { font-size: 0.7rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase; color: var(--primary); margin-bottom: 6px; }
    .prof-title { font-family: var(--fd); font-size: 1.75rem; font-weight: 800; color: var(--text); margin-bottom: 6px; letter-spacing: -0.035em; }
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
      flex-wrap: wrap; gap: 12px; background: ${d ? 'rgba(8,11,18,0.82)' : 'rgba(247,246,241,0.82)'};
    }
    .foot-brand { font-size: 0.85rem; font-weight: 600; color: var(--text2); }
    .foot-links { display: flex; gap: 18px; }
    .foot-link { font-size: 0.78rem; color: var(--text3); text-decoration: none; }
    .foot-link:hover { color: var(--primary); }
    .foot-copy { font-size: 0.75rem; color: var(--text3); }

    /* keyboard focus */
    a:focus-visible, button:focus-visible, input:focus-visible {
      outline: 2px solid var(--primary); outline-offset: 2px;
    }

    /* ── Tablet ── */
    @media (max-width: 900px) {
      .hero { grid-template-columns: 1fr; gap: 36px; padding: 56px 5vw 44px; }
      .feat-grid { grid-template-columns: 1fr; }
      .sheet-sm-hide, .mf-sm-hide { display: none; }
      .sheet { transform-origin: top right; }
      .papers-layer { opacity: 0.55; }
      .exam-track { animation-duration: 22s; }
    }

    /* ── Mobile: keep the sheets legible instead of cramming them in ── */
    @media (max-width: 640px) {
      .nav { padding: 0 4vw; }
      .hero { padding: 36px 4vw 32px; }
      .sec { padding: 44px 4vw; }
      .card { padding: 24px 18px; }
      .stat-row { gap: 20px; }
      .prof-card { padding: 32px 20px; }
      .foot { flex-direction: column; align-items: flex-start; }
      .pg::after, .prof-pg::after { left: 10px; }

      .papers-layer { opacity: 0.4; }
      .sheet { width: 240px !important; right: -46px !important; }
      .sheet:not(.sheet-sm-hide) ~ .sheet:not(.sheet-sm-hide) { top: auto !important; bottom: 4% !important; }
      .mf { font-size: 11px !important; }
      .exam-item { padding: 9px 18px 9px 11px; gap: 10px; }
      .exam-logo { width: 26px; height: 26px; }
      .exam-item-name { font-size: 0.92rem; }
      .exam-track { gap: 10px; animation-duration: 18s; }
    }

    @media (prefers-reduced-motion: reduce) {
      .exam-track { animation: none; }
      .exam-rail { overflow-x: auto; }
    }
  `;

  const EXAMS: ExamMeta[] = [
    { name: 'JEE Main',     color: '#3b82f6', logo: '/JM.png',     abbr: 'JM'  },
    { name: 'JEE Advanced', color: '#8b5cf6', logo: '/JA.png', abbr: 'JA'  },
    { name: 'NEET',         color: '#10b981', logo: '/NT.png',         abbr: 'NT'  },
    { name: 'MHT CET',      color: '#f59e0b', logo: '/MH.png',      abbr: 'MH'  },
    { name: 'BITSAT',       color: '#6366f1', logo: '/BS.png',       abbr: 'BS'  },
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
          <div className="papers-layer" aria-hidden="true">
            {PAPERS.map(renderPaperSheet)}
            {/* Floating formulas */}
            {MATH_FLOATS.map((m, i) => (
              <span
                key={i}
                className={`mf${m.keep ? '' : ' mf-sm-hide'}`}
                style={{
                  top: (m as any).top, bottom: (m as any).bottom,
                  right: m.right, fontSize: m.sz,
                  transform: `rotate(${m.rot})`,
                }}
              >{m.expr}</span>
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
                  <div className="stat-label">All Shifts</div>
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
            <div className="exam-rail">
              <div className="exam-track">
                {[...EXAMS, ...EXAMS].map((ex, i) => (
                  <div key={`${ex.name}-${i}`} className="exam-item">
                    <ExamLogo ex={ex} />
                    <span className="exam-item-name">{ex.name}</span>
                  </div>
                ))}
              </div>
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