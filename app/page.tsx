'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '../public/src/utils/supabase';

const CLASS_OPTIONS = ['11th', '12th', 'Dropper', 'Other'];
const EXAM_OPTIONS = ['JEE Mains', 'JEE Advanced', 'NEET', 'Other'];

// ─── Inline SVG Icons ────────────────────────────────────────────────────────
const GoogleIcon = () => (
  <svg width="20" height="20" viewBox="0 0 48 48" fill="none">
    <path d="M47.532 24.552c0-1.636-.132-3.2-.38-4.704H24.48v8.896h12.984c-.56 3.02-2.256 5.58-4.808 7.296v6.056h7.776c4.548-4.192 7.1-10.364 7.1-17.544z" fill="#4285F4"/>
    <path d="M24.48 48c6.516 0 11.984-2.164 15.976-5.9l-7.776-6.056c-2.16 1.448-4.916 2.308-8.2 2.308-6.312 0-11.656-4.264-13.564-9.996H2.888v6.252C6.864 42.556 15.08 48 24.48 48z" fill="#34A853"/>
    <path d="M10.916 28.356A14.5 14.5 0 0 1 10 24c0-1.504.26-2.964.716-4.356v-6.252H2.888A23.996 23.996 0 0 0 .48 24c0 3.868.924 7.52 2.408 10.608l8.028-6.252z" fill="#FBBC05"/>
    <path d="M24.48 9.648c3.556 0 6.752 1.224 9.272 3.624l6.944-6.944C36.46 2.392 30.992 0 24.48 0 15.08 0 6.864 5.444 2.888 13.392l8.028 6.252C12.824 13.912 18.168 9.648 24.48 9.648z" fill="#EA4335"/>
  </svg>
);

const CheckIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

const SparkleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
    <path d="M12 2L14.4 9.6L22 12L14.4 14.4L12 22L9.6 14.4L2 12L9.6 9.6L12 2Z" fill="url(#sparkleGrad)" stroke="none"/>
    <defs>
      <linearGradient id="sparkleGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366f1"/>
        <stop offset="1" stopColor="#8b5cf6"/>
      </linearGradient>
    </defs>
  </svg>
);

const BrainIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#brainGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96-.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-1.66"/>
    <path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96-.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-1.66"/>
    <defs>
      <linearGradient id="brainGrad" x1="2" y1="2" x2="22" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366f1"/>
        <stop offset="1" stopColor="#8b5cf6"/>
      </linearGradient>
    </defs>
  </svg>
);

const ChartIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#chartGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="20" x2="18" y2="10"/>
    <line x1="12" y1="20" x2="12" y2="4"/>
    <line x1="6" y1="20" x2="6" y2="14"/>
    <defs>
      <linearGradient id="chartGrad" x1="6" y1="4" x2="18" y2="20" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366f1"/>
        <stop offset="1" stopColor="#8b5cf6"/>
      </linearGradient>
    </defs>
  </svg>
);

const BookIcon = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="url(#bookGrad)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/>
    <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>
    <defs>
      <linearGradient id="bookGrad" x1="4" y1="2" x2="20" y2="22" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366f1"/>
        <stop offset="1" stopColor="#8b5cf6"/>
      </linearGradient>
    </defs>
  </svg>
);

// Exam badge placeholder (replace src with actual SVGs from public)
const ExamBadge = ({ name, abbr, color }: { name: string; abbr: string; color: string }) => (
  <div className="exam-badge" style={{ '--badge-color': color } as React.CSSProperties}>
    <div className="exam-badge-icon">
      {/* Replace with: <Image src={`/${abbr.toLowerCase()}.svg`} alt={name} width={28} height={28} /> */}
      <span className="exam-abbr">{abbr.slice(0, 2)}</span>
    </div>
    <span className="exam-name">{name}</span>
  </div>
);

const EXAMS = [
  { name: 'JEE Mains', abbr: 'JM', color: '#3b82f6' },
  { name: 'JEE Advanced', abbr: 'JA', color: '#8b5cf6' },
  { name: 'NEET', abbr: 'NT', color: '#10b981' },
  { name: 'MHT CET', abbr: 'MC', color: '#f59e0b' },
  { name: 'KCET', abbr: 'KC', color: '#ef4444' },
  { name: 'BITSAT', abbr: 'BS', color: '#6366f1' },
];

