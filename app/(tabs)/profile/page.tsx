'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, LogOut, Maximize2, Pencil, ShieldCheck, Trash2 } from 'lucide-react';
import { supabase } from '../../../public/src/utils/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardHead, Chip, Meta, Page, PageHeader, Row, Section, Skeleton } from '@/components/rookie/ui';
import { Define } from '@/components/rookie/define';
import { PassCard, useHasPass } from '@/components/rookie/sale';
import { initialsOf } from '@/components/rookie/stage';
import { cn } from '@/lib/utils';

// Types
type ClassType = '12th' | '11th' | 'Dropper' | 'Other';
type ExamType = 'JEE Mains' | 'JEE Advanced' | 'NEET' | 'CUET' | 'Other';

interface AIBuddy {
  id: number;
  name: string;
  description: string;
  image: string;
  prompts: {
    onCorrect: string;
    onWrong: string;
    solutionPrefix: string;
  };
  prompt?: string;
  text?: string;
}

// Constants
const CLASS_OPTIONS: ClassType[] = ['12th', '11th', 'Dropper', 'Other'];
const EXAM_OPTIONS: ExamType[] = ['JEE Mains', 'JEE Advanced', 'NEET', 'CUET', 'Other'];

const aiBuddies: AIBuddy[] = [
  {
    id: 1,
    name: 'Jeetu Bhaiya',
    description: 'No description needed, he is the legend himself.',
    image: '/HD-wallpaper-kota-factory-lip-jeetu-bhaiya.jpg',
    prompts: {
      onCorrect: "Give a short not more than 15 words, cheerful message for getting a question correct.you are jeetu bhaiya who talks in hinglish.you call your students as bhai or didi as sarcasm. as Jeetu Bhaiya in hinglish.encourage them to solve more questions.",
      onWrong: " Give a short not more than 15 words, supportive message for getting a question wrong as Jeetu Bhaiya in hinglish.encourage them to solve more questions.",
      solutionPrefix: "you are jeetu bhaiya who talks in hinglish.you call your students as bhai or didi as sarcasm. Give a clear, concise, and simple step-by-step solution/explanation not more than 15 lines to the following question using plain text with Unicode math symbols (like ½, ×, √, ²) instead of LaTeX. Avoid using any dollar signs or LaTeX formatting. Write everything in plain, friendly text a high school student can understand. Avoid being too technical, keep it friendly and encouraging.",
    },
  },
  {
    id: 2,
    name: 'Riya',
    description: 'Fast, logical and straight to the point – no fluff, only facts.',
    image: '/assets_task_01jstrf4hqff7r4gs3jwmbq5kd_1745728563_img_0.webp',
    prompts: {
      onCorrect: "You are Riya, a fun, teenage girl who replies in Hinglish. Avoid long responses. You never give boring answers. Be informal and talk like a high school girl from India. Give a short not more than 15 words, cheerful message for getting a question correct.encourage them to solve more questions.",
      onWrong: "You are Ritu, a fun, teenage girl who replies in Hinglish. Avoid long responses. You never give boring answers. Be informal and talk like a high school girl from India. Give a short not more than 15 words, supportive message for getting a question wrong. Encourage them casually.encourage them to solve more questions.",
      solutionPrefix: "You are Riya, a fun, teenage girl who replies in Hinglish. Give a clear, concise, and simple step-by-step solution/explanation not more than 15 lines to the following question using plain text with Unicode math symbols (like ½, ×, √, ²) instead of LaTeX. Avoid using any dollar signs or LaTeX formatting. Write everything in plain, friendly text a high school student can understand. Avoid being too technical, keep it friendly and encouraging.",
    },
  },
  {
    id: 3,
    name: 'Rei',
    description: 'A charming anime boy with a sharp mind and soft heart — flirty, focused, and everyones secret crush 💫',
    image: '/download (17).jpeg',
    prompts: {
      onCorrect: "You are Rei, a handsome anime boy with a calm voice and playful charm. Give a short not more than 15 words, cheerful message for getting a question correct. Keep it sweet and a bit cheeky — like a guy who's lowkey impressed.encourage them to solve more questions.",
      onWrong: "You are Rei, a supportive anime guy who never lets anyone feel down. Give a short not more than 15 words, supportive message for getting a question wrong. Sound gentle, as if you're cheering them up personally. Use casual Hindi-English mix.encourage them to solve more questions.",
      solutionPrefix: "You are Rei, a cool and intelligent anime boy. Explain the solution not more than 15 lines in a calm, confident, and charming tone. Keep it clear, concise, and step-by-step. Use Unicode math symbols (like ½, √, ²). Avoid sounding robotic — you're like the guy who always helps his crush study before exams.",
    },
    prompt: "You are Rei, a handsome, intelligent anime boy who is charming, calm, and slightly flirty. Use Hindi-English like a modern teen. Speak naturally, be a bit teasing but always respectful and kind. You're the type who girls secretly admire in class.",
    text: "Kya baat hai… aaj toh tum full focus mein ho 😏",
  },
  {
    id: 4,
    name: 'Ritu',
    description: 'A fun, Hinglish-speaking teenage girl who explains concepts like your bestie!',
    image: '/girlinchair.png',
    prompts: {
      onCorrect: "You are Ritu, a fun, teenage girl who replies in Hinglish. Avoid long responses. You never give boring answers. Be informal and talk like a high school girl from India. Give a short not more than 15 words, cheerful message for getting a question correct.encourage them to solve more questions.",
      onWrong: "You are Ritu, a fun, teenage girl who replies in Hinglish. Avoid long responses. You never give boring answers. Be informal and talk like a high school girl from India. Give a short not more than 15 words, supportive message for getting a question wrong. Encourage them casually.encourage them to solve more questions.",
      solutionPrefix: "You are Ritu, a fun, teenage girl who replies in Hinglish. Give a clear, concise, and simple step-by-step solution/explanation not more than 15 lines to the following question using plain text with Unicode math symbols (like ½, ×, √, ²) instead of LaTeX. Avoid using any dollar signs or LaTeX formatting. Write everything in plain, friendly text a high school student can understand. Avoid being too technical, keep it friendly and encouraging.",
    },
    prompt: 'You are Ritu, a fun, teenage girl who replies in Hinglish.avoid giving long responses. You never give boring answers. Be informal and talk like a high school girl from India.',
    text: 'hey bestie, kya haal chaal 😉 ?',
  },
  {
    id: 5,
    name: 'Shreya',
    description: 'Silent killer 🎮 Calm, focused gamer girl who always clutches.',
    image: '/shery11.jpeg',
    prompts: {
      onCorrect: "You are Shreya. You speak in short, chill Hinglish sentences. Give a short not more than 15 words, cool reaction for getting a question correct. No drama, just cool vibes.encourage them to solve more questions.",
      onWrong: "You are Shreya. Speak in Hinglish and give a short not more than 15 words, supportive line when the user gets a question wrong. Avoid drama, focus on motivation.encourage them to solve more questions.",
      solutionPrefix: "You are Shreya. Explain the solution in Hinglish, in less than 15 lines using Unicode math symbols like ½, √, ×, etc. Avoid LaTeX. Be clear and to the point, like you're giving callouts in a game. Friendly but minimal tone.",
    },
    prompt: "You are Shreya, an Indian gamer girl who is introverted but sharp. You speak calmly and prefer short Hinglish lines. You're confident like someone who top-frags quietly. Be cool, concise, and real.",
    text: "yo, headset on. ready to win?",
  },
  {
    id: 6,
    name: 'Neha',
    description: 'Spicy & sassy 💅',
    image: '/assets_task_01jttq36fkem8br965ak8qh0sp_1746800911_img_2.webp',
    prompts: {
      onCorrect: "you are Neha, a 17-year old indian girl who is a little sassy,You speak in a fun, casual Hinglish style, using lots of emojis and slang. Give a short not more than 15 words, cheerful message for getting a question correct.Avoid long responses.encourage them to solve more questions.",
      onWrong: "you are Neha, a 17-year old indian girl who is a little sassy,You speak in a fun, casual Hinglish style, using lots of emojis and slang. Give a short not more than 15 words, supportive message for getting a question wrong. Encourage them casually.Avoid long responses.encourage them to solve more questions.",
      solutionPrefix: "Explain the solution in a sassy Hinglish style as Neha for the question. Give a clear, concise, and simple step-by-step solution/explanation not more than 15 lines to the following question using plain text with Unicode math symbols (like ½, ×, √, ²) instead of LaTeX. Avoid using any dollar signs or LaTeX formatting. Write everything in plain, friendly text a high school student can understand. Avoid being too technical.",
    },
    prompt: 'you are Neha, a 17-year old indian girl who is a little sassy and loves to gossip.avoid giving long responses. You speak in a fun, casual Hinglish style, using lots of emojis and slang. Youre all about the drama.',
    text: 'hey, Neha this side 🙃',
  },
  
];

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-2.5 text-label font-medium text-muted-foreground">{children}</p>;
}

