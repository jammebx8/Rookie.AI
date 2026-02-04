'use client';
import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../public/src/utils/supabase';

const CLASS_OPTIONS = ['12th', '11th', 'Dropper', 'Other'];
const EXAM_OPTIONS = ['JEE Mains', 'NEET', 'JEE Advanced', 'Other'];

export default function OnboardingPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState('');
  const [studentclass, setstudentclass] = useState('');
  const [exam, setExam] = useState('');
  const [profileNeedsCompletion, setProfileNeedsCompletion] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;
    const checkOnboarding = async () => {
      try {
        const onboarded = typeof window !== 'undefined' ? window.localStorage.getItem('@user_onboarded') : null;
        if (onboarded === 'true') {
          router.replace('/home');
          return;
        }
      } catch (e) {
        console.warn('Error reading onboarding flag', e);
      }

      if (typeof window !== 'undefined') {
        try {
          const url = window.location.href;
          if (url.includes('access_token') || url.includes('refresh_token') || url.includes('code')) {
            const { data, error } = await supabase.auth.getSessionFromUrl({ storeSession: true });
            if (error) {
              console.warn('getSessionFromUrl error', error);
            } else if (data?.session?.user) {
              await handleGoogleSignIn(data.session.user);
            }
            try {
              const cleanUrl = window.location.origin + window.location.pathname;
              window.history.replaceState({}, document.title, cleanUrl);
            } catch (e) {
              console.warn('Error cleaning URL', e);
            }
          }
        } catch (err) {
          console.warn('Error during OAuth redirect handling', err);
        }
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          await handleGoogleSignIn(session.user);
        }
      } catch (err) {
        console.warn('Error checking existing session', err);
      }

      const { data: { subscription } = {} as any } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event);
        if (event === 'SIGNED_IN' && session?.user) {
          await handleGoogleSignIn(session.user);
        } else if (event === 'SIGNED_OUT') {
          try {
            window.localStorage.removeItem('@user');
            window.localStorage.removeItem('@user_onboarded');
          } catch (_) {}
        }
      });

      return () => {
        mounted = false;
        subscription?.unsubscribe?.();
      };
    };

    checkOnboarding();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finalizeOnboarding(finalProfile: any) {
    try {
      window.localStorage.setItem('@user', JSON.stringify(finalProfile));
      window.localStorage.setItem('@user_onboarded', 'true');
      router.replace('/home');
    } catch (err) {
      console.warn('Error saving final profile locally', err);
    }
  }

  async function handleGoogleSignIn(user: any) {
    try {
      setAuthLoading(true);
      
      // Check if user already exists in database
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (existingUser && !fetchError) {
        // User exists - check if profile is complete
        if (existingUser.class && existingUser.exam) {
          // Profile complete - redirect to home
          const localData = {
            id: existingUser.id,
            email: existingUser.email,
            name: existingUser.name,
            avatar_url: existingUser.avatar_url,
            class: existingUser.class,
            exam: existingUser.exam,
            rookieCoinsEarned: existingUser.rookieCoinsEarned ?? 0,
            created_at: existingUser.created_at,
          };
          await finalizeOnboarding(localData);
        } else {
          // User exists but profile incomplete - show completion form
          setCurrentUserId(user.id);
          setCurrentEmail(user.email);
          setCurrentAvatar(existingUser.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null);
          setFullName(existingUser.name || user.user_metadata?.full_name || user.user_metadata?.name || user.email);
          setstudentclass(existingUser.class || '');
          setExam(existingUser.exam || '');
          setProfileNeedsCompletion(true);
        }
      } else {
        // User doesn't exist - create new user
        const newUserProfile = {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          created_at: new Date().toISOString(),
          class: null,
          exam: null,
          rookieCoinsEarned: 0,
        };

        const { data: insertedUser, error: insertError } = await supabase
          .from('users')
          .insert([newUserProfile])
          .select()
          .single();

        if (insertError) {
          console.warn('Error creating new user:', insertError);
          // Even if insert fails, continue with local profile completion
        }

        // Show profile completion form for new user
        setCurrentUserId(user.id);
        setCurrentEmail(user.email);
        setCurrentAvatar(newUserProfile.avatar_url);
        setFullName(newUserProfile.name || '');
        setstudentclass('');
        setExam('');
        setProfileNeedsCompletion(true);
      }
    } catch (err) {
      console.error('Error handling Google sign-in:', err);
      alert('Failed to complete Google sign-in');
    } finally {
      setAuthLoading(false);
    }
  }

  async function signInWithGoogle() {
    try {
      setAuthLoading(true);
      const redirectUrl = typeof window !== 'undefined' ? window.location.origin : undefined;
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl },
      });

      if (error) {
        console.error('OAuth error:', error);
        throw error;
      }

      if (!data?.url) throw new Error('No OAuth URL received from Supabase');
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      alert(error?.message || 'Google authentication failed');
      setAuthLoading(false);
    }
  }

  async function saveProfileCompletion() {
    if (!fullName.trim() || !studentclass || !exam) {
      alert('Please fill all fields');
      return;
    }
    setLoadingSave(true);
    try {
      const profileToSave: any = { 
        id: currentUserId, 
        name: fullName.trim(), 
        class: studentclass, 
        exam: exam,
        email: currentEmail,
        avatar_url: currentAvatar,
      };
      
      const { error: upsertError } = await supabase
        .from('users')
        .update({ 
          name: fullName.trim(), 
          class: studentclass, 
          exam: exam 
        })
        .eq('id', currentUserId);

      if (upsertError) {
        console.error('Supabase update error (completion):', upsertError);
        alert('Failed to save profile: ' + upsertError.message);
        setLoadingSave(false);
        return;
      }

      const { data: finalRow } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUserId)
        .single()
        .catch(() => ({ data: null }));

      const finalLocal = {
        id: currentUserId,
        email: currentEmail,
        name: fullName.trim(),
        avatar_url: currentAvatar,
        class: studentclass,
        exam: exam,
        rookieCoinsEarned: finalRow?.rookieCoinsEarned ?? 0,
        created_at: finalRow?.created_at || new Date().toISOString(),
      };

      await finalizeOnboarding(finalLocal);
    } catch (err) {
      console.error('Error saving user data:', err);
      alert((err as any)?.message || 'Something went wrong');
    } finally {
      setLoadingSave(false);
      setProfileNeedsCompletion(false);
    }
  }

  return (
    <div className="min-h-screen bg-[url('/bg2.png')] bg-cover text-white">
      <style jsx>{`
        @keyframes spin {
          to { transform: rotate(360deg); }
        }
        
        .spinner {
          border: 2px solid rgba(0, 0, 0, 0.1);
          border-left-color: currentColor;
          border-radius: 50%;
          width: 18px;
          height: 18px;
          animation: spin 0.6s linear infinite;
        }

        .btn-press {
          transition: transform 0.1s ease-in-out;
        }

        .btn-press:active {
          transform: scale(0.95);
        }

        .pill-press {
          transition: transform 0.1s ease-in-out;
        }

        .pill-press:active {
          transform: scale(0.92);
        }
      `}</style>

      <div className="max-w-2xl mx-auto py-16 px-6">
        <h1 className="text-4xl font-bold">Hey, kiddo!</h1>
        <p className="text-gray-300 mt-2">Let's us know you</p>

        {profileNeedsCompletion ? (
          <div className="bg-black/70 border border-slate-800 rounded-xl p-6 mt-6">
            <label className="block text-sm text-white/90">Full Name</label>
            <input 
              value={fullName} 
              onChange={(e) => setFullName(e.target.value)} 
              placeholder="Your full name" 
              className="w-full mt-2 p-3 rounded-md bg-slate-900 border border-slate-700 text-white" 
            />

            <label className="block text-sm text-white/90 mt-4">Class</label>
            <div className="flex flex-wrap gap-3 mt-2">
              {CLASS_OPTIONS.map((c) => (
                <button 
                  key={c} 
                  onClick={() => setstudentclass(c)} 
                  className={`pill-press px-4 py-2 rounded-full border ${
                    studentclass === c 
                      ? 'bg-white text-slate-900' 
                      : 'bg-slate-900 text-white/90'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>

            <label className="block text-sm text-white/90 mt-4">Preparing for</label>
            <div className="flex flex-wrap gap-3 mt-2">
              {EXAM_OPTIONS.map((e) => (
                <button 
                  key={e} 
                  onClick={() => setExam(e)} 
                  className={`pill-press px-4 py-2 rounded-full border ${
                    exam === e 
                      ? 'bg-white text-slate-900' 
                      : 'bg-slate-900 text-white/90'
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>

            <div className="mt-6">
              <button 
                onClick={saveProfileCompletion} 
                disabled={loadingSave} 
                className="btn-press w-full bg-white text-slate-900 rounded-full py-3 font-bold flex items-center justify-center gap-2"
              >
                {loadingSave ? (
                  <>
                    <div className="spinner"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  'Save & Continue'
                )}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="bg-black/70 border border-slate-800 rounded-xl p-6 mt-6">
              <label className="block text-sm text-white/90">Full Name (optional)</label>
              <input 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                placeholder="Your full name" 
                className="w-full mt-2 p-3 rounded-md bg-slate-900 border border-slate-700 text-white" 
              />

              <label className="block text-sm text-white/90 mt-4">Class (optional)</label>
              <div className="flex flex-wrap gap-3 mt-2">
                {CLASS_OPTIONS.map((c) => (
                  <button 
                    key={c} 
                    onClick={() => setstudentclass(c)} 
                    className={`pill-press px-4 py-2 rounded-full border ${
                      studentclass === c 
                        ? 'bg-white text-slate-900' 
                        : 'bg-slate-900 text-white/90'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>

              <label className="block text-sm text-white/90 mt-4">Preparing for (optional)</label>
              <div className="flex flex-wrap gap-3 mt-2">
                {EXAM_OPTIONS.map((e) => (
                  <button 
                    key={e} 
                    onClick={() => setExam(e)} 
                    className={`pill-press px-4 py-2 rounded-full border ${
                      exam === e 
                        ? 'bg-white text-slate-900' 
                        : 'bg-slate-900 text-white/90'
                    }`}
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-6">
              <button 
                onClick={signInWithGoogle} 
                disabled={authLoading} 
                className="btn-press w-full bg-white text-slate-900 rounded-2xl py-3 font-bold flex items-center justify-center gap-3"
              >
                {authLoading ? (
                  <>
                    <div className="spinner"></div>
                    <span>Please wait...</span>
                  </>
                ) : (
                  <>
                    <Image src="/googlelogo.png" alt="google" width={18} height={18} />
                    <span>Continue with Google</span>
                  </>
                )}
              </button>
            </div>
          </>
        )}

        <div className="mt-10 flex items-center gap-3">
          <div className="flex -space-x-4">
            <Image src="/avatar1.png" alt="a1" width={38} height={38} className="rounded-full border-2 border-slate-900 bg-slate-800" />
            <Image src="/avatar2.png" alt="a2" width={38} height={38} className="rounded-full border-2 border-slate-900 bg-slate-800" />
            <Image src="/avatar3.png" alt="a3" width={38} height={38} className="rounded-full border-2 border-slate-900 bg-slate-800" />
            <Image src="/avatar4.png" alt="a4" width={38} height={38} className="rounded-full border-2 border-slate-900 bg-slate-800" />
            <div className="w-9 h-9 rounded-full bg-red-800 flex items-center justify-center text-white text-sm border-2 border-slate-900 -ml-3">+129</div>
          </div>
        </div>

        <p className="text-gray-300 mt-4">
          Out of 15,00,000 students<br />234+ Student are already practicing with us
        </p>
      </div>
    </div>
  );
}