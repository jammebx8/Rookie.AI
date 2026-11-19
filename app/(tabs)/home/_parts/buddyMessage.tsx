'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, HeartHandshake, Zap, Target } from 'lucide-react';
import { Card, Tag } from '@/components/rookie/ui';
import { Button } from '@/components/ui/button';
import { AI_BUDDIES } from '@/app/QuestionViewer/QuestionViewerClient';

interface BuddyMessageProps {
  solvedToday: number;
  streak: number;
  userName?: string | null;
}

export function BuddyHomeMessage({ solvedToday, streak, userName }: { solvedToday: number; streak: number; userName?: string | null }) {
  const router = useRouter();
  const [buddyId, setBuddyId] = useState('4');

  useEffect(() => {
    try {
      const b = localStorage.getItem('selectedBuddy');
      if (b && AI_BUDDIES[b]) setBuddyId(b);
    } catch {}
  }, []);

  const buddy = AI_BUDDIES[buddyId] ?? AI_BUDDIES['4'];
  const name = userName ? userName.split(' ')[0] : '';

  // Tailored persona messages addressing the loneliness, stress, and feeling "behind"
  const getMessage = () => {
    const isStarted = solvedToday > 0;

    switch (buddyId) {
      case '1': // Jeetu Bhaiya
        return isStarted
          ? `${name ? `${name} bhai, ` : ''}aaj ${solvedToday} questions solve kar liye! Badhiya momentum hai. Bas silly mistakes se bachna aur solution dekh kar concepts pakke karte chalna. Bas yahi catch tha!`
          : `${name ? `${name} beta, ` : ''}tension lene ki zarurat nahi hai. Har aspirant ko lagta hai ki wo baakiyo se peeche hai. Sach ye hai ki roz ke bas 5 questions bhi tumhe 99 percentile ki race me aage le aayenge. Chalo, 5 questions nipta lo!`;

      case '2': // Riya
        return isStarted
          ? `Super proud of you${name ? ` ${name}` : ''}! ${solvedToday} questions done already! Aise hi practice karte raho, confidence alag level par hoga!`
          : `Arre yaar${name ? ` ${name}` : ''}, chill kar! Overthinking se percentile nahi aati, questions solve karne se aati hai. Aaj bas 5 easy questions se start karo, simple hai bro!`;

      case '3': // Rei
        return isStarted
          ? `Good progress today. ${solvedToday} questions completed with calm focus. Quality of attempts always beats sheer quantity.`
          : `JEE ek marathon hai, sprint nahi. Akele lag raha ho toh yaad rakhna: consistent 5 questions daily will quietly compound into mastery. Let's do today's set.`;

      case '5': // Shreya
        return isStarted
          ? `Efficient work. You completed ${solvedToday} questions. Review the ones you missed to permanently fix those concept gaps.`
          : `Don't worry about how much others are studying. Focus purely on accuracy with 5 curated questions today. Discipline creates rank.`;

      case '6': // Neha
        return isStarted
          ? `Bahut badhiya! Har sawaal ke sath darr kam hota hai. Keep this energy going!`
          : `Sabko backlog ka darr lagta hai. Par jaise hi hum pehla question solve karte hain, saara stress gayab ho jata hai. Aao milke 5 questions crack karte hain!`;

      case '4': // Ritu (default)
      default:
        return isStarted
          ? `Bestie${name ? ` ${name}` : ''}! You're doing amazing! ${solvedToday} questions already checked off today. Let's keep the streak fire burning! ✨`
          : `Bestie${name ? ` ${name}` : ''}, sun! Bilkul mat socho ki tum peeche ho. Hum dono milke crack karenge! Bas 5 easy questions aaj, 10 minute ka kaam hai. We got this! ✨`;
    }
  };

  const getInsight = () => {
    if (solvedToday >= 5) {
      return { icon: Zap, text: 'Daily 5 target crushed! Keep going for bonus rank.' };
    }
    if (streak >= 3) {
      return { icon: Target, text: `${streak}-day streak! Consistency is your unfair advantage.` };
    }
    return { icon: HeartHandshake, text: 'Tip: 5 easy questions daily beats irregular cramming.' };
  };

  const insight = getInsight();
  const InsightIcon = insight.icon;

  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }} className="mt-6">
      <Card className="relative overflow-hidden border-border/80 bg-card p-5 sm:p-6 hover:shadow-none">
        {/* Subtle accent backdrop */}
        <div
          className="pointer-events-none absolute -right-12 -top-12 size-48 rounded-full opacity-[0.07] blur-2xl"
          style={{ backgroundColor: buddy.color }}
        />

        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          {/* Buddy avatar with status dot */}
          <div className="relative shrink-0 self-start">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={buddy.image}
              alt={buddy.name}
              className="size-14 rounded-full object-cover ring-2 ring-border shadow-sm sm:size-16"
            />
            <span
              className="absolute -bottom-1 -right-1 size-4 rounded-full ring-2 ring-card"
              style={{ backgroundColor: buddy.color }}
              title={`Active mentor: ${buddy.name}`}
            />
          </div>

          {/* Speech & encouragement */}
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-body font-semibold text-foreground">{buddy.name}</span>
              <Tag tone="blue">Your Study Buddy</Tag>
              {streak > 0 && <Tag tone="right">🔥 {streak} Day Streak</Tag>}
            </div>

            <p className="mt-2 text-body leading-relaxed text-foreground/90 font-normal">
              &ldquo;{getMessage()}&rdquo;
            </p>

            {/* Insight chip + CTA */}
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 pt-1">
              <div className="inline-flex items-center gap-1.5 rounded-control bg-muted px-2.5 py-1 text-meta font-medium text-muted-foreground">
                <InsightIcon className="size-3.5 text-primary" />
                <span>{insight.text}</span>
              </div>

              <Button
                onClick={() => router.push('/QuestionViewer?mode=daily')}
                className="h-9 rounded-control px-4 text-body-sm shadow-sm"
              >
                Start daily practice <ArrowRight className="size-4" />
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </motion.div>
  );
}
