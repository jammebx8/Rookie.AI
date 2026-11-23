'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Swords } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Meta, Page, PageHeader, Row, Section } from '@/components/rookie/ui';
import { notify } from '@/components/rookie/toast';
import { supabase } from '../../../public/src/utils/supabase';
import { shouldShowSurvey } from '../../../lib/adaptivePractice';
import { getGreeting } from './_parts/constants';
import { resumeHref, useDailyGoal, useRecentSession, useStreak } from './_parts/hooks';
import { LongestMetric, MonthDaysMetric, StreakMetric, TodayMetric } from './_parts/metrics';
import { ContinueSection, MotivationHeadline } from './_parts/continue';
import { BuddyHomeMessage } from './_parts/buddyMessage';
import { RecommendedQuestionCard } from './_parts/recommended';
import { RookiePassBanner } from './_parts/pass';
import { HomeSurveyModal, ProfileModal, PhoneRequiredModal } from './_parts/modals';
import { CommunityRow, HomeFooter } from './_parts/community';

// ─── Types ───────────────────────────────────────────────────────────────────
type User = {
  id: string;
  email?: string;
  name?: string;
  exam?: string;
  cl?: string;
  [key: string]: any;
};

// ─── Main Component ───────────────────────────────────────────────────────────
export default function HomePage() {
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [cl, setcl] = useState('');
  const [exam, setExam] = useState('');
  const [saving, setSaving] = useState(false);
  // Weekly chapter survey
  const [showSurvey, setShowSurvey] = useState(false);
  const [surveyUserId, setSurveyUserId] = useState<string | null>(null);
  // Phone number modal (required for users who have solved > 3 questions total)
  const [showPhoneModal, setShowPhoneModal] = useState(false);

  // Shared data for the header, metric row and resume card (logic moved from the old cards)
  const streakData = useStreak();
  const { goal, solved, pct, persistGoal } = useDailyGoal();
  const { session, loading: sessionLoading } = useRecentSession();

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const cached = localStorage.getItem('@user');
      if (!cached) return;
      const parsed: User = JSON.parse(cached);
      setUser(parsed);
      setSurveyUserId(parsed.id ?? null);
      if (!parsed.cl || !parsed.exam) {
        setShowProfileModal(true);
      } else {
        setcl(parsed.cl || '');
        setExam(parsed.exam || '');
      }
    } catch {}
    // Show chapter survey if due (first time or expired every 7 days)
    if (shouldShowSurvey()) {
      // Small delay so profile modal (if needed) appears first
      setTimeout(() => setShowSurvey(true), 800);
    }
  }, []);

  // Check whether phone number is required (only for users with > 3 total questions solved)
  useEffect(() => {
    if (!user?.id) return;
    if (user.phone && user.phone.trim().length >= 10) {
      setShowPhoneModal(false);
      return;
    }

    let active = true;
    const checkAttempts = async () => {
      try {
        const { count } = await supabase
          .from('attempts')
          .select('*', { count: 'exact', head: true })
          .eq('student_id', user.id);

        let total = count ?? 0;
        if (total === 0) {
          const { count: actCount } = await supabase
            .from('user_activity')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);
          total = actCount ?? 0;
        }

        // Only show modal if user has solved MORE than 3 questions total
        // Users who have solved <= 3 questions (including new users) are never prompted.
        if (active && total > 3) {
          setShowPhoneModal(true);
        }
      } catch (e) {
        console.warn('Error checking attempt count:', e);
      }
    };

    checkAttempts();
    return () => { active = false; };
  }, [user?.id, user?.phone]);

  const saveProfile = async () => {
    if (!cl || !exam) { notify.error('Please select your class and exam'); return; }
    if (!user) { notify.error('No user loaded'); return; }
    try {
      setSaving(true);
      const { error } = await supabase.from('users').update({ cl, exam }).eq('id', user.id);
      if (error) throw error;
      const updated = { ...user, cl, exam };
      localStorage.setItem('@user', JSON.stringify(updated));
      setUser(updated);
      setShowProfileModal(false);
    } catch (err: any) {
      notify.error(err?.message ?? 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const inviteFriends = async () => {
    const link = 'https://rookie-ai.vercel.app';
    const text = `Hey! 👋 Join me on Rookie to study smarter together 🚀\n${link}`;
    if (typeof navigator !== 'undefined' && (navigator as any).share) {
      try { await (navigator as any).share({ title: 'Rookie', text, url: link }); return; } catch {}
    }
    const encoded = encodeURIComponent(text);
    if (typeof window !== 'undefined') {
      const isMobile = /Mobi|Android/i.test(navigator.userAgent);
      if (isMobile) {
        window.location.href = `whatsapp://send?text=${encoded}`;
        setTimeout(() => window.open(`https://wa.me/?text=${encoded}`, '_blank'), 800);
        return;
      }
      window.open(`https://wa.me/?text=${encoded}`, '_blank');
    }
  };

  const firstName = user?.name?.split(' ')[0] || user?.email?.split('@')[0] || null;

  // Header CTA: resume the last chapter (same URL as the Continue card); no session yet → chapter list.
  const continuePractice = () => {
    const href = resumeHref(session);
    router.push(href ?? '/explore');
  };

  const left = goal ? Math.max(0, goal - solved) : 0;
  const targetLine = !goal
    ? <>Set a daily goal and we’ll track it here.</>
    : left > 0
      ? <><span className="font-semibold text-foreground">{left} more</span> to hit today’s target.</>
      : <>Aaj ka target done. <span className="font-semibold text-foreground">{solved} solved</span> today.</>;

  return (
    <Page className="pb-6">
      {/* ─── Modals ─── */}
      <HomeSurveyModal
        open={showSurvey && !showProfileModal && !showPhoneModal}
        userId={surveyUserId}
        onDone={() => setShowSurvey(false)}
      />
      <ProfileModal
        open={showProfileModal && !showPhoneModal}
        cl={cl} setcl={setcl} exam={exam} setExam={setExam}
        saving={saving} onSave={saveProfile} onSkip={() => setShowProfileModal(false)}
      />
      <PhoneRequiredModal
        open={showPhoneModal}
        userId={user?.id || ''}
        onSuccess={(savedPhone) => {
          setShowPhoneModal(false);
          setUser((prev) => (prev ? { ...prev, phone: savedPhone } : null));
          notify.success('Phone number saved successfully!');
        }}
      />

      <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
        {/* ── Greeting ── */}
        <PageHeader
          title={<>{getGreeting()}{firstName ? `, ${firstName}` : ', learner'}</>}
          sub={targetLine}
          action={
            <Button
              size="lg"
              className="h-11 rounded-control px-5 text-body font-semibold gap-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white shadow-md transition-all active:scale-95"
              onClick={() => router.push('/compete')}
            >
              <Swords className="size-4.5" /> Compete
            </Button>
          }
        />
        <MotivationHeadline exam={exam} />
        <BuddyHomeMessage solvedToday={solved} streak={streakData.current} userName={firstName} />

        {/* ── Metrics: streak · today · longest · this month ── */}
        <Row className="mt-8 md:grid-cols-4">
          <StreakMetric streakData={streakData} />
          <TodayMetric goal={goal} solved={solved} pct={pct} persistGoal={persistGoal} />
          <LongestMetric longest={streakData.longest} />
          <MonthDaysMetric activeDays={streakData.activeDays} />
        </Row>

        {/* ── Continue ── */}
        <ContinueSection session={session} loading={sessionLoading} />

        {/* ── Next question + Rookie Pass ── */}
        <Section term="next" title="Your next question" action={<Meta className="hidden sm:inline">Picked for you</Meta>}>
          <Row className="md:grid-cols-[1.65fr_1fr]">
            <RecommendedQuestionCard />
            <RookiePassBanner />
          </Row>
        </Section>

        {/* ── Invite + social ── */}
        <CommunityRow onInvite={inviteFriends} />

        <HomeFooter />
      </motion.div>
    </Page>
  );
}
