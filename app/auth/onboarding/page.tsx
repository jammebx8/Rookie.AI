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
  const [cl, setcl] = useState('');
  const [exam, setExam] = useState('');
  const [profileNeedsCompletion, setProfileNeedsCompletion] = useState(false);
  const [authLoading, setAuthLoading] = useState(false);
  const [loadingSave, setLoadingSave] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentEmail, setCurrentEmail] = useState<string | null>(null);
  const [currentAvatar, setCurrentAvatar] = useState<string | null>(null);

  useEffect(() => {
    // 1. Check if user is already onboarded → redirect to home
    try {
      const onboarded = localStorage.getItem('@user_onboarded');
      if (onboarded === 'true') {
        router.replace('https://rookieai.vercel.app/home');
        return;
      }
    } catch (err) {
      console.error('Error checking onboarding status:', err);
    }
  
    // 2. Listen to Supabase auth state changes
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
  }, [router]);

  /**
   * Handle Google Sign-In: Check if user exists, fetch or create user data
   */
  async function handleGoogleSignIn(user: any) {
    try {
      setAuthLoading(true);
      
      // Check if user exists in Supabase users table by ID
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();

      if (existingUser && !fetchError) {
        // User exists - fetch all data and save locally
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

        // Save to localStorage
        localStorage.setItem('@user', JSON.stringify(userData));
        localStorage.setItem('@user_onboarded', 'true');

        // Redirect to home
        router.replace('https://rookieai.vercel.app/home');
      } else {
        // User doesn't exist - create new user in Supabase
        const newUserData = {
          id: user.id,
          email: user.email,
          name: user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || '',
          cl: null,
          exam: null,
          created_at: new Date().toISOString(),
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          rookieCoinsEarned: 0,
        };

        // Insert new user into Supabase
        const { data: insertedUser, error: insertError } = await supabase
          .from('users')
          .insert([newUserData])
          .select()
          .single();

        if (insertError) {
          console.error('Error creating new user in Supabase:', insertError);
          alert('Failed to create user account. Please try again.');
          setAuthLoading(false);
          return;
        }

        // Save to localStorage
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

        // Show profile completion form for new user
        setCurrentUserId(insertedUser.id);
        setCurrentEmail(insertedUser.email);
        setCurrentAvatar(insertedUser.avatar_url);
        setFullName(insertedUser.name || '');
        setcl('');
        setExam('');
        setProfileNeedsCompletion(true);
      }
    } catch (err) {
      console.error('Error handling Google sign-in:', err);
      alert('Failed to complete sign-in. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  }

  /**
   * Sign in with Google - redirect to /auth/onboarding after OAuth
   */
  async function signInWithGoogle() {
    try {
      setAuthLoading(true);
      
      // Redirect back to onboarding page to process the auth
      const redirectUrl = 'https://rookieai.vercel.app/auth/onboarding';
  
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: redirectUrl },
      });
  
      if (error) {
        console.error('OAuth error:', error);
        throw error;
      }
  
      if (!data?.url) {
        throw new Error('No OAuth URL received from Supabase');
      }
      
      // Redirect to Google OAuth
      window.location.href = data.url;
    } catch (error: any) {
      console.error('Google sign-in error:', error);
      alert(error?.message || 'Google authentication failed. Please try again.');
      setAuthLoading(false);
    }
  }

  /**
   * Save profile completion (class and exam) for new users
   */
  async function saveProfileCompletion() {
    if (!fullName.trim() || !cl || !exam) {
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
          cl: cl, 
          exam: exam 
        })
        .eq('id', currentUserId);

      if (updateError) {
        console.error('Supabase update error:', updateError);
        alert('Failed to save profile: ' + updateError.message);
        setLoadingSave(false);
        return;
      }

      // Fetch updated user data from Supabase
      const { data: updatedUser, error: fetchError } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUserId)
        .single();

      if (fetchError || !updatedUser) {
        console.error('Error fetching updated user:', fetchError);
        alert('Failed to fetch updated profile. Please try again.');
        setLoadingSave(false);
        return;
      }

      // Save to localStorage
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

      // Redirect to home
      router.replace('https://rookieai.vercel.app/home');
    } catch (err) {
      console.error('Error saving user data:', err);
      alert((err as any)?.message || 'Something went wrong. Please try again.');
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
                  onClick={() => setcl(c)} 
                  className={`pill-press px-4 py-2 rounded-full border ${
                    cl === c 
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
                    onClick={() => setcl(c)} 
                    className={`pill-press px-4 py-2 rounded-full border ${
                      cl === c 
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