const FEATURES = [
  { icon: <BookIcon />, title: '50,000+ PYQs', desc: 'From JEE, NEET & 10+ entrance exams across all years and subjects.' },
  { icon: <BrainIcon />, title: 'AI-Powered Solutions', desc: 'Step-by-step AI explanations that adapt to how you think and learn.' },
  { icon: <ChartIcon />, title: 'Smart Analytics', desc: 'Know exactly where you stand with real-time performance insights and AIR.' },
];

export default function OnboardingPage() {
  const router = useRouter();
  const [cl, setcl] = useState('');
  const [exam, setExam] = useState('');
  const [profileNeedsCompletion, setProfileNeedsCompletion] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [fullName, setFullName] = useState('');
  const [step, setStep] = useState<'landing' | 'profile'>('landing');

  // Selections for landing page (pre-auth)
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedExam, setSelectedExam] = useState('');

  useEffect(() => {
    try {
      const onboarded = localStorage.getItem('@user_onboarded');
      if (onboarded === 'true') {
        router.replace('https://rookieai.vercel.app/home');
        return;
      }
    } catch {}

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          await handleGoogleSignIn(session.user);
        }
        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('@user');
          localStorage.removeItem('@user_onboarded');
        }
      }
    );
    return () => subscription.unsubscribe();
  }, [router]);

  async function handleGoogleSignIn(user: any) {
    try {
      setAuthLoading(true);
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (existingUser && !fetchError) {
        const userData = {
          id: existingUser.id,
          email: existingUser.email,
          name: existingUser.name,
          cl: existingUser.cl,
          exam: existingUser.exam,
          created_at: existingUser.created_at,
          avatar_url: existingUser.avatar_url,
          rookieCoinsEarned: existingUser.rookieCoinsEarned ?? 0,
        };
        localStorage.setItem('@user', JSON.stringify(userData));
        localStorage.setItem('@user_onboarded', 'true');
        router.replace('https://rookieai.vercel.app/home');
      } else {
        const newUserData = {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
          cl: selectedClass || null,
          exam: selectedExam || null,
          created_at: new Date().toISOString(),
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          rookieCoinsEarned: 0,
        };

        const { data: insertedUser, error: insertError } = await supabase
          .from('users')
          .insert([newUserData])
          .select()
          .single();

        if (insertError) {
          alert('Failed to create user account. Please try again.');
          setAuthLoading(false);
          return;
        }

        const userData = {
          id: insertedUser.id,
          email: insertedUser.email,
          name: insertedUser.name,
          cl: insertedUser.cl,
          exam: insertedUser.exam,
          created_at: insertedUser.created_at,
          avatar_url: insertedUser.avatar_url,
          rookieCoinsEarned: insertedUser.rookieCoinsEarned ?? 0,
        };
        localStorage.setItem('@user', JSON.stringify(userData));

        if (!insertedUser.cl || !insertedUser.exam) {
          setCurrentUserId(insertedUser.id);
          setFullName(insertedUser.name || '');
          setcl(insertedUser.cl || selectedClass || '');
          setExam(insertedUser.exam || selectedExam || '');
          setProfileNeedsCompletion(true);
          setStep('profile');
        } else {
          localStorage.setItem('@user_onboarded', 'true');
          router.replace('https://rookieai.vercel.app/home');
        }
      }
    } catch {
      alert('Failed to complete sign-in. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  }

  async function signInWithGoogle() {
    try {
      setAuthLoading(true);
      const redirectUrl = 'https://rookieai.vercel.app/home';
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl },
      });
      if (error) throw error;
      if (!data?.url) throw new Error('No OAuth URL received');
      window.location.href = data.url;
    } catch (error: any) {
      alert(error?.message || 'Google authentication failed. Please try again.');
      setAuthLoading(false);
    }
  }

  async function saveProfileCompletion() {
    if (!cl || !exam) {
      alert('Please select your class and exam to continue');
      return;
    }
    setLoadingSave(true);
    try {
      const { error: updateError } = await supabase
        .from('users')
        .update({ name: fullName.trim(), cl, exam })
        .eq('id', currentUserId);

      if (updateError) {
        alert('Failed to save profile: ' + updateError.message);
        setLoadingSave(false);
        return;
      }

      const { data: updatedUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUserId)
        .single();

      if (fetchError || !updatedUser) {
        alert('Failed to fetch updated profile.');
        setLoadingSave(false);
        return;
      }

      const userData = {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        cl: updatedUser.cl,
        exam: updatedUser.exam,
        created_at: updatedUser.created_at,
        avatar_url: updatedUser.avatar_url,
        rookieCoinsEarned: updatedUser.rookieCoinsEarned ?? 0,
      };
      localStorage.setItem('@user', JSON.stringify(userData));
      localStorage.setItem('@user_onboarded', 'true');
      router.replace('https://rookieai.vercel.app/home');
    } catch (err) {
      alert((err as any)?.message || 'Something went wrong.');
      setLoadingSave(false);
    }
  }

  return (
    <>
      <style>{`
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

        :root {
          --primary: #4f46e5;
          --primary-light: #6366f1;
          --primary-dark: #3730a3;
          --accent: #8b5cf6;
          --accent2: #06b6d4;
          --bg: #f8f9ff;
          --bg2: #eef0fb;
          --surface: #ffffff;
          --border: #e2e5f1;
          --text: #0f172a;
          --text2: #475569;
          --text3: #94a3b8;
          --radius: 14px;
          --radius-sm: 10px;
          --radius-pill: 999px;
          --shadow: 0 4px 24px rgba(79, 70, 229, 0.08);
          --shadow-md: 0 8px 40px rgba(79, 70, 229, 0.14);
          --transition: 0.18s ease;
          --font-sans: 'DM Sans', 'Segoe UI', system-ui, sans-serif;
          --font-display: 'Sora', 'DM Sans', system-ui, sans-serif;
        }

        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600&family=Sora:wght@600;700;800&display=swap');

        body { font-family: var(--font-sans); background: var(--bg); color: var(--text); }

        /* ── Layout ── */
        .page { min-height: 100vh; display: flex; flex-direction: column; }

        /* ── Nav ── */
        .nav {
          position: sticky; top: 0; z-index: 50;
          display: flex; align-items: center; justify-content: space-between;
          padding: 0 5vw; height: 64px;
          background: rgba(248, 249, 255, 0.88);
          backdrop-filter: blur(12px);
          border-bottom: 1px solid var(--border);
        }
        .nav-logo {
          display: flex; align-items: center; gap: 10px;
          font-family: var(--font-display); font-size: 1.15rem; font-weight: 700; color: var(--text);
          text-decoration: none;
        }
        .nav-logo-mark {
          width: 34px; height: 34px; border-radius: 10px;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          display: flex; align-items: center; justify-content: center;
          color: white; font-size: 1rem; font-weight: 800;
        }
        .nav-logo-text span { color: var(--primary-light); }
        .nav-badge {
          font-size: 0.72rem; font-weight: 600; letter-spacing: 0.04em;
          background: linear-gradient(135deg, #ede9fe, #dbeafe);
          color: var(--primary); padding: 3px 10px; border-radius: var(--radius-pill);
          border: 1px solid #c4b5fd;
        }

        /* ── Hero ── */
        .hero {
          padding: 80px 5vw 60px;
          display: grid; grid-template-columns: 1fr 420px; gap: 60px;
          align-items: center; max-width: 1200px; margin: 0 auto; width: 100%;
        }

        .hero-eyebrow {
          display: inline-flex; align-items: center; gap: 7px;
          font-size: 0.82rem; font-weight: 600; letter-spacing: 0.06em;
          text-transform: uppercase; color: var(--primary-light);
          background: linear-gradient(135deg, #ede9fe, #dbeafe);
          border: 1px solid #c4b5fd; border-radius: var(--radius-pill);
          padding: 5px 14px; margin-bottom: 20px;
        }

        .hero-h1 {
          font-family: var(--font-display);
          font-size: clamp(2rem, 4vw, 3.1rem);
          font-weight: 800; line-height: 1.13; color: var(--text);
          margin-bottom: 18px; letter-spacing: -0.03em;
        }
        .hero-h1 .gradient-text {
          background: linear-gradient(135deg, var(--primary), var(--accent));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
        }

        .hero-sub { font-size: 1.05rem; color: var(--text2); line-height: 1.65; margin-bottom: 32px; max-width: 480px; }

        .hero-bullets { display: flex; flex-direction: column; gap: 10px; margin-bottom: 36px; }
        .hero-bullet {
          display: flex; align-items: center; gap: 10px;
          font-size: 0.92rem; color: var(--text2);
        }
        .hero-bullet-icon {
          width: 22px; height: 22px; border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          display: flex; align-items: center; justify-content: center;
          color: white; flex-shrink: 0;
        }

        .social-proof {
          display: flex; align-items: center; gap: 12px;
          font-size: 0.88rem; color: var(--text2);
        }
        .avatars { display: flex; }
        .avatar-circle {
          width: 32px; height: 32px; border-radius: 50%;
          border: 2px solid var(--surface);
          background: linear-gradient(135deg, #c4b5fd, #818cf8);
          margin-left: -8px; display: flex; align-items: center;
          justify-content: center; font-size: 0.6rem; font-weight: 700; color: white;
        }
        .avatar-circle:first-child { margin-left: 0; }
        .avatar-circle.more {
          background: linear-gradient(135deg, var(--primary), var(--accent));
          font-size: 0.65rem;
        }
        .social-proof strong { color: var(--primary); font-weight: 700; }

        /* ── Sign Up Card ── */
        .signup-card {
          background: var(--surface);
          border: 1px solid var(--border);
          border-radius: 20px;
          padding: 36px 32px;
          box-shadow: var(--shadow-md);
          position: relative; overflow: hidden;
        }
        .signup-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, var(--primary), var(--accent), var(--accent2));
        }

        .signup-card-title {
          font-family: var(--font-display); font-size: 1.25rem; font-weight: 700;
          color: var(--text); margin-bottom: 4px;
        }
        .signup-card-sub { font-size: 0.88rem; color: var(--text2); margin-bottom: 24px; }

        .field-label {
          font-size: 0.8rem; font-weight: 600; color: var(--text); letter-spacing: 0.02em;
          margin-bottom: 8px; display: block;
        }
        .field-group { margin-bottom: 20px; }

        .pill-group { display: flex; flex-wrap: wrap; gap: 8px; }
        .pill {
          padding: 7px 16px; border-radius: var(--radius-pill);
          border: 1.5px solid var(--border); background: var(--surface);
          font-size: 0.86rem; font-weight: 500; color: var(--text2);
          cursor: pointer; transition: all var(--transition);
          font-family: var(--font-sans);
        }
        .pill:hover { border-color: var(--primary-light); color: var(--primary); background: #ede9fe22; }
        .pill.active {
          border-color: var(--primary);
          background: linear-gradient(135deg, #ede9fe, #dbeafe);
          color: var(--primary); font-weight: 600;
        }
        .pill:active { transform: scale(0.95); }

        .divider {
          display: flex; align-items: center; gap: 12px;
          margin: 22px 0; color: var(--text3); font-size: 0.8rem;
        }
        .divider::before, .divider::after {
          content: ''; flex: 1; height: 1px; background: var(--border);
        }

        .btn-google {
          width: 100%; padding: 13px 20px;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          background: var(--surface); border: 1.5px solid var(--border);
          border-radius: var(--radius); font-size: 0.95rem; font-weight: 600;
          color: var(--text); cursor: pointer; transition: all var(--transition);
          font-family: var(--font-sans);
        }
        .btn-google:hover { border-color: var(--primary-light); box-shadow: 0 4px 16px rgba(79,70,229,0.1); background: #fafafe; }
        .btn-google:active { transform: scale(0.98); }
        .btn-google:disabled { opacity: 0.6; cursor: not-allowed; }

        .btn-primary {
          width: 100%; padding: 13px 20px;
          display: flex; align-items: center; justify-content: center; gap: 10px;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          border: none; border-radius: var(--radius);
          font-size: 0.95rem; font-weight: 700;
          color: white; cursor: pointer; transition: all var(--transition);
          font-family: var(--font-sans); margin-top: 8px;
          box-shadow: 0 4px 20px rgba(79, 70, 229, 0.35);
        }
        .btn-primary:hover { box-shadow: 0 6px 28px rgba(79, 70, 229, 0.45); transform: translateY(-1px); }
        .btn-primary:active { transform: scale(0.98) translateY(0); }
        .btn-primary:disabled { opacity: 0.65; cursor: not-allowed; transform: none; }

        .tos-note { font-size: 0.76rem; color: var(--text3); text-align: center; margin-top: 14px; line-height: 1.5; }
        .tos-note a { color: var(--primary-light); text-decoration: none; }
        .tos-note a:hover { text-decoration: underline; }

        @keyframes spin { to { transform: rotate(360deg); } }
        .spinner {
          width: 17px; height: 17px; border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: currentColor;
          animation: spin 0.7s linear infinite; flex-shrink: 0;
        }
        .spinner.dark {
          border-color: rgba(79,70,229,0.15);
          border-top-color: var(--primary);
        }

        /* ── Exam badges ── */
        .exams-section { padding: 60px 5vw; background: var(--bg2); }
        .exams-inner { max-width: 1200px; margin: 0 auto; }
        .section-label {
          font-size: 0.8rem; font-weight: 600; letter-spacing: 0.08em;
          text-transform: uppercase; color: var(--text3); margin-bottom: 8px;
        }
        .section-title {
          font-family: var(--font-display); font-size: clamp(1.4rem, 2.5vw, 2rem);
          font-weight: 700; color: var(--text); margin-bottom: 32px; letter-spacing: -0.02em;
        }
        .section-title span { color: var(--primary-light); }

        .exam-grid {
          display: grid; grid-template-columns: repeat(auto-fill, minmax(170px, 1fr)); gap: 14px;
        }

        .exam-badge {
          display: flex; align-items: center; gap: 12px;
          background: var(--surface); border: 1.5px solid var(--border);
          border-radius: var(--radius-sm); padding: 14px 16px;
          transition: all var(--transition); cursor: default;
        }
        .exam-badge:hover { border-color: var(--primary-light); box-shadow: var(--shadow); transform: translateY(-2px); }
        .exam-badge-icon {
          width: 36px; height: 36px; border-radius: 10px;
          background: var(--bg2); display: flex; align-items: center;
          justify-content: center; flex-shrink: 0;
        }
        .exam-abbr {
          font-size: 0.7rem; font-weight: 800; color: var(--primary);
          letter-spacing: 0.03em;
        }
        .exam-name { font-size: 0.86rem; font-weight: 600; color: var(--text); }

        /* ── Features ── */
        .features-section { padding: 70px 5vw; }
        .features-inner { max-width: 1200px; margin: 0 auto; }
        .features-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; margin-top: 36px; }
        .feature-card {
          background: var(--surface); border: 1.5px solid var(--border);
          border-radius: 18px; padding: 28px 24px;
          transition: all var(--transition); position: relative; overflow: hidden;
        }
        .feature-card::after {
          content: ''; position: absolute; bottom: 0; left: 0; right: 0; height: 2px;
          background: linear-gradient(90deg, var(--primary), var(--accent));
          transform: scaleX(0); transform-origin: left; transition: transform 0.3s ease;
        }
        .feature-card:hover { box-shadow: var(--shadow-md); transform: translateY(-4px); }
        .feature-card:hover::after { transform: scaleX(1); }

        .feature-icon {
          width: 48px; height: 48px; border-radius: 14px;
          background: linear-gradient(135deg, #ede9fe, #dbeafe);
          display: flex; align-items: center; justify-content: center;
          margin-bottom: 18px;
        }
        .feature-title { font-family: var(--font-display); font-size: 1.05rem; font-weight: 700; color: var(--text); margin-bottom: 8px; }
        .feature-desc { font-size: 0.88rem; color: var(--text2); line-height: 1.6; }

        /* ── Profile completion step ── */
        .profile-page {
          min-height: 100vh; display: flex; align-items: center; justify-content: center;
          padding: 40px 5vw; background: var(--bg);
        }
        .profile-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: 22px; padding: 44px 40px;
          box-shadow: var(--shadow-md); max-width: 480px; width: 100%;
          position: relative; overflow: hidden;
        }
        .profile-card::before {
          content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px;
          background: linear-gradient(90deg, var(--primary), var(--accent), var(--accent2));
        }
        .profile-logo { display: flex; align-items: center; gap: 10px; margin-bottom: 28px; }
        .profile-logo-mark {
          width: 38px; height: 38px; border-radius: 11px;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          display: flex; align-items: center; justify-content: center;
          color: white; font-weight: 800; font-size: 1.05rem;
        }
        .profile-logo-text { font-family: var(--font-display); font-size: 1.1rem; font-weight: 700; }
        .profile-logo-text span { color: var(--primary-light); }

        .profile-step { font-size: 0.78rem; font-weight: 600; color: var(--primary-light); letter-spacing: 0.06em; text-transform: uppercase; margin-bottom: 8px; }
        .profile-title { font-family: var(--font-display); font-size: 1.6rem; font-weight: 800; color: var(--text); margin-bottom: 6px; }
        .profile-sub { font-size: 0.9rem; color: var(--text2); margin-bottom: 32px; }

        .name-input {
          width: 100%; padding: 12px 16px;
          border: 1.5px solid var(--border); border-radius: var(--radius-sm);
          font-size: 0.95rem; font-family: var(--font-sans); color: var(--text);
          background: var(--bg); transition: border-color var(--transition);
          outline: none;
        }
        .name-input:focus { border-color: var(--primary-light); box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
        .name-input::placeholder { color: var(--text3); }

        /* ── Footer ── */
        .footer {
          border-top: 1px solid var(--border); padding: 32px 5vw;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px;
        }
        .footer-logo { display: flex; align-items: center; gap: 9px; font-size: 0.9rem; font-weight: 600; color: var(--text2); }
        .footer-logo-mark {
          width: 26px; height: 26px; border-radius: 7px;
          background: linear-gradient(135deg, var(--primary), var(--accent));
          display: flex; align-items: center; justify-content: center;
          color: white; font-weight: 800; font-size: 0.72rem;
        }
        .footer-links { display: flex; gap: 20px; flex-wrap: wrap; }
        .footer-link { font-size: 0.82rem; color: var(--text3); text-decoration: none; transition: color var(--transition); }
        .footer-link:hover { color: var(--primary); }
        .footer-copy { font-size: 0.78rem; color: var(--text3); }

        /* ── Progress dots ── */
        .progress-dots { display: flex; gap: 6px; align-items: center; margin-bottom: 28px; }
        .dot { width: 8px; height: 8px; border-radius: 50%; background: var(--border); transition: all var(--transition); }
        .dot.active { width: 22px; border-radius: 4px; background: linear-gradient(90deg, var(--primary), var(--accent)); }

        /* ── Responsive ── */
        @media (max-width: 900px) {
          .hero { grid-template-columns: 1fr; gap: 40px; padding: 60px 5vw 40px; }
          .signup-card { max-width: 480px; }
          .features-grid { grid-template-columns: 1fr; }
        }
        @media (max-width: 640px) {
          .nav { padding: 0 4vw; }
          .hero { padding: 44px 4vw 32px; }
          .exams-section, .features-section { padding: 48px 4vw; }
          .exam-grid { grid-template-columns: repeat(2, 1fr); }
          .signup-card { padding: 28px 22px; }
          .profile-card { padding: 32px 24px; }
          .footer { flex-direction: column; align-items: flex-start; }
        }
      `}</style>

      {/* ─── Profile Completion Step ─────────────────────────────────── */}
      {step === 'profile' ? (
        <div className="profile-page">
          <div className="profile-card">
            <div className="profile-logo">
              <div className="profile-logo-mark">R</div>
              {/* Replace with: <Image src="/logo.svg" alt="Logo" width={34} height={34} /> */}
              <span className="profile-logo-text">Rookie<span>AI</span></span>
            </div>

            <div className="progress-dots">
              <div className="dot"></div>
              <div className="dot active"></div>
            </div>

            <p className="profile-step">One last step</p>
            <h1 className="profile-title">Personalize your experience</h1>
            <p className="profile-sub">Help us tailor your practice sessions with the right questions for you.</p>

            <div className="field-group">
              <label className="field-label">Full Name</label>
              <input
                className="name-input"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="How should we address you?"
              />
            </div>

            <div className="field-group">
              <label className="field-label">I'm currently in</label>
              <div className="pill-group">
                {CLASS_OPTIONS.map((c) => (
                  <button key={c} className={`pill ${cl === c ? 'active' : ''}`} onClick={() => setcl(c)}>{c}</button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Preparing for</label>
              <div className="pill-group">
                {EXAM_OPTIONS.map((e) => (
                  <button key={e} className={`pill ${exam === e ? 'active' : ''}`} onClick={() => setExam(e)}>{e}</button>
                ))}
              </div>
            </div>

            <button className="btn-primary" onClick={saveProfileCompletion} disabled={loadingSave}>
              {loadingSave ? <><div className="spinner" /><span>Saving...</span></> : 'Start Practicing →'}
            </button>
          </div>
        </div>
      ) : (

      /* ─── Landing Page ────────────────────────────────────────────── */
      <div className="page">

        {/* Nav */}
        <nav className="nav">
          <a href="#" className="nav-logo">
            <div className="nav-logo-mark">R</div>
            {/* Replace with: <Image src="/logo.svg" alt="Logo" width={32} height={32} /> */}
            <span className="nav-logo-text">Rookie<span>AI</span></span>
          </a>
          <span className="nav-badge">✦ AI-Powered</span>
        </nav>

        {/* Hero */}
        <section className="hero">
          <div>
            <div className="hero-eyebrow">
              <SparkleIcon /> Built for JEE & NEET Aspirants
            </div>
            <h1 className="hero-h1">
              Practice smarter.<br />
              <span className="gradient-text">Crack your exam.</span>
            </h1>
            <p className="hero-sub">
              Access 50,000+ Previous Year Questions with AI-powered explanations, smart analytics, and personalized practice — all in one place.
            </p>
            <div className="hero-bullets">
              {['PYQs from JEE, NEET & 10+ entrance exams', 'Step-by-step AI solution explanations', 'Know your All India Rank in real time'].map(b => (
                <div className="hero-bullet" key={b}>
                  <div className="hero-bullet-icon"><CheckIcon /></div>
                  <span>{b}</span>
                </div>
              ))}
            </div>
            <div className="social-proof">
              <div className="avatars">
                {['AK', 'PV', 'RS', 'MG'].map((i, idx) => (
                  <div key={i} className="avatar-circle" style={{ background: `linear-gradient(135deg, hsl(${idx * 60 + 220},70%,65%), hsl(${idx * 60 + 260},70%,55%))` }}>{i}</div>
                ))}
                <div className="avatar-circle more">+5K</div>
              </div>
              <span><strong>5,000+</strong> students practicing right now</span>
            </div>
          </div>

          {/* Sign Up Card */}
          <div className="signup-card">
            <h2 className="signup-card-title">Get started </h2>
            <p className="signup-card-sub">Join thousands of students already acing their prep.</p>

            <div className="field-group">
              <label className="field-label">I'm currently in</label>
              <div className="pill-group">
                {CLASS_OPTIONS.map((c) => (
                  <button key={c} className={`pill ${selectedClass === c ? 'active' : ''}`} onClick={() => setSelectedClass(c)}>{c}</button>
                ))}
              </div>
            </div>

            <div className="field-group">
              <label className="field-label">Preparing for</label>
              <div className="pill-group">
                {EXAM_OPTIONS.map((e) => (
                  <button key={e} className={`pill ${selectedExam === e ? 'active' : ''}`} onClick={() => setSelectedExam(e)}>{e}</button>
                ))}
              </div>
            </div>

            <div className="divider">then sign up with</div>

            <button className="btn-google" onClick={signInWithGoogle} disabled={authLoading}>
              {authLoading ? (
                <><div className="spinner dark" /><span>Please wait...</span></>
              ) : (
                <><GoogleIcon /><span>Continue with Google</span></>
              )}
            </button>

            <p className="tos-note">
              By signing up you agree to our <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
            </p>
          </div>
        </section>

        {/* Exam coverage */}
        <section className="exams-section">
          <div className="exams-inner">
            <p className="section-label">Coverage</p>
            <h2 className="section-title">Practice for <span>every major exam</span></h2>
            <div className="exam-grid">
              {EXAMS.map((ex) => (
                <ExamBadge key={ex.name} name={ex.name} abbr={ex.abbr} color={ex.color} />
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section className="features-section">
          <div className="features-inner">
            <p className="section-label">Why RookieAI</p>
            <h2 className="section-title">Everything you need to <span>score higher</span></h2>
            <div className="features-grid">
              {FEATURES.map((f) => (
                <div className="feature-card" key={f.title}>
                  <div className="feature-icon">{f.icon}</div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="footer">
          <div className="footer-logo">
            <div className="footer-logo-mark">R</div>
            RookieAI
          </div>
          <p className="footer-copy">© 2026 RookieAI. All rights reserved.</p>
          <div className="footer-links">
            <a href="#" className="footer-link">Support</a>
            <a href="#" className="footer-link">Terms & Conditions</a>
            <a href="#" className="footer-link">Privacy Policy</a>
          </div>
        </footer>
      </div>
      )}
    </>
  );
}