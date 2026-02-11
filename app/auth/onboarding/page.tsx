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
    // 1. Already onboarded → go home
    try {
      const onboarded = localStorage.getItem('@user_onboarded');
      if (onboarded === 'true') {
        router.replace('/home');
        return;
      }
    } catch (_) {}
  
    // 2. Listen to Supabase auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth event:', event);
  
        if (event === 'SIGNED_IN' && session?.user) {
          await handleGoogleSignIn(session.user);
          
        }
  
    

        if (event === 'SIGNED_OUT') {
          localStorage.removeItem('@user');
          localStorage.removeItem('@user_onboarded');
        }
      }
    );
  
    return () => {
      subscription.unsubscribe();
    };
  }, []);
  

  /**
   * Save user data to localStorage and finalize onboarding
   */
  async function finalizeOnboarding(finalProfile: any) {
    try {
      window.localStorage.setItem('@user', JSON.stringify(finalProfile));
      window.localStorage.setItem('@user_onboarded', 'true');
      router.replace('/home');
    } catch (err) {
      console.warn('Error saving final profile locally', err);
    }
  }

  /**
   * Fetch user from Supabase and save locally
   */
  async function fetchAndSaveUserLocally(userId: string) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.warn('Failed to fetch user after operation:', error);
        return null;
      }

      if (user) {
        const localData = {
          id: user.id,
          email: user.email,
          name: user.name,
          avatar_url: user.avatar_url,
          class: user.class,
          exam: user.exam,
          rookieCoinsEarned: user.rookieCoinsEarned ?? 0,
          created_at: user.created_at,
        };
        
        localStorage.setItem('@user', JSON.stringify(localData));
        return localData;
      }
    } catch (err) {
      console.error('Error fetching and saving user locally:', err);
    }
    return null;
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
        // User exists - fetch from Supabase and save locally
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

        // Check if profile is complete
        if (existingUser.class && existingUser.exam) {
          // Profile complete - save and redirect to home
          await finalizeOnboarding(localData);
        } else {
          // User exists but profile incomplete - show completion form
          setCurrentUserId(user.id);
          setCurrentEmail(existingUser.email);
          setCurrentAvatar(existingUser.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture || null);
          setFullName(existingUser.name || user.user_metadata?.full_name || user.user_metadata?.name || user.email);
          setstudentclass(existingUser.class || '');
          setExam(existingUser.exam || '');
          setProfileNeedsCompletion(true);
        }
      } else {
        // User doesn't exist - create new user with initial data
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

        // Insert new user into Supabase
        const { data: insertedUser, error: insertError } = await supabase
          .from('users')
          .insert([newUserProfile])
          .select()
          .single();

        if (insertError) {
          console.warn('Error creating new user in Supabase:', insertError);
          alert('Failed to create user account');
          setAuthLoading(false);
          return;
        }

        // Fetch the inserted user and save locally
        const savedUser = await fetchAndSaveUserLocally(user.id);
        
        if (!savedUser) {
          alert('Failed to fetch user profile');
          setAuthLoading(false);
          return;
        }

        // Show profile completion form for new user
        setCurrentUserId(user.id);
        setCurrentEmail(savedUser.email);
        setCurrentAvatar(savedUser.avatar_url);
        setFullName(savedUser.name || '');
        setstudentclass(savedUser.class || '');
        setExam(savedUser.exam || '');
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
      // Redirect BACK to onboarding page to process the auth
      const redirectUrl =
        typeof window !== 'undefined' ? `${window.location.origin}/onboarding` : undefined;
  
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
      // Update user profile in Supabase
      const { error: updateError } = await supabase
        .from('users')
        .update({ 
          name: fullName.trim(), 
          class: studentclass, 
          exam: exam 
        })
        .eq('id', currentUserId);

      if (updateError) {
        console.error('Supabase update error:', updateError);
        alert('Failed to save profile: ' + updateError.message);
        setLoadingSave(false);
        return;
      }

      // Fetch the updated user from Supabase and save locally
      const savedUser = await fetchAndSaveUserLocally(currentUserId!);

      if (!savedUser) {
        alert('Failed to fetch updated profile');
        setLoadingSave(false);
        return;
      }

      // Finalize onboarding and redirect
      await finalizeOnboarding(savedUser);
    } catch (err) {
      console.error('Error saving user data:', err);
      alert((err as any)?.message || 'Something went wrong');
      setLoadingSave(false);
    }
  }
  

  return (
    <div className="min-h-screen bg-[url('/bg2.png')] bg-cover text-white">
      <style>{`
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