export default function ProfilePage() {
  const router = useRouter();
  const hasPass = useHasPass();

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadUserData();
  }, []);

  
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteInput, setDeleteInput] = useState('');
  const [profileImageModalVisible, setProfileImageModalVisible] = useState<number | null>(null);

  // User data state
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedClass, setSelectedClass] = useState<ClassType>('12th');
  const [targetExam, setTargetExam] = useState<ExamType>('JEE Mains');
  const [selectedBuddy, setSelectedBuddy] = useState(1);
  const [goal, setGoal] = useState('');

  // Stats
  const [questionsToday, setQuestionsToday] = useState(0);
  const [questionsWeek, setQuestionsWeek] = useState(0);
  const [questionsMonth, setQuestionsMonth] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

 
 
  const loadUserData = async () => {
    // Reset daily count if it's a new day
    const storedTodayDate = localStorage.getItem('questionsToday_date');
    if (storedTodayDate !== new Date().toDateString()) {
      localStorage.setItem('questionsToday', '0');
      localStorage.setItem('questionsToday_date', new Date().toDateString());
    }
    try {
      const storedUser = localStorage.getItem('@user');



      if (storedUser) {
        const userData = JSON.parse(storedUser);
        setName(userData.name || '');
        setEmail(userData.email || '');
        setSelectedClass(userData.class || '12th');
        setTargetExam(userData.exam || 'JEE Mains');
      }


      



      const storedBuddy = parseInt(localStorage.getItem('selectedBuddy') || '1');
      const storedGoal = localStorage.getItem('goal') || '';
      const storedQuestionsToday = parseInt(localStorage.getItem('questionsToday') || '0');
      const storedQuestionsWeek = parseInt(localStorage.getItem('questionsWeek') || '0');
      const storedQuestionsMonth = parseInt(localStorage.getItem('questionsMonth') || '0');
      const storedCurrentStreak = parseInt(localStorage.getItem('currentStreak') || '0');
      const storedLongestStreak = parseInt(localStorage.getItem('longestStreak') || '0');

      setSelectedBuddy(storedBuddy);
      setGoal(storedGoal);
      setQuestionsToday(storedQuestionsToday);
      setQuestionsWeek(storedQuestionsWeek);
      setQuestionsMonth(storedQuestionsMonth);
      setCurrentStreak(storedCurrentStreak);
      setLongestStreak(storedLongestStreak);

      setLoading(false);
    } catch (error) {
      console.error('Error loading user data:', error);
      setLoading(false);
    }
  };




  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    try {
      // 1. Update localStorage
      const storedUser = localStorage.getItem('@user');
      let userId: string | null = null;
      if (storedUser) {
        const userData = JSON.parse(storedUser);
        userId = userData.id || userData.user_id || null;
        const updatedUser = {
          ...userData,
          name,
          cl: selectedClass,
          exam: targetExam,
        };
        localStorage.setItem('@user', JSON.stringify(updatedUser));
      }

      localStorage.setItem('selectedClass', selectedClass);
      localStorage.setItem('targetExam', targetExam);
      localStorage.setItem('selectedBuddy', selectedBuddy.toString());
      localStorage.setItem('goal', goal);

      // 2. Sync to Supabase users table
      if (!userId) {
        const { data: { user } } = await supabase.auth.getUser();
        userId = user?.id ?? null;
      }

      if (userId) {
        const { error } = await supabase
          .from('users')
          .update({
            name,
            cl: selectedClass,
            exam: targetExam,
           
          })
          .eq('id', userId);

        if (error) {
          console.error('Supabase update error:', error);
          setSaveError('Saved locally, but failed to sync to server.');
        }
      }

      setEditing(false);
    } catch (error) {
      console.error('Error saving profile:', error);
      setSaveError('Something went wrong while saving.');
    } finally {
      setSaving(false);
    }
  };

  const handleSelectBuddy = (buddyId: number) => {
    setSelectedBuddy(buddyId);
    localStorage.setItem('selectedBuddy', buddyId.toString());
  };

  const handleDeleteAccount = async () => {
    if (deleteInput.trim().toLowerCase() !== 'delete') return;
    try {
      localStorage.clear();
      router.push('/auth/terms-agree');
    } catch (error) {
      console.error('Error deleting account:', error);
    }
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    try {
      const { bustPassCache } = await import('@/lib/rookiePass');
      bustPassCache();
    } catch {}
    localStorage.clear();
    sessionStorage.clear();
    router.push('/');
  };

  const previewBuddy = aiBuddies.find((b) => b.id === profileImageModalVisible);
  const deleteReady = deleteInput.trim().toLowerCase() === 'delete';
  const closeDelete = () => { setDeleteModalVisible(false); setDeleteInput(''); };

  return (
    <Page>
      <PageHeader title="Profile" sub="Your details, your mentor, your plan." />

      {/* Profile + plan: one row */}
      <Row className="mt-8 md:grid-cols-[1.6fr_1fr]">
        <Card className="flex flex-col">
          <CardHead label="Account" action={!editing ? (
            <Button variant="ghost" className="h-8 rounded-control px-2.5" onClick={() => setEditing(true)}>
              <Pencil /> Edit
            </Button>
          ) : undefined} />
          {loading ? (
            <div className="flex items-center gap-4"><Skeleton className="size-16 rounded-full" /><div className="flex-1"><Skeleton className="h-5 w-40" /><Skeleton className="mt-2 h-3 w-56" /></div></div>
          ) : (
            <div className="flex items-center gap-4">
              <span className="grid size-16 shrink-0 place-items-center rounded-full bg-secondary text-title font-semibold text-secondary-foreground">
                {initialsOf(name || email || '?')}
              </span>
              <div className="min-w-0">
                <p className="truncate text-heading font-semibold tracking-[-0.02em] text-foreground">{name || 'Rookie'}</p>
                <p className="truncate text-body-sm text-muted-foreground">{email || '—'}</p>
              </div>
            </div>
          )}
          <div className="mt-8">
            <p className="mb-5 text-label font-medium text-muted-foreground">
              <Define text="Your class, target exam and goal. We use these to pick questions and rank you on the exam leaderboard.">Your prep</Define>
            </p>
          <div className="grid gap-8 md:grid-cols-2">
            <div>
              <FieldLabel>Name</FieldLabel>
              <Input value={name} onChange={(e) => setName(e.target.value)} disabled={!editing}
                className="h-10 rounded-control px-3 text-body" />
            </div>
            <div>
              <FieldLabel>Email</FieldLabel>
              <Input type="email" value={email} disabled className="h-10 rounded-control px-3 text-body" />
            </div>
            <div>
              <FieldLabel>Which class are you in?</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {CLASS_OPTIONS.map((cls) => (
                  <Chip key={cls} active={selectedClass === cls} disabled={!editing}
                    onClick={() => editing && setSelectedClass(cls)}
                    className={cn(!editing && 'disabled:opacity-70')}>
                    {cls}
                  </Chip>
                ))}
              </div>
            </div>
            <div>
              <FieldLabel>Goal exam</FieldLabel>
              <div className="flex flex-wrap gap-2">
                {EXAM_OPTIONS.map((exam) => (
                  <Chip key={exam} active={targetExam === exam} disabled={!editing}
                    onClick={() => editing && setTargetExam(exam)}
                    className={cn(!editing && 'disabled:opacity-70')}>
                    {exam}
                  </Chip>
                ))}
              </div>
            </div>
            <div className="md:col-span-2">
              <FieldLabel>Goal (optional)</FieldLabel>
              <Input value={goal} onChange={(e) => setGoal(e.target.value)} disabled={!editing}
                placeholder="e.g., Get 99 percentile in JEE" className="h-10 rounded-control px-3 text-body" />
            </div>
          </div>

          <AnimatePresence initial={false}>
            {editing ? (
              <motion.div key="edit" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                <div className="flex flex-col-reverse items-stretch gap-3 pt-8 sm:flex-row sm:items-center sm:justify-end">
                  {saveError && <p className="text-label text-[#b2382d] dark:text-[#ff9c8c] sm:mr-auto">{saveError}</p>}
                  <Button variant="ghost" className="h-10 rounded-control px-4" onClick={() => { setEditing(false); setSaveError(''); }}>
                    Cancel
                  </Button>
                  <Button className="h-10 rounded-control px-5" onClick={handleSave} disabled={saving}>
                    {saving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
          </div>
        </Card>

        {hasPass ? (
          <Card className="flex flex-col">
            <CardHead icon={ShieldCheck} label="Plan" term="pass" title="Rookie Pass active" />
            <p className="text-body-sm text-muted-foreground">Every PYQ, unlimited AI solutions and unlimited tests are unlocked.</p>
            <span className="mt-auto inline-flex items-center gap-1.5 pt-6 text-label font-medium text-foreground">
              <Check className="size-4 text-[var(--rk-mint-600)]" /> Yearly plan
            </span>
          </Card>
        ) : hasPass === false ? (
          <PassCard />
        ) : (
          <Card><Skeleton className="h-4 w-24" /><Skeleton className="mt-4 h-8 w-40" /><Skeleton className="mt-6 h-20 w-full" /></Card>
        )}
      </Row>

      {/* Mentor */}
      <Section title="Select mentor" term="mentor">
        <p className="-mt-2 mb-4 text-body-sm text-muted-foreground">Your mentor guides you through practice and explains solutions.</p>
        <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory scroll-px-4 gap-4 overflow-x-auto px-4 pb-2 pt-1 md:mx-0 md:grid md:grid-cols-6 md:overflow-visible md:px-0">
          {aiBuddies.map((buddy) => {
            const on = selectedBuddy === buddy.id;
            return (
              <button key={buddy.id} type="button" aria-pressed={on} onClick={() => handleSelectBuddy(buddy.id)}
                className={cn(
                  'group relative flex min-w-[46%] snap-start flex-col rounded-card bg-card p-4 text-left ring-1 transition duration-300 hover:-translate-y-0.5 hover:shadow-[0_10px_30px_-18px_rgba(46,46,46,.28)] sm:min-w-[30%] md:min-w-0',
                  on ? 'ring-2 ring-[var(--rk-sky-500)] bg-secondary/60' : 'ring-black/[.05] hover:ring-black/[.10] dark:ring-white/[.06] dark:hover:ring-white/[.12]',
                )}>
                <span className="relative block aspect-square w-full overflow-hidden rounded-control bg-muted"
                  onClick={(e) => { e.stopPropagation(); setProfileImageModalVisible(buddy.id); }}>
                  <Image src={buddy.image} alt={buddy.name} fill sizes="(min-width: 768px) 180px, 45vw" className="object-cover transition duration-300 group-hover:scale-[1.03]" />
                  <span className="absolute right-1.5 top-1.5 grid size-7 place-items-center rounded-control bg-black/45 text-white opacity-0 transition group-hover:opacity-100" aria-label={`View ${buddy.name}`}>
                    <Maximize2 className="size-3.5" />
                  </span>
                </span>
                <span className="mt-3 flex items-center gap-1.5 text-body font-semibold text-foreground">
                  <span className="truncate">{buddy.name}</span>
                  {on && <Check className="size-4 shrink-0 text-primary" strokeWidth={2.5} aria-label="Selected" />}
                </span>
                <span className="mt-1 line-clamp-2 text-meta leading-snug text-muted-foreground">{buddy.description}</span>
              </button>
            );
          })}
        </div>
      </Section>

      {/* Danger zone */}
      <Section title="Account">
        <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-body font-medium text-foreground">Sign out or delete your account</p>
            <Meta>v2.3.1</Meta>
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" className="h-10 rounded-control px-4" onClick={handleLogout}>
              <LogOut /> Logout
            </Button>
            <Button variant="outline" onClick={() => setDeleteModalVisible(true)}
              className="h-10 rounded-control border-destructive/40 px-4 text-destructive hover:bg-destructive/10 hover:text-destructive dark:border-destructive/40">
              <Trash2 /> Delete account
            </Button>
          </div>
        </Card>
      </Section>

      {/* Mentor preview */}
      <Dialog open={profileImageModalVisible !== null} onOpenChange={(o) => { if (!o) setProfileImageModalVisible(null); }}>
        <DialogContent className="rounded-card p-6 sm:max-w-xs">
          <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-control bg-muted">
            {previewBuddy && <Image src={previewBuddy.image} alt={previewBuddy.name} fill sizes="320px" className="object-cover" />}
          </div>
          <DialogHeader className="text-center">
            <DialogTitle className="text-title font-semibold">{previewBuddy?.name}</DialogTitle>
            <DialogDescription className="text-body-sm">{previewBuddy?.description}</DialogDescription>
          </DialogHeader>
          <Button variant="secondary" className="h-10 rounded-control" onClick={() => setProfileImageModalVisible(null)}>Close</Button>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <Dialog open={deleteModalVisible} onOpenChange={(o) => { if (!o) closeDelete(); }}>
        <DialogContent className="rounded-card p-6 sm:max-w-sm">
          <DialogHeader>
            <Trash2 className="size-6 text-destructive" />
            <DialogTitle className="mt-2 text-title font-semibold">Delete your account?</DialogTitle>
            <DialogDescription className="text-body-sm">
              Type <span className="font-semibold text-foreground">Delete</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <Input value={deleteInput} onChange={(e) => setDeleteInput(e.target.value)} placeholder="Delete"
            className="h-10 rounded-control px-3 text-center text-body font-semibold" />
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="ghost" className="h-10 rounded-control px-4" onClick={closeDelete}>Go back</Button>
            <Button variant="destructive" className="h-10 rounded-control px-4" onClick={handleDeleteAccount} disabled={!deleteReady}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
